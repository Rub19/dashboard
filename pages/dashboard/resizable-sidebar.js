/* ETHONE Sidebar Root Fix.
   Single source of truth for sidebar sizing: --sidebar-w on <html>. */
(function(){
  "use strict";
  if(window.__ethoneSidebarResizeReady)return;
  window.__ethoneSidebarResizeReady=true;

  var handle=document.getElementById("resize-handle");
  var sidebar=document.getElementById("main-sidebar");
  var root=document.documentElement;
  if(!handle||!sidebar)return;

  var DEFAULT_W=260;
  var MIN_W=236;
  var MAX_W=336;
  var COMPACT_W=76;
  var WIDTH_KEY="sb_width";
  var COMPACT_KEY="ethone:sidebar:compact";

  function clamp(value){
    value=parseInt(value,10);
    if(!Number.isFinite(value))value=DEFAULT_W;
    return Math.min(Math.max(value,MIN_W),MAX_W);
  }

  function readWidth(){
    try{return clamp(localStorage.getItem(WIDTH_KEY)||DEFAULT_W)}catch(e){return DEFAULT_W}
  }

  function persistWidth(width){
    try{localStorage.setItem(WIDTH_KEY,String(clamp(width)))}catch(e){}
  }

  function applyWidth(width){
    width=clamp(width);
    root.style.setProperty("--sidebar-w",width+"px");
    sidebar.style.removeProperty("width");
    sidebar.style.removeProperty("min-width");
    sidebar.style.removeProperty("max-width");
    if(typeof window.ethoneUpdateSidebarScrollFade==="function")window.ethoneUpdateSidebarScrollFade();
    return width;
  }

  function isCompact(){
    return sidebar.classList.contains("compact");
  }

  function setCompact(compact){
    compact=!!compact;
    sidebar.classList.toggle("compact",compact);
    try{localStorage.setItem(COMPACT_KEY,compact?"1":"0")}catch(e){}
    if(compact){
      root.style.setProperty("--sidebar-w",COMPACT_W+"px");
      handle.hidden=true;
      handle.style.display="none";
      sidebar.setAttribute("aria-label","Navigation compacte");
    }else{
      handle.hidden=false;
      handle.style.display="";
      applyWidth(readWidth());
      sidebar.setAttribute("aria-label","Navigation principale");
    }
    if(typeof window.ethoneUpdateSidebarScrollFade==="function")setTimeout(window.ethoneUpdateSidebarScrollFade,80);
  }

  applyWidth(readWidth());
  try{
    if(localStorage.getItem(COMPACT_KEY)==="1")setCompact(true);
  }catch(e){}

  var dragging=false;
  var startX=0;
  var startW=0;
  var pendingW=null;
  var raf=0;
  var pointerId=null;

  function flush(){
    raf=0;
    if(pendingW==null)return;
    applyWidth(pendingW);
  }

  function schedule(width){
    pendingW=clamp(width);
    if(!raf)raf=requestAnimationFrame(flush);
  }

  function start(event){
    if(isCompact())return;
    dragging=true;
    pointerId=event.pointerId;
    startX=event.clientX;
    startW=sidebar.getBoundingClientRect().width||readWidth();
    handle.classList.add("dragging");
    sidebar.classList.add("sb-resizing");
    document.body.classList.add("ethone-sidebar-resizing");
    try{handle.setPointerCapture(pointerId)}catch(e){}
    event.preventDefault();
  }

  function move(event){
    if(!dragging)return;
    schedule(startW+(event.clientX-startX));
  }

  function end(){
    if(!dragging)return;
    dragging=false;
    if(raf){cancelAnimationFrame(raf);raf=0}
    if(pendingW!=null){applyWidth(pendingW);pendingW=null}
    handle.classList.remove("dragging");
    sidebar.classList.remove("sb-resizing");
    document.body.classList.remove("ethone-sidebar-resizing");
    persistWidth(sidebar.getBoundingClientRect().width||readWidth());
    try{if(pointerId!=null)handle.releasePointerCapture(pointerId)}catch(e){}
    pointerId=null;
  }

  if(window.PointerEvent){
    handle.addEventListener("pointerdown",start);
    handle.addEventListener("pointermove",move);
    handle.addEventListener("pointerup",end);
    handle.addEventListener("pointercancel",end);
  }else{
    handle.addEventListener("mousedown",start);
    document.addEventListener("mousemove",move);
    document.addEventListener("mouseup",end);
  }

  handle.addEventListener("dblclick",function(event){
    event.preventDefault();
    var width=applyWidth(DEFAULT_W);
    persistWidth(width);
  });

  window.ethoneSidebarResize={
    COMPACT_W:COMPACT_W,
    DEFAULT_W:DEFAULT_W,
    MIN_W:MIN_W,
    MAX_W:MAX_W,
    suspendForCompact:function(){setCompact(true)},
    resumeFromCompact:function(){setCompact(false)},
    setCompact:setCompact,
    setWidth:function(width){
      setCompact(false);
      width=applyWidth(width);
      persistWidth(width);
      return width;
    },
    currentWidth:function(){return isCompact()?COMPACT_W:readWidth()},
    isCompact:isCompact
  };
})();
