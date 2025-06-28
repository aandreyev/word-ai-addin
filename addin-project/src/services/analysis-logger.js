/*
 * Analysis Logger Service
 * Records AI analysis sessions to markdown files for review and debugging
 */

/**
 * Analysis Logger class that saves each AI analysis run to a markdown file
 */
class AnalysisLogger {
  constructor() {
    this.logDirectory = '/tmp/word-addin-logs'; // In production, this would be configurable
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
   * Save the session to a markdown file
   * @param {boolean} autoDownload - Whether to automatically download the file
   * @returns {Promise<string>} - The markdown content
   */
  async saveSession(autoDownload = true) {
    if (!this.analysisData) {
      throw new Error('No analysis data to save');
    }

    const markdown = this.generateMarkdown();
    
    // Save to browser's localStorage for persistence
    this.saveToLocalStorage(markdown);
    
    // Automatically download the markdown file
    if (autoDownload) {
      this.downloadMarkdown(markdown);
    }
    
    // Also log to console (shortened version)
    console.log('💾 Analysis session saved and downloaded!');
    console.log(`📄 File: analysis-${this.sessionId}.md`);
    console.log(`📊 ${this.analysisData.stats.wordCount} words, ${this.analysisData.suggestions.length} suggestions`);
    
    return markdown;
  }

  /**
   * Download markdown content as a file
   * @param {string} markdown - The markdown content to download
   */
  downloadMarkdown(markdown) {
    console.log('🔍 Starting downloadMarkdown function...');
    
    try {
      // Create a blob with the markdown content
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      console.log('✅ Created blob:', blob.size, 'bytes');
      
      // Create a download URL
      const url = URL.createObjectURL(blob);
      console.log('✅ Created URL:', url);
      
      // Create a temporary download link
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `analysis-${this.sessionId}.md`;
      downloadLink.style.display = 'none';
      
      console.log('✅ Created download link:', {
        href: downloadLink.href,
        download: downloadLink.download
      });
      
      // Add to DOM, click, and remove
      document.body.appendChild(downloadLink);
      console.log('✅ Added link to DOM');
      
      downloadLink.click();
      console.log('✅ Clicked download link');
      
      document.body.removeChild(downloadLink);
      console.log('✅ Removed link from DOM');
      
      // Clean up the URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log(`📥 Downloaded: analysis-${this.sessionId}.md`);
      console.log('📁 File should be in your Downloads folder');
      
    } catch (error) {
      console.error('❌ Failed to download markdown file:', error);
      console.log('💾 Fallback: Analysis saved to localStorage only');
      
      // Alternative approach - try opening in new window
      try {
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          console.log('📄 Opened markdown in new window - you can save it manually');
        } else {
          console.log('❌ Unable to open new window - popup blocked?');
        }
      } catch (altError) {
        console.error('❌ Alternative approach also failed:', altError);
      }
    }
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

## Stage 2: Summary of Proposed Changes

`;

    // Add summary of changes by paragraph
    const paragraphChanges = {};
    data.suggestions.forEach((suggestion) => {
      let targetParagraph;
      if (suggestion.action === 'insert') {
        targetParagraph = suggestion.after_index;
      } else {
        targetParagraph = suggestion.index;
      }
      
      if (!paragraphChanges[targetParagraph]) {
        paragraphChanges[targetParagraph] = [];
      }
      paragraphChanges[targetParagraph].push(suggestion);
    });

    if (Object.keys(paragraphChanges).length === 0) {
      markdown += `*No changes proposed.*\n\n`;
    } else {
      Object.keys(paragraphChanges).sort((a, b) => parseInt(a) - parseInt(b)).forEach(paragraphIndex => {
        const changes = paragraphChanges[paragraphIndex];
        markdown += `### Paragraph ${parseInt(paragraphIndex) + 1}\n`;
        
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
    return `analysis-${timestamp}-${random}`;
  }

