/**
 * Service for managing Word document operations
 * Handles text extraction, paragraph management, and document validation
 */
export class DocumentService {
  constructor() {
    this.MAX_DOCUMENT_WORDS = 50000; // PoC limit as specified
  }

  /**
   * Extract the plain text content of the entire Word document
   * @returns {Promise<string>} - The complete document text
   */
  async extractDocumentText() {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          // Get the document body
          const body = context.document.body;
          
          // Load the text property
          body.load('text');
          
          // Sync to get the actual content
          await context.sync();
          
          // Return the plain text
          resolve(body.text);
        } catch (error) {
          console.error('Error extracting document text:', error);
          reject(new Error('Unable to access document content. Please ensure the document is not locked or corrupted.'));
        }
      });
    });
  }

  /**
   * Create a snapshot of all paragraph references in their original state
   * This is crucial for the two-pass workflow to maintain stable references
   * @returns {Promise<Word.Paragraph[]>} - Array of paragraph object references
   */
  async createParagraphSnapshot() {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          // Get all paragraphs in the document
          const paragraphs = context.document.body.paragraphs;
          
          // Load the text property for validation
          paragraphs.load('text');
          
          // Sync to populate the collection
          await context.sync();
          
          // Convert to array and return the references
          const paragraphArray = [];
          for (let i = 0; i < paragraphs.items.length; i++) {
            paragraphArray.push(paragraphs.items[i]);
          }
          
          resolve(paragraphArray);
        } catch (error) {
          console.error('Error creating paragraph snapshot:', error);
          reject(new Error('Unable to access document paragraphs.'));
        }
      });
    });
  }

  /**
   * Get the word count of the document
   * @returns {Promise<number>} - Number of words in the document
   */
  async getWordCount() {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const body = context.document.body;
          
          // Load the text to calculate word count
          body.load('text');
          await context.sync();
          
          // Simple word count calculation
          const text = body.text.trim();
          if (!text) {
            resolve(0);
            return;
          }
          
          const wordCount = text.split(/\s+/).length;
          resolve(wordCount);
        } catch (error) {
          console.error('Error getting word count:', error);
          reject(new Error('Unable to calculate document word count.'));
        }
      });
    });
  }

  /**
   * Appends a string of log data to the end of the document.
   * @param {string} logContent The string content to append.
   */
  async appendLogData(logContent) {
    return Word.run(async (context) => {
      try {
        const body = context.document.body;
        body.insertText('\n--- AI ANALYSIS LOG DATA ---\n', Word.InsertLocation.end);
        body.insertText(logContent, Word.InsertLocation.end);
        body.insertText('\n--- END OF LOG ---\n', Word.InsertLocation.end);
        await context.sync();
      } catch (error) {
        console.error('Error appending log data to document:', error);
        // Don't reject promise, as this is a non-critical logging operation
      }
    });
  }

  /**
   * Apply a single suggestion to the document
   * @param {Object} suggestion - The suggestion to apply
   * @returns {Promise<boolean>} - Whether the suggestion was successfully applied
   */
  async applySuggestion(suggestion) {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const paragraphs = context.document.body.paragraphs;
          paragraphs.load('text');
          await context.sync();

          switch (suggestion.action) {
            case 'modify':
              await this.modifyParagraph(context, paragraphs, suggestion);
              break;
            case 'insert':
              await this.insertAfterParagraph(context, paragraphs, suggestion);
              break;
            case 'delete':
              await this.deleteParagraph(context, paragraphs, suggestion);
              break;
            case 'move':
              await this.moveParagraph(context, paragraphs, suggestion);
              break;
            default:
              console.warn('Unknown suggestion action:', suggestion.action);
              resolve(false);
              return;
          }

          await context.sync();
          resolve(true);
        } catch (error) {
          console.error('Error applying suggestion:', error);
          resolve(false);
        }
      });
    });
  }

  /**
   * Modify an existing paragraph
   */
  async modifyParagraph(context, paragraphs, suggestion) {
    const index = suggestion.index;
    if (index >= 0 && index < paragraphs.items.length) {
      const paragraph = paragraphs.items[index];
      
      // Use track changes if available
      if (suggestion.instruction) {
        // For now, we'll append the instruction as a comment
        paragraph.insertText(` [AI Edit: ${suggestion.instruction}]`, Word.InsertLocation.end);
      }
    }
  }

  /**
   * Insert new content after a paragraph
   */
  async insertAfterParagraph(context, paragraphs, suggestion) {
    const afterIndex = suggestion.after_index;
    if (afterIndex >= 0 && afterIndex < paragraphs.items.length) {
      const paragraph = paragraphs.items[afterIndex];
      const newText = suggestion.content_prompt || suggestion.instruction || '[New content]';
      paragraph.insertText(`\n${newText}`, Word.InsertLocation.after);
    }
  }

  /**
   * Delete a paragraph
   */
  async deleteParagraph(context, paragraphs, suggestion) {
    const index = suggestion.index;
    if (index >= 0 && index < paragraphs.items.length) {
      const paragraph = paragraphs.items[index];
      // Instead of deleting, we'll strikethrough for safety
      paragraph.insertText('[AI Suggests: DELETE THIS PARAGRAPH] ', Word.InsertLocation.start);
    }
  }

  /**
   * Move a paragraph to a new location
   */
  async moveParagraph(context, paragraphs, suggestion) {
    const fromIndex = suggestion.from_index || suggestion.index;
    const toAfterIndex = suggestion.to_after_index;
    
    if (fromIndex >= 0 && fromIndex < paragraphs.items.length &&
        toAfterIndex >= 0 && toAfterIndex < paragraphs.items.length) {
      const paragraph = paragraphs.items[fromIndex];
      // For safety, we'll just add a note rather than actually moving
      paragraph.insertText(`[AI Suggests: MOVE to after paragraph ${toAfterIndex + 1}] `, Word.InsertLocation.start);
    }
  }
}
