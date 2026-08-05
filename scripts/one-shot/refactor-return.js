
const fs = require('fs');
let code = fs.readFileSync('v8/pages/matches.mjs', 'utf-8');

const regex = /return element\("div", \{ className: \\\8-match-row \\\$\{stateClass\}\\\ \}, \[(?:[^\]]|\n|\r)*?\]\);/s;

code = code.replace(regex, function(matchStr) {
  return 'const row = ' + matchStr.replace(/^return /, '') + \
    
    const detailContainer = element(\"div\", { className: \"v8-match-detail-container\", style: \"display: none; padding: 1rem;\" });
    if (match.scoreboard) {
       detailContainer.append(renderScoreboard(match.scoreboard));
    } else {
       detailContainer.append(element(\"p\", { text: \"Détails non disponibles pour ce match.\", style: \"color: var(--v8-text-muted);\" }));
    }
    
    row.addEventListener(\"click\", () => {
      const isExpanded = detailContainer.style.display === \"block\";
      detailContainer.style.display = isExpanded ? \"none\" : \"block\";
    });
    
    row.style.cursor = \"pointer\";

    return element(\"div\", { className: \"v8-match-wrapper\", style: \"margin-bottom: var(--v8-spacing-2); background: var(--v8-bg-elevated); border-radius: var(--v8-radius-lg); overflow: hidden;\" }, [row, detailContainer]);\;
});

fs.writeFileSync('v8/pages/matches.mjs', code, 'utf-8');

