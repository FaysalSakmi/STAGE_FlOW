// ============================================
//   STAGEFLOW — PLATEFORME DE SUIVI DES STAGES
//   app.js — Multi-page app avec Dashboard & Statistiques
// ============================================

// ================================================== DATABASE ==================================================

const DATABASE = [
  {
    id: 1,
    nom: "Abderrahim SALMI",
    filiere: "Génie Électrique",
    etablissement: "ENSA",
    telephone: "(098) 764-4629",
    email: "abderrahim.salmi@ensa.ma",
    debut: "2026-02-02",
    fin: "2026-06-15"
  },
  {
    id: 2,
    nom: "Sanae BENNANI",
    filiere: "Ingénierie en Génie Électrique",
    etablissement: "Ecole Nationale des Sciences Appliquées",
    telephone: "(062) 341-7890",
    email: "sanae.bennani@ensa.ma",
    debut: "2026-01-15",
    fin: "2026-04-17"
  },
  {
    id: 3,
    nom: "Youssef ALAOUI",
    filiere: "Génie Informatique",
    etablissement: "École Mohammadia d'Ingénieurs (EMI)",
    telephone: "(053) 210-4455",
    email: "youssef.alaoui@emi.ac.ma",
    debut: "2026-03-01",
    fin: "2026-07-20"
  },
  {
    id: 4,
    nom: "Nadia EL FASSI",
    filiere: "Génie Mécanique",
    etablissement: "École Nationale Supérieure de l'Électronique et de ses Applications (ENSEA)",
    telephone: "(072) 890-1234",
    email: "nadia.el.fassi@ensea.fr",
    debut: "2026-02-20",
    fin: "2026-06-10"
  },
  {
    id: 5,
    nom: "Karim BOUCHIKHI",
    filiere: "Réseaux et Télécommunications",
    etablissement: "Institut National des Postes et Télécommunications (INPT)",
    telephone: "(061) 255-6677",
    email: "karim.bouchikhi@inpt.ac.ma",
    debut: "2026-01-20",
    fin: "2026-05-20"
  },
  {
    id: 6,
    nom: "Saad DOUAR",
    filiere: "Informatique",
    etablissement: "ENSA",
    telephone: "(077) 088-7256",
    email: "saaddouarr@gmail.com",
    debut: "2026-03-27",
    fin: "2026-06-03"
  },
  {
    id: 7,
    nom: "Fatima ZAHRA",
    filiere: "Génie Civil",
    etablissement: "École Hassania des Travaux Publics (EHTP)",
    telephone: "(066) 112-3344",
    email: "fatima.zahra@ehtp.ac.ma",
    debut: "2026-04-01",
    fin: "2026-08-15"
  },
  {
    id: 8,
    nom: "Omar IDRISSI",
    filiere: "Data Science et Intelligence Artificielle",
    etablissement: "INSEA",
    telephone: "(064) 778-9900",
    email: "omar.idrissi@insea.ac.ma",
    debut: "2026-02-15",
    fin: "2026-06-30"
  },
  {
    id: 9,
    nom: "Leila AMRANI",
    filiere: "Génie Biologique",
    etablissement: "Faculté des Sciences et Techniques (FST)",
    telephone: "(063) 445-6678",
    email: "leila.amrani@fst.ac.ma",
    debut: "2026-01-10",
    fin: "2026-05-10"
  },
  {
    id: 10,
    nom: "Hicham BENKIRANE",
    filiere: "Génie Énergie Renouvelable",
    etablissement: "Université Cadi Ayyad (UCA)",
    telephone: "(070) 321-4567",
    email: "hicham.benkirane@uca.ac.ma",
    debut: "2026-03-05",
    fin: "2026-07-25"
  },
  {
    id: 11,
    nom: "Amina EL HAOUARI",
    filiere: "Cloud Computing et Développement Web",
    etablissement: "Université Ibn Tofail (UIT)",
    telephone: "(060) 987-6543",
    email: "amina.haouari@uit.ac.ma",
    debut: "2026-04-10",
    fin: "2026-08-20"
  },
  {
    id: 12,
    nom: "Mehdi TALBI",
    filiere: "Cybersécurité",
    etablissement: "Université Abdelmalek Essaadi (UAE)",
    telephone: "(067) 224-5566",
    email: "mehdi.talbi@uae.ac.ma",
    debut: "2026-02-28",
    fin: "2026-07-15"
  }
];

