# Procedure QA

Browser-based procedure and checklist review. Workbooks, edits and decisions are processed locally. Export a report before closing the page to keep your work.

Open Procedure-QA.html for the self-contained offline app, or serve dist/ as a static website.

The app includes workbook preview and column mapping, configurable writing checks, offline US English spelling, selected grammar patterns, sequential issue decisions, manual verification and a final consistency check. Reports can be downloaded as Excel or HTML. Automatic findings require human review.

To rebuild the offline language bundle, install the dependencies from package-lock.json and run:

    npx esbuild language-entry.js --bundle --platform=browser --loader:.aff=text --loader:.dic=text --outfile=dist/language.js --minify

Third-party licenses are included in dist/ and in the standalone HTML file.
