import { IDocumentService, DocumentSnapshot } from '../types/interfaces';

/**
 * Service for managing Word document operations
 * Handles text extraction, paragraph management, and document validation
 */
export class DocumentService implements IDocumentService {
  private readonly MAX_DOCUMENT_WORDS = 50000; // PoC limit as specified

  /**
   * Extract the plain text content of the entire Word document
   * @returns Promise<string> - The complete document text
   */
  async extractDocumentText(): Promise<string> {
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
   * @returns Promise<Word.Paragraph[]> - Array of paragraph object references
   */
  async createParagraphSnapshot(): Promise<Word.Paragraph[]> {
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
          const paragraphArray: Word.Paragraph[] = [];
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
   * @returns Promise<number> - Number of words in the document
   */
  async getWordCount(): Promise<number> {
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
   * Validate that the document size is within acceptable limits for processing
   * @param wordCount - Number of words in the document
   * @returns boolean - True if document is within limits
   */
  validateDocumentSize(wordCount: number): boolean {
    return wordCount > 0 && wordCount <= this.MAX_DOCUMENT_WORDS;
  }

  /**
   * Enable Track Changes in the Word document
   * All our modifications will appear as tracked changes for user review
   */
  async enableTrackChanges(): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          // Enable track changes
          context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
          
          await context.sync();
          resolve();
        } catch (error) {
          console.error('Error enabling track changes:', error);
          reject(new Error('Unable to enable Track Changes.'));
        }
      });
    });
  }

  /**
   * Create a complete document snapshot for workflow processing
   * @returns Promise<DocumentSnapshot> - Complete document state
   */
  async createDocumentSnapshot(): Promise<DocumentSnapshot> {
    try {
      const [paragraphs, wordCount] = await Promise.all([
        this.createParagraphSnapshot(),
        this.getWordCount()
      ]);

      return {
        paragraphs,
        wordCount,
        isValid: this.validateDocumentSize(wordCount)
      };
    } catch (error) {
      console.error('Error creating document snapshot:', error);
      throw new Error('Unable to create document snapshot.');
    }
  }

  /**
   * Apply a text modification to a specific paragraph using Track Changes
   * @param paragraph - The paragraph reference from our snapshot
   * @param newText - The new text to replace the paragraph content
   */
  async modifyParagraph(paragraph: Word.Paragraph, newText: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          // Load the current text for reference
          paragraph.load('text');
          await context.sync();
          
          // Replace the paragraph content (will show as tracked change)
          paragraph.insertText(newText, Word.InsertLocation.replace);
          
          await context.sync();
          resolve();
        } catch (error) {
          console.error('Error modifying paragraph:', error);
          reject(new Error('Unable to modify paragraph.'));
        }
      });
    });
  }

  /**
   * Insert a new paragraph after a specific paragraph
   * @param afterParagraph - The paragraph after which to insert (null for beginning)
   * @param text - The text content for the new paragraph
   */
  async insertParagraph(afterParagraph: Word.Paragraph | null, text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          if (afterParagraph === null) {
            // Insert at the beginning of the document
            const body = context.document.body;
            body.insertParagraph(text, Word.InsertLocation.start);
          } else {
            // Insert after the specified paragraph
            afterParagraph.insertParagraph(text, Word.InsertLocation.after);
          }
          
          await context.sync();
          resolve();
        } catch (error) {
          console.error('Error inserting paragraph:', error);
          reject(new Error('Unable to insert paragraph.'));
        }
      });
    });
  }

  /**
   * Delete a specific paragraph
   * @param paragraph - The paragraph reference to delete
   */
  async deleteParagraph(paragraph: Word.Paragraph): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          paragraph.delete();
          await context.sync();
          resolve();
        } catch (error) {
          console.error('Error deleting paragraph:', error);
          reject(new Error('Unable to delete paragraph.'));
        }
      });
    });
  }

  /**
   * Appends a string of log data to the end of the document.
   * @param logContent The string content to append.
   */
  async appendLogData(logContent: string): Promise<void> {
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
}
