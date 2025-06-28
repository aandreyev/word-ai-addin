/*
 * AI Document Review Add-in
 * Main application logic for analyzing and improving Word documents using AI
 */

/* global document, Office, Word */

// Import our AI service
import '../services/ai-service-browser.js';
import { AnalysisLogger } from '../services/analysis-logger.js';

// Application state
let currentSuggestions = [];
let currentParagraphMapping = []; // Store the mapping for apply phase
let isProcessing = false;

// UI Elements (will be initialized after Office.onReady)
let elements = {};

// Add event listener for tab switching
document.addEventListener('DOMContentLoaded', () => {
    const tabContainer = document.querySelector('.tab-container');
    if (tabContainer) {
        tabContainer.addEventListener('click', (event) => {
            if (event.target.matches('.tab-button')) {
                const tabId = event.target.getAttribute('data-tab');
                switchTab(tabId);
            }
        });
    }
});

/**
 * Switch between the Analyzer and Log Viewer tabs
 * @param {string} tabId - The ID of the tab to activate
 */
function switchTab(tabId) {
    // Deactivate all tabs and buttons
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));

    // Activate the selected tab and button
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
}

/**
 * Updates the log viewer with the provided content.
 * @param {string} logContent The content to display in the log viewer.
 */
function updateLogViewer(logContent) {
    const logContentArea = document.getElementById('log-content');
    if (logContentArea) {
        logContentArea.textContent = logContent;
    }
}



// Add a fallback in case Office.js doesn't load
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded');
  
  // Set a timeout to show the app even if Office.onReady doesn't fire
  setTimeout(() => {
    const sideloadMsg = document.getElementById("sideload-msg");
    const appBody = document.getElementById("app-body");
    
    if (sideloadMsg && sideloadMsg.style.display !== "none") {
      console.log('Office.onReady timeout - showing app anyway');
      if (sideloadMsg) sideloadMsg.style.display = "none";
      if (appBody) appBody.style.display = "block";
      
      try {
        initializeElements();
        setupEventListeners();
        updateDocumentInfo();
      } catch (error) {
        console.error('Error in fallback initialization:', error);
      }
    }
  }, 3000); // Wait 3 seconds for Office.onReady
});

Office.onReady((info) => {
  console.log('Office.onReady called', info);
  
  if (info.host === Office.HostType.Word) {
    console.log('Word host detected, initializing app...');
    
    try {
      // Hide sideload message and show main app
      const sideloadMsg = document.getElementById("sideload-msg");
      const appBody = document.getElementById("app-body");
      
      console.log('sideloadMsg element:', sideloadMsg);
      console.log('appBody element:', appBody);
      
      if (sideloadMsg) {
        sideloadMsg.style.display = "none";
        console.log('Sideload message hidden');
      }
      
      if (appBody) {
        appBody.style.display = "block";
        console.log('App body shown');
      }
      
      // Initialize UI elements
      initializeElements();
      console.log('Elements initialized');
      
      // Set up event listeners
      setupEventListeners();
      console.log('Event listeners set up');
      
      // Initialize document info
      updateDocumentInfo();
      console.log('Document info updated');
      
      // 🔍 DEBUG: Test API key detection
      testApiKeyDetection();
      
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  } else {
    console.log('Not in Word host, host type:', info.host);
  }
});

/**
 * Initialize UI element references
 */
function initializeElements() {
  console.log('Initializing UI elements...');
  
  elements = {
    // Main buttons
    analyzeBtn: document.getElementById("analyze-button"),
    applySuggestionsBtn: document.getElementById("apply-suggestions-button"),
    clearResultsBtn: document.getElementById("clear-results-button"),
    clearHistoryBtn: document.getElementById("clear-history-button"),
    downloadHistoryBtn: document.getElementById("download-history-button"),

    // Status & Results
    statusContainer: document.getElementById("status-container"),
    resultsSection: document.getElementById("results-section"),
    suggestionsList: document.getElementById("suggestions-list"),
    historyContainer: document.getElementById("history-container"),

    // Progress & Error handling
    progressSection: document.getElementById("progress-section"),
    progressBar: document.getElementById("progress-bar"),
    progressText: document.getElementById("progress-text"),
    errorSection: document.getElementById("error-section"),
    errorMessage: document.getElementById("error-message"),

    // Document status
    docStatus: document.getElementById("doc-status"),

    // Log Viewer
    logContent: document.getElementById('log-content'),
  };
  
  // Verify all elements were found
  const missingElements = [];
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      missingElements.push(key);
    }
  }
  
  if (missingElements.length > 0) {
    console.warn('Missing elements:', missingElements);
  } else {
    console.log('All UI elements found successfully');
  }
}

