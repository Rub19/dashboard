/* ETHONE legacy compatibility module: spotify. */
// === SPOTIFY ===
function connectSpotify(){
  const url=document.getElementById('spotify-url').value.trim();
  if(!url){toast('Enter a widget URL','error');return}
  const p=curP();if(!p)return;
  if(!p.state.connections)p.state.connections={};
  p.state.connections.spotify={widgetUrl:url};saveStateNow();
  refreshSpotifySidebar();
  const badge=document.getElementById('spotify-badge');
  if(badge){badge.textContent='Connected';badge.className='conn-status-badge connected';}
  const btn=document.getElementById('spotify-disconnect-btn');if(btn)btn.style.display='inline-flex';
  const rbtn=document.getElementById('spotify-refresh-btn');if(rbtn)rbtn.style.display='inline-block';
  toast('Spotify widget saved!','success');
}

function disconnectSpotify(){
  const p=curP();if(!p)return;
  if(!confirm('Remove Spotify widget?'))return;
  delete p.state.connections.spotify;saveStateNow();
  refreshSpotifySidebar();
  const badge=document.getElementById('spotify-badge');
  if(badge){badge.textContent='Not connected';badge.className='conn-status-badge disconnected';}
  const inp=document.getElementById('spotify-url');if(inp)inp.value='';
  const btn=document.getElementById('spotify-disconnect-btn');if(btn)btn.style.display='none';
  const rbtn=document.getElementById('spotify-refresh-btn');if(rbtn)rbtn.style.display='none';
  toast('Removed','info');
}

let _npCurrentTrack=null;
let _npStartTime=null;
let _npDurationMs=0;
let _npProgressTimer=null;

async function refreshSpotifySidebar(){
  const p=curP();if(!p)return;
  const wrap=document.getElementById('sb-spotify-iframe-wrap');
  const lfm=p.state.connections?.lastfm;

  if(!lfm?.username){if(wrap)wrap.style.display='none';return;}
  if(wrap)wrap.style.display='block';

  try{
    const data=await fetchLastfm('user.getrecenttracks',`user=${encodeURIComponent(lfm.username)}&limit=1`);
    const track=data?.recenttracks?.track?.[0];
    if(!track)return;

    const isPlaying=track?.['@attr']?.nowplaying==='true';
    const title=track.name||'—';
    const artist=track.artist?.['#text']||'—';
    const art=track.image?.[2]?.['#text']||'';
    const trackKey=title+'|'+artist;

    // Update UI
    const artEl=document.getElementById('np-art-fallback');
    if(artEl)artEl.innerHTML=art
      ?`<img src="${art}" onerror="this.innerHTML='♪'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:8px;display:block">`
      :'<span>♪</span>';
    const trackEl=document.getElementById('np-fallback-track');
    if(trackEl)trackEl.textContent=title;
    const artistEl=document.getElementById('np-fallback-artist');
    if(artistEl)artistEl.textContent=artist;
    const eqEl=document.getElementById('np-fallback-eq');
    if(eqEl)eqEl.style.display=isPlaying?'flex':'none';

    // Show/hide time row
    const timeRow=document.getElementById('np-fallback-time-row');
    if(timeRow)timeRow.style.display=isPlaying?'flex':'none';

    if(isPlaying){
      // Fetch duration + restore position across refresh
      if(trackKey!==_npCurrentTrack){
        _npCurrentTrack=trackKey;
        clearInterval(_npProgressTimer);
        try{
          const info=await fetchLastfm('track.getInfo',`artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&autocorrect=1`);
          _npDurationMs=parseInt(info?.track?.duration)||240000;
        }catch(e){_npDurationMs=240000;}

        // Restore start time from sessionStorage if same track
        const stored=JSON.parse(sessionStorage.getItem('np_track')||'{}');
        if(stored.key===trackKey&&stored.startedAt){
          _npStartTime=stored.startedAt;
        } else {
          // New track — estimate start as now minus half the duration (can't know exactly)
          // Better: use the timestamp of the NEXT track in recent tracks to back-calculate
          try{
            const recent=await fetchLastfm('user.getrecenttracks',`user=${encodeURIComponent(lfm.username)}&limit=2`);
            const tracks=recent?.recenttracks?.track||[];
            // Second track (index 1) is the previously completed track
            // Its date + duration ≈ when current track started
            if(tracks[1]?.date?.uts){
              const prevEndMs=parseInt(tracks[1].date.uts)*1000;
              _npStartTime=prevEndMs;
            } else {
              _npStartTime=Date.now();
            }
          }catch(e){_npStartTime=Date.now();}
          sessionStorage.setItem('np_track',JSON.stringify({key:trackKey,startedAt:_npStartTime,duration:_npDurationMs}));
        }
        _npProgressTimer=setInterval(()=>updateNpFallbackProgress(),1000);
        updateNpFallbackProgress();
      }
    } else {
      clearInterval(_npProgressTimer);
      _npCurrentTrack=null;
      const fill=wrap?.querySelector('.sb-wc-bar-fill');
      if(fill){fill.style.transition='none';fill.style.width='35%';}
    }

  }catch(e){
    console.warn('[ETHONE] Now Playing error:',e.message);
  }
}

function updateNpFallbackProgress(){
  if(!_npStartTime||!_npDurationMs)return;
  const elapsed=Math.min(Date.now()-_npStartTime,_npDurationMs);
  const pct=Math.round((elapsed/_npDurationMs)*100);
  const fmt=ms=>{const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+(s%60).toString().padStart(2,'0');};
  const fill=document.querySelector('#sb-spotify-iframe-wrap .sb-wc-bar-fill');
  if(fill){fill.style.transition='none';fill.style.width=pct+'%';}
  const el=document.getElementById('np-fallback-elapsed');if(el)el.textContent=fmt(elapsed);
  const dl=document.getElementById('np-fallback-duration');if(dl)dl.textContent=fmt(_npDurationMs);
}

// Auto-refresh Now Playing every 30s
let _spotifyAutoRefresh=null;
function startSpotifyAutoRefresh(){
  clearInterval(_spotifyAutoRefresh);
  refreshSpotifySidebar();
  _spotifyAutoRefresh=setInterval(()=>{
    // Only refresh if track might have changed (every 30s)
    refreshSpotifySidebar();
  },30000);
}
