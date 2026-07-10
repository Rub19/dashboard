/* ETHONE UI Isolation.
   Keeps one active shell mounted and closes transient layers during navigation. */
(function(){
  "use strict";
  if(window.__ethoneUIIsolation)return;
  window.__ethoneUIIsolation=true;

  var scheduled=0;
  var scheduledDue=0;
  var syncing=false;
  var lastPage="";
  var singletonSelectors=[
    "#ethone-desktop",
    "#ethone-side-panels",
    "#ethone-permanent-dock",
    "#ethone-native-shell",
    "#ethone-status-bar",
    "#ethone-os2-dock",
    "#eh-dock",
    "#cmd-palette-overlay",
    "#notif-panel",
    "#notif-overlay",
    "#ai-sessions-drawer"
  ];

  function leanRuntime(){
    try{
      return !!(
        window.ETHONE_STABLE_BOOT ||
        window.ETHONE_LIGHT_BOOT_MODE ||
        window.__ethoneLeanProductionBoot ||
        document.documentElement.dataset.ethoneStableBoot==="1"
      );
    }catch(e){return !!(window.ETHONE_STABLE_BOOT||window.ETHONE_LIGHT_BOOT_MODE||window.__ethoneLeanProductionBoot)}
  }

  function qs(sel,root){return (root||document).querySelector(sel)}
  function qsa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}
  function hidden(el){
    if(!el)return true;
    var cs=getComputedStyle(el);
    return el.hidden||cs.display==="none"||cs.visibility==="hidden"||Number(cs.opacity)===0;
  }
  function isAppVisible(){
    var main=qs("#main-content"),auth=qs("#auth-screen"),profile=qs("#profile-screen"),password=qs("#password-screen");
    return !!main&&!hidden(main)&&hidden(auth)&&hidden(profile)&&hidden(password);
  }
  function layoutMode(){
    try{
      if(typeof window.ethoneGetLayoutMode==="function")return window.ethoneGetLayoutMode();
      if(window.ETHONEBootSequence&&typeof window.ETHONEBootSequence.layoutMode==="function")return window.ETHONEBootSequence.layoutMode();
    }catch(e){}
    try{
      if(localStorage.getItem("ethone:desktop-enabled")==="1")return "desktop";
      return localStorage.getItem("ethone:layout-mode")||"classic";
    }catch(e){return "classic"}
  }
  function canMount(layer){
    try{
      if(window.ethoneCanMountUI)return window.ethoneCanMountUI(layer)!==false;
    }catch(e){}
    if(layer==="desktop")return layoutMode()==="desktop";
    if(layer==="side-panels")return layoutMode()!=="desktop";
    return true;
  }
  function currentPage(){
    var active=qs(".tab-content.active[id^='page-']:not(.de-window-page)");
    if(active)return active.id.replace(/^page-/,"");
    var any=qs(".tab-content.active[id^='page-']");
    return any?any.id.replace(/^page-/,""):"dashboard";
  }
  function removeState(el,classes){
    if(!el)return;
    classes.forEach(function(cls){el.classList.remove(cls)});
    if(classes.indexOf("open")>-1||classes.indexOf("active")>-1||classes.indexOf("visible")>-1){
      el.setAttribute("aria-hidden","true");
    }
  }
  function closeAllMatching(selectors,classes){
    selectors.forEach(function(sel){
      qsa(sel).forEach(function(el){removeState(el,classes)});
    });
  }
  function closeTransientUI(reason,force){
    var mode=layoutMode();
    var appVisible=isAppVisible();

    if(force||!appVisible){
      try{
        if(typeof window.closeAllModals==="function")window.closeAllModals({restoreFocus:false});
        else if(window.ETHONEModals&&typeof window.ETHONEModals.closeAll==="function")window.ETHONEModals.closeAll({restoreFocus:false});
      }catch(e){}
      var transientSelectors=[
        ".modal-overlay.open",
        ".eh-panel-overlay.open",
        ".spaces-overlay.open",
        ".theme-creator-overlay.open",
        ".wm-creator-overlay.open",
        ".db-dpe-overlay.open",
        ".db-detail-overlay.open",
        ".va-detail-overlay.open",
        ".sidebar-overlay.mobile-open",
        "#live-panel-mobile-overlay.mobile-open",
        "#notif-overlay.open",
        "#notif-panel.open",
        "#presentation-overlay.active",
        "#ethone-version-popup-root.is-open",
        "#ethone-whats-new-root.is-open",
        "#ai-sessions-drawer.open",
        ".lang-dropdown.open",
        ".dropdown.open",
        ".ui-dropdown.open",
        ".context-menu.open",
        ".ui-context-menu.open",
        ".db-ctx-menu.open",
        ".db-dd-panel.open",
        ".aie-context-menu.open",
        ".sb-tooltip.visible",
        ".tooltip.visible"
      ];
      if(force||reason==="navigation"||reason==="history"||reason==="hash"||reason==="escape"||appVisible){
        transientSelectors.push("#cmd-palette-overlay.open");
      }
      closeAllMatching(transientSelectors,["open","active","visible","mobile-open","show","is-open"]);
      var livePanel=qs("#live-panel-mobile-overlay");
      if(livePanel)livePanel.setAttribute("aria-hidden","true");
      if(force||reason==="navigation"||reason==="history"||reason==="hash"||reason==="escape"||appVisible){
        try{if(typeof window.closeCmdPalette==="function")window.closeCmdPalette()}catch(e){}
      }
      try{if(typeof window.closeNotifPanel==="function")window.closeNotifPanel()}catch(e){}
      document.body.classList.remove("ethone-version-popup-active","ethone-whats-new-active");
    }

    if(force||mode!=="desktop"){
      qsa("#de-launchpad").forEach(function(el){el.remove()});
    }
    if(force||mode==="desktop"||!canMount("permanent-dock")){
      closeAllMatching(["#pdock-popover.is-open","#pdock-manager.is-open"],["is-open","open","active"]);
    }
    if(force||mode==="desktop"||!canMount("side-panels")){
      try{if(window.ETHONESidePanels&&typeof window.ETHONESidePanels.close==="function")window.ETHONESidePanels.close(true)}catch(e){}
    }
    document.body.classList.remove("side-panel-resizing");
  }
  function dedupeSingletons(){
    var removed=[];
    singletonSelectors.forEach(function(sel){
      var nodes=qsa(sel);
      if(nodes.length<2)return;
      nodes.slice(1).forEach(function(node){
        removed.push(sel);
        node.remove();
      });
    });
    return removed;
  }
  function restoreDetachedPages(){
    if(layoutMode()==="desktop"&&document.body.classList.contains("ethone-desktop-mode"))return;
    qsa(".tab-content[data-de-host]").forEach(function(page){
      try{
        var placeholder=page.__ethoneDesktopPlaceholder;
        if(placeholder&&placeholder.parentNode){
          placeholder.parentNode.insertBefore(page,placeholder);
          placeholder.remove();
          page.__ethoneDesktopPlaceholder=null;
        }else{
          var main=qs("#main-content");
          if(main)main.appendChild(page);
        }
      }catch(e){}
      page.classList.remove("de-window-page");
      page.removeAttribute("data-de-host");
    });
  }
  function normalizePages(){
    if(!isAppVisible())return;
    var mode=layoutMode();
    if(mode!=="desktop"){
      if(document.body.classList.contains("ethone-desktop-mode")&&window.ETHONEDesktop&&typeof window.ETHONEDesktop.disable==="function"){
        try{window.ETHONEDesktop.disable()}catch(e){}
      }
      restoreDetachedPages();
    }

    var pages=qsa(".tab-content[id^='page-']");
    if(!pages.length)return;
    if(mode==="desktop")return;

    var activePages=pages.filter(function(page){return page.classList.contains("active")&&!page.classList.contains("de-window-page")});
    var keep=activePages.find(function(page){return page.id==="page-"+lastPage})||activePages[0]||qs("#page-dashboard")||pages[0];
    pages.forEach(function(page){
      var active=page===keep;
      page.classList.toggle("active",active);
      page.classList.remove("native-page-exit","is-leaving","page-exit");
      if(active){
        page.removeAttribute("aria-hidden");
        try{page.inert=false}catch(e){}
      }else{
        page.setAttribute("aria-hidden","true");
        try{page.inert=true}catch(e){}
      }
    });
  }
  function enforceChrome(){
    var mode=layoutMode();
    document.body.classList.toggle("ethone-desktop-active",mode==="desktop"&&document.body.classList.contains("ethone-desktop-mode"));
    document.body.classList.toggle("ethone-side-panel-open",!!qs("#side-panel-shell.open"));
    document.body.classList.toggle("ethone-modal-open",!!qs(".modal-overlay.open,.eh-panel-overlay.open,.spaces-overlay.open"));
    document.body.classList.toggle("ethone-command-open",!!qs("#cmd-palette-overlay.open"));

    if(window.ETHONEBootSequence&&typeof window.ETHONEBootSequence.sync==="function"){
      try{window.ETHONEBootSequence.sync()}catch(e){}
    }

    var sidePanels=qs("#ethone-side-panels");
    if(sidePanels)sidePanels.setAttribute("aria-hidden",mode==="desktop"?"true":"false");
    if(mode==="desktop")closeTransientUI("desktop-mode",false);
  }
  function integrityReport(detailed){
    var allIds={};
    qsa("[id]").forEach(function(el){
      allIds[el.id]=(allIds[el.id]||0)+1;
    });
    var duplicateIds=Object.keys(allIds).filter(function(id){return allIds[id]>1}).map(function(id){return {id:id,count:allIds[id]}});
    var doc=document.documentElement;
    var activePages=qsa(".tab-content.active[id^='page-']").map(function(el){return el.id});
    var openOverlays=qsa(".modal-overlay.open,.eh-panel-overlay.open,.spaces-overlay.open,#cmd-palette-overlay.open,#notif-panel.open,#side-panel-shell.open,#pdock-manager.is-open,#pdock-popover.is-open").map(function(el){return el.id||el.className});
    var detached=qsa(".tab-content[data-de-host]").map(function(el){return {id:el.id,host:el.getAttribute("data-de-host")}});
    var visibleFixed=detailed?qsa("body *").filter(function(el){
      if(hidden(el))return false;
      var cs=getComputedStyle(el);
      if(cs.position!=="fixed")return false;
      var r=el.getBoundingClientRect();
      return r.width>2&&r.height>2;
    }).slice(0,60).map(function(el){
      return {id:el.id||"",className:String(el.className||"").slice(0,80),z:parseInt(getComputedStyle(el).zIndex,10)||0};
    }):[];
    return {
      mode:layoutMode(),
      activePage:currentPage(),
      activePages:activePages,
      duplicateIds:duplicateIds,
      detachedPages:detached,
      openOverlays:openOverlays,
      visibleFixedLayers:visibleFixed,
      horizontalOverflow:doc.scrollWidth>doc.clientWidth+2,
      viewport:{w:window.innerWidth,h:window.innerHeight,zoom:Math.round((window.outerWidth/window.innerWidth)*100)/100}
    };
  }
  function sync(reason){
    if(syncing)return;
    syncing=true;
    try{
      document.documentElement.dataset.ethoneUiIsolation="ready";
      document.body.classList.add("ethone-ui-isolation-ready");
      dedupeSingletons();
      closeTransientUI(reason,false);
      normalizePages();
      enforceChrome();
      window.__ethoneLastUIIntegrityReport=integrityReport(false);
    }finally{
      syncing=false;
    }
  }
  function schedule(reason,delay){
    var wait=delay==null?120:delay;
    var due=Date.now()+wait;
    // Keep the earliest pending integrity pass. DOM mutations can be
    // continuous (clock, progress, live widgets); a classic debounce kept
    // postponing navigation cleanup forever and left active pages inert.
    if(scheduled&&scheduledDue&&scheduledDue<=due)return;
    clearTimeout(scheduled);
    scheduledDue=due;
    scheduled=setTimeout(function(){
      scheduled=0;
      scheduledDue=0;
      sync(reason||"scheduled");
    },wait);
  }
  function wrapSwitchPage(){
    if(typeof window.switchPage!=="function"||window.switchPage.__uiIsolationWrapped)return;
    var original=window.switchPage;
    window.switchPage=function(page,navEl){
      lastPage=page||lastPage||currentPage();
      closeTransientUI("navigation",true);
      try{window.dispatchEvent(new CustomEvent("ethone:before-page-change",{detail:{page:lastPage}}))}catch(e){}
      var result=original.apply(this,arguments);
      schedule("navigation",40);
      return result;
    };
    window.switchPage.__uiIsolationWrapped=true;
  }
  function boot(){
    document.documentElement.dataset.ethoneUiIsolation="ready";
    document.body.classList.add("ethone-ui-isolation-ready");
    wrapSwitchPage();
    schedule("boot",80);
    schedule("boot-late",900);

    if(window.ethoneAddSwitchPageHook){
      try{window.ethoneAddSwitchPageHook("ui-isolation",function(page){lastPage=page||lastPage;schedule("switch-hook",50)})}catch(e){}
    }
    ["ethone:dashboard-ready","ethone:boot-sequence-complete","ethone:page-ready","ethone:theme-changed","ethone:workspace-change","ethone:space-change"].forEach(function(eventName){
      window.addEventListener(eventName,function(event){
        if(event&&event.detail&&event.detail.page)lastPage=event.detail.page;
        wrapSwitchPage();
        schedule(eventName,80);
      });
    });
    window.addEventListener("resize",function(){schedule("resize",120)},{passive:true});
    window.addEventListener("popstate",function(){closeTransientUI("history",true);schedule("history",80)});
    window.addEventListener("hashchange",function(){closeTransientUI("hash",true);schedule("hash",80)});
    document.addEventListener("keydown",function(event){
      if(event.key==="Escape"){
        if(window.ETHONEAccessibility&&typeof window.ETHONEAccessibility.closeTopLayer==="function"){
          try{
            if(window.ETHONEAccessibility.closeTopLayer()){
              event.preventDefault();
              event.stopImmediatePropagation();
              schedule("escape",20);
              return;
            }
          }catch(e){}
        }
        closeTransientUI("escape",true);
        schedule("escape",20);
      }
    },true);
    try{
      var light=leanRuntime();
      new MutationObserver(function(){schedule("mutation",light?420:180)}).observe(
        document.body,
        light
          ? {childList:true,subtree:true}
          : {childList:true,subtree:true,attributes:true,attributeFilter:["class","style","hidden","aria-hidden"]}
      );
    }catch(e){}
  }

  window.ETHONEUIIsolation={
    sync:function(){sync("manual")},
    schedule:schedule,
    report:function(){return integrityReport(true)},
    closeTransientUI:function(){closeTransientUI("manual",true)},
    normalizePages:normalizePages
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
