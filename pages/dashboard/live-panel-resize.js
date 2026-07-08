/* ETHONE - Live widgets panel resize, reveal and persistence.
   Boot stays light: this module is loaded only when the widgets panel is
   requested or pinned. Keep all interactions local, guarded and cleanup-safe. */
(function(){
  "use strict";
  if(window.__ethoneLivePanelResizeReady)return;
  window.__ethoneLivePanelResizeReady=true;

  var handle=document.getElementById("live-panel-resize-handle");
  var panel=document.getElementById("live-panel");
  var shell=document.getElementById("app-shell");
  var overlay=document.getElementById("live-panel-mobile-overlay");
  var root=document.documentElement;
  var MOBILE_BREAKPOINT=1200;
  var DEFAULT_W=300;
  var MIN_W=248;
  var MAX_W=440;
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
  function clampWidth(value){
    var viewport=Math.max(320,window.innerWidth||DEFAULT_W);
    var max=Math.min(MAX_W,Math.max(MIN_W,Math.round(viewport*.42)));
    var min=Math.min(MIN_W,max);
    value=parseInt(value,10);
    if(!Number.isFinite(value))value=DEFAULT_W;
    return Math.min(Math.max(value,min),max);
  }
  function applyWidth(value){
    var width=clampWidth(value);
    root.style.setProperty("--live-panel-w",width+"px");
    root.style.setProperty("--live-panel-max-w",Math.min(MAX_W,Math.max(MIN_W,Math.round((window.innerWidth||1440)*.42)))+"px");
    return width;
  }
  function canMountPanel(){
    if(window.ethoneCanMountUI){
      try{
        var requested=read("ethone:widgets-panel-open","0")==="1"||read("ethone:widgets-panel-pinned","0")==="1";
        return requested||window.ethoneCanMountUI("widgets-panel");
      }catch(e){}
    }
    return read("ethone:widgets-panel-open","0")==="1"||read("ethone:widgets-panel-pinned","0")==="1";
  }
  function setButtons(open){
    var retract=document.getElementById("live-panel-retract-btn");
    var toggle=document.getElementById("live-panel-toggle-btn");
    [retract,toggle].forEach(function(btn){
      if(!btn)return;
      btn.setAttribute("aria-expanded",open?"true":"false");
      btn.setAttribute("aria-pressed",open?"true":"false");
    });
    if(retract){
      retract.textContent=open?"\u203a":"\u2039";
      retract.title=open?"Masquer le panneau":"Afficher le panneau";
      retract.setAttribute("aria-label",retract.title);
    }
  }
  function syncPanelState(open){
    open=!!open;
    document.body.classList.toggle("ethone-widgets-panel-enabled",open);
    panel.setAttribute("aria-hidden",open?"false":"true");
    if(overlay)overlay.setAttribute("aria-hidden",open?"false":"true");
    setButtons(open);
  }
  function setOpen(open){
    open=!!open;
    if(open&&document.body)document.body.classList.remove("ethone-emergency-minimal");
    if(window.innerWidth<=MOBILE_BREAKPOINT){
      panel.classList.toggle("mobile-open",open);
      if(overlay)overlay.classList.toggle("mobile-open",open);
      shell.classList.add("live-panel-retracted");
    }else{
      panel.classList.remove("mobile-open");
      if(overlay)overlay.classList.remove("mobile-open");
      shell.classList.toggle("live-panel-retracted",!open);
    }
    write("ethone:widgets-panel-open",open?"1":"0");
    write("lp_retracted",open?"0":"1");
    syncPanelState(open);
    if(open&&typeof window.initSidebarWidgets==="function"&&typeof window.curP==="function"){
      setTimeout(function(){
        try{window.initSidebarWidgets(window.curP())}catch(e){}
      },40);
    }
  }

  applyWidth(read("lp_width",read("ethone:live-panel-width",DEFAULT_W)));
  setOpen(canMountPanel()&&read("lp_retracted","1")!=="1");

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
  }
  function scheduleWidth(value){
    pendingW=clampWidth(value);
    if(raf==null)raf=requestAnimationFrame(flush);
  }
  function beginDrag(event){
    if(shell.classList.contains("live-panel-retracted"))return;
    dragging=true;
    pointerId=event.pointerId;
    startX=event.clientX;
    startW=panel.getBoundingClientRect().width||clampWidth(read("lp_width",DEFAULT_W));
    handle.classList.add("dragging");
    document.body.classList.add("ethone-live-panel-dragging");
    try{handle.setPointerCapture(pointerId)}catch(e){}
    event.preventDefault();
  }
  function moveDrag(event){
    if(!dragging)return;
    scheduleWidth(startW+(startX-event.clientX));
  }
  function endDrag(){
    if(!dragging)return;
    dragging=false;
    if(raf!=null){cancelAnimationFrame(raf);raf=null}
    if(pendingW!=null){applyWidth(pendingW);pendingW=null}
    handle.classList.remove("dragging");
    document.body.classList.remove("ethone-live-panel-dragging");
    var width=clampWidth(panel.getBoundingClientRect().width||read("lp_width",DEFAULT_W));
    write("lp_width",width);
    write("ethone:live-panel-width",width);
    try{if(pointerId!=null)handle.releasePointerCapture(pointerId)}catch(e){}
    pointerId=null;
  }

  if(window.PointerEvent){
    handle.addEventListener("pointerdown",beginDrag);
    handle.addEventListener("pointermove",moveDrag);
    handle.addEventListener("pointerup",endDrag);
    handle.addEventListener("pointercancel",endDrag);
  }else{
    handle.addEventListener("mousedown",beginDrag);
    document.addEventListener("mousemove",moveDrag);
    document.addEventListener("mouseup",endDrag);
  }
  handle.addEventListener("dblclick",function(event){
    event.preventDefault();
    var width=applyWidth(DEFAULT_W);
    write("lp_width",width);
    write("ethone:live-panel-width",width);
  });
  if(overlay){
    overlay.addEventListener("click",function(){setOpen(false)});
  }
  document.addEventListener("keydown",function(event){
    if(event.key==="Escape"&&panel.classList.contains("mobile-open"))setOpen(false);
  });
  window.addEventListener("resize",function(){
    var width=applyWidth(read("lp_width",DEFAULT_W));
    write("lp_width",width);
    if(window.innerWidth>MOBILE_BREAKPOINT){
      panel.classList.remove("mobile-open");
      if(overlay)overlay.classList.remove("mobile-open");
      shell.classList.toggle("live-panel-retracted",read("ethone:widgets-panel-open","0")!=="1");
      syncPanelState(read("ethone:widgets-panel-open","0")==="1");
    }
  },{passive:true});

  window.toggleLivePanel=function(force){
    var open;
    if(typeof force==="boolean")open=force;
    else open=window.innerWidth<=MOBILE_BREAKPOINT?!panel.classList.contains("mobile-open"):shell.classList.contains("live-panel-retracted");
    setOpen(open);
  };
  if(typeof window.openLivePanelAddPicker!=="function"||window.openLivePanelAddPicker.__ethoneProxy){
    window.openLivePanelAddPicker=function(){
      setOpen(true);
      if(typeof window.toast==="function")window.toast("Bibliotheque de widgets bientot disponible","info");
      return true;
    };
  }
  if(typeof window.openLivePanelManager!=="function"||window.openLivePanelManager.__ethoneProxy){
    window.openLivePanelManager=function(){
      setOpen(true);
      if(typeof window.toast==="function")window.toast("Gestion des widgets bientot disponible","info");
      return true;
    };
  }

  window.ethoneLivePanelResize={
    DEFAULT_W:DEFAULT_W,
    MIN_W:MIN_W,
    MAX_W:MAX_W,
    setWidth:function(width){
      width=applyWidth(width);
      write("lp_width",width);
      write("ethone:live-panel-width",width);
      return width;
    },
    currentWidth:function(){return clampWidth(read("lp_width",DEFAULT_W))},
    isRetracted:function(){return shell.classList.contains("live-panel-retracted")},
    open:function(){setOpen(true)},
    close:function(){setOpen(false)}
  };
})();
