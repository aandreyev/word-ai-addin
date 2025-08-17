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
          body.load("text");

          // Sync to get the actual content
          await context.sync();

          // Return the plain text
          resolve(body.text);
        } catch (error) {
          console.error("Error extracting document text:", error);
          reject(
            new Error(
              "Unable to access document content. Please ensure the document is not locked or corrupted."
            )
          );
        }
      });
    });
  }

  /**
   * Create a snapshot of all paragraph references in their original state
   * This is crucial for the two-pass workflow to maintain stable references
   * @returns {Promise<{paragraphs: Word.Paragraph[], referenceInfo: Array, paragraphMapping: Array}}>} - Array of paragraph object references, their info, and mapping
   */
  async createParagraphSnapshot() {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          console.log("📸 Creating paragraph snapshot...");

          // Get all paragraphs in the document
          const paragraphs = context.document.body.paragraphs;

          // Load essential properties for the snapshot - start with basic properties
          paragraphs.load("text,firstLineIndent,isListItem");

          // Sync to populate the collection
          await context.sync();

          console.log(`📋 Document contains ${paragraphs.items.length} paragraphs`);

          // Convert to array and capture reference information
          const paragraphArray = [];
          const referenceInfo = [];
          const paragraphMapping = []; // New mapping for AI
          let sequentialNumber = 1; // Start sequential numbering from 1

          for (let i = 0; i < paragraphs.items.length; i++) {
            const paragraph = paragraphs.items[i];
            paragraphArray.push(paragraph);

            // Try to get uniqueLocalId if available, fallback to index-based identifier
            let uniqueId;
            try {
              // Try to load uniqueLocalId separately to avoid errors
              paragraph.load("uniqueLocalId");
              await context.sync();
              uniqueId = paragraph.uniqueLocalId;
            } catch (idError) {
              // Fallback to index-based identifier if uniqueLocalId is not available
              uniqueId = `paragraph-index-${i}`;
              console.warn(`uniqueLocalId not available for paragraph ${i}, using fallback`);
            }

            // Check if paragraph is empty (has no meaningful content)
            const isEmpty = paragraph.text.trim().length === 0;

            // Create reference info for logging (all paragraphs)
            const refInfo = {
              index: i,
              text: paragraph.text.substring(0, 100) + (paragraph.text.length > 100 ? "..." : ""),
              wordCount: paragraph.text.trim().split(/\s+/).length,
              isListItem: paragraph.isListItem,
              isEmpty: isEmpty,
              // Use Word API's built-in immutable identifier if available, otherwise fallback
              uniqueLocalId: uniqueId,
              // Keep legacy hash for backwards compatibility during transition
              contentHash: this.generateContentHash(paragraph.text, i),
              // Add sequential number for non-empty paragraphs
              sequentialNumber: isEmpty ? null : sequentialNumber,
            };

            referenceInfo.push(refInfo);

            // Create mapping for AI (only non-empty paragraphs)
            if (!isEmpty) {
              const mapping = {
                sequentialNumber: sequentialNumber,
                content: paragraph.text.trim(),
                wordIndex: i, // Original index in Word document
                uniqueLocalId: uniqueId,
              };
              paragraphMapping.push(mapping);

              console.log(
                `   Mapping ${sequentialNumber}: [Word Index ${i}] [ID: ${uniqueId}] "${mapping.content.substring(0, 50)}..."`
              );
              sequentialNumber++;
            } else {
              console.log(`   Skipped ${i}: [Empty paragraph]`);
            }
          }

          console.log(
            `✅ Paragraph snapshot created with ${paragraphArray.length} immutable references`
          );
          console.log(`🎯 AI mapping created with ${paragraphMapping.length} non-empty paragraphs`);

          // Return paragraph references, their info, and the AI mapping
          resolve({
            paragraphs: paragraphArray,
            referenceInfo: referenceInfo,
            paragraphMapping: paragraphMapping,
          });
        } catch (error) {
          console.error("❌ Error creating paragraph snapshot:", error);
          reject(new Error("Unable to access document paragraphs for snapshot."));
        }
      });
    });
  }

  /**
   * Generate a simple content hash for paragraph identification
   * @param {string} text - Paragraph text
   * @param {number} index - Paragraph index
   * @returns {string} - Simple hash for identification
   */
  generateContentHash(text, index) {
    const content = text.trim().substring(0, 20);
    const hash = content.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `${index}-${Math.abs(hash).toString(16).substring(0, 6)}`;
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
          body.load("text");
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
          console.error("Error getting word count:", error);
          reject(new Error("Unable to calculate document word count."));
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
        body.insertText("\n--- AI ANALYSIS LOG DATA ---\n", Word.InsertLocation.end);
        body.insertText(logContent, Word.InsertLocation.end);
        body.insertText("\n--- END OF LOG ---\n", Word.InsertLocation.end);
        await context.sync();
      } catch (error) {
        console.error("Error appending log data to document:", error);
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
          console.log(`🔧 Applying suggestion:`, suggestion);

          const paragraphs = context.document.body.paragraphs;
          paragraphs.load("text");
          await context.sync();

          console.log(`📄 Document has ${paragraphs.items.length} paragraphs`);

          switch (suggestion.action) {
            case "modify":
              await this.modifyParagraph(context, paragraphs, suggestion);
              break;
            case "insert":
              await this.insertAfterParagraph(context, paragraphs, suggestion);
              break;
            case "delete":
              await this.deleteParagraph(context, paragraphs, suggestion);
              break;
            case "move":
              await this.moveParagraph(context, paragraphs, suggestion);
              break;
            default:
              console.warn("Unknown suggestion action:", suggestion.action);
              resolve(false);
              return;
          }

          await context.sync();
          console.log(`✅ Successfully applied ${suggestion.action} action`);
          resolve(true);
        } catch (error) {
          console.error(`❌ Error applying suggestion (${suggestion.action}):`, error);
          console.error("Suggestion details:", suggestion);
          resolve(false);
        }
      });
    });
  }

  /**
   * Modify an existing paragraph with replacement text
   */
  async modifyParagraph(context, paragraphs, suggestion) {
    const index = suggestion.index;
    console.log(`🔍 Modify operation: index=${index}, total paragraphs=${paragraphs.items.length}`);

    if (index >= 0 && index < paragraphs.items.length) {
      const paragraph = paragraphs.items[index];

      if (suggestion.replacement_text) {
        try {
          // Replace the entire paragraph content with the AI-suggested text
          paragraph.clear();
          paragraph.insertText(suggestion.replacement_text, Word.InsertLocation.start);
          console.log(`✅ Replaced paragraph ${index} with: "${suggestion.replacement_text}"`);
        } catch (error) {
          console.error(`❌ Failed to replace paragraph ${index}:`, error);
          // Fallback: add instruction as comment if replacement fails
          paragraph.insertText(` [AI Edit: ${suggestion.instruction}]`, Word.InsertLocation.end);
          console.log(`⚠️ Used fallback comment method for paragraph ${index}`);
        }
      } else {
        // Fallback: add instruction as comment if no replacement text provided
        paragraph.insertText(` [AI Edit: ${suggestion.instruction}]`, Word.InsertLocation.end);
        console.log(`⚠️ No replacement text provided, added comment for paragraph ${index}`);
      }
    } else {
      console.error(`❌ Invalid index: ${index} (must be 0 to ${paragraphs.items.length - 1})`);
    }
  }

  /**
   * Insert new content after a paragraph
   */
  async insertAfterParagraph(context, paragraphs, suggestion) {
    const afterIndex = suggestion.after_index;
    console.log(
      `🔍 Insert operation: after_index=${afterIndex}, total paragraphs=${paragraphs.items.length}`
    );

    if (afterIndex >= 0 && afterIndex < paragraphs.items.length) {
      const paragraph = paragraphs.items[afterIndex];

      if (suggestion.new_content) {
        try {
          // Method 1: Try using insertParagraph - most reliable for Word
          paragraph.insertParagraph(suggestion.new_content, Word.InsertLocation.after);
          console.log(`✅ Inserted new paragraph after ${afterIndex}: "${suggestion.new_content}"`);
        } catch (error) {
          console.warn("insertParagraph failed, trying alternative approaches:", error);

          try {
            // Method 2: Try inserting at the end of the paragraph with proper line breaks
            paragraph.insertText(`\n${suggestion.new_content}`, Word.InsertLocation.end);
            console.log(
              `✅ Inserted new content (via insertText at end) after paragraph ${afterIndex}: "${suggestion.new_content}"`
            );
          } catch (error2) {
            console.warn("insertText at end failed, trying document body approach:", error2);

            try {
              // Method 3: Insert into document body at calculated position
              const range = paragraph.getRange(Word.RangeLocation.after);
              range.insertText(`\n${suggestion.new_content}\n`, Word.InsertLocation.start);
              console.log(
                `✅ Inserted new content (via range) after paragraph ${afterIndex}: "${suggestion.new_content}"`
              );
            } catch (error3) {
              console.error("All insert methods failed:", error3);
              // Method 4: Fallback - add as comment to the target paragraph
              paragraph.insertText(
                `\n[AI Insert: ${suggestion.new_content}]`,
                Word.InsertLocation.end
              );
              console.log(`⚠️ Used fallback comment method for paragraph ${afterIndex}`);
            }
          }
        }
      } else {
        // Fallback: insert instruction as comment
        paragraph.insertText(`\n[AI Insert: ${suggestion.instruction}]`, Word.InsertLocation.end);
        console.log(`⚠️ No new content provided, added comment after paragraph ${afterIndex}`);
      }
    } else {
      console.error(
        `❌ Invalid after_index: ${afterIndex} (must be 0 to ${paragraphs.items.length - 1})`
      );

      // Try inserting at the end of the document as a fallback
      if (suggestion.new_content) {
        try {
          const body = context.document.body;
          body.insertParagraph(suggestion.new_content, Word.InsertLocation.end);
          console.log(
            `✅ Inserted new paragraph at document end (fallback): "${suggestion.new_content}"`
          );
        } catch (error) {
          console.error("Even document end insertion failed:", error);
        }
      }
    }
  }

  /**
   * Delete a paragraph
   */
  async deleteParagraph(context, paragraphs, suggestion) {
    const index = suggestion.index;
    if (index >= 0 && index < paragraphs.items.length) {
      const paragraph = paragraphs.items[index];
      // Actually delete the paragraph
      paragraph.delete();
      console.log(`✅ Deleted paragraph ${index}`);
    }
  }

  /**
   * Move a paragraph to a new location
   */
  async moveParagraph(context, paragraphs, suggestion) {
    const fromIndex = suggestion.from_index || suggestion.index;
    const toAfterIndex = suggestion.to_after_index;

    if (
      fromIndex >= 0 &&
      fromIndex < paragraphs.items.length &&
      toAfterIndex >= 0 &&
      toAfterIndex < paragraphs.items.length
    ) {
      const paragraph = paragraphs.items[fromIndex];
      // For safety, we'll just add a note rather than actually moving
      paragraph.insertText(
        `[AI Suggests: MOVE to after paragraph ${toAfterIndex + 1}] `,
        Word.InsertLocation.start
      );
    }
  }

  /**
   * Apply a single suggestion using immutable paragraph references (two-phase approach)
   * @param {Object} suggestion - The suggestion to apply
   * @param {Word.Paragraph[]} originalParagraphs - Immutable snapshot of paragraph references
   * @param {Array} referenceInfo - Reference information for logging
   * @returns {Promise<boolean>} - Whether the suggestion was successfully applied
   */
  async applySuggestionWithSnapshot(suggestion, originalParagraphs, referenceInfo = []) {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          console.log(`🔧 Applying suggestion with snapshot:`, suggestion);
          console.log(
            `📊 Original paragraphs snapshot has ${originalParagraphs.length} references`
          );

          // Log reference info for the target paragraph
          const targetIndex =
            suggestion.index !== undefined ? suggestion.index : suggestion.after_index;
          if (targetIndex !== undefined && referenceInfo[targetIndex]) {
            const refInfo = referenceInfo[targetIndex];
            console.log(`🎯 Target paragraph [${targetIndex}] reference:`, {
              hash: refInfo.contentHash,
              text: refInfo.text,
              wordCount: refInfo.wordCount,
              isListItem: refInfo.isListItem,
              isEmpty: refInfo.isEmpty,
            });
          }

          switch (suggestion.action) {
            case "modify":
              await this.modifyParagraphWithSnapshot(
                context,
                originalParagraphs,
                suggestion,
                referenceInfo
              );
              break;
            case "insert":
              await this.insertAfterParagraphWithSnapshot(
                context,
                originalParagraphs,
                suggestion,
                referenceInfo
              );
              break;
            case "delete":
              await this.deleteParagraphWithSnapshot(
                context,
                originalParagraphs,
                suggestion,
                referenceInfo
              );
              break;
            case "move":
              await this.moveParagraphWithSnapshot(
                context,
                originalParagraphs,
                suggestion,
                referenceInfo
              );
              break;
            default:
              console.warn("Unknown suggestion action:", suggestion.action);
              resolve(false);
              return;
          }

          await context.sync();
          console.log(
            `✅ Successfully applied ${suggestion.action} action using snapshot reference`
          );
          resolve(true);
        } catch (error) {
          console.error(
            `❌ Error applying suggestion with snapshot (${suggestion.action}):`,
            error
          );
          console.error("Suggestion details:", suggestion);
          resolve(false);
        }
      });
    });
  }

  /**
   * Modify an existing paragraph using immutable reference
   */
  async modifyParagraphWithSnapshot(context, originalParagraphs, suggestion, referenceInfo = []) {
    const index = suggestion.index;
    console.log(
      `🔍 Modify with snapshot: index=${index}, snapshot length=${originalParagraphs.length}`
    );

    if (index >= 0 && index < originalParagraphs.length) {
      const paragraph = originalParagraphs[index];

      // Log reference information
      if (referenceInfo[index]) {
        console.log(
          `📋 Using immutable reference [${referenceInfo[index].contentHash}]: "${referenceInfo[index].text}"`
        );
      }

      if (suggestion.replacement_text) {
        try {
          // Validate that the paragraph reference is still valid
          console.log(`🔍 Validating paragraph reference ${index}...`);
          paragraph.load("text");
          await context.sync();
          console.log(
            `✅ Paragraph ${index} validation successful, current text: "${paragraph.text.substring(0, 50)}..."`
          );

          // Use the immutable reference to modify the paragraph
          paragraph.clear();
          paragraph.insertText(suggestion.replacement_text, Word.InsertLocation.start);
          await context.sync(); // Ensure the change is applied immediately
          console.log(
            `✅ Modified paragraph via snapshot ${index} with: "${suggestion.replacement_text}"`
          );
        } catch (error) {
          console.error(`❌ Failed to modify paragraph via snapshot ${index}:`, error);
          // Fallback: add instruction as comment if replacement fails
          paragraph.insertText(` [AI Edit: ${suggestion.instruction}]`, Word.InsertLocation.end);
          console.log(`⚠️ Used fallback comment method for snapshot paragraph ${index}`);
        }
      } else {
        // Fallback: add instruction as comment if no replacement text provided
        paragraph.insertText(` [AI Edit: ${suggestion.instruction}]`, Word.InsertLocation.end);
        console.log(
          `⚠️ No replacement text provided, added comment for snapshot paragraph ${index}`
        );
      }
    } else {
      console.error(
        `❌ Invalid snapshot index: ${index} (must be 0 to ${originalParagraphs.length - 1})`
      );
    }
  }

  /**
   * Insert new content after a paragraph using immutable reference
   */
  async insertAfterParagraphWithSnapshot(
    context,
    originalParagraphs,
    suggestion,
    referenceInfo = []
  ) {
    const afterIndex = suggestion.after_index;
    console.log(
      `🔍 Insert with snapshot: after_index=${afterIndex}, snapshot length=${originalParagraphs.length}`
    );

    if (afterIndex >= 0 && afterIndex < originalParagraphs.length) {
      const paragraph = originalParagraphs[afterIndex];

      // Log reference information
      if (referenceInfo[afterIndex]) {
        console.log(
          `📋 Using immutable reference [${referenceInfo[afterIndex].contentHash}] as anchor: "${referenceInfo[afterIndex].text}"`
        );
      }

      if (suggestion.new_content) {
        try {
          // Method 1: Try using insertParagraph with immutable reference
          paragraph.insertParagraph(suggestion.new_content, Word.InsertLocation.after);
          console.log(
            `✅ Inserted new paragraph via snapshot after ${afterIndex}: "${suggestion.new_content}"`
          );
        } catch (error) {
          console.warn(
            "insertParagraph via snapshot failed, trying alternative approaches:",
            error
          );

          try {
            // Method 2: Try inserting at the end of the paragraph with proper line breaks
            paragraph.insertText(`\n${suggestion.new_content}`, Word.InsertLocation.end);
            console.log(
              `✅ Inserted new content via snapshot (insertText at end) after paragraph ${afterIndex}: "${suggestion.new_content}"`
            );
          } catch (error2) {
            console.warn("insertText at end via snapshot failed, trying range approach:", error2);

            try {
              // Method 3: Insert into document body using range from immutable reference
              const range = paragraph.getRange(Word.RangeLocation.after);
              range.insertText(`\n${suggestion.new_content}\n`, Word.InsertLocation.start);
              console.log(
                `✅ Inserted new content via snapshot (range) after paragraph ${afterIndex}: "${suggestion.new_content}"`
              );
            } catch (error3) {
              console.error("All snapshot insert methods failed:", error3);
              // Method 4: Fallback - add as comment to the target paragraph
              paragraph.insertText(
                `\n[AI Insert: ${suggestion.new_content}]`,
                Word.InsertLocation.end
              );
              console.log(`⚠️ Used fallback comment method for snapshot paragraph ${afterIndex}`);
            }
          }
        }
      } else {
        // Fallback: insert instruction as comment
        paragraph.insertText(`\n[AI Insert: ${suggestion.instruction}]`, Word.InsertLocation.end);
        console.log(
          `⚠️ No new content provided, added comment after snapshot paragraph ${afterIndex}`
        );
      }
    } else {
      console.error(
        `❌ Invalid snapshot after_index: ${afterIndex} (must be 0 to ${originalParagraphs.length - 1})`
      );

      // Try inserting at the end of the document as a fallback
      if (suggestion.new_content && originalParagraphs.length > 0) {
        try {
          const lastParagraph = originalParagraphs[originalParagraphs.length - 1];
          lastParagraph.insertParagraph(suggestion.new_content, Word.InsertLocation.after);
          console.log(
            `✅ Inserted new paragraph at document end via snapshot (fallback): "${suggestion.new_content}"`
          );
        } catch (error) {
          console.error("Even snapshot document end insertion failed:", error);
        }
      }
    }
  }

  /**
   * Delete a paragraph using immutable reference
   */
  async deleteParagraphWithSnapshot(context, originalParagraphs, suggestion, referenceInfo = []) {
    const index = suggestion.index;
    console.log(
      `🔍 Delete with snapshot: index=${index}, snapshot length=${originalParagraphs.length}`
    );

    if (index >= 0 && index < originalParagraphs.length) {
      const paragraph = originalParagraphs[index];

      // Log reference information
      if (referenceInfo[index]) {
        console.log(
          `📋 Deleting immutable reference [${referenceInfo[index].contentHash}]: "${referenceInfo[index].text}"`
        );
      }

      try {
        // Actually delete the paragraph using immutable reference
        paragraph.delete();
        console.log(`✅ Deleted paragraph via snapshot ${index}`);
      } catch (error) {
        console.error(`❌ Failed to delete paragraph via snapshot ${index}:`, error);
        // Fallback: add deletion comment instead
        paragraph.insertText(
          `[AI: PARAGRAPH MARKED FOR DELETION - ${suggestion.reason || suggestion.instruction}]`,
          Word.InsertLocation.start
        );
        console.log(`⚠️ Used fallback deletion comment for snapshot paragraph ${index}`);
      }
    } else {
      console.error(
        `❌ Invalid snapshot delete index: ${index} (must be 0 to ${originalParagraphs.length - 1})`
      );
    }
  }

  /**
   * Move a paragraph using immutable references
   */
  async moveParagraphWithSnapshot(context, originalParagraphs, suggestion, referenceInfo = []) {
    const fromIndex = suggestion.from_index || suggestion.index;
    const toAfterIndex = suggestion.to_after_index;
    console.log(
      `🔍 Move with snapshot: from=${fromIndex} to after=${toAfterIndex}, snapshot length=${originalParagraphs.length}`
    );

    if (
      fromIndex >= 0 &&
      fromIndex < originalParagraphs.length &&
      toAfterIndex >= 0 &&
      toAfterIndex < originalParagraphs.length
    ) {
      const paragraph = originalParagraphs[fromIndex];

      // Log reference information for both source and destination
      if (referenceInfo[fromIndex]) {
        console.log(
          `📋 Moving immutable reference [${referenceInfo[fromIndex].contentHash}]: "${referenceInfo[fromIndex].text}"`
        );
      }
      if (referenceInfo[toAfterIndex]) {
        console.log(
          `📋 To after immutable reference [${referenceInfo[toAfterIndex].contentHash}]: "${referenceInfo[toAfterIndex].text}"`
        );
      }

      try {
        // For safety in PoC, we'll just add a note rather than actually moving
        // In production, this would involve copying content and deleting original
        paragraph.insertText(
          `[AI Suggests: MOVE to after paragraph ${toAfterIndex + 1}] `,
          Word.InsertLocation.start
        );
        console.log(
          `⚠️ Added move suggestion comment for snapshot paragraph ${fromIndex} to after ${toAfterIndex}`
        );
      } catch (error) {
        console.error(`❌ Failed to add move comment via snapshot:`, error);
      }
    } else {
      console.error(
        `❌ Invalid snapshot move indices: from=${fromIndex}, to_after=${toAfterIndex} (must be 0 to ${originalParagraphs.length - 1})`
      );
    }
  }

  /**
   * Resolve sequential number to Word paragraph index using the mapping
   * @param {number} sequentialNumber - The sequential number from AI
   * @param {Array} paragraphMapping - The mapping created during snapshot
   * @returns {number|null} - The Word paragraph index or null if not found
   */
  resolveSequentialToWordIndex(sequentialNumber, paragraphMapping) {
    console.log(
      `🔍 Attempting to resolve sequential ${sequentialNumber} from mapping:`,
      paragraphMapping
    );

    const mapping = paragraphMapping.find((m) => m.sequentialNumber === sequentialNumber);
    if (mapping) {
      console.log(`✅ Resolved sequential ${sequentialNumber} to Word index ${mapping.wordIndex}`);
      return mapping.wordIndex;
    } else {
      console.error(
        `❌ Sequential number ${sequentialNumber} not found in mapping. Available sequential numbers: ${paragraphMapping.map((m) => m.sequentialNumber).join(", ")}`
      );
      return null;
    }
  }

  /**
   * Get mapping information for a sequential number
   * @param {number} sequentialNumber - The sequential number from AI
   * @param {Array} paragraphMapping - The mapping created during snapshot
   * @returns {Object|null} - The mapping object or null if not found
   */
  getMappingForSequential(sequentialNumber, paragraphMapping) {
    const mapping = paragraphMapping.find((m) => m.sequentialNumber === sequentialNumber);
    if (mapping) {
      console.log(`📋 Found mapping for sequential ${sequentialNumber}:`, mapping);
      return mapping;
    } else {
      console.warn(`⚠️ Sequential number ${sequentialNumber} not found in mapping`);
      return null;
    }
  }
}
