/*
 * AI Service Integration for Word Add-in
 * This module handles communication with the AI services in the browser environment
 */

// Import analysis logger
import { AnalysisLogger } from './analysis-logger.js';
import { SimpleFileLogger } from './simple-file-logger.js';
import { DocumentService } from './document-service.js';

/**
 * AI Service class that handles document analysis using Gemini API
 */
class AIService {
  constructor() {
    this.apiKey = this.getApiKey();
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.modelName = 'gemini-1.5-flash';
    this.logger = new AnalysisLogger();
    this.fileLogger = new SimpleFileLogger();
    this.documentService = new DocumentService();
  }

  /**
   * Get API key from environment variables
   * In production, this would be securely provided by the backend
   */
  getApiKey() {
    // Check for API key in localStorage first
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    if (storedKey && storedKey !== 'GEMINI_API_KEY_PLACEHOLDER') {
      return storedKey;
    }
    
    // For testing purposes, return placeholder
    return 'GEMINI_API_KEY_PLACEHOLDER';
  }

  /**
   * Analyze document text and return editing suggestions
   * @param {string} documentText - The full document text
   * @returns {Promise<Array>} - Array of editing suggestions
   */
  async analyzeDocument(documentText) {
    try {
      // 🔍 DEBUG: Start logging session (both loggers)
      const sessionId = this.logger.startSession(documentText);
      const fileSessionId = this.fileLogger.startSession(documentText);
      console.log(`📝 Started analysis session: ${sessionId}`);
      console.log(`📁 Started file logging session: ${fileSessionId}`);
      
      // Prepare the analysis prompt
      const prompt = this.buildAnalysisPrompt(documentText);
      
      // 🔍 DEBUG: Show the prompt
      console.log('\n🤖 AI PROMPT:');
      console.log('-' .repeat(40));
      console.log(prompt);
      console.log('-' .repeat(40));
      
      // Call Gemini API
      const response = await this.callGeminiAPI(prompt);
      
      // 🔍 DEBUG: Show raw response
      console.log('\n📥 RAW AI RESPONSE:');
      console.log('-' .repeat(40));
      console.log(response);
      console.log('-' .repeat(40));
      
      // Parse the response into structured suggestions
      const suggestions = this.parseAISuggestions(response);
      
      // 🔍 DEBUG: Record suggestions in both loggers
      this.logger.recordSuggestions(suggestions, response, prompt);
      this.fileLogger.recordSuggestions(suggestions, response, prompt);
      
      // 🔍 DEBUG: Show detailed suggestion breakdown
      console.log('\n📋 PARSED SUGGESTIONS - DETAILED BREAKDOWN:');
      console.log('=' .repeat(60));
      console.log(`🔢 Total Suggestions Generated: ${suggestions.length}`);
      console.log('=' .repeat(60));
      
      suggestions.forEach((suggestion, index) => {
        console.log(`\n📌 SUGGESTION #${index + 1}:`);
        console.log(`   🎯 Action: ${suggestion.action.toUpperCase()}`);
        
        if (suggestion.action === 'insert') {
          console.log(`   📍 Insert After Paragraph: ${suggestion.after_index}`);
        } else {
          console.log(`   📍 Target Paragraph: ${suggestion.index}`);
        }
        
        console.log(`   📝 Instruction: "${suggestion.instruction}"`);
        if (suggestion.reason) {
          console.log(`   💡 Reason: "${suggestion.reason}"`);
        }
        
        console.log('   🔧 COMPLETE JSON STRUCTURE:');
        console.log('   ' + JSON.stringify(suggestion, null, 4).replace(/\n/g, '\n   '));
        console.log('-' .repeat(50));
      });
      
      // Show model response analysis
      console.log('\n🧠 AI MODEL ANALYSIS SUMMARY:');
      console.log(`   📊 Model Used: ${this.modelName}`);
      console.log(`   🎯 Actions Distribution:`);
      const actionCounts = suggestions.reduce((acc, s) => {
        acc[s.action] = (acc[s.action] || 0) + 1;
        return acc;
      }, {});
      Object.entries(actionCounts).forEach(([action, count]) => {
        console.log(`     - ${action.toUpperCase()}: ${count} suggestions`);
      });
      console.log('=' .repeat(60));
      
      // 🔍 DEBUG: Save session immediately after analysis
      try {
        await this.logger.saveSession();
        console.log(`📄 Analysis session saved to browser storage`);
      } catch (error) {
        console.warn('Failed to save browser analysis session:', error);
      }

      // Append the log data to the document
      try {
        const logContent = this.fileLogger.getSessionContent();
        await this.documentService.appendLogData(logContent);
        console.log(`📄 Appended analysis log to the document.`);
      } catch (error) {
        console.warn('Failed to append analysis log to document:', error);
      }

      return suggestions;
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw new Error('Failed to analyze document. Please try again.');
    }
  }

