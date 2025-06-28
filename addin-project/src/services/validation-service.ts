import { IValidationService, EditAction } from '../types/interfaces';

/**
 * Service for validating AI responses and ensuring safe document operations
 * Implements safety constraints and response validation
 */
export class ValidationService implements IValidationService {
  private readonly MAX_ACTIONS_PER_DOCUMENT = 100; // Prevent runaway responses
  private readonly MAX_DELETION_PERCENTAGE = 0.25; // Max 25% of document can be deleted

  /**
   * Validate and parse a JSON response from the AI
   * @param response - Raw response string from AI
   * @returns EditAction[] - Parsed and validated array of actions
   * @throws Error if response is invalid
   */
  validateJsonResponse(response: string): EditAction[] {
    try {
      // Remove any markdown formatting that might be present
      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse the JSON
      const parsed = JSON.parse(cleanResponse);
      
      // Ensure it's an array
      if (!Array.isArray(parsed)) {
        throw new Error('AI response must be a JSON array');
      }
      
      // Validate each action object
      const actions: EditAction[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const action = this.validateAction(parsed[i], i);
        actions.push(action);
      }
      
      return actions;
    } catch (error) {
      console.error('JSON validation error:', error);
      if (error instanceof SyntaxError) {
        throw new Error('AI service returned an unexpected response. Please try again.');
      }
      throw error;
    }
  }

  /**
   * Validate a single action object
   * @param action - Raw action object from AI response
   * @param index - Index in the array for error reporting
   * @returns EditAction - Validated action object
   */
  private validateAction(action: any, index: number): EditAction {
    if (!action || typeof action !== 'object') {
      throw new Error(`Action ${index} is not a valid object`);
    }

    if (!action.action || typeof action.action !== 'string') {
      throw new Error(`Action ${index} missing required 'action' field`);
    }

    const validActions = ['modify', 'delete', 'insert', 'move'];
    if (!validActions.includes(action.action)) {
      throw new Error(`Action ${index} has invalid action type: ${action.action}`);
    }

    // Validate required fields based on action type
    switch (action.action) {
      case 'modify':
        this.validateRequiredFields(action, ['index', 'instruction'], index);
        this.validateNumber(action.index, `Action ${index} index`);
        break;
      
      case 'delete':
        this.validateRequiredFields(action, ['index', 'reason'], index);
        this.validateNumber(action.index, `Action ${index} index`);
        break;
      
      case 'insert':
        this.validateRequiredFields(action, ['after_index', 'content_prompt'], index);
        this.validateNumber(action.after_index, `Action ${index} after_index`, true); // Allow -1
        break;
      
      case 'move':
        this.validateRequiredFields(action, ['from_index', 'to_after_index'], index);
        this.validateNumber(action.from_index, `Action ${index} from_index`);
        this.validateNumber(action.to_after_index, `Action ${index} to_after_index`, true); // Allow -1
        break;
    }

    return action as EditAction;
  }

  /**
   * Validate that required fields are present and not empty
   */
  private validateRequiredFields(action: any, fields: string[], actionIndex: number): void {
    for (const field of fields) {
      if (action[field] === undefined || action[field] === null) {
        throw new Error(`Action ${actionIndex} missing required field: ${field}`);
      }
      if (typeof action[field] === 'string' && action[field].trim() === '') {
        throw new Error(`Action ${actionIndex} field '${field}' cannot be empty`);
      }
    }
  }

