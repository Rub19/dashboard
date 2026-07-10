/* ETHONE Clarity Polish
   Normalizes icons, button semantics and heavyweight surfaces without touching app logic. */
(function(){
  "use strict";
  if(window.__ethoneClarityPolish)return;
  window.__ethoneClarityPolish=true;

  var scheduled=false;
  var renderedIcons=false;
  var HEAVY_PAGES=[
    "page-ai",
    "page-marketplace",
    "page-settings",
    "page-connections",
    "page-studio",
    "page-databases",
    "page-automation",
    "page-import",
    "page-gaming",
    "page-health",
    "page-versions"
  ];
  var ICON_SHELL_SELECTOR=[
    ".settings-nav-icon",
    ".sidebar-icon",
    ".nav-icon",
    ".os-nav-icon",
    ".dock-icon",
    ".app-icon",
    ".widget-row-icon",
    ".conn-icon",
    ".ih-logo",
    ".ih-mini-logo",
    ".ph-logo",
    ".ec-kicker",
    ".health-row > span:first-child",
    ".timeline-event-icon"
  ].join(",");
  var BUTTON_SELECTOR=[
    "button",
    ".btn",
    ".panel-action",
    ".item-btn",
    ".settings-action",
    ".settings-nav-item",
    ".aic-button",
    ".mp41-btn",
    ".ph-actions button",
    ".ih-plugin-actions button",
    ".health-hero-actions button",
    "[role='button']"
  ].join(",");
  var EMOJI_ICON_MAP={
    "\u2302":"house",
    "\u2713":"check",
    "\u2714":"check",
    "\u2728":"sparkles",
    "\u26A1":"zap",
    "\u26A0":"triangle-alert",
    "\u2699":"settings",
    "\u2692":"hammer",
    "\u2601":"cloud",
    "\u23F3":"hourglass",
    "\uD83C\uDFA8":"palette",
    "\uD83C\uDFAE":"gamepad-2",
    "\uD83C\uDF81":"gift",
    "\uD83C\uDFE0":"house",
    "\uD83C\uDF1F":"sparkles",
    "\uD83C\uDFB5":"music",
    "\uD83D\uDC41":"eye",
    "\uD83D\uDC64":"user-round",
    "\uD83D\uDCBB":"laptop",
    "\uD83D\uDCBE":"save",
    "\uD83D\uDCA1":"lightbulb",
    "\uD83D\uDCC1":"folder",
    "\uD83D\uDCC2":"folder-open",
    "\uD83D\uDCC4":"file-text",
    "\uD83D\uDCC5":"calendar-days",
    "\uD83D\uDCCA":"chart-no-axes-combined",
    "\uD83D\uDCDD":"file-pen-line",
    "\uD83D\uDD0D":"search",
    "\uD83D\uDD12":"lock",
    "\uD83D\uDD14":"bell",
    "\uD83D\uDD17":"plug",
    "\uD83D\uDD25":"flame",
    "\uD83D\uDDBC":"image",
    "\uD83D\uDCE6":"package",
    "\uD83D\uDECD":"shopping-bag",
    "\uD83D\uDEE0":"wrench",
    "\uD83E\uDDE0":"brain",
    "\uD83E\uDDE9":"blocks",
    "AI":"brain",
    "BR":"brain",
    "OS":"panel-top",
    "GG":"gamepad-2"
  };

  function qsa(selector,root){
    try{return Array.prototype.slice.call((root||document).querySelectorAll(selector));}
    catch(error){return [];}
  }

  function activeSurface(event){
    var page=event&&event.detail&&event.detail.page;
    if(page){
      var pageRoot=document.getElementById("page-"+page);
      if(pageRoot)return pageRoot;
    }
    var active=document.querySelector(".tab-content.active");
    if(active)return active;
    var auth=document.getElementById("auth-screen");
    if(auth&&getComputedStyle(auth).display!=="none")return auth;
    var profile=document.getElementById("profile-screen");
    if(profile&&getComputedStyle(profile).display!=="none")return profile;
    return document.getElementById("main-content")||document;
  }

  function leanRuntime(){
    try{
      return !!(
        window.ETHONE_STABLE_BOOT ||
        window.ETHONE_LIGHT_BOOT_MODE ||
        window.__ethoneLeanProductionBoot ||
        document.documentElement.dataset.ethoneStableBoot==="1"
      );
    }catch(error){return !!(window.ETHONE_STABLE_BOOT||window.ETHONE_LIGHT_BOOT_MODE||window.__ethoneLeanProductionBoot);}
  }

  function normalizeIconKey(text){
    return String(text||"")
      .replace(/[\uFE0E\uFE0F]/g,"")
      .replace(/\s+/g,"")
      .trim();
  }

  function lucideNameFromShell(shell){
    if(!shell)return "";
    var explicit=shell.getAttribute("data-icon")||shell.getAttribute("data-lucide");
    if(explicit)return explicit;
    var text=normalizeIconKey(shell.textContent);
    return EMOJI_ICON_MAP[text]||"";
  }

  function replaceEmojiIcons(root){
    qsa(ICON_SHELL_SELECTOR,root).forEach(function(shell){
      if(shell.dataset.clarityIcon==="1")return;
      if(shell.querySelector("[data-lucide],svg"))return;
      var icon=lucideNameFromShell(shell);
      if(!icon)return;
      shell.dataset.clarityIcon="1";
      shell.classList.add("ethone-clarity-icon");
      shell.innerHTML='<i data-lucide="'+icon+'" aria-hidden="true"></i>';
    });

    qsa(".settings-nav-item > span:first-child,.nav-item > span:first-child,.mob-nav-btn > span:first-child",root).forEach(function(shell){
      if(shell.dataset.clarityIcon==="1"||shell.querySelector("[data-lucide],svg"))return;
      var icon=lucideNameFromShell(shell);
      if(!icon)return;
      shell.dataset.clarityIcon="1";
      shell.classList.add("ethone-clarity-icon");
      shell.innerHTML='<i data-lucide="'+icon+'" aria-hidden="true"></i>';
    });
  }

  function readableLabel(el){
    var text=(el.textContent||"").replace(/\s+/g," ").trim();
    if(text)return text.slice(0,120);
    return (el.getAttribute("title")||el.getAttribute("data-action")||el.getAttribute("data-eh-action")||el.id||"Action").replace(/[-_.]+/g," ").trim();
  }

  function normalizeButtons(root){
    qsa(BUTTON_SELECTOR,root).forEach(function(btn){
      if(btn.tagName==="BUTTON"&&!btn.hasAttribute("type"))btn.type="button";
      if(btn.dataset.clarityButton!=="1"){
        btn.dataset.clarityButton="1";
        btn.classList.add("ethone-readable-button");
      }
      var hasVisibleText=(btn.textContent||"").replace(/\s+/g,"").trim().length>0;
      var hasIcon=!!btn.querySelector("[data-lucide],svg,.ethone-clarity-icon");
      if(hasIcon&&!hasVisibleText&&!btn.getAttribute("aria-label")){
        btn.setAttribute("aria-label",readableLabel(btn));
      }
      if(btn.matches(":disabled,[aria-disabled='true']")&&!btn.getAttribute("title")){
        btn.setAttribute("title","Fonctionnalite indisponible pour le moment");
      }
    });
  }

  function normalizeText(root){
    qsa(".nav-label-text,.settings-nav-item span:last-child,.panel-title,.settings-card-title,.conn-title,.game-card-title,.ph-card h3,.ih-head h3,.health-row strong,.version-release h3",root).forEach(function(el){
      if(el.dataset.clarityText==="1")return;
      el.dataset.clarityText="1";
      var text=(el.textContent||"").replace(/\s+/g," ").trim();
      if(text.length>22&&!el.title)el.title=text;
    });
  }

  function markHeavySurfaces(){
    HEAVY_PAGES.forEach(function(id){
      var el=document.getElementById(id);
      if(el)el.classList.add("ethone-heavy-surface");
    });
  }

  function applyLowPowerBudget(){
    var nav=navigator||{};
    var lowMemory=typeof nav.deviceMemory==="number"&&nav.deviceMemory<=4;
    var lowCpu=typeof nav.hardwareConcurrency==="number"&&nav.hardwareConcurrency<=4;
    var saveData=!!(nav.connection&&nav.connection.saveData);
    if(document.body)document.body.classList.toggle("ethone-clarity-low-power",!!(lowMemory||lowCpu||saveData));
  }

  function renderLucide(root){
    if(window.ETHONEIconSystem&&typeof window.ETHONEIconSystem.apply==="function"){
      try{window.ETHONEIconSystem.apply(root||document);renderedIcons=true;return}catch(error){}
    }
    if(renderedIcons)return;
    if(!window.lucide||window.__lucideFailed||typeof window.lucide.createIcons!=="function")return;
    try{
      window.lucide.createIcons({
        attrs:{
          "stroke-width":"1.9",
          "aria-hidden":"true",
          "focusable":"false"
        }
      });
      renderedIcons=true;
    }catch(error){}
  }

  function apply(root){
    root=root||document;
    applyLowPowerBudget();
    markHeavySurfaces();
    replaceEmojiIcons(root);
    normalizeButtons(root);
    normalizeText(root);
    renderLucide(root);
  }

  function schedule(root){
    if(scheduled)return;
    scheduled=true;
    setTimeout(function(){
      var run=function(){
        scheduled=false;
        apply(root||document);
      };
      if("requestIdleCallback" in window){
        try{requestIdleCallback(run,{timeout:500});return;}catch(error){}
      }
      requestAnimationFrame(run);
    },renderedIcons?180:60);
  }

  function boot(){
    apply(activeSurface());
    ["ethone:dashboard-ready","ethone:page-ready","ethone:boot-sequence-complete","ethone:theme-change","ethone:settings-change"].forEach(function(name){
      window.addEventListener(name,function(event){schedule(name==="ethone:dashboard-ready"?document:activeSurface(event))},{passive:true});
    });
    window.addEventListener("ethone:profile-ready",function(){schedule(document.getElementById("profile-screen")||document)},{passive:true});
    window.addEventListener("resize",applyLowPowerBudget,{passive:true});
    if(!leanRuntime()){
      try{
        if(window.ETHONEDOMRuntime&&typeof window.ETHONEDOMRuntime.subscribe==="function"){
          window.ETHONEDOMRuntime.subscribe("clarity-polish",function(){schedule(document)});
        }else{
          new MutationObserver(function(mutations){
            for(var i=0;i<mutations.length;i++){
              if(mutations[i].addedNodes&&mutations[i].addedNodes.length){schedule(document);return;}
            }
          }).observe(document.body,{childList:true,subtree:true});
        }
      }catch(error){}
    }
  }

  window.ETHONEClarityPolish={apply:apply,refresh:function(){schedule(document)}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
