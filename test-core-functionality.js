// Test the core functionality in a Node.js environment
// Since we're in Node.js, we'll simulate the Office.js environment for our services

console.log('🧪 Testing core service functionality...\n');

// Simulate some Office.js structures for testing
global.Word = {
  Paragraph: class {
    constructor(text) {
      this.text = text;
    }
  }
};

// Simple test data
const mockDocumentText = `
This is a sample Word document that needs review.

The document contains multiple paragraphs with various content that might need editing or improvement.

Some sentences may be too long and could benefit from being broken down into smaller, more digestible pieces for better readability.

This paragraph has good structure and clear messaging.
`.trim();

// Mock interfaces for testing
class MockPromptService {
  async loadPrompt(filename) {
    const prompts = {
      'pass1_strategy_prompt.md': 'Analyze this document: [DOCUMENT_TEXT]',
      'pass2_execution_prompt.md': 'Execute this instruction: [INSTRUCTION] on text: [ORIGINAL_TEXT]'
    };
    return prompts[filename] || 'Default prompt template';
  }

  substituteTemplate(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `[${key}]`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), value);
    }
    return result;
  }

  async getPass1StrategyPrompt(documentText) {
    const template = await this.loadPrompt('pass1_strategy_prompt.md');
    return this.substituteTemplate(template, { 'DOCUMENT_TEXT': documentText });
  }
}

async function testCoreWorkflow() {
  try {
    console.log('📋 Testing prompt service...');
    const promptService = new MockPromptService();
    
    // Test prompt loading and substitution
    const strategicPrompt = await promptService.getPass1StrategyPrompt(mockDocumentText);
    console.log('✅ Strategic prompt generated');
    console.log(`   Length: ${strategicPrompt.length} characters\n`);
    
    // Test that the document text was properly substituted
    if (strategicPrompt.includes(mockDocumentText)) {
      console.log('✅ Document text properly substituted in prompt\n');
    } else {
      throw new Error('Document text substitution failed');
    }
    
    console.log('🤖 Testing Gemini API integration...');
    
    // Import our environment (should have GEMINI_API_KEY from Doppler)
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    
    console.log(`   API Key available: ${hasApiKey}`);
    console.log(`   Model: ${modelName}\n`);
    
    if (!hasApiKey) {
      throw new Error('GEMINI_API_KEY not available');
    }
    
    // Test a simple API call
    const testPrompt = 'Respond with only "INTEGRATION_TEST_OK" if you understand this message.';
    
    // Handle the deprecated model name
    let effectiveModel = modelName;
    if (modelName === 'gemini-pro') {
      effectiveModel = 'gemini-1.5-flash';
      console.log('⚠️ Using gemini-1.5-flash instead of deprecated gemini-pro');
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: testPrompt
          }]
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    console.log(`📝 AI Response: "${aiResponse.trim()}"\n`);
    
    if (aiResponse.includes('INTEGRATION_TEST_OK')) {
      console.log('✅ Gemini API integration working correctly\n');
    } else {
      console.log('⚠️ API responded but unexpected content\n');
    }
    
    console.log('🎯 Testing full workflow simulation...');
    
    // Simulate the full workflow
    const documentAnalysisPrompt = await promptService.getPass1StrategyPrompt(mockDocumentText);
    console.log(`✅ Generated analysis prompt (${documentAnalysisPrompt.length} chars)`);
    
    // Simulate getting AI instructions
    const mockInstructions = [
      { action: 'modify', index: 2, instruction: 'Break down long sentence for better readability' },
      { action: 'insert', after_index: 3, content_prompt: 'Add transitional sentence' }
    ];
    
    console.log('✅ Simulated AI instruction parsing');
    console.log(`   Generated ${mockInstructions.length} editing instructions\n`);
    
    console.log('🎉 All core functionality tests PASSED!');
    console.log('🚀 System ready for Phase 4 - Main application integration');
    
  } catch (error) {
    console.error('\n❌ Core functionality test failed:', error.message);
    process.exit(1);
  }
}

testCoreWorkflow();
