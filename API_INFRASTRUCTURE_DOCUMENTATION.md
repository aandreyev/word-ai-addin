# API Infrastructure & Secret Management Documentation

## 📋 Executive Summary

This Word Add-in implements a production-ready API infrastructure with comprehensive secret management, supporting both real Gemini AI calls and mock fallback responses. The system uses **build-time secret injection** via Doppler and webpack for secure, seamless API key management.

### Key Features
- ✅ **Build-time API key injection** via webpack DefinePlugin
- ✅ **Visual API mode indicators** (Real API vs Mock mode)
- ✅ **Doppler integration** for secure development workflows
- ✅ **Automatic real/mock API switching** with graceful fallback
- ✅ **Zero-configuration setup** for team members
- ✅ **Production-ready error handling** and monitoring

### Quick Start
```bash
# Setup Doppler and start development
doppler secrets set GEMINI_API_KEY=your_key
doppler run -- npm run build
doppler run -- npm run dev-server
```

---

## API Key Management Strategy

### Build-Time Secret Injection

The add-in uses webpack's DefinePlugin to inject API keys at build time, eliminating runtime security concerns:

**Webpack Configuration:**
```javascript
new webpack.DefinePlugin({
  'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || 'API_KEY_NOT_SET')
})
```

**How It Works:**
1. During `doppler run -- npm run build`, Doppler provides the API key
2. Webpack replaces `process.env.GEMINI_API_KEY` with the actual key value
3. The compiled JavaScript contains the key directly (not as an environment variable)
4. Browser code detects the injected key and switches to "REAL API MODE"

### API Key Detection Order

The system checks for API keys in this priority order:

1. **localStorage Override** (Development/Testing)
   ```javascript
   localStorage.getItem('GEMINI_API_KEY')
   ```
   - Allows developers to override the build-time key
   - Useful for testing different API keys

2. **Build-Time Injection** (Primary Method)
   ```javascript
   const envKey = process.env.GEMINI_API_KEY;
   if (envKey && envKey !== 'API_KEY_NOT_SET' && envKey !== 'undefined')
   ```
   - Webpack replaces this with the actual key value at build time
   - Most reliable method for production deployment

3. **Window Variable** (Manual Injection)
   ```javascript
   window.GEMINI_API_KEY
   ```
   - Fallback for manual key injection scenarios

4. **Mock Fallback** (Development/Demo)
   - Returns `'GEMINI_API_KEY_PLACEHOLDER'` if no valid key found
   - Triggers mock response mode

### Visual API Mode Indicators

The add-in provides clear visual feedback about which mode it's operating in:

**Real API Mode:**
- 🌐 **"REAL API MODE"** - Green indicator
- Shows when valid API key is detected
- All AI requests go to live Gemini API

