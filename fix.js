const fs = require('fs');
let content = fs.readFileSync('v8/pages/matches.mjs', 'utf8');

// Fix selectMode selection issue
content = content.replace(
  /const selectMode = element\("select", \{ className: "v8-matches-filter" \},[\s\S]*?\);\n\s*selectMode\.value = initialMode;/m,
  const selectMode = element("select", { className: "v8-matches-filter" }, 
    modes.map(m => element("option", { attributes: { value: m.value, ...(m.value === initialMode ? { selected: "true" } : {}) }, text: m.text }))
  );
  selectMode.value = initialMode;
);

// Fix Valorant-specific hardcodes in renderMatch
content = content.replace(
  /match\.metadata\?\.-?agentImageUrl \? element\("img", \{ attributes: \{ src: match\.metadata\.agentImageUrl \} \}\) : \n*element\("div", \{ className: "v8-match-agent-placeholder" \}\)/m,
  (match.metadata?.agentImageUrl || match.metadata?.championImageUrl || match.metadata?.legendImageUrl || match.metadata?.imageUrl) ? element("img", { attributes: { src: (match.metadata?.agentImageUrl || match.metadata?.championImageUrl || match.metadata?.legendImageUrl || match.metadata?.imageUrl) } }) : element("div", { className: "v8-match-agent-placeholder" })
);

content = content.replace(
  /element\("strong", \{ text: isWin \? "13:6" : "10:13", className: "v8-match-score" \}\)/m,
  element("strong", { text: game === "valorant" ? (isWin ? "13:6" : "10:13") : (isWin ? "V" : "D"), className: "v8-match-score" })
);

const statsToHideStr =         element("div", { className: "v8-match-stat-col" }, [
          element("small", { text: "DD"" }),
          element("strong", { text: String(dda) })
        ]),
        element("div", { className: "v8-match-stat-col" }, [
          element("small", { text: "HS%" }),
          element("strong", { text: String(hs) })
        ]),
        element("div", { className: "v8-match-stat-col" }, [
          element("small", { text: "ACS" }),
          element("strong", { text: String(acs) })
        ]);

const replacementStr =       ...(game === "valorant" ? [
        element("div", { className: "v8-match-stat-col" }, [
          element("small", { text: "DD?" }),
          element("strong", { text: String(dda) })
        ]),
        element("div", { className: "v8-match-stat-col" }, [
          element("small", { text: "HS%" }),
          element("strong", { text: String(hs) })
        ]),
        element("div", { className: "v8-match-stat-col" }, [
          element("small", { text: "ACS" }),
          element("strong", { text: String(acs) })
        ])
      ] : []);

content = content.replace(/element\("div", \{ className: "v8-match-stat-col" \}, \[\s*element\("small", \{ text: "DD.*?\]\)/s, replacementStr);


fs.writeFileSync('v8/pages/matches.mjs', content);
console.log('done');
