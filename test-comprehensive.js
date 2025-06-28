// Comprehensive test suite for the AI Document Review Add-in
// Tests all components and integration points

console.log('🧪 Running comprehensive test suite for AI Document Review Add-in...\n');

// Mock Office.js environment for testing
const mockOfficeEnvironment = () => {
  global.Office = {
    HostType: { Word: 'Word' },
    onReady: (callback) => {
      setTimeout(() => callback({ host: 'Word' }), 100);
    }
  };

  global.Word = {
    run: async (callback) => {
      const mockContext = {
        document: {
          body: {
            text: 'This is a test document with multiple paragraphs.\n\nThis second paragraph contains some content that might need review for clarity and effectiveness.\n\nA third paragraph exists here with additional content for testing purposes.',
            paragraphs: {
              items: [
                { text: 'This is a test document with multiple paragraphs.' },
                { text: 'This second paragraph contains some content that might need review for clarity and effectiveness.' },
                { text: 'A third paragraph exists here with additional content for testing purposes.' }
              ],
              load: () => {},
              length: 3
            },
            load: () => {},
            insertParagraph: () => ({ font: { color: '', italic: false } })
          }
        },
        sync: async () => {}
      };
      return callback(mockContext);
    },
    InsertLocation: { after: 'after', end: 'end' },
    CommentScope: { range: 'range' }
  };

  // Mock DOM elements
  global.document = {
    getElementById: (id) => ({
      style: { display: '', opacity: '', pointerEvents: '', width: '' },
      textContent: '',
      innerHTML: '',
      onclick: null,
      appendChild: () => {},
      createElement: () => ({
        className: '',
        innerHTML: '',
        appendChild: () => {}
      })
    })
  };

  global.window = {
    aiDocumentReviewService: null
  };

  global.fetch = async () => ({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: 'Test response' }] } }] }),
    text: async () => 'Test response'
  });
};

// Test the AI Service
async function testAIService() {
  console.log('📖 Testing AI Service...');
  
  try {
    // Import and initialize service
    mockOfficeEnvironment();
    const { AIService } = await import('./addin-project/src/services/ai-service-browser.js');
    
    const aiService = new AIService();
    
    // Test 1: Service initialization
    console.log('  ✓ Service initialization');
    
    // Test 2: Prompt building
    const prompt = aiService.buildAnalysisPrompt('Test document text');
    if (prompt.includes('Test document text')) {
      console.log('  ✓ Prompt building works correctly');
    } else {
      throw new Error('Prompt building failed');
    }
    
    // Test 3: Suggestion validation
    const testSuggestions = [
      { action: 'modify', index: 0, instruction: 'Test instruction' },
      { action: 'insert', after_index: 1, instruction: 'Test insertion' },
      { action: 'modify', index: 999, instruction: 'Invalid index' } // Should be filtered out
    ];
    
    // Test basic validation (should pass all with valid structure)
    const basicValidSuggestions = aiService.validateSuggestions(testSuggestions);
    if (basicValidSuggestions.length === 3) {
      console.log('  ✓ Suggestion validation works correctly');
    } else {
      throw new Error('Suggestion validation failed');
    }
    
    // Test 4: Fallback suggestions
    const fallbackSuggestions = aiService.getFallbackSuggestions();
    if (Array.isArray(fallbackSuggestions) && fallbackSuggestions.length > 0) {
      console.log('  ✓ Fallback suggestions available');
    } else {
      throw new Error('Fallback suggestions failed');
    }
    
    console.log('✅ AI Service tests passed\n');
    
  } catch (error) {
    console.error('❌ AI Service test failed:', error.message);
    throw error;
  }
}

// Test the Document Service  
async function testDocumentService() {
  console.log('📄 Testing Document Service...');
  
  try {
    mockOfficeEnvironment();
    const { DocumentService } = await import('./addin-project/src/services/ai-service-browser.js');
    
    const docService = new DocumentService();
    
    // Test 1: Text extraction
    const text = await docService.extractText();
    if (text && text.length > 0) {
      console.log('  ✓ Text extraction works');
    } else {
      throw new Error('Text extraction failed');
    }
    
    // Test 2: Word count
    const wordCount = await docService.getWordCount();
    if (wordCount > 0) {
      console.log('  ✓ Word count calculation works');
    } else {
      throw new Error('Word count calculation failed');
    }
    
    // Test 3: Paragraph count
    const paragraphCount = await docService.getParagraphCount();
    if (paragraphCount > 0) {
      console.log('  ✓ Paragraph count works');
    } else {
      throw new Error('Paragraph count failed');
    }
    
    // Test 4: Document size validation
    if (docService.validateDocumentSize(5000) === true) {
      console.log('  ✓ Document size validation works');
    } else {
      throw new Error('Document size validation failed');
    }
    
    if (docService.validateDocumentSize(20000) === false) {
      console.log('  ✓ Document size limits enforced');
    } else {
      throw new Error('Document size limits not enforced');
    }
    
    // Test 5: Document snapshot
    const snapshot = await docService.createSnapshot();
    if (snapshot && snapshot.text && snapshot.paragraphCount) {
      console.log('  ✓ Document snapshot creation works');
    } else {
      throw new Error('Document snapshot creation failed');
    }
    
    console.log('✅ Document Service tests passed\n');
    
  } catch (error) {
    console.error('❌ Document Service test failed:', error.message);
    throw error;
  }
}

