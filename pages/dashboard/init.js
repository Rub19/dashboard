/* ETHONE legacy compatibility module: dashboard-init. */
// ── SIDEBAR WIDGET TOGGLE ─────────────────────────────────────

function saveGroqKey(){
  const p=curP();if(!p)return;
  const key=document.getElementById('groq-key-input')?.value?.trim();
  if(!key){toast('Enter a valid API key','error');return;}
  if(!p.state.connections)p.state.connections={};
  p.state.connections.groqKey=key;
  saveStateNow();
  const status=document.getElementById('groq-key-status');
  if(status)status.textContent='✓ Key saved';
  setTimeout(()=>{if(status)status.textContent=''},2000);
  toast(uiLang==='fr'?'Clé Groq sauvegardée !':'Groq key saved!','success');
}

function loadGroqKeyUI(){
  const p=curP();if(!p)return;
  const key=p.state?.connections?.groqKey||'';
  const inp=document.getElementById('groq-key-input');
  const status=document.getElementById('groq-key-status');
  if(inp&&key){
    inp.value=key;
    if(status)status.textContent='✓ Key configured';
  }
}

function toggleSidebarWidget(service){
  const p=curP();if(!p)return;
  if(!p.state.sidebarWidgets)p.state.sidebarWidgets={};
  const current=p.state.sidebarWidgets[service]!==false;// default visible
  p.state.sidebarWidgets[service]=!current;
  saveStateNow();
  updateSidebarWidgetToggleBtn(service);
  initSidebarWidgets(p);
}

function updateSidebarWidgetToggleBtn(service){
  const p=curP();if(!p)return;
  const visible=p.state.sidebarWidgets?.[service]!==false;
  const btnId={discord:'dc-sidebar-toggle',lastfm:'lastfm-sidebar-toggle'}[service];
  const btn=document.getElementById(btnId);
  if(btn){btn.classList.toggle('active',visible);btn.title=visible?'Hide from sidebar':'Show in sidebar';}
}

function initSidebarWidgetToggles(){
  const p=curP();if(!p)return;
  const conn=p.state.connections||{};
  if(conn.discord?.userId){
    const btn=document.getElementById('dc-sidebar-toggle');
    if(btn)btn.style.display='flex';
    updateSidebarWidgetToggleBtn('discord');
  }
  if(conn.lastfm?.username){
    const btn=document.getElementById('lastfm-sidebar-toggle');
    if(btn)btn.style.display='flex';
    updateSidebarWidgetToggleBtn('lastfm');
  }
  renderWidgetManager();
  applySidebarWidgetOrder();
}


function toggleSidebarCompact(){
  const p=curP();if(!p)return;
  p.sidebarCompact=!p.sidebarCompact;
  const sb=document.getElementById('main-sidebar');
  if(sb)sb.classList.toggle('compact',p.sidebarCompact);
  // Width (and the main-content grid track that depends on it) is driven
  // entirely by the --sidebar-w CSS var — see resizable-sidebar.js.
  const resize=window.ethoneSidebarResize;
  if(resize){if(p.sidebarCompact)resize.suspendForCompact();else resize.resumeFromCompact();}
  saveStateNow();
  if(typeof window.ethoneNotifyManualCompactToggle==='function')window.ethoneNotifyManualCompactToggle();
  if(typeof window.ethoneUpdateSidebarScrollFade==='function')setTimeout(window.ethoneUpdateSidebarScrollFade,240);
}

function applySidebarCompact(){
  const p=curP();if(!p)return;
  const sb=document.getElementById('main-sidebar');
  if(sb)sb.classList.toggle('compact',!!p.sidebarCompact);
  if(window.ethoneSidebarResize&&p.sidebarCompact)window.ethoneSidebarResize.suspendForCompact();
  // Dashboard boot can finish well after the one-time laptop-range
  // auto-compact check (which fires shortly after DOMContentLoaded, while
  // the login screen is still showing). Re-run it now so a laptop-width
  // viewport still ends up compact even if the user's saved preference
  // was "expanded" and this function ran last.
  if(typeof window.applyResponsiveSidebar==='function')window.applyResponsiveSidebar();
}

