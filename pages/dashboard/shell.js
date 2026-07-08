/* ETHONE dashboard shell: premium OS sidebar navigation. */
var SVG_ICONS={
  dashboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>',
  files:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2h7A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"/></svg>',
  notes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h10l4 4v12H5V4Z"/><path d="M14 4v5h5"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>',
  todos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/><path d="M4 20h16"/></svg>',
  habits:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 3v9h9"/></svg>',
  kanban:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 4v16"/><path d="M15 4v16"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/></svg>',
  goals:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/></svg>',
  journal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8 8h6"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>',
  countdown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M9 2h6"/><path d="M12 13V8"/><path d="m12 13 3 2"/></svg>',
  stats:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V7"/><path d="M16 16v-8"/></svg>',
  github:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-4 1.2-4-2-6-2.5"/><path d="M15 22v-4a3.4 3.4 0 0 0-1-2.6c3-.3 6-1.5 6-6.8A5.3 5.3 0 0 0 18.6 5 4.9 4.9 0 0 0 18.5 2S17.4 1.7 15 3a11.6 11.6 0 0 0-6 0C6.6 1.7 5.5 2 5.5 2a4.9 4.9 0 0 0-.1 3A5.3 5.3 0 0 0 4 8.6c0 5.3 3 6.5 6 6.8A3.4 3.4 0 0 0 9 18v4"/></svg>',
  gaming:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14h4"/><path d="M9 12v4"/><path d="M15.5 13.5h.01"/><path d="M18 15.5h.01"/><path d="M8 7h8a5 5 0 0 1 4.9 4.1l.6 3.6a3.5 3.5 0 0 1-6.2 2.8L14 16H10l-1.3 1.5a3.5 3.5 0 0 1-6.2-2.8l.6-3.6A5 5 0 0 1 8 7Z"/></svg>',
  valorant:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5 12 19 20 5"/><path d="M8 5 12 12 16 5"/></svg>',
  connections:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="m8.7 10.7 6.6-3.4"/><path d="m8.7 13.3 6.6 3.4"/></svg>',
  marketplace:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3a7 7 0 0 0-1.7 1L5 6 3 9.4 5 11a7 7 0 0 0 0 2l-2 1.6L5 18l2.4-1a7 7 0 0 0 1.7 1l.4 3h5l.4-3a7 7 0 0 0 1.7-1L19 18l2-3.4L19 13a7 7 0 0 0 0-1Z"/></svg>',
  ai:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a7 7 0 0 0-7 7v3a7 7 0 0 0 14 0v-3a7 7 0 0 0-7-7Z"/><path d="M8 15h8"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 20v2"/></svg>',
  databases:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M20 5v7c0 1.7-3.6 3-8 3s-8-1.3-8-3V5"/><path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/></svg>',
  import:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11"/><path d="m7 9 5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  timeline:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8"/><path d="M4 12H2"/><path d="M22 12h-2"/></svg>',
  health:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7 12 3 4 7v5c0 4.4 3.2 7.3 8 9 4.8-1.7 8-4.6 8-9V7Z"/><path d="M8 12h2.3l1.2-2.5 2 5 1.2-2.5H17"/></svg>',
  versions:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H12a4 4 0 0 1 4 4v5.5"/><path d="M6 8.5V13a5 5 0 0 0 5 5h4.5"/></svg>'
  ,studio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 3v6h6"/><path d="M8 15h8"/><path d="M8 11h3"/></svg>'
};

