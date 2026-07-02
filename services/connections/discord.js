/* ETHONE legacy compatibility module: discord. */
// === DISCORD ===
async function connectDiscord(){
  const userId=document.getElementById('dc-userid').value.trim();
  if(!userId){toast('Enter a Discord User ID','error');return}
  toast('Fetching Discord profile...','info');
  try{
    const res=await fetch('https://api.lanyard.rest/v1/users/'+userId);
    const json=await res.json();
    if(!json.success){toast("User not found - make sure you're in the Lanyard Discord server",'error');return}
    const p=curP();if(!p)return;
    if(!p.state.connections)p.state.connections={};
    p.state.connections.discord={userId,data:json.data};
    saveStateNow();
    renderDiscordCard(json.data);
    refreshDiscordSidebar();
    document.getElementById('dc-disconnect-btn').style.display='inline-flex';
    const rfBtn=document.getElementById('dc-refresh-btn');if(rfBtn)rfBtn.style.display='inline-flex';
    const mbs=document.getElementById('dc-manual-badges-section');if(mbs)mbs.style.display='block';
    if(typeof renderManualBadgesUI==='function')renderManualBadgesUI();
    startLanyardWS(userId);
    toast('Discord connected!','success');
    addActivity('Connected Discord account','var(--discord)');
  }catch(e){toast('Could not reach Lanyard API','error');console.error(e)}
}

function renderDiscordCard(d){
  const badge=document.getElementById('dc-badge');
  if(badge){badge.textContent='Connected';badge.className='conn-status-badge connected';}
  const preview=document.getElementById('dc-preview');
  if(preview)preview.style.display='block';
  // Avatar
  const avImg=document.getElementById('dc-preview-avatar');
  const avFallback=document.getElementById('dc-preview-fallback');
  if(d.discord_user.avatar){
    const url='https://cdn.discordapp.com/avatars/'+d.discord_user.id+'/'+d.discord_user.avatar+'.png?size=256';
    if(avImg){avImg.src=url;avImg.style.display='block';}
    if(avFallback)avFallback.style.display='none';
  } else {
    if(avImg)avImg.style.display='none';
    if(avFallback)avFallback.style.display='flex';
  }
  // Banner
  if(d.discord_user.banner){
    const bannerUrl='https://cdn.discordapp.com/banners/'+d.discord_user.id+'/'+d.discord_user.banner+'.png?size=480';
    const bannerImg=document.getElementById('dc-banner-img');
    if(bannerImg){bannerImg.src=bannerUrl;bannerImg.style.display='block';}
  } else {
    const banner=document.getElementById('dc-card-banner');
    if(banner&&d.discord_user.accent_color){
      banner.style.background='#'+d.discord_user.accent_color.toString(16).padStart(6,'0');
    }
  }
  // Status dot
  const dot=document.getElementById('dc-status-dot');
  if(dot){dot.className='dc-status-dot '+(d.discord_status||'offline');}
  // Name + status
  const name=d.discord_user.global_name||d.discord_user.username;
  const nameEl=document.getElementById('dc-preview-name');
  if(nameEl)nameEl.textContent=name;
  const statusMap={online:'🟢 Online',idle:'🟡 Idle',dnd:'🔴 Do Not Disturb',offline:'⚫ Offline'};
  const subEl=document.getElementById('dc-preview-sub');
  if(subEl)subEl.textContent=statusMap[d.discord_status]||'⚫ Offline';
  // Activity
  const actEl=document.getElementById('dc-preview-activity');
  const act=d.activities?.find(a=>a.type===0||a.type===2||a.type===4);
  if(actEl){
    if(act&&act.type!==4){
      const typeLabel=act.type===2?'Listening to':'Playing';
      document.getElementById('dc-activity-type').textContent=typeLabel;
      document.getElementById('dc-activity-name').textContent=act.name||'';
      document.getElementById('dc-activity-detail').textContent=[act.details,act.state].filter(Boolean).join(' · ');
      actEl.style.display='block';
    } else {
      actEl.style.display='none';
    }
  }
  // Badges
  const badgesEl=document.getElementById('dc-preview-badges');
  if(badgesEl)badgesEl.innerHTML=renderDiscordBadges(d.discord_user);
  // Always update sidebar widget too
  refreshDiscordSidebar();
}

