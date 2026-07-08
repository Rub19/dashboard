/* ETHONE Theme Engine
   Complete theme presets + legacy compatibility.
   Applies instantly through global CSS tokens without touching app logic. */

var THEME_DEFAULTS = {
  preset: "ethone-purple",
  radius: 1,
  blur: 1,
  motion: 1,
  density: "comfortable",
  fontFamily: "inter",
  fontScale: 1,
  glow: 1,
  opacity: 1,
  sidebarWidth: 260,
  customAccent: ""
};

var FONT_STACKS = {
  inter: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  grotesk: "Syne, Inter, ui-sans-serif, system-ui, sans-serif",
  system: "-apple-system, BlinkMacSystemFont, Segoe UI, Inter, ui-sans-serif, system-ui, sans-serif",
  mono: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  serif: "ui-serif, Georgia, Cambria, Times New Roman, Times, serif"
};

var DENSITY_SPACING = {
  comfortable: { density: "1", spacing: 16, xs: 6, sm: 10, md: 16, lg: 24 },
  cozy: { density: ".88", spacing: 14, xs: 5, sm: 9, md: 14, lg: 20 },
  compact: { density: ".74", spacing: 11, xs: 4, sm: 7, md: 11, lg: 16 }
};

var ETHONE_THEME_PRESETS = [
  themePreset("ethone-purple","ETHONE Purple","Native ETHONE dark system with violet intelligence accents.",{
    accent:"#8b5cf6",accentHover:"#a78bfa",accentActive:"#7c3aed",
    bg:"#09090b",bgSoft:"#0d0b12",surface1:"#101014",surface2:"#15151a",surface3:"#17171c",
    raised:"#1c1c22",hover:"#202026",control:"#24242a",switch:"#292930",
    text:"#f5f3ff",strong:"#d8d4e8",secondary:"#aaa3ba",tertiary:"#7f788e",
    border:"rgba(255,255,255,.09)",border2:"rgba(255,255,255,.15)",
    glow:.24,radius:1,blur:1,opacity:1,shadow:.48
  }),
  themePreset("midnight","Midnight","Calm graphite-black theme with soft blue-violet depth.",{
    accent:"#818cf8",accentHover:"#a5b4fc",accentActive:"#6366f1",
    bg:"#07080d",bgSoft:"#0a0c13",surface1:"#10121a",surface2:"#161925",surface3:"#1b1f2e",
    raised:"#222638",hover:"#293047",control:"#252a3d",switch:"#2d3348",
    text:"#f2f5ff",strong:"#d7dcf2",secondary:"#a6aec8",tertiary:"#737d9d",
    border:"rgba(190,205,255,.085)",border2:"rgba(190,205,255,.15)",
    glow:.18,radius:1.05,blur:.95,opacity:.98,shadow:.54
  }),
  themePreset("oled","OLED","Maximum contrast pure-black interface for OLED displays.",{
    accent:"#a78bfa",accentHover:"#c4b5fd",accentActive:"#8b5cf6",
    bg:"#000000",bgSoft:"#030305",surface1:"#060608",surface2:"#0c0c10",surface3:"#111116",
    raised:"#15151b",hover:"#1a1a22",control:"#17171e",switch:"#1e1e26",
    text:"#ffffff",strong:"#e8e8ef",secondary:"#a9a9b3",tertiary:"#767680",
    border:"rgba(255,255,255,.08)",border2:"rgba(255,255,255,.14)",
    glow:.12,radius:.95,blur:.72,opacity:1,shadow:.72
  }),
  themePreset("nord","Nord","Cool arctic surfaces with icy blue-violet accents.",{
    accent:"#88c0d0",accentHover:"#8fbcbb",accentActive:"#5e81ac",
    bg:"#0b1018",bgSoft:"#101720",surface1:"#151c27",surface2:"#1b2430",surface3:"#222d3a",
    raised:"#2a3544",hover:"#314052",control:"#283545",switch:"#334155",
    text:"#eceff4",strong:"#d8dee9",secondary:"#aeb8c8",tertiary:"#7c899c",
    border:"rgba(216,222,233,.09)",border2:"rgba(216,222,233,.16)",
    glow:.13,radius:1.05,blur:.9,opacity:.98,shadow:.42
  }),
  themePreset("tokyo-night","Tokyo Night","Deep navy code-inspired theme with violet neon restraint.",{
    accent:"#bb9af7",accentHover:"#c7a9ff",accentActive:"#9d7cd8",
    bg:"#0b1020",bgSoft:"#11162a",surface1:"#151a2e",surface2:"#1a2037",surface3:"#202744",
    raised:"#252d4d",hover:"#2b3459",control:"#262e4e",switch:"#30385f",
    text:"#c0caf5",strong:"#d5dcff",secondary:"#9aa5ce",tertiary:"#6f789f",
    border:"rgba(192,202,245,.09)",border2:"rgba(192,202,245,.16)",
    glow:.22,radius:1,blur:1.05,opacity:.98,shadow:.52
  }),
  themePreset("gruvbox","Gruvbox","Warm retro dark theme with amber productivity accents.",{
    accent:"#d79921",accentHover:"#fabd2f",accentActive:"#b57614",
    bg:"#11100d",bgSoft:"#17140f",surface1:"#1d1a14",surface2:"#242016",surface3:"#2c261b",
    raised:"#352d20",hover:"#3d3425",control:"#332c20",switch:"#3c3325",
    text:"#fbf1c7",strong:"#ebdbb2",secondary:"#bdae93",tertiary:"#8f7f66",
    border:"rgba(251,241,199,.09)",border2:"rgba(251,241,199,.16)",
    glow:.16,radius:.9,blur:.82,opacity:.98,shadow:.46
  }),
  themePreset("catppuccin","Catppuccin","Soft mocha surfaces with lavender accents.",{
    accent:"#cba6f7",accentHover:"#d9b8ff",accentActive:"#b48bf2",
    bg:"#0d0b12",bgSoft:"#12101a",surface1:"#181520",surface2:"#1e1a28",surface3:"#272033",
    raised:"#30273d",hover:"#382e49",control:"#332a40",switch:"#3b314a",
    text:"#cdd6f4",strong:"#f5e0dc",secondary:"#bac2de",tertiary:"#8b91b1",
    border:"rgba(205,214,244,.09)",border2:"rgba(205,214,244,.16)",
    glow:.20,radius:1.18,blur:1.12,opacity:.98,shadow:.46
  }),
  themePreset("dracula","Dracula","Classic dark purple theme with expressive magenta accents.",{
    accent:"#bd93f9",accentHover:"#d6b4ff",accentActive:"#9580ff",
    bg:"#0d0b13",bgSoft:"#15111d",surface1:"#1b1724",surface2:"#241f31",surface3:"#2c263b",
    raised:"#352d48",hover:"#403659",control:"#372f4b",switch:"#453a5c",
    text:"#f8f8f2",strong:"#e9e3f7",secondary:"#b8abc9",tertiary:"#827391",
    border:"rgba(248,248,242,.085)",border2:"rgba(248,248,242,.15)",
    glow:.24,radius:1.08,blur:1,opacity:.98,shadow:.5
  }),
  themePreset("carbon","Carbon","Industrial graphite theme with precise neutral surfaces.",{
    accent:"#9ca3af",accentHover:"#d1d5db",accentActive:"#6b7280",
    bg:"#080808",bgSoft:"#0c0c0d",surface1:"#111112",surface2:"#171719",surface3:"#1f1f22",
    raised:"#26262a",hover:"#2e2e33",control:"#29292d",switch:"#333338",
    text:"#f3f4f6",strong:"#d7dbe0",secondary:"#a3a8b0",tertiary:"#737984",
    border:"rgba(255,255,255,.075)",border2:"rgba(255,255,255,.13)",
    glow:.08,radius:.82,blur:.55,opacity:1,shadow:.56
  }),
  themePreset("glass","Glass","Transparent premium glass theme with stronger blur and soft glow.",{
    accent:"#a78bfa",accentHover:"#c4b5fd",accentActive:"#8b5cf6",
    bg:"#08070d",bgSoft:"#0d0b14",surface1:"rgba(20,18,28,.62)",surface2:"rgba(28,25,40,.58)",surface3:"rgba(39,34,55,.56)",
    raised:"rgba(52,45,72,.62)",hover:"rgba(70,60,94,.58)",control:"rgba(52,45,72,.52)",switch:"rgba(62,54,84,.56)",
    text:"#faf7ff",strong:"#e9ddff",secondary:"#bcaee0",tertiary:"#877a9f",
    border:"rgba(255,255,255,.12)",border2:"rgba(255,255,255,.20)",
    glow:.30,radius:1.28,blur:1.55,opacity:.86,shadow:.58
  })
];