  /**
   * Save to localStorage for browser persistence
   * @param {string} markdown - Markdown content
   */
  saveToLocalStorage(markdown) {
    try {
      const key = `word-addin-analysis-${this.sessionId}`;
      localStorage.setItem(key, markdown);
      
      // Also maintain a list of all sessions
      const sessions = JSON.parse(localStorage.getItem('word-addin-sessions') || '[]');
      sessions.push({
        sessionId: this.sessionId,
        timestamp: this.analysisData.timestamp,
        wordCount: this.analysisData.stats.wordCount,
        suggestionCount: this.analysisData.suggestions.length
      });
      localStorage.setItem('word-addin-sessions', JSON.stringify(sessions));
      
      console.log(`💾 Session saved to localStorage: ${key}`);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  /**
   * Get all saved sessions from localStorage
   * @returns {Array} - Array of session metadata
   */
  static getSavedSessions() {
    try {
      return JSON.parse(localStorage.getItem('word-addin-sessions') || '[]');
    } catch (error) {
      console.warn('Failed to load sessions from localStorage:', error);
      return [];
    }
  }

  /**
   * Load a specific session from localStorage
   * @param {string} sessionId - Session ID
   * @returns {string|null} - Markdown content or null if not found
   */
  static loadSession(sessionId) {
    try {
      return localStorage.getItem(`word-addin-analysis-${sessionId}`);
    } catch (error) {
      console.warn('Failed to load session from localStorage:', error);
      return null;
    }
  }

  /**
   * Download all saved sessions as individual markdown files
   * @returns {number} - Number of files downloaded
   */
  static downloadAllSessions() {
    const sessions = AnalysisLogger.getSavedSessions();
    let downloadCount = 0;
    
    console.log(`📥 Starting download of ${sessions.length} analysis sessions...`);
    
    sessions.forEach((session, index) => {
      const markdown = localStorage.getItem(`word-addin-analysis-${session.sessionId}`);
      if (markdown) {
        // Add a small delay between downloads to avoid browser blocking
        setTimeout(() => {
          try {
            const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `analysis-${session.sessionId}.md`;
            downloadLink.style.display = 'none';
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            console.log(`📄 Downloaded ${index + 1}/${sessions.length}: ${session.sessionId}`);
          } catch (error) {
            console.error(`Failed to download session ${session.sessionId}:`, error);
          }
        }, index * 300); // 300ms delay between downloads
        
        downloadCount++;
      }
    });
    
    if (downloadCount > 0) {
      console.log(`✅ Initiated download of ${downloadCount} analysis sessions`);
      console.log('📁 Check your Downloads folder for the markdown files');
    } else {
      console.log('❌ No sessions found to download');
    }
    
    return downloadCount;
  }

  /**
   * Download a combined report of all sessions
   * @returns {boolean} - Success status
   */
  static downloadCombinedReport() {
    const sessions = AnalysisLogger.getSavedSessions();
    
    if (sessions.length === 0) {
      console.log('❌ No sessions found to include in combined report');
      return false;
    }
    
    let combinedMarkdown = `# Combined AI Document Analysis Report

Generated: ${new Date().toLocaleString()}
Total Sessions: ${sessions.length}

---

`;
    
    sessions.forEach((session, index) => {
      const markdown = localStorage.getItem(`word-addin-analysis-${session.sessionId}`);
      if (markdown) {
        combinedMarkdown += `\n## Session ${index + 1}: ${session.sessionId}\n\n`;
        combinedMarkdown += markdown.replace(/^# AI Document Analysis Report/, '### Analysis Details');
        combinedMarkdown += '\n\n---\n\n';
      }
    });
    
    try {
      const blob = new Blob([combinedMarkdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `combined-analysis-report-${new Date().toISOString().split('T')[0]}.md`;
      downloadLink.style.display = 'none';
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log(`📥 Downloaded combined report with ${sessions.length} sessions`);
      return true;
      
    } catch (error) {
      console.error('Failed to download combined report:', error);
      return false;
    }
  }

  /**
   * Test download functionality (for debugging)
   */
  static testDownload() {
    console.log('🧪 Testing download functionality...');
    
    try {
      const testContent = `# Test Download\n\nThis is a test markdown file.\nGenerated at: ${new Date().toISOString()}\n`;
      const blob = new Blob([testContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'test-download.md';
      downloadLink.style.display = 'none';
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log('✅ Test download initiated - check Downloads folder for test-download.md');
      
    } catch (error) {
      console.error('❌ Test download failed:', error);
    }
  }
}

// Export for use in other modules
export { AnalysisLogger };