function getDefaultNav(){return [
  {id:'dashboard',icon:'dashboard',label:t('nav_overview'),section:'main',badge:'',group:'core'},
  {id:'files',icon:'files',label:t('nav_files'),section:'main',badge:'',group:'core'},
  {id:'notes',icon:'notes',label:t('nav_notes'),section:'main',badge:'',group:'core'},
  {id:'todos',icon:'todos',label:t('nav_tasks'),section:'main',badge:'',group:'core'},
  {id:'habits',icon:'habits',label:t('nav_habits'),section:'main',badge:'',group:'core'},
  {id:'kanban',icon:'kanban',label:t('nav_kanban'),section:'main',badge:'',group:'core'},
  {id:'calendar',icon:'calendar',label:t('nav_calendar'),section:'main',badge:'',group:'core'},
  {id:'goals',icon:'goals',label:t('nav_goals'),section:'main',badge:'',group:'core'},
  {id:'journal',icon:'journal',label:t('nav_journal'),section:'main',badge:'',group:'core'},
  {id:'countdown',icon:'countdown',label:t('nav_countdown'),section:'main',badge:'',group:'core'},
  {id:'stats',icon:'stats',label:t('nav_stats'),section:'main',badge:'',group:'core'},
  {id:'activity',icon:'timeline',label:'Activity',section:'main',badge:'',group:'smart'},
  {id:'health',icon:'health',label:'Health',section:'main',badge:'',group:'smart'},
  {id:'versions',icon:'versions',label:'Version Center',section:'main',badge:'',group:'smart'},
  {id:'studio',icon:'studio',label:'Studio',section:'main',badge:'Create',group:'smart'},
  {id:'marketplace',icon:'marketplace',label:'Marketplace',section:'main',badge:'',group:'extras'},
  {id:'github',icon:'github',label:t('nav_github'),section:'main',badge:'',group:'extras'},
  {id:'gaming',icon:'gaming',label:t('nav_gaming'),section:'main',badge:'',group:'extras'},
  {id:'valorant-accounts',icon:'valorant',label:t('nav_valorant_accounts'),section:'main',badge:'',group:'extras'},
  {id:'databases',icon:'databases',label:t('nav_databases'),section:'main',badge:'',group:'extras'},
  {id:'import',icon:'import',label:'Import',section:'main',badge:'New',group:'extras'},
  {id:'connections',icon:'connections',label:t('nav_connections'),section:'main',badge:'',group:'extras'},
  {id:'settings',icon:'settings',label:t('nav_settings'),section:'account',badge:''},
  {id:'ai',icon:'ai',label:t('nav_ai'),section:'account',badge:''}
];}