function themePreset(id,name,description,tokens){
  var accent=tokens.accent||"#8b5cf6";
  var rgb=hexToRgbTriplet(accent);
  return {
    id:id,
    name:name,
    description:description,
    preview:[tokens.bg,tokens.surface1,accent,tokens.text],
        tokens:Object.assign({
          id:id,
          accent:accent,
      accentHover:tokens.accentHover||accent,
      accentActive:tokens.accentActive||accent,
      accentRgb:rgb,
      radius:1,
      blur:1,
      glow:.2,
      opacity:1,
      shadow:.48
    },tokens)
  };
}

function getTheme(){
  var p=typeof curP==="function"?curP():null;
  if(!p)return Object.assign({},THEME_DEFAULTS);
  if(!p.theme)p.theme=Object.assign({},THEME_DEFAULTS);
  else p.theme=Object.assign({},THEME_DEFAULTS,p.theme);
  if(!p.theme.preset&&p.themePreset)p.theme.preset=p.themePreset;
  return p.theme;
}

function setThemeField(key,value){
  var p=typeof curP==="function"?curP():null;if(!p)return;
  var theme=getTheme();
  if(key==="sidebarWidth")value=Math.max(220,Math.min(340,parseInt(value,10)||260));
  theme[key]=value;
  p.theme=theme;
  if(typeof saveStateNow==="function")saveStateNow();
  applyFullTheme(theme);
  dispatchThemeChanged(key,value);
}

