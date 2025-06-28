# API Infrastructure Quick Reference

## 🚀 Quick Start Commands

```bash
# Doppler Setup (Recommended - Build-Time Injection)
doppler login
doppler secrets set GEMINI_API_KEY=your_api_key
doppler run -- npm run build
doppler run -- npm run dev-server

# Local Development (Runtime Override)
localStorage.setItem('GEMINI_API_KEY', 'your_key')
# Then refresh the add-in
```

## 🔍 API Mode Detection

### Visual Indicators
- 🌐 **REAL API MODE**: Green indicator, using live Gemini API
- 📋 **MOCK API MODE**: Yellow indicator, using sample responses

### Console Messages
- **Real API**: `"🔑 Using Gemini API key from environment variable"`
- **Real API**: `"🌐 Making real Gemini API call..."`
- **Mock**: `"⚠️ No Gemini API key found - will use mock responses"`

## � Troubleshooting

### API Key Not Working?
1. **Check the visual indicator** at the top of the add-in
2. **Rebuild with Doppler**: `doppler run -- npm run build`
3. **Verify in console**: Look for key detection messages
4. **Check compiled code**: `grep -r "AIzaSy" dist/` should show your key

### API Still Shows Mock Mode?
```bash
# 1. Verify Doppler has the key
doppler secrets get GEMINI_API_KEY --plain

# 2. Rebuild with fresh injection
doppler run -- npm run build

# 3. Check webpack compiled the key
grep -A 5 -B 5 "environment variable" dist/taskpane.js
```

### Common Issues
- **Build without Doppler**: Use `doppler run --` prefix
- **Key not injected**: Webpack DefinePlugin requires rebuild
- **Browser cache**: Hard refresh (Cmd+Shift+R) after rebuild

## 📋 API Key Priority Order

1. **localStorage Override**: `localStorage.getItem('GEMINI_API_KEY')`
2. **Build-Time Injection**: `process.env.GEMINI_API_KEY` (webpack replaced)
3. **Window Variable**: `window.GEMINI_API_KEY`
4. **Fallback**: Mock responses with clear indicators

## 🏗️ Build Process

### With Doppler (Recommended)
```bash
doppler run -- npm run build  # Injects API key at build time
npm run dev-server            # Serves with injected key
```

### Webpack Injection Process
1. Doppler provides `GEMINI_API_KEY` environment variable
2. Webpack DefinePlugin replaces `process.env.GEMINI_API_KEY` with actual value
3. Compiled JavaScript contains the key directly
4. Browser detects key and shows "REAL API MODE"
```

## 🛠️ Debugging Commands

```bash
# Check Doppler status
doppler me
doppler secrets get GEMINI_API_KEY

# Test API connectivity
node test-api.js

# Validate webpack build
npm run build && grep -r "GEMINI_API_KEY" dist/

# Container debugging
docker-compose exec word-addin-dev printenv | grep GEMINI
```

## 📚 Key Files

- `src/services/ai-service-browser.js` - Main API service
- `GEMINI_API_SETUP.md` - User setup guide
- `DOPPLER_SETUP.md` - Doppler configuration
- `API_INFRASTRUCTURE_DOCUMENTATION.md` - Full documentation
- `.doppler.yaml` - Doppler project config
- `docker-compose.yml` - Container setup

## 🔐 Security Checklist

- ✅ API keys never logged or displayed
- ✅ Temporary tokens (15-min max lifetime)
- ✅ Automatic token revocation
- ✅ Graceful degradation on failures
- ✅ No persistent storage of secrets in containers
- ✅ Environment-based configuration separation

## 🧪 Testing Scenarios

1. **No API Key**: Should use mock responses
2. **Valid API Key**: Should use real Gemini API
3. **Invalid API Key**: Should fallback to mock
4. **Network Error**: Should fallback to mock
5. **Doppler Integration**: Should work seamlessly

---

For complete documentation, see `API_INFRASTRUCTURE_DOCUMENTATION.md`
