/* ETHONE sidebar V7 — fade mask on the nav list when it overflows. */
(function(){
  "use strict";
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
  document.addEventListener('scroll',function(e){
    if(e.target&&e.target.id==='sidebar-nav-main')update();
  },true);
  window.addEventListener('resize',update);
  document.addEventListener('DOMContentLoaded',function(){
    var el=document.getElementById('sidebar-nav-main');
    if(el){
      try{new MutationObserver(update).observe(el,{childList:true,subtree:true})}catch(e){}
    }
    update();
    setTimeout(update,500);
  });
  window.ethoneUpdateSidebarScrollFade=update;
})();
