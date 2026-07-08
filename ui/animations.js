/* ETHONE animation compatibility layer.
   Public function names are preserved; implementation delegates to the
   canonical Motion System when available. */

var _revealObserver=null;
var _lastPageIdx=0;
var PAGE_ORDER=[
  'dashboard','files','notes','todos','habits','kanban','calendar','goals',
  'journal','countdown','stats','activity','health','versions','github',
  'gaming','connections','marketplace','databases','valorant-accounts',
  'settings','ai'
];

function motion(){
  return window.ETHONEMotion||null;
}

function initScrollReveal(){
  if(_revealObserver)_revealObserver.disconnect();
  var targets=document.querySelectorAll('.panel,.stat-card,.game-card,.conn-card,.settings-card,.xp-card,.d4-card,.d4-widget,.timeline-card,.db-card,.va-panel');
  targets.forEach(function(el,i){
    if(!el.classList.contains('reveal-hidden')&&!el.classList.contains('reveal-visible')){
      el.classList.add('reveal-hidden');
      var delay=i%4;
      if(delay>0)el.classList.add('reveal-d'+delay);
    }
  });
  if(!('IntersectionObserver' in window)){
    targets.forEach(function(el){el.classList.remove('reveal-hidden');el.classList.add('reveal-visible');});
    return;
  }
  _revealObserver=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.remove('reveal-hidden');
        entry.target.classList.add('reveal-visible');
        _revealObserver.unobserve(entry.target);
      }
    });
  },{threshold:.08,rootMargin:'0px 0px -20px 0px'});
  targets.forEach(function(el){_revealObserver.observe(el);});
}

function animateCounter(el,target,duration,suffix){
  if(!el)return;
  duration=duration||800;
  suffix=suffix||'';
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){
    el.textContent=target+suffix;
    return;
  }
  var start=performance.now();
  var startVal=0;
  var isFloat=String(target).indexOf('.')>-1;
  function step(now){
    var elapsed=now-start;
    var progress=Math.min(elapsed/duration,1);
    var eased=1-Math.pow(1-progress,3);
    var current=startVal+(target-startVal)*eased;
    el.textContent=(isFloat?current.toFixed(1):Math.round(current))+suffix;
    if(progress<1)requestAnimationFrame(step);
    else el.textContent=target+suffix;
  }
  requestAnimationFrame(step);
}

function animateStatCards(){
  var p=typeof curP==='function'?curP():null;
  if(!p)return;
  var items=((p.state&&p.state.items)||[]).length;
  var done=((p.state&&p.state.todos)||[]).filter(function(t){return t.done;}).length;
  var links=((p.state&&p.state.items)||[]).filter(function(i){return i.type==='link';}).length;
  var vals={'stat-files':items,'stat-tasks':done,'stat-links':links};
  Object.keys(vals).forEach(function(id){
    var el=document.getElementById(id);
    if(el)animateCounter(el,vals[id],700);
  });
}

function initPsCursorGlow(){
  var glow=document.getElementById('ps-cursor-glow');
  var screen=document.getElementById('profile-screen');
  if(!glow||!screen||screen.dataset.motionGlowBound==='1')return;
  screen.dataset.motionGlowBound='1';
  var raf=0;
  var last=null;
  function apply(){
    raf=0;
    if(!last)return;
    glow.style.transform='translate3d('+(last.clientX||0)+'px,'+(last.clientY||0)+'px,0)';
    glow.style.opacity='1';
  }
  screen.addEventListener('mousemove',function(e){
    last=e;
    if(!raf)raf=requestAnimationFrame(apply);
  },{passive:true});
  screen.addEventListener('mouseleave',function(){glow.style.opacity='0';},{passive:true});
}

function initNavAnimations(){
  document.querySelectorAll('.nav-item').forEach(function(item){
    if(item.dataset.motionHoverBound==='1')return;
    item.dataset.motionHoverBound='1';
    item.addEventListener('mouseenter',function(){
      var icon=item.querySelector('.nav-icon svg,.nav-icon');
      var m=motion();
      if(icon&&m)m.pop(icon,{duration:m.duration.micro()});
    },{passive:true});
  });
}

function addRipple(e){
  var m=motion();
  if(m)return m.ripple(e.currentTarget,e);
  var btn=e.currentTarget;
  var rect=btn.getBoundingClientRect();
  var size=Math.max(rect.width,rect.height)*1.7;
  var x=e.clientX-rect.left;
  var y=e.clientY-rect.top;
  var ripple=document.createElement('span');
  ripple.className='press-ripple';
  ripple.style.cssText='width:'+size+'px;height:'+size+'px;left:'+x+'px;top:'+y+'px';
  btn.appendChild(ripple);
  setTimeout(function(){ripple.remove();},500);
}

function initRipples(){
  document.querySelectorAll('.btn-primary,.btn-ghost,.ui-button,.panel-action').forEach(function(btn){
    btn.classList.add('motion-press');
  });
}

function animatePageIn(pageEl,page){
  if(!pageEl)return;
  var curIdx=PAGE_ORDER.indexOf(page||'');
  var prevIdx=_lastPageIdx;
  var cls='page-entering';
  var preset='slideUp';
  if(page&&curIdx>=0){
    if(curIdx>prevIdx){cls='page-entering-right';preset='slideLeft';}
    else if(curIdx<prevIdx){cls='page-entering-left';preset='slideRight';}
    _lastPageIdx=curIdx;
  }
  pageEl.classList.remove('page-entering','page-entering-left','page-entering-right');
  pageEl.classList.add(cls);
  var m=motion();
  var done=m?m.enter(pageEl,preset,{duration:m.duration.normal()}):Promise.resolve();
  done.finally(function(){
    pageEl.classList.remove('page-entering','page-entering-left','page-entering-right');
    initScrollReveal();
    animateStatCards();
    initRipples();
    initNavAnimations();
  });
}

function initAnimations(){
  setTimeout(function(){
    initScrollReveal();
    animateStatCards();
    initNavAnimations();
    initRipples();
    initPsCursorGlow();
    if(typeof initLinkPreviews==='function')initLinkPreviews();
    if(typeof initOverviewDragDrop==='function')initOverviewDragDrop();
  },100);
}
