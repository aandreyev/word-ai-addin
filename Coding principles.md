# Coding Principles

These principles are to be adopted in all AI assisted code development for this project.

## Environment Isolation & Consistency

Always develop in a virtual environment. Set up the development environment as close as possible to deploy environment, so that changes are minimized. Use Docker containers when possible to ensure complete environment isolation and deployment consistency.

**Implementation**: Our development environment uses Docker containers with volume mounting for code persistence. The `dev-start.sh` script creates an isolated, reproducible environment that works identically across all machines.

## Secure Secret Management

Use Doppler for all secrets and environment variable management. Never commit API keys, tokens, or other sensitive configuration to version control. Integrate Doppler into the development environment so secrets are managed consistently across all machines and deployment environments.

**Implementation**: 
- All secrets managed through Doppler service
- Temporary service tokens automatically generated and revoked
- No secrets ever stored in code, containers, or configuration files
- Automatic fallback to `.env` file for local development if needed

## Cross-Machine Compatibility

The development of this application will take place on a couple of different machines and managed through GitHub. Always set up the environment using files that can be executed on different machines. Consider deployment architecture early - some applications (like web apps) can use the same Docker image for development and production, while others (like Office add-ins) may need hybrid approaches where development uses Docker but production deployment differs.

**Implementation**:
- `setup-environment.sh`: Builds Docker environment on any machine
- `dev-start.sh`: Starts development with secure secret injection
- `generate-project.sh`: Creates Office Add-in project with consistent configuration
- All scripts tested on macOS and designed for cross-platform compatibility

## Incremental Development

Do each step in small increments, and seek review and confirmation from me before proceeding. Do not provide long lists of suggestions or changes that I may wish to comment on and get lost in. Keep the steps small.

## Docker Best Practices

- Use official base images (node:18-alpine)
- Create non-root users in containers for security
- Use volume mounting for code persistence
- Expose only necessary ports
- Include all development tools in the container image

## Doppler Integration Patterns

- Generate temporary service tokens with limited lifetime (15 minutes)
- Automatically revoke tokens on development session exit
- Use `doppler run --` prefix for commands requiring secrets
- Implement graceful fallback to `.env` files for offline development
- Never store Doppler tokens in persistent storage

## Office Add-in Specific Practices

- Use TypeScript for better type safety and Office.js integration
- Store prompts as external files for easy iteration
- Implement proper error boundaries for Office.js API calls
- Use Word's Track Changes feature for all document modifications
- Test sideloading process regularly during development

These principles ensure our development environment is secure, portable, and maintainable across team members and deployment scenarios.

# Interfaces and UI
Keep all interfaces and UI simple and elegant. do not clutter. focus on usability and clarity.