function renderSidebarNav(){
  const p=curP();
  const baseNav=getDefaultNav();
  ensureOsSidebarShell();
  let nav=baseNav;
  if(p&&Array.isArray(p.sidebarConfig)&&p.sidebarConfig.length){
    nav=baseNav.map(item=>{
      const saved=p.sidebarConfig.find(s=>s.id===item.id);
      const alwaysVisible=['settings','ai','health'].includes(item.id);
      return {...item,visible:alwaysVisible||(saved?saved.visible!==false:true),pinned:!!(saved&&saved.pinned)};
    }).filter(i=>i.visible!==false);
    nav.sort((a,b)=>{
      const ai=p.sidebarConfig.findIndex(s=>s.id===a.id);
      const bi=p.sidebarConfig.findIndex(s=>s.id===b.id);
      if(ai===-1)return 1;
      if(bi===-1)return-1;
      return ai-bi;
    });
  }

  const mainEl=document.getElementById('sidebar-nav-main');
  const acctEl=document.getElementById('sidebar-nav-account');
  if(!mainEl||!acctEl)return;
  const page=document.querySelector('.tab-content.active')?.id?.replace('page-','')||'dashboard';
  updateOsSidebarHeader(p,page);

  const makeItem=(item,opts={})=>{
    const icon=SVG_ICONS[item.icon]||SVG_ICONS.dashboard;
    const isActive=page===item.id;
    const button=document.createElement('button');
    button.type='button';
    button.className='nav-item os-nav-item'+(isActive?' active':'')+(opts.smart?' os-smart-item':'')+(item.pinned?' is-pinned':'');
    button.dataset.page=item.id;
    button.dataset.navId=item.id;
    button.draggable=opts.draggable!==false;
    button.setAttribute('aria-current',isActive?'page':'false');
    button.setAttribute('aria-label',item.label);
    button.title=item.label;
    button.dataset.actionId='navigation.open';
    button.onclick=function(){
      const Actions=window.Ethone&&window.Ethone.get&&window.Ethone.get('actions');
      if(Actions&&Actions.dispatch)Actions.dispatch('navigation.open',{page:item.id,el:button,source:'sidebar'});
      else switchPage(item.id,button);
    };
    button.innerHTML=`<span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label-text">${escapeHTML(item.label)}</span>${item.badge?`<span class="nav-badge">${item.badge}</span>`:''}${item.pinned?'<span class="os-pin-dot" aria-hidden="true"></span>':''}`;
    wireOsNavDrag(button,item.id);
    return button;
  };

  mainEl.innerHTML='';
  acctEl.innerHTML='';
  const mainItems=nav.filter(i=>i.section==='main');
  const pinnedItems=mainItems.filter(i=>i.pinned);
  const regularItems=mainItems.filter(i=>!i.pinned&&!['activity','health','versions'].includes(i.id));
  const smartItems=nav.filter(i=>['ai','activity','health','versions'].includes(i.id));
  const bottomItems=nav.filter(i=>i.id==='settings');

  mainEl.appendChild(sectionShell('Favorites','favorites',pinnedItems.length?pinnedItems.map(i=>makeItem(i,{draggable:true})):[emptyRow('No favorites','Pin pages from Settings')]));
  mainEl.appendChild(sectionShell('Navigation','navigation',regularItems.map(i=>makeItem(i,{draggable:true}))));
  mainEl.appendChild(renderRecentSection(baseNav,makeItem));
  mainEl.appendChild(sectionShell('Smart','smart',smartItems.map(i=>makeItem(i,{smart:true,draggable:false})).concat(renderOsPinnedLinks())));
  acctEl.appendChild(renderBottomActions(bottomItems,makeItem));

  if(typeof window.ethonePositionNavPill==='function')setTimeout(window.ethonePositionNavPill,30);
  if(typeof window.ethoneUpdateSidebarScrollFade==='function')setTimeout(window.ethoneUpdateSidebarScrollFade,30);
}

