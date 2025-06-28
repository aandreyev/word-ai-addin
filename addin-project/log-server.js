const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3001; // Port for the log server

app.use(express.json({ limit: '10mb' }));

// Enable CORS for the Office add-in
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

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
fs.mkdir(logsDir, { recursive: true }).catch(console.error);

// Save analysis log
app.post('/save-log', async (req, res) => {
  try {
    const { sessionId, markdown } = req.body;
    
    if (!sessionId || !markdown) {
      return res.status(400).json({ error: 'Missing sessionId or markdown content' });
    }
    
    const filename = `analysis-${sessionId}.md`;
    const filepath = path.join(logsDir, filename);
    
    await fs.writeFile(filepath, markdown, 'utf8');
    
    console.log(`✅ Saved log file: ${filename}`);
    
    res.json({
      success: true,
      filename,
      filepath: filepath,
      message: `Log saved to ${filename}`
    });
    
  } catch (error) {
    console.error('❌ Error saving log:', error);
    res.status(500).json({ error: 'Failed to save log file' });
  }
});

// List all log files
app.get('/logs', async (req, res) => {
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
    console.error('❌ Error listing logs:', error);
    res.status(500).json({ error: 'Failed to list log files' });
  }
});

// Get a specific log file
app.get('/logs/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(logsDir, filename);
    
    const content = await fs.readFile(filepath, 'utf8');
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
    
  } catch (error) {
    console.error('❌ Error reading log file:', error);
    res.status(404).json({ error: 'Log file not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Log server is running' });
});

// Start the HTTP server
app.listen(port, () => {
  console.log(`✅ Log server listening on http://localhost:${port}`);
  console.log(`📝 Logs will be saved to: ${logsDir}`);
});

module.exports = app;
