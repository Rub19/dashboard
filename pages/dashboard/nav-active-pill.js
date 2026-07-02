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
    });
    var sidebar=qs("#main-sidebar");
    if(sidebar){
      try{new MutationObserver(schedule).observe(sidebar,{attributes:true,attributeFilter:["style","class"]})}catch(e){}
    }
    window.addEventListener("resize",schedule);
    setTimeout(schedule,150);
    setTimeout(schedule,600);
    setTimeout(schedule,1500);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
  window.ethonePositionNavPill=positionPill;
})();