function ensureOsSidebarShell(){
  const sb=document.getElementById('main-sidebar');
  if(!sb||sb.dataset.osSidebarReady==='1')return;
  sb.dataset.osSidebarReady='1';
  sb.classList.add('os-sidebar');
  sb.innerHTML=`
    <div class="os-sidebar-bg" aria-hidden="true"></div>
    <div class="os-sidebar-header">
      <div class="os-brand-row">
        <div class="logo-icon os-logo-mark" aria-hidden="true"><svg fill="none" height="14" viewBox="0 0 20 20" width="14"><rect x="4" y="5" width="12" height="2" rx="1" fill="white" opacity=".95"></rect><rect x="4" y="9" width="12" height="2" rx="1" fill="white" opacity=".95"></rect><rect x="4" y="13" width="8" height="2" rx="1" fill="white" opacity=".95"></rect></svg></div>
        <div class="os-brand-copy"><span class="logo-text" id="logo-text-el">ETHONE</span><small>Personal OS</small></div>
        <button class="os-icon-btn" id="sidebar-compact-btn" type="button" title="Compact mode" aria-label="Compact mode">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4 4 8l4 4"/><path d="M4 8h14"/><path d="m16 12 4 4-4 4"/><path d="M6 16h14"/></svg>
        </button>
      </div>
      <button class="os-workspace-switcher" type="button" id="os-sidebar-workspace" title="Switch Workspace">
        <span class="os-workspace-orb" id="os-sidebar-workspace-orb"></span>
        <span><strong id="os-sidebar-workspace-name">Workspace</strong><small id="os-sidebar-workspace-sub">Active environment</small></span>
        <i aria-hidden="true">v</i>
      </button>
      <button class="os-quick-search" type="button" id="os-sidebar-search" title="Ctrl+K">
        <span>Search ETHONE</span><kbd>Ctrl K</kbd>
      </button>
    </div>
    <div class="nav-active-pill" id="nav-active-pill" aria-hidden="true"></div>
    <div class="nav-section os-sidebar-scroll" id="sidebar-nav-main"></div>
    <div class="nav-section os-sidebar-bottom" id="sidebar-nav-account"></div>
  `;
  const compact=document.getElementById('sidebar-compact-btn');
  if(compact)compact.onclick=function(e){e.preventDefault();if(typeof toggleSidebarCompact==='function')toggleSidebarCompact();};
  const search=document.getElementById('os-sidebar-search');
  if(search){search.dataset.actionId='command.open';search.onclick=function(){
    const Actions=window.Ethone&&window.Ethone.get&&window.Ethone.get('actions');
    if(Actions&&Actions.dispatch)Actions.dispatch('command.open',{el:search,source:'sidebar'});
    else if(typeof openCmdPalette==='function')openCmdPalette();
  };}
  const workspace=document.getElementById('os-sidebar-workspace');
  if(workspace){workspace.dataset.actionId='spaces.open';workspace.onclick=function(){
    const Actions=window.Ethone&&window.Ethone.get&&window.Ethone.get('actions');
    if(Actions&&Actions.dispatch)Actions.dispatch('spaces.open',{el:workspace,source:'sidebar'});
    else if(typeof switchPage==='function')switchPage('dashboard',null);
  };}
}

function updateOsSidebarHeader(p,page){
  try{
    const name=document.getElementById('os-sidebar-workspace-name');
    const sub=document.getElementById('os-sidebar-workspace-sub');
    const orb=document.getElementById('os-sidebar-workspace-orb');
    let w=null;
    if(window.ETHONEWorkspaces&&window.ETHONEWorkspaces.active)w=window.ETHONEWorkspaces.active();
    if(name)name.textContent=(w&&w.name)||(p&&p.activeWorkspaceId)||'Personal';
    if(sub)sub.textContent=(page||'dashboard')+' environment';
    if(orb)orb.style.background=(w&&w.accent)||'linear-gradient(135deg,#8b5cf6,#a78bfa)';
  }catch(e){}
}

function sectionShell(title,key,children){
  const section=document.createElement('section');
  section.className='os-nav-section';
  section.dataset.section=key;
  const collapsed=localStorage.getItem('ethone:sidebar:section:'+key)==='0';
  section.innerHTML=`<button class="os-section-head" type="button" aria-expanded="${collapsed?'false':'true'}"><span>${escapeHTML(title)}</span><i aria-hidden="true">v</i></button><div class="os-section-body"></div>`;
  const body=section.querySelector('.os-section-body');
  children.forEach(child=>{
    if(child instanceof Node)body.appendChild(child);
    else console.warn('[ETHONE sidebar] Ignored invalid navigation node',child);
  });
  if(collapsed)section.classList.add('collapsed');
  section.querySelector('.os-section-head').onclick=function(){
    section.classList.toggle('collapsed');
    const isOpen=!section.classList.contains('collapsed');
    this.setAttribute('aria-expanded',isOpen?'true':'false');
    localStorage.setItem('ethone:sidebar:section:'+key,isOpen?'1':'0');
  };
  return section;
}

function emptyRow(title,sub){
  const row=document.createElement('div');
  row.className='os-empty-row';
  row.innerHTML=`<strong>${escapeHTML(title)}</strong><span>${escapeHTML(sub||'')}</span>`;
  return row;
}

