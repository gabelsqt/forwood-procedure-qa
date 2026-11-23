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
function filePicker(input) {
  const wrapper=make("div","");
  wrapper.className="file-picker";
  const button=make("button","Choose file");
  button.type="button";button.className="secondary";
  const filename=make("span","No file selected");
  filename.className="file-picker-name";
  input.hidden=true;
  button.onclick=()=>input.click();
  input.addEventListener("change",()=>{
    filename.textContent=input.files[0]?.name || "No file selected";
  });
  wrapper.append(input,button,filename);
  return wrapper;
}
let spellingMenu;
function closeSpellingMenu() {
  if(spellingMenu) spellingMenu.remove();
  spellingMenu=null;
}
document.addEventListener("pointerdown",event=>{
  if(spellingMenu&&!spellingMenu.contains(event.target))closeSpellingMenu();
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape")closeSpellingMenu();
});
function spellingOptions() {
  try {
    return rows.length && reviewedRules ? JSON.parse(reviewedRules) : settings();
  } catch { return {disabledTags:[],acceptedWords:[]}; }
}
function installSpellingEditor(input) {
  if(input.dataset.spellingEditor) { input._refreshSpelling?.(); return; }
  input.dataset.spellingEditor="true";
  if(!input.hasAttribute("aria-label")) {
    const label=input.closest("label");
    const caption=label ? [...label.childNodes].filter(node=>node.nodeType===3).map(node=>node.textContent).join("").trim() : "";
    if(caption)input.setAttribute("aria-label",caption);
  }
  const wrapper=make("div","");
  wrapper.className="spelling-editor";
  const mirror=make("div","");
  mirror.className="spelling-mirror";
  mirror.setAttribute("aria-hidden","true");
  input.parentNode.insertBefore(wrapper,input);
  wrapper.append(mirror,input);
  input.classList.add("spelling-input");
  let timer;
  let words=[];
  function refresh() {
    if(!input.isConnected)return;
    const style=getComputedStyle(input);
    for(const property of ["fontFamily","fontSize","fontWeight","fontStyle","letterSpacing","lineHeight",
      "textAlign","textIndent","paddingTop","paddingBottom","paddingLeft","paddingRight","borderTopWidth",
      "borderBottomWidth","borderLeftWidth","borderRightWidth","tabSize"]) mirror.style[property]=style[property];
    mirror.style.width=input.clientWidth+"px";
    mirror.style.height=input.clientHeight+"px";
    mirror.style.borderStyle="solid";
    mirror.style.borderColor="transparent";
    mirror.style.boxSizing="content-box";
    // Copy the textarea's outer dimensions, including its own padding and border.
    mirror.style.boxSizing="border-box";
    mirror.style.width=(input.clientWidth+parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth))+"px";
    mirror.style.height=input.offsetHeight+"px";
    const options=spellingOptions();
    const enabled=!options.disabledTags.includes("FW-SPELLING");
    const allowed=new Set((options.acceptedWords||[]).map(word=>word.toLowerCase()));
    const content=make("div","");
    content.className="spelling-mirror-content";
    words=[];
    let cursor=0;
    for(const match of input.value.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)?/g)) {
      content.append(document.createTextNode(input.value.slice(cursor,match.index)));
      const word=match[0];
      if(enabled&&!allowed.has(word.toLowerCase())&&!localLanguage.checkWord(word)) {
        const span=make("span",word);
        span.className="spelling-error";
        content.append(span);
        words.push({word,start:match.index,end:match.index+word.length,span});
      } else content.append(document.createTextNode(word));
      cursor=match.index+word.length;
    }
    content.append(document.createTextNode(input.value.slice(cursor)+"\n"));
    mirror.replaceChildren(content);
    content.style.transform="translate("+(-input.scrollLeft)+"px,"+(-input.scrollTop)+"px)";
  }
  input._refreshSpelling=refresh;
  input.addEventListener("input",()=>{
    if(input.closest(".inline-correction")){input.style.height="auto";input.style.height=Math.max(80,input.scrollHeight+4)+"px";}
    closeSpellingMenu();
    clearTimeout(timer);timer=setTimeout(refresh,150);
  });
  input.addEventListener("scroll",()=>{
    const content=mirror.firstElementChild;
    if(content)content.style.transform="translate("+(-input.scrollLeft)+"px,"+(-input.scrollTop)+"px)";
  });
  function openMenu(word,x,y) {
    closeSpellingMenu();
    const menu=make("div","");
    spellingMenu=menu;
    menu.className="spelling-menu";
    menu.setAttribute("role","menu");
    menu.setAttribute("aria-label","Spelling suggestions for "+word.word);
    menu.append(make("small","Spelling · "+word.word));
    const suggestions=localLanguage.suggestions(word.word);
    if(!suggestions.length)menu.append(make("p","No suggestions found"));
    for(const suggestion of suggestions) {
      const button=make("button",suggestion);
      button.type="button";button.setAttribute("role","menuitem");
      button.onclick=()=>{
        if(input.value.slice(word.start,word.end)!==word.word){closeSpellingMenu();return;}
        input.focus();
        input.setRangeText(suggestion,word.start,word.end,"end");
        closeSpellingMenu();
        input.dispatchEvent(new Event("input",{bubbles:true}));
        refresh();
      };
      menu.append(button);
    }
    const close=make("button","Close");
    close.type="button";close.setAttribute("role","menuitem");
    close.onclick=()=>{closeSpellingMenu();input.focus();};
    menu.append(close);
    menu.onkeydown=event=>{
      const buttons=[...menu.querySelectorAll("button")];
      const index=buttons.indexOf(document.activeElement);
      if(event.key==="ArrowDown"||event.key==="ArrowUp"){
        event.preventDefault();
        buttons[(index+(event.key==="ArrowDown"?1:-1)+buttons.length)%buttons.length].focus();
      }
    };
    document.body.append(menu);
    menu.style.left=Math.max(8,Math.min(x,window.innerWidth-menu.offsetWidth-8))+"px";
    menu.style.top=Math.max(8,Math.min(y,window.innerHeight-menu.offsetHeight-8))+"px";
    menu.querySelector("button")?.focus();
  }
  input.addEventListener("contextmenu",event=>{
    refresh();
    const word=words.find(word=>[...word.span.getClientRects()].some(rect=>
      event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom));
    if(!word)return;
    event.preventDefault();openMenu(word,event.clientX,event.clientY);
  });
  input.addEventListener("keydown",event=>{
    if((event.shiftKey&&event.key==="F10")||event.key==="ContextMenu"){
      refresh();
      const word=words.find(word=>input.selectionStart>=word.start&&input.selectionStart<=word.end);
      if(word){event.preventDefault();const rect=word.span.getBoundingClientRect();openMenu(word,rect.left,rect.bottom);}
    }
  });
  const observer=new ResizeObserver(refresh);
  observer.observe(input);
  input._disposeSpelling=()=>{clearTimeout(timer);observer.disconnect();};
  refresh();
}
function disposeSpellingEditors(container) {
  for(const input of container.querySelectorAll("textarea"))input._disposeSpelling?.();
}
function refreshSpellingEditors(container) {
  for(const input of container.querySelectorAll("textarea"))installSpellingEditor(input);
}
const pictureRecommendations = [
  "Realistic.",
  "Clearly readable.",
  "Technically believable.",
  "Appropriate to the industry.",
  "Appropriate to the task.",
  "Visually accurate enough for a worker or supervisor to say, “Yes, that’s right” or “No, that’s wrong.”"
];
function pictureRecommendationList() {
  const list=make("ol","");
  list.className="picture-recommendations";
  for(const recommendation of pictureRecommendations)list.append(make("li",recommendation));
  return list;
}
function pictureRecommendationDetails() {
  const details=make("details","");
  details.append(make("summary","Picture review criteria"),pictureRecommendationList());
  return details;
}
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
  ["MANUAL-PICTURE", "Picture accuracy — manual review", "Check realism, readability, technical credibility, industry and task suitability, and whether a worker or supervisor can judge its accuracy."],
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

