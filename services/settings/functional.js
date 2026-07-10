/* ETHONE Settings Functional Layer
   Makes Appearance/Settings controls real across the app: apply immediately,
   persist through profile state/localStorage, and restore after refresh. */
(function(){
  "use strict";
  if(window.__ethoneSettingsFunctionalReady)return;
  window.__ethoneSettingsFunctionalReady=true;

  var DEFAULTS={
    accent:"#8b5cf6",
    fontFamily:"inter",
    density:"comfortable",
    motion:1,
    radius:1,
    blur:1,
    glow:1,
    opacity:1,
    sidebarWidth:260
  };

  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function save(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function theme(){
    var p=profile();
    if(!p)return Object.assign({},DEFAULTS);
    if(!p.theme)p.theme={};
    p.theme=Object.assign({},DEFAULTS,p.theme);
    return p.theme;
  }
  function root(){return document.documentElement}
  function clamp(n,min,max,fallback){n=parseFloat(n);return isNaN(n)?fallback:Math.max(min,Math.min(max,n))}
  function hexToRgb(hex){
    hex=String(hex||DEFAULTS.accent);
    if(hex.length===4)hex="#"+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
    if(!/^#[0-9a-fA-F]{6}$/.test(hex))hex=DEFAULTS.accent;
    return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)].join(",");
  }
  function setVar(name,value){root().style.setProperty(name,String(value),"important")}
  function fontStack(id){
    if(id==="grotesk")return "Syne, Inter, ui-sans-serif, system-ui, sans-serif";
    if(id==="system")return "-apple-system, BlinkMacSystemFont, Segoe UI, Inter, ui-sans-serif, system-ui, sans-serif";
    if(id==="mono")return "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    if(id==="serif")return "ui-serif, Georgia, Cambria, Times New Roman, Times, serif";
    return "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  }
  function densityMap(id){
    if(id==="compact")return {density:.74,spacing:11,xs:4,sm:7,md:11,lg:16};
    if(id==="cozy")return {density:.88,spacing:14,xs:5,sm:9,md:14,lg:20};
    return {density:1,spacing:16,xs:6,sm:10,md:16,lg:24};
  }
  function applyFunctionalVars(){
    var p=profile();
    var hasProfileSidebarWidth=!!(p&&p.theme&&p.theme.sidebarWidth!=null);
    var storedSidebarWidth=null;
    try{storedSidebarWidth=localStorage.getItem("sb_width")}catch(e){}
    var t=theme(),r=root();
    var accent=(p&&p.customAccent)||t.customAccent||getComputedStyle(r).getPropertyValue("--accent").trim()||DEFAULTS.accent;
    var rgb=hexToRgb(accent);
    var radius=clamp(t.radius,.5,1.6,1),blur=clamp(t.blur,0,1.6,1),glow=clamp(t.glow,0,1.6,1),motion=clamp(t.motion,0,1,1),opacity=clamp(t.opacity,.72,1,1);
    var d=densityMap(t.density);

    setVar("--primary",accent);
    setVar("--primary-hover",accent);
    setVar("--primary-active",accent);
    setVar("--primary-rgb",rgb);
    setVar("--primary-hover-rgb",rgb);
    setVar("--primary-active-rgb",rgb);
    setVar("--accent",accent);
    setVar("--eh-accent",accent);
    setVar("--accent-light",accent);
    setVar("--accent-hover",accent);
    setVar("--accent-rgb",rgb);
    setVar("--eh-accent-rgb",rgb);
    setVar("--accent2",accent);
    setVar("--accent3",accent);
    setVar("--accent-glow","rgba("+rgb+","+(0.25*glow).toFixed(3)+")");
    setVar("--accent-subtle","rgba("+rgb+",.10)");
    setVar("--accent-soft","rgba("+rgb+",.13)");
    setVar("--accent-border","rgba("+rgb+",.32)");
    setVar("--grad-primary","linear-gradient(135deg,rgb("+rgb+"),rgb("+rgb+"))");
    setVar("--grad-accent","linear-gradient(135deg,rgb("+rgb+"),rgb("+rgb+"))");
    setVar("--grad-card","linear-gradient(135deg,rgba("+rgb+",.08),rgba("+rgb+",.04))");

    var stack=fontStack(t.fontFamily);
    setVar("--font",stack);
    setVar("--font-display",stack);
    setVar("--font-heading",stack);
    setVar("--density",d.density);
    setVar("--spacing",d.spacing+"px");
    setVar("--spacing-xs",d.xs+"px");
    setVar("--spacing-sm",d.sm+"px");
    setVar("--spacing-md",d.md+"px");
    setVar("--spacing-lg",d.lg+"px");
    setVar("--eh-grid",d.xs+"px");
    setVar("--theme-radius-scale",radius);
    setVar("--radius",Math.round(16*radius)+"px");
    setVar("--radius-xs",Math.round(6*radius)+"px");
    setVar("--radius-sm",Math.round(10*radius)+"px");
    setVar("--radius-md",Math.round(14*radius)+"px");
    setVar("--radius-lg",Math.round(20*radius)+"px");
    setVar("--radius-xl",Math.round(26*radius)+"px");
    setVar("--eh-radius-sm",Math.round(10*radius)+"px");
    setVar("--eh-radius",Math.round(16*radius)+"px");
    setVar("--eh-radius-lg",Math.round(20*radius)+"px");
    setVar("--r-sm",Math.round(10*radius)+"px");
    setVar("--r-md",Math.round(14*radius)+"px");
    setVar("--r-lg",Math.round(20*radius)+"px");
    setVar("--theme-blur-scale",blur);
    setVar("--blur",Math.round(24*blur)+"px");
    setVar("--glass-blur","calc(18px * var(--theme-blur-scale))");
    setVar("--glass-overlay-blur","var(--glass-blur)");
    setVar("--glass-saturation","1.16");
    setVar("--glass-brightness","1.02");
    setVar("--glass-filter","blur(var(--glass-blur)) saturate(var(--glass-saturation)) brightness(var(--glass-brightness))");
    setVar("--glass-filter-overlay","blur(var(--glass-overlay-blur)) saturate(var(--glass-saturation)) brightness(var(--glass-brightness))");
    setVar("--theme-glow-scale",glow);
    setVar("--glow",glow);
    setVar("--theme-surface-opacity",opacity);
    setVar("--surface-opacity",opacity);
    setVar("--glass-card-opacity",Math.max(.68,Math.min(.92,opacity*.82)).toFixed(3));
    setVar("--glass-panel-opacity",Math.max(.72,Math.min(.94,opacity*.86)).toFixed(3));
    setVar("--glass-raised-opacity",Math.max(.78,Math.min(.96,opacity*.90)).toFixed(3));
    setVar("--glass-overlay-opacity",Math.max(.46,Math.min(.72,opacity*.66)).toFixed(3));
    setVar("--glass-overlay-opacity-soft",Math.max(.34,Math.min(.58,opacity*.52)).toFixed(3));
    setVar("--glass-surface","linear-gradient(180deg,rgba(var(--surface-2-rgb),var(--glass-card-opacity)),rgba(var(--surface-1-rgb),var(--glass-card-opacity)))");
    setVar("--glass-surface-flat","rgba(var(--surface-1-rgb),var(--glass-card-opacity))");
    setVar("--glass-surface-panel","linear-gradient(180deg,rgba(var(--surface-2-rgb),var(--glass-panel-opacity)),rgba(var(--surface-1-rgb),var(--glass-panel-opacity)))");
    setVar("--glass-surface-raised","linear-gradient(180deg,rgba(var(--surface-3-rgb),var(--glass-raised-opacity)),rgba(var(--surface-1-rgb),var(--glass-raised-opacity)))");
    setVar("--glass-control","rgba(var(--surface-3-rgb),"+Math.max(.64,Math.min(.86,opacity*.74)).toFixed(3)+")");
    setVar("--glass-border","rgba(var(--color-white-rgb),.095)");
    setVar("--glass-border-strong","rgba(var(--color-white-rgb),.15)");
    setVar("--glass-shadow","0 22px 70px rgba(var(--color-black-rgb),.36), inset 0 1px 0 rgba(var(--color-white-rgb),.055)");
    setVar("--glass-shadow-soft","0 12px 38px rgba(var(--color-black-rgb),.24), inset 0 1px 0 rgba(var(--color-white-rgb),.045)");
    setVar("--glass-page-bg","radial-gradient(circle at 18% -12%,rgba(var(--primary-rgb),.11),transparent 34%),radial-gradient(circle at 84% 0%,rgba(var(--primary-active-rgb),.07),transparent 30%),linear-gradient(180deg,var(--surface-0),rgba(var(--surface-0-rgb),.985))");
    setVar("--surface-1","rgba(var(--surface-1-rgb),"+opacity+")");
    setVar("--surface-2","rgba(var(--surface-2-rgb),"+opacity+")");
    setVar("--surface-3","rgba(var(--surface-3-rgb),"+opacity+")");
    setVar("--surface","var(--surface-1)");
    setVar("--eh-surface","var(--surface-1)");
    setVar("--eh-surface-2","var(--surface-2)");
    setVar("--eh-surface-3","var(--surface-3)");
    setVar("--border","rgba(var(--color-white-rgb),.11)");
    setVar("--border-primary","var(--border)");
    setVar("--border-secondary","rgba(var(--color-white-rgb),.07)");
    setVar("--eh-stroke","var(--border-primary)");
    setVar("--eh-stroke-strong","var(--border-secondary)");
    setVar("--theme-motion-scale",motion);

    r.classList.toggle("ethone-motion-off",motion<=0.06);
    r.classList.toggle("ethone-motion-reduced",motion>0.06&&motion<0.75);
    r.dataset.ethoneDensity=t.density||"comfortable";
    r.dataset.ethoneFont=t.fontFamily||"inter";

    if(!p||!p.sidebarCompact){
      var widthSource=hasProfileSidebarWidth?t.sidebarWidth:(storedSidebarWidth||t.sidebarWidth);
      var width=clamp(widthSource,220,340,260);
      t.sidebarWidth=width;
      setVar("--sidebar-w",Math.round(width)+"px");
      try{localStorage.setItem("sb_width",String(Math.round(width)))}catch(e){}
    }
  }

  function applyEngine(){
    var t=theme();
    if(window.ETHONEThemeEngine&&typeof window.ETHONEThemeEngine.apply==="function")window.ETHONEThemeEngine.apply(t);
    applyFunctionalVars();
  }

  function syncSettingsUi(){
    var t=theme(),p=profile();
    var lang=(window._lang||localStorage.getItem("nexus_lang")||localStorage.getItem("ethone_lang")||"fr").slice(0,2);
    document.querySelectorAll("#general-lang-seg button").forEach(function(btn){btn.classList.toggle("active",btn.dataset.val===lang)});
    var sw=document.getElementById("theme-sidebar-width");
    if(sw)sw.value=Math.round(t.sidebarWidth||260);
    var swv=document.getElementById("theme-sidebar-width-val");
    if(swv)swv.textContent=(sw?sw.value:(t.sidebarWidth||260))+"px";
    var compact=document.getElementById("theme-compact-toggle");
    if(compact)compact.checked=!!(p&&p.sidebarCompact);
    var notif=document.getElementById("notif-btn");
    if(notif&&"Notification" in window){
      notif.textContent=Notification.permission==="granted"?"Notifications ON":"Enable notifications";
      notif.classList.toggle("is-ready",Notification.permission==="granted");
    }
  }

  function markLimitedOptions(){
    if(window.ETHONEComingSoon&&typeof window.ETHONEComingSoon.scan==="function"){
      window.ETHONEComingSoon.scan(document);
      return;
    }
    document.querySelectorAll("[data-coming-soon]").forEach(function(el){
      if(el.dataset.comingSoonReady==="1")return;
      el.dataset.comingSoonReady="1";
      el.setAttribute("aria-disabled","true");
      el.classList.add("ethone-coming-soon");
      if(el.querySelector(".ethone-coming-soon-badge,.ethone-coming-soon-chip"))return;
      var badge=document.createElement("span");
      badge.className="ethone-coming-soon-badge";
      badge.textContent="Coming Soon";
      el.appendChild(badge);
    });
  }

  function installStyle(){
    if(document.getElementById("ethone-settings-functional-style"))return;
    var style=document.createElement("style");
    style.id="ethone-settings-functional-style";
    style.textContent=[
      ":root{--density:1;--spacing:16px;--spacing-xs:6px;--spacing-sm:10px;--spacing-md:16px;--spacing-lg:24px;--blur:24px;--glow:1;--surface-opacity:1}",
      "body,.main,.sidebar,.panel,.settings-card,.stat-card,.modal,.btn,input,textarea,select{font-family:var(--font)!important}",
      "body :where(button,input,textarea,select,p,span,div,h1,h2,h3,h4,h5,h6,label,a,strong,small,time){font-family:var(--font)!important}",
      ".panel,.settings-card,.stat-card,.modal,.conn-card,.game-card,.goal-card,.journal-entry,.countdown-card,.kanban-col,.note-item{border-radius:var(--radius-lg)!important;background-color:color-mix(in srgb,var(--surface-1,rgba(18,18,24,.92)) calc(var(--surface-opacity)*100%),transparent)!important}",
      ".btn,.panel-action,.modal-input,input:not([type='checkbox']):not([type='radio']),textarea,select,.cat-tab,.nav-item{border-radius:var(--radius-md)!important}",
      ".main{gap:var(--spacing-md)!important}.grid-2,.grid-3,.grid-widgets,#overview-grid-main,.settings-content{gap:var(--spacing-md)!important}",
      "html[data-ethone-density='compact'] .panel,html[data-ethone-density='compact'] .settings-card,html[data-ethone-density='compact'] .stat-card{padding:calc(var(--spacing-md) + 1px)!important}",
      "html[data-ethone-density='cozy'] .panel,html[data-ethone-density='cozy'] .settings-card,html[data-ethone-density='cozy'] .stat-card{padding:calc(var(--spacing-md) + 3px)!important}",
      ".sidebar,.modal,.cmd-palette,.command-palette,#cmd-palette,.live-panel{backdrop-filter:blur(var(--blur)) saturate(1.18)!important;-webkit-backdrop-filter:blur(var(--blur)) saturate(1.18)!important}",
      ".btn-primary,.nav-item.active,.theme-preset-card.active{box-shadow:0 calc(10px * var(--glow)) calc(28px * var(--glow)) rgba(var(--accent-rgb),.20)!important}",
      ".btn-primary,.logo-icon,.nav-badge,.todo-check.checked,.habit-day.done,.cal-day.today,.ai-send-btn,.ai-avatar.nexus,.xp-bar-fill,.xp-bar-fill-v2{background:var(--grad-primary)!important}",
      ".panel-action:hover,.item-btn:hover,.kanban-add-btn:hover,.habit-day.today,.mob-nav-btn.active,.switch-hint,.section-eyebrow{color:var(--accent)!important}",
      ".search-bar:focus-within,.modal-input:focus,input:focus,textarea:focus,select:focus{border-color:var(--accent-border)!important;box-shadow:0 0 0 3px rgba(var(--accent-rgb),.10)!important}",
      "html.ethone-motion-off *,html.ethone-motion-off *::before,html.ethone-motion-off *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}",
      "html.ethone-motion-reduced *,html.ethone-motion-reduced *::before,html.ethone-motion-reduced *::after{animation-duration:.01ms!important;transition-duration:.12s!important}",
      ".ethone-coming-soon{opacity:.72;position:relative}.ethone-coming-soon-badge{margin-left:8px;font-size:10px;font-weight:800;color:var(--muted2);border:1px solid var(--border2);border-radius:999px;padding:2px 7px}"
    ].join("\\n");
    document.head.appendChild(style);
  }

  function patchLanguage(){
    if(window.setLang&& !window.setLang.__settingsFunctionalWrapped){
      var old=window.setLang;
      window.setLang=function(lang){
        var result=old.apply(this,arguments);
        try{if(window.ETHONEStateConsistency&&window.ETHONEStateConsistency.setLanguage)window.ETHONEStateConsistency.setLanguage(lang)}catch(e){}
        try{localStorage.setItem("nexus_lang",lang);localStorage.setItem("ethone_lang",lang)}catch(e){}
        setTimeout(function(){syncSettingsUi();if(window.ethoneApplyFullTranslations)window.ethoneApplyFullTranslations()},40);
        return result;
      };
      window.setLang.__settingsFunctionalWrapped=true;
    }
  }

  function init(){
    installStyle();
    patchLanguage();
    applyEngine();
    syncSettingsUi();
    markLimitedOptions();
  }

  window.ETHONESettingsFunctional={
    apply:init,
    applyVars:applyFunctionalVars,
    sync:syncSettingsUi
  };

  window.addEventListener("ethone:theme-changed",function(){setTimeout(init,0)});
  window.addEventListener("ethone:page-ready",function(){setTimeout(init,60)});
  window.addEventListener("ethone:workspace-change",function(){setTimeout(init,60)});
  window.addEventListener("storage",function(event){if(/^sb_width|nexus_lang|ethone_lang$/.test(event.key||""))setTimeout(init,0)});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(init,180)},{once:true});
  else setTimeout(init,0);
  setTimeout(init,900);
})();
