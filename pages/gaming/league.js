/* ETHONE legacy compatibility module: league. */
// -- LEAGUE OF LEGENDS -----------------------------
async function connectLoL(){
  const raw=document.getElementById('lol-name').value.trim();
  const region=document.getElementById('lol-region').value;
  const apiKey=document.getElementById('lol-apikey').value.trim();
  if(!raw)  {toast('Enter a summoner name','error');return}
  if(!apiKey){toast('Enter your Riot API Key','error');return}
  toast('Fetching LoL stats...','info');
  try{
    // Use new Riot ID format if # is present
    let puuid,summonerId,summonerName;
    const routing=LOL_ROUTING[region]||'europe';
    if(raw.includes('#')){
      const [n,t]=raw.split('#');
      const accRes=await fetchRiot(`https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(n)}/${encodeURIComponent(t)}`,apiKey);
      puuid=accRes.puuid;
      summonerName=n+'#'+t;
    } else {
      const sumRes=await fetchRiot(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(raw)}`,apiKey);
      puuid=sumRes.puuid;summonerId=sumRes.id;
      summonerName=sumRes.name;
    }
    if(!summonerId){
      const sumRes2=await fetchRiot(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,apiKey);
      summonerId=sumRes2.id;
      if(!summonerName)summonerName=sumRes2.name;
    }
    const p=curP();if(!p)return;
    if(!p.state.gaming)p.state.gaming={};
    p.state.gaming.lol={name:summonerName,region,puuid,summonerId,apiKey};
    saveStateNow();
    await loadLoLStats();
    document.getElementById('lol-disconnect').style.display='inline-flex';
    toast('LoL connected!','success');
    addActivity('Connected League of Legends account','#c89b3c');
  }catch(e){toast('Error: '+(e.message||'Check your API key / summoner name'),'error');console.error(e)}
}

async function loadLoLStats(){
  const p=curP();if(!p||!p.state.gaming?.lol)return;
  const {name,region,puuid,summonerId,apiKey}=p.state.gaming.lol;
  const routing=LOL_ROUTING[region]||'europe';
  const area=document.getElementById('lol-stats-area');
  if(area)area.innerHTML='<div class="game-loading"> Loading stats...</div>';
  try{
    // Ranked data
    const ranked=await fetchRiot(`https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`,apiKey);
    // Recent matches
    const matchIds=await fetchRiot(`https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=5&queue=420`,apiKey);
    const matchDetails=await Promise.all(matchIds.slice(0,5).map(id=>fetchRiot(`https://${routing}.api.riotgames.com/lol/match/v5/matches/${id}`,apiKey).catch(()=>null)));
    renderLoLStats(ranked,matchDetails.filter(Boolean),puuid,name);
    const badge=document.getElementById('lol-badge');
    if(badge){badge.textContent='Connected';badge.className='conn-status-badge connected';}
    const sub=document.getElementById('lol-account-sub');
    if(sub)sub.textContent=name+' . '+region.toUpperCase();
    document.getElementById('lol-name').value=name;
    document.getElementById('lol-region').value=region;
    restoreRegionPill('lol', region);
    document.getElementById('lol-apikey').value=apiKey;
  }catch(e){if(area)area.innerHTML='<div class="game-loading">Could not load stats - API key may have expired</div>';}
}

function renderLoLStats(ranked,matches,puuid,name){
  const area=document.getElementById('lol-stats-area');if(!area)return;
  let html='';
  const solo=ranked?.find(r=>r.queueType==='RANKED_SOLO_5x5');
  if(solo){
    const icon=LOL_RANKS[solo.tier]||'';
    const wr=Math.round((solo.wins/(solo.wins+solo.losses))*100);
    html+=`<div class="rank-display"><div class="rank-icon">${icon}</div><div><div class="rank-name">${solo.tier} ${solo.rank}</div><div class="rank-rr">${solo.leaguePoints} LP . ${solo.wins}W ${solo.losses}L</div></div><div class="rank-wr"><div class="rank-wr-pct" style="color:${wr>=50?'var(--accent2)':'var(--accent3)'}">${wr}%</div><div class="rank-wr-label">Winrate</div></div></div>`;
  }
  if(matches&&matches.length){
    html+='<div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Recent matches (Ranked)</div>';
    html+='<div class="match-list">';
    const champMap={};
    matches.forEach(m=>{
      const me=m.info?.participants?.find(pl=>pl.puuid===puuid);if(!me)return;
      const won=me.win;
      const k=me.kills,d=me.deaths||1,a=me.assists;
      const champ=me.championName||'?';
      const champImg=`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${champ}.png`;
      html+=`<div class="match-row ${won?'win':'loss'}">
        <div class="match-agent"><img src="${champImg}" alt="${champ}" onerror="this.textContent='${champ[0]}'"></div>
        <div class="match-info"><div class="match-name">${champ}</div><div class="match-kda">${k}/${d}/${a} . KDA ${((k+a)/d).toFixed(2)}</div></div>
        <span class="match-result ${won?'win':'loss'}">${won?'WIN':'LOSS'}</span>
      </div>`;
      if(!champMap[champ])champMap[champ]={wins:0,games:0,kills:0,deaths:0};
      champMap[champ].games++;if(won)champMap[champ].wins++;
      champMap[champ].kills+=k;champMap[champ].deaths+=d;
    });
    html+='</div>';
    const top=Object.entries(champMap).sort((a,b)=>b[1].games-a[1].games).slice(0,3);
    if(top.length){
      html+='<div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Top champions (last 5)</div>';
      html+='<div class="top-agents">';
      top.forEach(([champ,s])=>{
        const wr=Math.round((s.wins/s.games)*100);
        const kd=(s.kills/s.deaths).toFixed(2);
        const img=`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${champ}.png`;
        html+=`<div class="agent-card"><div class="agent-card-img"><img src="${img}" alt="${champ}" onerror="this.style.display='none'"></div><div class="agent-card-name">${champ}</div><div class="agent-card-stats">${wr}% WR . K/D ${kd}</div></div>`;
      });
      html+='</div>';
    }
  }
  if(!html)html='<div class="game-not-connected" style="padding:20px">No ranked data found</div>';
  area.innerHTML=html;
}

function disconnectLoL(){
  const p=curP();if(!p)return;
  if(!confirm('Disconnect LoL?'))return;
  delete p.state.gaming?.lol;saveStateNow();
  document.getElementById('lol-stats-area').innerHTML='<div class="game-not-connected"><div style="font-size:28px"></div><div>Enter your Summoner Name to connect</div></div>';
  document.getElementById('lol-badge').textContent='Not connected';document.getElementById('lol-badge').className='conn-status-badge disconnected';
  document.getElementById('lol-account-sub').textContent='Not connected';
  document.getElementById('lol-disconnect').style.display='none';
  document.getElementById('lol-name').value='';document.getElementById('lol-apikey').value='';
  toast('LoL disconnected','info');
}
