const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const storePath = path.join(rootDir, 'data', 'dashboard-store.json');
const seedJsPath = path.join(rootDir, 'js', 'seed-data.js');
const publicDataDir = path.join(rootDir, 'public', 'data');
const publicStorePath = path.join(publicDataDir, 'dashboard-store.json');

if (!fs.existsSync(storePath)) {
  console.error('dashboard-store.json not found at', storePath);
  process.exit(1);
}

const raw = fs.readFileSync(storePath, 'utf8');
const store = JSON.parse(raw);

// 1. Write js/seed-data.js
const seedContent = '/* Command · Auto-generated Seed Store Snapshot */\nwindow.__INITIAL_STORE__ = ' + JSON.stringify(store) + ';\n';
fs.writeFileSync(seedJsPath, seedContent, 'utf8');
console.log('✓ Wrote js/seed-data.js (', (seedContent.length / 1024).toFixed(1), 'KB )');

// 2. Ensure public/data/dashboard-store.json
if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
}
fs.writeFileSync(publicStorePath, raw, 'utf8');
console.log('✓ Wrote public/data/dashboard-store.json (', (raw.length / 1024).toFixed(1), 'KB )');
