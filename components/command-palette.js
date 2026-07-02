/* ETHONE legacy compatibility module: command-palette. */
// === GLOBAL SEARCH + COMMAND PALETTE ===
const CMD_PAGES=[
  {icon:'🏠',label:'Overview',page:'dashboard',keywords:'home overview main'},
  {icon:'📁',label:'Files & Links',page:'files',keywords:'files links documents'},
  {icon:'📝',label:'Notes',page:'notes',keywords:'notes write text'},
  {icon:'✅',label:'Tasks',page:'todos',keywords:'tasks todos checklist'},
  {icon:'🌿',label:'Habits',page:'habits',keywords:'habits streak daily'},
  {icon:'📋',label:'Kanban',page:'kanban',keywords:'kanban board cards'},
  {icon:'📅',label:'Calendar',page:'calendar',keywords:'calendar events schedule'},
  {icon:'📊',label:'Stats',page:'stats',keywords:'stats statistics analytics'},
  {icon:'🎮',label:'Gaming',page:'gaming',keywords:'gaming valorant lol steam overwatch'},
  {icon:'🔗',label:'Connections',page:'connections',keywords:'connections discord spotify twitch lastfm'},
  {icon:'⚙️',label:'Settings',page:'settings',keywords:'settings profile security'},
];

// ══════════════════════════════════════════════════════════════
let _cmdSelectedIdx=0;
function openCmdPalette(){const o=document.getElementById('cmd-palette-overlay');if(o)o.classList.add('open');const i=document.getElementById('cmd-input');if(i){i.value='';i.focus();}_cmdSelectedIdx=0;renderCmdResults();}
function closeCmdPalette(){document.getElementById('cmd-palette-overlay')?.classList.remove('open');}
function getCmdItems(q=''){
  const p=curP();q=q.toLowerCase().trim();
  const pages=[
    {icon:'🏠',label:t('nav_overview'),sub:'Overview',action:()=>switchPage('dashboard',null)},
    {icon:'📁',label:t('nav_files'),sub:'Files & links',action:()=>switchPage('files',null)},
    {icon:'📝',label:t('nav_notes'),sub:'Notes',action:()=>switchPage('notes',null)},
    {icon:'✅',label:t('nav_tasks'),sub:'Tasks',action:()=>switchPage('todos',null)},
    {icon:'📋',label:t('nav_kanban'),sub:'Kanban board',action:()=>switchPage('kanban',null)},
    {icon:'📅',label:t('nav_calendar'),sub:'Calendar',action:()=>switchPage('calendar',null)},
    {icon:'🔥',label:t('nav_habits'),sub:'Habits',action:()=>switchPage('habits',null)},
    {icon:'🎮',label:t('nav_gaming'),sub:'Gaming',action:()=>switchPage('gaming',null)},
    {icon:'📊',label:t('nav_stats'),sub:'Stats',action:()=>switchPage('stats',null)},
    {icon:'🔗',label:t('nav_connections'),sub:'Connections',action:()=>switchPage('connections',null)},
    {icon:'⚙️',label:t('nav_settings'),sub:'Settings',action:()=>switchPage('settings',null)},
    {icon:'🤖',label:t('nav_ai'),sub:'ETHONE AI',action:()=>switchPage('ai',null)},
  ];
  const actions=[
    {icon:'➕',label:'Add item',sub:'File, link or folder',kbd:'Ctrl+A',action:()=>{closeCmdPalette();openModal('add-item');}},
    {icon:'📝',label:'New note',sub:'Create a note',kbd:'N',action:()=>{closeCmdPalette();switchPage('notes',null);}},
    {icon:'✅',label:'Add task',sub:'Quick task',kbd:'T',action:()=>{closeCmdPalette();switchPage('todos',null);}},
    {icon:'🔄',label:'Switch profile',sub:'Profile select',action:()=>{closeCmdPalette();goToProfileScreen();}},
    {icon:'🖥️',label:'Presentation mode',sub:'Full-screen dashboard on TV',kbd:'P',action:()=>{closeCmdPalette();openPresentationMode();}},
    {icon:'🌐',label:'Toggle language',sub:'FR/EN/ES/DE',action:()=>{closeCmdPalette();const langs=['fr','en','es','de'];const idx=langs.indexOf(_lang);setLangAndClose(langs[(idx+1)%langs.length],'lang-dd-topbar');}},
  ];
  const recentItems=(p?.state?.items||[]).slice(0,4).map(item=>({
    icon:item.type==='link'?'🔗':item.type==='folder'?'📁':'📄',
    label:item.name||'Untitled',sub:item.url||item.type,tag:'Item',
    action:()=>{closeCmdPalette();if(item.url)window.open(item.url,'_blank');else switchPage('files',null);}
  }));
  const f=arr=>!q?arr:arr.filter(i=>(i.label+' '+(i.sub||'')).toLowerCase().includes(q));
  return{pages:f(pages),actions:f(actions),items:f(recentItems),all:[...f(pages),...f(actions),...f(recentItems)]};
}
function renderCmdResults(){
  const q=document.getElementById('cmd-input')?.value||'';
  const{pages,actions,items,all}=getCmdItems(q);
  _cmdSelectedIdx=Math.max(0,Math.min(_cmdSelectedIdx,all.length-1));
  const c=document.getElementById('cmd-results');if(!c)return;
  let html='',gi=0;
  function sec(label,arr){
    if(!arr.length)return;
    html+=`<div class="cmd-section-label">${label}</div>`;
    arr.forEach(item=>{
      const sel=gi===_cmdSelectedIdx;
      const idx=gi;
      html+=`<div class="cmd-item${sel?' selected':''}" data-idx="${idx}" onmousedown="event.preventDefault();executeCmdItem(${idx})" onmouseover="_cmdSelectedIdx=${idx};renderCmdResults()">
        <div class="cmd-item-icon">${item.icon||'◆'}</div>
        <div style="flex:1;min-width:0"><div class="cmd-item-label">${escapeHTML(item.label)}</div>${item.sub?`<div class="cmd-item-sub">${escapeHTML(item.sub)}</div>`:''}</div>
        ${item.kbd?`<span class="cmd-item-kbd">${item.kbd}</span>`:''}
        ${item.tag?`<span class="cmd-item-tag">${item.tag}</span>`:''}
      </div>`;gi++;
    });
  }
  if(!all.length){html='<div style="text-align:center;padding:28px;color:var(--muted2);font-size:13px">No results</div>';}
  else if(!q){sec('Actions',actions);sec('Pages',pages);if(items.length)sec('Recent',items);}
  else{if(pages.length)sec('Pages',pages);if(actions.length)sec('Actions',actions);if(items.length)sec('Items',items);}
  c.innerHTML=html;
}
function executeCmdItem(idx){
  const{all}=getCmdItems(document.getElementById('cmd-input')?.value||'');
  const item=all[idx];
  if(!item)return;
  // Exécuter l'action AVANT de fermer pour éviter les race conditions
  const action=item.action;
  closeCmdPalette();
  requestAnimationFrame(()=>action());
}
function handleCmdKey(e){
  const{all}=getCmdItems(document.getElementById('cmd-input')?.value||'');
  if(e.key==='ArrowDown'){e.preventDefault();_cmdSelectedIdx=Math.min(_cmdSelectedIdx+1,all.length-1);renderCmdResults();}
  else if(e.key==='ArrowUp'){e.preventDefault();_cmdSelectedIdx=Math.max(_cmdSelectedIdx-1,0);renderCmdResults();}
  else if(e.key==='Enter'){e.preventDefault();executeCmdItem(_cmdSelectedIdx);}
  else if(e.key==='Escape'){closeCmdPalette();}
}
document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();const o=document.getElementById('cmd-palette-overlay');if(o?.classList.contains('open'))closeCmdPalette();else openCmdPalette();}
  const _tag=document.activeElement?.tagName;
  const _inInput=_tag==='INPUT'||_tag==='TEXTAREA'||document.activeElement?.isContentEditable;
  if(!document.getElementById('cmd-palette-overlay')?.classList.contains('open')){
    if(_inInput)return;
    // Raccourcis de navigation
    if(e.key==='n'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();switchPage('notes',null);}
    if(e.key==='t'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();switchPage('todos',null);}
    if(e.key==='g'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();switchPage('gaming',null);}
    if(e.key==='h'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();switchPage('habits',null);}
    // Espace → play/pause Pomodoro si on est sur le dashboard
    if(e.code==='Space'){
      const dash=document.getElementById('page-dashboard');
      if(dash&&dash.classList.contains('active')&&document.getElementById('pomo-ring-wrap')){
        e.preventDefault();pomoToggle();
      }
    }
  }
});

// ══════════════════════════════════════════════════════════════