const mappingFields = {question:"column", description:"description", guidance:"guidance", role:"role", risk:"riskColumn", control:"controlColumn", id:"idColumn"};
const mappingLabels = {question:"Question",description:"Description",guidance:"What to look for",role:"Level",risk:"Critical risk",control:"Critical control",id:"ID"};
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
      role:/^(section|role|audience|level)$/i, risk:/^(critical risk|risk)$/i, control:/^(critical control|control)$/i, id:/^(no\.?|id|number)$/i
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
    ["MANUAL-PICTURE","Picture accuracy","picture","Does the picture show the intended control and agree with the question, description, and guidance? " + pictureRecommendations.join(" ") + " If the picture is unavailable, choose Review later."],
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
  return {...record, originalPictureUrl:record.pictureUrl || "",acceptedContent:{question:record.question,description:record.description,guidance:record.guidance,picture:record.pictureUrl || ""},finalPictureCheck:{status:"Pending"}, analysisText:{question:record.question,description:record.description,guidance:record.guidance},tagHistory:[],suggested, draft:suggested, findings, tags, descriptionDraft:record.description, guidanceDraft:record.guidance, finalCheck:{status:"Pending"}, status:"Pending", note:""};
}
const automaticRechecks = new WeakMap();
function scheduleRecheck(row, field, input) {
  if(!automaticRechecks.has(row)) automaticRechecks.set(row,new Map());
  const timers=automaticRechecks.get(row);
  clearTimeout(timers.get(field));
  timers.set(field,setTimeout(() => {
    const current = field === "question" ? row.draft : row[field+"Draft"];
    if(current === row.analysisText[field]) return;
    const editing = document.activeElement === input;
    const start = input.selectionStart, end = input.selectionEnd;
    const beforeReview=row.reviewStage==="read";
    recheckSection(row,field,JSON.parse(reviewedRules));
    if(beforeReview)row.reviewStage="read";
    renderQueue();
    if(active !== row) return;
    renderDetail();
    if(editing) {
      const source = byId("detail").querySelector('[data-edit-field="'+field+'"]');
      if(beforeReview)source?.ondblclick({preventDefault(){}});
      const editor = byId("detail").querySelector('[data-correction-field="'+field+'"] textarea');
      if(editor){editor.focus();editor.setSelectionRange(start,end);}
    }
  },1000));
}
function pictureRecheckRequired(row) {
  return row.draft !== row.question || row.descriptionDraft !== row.description ||
    row.guidanceDraft !== row.guidance || (row.pictureUrl || "") !== row.originalPictureUrl;
}
function pictureReviewKey(row) {
  return JSON.stringify([row.draft,row.descriptionDraft,row.guidanceDraft,row.pictureUrl || ""]);
}
function currentSection(row, field) {
  return field === "picture" ? row.pictureUrl || "" : field === "question" ? row.draft : row[field+"Draft"];
}
function sectionChanged(row, field) {
  return currentSection(row,field) !== row.acceptedContent[field];
}
function nextUnfinishedQuestion(current) {
  const index=rows.indexOf(current);
  const ordered=[...rows.slice(index+1),...rows.slice(0,index)];
  return ordered.find(row=>row.finalCheck.status!=="Confirmed");
}
function reviewTags(row) {
  return [...(row.tagHistory || []), ...row.tags];
}
function recheckSection(row, field, rules) {
  const text = field === "question" ? row.draft : row[field+"Draft"];
  const snapshot = {...row, ...row.analysisText, [field]:text};
  const fresh = analyze(snapshot, rules).tags.filter(tag=>tag.field===field);
  row.tagHistory ??= [];
  for (const tag of row.tags.filter(tag=>tag.field===field)) {
    if(tag.decision !== "Pending")
      row.tagHistory.push({...tag, analyzedText:row.analysisText[field], archived:true});
  }
  row.tags = [...row.tags.filter(tag=>tag.field!==field),...fresh];
  row.analysisText[field] = text;
  row.findings = row.tags.map(tag=>tag.id+" · "+tag.label+" · "+tag.reason);
  row.finalCheck = {status:"Pending"};
  const order = {picture:0,question:1,description:2,guidance:3};
  const ordered = [...row.tags].sort((a,b)=>order[a.field]-order[b.field] ||
    Number(a.level==="Manual review")-Number(b.level==="Manual review"));
  let next = ordered.findIndex(tag=>tag.field===field && !["Resolved","Dismissed"].includes(tag.decision));
  if(next<0)next=ordered.findIndex(tag=>!["Resolved","Dismissed"].includes(tag.decision));
  row.issueIndex = Math.max(0,next);
  row.reviewStage = next<0 ? "final" : "issues";
  row.status = row.tags.some(tag=>tag.decision==="Needs edit") ? "Needs edit" :
    row.tags.some(tag=>tag.decision==="Pending") ? "Pending" : "Reviewed";
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
    const fields = {question:"column", id:"idColumn", description:"description", guidance:"guidance", role:"role", risk:"riskColumn", control:"controlColumn"};
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
function samplePicture(kind) {
  const frame = '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="360" viewBox="0 0 700 360"><rect width="700" height="360" rx="18" fill="#edf3f5"/><text x="28" y="34" font-family="Arial,sans-serif" font-size="16" fill="#526678">ILLUSTRATIVE SAMPLE</text>';
  const drawings = {
    attached:'<path d="M100 260 C38 155 86 75 173 80 C272 84 276 173 215 225 L160 280" fill="none" stroke="#7c93a0" stroke-width="30"/><path d="M100 260 C38 155 86 75 173 80 C272 84 276 173 215 225 L160 280" fill="none" stroke="#b9c8d0" stroke-width="5" stroke-dasharray="10 8"/><path d="M200 200 Q290 210 360 118" fill="none" stroke="#344e5d" stroke-width="5"/><rect x="350" y="75" width="290" height="220" rx="12" fill="white" stroke="#3d655c" stroke-width="3"/><circle cx="375" cy="98" r="7" fill="#edf3f5"/><g font-family="Arial,sans-serif" fill="#244e44"><text x="375" y="140" font-size="23">SLING IDENTIFICATION</text><text x="375" y="181" font-size="20">ID: SLING-DEMO-01</text><text x="375" y="218" font-size="17">Manufacturer information</text><text x="375" y="254" font-size="16">Illustration — training only</text><text x="85" y="333" font-size="19">Sling eye with an attached, readable identification tag</text></g>',
    record:'<rect x="120" y="65" width="460" height="235" rx="12" fill="white" stroke="#718b97" stroke-width="3"/><text x="145" y="105" font-family="Arial,sans-serif" font-size="25" fill="#244e44">SLING INSPECTION RECORD</text><path d="M145 125H555 M145 180H555 M145 235H555 M300 125V275 M430 125V275" stroke="#a3b5be" stroke-width="2"/><g font-family="Arial,sans-serif" font-size="18" fill="#344e5d"><text x="150" y="157">Date</text><text x="315" y="157">Inspector</text><text x="445" y="157">Item</text><text x="150" y="213">20 Nov 2026</text><text x="315" y="213">A. Smith</text><text x="445" y="213">DEMO-01</text></g><text x="120" y="330" font-family="Arial,sans-serif" font-size="20" fill="#244e44">Record showing an inspection date and name</text>',
    damaged:'<rect x="200" y="65" width="300" height="230" rx="12" fill="white" stroke="#a27343" stroke-width="3"/><circle cx="230" cy="88" r="8" fill="#edf3f5"/><text x="225" y="132" font-family="Arial,sans-serif" font-size="25" fill="#344e5d">SLING TAG</text><path d="M225 160H465 M225 188H450 M225 216H465" stroke="#89989d" stroke-width="7"/><path d="M320 147L350 175L328 203L365 233L345 294" stroke="#edf3f5" stroke-width="25" fill="none"/><path d="M240 172L455 225 M260 230L440 172" stroke="#b8b1a6" stroke-width="20" opacity=".8"/><text x="155" y="330" font-family="Arial,sans-serif" font-size="20" fill="#755130">Sling tag with obscured identification</text>'
  };
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(frame + drawings[kind] + "</svg>");
}
byId("demo").onclick = () => {
  try {
    loadRows([
      {id:"1", role:"Worker", pictureUrl:samplePicture("attached"), question:"Have you carried out a check to confirm that the crane sling identification tag is attached and readable prior to lifting?",
        description:"Before the lift, check the sling identification tag against the identification requirements in the approved lifting procedure.",
        guidance:"• Find the identification tag attached to the sling.\n• Check that the sling identification can be read.\n• Compare the tag information with the approved lifting procedure.\n• If identification is missing or unreadable, follow the procedure for reporting and isolating the sling."},
      {id:"2", role:"Supervisor", pictureUrl:samplePicture("record"), question:"Is the crane sling inspection recrod complete prior to lifting?",
        description:"Confirm that the sling inspction is documented in the required inspection record.",
        guidance:"Check the sling identification, inspection date and inspector's signautre against the approved inspection record."},
      {id:"3", role:"Worker", pictureUrl:samplePicture("damaged"), question:"Is the crane sling tag replaced as required?",
        description:"Check whether the sling identification tag meets the approved lifting procedure's identification requirements.",
        guidance:""}
    ].map((row, index) => ({...row, risk:"Lifting operations",
      control:"Mechanical integrity of the lifting equipment",source:"Illustrative sample", sheet:"Sling tag inspection", cell:"C" + (index + 2)})), settings());
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
  "FW-SHORT":["#fff0c7","#6b510d","#c9a243"],
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

function contextBar(item, onChange = () => {}, readOnlyLevel = false) {
  const bar=make("section","");
  bar.className="review-context-bar";
  bar.setAttribute("aria-label","Risk and control context");
  for(const [field,caption] of [["risk","Critical risk"],["control","Critical control"]]) {
    if(readOnlyLevel) {
      const value=make("div","");
      value.className="context-level";
      value.append(make("span",caption),make("strong",item[field] || "Not specified"));
      bar.append(value);
      continue;
    }
    const label=make("label",caption),input=make("input","");
    input.value=item[field] || "";
    input.placeholder="Not specified — enter here";
    input.oninput=()=>{item[field]=input.value;onChange();};
    label.append(input);bar.append(label);
  }
  if(readOnlyLevel) {
    const level=make("div","");
    level.className="context-level";
    const role=(item.role||"").trim();
    level.append(make("span","Level"),make("strong",/^(worker|operator)$/i.test(role)?"Operator":role || "Not specified"));
    bar.append(level);
    return bar;
  }
  const label=make("label","Level"),select=make("select","");
  select.append(new Option("Select level",""),new Option("Operator","Worker"),
    new Option("Supervisor","Supervisor"),new Option("Manager","Manager"));
  const role=(item.role||"").trim();
  select.value=/^operator$/i.test(role)?"Worker":role;
  if(role && ![...select.options].some(option=>option.value===role) && !/^operator$/i.test(role))
    select.append(new Option(role,role));
  select.value=/^operator$/i.test(role)?"Worker":role;
  select.onchange=()=>{item.role=select.value;onChange();};
  label.append(select);bar.append(label);
  return bar;
}

function renderDetail() {
  disposeSpellingEditors(byId("detail"));
  closeSpellingMenu();
  exitIssueFocus();
  const row = active, panel = byId("detail");
  const context = contextBar(row, () => {
    row.finalCheck={status:"Pending"};
    renderFinalCheck();
  }, true);
  const tagDecisionViews = new Map();
  const correctionEditors = new Map();
  const stageBar = make("div", "");
  stageBar.className = "stage-bar";
  const orderedTags = [...row.tags].sort((a,b) => {
    const order = {picture:0,question:1,description:2,guidance:3};
    return order[a.field]-order[b.field] || Number(a.level==="Manual review")-Number(b.level==="Manual review");
  });
  row.reviewStage ??= "read";
  row.issueIndex ??= 0;
  let showGuidedStage = () => {};

  const finalPanel = make("section", "");
  finalPanel.className = "final-check";
  function renderFinalCheck() {
    const dirtyFields = ["question","description","guidance"].filter(field =>
      (field==="question"?row.draft:row[field+"Draft"]) !== row.analysisText[field]);
    const remaining = row.tags.filter(tag => !["Resolved","Dismissed"].includes(tag.decision)).length;
    if(dirtyFields.length) {
      finalPanel.replaceChildren(make("h3","Final check"),make("p","Updating analysis…"));
      return;
    }
    if (remaining) {
      finalPanel.replaceChildren(make("h3","Final check"),
        make("p", "Finish " + remaining + " remaining issue" + (remaining === 1 ? "" : "s") + " to review the final draft."));
      return;
    }
    if(pictureRecheckRequired(row)) {
      const key=pictureReviewKey(row);
      if(row.finalPictureCheck?.key!==key)row.finalPictureCheck={status:"Pending",key};
      if(!["Confirmed","Not needed"].includes(row.finalPictureCheck.status)) {
        const title=make("h3","Final picture check");
        const prompt=make("p","The content changed. Does the picture still match the corrected question, description, and guidance?");
        const picture=make("img","");
        picture.className="review-picture";picture.alt="Picture for final verification";
        picture.hidden=!row.pictureUrl;if(row.pictureUrl)picture.src=row.pictureUrl;
        const actions=make("div","");actions.className="actions";
        for(const [value,caption] of [["Confirmed","Picture matches revised content"],["Not needed","No picture needed"]]) {
          const button=make("button",caption);
          button.disabled=value==="Confirmed"&&!row.pictureUrl;
          button.onclick=()=>{
            const reviewer=byId("reviewer").value.trim();
            if(!reviewer){byId("reviewer").focus();message("Enter your reviewer name first.");return;}
            row.finalPictureCheck={status:value,key,reviewer,time:new Date().toISOString(),criteria:[...pictureRecommendations]};
            renderFinalCheck();
          };
          actions.append(button);
        }
        const replace=make("button",row.pictureUrl?"Replace picture":"Choose picture");
        replace.className="secondary";
        replace.onclick=()=>pictureInput.click();
        actions.append(replace);
        finalPanel.replaceChildren(title,prompt,picture,pictureRecommendationDetails(),actions);
        return;
      }
    } else row.finalPictureCheck={status:"Not required"};
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
          question:row.draft,description:row.descriptionDraft,guidance:row.guidanceDraft,pictureCheck:row.finalPictureCheck};
        renderFinalCheck();
      };
      actions.append(action);
    }
    if(row.finalCheck.status === "Confirmed") {
      const next=nextUnfinishedQuestion(row);
      if(next) {
        const nextButton=make("button","Next question");
        nextButton.className="decision-primary";
        nextButton.onclick=()=>{
          active=next;
          byId("filter").value="All";
          byId("search").value="";
          renderQueue();
          renderDetail();
          byId("detail").scrollIntoView({block:"start",behavior:"smooth"});
        };
        actions.prepend(nextButton);
      } else {
        const complete=make("p","All questions reviewed. Export your report to keep the review.");
        complete.setAttribute("role","status");
        actions.prepend(complete);
      }
      renderQueue();
    }
    if(pictureRecheckRequired(row)) {
      const pictureStatus=make("p",row.finalPictureCheck.status==="Confirmed"?"Picture verified against revised content.":"Picture marked as not needed.");
      const reopenPicture=make("button","Reopen picture check");
      reopenPicture.className="secondary";
      reopenPicture.onclick=()=>{row.finalPictureCheck={status:"Pending",key:pictureReviewKey(row)};row.finalCheck={status:"Pending"};renderFinalCheck();};
      finalPanel.replaceChildren(heading,preview,pictureStatus,reopenPicture,prompt,actions,status);
    } else finalPanel.replaceChildren(heading,preview,prompt,actions,status);
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
    const current = field === "question" ? row.draft : row[field+"Draft"];
    for (const [tag,view] of tagDecisionViews) {
      if (tag.field === field && view.continueButton)
        view.continueButton.textContent = sectionChanged(row,field) ? "Accept changes" : "Continue";
    }
    resetFinalCheck();
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
  draft.oninput = () => { row.draft = draft.value; invalidateResolved("question"); updateCounter(); scheduleRecheck(row,"question",draft); };
  updateCounter();
  label.dataset.correctionField = "question";
  label.append(draft, counter);
  correctionEditors.set("question",label);
  compare.append(original,label);
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
    for (const span of highlightedSpans) {
      const selected=span.tags.includes(tag);
      span.element.classList.toggle("tag-selected",selected);
      if(selected)colorTag(span.element,tag.id);
    }
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
    explanations.className = "field-explanations";
    block.append(text, chips, explanations);
    fieldPanels[field] = {block, chips, explanations};
    textPanels[field] = text;
  }
  original.append(fieldPanels.question.block);

  for (const tag of row.tags) {
    const item = make("div", "");
    item.className = tag.level === "Manual review" ? "tag-explanation manual-issue" : "tag-explanation";
    colorTag(item,tag.id);
    item.hidden = true;
    const fieldPanel = fieldPanels[tag.field];
    const chip = make("button", tag.label);
    chip.className = "tag-chip";
    colorTag(chip,tag.id);
    chip.dataset.tagType = tag.id;
    chip.textContent = tag.label + ({Resolved:" · Reviewed",Dismissed:" · Unchanged","Needs edit":" · Review later"}[tag.decision] || "");
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
    details.className = "issue-reason";
    details.append(make("summary", "Why was this flagged?"), make("p", tag.reason),
      make("small", tag.id + " · " + tag.level));
    if(tag.level !== "Manual review") item.append(details);
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
    const decisionLabels = {Pending:"Awaiting review", "Needs edit":"Review later", Resolved:tag.level === "Manual review" ? "Checked" : "Correction saved", Dismissed:"Reviewed — unchanged"};
    const decisionStatus = make("p", decisionLabels[tag.decision]);
    decisionStatus.setAttribute("role", "status");
    decisionStatus.hidden = tag.decision === "Pending";
    tagDecisionViews.set(tag, {chip, status:decisionStatus});
    const tagActions = make("div", "");
    tagActions.className = "actions";
    for (const [value, caption] of [["Continue","Continue"],["Needs edit","Review later"],["Pending","Reopen issue"]]) {
      const action = make("button", value === "Continue" ? (sectionChanged(row,tag.field) ? "Accept changes" : "Continue") : caption);
      action.type = "button";
      if(value === "Continue") tagDecisionViews.get(tag).continueButton=action;
      action.className = value === "Continue" ? "decision-primary" : "decision-text";
      action.hidden = tag.decision === "Resolved" || tag.decision === "Dismissed"
        ? value !== "Pending"
        : value === tag.decision || (value === "Pending" && tag.decision === "Pending");
      action.title = {
        Continue:"Continue with this content. Changes are recorded when present.",
        "Needs edit":"Leave this issue for another pass.",
        Pending:"Return this issue to review."
      }[value];
      action.onclick = () => {
        const changed = sectionChanged(row,tag.field);
        const decision = value === "Continue" ? (changed || tag.level === "Manual review" ? "Resolved" : "Dismissed") : value;
        const reviewer = byId("reviewer").value.trim();
        if (decision !== "Pending" && !reviewer) {
          decisionStatus.textContent = "Enter your reviewer name first.";
          (focusedIssue ? byId("focus-reviewer") : byId("reviewer")).focus();
          return;
        }
        const currentText = tag.field === "question" ? row.draft : row[tag.field+"Draft"];
        tag.decision = decision;
        if(decision !== "Pending")row.editingField=null;
        if(value === "Continue") {
          tag.acceptedChange = changed;
          row.acceptedContent[tag.field] = currentSection(row,tag.field);
        }
        row.finalCheck = {status:"Pending"};
        tag.reviewer = decision === "Pending" ? "" : reviewer;
        tag.decisionTime = decision === "Pending" ? "" : new Date().toISOString();
        tag.reviewedText = decision === "Pending" ? "" : tag.field === "picture" ? "Picture reviewed in source material" : tag.field === "question" ? row.draft : row[tag.field + "Draft"];
        if(decision === "Resolved" && tag.field !== "picture" && currentText !== row.analysisText[tag.field]) {
          clearTimeout(automaticRechecks.get(row)?.get(tag.field));
          recheckSection(row, tag.field, JSON.parse(reviewedRules));
          renderQueue();
          renderDetail();
          message("Corrected section rechecked. Review the remaining issues.");
          return;
        }
        decisionStatus.textContent = decisionLabels[decision];
        for (const otherAction of tagActions.children) {
          otherAction.hidden = decision === "Resolved" || decision === "Dismissed"
            ? otherAction.dataset.decision !== "Pending"
            : otherAction.dataset.decision === decision ||
              (otherAction.dataset.decision === "Pending" && decision === "Pending");
        }
        chip.textContent = tag.label + (decision === "Pending" ? "" : " · " + decisionLabels[decision]);
        if (decision === "Resolved" || decision === "Dismissed") {
          item.hidden = true;
          chip.setAttribute("aria-expanded", "false");
          chip.focus();
          exitIssueFocus();
        }
        row.status = row.tags.some(t => t.decision === "Needs edit") ? "Needs edit" :
          row.tags.some(t => t.decision === "Pending") ? "Pending" : "Reviewed";
        renderQueue();
        renderFinalCheck();
        if (decision !== "Pending") {
          row.issueIndex = orderedTags.indexOf(tag) + 1;
          row.reviewStage = row.issueIndex < orderedTags.length ? "issues" : "final";
        }
        showGuidedStage();
      };
      action.dataset.decision = value;
      tagActions.append(action);
    }
    if(tag.level === "Manual review") {
      const options=make("details","");
      options.className="manual-options";
      options.append(make("summary","More options"));
      if(tag.id==="MANUAL-PICTURE") {
        options.append(make("p","Check the picture against these criteria:"),pictureRecommendationList());
      } else options.append(make("p",tag.reason));
      options.append(comment);
      item.append(tagActions,decisionStatus,options);
    } else item.append(tagActions, decisionStatus, comment);
  }
  const supportingSections = {};
  for (const [field, caption] of [["description","Description"],["guidance","What to look for"]]) {
    const section = make("section", "");
    section.append(make("h3", caption));
    section.append(fieldPanels[field].block);
    const editLabel = make("label", field === "guidance" ? "Corrected guidance" : "Corrected description");
    editLabel.className = "suggestion-column";
    editLabel.dataset.correctionField=field;
    const edit = make("textarea", "");
    edit.value = row[field+"Draft"];
    edit.oninput = () => { row[field+"Draft"] = edit.value; invalidateResolved(field); scheduleRecheck(row,field,edit); };
    editLabel.dataset.correctionField = field;
    editLabel.append(edit);
    correctionEditors.set(field,editLabel);
    section.append(editLabel);
    supportingSections[field] = section;
  }
  for (const field of ["question","description","guidance"]) {
    const source = textPanels[field];
    source.tabIndex = 0;
    source.dataset.editField = field;
    source.title = "Double-click to edit · Enter to edit";
    source.setAttribute("aria-label", (field === "guidance" ? "What to look for" : field) + ". Double-click or press Enter to edit.");
    const openEditor = () => {
      if(row.reviewStage!=="read")return;
      row.editingField=field;
      for(const [other,editor] of correctionEditors) {
        const editing=other===field;
        textPanels[other].hidden=editing;
        editor.hidden=!editing;
        if(editing) {
          textPanels[other].after(editor);
          editor.classList.add("inline-correction");
          editor.querySelector("textarea").setAttribute("aria-label", "Edit " +
            (field==="guidance"?"What to look for":field));
        }
      }
      const section = field === "question" ? compare : supportingSections[field];
      section.classList.remove("context-muted");
      const editor=correctionEditors.get(field);
      refreshSpellingEditors(editor);
      const input=editor.querySelector("textarea");
      input.style.height="auto";
      input.style.height=Math.max(80,input.scrollHeight+4)+"px";
      input.focus();
    };
    source.ondblclick = event => { event.preventDefault(); openEditor(); };
    source.onkeydown = event => {
      if(event.key === "Enter" && event.target === source) {event.preventDefault();openEditor();}
    };
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
    const source = row.reviewStage==="read" ? row.analysisText[field] : row[field];
    const ranges = [];
    for (const tag of row.tags.filter(tag => tag.field === field && tag.evidence !== "(empty)")) {
      if (Number.isInteger(tag.offset)) {
        if(source.slice(tag.offset,tag.offset+tag.evidence.length)!==tag.evidence)continue;
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
      const highlight=make("span",source.slice(start,end));
      highlight.setAttribute("role","button");
      highlight.tabIndex=0;
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
      highlight.onkeydown=event=>{
        if(event.key==="Enter"||event.key===" "){event.preventDefault();highlight.onclick();}
      };
      textPanels[field].append(highlight);
    }
    if (!source) textPanels[field].append(make("span","Missing from import"));
  }
  const pictureSection = make("section", "");
  const pictureInput = make("input", "");
  pictureInput.type = "file";
  pictureInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  const pictureLabel = make("label","Choose a local picture");
  pictureLabel.append(filePicker(pictureInput));
  const picture = make("img","");
  picture.className = "review-picture";
  picture.alt = "Picture for this checklist item";
  picture.hidden = !row.pictureUrl;
  if (row.pictureUrl) picture.src = row.pictureUrl;
  pictureInput.onchange = () => {
    const file = pictureInput.files[0];
    if (!file) return;
    if (!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)) {
      message("Choose a PNG, JPEG, WebP or GIF image."); return;
    }
    if(row.pictureUrl) URL.revokeObjectURL(row.pictureUrl);
    row.pictureUrl = URL.createObjectURL(file);
    row.pictureName = file.name;
    picture.src = row.pictureUrl;
    picture.hidden = false;
    const tag = row.tags.find(tag=>tag.id==="MANUAL-PICTURE");
    if(tag){tag.decision="Pending";const view=tagDecisionViews.get(tag);
      if(view){view.chip.textContent=tag.label;view.status.textContent="Awaiting review";}}
    row.finalCheck = {status:"Pending"};
    renderDetail();
  };
  pictureSection.append(make("h3","Picture"), picture, fieldPanels.picture.block);
  const pictureTag=row.tags.find(tag=>tag.field==="picture" && tag.level==="Manual review");
  const pictureOptions=pictureTag ? tagTargets.get(pictureTag).item.querySelector(".manual-options") : null;
  if(pictureOptions) {
    pictureLabel.firstChild.textContent = "Replace picture";
    pictureOptions.append(pictureLabel);
  } else pictureLabel.hidden=true;
  const contextGrid = make("div","");
  contextGrid.className = "review-context-grid";
  compare.classList.add("context-card");
  supportingSections.description.classList.add("context-card");
  supportingSections.guidance.classList.add("context-card");
  pictureSection.classList.add("context-card");
  contextGrid.append(pictureSection,compare,supportingSections.description,supportingSections.guidance);
  const reviewHint = make("small","Tags refer to the latest checked text. Analysis updates automatically after a typing pause.");
  showGuidedStage = () => {
    const reading = row.reviewStage === "read";
    const final = row.reviewStage === "final";
    panel.classList.toggle("reading-canvas", !final);
    const tag = row.reviewStage === "issues" ? orderedTags[row.issueIndex] : null;
    pictureLabel.hidden = tag?.field !== "picture";
    contextGrid.hidden = false;
    compare.hidden = false;
    supportingSections.description.hidden = false;
    supportingSections.guidance.hidden = false;
    pictureSection.hidden = false;
    for(const [field,card] of [["question",compare],["description",supportingSections.description],
      ["guidance",supportingSections.guidance],["picture",pictureSection]]) {
      card.classList.toggle("context-muted",Boolean(tag && tag.field!==field));
      card.classList.toggle("context-active",Boolean(tag && tag.field===field));
    }
    finalPanel.hidden = !final;
    reviewComment.hidden = !final;
    reviewHint.hidden = !final;
    for (const [field,editor] of correctionEditors) {
      const editing=reading && row.editingField===field;
      const reviewing=!reading && !final;
      const view=fieldPanels[field];
      view.block.classList.toggle("review-versions",reviewing);
      editor.classList.toggle("inline-correction",editing);
      editor.hidden=!(editing || reviewing);
      textPanels[field].hidden=editing;
      textPanels[field].tabIndex=reading?0:-1;
      textPanels[field].title=reading?"Double-click to edit · Enter to edit":"Original text";
      textPanels[field].dataset.caption=reviewing?"Original":"";
      if(editing)textPanels[field].after(editor);
      else if(reviewing)view.block.insertBefore(editor,view.chips);
    }
    compare.classList.toggle("single-column",reading);
    for (const [other,target] of tagTargets) {
      target.chip.hidden = other !== tag || other.level === "Manual review";
      target.item.hidden = other !== tag;
      target.chip.setAttribute("aria-expanded",String(other === tag));
    }
    for (const span of highlightedSpans) {
      span.element.classList.toggle("inactive-highlight", !tag || !span.tags.includes(tag));
    }
    for (const [field,view] of Object.entries(fieldPanels)) {
      view.block.classList.toggle("active-issue-field", Boolean(tag && tag.field === field));
      textPanels[field].classList.toggle("length-single-tint",Boolean(tag && tag.id==="FW-SHORT" && tag.field===field));
    }
    emphasizeTag(tag);
    stageBar.replaceChildren();
    if (reading) {
      const start = make("button","Start review");
      start.onclick = () => {
        row.reviewStage = orderedTags.length ? "issues" : "final";
        row.issueIndex = 0;
        row.editingField=null;
        renderDetail();
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
        renderDetail();
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
    requestAnimationFrame(()=>refreshSpellingEditors(panel));
  };
  renderFinalCheck();
  panel.replaceChildren(context, make("h2", [row.id, row.cell].filter(Boolean).join(" · ")), stageBar, contextGrid, reviewHint,
    reviewComment, finalPanel);
  showGuidedStage();
}

function reportDiff(original, revised) {
  const tokenize = text => String(text ?? "").match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) || [];
  const a=tokenize(original), b=tokenize(revised);
  if(a.length*b.length>2000000) return {
    original:a.map(text=>({text,changed:original!==revised})),
    revised:b.map(text=>({text,changed:original!==revised}))
  };
  const matrix=Array.from({length:a.length+1},()=>new Uint32Array(b.length+1));
  for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--)
    matrix[i][j]=a[i]===b[j]?matrix[i+1][j+1]+1:Math.max(matrix[i+1][j],matrix[i][j+1]);
  const left=[],right=[];let i=0,j=0;
  while(i<a.length||j<b.length) {
    if(i<a.length&&j<b.length&&a[i]===b[j]){left.push({text:a[i++],changed:false});right.push({text:b[j++],changed:false});}
    else if(i<a.length&&(j===b.length||matrix[i+1][j]>=matrix[i][j+1]))left.push({text:a[i++],changed:true});
    else right.push({text:b[j++],changed:true});
  }
  return {original:left,revised:right};
}
function reportDiffHtml(parts, kind, encode) {
  return parts.map(part=>part.changed && part.text.trim() ?
    "<"+kind+">"+encode(part.text)+"</"+kind+">":encode(part.text)).join("");
}
function reportCell(value,column,index,encode) {
  const row=rows[index-1];
  const pairs={5:["question","original"],6:["description","original"],7:["guidance","original"],
    8:["question","suggestion"],9:["question","revised"],12:["question","revised"],
    18:["description","revised"],19:["guidance","revised"],20:["description","revised"],21:["guidance","revised"]};
  const pair=pairs[column];
  let content="<t xml:space='preserve'>"+encode(value)+"</t>";
  if(row&&pair){
    const [field,side]=pair;
    const revised=side==="suggestion"?row.suggested:field==="question"?row.draft:row[field+"Draft"];
    const diff=reportDiff(row[field],revised);
    const parts=side==="original"?diff.original:diff.revised;
    content=parts.map(part=>"<r>"+(part.changed?"<rPr><color rgb='"+(side==="original"?"FFAA3333":"FF146344")+"'/>"+(side==="original"?"<strike/>":"<b/><u/>")+"</rPr>":"")+
      "<t xml:space='preserve'>"+encode(part.text)+"</t></r>").join("");
    if(!content)content="<t></t>";
  }
  return '<c r="'+String.fromCharCode(65+column)+(index+1)+'" t="inlineStr"><is>'+content+'</is></c>';
}