function refreshDiscordSidebar(){
  const p=curP();if(!p)return;
  const conn=p.state.connections?.discord;
  const wrap=document.getElementById('sb-discord-wrap');
  // If we have a userId but no data yet, start the Lanyard WS to fetch it
  if(conn?.userId&&!conn?.data&&typeof startLanyardWS==='function'){
    startLanyardWS(conn.userId);
  }
  // Show widget if userId exists (even if offline/no data yet)
  const hasConnection=conn?.userId||conn?.data;
  if(!hasConnection){if(wrap)wrap.style.display='none';return}
  if(wrap)wrap.style.display='block';
  if(!conn?.data){
    // Show placeholder while loading
    const nameEl=document.getElementById('sb-dc-name');
    if(nameEl)nameEl.textContent=conn.username||'Discord';
    const stEl=document.getElementById('sb-dc-status');
    if(stEl)stEl.className='sb-dc-dot offline';
    return;
  }
  const d=conn.data;
  // Avatar
  const avEl=document.getElementById('sb-dc-avatar');
  if(avEl){
    const fallback=document.getElementById('sb-dc-av-fallback');
    if(d.discord_user.avatar){
      const url='https://cdn.discordapp.com/avatars/'+d.discord_user.id+'/'+d.discord_user.avatar+'.png?size=64';
      // Remove fallback, add img
      if(fallback)fallback.style.display='none';
      let img=avEl.querySelector('img');
      if(!img){img=document.createElement('img');avEl.appendChild(img);}
      img.src=url;img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
    } else {
      if(fallback)fallback.style.display='';
    }
  }
  // Name
  const nameEl=document.getElementById('sb-dc-name');
  if(nameEl)nameEl.textContent=d.discord_user.global_name||d.discord_user.username;
  // Status dot + pill glow + badge
  const status=d.discord_status||'offline';
  const stEl=document.getElementById('sb-dc-status');
  if(stEl)stEl.className='sb-dc-dot '+status;
  const card=document.getElementById('sb-discord-card');
  // Appliquer la couleur de bordure selon le statut
  if(card){
    const borderColors={online:'#3ba55c',idle:'#faa81a',dnd:'#ed4245',offline:'rgba(255,255,255,.07)'};
    card.style.borderColor=borderColors[status]||'rgba(255,255,255,.07)';
    card.style.boxShadow=status!=='offline'?`0 0 0 1px ${borderColors[status]}22`:'none';
  }
  const badge=document.getElementById('sb-dc-badge');
  if(badge){
    const labels={online:'ONLINE',idle:'IDLE',dnd:'DND',offline:'INVI'};
    badge.textContent=labels[status]||status;
    badge.className='sb-dc-badge '+(status==='offline'?'offline':status);
  }
  // Activity
  const act=d.activities?.find(a=>a.type===0||a.type===2);
  const actEl=document.getElementById('sb-dc-activity');
  if(actEl){
    if(act){
      const isSpotify=act.type===2;
      const actColor=isSpotify?'rgba(29,185,84,.85)':'rgba(88,101,242,.85)';
      actEl.innerHTML=`<span style="color:${actColor};font-size:10.5px">${isSpotify?'♪ ':'▶ '}<span>${act.name||''}</span></span>`;
      actEl.style.display='block';
    } else {
      actEl.style.display='none';
    }
  }
  // Spotify from Lanyard
  updateSpotifyFromLanyard(d);
}

