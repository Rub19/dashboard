/* ETHONE global search + command palette (Ctrl+K). */
// === GLOBAL SEARCH + COMMAND PALETTE ===

let _cmdSelectedIdx=0;
let _cmdDebounceTimer=null;
let _cmdKeyboardNav=false;

function openCmdPalette(){
  const o=document.getElementById('cmd-palette-overlay');
  if(o)o.classList.add('open');
  const i=document.getElementById('cmd-input');
  if(i)i.value='';
  _cmdSelectedIdx=0;
  renderCmdResults();
  requestAnimationFrame(()=>{if(i)i.focus();});
}
function closeCmdPalette(){
  document.getElementById('cmd-palette-overlay')?.classList.remove('open');
  const i=document.getElementById('cmd-input');
  if(i)i.value='';
}
function onCmdInput(){
  clearTimeout(_cmdDebounceTimer);
  _cmdDebounceTimer=setTimeout(renderCmdResults,60);
}

// --- Matching ---
function scoreMatch(haystack,q){
  if(!q)return 1;
  const i=haystack.indexOf(q);
  if(i===-1)return 0;
  if(haystack===q)return 100;
  if(haystack.startsWith(q))return 80;
  try{if(new RegExp('\\b'+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(haystack))return 60;}catch(e){}
  return 30-Math.min(i,20);
}
function cmdSearchText(title,sub,keywords){
  return (String(title||'')+' '+String(sub||'')+' '+String(keywords||'')).toLowerCase();
}
function isCmdItemEnabled(item){
  try{const Actions=window.Ethone&&window.Ethone.get('actions');return Actions?Actions.isEnabled(item.id):true;}catch(e){return true;}
}

// --- Per-category result builders ---
function buildPageResults(){
  const marketLabel='Marketplace';
  const spacesLabel=_lang==='fr'?'Espaces':_lang==='es'?'Espacios':_lang==='de'?'Bereiche':'Workspaces';
  return [
    {id:'search.nav.overview',icon:'🏠',title:t('nav_overview'),sub:t('nav_overview'),keywords:'home overview main dashboard focus pomodoro timer'},
    {id:'dashboard.nav.files',icon:'📁',title:t('nav_files'),sub:t('nav_files'),keywords:'files links documents'},
    {id:'dashboard.nav.notes',icon:'📝',title:t('nav_notes'),sub:t('nav_notes'),keywords:'notes write text'},
    {id:'dashboard.nav.todos',icon:'✅',title:t('nav_tasks'),sub:t('nav_tasks'),keywords:'tasks todos checklist'},
    {id:'search.nav.kanban',icon:'📋',title:t('nav_kanban'),sub:t('nav_kanban'),keywords:'kanban board cards'},
    {id:'dashboard.nav.calendar',icon:'📅',title:t('nav_calendar'),sub:t('nav_calendar'),keywords:'calendar events schedule'},
    {id:'search.habits.open',icon:'🔥',title:t('nav_habits'),sub:t('nav_habits'),keywords:'habits streak daily'},
    {id:'search.nav.gaming',icon:'🎮',title:t('nav_gaming'),sub:t('nav_gaming'),keywords:'gaming valorant lol steam overwatch riot'},
    {id:'search.nav.valorantAccounts',icon:'🎯',title:t('nav_valorant_accounts'),sub:t('nav_gaming'),keywords:'valorant riot valo accounts'},
    {id:'search.nav.stats',icon:'📊',title:t('nav_stats'),sub:t('nav_stats'),keywords:'stats statistics analytics'},
    {id:'search.connections.open',icon:'🔗',title:t('nav_connections'),sub:t('nav_connections'),keywords:'connections discord spotify twitch lastfm github groq'},
    {id:'search.settings.openTab',context:{tab:'profilee'},icon:'⚙️',title:t('nav_settings'),sub:t('nav_settings'),keywords:'settings profile account security password'},
    {id:'search.brain.open',icon:'🤖',title:t('nav_ai'),sub:t('nav_ai'),keywords:'brain ai assistant chat ask ia'},
    {id:'dashboard.nav.marketplace',icon:'🛍️',title:marketLabel,sub:marketLabel,keywords:'marketplace shop store'},
    {id:'dashboard.nav.workspaces',icon:'🗂️',title:spacesLabel,sub:spacesLabel,keywords:'workspaces spaces'},
  ].map(e=>Object.assign({category:'pages'},e));
}
function buildQuickActionResults(){
  return [
    {id:'search.items.create',icon:'➕',title:'Add item',sub:'File, link or folder',kbd:'Ctrl+A',keywords:'add item file link folder new'},
    {id:'search.notes.create',icon:'📝',title:'New note',sub:'Create a note',kbd:'N',keywords:'new note create write'},
    {id:'search.todos.create',icon:'✅',title:'Add task',sub:'Quick task',kbd:'T',keywords:'add task new todo create'},
    {id:'search.calendar.create',icon:'📅',title:'New event',sub:'Add to calendar',keywords:'new event add calendar create'},
    {id:'search.profile.switch',icon:'🔄',title:'Switch profile',sub:'Profile select',keywords:'switch profile change user'},
    {id:'search.presentation.open',icon:'🖥️',title:'Presentation mode',sub:'Full-screen dashboard on TV',kbd:'P',keywords:'presentation tv fullscreen mode'},
    {id:'search.language.toggle',icon:'🌐',title:'Toggle language',sub:'FR/EN/ES/DE',keywords:'language toggle fr en es de'},
  ].map(e=>Object.assign({category:'actions'},e));
}
function buildNoteResults(q){
  if(!q)return [];
  const p=curP();
  return (p?.state?.notes||[]).map(n=>({
    id:'search.notes.open',context:{noteId:n.id},category:'notes',
    icon:'📝',title:n.title||'Untitled',sub:(n.content||'').slice(0,60)||'Note',
    keywords:n.content||''
  }));
}
function buildTaskResults(q){
  if(!q)return [];
  const p=curP();
  return (p?.state?.todos||[]).map(td=>({
    id:'search.todos.open',context:{todoId:td.id},category:'tasks',
    icon:td.done?'✔️':'⬜',title:td.text||'Untitled',sub:td.done?'Done':(td.due?('Due '+td.due):'Task'),
    keywords:td.tag||''
  }));
}
function itemToCmdResult(item){
  return {
    id:'search.items.open',context:{itemId:item.id},category:'files',
    icon:item.type==='link'?'🔗':item.type==='folder'?'📁':item.type==='image'?'🖼️':'📄',
    title:item.name||'Untitled',sub:item.url||item.type||'File',
    keywords:item.tag||''
  };
}
function buildItemResults(q){
  const p=curP();
  return (p?.state?.items||[]).map(itemToCmdResult);
}
function buildHabitResults(q){
  if(!q)return [];
  const p=curP();
  return (p?.state?.habits||[]).map(h=>({
    id:'search.habits.open',category:'habits',
    icon:h.icon||'🔥',title:h.name||'Untitled',sub:'Habit'+(h.streak?(' · '+h.streak+' day streak'):'')
  }));
}
function buildEventResults(q){
  if(!q)return [];
  const p=curP();
  return (p?.state?.events||[]).map(ev=>({
    id:'search.calendar.open',context:{date:ev.date},category:'calendar',
    icon:'📅',title:ev.title||'Untitled',sub:ev.date||'Event'
  }));
}
function buildSettingsResults(q){
  if(!q)return [];
  return [
    {tab:'profilee',label:'Profile',keywords:'profile avatar name'},
    {tab:'security',label:'Security',keywords:'security password'},
    {tab:'account',label:'Account',keywords:'account email username'}
  ].map(x=>({
    id:'search.settings.openTab',context:{tab:x.tab},category:'settings',
    icon:'⚙️',title:x.label,sub:'Settings',keywords:x.keywords
  }));
}

function cmdCategoryLabel(cat){
  const map={
    pages:t('cmd_pages'),actions:t('cmd_actions'),
    notes:t('nav_notes'),tasks:t('nav_tasks'),files:t('cmd_files'),
    habits:t('nav_habits'),calendar:t('nav_calendar'),settings:t('nav_settings')
  };
  return map[cat]||cat;
}

function buildAllResults(q){
  q=(q||'').toLowerCase().trim();
  const CAP=5;
  function scoreAndCap(items,cap){
    let scored=items.map(item=>({item,score:scoreMatch(cmdSearchText(item.title,item.sub,item.keywords),q)})).filter(x=>x.score>0);
    scored.sort((a,b)=>b.score-a.score);
    return (cap?scored.slice(0,cap):scored).map(x=>x.item);
  }
  const groups=[
    {key:'actions',items:scoreAndCap(buildQuickActionResults(),null)},
    {key:'pages',items:scoreAndCap(buildPageResults(),null)},
    {key:'notes',items:scoreAndCap(buildNoteResults(q),CAP)},
    {key:'tasks',items:scoreAndCap(buildTaskResults(q),CAP)},
    {key:'files',items:scoreAndCap(buildItemResults(q),q?CAP:4)},
    {key:'habits',items:scoreAndCap(buildHabitResults(q),CAP)},
    {key:'calendar',items:scoreAndCap(buildEventResults(q),CAP)},
    {key:'settings',items:scoreAndCap(buildSettingsResults(q),CAP)},
  ];
  const sections=[],all=[];
  groups.forEach(g=>{
    if(g.items.length){sections.push({key:g.key,label:cmdCategoryLabel(g.key),items:g.items});all.push(...g.items);}
  });
  return{sections,all};
}

function renderCmdResults(){
  const q=document.getElementById('cmd-input')?.value||'';
  const{sections,all}=buildAllResults(q);
  _cmdSelectedIdx=all.length?Math.max(0,Math.min(_cmdSelectedIdx,all.length-1)):0;
  const c=document.getElementById('cmd-results');if(!c)return;
  let html='',gi=0;
  if(!all.length){
    html='<div style="text-align:center;padding:28px;color:var(--muted2);font-size:13px">No results</div>';
  }else{
    sections.forEach(sec=>{
      html+=`<div class="cmd-section-label">${escapeHTML(sec.label)}</div>`;
      sec.items.forEach(item=>{
        const idx=gi,sel=idx===_cmdSelectedIdx,enabled=isCmdItemEnabled(item);
        html+=`<div class="cmd-item${sel?' selected':''}${!enabled?' is-disabled':''}" data-idx="${idx}" onmousedown="event.preventDefault();executeCmdItem(${idx})" onmouseover="_cmdSelectedIdx=${idx};renderCmdResults()">
          <div class="cmd-item-icon">${item.icon||'◆'}</div>
          <div style="flex:1;min-width:0"><div class="cmd-item-label">${escapeHTML(item.title)}</div>${item.sub?`<div class="cmd-item-sub">${escapeHTML(item.sub)}</div>`:''}</div>
          ${item.kbd?`<span class="cmd-item-kbd">${escapeHTML(item.kbd)}</span>`:''}
          ${!enabled?`<span class="cmd-item-tag">${escapeHTML(t('coming_soon'))}</span>`:''}
        </div>`;
        gi++;
      });
    });
  }
  c.innerHTML=html;
  if(_cmdKeyboardNav){
    const selEl=c.querySelector('.cmd-item.selected');
    if(selEl)selEl.scrollIntoView({block:'nearest'});
  }
  _cmdKeyboardNav=false;
}

function executeCmdItem(idx){
  const{all}=buildAllResults(document.getElementById('cmd-input')?.value||'');
  const item=all[idx];
  if(!item)return;
  closeCmdPalette();
  requestAnimationFrame(()=>{
    const Actions=window.Ethone&&window.Ethone.get('actions');
    if(Actions)Actions.dispatch(item.id,item.context);
    else console.warn('[ETHONE cmd-palette] Action registry unavailable');
  });
}
function handleCmdKey(e){
  const{all}=buildAllResults(document.getElementById('cmd-input')?.value||'');
  if(e.key==='Escape'){closeCmdPalette();return;}
  if(!all.length)return;
  if(e.key==='ArrowDown'){e.preventDefault();_cmdKeyboardNav=true;_cmdSelectedIdx=(_cmdSelectedIdx+1)%all.length;renderCmdResults();}
  else if(e.key==='ArrowUp'){e.preventDefault();_cmdKeyboardNav=true;_cmdSelectedIdx=(_cmdSelectedIdx-1+all.length)%all.length;renderCmdResults();}
  else if(e.key==='Enter'){e.preventDefault();executeCmdItem(_cmdSelectedIdx);}
}

// --- Search action handlers ---
function openSettingsTab(tab){
  switchPage('settings',null);
  const btn=document.querySelector('.settings-nav-item[onclick*="\''+tab+'\'"]');
  if(btn)switchSettingsTab(tab,btn);
}
function focusAIInput(){
  setTimeout(()=>{document.getElementById('ai-input')?.focus();},100);
}
function highlightTodo(id){
  setTimeout(()=>{
    const el=document.querySelector('.todo-item[onclick*="toggleTodo('+id+')"]');
    if(el){
      el.scrollIntoView({block:'center',behavior:'smooth'});
      el.classList.add('cmd-highlight-pulse');
      setTimeout(()=>el.classList.remove('cmd-highlight-pulse'),1200);
    }
  },150);
}
function registerSearchActions(){
  const Actions=window.Ethone&&window.Ethone.get('actions');
  if(!Actions||window.__ethoneSearchActionsRegistered)return;
  window.__ethoneSearchActionsRegistered=true;

  Actions.register('search.nav.overview',{handler:()=>switchPage('dashboard',null)});
  Actions.register('search.nav.kanban',{handler:()=>switchPage('kanban',null)});
  Actions.register('search.nav.gaming',{handler:()=>switchPage('gaming',null)});
  Actions.register('search.nav.stats',{handler:()=>switchPage('stats',null)});
  Actions.register('search.nav.valorantAccounts',{handler:()=>switchPage('valorant-accounts',null)});

  Actions.register('search.notes.open',{handler:ctx=>{switchPage('notes',null);if(ctx&&ctx.noteId!=null&&typeof selectNote==='function')selectNote(ctx.noteId);}});
  Actions.register('search.notes.create',{handler:()=>{switchPage('notes',null);if(typeof newNote==='function')newNote();}});

  Actions.register('search.todos.open',{handler:ctx=>{switchPage('todos',null);if(ctx&&ctx.todoId!=null)highlightTodo(ctx.todoId);}});
  Actions.register('search.todos.create',{handler:()=>openModal('add-todo')});

  Actions.register('search.items.open',{handler:ctx=>{if(ctx&&ctx.itemId!=null&&typeof openItem==='function')openItem(ctx.itemId);else switchPage('files',null);}});
  Actions.register('search.items.create',{handler:()=>openModal('add-item')});

  Actions.register('search.habits.open',{handler:()=>switchPage('habits',null)});

  Actions.register('search.calendar.open',{handler:ctx=>{
    switchPage('calendar',null);
    if(ctx&&ctx.date){
      const d=new Date(ctx.date);
      if(!isNaN(d)){calYear=d.getFullYear();calMonth=d.getMonth();}
      if(typeof renderCalendar==='function')renderCalendar();
      if(typeof showDayEvents==='function')showDayEvents(ctx.date);
    }
  }});
  Actions.register('search.calendar.create',{handler:()=>openModal('add-event')});

  Actions.register('search.settings.openTab',{handler:ctx=>openSettingsTab((ctx&&ctx.tab)||'profilee')});
  Actions.register('search.connections.open',{handler:()=>switchPage('connections',null)});
  Actions.register('search.brain.open',{handler:()=>{switchPage('ai',null);focusAIInput();}});

  Actions.register('search.profile.switch',{handler:()=>goToProfileScreen()});
  Actions.register('search.presentation.open',{handler:()=>openPresentationMode()});
  Actions.register('search.language.toggle',{handler:()=>{
    const langs=['fr','en','es','de'];const idx=langs.indexOf(_lang);
    setLangAndClose(langs[(idx+1)%langs.length],'lang-dd-topbar');
  }});
}
registerSearchActions();

// ══════════════════════════════════════════════════════════════
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
