require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'budget.json');

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'client', 'dist')));

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = require('./data/initialData.json');
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET all data
app.get('/api/data', (req, res) => {
  res.json(readData());
});

// PUT full data (sync)
app.put('/api/data', (req, res) => {
  writeData(req.body);
  res.json({ ok: true });
});

// POST transaction
app.post('/api/transactions', (req, res) => {
  const data = readData();
  const { month, transaction } = req.body;
  if (!data.transactions[month]) data.transactions[month] = [];
  data.transactions[month].push(transaction);
  writeData(data);
  res.json({ ok: true, transaction });
});

// DELETE transaction
app.delete('/api/transactions/:month/:id', (req, res) => {
  const data = readData();
  const { month, id } = req.params;
  if (data.transactions[month]) {
    data.transactions[month] = data.transactions[month].filter(t => t.id !== id);
  }
  writeData(data);
  res.json({ ok: true });
});

// POST income update
app.put('/api/income/:month', (req, res) => {
  const data = readData();
  data.income[req.params.month] = req.body;
  writeData(data);
  res.json({ ok: true });
});

// PUT budget planning
app.put('/api/budget/:month', (req, res) => {
  const data = readData();
  if (!data.budgetPlanning) data.budgetPlanning = {};
  data.budgetPlanning[req.params.month] = req.body;
  writeData(data);
  res.json({ ok: true });
});

// POST receipt OCR via Claude
app.post('/api/ocr', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'Clé API Anthropic non configurée dans le fichier .env' });
  }
  const { imageBase64, mediaType } = req.body;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 }
            },
            {
              type: 'text',
              text: `Analyse ce reçu de caisse et extrais tous les articles achetés.
Retourne UNIQUEMENT un JSON valide avec cette structure exacte (sans markdown, sans texte avant/après):
{
  "store": "nom du magasin",
  "date": "YYYY-MM-DD ou vide si non lisible",
  "total": 0.00,
  "items": [
    {
      "name": "nom de l'article",
      "quantity": 1,
      "unit": "unité (kg, L, sac, pack, boîte, unité, etc.)",
      "unitPrice": 0.00,
      "total": 0.00
    }
  ]
}
Si le prix unitaire n'est pas clairement indiqué, calcule-le à partir du total et de la quantité. Tous les montants en dollars.`
            }
          ]
        }]
      })
    });
    const result = await response.json();
    if (result.error) return res.status(500).json({ error: result.error.message });
    const text = result.content[0].text.trim();
    try {
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) res.json(JSON.parse(match[0]));
      else res.status(500).json({ error: 'Impossible de parser la réponse OCR', raw: text });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h2>Lancez d\'abord: npm run build dans le dossier client</h2>');
  }
});

// Get local network IPs
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) ips.push(alias.address);
    }
  }
  return ips;
}

app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n=========================================');
  console.log('  BUDGET FAMILLE 2026 - Serveur demarre!');
  console.log('=========================================');
  console.log('');
  console.log('  Acces PC (ce ordinateur) :');
  console.log(`  >>> http://localhost:${PORT}`);
  console.log('');
  if (ips.length > 0) {
    console.log('  Acces MOBILE (meme Wi-Fi) :');
    ips.forEach(ip => {
      console.log(`  >>> http://${ip}:${PORT}`);
    });
  } else {
    console.log('  (Aucune interface Wi-Fi detectee)');
  }
  console.log('');
  console.log('  Copiez l\'adresse mobile dans le navigateur');
  console.log('  de votre telephone pour y acceder.');
  console.log('=========================================\n');
});
