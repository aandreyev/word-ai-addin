/*
 * AI Document Review Add-in
 * Main application logic for analyzing and improving Word documents using AI
 */

/* global document, Office, Word */

// Import our AI service
import '../services/ai-service-browser.js';

// Application state
let currentSuggestions = [];
let isProcessing = false;

// UI Elements (will be initialized after Office.onReady)
let elements = {};

Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    // Hide sideload message and show main app
    document.getElementById("sideload-msg").style.display = "none";
    document.getElementById("app-body").style.display = "flex";
    
    // Initialize UI elements
    initializeElements();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize document info
    updateDocumentInfo();
  }
});

/**
 * Initialize UI element references
 */
function initializeElements() {
  elements = {
    // Buttons
    analyzeBtn: document.getElementById("analyze-document"),
    applySuggestionsBtn: document.getElementById("apply-suggestions"),
    clearResultsBtn: document.getElementById("clear-results"),
    
    // Status elements
    docStatus: document.getElementById("doc-status"),
    wordCount: document.getElementById("word-count"),
    
    // Progress elements
    progressSection: document.getElementById("progress-section"),
    progressText: document.getElementById("progress-text"),
    progressBar: document.getElementById("progress-bar"),
    
    // Results elements
    resultsSection: document.getElementById("results-section"),
    suggestionsList: document.getElementById("suggestions-list"),
    
    // Error elements
    errorSection: document.getElementById("error-section"),
    errorMessage: document.getElementById("error-message")
  };
}

/**
 * Set up event listeners for UI interactions
 */
function setupEventListeners() {
  elements.analyzeBtn.onclick = analyzeDocument;
  elements.applySuggestionsBtn.onclick = applySuggestions;
  elements.clearResultsBtn.onclick = clearResults;
}

/**
 * Update document information in the UI
 */
async function updateDocumentInfo() {
  try {
    // Use the AI service to get document info
    const docInfo = await window.aiDocumentReviewService.getDocumentInfo();
    
    elements.wordCount.textContent = docInfo.wordCount > 0 ? docInfo.wordCount.toLocaleString() : "0";
    
    if (docInfo.wordCount === 0) {
      elements.docStatus.textContent = "Document is empty";
      elements.analyzeBtn.style.opacity = "0.6";
      elements.analyzeBtn.style.pointerEvents = "none";
    } else if (!docInfo.isValid) {
      elements.docStatus.textContent = `Document too large (${docInfo.wordCount} words)`;
      elements.analyzeBtn.style.opacity = "0.6";
      elements.analyzeBtn.style.pointerEvents = "none";
    } else {
      elements.docStatus.textContent = "Ready for analysis";
      elements.analyzeBtn.style.opacity = "1";
      elements.analyzeBtn.style.pointerEvents = "auto";
    }
  } catch (error) {
    console.error("Error updating document info:", error);
    showError("Failed to read document information");
  }
}

/**
 * Main function to analyze the document using AI
 */
async function analyzeDocument() {
  if (isProcessing) return;
  
  try {
    isProcessing = true;
    showProgress("Analyzing document...", 0);
    hideError();
    hideResults();
    
    // Extract document text
    showProgress("Reading document content...", 25);
    
    // Get AI analysis directly (document reading is handled by the service)
    showProgress("Getting AI analysis...", 50);
    const suggestions = await getAIAnalysis();
    
    showProgress("Processing suggestions...", 75);
    
    if (!suggestions || suggestions.length === 0) {
      throw new Error("No suggestions were generated. The document may already be well-written.");
    }
    
    // Store and display results
    currentSuggestions = suggestions;
    showProgress("Complete!", 100);
    
    setTimeout(() => {
      hideProgress();
      displaySuggestions(suggestions);
      showApplyButton();
    }, 500);
    
  } catch (error) {
    console.error("Analysis failed:", error);
    hideProgress();
    showError(error.message || "Document analysis failed. Please try again.");
  } finally {
    isProcessing = false;
  }
}

/**
 * Extract text content from the Word document
 */
async function extractDocumentText() {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text;
  });
}

/**
 * Get the number of paragraphs in the document
 */