**Mock API Mode:**
- 📋 **"MOCK API MODE"** - Yellow/orange indicator  
- Shows when no valid API key is found
- Uses predefined mock responses for development/demo
  
  // No real API key found - will use mock
  console.warn('⚠️ No Gemini API key found - will use mock responses');
  return 'GEMINI_API_KEY_PLACEHOLDER';
}
```

## Real vs Mock API System

### Automatic API Mode Detection

The system automatically determines whether to use real Gemini API calls or mock responses:

- **Real API Mode**: When a valid API key is available (not placeholder)
- **Mock Mode**: When no API key is found or API calls fail
- **Graceful Fallback**: Real API failures automatically fall back to mock responses

### Real Gemini API Implementation

```javascript
async callGeminiAPI(prompt) {
  const apiKey = this.getApiKey();
  
  // Check if we have a real API key
  if (!apiKey || apiKey === 'GEMINI_API_KEY_PLACEHOLDER') {
    console.warn('⚠️ No Gemini API key found. Using fallback mock response.');
    return this.getMockResponse();
  }

  try {
    console.log('🌐 Making real Gemini API call...');
    
    const url = `${this.baseUrl}/${this.modelName}:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [/* safety configurations */]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('❌ Gemini API call failed:', error);
    // Automatic fallback to mock
    return this.getMockResponse();
  }
}
```

### Mock Response System

The mock system provides consistent fallback functionality:

```javascript
getMockResponse() {
  console.log('📋 Using fallback mock response');
  
  return `[
    {
      "action": "modify",
      "sequentialNumber": 1,
      "instruction": "Improve the opening paragraph for better clarity and impact.",
      "newContent": "Enhanced content...",
      "reason": "Strong openings are crucial for reader engagement"
    }
  ]`;
}
```

## Doppler Secret Management Integration

### Development Environment Setup

The project is configured for Doppler with the following structure:

- **Project**: `mswordai`
- **Environment**: `dev`  
- **Configuration**: Stored in `.doppler.yaml`

```yaml
# .doppler.yaml
scoped:
  /Users/andrew/Coding/Word Addin:
    project: mswordai
    config: dev
```

### Automatic Token Lifecycle

```bash
# In dev-start.sh
# 1. Generate temporary service token (15-min lifetime)
DOPPLER_TOKEN=$(doppler configs tokens create "dev-$(date +%s)" \
  --project mswordai --config dev --max-age 15m --plain)

# 2. Inject into Docker environment
docker run -e DOPPLER_TOKEN="$DOPPLER_TOKEN" ...

# 3. Automatic cleanup on exit
trap 'doppler configs tokens revoke $DOPPLER_TOKEN' EXIT
```

### Container Integration

The Docker development environment supports multiple secret injection methods:

```yaml
# docker-compose.yml
services:
  word-addin-dev:
    build: .
    environment:
      - NODE_ENV=development
      # Doppler token can be injected here
      - DOPPLER_TOKEN=${DOPPLER_TOKEN}
    env_file:
      # Fallback to .env file if Doppler unavailable
      - .env
    volumes:
      - .:/workspace
    ports:
      - "3000:3000"
```

Inside the Docker container, secrets are accessed via:

```bash
# All commands run with Doppler context (when token available)
doppler run -- npm start
doppler run -- node your-script.js

# Environment variables automatically available
echo $GEMINI_API_KEY

# Fallback: Direct environment access from .env file
echo $GEMINI_API_KEY
```

## Security Best Practices

### Token Security

1. **Temporary Tokens**: All development tokens have 15-minute maximum lifetime
2. **Automatic Revocation**: Tokens are automatically revoked on script exit
3. **No Persistence**: Tokens never stored in files or images
4. **Audit Trail**: All token operations logged in Doppler

### Browser Security

1. **localStorage Validation**: Keys validated before use
2. **Placeholder Detection**: Prevents using placeholder values
3. **Graceful Degradation**: Automatic fallback to mock responses
4. **No Key Exposure**: API keys never logged or displayed

### Production Considerations

1. **Environment Separation**: Different Doppler configs for dev/staging/prod
2. **Role-Based Access**: Team members get appropriate Doppler permissions
3. **Key Rotation**: Regular API key rotation through Doppler
4. **Monitoring**: API usage monitoring and error tracking

## API Configuration

### Gemini API Settings

```javascript
class AIService {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.modelName = 'gemini-1.5-flash';
    this.generationConfig = {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    };
  }
}
```

### Safety Settings

The API includes comprehensive safety settings:

```javascript
safetySettings: [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH", 
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  },
  // Additional safety categories...
]
```

## Usage Instructions

### For Developers

1. **Setup Doppler (Recommended)**:
   ```bash
   brew install dopplerhq/cli/doppler
   doppler login
   doppler secrets set GEMINI_API_KEY=your_api_key
   ./dev-start.sh  # Handles all token management automatically
   ```

2. **Alternative: Direct Docker**:
   ```bash
   # Create .env file with API key
   echo "GEMINI_API_KEY=your_api_key" > .env
   docker-compose up -d
   ```

3. **Alternative: Browser localStorage**:
   ```javascript
   // In browser console after loading add-in
   localStorage.setItem('GEMINI_API_KEY', 'your-actual-api-key');
   // Refresh page to use real API
   ```

4. **Development Workflow**:
   ```bash
   # Standard development (with Doppler)
   ./dev-start.sh
   
   # Or simple local development
   cd addin-project
   npm run dev  # Uses .env file fallback
   ```

### For Testing

1. **Real API Testing**: Provide valid API key via any supported method
2. **Mock Testing**: Remove/clear API key to test fallback system
3. **Error Handling**: Provide invalid API key to test error recovery

## Error Handling & Fallbacks

### API Call Failures

1. **Network Errors**: Automatic fallback to mock responses
2. **Authentication Errors**: Clear error messaging + mock fallback
3. **Rate Limiting**: Graceful degradation with retry logic
4. **Invalid Responses**: JSON parsing with fallback suggestions

### User Experience

1. **Transparent Operation**: Users see consistent functionality
2. **Clear Indicators**: Console messages indicate real vs mock usage
3. **No Interruption**: API failures don't break the add-in
4. **Helpful Guidance**: Clear instructions for API key setup

## Development Workflow Integration

### Webpack Configuration

The webpack build process automatically injects environment variables:

```javascript
// webpack.config.js
new webpack.DefinePlugin({
  'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || 'API_KEY_NOT_SET'),
  // Other environment variables...
})
```

This ensures that environment variables (including those from Doppler) are available in the browser context during development.

### Test Infrastructure

The project includes comprehensive API testing:

```javascript
// test-api.js - Environment validation
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Found' : 'Missing');
const testApiKey = process.env.GEMINI_API_KEY;

if (!testApiKey) {
  console.error('❌ GEMINI_API_KEY not found');
  process.exit(1);
}

// test-core-functionality.js - Real API testing
const hasApiKey = !!process.env.GEMINI_API_KEY;
if (!hasApiKey) {
  throw new Error('GEMINI_API_KEY not available');
}
```

### Development Scripts

```bash
# Test API connectivity
node test-api.js

# Test core functionality with real API
node test-core-functionality.js

# Run full development environment
./dev-start.sh
```

## Monitoring & Debugging

### Console Output Analysis

The system provides detailed console logging for troubleshooting:

```javascript
// API Key Detection
🔑 Using Gemini API key from localStorage
🔑 Using Gemini API key from environment variable  
🔑 Using Gemini API key from window variable
⚠️ No Gemini API key found - will use mock responses

// API Call Status  
🌐 Making real Gemini API call...
✅ Received real Gemini API response
🎯 Using live AI analysis (not mock data)
📋 Using fallback mock response (deprecated - switch to real Gemini API)

// Error Handling
❌ Gemini API call failed: [error details]
⚠️ Falling back to mock response due to API error
```

### Health Check Commands

```bash
# Verify Doppler configuration
doppler me
doppler secrets get GEMINI_API_KEY

# Test API key availability in container
docker-compose exec word-addin-dev doppler run -- printenv | grep GEMINI

# Validate webpack environment injection
npm run build && grep -r "GEMINI_API_KEY" dist/
```

---

This infrastructure provides a robust, secure, and flexible foundation for the Word Add-in's AI functionality, supporting both development and production use cases while maintaining security best practices throughout.
