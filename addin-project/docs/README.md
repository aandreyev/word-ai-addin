# Add-in Project (addin-project)

This folder contains the Word Add-in runtime used during development and for local debugging.

Quick map — files you will care about

- `manifest.xml` — Office Add‑in manifest (taskpane and commands entry points).
- `webpack.config.js` — Bundles the add-in, provides HTTPS dev server, and injects env values.
- `package.json` — Dev scripts: `npm run dev`, `npm start`, and related tooling.
- `log-server.js` — Local logging backend (port 3001) used by the dev proxy.

Core runtime (where to make changes)

- `src/taskpane/taskpane.html` & `src/taskpane/taskpane.js` — UI and button handlers. The analyze button triggers the analysis flow.
- `src/services/ai-service-browser.js` — Main AI orchestration and Gemini API integration (prompt building, parsing, and apply logic).
- `src/services/document-service.ts` — Word APIs (snapshot paragraphs, modify/insert/delete operations). This is the place to update Word.run logic.
- `src/services/analysis-logger.js` — Generates the markdown analysis report that the add-in appends/downloads.
- `src/services/model-utils.js` — Token estimation and model context helpers (used by AI service for budgeting).

Dev notes

- To run the dev server with secrets from Doppler (recommended):
  ```bash
  cd addin-project
  doppler run --project mswordai --config dev -- npm run dev
  ```

- If you change `GEMINI_API_KEY` or `GEMINI_MODEL`, restart the dev server so DefinePlugin inlines values into the bundle.
- For large documents, see `src/services/model-utils.js` and `ai-service-browser.js` where token budgeting/checks are implemented.

Tests and local harness

- There are node-only tests at the repo root (`test-*.js`) which mock Word for quick iteration without opening Word.

Where to start

- Edit prompts: `src/prompts/*.md` and `src/services/prompt-service.ts`.
- Change AI behavior: `src/services/ai-service-browser.js` (analysis and apply flow).
- Modify Word interactions: `src/services/document-service.ts`.

If you want, I can add a short CONTRIBUTING.md or a one-page architecture diagram.
