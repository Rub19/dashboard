/* ETHONE legacy compatibility module: valorant-render. */
function renderValoStats(mmr,matchCache,name,tag,activeMode){
  const area=document.getElementById('valo-stats-area');if(!area)return;
  activeMode=activeMode||'competitive';
  let html='';

    html+=`<div id="_valo_mmr_store" data-mmr='${JSON.stringify(mmr||null)}' style="display:none"></div>`;

  // -- RANK HERO (competitive only) --
  const currentData=mmr?.current_data||mmr;
  if(currentData?.currenttierpatched){
    const rankName=currentData.currenttierpatched||'Unranked';
    const rr=currentData.ranking_in_tier||0;
    const icon=VALO_RANKS[rankName]||'🎮';

    const compMatches=matchCache?.competitive||[];
    let wr=0,wrLabel='Winrate',winsCount=0,played=0;
    if(compMatches.length>0){
      const puuid=curP()?.state?.gaming?.valo?.puuid||'';
      const nameLow=(name||'').toLowerCase(),tagLow=(tag||'').toLowerCase();
      compMatches.forEach(m=>{
        const players=m.players?.all_players||[];
        const me=puuid?players.find(p=>p.puuid===puuid):players.find(p=>(p.name||'').toLowerCase()===nameLow&&(p.tag||'').toLowerCase()===tagLow);
        if(!me)return;
        played++;
        if(m.teams?.[me.team?.toLowerCase()]?.has_won)winsCount++;
      });
      if(played>0){wr=Math.round((winsCount/played)*100);wrLabel=`${played} games`;}
    } else {
      const wins=currentData.wins||0;
      const total=(currentData.games_needed_for_rating||0)+wins;
      wr=total>0?Math.round((wins/total)*100):0;
    }

    // Winrate ring SVG
    const r=22,circ=Math.round(2*Math.PI*r);
    const offset=circ*(1-wr/100);
    const wrColor=wr>=50?'#34d399':'#f87171';

    html+=`<div class="valo-rank-hero">
      <div class="valo-rank-emblem">${icon}</div>
      <div style="flex:1;min-width:0">
        <div class="valo-rank-name">${rankName}</div>
        <div class="valo-rr-badge">${rr} RR</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
        <div class="valo-wr-ring">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="${r}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="4"/>
            <circle cx="26" cy="26" r="${r}" fill="none" stroke="${wrColor}" stroke-width="4"
              stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
              style="transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dashoffset .8s ease"/>
          </svg>
          <div class="valo-wr-pct" style="color:${wrColor}">${wr}%</div>
        </div>
        <div style="font-size:9.5px;color:var(--muted2);font-family:var(--mono);text-align:center">${wrLabel}</div>
      </div>
    </div>`;
  }

  // Mode tabs
  const tabLabels={competitive:'Competitive',swiftplay:'Swiftplay',unrated:'Unrated'};
  html+=`<div class="cat-tabs" style="margin-bottom:16px">`;
  ['competitive','swiftplay','unrated'].forEach(m=>{
    const active=m===activeMode;
    const count=(matchCache[m]||[]).length;
    html+=`<button id="valo-tab-${m}" onclick="switchValoTab('${m}')" class="cat-tab${active?' active':''}">${tabLabels[m]}${count>0?` <span style="font-size:10px;opacity:.6;font-family:var(--mono)">${count}</span>`:''}`;
    html+=`</button>`;
  });
  html+=`</div>`;

  // -- MODE CONTENT PLACEHOLDER --
  html+=`<div id="valo-mode-content"></div>`;

  area.innerHTML=html;

  // Render content for active tab
  renderValoModeContent(mmr,matchCache[activeMode]||[],name,tag,activeMode);
}


const VALO_MAP_IMAGES={
  'Ascent':'https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png',
  'Bind':'https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/splash.png',
  'Breeze':'https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/splash.png',
  'Fracture':'https://media.valorant-api.com/maps/b529448b-4d60-346e-e89e-00a4c527a405/splash.png',
  'Haven':'https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7825ad2a2723/splash.png',
  'Icebox':'https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/splash.png',
  'Lotus':'https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/splash.png',
  'Pearl':'https://media.valorant-api.com/maps/fd267378-4d1d-484f-ff52-77821f8ade96/splash.png',
  'Split':'https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/splash.png',
  'Sunset':'https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39a33f7ede75/splash.png',
  'Abyss':'https://media.valorant-api.com/maps/224b0a95-48b9-f703-1bd8-67aca101a61f/splash.png',
  'District':'https://media.valorant-api.com/maps/690b3ed2-4dff-945b-8223-6da834e30d24/splash.png',
  'Kasbah':'https://media.valorant-api.com/maps/12452a9d-48c3-0b02-e7eb-0381c3520404/splash.png',
  'Piazza':'https://media.valorant-api.com/maps/de28aa9b-4cbe-1003-320e-6cb3ec309557/splash.png',
  'Drift':'https://media.valorant-api.com/maps/1a5b9b76-a765-e6d8-db01-56965cb12e54/splash.png',
  'Glitch':'https://media.valorant-api.com/maps/19b15d6e-4e5a-e3d9-c7b0-3a8cee0707e5/splash.png',
};

const VALO_MAP_COLORS={
  'Ascent':  {color:'#4ade80', bg:'rgba(74,222,128,.12)'},
  'Bind':    {color:'#a78bfa', bg:'rgba(167,139,250,.12)'},
  'Breeze':  {color:'#38bdf8', bg:'rgba(56,189,248,.12)'},
  'Cosmos':  {color:'#a78bfa', bg:'rgba(167,139,250,.12)'},
  'District':{color:'#f472b6', bg:'rgba(244,114,182,.12)'},
  'Drift':   {color:'#67e8f9', bg:'rgba(103,232,249,.12)'},
  'Fracture':{color:'#f87171', bg:'rgba(248,113,113,.12)'},
  'Haven':   {color:'#fbbf24', bg:'rgba(251,191,36,.12)'},
  'Icebox':  {color:'#93c5fd', bg:'rgba(147,197,253,.12)'},
  'Kasbah':  {color:'#c4b5fd', bg:'rgba(253,186,116,.12)'},
  'Lotus':   {color:'#f9a8d4', bg:'rgba(249,168,212,.12)'},
  'Pearl':   {color:'#6ee7b7', bg:'rgba(110,231,183,.12)'},
  'Piazza':  {color:'#fde68a', bg:'rgba(253,230,138,.12)'},
  'Split':   {color:'#8b5cf6', bg:'rgba(139,92,246,.12)'},
  'Sunset':  {color:'#a78bfa', bg:'rgba(167,139,250,.12)'},
  'Abyss':   {color:'#818cf8', bg:'rgba(129,140,248,.12)'},
};