function scheduleDashboardWork(label,fn,delay){
  if(typeof fn!=='function')return;
  const run=()=>{try{fn()}catch(e){console.warn('[ETHONE boot] deferred task failed:',label,e);}};
  const idle=window.requestIdleCallback;
  setTimeout(()=>{if(idle)idle(run,{timeout:1200});else run();},Number(delay)||0);
}

function initDashboard(){
  const p=curP();if(!p)return;
  const now=Date.now();
  if(window.__ethoneInitDashboardAt&&now-window.__ethoneInitDashboardAt<300)return;
  window.__ethoneInitDashboardAt=now;
  if(!p.state)p.state=defState(p.name);
  if(!p.state.connections)p.state.connections={};

  // ── CRITICAL PATH (synchronous, visible immediately) ──────────────────
  renderSidebarNav();
  updateSidebarAvatar();
  updateTopbarProfile();
  checkMobileLayout();
  applySidebarCompact();
  document.getElementById('display-username').textContent=p.name;
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  document.getElementById('page-dashboard').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  const firstNav=document.querySelector('.nav-item');if(firstNav)firstNav.classList.add('active');
  document.getElementById('quick-note').value=p.state.note||'';
  document.getElementById('main-note').value=p.state.note||'';
  updateClock();
  scheduleDashboardWork('stats',()=>updateStats(),80);
  // Pré-charger état pomo depuis localStorage avant renderPomo
  scheduleDashboardWork('pomo-restore',()=>{
    const _end=parseInt(localStorage.getItem('pomo_end')||0);
    if(_end){
      const _rem=Math.round((_end-Date.now())/1000);
      if(_rem>0){
        pomoIdx=parseInt(localStorage.getItem('pomo_idx')||0);
        pomoCount=parseInt(localStorage.getItem('pomo_count')||0);
        pomoRemaining=_rem;
      }
    }
    renderPomo();
    restorePomoIfRunning();
  },120);
  scheduleDashboardWork('daily-focus',()=>{if(typeof renderDailyFocus==='function')renderDailyFocus();},160);
  scheduleDashboardWork('theme',()=>{
    if(typeof applyTheme==='function')applyTheme(p.themeIdx||0);
    if(typeof bootThemeEngine==='function')bootThemeEngine();
    initDarkMode();
  },200);
  scheduleDashboardWork('banner',()=>{if(typeof updateBannerDisplay==='function')updateBannerDisplay();},240);
  scheduleDashboardWork('notifications',()=>initNotifState(p),280);
  updateSyncIndicator(_sbUser?'saved':'offline');

  // ── VISIBLE CONTENT ─────────────────────────────────────────────────
  scheduleDashboardWork('home-content',()=>{
    renderRecentItems();renderActivity();renderTodos();renderOverviewEvents();
    if(typeof renderPinnedLinks==='function')renderPinnedLinks();
    if(typeof renderCountdown==='function')renderCountdown();
  },320);
  scheduleDashboardWork('connections-ui',()=>loadConnectionsUI(),520);
  if(!window.ethoneCanMountUI||window.ethoneCanMountUI('widgets-panel')){
    scheduleDashboardWork('sidebar-widgets',()=>initSidebarWidgets(p),680);
  }
  const adminBtn=document.getElementById('nav-admin');
  if(adminBtn)adminBtn.style.display=_isAdmin?'flex':'none';
  // ── DEFERRED (non-critical) ───────────────────────────────────────────
  // Restaurer pomo immédiatement (avant le setTimeout) pour éviter flash 25:00
  scheduleDashboardWork('secondary-dashboard-render',()=>{
    if(typeof renderGamingOverview==='function')renderGamingOverview();
    initAnimations();
    startNotifScan();
  },760);
  scheduleDashboardWork('mobile-layout',()=>checkMobileLayout(),820);
  if(!window.ethoneCanMountUI||window.ethoneCanMountUI('widgets-panel')){
    scheduleDashboardWork('spotify-sidebar',()=>refreshSpotifySidebar(),900);
  }
  scheduleDashboardWork('theme-refresh',()=>{if(typeof applyTheme==='function')applyTheme(p.themeIdx||0);},960);
  // Apply bgTheme — wait for paint then size canvas properly
  if(p.bgTheme&&p.bgTheme!=='none'){
    const _applyBg=()=>{
      const c=document.getElementById('bg-canvas');
      if(!c)return;
      c.width=window.innerWidth||document.documentElement.clientWidth;
      c.height=window.innerHeight||document.documentElement.clientHeight;
      applyBgTheme(p.bgTheme);
      // Make sidebar transparent
      const sb=document.getElementById('main-sidebar');
      if(sb)sb.style.background='rgba(5,5,7,.5)';
    };
    // Double RAF ensures layout is complete
    requestAnimationFrame(()=>requestAnimationFrame(_applyBg));
  }
  // Restore custom accent silently. User-facing toasts belong to manual changes,
  // not dashboard boot.
  if(p.customAccent){
    scheduleDashboardWork('custom-accent',()=>{
      if(typeof window.applyStoredCustomAccent==='function')window.applyStoredCustomAccent(p.customAccent);
      else if(typeof applyCustomColor==='function')applyCustomColor(p.customAccent);
    },1040);
  }
  // Delay weather/quote to let DOM and geolocation settle
  scheduleDashboardWork('weather-quote',()=>{fetchWeather();fetchQuote();},1500);
  scheduleDashboardWork('banner-refresh',()=>{if(typeof updateBannerDisplay==='function')updateBannerDisplay();},1120);
  try{
    const welcomeKey='ethone:welcome-activity:'+p.id;
    if(sessionStorage.getItem(welcomeKey)!=='1'){
      sessionStorage.setItem(welcomeKey,'1');
      scheduleDashboardWork('welcome-activity',()=>addActivity('Welcome back, '+p.name,'var(--accent)'),1000);
    }
  }catch(e){}
}

