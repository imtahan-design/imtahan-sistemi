const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const https = require('https');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 60 * 1000, max: 30 }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasKey: !!process.env.GEMINI_API_KEY });
});

app.post('/api/admin/set-key', (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });
    
    // Runtime update
    process.env.GEMINI_API_KEY = apiKey;
    
    // Optional: Persist to .env file if needed, but for now runtime is enough
    // (User can save it again if server restarts)
    
    res.json({ success: true });
});

function callGemini(apiVer, modelName, payload, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/${apiVer}/models/${modelName}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (resp) => {
      let body = '';
      resp.on('data', (chunk) => {
        body += chunk;
      });
      resp.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

app.post('/api/ai/generate', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key missing' });
  }
  const { apiVer, modelName, contents, generationConfig } = req.body || {};
  if (!apiVer || !modelName || !contents || !Array.isArray(contents)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const payload = {
    contents,
    generationConfig: generationConfig || {}
  };
  try {
    const data = await callGemini(apiVer, modelName, payload, apiKey);
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {});