function setThemePreset(id,options){
  var p=typeof curP==="function"?curP():null;if(!p)return;
  var preset=findThemePreset(id)||ETHONE_THEME_PRESETS[0];
  var theme=getTheme();
  theme.preset=preset.id;
  theme.radius=preset.tokens.radius;
  theme.blur=preset.tokens.blur;
  theme.glow=scaleGlow(preset.tokens.glow);
  theme.opacity=preset.tokens.opacity;
  p.theme=theme;
  p.themePreset=preset.id;
  p.themeIdx=themePresetIndex(preset.id);
  if((!options||options.save!==false)&&typeof saveStateNow==="function")saveStateNow();
  applyFullTheme(theme);
  if(typeof renderThemeEditor==="function")renderThemeEditor();
  if(!options||options.toast!==false){
    if(typeof toast==="function")toast(((window._lang||"fr")==="fr"?"Theme applique : ":"Theme applied: ")+preset.name,"success");
  }
  dispatchThemeChanged("preset",preset.id);
}

function resetTheme(){
  var p=typeof curP==="function"?curP():null;if(!p)return;
  p.theme=Object.assign({},THEME_DEFAULTS);
  p.themePreset=THEME_DEFAULTS.preset;
  p.themeIdx=0;
  if(typeof saveStateNow==="function")saveStateNow();
  applyFullTheme(p.theme);
  if(typeof renderThemeEditor==="function")renderThemeEditor();
  if(typeof toast==="function")toast((window._lang||"fr")==="fr"?"Theme reinitialise":"Theme reset","success");
}

function findThemePreset(id){
  return ETHONE_THEME_PRESETS.find(function(item){return item.id===id;})||null;
}

function themePresetIndex(id){
  var idx=ETHONE_THEME_PRESETS.findIndex(function(item){return item.id===id;});
  return idx<0?0:idx;
}

