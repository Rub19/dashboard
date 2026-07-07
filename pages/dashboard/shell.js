/* ETHONE legacy compatibility module: dashboard-shell. */
// ===================================================
//  DASHBOARD INIT
// ===================================================

// ══════════════════════════════════════════════════════════════
//  SIDEBAR NAVIGATION SYSTEM
// ══════════════════════════════════════════════════════════════
var SVG_ICONS={
  dashboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  files:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  notes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  todos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  habits:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/></svg>',
  kanban:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  goals:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  journal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  countdown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  stats:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  github:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
  gaming:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="1"/><circle cx="17.5" cy="13.5" r="1"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59l-.9 7.27A4 4 0 0 0 5.77 20.5c.387.1.79-.025 1.05-.327l1.89-2.173h6.58l1.89 2.173c.26.302.663.427 1.05.327a4 4 0 0 0 2.97-4.64l-.9-7.27A4 4 0 0 0 17.32 5z"/></svg>',
  valorant:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><line x1="12" y1="3.5" x2="12" y2="7.5"/><line x1="12" y1="16.5" x2="12" y2="20.5"/><line x1="3.5" y1="12" x2="7.5" y2="12"/><line x1="16.5" y1="12" x2="20.5" y2="12"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>',
  connections:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  ai:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/></svg>',
  databases:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 5v6c0 1.66-4.03 3-9 3s-9-1.34-9-3V5"/><path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6"/></svg>',
};

function getDefaultNav(){return [
  {id:'dashboard',icon:'dashboard',label:t('nav_overview'),section:'main',badge:'',group:'core'},
  {id:'files',    icon:'files',    label:t('nav_files'),   section:'main',badge:'',group:'core'},
  {id:'notes',    icon:'notes',    label:t('nav_notes'),   section:'main',badge:'',group:'core'},
  {id:'todos',    icon:'todos',    label:t('nav_tasks'),   section:'main',badge:'',group:'core'},
  {id:'habits',   icon:'habits',   label:t('nav_habits'),  section:'main',badge:'',group:'core'},
  {id:'kanban',   icon:'kanban',   label:t('nav_kanban'),  section:'main',badge:'',group:'core'},
  {id:'calendar', icon:'calendar', label:t('nav_calendar'),section:'main',badge:'',group:'core'},
  {id:'goals',    icon:'goals',    label:t('nav_goals'),   section:'main',badge:'',group:'core'},
  {id:'journal',  icon:'journal',  label:t('nav_journal'), section:'main',badge:'',group:'core'},
  {id:'countdown',icon:'countdown',label:t('nav_countdown'),section:'main',badge:'',group:'core'},
  {id:'stats',    icon:'stats',    label:t('nav_stats'),   section:'main',badge:'',group:'core'},
  {id:'github',   icon:'github',   label:t('nav_github'),  section:'main',badge:'',group:'extras'},
  {id:'gaming',   icon:'gaming',   label:t('nav_gaming'),  section:'main',badge:'',group:'extras'},
  {id:'valorant-accounts',icon:'valorant',label:t('nav_valorant_accounts'),section:'main',badge:'',group:'extras'},
  {id:'databases',icon:'databases',label:t('nav_databases'),section:'main',badge:'',group:'extras'},
  {id:'connections',icon:'connections',label:t('nav_connections'),section:'account',badge:''},
  {id:'settings', icon:'settings', label:t('nav_settings'),section:'account',badge:''},
  {id:'ai',       icon:'ai',       label:t('nav_ai'),      section:'account',badge:''},
];}

function renderSidebarNav(){
  const p=curP();
  const baseNav=getDefaultNav();
  // Apply saved order/visibility from sidebarConfig
  let nav=baseNav;
  if(p?.sidebarConfig?.length){
    nav=baseNav.map(item=>{
      const saved=p.sidebarConfig.find(s=>s.id===item.id);
      // 'settings' and 'ai' are always visible regardless of saved config
      const alwaysVisible=['settings','ai'].includes(item.id);
      return{...item,visible:alwaysVisible||(saved?saved.visible!==false:true),pinned:!!saved?.pinned};
    }).filter(i=>i.visible!==false);
    nav.sort((a,b)=>{
      const ai=p.sidebarConfig.findIndex(s=>s.id===a.id);
      const bi=p.sidebarConfig.findIndex(s=>s.id===b.id);
      if(ai===-1)return 1;if(bi===-1)return-1;return ai-bi;
    });
  }
  const mainEl=document.getElementById('sidebar-nav-main');
  const acctEl=document.getElementById('sidebar-nav-account');
  if(!mainEl||!acctEl)return;

  const page=document.querySelector('.tab-content.active')?.id?.replace('page-','');
  const makeItem=(item)=>{
    const icon=SVG_ICONS[item.icon]||'';
    const isActive=page===item.id;
    const button=document.createElement('button');
    button.type='button';
    button.className='nav-item'+(isActive?' active':'');
    button.dataset.page=item.id;
    button.setAttribute('aria-current',isActive?'page':'false');
    button.setAttribute('aria-label',item.label);
    button.title=item.label;
    button.onclick=()=>switchPage(item.id,button);
    button.innerHTML=`<span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label-text">${escapeHTML(item.label)}</span>${item.badge?`<span class="nav-badge">${item.badge}</span>`:''}`;
    return button;
  };

  mainEl.innerHTML='';
  acctEl.innerHTML='';
  const mainItems=nav.filter(i=>i.section==='main');
  const pinnedItems=mainItems.filter(i=>i.pinned);
  const restItems=mainItems.filter(i=>!i.pinned);
  if(pinnedItems.length){
    const lbl=document.createElement('div');
    lbl.className='nav-label sb-pinned-label';
    lbl.textContent='Favoris';
    mainEl.appendChild(lbl);
    pinnedItems.forEach(item=>mainEl.appendChild(makeItem(item)));
  }
  // Custom drag order can interleave 'core'/'extras' items freely — once the
  // user has reordered, their order IS the grouping, so auto-dividers would
  // just flicker in and out. Only show the divider on the untouched default order.
  const groupsAreContiguous=(()=>{
    let seenExtras=false,backToCore=false;
    for(const it of restItems){
      if(it.group==='extras')seenExtras=true;
      else if(seenExtras)backToCore=true;
    }
    return !backToCore;
  })();
  let lastGroup=null;
  restItems.forEach(item=>{
    // Only 'extras' gets its own divider — 'core' is the implicit default
    // section and doesn't need a redundant label right after Favoris/top.
    if(groupsAreContiguous&&item.group==='extras'&&lastGroup!=='extras'){
      const glbl=document.createElement('div');
      glbl.className='nav-label sb-group-label';
      glbl.textContent='Gaming & Data';
      mainEl.appendChild(glbl);
    }
    lastGroup=item.group;
    mainEl.appendChild(makeItem(item));
  });
  acctEl.innerHTML='<div class="nav-label">Account</div>';
  nav.filter(i=>i.section==='account').forEach(item=>acctEl.appendChild(makeItem(item)));
}
