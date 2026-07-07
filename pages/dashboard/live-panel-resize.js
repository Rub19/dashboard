/* ETHONE — Live widgets panel: resize + retract.
   Mirrors pages/dashboard/resizable-sidebar.js: single source of truth is the
   --live-panel-w CSS var, RAF-throttled drag, localStorage persistence.
   The panel is on the RIGHT edge, so the resize handle sits at
   right:var(--live-panel-w) and dragging LEFT (decreasing clientX) widens it —
   the mirror image of the sidebar's left:var(--sidebar-w) / drag-right-to-widen. */
(function(){
  const handle = document.getElementById('live-panel-resize-handle');
  const panel = document.getElementById('live-panel');
  const shell = document.getElementById('app-shell');
  const root = document.documentElement;
  if(!handle||!panel||!shell) return;

  const DEFAULT_W = 280, MIN_W = 240, MAX_W = 380;

  function applyWidth(w){
    root.style.setProperty('--live-panel-w', w+'px');
  }

  const savedW = parseInt(localStorage.getItem('lp_width')||String(DEFAULT_W));
  applyWidth(Math.min(Math.max(savedW, MIN_W), MAX_W));

  const wasRetracted = localStorage.getItem('lp_retracted') === '1';
  if(wasRetracted) shell.classList.add('live-panel-retracted');

  let dragging = false, startX = 0, startW = 0, pendingW = null, raf = null;

  function flush(){
    raf = null;
    if(pendingW==null) return;
    applyWidth(pendingW);
  }

  handle.addEventListener('mousedown', e=>{
    if(shell.classList.contains('live-panel-retracted')) return;
    dragging = true;
    startX = e.clientX;
    startW = panel.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e=>{
    if(!dragging) return;
    pendingW = Math.min(Math.max(startW + (startX - e.clientX), MIN_W), MAX_W);
    if(raf==null) raf = requestAnimationFrame(flush);
  });

  document.addEventListener('mouseup', ()=>{
    if(!dragging) return;
    dragging = false;
    if(raf!=null){ cancelAnimationFrame(raf); raf=null; }
    if(pendingW!=null){ applyWidth(pendingW); pendingW=null; }
    handle.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    localStorage.setItem('lp_width', panel.offsetWidth);
  });

  handle.addEventListener('dblclick', e=>{
    e.preventDefault();
    panel.style.transition = 'width .22s cubic-bezier(.22,1,.36,1)';
    applyWidth(DEFAULT_W);
    localStorage.setItem('lp_width', DEFAULT_W);
    setTimeout(()=>{ panel.style.transition = ''; }, 260);
  });

  const MOBILE_BREAKPOINT = 1200;
  const overlay = document.getElementById('live-panel-mobile-overlay');

  window.toggleLivePanel = function(force){
    const isMobileRange = window.innerWidth <= MOBILE_BREAKPOINT;
    if(isMobileRange){
      const open = typeof force === 'boolean' ? force : !panel.classList.contains('mobile-open');
      panel.classList.toggle('mobile-open', open);
      if(overlay) overlay.classList.toggle('mobile-open', open);
      return;
    }
    const retracted = typeof force === 'boolean' ? !force : !shell.classList.contains('live-panel-retracted');
    shell.classList.toggle('live-panel-retracted', retracted);
    localStorage.setItem('lp_retracted', retracted ? '1' : '0');
    const btn = document.getElementById('live-panel-retract-btn');
    if(btn) btn.textContent = retracted ? '‹' : '›';
  };

  // Crossing the breakpoint while the panel is open/closed shouldn't leave it
  // in a visually broken state (e.g. mobile-open class stuck on at desktop
  // width, or grid-retracted with no way to reach it once back on mobile).
  window.addEventListener('resize', ()=>{
    const isMobileRange = window.innerWidth <= MOBILE_BREAKPOINT;
    if(!isMobileRange){
      panel.classList.remove('mobile-open');
      if(overlay) overlay.classList.remove('mobile-open');
    }
  });

  // Temporary stubs — replaced by pages/dashboard/sidebar-widget-manager.js (Phase 3).
  if(typeof window.openLivePanelAddPicker !== 'function') window.openLivePanelAddPicker = function(){};
  if(typeof window.openLivePanelManager !== 'function') window.openLivePanelManager = function(){};

  window.ethoneLivePanelResize = {
    DEFAULT_W, MIN_W, MAX_W,
    setWidth(w){
      w = Math.min(Math.max(w, MIN_W), MAX_W);
      applyWidth(w);
      localStorage.setItem('lp_width', w);
    },
    currentWidth(){
      return parseInt(localStorage.getItem('lp_width')||String(DEFAULT_W));
    },
    isRetracted(){ return shell.classList.contains('live-panel-retracted'); }
  };
})();
