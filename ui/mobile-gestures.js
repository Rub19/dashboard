/* ETHONE legacy compatibility module: mobile-gestures. */
//  MOBILE — Gestures + Touch Enhancements
// ══════════════════════════════════════════════════════════════
(function(){
  // Only run on touch devices
  if(!('ontouchstart' in window)) return;

  let touchStartX=0, touchStartY=0, touchStartTime=0;
  let swipeTarget=null, isSwiping=false;

  // ── SWIPE TO OPEN SIDEBAR ───────────────────────────────────
  document.addEventListener('touchstart', e=>{
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    isSwiping = false;
    // Only track swipe from left edge (first 30px)
    swipeTarget = touchStartX < 30 ? 'open' : null;
    // Track swipe from sidebar to close
    const sidebar = document.getElementById('main-sidebar');
    if(sidebar?.classList.contains('mobile-open')){
      swipeTarget = 'close';
    }
  }, {passive:true});

  document.addEventListener('touchmove', e=>{
    if(!swipeTarget) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if(!isSwiping && Math.abs(dy) > Math.abs(dx)) { swipeTarget=null; return; }
    isSwiping = true;
    const sidebar = document.getElementById('main-sidebar');
    if(!sidebar) return;
    if(swipeTarget==='open' && dx > 0){
      const pct = Math.min(dx/280, 1);
      sidebar.style.transform = `translateX(${-100 + pct*100}%)`;
      sidebar.style.transition = 'none';
      const overlay = document.querySelector('.sidebar-overlay');
      if(overlay){overlay.style.display='block';overlay.style.opacity=pct*0.5;}
    } else if(swipeTarget==='close' && dx < 0){
      const pct = Math.max(0, 1 + dx/280);
      sidebar.style.transform = `translateX(${-(1-pct)*100}%)`;
      sidebar.style.transition = 'none';
      const overlay = document.querySelector('.sidebar-overlay');
      if(overlay) overlay.style.opacity = pct*0.5;
    }
  }, {passive:true});

  document.addEventListener('touchend', e=>{
    if(!swipeTarget || !isSwiping) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dt = Date.now() - touchStartTime;
    const isFlick = Math.abs(dx) > 30 && dt < 300;
    const sidebar = document.getElementById('main-sidebar');
    if(!sidebar) return;
    sidebar.style.transition = '';
    sidebar.style.transform = '';
    const overlay = document.querySelector('.sidebar-overlay');
    if(overlay){overlay.style.opacity='';overlay.style.display='';}

    if(swipeTarget==='open' && (dx > 80 || isFlick)){
      sidebar.classList.add('mobile-open');
      if(overlay)overlay.classList.add('mobile-open');
    } else if(swipeTarget==='close' && (dx < -60 || isFlick)){
      sidebar.classList.remove('mobile-open');
      if(overlay)overlay.classList.remove('mobile-open');
    } else {
      // Snap back
      if(sidebar.classList.contains('mobile-open')){
        sidebar.classList.add('mobile-open');
      } else {
        sidebar.classList.remove('mobile-open');
      }
    }
    swipeTarget = null; isSwiping = false;
  }, {passive:true});

  // ── HAPTIC FEEDBACK on nav items ───────────────────────────────
  document.addEventListener('touchstart', e=>{
    const target = e.target.closest('.mob-nav-btn,.btn-primary,.nav-item');
    if(target && navigator.vibrate) navigator.vibrate(8);
  }, {passive:true});

  // ── PREVENT DOUBLE-TAP ZOOM on buttons ─────────────────────────
  let lastTap = 0;
  document.addEventListener('touchend', e=>{
    if(e.target.closest('button,.btn,.nav-item,.mob-nav-btn')){
      const now = Date.now();
      if(now - lastTap < 300) e.preventDefault();
      lastTap = now;
    }
  });

  // ── PULL-TO-REFRESH prevention (avoid browser native) ──────────
  let startY = 0;
  document.addEventListener('touchstart', e=>{ startY = e.touches[0].clientY; }, {passive:true});
  document.addEventListener('touchmove', e=>{
    const el = e.target.closest('.main, .kanban-board, #notif-panel');
    if(!el && document.scrollingElement?.scrollTop === 0 && e.touches[0].clientY > startY + 10){
      e.preventDefault();
    }
  }, {passive:false});
})();
