// Simple test for Gemini API integration
// This will verify that our service can connect to the API

console.log('Testing Gemini API integration...');
console.log('Environment check:');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Found' : 'Missing');
console.log('- GEMINI_MODEL:', process.env.GEMINI_MODEL || 'Not set (will use default)');

// Simple test without full TypeScript compilation
const testApiKey = process.env.GEMINI_API_KEY;
if (!testApiKey) {
  console.error('❌ GEMINI_API_KEY not found');
  process.exit(1);
}

// Test API connectivity with a simple fetch
async function testGeminiAPI() {
  try {
    // Use a model that we know exists, defaulting to gemini-1.5-flash if not specified
    let model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    
    // If the configured model is the old 'gemini-pro', use a valid alternative
    if (model === 'gemini-pro') {
      model = 'gemini-1.5-flash';
      console.log('⚠️ Using gemini-1.5-flash instead of deprecated gemini-pro');
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${testApiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Respond with only "API_TEST_SUCCESS" if you can understand this message.'
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API Response received');
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      console.log('📄 Response:', text.trim());
      
      if (text.includes('API_TEST_SUCCESS')) {
        console.log('🎉 Gemini API integration test PASSED!');
      } else {
        console.log('⚠️ API responded but test phrase not found');
      }
    } else {
      console.log('⚠️ Unexpected response format');
    }
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testGeminiAPI();
