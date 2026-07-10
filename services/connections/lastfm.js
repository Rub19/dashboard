/* ETHONE legacy compatibility module: lastfm. */
// === LAST.FM ===

async function fetchLastfm(method, params=''){
  const url=`https://ws.audioscrobbler.com/2.0/?method=${method}&api_key=${LASTFM_KEY}&format=json&${params}`;
  // Route through worker to avoid CORS
  const workerUrl=`${WORKER_URL}/lastfm?url=${encodeURIComponent(url)}`;
  try{
    const res=await fetch(workerUrl,{signal:AbortSignal.timeout(10000)});
    if(res.ok)return res.json();
  }catch(e){}
  // Direct fallback (works on some browsers)
  const res2=await fetch(url,{signal:AbortSignal.timeout(10000)});
  return res2.json();
}

async function connectLastfm(){
  const username=document.getElementById('lastfm-username').value.trim();
  if(!username){toast('Enter your Last.fm username','error');return;}
  toast('Connecting to Last.fm...','info');
  try{
    const data=await fetchLastfm('user.getinfo',`user=${encodeURIComponent(username)}`);
    if(data.error){toast('User not found — check your username','error');return;}
    const user=data.user;
    const p=curP();if(!p)return;
    if(!p.state.connections)p.state.connections={};
    p.state.connections.lastfm={username:user.name,realname:user.realname,image:user.image?.[2]?.['#text']||''};
    saveStateNow();
    await renderLastfmCard(p.state.connections.lastfm);
    document.getElementById('lastfm-disconnect-btn').style.display='inline-flex';
    document.getElementById('lastfm-refresh-btn').style.display='inline-block';
    startLastfmAutoRefresh();
    toast('Last.fm connected! 🎵','success');
  }catch(e){toast('Error: '+e.message,'error');console.error(e);}
}

let _lastfmInterval=null;
let _lastfmNowPlaying=null;  // track key en cours "artist|title"
let _lastfmTrackEnd=null;    // timestamp estimé de fin de piste

function startLastfmAutoRefresh(){
  stopLastfmAutoRefresh();
  // Poll toutes les 10s pour détecter changement de piste rapidement
  _lastfmInterval=setInterval(async()=>{
    const p=curP();
    if(!p?.state?.connections?.lastfm){stopLastfmAutoRefresh();return;}
    // Fetch rapide juste le nowplaying pour voir si la piste a changé
    try{
      const data=await fetchLastfm('user.getrecenttracks',`user=${encodeURIComponent(p.state.connections.lastfm.username)}&limit=1`);
      const track=data?.recenttracks?.track?.[0];
      const isNow=track?.['@attr']?.nowplaying==='true';
      const key=isNow?(track?.artist?.['#text']||'')+'|'+(track?.name||''):null;
      const trackChanged=key!==_lastfmNowPlaying;
      if(trackChanged){
        // Piste changée ou arrêtée → refresh complet immédiat
        _lastfmNowPlaying=key;
        await renderLastfmCard(p.state.connections.lastfm);
        // Aussi refresh le widget Now Playing sidebar
        if(document.getElementById('sb-spotify-iframe-wrap')?.style.display==='block'&&typeof refreshSpotifySidebar==='function'){
          refreshSpotifySidebar();
        }
      }
    }catch(e){}
  },10000); // check toutes les 10s (léger, juste 1 track)
}

function stopLastfmAutoRefresh(){
  if(_lastfmInterval)clearInterval(_lastfmInterval);
  _lastfmInterval=null;
}

