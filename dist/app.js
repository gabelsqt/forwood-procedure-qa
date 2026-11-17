"use strict";

const byId = id => document.getElementById(id);
const make = (tag, value) => {
  const element = document.createElement(tag);
  element.textContent = value;
  if (tag === "textarea" || tag === "input") {
    element.spellcheck = false;
    element.setAttribute("spellcheck", "false");
    element.setAttribute("autocorrect", "off");
    element.setAttribute("autocapitalize", "off");
  }
  return element;
};
const defaults = {
  questionWordCue: 16,
  questionWordLimit: 24,
  disabledTags: [],
  replacements: { "prior to": "before", "have you carried out a check to confirm that": "have you checked that", "in order to": "to" },
  flagPhrases: ["as required", "where required", "if applicable", "as needed", "properly", "adequate", "safe"]
};
const checkDefinitions = [
  ["FW-SHORT", "Short, sharp questions", "Keep the question focused on the decision. Descriptions can explain the requirement. Guidance can provide detailed evidence and context."],
  ["FW-FORMAT", "Question mark", "Check that the question ends with a question mark."],
  ["FW-CONTEXT", "Supporting text", "Flag empty description or guidance fields."],
  ["FIT-1-FIELD", "Decision criteria", "Find discretionary phrases so you can check the applicable condition."],
  ["MANUAL-PICTURE", "Picture accuracy — manual review", "Confirm that the picture shows the intended control and agrees with the text."],
  ["MANUAL-DESCRIPTION", "Description accuracy — manual review", "Confirm that the description accurately states the control being checked."],
  ["MANUAL-GUIDANCE", "Guidance accuracy — manual review", "Confirm that What to Look For gives accurate evidence for this control."],
  ["FIT-2-PHYSICAL", "Physical difficulty — manual review", "Ask someone familiar with the task whether reach, visibility, posture, tools, and the work area allow it to be performed."],
  ["FIT-5-EMBEDDED", "Embedded actions", "Find required actions inside labeled notes, warnings, cautions, and reminders."],
  ["FIT-2-MEMORY", "Memory demand", "Check whether information recalled from training or an earlier discussion is available at the point of use."],
  ["FW-DOUBLE-NEG", "Double negative", "Find two nearby negative expressions. Check whether positive wording would make the requirement clearer."],
  ["FW-AMBIGUOUS", "Ambiguous", "Find phrases with several plausible interpretations. Confirm the intended meaning using the surrounding text."],
  ["FW-COMPLEX", "Overcomplicated", "Find long sentences or nested conditions. These are review cues, not automatic errors."],
  ["FIT-3-VAGUE", "Vague", "Find terms whose meaning may need an observable criterion."],
  ["FIT-2-ROLE", "Defined roles", "Find selected role titles that may need a qualification reference."],
  ["FIT-10-ORDER", "Condition placement", "Prompt review when a timing condition follows other text."],
  ["FIT-10-PUNCT", "Punctuation", "Look for repeated punctuation and unmatched opening parentheses."],
  ["FW-ANSWER", "Combined checks", "Find conjunctions so you can decide whether one answer is sufficient."],
  ["FW-GRAMMAR", "Grammar", "Check repeated words, selected article errors, and possible agreement or pronoun ambiguity. Make sure each pronoun clearly refers to a person, object, or condition."],
  ["FW-SPELLING", "Spelling", "Offline US English dictionary. Review technical terms and regional spellings."],
  ["FW-WORDING", "Plain wording", "Suggest your preferred wording replacements."]
];
const guidelineControls = new Map();
function phraseInput(parent, caption, values) {
  const label = make("label", caption);
  const input = make("textarea", "");
  input.rows = 2;
  input.value = values.join("\n");
  label.append(input);
  parent.append(label);
  return input;
}
function buildGuidelines() {
  for (const [id, name, description] of checkDefinitions) {
    const card = make("section", "");
    card.className = "guideline-card";
    const label = make("label", "");
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = true;
    label.append(enabled, document.createTextNode(name));
    card.append(label, make("p", description));
    const controls = {enabled};
    if (id === "FW-SHORT") {
      const limitLabel = make("label", "Consider shortening above this many words");
      controls.limit = document.createElement("input");
      controls.limit.type = "number";
      controls.limit.min = "1";
      controls.limit.value = defaults.questionWordCue;
      limitLabel.append(controls.limit);
      card.append(limitLabel);
      const maximumLabel = make("label", "Mark too long above this many words");
      controls.maximum = document.createElement("input");
      controls.maximum.type = "number";
      controls.maximum.min = "1";
      controls.maximum.value = defaults.questionWordLimit;
      maximumLabel.append(controls.maximum);
      card.append(maximumLabel, make("p", "These limits apply only to questions. Put explanation in the description and detailed context in the guidance. Guidance may reference images and videos."));

    }
    if (id === "FW-COMPLEX") {
      const limitLabel = make("label", "Flag a sentence above this many words");
      controls.limit = document.createElement("input");
      controls.limit.type = "number";
      controls.limit.min = "1";
      controls.limit.value = "30";
      limitLabel.append(controls.limit);
      const conditionLabel = make("label", "Flag a sentence at this many conditions");
      controls.conditions = document.createElement("input");
      controls.conditions.type = "number";
      controls.conditions.min = "2";
      controls.conditions.value = "3";
      conditionLabel.append(controls.conditions);
      card.append(limitLabel, conditionLabel);
    }
    if (id === "FIT-5-EMBEDDED") {
      controls.labels = phraseInput(card, "Supporting labels — one per line", ["note","warning","caution","reminder"]);
      controls.actions = phraseInput(card, "Action signals — one per line",
        ["must","shall","required to","do not","never","close","isolate","disconnect","remove","verify","wear","stop"]);
    }
    const phrases = {
      "FIT-1-FIELD":["if applicable", "where applicable", "when applicable", "as applicable", "if required", "where required", "when required", "as required", "if needed", "where needed", "when needed", "as needed", "if necessary", "where necessary", "when necessary", "as necessary", "if appropriate", "where appropriate", "when appropriate", "as appropriate", "if suitable", "where suitable", "when suitable", "as suitable", "where possible", "when possible", "if possible", "as possible", "where practicable", "when practicable", "if practicable", "as practicable", "where feasible", "when feasible", "if feasible", "as feasible", "if relevant", "where relevant", "when relevant", "as relevant", "if warranted", "where warranted", "when warranted", "as warranted", "if justified", "where justified", "when justified", "as circumstances require", "depending on circumstances", "depending on the circumstances", "depending on conditions", "depending on the conditions", "depending on the situation", "at your discretion", "at their discretion", "at the operator's discretion", "at the supervisor's discretion", "at the manager's discretion", "at the discretion of", "use your judgment", "use your judgement", "exercise judgment", "exercise judgement", "if in doubt", "when in doubt", "if unsure", "when unsure", "as deemed necessary", "as deemed appropriate", "as deemed suitable", "as considered necessary", "as considered appropriate", "as determined necessary", "as determined appropriate", "if conditions permit", "when conditions permit", "where conditions permit", "subject to conditions", "as the situation requires", "if circumstances permit", "when circumstances permit", "as and when required", "as and when necessary", "as and when needed"],
      "FIT-3-VAGUE":["properly","adequate","safe","appropriate","suitable","regularly","quickly","slowly"],
      "FIT-2-MEMORY":["as discussed","as previously discussed","as explained","as previously explained","as instructed","as previously instructed","as demonstrated","as shown during training","as covered in training","as taught in training","as learned in training","as discussed during training","as you were trained","as you have been trained","from memory","remember to","as usual","in the usual way","using the usual settings","using the normal settings","as agreed","as previously agreed","as mentioned earlier","as noted earlier","as briefed","as discussed in the briefing","as covered in the briefing"],
      "FW-AMBIGUOUS":["and/or","as appropriate","where possible","if necessary"],
      "FW-DOUBLE-NEG":["not","no","never","without","neither","nor","cannot","can’t","can't","don’t","don't","doesn’t","doesn't","isn’t","isn't","aren’t","aren't","mustn’t","mustn't","unsafe","unavailable","unprotected","unsecured","inadequate","impossible"],
      "FIT-2-ROLE":["authorized person","authorized individual","approved person","competent person"],
      "FIT-10-ORDER":["after","before","only if","provided that"],
      "FW-ANSWER":["and","with"]
    }[id];
    if (id === "FW-SPELLING") controls.accepted = phraseInput(card, "Accepted words — one per line", []);
    if (phrases) controls.phrases = phraseInput(card, "Words or phrases to find — one per line", phrases);
    if (id === "FW-WORDING") {
      controls.replacements = make("div", "");
      const addPair = (from = "", to = "") => {
        const pair = make("div", "");
        pair.className = "wording-pair";
        for (const [caption, value] of [["Find",from],["Suggest",to]]) {
          const label = make("label", caption);
          const input = make("input", "");
          input.value = value;
          label.append(input);
          pair.append(label);
        }
        const remove = make("button", "Remove");
        remove.type = "button";
        remove.onclick = () => pair.remove();
        pair.append(remove);
        controls.replacements.append(pair);
      };
      for (const [from,to] of Object.entries(defaults.replacements)) addPair(from,to);
      const add = make("button", "Add wording replacement");
      add.type = "button";
      add.onclick = () => addPair();
      card.append(controls.replacements, add);
    }
    guidelineControls.set(id, controls);
    byId("guideline-menu").append(card);
  }
}
buildGuidelines();
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
  exitIssueFocus();
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
    byId("preview").hidden = true;
    byId("review").hidden = true;
    byId("guideline-settings").hidden = true;
    byId("export").disabled = true;
    byId("preview").dataset.sheet = "";
    await renderWorkbookPreview();
    message("Choose the header row and assign columns in the preview, then choose Done — start review.");
  } catch (error) {
    message(error.message);
  } finally {
    byId("run").disabled = false;
    byId("file").disabled = false;
  }
};