function updateSpotifyFromLanyard(d){
  const sp=d.spotify;
  const wrap=document.getElementById('sb-spotify-wrap');
  const iframeWrap=document.getElementById('sb-spotify-iframe-wrap');
  const dcStatus=d.discord_status||'offline';
  const isDiscordOnline=['online','idle','dnd'].includes(dcStatus);

  if(isDiscordOnline&&sp&&sp.song){
    // Discord online + Spotify playing → Lanyard widget
    if(wrap)wrap.style.display='block';
    if(iframeWrap)iframeWrap.style.display='none';
    const artEl=document.getElementById('np-art');
    if(artEl){
      if(sp.album_art_url)artEl.innerHTML=`<img src="${sp.album_art_url}" alt="album" onerror="this.innerHTML='♪'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:8px;display:block">`;
      else artEl.innerHTML='<span>♪</span>';
    }
    const songEl=document.getElementById('np-song');if(songEl)songEl.textContent=sp.song;
    const artistEl=document.getElementById('np-artist');if(artistEl)artistEl.textContent=sp.artist;
    // EQ animation
    const eq=document.getElementById('sb-eq-anim');if(eq)eq.style.display='flex';
    // Progress bar + time display
    const timeRow=document.getElementById('np-time-row');
    if(sp.timestamps?.start&&sp.timestamps?.end){
      if(timeRow)timeRow.style.display='flex';
      updateNpProgress(sp.timestamps.start,sp.timestamps.end);
    } else {
      if(timeRow)timeRow.style.display='none';
    }
  } else {
    if(wrap)wrap.style.display='none';
    const eq=document.getElementById('sb-eq-anim');if(eq)eq.style.display='none';
    clearInterval(window._npProgressInterval);
    const p=curP();
    const lfm=p?.state?.connections?.lastfm;
    const hasDiscordConn=!!(p?.state?.connections?.discord?.userId);
    // Si Discord connecté et online/idle/dnd mais pas de Spotify → cacher le fallback aussi
    // (pas de musique du tout plutôt que montrer Last.fm à la place)
    if(!isDiscordOnline&&lfm?.username&&iframeWrap){
      // Discord offline/invis → montrer Last.fm + démarrer auto-refresh
      iframeWrap.style.display='block';
      refreshSpotifySidebar();
      if(!_spotifyAutoRefresh)startSpotifyAutoRefresh();
    } else if(iframeWrap){
      // Discord online mais pas de Spotify → cacher fallback + stopper refresh
      iframeWrap.style.display='none';
      clearInterval(_spotifyAutoRefresh);_spotifyAutoRefresh=null;
    }
  }
}

function updateNpProgress(start,end){
  clearInterval(window._npProgressInterval);
  function tick(){
    const now=Date.now();
    const total=end-start;
    const elapsed=Math.min(now-start,total);
    const pct=Math.round((elapsed/total)*100);
    const fill=document.getElementById('np-bar-fill');
    if(fill)fill.style.width=pct+'%';
    const fmt=ms=>{const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+(s%60).toString().padStart(2,'0')};
    const el=document.getElementById('np-elapsed');if(el)el.textContent=fmt(elapsed);
    const dl=document.getElementById('np-duration');if(dl)dl.textContent=fmt(total);
    if(now>=end)clearInterval(window._npProgressInterval);
  }
  tick();
  window._npProgressInterval=setInterval(tick,1000);
}

function disconnectDiscord(){
  const p=curP();if(!p)return;
  if(!confirm('Disconnect Discord?'))return;
  delete p.state.connections.discord;saveStateNow();
  const badge=document.getElementById('dc-badge');
  if(badge){badge.textContent='Not connected';badge.className='conn-status-badge disconnected';}
  const preview=document.getElementById('dc-preview');
  if(preview)preview.classList.remove('visible');
  const inp=document.getElementById('dc-userid');
  if(inp)inp.value='';
  const btn=document.getElementById('dc-disconnect-btn');
  if(btn)btn.style.display='none';
  const wrap=document.getElementById('sb-discord-wrap');
  if(wrap)wrap.style.display='none';
  toast('Disconnected','info');
}


async function refreshDiscord(){
  const p=curP();if(!p)return;
  const userId=p.state.connections?.discord?.userId;
  if(!userId){toast('No Discord connected','error');return}
  const btn=document.getElementById('dc-refresh-btn');
  if(btn)btn.textContent='';
  try{
    const res=await fetch('https://api.lanyard.rest/v1/users/'+userId);
    const json=await res.json();
    if(json.success){
      p.state.connections.discord.data=json.data;saveStateNow();
      renderDiscordCard(json.data);refreshDiscordSidebar();
      toast('Discord refreshed!','success');
    }
  }catch(e){toast('Could not reach Lanyard','error');}
  finally{if(btn)btn.innerHTML='↻ Refresh';}
}
