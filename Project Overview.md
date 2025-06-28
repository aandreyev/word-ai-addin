# Word AI Document Review Add-in - Project Overview

## Application Architecture Overview

### 1. **Project Structure**
```
Word-Review-Add-in/
├── src/
│   ├── taskpane/
│   │   ├── taskpane.html          # UI interface
│   │   ├── taskpane.css           # Styling
│   │   └── taskpane.ts            # Main application logic
│   ├── prompts/
│   │   ├── pass1_strategy_prompt.md    # Strategy generation prompt
│   │   └── pass2_execution_prompt.md   # Content generation prompt
│   ├── services/
│   │   ├── gemini-service.ts      # API communication
│   │   ├── document-service.ts    # Word document operations
│   │   ├── prompt-service.ts      # Prompt management
│   │   └── validation-service.ts  # Response validation
│   └── types/
│       └── interfaces.ts          # TypeScript interfaces
├── manifest.xml                   # Office Add-in manifest
├── package.json                   # Dependencies and scripts
├── webpack.config.js              # Build configuration
└── tsconfig.json                  # TypeScript configuration
```

### 2. **Core Components & Implementation Strategy**

#### **A. TypeScript Interfaces** (`src/types/interfaces.ts`)
```typescript
// Action types for the editing plan
export interface EditAction {
  action: 'modify' | 'delete' | 'insert' | 'move';
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
```

#### **B. Service Layer Architecture**

**1. Gemini Service** (`src/services/gemini-service.ts`)
- Handles all API communication
- Implements retry logic
- Manages API key (hardcoded for PoC)
- Validates responses

**2. Document Service** (`src/services/document-service.ts`)
- Extracts document text
- Creates paragraph reference snapshots
- Applies changes with Track Changes
- Validates document size limits

**3. Prompt Service** (`src/services/prompt-service.ts`)
- Loads prompt templates from files
- Performs template substitution
- Manages prompt variations

**4. Validation Service** (`src/services/validation-service.ts`)
- Validates JSON responses
- Checks action bounds
- Enforces action limits

#### **C. Main Application Logic** (`src/taskpane/taskpane.ts`)
- Orchestrates the two-pass workflow
- Manages UI state updates
- Handles error scenarios
- Coordinates all services

---

## Implementation Strategy: Most Efficient Approach

### **Phase 1: Foundation Setup (Day 1)**
**Goal**: Get development environment ready and basic project structure working

**Prerequisites**:
- Docker and Docker Compose installed
- Doppler CLI installed and authenticated
- Gemini API key added to Doppler secrets

**Tasks**:
1. **Setup Development Environment**
   ```bash
   # Start the secure development environment
   ./dev-start.sh
   ```
   - This automatically handles Doppler token generation and injection
   - Creates isolated Docker environment with all tools pre-installed
   - Provides secure access to secrets without exposing them

2. **Generate Office Add-in scaffold** (inside container)
   ```bash
   # Inside the development container:
   ./generate-project.sh
   ```
   - Automatically runs `yo office` with correct parameters
   - Project type: Office Add-in Task Pane project
   - Script type: TypeScript
   - Name: Word-Review-Add-in
   - Office client: Word

3. **Verify Environment Setup**
   ```bash
   # Test secret access inside container
   doppler run -- printenv | grep GEMINI_API_KEY
   
   # Check development tools
   node --version
   npm --version
   yo --version
   ```

4. **Set up basic project structure** (inside container)
   - Create `src/services/` directory
   - Create `src/types/` directory  
   - Create `src/prompts/` directory

5. **Create TypeScript interfaces**
   - Define all interfaces in `src/types/interfaces.ts`
   - Export for use across services

6. **Implement basic UI with status updates**
   - Update `taskpane.html` per specification
   - Add basic CSS styling
   - Implement status update functions

**Deliverable**: 
- ✅ Secure development environment operational
- ✅ Secret management verified and working
- ✅ Working skeleton add-in that loads in Word with basic UI

---

### **Phase 2: Core Services (Day 2)**
**Goal**: Build the foundation services without external dependencies

**Tasks**:
1. **Build Prompt Service** (simplest, no external dependencies)
   ```typescript
   class PromptService {
     async loadPrompt(filename: string): Promise<string>
     substituteTemplate(template: string, data: Record<string, string>): string
   }
   ```

2. **Build Document Service** (Office.js integration)
   ```typescript
   class DocumentService {
     async extractDocumentText(): Promise<string>
     async createParagraphSnapshot(): Promise<Word.Paragraph[]>
     async getWordCount(): Promise<number>
     validateDocumentSize(wordCount: number): boolean
   }
   ```

3. **Build Validation Service** (pure logic)
   ```typescript
   class ValidationService {
     validateJsonResponse(response: string): EditAction[]
     validateActionBounds(actions: EditAction[], paragraphCount: number): boolean
     validateActionLimits(actions: EditAction[]): boolean
   }
   ```

4. **Create prompt template files**
   - `src/prompts/pass1_strategy_prompt.md`
   - `src/prompts/pass2_execution_prompt.md`
   - Copy exact prompts from technical specification