async function getParagraphCount() {
  return Word.run(async (context) => {
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load("items");
    await context.sync();
    return paragraphs.items.length;
  });
}

/**
 * Get AI analysis using our AI service
 */
async function getAIAnalysis(documentText) {
  try {
    // Use the global AI service instance
    const suggestions = await window.aiDocumentReviewService.analyzeDocument();
    return suggestions;
  } catch (error) {
    console.error('AI analysis failed:', error);
    throw new Error(error.message || 'AI analysis failed. Please try again.');
  }
}

/**
 * Apply AI suggestions to the document
 */
async function applySuggestions() {
  if (!currentSuggestions || currentSuggestions.length === 0) return;
  
  try {
    isProcessing = true;
    showProgress("Applying suggestions...", 0);
    
    // Use the AI service to apply suggestions
    const appliedCount = await window.aiDocumentReviewService.applySuggestions(currentSuggestions);
    
    showProgress("Complete!", 100);
    
    setTimeout(() => {
      hideProgress();
      showApplyResults(appliedCount, currentSuggestions.length);
      clearResults();
    }, 1000);
    
  } catch (error) {
    console.error("Failed to apply suggestions:", error);
    hideProgress();
    showError("Failed to apply suggestions. Please try again.");
  } finally {
    isProcessing = false;
  }
}

/**
 * Display analysis results in the UI
 */
function displaySuggestions(suggestions) {
  elements.suggestionsList.innerHTML = "";
  
  suggestions.forEach((suggestion, index) => {
    const item = createSuggestionElement(suggestion, index);
    elements.suggestionsList.appendChild(item);
  });
  
  elements.resultsSection.style.display = "block";
}

/**
 * Create a suggestion element for the UI
 */
function createSuggestionElement(suggestion, index) {
  const item = document.createElement("div");
  item.className = "suggestion-item";
  
  const actionText = {
    "modify": "✏️ Modify",
    "insert": "➕ Insert", 
    "delete": "🗑️ Delete",
    "move": "↔️ Move"
  }[suggestion.action] || suggestion.action;
  
  item.innerHTML = `
    <div class="suggestion-header">
      <span class="suggestion-action">${actionText}</span>
      <span class="suggestion-index">Paragraph ${(suggestion.index || suggestion.after_index || 0) + 1}</span>
    </div>
    <div class="suggestion-instruction">${suggestion.instruction || suggestion.content_prompt}</div>
    ${suggestion.reason ? `<div class="suggestion-reason">Reason: ${suggestion.reason}</div>` : ''}
  `;
  
  return item;
}

/**
 * Show apply button and clear button
 */
function showApplyButton() {
  elements.applySuggestionsBtn.style.display = "block";
  elements.clearResultsBtn.style.display = "block";
}

/**
 * Show progress indicator
 */
function showProgress(text, percentage) {
  elements.progressText.textContent = text;
  elements.progressBar.style.width = `${percentage}%`;
  elements.progressSection.style.display = "block";
}

/**
 * Hide progress indicator
 */
function hideProgress() {
  elements.progressSection.style.display = "none";
}

/**
 * Show results section
 */
function showResults() {
  elements.resultsSection.style.display = "block";
}

/**
 * Hide results section
 */
function hideResults() {
  elements.resultsSection.style.display = "none";
}

/**
 * Show error message
 */
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorSection.style.display = "block";
}

/**
 * Hide error message
 */
function hideError() {
  elements.errorSection.style.display = "none";
}

/**
 * Show results after applying suggestions
 */
function showApplyResults(appliedCount, totalCount) {
  const message = `Applied ${appliedCount} of ${totalCount} suggestions successfully.`;
  elements.docStatus.textContent = message;
  updateDocumentInfo(); // Refresh document stats
}

/**
 * Clear all results and reset UI
 */
function clearResults() {
  currentSuggestions = [];
  elements.resultsSection.style.display = "none";
  elements.applySuggestionsBtn.style.display = "none";
  elements.clearResultsBtn.style.display = "none";
  elements.suggestionsList.innerHTML = "";
  hideError();
  hideProgress();
  updateDocumentInfo();
}

// Export functions for testing
export { analyzeDocument, applySuggestions, clearResults };
