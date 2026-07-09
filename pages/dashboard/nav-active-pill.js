/* ETHONE Sidebar Root Fix.
   Active navigation is rendered inside each item. The old floating pill is
   disabled because it could detach during scroll, resize, or page changes. */
(function(){
  "use strict";

  function hidePill(){
    var pill=document.getElementById("nav-active-pill");
    if(!pill)return;
    pill.classList.remove("visible");
    pill.setAttribute("hidden","hidden");
    pill.style.display="none";
    pill.style.width="0";
    pill.style.height="0";
    pill.style.transform="none";
  }

  function boot(){
    hidePill();
    try{
      new MutationObserver(hidePill).observe(document.documentElement,{childList:true,subtree:true});
    }catch(e){}
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();

  window.ethonePositionNavPill=hidePill;
})();