**Deliverable**: Core services implemented and unit testable

---

### **Phase 3: API Integration (Day 3)**
**Goal**: Integrate with Gemini API using secure Doppler-managed secrets

**Tasks**:
1. **Build Gemini Service** with secure API key management
   ```typescript
   class GeminiService {
     private getAPIKey(): string {
       // In development: secrets injected via Doppler
       // API key automatically available via environment
       const apiKey = process.env.GEMINI_API_KEY;
       if (!apiKey) throw new Error('GEMINI_API_KEY not found');
       return apiKey;
     }
     
     async callGeminiAPI(prompt: string, retryCount: number = 1): Promise<string>
     private async makeAPIRequest(prompt: string): Promise<GeminiResponse>
     private extractTextFromResponse(response: GeminiResponse): string
   }
   ```

2. **Implement error handling**
   - Network timeout handling
   - API key validation
   - Rate limiting handling
   - Invalid response handling

3. **Test API integration with sample data**
   ```bash
   # Inside development container:
   doppler run -- node -e "console.log(process.env.GEMINI_API_KEY)"
   ```
   - Create test prompts
   - Verify JSON response parsing
   - Test retry logic with mock failures

**Deliverable**: 
- ✅ Working API integration with robust error handling
- ✅ Secure secret management verified in development
- ✅ No hardcoded API keys anywhere in codebase

---

### **Phase 4: Workflow Integration (Day 4)**
**Goal**: Implement the complete two-pass workflow

**Tasks**:
1. **Integrate two-pass workflow**
   ```typescript
   class WorkflowOrchestrator {
     async executePass1(documentText: string): Promise<EditAction[]>
     async executePass2(actions: EditAction[], paragraphs: Word.Paragraph[]): Promise<void>
   }
   ```

2. **Implement phased execution**
   - Phase A: Modifications
   - Phase B: Insertions  
   - Phase C: Deletions & Moves (in reverse order)

3. **Add comprehensive error handling**
   - Handle failures at each phase
   - Provide rollback capabilities
   - Clear error messaging to user

4. **Test with real documents**
   - Test with various document sizes
   - Test with different document structures
   - Verify Track Changes integration

**Deliverable**: Complete working two-pass system

---

### **Phase 5: Polish & Testing (Day 5)**
**Goal**: Finalize the PoC for demonstration

**Tasks**:
1. **UI improvements and status messages**
   - Implement all status messages from specification
   - Add progress indicators
   - Improve error message display

2. **Edge case handling**
   - Empty documents
   - Very large documents (>50k words)
   - Documents with no paragraphs
   - Network connectivity issues

3. **Performance optimization**
   - Optimize document processing
   - Minimize API calls
   - Improve response time

4. **Comprehensive testing**
   - Test complete workflow end-to-end
   - Test error scenarios
   - Test with different document types
   - Verify sideloading process

**Deliverable**: Production-ready PoC for demonstration

---

## Development Workflow Strategy

### **1. Docker-First Development**
```bash
# All development happens inside secure containers
./dev-start.sh                    # Start development environment
./generate-project.sh             # Create add-in project (inside container)

# Inside container - all tools available:
npm install                       # Install dependencies
npm start                         # Start development server
doppler run -- npm test          # Run tests with secrets
```
- Consistent environment across all machines
- Automatic secret injection via Doppler
- No local Node.js installation required
- Volume mounting preserves code changes

### **2. Secure Secret Management**
```bash
# Development secrets automatically available
doppler run -- node -p "process.env.GEMINI_API_KEY"

# No manual environment file management
# No risk of committing secrets to git
# Automatic token cleanup on exit
```
- Doppler handles all API keys and secrets
- Temporary service tokens for containers
- Automatic revocation on environment exit
- Fallback to .env file if Doppler unavailable

### **3. Start with Secure Mock Data**
```typescript
// Example: Start with mock data but secure API ready
class GeminiService {
  private mockMode = process.env.NODE_ENV === 'development_mock';
  
  async callGeminiAPI(prompt: string): Promise<string> {
    if (this.mockMode) {
      return this.getMockResponse();
    }
    // Real API call with securely injected key
    return this.makeSecureAPICall(prompt);
  }
}
```
- Begin with mock responses for faster development
- Real API integration ready from day one
- Easy toggle between mock and real data
- Faster debugging and iteration

### **4. Service-First Development**
- Build each service independently inside containers
- Unit test each service in isolation
- Use dependency injection for easier testing
- All secrets managed centrally via Doppler
- Easier to debug and maintain

### **3. Incremental Integration**
- Start with Pass 1 only (strategy generation)
- Add Pass 2 once Pass 1 is stable
- Add phased execution last
- Test each integration point thoroughly

### **4. Error Handling Strategy**
- Build error handling into each service from the start
- Use TypeScript for compile-time error prevention
- Implement user-friendly error messages
- Always provide a path forward for the user

---

## Key Implementation Decisions

