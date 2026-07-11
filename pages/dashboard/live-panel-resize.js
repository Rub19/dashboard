/* ETHONE - Live widgets panel: open, rail, close, resize and persistence. */
(function(){
  "use strict";
  if(window.__ethoneLivePanelResizeReady)return;
  window.__ethoneLivePanelResizeReady=true;

  var handle=document.getElementById("live-panel-resize-handle");
  var panel=document.getElementById("live-panel");
  var shell=document.getElementById("app-shell");
  var overlay=document.getElementById("live-panel-mobile-overlay");
  var body=document.getElementById("live-panel-body");
  var root=document.documentElement;
  var MOBILE_BREAKPOINT=1200;
  var DEFAULT_W=320;
  var MIN_W=268;
  var MAX_W=560;
  var RAIL_W=48;
  var MODE_KEY="ethone:widgets-panel-mode";
  var OPEN_KEY="ethone:widgets-panel-open";
  var WIDTH_KEY="ethone:live-panel-width";
  if(!handle||!panel||!shell)return;

  function read(key,fallback){
    try{
      var value=localStorage.getItem(key);
      return value==null?fallback:value;
    }catch(e){return fallback}
  }
  function write(key,value){
    try{localStorage.setItem(key,String(value))}catch(e){}
  }
  function remove(key){
    try{localStorage.removeItem(key)}catch(e){}
  }
  function clampWidth(value){
    var viewport=Math.max(320,window.innerWidth||DEFAULT_W);
    var max=Math.min(MAX_W,Math.max(MIN_W,Math.round(viewport*.46)));
    var min=Math.min(MIN_W,max);
    value=parseInt(value,10);
    if(!Number.isFinite(value))value=DEFAULT_W;
    return Math.min(Math.max(value,min),max);
  }
  function applyWidth(value){
    var width=clampWidth(value);
    root.style.setProperty("--live-panel-w",width+"px");
    root.style.setProperty("--live-panel-min-w",MIN_W+"px");
    root.style.setProperty("--live-panel-max-w",Math.min(MAX_W,Math.max(MIN_W,Math.round((window.innerWidth||1440)*.46)))+"px");
    root.style.setProperty("--live-panel-rail-w",RAIL_W+"px");
    return width;
  }
  function currentMode(){
    if(document.body.classList.contains("ethone-widgets-panel-rail"))return "rail";
    if(document.body.classList.contains("ethone-widgets-panel-enabled"))return "open";
    return "closed";
  }
  function stableBoot(){
    try{
      return !!(
        window.__ethoneDisableExperimentalBoot ||
        window.ETHONE_STABLE_BOOT ||
        window.ETHONE_LIGHT_BOOT_MODE ||
        document.documentElement.dataset.ethoneStableBoot==="1"
      );
    }catch(e){return !!(window.__ethoneDisableExperimentalBoot||window.ETHONE_STABLE_BOOT||window.ETHONE_LIGHT_BOOT_MODE)}
  }
  function canMountPanel(){
    if(document.documentElement.classList.contains("ethone-auth-mode")||document.body.classList.contains("ethone-auth-mode"))return false;
    if(stableBoot())return false;
    var requested=read(OPEN_KEY,"0")==="1"||read("ethone:widgets-panel-pinned","0")==="1"||read(MODE_KEY,"closed")!=="closed";
    if(window.ethoneCanMountUI){
      try{return requested||window.ethoneCanMountUI("widgets-panel")}catch(e){}
    }
    return requested;
  }
  function preferredInitialMode(){
    if(!canMountPanel())return "closed";
    var mode=read(MODE_KEY,"");
    if(mode==="open"||mode==="rail")return mode;
    if(read("lp_retracted","1")==="1")return "closed";
    return read(OPEN_KEY,"0")==="1"?"open":"closed";
  }
  function ensureControls(){
    handle.setAttribute("role","separator");
    handle.setAttribute("aria-label","Redimensionner le panneau Widgets");
    handle.setAttribute("aria-orientation","vertical");
    handle.setAttribute("aria-valuemin",String(MIN_W));
    handle.setAttribute("aria-valuemax",String(MAX_W));
    handle.setAttribute("tabindex","0");
    var actions=panel.querySelector(".live-panel-header-actions");
    var collapse=document.getElementById("live-panel-retract-btn");
    if(collapse){
      collapse.onclick=function(event){
        if(event)event.preventDefault();
        setMode(currentMode()==="rail"?"open":"rail");
        return false;
      };
    }
    if(actions&&!document.getElementById("live-panel-close-btn")){
      var close=document.createElement("button");
      close.className="live-panel-icon-btn";
      close.id="live-panel-close-btn";
      close.type="button";
      close.title="Fermer le panneau";
      close.setAttribute("aria-label","Fermer le panneau Widgets");
      close.textContent="x";
      close.onclick=function(event){
        event.preventDefault();
        setMode("closed");
      };
      actions.appendChild(close);
    }
  }
  function ensureEmptyState(){
    var empty=document.getElementById("live-panel-empty-placeholder");
    if(!empty||empty.dataset.ethoneEnhanced==="1")return;
    empty.dataset.ethoneEnhanced="1";
    empty.innerHTML=[
      '<div class="live-panel-empty-art" aria-hidden="true">',
      '<span></span><span></span><span></span><span></span>',
      '</div>',
      '<strong>Aucun widget actif</strong>',
      '<p>Ajoute tes widgets favoris pour garder Spotify, Discord, GitHub ou Brain visibles pendant que tu travailles.</p>',
      '<button type="button" class="live-panel-empty-btn" id="live-panel-empty-add">Ajouter un widget</button>'
    ].join("");
    var btn=document.getElementById("live-panel-empty-add");
    if(btn)btn.onclick=function(){if(typeof window.openLivePanelAddPicker==="function")window.openLivePanelAddPicker()};
  }
  function syncEmptyState(){
    ensureEmptyState();
    var empty=document.getElementById("live-panel-empty-placeholder");
    var list=document.getElementById("sb-live-list");
    if(!empty||!list)return;
    var visible=Array.prototype.some.call(list.children,function(el){
      var style=getComputedStyle(el);
      return style.display!=="none"&&style.visibility!=="hidden"&&el.getBoundingClientRect().height>8;
    });
    empty.hidden=visible;
  }
  function syncButtons(mode){
    var collapse=document.getElementById("live-panel-retract-btn");
    var toggle=document.getElementById("live-panel-toggle-btn");
    var close=document.getElementById("live-panel-close-btn");
    [collapse,toggle,close].forEach(function(btn){
      if(!btn)return;
      btn.setAttribute("aria-expanded",mode==="open"?"true":"false");
      btn.setAttribute("aria-pressed",mode!=="closed"?"true":"false");
    });
    if(collapse){
      collapse.textContent=mode==="rail"?"›":"–";
      collapse.title=mode==="rail"?"Ouvrir le panneau":"Reduire en barre";
      collapse.textContent=mode==="rail"?">":"-";
      collapse.setAttribute("aria-label",collapse.title);
    }
  }
  function setMode(mode,options){
    mode=mode==="open"||mode==="rail"||mode==="closed"?mode:"closed";
    if(window.innerWidth<=MOBILE_BREAKPOINT&&mode==="rail")mode="closed";
    if(mode!=="open"&&dragging)endDrag();
    var open=mode==="open";
    var rail=mode==="rail";
    if(mode!=="closed"&&document.body)document.body.classList.remove("ethone-emergency-minimal");
    document.body.classList.toggle("ethone-widgets-panel-enabled",mode!=="closed");
    document.body.classList.toggle("ethone-widgets-panel-rail",rail);
    shell.classList.toggle("live-panel-retracted",mode==="closed");
    shell.classList.toggle("live-panel-collapsed",rail);
    panel.classList.toggle("live-panel-rail",rail);
    panel.classList.toggle("mobile-open",open&&window.innerWidth<=MOBILE_BREAKPOINT);
    if(overlay){
      overlay.classList.toggle("mobile-open",open&&window.innerWidth<=MOBILE_BREAKPOINT);
      overlay.setAttribute("aria-hidden",open&&window.innerWidth<=MOBILE_BREAKPOINT?"false":"true");
    }
    panel.setAttribute("aria-hidden",mode==="closed"?"true":"false");
    panel.dataset.panelMode=mode;
    syncButtons(mode);
    write(MODE_KEY,mode);
    write(OPEN_KEY,mode==="closed"?"0":"1");
    write("lp_retracted",mode==="closed"?"1":"0");
    if(mode==="closed")remove("ethone:widgets-panel-last-open");
    else write("ethone:widgets-panel-last-open",Date.now());
    if(open&&typeof window.curP==="function"){
      setTimeout(function(){
        try{
          var profile=window.curP();
          if(typeof window.ethoneScheduleSidebarWidgetsInit==="function")window.ethoneScheduleSidebarWidgetsInit(profile,180);
          else if(typeof window.initSidebarWidgets==="function")window.initSidebarWidgets(profile);
          syncEmptyState();
        }catch(e){}
      },140);
    }else{
      syncEmptyState();
    }
    if(!options||options.notify!==false){
      try{window.dispatchEvent(new CustomEvent("ethone:widgets-panel-mode",{detail:{mode:mode}}))}catch(e){}
    }
  }

  ensureControls();
  ensureEmptyState();
  applyWidth(read(WIDTH_KEY,read("lp_width",DEFAULT_W)));
  setMode(preferredInitialMode(),{notify:false});

  var dragging=false;
  var startX=0;
  var startW=0;
  var pendingW=null;
  var raf=null;
  var pointerId=null;

  function flush(){
    raf=null;
    if(pendingW==null)return;
    applyWidth(pendingW);
    handle.setAttribute("aria-valuenow",String(clampWidth(pendingW)));
  }
  function scheduleWidth(value){
    pendingW=clampWidth(value);
    if(raf==null)raf=requestAnimationFrame(flush);
  }
  function beginDrag(event){
    if(currentMode()!=="open")return;
    if(event.button!=null&&event.button!==0)return;
    dragging=true;
    pointerId=event.pointerId;
    startX=event.clientX;
    startW=panel.getBoundingClientRect().width||clampWidth(read(WIDTH_KEY,DEFAULT_W));
    handle.classList.add("dragging");
    document.body.classList.add("ethone-live-panel-dragging");
    try{handle.setPointerCapture(pointerId)}catch(e){}
    event.preventDefault();
  }
  function moveDrag(event){
    if(!dragging)return;
    if(pointerId!=null&&event.pointerId!=null&&event.pointerId!==pointerId)return;
    scheduleWidth(startW+(startX-event.clientX));
    event.preventDefault();
  }
  function endDrag(event){
    if(!dragging)return;
    if(event&&pointerId!=null&&event.pointerId!=null&&event.pointerId!==pointerId)return;
    dragging=false;
    if(raf!=null){cancelAnimationFrame(raf);raf=null}
    if(pendingW!=null){applyWidth(pendingW);pendingW=null}
    handle.classList.remove("dragging");
    document.body.classList.remove("ethone-live-panel-dragging");
    var width=clampWidth(panel.getBoundingClientRect().width||read(WIDTH_KEY,DEFAULT_W));
    write(WIDTH_KEY,width);
    write("lp_width",width);
    handle.setAttribute("aria-valuenow",String(width));
    try{if(pointerId!=null)handle.releasePointerCapture(pointerId)}catch(e){}
    pointerId=null;
  }

  if(window.PointerEvent){
    handle.addEventListener("pointerdown",beginDrag);
    document.addEventListener("pointermove",moveDrag,{capture:true,passive:false});
    document.addEventListener("pointerup",endDrag,true);
    document.addEventListener("pointercancel",endDrag,true);
    handle.addEventListener("lostpointercapture",endDrag);
  }else{
    handle.addEventListener("mousedown",beginDrag);
    document.addEventListener("mousemove",moveDrag);
    document.addEventListener("mouseup",endDrag);
  }
  handle.setAttribute("aria-valuenow",String(clampWidth(read(WIDTH_KEY,DEFAULT_W))));
  handle.addEventListener("keydown",function(event){
    if(currentMode()!=="open")return;
    var current=clampWidth(panel.getBoundingClientRect().width||read(WIDTH_KEY,DEFAULT_W));
    var target=current;
    if(event.key==="ArrowLeft")target=current+(event.shiftKey?40:10);
    else if(event.key==="ArrowRight")target=current-(event.shiftKey?40:10);
    else if(event.key==="Home")target=MIN_W;
    else if(event.key==="End")target=MAX_W;
    else return;
    event.preventDefault();
    var width=applyWidth(target);
    write(WIDTH_KEY,width);
    write("lp_width",width);
    handle.setAttribute("aria-valuenow",String(width));
  });
  window.addEventListener("blur",endDrag);
  handle.addEventListener("dblclick",function(event){
    event.preventDefault();
    var width=applyWidth(DEFAULT_W);
    write(WIDTH_KEY,width);
    write("lp_width",width);
  });
  panel.addEventListener("click",function(event){
    if(currentMode()==="rail"&&!event.target.closest("button"))setMode("open");
  });
  if(overlay)overlay.addEventListener("click",function(){setMode("closed")});
  if(body&&!stableBoot()){
    try{new MutationObserver(syncEmptyState).observe(body,{childList:true,subtree:true,attributes:true,attributeFilter:["style","class","hidden"]})}catch(e){}
  }
  document.addEventListener("keydown",function(event){
    if(event.key==="Escape"&&dragging)endDrag();
    else if(event.key==="Escape"&&currentMode()!=="closed")setMode("closed");
  });
  window.addEventListener("resize",function(){
    var width=applyWidth(read(WIDTH_KEY,DEFAULT_W));
    write(WIDTH_KEY,width);
    if(window.innerWidth<=MOBILE_BREAKPOINT&&currentMode()==="rail")setMode("closed",{notify:false});
    else setMode(currentMode(),{notify:false});
  },{passive:true});

  window.toggleLivePanel=function(force){
    if(typeof force==="boolean")return setMode(force?"open":"closed");
    setMode(currentMode()==="closed"?"open":"closed");
  };
  window.collapseLivePanel=function(){setMode(currentMode()==="rail"?"open":"rail")};
  window.closeLivePanel=function(){setMode("closed")};
  if(typeof window.openLivePanelAddPicker!=="function"||window.openLivePanelAddPicker.__ethoneProxy){
    window.openLivePanelAddPicker=function ethoneFallbackOpenLivePanelAddPicker(){
      setMode("open");
      if(window.ETHONELazyModules&&typeof window.ETHONELazyModules.load==="function"){
        return Promise.resolve(window.ETHONELazyModules.load("widgets")).then(function(){
          if(typeof window.openLivePanelAddPicker==="function"&&window.openLivePanelAddPicker!==ethoneFallbackOpenLivePanelAddPicker)return window.openLivePanelAddPicker();
          if(typeof window.toast==="function")window.toast("Bibliotheque de widgets bientot disponible","info");
          return true;
        }).catch(function(){
          if(typeof window.toast==="function")window.toast("Impossible de charger les widgets pour le moment","warning");
          return false;
        });
      }
      if(typeof window.toast==="function")window.toast("Bibliotheque de widgets bientot disponible","info");
      return true;
    };
  }
  if(typeof window.openLivePanelManager!=="function"||window.openLivePanelManager.__ethoneProxy){
    window.openLivePanelManager=function ethoneFallbackOpenLivePanelManager(){
      setMode("open");
      if(window.ETHONELazyModules&&typeof window.ETHONELazyModules.load==="function"){
        return Promise.resolve(window.ETHONELazyModules.load("widgets")).then(function(){
          if(typeof window.openLivePanelManager==="function"&&window.openLivePanelManager!==ethoneFallbackOpenLivePanelManager)return window.openLivePanelManager();
          if(typeof window.toast==="function")window.toast("Gestion des widgets bientot disponible","info");
          return true;
        }).catch(function(){
          if(typeof window.toast==="function")window.toast("Impossible de charger les widgets pour le moment","warning");
          return false;
        });
      }
      if(typeof window.toast==="function")window.toast("Gestion des widgets bientot disponible","info");
      return true;
    };
  }

  window.ethoneLivePanelResize={
    DEFAULT_W:DEFAULT_W,
    MIN_W:MIN_W,
    MAX_W:MAX_W,
    RAIL_W:RAIL_W,
    setWidth:function(width){
      width=applyWidth(width);
      write(WIDTH_KEY,width);
      write("lp_width",width);
      handle.setAttribute("aria-valuenow",String(width));
      return width;
    },
    currentWidth:function(){return clampWidth(read(WIDTH_KEY,DEFAULT_W))},
    mode:currentMode,
    isRetracted:function(){return currentMode()==="closed"},
    open:function(){setMode("open")},
    collapse:function(){setMode("rail")},
    close:function(){setMode("closed")}
  };
})();
