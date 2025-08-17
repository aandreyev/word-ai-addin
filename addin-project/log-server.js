const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3001; // Port for the log server

app.use(express.json({ limit: '20mb' }));

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
fs.mkdir(logsDir, { recursive: true }).catch(console.error);

// Basic request logger for debugging (origin, method, url, payload size)
app.use((req, res, next) => {
  const origin = req.headers.origin || req.ip || 'unknown';
  const bodySize = req.body ? JSON.stringify(req.body).length : 0;
  console.log(`[log-server] ${new Date().toISOString()} - ${req.method} ${req.url} from ${origin} - body ${bodySize} bytes`);
  next();
});

// Enable CORS for the Office add-in (allow all origins for local dev)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Helper: unified route names so clients can call either /save-log OR /api/save-log
const saveLogHandler = async (req, res) => {
  try {
    const { sessionId, markdown } = req.body;
    
    if (!sessionId || !markdown) {
      console.warn('[log-server] Missing sessionId or markdown in request');
      return res.status(400).json({ error: 'Missing sessionId or markdown content' });
    }

    const filename = `analysis-${sessionId}.md`;
    const filepath = path.join(logsDir, filename);

    await fs.writeFile(filepath, markdown, 'utf8');

    console.log(`[log-server] ✅ Saved log file: ${filename}`);

    res.json({
      success: true,
      filename,
      filepath: filepath,
      message: `Log saved to ${filename}`
    });
  } catch (error) {
    console.error('[log-server] ❌ Error saving log:', error);
    res.status(500).json({ error: 'Failed to save log file' });
  }
};

// Accept both '/save-log' and '/api/save-log' so proxy vs direct calls work
app.post(['/save-log', '/api/save-log'], saveLogHandler);

// List all log files (support both /logs and /api/logs)
const listLogsHandler = async (req, res) => {
  try {
    const files = await fs.readdir(logsDir);
    const logFiles = files.filter(file => file.endsWith('.md'));
    
    const logs = await Promise.all(logFiles.map(async (file) => {
      const filepath = path.join(logsDir, file);
      const stats = await fs.stat(filepath);
      return {
        filename: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    }));
    
    res.json(logs);
  } catch (error) {
    console.error('[log-server] ❌ Error listing logs:', error);
    res.status(500).json({ error: 'Failed to list log files' });
  }
};

app.get(['/logs', '/api/logs'], listLogsHandler);

// Friendly route for common typo or older docs: /save-logs -> show instructions
app.get('/save-logs', (req, res) => {
  console.log('[log-server] Received request to /save-logs - returning help message');
  res.json({
    message: "Did you mean POST /api/save-log ? To save a log POST JSON {sessionId, markdown} to /api/save-log or /save-log",
    example: {
      curl: "curl -X POST http://localhost:3001/api/save-log -H \"Content-Type: application/json\" -d '{\"sessionId\":\"test\",\"markdown\":\"# test\"}'"
    }
  });
});

// Get a specific log file (support /logs/:filename and /api/logs/:filename)
app.get(['/logs/:filename', '/api/logs/:filename'], async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(logsDir, filename);

    const content = await fs.readFile(filepath, 'utf8');

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    console.error('[log-server] ❌ Error reading log file:', error);
    res.status(404).json({ error: 'Log file not found' });
  }
});

// Health check (support both paths)
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', message: 'Log server is running' });
});

// Start the HTTP server
app.listen(port, () => {
  console.log(`[log-server] ✅ Log server listening on http://localhost:${port}`);
  console.log(`[log-server] 📝 Logs will be saved to: ${logsDir}`);
});

module.exports = app;
