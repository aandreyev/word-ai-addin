// Simple debug script to test API key detection
console.log('🔍 Debug: Testing API key detection...');

// Test 1: Check environment variables
console.log('1. Environment Variables:');
if (typeof process !== 'undefined' && process.env) {
    console.log('   process.env available:', true);
    console.log('   GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 8) + '...' : 'not found');
    console.log('   GEMINI_MODEL:', process.env.GEMINI_MODEL);
} else {
    console.log('   process.env available:', false);
}

// Test 2: Check localStorage
console.log('2. localStorage:');
const storedKey = localStorage.getItem('GEMINI_API_KEY');
console.log('   GEMINI_API_KEY in localStorage:', storedKey ? storedKey.substring(0, 8) + '...' : 'not found');

// Test 3: Check window variables
console.log('3. Window variables:');
console.log('   window.GEMINI_API_KEY:', window.GEMINI_API_KEY ? window.GEMINI_API_KEY.substring(0, 8) + '...' : 'not found');

// Test 4: Simulate AI service logic
console.log('4. AI Service Logic Simulation:');
function simulateGetApiKey() {
    // First check for API key in localStorage
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    if (storedKey && storedKey !== 'GEMINI_API_KEY_PLACEHOLDER') {
        console.log('   Would use localStorage key');
        return storedKey;
    }
    
    // Check for environment variable (if available in browser context)
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
        console.log('   Would use environment variable key');
        return process.env.GEMINI_API_KEY;
    }
    
    // Check for global variable (can be set via Doppler or other means)
    if (typeof window !== 'undefined' && window.GEMINI_API_KEY) {
        console.log('   Would use window variable key');
        return window.GEMINI_API_KEY;
    }
    
    // No real API key found
    console.log('   No API key found - would use placeholder');
    return 'GEMINI_API_KEY_PLACEHOLDER';
}

const detectedKey = simulateGetApiKey();
console.log('   Final detected key:', detectedKey ? detectedKey.substring(0, 8) + '...' : 'none');

// Test 5: Check if key is valid
const isValid = detectedKey && detectedKey !== 'GEMINI_API_KEY_PLACEHOLDER';
console.log('   Key is valid:', isValid);
console.log('   Would use real API:', isValid);
console.log('   Would use mock API:', !isValid);