function renderRecentSection(baseNav,makeItem){
  const recent=readOsRecentPages();
  const pages=recent.map(id=>baseNav.find(i=>i.id===id)).filter(Boolean).slice(0,4);
  return sectionShell('Recent','recent',pages.length?pages.map(i=>makeItem(i,{draggable:false})):[emptyRow('No recent pages','Navigation will appear here')]);
}

function renderOsPinnedLinks(){
  const p=curP();
  const pins=(p&&p.state&&Array.isArray(p.state.pinned)?p.state.pinned:[]).slice(0,3);
  return pins.map(pin=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='nav-item os-nav-item os-pinned-link';
    btn.title=pin.name||pin.url||'Pinned';
    btn.onclick=function(){try{window.open(pin.url,'_blank','noopener,noreferrer')}catch(e){}};
    btn.innerHTML=`<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3H7l3-3-1-6Z"/></svg></span><span class="nav-label-text">${escapeHTML(pin.name||pin.url||'Pinned')}</span>`;
    return btn;
  });
}

function renderBottomActions(bottomItems,makeItem){
  const wrap=document.createElement('div');
  wrap.className='os-bottom-wrap';
  wrap.innerHTML=`
    <div id="sb-sync-indicator" class="os-sync-indicator"><span id="sb-sync-dot"></span><span id="sb-sync-label">Sync</span></div>
    <div class="os-bottom-actions">
      <button class="os-icon-btn" type="button" id="os-sidebar-notifications" title="Notifications" aria-label="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
      </button>
      <button class="os-icon-btn" type="button" id="os-sidebar-widgets" title="Widgets" aria-label="Widgets">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>
      </button>
    </div>
    <button class="user-card os-user-card" type="button" id="os-sidebar-profile">
      <div class="sidebar-avatar" id="sidebar-avatar"></div>
      <span class="sidebar-avatar-status" id="sidebar-avatar-status" aria-hidden="true"></span>
      <div class="user-info"><div class="user-name" id="display-username">User</div><div class="user-role" id="sidebar-user-role">ETHONE</div></div>
      <span class="switch-hint">Switch</span>
    </button>
    <div class="os-settings-slot"></div>
  `;
  const settingsSlot=wrap.querySelector('.os-settings-slot');
  bottomItems.forEach(item=>settingsSlot.appendChild(makeItem(item,{draggable:false})));
  wrap.querySelector('#os-sidebar-notifications').onclick=function(){if(typeof toggleNotifPanel==='function')toggleNotifPanel();};
  wrap.querySelector('#os-sidebar-widgets').onclick=function(){if(typeof toggleLivePanel==='function')toggleLivePanel();};
  wrap.querySelector('#os-sidebar-profile').onclick=function(){if(typeof goToProfileScreen==='function')goToProfileScreen();};
  return wrap;
}

function readOsRecentPages(){
  try{return JSON.parse(localStorage.getItem('ethone:sidebar:recent')||'[]')}catch(e){return []}
}

function writeOsRecentPage(page){
  if(!page||page==='dashboard')return;
  const list=readOsRecentPages().filter(id=>id!==page);
  list.unshift(page);
  localStorage.setItem('ethone:sidebar:recent',JSON.stringify(list.slice(0,8)));
}

function wireOsNavDrag(button,id){
  button.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain',id);button.classList.add('dragging')});
  button.addEventListener('dragend',function(){button.classList.remove('dragging')});
  button.addEventListener('dragover',function(e){e.preventDefault();button.classList.add('drag-over')});
  button.addEventListener('dragleave',function(){button.classList.remove('drag-over')});
  button.addEventListener('drop',function(e){
    e.preventDefault();
    button.classList.remove('drag-over');
    const from=e.dataTransfer.getData('text/plain');
    if(from&&from!==id&&typeof reorderSidebarItem==='function')reorderSidebarItem(from,id);
  });
}

window.addEventListener('ethone:page-ready',function(e){
  const page=e&&e.detail&&e.detail.page;
  writeOsRecentPage(page);
});
