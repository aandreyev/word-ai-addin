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
   * Get API key from environment variables or localStorage
   * In production, this would be securely provided by the backend
   */
  getApiKey() {
    // First check for API key in localStorage
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    if (storedKey && storedKey !== 'GEMINI_API_KEY_PLACEHOLDER') {
      console.log('🔑 Using Gemini API key from localStorage');
      return storedKey;
    }
    
    // Check for environment variable (if available in browser context)
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      console.log('🔑 Using Gemini API key from environment variable');
      return process.env.GEMINI_API_KEY;
    }
    
    // Check for global variable (can be set via Doppler or other means)
    if (typeof window !== 'undefined' && window.GEMINI_API_KEY) {
      console.log('🔑 Using Gemini API key from window variable');
      return window.GEMINI_API_KEY;
    }
    
    // No real API key found
    console.warn('⚠️ No Gemini API key found - will use mock responses');
    return 'GEMINI_API_KEY_PLACEHOLDER';
  }

  /**
   * Set the Gemini API key for this session
   * @param {string} apiKey - The Gemini API key
   */
  setApiKey(apiKey) {
    if (apiKey && apiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      this.apiKey = apiKey.trim();
      console.log('✅ Gemini API key updated');
    } else {
      console.error('❌ Invalid API key provided');
    }
  }

  /**
   * Check if a valid API key is available
   * @returns {boolean} - True if real API key is available
   */
  hasValidApiKey() {
    const key = this.getApiKey();
    return key && key !== 'GEMINI_API_KEY_PLACEHOLDER';
  }

  /**
   * Analyze document using paragraph mapping and return editing suggestions
   * @param {Array} paragraphMapping - Mapping of non-empty paragraphs with sequential numbers
   * @returns {Promise<Array>} - Array of editing suggestions
   */
  async analyzeDocumentFromMapping(paragraphMapping) {
    try {
      // 🔍 DEBUG: Start logging session (both loggers)
      const documentText = paragraphMapping.map(m => m.content).join('\n\n');
      const sessionId = this.logger.startSession(documentText);
      const fileSessionId = this.fileLogger.startSession(documentText);
      console.log(`📝 Started analysis session: ${sessionId}`);
      console.log(`📁 Started file logging session: ${fileSessionId}`);
      
      // Record the paragraph mapping in the logger
      console.log(`🎯 Analyzing ${paragraphMapping.length} non-empty paragraphs:`);
      paragraphMapping.forEach(mapping => {
        console.log(`   Sequential ${mapping.sequentialNumber}: [Word Index ${mapping.wordIndex}] "${mapping.content.substring(0, 50)}..."`);
      });
      
      // Prepare the analysis prompt using mapping
      const prompt = this.buildAnalysisPromptFromMapping(paragraphMapping);
      
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
      
      // Parse the response into structured suggestions with mapping validation
      const suggestions = this.parseAISuggestionsWithMapping(response, paragraphMapping);
      
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
          console.log(`   📍 Insert After Sequential: ${suggestion.afterSequentialNumber}`);
        } else {
          console.log(`   📍 Target Sequential: ${suggestion.sequentialNumber}`);
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

      // NOTE: Log data will be appended AFTER suggestions are applied to avoid corrupting paragraph mapping

      return suggestions;
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw new Error('Failed to analyze document. Please try again.');
    }
  }

  /**
   * Build the analysis prompt for the AI using paragraph mapping
   * @param {Array} paragraphMapping - Mapping of non-empty paragraphs with sequential numbers
   * @returns {string} - Formatted prompt
   */
  buildAnalysisPromptFromMapping(paragraphMapping) {
    // Build paragraph reference using only sequential numbers and content
    let paragraphReference = '';
    paragraphMapping.forEach((mapping) => {
      paragraphReference += `Paragraph ${mapping.sequentialNumber}: "${mapping.content}"\n`;
    });

    return `
You are an expert document editor. Analyze the following document and provide specific editing suggestions to improve clarity, readability, and effectiveness.

DOCUMENT PARAGRAPHS (only non-empty paragraphs shown):
${paragraphReference}

Please provide your response as a JSON array of editing actions. Each action should have this structure:
{
  "action": "modify|insert|delete",
  "sequentialNumber": (paragraph sequential number for modify/delete, starting from 1),
  "afterSequentialNumber": (paragraph sequential number to insert after, for insert actions),
  "instruction": "brief description of what to change",
  "newContent": "the exact new text to replace the paragraph with (for modify actions) or insert (for insert actions)",
  "reason": "explanation of why this change improves the document"
}

IMPORTANT NOTES:
- Use "sequentialNumber" (not "index") to reference paragraphs for modify/delete actions
- Use "afterSequentialNumber" (not "after_index") to specify insertion points
- For "modify" actions: Provide the complete replacement text for the entire paragraph in "newContent"
- For "insert" actions: Provide the complete new paragraph to insert in "newContent"
- For "delete" actions: No newContent needed
- Sequential numbers start from 1 and only reference non-empty paragraphs

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
    const apiKey = this.getApiKey();
    
    // Check if we have a real API key
    if (!apiKey || apiKey === 'GEMINI_API_KEY_PLACEHOLDER') {
      console.warn('⚠️ No Gemini API key found. Using fallback mock response.');
      console.log('💡 To use real Gemini API, store your API key in localStorage:');
      console.log('   localStorage.setItem("GEMINI_API_KEY", "your-actual-api-key")');
      
      // Return mock data as fallback
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.getMockResponse();
    }

    try {
      console.log('🌐 Making real Gemini API call...');
      
      const url = `${this.baseUrl}/${this.modelName}:generateContent?key=${apiKey}`;
      
      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Gemini API error:', response.status, errorData);
        throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      // Extract the text from Gemini's response format
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        const aiResponse = data.candidates[0].content.parts[0].text;
        console.log('✅ Received real Gemini API response');
        return aiResponse;
      } else {
        console.error('❌ Unexpected Gemini API response format:', data);
        throw new Error('Unexpected response format from Gemini API');
      }

    } catch (error) {
      console.error('❌ Gemini API call failed:', error);
      
      // Fallback to mock response if API call fails
      console.warn('⚠️ Falling back to mock response due to API error');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.getMockResponse();
    }
  }

  /**
   * Get mock response for testing/fallback using new format
   * @returns {string} - Mock JSON response
   */
  getMockResponse() {
    // Test Move Operations with Mixed Actions - comprehensive test of all functionality
    return `[
      {
        "action": "move",
        "sequentialNumber": 3,
        "toAfterSequentialNumber": 5,
        "instruction": "Move the third paragraph to after the fifth paragraph for better logical flow.",
        "reason": "The third paragraph's content relates more closely to the content after paragraph 5"
      },
      {
        "action": "move", 
        "sequentialNumber": 1,
        "toAfterSequentialNumber": 2,
        "instruction": "Move the opening paragraph to after the second paragraph.",
        "reason": "The introduction works better after establishing context in paragraph 2"
      },
      {
        "action": "modify",
        "sequentialNumber": 4,
        "instruction": "Update this paragraph to reflect the new document structure after moves.",
        "newContent": "This fourth paragraph has been modified to acknowledge the restructured document flow after moving paragraphs to their optimal positions.",
        "reason": "Ensures content remains coherent after structural changes"
      },
      {
        "action": "delete",
        "sequentialNumber": 6,
        "instruction": "Remove this paragraph as it's no longer needed after restructuring.",
        "reason": "This content becomes redundant after the document restructuring"
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
      const hasValidAction = suggestion.action && 
                            ['modify', 'insert', 'delete', 'move'].includes(suggestion.action);
      const hasValidInstruction = suggestion.instruction;
      const hasValidIndex = suggestion.index !== undefined || suggestion.after_index !== undefined;
      
      // For modify actions, check if replacement_text is provided
      if (suggestion.action === 'modify' && !suggestion.replacement_text) {
        console.warn('Modify suggestion missing replacement_text:', suggestion);
      }
      
      // For insert actions, check if new_content is provided
      if (suggestion.action === 'insert' && !suggestion.new_content) {
        console.warn('Insert suggestion missing new_content:', suggestion);
      }
      
      return hasValidAction && hasValidInstruction && hasValidIndex;
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
        replacement_text: "This document could benefit from AI-powered editing suggestions for improved clarity and readability.",
        reason: "Strong openings engage readers more effectively"
      },
      {
        action: "insert",
        after_index: 0,
        instruction: "Consider adding a topic sentence to introduce the main theme.",
        new_content: "Let's explore how artificial intelligence can enhance your writing through intelligent suggestions.",
        reason: "Clear topic sentences help readers understand document structure"
      }
    ];
  }

  /**
   * Parse AI response into structured suggestions with mapping validation
   * @param {string} response - Raw AI response
   * @param {Array} paragraphMapping - Paragraph mapping for validation
   * @returns {Array} - Parsed and validated suggestions
   */
  parseAISuggestionsWithMapping(response, paragraphMapping) {
    try {
      // Clean up the response (remove any markdown or extra text)
      const cleanResponse = response.trim().replace(/```json|```/g, '');
      
      // Parse JSON
      const suggestions = JSON.parse(cleanResponse);
      
      // Validate and filter suggestions with mapping
      return this.validateSuggestionsWithMapping(suggestions, paragraphMapping);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      
      // Return fallback suggestions if parsing fails
      return this.getFallbackSuggestionsWithMapping(paragraphMapping);
    }
  }

  /**
   * Validate suggestions structure with mapping
   * @param {Array} suggestions - Raw suggestions from AI
   * @param {Array} paragraphMapping - Paragraph mapping for validation
   * @returns {Array} - Validated suggestions
   */
  validateSuggestionsWithMapping(suggestions, paragraphMapping) {
    if (!Array.isArray(suggestions)) {
      return this.getFallbackSuggestionsWithMapping(paragraphMapping);
    }

    const maxSequentialNumber = Math.max(...paragraphMapping.map(m => m.sequentialNumber));
    console.log(`🔍 Validating suggestions against mapping (max sequential: ${maxSequentialNumber})`);

    return suggestions.filter(suggestion => {
      const hasValidAction = suggestion.action && 
                            ['modify', 'insert', 'delete', 'move'].includes(suggestion.action);
      const hasValidInstruction = suggestion.instruction;
      
      let hasValidReference = false;
      let sequentialNumber = null;
      
      // Validate sequential number references
      if (suggestion.action === 'insert') {
        sequentialNumber = suggestion.afterSequentialNumber;
        hasValidReference = sequentialNumber !== undefined && 
                           sequentialNumber >= 1 && 
                           sequentialNumber <= maxSequentialNumber;
        if (!hasValidReference) {
          console.warn(`❌ Invalid afterSequentialNumber ${sequentialNumber} for insert action (max: ${maxSequentialNumber})`);
        }
      } else if (suggestion.action === 'move') {
        // Move actions need both source and target references
        const sourceSequentialNumber = suggestion.sequentialNumber;
        const toAfterSequentialNumber = suggestion.toAfterSequentialNumber;
        
        const hasValidSource = sourceSequentialNumber !== undefined && 
                              sourceSequentialNumber >= 1 && 
                              sourceSequentialNumber <= maxSequentialNumber;
        const hasValidTarget = toAfterSequentialNumber !== undefined && 
                              toAfterSequentialNumber >= 1 && 
                              toAfterSequentialNumber <= maxSequentialNumber;
        
        hasValidReference = hasValidSource && hasValidTarget;
        if (!hasValidSource) {
          console.warn(`❌ Invalid sequentialNumber ${sourceSequentialNumber} for move action (max: ${maxSequentialNumber})`);
        }
        if (!hasValidTarget) {
          console.warn(`❌ Invalid toAfterSequentialNumber ${toAfterSequentialNumber} for move action (max: ${maxSequentialNumber})`);
        }
        sequentialNumber = sourceSequentialNumber; // For logging purposes
      } else {
        sequentialNumber = suggestion.sequentialNumber;
        hasValidReference = sequentialNumber !== undefined && 
                           sequentialNumber >= 1 && 
                           sequentialNumber <= maxSequentialNumber;
        if (!hasValidReference) {
          console.warn(`❌ Invalid sequentialNumber ${sequentialNumber} for ${suggestion.action} action (max: ${maxSequentialNumber})`);
        }
      }
      
      // For modify/insert actions, check if newContent is provided
      if ((suggestion.action === 'modify' || suggestion.action === 'insert') && !suggestion.newContent) {
        console.warn(`❌ ${suggestion.action} suggestion missing newContent:`, suggestion);
        return false;
      }
      
      const isValid = hasValidAction && hasValidInstruction && hasValidReference;
      if (isValid) {
        console.log(`✅ Valid ${suggestion.action} suggestion for sequential ${sequentialNumber}`);
      }
      
      return isValid;
    }).slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Get fallback suggestions using mapping if AI parsing fails
   * @param {Array} paragraphMapping - Paragraph mapping
   * @returns {Array} - Default suggestions
   */
  getFallbackSuggestionsWithMapping(paragraphMapping) {
    if (paragraphMapping.length === 0) {
      return [];
    }
    
    const firstSequential = paragraphMapping[0].sequentialNumber;
    
    return [
      {
        action: "modify",
        sequentialNumber: firstSequential,
        instruction: "Review the opening paragraph for clarity and impact.",
        newContent: "This document could benefit from AI-powered editing suggestions for improved clarity and readability.",
        reason: "Strong openings engage readers more effectively"
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
   * Analyze the current document and return suggestions using the new mapping approach
   * @returns {Promise<{suggestions: Array, paragraphMapping: Array}>} - Array of suggestions and the paragraph mapping
   */
  async analyzeDocument() {
    // Create paragraph snapshot and mapping
    const snapshotResult = await this.documentService.createParagraphSnapshot();
    const paragraphMapping = snapshotResult.paragraphMapping;
    
    // Validate document
    const totalParagraphs = snapshotResult.paragraphs.length;
    const nonEmptyParagraphs = paragraphMapping.length;
    
    if (nonEmptyParagraphs === 0) {
      throw new Error('Document has no content to analyze. Please add some text to the document.');
    }
    
    if (nonEmptyParagraphs > 100) { // Reasonable limit for PoC
      throw new Error(`Document has too many paragraphs (${nonEmptyParagraphs}). Please use documents with fewer than 100 paragraphs.`);
    }

    console.log(`📊 Document analysis: ${totalParagraphs} total paragraphs, ${nonEmptyParagraphs} non-empty paragraphs`);

    // Get AI analysis using the mapping
    const suggestions = await this.aiService.analyzeDocumentFromMapping(paragraphMapping);
    
    // Return both suggestions and mapping for later use
    return {
      suggestions: suggestions.slice(0, 5), // Limit to 5 suggestions for safety
      paragraphMapping: paragraphMapping
    };
  }

  /**
   * Get the latest log content from the file logger
   * @returns {string} - The latest log content
   */
  getLatestLog() {
    return this.aiService.fileLogger.getSessionContent();
  }

  /**
   * Apply multiple suggestions to the document using the two-phase approach with mapping
   * Phase 1: Create immutable paragraph snapshot (already done during analysis)
   * Phase 2: Execute in prescribed order using mapping to resolve sequential numbers
   * @param {Array} suggestions - Suggestions to apply
   * @param {Array} paragraphMapping - The paragraph mapping from analysis
   * @returns {Promise<number>} - Number of successfully applied suggestions
   */
  async applySuggestions(suggestions, paragraphMapping) {
    let appliedCount = 0;
    
    console.log(`\n🚀 STARTING MAPPING-BASED APPLICATION OF ${suggestions.length} SUGGESTIONS:`);
    console.log('=' .repeat(60));
    
    try {
      // Apply all modifications in a SINGLE Word.run context using fresh paragraph references
      const modifyActions = suggestions.filter(s => s.action === 'modify');
      
      if (modifyActions.length > 0) {
        console.log('\n🔧 Applying ALL MODIFY actions in SINGLE Word.run context...');
        
        await Word.run(async (context) => {
          // Get FRESH paragraph references within this context
          const paragraphs = context.document.body.paragraphs;
          paragraphs.load('text');
          await context.sync();
          
          console.log(`� Fresh context has ${paragraphs.items.length} paragraphs available`);
          
          for (const suggestion of modifyActions) {
            try {
              console.log(`   Modifying sequential ${suggestion.sequentialNumber}: "${suggestion.instruction}"`);
              
              // Resolve sequential number to Word index using mapping
              const wordIndex = this.documentService.resolveSequentialToWordIndex(suggestion.sequentialNumber, paragraphMapping);
              if (wordIndex === null) {
                console.error(`   ❌ Could not resolve sequential ${suggestion.sequentialNumber} to Word index`);
                continue;
              }
              
              // Use fresh paragraph reference from current context
              if (wordIndex >= 0 && wordIndex < paragraphs.items.length) {
                const paragraph = paragraphs.items[wordIndex];
                
                console.log(`🔍 Using fresh paragraph reference ${wordIndex} in current context...`);
                console.log(`📋 Current text: "${paragraph.text.substring(0, 50)}..."`);
                
                if (suggestion.newContent) {
                  console.log(`🔄 Replacing paragraph ${wordIndex} content...`);
                  
                  // Use a more reliable approach for replacing paragraph content
                  // Get the paragraph's range and replace its content
                  const range = paragraph.getRange();
                  range.insertText(suggestion.newContent, Word.InsertLocation.replace);
                  
                  console.log(`✅ Modified paragraph ${wordIndex} with new content`);
                  appliedCount++;
                } else {
                  console.warn(`⚠️ No newContent provided for sequential ${suggestion.sequentialNumber}`);
                }
              } else {
                console.error(`❌ Invalid word index: ${wordIndex} (must be 0 to ${paragraphs.items.length - 1})`);
              }
            } catch (error) {
              console.error(`   ❌ Failed to modify sequential ${suggestion.sequentialNumber}:`, error);
            }
          }
          
          // Single sync to commit all changes
          await context.sync();
          console.log(`✅ Applied ${appliedCount} modifications and synced to document`);
          
          // Validate changes were applied
          paragraphs.load('text');
          await context.sync();
          console.log('🔍 Final validation of changes:');
          for (let i = 0; i < Math.min(paragraphs.items.length, 5); i++) {
            console.log(`   Paragraph ${i}: "${paragraphs.items[i].text.substring(0, 50)}..."`);
          }
        });
      }
      
      // Handle other action types (insert, delete, move) if any
      const insertActions = suggestions.filter(s => s.action === 'insert');
      const deleteActions = suggestions.filter(s => s.action === 'delete');
      const moveActions = suggestions.filter(s => s.action === 'move');
      
      // Apply INSERT operations in a separate Word.run context
      if (insertActions.length > 0) {
        console.log(`\n📝 Applying ${insertActions.length} INSERT actions in SINGLE Word.run context...`);
        
        await Word.run(async (context) => {
          // Get FRESH paragraph references within this context
          const paragraphs = context.document.body.paragraphs;
          paragraphs.load('text');
          await context.sync();
          
          console.log(`📚 Fresh context has ${paragraphs.items.length} paragraphs available for insertion`);
          
          for (const suggestion of insertActions) {
            try {
              console.log(`   Inserting after sequential ${suggestion.afterSequentialNumber}: "${suggestion.instruction}"`);
              
              // Resolve afterSequentialNumber to Word index using mapping
              const afterWordIndex = this.documentService.resolveSequentialToWordIndex(suggestion.afterSequentialNumber, paragraphMapping);
              if (afterWordIndex === null) {
                console.error(`   ❌ Could not resolve afterSequentialNumber ${suggestion.afterSequentialNumber} to Word index`);
                continue;
              }
              
              // Use fresh paragraph reference from current context
              if (afterWordIndex >= 0 && afterWordIndex < paragraphs.items.length) {
                const afterParagraph = paragraphs.items[afterWordIndex];
                
                console.log(`🔍 Inserting new paragraph after Word index ${afterWordIndex}...`);
                console.log(`📋 After paragraph text: "${afterParagraph.text.substring(0, 50)}..."`);
                
                if (suggestion.newContent) {
                  console.log(`📝 Creating new paragraph with content...`);
                  
                  // Insert new paragraph AFTER the specified paragraph
                  // This creates a completely new paragraph, not appending to existing one
                  afterParagraph.insertParagraph(suggestion.newContent, Word.InsertLocation.after);
                  
                  console.log(`✅ Inserted new paragraph after Word index ${afterWordIndex}`);
                  appliedCount++;
                } else {
                  console.warn(`⚠️ No newContent provided for insert after sequential ${suggestion.afterSequentialNumber}`);
                }
              } else {
                console.error(`❌ Invalid after word index: ${afterWordIndex} (must be 0 to ${paragraphs.items.length - 1})`);
              }
            } catch (error) {
              console.error(`   ❌ Failed to insert after sequential ${suggestion.afterSequentialNumber}:`, error);
            }
          }
          
          // Single sync to commit all insert changes
          await context.sync();
          console.log(`✅ Applied ${insertActions.length} insertions and synced to document`);
          
          // Validate insertions were applied
          const updatedParagraphs = context.document.body.paragraphs;
          updatedParagraphs.load('text');
          await context.sync();
          console.log('🔍 Final validation after insertions:');
          console.log(`   Total paragraphs now: ${updatedParagraphs.items.length}`);
          for (let i = 0; i < Math.min(updatedParagraphs.items.length, 8); i++) {
            console.log(`   Paragraph ${i}: "${updatedParagraphs.items[i].text.substring(0, 50)}..."`);
          }
        });
      }
      
      // Apply MOVE operations (copy/insert phase) in a separate Word.run context
      if (moveActions.length > 0) {
        console.log(`\n🔄 Applying ${moveActions.length} MOVE actions (copy/insert phase) in SINGLE Word.run context...`);
        
        await Word.run(async (context) => {
          // Get FRESH paragraph references within this context
          const paragraphs = context.document.body.paragraphs;
          paragraphs.load('text');
          await context.sync();
          
          console.log(`📚 Fresh context has ${paragraphs.items.length} paragraphs available for moves`);
          
          for (const suggestion of moveActions) {
            try {
              console.log(`   Moving sequential ${suggestion.sequentialNumber} after sequential ${suggestion.toAfterSequentialNumber}: "${suggestion.instruction}"`);
              
              // Resolve source sequential number to Word index to get content
              const sourceWordIndex = this.documentService.resolveSequentialToWordIndex(suggestion.sequentialNumber, paragraphMapping);
              if (sourceWordIndex === null) {
                console.error(`   ❌ Could not resolve source sequential ${suggestion.sequentialNumber} to Word index`);
                continue;
              }
              
              // Resolve target sequential number to Word index for insertion point
              const afterWordIndex = this.documentService.resolveSequentialToWordIndex(suggestion.toAfterSequentialNumber, paragraphMapping);
              if (afterWordIndex === null) {
                console.error(`   ❌ Could not resolve toAfterSequentialNumber ${suggestion.toAfterSequentialNumber} to Word index`);
                continue;
              }
              
              // Get source and target paragraphs
              if (sourceWordIndex >= 0 && sourceWordIndex < paragraphs.items.length &&
                  afterWordIndex >= 0 && afterWordIndex < paragraphs.items.length) {
                
                const sourceParagraph = paragraphs.items[sourceWordIndex];
                const afterParagraph = paragraphs.items[afterWordIndex];
                
                console.log(`🔍 Moving from Word index ${sourceWordIndex} to after Word index ${afterWordIndex}...`);
                console.log(`📋 Source text: "${sourceParagraph.text.substring(0, 50)}..."`);
                console.log(`📋 Insert after: "${afterParagraph.text.substring(0, 50)}..."`);
                
                // Copy source content and insert after target
                const sourceContent = sourceParagraph.text;
                afterParagraph.insertParagraph(sourceContent, Word.InsertLocation.after);
                
                console.log(`✅ Copied paragraph content from Word index ${sourceWordIndex} to after Word index ${afterWordIndex}`);
                appliedCount++;
              } else {
                console.error(`❌ Invalid word indices: source ${sourceWordIndex}, after ${afterWordIndex}`);
              }
            } catch (error) {
              console.error(`   ❌ Failed to move sequential ${suggestion.sequentialNumber}:`, error);
            }
          }
          
          // Single sync to commit all move copy/inserts
          await context.sync();
          console.log(`✅ Applied ${moveActions.length} move copy/inserts and synced to document`);
          
          // Validate moves were applied
          const updatedParagraphs = context.document.body.paragraphs;
          updatedParagraphs.load('text');
          await context.sync();
          console.log('🔍 Final validation after moves:');
          console.log(`   Total paragraphs now: ${updatedParagraphs.items.length}`);
          for (let i = 0; i < Math.min(updatedParagraphs.items.length, 8); i++) {
            console.log(`   Paragraph ${i}: "${updatedParagraphs.items[i].text.substring(0, 50)}..."`);
          }
        });
      }
      
      // Apply ALL DELETE operations (move sources + regular deletes) in a separate Word.run context
      const moveSourceDeletes = moveActions.map(move => ({
        action: 'delete',
        sequentialNumber: move.sequentialNumber,
        instruction: `Delete original source of moved paragraph ${move.sequentialNumber}`,
        reason: 'Remove source paragraph after move operation'
      }));
      const allDeleteActions = [...deleteActions, ...moveSourceDeletes];
      
      if (allDeleteActions.length > 0) {
        console.log(`\n🗑️ Applying ${allDeleteActions.length} DELETE actions (${deleteActions.length} regular + ${moveSourceDeletes.length} move sources) in SINGLE Word.run context...`);
        
        // Sort ALL deletes in reverse order using Word IDs to avoid index shifting issues
        allDeleteActions.sort((a, b) => {
          const aIndex = this.documentService.resolveSequentialToWordIndex(a.sequentialNumber, paragraphMapping);
          const bIndex = this.documentService.resolveSequentialToWordIndex(b.sequentialNumber, paragraphMapping);
          return bIndex - aIndex; // Descending order
        });
        console.log('🔄 Sorted all delete actions (regular + move sources) in reverse document order');
        
        await Word.run(async (context) => {
          // Get FRESH paragraph references within this context
          const paragraphs = context.document.body.paragraphs;
          paragraphs.load('text');
          await context.sync();
          
          console.log(`📚 Fresh context has ${paragraphs.items.length} paragraphs available for deletion`);
          
          for (const suggestion of allDeleteActions) {
            try {
              console.log(`   Deleting sequential ${suggestion.sequentialNumber}: "${suggestion.instruction}"`);
              
              // Resolve sequential number to Word index using mapping
              const wordIndex = this.documentService.resolveSequentialToWordIndex(suggestion.sequentialNumber, paragraphMapping);
              if (wordIndex === null) {
                console.error(`   ❌ Could not resolve sequential ${suggestion.sequentialNumber} to Word index for deletion`);
                continue;
              }
              
              // Use fresh paragraph reference from current context
              if (wordIndex >= 0 && wordIndex < paragraphs.items.length) {
                const paragraphToDelete = paragraphs.items[wordIndex];
                
                console.log(`🔍 Deleting paragraph at Word index ${wordIndex}...`);
                console.log(`� Paragraph to delete: "${paragraphToDelete.text.substring(0, 50)}..."`);
                
                // Delete the entire paragraph including marker
                paragraphToDelete.getRange().delete();
                
                console.log(`✅ Deleted paragraph at Word index ${wordIndex}`);
                appliedCount++;
              } else {
                console.error(`❌ Invalid word index for deletion: ${wordIndex} (must be 0 to ${paragraphs.items.length - 1})`);
              }
            } catch (error) {
              console.error(`   ❌ Failed to delete sequential ${suggestion.sequentialNumber}:`, error);
            }
          }
          
          // Single sync to commit all delete changes
          await context.sync();
          console.log(`✅ Applied ${allDeleteActions.length} deletions and synced to document`);
          
          // Check for and clean up only consecutive empty paragraphs at document end
          console.log('🧹 Checking for trailing empty paragraphs after deletion...');
          const postDeleteParagraphs = context.document.body.paragraphs;
          postDeleteParagraphs.load('text');
          await context.sync();
          
          let emptyParagraphsFound = 0;
          // Only clean up empty paragraphs at the very end of the document
          for (let i = postDeleteParagraphs.items.length - 1; i >= 0; i--) {
            const para = postDeleteParagraphs.items[i];
            if (para.text.trim() === '') {
              console.log(`🧹 Found trailing empty paragraph at index ${i}, removing...`);
              para.delete();
              emptyParagraphsFound++;
            } else {
              // Stop when we hit non-empty content - don't remove empty paragraphs in the middle
              break;
            }
          }
          
          if (emptyParagraphsFound > 0) {
            await context.sync();
            console.log(`✅ Cleaned up ${emptyParagraphsFound} trailing empty paragraphs after deletion`);
          }
          
          // Final validation after deletions and cleanup
          const finalParagraphs = context.document.body.paragraphs;
          finalParagraphs.load('text');
          await context.sync();
          console.log('🔍 Final validation after deletions and cleanup:');
          console.log(`   Total paragraphs now: ${finalParagraphs.items.length}`);
          for (let i = 0; i < Math.min(finalParagraphs.items.length, 8); i++) {
            const text = finalParagraphs.items[i].text.trim();
            console.log(`   Paragraph ${i}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" (${text.length} chars)`);
          }
        });
      }
      
    } catch (error) {
      console.error('🚨 CRITICAL ERROR in mapping-based application:', error);
      throw error;
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
    
    // Append the log data to the document AFTER suggestions are applied
    try {
      const logContent = this.aiService.fileLogger.getSessionContent();
      await this.documentService.appendLogData(logContent);
      console.log(`📄 Appended analysis log to the document after applying suggestions.`);
    } catch (error) {
      console.warn('Failed to append analysis log to document:', error);
    }
    
    console.log(`\n🎯 MAPPING-BASED APPLICATION COMPLETE: ${appliedCount}/${suggestions.length} suggestions applied`);
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
