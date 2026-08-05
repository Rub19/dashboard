
const fs = require('fs');
let matches = fs.readFileSync('v8/pages/matches.mjs', 'utf-8');
matches = matches.replace(
    'backBtn.addEventListener("click", () => actions?.dispatch?.("v8.navigate.home") || actions?.dispatch?.("v8.home") || (window.location.hash = ""));',
    'backBtn.addEventListener("click", () => actions?.dispatch?.("v8.home.open") || (window.location.hash = ""));'
);
fs.writeFileSync('v8/pages/matches.mjs', matches, 'utf-8');

