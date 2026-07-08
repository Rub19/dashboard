/* ETHONE Mobile App Shell
   Dedicated phone navigation and responsive runtime helpers. */
(function(){
  "use strict";
  if(window.__ethoneMobileShell)return;
  window.__ethoneMobileShell=true;

  var mqMobile=window.matchMedia?window.matchMedia("(max-width: 768px)"):null;
  var mqTablet=window.matchMedia?window.matchMedia("(max-width: 1024px)"):null;
  var navReady=false;

  var NAV_ITEMS=[
    {id:"dashboard",label:"Home",icon:"layout-dashboard",action:"dashboard.open",page:"dashboard"},
    {id:"ai",label:"Brain",icon:"brain",action:"brain.open",page:"ai",primary:true},
    {id:"widgets",label:"Widgets",icon:"blocks",action:"widgets.open",panel:true},
    {id:"spaces",label:"Spaces",icon:"panels-top-left",action:"spaces.open",panel:true},
    {id:"settings",label:"Settings",icon:"settings",action:"settings.open",page:"settings"}
  ];

  function qs(selector,root){
    try{return (root||document).querySelector(selector);}catch(error){return null;}
  }

  function qsa(selector,root){
    try{return Array.prototype.slice.call((root||document).querySelectorAll(selector));}
    catch(error){return [];}
  }

  function isMobile(){
    return mqMobile?mqMobile.matches:window.innerWidth<=768;
  }

  function isTablet(){
    return mqTablet?mqTablet.matches:window.innerWidth<=1024;
  }

  function icon(name){
    return '<span class="mob-icon"><i data-lucide="'+name+'" aria-hidden="true"></i></span>';
  }

  function navButton(item){
    return '<button class="mob-nav-btn'+(item.primary?' is-primary':'')+(item.id==="dashboard"?' active':'')+'" type="button" id="mob-btn-'+item.id+'" data-mobile-action="'+item.action+'" data-mobile-page="'+(item.page||"")+'" data-mobile-id="'+item.id+'" aria-label="'+item.label+'">'+icon(item.icon)+'<span>'+item.label+'</span></button>';
  }

  function renderIcons(root){
    try{
      if(window.lucide&&!window.__lucideFailed&&typeof window.lucide.createIcons==="function"){
        window.lucide.createIcons({attrs:{"stroke-width":"1.9","aria-hidden":"true","focusable":"false"}},root||document);
      }
    }catch(error){}
  }

  function setActive(id){
    var nav=qs("#mobile-bottom-nav");
    if(!nav)return;
    qsa(".mob-nav-btn",nav).forEach(function(btn){
      var active=btn.dataset.mobileId===id;
      btn.classList.toggle("active",active);
      if(active)btn.setAttribute("aria-current","page");
      else btn.removeAttribute("aria-current");
    });
  }

  function pageToNavId(page){
    page=String(page||"").replace(/^page-/,"");
    if(page==="brain"||page==="ethone-ai")return "ai";
    if(page==="workspaces"||page==="workspace")return "spaces";
    if(page==="widgets"||page==="widget-builder")return "widgets";
    if(page==="dashboard"||page==="home")return "dashboard";
    if(page==="settings")return "settings";
    if(page==="ai")return "ai";
    return "";
  }

  function dispatchAction(action,item,button,event){
    var ok=false;
    var context={source:"mobile-nav",el:button,event:event,page:item&&item.page};
    try{
      if(window.ACTION_REGISTRY&&typeof window.ACTION_REGISTRY.dispatch==="function"){
        ok=window.ACTION_REGISTRY.dispatch(action,context)!==false;
      }else if(typeof window.runAction==="function"){
        ok=window.runAction(action,context)!==false;
      }else if(item&&item.page&&typeof window.switchPage==="function"){
        window.switchPage(item.page,null);
        ok=true;
      }
    }catch(error){
      ok=false;
    }
    if(!ok&&typeof window.toast==="function"){
      try{window.toast("Action mobile indisponible pour le moment","info");}catch(error){}
    }
    return ok;
  }

  function closeMobileChrome(){
    try{if(typeof window.closeMobileSidebar==="function")window.closeMobileSidebar();}catch(error){}
    qsa(".dropdown.open,.context-menu.open,.ui-dropdown-menu.open").forEach(function(el){el.classList.remove("open");});
  }

  function ensureNav(){
    var nav=qs("#mobile-bottom-nav");
    if(!nav)return;
    if(nav.dataset.mobileV2!=="1"){
      nav.dataset.mobileV2="1";
      nav.innerHTML=NAV_ITEMS.map(navButton).join("");
      nav.addEventListener("click",function(event){
        var btn=event.target&&event.target.closest&&event.target.closest("[data-mobile-action]");
        if(!btn)return;
        event.preventDefault();
        event.stopPropagation();
        var id=btn.dataset.mobileId||"";
        var item=NAV_ITEMS.filter(function(entry){return entry.id===id;})[0]||{};
        closeMobileChrome();
        if(!item.panel)setActive(id);
        else {
          setActive(id);
          setTimeout(function(){
            var activePage=qs(".tab-content.active[id^='page-']");
            var current=activePage?pageToNavId(activePage.id):"";
            if(current)setActive(current);
          },900);
        }
        dispatchAction(btn.dataset.mobileAction,item,btn,event);
      },true);
    }
    navReady=true;
    renderIcons(nav);
  }

  function enhanceTopbar(){
    var add=qs("#mobile-topbar .btn-primary");
    if(add){
      add.textContent="New";
      add.setAttribute("aria-label","Create a new item");
      add.dataset.mobileEnhanced="1";
    }
    var avatar=qs("#mob-topbar-avatar");
    if(avatar&&!avatar.querySelector("[data-lucide],svg,img")){
      avatar.innerHTML='<i data-lucide="user-round" aria-hidden="true"></i>';
    }
    renderIcons(qs("#mobile-topbar")||document);
  }

  function syncActiveFromPage(page){
    var id=pageToNavId(page);
    if(id)setActive(id);
  }

  function installSetMobNavBridge(){
    if(window.__ethoneMobileSetNavBridge)return;
    window.__ethoneMobileSetNavBridge=true;
    var previous=typeof window.setMobNav==="function"?window.setMobNav:null;
    window.setMobNav=function(page){
      var id=pageToNavId(page);
      if(id)setActive(id);
      else if(previous)previous(page);
    };
  }

  function applyClasses(){
    if(!document.body)return;
    document.body.classList.toggle("ethone-mobile",isMobile());
    document.body.classList.toggle("ethone-tablet",isTablet()&&!isMobile());
    if(isMobile()){
      ensureNav();
      enhanceTopbar();
      var active=qs(".tab-content.active[id^='page-']");
      if(active)syncActiveFromPage(active.id);
    }
  }

  function schedule(){
    clearTimeout(schedule.timer);
    schedule.timer=setTimeout(function(){
      requestAnimationFrame(applyClasses);
    },80);
  }

  function boot(){
    installSetMobNavBridge();
    ensureNav();
    applyClasses();
    ["ethone:dashboard-ready","ethone:page-ready","ethone:boot-sequence-complete","ethone:workspace-change"].forEach(function(name){
      window.addEventListener(name,function(event){
        if(event&&event.detail&&event.detail.page)syncActiveFromPage(event.detail.page);
        schedule();
      },{passive:true});
    });
    window.addEventListener("resize",schedule,{passive:true});
    if(mqMobile&&typeof mqMobile.addEventListener==="function")mqMobile.addEventListener("change",schedule);
    if(mqTablet&&typeof mqTablet.addEventListener==="function")mqTablet.addEventListener("change",schedule);
    try{
      new MutationObserver(function(mutations){
        for(var i=0;i<mutations.length;i++){
          if(mutations[i].addedNodes&&mutations[i].addedNodes.length){schedule();return;}
        }
      }).observe(document.body,{childList:true,subtree:true});
    }catch(error){}
    try{window.dispatchEvent(new CustomEvent("ethone:mobile-ready",{detail:{nav:navReady}}));}catch(error){}
  }

  window.ETHONEMobileShell={
    refresh:schedule,
    setActive:setActive,
    isMobile:isMobile
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
