const fs = require('fs');
const path = require('path');

const replacements = {
  'Ã©': 'é',
  'Ã¨': 'è',
  'Ãª': 'ê',
  'Ã‰': 'É',
  'Ã ': 'à',
  'Ã§': 'ç',
  'Ã®': 'î',
  'Ã´': 'ô',
  'Ã»': 'û',
  'Ãœ': 'Ü',
  'Ã‹': 'Ë',
  'Ã¯': 'ï',
  'Ã¶': 'ö',
  'Ã¼': 'ü',
  'Ã¢': 'â',
  'Ã%cran': 'Écran',
  'Ã%': 'É',
  'BanniÃ¨re': 'Bannière',
  'ComplÃ¨te': 'Complète',
  'MasquÃ©e': 'Masquée',
  'Identitée': 'Identité'
};

function fixEncoding(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [bad, good] of Object.entries(replacements)) {
    if (content.includes(bad)) {
      content = content.split(bad).join(good);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
  }
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.mjs') || file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('.');
for (const file of files) {
  if (!file.includes('node_modules') && !file.includes('.git') && file !== 'fix-encoding.js') {
    fixEncoding(file);
  }
}
console.log('Encoding fix complete.');