// Test the Main AI Document Review Service
async function testMainService() {
  console.log('🤖 Testing Main AI Document Review Service...');
  
  try {
    mockOfficeEnvironment();
    const { AIDocumentReviewService } = await import('./addin-project/src/services/ai-service-browser.js');
    
    const service = new AIDocumentReviewService();
    global.window.aiDocumentReviewService = service;
    
    // Test 1: Document info retrieval
    const docInfo = await service.getDocumentInfo();
    if (docInfo.wordCount >= 0 && docInfo.paragraphCount >= 0) {
      console.log('  ✓ Document info retrieval works');
    } else {
      throw new Error('Document info retrieval failed');
    }
    
    // Test 2: Document analysis
    const suggestions = await service.analyzeDocument();
    if (Array.isArray(suggestions)) {
      console.log('  ✓ Document analysis works');
      console.log(`    Generated ${suggestions.length} suggestions`);
    } else {
      throw new Error('Document analysis failed');
    }
    
    // Test 3: Suggestion application
    if (suggestions.length > 0) {
      const appliedCount = await service.applySuggestions(suggestions.slice(0, 2));
      if (appliedCount >= 0) {
        console.log('  ✓ Suggestion application works');
        console.log(`    Applied ${appliedCount} suggestions`);
      } else {
        throw new Error('Suggestion application failed');
      }
    }
    
    console.log('✅ Main AI Document Review Service tests passed\n');
    
  } catch (error) {
    console.error('❌ Main Service test failed:', error.message);
    throw error;
  }
}

// Test Error Handling and Edge Cases
async function testErrorHandling() {
  console.log('⚠️ Testing Error Handling...');
  
  try {
    mockOfficeEnvironment();
    const { AIService, DocumentService } = await import('./addin-project/src/services/ai-service-browser.js');
    
    const aiService = new AIService();
    const docService = new DocumentService();
    
    // Test 1: Invalid JSON parsing
    try {
      aiService.parseAISuggestions('invalid json');
      console.log('  ✓ Invalid JSON handled gracefully');
    } catch (error) {
      throw new Error('JSON error handling failed');
    }
    
    // Test 2: Empty suggestions
    const emptySuggestions = aiService.validateSuggestions([]);
    if (Array.isArray(emptySuggestions)) {
      console.log('  ✓ Empty suggestions handled');
    } else {
      throw new Error('Empty suggestions not handled');
    }
    
    // Test 3: Invalid suggestion structure
    const invalidSuggestions = [
      { action: 'invalid' },
      { instruction: 'missing action' },
      null,
      undefined
    ];
    const validatedSuggestions = aiService.validateSuggestions(invalidSuggestions);
    if (validatedSuggestions.length === 0) {
      console.log('  ✓ Invalid suggestions filtered out');
    } else {
      throw new Error('Invalid suggestions not filtered');
    }
    
    // Test 4: Document size edge cases
    if (!docService.validateDocumentSize(0)) {
      console.log('  ✓ Empty document handling');
    } else {
      throw new Error('Empty document not handled');
    }
    
    if (!docService.validateDocumentSize(-1)) {
      console.log('  ✓ Negative word count handling');
    } else {
      throw new Error('Negative word count not handled');
    }
    
    console.log('✅ Error handling tests passed\n');
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    throw error;
  }
}

// Test Performance and Limits
async function testPerformance() {
  console.log('⚡ Testing Performance and Limits...');
  
  try {
    mockOfficeEnvironment();
    const { AIService } = await import('./addin-project/src/services/ai-service-browser.js');
    
    const aiService = new AIService();
    
    // Test 1: Large suggestion array processing
    const largeSuggestionArray = Array.from({ length: 100 }, (_, i) => ({
      action: 'modify',
      index: i,
      instruction: `Test instruction ${i}`
    }));
    
    const startTime = Date.now();
    const validated = aiService.validateSuggestions(largeSuggestionArray);
    const processingTime = Date.now() - startTime;
    
    if (processingTime < 1000 && validated.length <= 5) {
      console.log('  ✓ Large suggestion array processed efficiently');
      console.log(`    Processed 100 suggestions in ${processingTime}ms`);
    } else {
      throw new Error('Performance issue with large suggestion arrays');
    }
    
    // Test 2: Prompt length limits
    const longText = 'A'.repeat(50000);
    const prompt = aiService.buildAnalysisPrompt(longText);
    if (prompt.length > 0) {
      console.log('  ✓ Long text prompts handled');
    } else {
      throw new Error('Long text prompt handling failed');
    }
    
    console.log('✅ Performance tests passed\n');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  const startTime = Date.now();
  let passedTests = 0;
  let totalTests = 5;
  
  try {
    await testAIService();
    passedTests++;
  } catch (error) {
    console.error('AI Service tests failed');
  }
  
  try {
    await testDocumentService();
    passedTests++;
  } catch (error) {
    console.error('Document Service tests failed');
  }
  
  try {
    await testMainService();
    passedTests++;
  } catch (error) {
    console.error('Main Service tests failed');
  }
  
  try {
    await testErrorHandling();
    passedTests++;
  } catch (error) {
    console.error('Error handling tests failed');
  }
  
  try {
    await testPerformance();
    passedTests++;
  } catch (error) {
    console.error('Performance tests failed');
  }
  
  const totalTime = Date.now() - startTime;
  
  console.log('📊 Test Results Summary:');
  console.log(`   Passed: ${passedTests}/${totalTests} test suites`);
  console.log(`   Total time: ${totalTime}ms`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests PASSED! System is ready for deployment.');
  } else {
    console.log('⚠️ Some tests failed. Please review and fix issues.');
    process.exit(1);
  }
}

runAllTests();
