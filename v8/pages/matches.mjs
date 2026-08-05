import { element, icon } from "../ui/dom.mjs";

export function mountMatches(container, options = {}) {
  const { externalServices, lolLive, valorantLive, actions } = options;
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
  backBtn.addEventListener("click", () => actions?.dispatch?.("v8.navigate.home") || actions?.dispatch?.("v8.home") || (window.location.hash = ""));
  
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
    
    return element("div", { className: `v8-match-row ${stateClass}` }, [
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
      element("button", { className: "v8-match-action" }, [icon("more-vertical")])
    ]);
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
      
      // Fallback vers de fausses données (mock) si le backend tracker n'est pas disponible
      const mockData = [];
      const now = Date.now();
      for (let i = 0; i < 8; i++) {
        const isWin = Math.random() > 0.4;
        const kills = Math.floor(Math.random() * 25) + 5;
        const deaths = Math.floor(Math.random() * 20) + 5;
        mockData.push({
          metadata: {
            result: isWin ? "Victory" : "Defeat",
            timestamp: new Date(now - (i * 3600000 * (Math.random() * 12 + 1))).toISOString(),
            modeName: currentMode === "all" ? (game === "valorant" ? "Compétitif" : "Classé") : currentMode,
            mapName: game === "valorant" ? ["Ascent", "Bind", "Haven", "Icebox"][i%4] : game === "lol" ? "Faille de l'invocateur" : "Bord du monde"
          },
          segments: [{
            type: "player-summary",
            stats: {
              kills: { value: kills },
              deaths: { value: deaths },
              assists: { value: Math.floor(Math.random() * 15) },
              score: { value: Math.floor(Math.random() * 6000) + 2000 },
              headshotsPercentage: { value: Math.floor(Math.random() * 60) },
              damageDeltaPerRound: { value: Math.floor(Math.random() * 100) - 50 }
            }
          }]
        });
      }
      
      content.replaceChildren();
      
      const warning = element("p", { className: "v8-warning", text: "Serveur tracker indisponible. Affichage de données simulées." });
      warning.style.color = "var(--v8-warning)";
      warning.style.marginBottom = "var(--v8-spacing-4)";
      warning.style.fontSize = "0.9rem";
      
      const groups = {};
      mockData.forEach(m => {
        const dateStr = new Date(m.metadata.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(m);
      });
      
      const list = element("div", { className: "v8-matches-history" });
      Object.keys(groups).forEach(dateStr => {
        list.append(renderGroup(dateStr, groups[dateStr]));
      });
      
      content.append(warning, list);
    }
  }
  
  loadMatches();
  
  return () => {
    destroyed = true;
    root.remove();
  };
}
