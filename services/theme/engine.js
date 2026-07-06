/* ETHONE V25 — Theme Engine core. Reads/writes p.theme (a profile-level object,
   same convention as p.themeIdx/p.sidebarCompact), applies every axis to the
   CSS custom properties added in ui/tokens.css, and persists via saveStateNow().
   Accent color and sidebar width/compact stay on their existing mechanisms
   (services/theme/legacy.js, pages/dashboard/resizable-sidebar.js,
   pages/dashboard/init.js) — this engine only surfaces them alongside the
   net-new axes in one place. */

var THEME_DEFAULTS = {
  radius: 1,          // 0.5–1.6 scale
  blur: 1,            // 0–1.6 scale
  motion: 1,          // 0.05 (off) | 0.5 (reduced) | 1 (full)
  density: 'comfortable', // comfortable | cozy | compact
  fontFamily: 'inter',    // inter | grotesk | system
  fontScale: 1,       // 0.9–1.15
  glow: 1,            // 0–1.6 scale
  opacity: 1          // 0.75–1 scale
};

function getTheme(){
  var p=curP();if(!p)return Object.assign({},THEME_DEFAULTS);
  if(!p.theme)p.theme=Object.assign({},THEME_DEFAULTS);
  else p.theme=Object.assign({},THEME_DEFAULTS,p.theme); // backfill any newly-added fields
  return p.theme;
}

function setThemeField(key,value){
  var p=curP();if(!p)return;
  var theme=getTheme();
  theme[key]=value;
  p.theme=theme;
  saveStateNow();
  applyThemeField(key,value);
}

function resetTheme(){
  var p=curP();if(!p)return;
  p.theme=Object.assign({},THEME_DEFAULTS);
  saveStateNow();
  applyFullTheme(p.theme);
  if(typeof renderThemeEditor==='function')renderThemeEditor();
  if(typeof toast==='function')toast((window._lang||'fr')==='fr'?'Thème réinitialisé':'Theme reset','success');
}

function applyThemeField(key,value){
  var root=document.documentElement;
  if(key==='radius')root.style.setProperty('--theme-radius-scale',value);
  else if(key==='blur')root.style.setProperty('--theme-blur-scale',value);
  else if(key==='motion')root.style.setProperty('--theme-motion-scale',value);
  else if(key==='glow')root.style.setProperty('--theme-glow-scale',value);
  else if(key==='opacity')root.style.setProperty('--theme-surface-opacity',value);
  else if(key==='fontScale')root.style.setProperty('--theme-font-scale',value);
  else if(key==='fontFamily')root.setAttribute('data-font',value==='inter'?'':value);
  else if(key==='density')root.setAttribute('data-density',value==='comfortable'?'':value);
}

function applyFullTheme(theme){
  theme=theme||getTheme();
  Object.keys(THEME_DEFAULTS).forEach(function(key){
    applyThemeField(key,theme[key]!=null?theme[key]:THEME_DEFAULTS[key]);
  });
}

/* Called once at dashboard boot, alongside the existing applyTheme(p.themeIdx) call. */
function bootThemeEngine(){
  var p=curP();if(!p)return;
  applyFullTheme(getTheme());
}
