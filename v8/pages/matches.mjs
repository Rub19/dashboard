import { element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { createWindowController } from "../ui/window-system.mjs";
import { translateSource } from "../i18n/catalog.mjs";

export function mountMatches(container, options = {}) {
  const { externalServices, lolLive, valorantLive, trackerLive, actions } = options;
  let destroyed = false;
  let currentMode = "all";
  let matchDetailId = 0;
  let currentName = "";
  let currentTag = "";
  let allMatches = [];
  let currentProfile = null;
  let searchQuery = "";

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

  const searchInput = (game === "valorant" || game === "lol")
    ? element("input", {
      className: "v8-matches-filter",
      style: "min-width:160px;",
      attributes: { type: "search", placeholder: translateSource("Rechercher un mate"), "aria-label": translateSource("Rechercher un mate") }
    })
    : null;
  searchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderHistory();
  });

  const headerRight = element("div", { className: "v8-matches-header-right" }, [selectMode, searchInput].filter(Boolean));
  const headerLeft = element("div", { className: "v8-matches-header-left" }, [backBtn, title]);
  header.append(headerLeft, headerRight);
  root.append(header, content);
  container.append(root);

  function formatTimeAgo(dateStr) {
    if (!dateStr) return translateSource("{value}h ago").replace("{value}", "17");
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return translateSource("Unknown");
    const diffHours = Math.floor((Date.now() - dateObj.getTime()) / 3600000);
    if (diffHours < 1) return translateSource("<1h ago");
    if (diffHours < 24) return translateSource("{value}h ago").replace("{value}", diffHours);
    return translateSource("{value}d ago").replace("{value}", Math.floor(diffHours / 24));
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

    const isLol = scoreboard.players.some(p => Array.isArray(p.items));
    const hasHs = scoreboard.players.some(p => p.stats && (p.stats.headshots != null || p.stats.headshotsPercentage != null));
    const colCount = isLol ? 9 : (hasHs ? 9 : 8);

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

    const headerCells = [
      element("th", { text: "Ag." }),
      element("th", { text: "Joueur" }),
      isLol ? null : element("th", { text: "Rank" }),
      isLol ? element("th", { text: "Dégâts" }) : element("th", { text: "Score" }),
      element("th", { text: "K" }),
      element("th", { text: "D" }),
      element("th", { text: "A" }),
      element("th", { text: "K/D" }),
      isLol ? element("th", { text: "CS" }) : (hasHs ? element("th", { text: "HS%" }) : null)
    ].filter(Boolean);
    if (isLol) headerCells.push(element("th", { text: "Objets" }));

    const table = element("table", { className: `v8-scoreboard-table${isLol ? " v8-scoreboard-table--lol" : ""}` }, [
      element("thead", {}, [element("tr", {}, headerCells)])
    ]);

    const renderPlayer = (p) => {
      const kills = Number(p.stats?.kills) || 0;
      const deaths = Number(p.stats?.deaths) || 0;
      const assists = Number(p.stats?.assists) || 0;
      const shots = (Number(p.stats?.headshots) || 0) + (Number(p.stats?.bodyshots) || 0) + (Number(p.stats?.legshots) || 0);
      const kd = deaths ? (kills / deaths).toFixed(2) : kills ? "Perf" : "0.00";
      const hs = shots ? Math.round((Number(p.stats?.headshots) || 0) / shots * 100) : 0;
      const partyDot = p.inParty ? element("span", { className: "v8-party-dot", attributes: { title: "En groupe" }, style: `background-color:${stringToColor(p.party_id)};` }) : null;
      const partyBadge = p.isPartyMember ? element("span", { className: "v8-party-badge v8-party-badge--scoreboard", attributes: { title: "Membre de votre groupe" }, text: "DUO" }) : null;
      const meBadge = p.isMe ? element("span", { className: "v8-me-badge", text: "MOI" }) : null;
      const rankText = p.currenttier_patched || "—";
      const placeholder = () => element("span", { className: "v8-scoreboard-agent v8-scoreboard-agent--placeholder", text: "?" });
      const avatar = p.assets?.champion?.small
        ? element("img", { className: "v8-scoreboard-agent", attributes: { src: p.assets.champion.small, alt: "", loading: "lazy", decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(placeholder()) } })
        : (p.assets?.agent?.small
          ? element("img", { className: "v8-scoreboard-agent", attributes: { src: p.assets.agent.small, alt: "", loading: "lazy", decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(placeholder()) } })
          : placeholder());
      const spellImg = (spell) => spell?.image ? element("img", { className: "v8-scoreboard-spell", attributes: { src: spell.image, alt: spell.name || "", title: spell.name || "", loading: "lazy", decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(element("span", { className: "v8-scoreboard-spell-placeholder" })) } }) : element("span", { className: "v8-scoreboard-spell-placeholder" });
      const runeImg = (rune) => rune?.image ? element("img", { className: "v8-scoreboard-spell", attributes: { src: rune.image, alt: rune.name || "", title: rune.name || "", loading: "lazy", decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(element("span", { className: "v8-scoreboard-spell-placeholder" })) } }) : null;
      const spells = isLol && p.assets?.spells ? element("div", { className: "v8-scoreboard-spells" }, p.assets.spells.slice(0, 2).map(spellImg)) : null;
      const rune = isLol && p.assets?.rune?.image ? element("div", { className: "v8-scoreboard-spells" }, [runeImg(p.assets.rune)]) : null;
      const agentCell = element("div", { className: "v8-scoreboard-agent-wrap" }, [avatar, rune, spells].filter(Boolean));

      const playerMeta = isLol
        ? element("small", { className: "v8-scoreboard-level", text: `Lv ${p.level || 1} • ${Math.round(p.stats?.gold || 0)} G` })
        : null;
      const rowCells = [
        element("td", { className: "v8-scoreboard-agent-cell" }, [agentCell]),
        element("td", { className: "v8-scoreboard-player-cell" }, [partyDot, partyBadge, meBadge, element("strong", { text: String(p.name || "—") }), element("span", { className: "v8-scoreboard-tag", text: p.tag ? `#${p.tag}` : "" }), playerMeta].filter(Boolean)),
        isLol ? null : element("td", { className: "v8-scoreboard-rank", text: String(rankText) }),
        element("td", { className: "v8-scoreboard-number", text: String(p.stats?.score || 0) }),
        element("td", { className: "v8-scoreboard-number", text: String(kills) }),
        element("td", { className: "v8-scoreboard-number", text: String(deaths) }),
        element("td", { className: "v8-scoreboard-number", text: String(assists) }),
        element("td", { className: "v8-scoreboard-number", text: kd })
      ].filter(Boolean);
      if (isLol) {
        rowCells.push(element("td", { className: "v8-scoreboard-number", text: String(p.stats?.cs || 0) }));
        const items = (p.items || []).slice(0, 7).map(item => item?.image ? element("img", { className: "v8-scoreboard-item", attributes: { src: item.image, alt: item.name || "", title: item.name || "", loading: "lazy", decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(element("span", { className: "v8-scoreboard-item-placeholder" })) } }) : element("span", { className: "v8-scoreboard-item-placeholder" }));
        rowCells.push(element("td", { className: "v8-scoreboard-items" }, items));
      } else if (hasHs) {
        rowCells.push(element("td", { className: "v8-scoreboard-number", text: `${hs}%` }));
      }

      return element("tr", { className: `${p.isMe ? "is-me" : ""}${p.inParty ? " is-party-member" : ""}`.trim() }, rowCells);
    };

    const ownTeam = scoreboard.players.find(p => p.isMe)?.team || null;
    const teamOrder = ownTeam ? [ownTeam, ...Object.keys(teams).filter(teamName => teamName !== ownTeam)] : ["Blue", "Red"];
    teamOrder.forEach(teamName => {
      const players = teams[teamName] || [];
      if (!players.length) return;
      const rounds = scoreboard.teams?.[teamName]?.roundsWon;
      const color = teamName === "Red" ? "var(--v8-danger)" : "var(--v8-info)";
      const label = ownTeam ? (teamName === ownTeam ? translateSource("Votre équipe") : translateSource("Ennemi")) : (teamName === "Blue" ? translateSource("Votre équipe") : translateSource("Ennemi"));
      const countSuffix = (count, one, many) => `${count} ${translateSource(count > 1 ? many : one)}`;
      const scoreLabel = Number.isFinite(rounds) ? `${label} — ${countSuffix(rounds, "round", "rounds")}` : label;
      table.append(element("tbody", { className: `v8-scoreboard-team v8-scoreboard-team--${teamName.toLowerCase()}` }, [
        element("tr", { className: "v8-scoreboard-team-header", style: `--team-color:${color}` }, [
          element("th", { attributes: { colspan: String(colCount) } }, [
            element("div", { className: "v8-scoreboard-team-header__content" }, [
              element("span", { text: scoreLabel }),
              element("strong", { text: countSuffix(players.length, "joueur", "joueurs") })
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
        match.metadata?.agentImageUrl ? element("img", { attributes: { src: match.metadata.agentImageUrl, loading: "lazy", decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(element("div", { className: "v8-match-agent-placeholder" })) } }) : element("div", { className: "v8-match-agent-placeholder" })
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
    
    const detailBody = element("div", { className: "v8-match-detail__body" });
    if (match.scoreboard) {
      const teamScore = match.metadata?.score?.team;
      const opponentScore = match.metadata?.score?.opponent;
      const finalScore = Number.isFinite(teamScore) && Number.isFinite(opponentScore)
        ? element("div", { className: "v8-match-final-score" }, [
            element("span", { text: "Score final" }),
            element("strong", { text: `${teamScore} — ${opponentScore}` })
          ])
        : null;
      detailBody.append(finalScore, renderScoreboard(match.scoreboard));
    } else {
      detailBody.append(element("p", { text: "Détails non disponibles pour ce match.", style: "color: var(--v8-text-muted);" }));
    }
    const detailContainer = element("div", { className: "v8-match-detail", attributes: { id: detailId } }, [
      element("div", { className: "v8-match-detail__inner" }, [detailBody])
    ]);
    
    const toggleDetails = () => {
      const isExpanded = detailContainer.classList.contains("is-open");
      detailContainer.classList.toggle("is-open", !isExpanded);
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

  function renderApexMatch(match) {
    const rawResult = String(match.metadata?.result || "").trim();
    const resultText = rawResult.toLowerCase();
    let placement;
    let isWin = false;
    const placeMatch = rawResult.match(/^#?\s*(\d+)\s*$/);
    if (resultText === "win" || resultText === "victory" || (placeMatch && placeMatch[1] === "1")) {
      placement = "Top 1";
      isWin = true;
    } else if (placeMatch) {
      placement = `#${placeMatch[1]}`;
    } else {
      placement = rawResult || "—";
    }
    const isLoss = !isWin && (resultText === "loss" || resultText === "defeat");
    const stateClass = isWin ? "is-win" : isLoss ? "is-loss" : "is-draw";

    const summary = match.segments?.find(s => s.type === "player-summary") || match.segments?.[0] || {};
    const stats = summary.stats || {};

    const kills = Number(stats.kills?.value ?? stats.kills ?? 0) || 0;
    const deaths = Number(stats.deaths?.value ?? stats.deaths ?? 0) || 0;
    const assists = Number(stats.assists?.value ?? stats.assists ?? 0) || 0;
    const damage = Math.round(Number(stats.damage?.value ?? stats.damage ?? 0)) || 0;
    const headshots = Math.round(Number(stats.headshots?.value ?? stats.headshots ?? 0)) || 0;
    const score = Math.round(Number(stats.score?.value ?? stats.score ?? 0)) || 0;
    const knockdowns = Number(stats.knockdowns?.value ?? stats.knockdowns ?? 0) || 0;
    const survivalTime = String(stats.timePlayed?.displayValue ?? stats.survivalTime?.displayValue ?? "");

    const timeAgo = formatTimeAgo(match.metadata?.timestamp);
    const modeName = match.metadata?.modeName || "Apex";
    const mapName = match.metadata?.mapName || "Inconnu";
    const legendName = match.metadata?.agentName || "";
    const legendImageUrl = match.metadata?.agentImageUrl || "";

    const placementClass = isWin ? "text-green" : /^#?\s*[2-5]\b/.test(rawResult) ? "text-blue" : "text-yellow";

    const detailId = `v8-match-detail-${match.id || ++matchDetailId}`;
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

    const champImg = (url) => url ? element("img", { attributes: { src: url, alt: "", loading: "lazy", decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(element("div", { className: "v8-lol-champion-placeholder" })) } }) : element("div", { className: "v8-lol-champion-placeholder" });

    const row = element("div", {
      className: `v8-lol-match-row ${stateClass}`,
      attributes: { tabindex: "0", "aria-expanded": "false", "aria-controls": detailId }
    }, [
      element("div", { className: "v8-match-accent" }),
      element("div", { className: "v8-match-agent" }, [champImg(legendImageUrl)]),
      element("div", { className: "v8-lol-match-main" }, [
        element("small", { text: `${timeAgo} // ${modeName}` }),
        element("div", { className: "v8-lol-match-mode-row" }, [
          element("strong", { className: "v8-lol-match-mode", text: legendName || "Légende" }),
          knockdowns ? element("span", { className: "v8-badge v8-badge--outline", text: `${knockdowns} KD` }) : null
        ].filter(Boolean)),
        element("div", { className: "v8-lol-match-items", style: "font-size: var(--v8-font-xs); color: var(--v8-text-secondary);" }, [element("span", { text: mapName })])
      ]),
      element("div", { className: "v8-lol-match-score" }, [
        element("small", { text: "Place" }),
        element("div", { className: "v8-match-score-value" }, [
          element("strong", { text: placement, className: `v8-match-score ${placementClass}` }),
          matchChevron
        ])
      ]),
      element("div", { className: "v8-lol-match-kda" }, [
        element("small", { text: "Kills" }),
        element("strong", { text: String(kills) }),
        element("span", { text: `${assists} assists` })
      ]),
      element("div", { className: "v8-lol-match-stat" }, [
        element("small", { text: "Dmg" }),
        element("strong", { text: String(damage) })
      ]),
      element("div", { className: "v8-lol-match-stat" }, [
        element("small", { text: "HS" }),
        element("strong", { text: String(headshots) })
      ]),
      element("div", { className: "v8-lol-match-stat" }, [
        element("small", { text: "Score" }),
        element("strong", { text: String(score) })
      ]),
      action
    ]);

    const detailBody = element("div", { className: "v8-match-detail__body" });
    if (match.scoreboard) {
      detailBody.append(
        element("p", { text: survivalTime ? `Durée : ${survivalTime}` : "Détails du scoreboard", style: "color: var(--v8-text-muted);" }),
        renderScoreboard(match.scoreboard)
      );
    } else {
      detailBody.append(
        element("p", { text: "Statistiques de la partie", style: "color: var(--v8-text-muted); font-weight: var(--v8-weight-semibold);" }),
        element("div", { className: "v8-match-group-aggregate", style: "padding: var(--v8-space-3) 0;" }, [
          element("div", { className: "v8-match-stat-col v8-profile-stat" }, [element("small", { text: "Kills" }), element("strong", { text: String(kills) })]),
          element("div", { className: "v8-match-stat-col v8-profile-stat" }, [element("small", { text: "Dégâts" }), element("strong", { text: String(damage) })]),
          element("div", { className: "v8-match-stat-col v8-profile-stat" }, [element("small", { text: "Headshots" }), element("strong", { text: String(headshots) })]),
          element("div", { className: "v8-match-stat-col v8-profile-stat" }, [element("small", { text: "Assists" }), element("strong", { text: String(assists) })]),
          element("div", { className: "v8-match-stat-col v8-profile-stat" }, [element("small", { text: "Score" }), element("strong", { text: String(score) })])
        ])
      );
    }
    const detailContainer = element("div", { className: "v8-match-detail", attributes: { id: detailId } }, [
      element("div", { className: "v8-match-detail__inner" }, [detailBody])
    ]);

    const toggleDetails = () => {
      const isExpanded = detailContainer.classList.contains("is-open");
      detailContainer.classList.toggle("is-open", !isExpanded);
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

  function renderLolMatch(match, index = 0) {
    const resultText = match.metadata?.result || "Inconnu";
    const resultLower = resultText.toLowerCase();
    const isWin = resultLower === "victory" || resultLower === "win";
    const isLoss = resultLower === "defeat" || resultLower === "loss";
    const stateClass = isWin ? "is-win" : isLoss ? "is-loss" : "is-draw";
    const stats = match.segments?.[0]?.stats || {};
    const kills = Number(stats.kills?.value) || 0;
    const deaths = Number(stats.deaths?.value) || 0;
    const assists = Number(stats.assists?.value) || 0;
    const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : (kills + assists > 0 ? "Perf" : "0.0");
    const cs = Number(stats.cs?.value) || 0;
    const csPerMin = Number(stats.csPerMin?.value) || 0;
    const dpm = Number(stats.damagePerMin?.value) || 0;
    const gpm = Number(stats.goldPerMin?.value) || 0;
    const timeAgo = formatTimeAgo(match.metadata?.timestamp);
    const duration = match.metadata?.gameDuration || "";
    const scoreValue = Number.isFinite(match.metadata?.score?.team) && Number.isFinite(match.metadata?.score?.opponent)
      ? `${match.metadata.score.team}:${match.metadata.score.opponent}`
      : "—";
    const me = match.scoreboard?.players?.find(p => p.isMe);
    const myTeam = me?.team || "Blue";
    const opponentTeam = myTeam === "Blue" ? "Red" : "Blue";
    const myTeamPlayers = match.scoreboard?.players?.filter(p => p.team === myTeam) || [];
    const opponentPlayers = match.scoreboard?.players?.filter(p => p.team === opponentTeam) || [];

    const eager = index < 3 ? "eager" : "lazy";
    const champImg = (url, champ, loading = "lazy") => url ? element("img", { attributes: { src: url, alt: champ || "", loading, decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(element("div", { className: "v8-lol-champion-placeholder" })) } }) : element("div", { className: "v8-lol-champion-placeholder" });
    const itemImg = (item, loading = "lazy") => {
      const image = item && typeof item === "object" ? item.image : item;
      const name = item && typeof item === "object" ? item.name : "";
      if (!image) return element("div", { className: "v8-lol-item-placeholder" });
      return element("img", { attributes: { src: image, alt: name || "", title: name || "", loading, decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(element("div", { className: "v8-lol-item-placeholder" })) } });
    };
    const spellImg = (spell, loading = "lazy") => {
      if (!spell?.image) return element("div", { className: "v8-lol-spell-placeholder" });
      return element("img", { className: "v8-lol-spell", attributes: { src: spell.image, alt: spell.name || "", title: spell.name || "", loading, decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(element("div", { className: "v8-lol-spell-placeholder" })) } });
    };
    const runeImg = (rune, loading = "lazy") => {
      if (!rune?.image) return element("div", { className: "v8-lol-spell-placeholder" });
      return element("img", { className: "v8-lol-spell", attributes: { src: rune.image, alt: rune.name || "", title: rune.name || "", loading, decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(element("div", { className: "v8-lol-spell-placeholder" })) } });
    };
    const renderChampStrip = (players) => element("div", { className: "v8-lol-team-strip" }, players.slice(0, 5).map(p => champImg(p.assets?.champion?.small, p.character, "lazy")));

    const detailId = `v8-match-detail-${match.id || ++matchDetailId}`;
    const matchChevron = element("span", { className: "v8-match-chevron", text: "⌄" });
    const action = element("button", { className: "v8-match-action", attributes: { type: "button", "aria-label": "Afficher les détails du match", "aria-expanded": "false", "aria-controls": detailId } }, [icon("chevron-down")]);

    const myStats = me?.stats || {};
    const totalCs = Math.round(Number(myStats.cs) || 0);
    const totalDamage = Math.round(Number(myStats.damage) || 0);
    const totalGold = Math.round(Number(myStats.gold) || 0);
    const teamKills = Number(match.scoreboard?.teams?.[myTeam]?.roundsWon) || 0;
    const killParticipation = teamKills > 0 ? Math.round(((kills + assists) / teamKills) * 100) : 0;

    const statsSummary = element("div", { style: "display:flex;gap:var(--v8-space-3);flex-wrap:wrap;font-size:var(--v8-font-xs);color:var(--v8-text-secondary);" }, [
      element("span", { text: `CS ${totalCs}` }),
      element("span", { text: `DMG ${totalDamage}` }),
      element("span", { text: `GOLD ${totalGold}` }),
      element("span", { text: `KP ${killParticipation}%` })
    ]);

    const levelBadge = me?.level ? element("span", { className: "v8-lol-match-level", text: String(me.level) }) : null;
    const champAvatar = match.metadata?.agentImageUrl
      ? champImg(match.metadata.agentImageUrl, match.metadata?.agentName, eager)
      : element("div", { className: "v8-lol-champion-placeholder" });
    const agentCell = element("div", { className: "v8-match-agent" }, [champAvatar, levelBadge].filter(Boolean));

    const row = element("div", { className: `v8-lol-match-row ${stateClass}`, attributes: { tabindex: "0", "aria-expanded": "false", "aria-controls": detailId } }, [
      element("div", { className: "v8-match-accent" }),
      agentCell,
      element("div", { className: "v8-lol-match-main" }, [
        element("small", { text: `${timeAgo}${duration ? ` // ${duration}` : ""}` }),
        element("div", { className: "v8-lol-match-mode-row" }, [
          element("strong", { className: "v8-lol-match-mode", text: match.metadata?.agentName || match.metadata?.modeName || "Normal" }),
          me?.assets?.rune?.image ? runeImg(me.assets.rune, eager) : null,
          ...(me?.assets?.spells || []).map((spell) => spellImg(spell, eager))
        ].filter(Boolean)),
        element("div", { className: "v8-lol-match-items" }, (me?.items || [0,0,0,0,0,0]).map((item) => itemImg(item, eager))),
        statsSummary
      ]),
      element("div", { className: "v8-lol-match-score" }, [
        element("small", { text: "Score" }),
        element("div", { className: "v8-match-score-value" }, [
          element("strong", { text: scoreValue, className: "v8-match-score" }),
          matchChevron
        ])
      ]),
      element("div", { className: "v8-lol-match-kda" }, [
        element("small", { text: "KDA" }),
        element("strong", { text: kda }),
        element("span", { text: `${kills} / ${deaths} / ${assists}` })
      ]),
      element("div", { className: "v8-lol-match-stat" }, [
        element("small", { text: "CS/min" }),
        element("strong", { text: String(csPerMin) })
      ]),
      element("div", { className: "v8-lol-match-stat" }, [
        element("small", { text: "DPM" }),
        element("strong", { text: String(Math.round(dpm)) })
      ]),
      element("div", { className: "v8-lol-match-teams" }, [
        renderChampStrip(myTeamPlayers),
        renderChampStrip(opponentPlayers)
      ]),
      action
    ]);

    const detailBody = element("div", { className: "v8-match-detail__body" });
    if (match.scoreboard) {
      const teamScore = match.metadata?.score?.team;
      const opponentScore = match.metadata?.score?.opponent;
      const finalScore = Number.isFinite(teamScore) && Number.isFinite(opponentScore)
        ? element("div", { className: "v8-match-final-score" }, [
            element("span", { text: "Score final" }),
            element("strong", { text: `${teamScore} — ${opponentScore}` })
          ])
        : null;
      detailBody.append(finalScore, renderScoreboard(match.scoreboard));
    } else {
      detailBody.append(element("p", { text: "Détails non disponibles pour ce match.", style: "color: var(--v8-text-muted);" }));
    }
    const detailContainer = element("div", { className: "v8-match-detail", attributes: { id: detailId } }, [
      element("div", { className: "v8-match-detail__inner" }, [detailBody])
    ]);

    const toggleDetails = () => {
      const isExpanded = detailContainer.classList.contains("is-open");
      detailContainer.classList.toggle("is-open", !isExpanded);
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
    let totalDamage = 0, totalGold = 0, totalMinutes = 0;
    let totalApexDamage = 0, totalApexHeadshots = 0;
    let matchesWithStats = 0;
    
    matches.forEach(m => {
       const result = String(m.metadata?.result || "").toLowerCase().trim();
       if (result === "victory" || result === "win" || /^#?\s*1\s*$/.test(result)) wins++;
       else if (result === "defeat" || result === "loss") losses++;

       const summary = m.segments?.find(s => s.type === "player-summary")?.stats || m.segments?.[0]?.stats || {};
       const k = Number(summary.kills?.value ?? summary.kills ?? 0) || 0;
       const d = Number(summary.deaths?.value ?? summary.deaths ?? 0) || 0;
       const a = Number(summary.assists?.value ?? summary.assists ?? 0) || 0;
       totalKills += k;
       totalDeaths += d;
       totalAssists += a;
       totalDamage += Number(summary.damagePerMin?.value) || 0;
       totalGold += Number(summary.goldPerMin?.value) || 0;
       totalMinutes += 1;

       const acs = Number(summary.scorePerRound?.value || 0);
       const hs = Number(summary.headshotsPercentage?.value || 0);
       const dda = Number(summary.damageDeltaPerRound?.value || 0);

       if (game === "apex") {
         totalApexDamage += Number(summary.damage?.value ?? summary.damage ?? 0) || 0;
         totalApexHeadshots += Number(summary.headshots?.value ?? summary.headshots ?? 0) || 0;
       }

       matchesWithStats++;
       totalACS += acs;
       totalHS += hs;
       totalDDA += dda;
    });
    
    const kdRatio = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills > 0 ? "Perf" : "0.0";
    const kda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists) > 0 ? "Perf" : "0.0";
    const kdaAvg = matchesWithStats ? `${Math.round(totalKills/matchesWithStats)} // ${Math.round(totalDeaths/matchesWithStats)} // ${Math.round(totalAssists/matchesWithStats)}` : "0 // 0 // 0";
    const avgDDA = matchesWithStats ? Math.round(totalDDA / matchesWithStats) : 0;
    const avgHS = matchesWithStats ? Math.round(totalHS / matchesWithStats) : 0;
    const avgACS = matchesWithStats ? Math.round(totalACS / matchesWithStats) : 0;
    const avgDPM = totalMinutes ? Math.round(totalDamage / totalMinutes) : 0;
    const avgGPM = totalMinutes ? Math.round(totalGold / totalMinutes) : 0;
    
    const reportButton = element("button", { className: "v8-button v8-button--outline v8-button--small v8-match-report-btn", attributes: { type: "button" } }, [icon("chart-spline"), element("span", { text: "View Report" })]);
    reportButton.addEventListener("click", () => openSessionReport(dateStr, matches, allMatches, reportButton));
    const isLolGroup = game === "lol";
    const isApexGroup = game === "apex";
    let aggregateCols;
    if (isLolGroup) {
      aggregateCols = [
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "Avg KDA" }), element("strong", { text: kda })]),
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "Avg DPM" }), element("strong", { text: String(avgDPM) })]),
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "Avg GPM" }), element("strong", { text: String(avgGPM) })]),
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "K/D" }), element("strong", { text: kdRatio })])
      ];
    } else if (isApexGroup) {
      const avgApexKills = matchesWithStats ? Math.round(totalKills / matchesWithStats) : 0;
      const avgApexDamage = matchesWithStats ? Math.round(totalApexDamage / matchesWithStats) : 0;
      const avgApexHeadshots = matchesWithStats ? Math.round(totalApexHeadshots / matchesWithStats) : 0;
      aggregateCols = [
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "K/D" }), element("strong", { text: kdRatio })]),
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "Avg Kills" }), element("strong", { text: String(avgApexKills) })]),
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "Avg Dmg" }), element("strong", { text: String(avgApexDamage) })]),
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "Avg HS" }), element("strong", { text: String(avgApexHeadshots) })])
      ];
    } else {
      aggregateCols = [
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "K/D" }), element("strong", { text: kdRatio })]),
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: `${totalKills} K // ${totalDeaths} D // ${totalAssists} A` }), element("strong", { text: `${kdaAvg} K/D/A` })]),
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "DDΔ" }), element("strong", { text: String(avgDDA) })]),
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "HS%" }), element("strong", { text: String(avgHS) })]),
        element("div", { className: "v8-match-stat-col" }, [element("small", { text: "ACS" }), element("strong", { text: String(avgACS) })])
      ];
    }
    const headerRow = element("div", { className: "v8-match-group-header" }, [
      element("div", { className: "v8-match-group-date" }, [
        element("strong", { text: dateStr }),
        element("span", { className: "v8-match-group-count", text: String(matches.length) }),
        reportButton
      ]),
      element("div", { className: "v8-match-group-wl" }, [
        element("span", { className: "text-green", text: `${wins} ${translateSource("W")}` }),
        element("span", { className: "v8-muted", text: " // " }),
        element("span", { className: "text-red", text: `${losses} ${translateSource("L")}` })
      ]),
      element("div", { className: "v8-match-group-aggregate" }, aggregateCols)
    ]);
    
    const rows = matches.map((m, i) => game === "lol" ? renderLolMatch(m, i) : game === "apex" ? renderApexMatch(m) : renderMatch(m));
    
    return element("div", { className: "v8-match-group" }, [
      headerRow,
      ...rows
    ]);
  }

  function renderValorantProfile(profile) {
    const handle = profile?.handle;
    let displayName = currentName;
    let displayTag = currentTag;
    if (!displayName && handle && handle.includes("#")) {
      [displayName, displayTag] = handle.split("#");
    }
    displayName = displayName || profile?.name || "—";
    displayTag = displayTag || profile?.tag || "";

    function getRankText() {
      const direct = profile?.currenttier_patched ?? profile?.currenttierpatched ?? profile?.rank;
      if (direct != null && direct !== "" && direct !== 0) return String(direct);
      const segments = profile?.segments || [];
      for (let i = segments.length - 1; i >= 0; i--) {
        const stats = segments[i]?.stats || {};
        const rankStat = stats.ranked || stats.rank || stats.rating;
        if (rankStat?.displayValue && String(rankStat.displayValue) !== "") return String(rankStat.displayValue);
      }
      return translateSource("Unranked");
    }

    function getStatItems() {
      const segment = (profile?.segments || []).slice(-1)[0];
      const stats = segment?.stats || {};
      const pick = (keys, label) => {
        for (const key of keys) {
          const s = stats[key];
          if (s?.displayValue != null) return [label, String(s.displayValue)];
        }
        return null;
      };

      const items = [];
      const wins = pick(["wins"], "Wins");
      const losses = pick(["losses"], "Losses");
      if (wins && losses) {
        items.push(["W/L", `${wins[1]} / ${losses[1]}`]);
      } else {
        if (wins) items.push(wins);
        if (losses) items.push(losses);
      }

      const kd = pick(["kd", "kdr", "killsDeaths", "killsDeathsRatio"], "K/D");
      const hs = pick(["headshots", "headshotsPercentage", "headshotPercentage", "hs"], "HS%");
      const winRate = pick(["winRate", "winPercentage", "winsPercentage"], "Win %");
      if (kd) items.push(kd);
      if (hs) items.push(hs);
      if (winRate) items.push(winRate);

      if (items.length) return items;

      const excluded = new Set(["rank", "ranked", "rating"]);
      return Object.entries(stats)
        .filter(([, s]) => s?.displayValue != null)
        .filter(([key]) => !excluded.has(key))
        .slice(0, 4)
        .map(([, s]) => [s.displayName || "—", String(s.displayValue)]);
    }

    const avatarUrl = profile?.avatarUrl;
    const placeholder = element("div", { className: "v8-match-agent-placeholder" });
    const avatarImg = avatarUrl
      ? element("img", {
          attributes: { src: avatarUrl, alt: "", loading: "lazy", decoding: "async" },
          events: { error: (event) => event.currentTarget.replaceWith(placeholder) }
        })
      : placeholder;
    const avatar = element("div", { className: "v8-match-agent" }, [avatarImg]);

    const title = displayTag ? `${displayName} #${displayTag}` : displayName;
    const statItems = getStatItems();
    const statsEl = statItems.length
      ? element("div", { className: "v8-profile-stats" }, statItems.map(([label, value]) =>
          element("div", { className: "v8-match-stat-col v8-profile-stat" }, [
            element("small", { text: label }),
            element("strong", { text: value })
          ])
        ))
      : null;

    return element("header", { className: "v8-match-group v8-surface v8-valorant-profile" }, [
      avatar,
      element("div", { className: "v8-profile-info" }, [
        element("strong", { className: "v8-profile-name", text: title }),
        element("span", { className: "v8-profile-rank", text: getRankText() })
      ]),
      statsEl
    ]);
  }

  function buildProfileHeader(profile, cls, rankKeys) {
    const displayName = currentName || profile?.name || profile?.handle || "—";
    const displayTag = currentTag || profile?.tag || "";
    const title = displayTag ? `${displayName} #${displayTag}` : displayName;

    function getRankText() {
      for (const segment of (profile?.segments || [])) {
        const stats = segment?.stats || {};
        for (const key of rankKeys) {
          const s = stats[key];
          if (s == null) continue;
          const value = s.displayValue ?? s.value ?? s;
          if (value != null && String(value) !== "" && String(value) !== "0") return String(value);
        }
      }
      return translateSource("Unranked");
    }

    function getStatItems() {
      const excluded = new Set(["rank", "ranked", "rating", ...rankKeys]);
      const items = [];
      for (const segment of (profile?.segments || [])) {
        const stats = segment?.stats || {};
        for (const [key, s] of Object.entries(stats)) {
          if (excluded.has(key)) continue;
          const value = s?.displayValue ?? s?.value ?? s;
          if (value == null || String(value) === "") continue;
          const label = s?.displayName || s?.name || key;
          items.push([label, String(value)]);
          if (items.length >= 4) break;
        }
        if (items.length >= 4) break;
      }
      return items;
    }

    const avatarUrl = profile?.avatarUrl;
    const placeholder = element("div", { className: "v8-match-agent-placeholder" });
    const avatarImg = avatarUrl
      ? element("img", {
          attributes: { src: avatarUrl, alt: "", loading: "lazy", decoding: "async" },
          events: { error: (event) => event.currentTarget.replaceWith(placeholder) }
        })
      : placeholder;
    const avatar = element("div", { className: "v8-match-agent" }, [avatarImg]);

    const statItems = getStatItems();
    const statsEl = statItems.length
      ? element("div", { className: "v8-profile-stats" }, statItems.map(([label, value]) =>
          element("div", { className: "v8-match-stat-col v8-profile-stat" }, [
            element("small", { text: label }),
            element("strong", { text: value })
          ])
        ))
      : null;

    return element("header", { className: `v8-match-group v8-surface ${cls}` }, [
      avatar,
      element("div", { className: "v8-profile-info" }, [
        element("strong", { className: "v8-profile-name", text: title }),
        element("span", { className: "v8-profile-rank", text: getRankText() })
      ]),
      statsEl
    ]);
  }

  function renderLolProfile(profile) {
    let displayName = currentName;
    let displayTag = currentTag;
    if (!displayName && profile?.handle && profile.handle.includes("#")) {
      [displayName, displayTag] = profile.handle.split("#");
    }
    displayName = displayName || profile?.name || "—";
    displayTag = displayTag || profile?.tag || "";
    const title = displayTag ? `${displayName} #${displayTag}` : displayName;

    const overview = (profile?.segments || []).find(s => s.type === "overview") || profile?.segments?.[0] || {};
    const stats = overview?.stats || {};
    const tier = stats.rank?.displayValue || stats.tier?.displayValue || "";
    const lp = stats.lp?.displayValue || "";
    const level = stats.level?.displayValue || "";
    const rankText = [tier, lp, level ? `${translateSource("Niveau")} ${level}` : ""].filter(Boolean).join(" · ") || translateSource("Unranked");

    function getMatchStatItems() {
      const matches = allMatches.filter(m => m.scoreboard?.players?.some(p => p.isMe));
      if (!matches.length) return [];
      const total = matches.length;
      let wins = 0, kills = 0, deaths = 0, assists = 0, cs = 0, dpm = 0, gpm = 0;
      matches.forEach((m) => {
        const result = String(m.metadata?.result || "").toLowerCase();
        if (result === "victory" || result === "win") wins++;
        const me = m.scoreboard.players.find(p => p.isMe);
        kills += Number(me?.stats?.kills) || 0;
        deaths += Number(me?.stats?.deaths) || 0;
        assists += Number(me?.stats?.assists) || 0;
        cs += Number(me?.stats?.csPerMin) || 0;
        dpm += Number(me?.stats?.damagePerMin) || 0;
        gpm += Number(me?.stats?.goldPerMin) || 0;
      });
      const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : (kills + assists > 0 ? "Perf" : "0.0");
      const winRate = total ? Math.round((wins / total) * 100) : 0;
      return [
        [translateSource("W/L"), `${wins} / ${total - wins}`],
        [translateSource("Win %"), `${winRate}%`],
        [translateSource("KDA"), kda],
        [translateSource("CS/min"), (cs / total).toFixed(1)],
        [translateSource("DPM"), String(Math.round(dpm / total))],
        [translateSource("GPM"), String(Math.round(gpm / total))]
      ].slice(0, 4);
    }

    const matchItems = getMatchStatItems();
    const fallbackItems = [
      tier ? [translateSource("Rank"), tier] : null,
      lp ? [translateSource("LP"), lp] : null,
      level ? [translateSource("Niveau"), level] : null
    ].filter(Boolean);
    const statItems = matchItems.length ? matchItems : fallbackItems.slice(0, 4);

    const avatarUrl = profile?.avatarUrl;
    const placeholder = element("div", { className: "v8-match-agent-placeholder" });
    const avatarImg = avatarUrl
      ? element("img", { attributes: { src: avatarUrl, alt: "", loading: "lazy", decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(placeholder) } })
      : placeholder;
    const avatar = element("div", { className: "v8-match-agent" }, [avatarImg]);

    const statsEl = statItems.length
      ? element("div", { className: "v8-profile-stats" }, statItems.map(([label, value]) =>
          element("div", { className: "v8-match-stat-col v8-profile-stat" }, [
            element("small", { text: label }),
            element("strong", { text: value })
          ])
        ))
      : null;

    return element("header", { className: "v8-match-group v8-surface v8-lol-profile" }, [
      avatar,
      element("div", { className: "v8-profile-info" }, [
        element("strong", { className: "v8-profile-name", text: title, attributes: { translate: "no" } }),
        element("span", { className: "v8-profile-rank", text: rankText })
      ]),
      statsEl
    ]);
  }

  function renderApexProfile(profile) {
    const displayName = currentName || profile?.handle || profile?.name || "—";
    const overview = (profile?.segments || []).find(s => s.type === "overview") || profile?.segments?.[0] || {};
    const stats = overview?.stats || {};

    function pickStat(keys, label) {
      for (const key of keys) {
        const s = stats[key];
        if (s == null) continue;
        const value = s.displayValue ?? s.value ?? s;
        if (value != null && String(value) !== "" && String(value) !== "0") {
          return { label: s.displayName || label, value: String(value) };
        }
      }
      return null;
    }

    const rank = pickStat(["rankScore", "rank", "ranked", "rating", "arenaRankScore", "brRankScore"], "Rank");
    const level = pickStat(["level", "accountLevel", "account level", "playerLevel"], "Level");
    const kills = pickStat(["kills", "killsAsLegend", "totalKills"], "Kills");
    const wins = pickStat(["wins", "totalWins", "gamesWon"], "Wins");
    const damage = pickStat(["damage", "totalDamage", "damageDealt"], "Dégâts");
    const kd = pickStat(["kd", "kdr", "killsDeathsRatio", "killsPerMatch"], "K/D");

    const rankText = rank ? `${rank.label}: ${rank.value}` : (level ? `${level.label}: ${level.value}` : translateSource("Unranked"));
    const statItems = [kills, wins, damage, kd].filter(Boolean).slice(0, 4);
    if (statItems.length < 4 && level) statItems.push(level);

    const avatarUrl = profile?.avatarUrl;
    const placeholder = element("div", { className: "v8-match-agent-placeholder" });
    const avatarImg = avatarUrl
      ? element("img", { attributes: { src: avatarUrl, alt: "", loading: "lazy", decoding: "async" }, events: { error: (event) => event.currentTarget.replaceWith(placeholder) } })
      : placeholder;
    const avatar = element("div", { className: "v8-match-agent" }, [avatarImg]);

    const statsEl = statItems.length
      ? element("div", { className: "v8-profile-stats" }, statItems.map((item) =>
          element("div", { className: "v8-match-stat-col v8-profile-stat" }, [
            element("small", { text: item.label }),
            element("strong", { text: item.value })
          ])
        ))
      : null;

    return element("header", { className: "v8-match-group v8-surface v8-apex-profile" }, [
      avatar,
      element("div", { className: "v8-profile-info" }, [
        element("strong", { className: "v8-profile-name", text: displayName, attributes: { translate: "no" } }),
        element("span", { className: "v8-profile-rank", text: rankText })
      ]),
      statsEl
    ]);
  }

  function renderSkeleton() {
    return element("div", { className: "v8-matches-skeleton" }, [
      element("div", { className: "v8-matches-skeleton__bar" }),
      element("div", { className: "v8-matches-skeleton__bar" }),
      element("div", { className: "v8-matches-skeleton__bar" })
    ]);
  }

  function filterMatches(matches) {
    if (!searchQuery) return matches;
    const q = searchQuery;
    return matches.filter((m) => {
      const players = m.scoreboard?.players || [];
      return players.some((p) => {
        if (p.isMe) return false;
        const name = String(p.name || "").toLowerCase();
        const tag = String(p.tag || "").toLowerCase();
        return name.includes(q) || tag.includes(q) || `${name}#${tag}`.includes(q);
      });
    });
  }

  function renderHistory() {
    if (destroyed) return;
    content.replaceChildren();
    if (game === "valorant") {
      content.append(renderValorantProfile(currentProfile));
    } else if (game === "lol") {
      content.append(renderLolProfile(currentProfile));
    } else if (game === "apex") {
      content.append(renderApexProfile(currentProfile));
    }

    const filtered = filterMatches(allMatches);
    if (!filtered || filtered.length === 0) {
      content.append(element("p", { className: "v8-empty", text: searchQuery ? translateSource("Aucun match avec ce mate trouvé.") : translateSource("Aucun match trouvé pour ce mode.") }));
      refreshIcons();
      return;
    }

    const groups = {};
    filtered.forEach((m) => {
      let dateObj = m.metadata?.timestamp ? new Date(m.metadata.timestamp) : new Date();
      if (isNaN(dateObj.getTime())) dateObj = new Date();
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(m);
    });

    const list = element("div", { className: "v8-matches-history" });
    Object.keys(groups).forEach((dateStr) => {
      list.append(renderGroup(dateStr, groups[dateStr], allMatches));
    });

    content.append(list);
    refreshIcons();
  }

  let dataLoaded = false;
  async function loadMatches() {
    if (destroyed) return;
    content.replaceChildren();
    content.append(renderSkeleton());
    searchQuery = "";
    if (searchInput) searchInput.value = "";

    try {
      let data;
      let profileData = null;
      if (game === "valorant") {
        const state = valorantLive?.state?.() || {};
        const riotId = state.tag ? `${state.name}#${state.tag}` : "";
        if (!riotId || !state.available) throw new Error("En attente de la connexion Lanyard...");
        const [name, tag] = riotId.split("#");
        currentName = name;
        currentTag = tag;
        const res = await externalServices.tracker.valorantMatches(name, tag, currentMode);
        data = res.data;
        try {
          const profileRes = await externalServices.tracker.valorantProfile(name, tag);
          profileData = profileRes?.data || null;
        } catch {}
      } else if (game === "lol") {
        const state = lolLive?.state?.() || {};
        const riotId = state.tag ? `${state.name}#${state.tag}` : "";
        if (!riotId || !state.available) throw new Error("En attente de la connexion Lanyard...");
        const [name, tag] = riotId.split("#");
        currentName = name;
        currentTag = tag;
        const res = await externalServices.tracker.lolMatches(name, tag, currentMode);
        data = res.data;
        try {
          const profileRes = await externalServices.tracker.lolProfile(name, tag);
          profileData = profileRes?.data || null;
        } catch {}
      } else if (game === "apex") {
        const state = trackerLive?.state?.() || {};
        const handle = state.handle;
        if (!handle || !state.available) throw new Error("En attente de la connexion Lanyard...");
        currentName = handle;
        currentTag = "";
        const res = await externalServices.tracker.apexMatches("origin", handle, currentMode);
        data = res.data;
        try {
          const profileRes = await externalServices.tracker.apexProfile("origin", handle);
          profileData = profileRes?.data || null;
        } catch {}
      } else {
        throw new Error("Jeu non supporté");
      }
      
      dataLoaded = true;
      allMatches = data || [];
      currentProfile = profileData || null;
      if (destroyed) return;
      renderHistory();
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
