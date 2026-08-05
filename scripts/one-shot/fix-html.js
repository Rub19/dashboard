
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');
html = html.replace(/rǸinvente/g, 'réinvente');
html = html.replace(/numǸrique/g, 'numérique');
html = html.replace(/unifiǸ/g, 'unifié');
html = html.replace(/crǸer/g, 'créer');
fs.writeFileSync('index.html', html, 'utf-8');