async function renderLastfmCard(data){
  if(!data)return;
  const badge=document.getElementById('lastfm-badge');
  if(badge){badge.textContent='Connected';badge.className='conn-status-badge connected';}
  const preview=document.getElementById('lastfm-preview');
  if(!preview)return;
  try{
    const [recentData,topData]=await Promise.all([
      fetchLastfm('user.getrecenttracks',`user=${encodeURIComponent(data.username)}&limit=6`),
      fetchLastfm('user.gettopartists',`user=${encodeURIComponent(data.username)}&limit=6&period=7day`)
    ]);
    const tracks=recentData?.recenttracks?.track||[];
    const artists=topData?.topartists?.artist||[];
    const nowPlaying=tracks[0]?.['@attr']?.nowplaying;
    let html='';

    // ── NOW PLAYING / LAST TRACK ──
    if(tracks[0]){
      const t=tracks[0];
      const img=t.image?.[3]?.['#text']||t.image?.[2]?.['#text']||'';
      html+=`<div class="lfm-now-card">
        ${img?`<div class="lfm-now-bg" style="background-image:url('${img}')"></div>`:''}
        <div class="lfm-now-overlay"></div>
        <div class="lfm-now-content">
          ${img
            ?`<img class="lfm-now-art" src="${img}" onerror="this.style.display='none'">`
            :`<div class="lfm-now-art-placeholder">🎵</div>`}
          <div style="flex:1;min-width:0">
            <div class="lfm-now-track">${escapeHTML(t.name||'Unknown')}</div>
            <div class="lfm-now-artist">${escapeHTML(t.artist?.['#text']||'')}</div>
            ${t.album?.['#text']?`<div class="lfm-now-album">${escapeHTML(t.album['#text'])}</div>`:''}
          </div>
          ${nowPlaying?`<div class="lfm-now-badge">LIVE</div>`:''}
        </div>
      </div>`;
    }

    // ── RECENT TRACKS ──
    html+=`<div class="lfm-section-label">Recent tracks</div>
    <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:16px">`;
    tracks.slice(nowPlaying?1:0,6).forEach(t=>{
      const img=t.image?.[1]?.['#text']||'';
      const isNow=t['@attr']?.nowplaying;
      const dateStr=t.date?.['#text']||'';
      html+=`<div class="lfm-track-row">
        ${img
          ?`<img class="lfm-track-art" src="${img}" onerror="this.style.display='none'">`
          :`<div class="lfm-track-art-ph">🎵</div>`}
        <div style="flex:1;min-width:0">
          <div class="lfm-track-name">${escapeHTML(t.name||'?')}</div>
          <div class="lfm-track-artist">${escapeHTML(t.artist?.['#text']||'')}</div>
        </div>
        ${isNow
          ?`<span style="font-size:9px;color:#ff5555;font-weight:700;font-family:var(--mono);animation:pulse 1.5s infinite">NOW</span>`
          :`<span class="lfm-track-time">${dateStr.split(',')[0]||''}</span>`}
      </div>`;
    });
    html+=`</div>`;

    // ── TOP ARTISTS ──
    if(artists.length){
      html+=`<div class="lfm-section-label">Top artists — 7 days</div>
      <div style="display:flex;flex-direction:column;gap:3px">`;
      const maxPlays=parseInt(artists[0]?.playcount||1);
      artists.slice(0,5).forEach((a,i)=>{
        const img=a.image?.[2]?.['#text']||'';
        const plays=parseInt(a.playcount||0);
        const pct=Math.round((plays/maxPlays)*100);
        html+=`<div class="lfm-artist-row">
          <div class="lfm-artist-rank">${i+1}</div>
          ${img
            ?`<img class="lfm-artist-art" src="${img}" onerror="this.style.display='none'">`
            :`<div class="lfm-artist-art-ph">🎤</div>`}
          <div style="flex:1;min-width:0">
            <div class="lfm-artist-name">${escapeHTML(a.name)}</div>
            <div class="lfm-artist-bar-track"><div class="lfm-artist-bar-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="lfm-artist-plays">${plays}</div>
        </div>`;
      });
      html+=`</div>`;
    }

    preview.style.display='block';
    preview.innerHTML=html;
    updateLastfmSidebar(data,tracks[0],artists);
  }catch(e){console.warn('Last.fm render error:',e);}
}

function updateLastfmSidebar(data,nowTrack,topArtists){
  const wrap=document.getElementById('sb-lastfm-wrap');
  const content=document.getElementById('sb-lastfm-content');
  if(!wrap||!content||!data)return;
  // Only show if actually now playing
  const isNow=nowTrack?.['@attr']?.nowplaying;
  if(!nowTrack||!isNow){wrap.style.setProperty('display','none','important');return;}
  wrap.style.setProperty('display','block','important');
  const img=nowTrack.image?.[2]?.['#text']||'';
  // Update pill elements directly
  const artEl=document.getElementById('sb-lfm-art');
  if(artEl)artEl.innerHTML=img?`<img src="${img}" onerror="this.innerHTML='♫'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:8px;display:block">`:'<span>♫</span>';
  const trackEl=document.getElementById('sb-lfm-track');
  if(trackEl)trackEl.textContent=nowTrack.name||'?';
  const artistEl=document.getElementById('sb-lfm-artist');
  if(artistEl)artistEl.textContent=nowTrack.artist?.['#text']||'';
  const eqEl=document.getElementById('sb-lfm-eq');
  if(eqEl)eqEl.style.display='flex';
}

async function refreshLastfm(){
  const p=curP();if(!p?.state?.connections?.lastfm)return;
  const btn=document.getElementById('lastfm-refresh-btn');
  if(btn){btn.textContent='...';btn.disabled=true;}
  await renderLastfmCard(p.state.connections.lastfm);
  if(btn){btn.textContent='↻ Refresh';btn.disabled=false;}
  toast('Last.fm refreshed!','success');
}

