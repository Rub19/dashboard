/* ETHONE legacy compatibility module: animations. */
//  ETHONE — Animation System JS
// ══════════════════════════════════════════════

// ── SCROLL REVEAL ──────────────────────────────
let _revealObserver=null;
function initScrollReveal(){
  if(_revealObserver)_revealObserver.disconnect();
  // Add reveal classes to panels and cards
  const targets=document.querySelectorAll('.panel,.stat-card,.game-card,.conn-card,.settings-card,.xp-card');
  targets.forEach((el,i)=>{
    if(!el.classList.contains('reveal-hidden')&&!el.classList.contains('reveal-visible')){
      el.classList.add('reveal-hidden');
      const delay=i%4;
      if(delay>0)el.classList.add(`reveal-d${delay}`);
    }
  });
  _revealObserver=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.remove('reveal-hidden');
        entry.target.classList.add('reveal-visible');
        _revealObserver.unobserve(entry.target);
      }
    });
  },{threshold:.08,rootMargin:'0px 0px -20px 0px'});
  targets.forEach(el=>_revealObserver.observe(el));
}

// ── ANIMATED STAT COUNTERS ─────────────────────
function animateCounter(el,target,duration=800,suffix=''){
  if(!el)return;
  const start=performance.now();
  const startVal=0;
  const isFloat=String(target).includes('.');
  const step=(now)=>{
    const elapsed=now-start;
    const progress=Math.min(elapsed/duration,1);
    // Ease out cubic
    const eased=1-Math.pow(1-progress,3);
    const current=startVal+(target-startVal)*eased;
    el.textContent=(isFloat?current.toFixed(1):Math.round(current))+suffix;
    if(progress<1)requestAnimationFrame(step);
    else el.textContent=target+suffix;
  };
  requestAnimationFrame(step);
}

function animateStatCards(){
  const statMap={
    'stat-files':'items','stat-tasks':'done','stat-links':'links'
  };
  const p=curP();if(!p)return;
  const items=(p.state?.items||[]).length;
  const done=(p.state?.todos||[]).filter(t=>t.done).length;
  const links=(p.state?.items||[]).filter(i=>i.type==='link').length;
  const vals={'stat-files':items,'stat-tasks':done,'stat-links':links};
  Object.entries(vals).forEach(([id,val])=>{
    const el=document.getElementById(id);
    if(el)animateCounter(el,val,700);
  });
}

// ── PROFILE SCREEN CURSOR GLOW ─────────────────
function initPsCursorGlow(){
  const glow=document.getElementById('ps-cursor-glow');
  if(!glow)return;
  const screen=document.getElementById('profile-screen');
  if(!screen)return;
  const move=(e)=>{
    glow.style.left=e.clientX+'px';
    glow.style.top=e.clientY+'px';
    glow.style.opacity='1';
  };
  const leave=()=>glow.style.opacity='0';
  screen.addEventListener('mousemove',move);
  screen.addEventListener('mouseleave',leave);
}

// ── NAV ICON HOVER BOUNCE ──────────────────────
function initNavAnimations(){
  document.querySelectorAll('.nav-item').forEach(item=>{
    item.addEventListener('mouseenter',()=>{
      const icon=item.querySelector('.nav-icon svg');
      if(icon){icon.style.animation='none';requestAnimationFrame(()=>{icon.style.animation='navIconBounce .4s ease';});}
    });
  });
}

// ── RIPPLE EFFECT ON BUTTONS ───────────────────
function addRipple(e){
  const btn=e.currentTarget;
  const rect=btn.getBoundingClientRect();
  const size=Math.max(rect.width,rect.height)*2;
  const x=e.clientX-rect.left;const y=e.clientY-rect.top;
  const ripple=document.createElement('span');
  ripple.className='press-ripple';
  ripple.style.cssText=`width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  btn.appendChild(ripple);
  setTimeout(()=>ripple.remove(),500);
}
function initRipples(){
  document.querySelectorAll('.btn-primary,.btn-ghost').forEach(btn=>{
    btn.removeEventListener('click',addRipple);
    btn.addEventListener('click',addRipple);
  });
}

// ── PAGE TRANSITION ────────────────────────────
// ── PAGE ORDER for directional transitions ──────────────
const PAGE_ORDER=['dashboard','files','notes','todos','habits','kanban','calendar','goals','journal','countdown','stats','github','gaming','connections','settings','ai'];
let _lastPageIdx=0;

function animatePageIn(pageEl,page){
  if(!pageEl)return;
  const curIdx=PAGE_ORDER.indexOf(page||'');
  const prevIdx=_lastPageIdx;
  let cls='page-entering';
  if(page&&curIdx>=0){
    if(curIdx>prevIdx)cls='page-entering-right';
    else if(curIdx<prevIdx)cls='page-entering-left';
    _lastPageIdx=curIdx;
  }
  pageEl.classList.remove('page-entering','page-entering-left','page-entering-right');
  void pageEl.offsetWidth;
  pageEl.classList.add(cls);
  setTimeout(()=>{
    pageEl.classList.remove('page-entering','page-entering-left','page-entering-right');
    initScrollReveal();
    animateStatCards();
    initRipples();
  },300);
}


// ── INIT ON DASHBOARD READY ────────────────────
function initAnimations(){
  setTimeout(()=>{
    initScrollReveal();
    animateStatCards();
    initNavAnimations();
    initRipples();
    initPsCursorGlow();
    initLinkPreviews();
    initOverviewDragDrop();
  },100);
}


// ══════════════════════════════════════════════════════════════