  /**
   * Build the analysis prompt for the AI
   * @param {string} documentText - Document content
   * @returns {string} - Formatted prompt
   */
  buildAnalysisPrompt(documentText) {
    return `
You are an expert document editor. Analyze the following document and provide specific editing suggestions to improve clarity, readability, and effectiveness.

DOCUMENT:
${documentText}

Please provide your response as a JSON array of editing actions. Each action should have this structure:
{
  "action": "modify|insert|delete",
  "index": (paragraph index for modify/delete, starting from 0),
  "after_index": (paragraph index to insert after, for insert actions),
  "instruction": "specific instruction for what to change",
  "reason": "explanation of why this change improves the document"
}

Focus on:
1. Breaking down overly long sentences
2. Improving clarity and readability
3. Strengthening transitions between ideas
4. Removing redundancy
5. Enhancing overall flow

Limit your response to the 5 most impactful suggestions. Return only the JSON array, no other text.
`;
  }

  /**
   * Call the Gemini API
   * @param {string} prompt - The prompt to send
   * @returns {Promise<string>} - AI response
   */
  async callGeminiAPI(prompt) {
    // For demo purposes, return mock data
    // In production, this would make actual API calls through a secure backend
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock structured response
    return `[
      {
        "action": "modify",
        "index": 0,
        "instruction": "Break this opening paragraph into two shorter sentences for better readability and impact.",
        "reason": "Long opening sentences can lose reader attention immediately"
      },
      {
        "action": "insert",
        "after_index": 1,
        "instruction": "Add a transitional sentence that connects the introduction to the main points.",
        "reason": "Improves document flow and helps readers follow the logical progression"
      },
      {
        "action": "modify",
        "index": 2,
        "instruction": "Replace passive voice with active voice to make the writing more direct and engaging.",
        "reason": "Active voice is more engaging and easier to understand"
      },
      {
        "action": "modify",
        "index": 3,
        "instruction": "Simplify complex sentence structure and remove unnecessary jargon.",
        "reason": "Simpler language increases accessibility and comprehension"
      }
    ]`;
  }

  /**
   * Parse AI response into structured suggestions
   * @param {string} response - Raw AI response
   * @returns {Array} - Parsed suggestions
   */
  parseAISuggestions(response) {
    try {
      // Clean up the response (remove any markdown or extra text)
      const cleanResponse = response.trim().replace(/```json|```/g, '');
      
      // Parse JSON
      const suggestions = JSON.parse(cleanResponse);
      
      // Validate and filter suggestions
      return this.validateSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      
      // Return fallback suggestions if parsing fails
      return this.getFallbackSuggestions();
    }
  }

  /**
   * Validate suggestions structure
   * @param {Array} suggestions - Raw suggestions from AI
   * @returns {Array} - Validated suggestions
   */
  validateSuggestions(suggestions) {
    if (!Array.isArray(suggestions)) {
      return this.getFallbackSuggestions();
    }

    return suggestions.filter(suggestion => {
      return suggestion.action && 
             suggestion.instruction && 
             (suggestion.index !== undefined || suggestion.after_index !== undefined);
    }).slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Get fallback suggestions if AI parsing fails
   * @returns {Array} - Default suggestions
   */
  getFallbackSuggestions() {
    return [
      {
        action: "modify",
        index: 0,
        instruction: "Review the opening paragraph for clarity and impact.",
        reason: "Strong openings engage readers more effectively"
      },
      {
        action: "insert",
        after_index: 0,
        instruction: "Consider adding a topic sentence to introduce the main theme.",
        reason: "Clear topic sentences help readers understand document structure"
      }
    ];
  }

  /**
   * Test the AI service connection
   * @returns {Promise<boolean>} - True if service is available
   */
  async testConnection() {
    try {
      const testPrompt = "Respond with only 'OK' if you can understand this message.";
      const response = await this.callGeminiAPI(testPrompt);
      return response.toLowerCase().includes('ok');
    } catch (error) {
      console.error('AI service connection test failed:', error);
      return false;
    }
  }
}

/**
 * Main AI Document Review Service
 * Coordinates between AI analysis and document manipulation
 */
class AIDocumentReviewService {
  constructor() {
    this.aiService = new AIService();
    this.documentService = new DocumentService();
  }

