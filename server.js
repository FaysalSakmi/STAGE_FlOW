// ============================================
//   STAGEFLOW — BACKEND SECURISÉ
//   Serveur Node.js/Express qui masque les clés Airtable
// ============================================

const express = require('express');
const cors = require('cors');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURATION
// ============================================
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE_NAME;

// Vérification des variables d'environment
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE) {
  console.error('❌ Erreur: Variables Airtable manquantes dans le fichier .env');
  console.error('   Assure-toi que AIRTABLE_API_KEY, AIRTABLE_BASE_ID et AIRTABLE_TABLE_NAME sont définies.');
  process.exit(1);
}

// ============================================
// MIDDLEWARE
// ============================================

// CORS: Autorise uniquement ton propre site (prod) ou tout (dev)
const corsOptions = {
  // En production, remplace par ton domaine: origin: 'https://monsite.com'
  // Pour le dev local:
  origin: '*', // ⚠️ Change ça en production!
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Logger les requêtes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// --- Récupérer les données Airtable (route sécurisée!) ---
app.get('/api/airtable', async (req, res) => {
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
      const reqHttps = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            reject(new Error('Réponse Airtable invalide'));
          }
        });
      });
      reqHttps.on('error', reject);
      reqHttps.end();
    });

    // Forward la réponse d'Airtable au client
    res.status(airtableResponse.status).json(airtableResponse.body);

  } catch (error) {
    console.error('Erreur proxy Airtable:', error.message);
    res.status(500).json({
      error: 'Erreur lors de la récupération des données Airtable',
      details: error.message,
    });
  }
});

// --- Nouveau: POST pour Airtable ---
app.get('/api/airtable/:recordId', async (req, res) => {
  // Protéger l'ID pour éviter injection
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
      const reqHttps = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
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

// --- Servir le frontend en production ---
// Si tu héberges le site et le backend sur le même serveur
const path = require('path');
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log('============================================');
  console.log('  🚀 STAGEFLOW BACKEND');
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log('============================================');
  console.log('\n📌 Endpoints disponibles:');
  console.log(`   • GET http://localhost:${PORT}/api/health`);
  console.log(`   • GET http://localhost:${PORT}/api/airtable`);
  console.log(`   • GET http://localhost:${PORT}/api/airtable/:recordId`);
  console.log('\n⚠️  En production, changez la config CORS!');
});
