/* ETHONE legacy compatibility module: color-mode. */
// ===================================================
//  DARK / LIGHT MODE
// ===================================================
let _darkMode=true;
function toggleDarkLight(){
  _darkMode=!_darkMode;
  const btn=document.getElementById('theme-mode-btn');
  if(_darkMode){
    ['--bg','--bg-rgb','--surface','--surface2','--surface3','--text','--text2',
     '--muted','--muted2','--border','--border2','--border3','--accent-subtle']
     .forEach(v=>document.documentElement.style.removeProperty(v));
    document.body.removeAttribute('data-light');
    if(btn)btn.textContent='🌙';
  } else {
    document.documentElement.style.setProperty('--bg','#f0f2f7');
    document.documentElement.style.setProperty('--bg-rgb','240,242,247');
    document.documentElement.style.setProperty('--surface','#ffffff');
    document.documentElement.style.setProperty('--surface2','#f5f7fb');
    document.documentElement.style.setProperty('--surface3','#e8ecf4');
    document.documentElement.style.setProperty('--text','#0f1724');
    document.documentElement.style.setProperty('--text2','#1e2d4a');
    document.documentElement.style.setProperty('--muted','#6b7a99');
    document.documentElement.style.setProperty('--muted2','#8a96b0');
    document.documentElement.style.setProperty('--border','rgba(0,0,0,.08)');
    document.documentElement.style.setProperty('--border2','rgba(0,0,0,.12)');
    document.documentElement.style.setProperty('--border3','rgba(0,0,0,.06)');
    document.documentElement.style.setProperty('--accent-subtle','rgba(139,92,246,.08)');
    document.body.setAttribute('data-light','1');
    if(btn)btn.textContent='☀️';
  }
  // Save preference
  localStorage.setItem('darkMode',_darkMode?'1':'0');
  const p=curP();if(p){p.darkMode=_darkMode;saveStateNow();}
}
function initDarkMode(){
  const saved=localStorage.getItem('darkMode');
  if(saved==='0'){_darkMode=true;toggleDarkLight();}
}
