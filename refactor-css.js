
const fs = require('fs');
let code = fs.readFileSync('v8/styles/shell.css', 'utf-8');

if (!code.includes('.v8-spotify-live, .v8-discord-live, .v8-lastfm-live { height: 100%; min-height: 154px; }')) {
  code += '\n\n.v8-home-live-grid > section > article { height: 100%; min-height: 154px; }\n';
  fs.writeFileSync('v8/styles/shell.css', code, 'utf-8');
}

