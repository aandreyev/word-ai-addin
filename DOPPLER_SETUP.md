# Doppler Secrets Management Guide

This project uses [Doppler](https://doppler.com) for secure secrets management with automatic environment variable injection at build time. Doppler provides a centralized, secure way to manage API keys and build them directly into the Word add-in for seamless operation.

## Quick Setup

### For New Team Members
```bash
# 1. Install Doppler CLI
brew install dopplerhq/cli/doppler

# 2. Authenticate with Doppler
doppler login

# 3. Set your Gemini API key (required)
doppler secrets set GEMINI_API_KEY=your_actual_api_key_here

# 4. Build and run with Doppler
doppler run -- npm run build
doppler run -- npm run dev-server
```

## How It Works

### Build-Time API Key Injection
The Word add-in uses webpack DefinePlugin to inject API keys at build time:

1. **Build Process**: `doppler run -- npm run build` injects secrets into the compiled JavaScript
2. **Webpack Replacement**: `process.env.GEMINI_API_KEY` is replaced with the actual API key value
3. **Browser Detection**: The add-in checks for the injected key and shows "REAL API MODE" vs "MOCK API MODE"
4. **Fallback Support**: If no key is found, automatically falls back to mock responses

### API Key Detection Order
The system checks for API keys in this priority order:
1. **localStorage**: `localStorage.getItem('GEMINI_API_KEY')` (user override)
2. **Environment Variable**: `process.env.GEMINI_API_KEY` (Doppler injected at build time)
3. **Window Variable**: `window.GEMINI_API_KEY` (manual injection)
4. **Fallback**: Mock responses if no valid key found

### Visual Feedback
The add-in shows clear status indicators:
- 🌐 **REAL API MODE**: Valid API key detected, using live Gemini API
- 📋 **MOCK API MODE**: No valid key found, using sample responses

## Environment Variables

### Required Secrets
- `GEMINI_API_KEY`: Your Google Gemini API key for AI functionality

### Build Commands with Doppler
```bash
# Build with secrets injection
doppler run -- npm run build

# Start development server with secrets
doppler run -- npm run dev-server

# Run any npm command with secrets
doppler run -- npm run start
```

### Development Configuration  
- `NODE_ENV`: development
- `PORT`: 3000
- `OFFICE_ADDIN_HOST`: localhost
- `OFFICE_ADDIN_PORT`: 3000
- `LOG_LEVEL`: debug

## Project Configuration

The project is pre-configured with:
- **Project**: `mswordai` 
- **Environment**: `dev`
- **Config**: `dev`

This configuration is stored in `.doppler.yaml` and automatically used.

## Security Features

### Zero-Trust Token Management
- **Temporary Tokens**: 15-minute lifetime, automatically revoked
- **No Persistent Storage**: Tokens never stored in files or containers
- **Automatic Cleanup**: Exit trap ensures tokens are always revoked
- **Audit Trail**: All token creation/revocation logged in Doppler

### Container Security
- **Non-Root User**: All container operations run as `developer` user
- **Environment Isolation**: Secrets only available during active development session
- **No Image Persistence**: Secrets never baked into Docker images
- **Volume Separation**: Code and secrets handled independently

## Advanced Usage

### Manual Token Operations
```bash
# Check current authentication
doppler me

# List active tokens (if you have permission)
doppler configs tokens list --project mswordai --config dev

# Manually create a token (not recommended - use dev-start.sh instead)
doppler configs tokens create "manual-token-$(date +%s)" --project mswordai --config dev --max-age 1h --plain
```

### Environment Variables in Container
```bash
# Inside development container:
echo $DOPPLER_TOKEN                    # Shows the injected token
doppler run -- env | grep GEMINI      # Shows all Gemini-related secrets
doppler run -- node -p "process.env"  # Shows all environment variables
```

### Debugging Secret Access
```bash
# Test secret retrieval
doppler run -- echo "Secret access works: $GEMINI_API_KEY"

# Test API connectivity
doppler run -- curl -H "x-goog-api-key: $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

## Team Onboarding

### For Project Administrators
1. Invite new team members to the `mswordai` Doppler project
2. Grant appropriate permissions (read for developers, read/write for leads)
3. Share the repository URL
4. Provide any additional API keys if needed

### For New Developers
1. **Get Repository Access**: Clone the repository
2. **Install Prerequisites**: Docker and Doppler CLI
3. **Authenticate**: `doppler login`
4. **Verify Access**: `doppler secrets get GEMINI_API_KEY`
5. **Start Development**: `./dev-start.sh`

**That's it!** The environment handles everything else automatically.

## Troubleshooting

### Common Issues

#### "Doppler Error: you must provide a name"
This means the token creation syntax is incorrect. The `dev-start.sh` script handles this automatically.

#### "Failed to generate Doppler token"
```bash
# Check authentication
doppler me

# Verify project access
doppler secrets get NODE_ENV

# Re-authenticate if needed
doppler logout && doppler login
```

#### "Container starts but secrets not available"
```bash
# Check if token was passed correctly
docker-compose exec word-addin-dev echo $DOPPLER_TOKEN

# Test secret access
docker-compose exec word-addin-dev doppler run -- printenv | grep GEMINI
```

#### Environment Falls Back to .env File
```bash
# This is normal if Doppler is not configured
# Check Doppler status
ls -la .doppler.yaml
doppler configure --scope .
```

### Reset Instructions
```bash
# Complete environment reset
docker-compose down
docker system prune -f
doppler logout
doppler login
./dev-start.sh
```

## Production Deployment

For production deployment:

1. Create a production configuration in Doppler
2. Set production-specific secrets
3. Use service tokens for deployment pipelines
4. Never use development secrets in production

## More Information

- [Doppler Documentation](https://docs.doppler.com/)
- [Doppler CLI Reference](https://docs.doppler.com/docs/doppler-cli)
- [Best Practices](https://docs.doppler.com/docs/best-practices)
