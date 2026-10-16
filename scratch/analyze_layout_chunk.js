const fs = require('fs');

const path = '.next/static/chunks/app/layout.js';
if (!fs.existsSync(path)) {
  console.log('No layout.js chunk found');
  process.exit(0);
}

const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
console.log('Layout chunk length:', content.length, 'lines:', lines.length);

const modRegex = /\/\*\*\*\/ "\.\/([^"]+)"/g;
let m;
const modules = new Set();
while ((m = modRegex.exec(content)) !== null) {
  modules.add(m[1]);
}
console.log('Local project modules in layout.js:', Array.from(modules).slice(0, 30));

const nmRegex = /"([^"]*node_modules\/[^"]*)"/g;
const pkgs = new Set();
while ((m = nmRegex.exec(content)) !== null) {
  const parts = m[1].split('node_modules/');
  if (parts[1]) {
    pkgs.add(parts[1].split('/')[0]);
  }
}
console.log('Packages in layout.js:', Array.from(pkgs));