  /**
   * Validate that a value is a valid number (integer)
   */
  private validateNumber(value: any, fieldName: string, allowNegativeOne: boolean = false): void {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new Error(`${fieldName} must be an integer`);
    }
    if (value < 0 && !(allowNegativeOne && value === -1)) {
      throw new Error(`${fieldName} must be non-negative${allowNegativeOne ? ' (or -1)' : ''}`);
    }
  }

  /**
   * Validate that action indices are within document bounds
   * @param actions - Array of validated actions
   * @param paragraphCount - Number of paragraphs in the document
   * @returns boolean - True if all actions are within bounds
   */
  validateActionBounds(actions: EditAction[], paragraphCount: number): boolean {
    for (const action of actions) {
      switch (action.action) {
        case 'modify':
        case 'delete':
          if (action.index! >= paragraphCount) {
            console.error(`Action index ${action.index} exceeds document bounds (${paragraphCount} paragraphs)`);
            return false;
          }
          break;
        
        case 'insert':
          // after_index can be -1 (beginning) or up to paragraphCount-1
          if (action.after_index! !== -1 && action.after_index! >= paragraphCount) {
            console.error(`Insert after_index ${action.after_index} exceeds document bounds`);
            return false;
          }
          break;
        
        case 'move':
          if (action.from_index! >= paragraphCount) {
            console.error(`Move from_index ${action.from_index} exceeds document bounds`);
            return false;
          }
          if (action.to_after_index! !== -1 && action.to_after_index! >= paragraphCount) {
            console.error(`Move to_after_index ${action.to_after_index} exceeds document bounds`);
            return false;
          }
          break;
      }
    }
    return true;
  }

  /**
   * Validate that the number and type of actions are within safe limits
   * @param actions - Array of validated actions
   * @returns boolean - True if actions are within safe limits
   */
  validateActionLimits(actions: EditAction[]): boolean {
    // Check total action count
    if (actions.length > this.MAX_ACTIONS_PER_DOCUMENT) {
      console.error(`Too many actions: ${actions.length} exceeds limit of ${this.MAX_ACTIONS_PER_DOCUMENT}`);
      return false;
    }

    // Count deletion actions to prevent excessive deletion
    const deleteActions = actions.filter(action => action.action === 'delete');
    const deletePercentage = deleteActions.length / actions.length;
    
    if (deletePercentage > this.MAX_DELETION_PERCENTAGE) {
      console.error(`Too many deletions: ${deletePercentage * 100}% exceeds limit of ${this.MAX_DELETION_PERCENTAGE * 100}%`);
      return false;
    }

    return true;
  }

  /**
   * Comprehensive validation of an AI response
   * @param response - Raw AI response
   * @param paragraphCount - Number of paragraphs in the document
   * @returns EditAction[] - Validated and safe actions
   * @throws Error if validation fails
   */
  validateResponse(response: string, paragraphCount: number): EditAction[] {
    // Step 1: Parse and validate JSON structure
    const actions = this.validateJsonResponse(response);
    
    // Step 2: Validate action limits
    if (!this.validateActionLimits(actions)) {
      throw new Error('AI response contains too many actions or unsafe action ratios');
    }
    
    // Step 3: Validate bounds
    if (!this.validateActionBounds(actions, paragraphCount)) {
      throw new Error('AI response contains actions that exceed document bounds');
    }
    
    console.log(`Validation passed: ${actions.length} actions validated for document with ${paragraphCount} paragraphs`);
    return actions;
  }

  /**
   * Sort actions by execution order for safe processing
   * Returns actions grouped by phase for the two-pass execution strategy
   */
  sortActionsForExecution(actions: EditAction[]): {
    modifications: EditAction[];
    insertions: EditAction[];
    deletionsAndMoves: EditAction[];
  } {
    const modifications = actions.filter(a => a.action === 'modify');
    const insertions = actions.filter(a => a.action === 'insert');
    const deletionsAndMoves = actions.filter(a => a.action === 'delete' || a.action === 'move')
      .sort((a, b) => {
        // Sort deletions and moves by descending index to prevent reference shifting
        const aIndex = a.action === 'delete' ? a.index! : a.from_index!;
        const bIndex = b.action === 'delete' ? b.index! : b.from_index!;
        return bIndex - aIndex;
      });

    return {
      modifications,
      insertions,
      deletionsAndMoves
    };
  }
}
