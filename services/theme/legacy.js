/* ETHONE legacy compatibility module: theme. */
// ===================================================
//  THEMES
// ===================================================
const THEMES=[
  {name:'Electric Blue', accent:'#3b82f6', accent2:'#34d399', accent3:'#f87171', accent4:'#fbbf24', accent5:'#a78bfa', glow:'rgba(59,130,246,0.25)', bg:'#080b12', surface:'#0e1117'},
  {name:'Violet',        accent:'#8b5cf6', accent2:'#34d399', accent3:'#f87171', accent4:'#fbbf24', accent5:'#60a5fa', glow:'rgba(139,92,246,0.25)', bg:'#09080f', surface:'#110f1a'},
  {name:'Emerald',       accent:'#10b981', accent2:'#60a5fa', accent3:'#f87171', accent4:'#fbbf24', accent5:'#a78bfa', glow:'rgba(16,185,129,0.25)', bg:'#080f0d', surface:'#0d1712'},
  {name:'Rose',          accent:'#f43f5e', accent2:'#34d399', accent3:'#a78bfa', accent4:'#fbbf24', accent5:'#a78bfa', glow:'rgba(244,63,94,0.25)',  bg:'#100810', surface:'#190f14'},
  {name:'Amber',         accent:'#f59e0b', accent2:'#34d399', accent3:'#f87171', accent4:'#60a5fa', accent5:'#a78bfa', glow:'rgba(245,158,11,0.25)', bg:'#100e07', surface:'#19160a'},
  {name:'Cyan',          accent:'#06b6d4', accent2:'#34d399', accent3:'#f87171', accent4:'#fbbf24', accent5:'#a78bfa', glow:'rgba(6,182,212,0.25)',   bg:'#07100f', surface:'#0c1718'},
  {name:'Pink',          accent:'#ec4899', accent2:'#34d399', accent3:'#f87171', accent4:'#fbbf24', accent5:'#a78bfa', glow:'rgba(236,72,153,0.25)',  bg:'#100810', surface:'#190d16'},
  {name:'Mono',          accent:'#94a3b8', accent2:'#64748b', accent3:'#f87171', accent4:'#fbbf24', accent5:'#a78bfa', glow:'rgba(148,163,184,0.15)', bg:'#080808', surface:'#111111'},
];

const BG_THEMES=[
  {name:'None',        id:'none'},
  {name:'Particles',   id:'particles'},
  {name:'Aurora',      id:'aurora'},
  {name:'Grid',        id:'grid'},
  {name:'Waves',       id:'waves'},
  {name:'Meteors',     id:'meteors'},
  {name:'Noise',       id:'noise'},
  {name:'Hexagons',    id:'hexagons'},
  {name:'Constellation',id:'constellation'},
];

function applyTheme(themeIdx){
  const p=curP();
  if(themeIdx===99&&p?.customAccent){
    document.documentElement.style.setProperty('--accent',p.customAccent);
    document.documentElement.style.setProperty('--accent-glow','rgba('+hexToRgb(p.customAccent)+',0.25)');
    document.documentElement.style.setProperty('--accent-subtle','rgba('+hexToRgb(p.customAccent)+',0.08)');
    document.documentElement.style.setProperty('--border3','rgba('+hexToRgb(p.customAccent)+',0.2)');
    return;
  }
  const t=THEMES[themeIdx]||THEMES[0];
  const r=document.documentElement.style;
  r.setProperty('--accent',t.accent);
  r.setProperty('--accent2',t.accent2);
  r.setProperty('--accent3',t.accent3);
  r.setProperty('--accent4',t.accent4);
  if(t.accent5)r.setProperty('--accent5',t.accent5);
  if(t.glow){r.setProperty('--accent-glow',t.glow);r.setProperty('--glow-blue',`0 0 20px ${t.glow}`);}
  r.setProperty('--accent-subtle',t.glow?.replace('0.25','0.08')||'rgba(59,130,246,0.08)');
  r.setProperty('--border3',t.glow?.replace('0.25','0.2')||'rgba(59,130,246,0.2)');
  r.setProperty('--accent-light',t.accent);
  if(t.bg){
    r.setProperty('--bg',t.bg);
    // Set --bg-rgb for rgba() sidebar usage
    const rgb=t.bg.replace('#','');const rr=parseInt(rgb.slice(0,2),16),gg=parseInt(rgb.slice(2,4),16),bb=parseInt(rgb.slice(4,6),16);
    r.setProperty('--bg-rgb',`${rr},${gg},${bb}`);
  }
  if(t.surface)r.setProperty('--surface',t.surface);
  // Restart bg to reflect new accent color
  const _p=curP();
  if(_p?.bgTheme&&_p.bgTheme!=='none'){
    // Re-apply animated bg with new accent
    requestAnimationFrame(()=>{
      const c=document.getElementById('bg-canvas');
      if(c){c.width=window.innerWidth;c.height=window.innerHeight;}
      applyBgTheme(_p.bgTheme);
    });
  } else {
    if(_ambientFrame){cancelAnimationFrame(_ambientFrame);_ambientFrame=null;setTimeout(startAmbientBg,50);}
  }
}

function hexToRgb(hex){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function renderThemeSwatches(){
  const p=curP();if(!p)return;
  const wrap=document.getElementById('theme-swatches');if(!wrap)return;
  const cur=p.themeIdx||0;
  wrap.innerHTML=THEMES.map((t,i)=>
    `<div class="theme-swatch${(i===cur&&cur!==99)?' active':''}" style="background:${t.accent}" title="${t.name}" onclick="pickTheme(${i})"></div>`
  ).join('');
  // update custom color picker state
  const prev=document.getElementById('custom-color-preview');
  const inp=document.getElementById('custom-color-input');
  const customHex=p.customAccent||'#7c6af7';
  if(inp)inp.value=customHex;
  if(prev){
    prev.style.background=customHex;
    if(cur===99)prev.style.borderColor='var(--text)';
    else prev.style.borderColor='transparent';
  }
}

function applyCustomColor(hex){
  const p=curP();if(!p)return;
  // deselect all preset swatches
  document.querySelectorAll('#theme-swatches .theme-swatch').forEach(s=>s.classList.remove('active'));
  // update preview circle
  const prev=document.getElementById('custom-color-preview');
  if(prev)prev.style.background=hex;
  // apply CSS variable
  document.documentElement.style.setProperty('--accent',hex);
  // save as custom
  p.themeIdx=99;p.customAccent=hex;saveStateNow();
  updateBannerDisplay();
  toast((window._lang||'fr')==='fr'?'Couleur appliquée !':'Custom color applied!','success');
}

function pickTheme(idx){
  const p=curP();if(!p)return;
  p.themeIdx=idx;
  saveStateNow();
  applyTheme(idx);
  renderThemeSwatches();
  updateBannerDisplay();
  toast((window._lang||'fr')==='fr'?'Thème appliqué !':'Theme applied!','success');
}
