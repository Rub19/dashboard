/* ETHONE theme legacy compatibility.
   Old APIs are kept, but now route to the complete Theme Engine presets. */

const THEMES=(window.ETHONEThemeEngine&&window.ETHONEThemeEngine.presets?window.ETHONEThemeEngine.presets:[]).map(function(theme){
  return {
    id:theme.id,
    name:theme.name,
    description:theme.description,
    accent:theme.tokens.accent,
    accent2:"#34d399",
    accent3:"#f87171",
    accent4:"#fbbf24",
    accent5:theme.tokens.accentHover,
    glow:"rgba("+theme.tokens.accentRgb+",0.25)",
    bg:theme.tokens.bg,
    surface:theme.tokens.surface1,
    preview:theme.preview
  };
});

const BG_THEMES=[
  {name:'None',id:'none'},
  {name:'Particles',id:'particles'},
  {name:'Aurora',id:'aurora'},
  {name:'Grid',id:'grid'},
  {name:'Waves',id:'waves'},
  {name:'Meteors',id:'meteors'},
  {name:'Noise',id:'noise'},
  {name:'Hexagons',id:'hexagons'},
  {name:'Constellation',id:'constellation'}
];

function applyTheme(themeIdx){
  const p=typeof curP==='function'?curP():null;
  if(themeIdx===99&&p&&p.customAccent){
    applyCustomColorVars(p.customAccent);
    return;
  }
  const theme=THEMES[themeIdx]||THEMES[0];
  if(window.ETHONEThemeEngine&&theme){
    var current=window.ETHONEThemeEngine.getTheme();
    current.preset=theme.id;
    window.ETHONEThemeEngine.apply(current);
    return;
  }
  if(theme)applyLegacyThemeVars(theme);
}

function applyLegacyThemeVars(t){
  const r=document.documentElement.style;
  r.setProperty('--accent',t.accent);
  r.setProperty('--accent2',t.accent2);
  r.setProperty('--accent3',t.accent3);
  r.setProperty('--accent4',t.accent4);
  if(t.accent5)r.setProperty('--accent5',t.accent5);
  if(t.glow){r.setProperty('--accent-glow',t.glow);r.setProperty('--glow-blue','0 0 20px '+t.glow);}
  r.setProperty('--accent-subtle',t.glow?t.glow.replace('0.25','0.08'):'rgba(139,92,246,0.08)');
  r.setProperty('--border3',t.glow?t.glow.replace('0.25','0.2'):'rgba(139,92,246,0.2)');
  r.setProperty('--accent-light',t.accent);
  if(t.bg){r.setProperty('--bg',t.bg);r.setProperty('--bg-rgb',hexToRgb(t.bg));}
  if(t.surface)r.setProperty('--surface',t.surface);
}

function hexToRgb(hex){
  if(!hex||hex[0]!=='#')return '139,92,246';
  if(hex.length===4)hex='#'+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function renderThemeSwatches(){
  const p=typeof curP==='function'?curP():null;if(!p)return;
  const wrap=document.getElementById('theme-swatches');if(!wrap)return;
  const curPreset=(p.theme&&p.theme.preset)||p.themePreset||(THEMES[p.themeIdx||0]&&THEMES[p.themeIdx||0].id)||'ethone-purple';
  wrap.classList.add('theme-preset-grid');
  wrap.innerHTML=THEMES.map(function(t,i){
    const colors=(t.preview||[t.bg,t.surface,t.accent,t.accent5]).map(function(c){return '<span style="background:'+c+'"></span>';}).join('');
    return '<button type="button" class="theme-preset-card'+(t.id===curPreset?' active':'')+'" title="'+themeEscape(t.name)+'" onclick="pickTheme('+i+')">'+
      '<div class="theme-preset-preview">'+colors+'</div>'+
      '<strong>'+themeEscape(t.name)+'</strong>'+
      '<small>'+themeEscape(t.description||'Complete ETHONE theme')+'</small>'+
    '</button>';
  }).join('');
  const prev=document.getElementById('custom-color-preview');
  const inp=document.getElementById('custom-color-input');
  const customHex=p.customAccent||'#7c6af7';
  if(inp)inp.value=customHex;
  if(prev){
    prev.style.background=customHex;
    prev.style.borderColor=(p.themeIdx===99)?'var(--text)':'transparent';
  }
}

function applyCustomColorVars(hex){
  const rgb=hexToRgb(hex);
  const r=document.documentElement.style;
  r.setProperty('--primary',hex);
  r.setProperty('--primary-hover',hex);
  r.setProperty('--primary-active',hex);
  r.setProperty('--primary-rgb',rgb);
  r.setProperty('--primary-hover-rgb',rgb);
  r.setProperty('--primary-active-rgb',rgb);
  r.setProperty('--accent',hex);
  r.setProperty('--accent-hover',hex);
  r.setProperty('--accent-active',hex);
  r.setProperty('--accent-light',hex);
  r.setProperty('--accent-rgb',rgb);
  r.setProperty('--eh-accent-rgb',rgb);
  r.setProperty('--accent-glow','rgba('+rgb+',0.25)');
  r.setProperty('--accent-subtle','rgba('+rgb+',0.08)');
  r.setProperty('--accent-soft','rgba('+rgb+',0.13)');
  r.setProperty('--accent-border','rgba('+rgb+',0.3)');
  r.setProperty('--border3','rgba('+rgb+',0.2)');
}

function applyCustomColor(hex){
  const p=typeof curP==='function'?curP():null;if(!p)return;
  document.querySelectorAll('#theme-swatches .theme-preset-card').forEach(function(s){s.classList.remove('active');});
  const prev=document.getElementById('custom-color-preview');
  if(prev)prev.style.background=hex;
  applyCustomColorVars(hex);
  p.themeIdx=99;
  p.customAccent=hex;
  if(!p.theme)p.theme={};
  p.theme.customAccent=hex;
  p.theme.preset=p.theme.preset||p.themePreset||'ethone-purple';
  if(window.ETHONEThemeEngine)window.ETHONEThemeEngine.apply(p.theme);
  if(typeof saveStateNow==='function')saveStateNow();
  if(typeof updateBannerDisplay==='function')updateBannerDisplay();
  if(typeof toast==='function')toast((window._lang||'fr')==='fr'?'Couleur appliquee !':'Custom color applied!','success');
}

function pickTheme(idx){
  const p=typeof curP==='function'?curP():null;if(!p)return;
  const theme=THEMES[idx]||THEMES[0];
  p.themeIdx=idx;
  p.themePreset=theme.id;
  if(!p.theme)p.theme={};
  p.theme.preset=theme.id;
  if(typeof saveStateNow==='function')saveStateNow();
  if(window.ETHONEThemeEngine)window.ETHONEThemeEngine.setPreset(theme.id,{save:false,toast:false});
  else applyTheme(idx);
  renderThemeSwatches();
  if(typeof updateBannerDisplay==='function')updateBannerDisplay();
  if(typeof toast==='function')toast((window._lang||'fr')==='fr'?'Theme applique !':'Theme applied!','success');
}

function themeEscape(value){
  if(typeof escapeHTML==='function')return escapeHTML(value);
  return String(value==null?'':value).replace(/[&<>"']/g,function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}
