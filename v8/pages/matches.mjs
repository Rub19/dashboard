import { element, icon } from "../ui/dom.mjs";

export function mountMatches(container, options = {}) {
  const { externalServices, lolLive, valorantLive, trackerLive, actions } = options;
  let destroyed = false;
  let currentMode = "all";
  
  const hash = window.location.hash.substring(1);
  const searchParams = new URL("http://localhost/" + hash).searchParams;
  const game = searchParams.get("game") || "valorant";
  const initialMode = searchParams.get("mode") || "all";
  
  const root = element("div", { className: "v8-matches-page" });
  const header = element("header", { className: "v8-matches-header" });
  const content = element("div", { className: "v8-matches-content" });
  
  const backBtn = element("button", { className: "v8-button v8-button--outline", text: "Retour" });
  backBtn.addEventListener("click", () => actions?.dispatch?.("v8.home.open") || (window.location.hash = ""));
  
  const title = element("h1", { text: `Historique ${game === "valorant" ? "Valorant" : game === "apex" ? "Apex Legends" : "League of Legends"}` });
  
  let modes = [];
  if (game === "valorant") {
    modes = [
      { value: "all", text: "Tous les modes" },
      { value: "competitive", text: "Compétitif" },
      { value: "unrated", text: "Non Classé" },
      { value: "swiftplay", text: "Partie Rapide" },
      { value: "deathmatch", text: "Combat à mort" },
      { value: "spikerush", text: "Spike Rush" }
    ];
  } else if (game === "lol") {
    modes = [
      { value: "all", text: "Tous les modes" },
      { value: "ranked", text: "Classé" },
      { value: "normal", text: "Normal" },
      { value: "aram", text: "ARAM" }
    ];
  } else {
    modes = [
      { value: "all", text: "Tous les modes" },
      { value: "ranked", text: "Classé" },
      { value: "trios", text: "Trios" },
      { value: "arenas", text: "Arènes" }
    ];
  }
  
  const selectMode = element("select", { className: "v8-matches-filter" }, 
    modes.map(m => element("option", { value: m.value, text: m.text }))
  );
  selectMode.value = initialMode;
  currentMode = initialMode;
  
  selectMode.addEventListener("change", (e) => {
    currentMode = e.target.value;
    loadMatches();
  });
  
  const headerRight = element("div", { className: "v8-matches-header-right" }, [selectMode]);
  const headerLeft = element("div", { className: "v8-matches-header-left" }, [backBtn, title]);
  header.append(headerLeft, headerRight);
  root.append(header, content);
  container.append(root);

  function formatTimeAgo(dateStr) {
    if (!dateStr) return "17h ago";
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return "Unknown";
    const diffHours = Math.floor((Date.now() - dateObj.getTime()) / 3600000);
    if (diffHours < 1) return "<1h ago";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours/24)}d ago`;
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

  function renderScoreboard(scoreboard) {
    if (!scoreboard || !scoreboard.players) return element("div", { className: "v8-scoreboard-empty", text: "Données détaillées non disponibles", style: "padding:1rem;color:var(--v8-text-muted);" });
    
    const container = element("div", { className: "v8-scoreboard" });
    
    // Header
    const tabs = element("div", { className: "v8-scoreboard-tabs", style: "display:flex;gap:1rem;padding:0.5rem;border-bottom:1px solid var(--v8-border);" }, [
      element("button", { className: "v8-scoreboard-tab active", text: "Scoreboard", style: "background:transparent;border:none;color:var(--v8-text-primary);cursor:pointer;font-weight:bold;" }),
      element("button", { className: "v8-scoreboard-tab", text: "Performance", style: "background:transparent;border:none;color:var(--v8-text-muted);cursor:pointer;" }),
      element("button", { className: "v8-scoreboard-tab", text: "Economy", style: "background:transparent;border:none;color:var(--v8-text-muted);cursor:pointer;" })
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
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.marginTop = "1rem";
      
      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr style="border-bottom: 2px solid ${tColor}; text-align: left; font-size: 0.85rem; color: var(--v8-text-muted);">
          <th style="padding: 0.5rem;">Agent</th>
          <th style="padding: 0.5rem;">Joueur</th>
          <th style="padding: 0.5rem;">Rank</th>
          <th style="padding: 0.5rem;">Score</th>
          <th style="padding: 0.5rem;">K</th>
          <th style="padding: 0.5rem;">D</th>
          <th style="padding: 0.5rem;">A</th>
          <th style="padding: 0.5rem;">K/D</th>
          <th style="padding: 0.5rem;">HS%</th>
        </tr>
      `;
      table.appendChild(thead);
      
      const tbody = document.createElement("tbody");
      players.forEach(p => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--v8-border)";
        const kd = p.stats?.deaths ? (p.stats.kills / p.stats.deaths).toFixed(2) : p.stats?.kills;
        const hs = p.stats?.headshots ? Math.round((p.stats.headshots / (p.stats.headshots + (p.stats.bodyshots||0) + (p.stats.legshots||0))) * 100) : 0;
        const isDuo = p.party_id ? `<span class="v8-party-indicator" style="background-color: ${stringToColor(p.party_id)}; width:6px; height:6px; border-radius:50%; display:inline-block; margin-right:4px;" title="En groupe"></span>` : '';
        
        tr.innerHTML = `
          <td style="padding: 0.5rem;">${p.character || '-'}</td>
          <td style="padding: 0.5rem;">${isDuo} <strong>${p.name}</strong> <span style="opacity:0.5;font-size:0.8em">#${p.tag}</span></td>
          <td style="padding: 0.5rem;">${p.currenttier_patched || '-'}</td>
          <td style="padding: 0.5rem;">${p.stats?.score || 0}</td>
          <td style="padding: 0.5rem;">${p.stats?.kills || 0}</td>
          <td style="padding: 0.5rem;">${p.stats?.deaths || 0}</td>
          <td style="padding: 0.5rem;">${p.stats?.assists || 0}</td>
          <td style="padding: 0.5rem;">${kd}</td>
          <td style="padding: 0.5rem;">${hs}%</td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      
      const wrap = element("div", { className: "v8-scoreboard-team", style: "background: rgba(0,0,0,0.2); border-radius: 8px; padding: 0.5rem; margin-bottom: 1rem;" });
      wrap.appendChild(table);
      return wrap;
    };

    const redTable = createTeamTable("Red", teams.Red);
    const blueTable = createTeamTable("Blue", teams.Blue);
    if (redTable) container.append(redTable);
    if (blueTable) container.append(blueTable);

    return container;
  }

  function renderMatch(match) {
    const resultText = match.metadata?.result || "Inconnu";
    const resultLower = resultText.toLowerCase();
    const isWin = resultLower === "victory" || resultLower === "win";
    const isLoss = resultLower === "defeat" || resultLower === "loss";
    const stateClass = isWin ? "is-win" : isLoss ? "is-loss" : "is-draw";
    
    const summary = match.segments?.find(s => s.type === "player-summary") || match.segments?.[0] || {};
    const stats = summary.stats || {};
    
    const kills = stats.kills?.value || 0;
    const deaths = stats.deaths?.value || 0;
    const assists = stats.assists?.value || 0;
    
    const kdRatio = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? "Perf" : "0.0";
    const acs = Math.round(Number(stats.score?.value || stats.scorePerRound?.value || 0));
    const hs = Math.round(Number(stats.headshotsPercentage?.value || 0));
    const dda = Math.round(Number(stats.damageDeltaPerRound?.value || 0));
    
    const timeAgo = formatTimeAgo(match.metadata?.timestamp);
    const modeName = match.metadata?.modeName || "Normal";
    
    const badgesContainer = element("div", { className: "v8-match-badges" });
    if (kills >= 25) badgesContainer.append(element("span", { className: "v8-badge v8-badge--gold", text: "MVP" }));
    if (kills >= 20) badgesContainer.append(element("span", { className: "v8-badge v8-badge--outline", text: "4k x2" }));
    
    const kdClass = Number(kdRatio) >= 1.5 ? "text-blue" : Number(kdRatio) >= 1.0 ? "text-green" : "text-yellow";
    
    const row = element("div", { className: `v8-match-row ${stateClass}` }, [
      element("div", { className: "v8-match-accent" }),
      element("div", { className: "v8-match-agent" }, [
        match.metadata?.agentImageUrl ? element("img", { attributes: { src: match.metadata.agentImageUrl } }) : element("div", { className: "v8-match-agent-placeholder" })
      ]),
      element("div", { className: "v8-match-info" }, [
        element("small", { text: `${timeAgo} // ${modeName}` }),
        element("strong", { className: "v8-match-map" }, [
          element("span", { text: match.metadata?.mapName || "Inconnu" }),
          badgesContainer
        ])
      ]),
      element("div", { className: "v8-match-score-col" }, [
        element("small", { text: "Score" }),
        element("strong", { text: isWin ? "13:6" : "10:13", className: "v8-match-score" })
      ]),
      element("div", { className: "v8-match-badges-col" }),
      element("div", { className: "v8-match-stat-col" }, [
        element("small", { text: "K/D" }),
        element("strong", { text: kdRatio, className: kdClass })
      ]),
      element("div", { className: "v8-match-stat-col" }, [
        element("small", { text: "K/D/A" }),
        element("strong", { text: `${kills} / ${deaths} / ${assists}` })
      ]),
      element("div", { className: "v8-match-stat-col" }, [
        element("small", { text: "DDΔ" }),
        element("strong", { text: String(dda) })
      ]),
      element("div", { className: "v8-match-stat-col" }, [
        element("small", { text: "HS%" }),
        element("strong", { text: String(hs) })
      ]),
      element("div", { className: "v8-match-stat-col" }, [
        element("small", { text: "ACS" }),
        element("strong", { text: String(acs) })
      ]),
      element("button", { className: "v8-match-action" }, [icon("chevron-down")])
    ]);
    
    const detailContainer = element("div", { className: "v8-match-detail-container", style: "display: none; padding: 1rem; border-top: 1px solid var(--v8-border);" });
    if (match.scoreboard) {
       detailContainer.append(renderScoreboard(match.scoreboard));
    } else {
       detailContainer.append(element("p", { text: "Détails non disponibles pour ce match.", style: "color: var(--v8-text-muted);" }));
    }
    
    row.addEventListener("click", () => {
      const isExpanded = detailContainer.style.display === "block";
      detailContainer.style.display = isExpanded ? "none" : "block";
    });
    
    row.style.cursor = "pointer";

    return element("div", { className: "v8-match-wrapper", style: "margin-bottom: var(--v8-spacing-2); background: var(--v8-bg-elevated); border-radius: var(--v8-radius-lg); overflow: hidden;" }, [row, detailContainer]);
  }

  function renderGroup(dateStr, matches) {
    let wins = 0, losses = 0;
    let totalKills = 0, totalDeaths = 0, totalAssists = 0;
    let totalACS = 0, totalHS = 0, totalDDA = 0;
    let matchesWithStats = 0;
    
    matches.forEach(m => {
       const result = m.metadata?.result?.toLowerCase() || "";
       if (result === "victory" || result === "win") wins++;
       else if (result === "defeat" || result === "loss") losses++;
       
       const summary = m.segments?.[0]?.stats || {};
       const k = Number(summary.kills?.value) || 0;
       const d = Number(summary.deaths?.value) || 0;
       const a = Number(summary.assists?.value) || 0;
       totalKills += k;
       totalDeaths += d;
       totalAssists += a;
       
       const acs = Number(summary.score?.value || summary.scorePerRound?.value || 0);
       const hs = Number(summary.headshotsPercentage?.value || 0);
       const dda = Number(summary.damageDeltaPerRound?.value || 0);
       
       matchesWithStats++;
       totalACS += acs;
       totalHS += hs;
       totalDDA += dda;
    });
    
    const kdRatio = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills > 0 ? "Perf" : "0.0";
    const kdaAvg = matchesWithStats ? `${Math.round(totalKills/matchesWithStats)} // ${Math.round(totalDeaths/matchesWithStats)} // ${Math.round(totalAssists/matchesWithStats)}` : "0 // 0 // 0";
    const avgDDA = matchesWithStats ? Math.round(totalDDA / matchesWithStats) : 0;
    const avgHS = matchesWithStats ? Math.round(totalHS / matchesWithStats) : 0;
    const avgACS = matchesWithStats ? Math.round(totalACS / matchesWithStats) : 0;
    
    const headerRow = element("div", { className: "v8-match-group-header" }, [
      element("div", { className: "v8-match-group-date" }, [
        element("strong", { text: dateStr }),
        element("span", { className: "v8-match-group-count", text: String(matches.length) }),
        element("button", { className: "v8-button v8-button--outline v8-button--small v8-match-report-btn" }, [icon("chart-spline"), element("span", { text: "View Report" })])
      ]),
      element("div", { className: "v8-match-group-wl" }, [
        element("span", { className: "text-green", text: `${wins} W` }),
        element("span", { className: "v8-muted", text: " // " }),
        element("span", { className: "text-red", text: `${losses} L` })
      ]),
      element("div", { className: "v8-match-group-aggregate" }, [
        element("div", { className: "v8-match-stat-col" }, [
          element("small", { text: "K/D" }),
          element("strong", { text: kdRatio })
        ]),
        element("div", { className: "v8-match-stat-col" }, [
          element("small", { text: `${totalKills} K // ${totalDeaths} D // ${totalAssists} A` }),
          element("strong", { text: `${kdaAvg} K/D/A` })
        ]),
        element("div", { className: "v8-match-stat-col" }, [
          element("small", { text: "DDΔ" }),
          element("strong", { text: String(avgDDA) })
        ]),
        element("div", { className: "v8-match-stat-col" }, [
          element("small", { text: "HS%" }),
          element("strong", { text: String(avgHS) })
        ]),
        element("div", { className: "v8-match-stat-col" }, [
          element("small", { text: "ACS" }),
          element("strong", { text: String(avgACS) })
        ])
      ])
    ]);
    
    const rows = matches.map(renderMatch);
    
    return element("div", { className: "v8-match-group" }, [
      headerRow,
      ...rows
    ]);
  }
  
  async function loadMatches() {
    if (destroyed) return;
    content.replaceChildren();
    content.append(element("p", { className: "v8-loading", text: "Chargement de l'historique..." }));
    
    try {
      let data;
      if (game === "valorant") {
        const riotId = valorantLive?.state?.()?.tag ? `${valorantLive.state().name}#${valorantLive.state().tag}` : "";
        if (!riotId) throw new Error("Riot ID Valorant manquant.");
        const [name, tag] = riotId.split("#");
        const res = await externalServices.tracker.valorantMatches(name, tag, currentMode);
        data = res.data;
      } else if (game === "lol") {
        const riotId = lolLive?.state?.()?.tag ? `${lolLive.state().name}#${lolLive.state().tag}` : "";
        if (!riotId) throw new Error("Riot ID League of Legends manquant.");
        const [name, tag] = riotId.split("#");
        const res = await externalServices.tracker.lolMatches(name, tag, currentMode);
        data = res.data;
      } else if (game === "apex") {
        const handle = trackerLive?.state?.()?.handle;
        if (!handle) throw new Error("Identifiant Apex manquant.");
        const res = await externalServices.tracker.apexMatches("origin", handle, currentMode);
        data = res.data;
      } else {
        throw new Error("Jeu non supporté");
      }
      if (destroyed) return;
      
      content.replaceChildren();
      if (!data || data.length === 0) {
        content.append(element("p", { className: "v8-empty", text: "Aucun match trouvé pour ce mode." }));
        return;
      }
      
      const groups = {};
      data.forEach(m => {
        let dateObj = m.metadata?.timestamp ? new Date(m.metadata.timestamp) : new Date();
        if (isNaN(dateObj.getTime())) dateObj = new Date();
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(m);
      });
      
      const list = element("div", { className: "v8-matches-history" });
      Object.keys(groups).forEach(dateStr => {
        list.append(renderGroup(dateStr, groups[dateStr]));
      });
      
      content.append(list);
    } catch (e) {
      if (destroyed) return;
      
      content.replaceChildren(element("div", { className: "v8-error-state", style: "padding: 2rem; text-align: center; color: var(--v8-error);" }, [
        element("span", { className: "v8-error-state__icon", style: "display: block; margin-bottom: 1rem; font-size: 2rem;" }, [icon("alert-circle")]),
        element("h3", { text: "Impossible de récupérer les matchs", style: "margin-bottom: 0.5rem;" }),
        element("p", { text: e.message || "La clé API Tracker.gg est peut-être manquante ou invalide.", style: "color: var(--v8-text-secondary); font-size: 0.9rem;" })
      ]));
    }
  }
  
  loadMatches();
  
  return () => {
    destroyed = true;
    root.remove();
  };
}
