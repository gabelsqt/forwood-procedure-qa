# Forwood Procedure QA

Private browser-based MVP for reviewing short checklist questions alongside their description and observable guidance. Use the sample or upload an XLSX workbook. The default mapping matches the Hot Work example, and the worksheet, header row, and column letters can be changed.

Rules flag wording and missing context. Suggestions are editable, and human decisions are recorded in a separate Excel report. This version runs in the browser and keeps the current review in memory until export. Uploads are processed locally. No AI service or shared storage is connected.

Serve the dist directory with any static web host.
Guideline tags cite FIT criteria and Forwood preferences. Review cues include evidence and reasons and export with each question. The disabledTags setting accepts rule IDs to suppress individual checks.