  /**
   * Analyze the current document and return suggestions
   * @returns {Promise<Array>} - Array of suggestions
   */
  async analyzeDocument() {
    // Extract document content
    const documentText = await this.documentService.extractDocumentText();
    
    // Validate document
    const wordCount = await this.documentService.getWordCount();
    if (wordCount <= 0 || wordCount > 10000) {
      throw new Error(`Document size not suitable for processing (${wordCount} words). Please use documents between 1 and 10,000 words.`);
    }

    // Get AI analysis
    const suggestions = await this.aiService.analyzeDocument(documentText);
    
    // Validate against current document structure (simplified)
    return suggestions.slice(0, 5); // Limit to 5 suggestions for safety
  }

  /**
   * Get the latest log content from the file logger
   * @returns {string} - The latest log content
   */
  getLatestLog() {
    return this.aiService.fileLogger.getSessionContent();
  }

  /**
   * Apply multiple suggestions to the document
   * @param {Array} suggestions - Suggestions to apply
   * @returns {Promise<number>} - Number of successfully applied suggestions
   */
  async applySuggestions(suggestions) {
    let appliedCount = 0;
    
    console.log(`\n🚀 APPLYING ${suggestions.length} SUGGESTIONS TO DOCUMENT:`);
    console.log('=' .repeat(60));
    
    // Apply each suggestion to the actual document
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      try {
        console.log(`🔧 Applying suggestion ${i + 1}/${suggestions.length}: ${suggestion.instruction}`);
        
        // Use the document service to apply the suggestion
        const success = await this.documentService.applySuggestion(suggestion);
        
        if (success) {
          console.log(`✅ Applied suggestion ${i + 1}/${suggestions.length}: ${suggestion.instruction}`);
          appliedCount++;
        } else {
          console.log(`❌ Failed to apply suggestion ${i + 1}/${suggestions.length}: ${suggestion.instruction}`);
        }
      } catch (error) {
        console.error('❌ Failed to apply suggestion:', suggestion, error);
      }
    }
    
    // Record application results in both loggers
    if (this.aiService.logger) {
      this.aiService.logger.markApplied(appliedCount);
      this.aiService.fileLogger.markApplied(appliedCount);
      
      // Save the session to markdown file
      try {
        await this.aiService.logger.saveSession();
        console.log(`📄 Analysis session saved to browser storage`);
      } catch (error) {
        console.warn('Failed to save browser analysis session:', error);
      }
    }
    
    console.log(`\n🎯 APPLICATION COMPLETE: ${appliedCount}/${suggestions.length} suggestions applied`);
    console.log('=' .repeat(60));
    
    return appliedCount;
  }

  /**
   * Get document information
   * @returns {Promise<Object>} - Document info
   */
  async getDocumentInfo() {
    const wordCount = await this.documentService.getWordCount();
    
    return {
      wordCount,
      paragraphCount: 0, // Simplified for now
      isValid: wordCount > 0 && wordCount <= 10000
    };
  }

  /**
   * Get all saved analysis sessions
   * @returns {Array} - Array of session metadata
   */
  getSavedSessions() {
    return AnalysisLogger.getSavedSessions();
  }

  /**
   * Load a specific analysis session
   * @param {string} sessionId - Session ID
   * @returns {string|null} - Markdown content or null
   */
  loadSession(sessionId) {
    return AnalysisLogger.loadSession(sessionId);
  }

  /**
   * Display saved sessions in console
   */
  showSavedSessions() {
    const sessions = this.getSavedSessions();
    
    console.log('\n📚 SAVED ANALYSIS SESSIONS:');
    console.log('=' .repeat(60));
    
    if (sessions.length === 0) {
      console.log('No saved sessions found.');
    } else {
      sessions.forEach((session, index) => {
        const date = new Date(session.timestamp).toLocaleString();
        console.log(`${index + 1}. Session: ${session.sessionId}`);
        console.log(`   Date: ${date}`);
        console.log(`   Document: ${session.wordCount} words, ${session.suggestionCount} suggestions`);
        console.log('   -'.repeat(30));
      });
      
      console.log(`\nTotal: ${sessions.length} sessions saved`);
      console.log('Use loadSession(sessionId) to view details');
    }
    console.log('=' .repeat(60));
  }
}

// Create global instance
window.aiDocumentReviewService = new AIDocumentReviewService();

// Export for use in other modules
export { AIDocumentReviewService, AIService, DocumentService };