function updateSidebarAvatar(){
  const p=curP();if(!p)return;
  // Sidebar avatar
  const el=document.getElementById('sidebar-avatar');
  if(el){
    el.innerHTML='';
    if(p.avatarImg){
      const img=document.createElement('img');
      img.src=p.avatarImg;
      img.style.cssText='width:34px;height:34px;object-fit:cover;border-radius:7px;display:block';
      img.onerror=()=>{ el.innerHTML=`<span style="font-size:15px;font-weight:700;color:var(--accent)">${(p.name||'U')[0].toUpperCase()}</span>`; };
      el.style.background='transparent';
      el.appendChild(img);
    } else {
      el.style.background=p.avatarBg||'rgba(139,92,246,.15)';
      const span=document.createElement('span');
      span.style.cssText=`font-size:${p.avatarEmoji?'18px':'15px'};line-height:1;font-weight:${p.avatarEmoji?'400':'700'};color:${p.avatarEmoji?'inherit':'var(--accent)'}`;
      span.textContent=p.avatarEmoji||(p.name||'U')[0].toUpperCase();
      el.appendChild(span);
    }
  }
  // Display name
  const un=document.getElementById('display-username');
  if(un)un.textContent=p.name||'User';
  // Topbar + banner
  updateTopbarProfile();
  // NE PAS appeler updateBannerDisplay ici — elle appelle updateSidebarAvatar → boucle infinie
}

function updateSettingsPreview(){
  const p=curP();if(!p)return;
  const el=document.getElementById('settings-avatar-preview');
  if(el){
    el.style.background=p.avatarImg?'transparent':(p.avatarBg||'#1e1e24');
    el.style.position='relative';
    el.innerHTML=avatarHTML(p,54,11);
  }
  renderThemeSwatches();renderBgThemeBtns();renderSidebarCustomize();

  // Restore custom color preview
  if(p.customAccent){
    const prev=document.getElementById('custom-color-preview');
    const input=document.getElementById('custom-color-input');
    if(prev)prev.style.background=p.customAccent;
    if(input)input.value=p.customAccent;
  }

  // Bio
  const bioEl=document.getElementById('settings-bio');
  if(bioEl)bioEl.value=p.state.bio||'';

  // Social links
  const socials=['twitter','github','website','instagram'];
  socials.forEach(s=>{
    const el=document.getElementById('social-'+s);
    if(el)el.value=p.state.socials?.[s]||'';
  });

  // XP + Level
  renderProfileXP(p);

  // Quick stats
  renderProfileQuickStats(p);
}