const mappingFields = {question:"column", description:"description", guidance:"guidance", role:"role", id:"idColumn"};
const mappingLabels = {question:"Question",description:"Description",guidance:"What to look for",role:"Role",id:"ID"};
let previewRevision = 0;
function readSheetRows(data, strings) {
  return nodes(data, "row").map(row => ({
    number:Number(row.getAttribute("r")),
    cells:new Map(nodes(row,"c").map(cell => {
      const value = nodes(cell,"v")[0]?.textContent ?? "";
      const type = cell.getAttribute("t");
      return [cell.getAttribute("r")?.match(/^[A-Z]+/)?.[0],
        type === "s" ? strings[Number(value)] ?? "" :
        type === "inlineStr" ? nodes(cell,"t").map(node=>node.textContent).join("") : value];
    }))
  }));
}
async function renderWorkbookPreview() {
  if (!book) return;
  const revision = ++previewRevision;
  const selectedSheet = byId("sheet").value;
  const {zip,sheets,strings} = book;
  try {
    const data = await zipRead(zip, sheets.get(selectedSheet));
    if (revision !== previewRevision) return;
    const allRows = readSheetRows(data, strings);
    let header = Number(byId("headerRow").value);
    if (byId("preview").hidden || byId("preview").dataset.sheet !== selectedSheet) {
      const guessed = allRows.slice(0,20).find(row =>
        [...row.cells.values()].some(value => /^(question|questions|procedure|english)$/i.test(value.trim())));
      header = guessed?.number || 1;
      byId("headerRow").value = header;
      for (const id of Object.values(mappingFields)) byId(id).value = "";
    }
    if (!Number.isInteger(header) || header < 1) throw Error("Choose a positive header row.");
    const headerCells = allRows.find(row => row.number === header)?.cells || new Map();
    const sample = allRows.filter(row => row.number > header).slice(0,5);
    const columns = [...new Set([...headerCells.keys(),...sample.flatMap(row=>[...row.cells.keys()])])].filter(Boolean)
      .sort((a,b)=>a.length-b.length || a.localeCompare(b));
    const aliases = {
      question:/^(questions?|procedure|english)$/i,
      description:/^description$/i, guidance:/^(what to look for|guidance)$/i,
      role:/^(section|role|audience)$/i, id:/^(no\.?|id|number)$/i
    };
    for (const [field,id] of Object.entries(mappingFields)) {
      if (byId(id).value && !columns.includes(byId(id).value)) byId(id).value = "";
      if (!byId(id).value && byId("preview").dataset.sheet !== selectedSheet) {
        byId(id).value = columns.find(column=>aliases[field].test((headerCells.get(column)||"").trim())) || "";
      }
    }
    const table = make("table","");
    const head = make("thead",""), headerRow = make("tr","");
    headerRow.append(make("th","Row"));
    const selectors=[];
    for (const column of columns) {
      const th=make("th","");
      th.append(make("div",column+" · "+(headerCells.get(column)||"Untitled")));
      const select=make("select","");
      select.setAttribute("aria-label","Use column "+column+" as");
      select.append(new Option("Ignore",""),...Object.entries(mappingLabels).map(([field,label])=>new Option(label,field)));
      select.value=Object.keys(mappingFields).find(field=>byId(mappingFields[field]).value===column)||"";
      selectors.push({column,select});
      select.onchange=()=>{
        for(const id of Object.values(mappingFields)) if(byId(id).value===column) byId(id).value="";
        if(select.value) byId(mappingFields[select.value]).value=column;
        for(const item of selectors) item.select.value=Object.keys(mappingFields).find(field=>byId(mappingFields[field]).value===item.column)||"";
      };
      th.append(select);headerRow.append(th);
    }
    head.append(headerRow);table.append(head);
    const body=make("tbody","");
    for(const row of sample) {
      const tr=make("tr","");tr.append(make("th",String(row.number)));
      for(const column of columns) tr.append(make("td",row.cells.get(column)||""));
      body.append(tr);
    }
    table.append(body);
    byId("preview-table").replaceChildren(table);
    byId("preview").hidden=false;
    byId("preview").dataset.sheet=selectedSheet;
  } catch(error) {message(error.message);}
}
byId("sheet").onchange=renderWorkbookPreview;
byId("change-columns").onclick = () => { exitIssueFocus(); byId("preview").hidden=false; byId("review").hidden=true; byId("guideline-settings").hidden=true; };
byId("headerRow").onchange=renderWorkbookPreview;

