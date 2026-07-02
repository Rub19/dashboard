/* ETHONE legacy compatibility module: valorant-match-detail. */
function openValoMatchDetail(idx,name,tag){
  const matchData=window._valoMatchList?.[idx];
  if(!matchData)return;
  const {match:m,me}=matchData;
  const map=m.metadata?.map||'?';
  const mode=m.metadata?.mode||'';
  const won=m.teams?.[me.team?.toLowerCase()]?.has_won;
  const myTeam=me.team?.toLowerCase()||'blue';
  const theirTeam=myTeam==='red'?'blue':'red';
  const myScore=m.teams?.[myTeam]?.rounds_won??'?';
  const theirScore=m.teams?.[theirTeam]?.rounds_won??'?';
  const allPlayers=m.players?.all_players||[];
  const teamA=allPlayers.filter(p=>p.team?.toLowerCase()===myTeam).sort((a,b)=>(b.stats?.score||0)-(a.stats?.score||0));
  const teamB=allPlayers.filter(p=>p.team?.toLowerCase()===theirTeam).sort((a,b)=>(b.stats?.score||0)-(a.stats?.score||0));
  const mapStyle=getMapStyle(map);
  function playerRow(p,highlight){
    const k=p.stats?.kills||0,d=p.stats?.deaths||1,a=p.stats?.assists||0;
    const hs=p.stats?.headshots||0,shots=(hs+(p.stats?.bodyshots||0)+(p.stats?.legshots||0));
    const hsP=shots>0?Math.round((hs/shots)*100):0;
    const rounds=(m.teams?.red?.rounds_won||0)+(m.teams?.blue?.rounds_won||0);
    const acs=rounds>0?Math.round((p.stats?.score||0)/rounds):0;
    const img=p.assets?.agent?.small||'';
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;background:${highlight?'rgba(139,92,246,.08)':'rgba(255,255,255,.02)'};border:1px solid ${highlight?'rgba(139,92,246,.2)':'rgba(255,255,255,.05)'};margin-bottom:4px">
      <div style="width:30px;height:30px;border-radius:7px;overflow:hidden;flex-shrink:0;background:rgba(255,255,255,.06)">${img?`<img src="${img}" style="width:100%;height:100%;object-fit:cover">`:''}
      </div>
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:${highlight?'700':'500'};color:${highlight?'#8b5cf6':'var(--text)'}">${escapeHTML(p.name||'?')}${p.tag?`<span style="color:var(--muted2)">#${escapeHTML(p.tag)}</span>`:''}</div><div style="font-size:11px;color:var(--muted2)">${p.character||'?'}</div></div>
      <div style="text-align:right;flex-shrink:0"><div style="font-size:13px;font-weight:700;font-family:var(--mono)">${k}/${d}/${a}</div><div style="font-size:10px;color:var(--muted2);font-family:var(--mono)">ACS ${acs} · HS ${hsP}%</div></div>
    </div>`;
  }
  const titleEl=document.getElementById('valo-match-title');
  const bodyEl=document.getElementById('valo-match-body');
  if(titleEl)titleEl.innerHTML=`<span style="color:${mapStyle.color}">${map}</span> · ${mode} · <span style="color:${won?'#34d399':'#f87171'}">${won?'WIN':'LOSS'} ${myScore}-${theirScore}</span>`;
  const k=me.stats?.kills||0,d=me.stats?.deaths||1,a=me.stats?.assists||0;
  const hs=me.stats?.headshots||0,shots=(hs+(me.stats?.bodyshots||0)+(me.stats?.legshots||0));
  const hsP=shots>0?Math.round((hs/shots)*100):0;
  const rounds=(m.teams?.red?.rounds_won||0)+(m.teams?.blue?.rounds_won||0);
  const acs=rounds>0?Math.round((me.stats?.score||0)/rounds):0;
  let html=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">${[{label:'KDA',val:`${k}/${d}/${a}`},{label:'ACS',val:acs},{label:'HS %',val:hsP+'%'},{label:'Score',val:(me.stats?.score||0).toLocaleString()}].map(s=>`<div style="background:rgba(139,92,246,.07);border:1px solid rgba(139,92,246,.15);border-radius:10px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:800;font-family:var(--mono);color:#8b5cf6">${s.val}</div><div style="font-size:9px;color:var(--muted2);margin-top:2px;text-transform:uppercase;letter-spacing:.1em;font-family:var(--mono)">${s.label}</div></div>`).join('')}</div>`;
  html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><div style="font-size:9.5px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:${won?'#34d399':'#f87171'};font-family:var(--mono);margin-bottom:8px">Your team · ${myScore}</div>${teamA.map(p=>{const isMe=(p.puuid&&p.puuid===me.puuid)||(p.name===me.name&&p.tag===me.tag);return playerRow(p,isMe);}).join('')}</div><div><div style="font-size:9.5px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:${won?'#f87171':'#34d399'};font-family:var(--mono);margin-bottom:8px">Enemy team · ${theirScore}</div>${teamB.map(p=>playerRow(p,false)).join('')}</div></div>`;
  if(m.metadata?.game_length){const mins=Math.floor(m.metadata.game_length/60);html+=`<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:16px;font-size:11.5px;color:var(--muted2)"><span>⏱ ${mins}m</span><span>📍 ${map}</span><span>🎮 ${mode}</span></div>`;}
  if(bodyEl)bodyEl.innerHTML=html;
  openModal('valo-match');
}
