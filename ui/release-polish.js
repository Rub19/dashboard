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
    if(typeof window.toast==="function"){
      try{window.toast(message,type||"info");return;}catch(e){}
    }
    var host=qs("#ethone-quality-toast");
    if(!host){
      host=document.createElement("div");
      host.id="ethone-quality-toast";
      document.body.appendChild(host);
    }
    var item=document.createElement("div");
    item.className="ethone-quality-toast-item";
    item.textContent=message;
    host.appendChild(item);
    setTimeout(function(){item.classList.add("leaving");setTimeout(function(){item.remove()},220)},2600);
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
      notify("Action indisponible pour le moment. Recharge ETHONE si le problème persiste.","warning");
      try{
        window.__ethoneMissingActionWarnings=(window.__ethoneMissingActionWarnings||[]).slice(-30);
        window.__ethoneMissingActionWarnings.push({handlers:missing,element:(el.textContent||el.title||el.id||"action").trim().slice(0,80),at:new Date().toISOString()});
      }catch(e){}
    },true);
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
