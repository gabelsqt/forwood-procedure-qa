"use strict";

const byId = id => document.getElementById(id);
const make = (tag, value) => {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
};
const defaults = {
  questionWordCue: 16,
  disabledTags: [],
  replacements: { "prior to": "before", "in order to": "to" },
  flagPhrases: ["as required", "where required", "if applicable", "as needed", "properly", "adequate", "safe"]
};
byId("rules").value = JSON.stringify(defaults, null, 2);
let book, fileName, rows = [], active, reviewedRules;
const xml = source => {
  const document = new DOMParser().parseFromString(source, "application/xml");
  if (document.querySelector("parsererror")) throw Error("The workbook contains unreadable XML.");
  return document;
};
const nodes = (document, name) => [...document.getElementsByTagNameNS("*", name)];
const zipRead = async (zip, path) => {
  const part = zip.file(path);
  if (!part) throw Error("Missing workbook part: " + path);
  return xml(await part.async("string"));
};
const message = value => { byId("message").textContent = value; };

byId("file").onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  byId("run").disabled = true;
  byId("file").disabled = true;
  try {
    const zip = await JSZip.loadAsync(file);
    const manifest = await zipRead(zip, "xl/workbook.xml");
    const relations = await zipRead(zip, "xl/_rels/workbook.xml.rels");
    const links = new Map(nodes(relations, "Relationship").map(link => [link.getAttribute("Id"), link.getAttribute("Target")]));
    const resolve = target => {
      if (!target) throw Error("Missing worksheet link.");
      return new URL(target, "https://workbook.invalid/xl/workbook.xml").pathname.slice(1);
    };
    const sheets = nodes(manifest, "sheet").map(sheet => [sheet.getAttribute("name"), resolve(links.get(sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id")))]);
    const strings = zip.file("xl/sharedStrings.xml")
      ? nodes(await zipRead(zip, "xl/sharedStrings.xml"), "si").map(item => nodes(item, "t").map(t => t.textContent).join(""))
      : [];
    book = {zip, sheets: new Map(sheets), strings};
    fileName = file.name;
    byId("sheet").replaceChildren(...sheets.map(([name]) => new Option(name, name)));
    if (book.sheets.has("All Questions")) byId("sheet").value = "All Questions";
    message("Workbook ready. Confirm the mapping and run checks.");
  } catch (error) {
    message(error.message);
  } finally {
    byId("run").disabled = false;
    byId("file").disabled = false;
  }
};

function settings() {
  const rules = JSON.parse(byId("rules").value);
  if (!rules || (rules.disabledTags !== undefined && (!Array.isArray(rules.disabledTags) || rules.disabledTags.some(id => typeof id !== "string"))) || !Number.isInteger(rules.questionWordCue) || rules.questionWordCue < 1 ||
      !Array.isArray(rules.flagPhrases) || rules.flagPhrases.some(phrase => typeof phrase !== "string" || !phrase.trim()) ||
      !rules.replacements || Array.isArray(rules.replacements) || typeof rules.replacements !== "object" ||
      Object.entries(rules.replacements).some(([phrase, replacement]) => !phrase.trim() || typeof replacement !== "string")) {
    throw Error("Enter a positive question word cue, a phrase list, and a wording replacement object.");
  }
  return rules;
}
function pattern(phrase, flags) {
  const escaped = [...phrase].map(character => "\\^$.*+?()[]{}|".includes(character) ? "\\" + character : character).join("");
  return new RegExp("(?<![\\p{L}\\p{N}])" + escaped + "(?![\\p{L}\\p{N}])", flags);
}
function analyze(record, rules) {
  const findings = [], tags = [], question = record.question.trim();
  let suggested = question;
  const add = (id, label, field, evidence, reason, level = "Review cue") => {
    if (rules.disabledTags?.includes(id)) return;
    const tag = {id, label, field, evidence, reason, level};
    tags.push(tag);
    findings.push(id + " · " + label + " · " + level + " · " + field + ': “' + evidence + '” — ' + reason);
  };
  if (question.split(/\s+/u).length > rules.questionWordCue)
    add("FW-SHORT", "Long question", "question", question, "Consider moving supporting detail into the guidance. The word limit is a configurable Forwood preference.");
  if (!question.endsWith("?"))
    add("FW-FORMAT", "Question format", "question", question, "The question has no closing question mark.", "Detected");
  for (const field of ["description", "guidance"]) {
    if (!record[field].trim())
      add("FW-CONTEXT", "Missing supporting text", field, "(empty)", "Confirm the source and provide the context needed to answer.", "Detected");
  }
  for (const field of ["question", "description", "guidance"]) {
    const text = record[field];
    for (const phrase of rules.flagPhrases) {
      const match = text.match(pattern(phrase, "iu"));
      if (match) {
        const conditional = /^(if|when|where|as)\b/i.test(phrase);
        add(conditional ? "FIT-1-FIELD" : "FIT-3-VAGUE",
          conditional ? "Decision criterion" : "Vague qualifier", field, match[0],
          "Check the question, description, guidance, and approved references for a usable criterion. A defined term can be acceptable.");
      }
    }
    const role = text.match(/\b(authorized (?:person|individual)|approved person|competent person)\b/iu);
    if (role) add("FIT-2-ROLE", "Role definition", field, role[0], "Confirm that this role and its qualification criteria are defined in an approved reference.");
    for (const reference of text.matchAll(/\b(it|this|that)\b/giu)) {
      add("FW-PRONOUN", "Connect pronoun", field, reference[0],
        "Select this tag to identify what the word refers to or mark it as having no clear referent.");
      const tag = tags[tags.length - 1];
      if (tag?.id === "FW-PRONOUN" && tag.field === field && tag.offset === undefined) {
        tag.offset = reference.index;
        tag.connection = {status:"Unreviewed", referent:""};
      }
    }
    const late = text.match(/.+\b(after|before|only if|provided that)\b.+/iu);
    if (late && !/^(after|before|only if|provided that)\b/iu.test(text.trim()))
      add("FIT-10-ORDER", "Condition placement", field, late[0], "Check whether a prerequisite should appear before the direction to act. Timing descriptions may be acceptable.");
    if (/([!?.,])\1|\(.*$/.test(text) && (/([!?.,])\1/.test(text) || (text.match(/\(/g) || []).length !== (text.match(/\)/g) || []).length))
      add("FIT-10-PUNCT", "Punctuation", field, text, "Check repeated punctuation or unmatched parentheses.");
  }
  const combined = question.match(/\b(?:and|with)\b/iu);
  if (combined) add("FW-ANSWER", "Combined checks", "question", question,
    "Confirm whether one answer covers a single control. Several conditions may stay together when every applicable condition must pass and failures can be identified.");
  for (const [phrase, replacement] of Object.entries(rules.replacements)) {
    suggested = suggested.replace(pattern(phrase, "giu"), match => {
      add("FW-WORDING", "Plain wording", "question", match, 'Consider “' + replacement + '” while preserving meaning.');
      return match[0] === match[0].toUpperCase() ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
    });
  }
  return {...record, suggested, draft:suggested, findings, tags, status:"Pending", note:""};
}
function loadRows(records, rules) {
  if (!records.length) throw Error("No questions found below the selected header row.");
  if (rows.length && !confirm("Start a new review? Export your current decisions first if you want to keep them.")) return;
  rows = records.map(record => analyze(record, rules));
  reviewedRules = JSON.stringify(rules);
  active = rows[0];
  byId("review").hidden = false;
  byId("export").disabled = false;
  byId("filter").value = "All";
  byId("search").value = "";
  message("Questions loaded. Review each question with its description and guidance.");
  renderQueue();
  renderDetail();
}
byId("run").onclick = async () => {
  try {
    if (!book) throw Error("Choose an .xlsx workbook or try the sample.");
    const rules = settings();
    const fields = {question:"column", id:"idColumn", description:"description", guidance:"guidance", role:"role"};
    const columns = Object.fromEntries(Object.entries(fields).map(([key, id]) => [key, byId(id).value.trim().toUpperCase()]));
    if (!columns.question || Object.values(columns).some(value => value && !/^[A-Z]{1,3}$/.test(value))) throw Error("Enter Excel column letters. The question column is required.");
    const header = Number(byId("headerRow").value);
    if (!Number.isInteger(header) || header < 1) throw Error("Choose a positive header row.");
    const sheet = byId("sheet").value, source = fileName;
    const {zip, sheets, strings} = book;
    const data = await zipRead(zip, sheets.get(sheet));
    const records = nodes(data, "row").flatMap(row => {
      const number = Number(row.getAttribute("r"));
      if (number <= header) return [];
      const cells = new Map(nodes(row, "c").map(cell => {
        const type = cell.getAttribute("t");
        const value = nodes(cell, "v")[0]?.textContent ?? "";
        const text = type === "s" ? strings[Number(value)] ?? "" : type === "inlineStr" ? nodes(cell, "t").map(t => t.textContent).join("") : value;
        return [cell.getAttribute("r")?.match(/^[A-Z]+/)?.[0], text];
      }));
      const values = Object.fromEntries(Object.entries(columns).map(([field, column]) => [field, cells.get(column) ?? ""]));
      return values.question.trim() ? [{...values, id:values.id || String(number), sheet, source, cell:columns.question + number}] : [];
    });
    loadRows(records, rules);
  } catch (error) { message(error.message); }
};
byId("demo").onclick = () => {
  try {
    loadRows([
      {id:"1", role:"Worker", question:"Is the inspection tag present and readable?", description:"The item needs a legible inspection tag.", guidance:"Check that the tag is attached and its text can be read."},
      {id:"2", role:"Supervisor", question:"Is the inspection record complete prior to handover?", description:"Confirm that the inspection was recorded.", guidance:"Look for the inspection date and the name of the person who checked it."},
      {id:"3", role:"Worker", question:"Is the inspection tag replaced as required?", description:"Replace tags when the approved criteria apply.", guidance:""}
    ].map((row, index) => ({...row, source:"Sample", sheet:"Sample", cell:"C" + (index + 2)})), settings());
  } catch (error) { message(error.message); }
};

function renderQueue() {
  const query = byId("search").value.trim().toLowerCase(), filter = byId("filter").value;
  const visible = rows.filter(row =>
    [row.id,row.role,row.question].some(value => value.toLowerCase().includes(query)) &&
    (filter === "All" || (filter === "Needs attention" ? row.findings.length > 0 : row.status === filter)));
  byId("count").textContent = visible.length + " of " + rows.length + " questions";
  byId("queue").replaceChildren(...visible.map(row => {
    const button = make("button", row.question);
    button.setAttribute("aria-current", row === active);
    for (const label of new Set(row.tags.map(tag => tag.label))) { const badge = make("small", label); badge.className = "qa-tag"; button.append(badge); }
    button.append(make("small", [row.role, row.id, row.cell, row.status].filter(Boolean).join(" · ")));
    button.onclick = () => { active = row; renderQueue(); renderDetail(); };
    return button;
  }));
}
byId("search").oninput = renderQueue;
byId("filter").onchange = renderQueue;

function renderDetail() {
  const row = active, panel = byId("detail");
  const compare = make("div", "");
  compare.className = "compare";
  const original = make("div", "");
  original.append(make("h3", "Original question"), make("pre", row.question));
  const label = make("label", "Suggested question");
  const draft = make("textarea", "");
  draft.value = row.draft;
  draft.oninput = () => { row.draft = draft.value; };
  label.append(draft);
  compare.append(original, label);
  const findingList = make("ul", "");
  for (const tag of row.tags) {
    const item = make("li", "");
    if (tag.id !== "FW-PRONOUN") {
      item.textContent = tag.id + " · " + tag.label + " · " + tag.level + " · " + tag.field +
        ': “' + tag.evidence + '” — ' + tag.reason;
      findingList.append(item);
      continue;
    }
    const button = make("button", tag.label + ' · “' + tag.evidence + '” · ' + tag.field);
    button.className = "secondary";
    const editor = make("div", "");
    editor.hidden = true;
    const source = row[tag.field];
    const context = make("p", "");
    context.append(document.createTextNode(source.slice(0, tag.offset)),
      make("mark", source.slice(tag.offset, tag.offset + tag.evidence.length)),
      document.createTextNode(source.slice(tag.offset + tag.evidence.length)));
    const label = make("label", "What does this word refer to? Use the object name or a phrase from the text.");
    const referent = make("input", "");
    referent.value = tag.connection.referent;
    label.append(referent);
    const status = make("p", "");
    status.setAttribute("role", "status");
    const refreshStatus = () => {
      status.textContent = tag.connection.status +
        (tag.connection.referent ? " → " + tag.connection.referent : "");
    };
    refreshStatus();
    button.setAttribute("aria-expanded", "false");
    button.onclick = () => {
      editor.hidden = !editor.hidden;
      button.setAttribute("aria-expanded", String(!editor.hidden));
      if (!editor.hidden) referent.focus();
    };
    const actions = make("div", "");
    actions.className = "actions";
    for (const [value, caption] of [
      ["Connected", "Save connection"],
      ["No clear referent", "No clear referent"],
      ["Not a pronoun here", "Not a pronoun here"],
      ["Unreviewed", "Reset"]
    ]) {
      const action = make("button", caption);
      action.onclick = () => {
        if (value === "Connected" && !referent.value.trim()) {
          status.textContent = "Enter the object or phrase first.";
          referent.focus();
          return;
        }
        tag.connection = {status:value, referent:value === "Connected" ? referent.value.trim() : ""};
        referent.value = tag.connection.referent;
        refreshStatus();
      };
      actions.append(action);
    }
    editor.append(context, label, actions);
    item.append(button, status, editor);
    findingList.append(item);
  }
  const noteLabel = make("label", "Decision note");
  const note = make("textarea", "");
  note.value = row.note;
  note.oninput = () => { row.note = note.value; };
  noteLabel.append(note);
  const actions = make("div", "");
  actions.className = "actions";
  for (const [status, caption] of [["Approved","Approve suggestion"],["Edited","Approve edited question"],["Rejected","Keep original"],["Pending","Reopen"]]) {
    const button = make("button", caption);
    button.onclick = () => {
      const reviewer = byId("reviewer").value.trim();
      if (status !== "Pending" && !reviewer) { byId("reviewer").focus(); message("Enter the reviewer name before recording a decision."); return; }
      if (status === "Edited" && !row.draft.trim()) { draft.focus(); message("Enter the edited question."); return; }
      if (status === "Approved" && row.draft.trim() !== row.suggested) { message("Use Approve edited question to accept your changes."); return; }
      Object.assign(row, {status, reviewer:status === "Pending" ? "" : reviewer, time:status === "Pending" ? "" : new Date().toISOString(),
        final:status === "Rejected" ? row.question : status === "Edited" ? row.draft.trim() : status === "Approved" ? row.suggested : "", recordedNote:row.note});
      message("Decision saved in this session. Export Excel to keep a copy.");
      renderQueue(); renderDetail();
    };
    actions.append(button);
  }
  const guidance = make("p", row.guidance || "Missing from import");
  guidance.style.whiteSpace = "pre-wrap";
  panel.replaceChildren(make("h2", [row.role, row.id, row.cell].filter(Boolean).join(" · ")), compare,
    make("h3","Description"), make("p", row.description || "Missing from import"), make("h3","What to look for"), guidance,
    make("h3","Guideline tags"), row.findings.length ? findingList : make("p","No configured tags matched."),
    make("p","Tags evaluate the imported text. Review cues need your judgment across all three fields. Scope, sequence, factual accuracy, role suitability, warning placement, and control alignment still require human review. Editing a suggestion does not recheck it."),
    noteLabel, actions, make("p", row.status + (row.final ? " · " + row.final : "")));
}

byId("export").onclick = async () => {
  try {
    const data = [["Source workbook","Sheet","Question cell","ID","Role","Original question","Description","What to look for","Suggestion","Draft","Review cues","Decision","Final question","Reviewer","Decision time (UTC)","Decision note","Guidelines JSON","Structured tags JSON"],
      ...rows.map(row => [row.source,row.sheet,row.cell,row.id,row.role,row.question,row.description,row.guidance,row.suggested,row.draft,row.tags.map(tag => tag.id + " · " + tag.label + " · " + tag.field + ": " + tag.evidence + " — " + tag.reason + (tag.connection ? " · " + tag.connection.status + (tag.connection.referent ? " → " + tag.connection.referent : "") : "")).join("\n"),row.status,row.final,row.reviewer,row.time,row.status === "Pending" ? row.note : row.recordedNote,reviewedRules,JSON.stringify(row.tags)])];
    const encode = value => String(value ?? "").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"").replace(/[&<>]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;"})[char]);
    const zip = new JSZip();
    const ns = "http://schemas.openxmlformats.org/";
    zip.file("[Content_Types].xml", '<Types xmlns="' + ns + 'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    const relation = (type, target) => '<Relationships xmlns="' + ns + 'package/2006/relationships"><Relationship Id="rId1" Type="' + ns + 'officeDocument/2006/relationships/' + type + '" Target="' + target + '"/></Relationships>';
    zip.file("_rels/.rels", relation("officeDocument","xl/workbook.xml"));
    zip.file("xl/_rels/workbook.xml.rels", relation("worksheet","worksheets/sheet1.xml"));
    zip.file("xl/workbook.xml", '<workbook xmlns="' + ns + 'spreadsheetml/2006/main" xmlns:r="' + ns + 'officeDocument/2006/relationships"><sheets><sheet name="Question QA" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file("xl/worksheets/sheet1.xml", '<worksheet xmlns="' + ns + 'spreadsheetml/2006/main"><sheetData>' +
      data.map((row,index) => '<row r="' + (index+1) + '">' + row.map((value,column) =>
        '<c r="' + String.fromCharCode(65+column) + (index+1) + '" t="inlineStr"><is><t xml:space="preserve">' + encode(value) + '</t></is></c>').join("") + '</row>').join("") + '</sheetData></worksheet>');
    const url = URL.createObjectURL(await zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
    const link = make("a", "");
    link.href = url;
    link.download = "forwood-question-review.xlsx";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { message(error.message); }
};

