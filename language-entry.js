import nlp from "compromise";
import nspell from "nspell";
import aff from "./node_modules/dictionary-en/index.aff";
import dic from "./node_modules/dictionary-en/index.dic";
const spelling = nspell({aff,dic});
const auxiliary = /\b(check|verify|ensure|confirm|show|shows|record|indicate|indicates|means?|know|see|test)\s*$/i;
function pronouns(text, words) {
  const results = [];
  const escaped = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  if (!escaped.length) return results;
  const regex = new RegExp("\\b(" + escaped.join("|") + ")\\b","giu");
  const sentences = nlp(text).sentences().json();
  for (const match of text.matchAll(regex)) {
    const word = match[0].toLowerCase(), before = text.slice(0,match.index), after = text.slice(match.index + match[0].length);
    const next = nlp(after.trim()).terms().json()[0]?.terms?.[0];
    if (word === "that" && auxiliary.test(before)) continue;
    if (["this","that","these","those"].includes(word) && next?.tags?.includes("Noun") && !next.tags.includes("Pronoun")) continue;
    if (word === "it" && /\bis\s+(?:necessary|important|essential|possible|likely)\b/i.test(after)) continue;
    const current = before.split(/[.!?\n]/).pop();
    const context = before.slice(-350);
    const candidates = [...new Set(nlp(context).nouns().out("array").flatMap(noun => noun.split(/\s+(?:and|or)\s+|,\s*/i)).map(noun => noun.trim().replace(/[.!?,;:]+$/g,"")).filter(noun => noun && !/^(it|this|that|they|them|their|its)$/i.test(noun)))].slice(-4);
    const suggestion = candidates.length === 1 ? candidates[0] : "";
    results.push({word:match[0],offset:match.index,candidates,suggestion});
  }
  return results;
}
function language(text, allowed, enabledGrammar, enabledSpelling) {
  const findings = [], exceptions = new Set(allowed.map(word=>word.toLowerCase()));
  if (enabledGrammar) {
    for (const match of text.matchAll(/\b([a-z]+)\s+\1\b/giu))
      findings.push({id:"FW-GRAMMAR",label:"Repeated word",evidence:match[0],reason:"Check whether the repeated word is intentional."});
    for (const match of text.matchAll(/\b(is|are|has|have)\s+(the\s+)?([a-z]+)\b/giu)) {
      const noun = match[3], parsed = nlp((match[2] || "") + noun);
      if (!parsed.has("#Noun") || /^(you|they|we|i)$/i.test(noun)) continue;
      const plural = parsed.has("#Plural");
      if (((/^(is|has)$/i.test(match[1]) && plural) || (/^(are|have)$/i.test(match[1]) && !plural)) && /^(the\s+)/i.test(match[2] || ""))
        findings.push({id:"FW-GRAMMAR",label:"Possible agreement issue",evidence:match[0],reason:"Check the subject and verb agree. A longer noun phrase can change the interpretation."});
    }
    for (const match of text.matchAll(/\b(a|an)\s+(equipment|information|advice)\b/giu))
      findings.push({id:"FW-GRAMMAR",label:"Article usage",evidence:match[0],reason:"This noun usually needs a phrase such as a piece of, or no indefinite article."});
  }
  if (enabledSpelling) {
    const seen = new Set();
    for (const match of text.replace(/https?:\/\/\S+/gi,"").matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)?/g)) {
      const word = match[0], lower = word.toLowerCase();
      if (seen.has(lower) || exceptions.has(lower) || /^[A-Z]{2,}$/.test(word) || spelling.correct(word) || spelling.correct(lower)) continue;
      seen.add(lower);
      findings.push({id:"FW-SPELLING",label:"Possible spelling issue",evidence:word,reason:"US English dictionary did not recognize this word. Check technical terms and regional variants. Suggestions: " + spelling.suggest(word).slice(0,3).join(", ")});
    }
  }
  return findings;
}
function checkWord(word) {
  return /^[A-Z]{2,}$/.test(word) || spelling.correct(word) || spelling.correct(word.toLowerCase());
}
function suggestions(word) {
  return spelling.suggest(word).slice(0,5);
}
window.localLanguage = {pronouns,language,checkWord,suggestions};

