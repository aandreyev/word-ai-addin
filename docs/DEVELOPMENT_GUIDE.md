````markdown
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

## File Structure (Generated)
```
Word-Review-Add-in/
├── src/
│   ├── taskpane/
│   │   ├── taskpane.html      # Main UI
│   │   ├── taskpane.css       # Styling
│   │   └── taskpane.ts        # Application logic
# Development Quick Reference (short)

This file contains the development quick reference. The original full content was copied from the repository root and is preserved as `DEVELOPMENT_GUIDE.md.orig` in the repository root.

Essential commands and file structure are available in the original file backup. Use the README index in `docs/index.md` to navigate.
│   ├── prompts/