function settings() {
  const rules = {questionWordCue:Number(guidelineControls.get("FW-SHORT").limit.value),
    questionWordLimit:Number(guidelineControls.get("FW-SHORT").maximum.value),
    disabledTags:[], phrases:{}, replacements:{}, flagPhrases:[], acceptedWords:guidelineControls.get("FW-SPELLING").accepted.value.split(/\r?\n/).map(word=>word.trim()).filter(Boolean),embeddedLabels:guidelineControls.get("FIT-5-EMBEDDED").labels.value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean), embeddedActions:guidelineControls.get("FIT-5-EMBEDDED").actions.value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean), complexWordLimit:Number(guidelineControls.get("FW-COMPLEX").limit.value), complexConditionLimit:Number(guidelineControls.get("FW-COMPLEX").conditions.value), version:"clarity-1"};
  if (!Number.isInteger(rules.questionWordCue) || rules.questionWordCue < 1)
    throw Error("Set the preferred question length to a positive whole number.");
  if (!Number.isInteger(rules.questionWordLimit) || rules.questionWordLimit < rules.questionWordCue)
    throw Error("Set the maximum question length to a whole number at least as large as the preferred length.");
  if (!Number.isInteger(rules.complexWordLimit) || rules.complexWordLimit < 1 ||
      !Number.isInteger(rules.complexConditionLimit) || rules.complexConditionLimit < 2)
    throw Error("Use positive whole numbers for complexity; the condition limit must be at least two.");
  for (const [id, control] of guidelineControls) {
    if (!control.enabled.checked) rules.disabledTags.push(id);
    if (control.phrases) rules.phrases[id] = [...new Set(control.phrases.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean))];
    if (control.replacements && control.enabled.checked) {
      for (const pair of control.replacements.children) {
        const [from,to] = [...pair.querySelectorAll("input")].map(input => input.value.trim());
        if (!from && !to) continue;
        if (!from || !to) throw Error("Fill both wording replacement fields, or remove the empty pair.");
        rules.replacements[from] = to;
      }
    }
  }
  rules.flagPhrases = [...rules.phrases["FIT-1-FIELD"], ...rules.phrases["FIT-3-VAGUE"]];
  return rules;
}
function matchesFor(text, phrases) {
  return phrases.flatMap(phrase => [...text.matchAll(pattern(phrase, "giu"))])
    .sort((a,b) => a.index - b.index);
}
function pattern(phrase, flags) {
  const escaped = [...phrase].map(character => "\\^$.*+?()[]{}|".includes(character) ? "\\" + character : character).join("");
  return new RegExp("(?<![\\p{L}\\p{N}])" + escaped + "(?![\\p{L}\\p{N}])", flags);
}
function decisionMatches(text, phrases) {
  const matches = matchesFor(text, phrases);
  const tokens = [...text.matchAll(/[\p{L}]+(?:['’][\p{L}]+)?/gu)];
  const starters = new Set(["if","when","where","as"]);
  const endings = new Set(phrases.flatMap(phrase => {
    const words = phrase.toLowerCase().split(/\s+/);
    return words.length === 2 && starters.has(words[0]) ? [words[1]] : [];
  }));
  for (let start=0;start<tokens.length;start++) {
    const first=tokens[start][0].toLowerCase();
    if (!starters.has(first)) continue;
    for (let end=start+1;end<Math.min(tokens.length,start+10);end++) {
      const between=text.slice(tokens[start].index,tokens[end].index);
      if (/[.!?;:\n]/.test(between)) break;
      const last=tokens[end][0].toLowerCase();
      if (!endings.has(last) || !phrases.some(phrase=>phrase.toLowerCase() === first+" "+last)) continue;
      const matched=text.slice(tokens[start].index,tokens[end].index+tokens[end][0].length);
      matches.push(Object.assign([matched],{index:tokens[start].index}));
      break;
    }
  }
  return matches.sort((a,b)=>b[0].length-a[0].length).filter((match,index,all)=>
    !all.slice(0,index).some(previous=>match.index < previous.index+previous[0].length &&
      match.index+match[0].length > previous.index));
}
function wordCount(text) {
  return (text.trim().match(/\S+/gu) || []).length;
}
function lengthReview(text, rules) {
  const count = wordCount(text);
  if (rules.disabledTags.includes("FW-SHORT")) return {count, label:"Length check off"};
  if (count > rules.questionWordLimit) return {count, label:"Too long"};
  if (count > rules.questionWordCue) return {count, label:"Consider shortening"};
  return {count, label:"Within preferred length"};
}
function analyze(record, rules) {
  const findings = [], tags = [], question = record.question.trim();
  let suggested = question;
  const add = (id, label, field, evidence, reason, level = "Review cue") => {
    if (rules.disabledTags?.includes(id)) return;
    const tag = {id, label, field, evidence, reason, level, decision:"Pending", decisionNote:""};
    tags.push(tag);
    findings.push(id + " · " + label + " · " + level + " · " + field + ': “' + evidence + '” — ' + reason);
  };
  add("FIT-2-PHYSICAL", "Physical feasibility", "question", "(manual review)",
    "Can the worker physically do this as written? Confirm reach, visibility, posture, tool use, and working conditions with someone who knows the task. If field confirmation is needed, choose Review later.", "Manual review");
  for (const [id,label,field,reason] of [
    ["MANUAL-PICTURE","Picture accuracy","picture","Does the picture show the intended control and agree with the question, description, and guidance? Review the picture in your source material. If it is unavailable, choose Review later. If no picture is intended, choose No change needed."],
    ["MANUAL-DESCRIPTION","Description accuracy","description","Does the description accurately state the control being checked? Check against the approved source and the picture when available."],
    ["MANUAL-GUIDANCE","Guidance accuracy","guidance","Does What to Look For give accurate, sufficient evidence for answering this question? Check that the picture supports the same criteria."]
  ]) add(id,label,field,"(manual review)",reason,"Manual review");
  const length = lengthReview(question, rules);
  if (length.count > rules.questionWordCue)
    add("FW-SHORT", length.label, "question", question,
      length.count + " words. Preferred maximum " + rules.questionWordCue + "; upper maximum " + rules.questionWordLimit +
      ". Keep the decision in the question. Move explanation to the description and detailed evidence to guidance, preserving essential conditions.");
  if (!question.endsWith("?"))
    add("FW-FORMAT", "Question format", "question", question, "The question has no closing question mark.", "Detected");
  for (const field of ["description", "guidance"]) {
    if (!record[field].trim())
      add("FW-CONTEXT", "Missing supporting text", field, "(empty)", "Confirm the source and provide the context needed to answer.", "Detected");
  }
  for (const field of ["question", "description", "guidance"]) {
    const text = record[field];
    // A supporting block starts at a standalone label, followed by a colon,
    // dash or line break, and ends at the next paragraph, numbered step or label.
    const lines = text.split(/\r?\n/);
    let supporting = null;
    const flushSupporting = () => {
      if (!supporting) return;
      const body = supporting.body.join("\n");
      const signals = matchesFor(body, rules.embeddedActions);
      const requirement = /^(must|shall|required to|do not|never)$/iu;
      const action = signals.find(match => {
        if (requirement.test(match[0])) return true;
        const prefix = body.slice(0,match.index);
        return !prefix.trim() || /[.!?;:]\s*$/.test(prefix) ||
          /(?:^|[.!?;:])\s*(?:please|before[^.!?;:]*,|after[^.!?;:]*,)\s*$/iu.test(prefix);
      });
      if (action) add("FIT-5-EMBEDDED", "Embedded action", field,
        supporting.source.join("\n"),
        "Should this action be a separate step? Action signal: “" + action[0] +
        "”. Check whether the supporting text contains an instruction the reader must perform.");
      supporting = null;
    };
    for (const line of lines) {
      const label = rules.embeddedLabels.find(candidate =>
        new RegExp("^\\s*" + candidate.replace(/[.*+?^$()|[\]{}\\]/g,"\\$&") + "(?:\\s*[:—–-]\\s*|\\s*$)","iu").test(line));
      if (label) {
        flushSupporting();
        const separator = line.search(/[:—–-]/u);
        supporting = {label:line.slice(0,separator < 0 ? line.length : separator).trim(),
          body:[separator < 0 ? "" : line.slice(separator+1).trim()], source:[line]};
      } else if (!line.trim() || /^\s*\d+[.)]\s/u.test(line)) {
        flushSupporting();
      } else if (supporting) { supporting.body.push(line); supporting.source.push(line); }
    }
    flushSupporting();
    for (const match of matchesFor(text, rules.phrases["FIT-2-MEMORY"])) {
      add("FIT-2-MEMORY", "Memory demand", field, match[0],
        "Can the reader find the information needed to do this? Check all three fields and any accessible approved reference. A reminder is acceptable when the necessary details are already available.");
    }
    for (const match of decisionMatches(text, rules.phrases["FIT-1-FIELD"])) {
      add("FIT-1-FIELD", "Decision criterion", field, match[0],
        "Check the question, description, guidance, and approved references for a usable criterion. Inserted words are included in the match.");
    }
    for (const phrase of rules.phrases["FIT-3-VAGUE"]) {
      const match = text.match(pattern(phrase,"iu"));
      if (match) add("FIT-3-VAGUE", "Vague", field, match[0],
        "Check the question, description, guidance, and approved references for a usable criterion. A defined term can be acceptable.");
    }
    const role = matchesFor(text, rules.phrases["FIT-2-ROLE"])[0];
    if (role) add("FIT-2-ROLE", "Role definition", field, role[0], "Confirm that this role and its qualification criteria are defined in an approved reference.");
    if (!rules.disabledTags.includes("FW-GRAMMAR")) {
      for (const reference of localLanguage.pronouns(text, ["it","its","this","that","they","them","their","these","those"])) {
        if (reference.candidates.length < 2 || !["it","its"].includes(reference.word.toLowerCase())) continue;
        add("FW-AMBIGUOUS", "Ambiguous", field, reference.word,
          "Make sure the pronoun clearly refers to a person, object, or condition. Possible referents: " + reference.candidates.join(", ") + ".");
        tags[tags.length-1].offset = reference.offset;
      }
    }
    for (const match of matchesFor(text, rules.phrases["FW-AMBIGUOUS"])) {
      add("FW-AMBIGUOUS", "Ambiguous", field, match[0],
        "Could readers interpret this in different ways? State the intended condition or choice explicitly.");
    }
    for (const sentence of text.split(/(?<=[.!?])\s+|\n+/u).filter(part => part.trim())) {
      const negatives = matchesFor(sentence, rules.phrases["FW-DOUBLE-NEG"]);
      const operator = /^(not|no|never|without|neither|nor|cannot|can't|can’t|don't|don’t|doesn't|doesn’t|isn't|isn’t|aren't|aren’t|mustn't|mustn’t)$/iu;
      const pair = negatives.find((match,index) => {
        const next = negatives[index+1];
        return next && operator.test(match[0]) &&
          wordCount(sentence.slice(match.index+match[0].length,next.index)) <= 5;
      });
      if (pair) {
        const next = negatives[negatives.indexOf(pair)+1];
        add("FW-DOUBLE-NEG", "Double negative", field,
          sentence.slice(pair.index,next.index+next[0].length),
          "Two nearby negative expressions may make this harder to interpret. Check whether they concern the same condition. Preserve the requirement, including any prohibition, when rewriting.");
      }
    }
    for (const sentence of text.split(/(?<=[.!?])\s+|\n+/u).filter(part => part.trim())) {
      const count = wordCount(sentence);
      const conditions = [...sentence.matchAll(/\b(if|unless|provided that|except when|only when|where|when)\b/giu)].length;
      if (count > rules.complexWordLimit || conditions >= rules.complexConditionLimit) {
        add("FW-COMPLEX", "Overcomplicated", field, sentence,
          count + " words; " + conditions + " condition markers. Consider shorter sentences or separate steps while keeping related conditions together.");
      }
    }
    for (const finding of localLanguage.language(text, rules.acceptedWords,
      !rules.disabledTags.includes("FW-GRAMMAR"), !rules.disabledTags.includes("FW-SPELLING"))) {
      add(finding.id, finding.label, field, finding.evidence, finding.reason);
    }
    const late = matchesFor(text, rules.phrases["FIT-10-ORDER"]).find(match => match.index > 0 && text.slice(0,match.index).trim());
    if (late)
      add("FIT-10-ORDER", "Condition placement", field, late[0], "Check whether a prerequisite should appear before the direction to act. Timing descriptions may be acceptable.");
    if (/([!?.,])\1|\(.*$/.test(text) && (/([!?.,])\1/.test(text) || (text.match(/\(/g) || []).length !== (text.match(/\)/g) || []).length))
      add("FIT-10-PUNCT", "Punctuation", field, text, "Check repeated punctuation or unmatched parentheses.");
  }
  const combined = matchesFor(question, rules.phrases["FW-ANSWER"])[0];
  if (combined) add("FW-ANSWER", "Combined checks", "question", combined[0],
    "Confirm whether one answer covers a single control. Several conditions may stay together when every applicable condition must pass and failures can be identified.");
  for (const [phrase, replacement] of Object.entries(rules.replacements)) {
    suggested = suggested.replace(pattern(phrase, "giu"), match => {
      add("FW-WORDING", "Plain wording", "question", match, 'Consider “' + replacement + '” while preserving meaning.');
      return match[0] === match[0].toUpperCase() ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
    });
  }
  return {...record, suggested, draft:suggested, findings, tags, descriptionDraft:record.description, guidanceDraft:record.guidance, finalCheck:{status:"Pending"}, status:"Pending", note:""};
}
function loadRows(records, rules) {
  if (!records.length) throw Error("No questions found below the selected header row.");
  if (rows.length && !confirm("Start a new review? Export your current decisions first if you want to keep them.")) return;
  rows = records.map(record => analyze(record, rules));
  reviewedRules = JSON.stringify(rules);
  active = rows[0];
  byId("review").hidden = false;
  byId("preview").hidden = true;
  byId("change-columns").hidden = !book;
  byId("guideline-settings").hidden = false;
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
      {id:"1", role:"Worker", question:"Have you carried out a check to confirm that the inspection tag is attached and readable prior to starting work?", description:"Before work starts, check that the inspection tag is attached and readable.", guidance:"Look for the tag on the item. Confirm that its text can be read."},
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

const tagColors = {
  "FIT-5-EMBEDDED":["#fce5d9","#8c492a","#ca8867"],
  "FIT-2-PHYSICAL":["#e8eef2","#425968","#8da3b0"],
  "FIT-2-MEMORY":["#e9e3ff","#58418c","#9781c9"],
  "FIT-3-VAGUE":["#fff2c6","#855800","#d39c24"],
  "FW-SPELLING":["#e1edff","#214e91","#5584cf"],
  "FW-GRAMMAR":["#f1e5ff","#623895","#9c72cd"],
  "FW-AMBIGUOUS":["#ffe3eb","#963653","#ce718d"],
  "FW-COMPLEX":["#ffead7","#8a4c14","#cc8b4e"],
  "FW-DOUBLE-NEG":["#ffdfdf","#953333","#ce6e6e"],
  "FIT-1-FIELD":["#d9f2ee","#1d685b","#50a494"],
  "FIT-2-ROLE":["#e6eafa","#46578f","#8797ca"],
  "FIT-10-ORDER":["#e1f1d9","#416d2c","#83ac6d"],
  "FIT-10-PUNCT":["#f1e5ff","#623895","#9c72cd"],
  "FW-ANSWER":["#d9f2ee","#1d685b","#50a494"],
  "FW-SHORT":["#ffead7","#8a4c14","#cc8b4e"],
  "FW-WORDING":["#e1f1d9","#416d2c","#83ac6d"]
};
function colorTag(element, id) {
  const [background,foreground,border] = tagColors[id] || ["#edf0f4","#45576a","#9baabc"];
  element.style.setProperty("--tag-bg",background);
  element.style.setProperty("--tag-fg",foreground);
  element.style.setProperty("--tag-border",border);
}

let focusOverlay;
let focusedIssue;
function exitIssueFocus() {
  if (focusedIssue) focusedIssue.classList.remove("issue-focus");
  focusedIssue = null;
  if (focusOverlay) focusOverlay.hidden = true;
}
function focusIssue(section) {
  exitIssueFocus();
  if (!focusOverlay) {
    focusOverlay = make("div", "");
    focusOverlay.className = "focus-overlay";
    const exit = make("button", "Exit focus · Esc");
    exit.className = "exit-focus";
    exit.onclick = exitIssueFocus;
    const reviewerLabel = make("label", "Reviewer");
    reviewerLabel.className = "focus-reviewer";
    const reviewer = make("input", "");
    reviewer.id = "focus-reviewer";
    reviewer.value = byId("reviewer").value;
    reviewer.oninput = () => { byId("reviewer").value = reviewer.value; };
    reviewerLabel.append(reviewer);
    focusOverlay.append(exit, reviewerLabel);
    document.body.append(focusOverlay);
  }
  focusedIssue = section;
  focusedIssue.classList.add("issue-focus");
  byId("focus-reviewer").value = byId("reviewer").value;
  focusOverlay.hidden = false;
}
document.addEventListener("keydown", event => {
  if (event.key === "Escape") exitIssueFocus();
});

function renderDetail() {
  exitIssueFocus();
  const row = active, panel = byId("detail");
  const tagDecisionViews = new Map();
  const stageBar = make("div", "");
  stageBar.className = "stage-bar";
  const orderedTags = [...row.tags].sort((a,b) => {
    const order = {question:0,description:1,guidance:2,picture:3};
    return order[a.field]-order[b.field] || Number(a.level==="Manual review")-Number(b.level==="Manual review");
  });
  row.reviewStage ??= "read";
  row.issueIndex ??= 0;
  let showGuidedStage = () => {};

  const finalPanel = make("section", "");
  finalPanel.className = "final-check";
  function renderFinalCheck() {
    const remaining = row.tags.filter(tag => !["Resolved","Dismissed"].includes(tag.decision)).length;
    if (remaining) {
      finalPanel.replaceChildren(make("h3","Final check"),
        make("p", "Finish " + remaining + " remaining issue" + (remaining === 1 ? "" : "s") + " to review the final draft."));
      return;
    }
    const heading = make("h3","Final check · Consistency");
    const preview = make("div","");
    preview.className = "final-draft";
    for (const [caption,text] of [["Question",row.draft],["Description",row.descriptionDraft],["What to look for",row.guidanceDraft]]) {
      preview.append(make("h4",caption),make("p",text || "No text"));
    }
    const picture = row.tags.find(tag=>tag.id==="MANUAL-PICTURE");
    if (picture) preview.append(make("small","Compare the picture in your source material with this final draft."));
    const prompt = make("p","Do the question, description, guidance, and any picture agree?");
    const status = make("p",row.finalCheck.status === "Confirmed" ? "Final check confirmed" :
      row.finalCheck.status === "Needs correction" ? "Corrections needed" : "Awaiting final review");
    const actions=make("div","");
    actions.className="actions";
    for (const [value,caption] of [["Confirmed","All parts agree"],["Needs correction","Needs correction"],["Pending","Reopen final check"]]) {
      const action=make("button",caption);
      action.hidden = value === "Pending" ? row.finalCheck.status === "Pending" : row.finalCheck.status === "Confirmed";
      action.className=value==="Confirmed"?"decision-primary":"secondary";
      action.onclick=()=>{
        const reviewer=byId("reviewer").value.trim();
        if(value!=="Pending"&&!reviewer){byId("reviewer").focus();message("Enter your reviewer name first.");return;}
        row.finalCheck={status:value,reviewer:value==="Pending"?"":reviewer,time:value==="Pending"?"":new Date().toISOString(),
          question:row.draft,description:row.descriptionDraft,guidance:row.guidanceDraft};
        renderFinalCheck();
      };
      actions.append(action);
    }
    finalPanel.replaceChildren(heading,preview,prompt,actions,status);
  }
  function resetFinalCheck() {
    row.finalCheck = {status:"Pending"};
    renderFinalCheck();
  }
  const compare = make("div", "");
  compare.className = "compare";
  const original = make("div", "");
  original.className = "original-column";
  original.append(make("h3", "Original question"));
  const label = make("label", "Corrected question");
  label.className = "suggestion-column";
  const draft = make("textarea", "");
  draft.value = row.draft;
  const counter = make("small", "");
  counter.setAttribute("role", "status");
  const invalidateResolved = field => {
    resetFinalCheck();
    for (const tag of row.tags.filter(tag => tag.field === field && tag.decision === "Resolved")) {
      tag.decision = "Pending";
      tag.reviewer = "";
      tag.decisionTime = "";
      const control = tagDecisionViews.get(tag);
      if (control) { control.chip.textContent = tag.label; control.status.textContent = "Pending — text changed"; }
    }
    row.status = row.tags.some(tag => tag.decision === "Needs edit") ? "Needs edit" :
      row.tags.some(tag => tag.decision === "Pending") ? "Pending" : "Reviewed";
    renderQueue();
    renderFinalCheck();
  };
  const updateCounter = () => {
    const rules = JSON.parse(reviewedRules);
    const result = lengthReview(draft.value, rules);
    counter.textContent = result.count + " words · " + result.label +
      " · preferred maximum " + rules.questionWordCue + ", upper maximum " + rules.questionWordLimit;
  };
  draft.oninput = () => { row.draft = draft.value; invalidateResolved("question"); updateCounter(); };
  updateCounter();
  label.append(draft, counter);
  const questionHasTags = row.tags.some(tag => tag.field === "question" && tag.level !== "Manual review");
  if (questionHasTags) compare.append(original, label);
  else {
    compare.classList.add("single-column");
    const optional = make("details", "");
    optional.className = "optional-suggestion";
    optional.open = row.draft !== row.question;
    optional.append(make("summary", "Add a correction"), label);
    original.append(optional);
    compare.append(original);
  }
  const fieldPanels = {};
  const tagTargets = new Map();
  const highlightedSpans = [];
  function openTag(tag, toggle = false) {
    const selected = tagTargets.get(tag);
    const shouldOpen = !(toggle && !selected.item.hidden);
    for (const [other,target] of tagTargets) {
      const expanded = other === tag && shouldOpen;
      target.item.hidden = !expanded;
      target.chip.setAttribute("aria-expanded", String(expanded));
    }
    emphasizeTag(shouldOpen ? tag : null);
    exitIssueFocus();
  }
  function emphasizeTag(tag) {
    for (const [other,target] of tagTargets) target.chip.classList.toggle("tag-selected",other === tag);
    for (const span of highlightedSpans) span.element.classList.toggle("tag-selected",span.tags.includes(tag));
  }
  const textPanels = {};
  for (const field of ["question", "description", "guidance", "picture"]) {
    const block = make("section", "");
    block.className = "tagged-field";
    const text = make("div", "");
    text.className = "source-text";
    const chips = make("div", "");
    chips.className = "field-tags";
    const explanations = make("div", "");
    block.append(text, chips, explanations);
    fieldPanels[field] = {block, chips, explanations};
    textPanels[field] = text;
  }
  original.append(fieldPanels.question.block);

  for (const tag of row.tags) {
    const item = make("div", "");
    item.className = "tag-explanation";
    colorTag(item,tag.id);
    item.hidden = true;
    const fieldPanel = fieldPanels[tag.field];
    const chip = make("button", tag.label);
    chip.className = "tag-chip";
    colorTag(chip,tag.id);
    chip.dataset.tagType = tag.id;
    chip.textContent = tag.label + ({Resolved:" · Fixed",Dismissed:" · No change needed","Needs edit":" · Review later"}[tag.decision] || "");
    chip.setAttribute("aria-expanded", "false");
    chip.onclick = () => {
      row.reviewStage = "issues";
      row.issueIndex = orderedTags.indexOf(tag);
      showGuidedStage();
    };
    fieldPanel.chips.append(chip);
    fieldPanel.explanations.append(item);
    tagTargets.set(tag, {item, chip});

    const prompts = {
      "FIT-5-EMBEDDED":"Should this action be a separate step?",
      "MANUAL-PICTURE":"Does the picture show the intended control?",
      "MANUAL-DESCRIPTION":"Does the description accurately state the control?",
      "MANUAL-GUIDANCE":"Does the guidance give the right evidence to check?",
      "FIT-2-PHYSICAL":"Can the worker physically do this as written?",
      "FIT-2-MEMORY":"Can the reader find the information needed to do this?",
      "FW-DOUBLE-NEG":"Can this be clearer with fewer negatives?",
      "FW-AMBIGUOUS":"Could this have more than one meaning?",
      "FW-COMPLEX":"Can this be easier to follow?",
      "FW-ANSWER":"Can this be answered with one Yes or No?",
      "FIT-1-FIELD":"Is it clear when this applies?",
      "FIT-3-VAGUE":"Is this term defined clearly enough to check?",
      "FIT-2-ROLE":"Is this person's role defined?",
      "FIT-10-ORDER":"Should this condition come first?",
      "FIT-10-PUNCT":"Does the punctuation need correcting?",
      "FW-SHORT":"Can you shorten the question?",
      "FW-FORMAT":"Should this end with a question mark?",
      "FW-CONTEXT":"Does this item need supporting text?",
      "FW-WORDING":"Would the shorter wording work here?",
      "FW-SPELLING":"Is this word spelled correctly?",
      "FW-GRAMMAR":tag.label === "Pronoun clarity" ? "Is it clear what this pronoun refers to?" : "Does this wording need correcting?"
    };
    item.append(make("p", prompts[tag.id] || tag.label));
    const details = make("details", "");
    details.append(make("summary", "Details"), make("p", tag.reason),
      make("small", tag.id + " · " + tag.level));
    item.append(details);
    const decisionNote = make("label", "Comment");
    const noteInput = make("textarea", "");
    noteInput.rows = 1;
    noteInput.className = "optional-comment";
    noteInput.value = tag.decisionNote;
    noteInput.oninput = () => { tag.decisionNote = noteInput.value; };
    decisionNote.append(noteInput);
    const comment = make("details", "");
    comment.className = "tag-comment";
    comment.open = Boolean(tag.decisionNote);
    comment.append(make("summary", tag.decisionNote ? "Comment" : "Add comment"), decisionNote);
    const decisionLabels = {Pending:"Awaiting review", "Needs edit":"Review later", Resolved:"Fixed", Dismissed:"No change needed"};
    const decisionStatus = make("p", decisionLabels[tag.decision]);
    decisionStatus.setAttribute("role", "status");
    tagDecisionViews.set(tag, {chip, status:decisionStatus});
    const tagActions = make("div", "");
    tagActions.className = "actions";
    for (const [value, caption] of [["Resolved","✓ Fixed"],["Dismissed","No change needed"],["Needs edit","Review later"],["Pending","Reopen issue"]]) {
      const action = make("button", caption);
      action.type = "button";
      action.className = value === "Resolved" ? "decision-primary" : value === "Needs edit" || value === "Pending" ? "decision-text" : "decision-secondary";
      action.hidden = tag.decision === "Resolved" || tag.decision === "Dismissed"
        ? value !== "Pending"
        : value === tag.decision || (value === "Pending" && tag.decision === "Pending");
      action.title = {
        Resolved:"The issue has been addressed in the text.",
        Dismissed:"The flagged wording is acceptable as written.",
        "Needs edit":"Leave this issue for another pass.",
        Pending:"Return this issue to review."
      }[value];
      action.onclick = () => {
        const reviewer = byId("reviewer").value.trim();
        if (value !== "Pending" && !reviewer) {
          decisionStatus.textContent = "Enter your reviewer name first.";
          (focusedIssue ? byId("focus-reviewer") : byId("reviewer")).focus();
          return;
        }
        tag.decision = value;
        row.finalCheck = {status:"Pending"};
        tag.reviewer = value === "Pending" ? "" : reviewer;
        tag.decisionTime = value === "Pending" ? "" : new Date().toISOString();
        tag.reviewedText = value === "Pending" ? "" : tag.field === "picture" ? "Picture reviewed in source material" : tag.field === "question" ? row.draft : row[tag.field + "Draft"];
        decisionStatus.textContent = decisionLabels[value];
        for (const otherAction of tagActions.children) {
          otherAction.hidden = value === "Resolved" || value === "Dismissed"
            ? otherAction.dataset.decision !== "Pending"
            : otherAction.dataset.decision === value ||
              (otherAction.dataset.decision === "Pending" && value === "Pending");
        }
        chip.textContent = tag.label + (value === "Pending" ? "" : " · " + decisionLabels[value]);
        if (value === "Resolved" || value === "Dismissed") {
          item.hidden = true;
          chip.setAttribute("aria-expanded", "false");
          chip.focus();
          exitIssueFocus();
        }
        row.status = row.tags.some(t => t.decision === "Needs edit") ? "Needs edit" :
          row.tags.some(t => t.decision === "Pending") ? "Pending" : "Reviewed";
        renderQueue();
        renderFinalCheck();
        if (value !== "Pending") {
          row.issueIndex = orderedTags.indexOf(tag) + 1;
          row.reviewStage = row.issueIndex < orderedTags.length ? "issues" : "final";
        }
        showGuidedStage();
      };
      action.dataset.decision = value;
      tagActions.append(action);
    }
    item.append(tagActions, decisionStatus, comment);
  }
  const supportingSections = {};
  for (const [field, caption] of [["description","Description"],["guidance","What to look for"]]) {
    const section = make("section", "");
    section.append(make("h3", caption));
    const hasTags = row.tags.some(tag => tag.field === field && tag.level !== "Manual review");
    if (hasTags) {
      const pair = make("div", "");
      pair.className = "compare supporting-compare";
      const editLabel = make("label", field === "guidance" ? "Corrected guidance" : "Corrected description");
      editLabel.className = "suggestion-column";
      const edit = make("textarea", "");
      edit.value = row[field + "Draft"];
      edit.oninput = () => { row[field + "Draft"] = edit.value; invalidateResolved(field); };
      editLabel.append(edit);
      pair.append(fieldPanels[field].block, editLabel);
      section.append(pair);
    } else {
      section.append(fieldPanels[field].block);
      const optional = make("details", "");
      optional.className = "optional-suggestion";
      optional.open = row[field+"Draft"] !== row[field];
      const editLabel = make("label", field === "guidance" ? "Corrected guidance" : "Corrected description");
      const edit = make("textarea", "");
      edit.value = row[field+"Draft"];
      edit.oninput = () => { row[field+"Draft"] = edit.value; invalidateResolved(field); };
      editLabel.append(edit);
      optional.append(make("summary", "Add a correction"), editLabel);
      section.append(optional);
    }
    supportingSections[field] = section;
  }
  const noteLabel = make("label", "Comment");
  const note = make("textarea", "");
  note.value = row.note;
  note.oninput = () => { row.note = note.value; };
  note.rows = 2;
  noteLabel.append(note);
  const reviewComment = make("details", "");
  reviewComment.className = "optional-suggestion";
  reviewComment.open = Boolean(row.note);
  reviewComment.append(make("summary", "Add general comment"), noteLabel);
  for (const field of ["question", "description", "guidance"]) {
    const source = row[field];
    const ranges = [];
    for (const tag of row.tags.filter(tag => tag.field === field && tag.evidence !== "(empty)")) {
      if (Number.isInteger(tag.offset)) {
        ranges.push({start:tag.offset,end:tag.offset+tag.evidence.length,tag});
      } else {
        for (const match of source.matchAll(pattern(tag.evidence, "giu"))) {
          ranges.push({start:match.index,end:match.index+match[0].length,tag});
        }
      }
    }
    const points = [...new Set([0,source.length,...ranges.flatMap(range=>[range.start,range.end])])].sort((a,b)=>a-b);
    for (let index=0;index<points.length-1;index++) {
      const start=points[index], end=points[index+1];
      const covering=ranges.filter(range=>range.start<=start && range.end>=end);
      if (!covering.length) {
        textPanels[field].append(document.createTextNode(source.slice(start,end)));
        continue;
      }
      const highlight=make("button",source.slice(start,end));
      highlight.className="text-highlight";
      colorTag(highlight,covering[0].tag.id);
      highlightedSpans.push({element:highlight,tags:covering.map(range=>range.tag)});
      if (covering.length > 1) {
        const colors = [...new Set(covering.map(range => (tagColors[range.tag.id] || ["#edf0f4"])[0]))];
        highlight.style.backgroundImage = "linear-gradient(135deg," + colors.map((color,index)=>
          color + " " + (index*100/colors.length) + "%," + color + " " + ((index+1)*100/colors.length) + "%").join(",") + ")";
      }
      highlight.setAttribute("data-tag-label", covering.map(range=>range.tag.label).join(", "));
      highlight.setAttribute("aria-label",source.slice(start,end)+". Review "+covering.map(range=>range.tag.label).join(", "));
      highlight.onclick=()=>{
        const current = covering.find(range => !tagTargets.get(range.tag).item.hidden);
        const next = current ? (covering.indexOf(current) + 1) % covering.length : 0;
        const tag = covering[next].tag;
        row.reviewStage = "issues";
        row.issueIndex = orderedTags.indexOf(tag);
        showGuidedStage();
        tagTargets.get(tag).item.scrollIntoView({block:"nearest"});
      };
      textPanels[field].append(highlight);
    }
    if (!source) textPanels[field].append(make("span","Missing from import"));
  }
  const pictureSection = make("section", "");
  pictureSection.append(make("h3","Picture review"),
    make("small","Review the picture in your source material. Pictures are not displayed in this version."),
    fieldPanels.picture.block);
  const reviewHint = make("small","Tags refer to imported text. Edited suggestions need your review.");
  showGuidedStage = () => {
    const reading = row.reviewStage === "read";
    const final = row.reviewStage === "final";
    panel.classList.toggle("reading-canvas", !final);
    const tag = row.reviewStage === "issues" ? orderedTags[row.issueIndex] : null;
    compare.hidden = final || (!reading && tag?.field !== "question");
    supportingSections.description.hidden = reading || final || tag?.field !== "description";
    supportingSections.guidance.hidden = reading || final || tag?.field !== "guidance";
    pictureSection.hidden = reading || final || tag?.field !== "picture";
    finalPanel.hidden = !final;
    reviewComment.hidden = !final;
    reviewHint.hidden = !final;
    label.hidden = reading;
    compare.classList.toggle("single-column",reading);
    for (const [other,target] of tagTargets) {
      target.chip.hidden = other !== tag;
      target.item.hidden = other !== tag;
      target.chip.setAttribute("aria-expanded",String(other === tag));
    }
    for (const span of highlightedSpans) {
      span.element.classList.toggle("inactive-highlight", !tag || !span.tags.includes(tag));
    }
    emphasizeTag(tag);
    stageBar.replaceChildren();
    if (reading) {
      stageBar.append(make("p","Read the question first."));
      const start = make("button","Start review");
      start.onclick = () => {
        row.reviewStage = orderedTags.length ? "issues" : "final";
        row.issueIndex = 0;
        showGuidedStage();
        panel.scrollIntoView({block:"start",behavior:"smooth"});
      };
      stageBar.append(start);
    } else {
      const progress = make("p",final ? "Final draft review" :
        "Issue " + (row.issueIndex+1) + " of " + orderedTags.length + " · " +
        ({question:"Question",description:"Description",guidance:"What to look for",picture:"Picture"}[tag?.field] || ""));
      const back = make("button","Back");
      back.className = "secondary";
      back.onclick = () => {
        if (final && orderedTags.length) {row.reviewStage="issues";row.issueIndex=orderedTags.length-1;}
        else if (row.issueIndex > 0) row.issueIndex--;
        else row.reviewStage="read";
        showGuidedStage();
      };
      stageBar.append(progress,back);
      if (!final && tag && ["Resolved","Dismissed","Needs edit"].includes(tag.decision)) {
        const next = make("button","Next");
        next.onclick = () => {
          row.issueIndex++;
          if(row.issueIndex >= orderedTags.length) row.reviewStage="final";
          showGuidedStage();
        };
        stageBar.append(next);
      }
      if (final) {
        const unfinished = orderedTags.findIndex(issue => !["Resolved","Dismissed"].includes(issue.decision));
        if (unfinished >= 0) {
          const resume = make("button","Review remaining issues");
          resume.onclick=()=>{row.reviewStage="issues";row.issueIndex=unfinished;showGuidedStage();};
          stageBar.append(resume);
        }
      }
    }
    renderFinalCheck();
  };
  renderFinalCheck();
  panel.replaceChildren(make("h2", [row.role, row.id, row.cell].filter(Boolean).join(" · ")), stageBar, compare,
    supportingSections.description, supportingSections.guidance,
    pictureSection, reviewHint,
    reviewComment, finalPanel);
  showGuidedStage();
}

byId("export").onclick = async () => {
  try {
    const data = [["Source workbook","Sheet","Question cell","ID","Role","Original question","Description","What to look for","Suggestion","Draft","Review cues","Review status","Question draft","Reviewer","Decision time (UTC)","Review note","Guidelines JSON","Structured tags JSON","Description draft","Guidance draft","Description for review","Guidance for review","Final consistency check"],
      ...rows.map(row => [row.source,row.sheet,row.cell,row.id,row.role,row.question,row.description,row.guidance,row.suggested,row.draft,row.tags.map(tag => tag.id + " · " + tag.label + " · " + tag.field + ": " + tag.evidence + " — " + tag.reason + " · Decision: " + tag.decision + (tag.connection ? " · " + tag.connection.status + (tag.connection.referent ? " → " + tag.connection.referent : "") : "")).join("\n"),row.status,row.draft,"","",row.note,reviewedRules,JSON.stringify(row.tags),row.descriptionDraft,row.guidanceDraft,row.descriptionDraft,row.guidanceDraft,JSON.stringify(row.finalCheck)])];
    const encode = value => String(value ?? "").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"").replace(/[&<>]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;"})[char]);
    if (byId("report-format").value === "html") {
      const fieldNames = {question:"Question",description:"Description",guidance:"What to look for"};
      const sections = rows.map(row => {
        const content = Object.entries(fieldNames).map(([field,caption]) => {
          const draft = field === "question" ? row.draft : row[field+"Draft"];
          return "<h3>" + caption + "</h3><div class=pair><div><b>Original</b><p>" + encode(row[field]) +
            "</p></div><div><b>Draft</b><p>" + encode(draft) + "</p></div></div>";
        }).join("");
        const tags = row.tags.map(tag => "<li><strong>" + encode(tag.label) + " — " + encode(tag.decision) +
          "</strong><p>" + encode(fieldNames[tag.field] || "Picture") + " · “" + encode(tag.evidence) + "”</p><p>" +
          encode(tag.reason) + "</p><p>" + encode(tag.decisionNote) + "</p><small>" +
          encode(tag.reviewer || "") + " · " + encode(tag.decisionTime || "") +
          "</small>" + (tag.reviewedText ? "<details><summary>Text at decision</summary><p>" +
          encode(tag.reviewedText) + "</p></details>" : "") + "</li>").join("");
        return "<article><h2>" + encode([row.role,row.id].filter(Boolean).join(" · ")) +
          "</h2><p>" + encode(row.source) + " · " + encode(row.sheet) + " · " + encode(row.cell) +
          "</p>" + content + "<h3>Tag decisions</h3>" + (tags ? "<ul>" + tags + "</ul>" : "<p>No tags found.</p>") +
          "<h3>Review note</h3><p>" + encode(row.note) + "</p><h3>Final consistency check</h3><p>" + encode(row.finalCheck.status) + "</p><small>" + encode(row.finalCheck.reviewer || "") + " · " + encode(row.finalCheck.time || "") + "</small></article>";
      }).join("");
      const report = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Procedure QA report</title><style>body{max-width:1050px;margin:32px auto;padding:0 20px;font:16px/1.5 system-ui;color:#182838}article{border-top:2px solid #cbd8d3;margin-top:30px;padding-top:16px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pair>div,li{padding:12px;background:#f3f6f5;border-radius:6px}li{margin-bottom:10px}p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#51677a}pre{white-space:pre-wrap}@media(max-width:600px){.pair{grid-template-columns:1fr}}@media print{article{break-inside:auto}}</style><h1>Procedure QA report</h1><p>Generated ' +
        encode(new Date().toISOString()) + ' · ' + rows.length + ' items</p>' + sections +
        '<details><summary>Guideline settings</summary><pre>' + encode(reviewedRules) + '</pre></details></html>';
      downloadReport(new Blob([report],{type:"text/html;charset=utf-8"}),"procedure-qa-report.html");
      return;
    }
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
    downloadReport(await zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),"procedure-qa-report.xlsx");
  } catch (error) { message(error.message); }
};


function downloadReport(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = make("a", "");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
