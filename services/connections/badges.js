/* ETHONE legacy compatibility module: connections-badges. */
// === DISCORD BADGES ===
// === OVERWATCH 2 ===
async function fetchTracker(game,platform,username){
  const encoded=encodeURIComponent(username);
  const url=`${WORKER_URL}/tracker/${game}/standard/profile/${platform}/${encoded}`;
  const res=await fetch(url,{signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw new Error('Tracker API error '+res.status);
  return res.json();
}

async function connectOW(){
  const username=document.getElementById('ow-username').value.trim();
  const platform=document.getElementById('ow-platform').value;
  if(!username){toast('Enter your BattleTag','error');return;}
  toast('Fetching OW2 stats...','info');
  try{
    const data=await fetchTracker('overwatch-2',platform,username);
    if(data.errors){toast('Profile not found - check your BattleTag and make sure your profile is public','error');return;}
    const p=curP();if(!p)return;
    if(!p.state.gaming)p.state.gaming={};
    p.state.gaming.ow={username,platform,_data:data};
    saveStateNow();
    renderOWStats(data,username,'comp');
    document.getElementById('ow-disconnect').style.display='inline-flex';
    document.getElementById('ow-account-sub').textContent=username+' · '+platform.toUpperCase();
    toast('Overwatch 2 connected!','success');
  }catch(e){toast('Error: '+e.message,'error');console.error(e);}
}

function renderOWStats(data,username,mode){
  mode=mode||'comp';
  const area=document.getElementById('ow-stats-area');if(!area)return;
  const badge=document.getElementById('ow-badge');
  if(badge){badge.textContent='Connected';badge.className='conn-status-badge connected';}
  const segments=data?.data?.segments||[];

  // Get stats segment based on mode
  const statType=mode==='comp'?'competitive':'quickplay';
  const overview=segments.find(s=>s.type==='overview'&&(s.attributes?.mode===statType||!s.attributes?.mode))||segments.find(s=>s.type==='overview');
  const stat=(seg,key)=>seg?.stats?.[key]?.displayValue||'--';

  // Ranks (comp only)
  const rankSegs=segments.filter(s=>s.type==='competitive-rank');

  // Top heroes for this mode
  const heroes=segments.filter(s=>s.type==='hero'&&s.attributes?.mode===statType&&(s.stats?.timePlayed?.value||0)>0)
    .sort((a,b)=>(b.stats?.timePlayed?.value||0)-(a.stats?.timePlayed?.value||0))
    .slice(0,5);
  // fallback: all heroes
  const heroList=heroes.length?heroes:segments.filter(s=>s.type==='hero'&&(s.stats?.timePlayed?.value||0)>0)
    .sort((a,b)=>(b.stats?.timePlayed?.value||0)-(a.stats?.timePlayed?.value||0)).slice(0,5);

  let html='';

  // Mode tabs
  html+=`<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
    <button id="ow-tab-comp" onclick="switchOWTab('comp')" style="padding:7px 16px;border-radius:20px;border:1.5px solid ${mode==='comp'?'var(--accent)':'var(--border2)'};background:${mode==='comp'?'var(--accent)':'var(--surface2)'};color:${mode==='comp'?'#fff':'var(--muted)'};font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font)">Competitive</button>
    <button id="ow-tab-qp" onclick="switchOWTab('qp')" style="padding:7px 16px;border-radius:20px;border:1.5px solid ${mode==='qp'?'var(--accent)':'var(--border2)'};background:${mode==='qp'?'var(--accent)':'var(--surface2)'};color:${mode==='qp'?'#fff':'var(--muted)'};font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font)">Quick Play</button>
  </div>`;

  // Rank cards (comp only)
  if(mode==='comp'&&rankSegs.length){
    html+=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">`;
    rankSegs.slice(0,4).forEach(r=>{
      const roleName=r.metadata?.name||'Rank';
      const rank=r.stats?.rank?.displayValue||r.stats?.rankScore?.displayValue||'Unranked';
      const icon=r.stats?.rank?.metadata?.iconUrl||'';
      html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 14px;flex:1;min-width:90px;display:flex;align-items:center;gap:8px">
        ${icon?`<img src="${icon}" style="width:32px;height:32px;object-fit:contain" onerror="this.style.display='none'">`:'<span style="font-size:20px">&#127942;</span>'}
        <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">${roleName}</div>
        <div style="font-size:13px;font-weight:700">${rank}</div></div>
      </div>`;
    });
    html+=`</div>`;
  }

  // Stats pills
  const pills=[
    {label:'Win Rate',val:stat(overview,'winPercentage')},
    {label:'KDA',val:stat(overview,'kdaRatio')},
    {label:'Avg Elim',val:stat(overview,'eliminationsPerLife')},
    {label:'Time Played',val:stat(overview,'timePlayed')},
  ];
  html+=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">`;
  pills.forEach(pill=>{
    html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 14px;flex:1;min-width:90px;text-align:center">
      <div style="font-size:18px;font-weight:700;color:var(--accent)">${pill.val}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">${pill.label}</div>
    </div>`;
  });
  html+=`</div>`;

  // Top heroes
  if(heroList.length){
    html+=`<div style="font-size:12px;font-weight:600;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:10px">Top Heroes</div>
    <div style="display:flex;flex-direction:column;gap:6px">`;
    heroList.forEach(h=>{
      const name=h.metadata?.name||'Unknown';
      const img=h.metadata?.imageUrl||'';
      const time=h.stats?.timePlayed?.displayValue||'--';
      const wr=h.stats?.winPercentage?.displayValue||'--';
      const elim=h.stats?.eliminationsPerLife?.displayValue||'--';
      html+=`<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--surface2);border-radius:var(--r-sm)">
        ${img?`<img src="${img}" style="width:36px;height:36px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">`:'<div style="width:36px;height:36px;border-radius:8px;background:var(--surface3);display:flex;align-items:center;justify-content:center">&#127918;</div>'}
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">${name}</div>
          <div style="font-size:11px;color:var(--muted)">${time} played</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:12px;font-weight:600;color:var(--accent2)">${wr} WR</div>
          <div style="font-size:11px;color:var(--muted)">${elim} K/D</div>
        </div>
      </div>`;
    });
    html+=`</div>`;
  }

  if(!html)html='<div class="game-not-connected">No stats found - make sure your profile is public on Overwatch</div>';
  area.innerHTML=html;
}

function switchOWTab(tab){
  const p=curP();
  if(p?.state?.gaming?.ow?._data)renderOWStats(p.state.gaming.ow._data,p.state.gaming.ow.username,tab);
}

function disconnectOW(){
  const p=curP();if(!p)return;
  if(p.state.gaming)delete p.state.gaming.ow;
  saveStateNow();
  document.getElementById('ow-stats-area').innerHTML='<div class="game-not-connected">Connect your account to see your stats</div>';
  document.getElementById('ow-badge').textContent='Not connected';
  document.getElementById('ow-badge').className='conn-status-badge disconnected';
  document.getElementById('ow-account-sub').textContent='Not connected';
  document.getElementById('ow-disconnect').style.display='none';
  document.getElementById('ow-username').value='';
  toast('Overwatch 2 disconnected','info');
}
