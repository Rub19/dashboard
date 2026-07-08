/* ETHONE Status Bar - macOS-like system layer.
 * Reads existing ETHONE state only; no backend/auth changes.
 */
(function(){
  "use strict";
  if(window.__ethoneStatusBar)return;
  window.__ethoneStatusBar=true;

  var STORAGE_KEY="ethone:status-bar:v1";
  var metrics={lag:0,lastTick:performance.now()};
  var timers=[];
  var itemDefs=[
    ["time","clock","Heure"],
    ["connection","wifi","Connexion"],
    ["sync","refresh-cw","Sync"],
    ["ai","brain","ETHONE AI"],
    ["workspace","layers-3","Workspace"],
    ["notifications","bell","Notifications"],
    ["profile","user","Profil"],
    ["cpu","cpu","CPU"],
    ["ram","memory-stick","RAM"],
    ["spotify","music-2","Spotify"],
    ["weather","cloud-sun","Weather"]
  ];

  function $(sel,root){return (root||document).querySelector(sel)}
  function $all(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]})}
  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function saveState(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function lang(){return String(document.documentElement.lang||window._lang||"fr").slice(0,2).toLowerCase()}
  function t(fr,en){return lang()==="fr"?fr:en}
  function defaults(){
    var items={};
    itemDefs.forEach(function(def){items[def[0]]=true});
    return {collapsed:false,items:items};
  }
  function readConfig(){
    var base=defaults();
    try{
      var parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
      base.collapsed=!!parsed.collapsed;
      base.items=Object.assign(base.items,parsed.items||{});
    }catch(e){}
    return base;
  }
  var config=readConfig();
  function writeConfig(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(config))}catch(e){}
  }
  function appVisible(){
    var main=$("#main-content");
    var auth=$("#auth-screen"),profileScreen=$("#profile-screen"),password=$("#password-screen");
    if(!main)return false;
    var mainVisible=getComputedStyle(main).display!=="none";
    var authVisible=auth&&getComputedStyle(auth).display!=="none";
    var profileVisible=profileScreen&&getComputedStyle(profileScreen).display!=="none";
    var passwordVisible=password&&getComputedStyle(password).display!=="none";
    return mainVisible&&!authVisible&&!profileVisible&&!passwordVisible;
  }
  function icon(name){return '<i data-lucide="'+esc(name)+'" aria-hidden="true"></i>'}
  function renderIcons(){try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}}
  function itemButton(id,iconName,label){
    var actionable=/^(ai|workspace|notifications|profile|spotify|weather)$/.test(id);
    return '<'+(actionable?'button':'span')+' class="esb-item" data-status-item="'+id+'" '+(actionable?'type="button"':'')+' title="'+esc(label)+'">'+
      icon(iconName)+'<span class="esb-value">'+esc(label)+'</span></'+(actionable?'button':'span')+'>';
  }
  function build(){
    if($("#ethone-status-bar"))return;
    var bar=document.createElement("div");
    bar.id="ethone-status-bar";
    bar.setAttribute("role","toolbar");
    bar.setAttribute("aria-label","ETHONE Status Bar");
    bar.innerHTML=
      '<div class="esb-zone esb-left">'+
        '<div class="esb-brand" title="ETHONE"><span class="esb-brand-mark" aria-hidden="true"></span><span class="esb-brand-text">ETHONE</span></div>'+
        itemButton("workspace","layers-3","Workspace")+
        itemButton("ai","brain","AI")+
      '</div>'+
      '<div class="esb-zone esb-center">'+
        itemButton("time","clock","--:--")+
        itemButton("sync","refresh-cw","Sync")+
      '</div>'+
      '<div class="esb-zone esb-right">'+
        itemButton("connection","wifi","Online")+
        itemButton("cpu","cpu","CPU")+
        itemButton("ram","memory-stick","RAM")+
        itemButton("spotify","music-2","Spotify")+
        itemButton("weather","cloud-sun","Weather")+
        itemButton("notifications","bell","0")+
        itemButton("profile","user","Profil")+
        '<button class="esb-action" type="button" data-esb-action="collapse" title="'+esc(t("Reduire la barre","Collapse status bar"))+'">'+icon("chevron-up")+'</button>'+
        '<button class="esb-action" type="button" data-esb-action="settings" aria-expanded="false" title="'+esc(t("Personnaliser la barre","Customize status bar"))+'">'+icon("sliders-horizontal")+'</button>'+
      '</div>'+
      '<div class="esb-menu" id="ethone-status-menu" role="menu" aria-label="Status Bar settings"></div>';
    document.body.appendChild(bar);
    renderMenu();
    bind(bar);
  }
  function renderMenu(){
    var menu=$("#ethone-status-menu");
    if(!menu)return;
    menu.innerHTML=
      '<div class="esb-menu-head"><div><strong>'+esc(t("Status Bar","Status Bar"))+'</strong><span>'+esc(t("Choisis les modules visibles. La configuration est sauvegardee localement.","Choose visible modules. Your layout is saved locally."))+'</span></div></div>'+
      itemDefs.map(function(def){
        var id=def[0],label=def[2],on=config.items[id]!==false;
        return '<button class="esb-toggle-row" type="button" role="switch" aria-pressed="'+(on?'true':'false')+'" data-esb-toggle="'+id+'"><span>'+icon(def[1])+esc(label)+'</span><span class="esb-switch" aria-hidden="true"></span></button>';
      }).join("");
    renderIcons();
  }
  function bind(bar){
    bar.addEventListener("click",function(e){
      var action=e.target.closest("[data-esb-action]");
      if(action){
        if(action.dataset.esbAction==="collapse")setCollapsed(!config.collapsed);
        if(action.dataset.esbAction==="settings")toggleMenu();
        return;
      }
      var toggle=e.target.closest("[data-esb-toggle]");
      if(toggle){
        var id=toggle.dataset.esbToggle;
        config.items[id]=!(config.items[id]!==false);
        writeConfig();
        renderMenu();
        applyConfig();
        refresh();
        return;
      }
      var item=e.target.closest("[data-status-item]");
      if(item&&item.tagName==="BUTTON")activate(item.dataset.statusItem);
    });
    document.addEventListener("click",function(e){
      var bar=$("#ethone-status-bar");
      if(bar&&!bar.contains(e.target))closeMenu();
    });
    window.addEventListener("online",refresh);
    window.addEventListener("offline",refresh);
    window.addEventListener("storage",function(e){if(e.key===STORAGE_KEY){config=readConfig();applyConfig();refresh()}});
    ["ethone:notification","ethone:workspace-change","ethone:memory-event","ethone:page-ready"].forEach(function(name){
      window.addEventListener(name,function(){setTimeout(refresh,40)});
    });
  }
  function applyConfig(){
    document.body.classList.toggle("ethone-statusbar-collapsed",!!config.collapsed);
    $all("[data-status-item]").forEach(function(el){
      var id=el.getAttribute("data-status-item");
      el.style.display=config.items[id]===false?"none":"";
    });
    var collapse=$('[data-esb-action="collapse"]');
    if(collapse){
      collapse.title=config.collapsed?t("Agrandir la barre","Expand status bar"):t("Reduire la barre","Collapse status bar");
      collapse.innerHTML=icon(config.collapsed?"chevron-down":"chevron-up");
    }
  }
  function updateVisibility(){
    var visible=appVisible();
    document.body.classList.toggle("ethone-statusbar-ready",visible);
    if(visible)refresh();
  }
  function setCollapsed(value){
    config.collapsed=!!value;
    writeConfig();
    applyConfig();
    renderIcons();
  }
  function toggleMenu(){
    var menu=$("#ethone-status-menu"),btn=$('[data-esb-action="settings"]');
    if(!menu)return;
    var open=!menu.classList.contains("open");
    menu.classList.toggle("open",open);
    if(btn)btn.setAttribute("aria-expanded",open?"true":"false");
  }
  function closeMenu(){
    var menu=$("#ethone-status-menu"),btn=$('[data-esb-action="settings"]');
    if(menu)menu.classList.remove("open");
    if(btn)btn.setAttribute("aria-expanded","false");
  }
  function setValue(id,html,title){
    var el=$('[data-status-item="'+id+'"]');
    if(!el)return;
    var value=$(".esb-value",el);
    if(value)value.innerHTML=html;
    if(title)el.title=title;
  }
  function activeWorkspace(){
    try{
      if(window.ETHONEWorkspaces&&typeof window.ETHONEWorkspaces.active==="function"){
        var w=window.ETHONEWorkspaces.active();
        if(w)return w;
      }
    }catch(e){}
    var p=profile();
    return p&&p.state&&p.state.activeWorkspace? p.state.activeWorkspace : null;
  }
  function unreadNotifications(){
    try{
      if(window.ETHONENotifications&&typeof window.ETHONENotifications.history==="function"){
        return window.ETHONENotifications.history().filter(function(n){return !n.read}).length;
      }
    }catch(e){}
    var p=profile();
    var list=p&&p.state&&Array.isArray(p.state.notifications)?p.state.notifications:[];
    return list.filter(function(n){return !n.read}).length;
  }
  function spotifyLabel(){
    var p=profile(),state=p&&p.state||{},conn=state.connections||{};
    var sp=conn.spotify||{};
    var lf=conn.lastfm||state.lastfm||{};
    if(sp.track||sp.artist)return [sp.track,sp.artist].filter(Boolean).join(" - ");
    if(lf.track||lf.artist)return [lf.track,lf.artist].filter(Boolean).join(" - ");
    if(sp.widgetUrl)return "Spotify Ready";
    return "Spotify";
  }
  function weatherLabel(){
    var p=profile(),state=p&&p.state||{},cache=state.weatherCache||{};
    var rendered=String(cache.rendered||"");
    var temp=(rendered.match(/weather-temp[^>]*>([^<]+)/i)||rendered.match(/(-?\d+\s?°[CF]?)/i)||[])[1];
    var city=cache.city||state.weatherCity||"Weather";
    return temp?temp+" "+city:city;
  }
  function ramLabel(){
    var mem=performance&&performance.memory;
    if(!mem)return "RAM --";
    var used=mem.usedJSHeapSize/1048576;
    var limit=mem.jsHeapSizeLimit/1048576;
    if(!isFinite(used)||!isFinite(limit)||!limit)return "RAM --";
    return "RAM "+Math.round(used)+" MB";
  }
  function cpuLabel(){
    var percent=clamp(Math.round(4+metrics.lag*1.8),4,92);
    return "CPU "+percent+"%";
  }
  function refresh(){
    build();
    var now=new Date();
    var time=now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    setValue("time",esc(time),t("Heure systeme","System time"));
    var online=navigator.onLine!==false;
    setValue("connection",'<span class="esb-dot '+(online?"":"offline")+'"></span>'+esc(online?t("En ligne","Online"):t("Hors ligne","Offline")),online?t("Connexion active","Connection active"):t("Connexion indisponible","Connection unavailable"));
    setValue("sync",'<span class="esb-dot '+(online?"":"warn")+'"></span>'+esc(online?t("Synchronise","Synced"):t("Local","Local")),t("Etat de synchronisation","Sync status"));
    var workspace=activeWorkspace();
    setValue("workspace",esc(workspace&&workspace.name?workspace.name:t("Espace personnel","Personal")),t("Workspace actif","Active workspace"));
    setValue("ai",'<span class="esb-dot"></span>'+esc(window.ETHONEAICore||window.ETHONEAIEverywhere?t("AI pret","AI Ready"):t("AI local","AI Local")),t("Ouvrir ETHONE AI","Open ETHONE AI"));
    var count=unreadNotifications();
    setValue("notifications",count?'<span class="esb-badge">'+(count>9?"9+":count)+'</span>':esc(t("Notifications","Notifications")),t("Centre de notifications","Notification Center"));
    var p=profile(),name=(p&&p.name)||"ETHONE";
    var initials=String(name).trim().split(/\s+/).map(function(x){return x[0]}).join("").slice(0,2).toUpperCase()||"E";
    setValue("profile",'<span class="esb-avatar">'+esc(initials)+'</span><span>'+esc(name)+'</span>',t("Profil","Profile"));
    setValue("cpu",esc(cpuLabel()),t("Indicateur de reactivite","Responsiveness indicator"));
    setValue("ram",esc(ramLabel()),t("Memoire JavaScript","JavaScript memory"));
    setValue("spotify",esc(spotifyLabel()),"Spotify");
    setValue("weather",esc(weatherLabel()),"Weather");
    applyConfig();
  }
  function activate(id){
    try{
      if(id==="notifications"){
        if(window.ETHONENotifications&&typeof window.ETHONENotifications.toggle==="function")window.ETHONENotifications.toggle();
        else if(typeof window.toggleNotifPanel==="function")window.toggleNotifPanel();
      }else if(id==="profile"){
        if(typeof window.goToProfileScreen==="function")window.goToProfileScreen();
      }else if(id==="ai"){
        if(window.ETHONEAIEverywhere&&typeof window.ETHONEAIEverywhere.openCopilot==="function")window.ETHONEAIEverywhere.openCopilot();
        else if(window.ETHONEBrainOS&&typeof window.ETHONEBrainOS.open==="function")window.ETHONEBrainOS.open();
        else if(typeof window.switchPage==="function")window.switchPage("ai");
      }else if(id==="workspace"){
        var ws=$("#workspace-switcher,[data-action='workspace-switcher'],.os-workspace-switcher");
        if(ws)ws.click();
      }else if(id==="spotify"||id==="weather"){
        if(typeof window.switchPage==="function")window.switchPage(id==="spotify"?"connections":"dashboard");
      }
    }catch(e){
      try{
        window.__ethoneStatusBarErrors=(window.__ethoneStatusBarErrors||[]).slice(-20);
        window.__ethoneStatusBarErrors.push({id:id,message:e&&e.message?e.message:String(e),at:new Date().toISOString()});
      }catch(_){}
    }
  }
  function startTimers(){
    timers.forEach(clearInterval);timers=[];
    timers.push(setInterval(function(){
      var now=performance.now();
      metrics.lag=Math.max(0,now-metrics.lastTick-2000);
      metrics.lastTick=now;
      refresh();
    },2000));
    timers.push(setInterval(updateVisibility,2500));
  }
  function init(){
    build();
    applyConfig();
    updateVisibility();
    startTimers();
    setTimeout(refresh,80);
    renderIcons();
    setTimeout(renderIcons,500);
  }

  window.ETHONEStatusBar={
    refresh:refresh,
    config:function(){return JSON.parse(JSON.stringify(config))},
    setCollapsed:setCollapsed,
    toggleItem:function(id,value){config.items[id]=value==null?!(config.items[id]!==false):!!value;writeConfig();renderMenu();applyConfig();refresh();renderIcons()}
  };

  if(window.ethoneRunWhenDashboardReady)window.ethoneRunWhenDashboardReady("status-bar",function(){setTimeout(init,420)});
  else if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
