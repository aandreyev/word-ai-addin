/*
 * Simple File Logger Service
 * Saves analysis logs to the project directory via a simple API
 */

/**
 * Simple File Logger class that saves logs to the project directory
 */
class SimpleFileLogger {
  constructor() {
    this.logApiEndpoint = '/api/save-log'; // Use relative path for webpack proxy
    this.sessionId = null;
    this.analysisData = null;
  }

  /**
   * Start a new analysis session
   * @param {string} documentText - The original document text
   * @returns {string} - Session ID
   */
  startSession(documentText) {
    this.sessionId = this.generateSessionId();
    this.analysisData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      suggestions: [],
      applied: false,
      stats: {
        wordCount: documentText.split(/\s+/).filter(w => w.length > 0).length,
        paragraphCount: this.extractParagraphs(documentText).length,
      }
    };
    
    console.log(`📝 Analysis session started: ${this.sessionId}`);
    return this.sessionId;
  }

  /**
   * Record AI suggestions for this session
   * @param {Array} suggestions - The AI suggestions
   * @param {string} rawResponse - Raw AI response (optional, not stored in simplified log)
   * @param {string} prompt - The prompt sent to AI (optional, not stored in simplified log)
   */
  recordSuggestions(suggestions, rawResponse, prompt) {
    if (!this.analysisData) {
      console.warn('No active session - call startSession first');
      return;
    }

    this.analysisData.suggestions = suggestions;
    this.analysisData.suggestionsTimestamp = new Date().toISOString();

    console.log(`📊 Recorded ${suggestions.length} suggestions for session ${this.sessionId}`);
  }

  /**
   * Mark suggestions as applied
   * @param {number} appliedCount - Number of successfully applied suggestions
   */
  markApplied(appliedCount) {
    if (!this.analysisData) return;
    
    this.analysisData.applied = true;
    this.analysisData.appliedCount = appliedCount;
    this.analysisData.applicationTimestamp = new Date().toISOString();
  }

  /**
   * Get the current session content as markdown
   * @returns {string} - The markdown content
   */
  getSessionContent() {
    if (!this.analysisData) {
      return 'No analysis data available. Run an analysis first.';
    }
    return this.generateMarkdown();
  }

  /**
   * Save the session to a file in the project directory
   * @returns {Promise<string>} - The markdown content
   */
  async saveSession() {
    if (!this.analysisData) {
      throw new Error('No analysis data to save');
    }

    const markdown = this.generateMarkdown();
    
    try {
      const payload = JSON.stringify({ sessionId: this.sessionId, markdown: markdown });
      console.log(`🔄 Attempting to save log. Payload size: ${payload.length} characters`);

      // Try multiple endpoints to be robust in dev (proxy may not be applied depending on origin)
      const candidateUrls = [
        this.logApiEndpoint, // relative '/api/save-log' (webpack proxy)
        'http://localhost:3001/api/save-log',
        'http://localhost:3001/save-log',
        '/save-log'
      ];

      let lastError = null;
      for (const url of candidateUrls) {
        try {
          console.log(`🔁 Trying log endpoint: ${url}`);
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
          });

          // If we got a response but it was not OK, capture body for diagnosis
          if (!response.ok) {
            const text = await response.text();
            console.warn(`⚠️ Endpoint ${url} responded ${response.status} ${response.statusText}: ${text}`);
            lastError = new Error(`Endpoint ${url} returned ${response.status} ${response.statusText}: ${text}`);
            continue; // try next endpoint
          }

          // Attempt to parse JSON result, but fall back if not JSON
          let result = null;
          try { result = await response.json(); } catch (e) { result = await response.text(); }
          console.log(`✅ Log saved successfully via ${url}:`, result);
          return markdown;
        } catch (err) {
          // Network error, CORS, or refused connection
          console.error(`❌ Error posting to ${url}:`, err && err.message ? err.message : err);
          lastError = err;
          // Try next candidate
        }
      }

      // If we reach here, all endpoints failed
      console.error('🔥 All attempts to save log failed. Last error:', lastError);
      throw lastError || new Error('Failed to save log via any known endpoint');

    } catch (error) {
      console.error('🔥 Critical error saving log session:', error);
      // Re-throw the error so the caller knows the save failed
      throw error;
    }
  }

  /**
   * Fallback: output to console if server isn't available
   */
  fallbackConsoleLog(markdown) {
    console.log('\n📄 ANALYSIS LOG (Server unavailable - copying to console):');
    console.log('=' .repeat(60));
    console.log(markdown);
    console.log('=' .repeat(60));
    console.log('💡 To save this manually, copy the above text to a .md file');
  }

  /**
   * Generate markdown content for the analysis session
   * @returns {string} - Markdown content
   */
  generateMarkdown() {
    const data = this.analysisData;
    const date = new Date(data.timestamp).toLocaleString();
    
    let markdown = `# AI Document Analysis Report

## Session Information
- **Session ID**: \`${data.sessionId}\`
- **Analysis Date**: ${date}
- **Document Stats**: ${data.stats.wordCount} words, ${data.stats.paragraphCount} paragraphs

## Stage 1: AI Suggestions (JSON)

\`\`\`json
${JSON.stringify(data.suggestions, null, 2)}
\`\`\`

`;

    // Add paragraph references section if available
    if (data.paragraphReferences && data.paragraphReferences.length > 0) {
      markdown += `## Paragraph Reference Snapshot

The following immutable paragraph references were captured during the two-phase processing:

`;
      data.paragraphReferences.forEach((ref, index) => {
        markdown += `### Paragraph ${index}
- **Word API ID**: \`${ref.uniqueLocalId}\`
- **Reference Hash**: \`${ref.contentHash}\` *(Legacy)*
- **Word Count**: ${ref.wordCount}
- **Is List Item**: ${ref.isListItem ? 'Yes' : 'No'}
- **Is Empty**: ${ref.isEmpty ? 'Yes' : 'No'}
- **Preview**: "${ref.text}"

`;
      });
    }

    markdown += `## Stage 2: Summary of Proposed Changes

`;

    // Add summary of changes by paragraph
    const paragraphChanges = {};
    data.suggestions.forEach((suggestion) => {
      let targetParagraph;
      if (suggestion.action === 'insert') {
        // Use the new field name for insert actions
        targetParagraph = suggestion.afterSequentialNumber || suggestion.after_index;
      } else {
        // Use the new field name for other actions
        targetParagraph = suggestion.sequentialNumber || suggestion.index;
      }
      
      if (!paragraphChanges[targetParagraph]) {
        paragraphChanges[targetParagraph] = [];
      }
      paragraphChanges[targetParagraph].push(suggestion);
    });

    if (Object.keys(paragraphChanges).length === 0) {
      markdown += `*No changes proposed.*\n\n`;
    } else {
      Object.keys(paragraphChanges).sort((a, b) => parseInt(a) - parseInt(b)).forEach(sequentialNumber => {
        const changes = paragraphChanges[sequentialNumber];
        
        markdown += `### Sequential ${sequentialNumber}`;
        markdown += `\n`;
        
        changes.forEach((change, idx) => {
          const actionLabel = {
            'modify': '✏️ Modify',
            'insert': '➕ Insert',
            'delete': '🗑️ Delete',
            'move': '↔️ Move'
          }[change.action] || change.action;
          
          markdown += `- **${actionLabel}**: ${change.instruction}\n`;
          if (change.reason) {
            markdown += `  - *Reason*: ${change.reason}\n`;
          }
        });
        markdown += `\n`;
      });
    }

    // Add application results if available
    if (data.applied) {
      markdown += `## Application Results
- **Applied**: ${data.appliedCount} out of ${data.suggestions.length} suggestions
- **Application Time**: ${new Date(data.applicationTimestamp).toLocaleString()}
- **Success Rate**: ${Math.round((data.appliedCount / data.suggestions.length) * 100)}%
`;
    } else {
      markdown += `## Application Results
- **Status**: Suggestions not yet applied
`;
    }

    markdown += `
---
*Generated by AI Document Review Add-in*
*Session: ${data.sessionId}*
`;

    return markdown;
  }

  /**
   * Extract paragraphs from document text
   * @param {string} text - Document text
   * @returns {Array} - Array of paragraph strings
   */
  extractParagraphs(text) {
    return text.split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Generate unique session ID
   * @returns {string} - Session ID
   */
  generateSessionId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * List all saved log files
   * @returns {Promise<Array>} - Array of log file info
   */
  static async listLogs() {
    try {
      const response = await fetch('http://localhost:3001/api/logs');
      if (response.ok) {
        return await response.json();
      }
      console.error('Failed to fetch logs from server');
      return [];
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  }

  /**
   * Record paragraph reference information for debugging
   * @param {Array} referenceInfo - Array of reference information objects
   */
  recordParagraphReferences(referenceInfo) {
    if (!this.analysisData) {
      console.warn('No active session - call startSession first');
      return;
    }

    this.analysisData.paragraphReferences = referenceInfo;
    console.log(`📝 Recorded ${referenceInfo.length} paragraph references for session ${this.sessionId}`);
  }
}

// Export for use in other modules
export { SimpleFileLogger };