### **1. Office.js API Strategy**
```typescript
// Always use Word.run() for document operations
await Word.run(async (context) => {
  // Load required objects
  const paragraphs = context.document.body.paragraphs;
  paragraphs.load("text");
  
  // Sync to load data
  await context.sync();
  
  // Perform operations
  // ... document manipulation code ...
  
  // Sync to apply changes
  await context.sync();
});
```

### **2. State Management**
- Keep application state simple and centralized
- Use immutable paragraph references (never update the original snapshot)
- Clear state between operations to prevent memory leaks
- Store only essential state in memory

### **3. Error Boundaries**
```typescript
try {
  await this.executeWorkflow();
} catch (error) {
  this.handleError(error);
  this.updateStatus("Error occurred. Please try again.");
}
```
- Wrap each major operation in try-catch
- Provide specific error messages for each failure type
- Always allow user to retry operations
- Log errors for debugging (development only)

### **4. Performance Considerations**
- Load prompts once at startup and cache them
- Cache document snapshots during operation
- Use background processing for API calls when possible
- Minimize Office.js API calls by batching operations

---

## Testing Strategy

### **1. Development Testing**
- **Unit Tests**: Test each service independently with mock data
- **Integration Tests**: Test service interactions
- **Mock Data**: Use predefined responses for faster iteration
- **Error Scenarios**: Explicitly test each error condition

### **2. Integration Testing**
- **Complete Workflow**: Test end-to-end with sample documents
- **Edge Cases**: Empty documents, very large documents, unusual formatting
- **Network Scenarios**: Test with slow/failing network connections
- **Office.js Integration**: Test all Word API interactions

### **3. User Testing**
- **Real Documents**: Test with actual legal documents
- **Track Changes**: Verify all changes appear correctly in Word
- **Sideloading**: Test installation process on clean machines
- **User Experience**: Verify status messages and error handling

---

## Deployment Strategy

### **1. Development Environment**
```bash
# Start secure development environment
./dev-start.sh

# Inside container - all tools pre-configured:
npm start                         # Development server (localhost:3000)
npm run dev                       # Watch for changes
npm test                          # Run tests

# Sideload manifest for testing
cp manifest.xml ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/
```
- Dockerized environment with consistent tooling
- Automatic secret injection via Doppler
- Hot reload for faster development iteration
- VS Code debugging support with Office Add-in debugger extension

### **2. Secret Management Across Environments**
```bash
# Development (automatic via dev-start.sh)
doppler run -- npm start

# Staging (service tokens)
DOPPLER_TOKEN=$STAGING_TOKEN npm start

# Production (service tokens)
DOPPLER_TOKEN=$PRODUCTION_TOKEN npm run build
```
- Environment-specific Doppler configurations
- No secrets in container images or code
- Secure token-based deployment
- Audit trail for all secret access

### **3. PoC Deployment**
- **Package**: Create standalone sideload-able add-in package
- **Instructions**: Include clear step-by-step installation guide
- **Sample Documents**: Provide test documents for demonstration
- **Documentation**: Include troubleshooting guide for common issues

### **4. Production Considerations** (Future)
- Office Store submission process
- Code signing for security
- Centralized deployment for organizations
- Update mechanism for prompt improvements
- Production Doppler configuration with service tokens

---

## Risk Mitigation

### **1. Technical Risks**
- **API Changes**: Use versioned Gemini API endpoints
- **Office.js Changes**: Pin Office.js version in manifest
- **Browser Compatibility**: Test in multiple browsers/Word versions
- **Performance**: Implement timeouts and progress indicators

### **2. User Experience Risks**
- **Complex Documents**: Implement document complexity detection
- **Large Documents**: Add document size warnings and chunking
- **Network Issues**: Provide offline mode or clear error messages
- **Learning Curve**: Include comprehensive help documentation

### **3. Security Risks**
- **API Keys**: Implement secure key management (future enhancement)
- **Document Privacy**: Clear data handling policies
- **Cross-Site Scripting**: Sanitize all user inputs and API responses
- **Data Transmission**: Use HTTPS for all communications

---

## Success Criteria

### **1. Functional Requirements**
- ✅ Two-pass workflow operates correctly
- ✅ Track Changes integration works seamlessly  
- ✅ All four action types (modify, delete, insert, move) work
- ✅ Error handling prevents system crashes
- ✅ Status updates keep user informed

### **2. Performance Requirements**
- ✅ Documents under 10,000 words process in under 2 minutes
- ✅ User interface remains responsive during processing
- ✅ Memory usage stays reasonable during operation
- ✅ Network timeouts are handled gracefully

### **3. Quality Requirements**
- ✅ No data loss during processing
- ✅ All changes are reversible through Track Changes
- ✅ Error messages are clear and actionable
- ✅ Add-in loads and functions reliably

---

## Next Steps

1. **Review this overview** and confirm the approach
2. **Set up development environment** with required tools
3. **Begin Phase 1** with project scaffolding
4. **Establish testing procedures** early in development
5. **Plan regular review checkpoints** for each phase

This systematic approach ensures we build a robust, maintainable PoC that demonstrates the core functionality while laying the groundwork for future enhancements.
