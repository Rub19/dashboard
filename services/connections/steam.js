/* ETHONE legacy compatibility module: steam. */
// === STEAM ===

async function fetchSteamAPI(endpoint,apiKey,params){
  // Utilise le Worker Cloudflare - cle Steam stockee cote server
  const ep=endpoint.replace(/^\/+/,'');
  const workerUrl=`${WORKER_URL}/steam/${ep}?${params}`;
  const res=await fetch(workerUrl,{signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw new Error('Steam API error '+res.status);
  return res.json();
}

async function connectSteam(){
  const steamId=document.getElementById('steam-id').value.trim();
  const apiKey=(document.getElementById('steam-apikey')?.value||'').trim();
  if(!steamId){toast('Enter your Steam ID64','error');return}
  if(!/^\d{17}$/.test(steamId)){toast('Steam ID64 doit faire 17 chiffres','error');return}
  toast('Login a Steam...','info');
  try{
    // Fetch profilee summary
    const summaryJson=await fetchSteamAPI('/ISteamUser/GetPlayerSummaries/v2/',apiKey,'steamids='+steamId);
    const player=summaryJson?.response?.players?.[0];
    if(!player){toast('Steam profile not found - check your SteamID64','error');return}

    const stateMap={0:'offline',1:'online',2:'busy',3:'away',4:'snooze',5:'online',6:'online'};
    const data={
      steamId64:steamId,
      displayName:player.personaname||'Unknown',
      avatarFull:player.avatarfull||'',
      onlineState:stateMap[player.personastate]||'offline',
      stateMessage:player.gameextrainfo?'Currently In-Game '+player.gameextrainfo:'',
      profileUrl:player.profileurl||'https://steamcommunity.com/profiles/'+steamId,
      recentGames:[],
      steamLevel:null
    };

    // Fetch Steam level
    try{
      const lvlJson=await fetchSteamAPI('/IPlayerService/GetSteamLevel/v1/',apiKey,'steamid='+steamId);
      data.steamLevel=lvlJson?.response?.player_level??null;
    }catch(e){console.warn('Niveau non dispo',e);}

    // Fetch recent games
    try{
      const gamesJson=await fetchSteamAPI('/IPlayerService/GetRecentlyPlayedGames/v1/',apiKey,'steamid='+steamId+'&count=5');
      const games=gamesJson?.response?.games||[];
      data.recentGames=games.map(g=>({
        name:g.name||'',
        img:g.appid?'https://media.steampowered.com/steamcommunity/public/images/apps/'+g.appid+'/'+g.img_icon_url+'.jpg':'',
        hours:g.playtime_forever?Math.round(g.playtime_forever/60)+'':'',
        hoursRecent:g.playtime_2weeks?Math.round(g.playtime_2weeks/60)+'':''
      }));
    }catch(e){console.warn('Jeux recents non dispo',e);}

    const p=curP();if(!p)return;
    if(!p.state.connections)p.state.connections={};
    p.state.connections.steam={steamId,apiKey,data};saveStateNow();
    renderSteamCard(data);
    document.getElementById('steam-disconnect-btn').style.display='inline-flex';
    toast('Steam connected! ','success');
    if(typeof addActivity==='function')addActivity('Account Steam connecte','var(--steam2)','integration');
  }catch(e){toast('Error : '+e.message,'error');console.error(e)}
}

function renderSteamCard(data){
  renderSteamSidebar(data);
  const badge=document.getElementById('steam-badge');
  if(badge){badge.textContent='Connected';badge.className='conn-status-badge connected';}
  const preview=document.getElementById('steam-preview');
  if(preview)preview.classList.add('visible');
  const avImg=document.getElementById('steam-preview-avatar');
  const avFb=document.getElementById('steam-preview-fallback');
  if(data.avatarFull){if(avImg){avImg.src=data.avatarFull;avImg.style.display='block';}if(avFb)avFb.style.display='none';}
  else{if(avImg)avImg.style.display='none';if(avFb)avFb.style.display='block';}
  const nameEl=document.getElementById('steam-preview-name');
  if(nameEl)nameEl.textContent=data.displayName||'Unknown';

  // Online status with color
  const stMap={online:{label:' Online',color:'var(--accent2)'},offline:{label:' Offline',color:'var(--muted)'},'in-game':{label:' In-Game',color:'var(--steam2)'}};
  const stInfo=stMap[data.onlineState]||{label:data.onlineState||'Offline',color:'var(--muted)'};
  const subEl=document.getElementById('steam-preview-sub');
  if(subEl){subEl.textContent=stInfo.label;subEl.style.color=stInfo.color;}

  // Niveau Steam
  const levelWrap=document.getElementById('steam-level-badge');
  if(data.steamLevel!==undefined&&levelWrap){
    levelWrap.textContent='Niv. '+data.steamLevel;levelWrap.style.display='inline-block';
  } else if(levelWrap) levelWrap.style.display='none';

  // Jeu actuel
  const cgWrap=document.getElementById('steam-current-game');
  const gameName=data.stateMessage&&data.stateMessage.startsWith('Currently In-Game')?data.stateMessage.replace('Currently In-Game','').trim():null;
  if(cgWrap){
    if(gameName||data.onlineState==='in-game'){
      const gnEl=document.getElementById('steam-game-name');
      if(gnEl)gnEl.textContent=gameName||data.stateMessage;
      cgWrap.style.display='block';
    } else cgWrap.style.display='none';
  }
  const link=document.getElementById('steam-profile-link');
  if(link)link.href=data.profileUrl||'#';

  // Recent games with playtime
  const recentWrap=document.getElementById('steam-recent-games');
  const gamesList=document.getElementById('steam-games-list');
  if(data.recentGames&&data.recentGames.length&&gamesList){
    if(recentWrap)recentWrap.style.display='block';
    gamesList.innerHTML=data.recentGames.slice(0,5).map(g=>`
      <div class="steam-game-row" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        ${g.img?`<img class="steam-game-img" src="${g.img}" alt="" style="width:40px;height:40px;border-radius:6px;object-fit:cover">`:`<div style="width:40px;height:40px;border-radius:6px;background:var(--surface3);display:flex;align-items:center;justify-content:center;font-size:18px"></div>`}
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name}</div>
          ${g.hours?`<div style="font-size:11px;color:var(--muted);margin-top:2px"> ${g.hours}h played</div>`:''}
        </div>
        ${g.hoursRecent?`<div style="font-size:11px;color:var(--steam2);background:rgba(102,192,244,.1);padding:3px 8px;border-radius:20px;flex-shrink:0">${g.hoursRecent}h recently</div>`:''}
      </div>`
    ).join('');
  } else if(recentWrap)recentWrap.style.display='none';

  // Afficher bouton refresh
  const refreshBtn=document.getElementById('steam-refresh-btn');
  if(refreshBtn)refreshBtn.style.display='inline-block';
}


function renderSteamSidebar(data){
  const p=curP();
  const wrap=document.getElementById('sb-steam-wrap');
  if(!wrap||!data)return;
  const vis=p?.state?.sidebarWidgets?.visible||{};
  if(vis.steam===false){wrap.style.setProperty('display','none','important');return;}
  const nameEl=document.getElementById('sb-steam-name');
  const subEl=document.getElementById('sb-steam-activity');
  const avEl=document.getElementById('sb-steam-avatar');
  const statusDot=document.getElementById('sb-steam-status');
  if(nameEl)nameEl.textContent=data.displayName||'Unknown';
  const gameName=data.stateMessage&&data.stateMessage.startsWith('Currently In-Game')?data.stateMessage.replace('Currently In-Game','').trim():null;
  if(subEl){
    if(gameName){subEl.textContent='En jeu - '+gameName;subEl.style.display='block';}
    else{subEl.style.display='none';}
  }
  if(statusDot){
    statusDot.className='sb-dc-dot '+(gameName?'online':(data.onlineState==='offline'?'offline':'online'));
  }
  if(avEl&&data.avatarFull){
    const fb=document.getElementById('sb-steam-av-fallback');
    if(fb)fb.style.display='none';
    let img=avEl.querySelector('img');
    if(!img){
      img=document.createElement('img');
      img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%';
      img.onerror=()=>{img.style.display='none';if(fb)fb.style.display='';};
      avEl.appendChild(img);
    }
    img.src=data.avatarFull;
  }
  wrap.style.setProperty('display','block','important');
}

async function refreshSteam(){
  const p=curP();if(!p||!p.state.connections?.steam)return;
  const {steamId,apiKey=''}=p.state.connections.steam;
  if(!apiKey){toast('Steam API key missing','error');return;}
  const btn=document.getElementById('steam-refresh-btn');
  if(btn){btn.textContent='';btn.disabled=true;}
  try{
    const summaryJson=await fetchSteamAPI('/ISteamUser/GetPlayerSummaries/v2/',apiKey,'steamids='+steamId);
    const player=summaryJson?.response?.players?.[0];
    if(!player){toast('Profile not found','error');return;}
    const stateMap={0:'offline',1:'online',2:'busy',3:'away',4:'snooze',5:'online',6:'online'};
    const data={steamId64:steamId,displayName:player.personaname||'Unknown',avatarFull:player.avatarfull||'',onlineState:stateMap[player.personastate]||'offline',stateMessage:player.gameextrainfo?'Currently In-Game '+player.gameextrainfo:'',profileUrl:player.profileurl||'https://steamcommunity.com/profiles/'+steamId,recentGames:[],steamLevel:null};
    try{const lvlJson=await fetchSteamAPI('/IPlayerService/GetSteamLevel/v1/',apiKey,'steamid='+steamId);data.steamLevel=lvlJson?.response?.player_level??null;}catch(e){}
    try{
      const gamesJson=await fetchSteamAPI('/IPlayerService/GetRecentlyPlayedGames/v1/',apiKey,'steamid='+steamId+'&count=5');
      const games=gamesJson?.response?.games||[];
      data.recentGames=games.map(g=>({name:g.name||'',img:g.appid?'https://media.steampowered.com/steamcommunity/public/images/apps/'+g.appid+'/'+g.img_icon_url+'.jpg':'',hours:g.playtime_forever?Math.round(g.playtime_forever/60)+'':'',hoursRecent:g.playtime_2weeks?Math.round(g.playtime_2weeks/60)+'':''}));
    }catch(e){}
    p.state.connections.steam.data=data;saveStateNow();
    renderSteamCard(data);
    const akInp=document.getElementById('steam-apikey');if(akInp&&apiKey)akInp.value=apiKey;
    toast('Steam updated!','success');
  }catch(e){toast('Steam refresh error : '+e.message,'error');console.error(e);}
  finally{if(btn){btn.textContent=' Refresh';btn.disabled=false;}}
}

async function savesteamApiKey(){
  const p=curP();if(!p)return;
  const apiKey=(document.getElementById('steam-apikey')?.value||'').trim();
  if(!apiKey){toast('Enter your Steam API key','error');return;}
  if(!p.state.connections)p.state.connections={};
  if(!p.state.connections.steam){toast('Connect your Steam account first','error');return;}
  p.state.connections.steam.apiKey=apiKey;saveStateNow();
  toast('API key saved, refreshing...','info');
  await refreshSteam();
}

function disconnectSteam(){
  const p=curP();if(!p)return;
  if(!confirm('Disconnect Steam?'))return;
  delete p.state.connections.steam;saveStateNow();
  const badge=document.getElementById('steam-badge');
  if(badge){badge.textContent='Not connected';badge.className='conn-status-badge disconnected';}
  const preview=document.getElementById('steam-preview');
  if(preview)preview.classList.remove('visible');
  const inp=document.getElementById('steam-id');if(inp)inp.value='';
  const btn=document.getElementById('steam-disconnect-btn');if(btn)btn.style.display='none';
  const rbtn=document.getElementById('steam-refresh-btn');if(rbtn)rbtn.style.display='none';
  const rg=document.getElementById('steam-recent-games');if(rg)rg.style.display='none';
  const sbWrap=document.getElementById('sb-steam-wrap');if(sbWrap)sbWrap.style.setProperty('display','none','important');
  toast('Disconnected','info');
}
