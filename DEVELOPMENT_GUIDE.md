# Development Quick Reference

## Essential Commands

### Start Development
```bash
./dev-start.sh                 # Start secure development environment
```

### Inside Container
```bash
./generate-project.sh          # Create Office Add-in project
npm start                      # Start development server
doppler run -- npm test       # Run tests with secrets
exit                          # Exit and cleanup tokens
```

### Secret Management
```bash
doppler secrets set GEMINI_API_KEY=your_key    # Set API key
doppler secrets get GEMINI_API_KEY             # Verify API key
doppler run -- printenv | grep GEMINI         # Test in container
```

## File Structure (Generated)
```
Word-Review-Add-in/
├── src/
│   ├── taskpane/
│   │   ├── taskpane.html      # Main UI
│   │   ├── taskpane.css       # Styling
│   │   └── taskpane.ts        # Application logic
│   ├── services/
│   │   ├── gemini-service.ts  # AI API integration
│   │   ├── document-service.ts # Word operations
│   │   ├── prompt-service.ts   # Prompt management
│   │   └── validation-service.ts # Response validation
│   ├── prompts/
│   │   ├── pass1_strategy_prompt.md
│   │   └── pass2_execution_prompt.md
│   └── types/
│       └── interfaces.ts       # TypeScript definitions
├── manifest.xml               # Office Add-in manifest
├── package.json              # Dependencies
├── webpack.config.js         # Build configuration
└── tsconfig.json            # TypeScript configuration
```

## Development Workflow

### Phase 1: Setup (Day 1)
1. `./dev-start.sh` - Start environment
2. `./generate-project.sh` - Create project
3. Verify sideloading in Word
4. Implement basic UI

### Phase 2: Services (Day 2)  
1. Build core services (document, prompt, validation)
2. Create TypeScript interfaces
3. Implement error handling
4. Unit test services

### Phase 3: API Integration (Day 3)
1. Build Gemini service with secure API access
2. Test with mock data first
3. Integrate real API calls
4. Implement retry logic

### Phase 4: Workflow (Day 4)
1. Implement two-pass AI workflow
2. Integrate Track Changes
3. Test complete end-to-end flow
4. Error handling and edge cases

### Phase 5: Polish (Day 5)
1. UI improvements
2. Performance optimization
3. Comprehensive testing
4. Documentation and demo prep

## Testing & Debugging

### Sideload Add-in
```bash
# Copy manifest to Word sideload directory
cp Word-Review-Add-in/manifest.xml \
   ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/

# Restart Word and look for add-in in ribbon
```

### Debug API Calls
```bash
# Inside container - test API access
doppler run -- curl -H "x-goog-api-key: $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Container Operations
```bash
docker-compose ps                    # Check container status
docker-compose logs word-addin-dev   # View container logs
docker-compose down                  # Stop containers
docker-compose build --no-cache      # Rebuild from scratch
```

## Security Checklist

- ✅ Secrets managed via Doppler
- ✅ Temporary tokens auto-revoked
- ✅ No API keys in code or config
- ✅ Non-root container user
- ✅ Environment isolation via Docker
- ✅ Volume mounting for code persistence

## Common Issues

### Doppler Not Working
```bash
doppler logout && doppler login      # Re-authenticate
doppler me                          # Check login status
```

### Container Issues  
```bash
docker system prune -f             # Clean Docker system
./dev-start.sh                     # Restart environment
```

### Word Add-in Not Loading
```bash
ls ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/
# Ensure manifest.xml is present and restart Word
```

---

**Status**: Ready for development! 🚀

Run `./dev-start.sh` to begin coding.
