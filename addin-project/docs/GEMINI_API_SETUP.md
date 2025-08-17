# Gemini API Setup Guide

## 🚀 **Switching from Mock Data to Real AI Analysis**

The Word add-in now supports real Gemini AI analysis! Follow these steps to enable it:

## 📋 **Setup Steps:**

### 1. **Get a Gemini API Key**
- Visit: https://ai.google.dev/
- Sign in with your Google account
- Navigate to "Get API Key" or "Google AI Studio"
- Create a new API key for your project

### 2. **Add API Key to the Add-in**
Once you have your API key, open the Word add-in and run this in the browser console:

```javascript
localStorage.setItem("GEMINI_API_KEY", "your-actual-api-key-here")
```

### 3. **Verify Setup**
- Refresh the Word add-in
- The console should show: "🔑 Using Gemini API key from localStorage"
- When you analyze a document, you'll see: "🌐 Making real Gemini API call..."

## 🔄 **Fallback Behavior**

**Without API Key:**
- Uses safe mock responses (modify + insert operations)
- Console shows: "⚠️ No Gemini API key found. Using fallback mock response."

**With API Key:**
- Makes real calls to Gemini AI
- Gets personalized suggestions based on your document
- Supports all operations: modify, insert, delete, move
- Console shows: "✅ Received real Gemini API response"

## 🛡️ **Safety Features**

- **Automatic Fallback**: If API calls fail, automatically uses mock data
- **Error Handling**: Graceful degradation on network issues
- **Local Storage**: API key stored securely in browser
- **No Server**: Direct browser-to-Gemini communication

## 🧪 **Testing**

1. **Test without API key** - Should work with mock data
2. **Add API key** - Should switch to real AI analysis
3. **Test with invalid key** - Should fallback to mock data gracefully

## 📊 **Console Messages to Look For**

**Mock Mode:**
```
⚠️ No Gemini API key found. Using fallback mock response.
📋 Using fallback mock response (deprecated - switch to real Gemini API)
```

**Real API Mode:**
```
🔑 Using Gemini API key from localStorage
🌐 Making real Gemini API call...
✅ Received real Gemini API response
🎯 Using live AI analysis (not mock data)
```

**Error Fallback:**
```
❌ Gemini API call failed: [error details]
⚠️ Falling back to mock response due to API error
```

---

**Ready to test real AI-powered document analysis!** 🎉
