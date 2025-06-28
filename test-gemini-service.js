// Comprehensive test for the GeminiService TypeScript class
import { GeminiService } from './addin-project/src/services/gemini-service.js';

console.log('🧪 Testing GeminiService TypeScript class...\n');

async function testGeminiService() {
  try {
    // Initialize service
    const geminiService = new GeminiService();
    
    // Test configuration
    console.log('📋 Configuration check:');
    const config = geminiService.getConfigInfo();
    console.log(`  - Has API key: ${config.hasApiKey}`);
    console.log(`  - Model: ${config.modelName}`);
    console.log(`  - Base URL: ${config.baseUrl}\n`);
    
    if (!config.hasApiKey) {
      throw new Error('API key not found');
    }
    
    // Test connection
    console.log('🔌 Testing connection...');
    const connectionResult = await geminiService.testConnection();
    
    if (connectionResult) {
      console.log('✅ Connection test passed\n');
    } else {
      throw new Error('Connection test failed');
    }
    
    // Test actual API call
    console.log('🤖 Testing AI response...');
    const testPrompt = 'Explain in one sentence what a Word document add-in is.';
    const response = await geminiService.callGeminiAPI(testPrompt, 2);
    
    console.log('📝 AI Response:');
    console.log(`  "${response}"\n`);
    
    if (response && response.length > 10) {
      console.log('✅ API call test passed');
    } else {
      throw new Error('Response too short or empty');
    }
    
    console.log('\n🎉 All GeminiService tests PASSED!');
    
  } catch (error) {
    console.error('\n❌ GeminiService test failed:', error.message);
    process.exit(1);
  }
}

testGeminiService();
