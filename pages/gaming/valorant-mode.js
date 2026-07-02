/* ETHONE legacy compatibility module: valorant-mode. */
function renderValoModeContent(mmr,matches,name,tag,mode){
  const container=document.getElementById('valo-mode-content');if(!container)return;
  let html='';
  const puuid=curP()?.state?.gaming?.valo?.puuid||'';
  const nameLow=name.toLowerCase(),tagLow=tag.toLowerCase();

  function findMe(m){
    const players=m.players?.all_players||[];
    if(puuid){const p=players.find(pl=>pl.puuid===puuid);if(p)return p;}
    return players.find(pl=>(pl.name||'').toLowerCase()===nameLow&&(pl.tag||'').toLowerCase()===tagLow);
  }

  if(!matches||!matches.length){
    container.innerHTML=`<div class="game-not-connected" style="padding:20px">No matches found in ${mode} mode</div>`;
    return;
  }

  // Build match data
  const myMatches=matches.slice(0,20).map(m=>({match:m,me:findMe(m)})).filter(x=>x.me);
  if(!myMatches.length){container.innerHTML=`<div class="game-not-connected">Could not find your stats in matches</div>`;return;}

  // Aggregate stats
  let totalK=0,totalD=0,totalA=0,totalHS=0,totalShots=0,totalWins=0,totalACS=0,totalFB=0,totalDmg=0;
  const agentMap={},mapCount={};
  let bestMatchKDA=0,bestMatch=null;

  myMatches.forEach(({match:m,me})=>{
    const won=m.teams?.[me.team?.toLowerCase()]?.has_won;
    const k=me.stats?.kills||0,d=me.stats?.deaths||1,a=me.stats?.assists||0;
    const hs=me.stats?.headshots||0,body=me.stats?.bodyshots||0,leg=me.stats?.legshots||0;
    const acs=me.stats?.score?(me.stats.score/Math.max(1,(m.teams?.red?.rounds_won||0)+(m.teams?.blue?.rounds_won||0))):0;
    const fb=me.stats?.firstbloods||0;
    const dmg=me.damage_made||0;
    totalK+=k;totalD+=d;totalA+=a;totalHS+=hs;totalShots+=hs+body+leg;
    totalACS+=acs;totalFB+=fb;totalDmg+=dmg;
    if(won)totalWins++;
    const kda=(k+a)/d;
    if(kda>bestMatchKDA){bestMatchKDA=kda;bestMatch={match:m,me,won,k,d,a,kda:kda.toFixed(2),acs:Math.round(acs)};}
    const ag=me.character||'?';
    if(!agentMap[ag])agentMap[ag]={wins:0,games:0,kills:0,deaths:1,assists:0,acs:0,img:me.assets?.agent?.small||''};
    agentMap[ag].games++;if(won)agentMap[ag].wins++;
    agentMap[ag].kills+=k;agentMap[ag].deaths+=d;agentMap[ag].assists+=a;agentMap[ag].acs+=acs;
    const map=m.metadata?.map||'?';
    if(!mapCount[map])mapCount[map]={wins:0,games:0};
    mapCount[map].games++;if(won)mapCount[map].wins++;
  });

  const n=myMatches.length;
  const hsP=totalShots>0?Math.round((totalHS/totalShots)*100):0;
  const wr=n>0?Math.round((totalWins/n)*100):0;
  const avgKDA=totalD>0?((totalK+totalA)/totalD).toFixed(2):'-';
  const avgACS=n>0?Math.round(totalACS/n):0;
  const avgFB=n>0?(totalFB/n).toFixed(1):0;
  const favAgent=Object.entries(agentMap).sort((a,b)=>b[1].games-a[1].games)[0];
  const favMap=Object.entries(mapCount).sort((a,b)=>b[1].games-a[1].games)[0];

  // -- SUMMARY STATS --
  html+=`<div class="valo-stats-row">`;
  [
    {label:'KDA',    val:avgKDA, color: parseFloat(avgKDA)>=1.2?'good':parseFloat(avgKDA)<0.9?'bad':''},
    {label:'ACS',    val:avgACS, color: avgACS>=200?'good':avgACS<150?'bad':''},
    {label:'HS %',   val:hsP+'%',color: hsP>=25?'good':hsP<15?'bad':''},
    {label:'Winrate',val:wr+'%', color: wr>=50?'good':'bad'},
    {label:'FB/game',val:avgFB,  color:''},
    {label:'Played', val:n,      color:''},
  ].forEach(s=>html+=`<div class="valo-stat-cell">
    <div class="valo-stat-val${s.color?' '+s.color:''}">${s.val}</div>
    <div class="valo-stat-lbl">${s.label}</div>
  </div>`);
  html+=`</div>`;

  // -- WINRATE GRAPH (last 10) --
  const last10=myMatches.slice(0,10);
  html+=`<div style="margin-bottom:18px">
    <div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Winrate (last 10 matches)</div>
    <div style="display:flex;gap:3px;align-items:flex-end;height:36px">`;
  last10.forEach(({match:m,me},i)=>{
    const won=m.teams?.[me.team?.toLowerCase()]?.has_won;
    const wins=last10.slice(0,i+1).filter(({match:mm,me:mme})=>mm.teams?.[mme.team?.toLowerCase()]?.has_won).length;
    const pct=Math.round((wins/(i+1))*100);
    html+=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px" title="${won?'WIN':'LOSS'} · WR ${pct}%">
      <div style="width:100%;height:28px;background:${won?'rgba(52,211,153,0.7)':'rgba(248,113,113,0.7)'};border-radius:3px 3px 0 0;min-height:4px"></div>
      <div style="font-size:8px;color:var(--muted)">${pct}%</div>
    </div>`;
  });
  html+=`</div></div>`;

  // -- BEST MATCH --
  if(bestMatch){
    const bm=bestMatch;
    const agImg=bm.me.assets?.agent?.small;
    const map=bm.match.metadata?.map||'?';
    html+=`<div style="margin-bottom:18px">
      <div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Best Match</div>
      <div style="background:var(--surface2);border:1px solid rgba(251,191,36,.2);border-left:3px solid var(--accent4);border-radius:var(--r-sm);padding:12px 16px;display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:9px;overflow:hidden;background:var(--surface3);flex-shrink:0;display:flex;align-items:center;justify-content:center">
          ${agImg?`<img src="${agImg}" style="width:100%;height:100%;object-fit:cover">`:'🎮'}
        </div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${bm.me.character} · <span style="color:${getMapStyle(map).color};font-weight:700">${map}</span></div>
          <div style="font-size:12px;color:var(--muted)">${bm.k}/${bm.d}/${bm.a} · KDA ${bm.kda} · ACS ${bm.acs}</div>
        </div>
        <span style="background:rgba(251,191,36,.12);color:var(--accent4);font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px">⭐ BEST</span>
      </div>
    </div>`;
  }

  // -- FAVOURITE AGENT + MAP --
  html+=`<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">`;
  if(favAgent){
    const [ag,s]=favAgent;
    const agWR=Math.round((s.wins/s.games)*100);
    const agImg=s.img?`<img src="${s.img}" alt="${ag}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.style.display='none'">`:ag[0];
    html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:12px 16px;flex:1;min-width:150px;display:flex;align-items:center;gap:12px">
      <div style="width:44px;height:44px;border-radius:10px;overflow:hidden;background:var(--surface3);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px">${agImg}</div>
      <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Favorite Agent</div>
      <div style="font-size:15px;font-weight:700">${ag}</div>
      <div style="font-size:12px;color:var(--muted)">${s.games} matches · ${agWR}% WR</div></div>
    </div>`;
  }
  if(favMap){
    const [map,ms]=favMap;
    const mapWR=Math.round((ms.wins/ms.games)*100);
    html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:12px 16px;flex:1;min-width:150px;display:flex;align-items:center;gap:12px">
      <div style="width:44px;height:44px;border-radius:10px;background:rgba(255,255,255,.06);flex-shrink:0;overflow:hidden">
        ${VALO_MAP_IMAGES[map]
          ? `<img src="${VALO_MAP_IMAGES[map]}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.parentNode.innerHTML='🗺️'">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" fill="none" stroke="${getMapStyle(map).color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg></div>`
        }
      </div>
      <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Favorite Map</div>
      <div style="font-size:15px;font-weight:700;color:${getMapStyle(map).color}">${map}</div>
      <div style="font-size:12px;color:var(--muted)">${ms.games} matches · ${mapWR}% WR</div></div>
    </div>`;
  }
  html+=`</div>`;

  // -- RR PROGRESSION CHART (competitive only) --
  if(mode==='competitive'&&myMatches.length>1){
    const rrPoints=[];let runningRR=currentData?.ranking_in_tier||0;
    [...myMatches].reverse().forEach(({match:m,me},i)=>{
      const won=m.teams?.[me.team?.toLowerCase()]?.has_won;
      const rrChange=won?20:-15; // approximate
      if(i===0)rrPoints.push({rr:runningRR,won:true,label:'Start'});
      runningRR=Math.max(0,Math.min(100,runningRR+rrChange));
      rrPoints.push({rr:runningRR,won,label:`Match ${i+1}`});
    });
    const minRR=Math.max(0,Math.min(...rrPoints.map(p=>p.rr))-5);
    const maxRR=Math.min(100,Math.max(...rrPoints.map(p=>p.rr))+5);
    const W=400,H=70;
    const xStep=W/(rrPoints.length-1);
    const yScale=(rr)=>H-((rr-minRR)/(maxRR-minRR||1))*(H-8)-4;
    const pts=rrPoints.map((p,i)=>`${i*xStep},${yScale(p.rr)}`).join(' ');
    const polylineOpen=`<polyline class="valo-rr-line" points="${pts}" stroke="${currentData?.ranking_in_tier>=(rrPoints[0]?.rr||0)?'#34d399':'#f87171'}"/>`;
    const areaPath=`M0,${H} ${rrPoints.map((p,i)=>`${i*xStep},${yScale(p.rr)}`).join(' ')} ${(rrPoints.length-1)*xStep},${H} Z`;
    const dots=rrPoints.slice(1).map((p,i)=>`<circle class="valo-rr-dot" cx="${(i+1)*xStep}" cy="${yScale(p.rr)}" r="3" fill="${p.won?'#34d399':'#f87171'}" stroke="rgba(5,5,7,.8)" stroke-width="1.5"/>`).join('');
    html+=`<div class="lfm-section-label" style="margin-bottom:8px">RR progression</div>
    <div class="valo-rr-chart" style="margin-bottom:14px">
      <svg class="valo-rr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <line class="valo-rr-zero-line" x1="0" y1="${yScale(50)}" x2="${W}" y2="${yScale(50)}"/>
        <path class="valo-rr-area" d="${areaPath}" fill="${currentData?.ranking_in_tier>=(rrPoints[0]?.rr||0)?'#34d399':'#f87171'}"/>
        ${polylineOpen}
        ${dots}
      </svg>
      <div class="valo-rr-tooltip" id="valo-rr-tip"></div>
    </div>`;
  }

  // -- MATCH LIST (last 10) --
  html+=`<div class="lfm-section-label" style="margin-bottom:10px">Last ${Math.min(n,10)} matches</div>`;
  html+=`<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:18px">`;
  window._valoMatchList=myMatches;
  myMatches.slice(0,10).forEach(({match:m,me},_mIdx)=>{
    const won=m.teams?.[me.team?.toLowerCase()]?.has_won;
    const k=me.stats?.kills||0,d=me.stats?.deaths||1,a=me.stats?.assists||0;
    const hs=me.stats?.headshots||0,body=me.stats?.bodyshots||0,leg=me.stats?.legshots||0;
    const shots=hs+body+leg;
    const hsP=shots>0?Math.round((hs/shots)*100):0;
    const kda=((k+a)/d).toFixed(1);
    const rounds=(m.teams?.red?.rounds_won||0)+(m.teams?.blue?.rounds_won||0);
    const acs=rounds>0?Math.round((me.stats?.score||0)/rounds):0;
    const agentName=me.character||'?';
    const agentImg=me.assets?.agent?.small;
    const map=m.metadata?.map||'?';
    const myTeam=me.team?.toLowerCase();
    const theirTeam=myTeam==='red'?'blue':'red';
    const myScore=m.teams?.[myTeam]?.rounds_won??'?';
    const theirScore=m.teams?.[theirTeam]?.rounds_won??'?';

    // MVP detection
    const allPlayers=m.players?.all_players||[];
    const myTeamPlayers=allPlayers.filter(p=>p.team?.toLowerCase()===myTeam);
    const allSorted=[...allPlayers].sort((a,b)=>(b.stats?.score||0)-(a.stats?.score||0));
    const teamSorted=[...myTeamPlayers].sort((a,b)=>(b.stats?.score||0)-(a.stats?.score||0));
    const isMVP=allSorted[0]?.puuid===me.puuid||(allSorted[0]?.name===me.name&&allSorted[0]?.tag===me.tag);
    const isTeamMVP=!isMVP&&(teamSorted[0]?.puuid===me.puuid||(teamSorted[0]?.name===me.name&&teamSorted[0]?.tag===me.tag));

    html+=`<div class="valo-match-row" onclick="openValoMatchDetail(${_mIdx},'${name}','${tag}')" style="cursor:pointer">
      <div class="valo-match-bar ${won?'win':'loss'}"></div>
      <div class="valo-match-agent">
        ${agentImg?`<img src="${agentImg}" alt="${agentName}" onerror="this.style.display='none'">`:`<span style="font-size:13px">${agentName[0]}</span>`}
      </div>
      <div style="flex:1;min-width:0">
        <div class="valo-match-map">
          ${agentName} · <span style="color:${won?'#34d399':'#f87171'};font-weight:700">${map}</span>
        </div>
        <div class="valo-match-kda">${k}/${d}/${a} · KDA ${kda} · ACS ${acs} · HS ${hsP}%</div>
      </div>
      ${isMVP
        ?`<span style="background:linear-gradient(135deg,rgba(251,191,36,.18),rgba(139,92,246,.12));color:#fbbf24;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;border:1px solid rgba(251,191,36,.3);letter-spacing:.04em;display:flex;align-items:center;gap:4px;flex-shrink:0"><svg viewBox="0 0 24 24" fill="currentColor" style="width:11px;height:11px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> MVP</span>`
        :isTeamMVP
          ?`<span style="background:rgba(148,163,184,.1);color:#94a3b8;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;border:1px solid rgba(148,163,184,.25);letter-spacing:.04em;display:flex;align-items:center;gap:4px;flex-shrink:0"><svg viewBox="0 0 24 24" fill="currentColor" style="width:11px;height:11px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> TMVP</span>`
          :''}
      <span class="valo-match-result ${won?'win':'loss'}">${won?'WIN':'LOSS'} ${myScore}-${theirScore}</span>
    </div>`;
  });
  html+=`</div>`;

  // -- ALL AGENTS STATS --
  const agentsSorted=Object.entries(agentMap).sort((a,b)=>b[1].games-a[1].games);
  if(agentsSorted.length>1){
    html+=`<div class="lfm-section-label" style="margin-bottom:10px">Stats by agent</div>`;
    html+=`<div class="valo-agents-grid" style="margin-bottom:18px">`;
    agentsSorted.slice(0,6).forEach(([ag,s])=>{
      const agWR=Math.round((s.wins/s.games)*100);
      const agKD=(s.kills/s.deaths).toFixed(1);
      const agImg=s.img;
      html+=`<div class="valo-agent-card">
        ${agImg
          ?`<img class="valo-agent-img" src="${agImg}" alt="${ag}" onerror="this.style.display='none'">`
          :`<div class="valo-agent-img" style="display:flex;align-items:center;justify-content:center;font-size:18px">${ag[0]}</div>`}
        <div class="valo-agent-name">${ag}</div>
        <div class="valo-agent-kd">KD ${agKD} · ${s.games}g · ${agWR}%</div>
      </div>`;
    });
    html+=`</div>`;
  }

  container.innerHTML=html;
}