// ================================================== CONFIG AIRTABLE ==================================================

const CFG = window.APP_CONFIG || {};
const AIRTABLE_API_KEY = CFG.AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = CFG.AIRTABLE_BASE_ID || '';
const AIRTABLE_TABLE = CFG.AIRTABLE_TABLE || 'Table 1';

// ================================================== STATE ==================================================
let currentData = [];
let filtered = [];
let sortKey = null;
let sortDir = 1;
let isCardView = false;
let currentPage = 'dashboard';
let statusFilterValue = 'all';
let isAirtableMode = false;

// Chart instances
let charts = {};

// ================================================== HELPERS ==================================================

function getInitials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function getStatus(debut, fin) {
  const now = new Date();
  const d = new Date(debut);
  const f = new Date(fin);
  if (now < d) return 'upcoming';
  if (now > f) return 'ended';
  return 'active';
}

function statusLabel(s) {
  return { active: 'En cours', upcoming: 'À venir', ended: 'Terminé' }[s];
}

function statusBadge(debut, fin) {
  const s = getStatus(debut, fin);
  return `<span class="badge badge-${s}">${statusLabel(s)}</span>`;
}

function highlight(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark style="background:rgba(232,196,74,0.25);color:var(--accent);border-radius:2px;">$1</mark>');
}

function getDuration(debut, fin) {
  const d = new Date(debut);
  const f = new Date(fin);
  return Math.round((f - d) / (1000 * 60 * 60 * 24));
}

// ================================================== AIRTABLE ==================================================

// URL du backend (change en production)
const API_BASE_URL = window.location.origin; // genre http://localhost:3000

