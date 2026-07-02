/* ETHONE legacy compatibility module: gaming-overview. */
//  GAMING OVERVIEW MINI-WIDGET
// ===================================================
function renderGamingOverview(){
  const p=curP();
  const wrap=document.getElementById('gaming-overview-wrap');
  const cards=document.getElementById('gaming-overview-cards');
  if(!wrap||!cards)return;
  const g=p?.state?.gaming||{};
  let html='';
  if(g.valo?.name){
    const valoData=g.valo._lastRank||{};
    const rankName=valoData.rankName||'—';
    const rr=valoData.rr!==undefined?valoData.rr+'RR':'';
    const icon=VALO_RANKS?.[rankName]||'';
    html+=`<div onclick="switchPage('gaming',null)" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);padding:14px 18px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:all .2s ease;flex:1;min-width:200px" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="font-size:28px">${icon}</div>
      <div><div style="font-size:12px;color:var(--muted);font-weight:500">VALORANT</div><div style="font-size:15px;font-weight:700">${rankName}</div>${rr?'<div style="font-size:12px;color:var(--muted)">'+rr+'</div>':''}</div>
      <div style="margin-left:auto;background:rgba(255,70,85,.1);color:#ff4655;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600"> Valo</div>
    </div>`;
  }
  if(g.lol?.name){
    const lolData=g.lol._lastRank||{};
    const tier=lolData.tier||'—';
    const rank=lolData.rank||'';
    const lp=lolData.lp!==undefined?lolData.lp+' LP':'';
    const icon=LOL_RANKS?.[tier]||'';
    html+=`<div onclick="switchPage('gaming',null)" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);padding:14px 18px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:all .2s ease;flex:1;min-width:200px" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="font-size:28px">${icon}</div>
      <div><div style="font-size:12px;color:var(--muted);font-weight:500">LEAGUE OF LEGENDS</div><div style="font-size:15px;font-weight:700">${tier} ${rank}</div>${lp?'<div style="font-size:12px;color:var(--muted)">'+lp+'</div>':''}</div>
      <div style="margin-left:auto;background:rgba(200,155,60,.1);color:#c89b3c;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600"> LoL</div>
    </div>`;
  }
  if(html){wrap.style.display='block';cards.innerHTML=html;}
  else wrap.style.display='none';
}

// ══════════════════════════════════════════════