function applyThemeField(key,value){
  var root=document.documentElement;
  if(key==="radius"){
    root.style.setProperty("--theme-radius-scale",value);
    root.style.setProperty("--radius",Math.round(16*value)+"px");
    root.style.setProperty("--radius-md",Math.round(14*value)+"px");
    root.style.setProperty("--radius-lg",Math.round(20*value)+"px");
    root.style.setProperty("--radius-xl",Math.round(26*value)+"px");
    root.style.setProperty("--r-md","var(--radius-md)");
    root.style.setProperty("--r-lg","var(--radius-lg)");
  }
  else if(key==="blur"){
    root.style.setProperty("--theme-blur-scale",value);
    root.style.setProperty("--blur",Math.round(24*value)+"px");
  }
  else if(key==="motion"){
    root.style.setProperty("--theme-motion-scale",value);
    root.classList.toggle("ethone-motion-off",Number(value)<=0.06);
    root.classList.toggle("ethone-motion-reduced",Number(value)>0.06&&Number(value)<0.75);
  }
  else if(key==="glow"){
    root.style.setProperty("--theme-glow-scale",value);
    root.style.setProperty("--glow",value);
  }
  else if(key==="opacity"){
    root.style.setProperty("--theme-surface-opacity",value);
    root.style.setProperty("--surface-opacity",value);
  }
  else if(key==="fontScale"){
    root.style.setProperty("--theme-font-scale",value);
    root.style.setProperty("--font-scale",value);
  }
  else if(key==="fontFamily"){
    root.setAttribute("data-font",value==="inter"?"":value);
    root.style.setProperty("--font",FONT_STACKS[value]||FONT_STACKS.inter);
    root.style.setProperty("--font-display",FONT_STACKS[value]||FONT_STACKS.inter);
    root.style.setProperty("--font-heading",FONT_STACKS[value]||FONT_STACKS.inter);
  }
  else if(key==="density"){
    var d=DENSITY_SPACING[value]||DENSITY_SPACING.comfortable;
    root.setAttribute("data-density",value==="comfortable"?"":value);
    root.style.setProperty("--density",d.density);
    root.style.setProperty("--spacing",d.spacing+"px");
    root.style.setProperty("--spacing-xs",d.xs+"px");
    root.style.setProperty("--spacing-sm",d.sm+"px");
    root.style.setProperty("--spacing-md",d.md+"px");
    root.style.setProperty("--spacing-lg",d.lg+"px");
  }
  else if(key==="sidebarWidth"){
    root.style.setProperty("--sidebar-w",Math.max(220,Math.min(340,parseInt(value,10)||260))+"px");
  }
}

function applyFullTheme(theme){
  theme=Object.assign({},THEME_DEFAULTS,theme||getTheme());
  var preset=findThemePreset(theme.preset)||ETHONE_THEME_PRESETS[0];
  applyThemeTokens(preset.tokens,theme);
  if(theme.customAccent&&normalizeHex(theme.customAccent))applyCustomAccentTokens(theme.customAccent);
  Object.keys(THEME_DEFAULTS).forEach(function(key){
    if(key==="preset")return;
    applyThemeField(key,theme[key]!=null?theme[key]:THEME_DEFAULTS[key]);
  });
  document.documentElement.dataset.ethoneTheme=preset.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",preset.tokens.bg||"#09090b");
  if(window.ETHONEThemeEngine)window.ETHONEThemeEngine.current=preset;
}

