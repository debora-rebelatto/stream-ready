const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'watchlist.json');

// Ensure data folder and file exist
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      settings: {
        autoCheckIntervalMinutes: 30,
        torrentioUrl: 'https://torrentio.strem.fun'
      },
      items: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDb() {
  try {
    initDb();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler banco de dados:', err);
    return { settings: { autoCheckIntervalMinutes: 30, torrentioUrl: 'https://torrentio.strem.fun' }, items: [] };
  }
}

function saveDb(data) {
  try {
    initDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Erro ao salvar banco de dados:', err);
    return false;
  }
}

function getItems() {
  const db = readDb();
  return db.items || [];
}

function getItem(id) {
  const items = getItems();
  return items.find(item => item.id === id);
}

function addItem(item) {
  const db = readDb();
  const existingIndex = db.items.findIndex(i => i.id === item.id);
  
  const newItem = {
    id: item.id,
    type: item.type || 'movie',
    name: item.name,
    year: item.year || '',
    poster: item.poster || '',
    banner: item.banner || '',
    genres: item.genres || [],
    description: item.description || '',
    imdbRating: item.imdbRating || '',
    addedAt: item.addedAt || new Date().toISOString(),
    // Quality tracking
    has1080pPlus: !!item.has1080pPlus,
    bestQuality: item.bestQuality || 'Pendente',
    streamCount: item.streamCount || 0,
    count1080pPlus: item.count1080pPlus || 0,
    lastChecked: item.lastChecked || null,
    checkError: item.checkError || null
  };

  if (existingIndex >= 0) {
    db.items[existingIndex] = { ...db.items[existingIndex], ...newItem };
  } else {
    db.items.unshift(newItem);
  }

  saveDb(db);
  return newItem;
}

function updateItem(id, updates) {
  const db = readDb();
  const index = db.items.findIndex(i => i.id === id);
  if (index >= 0) {
    db.items[index] = { ...db.items[index], ...updates };
    saveDb(db);
    return db.items[index];
  }
  return null;
}

function removeItem(id) {
  const db = readDb();
  const initialLength = db.items.length;
  db.items = db.items.filter(i => i.id !== id);
  saveDb(db);
  return db.items.length < initialLength;
}

function getSettings() {
  const db = readDb();
  return db.settings || {
    autoCheckIntervalMinutes: 30,
    torrentioUrl: 'https://torrentio.strem.fun'
  };
}

function updateSettings(newSettings) {
  const db = readDb();
  db.settings = { ...db.settings, ...newSettings };
  saveDb(db);
  return db.settings;
}

function getStats() {
  const items = getItems();
  const ready = items.filter(i => i.has1080pPlus).length;
  const pending = items.length - ready;
  return {
    total: items.length,
    ready,
    pending
  };
}

module.exports = {
  getItems,
  getItem,
  addItem,
  updateItem,
  removeItem,
  getSettings,
  updateSettings,
  getStats
};

