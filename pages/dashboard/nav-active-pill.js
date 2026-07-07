/* ETHONE V6 — unified sliding active-indicator for the sidebar nav. Visual only. */
(function(){
  "use strict";
  function qs(sel,root){return (root||document).querySelector(sel)}
  function positionPill(){
    var sidebar=qs("#main-sidebar");
    var pill=qs("#nav-active-pill");
    if(!sidebar||!pill)return;
    if(getComputedStyle(sidebar).display==="none"){pill.classList.remove("visible");return}
    var active=sidebar.querySelector(".nav-item.active");
    if(!active){pill.classList.remove("visible");return}
    var sidebarRect=sidebar.getBoundingClientRect();
    var itemRect=active.getBoundingClientRect();
    if(itemRect.width===0&&itemRect.height===0){pill.classList.remove("visible");return}
    pill.style.height=itemRect.height+"px";
    pill.style.width=itemRect.width+"px";
    pill.style.left=(itemRect.left-sidebarRect.left)+"px";
    pill.style.transform="translateY("+(itemRect.top-sidebarRect.top)+"px)";
    pill.classList.add("visible");
  }
  var raf=null;
  function schedule(){
    if(raf)cancelAnimationFrame(raf);
    raf=requestAnimationFrame(positionPill);
  }
  function boot(){
    schedule();
    var main=qs("#sidebar-nav-main");
    var acct=qs("#sidebar-nav-account");
    [main,acct].forEach(function(el){
      if(!el)return;
      try{new MutationObserver(schedule).observe(el,{attributes:true,attributeFilter:["class"],subtree:true,childList:true})}catch(e){}
      // Missing before: the pill used getBoundingClientRect() (viewport-relative),
      // so scrolling the nav list moved the active item without ever telling the
      // pill to recompute — it visually detached from its own item.
      el.addEventListener("scroll",schedule,{passive:true});
    });
    var sidebar=qs("#main-sidebar");
    if(sidebar){
      try{new MutationObserver(schedule).observe(sidebar,{attributes:true,attributeFilter:["style","class"]})}catch(e){}
      // Missing before: MutationObserver fires the instant the width-changing
      // class/style attribute changes (the animation's *start*), not when the
      // CSS transition finishes — so drag-resize / compact-toggle / the
      // double-click reset animation all left the pill at its pre-animation
      // position. transitionend catches the real end state.
      sidebar.addEventListener("transitionend",function(e){
        if(e.propertyName==="width"||e.propertyName==="transform")schedule();
      });
    }
    window.addEventListener("resize",schedule);
    // The fixed setTimeout checkpoints below are a fallback for a page that's
    // already showing the dashboard on load. On first login the real nav list
    // renders only after auth resolves (often well past 1.5s) — these two
    // events are the actual, deterministic "the sidebar nav now has items"
    // signals dispatched by core/boot.js, so prefer them over guessing.
    window.addEventListener("ethone:dashboard-ready",schedule);
    window.addEventListener("ethone:page-ready",schedule);
    setTimeout(schedule,150);
    setTimeout(schedule,600);
    setTimeout(schedule,1500);
    setTimeout(schedule,3000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
  window.ethonePositionNavPill=positionPill;
})();