function applyThemeTokens(tokens,theme){
  var r=document.documentElement.style;
  var accent=tokens.accent;
  var accentRgb=tokens.accentRgb||hexToRgbTriplet(accent);
  var glowAlpha=typeof tokens.glow==="number"?tokens.glow:.2;
  var shadowAlpha=typeof tokens.shadow==="number"?tokens.shadow:.48;

  setVars({
    "--surface-0":tokens.bg,
    "--surface-1":tokens.surface1,
    "--surface-2":tokens.surface2,
    "--surface-3":tokens.surface3,
    "--surface-raised":tokens.raised,
    "--surface-hover":tokens.hover,
    "--surface":tokens.surface1,
    "--surface-control":tokens.control,
    "--surface-switch":tokens.switch,
    "--surface-translucent":toRgba(tokens.bg,Math.max(.72,Math.min(1,theme.opacity||tokens.opacity||1))),
    "--text-primary":tokens.text,
    "--text-strong":tokens.strong,
    "--text-secondary":tokens.secondary,
    "--text-tertiary":tokens.tertiary,
    "--text-accent":tokens.accentHover,
    "--border-primary":tokens.border,
    "--border-secondary":tokens.border2,
    "--border-hover":alphaFromColor(tokens.border2,.28),
    "--border-focus":"rgba("+accentRgb+",.76)",
    "--accent":accent,
    "--accent-hover":tokens.accentHover,
    "--accent-active":tokens.accentActive,
    "--accent-contrast":tokens.accentActive,
    "--accent-contrast-hover":tokens.accentHover,
    "--accent-soft":"rgba("+accentRgb+",.13)",
    "--accent-soft-hover":"rgba("+accentRgb+",.18)",
    "--accent-border":"rgba("+accentRgb+",.32)",
    "--accent-shadow":"rgba("+accentRgb+",.22)",
    "--accent-light":tokens.accentHover,
    "--accent-h":tokens.accentActive,
    "--accent-glow":"rgba("+accentRgb+","+Math.max(.1,glowAlpha)+")",
    "--accent-subtle":"rgba("+accentRgb+",.10)",
    "--accent-rgb":accentRgb,
    "--eh-accent":"var(--accent)",
    "--eh-accent-rgb":accentRgb,
    "--grad-primary":"linear-gradient(135deg,rgb("+accentRgb+"),"+tokens.accentActive+")",
    "--grad-accent":"linear-gradient(135deg,rgb("+accentRgb+"),"+tokens.accentActive+")",
    "--grad-card":"linear-gradient(135deg,rgba("+accentRgb+",.08),rgba("+accentRgb+",.04))",
    "--bg":tokens.bg,
    "--bg-rgb":hexToRgbTriplet(normalizeHex(tokens.bg)||"#09090b"),
    "--surface":tokens.surface1,
    "--surface2":tokens.surface2,
    "--surface3":tokens.surface3,
    "--border":tokens.border,
    "--border2":tokens.border2,
    "--border3":"rgba("+accentRgb+",.22)",
    "--muted":tokens.secondary,
    "--muted2":tokens.tertiary,
    "--text":tokens.text,
    "--text2":tokens.strong,
    "--glow-blue":"0 0 24px rgba("+accentRgb+","+glowAlpha+")",
    "--glow-accent-soft":"0 0 calc(48px * var(--theme-glow-scale)) rgba("+accentRgb+",.09)",
    "--glow-accent-strong":"0 0 calc(70px * var(--theme-glow-scale)) rgba("+accentRgb+",.14)",
    "--shadow-xs":"0 1px 2px rgba(0,0,0,.22)",
    "--shadow-sm":"0 6px 18px rgba(0,0,0,"+Math.max(.14,shadowAlpha*.34)+")",
    "--shadow-md":"0 16px 44px rgba(0,0,0,"+Math.max(.2,shadowAlpha*.55)+")",
    "--shadow-lg":"0 28px 80px rgba(0,0,0,"+shadowAlpha+")",
    "--shadow-control":"0 calc(8px * var(--theme-glow-scale)) calc(22px * var(--theme-glow-scale)) rgba("+accentRgb+",.18)",
    "--shadow-control-hover":"0 calc(10px * var(--theme-glow-scale)) calc(28px * var(--theme-glow-scale)) rgba("+accentRgb+",.24)",
    "--overlay-backdrop":"rgba(0,0,0,"+(tokens.id==="glass"?".58":".68")+")",
    "--theme-preview-bg":tokens.bg,
    "--theme-preview-surface":tokens.surface1
  });

  r.setProperty("--theme-radius-scale",theme.radius!=null?theme.radius:tokens.radius);
  r.setProperty("--theme-blur-scale",theme.blur!=null?theme.blur:tokens.blur);
  r.setProperty("--theme-glow-scale",theme.glow!=null?theme.glow:scaleGlow(tokens.glow));
  r.setProperty("--theme-surface-opacity",theme.opacity!=null?theme.opacity:tokens.opacity);
}

