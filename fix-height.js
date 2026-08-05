
const fs = require('fs');
let shellcss = fs.readFileSync('v8/styles/shell.css', 'utf-8');
shellcss = shellcss.replace(
    '.v8-home-live-grid { display: grid;',
    '.v8-home-live-grid > * { height: 100%; }\n.v8-home-live-grid { display: grid;'
);
fs.writeFileSync('v8/styles/shell.css', shellcss, 'utf-8');

