
const fs = require('fs');
let code = fs.readFileSync('v8/pages/matches.mjs', 'utf-8');

const renderScoreboardCode = \
  function renderScoreboard(scoreboard) {
    if (!scoreboard || !scoreboard.players) return element("div", { className: "v8-scoreboard-empty", text: "Données détaillées non disponibles" });
    
    const container = element("div", { className: "v8-scoreboard" });
    
    // Header
    const tabs = element("div", { className: "v8-scoreboard-tabs" }, [
      element("button", { className: "v8-scoreboard-tab active", text: "Scoreboard" }),
      element("button", { className: "v8-scoreboard-tab", text: "Performance" }),
      element("button", { className: "v8-scoreboard-tab", text: "Economy" })
    ]);
    container.append(tabs);
    
    // Players grouped by team
    const teams = { Red: [], Blue: [] };
    scoreboard.players.forEach(p => {
      const t = p.team || "Blue";
      if (!teams[t]) teams[t] = [];
      teams[t].push(p);
    });
    
    // Sort by score
    Object.keys(teams).forEach(t => {
      teams[t].sort((a,b) => (b.stats?.score || 0) - (a.stats?.score || 0));
    });

    const createTeamTable = (teamName, players) => {
      if (!players.length) return null;
      const tColor = teamName.toLowerCase() === "red" ? "var(--v8-error)" : "var(--v8-info)";
      const table = document.createElement("table");
      table.className = "v8-scoreboard-table";
      
      const thead = document.createElement("thead");
      thead.innerHTML = \
        <tr style=\"border-bottom: 2px solid \\">
          <th>Agent</th>
          <th>Joueur</th>
          <th>Rank</th>
          <th>Score</th>
          <th>K</th>
          <th>D</th>
          <th>A</th>
          <th>K/D</th>
          <th>HS%</th>
        </tr>
      \;
      table.appendChild(thead);
      
      const tbody = document.createElement("tbody");
      players.forEach(p => {
        const tr = document.createElement("tr");
        const kd = p.stats?.deaths ? (p.stats.kills / p.stats.deaths).toFixed(2) : p.stats?.kills;
        const hs = p.stats?.headshots ? Math.round((p.stats.headshots / (p.stats.headshots + (p.stats.bodyshots||0) + (p.stats.legshots||0))) * 100) : 0;
        const isDuo = p.party_id ? \<span class=\"v8-party-indicator\" style=\"background-color: \\" title=\"En groupe\"></span>\ : '';
        
        tr.innerHTML = \
          <td>\</td>
          <td>\ \ <span style=\"opacity:0.5;font-size:0.8em\">#\</span></td>
          <td>\</td>
          <td>\</td>
          <td>\</td>
          <td>\</td>
          <td>\</td>
          <td>\</td>
          <td>\%</td>
        \;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      
      const wrap = element("div", { className: "v8-scoreboard-team\" });
      wrap.appendChild(table);
      return wrap;
    };

    const redTable = createTeamTable("Red", teams.Red);
    const blueTable = createTeamTable("Blue", teams.Blue);
    if (redTable) container.append(redTable);
    if (blueTable) container.append(blueTable);

    return container;
  }
  
  function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  }
\;

// Inject functions
if (!code.includes('function renderScoreboard')) {
  code = code.replace(/function renderMatch\(match\) \{/, renderScoreboardCode + '\n  function renderMatch(match) {');
}

// Modify return value of renderMatch to wrap the row
const rowRegex = /return element\("div", \{ className: \\\8-match-row \\\$\{stateClass\}\\\ \}, \[([\s\S]*?)\]\);/;
if (rowRegex.test(code)) {
  code = code.replace(rowRegex, \const row = element("div", { className: \\\8-match-row \\\$\{stateClass\}\\\ }, []);
    
    const detailContainer = element("div", { className: "v8-match-detail-container", style: "display: none;" });
    if (match.scoreboard) {
       detailContainer.append(renderScoreboard(match.scoreboard));
    } else {
       detailContainer.append(element("p", { text: "Détails non disponibles pour ce match.\", style: "padding: 1rem; color: var(--v8-text-muted);" }));
    }
    
    row.addEventListener("click", () => {
      const isExpanded = detailContainer.style.display === "block";
      detailContainer.style.display = isExpanded ? "none" : "block";
    });
    
    // Indicate it's clickable
    row.style.cursor = "pointer";

    return element("div", { className: "v8-match-wrapper", style: "margin-bottom: var(--v8-spacing-2);" }, [row, detailContainer]);\);
}

fs.writeFileSync('v8/pages/matches.mjs', code, 'utf-8');

