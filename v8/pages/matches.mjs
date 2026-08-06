import { element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { createWindowController } from "../ui/window-system.mjs";

export function mountMatches(container, options = {}) {
  const { externalServices, lolLive, valorantLive, trackerLive, actions } = options;
  let destroyed = false;
  let currentMode = "all";
  let matchDetailId = 0;

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
    modes.map(m => element("option", { attributes: { value: m.value }, text: m.text }))
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
    if (!scoreboard || !scoreboard.players) return element("div", { className: "v8-scoreboard-empty", text: "Détails du scoreboard non disponibles" });

    const container = element("div", { className: "v8-scoreboard" });
    const teams = { Red: [], Blue: [] };
    scoreboard.players.forEach(p => {
      const t = p.team || "Blue";
      if (!teams[t]) teams[t] = [];
      teams[t].push(p);
    });
    Object.keys(teams).forEach(t => {
      teams[t].sort((a,b) => (b.stats?.score || 0) - (a.stats?.score || 0));
    });

    const table = element("table", { className: "v8-scoreboard-table" }, [
      element("thead", {}, [element("tr", {}, [
        element("th", { text: "Ag." }), element("th", { text: "Joueur" }), element("th", { text: "Rank" }),
        element("th", { text: "Score" }), element("th", { text: "K" }), element("th", { text: "D" }),
        element("th", { text: "A" }), element("th", { text: "K/D" }), element("th", { text: "HS%" })
      ])])
    ]);

    const renderPlayer = (p) => {
      const kills = Number(p.stats?.kills) || 0;
      const deaths = Number(p.stats?.deaths) || 0;
      const shots = (Number(p.stats?.headshots) || 0) + (Number(p.stats?.bodyshots) || 0) + (Number(p.stats?.legshots) || 0);
      const kd = deaths ? (kills / deaths).toFixed(2) : kills ? "Perf" : "0.00";
      const hs = shots ? Math.round((Number(p.stats?.headshots) || 0) / shots * 100) : 0;
      const partyDot = p.inParty ? element("span", { className: "v8-party-dot", attributes: { title: "En groupe" }, style: `background-color:${stringToColor(p.party_id)};` }) : null;
      const partyBadge = p.isPartyMember ? element("span", { className: "v8-party-badge v8-party-badge--scoreboard", attributes: { title: "Membre de votre groupe" }, text: "DUO" }) : null;
      const meBadge = p.isMe ? element("span", { className: "v8-me-badge", text: "MOI" }) : null;
      const rankText = p.currenttier_patched && p.currenttier_patched !== "Unrated" ? p.currenttier_patched : "—";
      const placeholder = () => element("span", { className: "v8-scoreboard-agent v8-scoreboard-agent--placeholder", text: "?" });
      const avatar = p.assets?.agent?.small
        ? element("img", { className: "v8-scoreboard-agent", attributes: { src: p.assets.agent.small, alt: "", loading: "lazy" }, events: { error: (event) => event.currentTarget.replaceWith(placeholder()) } })
        : placeholder();
      return element("tr", { className: `${p.isMe ? "is-me" : ""}${p.inParty ? " is-party-member" : ""}`.trim() }, [
        element("td", { className: "v8-scoreboard-agent-cell" }, [avatar]),
        element("td", { className: "v8-scoreboard-player-cell" }, [partyDot, partyBadge, meBadge, element("strong", { text: String(p.name || "—") }), element("span", { className: "v8-scoreboard-tag", text: p.tag ? `#${p.tag}` : "" })].filter(Boolean)),
        element("td", { className: "v8-scoreboard-rank", text: String(rankText) }),
        element("td", { className: "v8-scoreboard-number", text: String(p.stats?.score || 0) }),
        element("td", { className: "v8-scoreboard-number", text: String(kills) }),
        element("td", { className: "v8-scoreboard-number", text: String(deaths) }),
        element("td", { className: "v8-scoreboard-number", text: String(p.stats?.assists || 0) }),
        element("td", { className: "v8-scoreboard-number", text: kd }),
        element("td", { className: "v8-scoreboard-number", text: `${hs}%` })
      ]);
    };

    const ownTeam = scoreboard.players.find(p => p.isMe)?.team || null;
    const teamOrder = ownTeam ? [ownTeam, ...Object.keys(teams).filter(teamName => teamName !== ownTeam)] : ["Blue", "Red"];
    teamOrder.forEach(teamName => {
      const players = teams[teamName] || [];
      if (!players.length) return;
      const rounds = scoreboard.teams?.[teamName]?.roundsWon;
      const color = teamName === "Red" ? "var(--v8-danger)" : "var(--v8-info)";
      const label = ownTeam ? (teamName === ownTeam ? "Votre équipe" : "Ennemi") : (teamName === "Blue" ? "Votre équipe" : "Ennemi");
      const scoreLabel = Number.isFinite(rounds) ? `${label} — ${rounds} round${rounds > 1 ? "s" : ""}` : label;
      table.append(element("tbody", { className: `v8-scoreboard-team v8-scoreboard-team--${teamName.toLowerCase()}` }, [
        element("tr", { className: "v8-scoreboard-team-header", style: `--team-color:${color}` }, [
          element("th", { attributes: { colspan: "9" } }, [
            element("div", { className: "v8-scoreboard-team-header__content" }, [
              element("span", { text: scoreLabel }),
              element("strong", { text: `${players.length} joueur${players.length > 1 ? "s" : ""}` })
            ])
          ])
        ]),
        ...players.map(renderPlayer)
      ]));
    });
    container.append(table);

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
    const acs = Math.round(Number(stats.scorePerRound?.value || 0));
    const hs = Math.round(Number(stats.headshotsPercentage?.value || 0));
    const dda = Math.round(Number(stats.damageDeltaPerRound?.value || 0));
    
    const timeAgo = formatTimeAgo(match.metadata?.timestamp);
    const modeName = match.metadata?.modeName || "Normal";
    
    const badgesContainer = element("div", { className: "v8-match-badges" });
    const topScore = Math.max(...(match.scoreboard?.players || []).map(p => Number(p.stats?.score) || 0), 0);
    if (topScore > 0 && Number(stats.score?.value) === topScore) badgesContainer.append(element("span", { className: "v8-badge v8-badge--gold", text: "MVP" }));
    const partyMembers = match.scoreboard?.partyMembers || [];
    const partyBadge = partyMembers.length
      ? element("span", {
        className: "v8-match-party-badge",
        attributes: {
          title: `Avec ${partyMembers.map(p => `${p.name}${p.tag ? `#${p.tag}` : ""}`).join(", ")}`
        }
      }, [icon("users-round"), element("span", { text: partyMembers.length > 1 ? "Trio" : "Duo" })])
      : null;
    
    const kdClass = Number(kdRatio) >= 1.5 ? "text-blue" : Number(kdRatio) >= 1.0 ? "text-green" : "text-yellow";
    
    const detailId = `v8-match-detail-${match.id || ++matchDetailId}`;
    const scoreValue = Number.isFinite(match.metadata?.score?.team) && Number.isFinite(match.metadata?.score?.opponent)
      ? `${match.metadata.score.team}:${match.metadata.score.opponent}`
      : "—";
    const matchChevron = element("span", { className: "v8-match-chevron", text: "⌄" });
    const action = element("button", {
      className: "v8-match-action",
      attributes: {
        type: "button",
        "aria-label": "Afficher les détails du match",
        "aria-expanded": "false",
        "aria-controls": detailId
      }
    }, [icon("chevron-down")]);
    const row = element("div", {
      className: `v8-match-row ${stateClass}`,
      attributes: { tabindex: "0", "aria-expanded": "false", "aria-controls": detailId }
    }, [
      element("div", { className: "v8-match-accent" }),
      element("div", { className: "v8-match-agent" }, [
        match.metadata?.agentImageUrl ? element("img", { attributes: { src: match.metadata.agentImageUrl } }) : element("div", { className: "v8-match-agent-placeholder" })
      ]),
      element("div", { className: "v8-match-info" }, [
        element("small", { className: "v8-match-meta" }, [
          element("span", { text: `${timeAgo} // ${modeName}` }),
          partyBadge
        ]),
        element("strong", { className: "v8-match-map" }, [
          element("span", { text: match.metadata?.mapName || "Inconnu" }),
          badgesContainer
        ])
      ]),
      element("div", { className: "v8-match-score-col" }, [
        element("small", { text: "Score" }),
        element("div", { className: "v8-match-score-value" }, [
          element("strong", { text: scoreValue, className: "v8-match-score" }),
          matchChevron
        ])
      ]),
      element("div", { className: "v8-match-stat-col v8-match-stat-col--kd" }, [
        element("small", { text: "K/D" }),
        element("strong", { text: kdRatio, className: kdClass })
      ]),
      element("div", { className: "v8-match-stat-col v8-match-stat-col--kda" }, [
        element("small", { text: "K/D/A" }),
        element("strong", { text: `${kills} / ${deaths} / ${assists}` })
      ]),
      element("div", { className: "v8-match-stat-col v8-match-stat-col--dda" }, [
        element("small", { text: "DDΔ" }),
        element("strong", { text: String(dda) })
      ]),
      element("div", { className: "v8-match-stat-col v8-match-stat-col--hs" }, [
        element("small", { text: "HS%" }),
        element("strong", { text: String(hs) })
      ]),
      element("div", { className: "v8-match-stat-col v8-match-stat-col--acs" }, [
        element("small", { text: "ACS" }),
        element("strong", { text: String(acs) })
      ]),
      action
    ]);
    
    const detailContainer = element("div", { className: "v8-match-detail-container", attributes: { id: detailId, hidden: true } });
    if (match.scoreboard) {
      const teamScore = match.metadata?.score?.team;
      const opponentScore = match.metadata?.score?.opponent;
      const finalScore = Number.isFinite(teamScore) && Number.isFinite(opponentScore)
        ? element("div", { className: "v8-match-final-score" }, [
            element("span", { text: "Score final" }),
            element("strong", { text: `${teamScore} — ${opponentScore}` })
          ])
        : null;
      detailContainer.append(finalScore, renderScoreboard(match.scoreboard));
    } else {
       detailContainer.append(element("p", { text: "Détails non disponibles pour ce match.", style: "color: var(--v8-text-muted);" }));
    }
    
    const toggleDetails = () => {
      const isExpanded = !detailContainer.hidden;
      detailContainer.hidden = isExpanded;
      row.setAttribute("aria-expanded", String(!isExpanded));
      action.setAttribute("aria-expanded", String(!isExpanded));
      action.setAttribute("aria-label", isExpanded ? "Afficher les détails du match" : "Masquer les détails du match");
      action.classList.toggle("is-expanded", !isExpanded);
      if (matchChevron) matchChevron.textContent = isExpanded ? "⌄" : "⌃";
    };
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      toggleDetails();
    });
    row.addEventListener("keydown", (event) => {
      if (event.target.closest("button")) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleDetails();
      }
    });
    action.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleDetails();
    });
    
    row.style.cursor = "pointer";

    return element("div", { className: "v8-match-wrapper", style: "margin-bottom: var(--v8-space-2); background: var(--v8-surface-1); border-radius: var(--v8-radius-lg); overflow: hidden;" }, [row, detailContainer]);
  }
  function reportMetric(match) {
    const stats = match.segments?.[0]?.stats || {};
    const kills = Number(stats.kills?.value) || 0;
    const deaths = Number(stats.deaths?.value) || 0;
    const adr = Number(stats.adr?.value);
    return {
      kd: deaths > 0 ? kills / deaths : kills > 0 ? null : 0,
      acs: Number(stats.scorePerRound?.value),
      hs: Number(stats.headshotsPercentage?.value),
      adr: Number.isFinite(adr) && adr > 0 ? adr : null
    };
  }

  function averageReportMetrics(matches) {
    const values = matches.map(reportMetric);
    const average = (key) => {
      const available = values.map(value => value[key]).filter(Number.isFinite);
      return available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null;
    };
    return Object.freeze({
      kd: average("kd"),
      acs: average("acs"),
      hs: average("hs"),
      adr: average("adr")
    });
  }

  function openSessionReport(dateStr, matches, allMatches, reportButton) {
    const baselineMatches = allMatches.filter(match => !matches.includes(match));
    const values = averageReportMetrics(matches);
    const baseline = averageReportMetrics(baselineMatches);
    const close = () => controller.close();
    const controller = createWindowController({ onEscape: close });
    const closeButton = element("button", {
      className: "v8-button v8-button--ghost v8-session-report__close",
      attributes: { type: "button", "aria-label": "Fermer le rapport de session" }
    }, [icon("x")]);
    const delta = (value, reference) => {
      if (!Number.isFinite(value) || !Number.isFinite(reference)) return null;
      const amount = value - reference;
      const sign = amount > 0 ? "+" : "";
      return element("span", {
        className: `v8-session-report__delta ${amount >= 0 ? "is-positive" : "is-negative"}`,
        text: `${sign}${amount.toFixed(2)} vs historique`
      });
    };
    const tile = (label, value, reference, suffix = "") => element("article", { className: "v8-session-report__tile" }, [
      element("small", { text: label }),
      element("strong", { text: Number.isFinite(value) ? `${value.toFixed(label === "HS%" ? 0 : 2)}${suffix}` : "—" }),
      delta(value, reference)
    ]);
    const list = element("div", { className: "v8-session-report__matches" }, [
      element("h3", { text: "Matchs de la journée" }),
      ...matches.map(match => element("button", {
        className: "v8-session-report__match",
        attributes: { type: "button" },
        events: { click: () => document.getElementById(`v8-match-detail-${match.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }) }
      }, [
        element("span", { text: match.metadata?.mapName || "Carte inconnue" }),
        element("small", { text: `${match.metadata?.modeName || "Normal"} · ${match.metadata?.result || "—"}` }),
        element("strong", { text: `${match.metadata?.score?.team ?? "—"}:${match.metadata?.score?.opponent ?? "—"}` })
      ]))
    ]);
    const surface = element("section", {
      className: "v8-session-report",
      attributes: { role: "dialog", "aria-modal": "true", "aria-labelledby": "v8-session-report-title", tabindex: "-1" }
    }, [
      element("header", { className: "v8-session-report__header" }, [
        element("div", {}, [
          element("small", { text: "Rapport de session" }),
          element("h2", { id: "v8-session-report-title", text: dateStr })
        ]),
        closeButton
      ]),
      element("div", { className: "v8-session-report__body" }, [
        list,
        element("div", { className: "v8-session-report__stats" }, [
          tile("K/D", values.kd, baseline.kd),
          tile("ACS", values.acs, baseline.acs),
          tile("HS%", values.hs, baseline.hs, "%"),
          tile("ADR", values.adr, baseline.adr)
        ])
      ])
    ]);
    const layer = element("div", { className: "v8-session-report-layer", attributes: { "data-v8-layer": "dialog" } }, [surface]);
    closeButton.addEventListener("click", close);
    layer.addEventListener("click", event => { if (event.target === layer) close(); });
    document.body.append(layer);
    controller.open(layer, { initialFocus: () => closeButton, onAfterClose: () => layer.remove() });
    refreshIcons();
    reportButton?.blur?.();
  }

  function renderGroup(dateStr, matches, allMatches) {
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
       
       const acs = Number(summary.scorePerRound?.value || 0);
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
    
    const reportButton = element("button", { className: "v8-button v8-button--outline v8-button--small v8-match-report-btn", attributes: { type: "button" } }, [icon("chart-spline"), element("span", { text: "View Report" })]);
    reportButton.addEventListener("click", () => openSessionReport(dateStr, matches, allMatches, reportButton));
    const headerRow = element("div", { className: "v8-match-group-header" }, [
      element("div", { className: "v8-match-group-date" }, [
        element("strong", { text: dateStr }),
        element("span", { className: "v8-match-group-count", text: String(matches.length) }),
        reportButton
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
  
  let dataLoaded = false;
  async function loadMatches() {
    if (destroyed) return;
    content.replaceChildren();
    content.append(element("p", { className: "v8-loading", text: "Chargement de l'historique..." }));
    
    try {
      let data;
      if (game === "valorant") {
        const state = valorantLive?.state?.() || {};
        const riotId = state.tag ? `${state.name}#${state.tag}` : "";
        if (!riotId || !state.available) throw new Error("En attente de la connexion Lanyard...");
        const [name, tag] = riotId.split("#");
        const res = await externalServices.tracker.valorantMatches(name, tag, currentMode);
        data = res.data;
      } else if (game === "lol") {
        const state = lolLive?.state?.() || {};
        const riotId = state.tag ? `${state.name}#${state.tag}` : "";
        if (!riotId || !state.available) throw new Error("En attente de la connexion Lanyard...");
        const [name, tag] = riotId.split("#");
        const res = await externalServices.tracker.lolMatches(name, tag, currentMode);
        data = res.data;
      } else if (game === "apex") {
        const state = trackerLive?.state?.() || {};
        const handle = state.handle;
        if (!handle || !state.available) throw new Error("En attente de la connexion Lanyard...");
        const res = await externalServices.tracker.apexMatches("origin", handle, currentMode);
        data = res.data;
      } else {
        throw new Error("Jeu non supporté");
      }
      
      dataLoaded = true;
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
        list.append(renderGroup(dateStr, groups[dateStr], data));
      });
      
      content.append(list);
      refreshIcons();
    } catch (e) {
      if (destroyed) return;
      
      content.replaceChildren(emptyState({
        className: "v8-matches-error",
        kind: "error",
        iconName: "alert-circle",
        eyebrow: "Historique des matchs",
        title: "Impossible de récupérer les matchs",
        description: e.message || "La clé API Tracker.gg est peut-être manquante ou invalide."
      }));
    }
  }
  
  const liveService = game === "valorant" ? valorantLive : game === "lol" ? lolLive : trackerLive;
  const unsubscribe = liveService?.subscribe?.((state) => {
    if (!dataLoaded && state.available) {
      loadMatches();
    }
  });

  loadMatches();
  
  return () => {
    destroyed = true;
    unsubscribe?.();
    root.remove();
  };
}
