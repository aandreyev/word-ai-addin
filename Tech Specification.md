\# Technical Specification: AI Document Review Add-in for Microsoft Word (PoC)

\#\# 1\. Objective

The goal of this Proof of Concept (PoC) is to create a functional Microsoft Word task pane add-in that reviews the currently open document and provides suggested edits directly within the document using Word's native "Track Changes" feature.

The add-in will handle not only text modification but also structural changes such as deleting, inserting, and moving paragraphs.

It will utilize a two-pass methodology for analysis and execution and will be powered by the Google Gemini API. The final add-in must be testable on Microsoft Word for Mac.

\---

\#\# 2\. Target Platform & Environment

\- \*\*Host Application:\*\* Microsoft Word for Mac (latest version on Microsoft 365\)  
\- \*\*Development Framework:\*\* Office Add-ins Platform using the Word JavaScript API (Office.js)  
\- \*\*Development Environment:\*\* macOS, Visual Studio Code, Node.js/npm

\---

\#\# 3\. Core Technologies

\- \*\*Frontend:\*\* HTML, CSS, JavaScript (TypeScript is preferred)  
\- \*\*Word Interaction:\*\* Office JavaScript API (Office.js)  
\- \*\*LLM Service:\*\* Google Gemini API (via REST calls)  
\- \*\*Scaffolding/Setup:\*\* Yeoman Generator for Office Add-ins (\`yo office\`)

\---

\#\# 4\. Prompt Engineering Strategy

The success of this add-in is critically dependent on precise and well-structured prompts. The interaction with the LLM is not a simple request; it is a carefully controlled instruction designed to elicit a predictable, machine-readable response.

\-   \*\*Role-Playing:\*\* Each prompt will begin by assigning the LLM a specific role (e.g., "You are an expert legal editor"). This grounds the model and focuses its responses within the desired domain.  
\-   \*\*Clear, Imperative Instructions:\*\* Prompts will use direct, unambiguous language. Crucially, they will specify the \*\*exact format\*\* for the response (e.g., "Your response MUST be a single, valid JSON array of action objects"). This minimizes variability and makes parsing the response reliable.  
\-   \*\*Context Scoping:\*\* The two-pass architecture relies on different prompts for different contexts. The Pass 1 prompt is broad, asking for a strategic plan based on the whole document. The Pass 2 prompts are highly focused, providing the specific instruction from the plan and only the single paragraph of text to be acted upon. This separation of concerns is essential for accuracy.

The specific prompt structures outlined in Section 9 are the foundation of this strategy and must be implemented precisely.

\---

\#\# 5\. Prompt Storage and Management

To ensure maintainability and flexibility, prompts will \*\*not\*\* be hardcoded into the application's source code. Instead, they will be stored as external text files. This will allow for faster tuning and iterations of the prompts.

\-   \*\*File Structure:\*\* A dedicated directory, \`/src/prompts/\`, will be created to hold the prompt templates. Each prompt will be in its own file (e.g., \`pass1\_strategy\_prompt.md\`, \`pass2\_execution\_prompt.md\`). Markdown format is preferred for readability.  
\-   \*\*Dynamic Loading:\*\* The add-in's JavaScript/TypeScript code will use the \`fetch()\` API to load the content of the appropriate prompt file at runtime.  
\-   \*\*Template Substitution:\*\* The prompt files will use simple placeholders (e.g., \`\[Full plain text of the Word document goes here\]\`) for dynamic content. The application code will be responsible for replacing these placeholders with the actual document data before sending the final, complete prompt to the Gemini API.  
\-   \*\*Benefits:\*\* This approach separates the application's logic from its "configuration" (the prompts), allowing for easy updates and refinements to the prompts without requiring code changes or a full redeployment of the add-in. It also enables non-developers to review and edit the prompts.

\---

\#\# 6\. Architectural Overview: The Two-Pass Method

To ensure contextual accuracy and reliable execution, the add-in will use a two-pass approach.

\-   \*\*Pass 1: Global Strategy Pass:\*\* The add-in will send the entire document's content to the LLM to get a comprehensive "editing plan." This plan, returned as a structured array of action objects, will identify all required changes, including modifications, insertions, deletions, and moves. All indices in this plan refer to the paragraphs' positions in the original, unmodified document.

\-   \*\*Pass 2: Phased Execution Pass:\*\* The add-in will execute the editing plan in a specific, phased sequence. Critically, it will first create a static map of references to all paragraph objects in their original state. It then uses these stable references to execute the plan, preventing errors that would otherwise be caused by shifting paragraph indices during the operation.

\---

\#\# 7\. Detailed Functional Workflow

1\.  \*\*User Action:\*\* The user opens a Word document and clicks a "Show Taskpane" button on the Word ribbon.  
2\.  \*\*UI Display:\*\* A task pane appears with a title, descriptive text, and a single button: \*\*"Review Document"\*\*. A status area below the button will provide feedback.  
3\.  \*\*Initiate Review:\*\* The user clicks the \*\*"Review Document"\*\* button.  
4\.  \*\*Status Update:\*\* The status area updates to "Reviewing... Pass 1: Analyzing document structure."  
5\.  \*\*Pass 1 \- Strategy:\*\*  
    \-   The add-in extracts the plain text content of the entire document.  
    \-   It loads the strategy prompt from its external file, injects the document text, and sends it to the Gemini API (see Section 9\) requesting a JSON array of action objects.  
    \-   It receives the JSON array representing the editing plan and stores it in memory.  
6\.  \*\*Status Update:\*\* The status area updates to "Reviewing... Pass 2: Applying suggestions."  
7\.  \*\*Enable Track Changes:\*\* The add-in programmatically enables Word's "Track Changes" feature.  
8\.  \*\*Pass 2 \- Execution (Multi-Phase):\*\*  
    \-   \*\*Create Paragraph Reference Map:\*\* Before making any changes, the add-in will get a collection of all paragraph \*objects\* from the document and store them in a static array (e.g., \`originalParagraphs\`).  
        \-   \*\*Crucial Concept:\*\* This array acts as an \*\*immutable snapshot of references\*\*. It contains lightweight pointers to the original paragraphs, not their content. This list is distinct from the live, dynamic document and is never updated during the execution pass. All actions (modify, delete, insert, move) use the stable references from this original array to locate their targets, ensuring that changes like insertions or deletions do not break the plan.  
    \-   All \`index\`, \`from\_index\`, and \`after\_index\` values in the editing plan will refer to this static, zero-based array of object references, not live document positions.  
    \-   \*\*Phase A: Modifications:\*\* The add-in first iterates through the plan and executes all actions where \`action\` is \`"modify"\`. For each, it will use the \`index\` to retrieve the correct paragraph \*reference\* from the \`originalParagraphs\` array and perform the modification.  
    \-   \*\*Phase B: Insertions:\*\* Next, it executes all \`"insert"\` actions. It uses the \`after\_index\` to get a stable reference from the \`originalParagraphs\` array, which serves as the anchor point to insert the new content.  
    \-   \*\*Phase C: Deletions & Moves:\*\* Finally, it handles destructive changes. It sorts all \`"delete"\` and \`"move"\` actions by their source index in \*\*descending order\*\*. It then iterates through this sorted list, using the indices to retrieve stable references from the \`originalParagraphs\` array and executing the deletions or moves. This reverse order prevents an action from invalidating the reference to another object that still needs to be processed.  
9\.  \*\*Completion:\*\*  
    \-   Once all phases are complete, the status area updates to "Review complete. Please review the tracked changes."  
    \-   Track Changes is left enabled for the user.

\---

\#\# 8\. User Interface (UI) Specification

The task pane UI for the PoC should be simple and functional.

\-   \*\*File:\*\* \`taskpane.html\`  
\-   \*\*Header:\*\* \`\<h1\>AI Document Review\</h1\>\`  
\-   \*\*Description:\*\* \`\<p\>Click the button below to review the document. Suggestions will be added as tracked changes.\</p\>\`  
\-   \*\*Action Button:\*\* \`\<button id="review-button"\>Review Document\</button\>\`  
\-   \*\*Status Area:\*\* \`\<div id="status"\>Ready.\</div\>\`

\---

\#\# 9\. Gemini API Interaction Specification

\#\#\# 9.1. Pass 1: Strategy Prompt

\-   \*\*Role:\*\* To generate the comprehensive, structured editing plan.  
\-   \*\*Prompt Structure (to be stored in \`/prompts/pass1\_strategy\_prompt.md\`):\*\*  
    \`\`\`  
    You are an expert legal editor. Your task is to analyze the following document text and create a comprehensive editing plan. Do not rewrite the document itself.

    Your response MUST be a single, valid JSON array of action objects. Each object must have an "action" key with one of the following values: "modify", "delete", "insert", or "move".

    \- For "modify": include "index" (zero-based) and "instruction" (a concise editing goal).  
    \- For "delete": include "index" and a "reason".  
    \- For "insert": include "after\_index" (the paragraph after which to insert) and "content\_prompt" (a clear instruction for the content of the new paragraph). Use \-1 to insert at the beginning.  
    \- For "move": include "from\_index" (source) and "to\_after\_index" (destination).

    Example JSON response:  
    \[  
      {  
        "action": "modify",  
        "index": 3,  
        "instruction": "Clarify the definition of 'Effective Date' to be more specific."  
      },  
      {  
        "action": "delete",  
        "index": 5,  
        "reason": "This paragraph is redundant given the definitions in Section 2."  
      },  
      {  
        "action": "insert",  
        "after\_index": 7,  
        "content\_prompt": "Insert a new paragraph here establishing the governing law as the State of New York."  
      },  
      {  
        "action": "move",  
        "from\_index": 15,  
        "to\_after\_index": 9  
      }  
    \]

    Here is the document text:  
    \[Full plain text of the Word document goes here\]  
    \`\`\`

\#\#\# 9.2. Pass 2: Execution Prompt (for "modify" and "insert" actions)

\-   \*\*Role:\*\* To generate specific paragraph text based on an instruction.  
\-   \*\*Prompt Structure (to be stored in \`/prompts/pass2\_execution\_prompt.md\`):\*\*  
    \`\`\`  
    You are an expert legal editor executing a specific instruction. Your goal is: "\[Instruction or content\_prompt from the Pass 1 plan goes here\]".

    Based on that goal, generate the full text for the paragraph. For a modification, use the original text below for context. Respond ONLY with the rewritten text. Do not add any conversational text or explanations.

    Original paragraph (for context, may be empty for insertions):  
    "\[Plain text of the single paragraph to be edited, or an empty string for an 'insert' action\]"  
    \`\`\`

\---

\#\# 10\. Development and Testing Setup (macOS)

1\.  \*\*Install Prerequisites:\*\*  
    \-   Node.js & npm: \`brew install node\`  
    \-   Yeoman & Office Generator: \`npm install \-g yo office\`

2\.  \*\*Create Project:\*\*  
    \-   In your terminal, run: \`yo office\`  
    \-   Choose the following options:  
        \-   Project type: \*\*Office Add-in Task Pane project\*\*  
        \-   Script type: \*\*TypeScript\*\* (preferred) or JavaScript  
        \-   Name: \*\*Word-Review-Add-in\*\*  
        \-   Office client application: \*\*Word\*\*

3\.  \*\*Sideload for Testing on Mac:\*\*  
    \-   The \`yo office\` command creates a \`manifest.xml\` file.  
    \-   To test the add-in, you must copy this \`manifest.xml\` file to the Word sideload directory on your Mac. The path is:  
        \`/Users/\<username\>/Library/Containers/com.microsoft.Word/Data/Documents/wef\`  
        (If the \`wef\` folder doesn't exist, create it.)  
    \-   Start the local dev server: \`npm start\`  
    \-   Restart Word. Your add-in's ribbon button should now be visible on the Home tab.

\---

\#\# 11\. PoC Scope \- Inclusions & Exclusions

\-   \*\*IN SCOPE:\*\*  
    \-   A functional task pane add-in.  
    \-   Plain text extraction from the document.  
    \-   The full two-pass workflow with a multi-phase execution logic.  
    \-   Ability to handle modify, delete, insert, and move operations.  
    \-   Enabling and using Word's Track Changes for suggestions.  
    \-   Basic status updates in the UI.

\-   \*\*OUT OF SCOPE (for this PoC):\*\*  
    \-   Handling tables, images, comments, or footnotes.  
    \-   Complex error handling or UI for managing API keys.  
    \-   Giving the user options for different models.

---

## 12. Essential Error Handling & Validation (PoC)

To ensure the PoC is robust enough for demonstration, minimal error handling and validation are required:

### 12.1 Basic Error Handling
- **API Failure Recovery**: If Gemini API call fails, retry once. If both attempts fail, show user-friendly error message: "Unable to connect to AI service. Please check your internet connection and try again."
- **Invalid Response Handling**: If AI returns non-JSON or malformed JSON, display: "AI service returned an unexpected response. Please try again."
- **Document Access Errors**: If unable to read document content, display: "Unable to access document. Please ensure the document is not locked or corrupted."

### 12.2 Basic Response Validation
Before executing the editing plan, validate:
- Response is valid JSON array
- Each action object has required `action` field
- `index`, `from_index`, `after_index` values are within document bounds
- Maximum of 100 actions per document (prevent runaway responses)

### 12.3 Document Size Limits
- Maximum document size: 50,000 words (prevent API timeouts)
- If document exceeds limit, display: "Document is too large for this PoC. Please try with a document under 50,000 words."

### 12.4 Status Updates
Enhance status messages to include:
- "Checking document size and format..."
- "Sending to AI for analysis... (this may take 30-60 seconds)"
- "AI analysis complete. Processing recommendations..."
- "Applying changes to document..."
