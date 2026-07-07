/* ETHONE — Live panel: per-widget resize (height only — the panel is a
   single-column vertical list, unlike the 2D grid on the main dashboard).
   Mirrors the RAF-throttled drag pattern of resizable-sidebar.js /
   live-panel-resize.js. Persisted in curP().state.liveWidgets.sizes[id]. */
(function(){
  "use strict";
  const MIN_H = 50, MAX_H = 340;

  function persistSize(instanceId, h){
    if(typeof curP!=='function')return;
    const p=curP();if(!p)return;
    if(!p.state.liveWidgets)p.state.liveWidgets={};
    if(!p.state.liveWidgets.sizes)p.state.liveWidgets.sizes={};
    p.state.liveWidgets.sizes[instanceId]=h;
    if(typeof saveStateNow==='function')saveStateNow();
  }

  function ensureHandle(el, instanceId){
    if(el.querySelector(':scope > .lp-widget-resize-handle'))return;
    if(getComputedStyle(el).position==='static')el.style.position='relative';

    const handle=document.createElement('div');
    handle.className='lp-widget-resize-handle';
    handle.title='Redimensionner';
    el.appendChild(handle);

    let dragging=false, startY=0, startH=0, pendingH=null, raf=null;
    function flush(){
      raf=null;
      if(pendingH==null)return;
      el.style.height=pendingH+'px';
      el.style.minHeight=pendingH+'px';
    }
    handle.addEventListener('mousedown', e=>{
      dragging=true;
      startY=e.clientY;
      startH=el.offsetHeight;
      handle.classList.add('dragging');
      document.body.style.userSelect='none';
      document.body.style.cursor='row-resize';
      e.preventDefault();
      e.stopPropagation();
    });
    document.addEventListener('mousemove', e=>{
      if(!dragging)return;
      pendingH=Math.min(Math.max(startH+(e.clientY-startY), MIN_H), MAX_H);
      if(raf==null)raf=requestAnimationFrame(flush);
    });
    document.addEventListener('mouseup', ()=>{
      if(!dragging)return;
      dragging=false;
      if(raf!=null){cancelAnimationFrame(raf);raf=null;}
      if(pendingH!=null){
        el.style.height=pendingH+'px';
        el.style.minHeight=pendingH+'px';
        pendingH=null;
      }
      handle.classList.remove('dragging');
      document.body.style.userSelect='';
      document.body.style.cursor='';
      persistSize(instanceId, el.offsetHeight);
    });
    handle.addEventListener('dblclick', e=>{
      e.preventDefault();
      e.stopPropagation();
      el.style.height='';
      el.style.minHeight='';
      persistSize(instanceId, null);
    });
  }

  window.ensureLivePanelWidgetResizable=function(el, instanceId){
    if(!el||!instanceId)return;
    ensureHandle(el, instanceId);
    try{
      const prefs=typeof getWidgetPrefs==='function'?getWidgetPrefs():null;
      const saved=prefs&&prefs.sizes&&prefs.sizes[instanceId];
      if(saved){
        el.style.height=saved+'px';
        el.style.minHeight=saved+'px';
      }
    }catch(e){}
  };
})();