function disconnectLastfm(){
  const p=curP();if(!p)return;
  stopLastfmAutoRefresh();
  if(typeof stopSpotifyAutoRefresh==='function')stopSpotifyAutoRefresh();
  if(typeof stopSpotifyPlaybackTimers==='function')stopSpotifyPlaybackTimers();
  _lastfmNowPlaying=null;
  _lastfmTrackEnd=null;
  delete p.state.connections.lastfm;
  saveStateNow();
  document.getElementById('lastfm-badge').textContent='Not connected';
  document.getElementById('lastfm-badge').className='conn-status-badge disconnected';
  document.getElementById('lastfm-preview').style.display='none';
  document.getElementById('lastfm-preview').innerHTML='';
  document.getElementById('lastfm-disconnect-btn').style.display='none';
  document.getElementById('lastfm-refresh-btn').style.display='none';
  document.getElementById('lastfm-username').value='';
  document.getElementById('sb-lastfm-wrap').style.setProperty('display','none','important');
  toast('Last.fm disconnected','info');
}

function renderDiscordBadges(user){
  const flags = user.public_flags || 0;
  // Note: premium_type from Lanyard can be inaccurate - Nitro managed manually below
  const manualBadges = (curP()?.state?.manualBadges) || {};
  const BADGES = [
    {flag:4194304, e:'🛠️', bg:'rgba(107,220,66,.18)', bc:'#6bdc42', title:'Active Developer'},
    {flag:131072,  e:'🤖', bg:'rgba(88,101,242,.18)', bc:'#5865F2', title:'Verified Bot Developer'},
    {flag:65536,   e:'🛡️', bg:'rgba(92,187,189,.18)', bc:'#5cbbbd', title:'Certified Moderator'},
    {flag:16384,   e:'🐞', bg:'rgba(255,169,0,.18)',  bc:'#ffa900', title:'Bug Hunter Lv2'},
    {flag:8,       e:'🐛', bg:'rgba(244,123,103,.18)',bc:'#f47b67', title:'Bug Hunter Lv1'},
    {flag:512,     e:'🌟', bg:'rgba(249,104,84,.18)', bc:'#f96854', title:'Early Supporter'},
    {flag:4,       e:'🎪', bg:'rgba(255,215,0,.18)',  bc:'#ffd700', title:'HypeSquad Events'},
    {flag:64,      e:'🏠', bg:'rgba(230,126,34,.18)', bc:'#e67e22', title:'HypeSquad Bravery'},
    {flag:128,     e:'💥', bg:'rgba(233,30,99,.18)',  bc:'#e91e63', title:'HypeSquad Brilliance'},
    {flag:256,     e:'⚖️', bg:'rgba(26,188,156,.18)', bc:'#1abc9c', title:'HypeSquad Balance'},
    {flag:2,       e:'🤝', bg:'rgba(78,158,212,.18)', bc:'#4e9ed4', title:'Discord Partner'},
    {flag:1,       e:'🛡️', bg:'rgba(114,137,218,.18)',bc:'#7289da', title:'Discord Staff'},
  ];
  const parts = [];
  // Manual badges first
  if(manualBadges.nitro)        parts.push('<div class="dc-badge-v2" title="Nitro"           style="background:rgba(88,101,242,.18);border-color:#5865F2">💎</div>');
  if(manualBadges.nitroClassic) parts.push('<div class="dc-badge-v2" title="Nitro Classic"   style="background:rgba(88,101,242,.18);border-color:#5865F2">💎</div>');
  if(manualBadges.booster)      parts.push('<div class="dc-badge-v2" title="Server Boosting" style="background:rgba(255,115,250,.15);border-color:#ff73fa">🚀</div>');
  if(manualBadges.activedev)    parts.push('<div class="dc-badge-v2" title="Active Dev"      style="background:rgba(107,220,66,.18);border-color:#6bdc42">🛠️</div>');
  if(manualBadges.early)        parts.push('<div class="dc-badge-v2" title="Early Supporter" style="background:rgba(249,104,84,.18);border-color:#f96854">🌟</div>');
  if(manualBadges.partner)      parts.push('<div class="dc-badge-v2" title="Partner"         style="background:rgba(78,158,212,.18);border-color:#4e9ed4">🤝</div>');
  // Auto-detected from public_flags
  for(const b of BADGES){
    if(flags & b.flag) parts.push('<div class="dc-badge-v2" title="'+b.title+'" style="background:'+b.bg+';border-color:'+b.bc+'">'+b.e+'</div>');
  }
  return parts.join('');
}
