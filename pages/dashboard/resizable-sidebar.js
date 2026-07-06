/* ETHONE legacy compatibility module: resizable-sidebar. */
//  RESIZABLE SIDEBAR — single source of truth: the --sidebar-w CSS var.
//  The grid app-shell reads it for the column track, the resize handle
//  reads it for its own position (left:var(--sidebar-w)) — nothing else
//  needs manual JS syncing anymore.
// ===================================================
(function(){
  const handle = document.getElementById('resize-handle');
  const sidebar = document.querySelector('.sidebar');
  const root = document.documentElement;
  if(!handle||!sidebar) return;

  const DEFAULT_W = 240, MIN_W = 220, MAX_W = 320, COMPACT_W = 72;

  function applyWidth(w){
    root.style.setProperty('--sidebar-w', w+'px');
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

  // Compact mode pins the width to COMPACT_W; expanding restores the last
  // saved width. Both just flip the same CSS var — no per-element sync.
  window.ethoneSidebarResize={
    COMPACT_W, DEFAULT_W, MIN_W, MAX_W,
    suspendForCompact(){
      root.style.setProperty('--sidebar-w', COMPACT_W+'px');
      handle.style.display='none';
    },
    resumeFromCompact(){
      handle.style.display='';
      const w=parseInt(localStorage.getItem('sb_width')||String(DEFAULT_W));
      applyWidth(Math.min(Math.max(w,MIN_W),MAX_W));
    },
    // Driven by the Theme Editor's width slider — same persistence as manual drag.
    setWidth(w){
      w=Math.min(Math.max(w,MIN_W),MAX_W);
      applyWidth(w);
      localStorage.setItem('sb_width', w);
    },
    currentWidth(){
      return parseInt(localStorage.getItem('sb_width')||String(DEFAULT_W));
    }
  };
})();


// ===================================================
