const express = require('express');
const cors = require('cors');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

let AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';
let AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';
let AIRTABLE_TABLE = process.env.AIRTABLE_TABLE_NAME || process.env.AIRTABLE_TABLE || '';

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE) {
  try {
    const envFile = require('./env.json');
    if (envFile.AIRTABLE_API_KEY && envFile.AIRTABLE_BASE_ID && envFile.AIRTABLE_TABLE_NAME) {
      AIRTABLE_API_KEY = AIRTABLE_API_KEY || envFile.AIRTABLE_API_KEY;
      AIRTABLE_BASE_ID = AIRTABLE_BASE_ID || envFile.AIRTABLE_BASE_ID;
      AIRTABLE_TABLE = AIRTABLE_TABLE || envFile.AIRTABLE_TABLE_NAME;
      console.log('📄 Configuration chargée depuis env.json');
    }
  } catch (e) {
    console.warn('⚠️ env.json non trouvé ou invalide');
  }
}

const AIRTABLE_CONFIGURED = !!(AIRTABLE_API_KEY && AIRTABLE_BASE_ID && AIRTABLE_TABLE);

const maskKey = (key) => {
  if (!key || key.length < 8) return '(vide)';
  return key.slice(0, 4) + '****' + key.slice(-4);
};

console.log('═══════════════════════════════════════');
console.log('  📋 DIAGNOSTIC AIRTABLE');
console.log(`  AIRTABLE_API_KEY    : ${AIRTABLE_CONFIGURED ? maskKey(AIRTABLE_API_KEY) : '⚠️ NON DÉFINIE'}`);
console.log(`  AIRTABLE_BASE_ID    : ${AIRTABLE_BASE_ID || '⚠️ NON DÉFINI'}`);
console.log(`  AIRTABLE_TABLE_NAME : ${AIRTABLE_TABLE || '⚠️ NON DÉFINI'}`);
console.log(`  NODE_ENV            : ${process.env.NODE_ENV || '(non défini)'}`);
console.log(`  Source              : env vars + .env`);
console.log('═══════════════════════════════════════');

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
    env: {
      hasApiKey: !!AIRTABLE_API_KEY,
      baseId: AIRTABLE_BASE_ID || null,
      tableName: AIRTABLE_TABLE || null,
      nodeEnv: process.env.NODE_ENV || null,
    },
  });
});

function mapAirtableFields(fields, index) {
  const f = fields || {};
  return {
    id: f.id || f.ID || f.Id || index + 1,
    nom: f.Condidat || f.condidat || f.CONDIDAT || f.nom || f.Nom || f.NOM || f.name || f.Name || '',
    filiere: f.Filiere || f.filiere || f.FILIERE || f.filière || f.Filière || '',
    etablissement: f.Etablissement || f.etablissement || f.ETABLISSEMENT || f.établissement || f.Établissement || '',
    telephone: f['Numero Telephone'] || f['numero telephone'] || f['NUMERO TELEPHONE'] || f.telephone || f.Telephone || f.TELEPHONE || '',
    email: f.Email || f.email || f.EMAIL || '',
    debut: f['Date de Debut'] || f['Date de Début'] || f['date de debut'] || f.debut || f.Debut || f.DEBUT || '',
    fin: f['Date de Fin'] || f['date de fin'] || f.fin || f.Fin || f.FIN || ''
  };
}

app.get('/api/airtable', async (req, res) => {
  if (!AIRTABLE_CONFIGURED) {
    console.error('❌ GET /api/airtable — Airtable non configuré (variables env manquantes)');
    return res.status(503).json({
      error: 'Service Airtable non configuré',
      message: 'Les variables AIRTABLE_API_KEY, AIRTABLE_BASE_ID et AIRTABLE_TABLE_NAME doivent être définies.',
      diagnostic: {
        hasApiKey: !!AIRTABLE_API_KEY,
        baseIdSet: !!AIRTABLE_BASE_ID,
        tableNameSet: !!AIRTABLE_TABLE,
      },
    });
  }

  console.log(`📡 GET /api/airtable — Appel Airtable API...`);
  console.log(`   URL: https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`);

  try {
    const options = {
      hostname: 'api.airtable.com',
      path: `/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      },
    };

    const { status, body } = await new Promise((resolve, reject) => {
      const reqHttps = https.request(options, (airtableRes) => {
        let raw = '';
        airtableRes.on('data', (chunk) => { raw += chunk; });
        airtableRes.on('end', () => {
          console.log(`   Réponse Airtable — Status: ${airtableRes.statusCode}`);
          try {
            resolve({ status: airtableRes.statusCode, body: JSON.parse(raw), raw });
          } catch (e) {
            console.error(`   ❌ Réponse Airtable invalide (JSON parse error): ${raw.slice(0, 500)}`);
            reject(new Error(`Réponse Airtable invalide: ${raw.slice(0, 200)}`));
          }
        });
      });
      reqHttps.on('error', (err) => {
        console.error(`   ❌ Erreur réseau Airtable: ${err.message}`);
        reject(err);
      });
      reqHttps.end();
    });

    if (status !== 200) {
      console.error(`❌ GET /api/airtable — Airtable a retourné ${status}`);
      console.error(`   Réponse brute: ${JSON.stringify(body).slice(0, 1000)}`);
      return res.status(status).json({
        error: `Airtable API error (${status})`,
        details: body?.error || body,
        diagnostic: {
          httpStatus: status,
          baseId: AIRTABLE_BASE_ID,
          tableName: AIRTABLE_TABLE,
        },
      });
    }

    const records = body.records || [];
    console.log(`   ✅ Airtable a retourné ${records.length} enregistrements bruts`);

    if (records.length > 0) {
      const sampleFields = Object.keys(records[0].fields || {});
      console.log(`   📋 Champs détectés: [${sampleFields.join(', ')}]`);
      console.log(`   🏷️  Premier enregistrement (raw):`, JSON.stringify(records[0].fields));

      const mapped = records
        .map((record, i) => mapAirtableFields(record.fields, i))
        .filter(r => r.nom && r.debut && r.fin);

      const rejetes = records.length - mapped.length;
      if (rejetes > 0) {
        console.warn(`   ⚠️  ${rejetes} enregistrements filtrés (nom, debut ou fin manquants)`);
      }

      console.log(`   ✅ ${mapped.length}/${records.length} enregistrements mappés avec succès`);
      return res.json(mapped);
    }

    console.log('   ℹ️  Airtable a retourné 0 enregistrements');
    res.json([]);
  } catch (error) {
    console.error('❌ GET /api/airtable — Erreur proxy Airtable:', error.message);
    res.status(500).json({
      error: 'Erreur lors de la récupération des données Airtable',
      details: error.message,
      diagnostic: {
        baseId: AIRTABLE_BASE_ID,
        tableName: AIRTABLE_TABLE,
      },
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

    const { status, body } = await new Promise((resolve, reject) => {
      const reqHttps = https.request(options, (airtableRes) => {
        let raw = '';
        airtableRes.on('data', (chunk) => { raw += chunk; });
        airtableRes.on('end', () => {
          try {
            resolve({ status: airtableRes.statusCode, body: JSON.parse(raw), raw });
          } catch (e) {
            reject(new Error(`Réponse Airtable invalide: ${raw.slice(0, 200)}`));
          }
        });
      });
      reqHttps.on('error', reject);
      reqHttps.end();
    });

    if (status !== 200) {
      return res.status(status).json(body);
    }

    const mapped = mapAirtableFields(body.fields, 0);
    res.json(mapped);
  } catch (error) {
    console.error('❌ Erreur proxy Airtable:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération du record' });
  }
});

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