function applyCustomAccentTokens(hex){
  var rgb=hexToRgbTriplet(hex);
  setVars({
    "--accent":hex,
    "--accent-hover":hex,
    "--accent-active":hex,
    "--accent-light":hex,
    "--accent-rgb":rgb,
    "--eh-accent":"var(--accent)",
    "--eh-accent-rgb":rgb,
    "--grad-primary":"linear-gradient(135deg,rgb("+rgb+"),rgb("+rgb+"))",
    "--grad-accent":"linear-gradient(135deg,rgb("+rgb+"),rgb("+rgb+"))",
    "--grad-card":"linear-gradient(135deg,rgba("+rgb+",.08),rgba("+rgb+",.04))",
    "--accent-glow":"rgba("+rgb+",.25)",
    "--accent-subtle":"rgba("+rgb+",.10)",
    "--accent-soft":"rgba("+rgb+",.13)",
    "--accent-soft-hover":"rgba("+rgb+",.18)",
    "--accent-border":"rgba("+rgb+",.32)",
    "--accent-shadow":"rgba("+rgb+",.22)",
    "--border3":"rgba("+rgb+",.22)",
    "--border-focus":"rgba("+rgb+",.76)",
    "--glow-blue":"0 0 24px rgba("+rgb+",.25)",
    "--glow-accent-soft":"0 0 calc(48px * var(--theme-glow-scale)) rgba("+rgb+",.09)",
    "--glow-accent-strong":"0 0 calc(70px * var(--theme-glow-scale)) rgba("+rgb+",.14)"
  });
}

function setVars(vars){
  var r=document.documentElement.style;
  Object.keys(vars).forEach(function(key){
    if(vars[key]!=null)r.setProperty(key,vars[key]);
  });
}

function scaleGlow(value){
  if(value==null)return 1;
  return Math.max(0,Math.min(1.6,value*4));
}

function hexToRgbTriplet(hex){
  hex=normalizeHex(hex)||"#8b5cf6";
  var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return r+","+g+","+b;
}

function normalizeHex(color){
  if(!color||typeof color!=="string"||color.indexOf("#")!==0)return null;
  if(color.length===4)return "#"+color[1]+color[1]+color[2]+color[2]+color[3]+color[3];
  if(color.length===7)return color;
  return null;
}

function toRgba(color,alpha){
  var hex=normalizeHex(color);
  if(!hex)return color;
  return "rgba("+hexToRgbTriplet(hex)+","+alpha+")";
}

function alphaFromColor(color,fallback){
  if(!color||color.indexOf("rgba")!==0)return "rgba(255,255,255,"+fallback+")";
  return color.replace(/,\s*[\d.]+\)$/,", "+fallback+")");
}

function dispatchThemeChanged(name,value){
  try{window.dispatchEvent(new CustomEvent("ethone:theme-changed",{detail:{name:name,value:value,theme:getTheme()}}));}catch(e){}
}

function bootThemeEngine(){
  var p=typeof curP==="function"?curP():null;if(!p)return;
  var theme=getTheme();
  if(!theme.preset&&p.themePreset)theme.preset=p.themePreset;
  if(!theme.preset&&typeof p.themeIdx==="number")theme.preset=(ETHONE_THEME_PRESETS[p.themeIdx]||ETHONE_THEME_PRESETS[0]).id;
  applyFullTheme(theme);
}

window.ETHONEThemeEngine={
  presets:ETHONE_THEME_PRESETS,
  defaults:THEME_DEFAULTS,
  current:null,
  getTheme:getTheme,
  setField:setThemeField,
  setPreset:setThemePreset,
  apply:applyFullTheme,
  reset:resetTheme,
  find:findThemePreset
};
