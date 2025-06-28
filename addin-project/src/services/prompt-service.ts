import { IPromptService } from '../types/interfaces';

/**
 * Service for managing prompt templates and substitution
 * Handles loading prompt files and replacing placeholders with actual data
 */
export class PromptService implements IPromptService {
  private promptCache: Map<string, string> = new Map();

  /**
   * Load a prompt template from the prompts directory
   * @param filename - Name of the prompt file (e.g., 'pass1_strategy_prompt.md')
   * @returns Promise<string> - The prompt template content
   */
  async loadPrompt(filename: string): Promise<string> {
    // Check cache first
    if (this.promptCache.has(filename)) {
      return this.promptCache.get(filename)!;
    }

    try {
      // In a real environment, this would use fetch() or file system
      // For now, we'll load from the prompts directory
      const response = await fetch(`./src/prompts/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load prompt file: ${filename}`);
      }
      
      const content = await response.text();
      
      // Cache the prompt for future use
      this.promptCache.set(filename, content);
      
      return content;
    } catch (error) {
      console.error(`Error loading prompt ${filename}:`, error);
      throw new Error(`Unable to load prompt template: ${filename}`);
    }
  }

  /**
   * Substitute placeholders in a template with actual data
   * @param template - The template string with placeholders like [DOCUMENT_TEXT]
   * @param data - Object with key-value pairs for substitution
   * @returns string - Template with placeholders replaced
   */
  substituteTemplate(template: string, data: Record<string, string>): string {
    let result = template;
    
    // Replace all placeholders in the format [KEY] with values from data
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `[${key}]`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }
    
    return result;
  }

  /**
   * Clear the prompt cache (useful for testing or template updates)
   */
  clearCache(): void {
    this.promptCache.clear();
  }

  /**
   * Get a ready-to-use Pass 1 strategy prompt with document text
   * @param documentText - The full text of the Word document
   * @returns Promise<string> - Complete prompt ready for AI
   */
  async getPass1StrategyPrompt(documentText: string): Promise<string> {
    const template = await this.loadPrompt('pass1_strategy_prompt.md');
    return this.substituteTemplate(template, {
      'DOCUMENT_TEXT': documentText
    });
  }

  /**
   * Get a ready-to-use Pass 2 execution prompt
   * @param instruction - The instruction from the Pass 1 plan
   * @param originalText - The original paragraph text (empty for insertions)
   * @returns Promise<string> - Complete prompt ready for AI
   */
  async getPass2ExecutionPrompt(instruction: string, originalText: string = ''): Promise<string> {
    const template = await this.loadPrompt('pass2_execution_prompt.md');
    return this.substituteTemplate(template, {
      'INSTRUCTION': instruction,
      'ORIGINAL_TEXT': originalText
    });
  }
}
