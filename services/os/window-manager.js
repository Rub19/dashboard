/* ETHONE Window Manager facade.
   Keeps boot light, then lazy-loads the desktop environment only when a window is requested. */
(function(){
  "use strict";
  if(window.__ethoneWindowManager)return;
  window.__ethoneWindowManager=true;

  var loading=null;
  var buttonInstallScheduled=0;

  function qsa(selector,root){
    try{return Array.prototype.slice.call((root||document).querySelectorAll(selector))}
    catch(error){return []}
  }
  function notify(message,type){
    if(typeof window.toast==="function"){
      try{window.toast(message,type||"info");return}catch(error){}
    }
    if(type==="error")console.warn("[ETHONE Window Manager]",message);
  }
  function appVisible(){
    var main=document.getElementById("main-content");
    if(!main)return false;
    var hidden=function(el){
      if(!el)return true;
      var cs=getComputedStyle(el);
      return cs.display==="none"||cs.visibility==="hidden";
    };
    return !hidden(main)&&hidden(document.getElementById("auth-screen"))&&hidden(document.getElementById("profile-screen"))&&hidden(document.getElementById("password-screen"));
  }
  function currentPage(){
    var active=document.querySelector(".tab-content.active[id^='page-']");
    return active?active.id.replace(/^page-/,""):"dashboard";
  }
  function hasPage(page){
    return !!document.getElementById("page-"+page);
  }
  function syncBoot(){
    try{
      if(window.ETHONEBootSequence&&typeof window.ETHONEBootSequence.sync==="function")window.ETHONEBootSequence.sync();
    }catch(error){}
  }
  function setDesktopLayout(active){
    try{
      localStorage.setItem("ethone:desktop-enabled",active?"1":"0");
      localStorage.setItem("ethone:layout-mode",active?"desktop":"classic");
    }catch(error){}
    try{
      document.documentElement.classList.toggle("ethone-window-manager-active",!!active);
      if(document.body)document.body.classList.toggle("ethone-window-manager-active",!!active);
    }catch(error){}
    syncBoot();
  }
  function waitForDesktop(){
    if(window.ETHONEDesktop)return Promise.resolve(window.ETHONEDesktop);
    return new Promise(function(resolve){
      var attempts=0;
      (function tick(){
        if(window.ETHONEDesktop)return resolve(window.ETHONEDesktop);
        attempts+=1;
        if(attempts>40)return resolve(null);
        setTimeout(tick,50);
      })();
    });
  }
  function load(){
    if(window.ETHONEDesktop)return Promise.resolve(window.ETHONEDesktop);
    if(loading)return loading;
    setDesktopLayout(true);
    if(window.__ethoneDisableExperimentalBoot){
      try{document.documentElement.classList.add("ethone-window-manager-active")}catch(error){}
    }
    var lazy=window.ETHONELazyModules;
    if(!lazy||typeof lazy.load!=="function"){
      notify("Window Manager indisponible pour le moment.","warning");
      return Promise.resolve(null);
    }
    loading=Promise.resolve(lazy.load("desktop")).then(function(ok){
      if(ok===false)throw new Error("Desktop group disabled");
      return waitForDesktop();
    }).then(function(api){
      if(!api)throw new Error("Desktop runtime unavailable");
      return api;
    }).catch(function(error){
      loading=null;
      setDesktopLayout(false);
      console.warn("[ETHONE Window Manager] load failed",error);
      notify("Impossible d'ouvrir le Window Manager.","error");
      return null;
    });
    return loading;
  }
  function withDesktop(callback){
    return load().then(function(api){
      if(!api)return false;
      try{return callback(api)!==false}
      catch(error){
        console.warn("[ETHONE Window Manager] action failed",error);
        notify("Action fenetre impossible pour le moment.","error");
        return false;
      }
    });
  }
  function open(page,options){
    page=page||currentPage()||"dashboard";
    if(!hasPage(page)){
      notify("Page introuvable : "+page,"warning");
      return Promise.resolve(false);
    }
    setDesktopLayout(true);
    return withDesktop(function(api){
      if(typeof api.open==="function")api.open(page,options||{});
      else if(typeof api.enable==="function")api.enable();
    });
  }
  function enable(){
    setDesktopLayout(true);
    return withDesktop(function(api){if(typeof api.enable==="function")api.enable()});
  }
  function disable(){
    return withDesktop(function(api){
      if(typeof api.disable==="function")api.disable();
      setDesktopLayout(false);
    });
  }
  function toggle(){
    if(document.body&&document.body.classList.contains("ethone-desktop-mode"))return disable();
    return enable();
  }
  function openCurrent(){
    return open(currentPage()||"dashboard");
  }
  function split(){
    return withDesktop(function(api){if(typeof api.split==="function")api.split();else return false});
  }
  function closeActive(){
    return withDesktop(function(api){if(typeof api.closeActive==="function")api.closeActive();else return false});
  }
  function minimizeActive(){
    return withDesktop(function(api){if(typeof api.minimizeActive==="function")api.minimizeActive();else return false});
  }
  function maximizeActive(){
    return withDesktop(function(api){if(typeof api.maximizeActive==="function")api.maximizeActive();else return false});
  }
  function pinActive(){
    return withDesktop(function(api){if(typeof api.pinActive==="function")api.pinActive();else return false});
  }
  function snapActive(side){
    return withDesktop(function(api){if(typeof api.snapActive==="function")api.snapActive(side);else return false});
  }
  function installPageButtonsNow(){
    if(!appVisible())return;
    ensureFloatingButton();
    qsa(".tab-content[id^='page-']").forEach(function(pageEl){
      var page=pageEl.id.replace(/^page-/,"");
      var topbar=pageEl.querySelector(".topbar");
      if(!topbar||topbar.querySelector(".wm-detach-btn,.de-windowize-btn"))return;
      var actions=topbar.querySelector(".topbar-actions")||topbar;
      var btn=document.createElement("button");
      btn.type="button";
      btn.className="btn btn-ghost wm-detach-btn";
      btn.dataset.wmOpen=page;
      btn.title="Ouvrir en fenetre";
      btn.setAttribute("aria-label","Ouvrir cette page dans une fenetre flottante");
      btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="13" height="12" rx="2"/><path d="M9 19h11V9"/></svg><span>Window</span>';
      actions.prepend(btn);
    });
  }
  function ensureFloatingButton(){
    var btn=document.getElementById("wm-floating-trigger");
    if(btn)return btn;
    btn=document.createElement("button");
    btn.id="wm-floating-trigger";
    btn.type="button";
    btn.className="wm-floating-trigger";
    btn.dataset.wmOpenCurrent="1";
    btn.title="Ouvrir la page active en fenetre";
    btn.setAttribute("aria-label","Ouvrir la page active en fenetre flottante");
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="13" height="12" rx="2"/><path d="M9 19h11V9"/></svg><span>Window</span>';
    document.body.appendChild(btn);
    return btn;
  }
  function schedulePageButtons(){
    clearTimeout(buttonInstallScheduled);
    buttonInstallScheduled=setTimeout(installPageButtonsNow,90);
  }
  function registerActions(){
    var A=window.ETHONEActions||window.ACTION_REGISTRY||(window.Ethone&&window.Ethone.get&&window.Ethone.get("actions"));
    if(!A||typeof A.register!=="function")return false;
    var reg=function(id,label,handler){
      try{
        if(A.has&&A.has(id))return;
        A.register(id,{label:label,handler:handler});
      }catch(error){}
    };
    reg("window.manager.toggle","Toggle Window Manager",toggle);
    reg("window.manager.enable","Enable Window Manager",enable);
    reg("window.manager.disable","Disable Window Manager",disable);
    reg("window.open.current","Open current page in window",openCurrent);
    reg("window.detach.current","Detach current page",openCurrent);
    reg("window.close.active","Close active window",closeActive);
    reg("window.minimize.active","Minimize active window",minimizeActive);
    reg("window.maximize.active","Maximize active window",maximizeActive);
    reg("window.pin.active","Pin active window",pinActive);
    reg("window.snap.left","Snap active window left",function(){snapActive("left")});
    reg("window.snap.right","Snap active window right",function(){snapActive("right")});
    reg("window.split","Arrange windows in Split View",split);
    reg("desktop.environment.toggle","Desktop Environment",toggle);
    reg("desktop.environment.enable","Enable Desktop Environment",enable);
    reg("desktop.environment.disable","Disable Desktop Environment",disable);
    reg("desktop.window.current","Open current page in window",openCurrent);
    reg("desktop.window.close","Close active desktop window",closeActive);
    reg("desktop.window.minimize","Minimize active desktop window",minimizeActive);
    reg("desktop.window.maximize","Maximize active desktop window",maximizeActive);
    reg("desktop.window.snapLeft","Snap active window left",function(){snapActive("left")});
    reg("desktop.window.snapRight","Snap active window right",function(){snapActive("right")});
    reg("desktop.split","Split View",split);
    return true;
  }
  function bind(){
    document.addEventListener("click",function(event){
      var btn=event.target&&event.target.closest?event.target.closest("[data-wm-open]"):null;
      var current=event.target&&event.target.closest?event.target.closest("[data-wm-open-current]"):null;
      if(!btn&&!current)return;
      event.preventDefault();
      open(btn?btn.dataset.wmOpen:currentPage());
    });
    ["ethone:dashboard-ready","ethone:page-ready","ethone:boot-sequence-complete","ethone:lazy-group-loaded"].forEach(function(name){
      window.addEventListener(name,function(){registerActions();schedulePageButtons()});
    });
    if(document.readyState==="loading"){
      document.addEventListener("DOMContentLoaded",function(){registerActions();schedulePageButtons()},{once:true});
    }else{
      registerActions();
      schedulePageButtons();
    }
  }

  var api={
    load:load,
    enable:enable,
    disable:disable,
    toggle:toggle,
    open:open,
    detach:open,
    openCurrent:openCurrent,
    split:split,
    closeActive:closeActive,
    minimizeActive:minimizeActive,
    maximizeActive:maximizeActive,
    pinActive:pinActive,
    snapActive:snapActive,
    installControls:schedulePageButtons,
    available:function(){return !!window.ETHONEDesktop},
    state:function(){
      if(window.ETHONEDesktop&&typeof window.ETHONEDesktop.state==="function")return window.ETHONEDesktop.state();
      return {loaded:false,enabled:false};
    }
  };
  window.ETHONEWindowManager=api;
  try{if(window.Ethone&&typeof window.Ethone.define==="function")window.Ethone.define("windowManager",api)}catch(error){}
  bind();
})();
