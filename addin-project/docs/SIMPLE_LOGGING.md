# Simple Logging System

## How It Works

The add-in saves logs directly to the project directory in `addin-project/logs/` folder. Each analysis creates a markdown file with all the details.

## Quick Start

1. **Start the add-in with logging:**
   ```bash
   cd "/Users/andrew/Coding/Word Addin/addin-project"
   npm run start-with-logs
   ```

2. **Check your logs:**
   - Open Finder and go to: `/Users/andrew/Coding/Word Addin/addin-project/logs/`
   - Or in terminal: `ls -la logs/`

## Log Files

- Files are named: `analysis-[timestamp].md`
- Each file contains:
  - Original document text
  - AI analysis results
  - Suggestions and improvements
  - Application status

## Troubleshooting

### No logs appearing?

1. **Make sure log server is running:**
   ```bash
   npm run log-server
   ```
   Should show: "Log server running on HTTPS port 3001"

2. **Test the log server:**
   ```bash
   curl -k https://localhost:3001/api/health
   ```
   Should return: `{"status":"OK","message":"Log server is running","logsDir":"..."}`

3. **Check if logs directory exists:**
   ```bash
   ls -la addin-project/
   ```
   You should see a `logs/` directory.

4. **SSL Certificate Issues:**
   - The log server generates self-signed certificates automatically
   - If you get SSL errors, make sure OpenSSL is installed: `brew install openssl`
   - The server will fallback to HTTP if HTTPS setup fails

### Manual test

If nothing else works, you can manually test saving a log:

```bash
curl -k -X POST https://localhost:3001/api/save-log \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"manual-test","markdown":"# Manual Test\\n\\nThis is a manual test log."}'
```

Then check: `ls -la logs/`

## Important Notes

- **Always use `npm run start-with-logs`** - this starts both the log server AND the add-in
- Log files are saved immediately when analysis completes
- Files are saved in markdown format for easy reading
- No downloads needed - files are directly in your project folder
