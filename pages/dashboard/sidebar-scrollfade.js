/* ETHONE sidebar V7 — fade mask on the nav list when it overflows. */
(function(){
  "use strict";
  var frame=0;
  function update(){
    var el=document.getElementById('sidebar-nav-main');
    if(!el)return;
    var hasOverflow=el.scrollHeight>el.clientHeight+2;
    if(!hasOverflow){
      el.classList.remove('sb-fade-top','sb-fade-bottom');
      return;
    }
    el.classList.toggle('sb-fade-top',el.scrollTop>4);
    el.classList.toggle('sb-fade-bottom',el.scrollTop<el.scrollHeight-el.clientHeight-4);
  }
  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(function(){frame=0;update();});
  }
  document.addEventListener('scroll',function(e){
    if(e.target&&e.target.id==='sidebar-nav-main')schedule();
  },true);
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('click',function(e){
    if(e.target&&e.target.closest&&e.target.closest('#main-sidebar .os-section-head'))setTimeout(schedule,0);
  });
  document.addEventListener('DOMContentLoaded',function(){
    var el=document.getElementById('sidebar-nav-main');
    if(el){
      try{
        if(typeof ResizeObserver==='function')new ResizeObserver(schedule).observe(el);
      }catch(e){}
    }
    schedule();
    setTimeout(schedule,500);
  });
  window.addEventListener('ethone:page-ready',schedule);
  window.ethoneUpdateSidebarScrollFade=schedule;
})();
