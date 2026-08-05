import { element } from "../ui/dom.mjs";

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
  backBtn.addEventListener("click", () => actions?.navigate?.("home"));
  
  const title = element("h1", { text: `Historique ${game === "valorant" ? "Valorant" : "League of Legends"}` });
  
  const selectMode = element("select", { className: "v8-matches-filter" }, [
    element("option", { value: "all", text: "Tous les modes" }),
    element("option", { value: "competitive", text: "Compétitif" }),
    element("option", { value: "unrated", text: "Non Classé" }),
    element("option", { value: "swiftplay", text: "Partie Rapide" })
  ]);
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
  
  async function loadMatches() {
    if (destroyed) return;
    content.innerHTML = "";
    content.append(element("p", { className: "v8-loading", text: "Chargement de l'historique..." }));
    
    try {
      let data;
      if (game === "valorant") {
        const riotId = valorantLive?.state?.()?.tag ? `${valorantLive.state().name}#${valorantLive.state().tag}` : "";
        if (!riotId) throw new Error("Riot ID Valorant manquant.");
        const [name, tag] = riotId.split("#");
        const res = await externalServices.tracker.valorantMatches(name, tag, currentMode);
        data = res.data;
      } else {
        const riotId = lolLive?.state?.()?.tag ? `${lolLive.state().name}#${lolLive.state().tag}` : "";
        if (!riotId) throw new Error("Riot ID League of Legends manquant.");
        const [name, tag] = riotId.split("#");
        const res = await externalServices.tracker.lolMatches(name, tag, currentMode);
        data = res.data;
      }
      if (destroyed) return;
      
      content.innerHTML = "";
      if (!data || data.length === 0) {
        content.append(element("p", { className: "v8-empty", text: "Aucun match trouvé pour ce mode." }));
        return;
      }
      
      const list = element("div", { className: "v8-matches-list" });
      data.forEach(match => {
        const resultText = match.metadata?.result || "Inconnu";
        const isWin = resultText.toLowerCase() === "victory" || resultText.toLowerCase() === "win";
        const isLoss = resultText.toLowerCase() === "defeat" || resultText.toLowerCase() === "loss";
        
        const summary = match.segments?.find(s => s.type === "player-summary") || match.segments?.[0] || {};
        const stats = summary.stats || {};
        
        const kills = stats.kills?.displayValue || "0";
        const deaths = stats.deaths?.displayValue || "0";
        const assists = stats.assists?.displayValue || "0";
        
        const card = element("div", { className: `v8-match-card ${isWin ? "is-win" : isLoss ? "is-loss" : ""}` }, [
          element("div", { className: "v8-match-card__image" }, [
            match.metadata?.agentImageUrl ? element("img", { attributes: { src: match.metadata.agentImageUrl } }) : ""
          ]),
          element("div", { className: "v8-match-card__info" }, [
            element("strong", { text: `${match.metadata?.modeName || "Match"} - ${match.metadata?.mapName || "Map"}` }),
            element("p", { text: `Agent: ${match.metadata?.agentName || "Inconnu"}` })
          ]),
          element("div", { className: "v8-match-card__stats" }, [
            element("strong", { className: "v8-match-card__result", text: resultText.toUpperCase() }),
            element("span", { className: "v8-match-card__kda", text: `${kills} / ${deaths} / ${assists}` })
          ])
        ]);
        list.append(card);
      });
      content.append(list);
    } catch (e) {
      if (destroyed) return;
      content.innerHTML = "";
      content.append(element("p", { className: "v8-error", text: "Impossible de charger l'historique : " + e.message }));
    }
  }
  
  loadMatches();
  
  return () => {
    destroyed = true;
    root.remove();
  };
}
