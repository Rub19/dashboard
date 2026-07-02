/* ETHONE legacy compatibility module: resizable-sidebar. */
//  RESIZABLE SIDEBAR
// ===================================================
(function(){
  const handle = document.getElementById('resize-handle');
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main');
  if(!handle||!sidebar||!main) return;

  const DEFAULT_W = 240, MIN_W = 160, MAX_W = 400;

  function applyWidth(w){
    sidebar.style.setProperty('width', w+'px', 'important');
    sidebar.style.setProperty('min-width', w+'px', 'important');
    main.style.marginLeft = w+'px';
    handle.style.left = w+'px';
    const availW = w - 24;
    const scale = Math.min(availW / 310, 0.95);
    const iframe = document.getElementById('nowplaying-iframe');
    if(iframe){
      iframe.style.transform = 'translateX(-50%) scale('+scale.toFixed(3)+')';
      const wrap = document.getElementById('nowplaying-iframe-wrap');
      if(wrap) wrap.style.height = Math.round(68*scale)+'px';
    }
  }

  // Restore saved width
  const savedW = parseInt(localStorage.getItem('sb_width')||String(DEFAULT_W));
  applyWidth(Math.min(Math.max(savedW, MIN_W), MAX_W));

  let dragging = false, startX = 0, startW = 0, pendingW = null, raf = null;

  function flush(){
    raf = null;
    if(pendingW==null) return;
    applyWidth(pendingW);
  }

  handle.addEventListener('mousedown', e=>{
    dragging = true;
    startX = e.clientX;
    startW = sidebar.offsetWidth;
    handle.classList.add('dragging');
    sidebar.classList.add('sb-resizing');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e=>{
    if(!dragging) return;
    pendingW = Math.min(Math.max(startW + (e.clientX - startX), MIN_W), MAX_W);
    if(raf==null) raf = requestAnimationFrame(flush);
  });

  document.addEventListener('mouseup', ()=>{
    if(!dragging) return;
    dragging = false;
    if(raf!=null){ cancelAnimationFrame(raf); raf=null; }
    if(pendingW!=null){ applyWidth(pendingW); pendingW=null; }
    handle.classList.remove('dragging');
    sidebar.classList.remove('sb-resizing');
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    localStorage.setItem('sb_width', sidebar.offsetWidth);
  });

  handle.addEventListener('dblclick', e=>{
    e.preventDefault();
    sidebar.classList.add('sb-resize-reset');
    applyWidth(DEFAULT_W);
    localStorage.setItem('sb_width', DEFAULT_W);
    setTimeout(()=>sidebar.classList.remove('sb-resize-reset'), 260);
  });

  // Compact mode uses a different fixed width (58px) driven by CSS; our own
  // inline !important width would otherwise outrank it. Yield while compact,
  // reclaim the saved width when expanded again.
  window.ethoneSidebarResize={
    suspendForCompact(){
      sidebar.style.removeProperty('width');
      sidebar.style.removeProperty('min-width');
      handle.style.display='none';
    },
    resumeFromCompact(){
      handle.style.display='';
      const w=parseInt(localStorage.getItem('sb_width')||String(DEFAULT_W));
      applyWidth(Math.min(Math.max(w,MIN_W),MAX_W));
    }
  };
})();


// ===================================================
