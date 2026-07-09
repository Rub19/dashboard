/* ETHONE Release Polish: ergonomic/a11y/performance normalization only. */
(function(){
  "use strict";
  if(window.__ethoneReleasePolish)return;
  window.__ethoneReleasePolish=true;

  var qsa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var qs=function(s,r){return (r||document).querySelector(s)};
  var scheduled=false;
  var ignoredInlineNames={
    if:1,for:1,while:1,switch:1,return:1,const:1,let:1,var:1,new:1,
    setTimeout:1,clearTimeout:1,setInterval:1,clearInterval:1,
    preventDefault:1,stopPropagation:1,stopImmediatePropagation:1,
    querySelector:1,querySelectorAll:1,getElementById:1,closest:1,focus:1,click:1,
    add:1,remove:1,toggle:1,contains:1,trim:1
  };

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(function(){
      requestAnimationFrame(function(){
        scheduled=false;
        if(document.body&&document.body.classList.contains("ethone-dashboard-booting"))return schedule();
        apply();
      });
    },document.body&&document.body.classList.contains("ethone-dashboard-booting")?520:180);
  }

  function detectInputMode(){
    document.addEventListener("keydown",function(e){
      if(e.key==="Tab"||e.key==="ArrowUp"||e.key==="ArrowDown"||e.key==="ArrowLeft"||e.key==="ArrowRight"){
        document.documentElement.classList.add("ethone-keyboard-nav");
      }
    },true);
    document.addEventListener("pointerdown",function(){
      document.documentElement.classList.remove("ethone-keyboard-nav");
    },true);
  }

  function applyPerformanceBudget(){
    var nav=navigator||{};
    var lowMemory=typeof nav.deviceMemory==="number"&&nav.deviceMemory<=4;
    var lowCpu=typeof nav.hardwareConcurrency==="number"&&nav.hardwareConcurrency<=4;
    var saveData=!!(nav.connection&&nav.connection.saveData);
    document.body.classList.toggle("ethone-low-power",!!(lowMemory||lowCpu||saveData));
  }

  function ensureToastHost(){
    var host=qs("#ethone-quality-toast");
    if(!host){
      host=document.createElement("div");
      host.id="ethone-quality-toast";
      host.setAttribute("aria-live","polite");
      host.setAttribute("aria-relevant","additions text");
      document.body.appendChild(host);
    }
    return host;
  }

  function installToastSystem(){
    if(window.__ethoneToastSystem)return;
    window.__ethoneToastSystem=true;
    var active={};
    var timers=new WeakMap();
    var maxToasts=5;
    function close(item){
      if(!item||item.classList.contains("leaving"))return;
      item.classList.add("leaving");
      var key=item.dataset.toastKey;
      if(key)delete active[key];
      var timer=timers.get(item);
      if(timer)clearTimeout(timer);
      setTimeout(function(){if(item.parentNode)item.parentNode.removeChild(item)},220);
    }
    function arm(item,duration){
      var timer=timers.get(item);
      if(timer)clearTimeout(timer);
      timers.set(item,setTimeout(function(){close(item)},duration));
    }
    function iconFor(type){
      if(type==="success")return "OK";
      if(type==="warning")return "!";
      if(type==="error")return "!";
      return "i";
    }
    function render(message,type,options){
      message=String(message||"").trim();
      if(!message)return null;
      type=type==="success"||type==="warning"||type==="error"?" "+type:" info";
      var cleanType=type.trim();
      options=options||{};
      var duration=typeof options.duration==="number"?options.duration:(cleanType==="error"?7200:4200);
      var key=(cleanType+"|"+message).toLowerCase();
      var existing=active[key];
      if(existing&&existing.parentNode){
        var count=(parseInt(existing.dataset.toastCount||"1",10)||1)+1;
        existing.dataset.toastCount=String(count);
        var countEl=existing.querySelector(".ethone-toast-count");
        if(countEl){
          countEl.textContent="x"+count;
          countEl.hidden=false;
        }
        existing.classList.remove("leaving");
        arm(existing,duration);
        return existing;
      }
      var host=ensureToastHost();
      var item=document.createElement("div");
      item.className="ethone-quality-toast-item ethone-toast-"+cleanType;
      item.dataset.toastKey=key;
      item.dataset.toastCount="1";
      item.setAttribute("role",cleanType==="error"?"alert":"status");
      var icon=document.createElement("span");
      icon.className="ethone-toast-icon";
      icon.textContent=iconFor(cleanType);
      var text=document.createElement("span");
      text.className="ethone-toast-text";
      text.textContent=message;
      var countBadge=document.createElement("span");
      countBadge.className="ethone-toast-count";
      countBadge.hidden=true;
      var closeBtn=document.createElement("button");
      closeBtn.type="button";
      closeBtn.className="ethone-toast-close";
      closeBtn.setAttribute("aria-label","Fermer la notification");
      closeBtn.textContent="x";
      closeBtn.addEventListener("click",function(event){
        event.preventDefault();
        close(item);
      });
      item.appendChild(icon);
      item.appendChild(text);
      item.appendChild(countBadge);
      item.appendChild(closeBtn);
      active[key]=item;
      host.appendChild(item);
      qsa(".ethone-quality-toast-item",host).slice(0,-maxToasts).forEach(close);
      arm(item,duration);
      try{window.dispatchEvent(new CustomEvent("ethone:toast",{detail:{message:message,type:cleanType}}))}catch(e){}
      return item;
    }
    window.ethoneToast=render;
    window.toast=render;
  }

  function loadLazyGroup(group){
    if(window.ETHONELazyModules&&typeof window.ETHONELazyModules.load==="function"){
      return Promise.resolve(window.ETHONELazyModules.load(group));
    }
    return Promise.reject(new Error("ETHONE lazy loader unavailable"));
  }

  function installWidgetPanelProxy(){
    if(window.__ethoneWidgetPanelProxy)return;
    window.__ethoneWidgetPanelProxy=true;
    var loading=false;
    function isSafeMode(){
      try{return new URLSearchParams(location.search||"").get("safe")==="1"}catch(e){return false}
    }
    function desiredOpen(force){
      if(typeof force==="boolean")return force;
      var shell=qs("#app-shell");
      var panel=qs("#live-panel");
      if(window.innerWidth<=1200&&panel)return !panel.classList.contains("mobile-open");
      if(document.body&&!document.body.classList.contains("ethone-widgets-panel-enabled"))return true;
      if(shell)return shell.classList.contains("live-panel-retracted");
      return localStorage.getItem("ethone:widgets-panel-open")!=="1";
    }
    function setBusy(busy){
      qsa("#live-panel-toggle-btn,#live-panel-retract-btn,#live-panel-add-btn,#live-panel-manage-btn").forEach(function(btn){
        btn.classList.toggle("ethone-loading-inline",!!busy);
        btn.setAttribute("aria-busy",busy?"true":"false");
      });
    }
    function ensureLoaded(openAfter,callback){
      if(isSafeMode()){
        notify("Le panneau Widgets est desactive en Safe Mode.","info");
        return Promise.resolve(false);
      }
      if(loading)return Promise.resolve(false);
      loading=true;
      setBusy(true);
      if(typeof openAfter==="boolean"){
        try{localStorage.setItem("ethone:widgets-panel-open",openAfter?"1":"0")}catch(e){}
      }
      return loadLazyGroup("widgets").then(function(){
        loading=false;
        setBusy(false);
        if(document.body)document.body.classList.remove("ethone-emergency-minimal");
        if(typeof callback==="function")callback();
        return true;
      }).catch(function(){
        loading=false;
        setBusy(false);
        notify("Impossible de charger le panneau Widgets pour le moment.","warning");
        return false;
      });
    }
    function proxyToggle(force){
      var current=window.toggleLivePanel;
      if(current&&current!==proxyToggle)return current(force);
      var open=desiredOpen(force);
      return ensureLoaded(open,function(){
        if(typeof window.toggleLivePanel==="function"&&window.toggleLivePanel!==proxyToggle){
          window.toggleLivePanel(open);
        }
      });
    }
    function proxyPicker(kind){
      var real=kind==="manager"?window.openLivePanelManager:window.openLivePanelAddPicker;
      var self=kind==="manager"?proxyManager:proxyAdd;
      if(typeof real==="function"&&real!==self)return real();
      return ensureLoaded(true,function(){
        var fn=kind==="manager"?window.openLivePanelManager:window.openLivePanelAddPicker;
        if(typeof fn==="function"&&fn!==self)fn();
      });
    }
    function proxyAdd(){return proxyPicker("add")}
    function proxyManager(){return proxyPicker("manager")}
    proxyAdd.__ethoneProxy=true;
    proxyManager.__ethoneProxy=true;
    if(typeof window.toggleLivePanel!=="function")window.toggleLivePanel=proxyToggle;
    if(typeof window.openLivePanelAddPicker!=="function")window.openLivePanelAddPicker=proxyAdd;
    if(typeof window.openLivePanelManager!=="function")window.openLivePanelManager=proxyManager;
  }

  function normalizeButtons(){
    qsa("button:not([type])").forEach(function(btn){btn.type="button"});
    qsa("button,.btn,.panel-action,.item-btn,.cat-tab,.settings-nav-item,.nav-item,[role='button']").forEach(function(el){
      if(el.dataset.releasePolished)return;
      el.dataset.releasePolished="1";
      el.addEventListener("pointerdown",function(){
        if(el.matches(":disabled,[aria-disabled='true']"))return;
        el.classList.add("ethone-pressing");
      },{passive:true});
      ["pointerup","pointercancel","pointerleave","blur"].forEach(function(type){
        el.addEventListener(type,function(){el.classList.remove("ethone-pressing")},{passive:true});
      });
    });
  }

  function notify(message,type){
    if(String(message||"").toLowerCase().indexOf("action indisponible")!==-1){
      message="Fonctionnalite bientot disponible ou module en cours de chargement.";
      type=type==="error"?"info":type;
    }
    if(typeof window.ethoneToast==="function"){
      try{window.ethoneToast(message,type||"info");return;}catch(e){}
    }
    if(typeof window.toast==="function"){
      try{window.toast(message,type||"info");return;}catch(e){}
    }
    installToastSystem();
    try{window.ethoneToast(message,type||"info")}catch(e){}
  }

  function inlineActionNames(code){
    var names=[];
    String(code||"").replace(/(^|[^\.\w$])([A-Za-z_$][\w$]*)\s*\(/g,function(_,prefix,name){
      if(!ignoredInlineNames[name]&&names.indexOf(name)===-1)names.push(name);
      return _;
    });
    return names;
  }

  function installActionGuard(){
    if(installActionGuard.done)return;
    installActionGuard.done=true;
    document.addEventListener("click",function(event){
      var el=event.target&&event.target.closest&&event.target.closest("[onclick]");
      if(!el||el.dataset.allowMissingHandler==="1")return;
      var names=inlineActionNames(el.getAttribute("onclick"));
      var missing=names.filter(function(name){return typeof window[name]!=="function"});
      if(!missing.length)return;
      event.preventDefault();
      event.stopPropagation();
      el.classList.add("ethone-action-unavailable");
      setTimeout(function(){el.classList.remove("ethone-action-unavailable")},700);
      notify("Fonctionnalite bientot disponible ou module en cours de chargement.","info");
      try{
        window.__ethoneMissingActionWarnings=(window.__ethoneMissingActionWarnings||[]).slice(-30);
        window.__ethoneMissingActionWarnings.push({handlers:missing,element:(el.textContent||el.title||el.id||"action").trim().slice(0,80),at:new Date().toISOString()});
      }catch(e){}
    },true);
  }

  function installProfileContextMenu(){
    if(installProfileContextMenu.done)return;
    installProfileContextMenu.done=true;
    function closeMenu(){
      var menu=qs("#ethone-profile-context-menu");
      if(menu)menu.remove();
    }
    function run(id){
      var A=window.Ethone&&window.Ethone.get&&window.Ethone.get("actions");
      if(A&&typeof A.dispatch==="function")return A.dispatch(id,{source:"profile-context-menu"});
      if(id==="settings.open"&&typeof window.switchPage==="function")return window.switchPage("settings",null);
      if(id==="profile.switch"&&typeof window.goToProfileScreen==="function")return window.goToProfileScreen();
      if(id==="auth.signout"&&typeof window.signOut==="function")return window.signOut();
      notify("Fonctionnalite bientot disponible.","info");
    }
    document.addEventListener("contextmenu",function(event){
      var profile=event.target&&event.target.closest&&event.target.closest("#os-sidebar-profile");
      if(!profile)return;
      event.preventDefault();
      closeMenu();
      var rect=profile.getBoundingClientRect();
      var menu=document.createElement("div");
      menu.id="ethone-profile-context-menu";
      menu.className="ethone-profile-context-menu";
      menu.innerHTML=[
        '<button type="button" data-action="profile.switch"><span>Profil</span></button>',
        '<button type="button" data-action="settings.open"><span>Parametres</span></button>',
        '<button type="button" data-action="auth.signout"><span>Deconnexion</span></button>'
      ].join("");
      menu.style.left=Math.min(rect.right+8,window.innerWidth-190)+"px";
      menu.style.bottom=Math.max(12,window.innerHeight-rect.bottom)+"px";
      document.body.appendChild(menu);
      qsa("button",menu).forEach(function(btn){
        btn.addEventListener("click",function(e){
          e.preventDefault();
          var id=btn.getAttribute("data-action");
          closeMenu();
          run(id);
        });
      });
    });
    document.addEventListener("click",function(event){
      if(!event.target.closest||!event.target.closest("#ethone-profile-context-menu"))closeMenu();
    },true);
    document.addEventListener("keydown",function(event){if(event.key==="Escape")closeMenu()});
  }

  function normalizeTextOverflow(){
    qsa(".nav-label-text,.conn-title,.conn-subtitle,.game-card-title,.game-card-sub,.panel-title,.settings-card-title,.db-cell,.timeline-event-title").forEach(function(el){
      el.classList.add("ethone-text-guard");
      if(!el.title){
        var text=(el.textContent||"").trim().replace(/\s+/g," ");
        if(text.length>24)el.title=text;
      }
    });
  }

  function normalizeLoadingStates(){
    qsa(".db-boot-placeholder,.loading,.skeleton,[data-loading='true']").forEach(function(el){
      el.classList.add("ethone-skeleton");
      if(!el.getAttribute("aria-live"))el.setAttribute("aria-live","polite");
    });
    qsa("[aria-busy='true']").forEach(function(el){
      el.classList.add("ethone-skeleton");
    });
  }

  function normalizeKeyboardNavigation(){
    qsa("#sidebar-nav-main,#sidebar-nav-account,.settings-nav,.cat-tabs,.ui-tabs").forEach(function(group){
      if(group.dataset.releaseKeys)return;
      group.dataset.releaseKeys="1";
      group.addEventListener("keydown",function(e){
        if(e.key!=="ArrowDown"&&e.key!=="ArrowUp"&&e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
        var items=qsa("button,[role='tab'],[role='button'],.nav-item,.settings-nav-item,.cat-tab",group).filter(function(el){
          return !el.hidden&&getComputedStyle(el).display!=="none"&&!el.disabled;
        });
        if(items.length<2)return;
        var current=document.activeElement;
        var idx=items.indexOf(current);
        if(idx<0)idx=items.findIndex(function(el){return el.classList.contains("active")||el.getAttribute("aria-selected")==="true"||el.getAttribute("aria-current")==="page"});
        if(idx<0)idx=0;
        var next=(e.key==="ArrowDown"||e.key==="ArrowRight")?idx+1:idx-1;
        if(next<0)next=items.length-1;
        if(next>=items.length)next=0;
        e.preventDefault();
        items[next].focus({preventScroll:false});
      });
    });
  }

  function normalizeClickableSemantics(){
    qsa("[onclick]").forEach(function(el){
      if(!/^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName)){
        if(!el.getAttribute("role"))el.setAttribute("role","button");
        if(!el.hasAttribute("tabindex"))el.tabIndex=0;
      }
      if(!el.getAttribute("aria-label")){
        var text=(el.textContent||el.title||"").trim().replace(/\s+/g," ");
        if(text)el.setAttribute("aria-label",text.slice(0,120));
      }
    });
    qsa(".modal-overlay,.sidebar-overlay,#notif-overlay,#live-panel-mobile-overlay").forEach(function(el){
      el.setAttribute("aria-hidden",el.classList.contains("open")?"false":"true");
      el.setAttribute("role","presentation");
      el.removeAttribute("tabindex");
    });
  }

  function normalizeHiddenPages(){
    qsa(".tab-content[id^='page-']").forEach(function(page){
      var active=page.classList.contains("active")||page.classList.contains("de-window-page");
      page.setAttribute("aria-hidden",active?"false":"true");
      if(!page.getAttribute("tabindex"))page.setAttribute("tabindex","-1");
    });
  }

  function normalizeExternalLinks(){
    qsa('a[target="_blank"]').forEach(function(a){
      var rel=(a.getAttribute("rel")||"").split(/\s+/);
      ["noopener","noreferrer"].forEach(function(token){if(rel.indexOf(token)===-1)rel.push(token)});
      a.setAttribute("rel",rel.filter(Boolean).join(" "));
    });
  }

  function normalizeScrollSurfaces(){
    qsa("#main-sidebar,#sidebar-nav-main,#sidebar-nav-account,#main-content,.live-panel-body,.de-window-body").forEach(function(el){
      el.classList.add("ethone-scroll-surface");
    });
    if(document.documentElement.scrollWidth>document.documentElement.clientWidth+2){
      document.documentElement.classList.add("ethone-overflow-guard");
    }else{
      document.documentElement.classList.remove("ethone-overflow-guard");
    }
  }

  function report(){
    var duplicateIds={};
    qsa("[id]").forEach(function(el){duplicateIds[el.id]=(duplicateIds[el.id]||0)+1});
    var missingActions=qsa("[onclick]").map(function(el){
      var missing=inlineActionNames(el.getAttribute("onclick")).filter(function(name){return typeof window[name]!=="function"});
      return missing.length?{element:el.id||el.className||el.tagName,missing:missing}:null;
    }).filter(Boolean);
    var unlabeled=qsa("button,[role='button']").filter(function(el){return !((el.textContent||"").trim())&&!el.getAttribute("aria-label")&&!el.title});
    return {
      duplicateIds:Object.keys(duplicateIds).filter(function(id){return duplicateIds[id]>1}).map(function(id){return {id:id,count:duplicateIds[id]}}),
      missingActions:missingActions.slice(0,60),
      unlabeledControls:unlabeled.length,
      horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
      pages:qsa(".tab-content[id^='page-']").length
    };
  }

  function apply(){
    installToastSystem();
    installWidgetPanelProxy();
    installProfileContextMenu();
    applyPerformanceBudget();
    normalizeButtons();
    normalizeTextOverflow();
    normalizeLoadingStates();
    normalizeKeyboardNavigation();
    normalizeClickableSemantics();
    normalizeHiddenPages();
    normalizeExternalLinks();
    normalizeScrollSurfaces();
  }

  function boot(){
    detectInputMode();
    installToastSystem();
    installWidgetPanelProxy();
    installProfileContextMenu();
    installActionGuard();
    apply();
    window.addEventListener("ethone:dashboard-ready",schedule);
    window.addEventListener("ethone:page-ready",schedule);
    window.addEventListener("resize",schedule,{passive:true});
    document.addEventListener("click",schedule,true);
    try{new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}catch(e){}
  }

  window.ethoneReleasePolish={apply:apply,report:report};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
