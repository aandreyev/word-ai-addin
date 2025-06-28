# Word AI Document Review Add-in

A Microsoft Word Add-in powered by Google Gemini AI that provides intelligent document review and editing suggestions using Word's Track Changes feature.

## Quick Start

### Prerequisites
- **Docker** and **Docker Compose** installed
- **Doppler CLI** for secure secrets management (recommended)
- **Microsoft Word** for testing

### 1. Clone and Setup
```bash
git clone <repository-url>
cd Word\ Addin
```

### 2. Configure Secrets (Doppler - Recommended)
```bash
# Install Doppler CLI (if not already installed)
brew install dopplerhq/cli/doppler

# Authenticate with Doppler
doppler login

# Set your Gemini API key
doppler secrets set GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Start Development Environment
```bash
./dev-start.sh
```

This single command will:
- ✅ Check for Doppler authentication
- ✅ Build the Docker development container
- ✅ Generate a temporary Doppler service token
- ✅ Inject secrets securely into the container
- ✅ Start an interactive development shell
- ✅ Automatically revoke the token when you exit

### 4. Create the Add-in Project (Inside Container)
```bash
# Inside the container shell:
./generate-project.sh
```

### 5. Test in Microsoft Word
- Copy the generated `manifest.xml` to Word's sideload directory
- Restart Word and look for the add-in in the ribbon

## Environment Features

### 🔒 Secure Secret Management
- **Doppler Integration**: Industry-standard secrets management
- **Temporary Tokens**: Short-lived tokens automatically revoked
- **Fallback Support**: Automatic fallback to `.env` file if Doppler unavailable
- **Cross-Machine Compatibility**: Same setup works on any machine

### 🐳 Docker Development Environment
- **Isolated Environment**: Complete development stack in containers
- **Consistent Setup**: Same environment across all machines
- **Volume Mounting**: Your code changes persist outside containers
- **Port Forwarding**: Access development servers from host machine

### 🛠 Development Tools
- **Node.js 18**: Latest LTS version
- **TypeScript**: Full TypeScript development support
- **Office Add-in Tools**: Yeoman generator and Office.js APIs
- **Git**: Version control ready
- **Doppler CLI**: Secrets management inside container

## Project Architecture

### Two-Pass AI Workflow
1. **Pass 1**: Document analysis and strategic editing plan generation
2. **Pass 2**: Intelligent execution with structure preservation

### Core Components
- **Gemini Service**: AI API integration with retry logic
- **Document Service**: Word document manipulation via Office.js
- **Prompt Service**: Template-based prompt management
- **Validation Service**: Response validation and safety checks

## File Structure
```
Word-Review-Add-in/
├── src/
│   ├── taskpane/          # UI components
│   ├── services/          # Core business logic
│   ├── prompts/           # AI prompt templates
│   └── types/             # TypeScript interfaces
├── manifest.xml           # Office Add-in manifest
├── Docker/container files # Development environment
├── Scripts/               # Setup and utility scripts
└── Documentation/         # Project documentation
```

## Scripts Overview

### `setup-environment.sh`
- Builds the Docker development environment
- Verifies Docker installation and configuration
- Creates Word sideload directory if needed

### `dev-start.sh`
- **Primary development script**
- Handles Doppler authentication and token management
- Starts Docker containers with secret injection
- Provides interactive development shell

### `generate-project.sh`
- Creates the Office Add-in project structure
- Configures TypeScript and build tools
- Sets up development server configuration

## Security Best Practices

### ✅ What's Secure
- Secrets managed through Doppler, never in code
- Temporary service tokens with automatic revocation
- Environment isolation through Docker containers
- No secrets persisted in container images

### ❌ Never Do This
- Commit API keys to version control
- Use production secrets in development
- Share Doppler tokens manually
- Run with elevated Docker privileges

## Troubleshooting

### Doppler Issues
```bash
# Re-authenticate if needed
doppler logout && doppler login

# Check project access
doppler me

# Test secret access
doppler secrets get GEMINI_API_KEY
```

### Docker Issues
```bash
# Rebuild containers
docker-compose build --no-cache

# Check container status
docker-compose ps

# View container logs
docker-compose logs word-addin-dev
```

### Word Add-in Issues
```bash
# Verify sideload directory
ls ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/

# Check development server
curl http://localhost:3000
```

## Team Onboarding

New team members need to:
1. **Install Docker** and **Doppler CLI**
2. **Get Doppler access** to the `mswordai` project
3. **Clone the repository**
4. **Run `./dev-start.sh`** - that's it!

The environment is designed for zero-configuration setup once Doppler access is granted.

## Next Steps

1. **Review Documentation**: Read the detailed technical specification
2. **Start Development**: Use `./dev-start.sh` to begin coding
3. **Test Frequently**: Sideload and test in Word regularly
4. **Follow Principles**: Maintain small incremental changes

## Documentation

- [Project Overview](Project%20Overview.md) - Detailed architecture and implementation plan
- [Tech Specification](Tech%20Specification.md) - Complete technical requirements
- [Doppler Setup](DOPPLER_SETUP.md) - Detailed secrets management guide
- [Coding Principles](Coding%20principles.md) - Development best practices
- [Future Enhancements](Future%20Enhancements.md) - Planned improvements

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the detailed documentation files
3. Verify Doppler and Docker setup
4. Test with a minimal reproduction case

---

**Status**: Development environment ready ✅ | Secret injection verified ✅ | Ready for add-in implementation 🚀
