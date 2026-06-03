const express = require('express');
const cors = require('cors');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE_NAME || '';

const AIRTABLE_CONFIGURED = !!(AIRTABLE_API_KEY && AIRTABLE_BASE_ID && AIRTABLE_TABLE);

if (!AIRTABLE_CONFIGURED) {
  console.warn('⚠️ Variables Airtable manquantes (AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME).');
  console.warn('   Les endpoints /api/airtable retourneront une erreur 503.');
  console.warn('   Configurez ces variables dans les environment settings de Faable.');
}

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN || false)
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    airtable: AIRTABLE_CONFIGURED ? 'configured' : 'not_configured',
  });
});

app.get('/api/airtable', async (req, res) => {
  if (!AIRTABLE_CONFIGURED) {
    return res.status(503).json({
      error: 'Service Airtable non configuré',
      message: 'Les variables AIRTABLE_API_KEY, AIRTABLE_BASE_ID et AIRTABLE_TABLE_NAME doivent être définies.',
    });
  }

  try {
    const options = {
      hostname: 'api.airtable.com',
      path: `/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      },
    };

    const airtableResponse = await new Promise((resolve, reject) => {
      const reqHttps = https.request(options, (airtableRes) => {
        let data = '';
        airtableRes.on('data', (chunk) => { data += chunk; });
        airtableRes.on('end', () => {
          try {
            resolve({ status: airtableRes.statusCode, body: JSON.parse(data) });
          } catch (e) {
            reject(new Error('Réponse Airtable invalide'));
          }
        });
      });
      reqHttps.on('error', reject);
      reqHttps.end();
    });

    res.status(airtableResponse.status).json(airtableResponse.body);
  } catch (error) {
    console.error('Erreur proxy Airtable:', error.message);
    res.status(500).json({
      error: 'Erreur lors de la récupération des données Airtable',
      details: error.message,
    });
  }
});

app.get('/api/airtable/:recordId', async (req, res) => {
  if (!AIRTABLE_CONFIGURED) {
    return res.status(503).json({
      error: 'Service Airtable non configuré',
      message: 'Les variables AIRTABLE_API_KEY, AIRTABLE_BASE_ID et AIRTABLE_TABLE_NAME doivent être définies.',
    });
  }

  const recordId = req.params.recordId.replace(/[^a-zA-Z0-9]/g, '');
  if (!recordId) return res.status(400).json({ error: 'ID invalide' });

  try {
    const options = {
      hostname: 'api.airtable.com',
      path: `/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}/${recordId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      },
    };

    const airtableResponse = await new Promise((resolve, reject) => {
      const reqHttps = https.request(options, (airtableRes) => {
        let data = '';
        airtableRes.on('data', (chunk) => { data += chunk; });
        airtableRes.on('end', () => {
          try {
            resolve({ status: airtableRes.statusCode, body: JSON.parse(data) });
          } catch (e) {
            reject(new Error('Réponse Airtable invalide'));
          }
        });
      });
      reqHttps.on('error', reject);
      reqHttps.end();
    });

    res.status(airtableResponse.status).json(airtableResponse.body);
  } catch (error) {
    console.error('Erreur proxy Airtable:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération du record' });
  }
});

const path = require('path');
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('============================================');
  console.log('  🚀 STAGEFLOW BACKEND');
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log('============================================');
  console.log('\n📌 Endpoints disponibles:');
  console.log(`  • GET http://localhost:${PORT}/api/health`);
  console.log(`  • GET http://localhost:${PORT}/api/airtable`);
  console.log(`  • GET http://localhost:${PORT}/api/airtable/:recordId`);
  if (!AIRTABLE_CONFIGURED) {
    console.log('\n⚠️  Airtable non configuré — définissez les variables env sur Faable.');
  }
});
