import { IGeminiService, GeminiResponse } from '../types/interfaces';

/**
 * Service for interacting with Google Gemini API
 * Handles API communication, retry logic, and secure API key management
 */
export class GeminiService implements IGeminiService {
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly maxRetries = 3;
  private readonly timeoutMs = 30000; // 30 seconds

  /**
   * Get the API key from environment variables (injected via Doppler)
   * @returns string - The Gemini API key
   * @throws Error if API key is not found
   */
  private getApiKey(): string {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found. Please ensure Doppler secrets are properly configured.');
    }
    return apiKey;
  }

  /**
   * Get the model name from environment or use default
   * @returns string - The Gemini model name
   */
  private getModelName(): string {
    const configuredModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    
    // Handle deprecated model names
    if (configuredModel === 'gemini-pro') {
      console.warn('gemini-pro is deprecated, using gemini-1.5-flash instead');
      return 'gemini-1.5-flash';
    }
    
    return configuredModel;
  }

  /**
   * Build the API URL for the current model
   * @returns string - The complete API URL
   */
  private buildApiUrl(): string {
    const modelName = this.getModelName();
    const apiKey = this.getApiKey();
    return `${this.baseUrl}/${modelName}:generateContent?key=${apiKey}`;
  }

  /**
   * Call the Gemini API with retry logic
   * @param prompt - The prompt to send to the AI
   * @param retryCount - Current retry attempt (default: 1)
   * @returns Promise<string> - The AI response text
   */
  async callGeminiAPI(prompt: string, retryCount: number = 1): Promise<string> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        console.log(`Gemini API call attempt ${attempt}/${retryCount}`);
        
        const response = await this.makeAPIRequest(prompt);
        const text = this.extractTextFromResponse(response);
        
        console.log(`Gemini API call successful on attempt ${attempt}`);
        return text;
      } catch (error) {
        lastError = error as Error;
        console.error(`Gemini API attempt ${attempt} failed:`, error);
        
        // Don't retry on authentication errors
        if (this.isAuthenticationError(error as Error)) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < retryCount) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          console.log(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    throw new Error(`Gemini API failed after ${retryCount} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Make a single API request to Gemini
   * @param prompt - The prompt to send
   * @returns Promise<GeminiResponse> - The raw API response
   */
  private async makeAPIRequest(prompt: string): Promise<GeminiResponse> {
    const apiUrl = this.buildApiUrl();
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent, focused responses
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
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

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid API key. Please check your GEMINI_API_KEY configuration.');
        }
        if (response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      return data as GeminiResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`API request timed out after ${this.timeoutMs}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Extract text content from Gemini API response
   * @param response - The raw API response
   * @returns string - The extracted text
   */
  private extractTextFromResponse(response: GeminiResponse): string {
    try {
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No candidates in API response');
      }

      const candidate = response.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('No content parts in API response');
      }

      const part = candidate.content.parts[0];
      if (!part.text) {
        throw new Error('No text in API response part');
      }

      return part.text.trim();
    } catch (error) {
      console.error('Error extracting text from response:', error, response);
      throw new Error('Invalid response format from AI service');
    }
  }

  /**
   * Check if an error is an authentication error (don't retry these)
   * @param error - The error to check
   * @returns boolean - True if it's an auth error
   */
  private isAuthenticationError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('api key') || 
           message.includes('unauthorized') || 
           message.includes('forbidden') ||
           message.includes('401') ||
           message.includes('403');
  }

  /**
   * Sleep for a specified number of milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test the API connection and configuration
   * @returns Promise<boolean> - True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Gemini API connection...');
      const testPrompt = 'Respond with only the word "OK" if you can understand this message.';
      const response = await this.callGeminiAPI(testPrompt, 1);
      
      const isValid = response.toLowerCase().includes('ok');
      console.log(`API test ${isValid ? 'passed' : 'failed'}:`, response);
      
      return isValid;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get API configuration info for debugging
   * @returns object - Configuration details (without sensitive data)
   */
  getConfigInfo(): { hasApiKey: boolean; modelName: string; baseUrl: string } {
    return {
      hasApiKey: !!process.env.GEMINI_API_KEY,
      modelName: this.getModelName(),
      baseUrl: this.baseUrl
    };
  }
}