async function loadFromAirtable() {
  // STEP 1: Essayer via le backend sécurisé
  try {
    const response = await fetch(`${API_BASE_URL}/api/airtable`);

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.records) {
      throw new Error('Format de réponse invalide');
    }

    return mapAirtableRecords(data.records);

  } catch (backendError) {
    console.warn('⚠️ Backend indisponible, fallback sur connexion directe...', backendError.message);

    // STEP 2: Fallback direct (⚠️ expose ta clé, réservé au dev local!)
    try {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`Airtable error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return mapAirtableRecords(data.records || []);

    } catch (directError) {
      console.error('❌ Erreur connexion directe Airtable:', directError);
      throw directError;
    }
  }
}

// Map Airtable records -> format app StageFlow
function mapAirtableRecords(records) {
  return records.map((record, index) => {
    const f = record.fields || {};
    return {
      id: f.id || f.ID || index + 1,
      nom: f.nom || f.Nom || f.name || f.Name || '',
      filiere: f.filiere || f.Filiere || f.filière || f.Filière || '',
      etablissement: f.etablissement || f.Etablissement || f.établissement || f.Établissement || '',
      telephone: f.telephone || f.Telephone || f.téléphone || f.Téléphone || '',
      email: f.email || f.Email || '',
      debut: f.debut || f.Debut || f.début || f.Début || '',
      fin: f.fin || f.Fin || ''
    };
  }).filter(r => r.nom && r.debut && r.fin);
}

async function refreshData() {
  const btn = document.getElementById('btnRefresh');
  const originalText = btn ? btn.innerHTML : 'Actualiser';
  
  try {
    // Show loading state
    if (btn) {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1 2.19-6.94"/></svg> Sync...';
      btn.classList.add('loading');
      btn.disabled = true;
    }

    const newData = await loadFromAirtable();
    
    if (newData && newData.length > 0) {
      currentData = newData;
      isAirtableMode = true;
      filtered = [...currentData];
      
      // Force re-render the current page
      if (currentPage === 'dashboard') renderDashboard();
      if (currentPage === 'candidats') { renderCandidats(); }
      if (currentPage === 'statistiques') renderStatistiques();
      
      // Sync indicator
      if (btn) {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Sync OK!';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('loading');
          btn.disabled = false;
        }, 1500);
      }
    } else {
      throw new Error('Aucune donnée reçue d\'Airtable');
    }
  } catch (err) {
    console.error('Failed to load Airtable data:', err);
    if (btn) {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Erreur';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('loading');
        btn.disabled = false;
      }, 3000);
    } else {
      // If no button, log to console only
      console.error('Airtable sync error:', err.message || err);
    }
  }
}

// ================================================== NAVIGATION ==================================================

function navigateTo(page, event) {
  if (event) event.preventDefault();

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

  // Show target page
  const pageEl = document.getElementById(`page_${page}`);
  if (pageEl) {
    pageEl.classList.remove('hidden');
    currentPage = page;
  }

  // Update nav
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const navLink = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');

  // Update footer
  document.getElementById('footerCount').textContent = `${currentData.length} stagiaires enregistrés`;

  // Run page-specific logic
  if (page === 'dashboard') renderDashboard();
  if (page === 'candidats') { renderCandidats(); }
  if (page === 'statistiques') renderStatistiques();
}

// ================================================== KPI SECTION ==================================================

function countByStatus(status) {
  return currentData.filter(r => getStatus(r.debut, r.fin) === status).length;
}

function updateKPIs() {
  const kpi = {
    total: currentData.length,
    active: countByStatus('active'),
    upcoming: countByStatus('upcoming'),
    ended: countByStatus('ended'),
    filieres: new Set(currentData.map(r => r.filiere)).size,
    etabs: new Set(currentData.map(r => r.etablissement)).size
  };

  const map = { kpiTotal: 'total', kpiActive: 'active', kpiUpcoming: 'upcoming', kpiEnded: 'ended', kpiFilieres: 'filieres', kpiEtab: 'etabs' };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = kpi[key];
  });

  // Statistiques page KPIs
  const elTotal = document.getElementById('statKpiTotal');
  if (elTotal) elTotal.textContent = kpi.total;
  const elActive = document.getElementById('statKpiActive');
  if (elActive) elActive.textContent = kpi.active;
  const elUpcoming = document.getElementById('statKpiUpcoming');
  if (elUpcoming) elUpcoming.textContent = kpi.upcoming;
  const elEnded = document.getElementById('statKpiEnded');
  if (elEnded) elEnded.textContent = kpi.ended;

  return kpi;
}

// ================================================== CHARTS (Chart.js) ==================================================

function chartColors(count) {
  const colors = [
    'rgba(232,196,74,0.8)',   // accent
    'rgba(74,232,160,0.8)',   // green
    'rgba(74,158,248,0.8)',   // blue
    'rgba(232,90,74,0.8)',    // red
    'rgba(192,140,255,0.8)',  // purple
    'rgba(255,180,74,0.8)',   // orange
    'rgba(255,108,112,0.8)',  // pink
    'rgba(100,255,218,0.8)',  // teal
  ];
  return colors.slice(0, count);
}

function createChart(id, type, data, labels, options = {}) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  if (charts[id]) charts[id].destroy();

  charts[id] = new Chart(ctx, {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: chartColors(labels.length),
        borderColor: chartColors(labels.length).map(c => c.replace('0.8', '1')),
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8a95a8' } }
      },
      ...options
    }
  });

  return charts[id];
}

function renderCharts() {
  const kpi = updateKPIs();

  // Status Pie
  createChart('chartStatus', 'doughnut',
    [kpi.active, kpi.upcoming, kpi.ended],
    ['En cours', 'À venir', 'Terminé'],
    { plugins: { legend: { position: 'bottom' } } }
  );

  // Filiere Bar
  const filMap = {};
  currentData.forEach(r => { filMap[r.filiere] = (filMap[r.filiere] || 0) + 1; });
  createChart('chartFiliere', 'bar', Object.values(filMap), Object.keys(filMap), {
    scales: { y: { ticks: { color: '#8a95a8' } }, x: { ticks: { color: '#8a95a8' } } }
  });

  // Timeline Line
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const timelineData = new Array(12).fill(0);
  currentData.forEach(r => {
    const m = new Date(r.debut).getMonth();
    timelineData[m]++;
  });
  createChart('chartTimeline', 'line', timelineData, months, {
    scales: {
      x: { ticks: { color: '#8a95a8' } },
      y: { ticks: { color: '#8a95a8' }, beginAtZero: true }
    },
    elements: { line: { tension: 0.4 } }
  });
}

function renderStatCharts() {
  updateKPIs();

  // Status Pie for stats page
  const active = countByStatus('active');
  const upcoming = countByStatus('upcoming');
  const ended = countByStatus('ended');

  createChart('chartStatusPie', 'pie', [active, upcoming, ended], ['En cours', 'À venir', 'Terminé'], {
    plugins: { legend: { position: 'bottom' } }
  });

  // Etab bar
  const etabMap = {};
  currentData.forEach(r => { etabMap[r.etablissement] = (etabMap[r.etablissement] || 0) + 1; });
  createChart('chartEtab', 'bar', Object.values(etabMap), Object.keys(etabMap), {
    indexAxis: 'y',
    scales: { x: { ticks: { color: '#8a95a8' } }, y: { ticks: { color: '#8a95a8' } } }
  });

  // Durée Doughnut
  let short = 0, medium = 0, long = 0;
  currentData.forEach(r => {
    const d = getDuration(r.debut, r.fin);
    if (d < 90) short++;
    else if (d < 180) medium++;
    else long++;
  });
  createChart('chartDuree', 'doughnut', [short, medium, long], ['< 3 mois', '3-6 mois', '> 6 mois'], {
    plugins: { legend: { position: 'bottom' } }
  });

  // Timeline Line
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const timelineData = new Array(12).fill(0);
  currentData.forEach(r => {
    const m = new Date(r.debut).getMonth();
    timelineData[m]++;
  });
  createChart('chartDebut', 'line', timelineData, months, {
    scales: {
      x: { ticks: { color: '#8a95a8' } },
      y: { ticks: { color: '#8a95a8' }, beginAtZero: true }
    },
    elements: { line: { tension: 0.4 } }
  });
}

// ================================================== RECENT ITEMS ==================================================

function renderRecent() {
  const container = document.getElementById('recentList');
  if (!container) return;

  const sorted = [...currentData]
    .sort((a, b) => new Date(b.debut) - new Date(a.debut))
    .slice(0, 6);

  container.innerHTML = sorted.map(r => `
    <div class="recent-item" onclick="openModal(${r.id})">
      <div class="recent-avatar">${getInitials(r.nom)}</div>
      <div class="recent-info">
        <h4>${r.nom}</h4>
        <p>${r.filiere} · ${formatDate(r.debut)}</p>
      </div>
      <div style="margin:auto;">${statusBadge(r.debut, r.fin)}</div>
    </div>
  `).join('');
}

// ================================================== STATS TABLE ==================================================

function renderStatsTable() {
  const tbody = document.getElementById('statsTableBody');
  if (!tbody) return;

  tbody.innerHTML = currentData.map(r => {
    const dur = getDuration(r.debut, r.fin);
    return `<tr>
      <td class="td-name">${r.nom}</td>
      <td>${r.filiere}</td>
      <td>${r.etablissement}</td>
      <td class="td-date">${formatDate(r.debut)}</td>
      <td class="td-date">${formatDate(r.fin)}</td>
      <td>${dur} jours</td>
      <td>${statusBadge(r.debut, r.fin)}</td>
    </tr>`;
  }).join('');
}

// ================================================== FILTERS (SELECTS) ==================================================

function populateFilters() {
  const filieres = [...new Set(currentData.map(d => d.filiere))].sort();
  const etabs    = [...new Set(currentData.map(d => d.etablissement))].sort();

  const selF = document.getElementById('filterFiliere');
  const selE = document.getElementById('filterEtablissement');

  if (!selF || !selE) return;

  // Keep the first option
  selF.innerHTML = '<option value="">Toutes les filières</option>';
  selE.innerHTML = '<option value="">Tous les établissements</option>';

  filieres.forEach(f => {
    const o = document.createElement('option');
    o.value = f; o.textContent = f; selF.appendChild(o);
  });

  etabs.forEach(e => {
    const o = document.createElement('option');
    o.value = e; o.textContent = e; selE.appendChild(o);
  });
}

// ================================================== FILTER + SEARCH ==================================================

function applyFilters() {
  const q   = document.getElementById('globalSearch')?.value?.toLowerCase()?.trim() || '';
  const fF  = document.getElementById('filterFiliere')?.value || '';
  const fE  = document.getElementById('filterEtablissement')?.value || '';
  const fS  = document.getElementById('filterStatus')?.value || '';

  filtered = currentData.filter(r => {
    const matchQ = !q || [r.nom, r.filiere, r.etablissement, r.email, r.telephone]
      .join(' ').toLowerCase().includes(q);
    const matchF = !fF || r.filiere === fF;
    const matchE = !fE || r.etablissement === fE;
    const matchS = !fS || getStatus(r.debut, r.fin) === fS;
    const statusMatch = statusFilterValue === 'all' || getStatus(r.debut, r.fin) === statusFilterValue;
    return matchQ && matchF && matchE && matchS && statusMatch;
  });

  if (sortKey) applySort(false);
  render();
}

function setStatusFilter(status) {
  statusFilterValue = status;
  document.querySelectorAll('.filter-chip').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-filter') === status);
  });
  applyFilters();
}

function clearSearch() {
  const el = document.getElementById('globalSearch');
  if (el) { el.value = ''; }
  applyFilters();
}

function resetFilters() {
  document.getElementById('globalSearch').value = '';
  document.getElementById('filterFiliere').value = '';
  document.getElementById('filterEtablissement').value = '';
  document.getElementById('filterStatus').value = '';
  setStatusFilter('all');
  filtered = [...currentData];
  render();
}

// ================================================== SORT ==================================================

function sortTable(key) {
  if (sortKey === key) { sortDir *= -1; }
  else { sortKey = key; sortDir = 1; }
  document.querySelectorAll('.sort-icon').forEach(el => el.textContent = '⇅');
  const active = document.querySelector(`th.sortable[onclick*="${key}"] .sort-icon`);
  if (active) active.textContent = sortDir === 1 ? '▲' : '▼';
  applySort(true);
}

function applySort(rerender) {
  filtered.sort((a, b) => {
    const va = a[sortKey] || '';
    const vb = b[sortKey] || '';
    return va < vb ? -sortDir : va > vb ? sortDir : 0;
  });
  if (rerender) render();
}

// ================================================== STATS BAND ==================================================

function updateStats() {
  document.getElementById('statTotal').textContent = currentData.length;
  document.getElementById('statActive').textContent =
    currentData.filter(r => getStatus(r.debut, r.fin) === 'active').length;
  document.getElementById('statFiliere').textContent =
    new Set(currentData.map(r => r.filiere)).size;
  document.getElementById('statEtab').textContent =
    new Set(currentData.map(r => r.etablissement)).size;
}

// ================================================== RENDER ==================================================

function renderTable(data, q) {
  const tbody = document.getElementById('tableBody');
  if (!data.length) { tbody.innerHTML = ''; return; }

  tbody.innerHTML = data.map(r => `
    <tr onclick="openModal(${r.id})">
      <td class="td-name">${highlight(r.nom, q)}</td>
      <td>${highlight(r.filiere, q)}</td>
      <td>${highlight(r.etablissement, q)}</td>
      <td class="td-phone">${r.telephone}</td>
      <td class="td-email">${highlight(r.email, q)}</td>
      <td class="td-date">${formatDate(r.debut)}</td>
      <td class="td-date">${formatDate(r.fin)}</td>
      <td>${statusBadge(r.debut, r.fin)}</td>
    </tr>
  `).join('');
}

function renderCards(data, q) {
  const grid = document.getElementById('cardsGrid');
  if (!data.length) { grid.innerHTML = ''; return; }

  grid.innerHTML = data.map(r => `
    <div class="cand-card" onclick="openModal(${r.id})">
      <div class="card-top">
        <div>
          <div class="card-name">${highlight(r.nom, q)}</div>
          <div class="card-filiere">${highlight(r.filiere, q)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
          <div class="card-avatar">${getInitials(r.nom)}</div>
          ${statusBadge(r.debut, r.fin)}
        </div>
      </div>
      <div class="card-body">
        <div class="card-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>${highlight(r.etablissement, q)}</span>
        </div>
        <div class="card-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 01.12 1a2 2 0 012-2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 6.37a16 16 0 006.72 6.72l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          <span class="td-phone">${r.telephone}</span>
        </div>
        <div class="card-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span class="card-email">${highlight(r.email, q)}</span>
        </div>
      </div>
      <div class="card-dates">
        <div class="date-block">
          <div class="date-block-label">Début</div>
          <div class="date-block-val">${formatDate(r.debut)}</div>
        </div>
        <div class="date-block">
          <div class="date-block-label">Fin</div>
          <div class="date-block-val">${formatDate(r.fin)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function render() {
  const q = (document.getElementById('globalSearch')?.value || '').trim();
  const noRes = document.getElementById('noResults');
  const count = document.getElementById('countLabel');

  if (count) count.textContent = `(${filtered.length}/${currentData.length})`;

  if (!filtered.length) {
    if (noRes) noRes.classList.remove('hidden');
    document.getElementById('tableBody').innerHTML = '';
    document.getElementById('cardsGrid').innerHTML = '';
  } else {
    if (noRes) noRes.classList.add('hidden');
    if (isCardView) {
      renderCards(filtered, q);
    } else {
      renderTable(filtered, q);
    }
  }
}

// ================================================== VIEW TOGGLE ==================================================

function toggleView() {
  isCardView = !isCardView;
  const btn = document.getElementById('toggleView');
  document.getElementById('tableView').classList.toggle('hidden', isCardView);
  document.getElementById('cardView').classList.toggle('hidden', !isCardView);
  btn.textContent = isCardView ? '☰ Vue Tableau' : '⊞ Vue Cartes';
  render();
}

// ================================================== MODAL ==================================================

function openModal(id) {
  const r = currentData.find(d => d.id === id);
  if (!r) return;

  const status = getStatus(r.debut, r.fin);
  document.getElementById('modalContent').innerHTML = `
    <div class="modal-avatar">${getInitials(r.nom)}</div>
    <div class="modal-name">${r.nom}</div>
    <div class="modal-filiere">${r.filiere}</div>
    ${statusBadge(r.debut, r.fin)}
    <div class="modal-grid" style="margin-top:20px;">
      <div class="modal-field">
        <div class="modal-field-label">Établissement</div>
        <div class="modal-field-value" style="font-family:var(--font-body);font-size:13px;">${r.etablissement}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Téléphone</div>
        <div class="modal-field-value">${r.telephone}</div>
      </div>
      <div class="modal-field" style="grid-column: span 2;">
        <div class="modal-field-label">Email</div>
        <div class="modal-field-value blue">${r.email}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Date de Début</div>
        <div class="modal-field-value highlight">${formatDate(r.debut)}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Date de Fin</div>
        <div class="modal-field-value">${formatDate(r.fin)}</div>
      </div>
    </div>
  `;
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModalBtn();
}

function closeModalBtn() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModalBtn();
});

// ================================================== EXPORT CSV ==================================================

function exportCSV() {
  const headers = ['#', 'Nom', 'Filière', 'Établissement', 'Téléphone', 'Email', 'Date Début', 'Date Fin', 'Statut'];
  const rows = currentData.map(r => [
    r.id,
    `"${r.nom}"`,
    `"${r.filiere}"`,
    `"${r.etablissement}"`,
    r.telephone,
    r.email,
    formatDate(r.debut),
    formatDate(r.fin),
    statusLabel(getStatus(r.debut, r.fin))
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stageflow_candidats_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ================================================== PAGE RENDERS ==================================================

function renderDashboard() {
  updateKPIs();
  renderCharts();
  renderRecent();
}

function renderCandidats() {
  populateFilters();
  updateStats();
  if (!filtered.length || !('id' in (filtered[0] || {}))) {
    filtered = [...currentData];
  }
  applyFilters();
  render();
}

function renderStatistiques() {
  updateKPIs();
  renderStatsTable();
  renderStatCharts();
}

// ================================================== EVENT LISTENERS ==================================================

document.getElementById('globalSearch')?.addEventListener('input', applyFilters);
document.getElementById('filterFiliere')?.addEventListener('change', applyFilters);
document.getElementById('filterEtablissement')?.addEventListener('change', applyFilters);
document.getElementById('filterStatus')?.addEventListener('change', applyFilters);

// ================================================== INIT ==================================================

function init() {
  currentData = [...DATABASE];
  filtered = [...currentData];
  populateFilters();
  navigateTo('dashboard');
}

init();
