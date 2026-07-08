(function(){
  if(window.__ethoneFinishPassBooted)return;
  window.__ethoneFinishPassBooted=true;
  let bootScheduled=false;

  const STATIC_WIDGETS={
    discord:'#sb-discord-wrap',
    nowplaying:'#sb-spotify-wrap,#sb-spotify-iframe-wrap',
    lastfm:'#sb-lastfm-wrap',
    twitch:'#sb-twitch-wrap',
    steam:'#sb-steam-wrap',
    github:'#sb-github-wrap'
  };

  function profile(){
    try{return typeof window.curP==='function'?window.curP():null;}catch(e){return null;}
  }

  function save(){
    try{if(typeof window.saveStateNow==='function')window.saveStateNow();}catch(e){}
  }

  function hexToRgb(hex){
    const clean=String(hex||'').trim().replace('#','');
    if(!/^[0-9a-f]{6}$/i.test(clean))return {r:139,g:92,b:246};
    return {
      r:parseInt(clean.slice(0,2),16),
      g:parseInt(clean.slice(2,4),16),
      b:parseInt(clean.slice(4,6),16)
    };
  }

  function toHex(n){
    return Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0');
  }

  function mix(hex,target,amount){
    const a=hexToRgb(hex);
    const b=hexToRgb(target);
    return '#'+toHex(a.r+(b.r-a.r)*amount)+toHex(a.g+(b.g-a.g)*amount)+toHex(a.b+(b.b-a.b)*amount);
  }

  function applyAccentVars(hex){
    const accent=/^#[0-9a-f]{6}$/i.test(String(hex||''))?hex:'#8b5cf6';
    const rgb=hexToRgb(accent);
    const rgbText=`${rgb.r},${rgb.g},${rgb.b}`;
    const root=document.documentElement.style;
    root.setProperty('--accent',accent);
    root.setProperty('--accent-rgb',rgbText);
    root.setProperty('--accent-hover',mix(accent,'#ffffff',.16));
    root.setProperty('--accent-active',mix(accent,'#000000',.16));
    root.setProperty('--accent-light',mix(accent,'#ffffff',.28));
    root.setProperty('--accent-contrast',accent);
    root.setProperty('--accent-contrast-hover',mix(accent,'#ffffff',.10));
    root.setProperty('--accent-border',`rgba(${rgbText},.28)`);
    root.setProperty('--accent-subtle',`rgba(${rgbText},.09)`);
    root.setProperty('--accent-soft',`rgba(${rgbText},.13)`);
    root.setProperty('--accent-glow',`rgba(${rgbText},.26)`);
    root.setProperty('--border3',`rgba(${rgbText},.22)`);
    root.setProperty('--focus-ring',`0 0 0 3px rgba(${rgbText},.22)`);
    root.setProperty('--text-accent',mix(accent,'#ffffff',.36));
    root.setProperty('--glow-purple',`0 0 28px rgba(${rgbText},.22)`);
  }

  function currentAccent(){
    const p=profile();
    if(p&&p.customAccent)return p.customAccent;
    if(p&&Array.isArray(window.THEMES)&&window.THEMES[p.themeIdx])return window.THEMES[p.themeIdx].accent;
    const css=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return css||'#8b5cf6';
  }

  function syncTheme(){
    try{if(typeof window.bootThemeEngine==='function')window.bootThemeEngine();}catch(e){}
    applyAccentVars(currentAccent());
  }

  function wrap(name,after){
    const fn=window[name];
    if(typeof fn!=='function'||fn.__ethoneFinishWrapped)return;
    const wrapped=function(){
      const result=fn.apply(this,arguments);
      try{after.apply(this,arguments);}catch(e){console.warn('[ETHONE finish]',name,e);}
      return result;
    };
    wrapped.__ethoneFinishWrapped=true;
    window[name]=wrapped;
  }

  function patchThemeFunctions(){
    wrap('applyCustomColor',function(hex){applyAccentVars(hex);});
    wrap('pickTheme',function(){requestAnimationFrame(syncTheme);});
    wrap('applyTheme',function(){requestAnimationFrame(syncTheme);});
    wrap('setThemeField',function(){requestAnimationFrame(syncTheme);});
    wrap('resetTheme',function(){requestAnimationFrame(syncTheme);});
  }

  function widgetPrefs(){
    try{
      if(typeof window.getWidgetPrefs==='function')return window.getWidgetPrefs();
    }catch(e){}
    const p=profile();
    if(!p)return {order:['discord','nowplaying','lastfm'],visible:{},pinned:{},config:{},sizes:{}};
    if(!p.state)p.state={};
    if(!p.state.liveWidgets)p.state.liveWidgets={order:['discord','nowplaying','lastfm'],visible:{},pinned:{},config:{},sizes:{}};
    const w=p.state.liveWidgets;
    w.order=w.order||['discord','nowplaying','lastfm'];
    w.visible=w.visible||{};
    w.pinned=w.pinned||{};
    w.config=w.config||{};
    w.sizes=w.sizes||{};
    return w;
  }

  function migrateWidgetPrefs(){
    const p=profile();
    if(!p||!p.state||!p.state.sidebarWidgets)return;
    if(!p.state.liveWidgets){
      p.state.liveWidgets={
        order:p.state.sidebarWidgets.order||['discord','nowplaying','lastfm'],
        visible:p.state.sidebarWidgets.visible||{},
        pinned:p.state.sidebarWidgets.pinned||{},
        config:p.state.sidebarWidgets.config||{},
        sizes:p.state.sidebarWidgets.sizes||{}
      };
      save();
    }
  }

  function staticWidgetElements(id){
    const selector=STATIC_WIDGETS[id];
    return selector?Array.from(document.querySelectorAll(selector)):[];
  }

  function syncLiveWidgets(){
    const prefs=widgetPrefs();
    Object.keys(STATIC_WIDGETS).forEach(function(id){
      const on=prefs.visible[id]!==false;
      staticWidgetElements(id).forEach(function(el){
        el.hidden=!on;
        el.classList.toggle('is-widget-hidden',!on);
        if(!on)el.style.setProperty('display','none','important');
        else el.style.removeProperty('display');
      });
    });
    try{if(typeof window.updateLiveSectionVisibility==='function')window.updateLiveSectionVisibility();}catch(e){}
  }

  function patchWidgetFunctions(){
    ['toggleWidgetVisible','toggleWidgetPinned','saveWidgetPrefs','applySidebarWidgetOrder','initSidebarWidgets','renderWidgetManager'].forEach(function(name){
      wrap(name,function(){
        requestAnimationFrame(syncLiveWidgets);
      });
    });
  }

  function polishSidebar(){
    const sidebar=document.getElementById('main-sidebar');
    if(!sidebar)return;
    sidebar.querySelectorAll('.nav-item').forEach(function(item){
      const label=item.querySelector('.nav-label-text')||item;
      const text=(label.textContent||'').trim();
      if(text&&!item.title)item.title=text;
    });
  }

  function boot(){
    patchThemeFunctions();
    patchWidgetFunctions();
    migrateWidgetPrefs();
    syncTheme();
    syncLiveWidgets();
    polishSidebar();
  }

  function scheduleBoot(){
    if(bootScheduled)return;
    bootScheduled=true;
    setTimeout(function(){
      bootScheduled=false;
      if(document.body&&document.body.classList.contains('ethone-dashboard-booting'))return scheduleBoot();
      boot();
    },180);
  }

  document.addEventListener('DOMContentLoaded',boot,{once:true});
  window.addEventListener('ethone:dashboard-ready',scheduleBoot);
  window.addEventListener('ethone:page-ready',scheduleBoot);
  window.addEventListener('resize',function(){requestAnimationFrame(polishSidebar);},{passive:true});

  window.ethoneFinishPass={
    boot,
    syncTheme,
    syncLiveWidgets,
    applyAccentVars
  };
  window.applyStoredCustomAccent=applyAccentVars;
})();
