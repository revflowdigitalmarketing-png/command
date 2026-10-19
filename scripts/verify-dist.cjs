const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distHtml = path.join(rootDir, 'dist', 'index.html');

if (!fs.existsSync(distHtml)) {
  console.error('dist/index.html not found!');
  process.exit(1);
}

const html = fs.readFileSync(distHtml, 'utf8');
const regex = /(?:src|href)=["']([^"']+)["']/g;
let match;
const missing = [];
const found = [];

while ((match = regex.exec(html)) !== null) {
  let ref = match[1].split('?')[0];
  if (ref.startsWith('http') || ref.startsWith('//') || ref.startsWith('#') || ref.startsWith('data:')) {
    continue;
  }
  if (ref.startsWith('./')) ref = ref.slice(2);
  const full = path.join(rootDir, 'dist', ref);
  if (!fs.existsSync(full)) {
    missing.push(ref);
  } else {
    found.push(ref);
  }
}

console.log('Total local assets checked in dist:', found.length + missing.length);
found.forEach(f => console.log('✓ Found in dist:', f));

if (missing.length > 0) {
  console.error('✗ Missing assets in dist:', missing);
  process.exit(1);
} else {
  console.log('✓ ALL ASSETS EXIST AND ARE RESOLVABLE IN DIST!');
}
