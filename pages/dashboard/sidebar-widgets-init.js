/* ETHONE legacy compatibility module: sidebar-widgets-init. */
// ══════════════════════════════════════════════════════════════
//  SIDEBAR WIDGETS INIT — called on every dashboard load
// ══════════════════════════════════════════════════════════════
function ethoneScheduleWidgetTask(label,fn,delay){
  if(typeof fn!=='function')return;
  const run=()=>{try{fn()}catch(e){console.warn('[ETHONE widgets] task failed:',label,e);}};
  const idle=window.requestIdleCallback;
  setTimeout(()=>{if(idle)idle(run,{timeout:1400});else run();},Number(delay)||0);
}

function ethoneWidgetCall(label,fnName,args){
  args=Array.isArray(args)?args:[];
  const boot=window.ETHONEBootManager;
  if(boot&&typeof boot.safeCall==='function')return boot.safeCall('widgets.'+label,fnName,args,{lazyGroup:'connections',autoLoad:false});
  const fn=window[fnName];
  if(typeof fn!=='function')return false;
  try{return fn.apply(window,args)}catch(e){console.warn('[ETHONE widgets] task failed:',label,e);return false}
}

function ethoneWidgetInitSignature(p){
  try{
    const state=p&&p.state?p.state:{};
    const conn=state.connections||{};
    const prefs=state.liveWidgets||state.sidebarWidgets||{};
    return JSON.stringify({
      discord:!!conn.discord?.userId,
      lastfm:!!conn.lastfm?.username,
      github:!!conn.github?.username,
      steam:!!conn.steam?.data,
      visible:prefs.visible||{},
      sidebar:prefs
    });
  }catch(e){return 'unknown'}
}

function ethoneScheduleSidebarWidgetsInit(p,delay){
  if(!p)return false;
  window.__ethoneSidebarWidgetsSchedule=window.__ethoneSidebarWidgetsSchedule||{};
  clearTimeout(window.__ethoneSidebarWidgetsSchedule.timer);
  window.__ethoneSidebarWidgetsSchedule.timer=setTimeout(()=>initSidebarWidgets(p),Number(delay)||120);
  return true;
}
window.ethoneScheduleSidebarWidgetsInit=ethoneScheduleSidebarWidgetsInit;

function initSidebarWidgets(p){
  if(!p)return;
  if(window.ethoneCanMountUI&&!window.ethoneCanMountUI('widgets-panel')){
    ['sb-discord-wrap','sb-spotify-wrap','sb-spotify-iframe-wrap','sb-lastfm-wrap','sb-github-wrap','sb-steam-wrap','sb-twitch-wrap'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.style.setProperty('display','none','important');
    });
    if(typeof updateLiveSectionVisibility==='function')setTimeout(updateLiveSectionVisibility,50);
    return;
  }
  window.__ethoneSidebarWidgetsInit=window.__ethoneSidebarWidgetsInit||{running:false,lastAt:0,lastSig:''};
  const initState=window.__ethoneSidebarWidgetsInit;
  const signature=ethoneWidgetInitSignature(p);
  const now=Date.now();
  if(initState.running)return;
  if(initState.lastSig===signature&&now-initState.lastAt<1800){
    if(typeof updateLiveSectionVisibility==='function')ethoneScheduleWidgetTask('visibility',updateLiveSectionVisibility,80);
    return;
  }
  initState.running=true;
  initState.lastSig=signature;
  initState.lastAt=now;
  setTimeout(()=>{initState.running=false},0);
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
    ethoneWidgetCall('spotify.stop-auto-refresh','stopSpotifyAutoRefresh');
    ethoneScheduleWidgetTask('discord',()=>{
      ethoneWidgetCall('discord.refresh','refreshDiscordSidebar');
      ethoneWidgetCall('discord.lanyard','startLanyardWS',[conn.discord.userId]);
    },120);
  } else {
    setWidgetDisplay('sb-discord-wrap',false);
    // No Discord — always use Last.fm fallback for Now Playing
    const npWrap=document.getElementById('sb-spotify-wrap');
    if(npWrap)npWrap.style.setProperty('display','none','important');
    if(conn.lastfm?.username&&vis.nowplaying!==false){
      const ifrWrap=document.getElementById('sb-spotify-iframe-wrap');
      if(ifrWrap)ifrWrap.style.setProperty('display','block','important');
      ethoneScheduleWidgetTask('spotify',()=>{
        ethoneWidgetCall('spotify.refresh','refreshSpotifySidebar');
        ethoneWidgetCall('spotify.start-auto-refresh','startSpotifyAutoRefresh');
      },160);
    }else{
      setWidgetDisplay('sb-spotify-iframe-wrap',false);
    }
  }

  // ── Last.fm scrobble card ──
  if(conn.lastfm?.username&&vis.lastfm!==false){
    ethoneScheduleWidgetTask('lastfm',()=>{
      const rendered=ethoneWidgetCall('lastfm.render','renderLastfmCard',[conn.lastfm]);
      if(rendered&&typeof rendered.catch==='function')rendered.catch(()=>{});
      ethoneWidgetCall('lastfm.start-auto-refresh','startLastfmAutoRefresh');
    },220);
  }else{
    setWidgetDisplay('sb-lastfm-wrap',false);
  }

  // ── GitHub activity card ──
  if(conn.github?.username&&vis.github!==false&&typeof renderGithubSidebar==='function'){
    ethoneScheduleWidgetTask('github',()=>renderGithubSidebar().catch(()=>{}),280);
  }else{
    setWidgetDisplay('sb-github-wrap',false);
  }

  // ── Steam status card (re-render from cache; toggling visibility hits this too) ──
  if(conn.steam?.data&&vis.steam!==false&&typeof renderSteamSidebar==='function'){
    ethoneScheduleWidgetTask('steam',()=>renderSteamSidebar(conn.steam.data),340);
  }else{
    setWidgetDisplay('sb-steam-wrap',false);
  }

  // ── Twitch: respect explicit hide even if a streamer is live ──
  if(vis.twitch===false){
    setWidgetDisplay('sb-twitch-wrap',false);
  }

  if(typeof updateLiveSectionVisibility==='function')ethoneScheduleWidgetTask('visibility',updateLiveSectionVisibility,420);
}