/**
 * Set up event listeners for UI interactions
 */
function setupEventListeners() {
  if (elements.analyzeBtn) {
    elements.analyzeBtn.onclick = analyzeDocument;
  }
  if (elements.applySuggestionsBtn) {
    elements.applySuggestionsBtn.onclick = applySuggestions;
  }
  if (elements.clearResultsBtn) {
    elements.clearResultsBtn.onclick = clearResults;
  }
  if (elements.clearHistoryBtn) {
    elements.clearHistoryBtn.onclick = clearResults;
  }
  if (elements.downloadHistoryBtn) {
    elements.downloadHistoryBtn.onclick = downloadAllSessions;
  }
}

/**
 * Show status message to user
 * @param {string} message - Status message
 */
function showStatus(message) {
  if (elements.statusContainer) {
    elements.statusContainer.style.display = "block";
    elements.statusContainer.textContent = message;
    elements.statusContainer.style.color = "#0078d4";
  }
  console.log("Status:", message);
}

/**
 * Update document information in the UI
 */
async function updateDocumentInfo() {
  try {
    // Use the AI service to get document info if available
    if (window.aiDocumentReviewService) {
      const docInfo = await window.aiDocumentReviewService.getDocumentInfo();
      showStatus(`Document ready: ${docInfo.wordCount} words`);
    } else {
      showStatus("AI service not yet available");
    }
  } catch (error) {
    console.error("Error updating document info:", error);
    showStatus("Failed to read document information");
  }
}

/**
 * Main function to analyze the document using AI
 */