byId("export").onclick = async () => {
  try {
    const data = [["Source workbook","Sheet","Question cell","ID","Role","Original question","Description","What to look for","Suggestion","Draft","Review cues","Review status","Question draft","Reviewer","Decision time (UTC)","Review note","Guidelines JSON","Structured tags JSON","Description draft","Guidance draft","Description for review","Guidance for review","Final consistency check","Critical risk","Critical control","Final picture check"],
      ...rows.map(row => [row.source,row.sheet,row.cell,row.id,row.role,row.question,row.description,row.guidance,row.suggested,row.draft,reviewTags(row).map(tag => tag.id + " · " + tag.label + " · " + tag.field + ": " + tag.evidence + " — " + tag.reason + " · Decision: " + tag.decision + (tag.connection ? " · " + tag.connection.status + (tag.connection.referent ? " → " + tag.connection.referent : "") : "")).join("\n"),row.status,row.draft,"","",row.note,reviewedRules,JSON.stringify(reviewTags(row)),row.descriptionDraft,row.guidanceDraft,row.descriptionDraft,row.guidanceDraft,JSON.stringify(row.finalCheck),row.risk,row.control,JSON.stringify(row.finalPictureCheck)])];
    const encode = value => String(value ?? "").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"").replace(/[&<>]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;"})[char]);
    if (byId("report-format").value === "html") {
      const fieldNames = {question:"Question",description:"Description",guidance:"What to look for"};
      const sections = rows.map(row => {
        const content = Object.entries(fieldNames).map(([field,caption]) => {
          const draft = field === "question" ? row.draft : row[field+"Draft"];
          const diff=reportDiff(row[field],draft);
          return "<h3>" + caption + "</h3><div class=pair><div><b>Original</b><p>" + reportDiffHtml(diff.original,"del",encode) +
            "</p></div><div><b>Revised</b><p>" + reportDiffHtml(diff.revised,"ins",encode) + "</p></div></div>";
        }).join("");
        const renderReason = tag => "<details class=reason><summary>" + encode(tag.label) + " · " +
          encode(fieldNames[tag.field] || "Picture") + "</summary><p>“" + encode(tag.evidence) +
          "”</p><p>" + encode(tag.reason) + "</p>" + (tag.decisionNote ? "<p>" + encode(tag.decisionNote) + "</p>" : "") +
          "<small>" + encode(tag.reviewer || "") + " · " + encode(tag.decisionTime || "") + "</small>" +
          (tag.reviewedText ? "<details><summary>Text at decision</summary><p>" + encode(tag.reviewedText) + "</p></details>" : "") + "</details>";
        const corrected = reviewTags(row).filter(tag => tag.decision === "Resolved" && tag.level !== "Manual review" &&
          typeof row[tag.field] === "string" && tag.reviewedText !== undefined && tag.reviewedText !== row[tag.field] &&
          (tag.field === "question" ? row.draft : row[tag.field+"Draft"]) !== row[tag.field]);
        const dismissed = reviewTags(row).filter(tag => tag.decision === "Dismissed");
        const other = reviewTags(row).filter(tag => !corrected.includes(tag) && !dismissed.includes(tag));
        const correctionReasons = corrected.length ? "<h3>Reasons for corrections</h3>" + corrected.map(renderReason).join("") : "";
        const archived = (dismissed.length ? "<details class=justifications><summary>Dismissed findings (" + dismissed.length +
          ")</summary>" + dismissed.map(renderReason).join("") + "</details>" : "") +
          (other.length ? "<details class=justifications><summary>Other review checks (" + other.length +
          ")</summary>" + other.map(renderReason).join("") + "</details>" : "");
        return "<article><h2>" + encode([row.role,row.id].filter(Boolean).join(" · ")) +
          "</h2><p><b>Critical risk</b> " + encode(row.risk || "Not specified") +
          " · <b>Critical control</b> " + encode(row.control || "Not specified") + "</p><p>" + encode(row.source) + " · " + encode(row.sheet) + " · " + encode(row.cell) +
          "</p>" + content + correctionReasons + archived +
          (row.note ? "<details><summary>Review note</summary><p>" + encode(row.note) + "</p></details>" : "") + "<h3>Final consistency check</h3><p>" + encode(row.finalCheck.status) + "</p><small>" + encode(row.finalCheck.reviewer || "") + " · " + encode(row.finalCheck.time || "") + "</small><h3>Final picture check</h3><p>" + encode(pictureRecheckRequired(row) && row.finalPictureCheck?.key !== pictureReviewKey(row) ? "Pending" : row.finalPictureCheck?.status || "Not required") + "</p></article>";
      }).join("");
      const report = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Procedure QA report</title><style>body{max-width:1050px;margin:32px auto;padding:0 20px;font:16px/1.5 system-ui;color:#182838}article{border-top:2px solid #cbd8d3;margin-top:30px;padding-top:16px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pair>div,li{padding:12px;background:#f3f6f5;border-radius:6px}li{margin-bottom:10px}p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#51677a}pre{white-space:pre-wrap}ins{background:#d9f2df;color:#155d32;text-decoration:none;border-bottom:2px solid #388652}del{background:#ffe3e3;color:#9b3030}summary{cursor:pointer;font-weight:600}.justifications{margin:18px 0}@media(max-width:600px){.pair{grid-template-columns:1fr}}@media print{article{break-inside:auto}}</style><h1>Procedure QA report</h1><p><ins>Added or revised text</ins> · <del>Removed text</del></p><p>Generated ' +
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
        reportCell(value,column,index,encode)).join("") + '</row>').join("") + '</sheetData></worksheet>');
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


let composition = {step:0,role:"Worker",risk:"",control:"",question:"",description:"",guidance:"",pictureUrl:""};
const writingSteps = [
  {field:"picture",title:"Picture",guide:"Choose an image that clearly shows the control to check. It should agree with the text and show the relevant detail. You can leave this empty if a picture is not needed."},
  {field:"question",title:"Question",guide:"Ask one short, direct question about a control. Make the expected Yes or No answer clear. Keep the essential condition here; put explanation in the description and evidence in the guidance."},
  {field:"description",title:"Description",guide:"Explain the control and when it applies. Include essential conditions, responsibilities, and an approved reference where needed. Give enough information for the least experienced qualified reader."},
  {field:"guidance",title:"What to look for",guide:"Give observable checks: what to see, measure, or confirm in a record. Explain what acceptable looks like. Context can be longer here. Keep required actions visible and consistent with the picture and description."},
  {field:"preview",title:"Read your draft",guide:"Read all parts together before starting QA. Check that the picture, question, description, and evidence describe the same control."}
];
byId("new-question").onclick = () => {
  exitIssueFocus();
  byId("composer").hidden=false;
  byId("review").hidden=true;
  byId("preview").hidden=true;
  renderComposer();
  byId("composer").scrollIntoView({block:"start",behavior:"smooth"});
};
function renderComposer() {
  disposeSpellingEditors(byId("composer"));
  closeSpellingMenu();
  const panel=byId("composer"), step=writingSteps[composition.step];
  const heading=make("h2",step.title);
  const progress=make("small","Write · "+(composition.step+1)+" of "+writingSteps.length);
  const guide=make("p",step.guide);guide.className="writing-guide";
  const content=make("div","");
  if(composition.step===0) {
    const upload=make("label","Optional local picture");
    const file=make("input","");file.type="file";file.accept="image/png,image/jpeg,image/webp,image/gif";
    const image=make("img","");image.className="review-picture";image.alt="Draft checklist picture";
    image.hidden=!composition.pictureUrl;if(composition.pictureUrl)image.src=composition.pictureUrl;
    file.onchange=()=>{
      const selected=file.files[0];if(!selected)return;
      if(!["image/png","image/jpeg","image/webp","image/gif"].includes(selected.type)){message("Choose a PNG, JPEG, WebP or GIF.");return;}
      if(composition.pictureUrl)URL.revokeObjectURL(composition.pictureUrl);
      composition.pictureUrl=URL.createObjectURL(selected);composition.pictureName=selected.name;
      image.src=composition.pictureUrl;image.hidden=false;
    };
    upload.append(filePicker(file));content.append(image,pictureRecommendationDetails(),upload);
  } else if(step.field==="preview") {
    if(composition.pictureUrl){const image=make("img","");image.src=composition.pictureUrl;image.className="review-picture";image.alt="Draft checklist picture";content.append(image);}
    for(const [field,caption] of [["question","Question"],["description","Description"],["guidance","What to look for"]]) {
      const text=make("p",composition[field] || "Not provided");text.style.whiteSpace="pre-wrap";
      content.append(make("h3",caption),text);
    }
  } else {
    const label=make("label",step.title),input=make("textarea","");
    input.rows=step.field==="question"?3:6;input.value=composition[step.field];
    const count=make("small","");
    const updateCount=()=>{
      if(step.field==="question") {
        const rules=rows.length?JSON.parse(reviewedRules):settings();
        const result=lengthReview(input.value,rules);
        count.textContent=result.count+" words · "+result.label;
      }
    };
    input.oninput=()=>{composition[step.field]=input.value;updateCount();};
    label.append(input);content.append(label,count);updateCount();
  }
  const actions=make("div","");actions.className="actions";
  const back=make("button","Back");back.className="secondary";back.hidden=composition.step===0;
  back.onclick=()=>{composition.step--;renderComposer();};
  const next=make("button",composition.step===4?"Start QA":"Continue");
  const validation=make("p","");validation.setAttribute("role","status");
  next.onclick=()=>{
    if(composition.step===1&&!composition.question.trim()){validation.textContent="Write a question before continuing.";return;}
    if(composition.step<4){composition.step++;renderComposer();return;}
    try {
      const rules=rows.length?JSON.parse(reviewedRules):settings();
      const record={id:"NEW-"+crypto.randomUUID().slice(0,8),role:composition.role,risk:composition.risk.trim(),control:composition.control.trim(),
        question:composition.question.trim(),description:composition.description.trim(),guidance:composition.guidance.trim(),
        pictureUrl:composition.pictureUrl,pictureName:composition.pictureName||"",source:"Written locally",sheet:"New questions",cell:""};
      const item=analyze(record,rules);
      rows.push(item);active=item;reviewedRules=JSON.stringify(rules);
      byId("composer").hidden=true;byId("review").hidden=false;
      byId("guideline-settings").hidden=false;byId("export").disabled=false;
      byId("filter").value="All";byId("search").value="";
      composition={step:0,role:"Worker",risk:"",control:"",question:"",description:"",guidance:"",pictureUrl:""};
      renderQueue();renderDetail();
      message("New item added. Read it, then start the QA review.");
    }catch(error){validation.textContent=error.message;}
  };
  const close=make("button","Close draft");close.className="decision-text";
  close.onclick=()=>{panel.hidden=true;byId("review").hidden=!rows.length;};
  actions.append(back,next,close);
  panel.replaceChildren(contextBar(composition),progress,heading,guide,content,validation,actions);
  requestAnimationFrame(()=>refreshSpellingEditors(panel));
}


const workbookFileInput=byId("file");
const workbookFileLabel=workbookFileInput.parentElement;
workbookFileLabel.removeChild(workbookFileInput);
workbookFileLabel.append(filePicker(workbookFileInput));
