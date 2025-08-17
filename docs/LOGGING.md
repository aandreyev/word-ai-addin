# Logging — AI Document Review Add-in

This document summarizes the logging subsystem as implemented in the codebase (status: Aug 17, 2025). It explains who writes logs, where logs go, how the taskpane exposes logs, and the built-in fallbacks and diagnostics.

## Components

- AnalysisLogger (client-side)
  - File: `addin-project/src/services/analysis-logger.js`
  - Purpose: canonical session builder for AI analysis runs. Generates the analysis markdown, saves session data to `localStorage`, and supports downloading individual session files and a combined report.
  - Primary behaviors:
    - `startSession()` / `recordSuggestions()` / `markApplied()` build the `analysisData` structure.
    - `saveSession(autoDownload = true)` stores markdown in `localStorage` and triggers a browser download by creating a blob and clicking a temporary link.
    - `downloadAllSessions()` and `downloadCombinedReport()` provide client-side downloads for stored sessions.

- SimpleFileLogger (client-side)
  - File: `addin-project/src/services/simple-file-logger.js`
  - Purpose: lightweight file logger that attempts to persist analysis markdown to a local server (dev workflow) and exposes the same markdown content used by the taskpane log viewer.
  - Primary behaviors:
    - `startSession()` / `recordSuggestions()` / `markApplied()` mirror session metadata for file output.
    - `generateMarkdown()` returns the markdown used by the log viewer and by `appendLogData()`.
    - `saveSession()` attempts to POST the markdown payload to multiple candidate endpoints (robust dev strategy):
      - `'/api/save-log'` (relative path — relies on webpack dev-server proxy)
      - `http://localhost:3001/api/save-log`
      - `http://localhost:3001/save-log`
      - `'/save-log'`
    - On failure of all endpoints it throws and leaves higher-level code to fall back.
    - `fallbackConsoleLog()` prints the markdown to the console for manual copy if automated persistence fails.

- Log server (dev helper)
  - File: `addin-project/log-server.js`
  - Purpose: simple Express server that accepts POSTs of analysis markdown and writes them into `addin-project/logs/*.md`.
  - Routes (examples):
    - POST `/api/save-log` and `/save-log` — accept JSON payload `{ sessionId, markdown }` and write a markdown file.
    - GET `/api/logs` and `/logs` — list saved files (used by dev tools).
    - `/health` endpoints and friendly aliases exist for diagnostics.
  - Notes: the server runs on port 3001 by default in dev; logs are written to `addin-project/logs/`.

- DocumentService append
  - File: `addin-project/src/services/document-service.ts` (and JS variant)
  - Purpose: non-critical method `appendLogData(logContent)` that inserts a clearly delimited copy of the analysis markdown at the end of the Word document using Office.js (`Word.InsertLocation.end`). This is invoked after suggestions are applied so the logged snapshot doesn't corrupt paragraph mapping.

- Taskpane log viewer
  - File: `addin-project/src/taskpane/taskpane.html` + `taskpane.js`
  - Purpose: UI tab called **Log Viewer** that displays the latest markdown in a `<pre id="log-content">` element.
  - The taskpane updates the viewer with `window.aiDocumentReviewService.getLatestLog()` after analysis completes.

## UX / Flow summary

1. Analysis runs and both `AnalysisLogger` and `SimpleFileLogger` are populated with session data.
2. `AnalysisLogger.saveSession()` writes to `localStorage` and initiates a browser download (default autoDownload=true).
3. `SimpleFileLogger.saveSession()` tries to POST the markdown to a local log server using several candidate endpoints; on success the server stores a `.md` file under `addin-project/logs/`.
4. After suggestions are applied, `AIDocumentReviewService` calls `DocumentService.appendLogData(markdown)` to append the log to the Word document.
5. The taskpane `Log Viewer` tab is updated from the in-memory file logger content and shows the markdown for quick inspection.

## Fallbacks and reliability notes

- localStorage + browser download (AnalysisLogger) is the most reliable cross-environment approach and works inside Word taskpane webviews.
- Posting to `http://localhost:3001` (log server) can be blocked by:
  - Mixed-content or origin restrictions when the taskpane runs under HTTPS or in constrained embedded webviews (Word desktop). In that case the webpack dev-server proxy (`/api/save-log`) may work only when the page origin is the dev server (webpack dev HTTPS).
  - CORS or webview network restrictions.
- To be resilient the client tries multiple endpoints and also provides these fallbacks:
  - Console fallback: prints markdown to console for manual copy.
  - Append-in-document: `appendLogData()` inserts the markdown into the Word document (guaranteed to be available to the user and avoids network dependencies).
  - Client-side download via `AnalysisLogger.downloadMarkdown()` ensures user can retrieve a file locally even if server writes fail.

## How to run the dev log-server and test

- Start log server (dev) together with the add-in (project scripts may wrap these):

```bash
# from repo root
npm --prefix ./addin-project run start-with-logs
# or start log-server manually and then the dev server:
node addin-project/log-server.js &
npm --prefix ./addin-project run dev
```

- Test with curl (when server is running):

```bash
curl -v -X POST http://localhost:3001/api/save-log \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"manual-test","markdown":"# Manual Test\n\nThis is a manual test log."}'
```

- Inspect saved files:
  - `ls -la addin-project/logs` — files are created as `analysis-<sessionId>.md`.

## Troubleshooting tips

- If POSTs report `ECONNREFUSED` or `Connection refused`: check the log-server process, kill stale node processes listening on port 3001, and restart it.
  - Example commands (macOS):

```bash
lsof -iTCP:3001 -sTCP:LISTEN -Pn
# kill <pid>
```

- If the taskpane console shows nothing, verify you have the taskpane frame console (Office webview devtools) and not the host app console. Use the browser inspector attached to the add-in taskpane.
- If logs are not saved from inside Word desktop, rely on the `appendLogData()` that writes the markdown into the document and the `AnalysisLogger` download/localStorage as guaranteed fallbacks.

## Files & entry points (quick map)

- Client:
  - `addin-project/src/services/analysis-logger.js`
  - `addin-project/src/services/simple-file-logger.js`
  - `addin-project/src/services/ai-service-browser.js` (coordination)
  - `addin-project/src/taskpane/taskpane.js` (log viewer updates)
  - `addin-project/src/services/document-service.ts` (appendLogData)

- Dev server helper:
  - `addin-project/log-server.js` (Express server, writes to `addin-project/logs/`)

## Recommended next steps (optional)

- If you want central logging during desktop Word testing, run the log-server over HTTPS with a trusted certificate and ensure the taskpane origin matches (or host an HTTPS remote endpoint).
- Add a small "Refresh Log" button in the taskpane log viewer to pull the latest saved markdown from the file logger after saves/append operations.

---
Generated: Aug 17, 2025