async function analyzeDocument() {
  if (isProcessing) return;
  
  console.log('🚀 ANALYZE DOCUMENT STARTED');
  
  try {
    isProcessing = true;
    hideError();
    showStatus("Analyzing document...");
    
    // Check if AI service is available
    if (!window.aiDocumentReviewService) {
      throw new Error("AI service not available. Please refresh the add-in.");
    }
    
    console.log('✅ AI service is available');
    
    showStatus("Getting AI analysis...");
    console.log('📞 Calling AI service...');
    const suggestions = await getAIAnalysis();
    console.log('📋 Received suggestions:', suggestions);

    // Update the log viewer with the latest analysis log
    if (window.aiDocumentReviewService) {
        const logContent = window.aiDocumentReviewService.getLatestLog();
        updateLogViewer(logContent);
    }
    
    showStatus(`Analysis complete! Found ${suggestions.length} suggestions.`);
    
    if (!suggestions || suggestions.length === 0) {
      showStatus("No suggestions generated. The document may already be well-written.");
      return;
    }
    
    // Store suggestions for the apply step
    currentSuggestions = suggestions;
    
    // Display the suggestions in the UI
    displaySuggestions(suggestions);
    
    // Show the Apply and Clear buttons
    showApplyButton();
    
  } catch (error) {
    console.error("❌ Analysis failed:", error);
    showError("Analysis failed: " + (error.message || "Please try again."));
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
 * Get AI analysis using our AI service with new mapping approach
 */
async function getAIAnalysis() {
  try {
    console.log('🔍 getAIAnalysis: Starting...');
    console.log('🔍 AI service available:', !!window.aiDocumentReviewService);
    
    // Use the global AI service instance - now returns both suggestions and mapping
    const result = await window.aiDocumentReviewService.analyzeDocument();
    console.log('🔍 getAIAnalysis: Received result:', result);
    
    // Store both suggestions and mapping for the apply phase
    currentParagraphMapping = result.paragraphMapping;
    console.log('🔍 getAIAnalysis: Stored paragraph mapping with', currentParagraphMapping.length, 'items');
    
    return result.suggestions;
  } catch (error) {
    console.error('❌ AI analysis failed:', error);
    throw new Error(error.message || 'AI analysis failed. Please try again.');
  }
}

/**
 * Apply AI suggestions to the document using the mapping approach
 */
async function applySuggestions() {
  if (!currentSuggestions || currentSuggestions.length === 0) return;
  if (!currentParagraphMapping || currentParagraphMapping.length === 0) {
    console.error('❌ No paragraph mapping available for applying suggestions');
    showError('No paragraph mapping available. Please analyze the document again.');
    return;
  }
  
  // 🔍 DEBUG: Show what suggestions are being applied
  console.log('\n🚀 APPLYING SUGGESTIONS TO DOCUMENT WITH MAPPING:');
  console.log('=' .repeat(60));
  console.log(`📊 Total suggestions to apply: ${currentSuggestions.length}`);
  console.log(`🗺️ Paragraph mapping items: ${currentParagraphMapping.length}`);
  
  currentSuggestions.forEach((suggestion, index) => {
    console.log(`\n🎯 SUGGESTION ${index + 1} TO APPLY:`);
    console.log(`   Action: ${suggestion.action.toUpperCase()}`);
    
    if (suggestion.action === 'insert') {
      console.log(`   Target: After sequential paragraph ${suggestion.afterSequentialNumber}`);
    } else {
      console.log(`   Target: Sequential paragraph ${suggestion.sequentialNumber}`);
    }
    
    console.log(`   Instruction: "${suggestion.instruction}"`);
    if (suggestion.newContent) {
      console.log(`   New content: "${suggestion.newContent.substring(0, 100)}..."`);
    }
    console.log('   Full suggestion JSON:', JSON.stringify(suggestion, null, 2));
  });
  console.log('=' .repeat(60));
  
  try {
    isProcessing = true;
    showProgress("Applying suggestions...", 0);
    
    // Use the AI service to apply suggestions with mapping
    const appliedCount = await window.aiDocumentReviewService.applySuggestions(currentSuggestions, currentParagraphMapping);
    
    console.log(`\n✅ SUGGESTIONS APPLIED SUCCESSFULLY!`);
    console.log(`📈 Applied ${appliedCount} out of ${currentSuggestions.length} suggestions`);
    
    showProgress("Complete!", 100);
    
    setTimeout(() => {
      hideProgress();
      showApplyResults(appliedCount, currentSuggestions.length);
      clearResults();
    }, 1000);
    
  } catch (error) {
    console.error("❌ FAILED TO APPLY SUGGESTIONS:", error);
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
  if (!elements.suggestionsList) {
    console.warn('Suggestions list element not found');
    return;
  }
  
  elements.suggestionsList.innerHTML = "";
  
  suggestions.forEach((suggestion, index) => {
    const item = createSuggestionElement(suggestion, index);
    elements.suggestionsList.appendChild(item);
  });
  
  if (elements.resultsSection) {
    elements.resultsSection.style.display = "block";
  }
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
  
  // Get the sequential number for display
  let targetDisplay = '';
  if (suggestion.action === 'insert') {
    targetDisplay = `After paragraph ${suggestion.afterSequentialNumber}`;
  } else {
    targetDisplay = `Paragraph ${suggestion.sequentialNumber}`;
  }
  
  // Build the content preview based on action type
  let contentPreview = '';
  if (suggestion.action === 'modify' && suggestion.newContent) {
    contentPreview = `<div class="suggestion-preview"><strong>New text:</strong> "${suggestion.newContent}"</div>`;
  } else if (suggestion.action === 'insert' && suggestion.newContent) {
    contentPreview = `<div class="suggestion-preview"><strong>Insert:</strong> "${suggestion.newContent}"</div>`;
  } else if (suggestion.action === 'modify' && suggestion.replacement_text) {
    // Backward compatibility
    contentPreview = `<div class="suggestion-preview"><strong>New text:</strong> "${suggestion.replacement_text}"</div>`;
  } else if (suggestion.action === 'insert' && suggestion.new_content) {
    // Backward compatibility
    contentPreview = `<div class="suggestion-preview"><strong>Insert:</strong> "${suggestion.new_content}"</div>`;
  }
  
  item.innerHTML = `
    <div class="suggestion-header">
      <span class="suggestion-action">${actionText}</span>
      <span class="suggestion-index">${targetDisplay}</span>
    </div>
    <div class="suggestion-instruction">${suggestion.instruction}</div>
    ${contentPreview}
    ${suggestion.reason ? `<div class="suggestion-reason">Reason: ${suggestion.reason}</div>` : ''}
  `;
  
  return item;
}

/**
 * Show apply button and clear button
 */
function showApplyButton() {
  if (elements.applySuggestionsBtn) {
    elements.applySuggestionsBtn.style.display = "block";
  }
  if (elements.clearResultsBtn) {
    elements.clearResultsBtn.style.display = "block";
  }
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
  if (elements.progressSection) {
    elements.progressSection.style.display = "none";
  }
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
  if (elements.errorMessage) {
    elements.errorMessage.textContent = message;
  }
  if (elements.errorSection) {
    elements.errorSection.style.display = "block";
  }
  console.error('Error:', message);
}

/**
 * Hide error message
 */
function hideError() {
  if (elements.errorSection) {
    elements.errorSection.style.display = "none";
  }
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
  if (elements.resultsSection) {
    elements.resultsSection.style.display = "none";
  }
  if (elements.applySuggestionsBtn) {
    elements.applySuggestionsBtn.style.display = "none";
  }
  if (elements.clearResultsBtn) {
    elements.clearResultsBtn.style.display = "none";
  }
  if (elements.suggestionsList) {
    elements.suggestionsList.innerHTML = "";
  }
  hideError();
  hideProgress();
  updateDocumentInfo();
}

/**
 * Download all saved analysis sessions
 */
async function downloadAllSessions() {
  try {
    // Import the AnalysisLogger class
    const { AnalysisLogger } = await import('../services/analysis-logger.js');
    
    const count = AnalysisLogger.downloadAllSessions();
    
    if (count > 0) {
      showSuccess(`📥 Downloading ${count} analysis sessions...`);
      console.log('📁 Check your Downloads folder for the markdown files');
    } else {
      showError('No analysis sessions found to download.');
    }
  } catch (error) {
    console.error('Failed to download sessions:', error);
    showError('Failed to download sessions. Please try again.');
  }
}

/**
 * Download a combined report of all sessions
 */
async function downloadCombinedReport() {
  try {
    // Import the AnalysisLogger class
    const { AnalysisLogger } = await import('../services/analysis-logger.js');
    
    const success = AnalysisLogger.downloadCombinedReport();
    
    if (success) {
      showSuccess('📊 Combined report downloaded successfully!');
      console.log('📁 Check your Downloads folder for the combined report');
    } else {
      showError('No analysis sessions found to include in report.');
    }
  } catch (error) {
    console.error('Failed to download combined report:', error);
    showError('Failed to download combined report. Please try again.');
  }
}

/**
 * Show list of saved sessions in console and UI
 */
async function showSessionsList() {
  try {
    // Import the AnalysisLogger class
    const { AnalysisLogger } = await import('../services/analysis-logger.js');
    
    const sessions = AnalysisLogger.getSavedSessions();
    
    console.log('\n📚 SAVED ANALYSIS SESSIONS:');
    console.log('=' .repeat(60));
    
    if (sessions.length === 0) {
      console.log('No saved sessions found.');
      showError('No analysis sessions found.');
    } else {
      sessions.forEach((session, index) => {
        const date = new Date(session.timestamp).toLocaleString();
        console.log(`${index + 1}. Session: ${session.sessionId}`);
        console.log(`   Date: ${date}`);
        console.log(`   Document: ${session.wordCount} words, ${session.suggestionCount} suggestions`);
        console.log('   ' + '-'.repeat(30));
      });
      
      console.log(`\nTotal: ${sessions.length} sessions saved`);
      console.log('=' .repeat(60));
      
      showSuccess(`📋 Found ${sessions.length} saved sessions. Check console for details.`);
    }
  } catch (error) {
    console.error('Failed to load sessions:', error);
    showError('Failed to load sessions. Please try again.');
  }
}

/**
 * Show success message to user
 * @param {string} message - Success message
 */
function showSuccess(message) {
  elements.docStatus.textContent = message;
  elements.docStatus.style.color = "#107c10";
  setTimeout(() => {
    elements.docStatus.style.color = "";
    updateDocumentInfo();
  }, 3000);
}

/**
 * Test API key detection for debugging
 */
function testApiKeyDetection() {
  console.log('🔍 DEBUG: Testing API key detection...');
  
  try {
    const indicatorElement = document.getElementById('api-mode-indicator');
    const statusElement = document.getElementById('api-status');
    const detailsElement = document.getElementById('api-details');
    
    // Test what the AI service detects
    if (window.aiDocumentReviewService && window.aiDocumentReviewService.aiService) {
      const aiService = window.aiDocumentReviewService.aiService;
      
      console.log('📋 AI Service available:', !!aiService);
      
      if (aiService.getApiKey) {
        const detectedKey = aiService.getApiKey();
        console.log('🔑 Detected API key:', detectedKey ? detectedKey.substring(0, 8) + '...' : 'none');
        
        const isValid = aiService.hasValidApiKey();
        console.log('✅ Key is valid:', isValid);
        console.log('🌐 Will use real API:', isValid);
        console.log('📋 Will use mock API:', !isValid);
        
        // Update visual indicator
        if (statusElement && detailsElement && indicatorElement) {
          if (isValid) {
            indicatorElement.className = 'api-mode-indicator real-api';
            statusElement.innerHTML = '🌐 REAL API MODE';
            detailsElement.innerHTML = `Using Gemini API key: ${detectedKey.substring(0, 8)}...`;
          } else {
            indicatorElement.className = 'api-mode-indicator mock-api';
            statusElement.innerHTML = '📋 MOCK API MODE';
            detailsElement.innerHTML = 'No valid API key found - using sample responses';
          }
        }
      } else {
        console.log('❌ getApiKey method not available');
        if (statusElement && indicatorElement) {
          indicatorElement.className = 'api-mode-indicator error';
          statusElement.innerHTML = '❌ API Error';
          detailsElement.innerHTML = 'getApiKey method not available';
        }
      }
    } else {
      console.log('❌ AI service not available yet');
      
      // Fallback: test environment variables directly
      console.log('🔍 Testing environment variables directly:');
      let hasKey = false;
      let keySource = 'none';
      let keyPreview = '';
      
      if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'API_KEY_NOT_SET') {
        console.log('   process.env available:', true);
        console.log('   GEMINI_API_KEY:', process.env.GEMINI_API_KEY.substring(0, 8) + '...');
        hasKey = true;
        keySource = 'environment variables';
        keyPreview = process.env.GEMINI_API_KEY.substring(0, 8) + '...';
      } else {
        console.log('   process.env GEMINI_API_KEY:', 'not found or placeholder');
      }
      
      // Test localStorage
      const storedKey = localStorage.getItem('GEMINI_API_KEY');
      if (storedKey && storedKey !== 'GEMINI_API_KEY_PLACEHOLDER') {
        console.log('   localStorage key:', storedKey.substring(0, 8) + '...');
        hasKey = true;
        keySource = 'localStorage';
        keyPreview = storedKey.substring(0, 8) + '...';
      } else {
        console.log('   localStorage key:', 'not found');
      }
      
      // Update visual indicator
      if (statusElement && detailsElement && indicatorElement) {
        if (hasKey) {
          indicatorElement.className = 'api-mode-indicator real-api';
          statusElement.innerHTML = '🌐 REAL API MODE';
          detailsElement.innerHTML = `Key found in ${keySource}: ${keyPreview} (service loading...)`;
        } else {
          indicatorElement.className = 'api-mode-indicator mock-api';
          statusElement.innerHTML = '📋 MOCK API MODE';
          detailsElement.innerHTML = 'No API key found - will use sample responses';
        }
      }
    }
  } catch (error) {
    console.error('❌ Error testing API key detection:', error);
    const statusElement = document.getElementById('api-status');
    const detailsElement = document.getElementById('api-details');
    const indicatorElement = document.getElementById('api-mode-indicator');
    
    if (statusElement && indicatorElement) {
      indicatorElement.className = 'api-mode-indicator error';
      statusElement.innerHTML = '❌ API Status Error';
      detailsElement.innerHTML = error.message;
    }
  }
}


