/* ETHONE legacy compatibility module: sidebar-widgets-init. */
// ══════════════════════════════════════════════════════════════
//  SIDEBAR WIDGETS INIT — called on every dashboard load
// ══════════════════════════════════════════════════════════════
function initSidebarWidgets(p){
  if(!p)return;
  const conn=p.state?.connections||{};
  const setWidgetDisplay=(id,show)=>{
    const el=document.getElementById(id);
    if(el)el.style.setProperty('display',show?'block':'none','important');
  };

  const swPrefs=p.state.liveWidgets||p.state.sidebarWidgets||{};
  const vis=swPrefs.visible||{};
  p.state.liveWidgets=p.state.liveWidgets||swPrefs;
  if(swPrefs.discord===false&&vis.discord===undefined)vis.discord=false;
  if(swPrefs.lastfm===false&&vis.lastfm===undefined)vis.lastfm=false;

  // ── Discord status card ──
  const dcWrap=document.getElementById('sb-discord-wrap');
  const hasDiscord=!!(conn.discord?.userId&&vis.discord!==false);
  if(hasDiscord){
    setWidgetDisplay('sb-discord-wrap',true);
    // Cacher les deux Now Playing — Lanyard décidera lequel afficher
    const npWrap=document.getElementById('sb-spotify-wrap');
    const ifrWrap=document.getElementById('sb-spotify-iframe-wrap');
    if(npWrap)npWrap.style.setProperty('display','none','important');
    if(ifrWrap)ifrWrap.style.setProperty('display','none','important');
    // NE PAS démarrer le auto-refresh Last.fm fallback quand Discord est connecté
    clearInterval(_spotifyAutoRefresh);
    refreshDiscordSidebar();
    startLanyardWS(conn.discord.userId);
  } else {
    setWidgetDisplay('sb-discord-wrap',false);
    // No Discord — always use Last.fm fallback for Now Playing
    const npWrap=document.getElementById('sb-spotify-wrap');
    if(npWrap)npWrap.style.setProperty('display','none','important');
    if(conn.lastfm?.username&&vis.nowplaying!==false){
      const ifrWrap=document.getElementById('sb-spotify-iframe-wrap');
      if(ifrWrap)ifrWrap.style.setProperty('display','block','important');
      refreshSpotifySidebar();
      startSpotifyAutoRefresh();
    }else{
      setWidgetDisplay('sb-spotify-iframe-wrap',false);
    }
  }

  // ── Last.fm scrobble card ──
  if(conn.lastfm?.username&&vis.lastfm!==false){
    renderLastfmCard(conn.lastfm).catch(()=>{});
    startLastfmAutoRefresh();
  }else{
    setWidgetDisplay('sb-lastfm-wrap',false);
  }

  // ── GitHub activity card ──
  if(conn.github?.username&&vis.github!==false&&typeof renderGithubSidebar==='function'){
    renderGithubSidebar().catch(()=>{});
  }else{
    setWidgetDisplay('sb-github-wrap',false);
  }

  // ── Steam status card (re-render from cache; toggling visibility hits this too) ──
  if(conn.steam?.data&&vis.steam!==false&&typeof renderSteamSidebar==='function'){
    renderSteamSidebar(conn.steam.data);
  }else{
    setWidgetDisplay('sb-steam-wrap',false);
  }

  // ── Twitch: respect explicit hide even if a streamer is live ──
  if(vis.twitch===false){
    setWidgetDisplay('sb-twitch-wrap',false);
  }

  if(typeof updateLiveSectionVisibility==='function')setTimeout(updateLiveSectionVisibility,50);
}
