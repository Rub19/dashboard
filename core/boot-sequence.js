/* ETHONE production boot sequence.
   Coordinates post-login UI layers so only the active shell mounts. */
(function(){
  "use strict";
  if(window.__ethoneBootSequence)return;
  window.__ethoneBootSequence=true;

  var COMPLETE_TIMER=0;
  var FINALIZE_TIMER=0;
  var state={mode:"classic",phase:"idle",startedAt:0,cycle:0,completedCycle:0};

  function read(key,fallback){
    try{var value=localStorage.getItem(key);return value==null?fallback:value}catch(e){return fallback}
  }
  function write(key,value){
    try{localStorage.setItem(key,value)}catch(e){}
  }
  function bool(key,defaultValue){
    var value=read(key,null);
    if(value==null)return !!defaultValue;
    return value==="1"||value==="true";
  }
  function profileState(){
    try{
      var p=typeof window.curP==="function"?window.curP():null;
      return p&&p.state?p.state:{};
    }catch(e){return {}}
  }
  function layoutMode(){
    var explicit=read("ethone:layout-mode","");
    var desktopEnabled=read("ethone:desktop-enabled","0")==="1";
    if(desktopEnabled||explicit==="desktop")return "desktop";
    if(explicit==="split")return "split";
    return "classic";
  }
  function canMount(layer){
    var stableBoot=false;
    try{stableBoot=!!(window.__ethoneDisableExperimentalBoot||document.documentElement.classList.contains("ethone-stable-boot")||document.documentElement.dataset.ethoneStableBoot==="1")}catch(e){stableBoot=!!window.__ethoneDisableExperimentalBoot}
    var desktopRequested=read("ethone:desktop-enabled","0")==="1"||read("ethone:layout-mode","")==="desktop";
    var pState=profileState();
    var widgetsRequested=bool("ethone:widgets-panel-open",false)||bool("ethone:widgets-panel-pinned",false)||pState.widgetsPanelPinned===true;
    if(stableBoot){
      if(layer==="desktop")return desktopRequested;
      // Stable boot prevents expensive layers from mounting automatically, but
      // an explicit Widgets-panel request must remain authoritative. Otherwise
      // BootSequence.sync() races the panel controller and closes it again.
      if(layer==="widgets-panel")return widgetsRequested;
      if(layer==="desktop"||layer==="split"||layer==="permanent-dock"||layer==="enterprise-dock"||layer==="side-panels"||layer==="native-shell"||layer==="status-bar"){
        return false;
      }
    }
    var mode=layoutMode();
    if(layer==="desktop")return mode==="desktop"&&read("ethone:desktop-enabled","0")==="1";
    if(layer==="split")return mode==="split";
    if(layer==="widgets-panel")return widgetsRequested;
    if(layer==="permanent-dock")return mode==="classic"&&(bool("ethone:permanent-dock-enabled",false)||pState.permanentDockEnabled===true);
    if(layer==="enterprise-dock")return mode==="classic"&&bool("ethone:enterprise-dock-enabled",false)&&!canMount("permanent-dock");
    if(layer==="side-panels")return mode!=="desktop";
    if(layer==="native-shell")return mode!=="desktop";
    if(layer==="status-bar")return bool("ethone:status-bar-enabled",true);
    return true;
  }
  function addStyle(){
    if(document.getElementById("ethone-boot-sequence-style"))return;
    var style=document.createElement("style");
    style.id="ethone-boot-sequence-style";
    style.textContent=[
      "body.ethone-dashboard-booting #eh-dock,body.ethone-dashboard-booting #ethone-permanent-dock,body.ethone-dashboard-booting #ethone-os2-dock,body.ethone-dashboard-booting #ethone-desktop{opacity:0!important;pointer-events:none!important}",
      "body.ethone-layout-classic:not(.ethone-enterprise-dock-enabled) #eh-dock{display:none!important}",
      "body.ethone-layout-classic:not(.ethone-permanent-dock-enabled) #ethone-permanent-dock{display:none!important}",
      "body.ethone-layout-classic #ethone-os2-dock{display:none!important}",
      "body.ethone-layout-classic #ethone-desktop{display:none!important}",
      "body.ethone-layout-desktop #main-sidebar,body.ethone-layout-desktop #eh-dock,body.ethone-layout-desktop #ethone-permanent-dock,body.ethone-layout-desktop #ethone-os2-dock,body.ethone-layout-desktop #ethone-side-panels,body.ethone-layout-desktop #ethone-native-shell{display:none!important}",
      "body.ethone-layout-desktop #main-content.main{margin-left:0!important;width:100%!important}",
      "body:not(.ethone-side-panels-enabled) #ethone-side-panels .side-panel-shell{opacity:0!important;pointer-events:none!important;transform:translateX(18px) scale(.985)!important}",
      "body:not(.ethone-statusbar-enabled) #ethone-status-bar{display:none!important}",
      "body:not(.ethone-widgets-panel-enabled) :where(#eh-personalize-overlay,.live-widgets-panel,.widgets-panel){pointer-events:none}",
      ".ethone-dashboard-boot-banner{position:fixed;left:50%;top:18px;z-index:2147483646;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:min(520px,calc(100vw - 32px));padding:10px 13px;border:1px solid rgba(167,139,250,.22);border-radius:999px;background:rgba(10,10,14,.86);box-shadow:0 18px 60px rgba(0,0,0,.34),0 0 30px rgba(139,92,246,.11);backdrop-filter:blur(16px);color:rgba(250,247,255,.82);font:700 12px/1 Inter,system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}",
      "body.ethone-dashboard-booting .ethone-dashboard-boot-banner{opacity:1;transform:translateX(-50%) translateY(0)}",
      ".ethone-dashboard-boot-banner span:first-child{width:9px;height:9px;border-radius:50%;background:#8b5cf6;box-shadow:0 0 18px rgba(139,92,246,.76)}"
    ].join("\n");
    document.head.appendChild(style);
  }
  function banner(text){
    var el=document.getElementById("ethone-dashboard-boot-banner");
    if(!el){
      el=document.createElement("div");
      el.id="ethone-dashboard-boot-banner";
      el.className="ethone-dashboard-boot-banner";
      el.setAttribute("role","status");
      el.setAttribute("aria-live","polite");
      el.innerHTML="<span></span><strong></strong>";
      document.body.appendChild(el);
    }
    el.setAttribute("aria-hidden","false");
    var label=el.querySelector("strong");
    if(label)label.textContent=text||"Preparing ETHONE";
  }
  function closeTransientUI(){
    var selectors=[
      "#eh-personalize-overlay",
      "#pdock-popover",
      "#pdock-manager",
      "#de-launchpad",
      "#command-palette",
      "#notifications-panel"
    ];
    selectors.forEach(function(sel){
      var el=document.querySelector(sel);
      if(!el)return;
      el.classList.remove("open","visible","active","is-open");
      if(sel==="#pdock-popover")el.innerHTML="";
    });
  }
  function applyClasses(){
    state.mode=layoutMode();
    addStyle();
    document.documentElement.dataset.ethoneLayoutMode=state.mode;
    document.body.classList.toggle("ethone-layout-classic",state.mode==="classic");
    document.body.classList.toggle("ethone-layout-desktop",state.mode==="desktop");
    document.body.classList.toggle("ethone-layout-split",state.mode==="split");
    document.body.classList.toggle("ethone-permanent-dock-enabled",canMount("permanent-dock"));
    document.body.classList.toggle("ethone-enterprise-dock-enabled",canMount("enterprise-dock"));
    document.body.classList.toggle("ethone-widgets-panel-enabled",canMount("widgets-panel"));
    document.body.classList.toggle("ethone-side-panels-enabled",canMount("side-panels"));
    document.body.classList.toggle("ethone-native-shell-enabled",canMount("native-shell"));
    document.body.classList.toggle("ethone-statusbar-enabled",canMount("status-bar"));
  }
  function syncChrome(options){
    options=options||{};
    applyClasses();
    // Normal runtime synchronization runs after many DOM mutations. Closing
    // transient UI here made command palettes and notification panels vanish
    // shortly after opening. Only an explicit shell transition may clear it.
    if(options.closeTransient===true)closeTransientUI();
    var ehDock=document.getElementById("eh-dock");
    if(ehDock)ehDock.setAttribute("aria-hidden",canMount("enterprise-dock")?"false":"true");
    var os2Dock=document.getElementById("ethone-os2-dock");
    if(os2Dock)os2Dock.setAttribute("aria-hidden","true");
    var sidePanels=document.getElementById("ethone-side-panels");
    if(sidePanels)sidePanels.setAttribute("aria-hidden",canMount("side-panels")?"false":"true");
    if(!canMount("side-panels")&&window.ETHONESidePanels&&typeof window.ETHONESidePanels.close==="function"){
      try{window.ETHONESidePanels.close(true)}catch(e){}
    }
    if(!canMount("desktop")){
      try{
        if(window.ETHONEDesktop&&document.body.classList.contains("ethone-desktop-mode")){
          window.ETHONEDesktop.disable();
        }
      }catch(e){}
      document.body.classList.remove("ethone-desktop-mode");
    }
  }
  function prepareDashboardMount(){
    state.phase="mounting";
    state.startedAt=Date.now();
    state.cycle+=1;
    banner("Preparing your ETHONE workspace");
    document.body.classList.add("ethone-dashboard-booting");
    syncChrome({closeTransient:true});
    clearTimeout(COMPLETE_TIMER);
    COMPLETE_TIMER=setTimeout(finishDashboardMount,950);
  }
  function finalizeDashboardMount(cycle){
    if(cycle!==state.cycle||state.completedCycle===cycle)return;
    state.completedCycle=cycle;
    clearTimeout(FINALIZE_TIMER);
    document.body.classList.remove("ethone-dashboard-booting");
    document.body.classList.add("ethone-dashboard-mounted");
    var bootBanner=document.getElementById("ethone-dashboard-boot-banner");
    if(bootBanner)bootBanner.setAttribute("aria-hidden","true");
    if(canMount("desktop")&&window.ETHONEDesktop&&typeof window.ETHONEDesktop.enable==="function"){
      setTimeout(function(){try{window.ETHONEDesktop.enable()}catch(e){}},80);
    }
    try{window.dispatchEvent(new CustomEvent("ethone:boot-sequence-complete",{detail:{mode:state.mode,duration:Date.now()-state.startedAt}}))}catch(e){}
  }
  function finishDashboardMount(){
    clearTimeout(COMPLETE_TIMER);
    syncChrome();
    state.phase="ready";
    var cycle=state.cycle;
    clearTimeout(FINALIZE_TIMER);
    FINALIZE_TIMER=setTimeout(function(){finalizeDashboardMount(cycle)},120);
    requestAnimationFrame(function(){
      setTimeout(function(){finalizeDashboardMount(cycle)},40);
    });
  }
  function setMode(mode){
    mode=mode==="desktop"||mode==="split"?mode:"classic";
    write("ethone:layout-mode",mode);
    if(mode!=="desktop")write("ethone:desktop-enabled","0");
    applyClasses();
    syncChrome({closeTransient:true});
    return state.mode;
  }

  window.ETHONEBootSequence={
    state:function(){return {mode:layoutMode(),phase:state.phase,startedAt:state.startedAt}},
    layoutMode:layoutMode,
    canMount:canMount,
    prepareDashboardMount:prepareDashboardMount,
    finishDashboardMount:finishDashboardMount,
    sync:syncChrome,
    setMode:setMode
  };
  window.ethoneCanMountUI=canMount;
  window.ethoneGetLayoutMode=layoutMode;

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",applyClasses,{once:true});
  else applyClasses();
})();
