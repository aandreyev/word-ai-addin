/*
 * AI Service Integration for Word Add-in
 * This module handles communication with the AI services in the browser environment
 */

/**
 * AI Service class that handles document analysis using Gemini API
 */
class AIService {
  constructor() {
    this.apiKey = this.getApiKey();
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.modelName = 'gemini-1.5-flash';
  }

  /**
   * Get API key from environment variables
   * In production, this would be securely provided by the backend
   */
  getApiKey() {
    // For now, we'll use a placeholder that would be replaced by the backend
    return 'GEMINI_API_KEY_PLACEHOLDER';
  }

  /**
   * Analyze document text and return editing suggestions
   * @param {string} documentText - The full document text
   * @returns {Promise<Array>} - Array of editing suggestions
   */
  async analyzeDocument(documentText) {
    try {
      // Prepare the analysis prompt
      const prompt = this.buildAnalysisPrompt(documentText);
      
      // Call Gemini API
      const response = await this.callGeminiAPI(prompt);
      
      // Parse the response into structured suggestions
      const suggestions = this.parseAISuggestions(response);
      
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
 * Document Service for Word API interactions
 */
class DocumentService {
  /**
   * Extract all text from the document
   * @returns {Promise<string>} - Document text
   */
  async extractText() {
    return Word.run(async (context) => {
      const body = context.document.body;
      body.load("text");
      await context.sync();
      return body.text;
    });
  }

  /**
   * Get paragraph count
   * @returns {Promise<number>} - Number of paragraphs
   */
  async getParagraphCount() {
    return Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();
      return paragraphs.items.length;
    });
  }

  /**
   * Get word count
   * @returns {Promise<number>} - Number of words
   */
  async getWordCount() {
    const text = await this.extractText();
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Validate document size for processing
   * @param {number} wordCount - Number of words
   * @returns {boolean} - True if document is suitable for processing
   */
  validateDocumentSize(wordCount) {
    return wordCount > 0 && wordCount <= 10000;
  }

  /**
   * Apply a single suggestion to the document
   * @param {Object} suggestion - The suggestion to apply
   * @returns {Promise<void>}
   */
  async applySuggestion(suggestion) {
    return Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();

      if (suggestion.action === "modify" && suggestion.index < paragraphs.items.length) {
        const paragraph = paragraphs.items[suggestion.index];
        paragraph.insertComment(`AI Suggestion: ${suggestion.instruction}`, Word.CommentScope.range);
      } else if (suggestion.action === "insert" && suggestion.after_index < paragraphs.items.length) {
        const insertAfter = paragraphs.items[suggestion.after_index];
        const newParagraph = insertAfter.insertParagraph(
          `[AI Suggestion: ${suggestion.instruction}]`, 
          Word.InsertLocation.after
        );
        newParagraph.font.color = "#0078d4";
        newParagraph.font.italic = true;
      } else if (suggestion.action === "delete" && suggestion.index < paragraphs.items.length) {
        const paragraph = paragraphs.items[suggestion.index];
        paragraph.insertComment(`AI Suggestion: Consider removing this paragraph. ${suggestion.reason}`, Word.CommentScope.range);
      }

      await context.sync();
    });
  }

  /**
   * Create a backup of the current document state
   * @returns {Promise<Object>} - Document snapshot
   */
  async createSnapshot() {
    return Word.run(async (context) => {
      const body = context.document.body;
      const paragraphs = context.document.body.paragraphs;
      
      body.load("text");
      paragraphs.load("items");
      
      await context.sync();
      
      return {
        text: body.text,
        paragraphCount: paragraphs.items.length,
        timestamp: new Date().toISOString()
      };
    });
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
    const documentText = await this.documentService.extractText();
    
    // Validate document
    const wordCount = await this.documentService.getWordCount();
    if (!this.documentService.validateDocumentSize(wordCount)) {
      throw new Error(`Document size not suitable for processing (${wordCount} words). Please use documents between 1 and 10,000 words.`);
    }

    // Get AI analysis
    const suggestions = await this.aiService.analyzeDocument(documentText);
    
    // Validate against current document structure
    const paragraphCount = await this.documentService.getParagraphCount();
    return this.validateSuggestionsAgainstDocument(suggestions, paragraphCount);
  }

  /**
   * Apply multiple suggestions to the document
   * @param {Array} suggestions - Suggestions to apply
   * @returns {Promise<number>} - Number of successfully applied suggestions
   */
  async applySuggestions(suggestions) {
    let appliedCount = 0;
    
    for (const suggestion of suggestions) {
      try {
        await this.documentService.applySuggestion(suggestion);
        appliedCount++;
      } catch (error) {
        console.error('Failed to apply suggestion:', suggestion, error);
      }
    }
    
    return appliedCount;
  }

  /**
   * Validate suggestions against current document structure
   * @param {Array} suggestions - Suggestions to validate
   * @param {number} paragraphCount - Current paragraph count
   * @returns {Array} - Valid suggestions
   */
  validateSuggestionsAgainstDocument(suggestions, paragraphCount) {
    return suggestions.filter(suggestion => {
      // Validate modify and delete actions
      if ((suggestion.action === "modify" || suggestion.action === "delete") &&
          (suggestion.index < 0 || suggestion.index >= paragraphCount)) {
        return false;
      }
      
      // Validate insert actions
      if (suggestion.action === "insert" &&
          (suggestion.after_index < 0 || suggestion.after_index >= paragraphCount)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get document information
   * @returns {Promise<Object>} - Document info
   */
  async getDocumentInfo() {
    const wordCount = await this.documentService.getWordCount();
    const paragraphCount = await this.documentService.getParagraphCount();
    
    return {
      wordCount,
      paragraphCount,
      isValid: this.documentService.validateDocumentSize(wordCount)
    };
  }
}

// Create global instance
window.aiDocumentReviewService = new AIDocumentReviewService();

// Export for use in other modules
export { AIDocumentReviewService, AIService, DocumentService };
