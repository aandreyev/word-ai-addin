// TypeScript interfaces for Word AI Review Add-in

// Action types for the editing plan
export interface EditAction {
  action: "modify" | "delete" | "insert" | "move";
  index?: number;
  from_index?: number;
  after_index?: number;
  instruction?: string;
  content_prompt?: string;
  reason?: string;
  to_after_index?: number;
}

// Document state management
export interface DocumentSnapshot {
  paragraphs: Word.Paragraph[];
  wordCount: number;
  isValid: boolean;
}

// API response structure
export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Service interfaces
export interface IPromptService {
  loadPrompt(filename: string): Promise<string>;
  substituteTemplate(template: string, data: Record<string, string>): string;
}

export interface IDocumentService {
  extractDocumentText(): Promise<string>;
  createParagraphSnapshot(): Promise<Word.Paragraph[]>;
  getWordCount(): Promise<number>;
  validateDocumentSize(wordCount: number): boolean;
}

export interface IGeminiService {
  callGeminiAPI(prompt: string, retryCount?: number): Promise<string>;
}

export interface IValidationService {
  validateJsonResponse(response: string): EditAction[];
  validateActionBounds(actions: EditAction[], paragraphCount: number): boolean;
  validateActionLimits(actions: EditAction[]): boolean;
}
