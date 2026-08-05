
const fs = require('fs');
let code = fs.readFileSync('v8/pages/activity.mjs', 'utf-8');

// Replace liveGrid creation
const liveGridCreation = \const liveGrid = element(\"div\", { className: \"v8-now-grid\" });\;
const replacementCreation = \
  const categoryGrids = {
    gaming: element(\"div\", { className: \"v8-now-grid\", style: \"margin-bottom: 2rem;\" }),
    social: element(\"div\", { className: \"v8-now-grid\", style: \"margin-bottom: 2rem;\" }),
    productivity: element(\"div\", { className: \"v8-now-grid\" })
  };

  const categorySections = {
    gaming: element(\"div\", { className: \"v8-live-category\" }, [
      element(\"h3\", { className: \"v8-live-category__title\", text: \"Gaming & Stats\", style: \"font-size: 0.8rem; text-transform: uppercase; color: var(--v8-text-secondary); margin-bottom: 0.5rem;\" }),
      categoryGrids.gaming
    ]),
    social: element(\"div\", { className: \"v8-live-category\" }, [
      element(\"h3\", { className: \"v8-live-category__title\", text: \"Mèdias & Social\", style: \"font-size: 0.8rem; text-transform: uppercase; color: var(--v8-text-secondary); margin-bottom: 0.5rem;\" }),
      categoryGrids.social
    ]),
    productivity: element(\"div\", { className: \"v8-live-category\" }, [
      element(\"h3\", { className: \"v8-live-category__title\", text: \"Productivitè & Quotidien\", style: \"font-size: 0.8rem; text-transform: uppercase; color: var(--v8-text-secondary); margin-bottom: 0.5rem;\" }),
      categoryGrids.productivity
    ])
  };

  const liveGrid = element(\"div\", { className: \"v8-now-wrapper\" }, [
    categorySections.gaming,
    categorySections.social,
    categorySections.productivity
  ]);

  function getCategory(id) {
    if ([\"valorant\", \"lol\", \"tracker-gg\", \"steam\", \"minecraft\", \"twitch\"].includes(id)) return \"gaming\";
    if ([\"discord\", \"spotify\", \"lastfm\", \"youtube\", \"reddit\"].includes(id)) return \"social\";
    return \"productivity\";
  }
\;

code = code.replace(liveGridCreation, replacementCreation);

// Replace liveGrid population
const populateRegex = /liveGrid\.replaceChildren\(\);\\s+liveLayout\.order\.forEach\\\(\\(id\\) => \\{\\s+if \\(liveLayout\.hidden\.includes\\(id\\)\\) return;\\s+const card = knownCards\\[id\\];\\s+if \\(card\\) liveGrid\.append\\(card\\);\\s+\\}\\);/s;

const replacementPopulate = \
    Object.values(categoryGrids).forEach(grid => grid.replaceChildren());
    liveLayout.order.forEach((id) => {
      if (liveLayout.hidden.includes(id)) return;
      const card = knownCards[id];
      if (card) categoryGrids[getCategory(id)].append(card);
    });
    
    // Hide empty categories
    Object.keys(categorySections).forEach(cat => {
      categorySections[cat].hidden = categoryGrids[cat].children.length === 0;
    });
\;

code = code.replace(populateRegex, replacementPopulate);

// replace liveGrid.append for systemCard and other stuff
const systemAppendRegex = /liveGrid\.append\\(liveCard\\(integration, connection, events\\.find\\\(\\(event\\) => event\\.source === integration\\.id\\)\\)\\);/g;
code = code.replace(systemAppendRegex, \categoryGrids.productivity.append(liveCard(integration, connection, events.find((event) => event.source === integration.id)));\);

const systemCardClassToggle = /systemCard\.classList\.toggle\\\(\"v8-now-card--solo\", liveGrid\.children\.length === 1\\\);/;
code = code.replace(systemCardClassToggle, \systemCard.classList.toggle(\"v8-now-card--solo\", categoryGrids.productivity.children.length === 1);\);

const noConnectedRegex = /if \\(!connected\\.length\\) liveGrid\\.append\\(/g;
code = code.replace(noConnectedRegex, \if (!connected.length) liveGrid.append(\);

fs.writeFileSync('v8/pages/activity.mjs', code, 'utf-8');

