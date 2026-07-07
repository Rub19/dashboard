/* ETHONE legacy compatibility module: sidebar-widget-manager.
   Now manages the LIVE widgets panel (#live-panel), not the sidebar — the
   sidebar only hosts navigation. State moved from curP().state.sidebarWidgets
   to curP().state.liveWidgets, with a one-time migration for existing users.

   Two families of widgets live here:
   - "static" (WIDGET_DEFS): Discord/Now Playing/Last.fm/Twitch/Steam/GitHub —
     pre-existing HTML cards in index.html, just reordered/shown/hidden.
   - "dynamic" (window.LivePanelCatalog, from live-panel-catalog.js): Weather/
     Clock/Calendar/CPU/RAM/Network (singleton) and Custom (multi-instance) —
     mounted/unmounted on demand via ensureCatalogWidgetMounted(). */
const WIDGET_ICONS={
  discord:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="4"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',
  nowplaying:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  lastfm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  twitch:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h16v11l-4 4h-4l-3 3H7v-3H4V3Z"/><line x1="12" y1="7" x2="12" y2="12"/><line x1="16" y1="7" x2="16" y2="12"/></svg>',
  steam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M8.5 15.5 4 20"/></svg>',
  github:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
};

const WIDGET_DEFS=[
  {id:'discord', label:'Discord', sub:'Status & activité', icon:WIDGET_ICONS.discord, bg:'#5865F2', requires:'discord.userId'},
  {id:'nowplaying', label:'Now Playing', sub:'Last.fm live', icon:WIDGET_ICONS.nowplaying, bg:'rgba(29,185,84,.25)', requires:'lastfm.username'},
  {id:'lastfm', label:'Scrobbling', sub:'Last.fm', icon:WIDGET_ICONS.lastfm, bg:'rgba(213,16,7,.2)', requires:'lastfm.username'},
  {id:'twitch', label:'Twitch', sub:'Streamers en live', icon:WIDGET_ICONS.twitch, bg:'rgba(145,71,255,.22)', requires:'twitch.streamers'},
  {id:'steam', label:'Steam', sub:'Statut & jeu en cours', icon:WIDGET_ICONS.steam, bg:'rgba(102,192,244,.2)', requires:'steam.steamId'},
  {id:'github', label:'GitHub', sub:'Activité récente', icon:WIDGET_ICONS.github, bg:'rgba(255,255,255,.12)', requires:'github.username'},
];

// Singleton dynamic types — id === instanceId === LivePanelCatalog key.
const DYNAMIC_SINGLETON_IDS=['weather','clock','calendar','cpu','ram','network'];
function dynamicDef(id){
  const cat=window.LivePanelCatalog&&window.LivePanelCatalog[id];
  if(!cat)return null;
  return {id, label:cat.label, sub:cat.demo?'Démo — données simulées':'', icon:cat.icon, bg:'rgba(255,255,255,.08)', requires:null, dynamic:true};
}

function getWidgetPrefs(){
  const p=curP();if(!p)return{order:['discord','nowplaying','lastfm'],visible:{},pinned:{},config:{},sizes:{}};
  if(!p.state.liveWidgets){
    // One-time migration from the old sidebar-scoped state key.
    const legacy=p.state.sidebarWidgets;
    p.state.liveWidgets=legacy
      ?{order:legacy.order||['discord','nowplaying','lastfm'],visible:legacy.visible||{},pinned:{},config:{},sizes:{}}
      :{order:['discord','nowplaying','lastfm'],visible:{},pinned:{},config:{},sizes:{}};
  }
  const lw=p.state.liveWidgets;
  if(!lw.order)lw.order=['discord','nowplaying','lastfm'];
  if(!lw.visible)lw.visible={};
  if(!lw.pinned)lw.pinned={};
  if(!lw.config)lw.config={};
  if(!lw.sizes)lw.sizes={};
  return {order:lw.order, visible:lw.visible, pinned:lw.pinned, config:lw.config, sizes:lw.sizes};
}

function saveWidgetPrefs(order,visible,pinned){
  const p=curP();if(!p)return;
  if(!p.state.liveWidgets)p.state.liveWidgets={};
  p.state.liveWidgets.order=order;
  p.state.liveWidgets.visible=visible;
  if(pinned)p.state.liveWidgets.pinned=pinned;
  saveStateNow();
  applySidebarWidgetOrder();
}

function widgetTypeOf(id){
  if(WIDGET_DEFS.some(d=>d.id===id))return 'static';
  if(DYNAMIC_SINGLETON_IDS.includes(id))return id;
  const {config}=getWidgetPrefs();
  return (config[id]&&config[id].type)||null;
}

// Dynamic (weather/clock/…) widgets have no pre-existing DOM presence — unlike
// the static ones, they're only "on" once explicitly added to `order`. Static
// widgets stay on the old default-visible-until-hidden behavior.
function isWidgetEffectivelyOn(def, order, visible, hasConn){
  if(def.dynamic && !order.includes(def.id)) return false;
  return visible[def.id]!==false && !!hasConn;
}

function renderWidgetManager(){
  const list=document.getElementById('widget-order-list');
  if(!list)return;
  const p=curP();if(!p)return;
  const conn=p.state.connections||{};
  const {order,visible,pinned,config}=getWidgetPrefs();

  const staticAndDynamicDefs=WIDGET_DEFS.concat(DYNAMIC_SINGLETON_IDS.map(dynamicDef).filter(Boolean));
  const customIds=Object.keys(config).filter(id=>config[id]&&config[id].type==='custom');

  const allDefs=staticAndDynamicDefs.concat(customIds.map(id=>({
    id, label:config[id].title||'Widget personnalisé', sub:'Personnalisé', icon:'✨', bg:'rgba(255,255,255,.08)', requires:null, custom:true,
  })));

  const sorted=[...order]
    .map(id=>allDefs.find(d=>d.id===id))
    .filter(Boolean)
    .concat(allDefs.filter(d=>!order.includes(d.id)));

  list.innerHTML='';
  sorted.forEach(def=>{
    const hasConn=def.requires ? def.requires.split('.').reduce((obj,k)=>obj?.[k], conn) : true;
    const isOn=isWidgetEffectivelyOn(def, order, visible, hasConn);
    const isPinned=!!pinned[def.id];

    const row=document.createElement('div');
    row.className='widget-row';
    row.dataset.wid=def.id;
    row.draggable=true;
    row.innerHTML=`
      <span class="widget-drag-handle">⠿</span>
      <div class="widget-row-icon" style="background:${def.bg}">${def.icon}</div>
      <div style="flex:1;min-width:0">
        <div class="widget-row-label">${def.label}</div>
        <div class="widget-row-sub">${hasConn?(def.sub||''):'Not connected'}</div>
      </div>
      <button type="button" class="live-panel-icon-btn" style="width:26px;height:26px;font-size:12px;${isPinned?'color:#d8ccff;border-color:rgba(139,92,246,.3);background:rgba(139,92,246,.12)':''}" onclick="toggleWidgetPinned('${def.id}',this)" title="${isPinned?'Désépingler':'Épingler en haut'}" aria-pressed="${isPinned}">📌</button>
      ${def.custom
        ?`<button type="button" class="live-panel-icon-btn" style="width:26px;height:26px;font-size:12px" onclick="removeCustomWidgetInstance('${def.id}')" title="Supprimer ce widget">🗑</button>`
        :`<div class="ui-switch" role="switch" tabindex="0" aria-checked="${isOn}" onclick="toggleWidgetVisible('${def.id}',this)" onkeydown="switchKeydown(event,this)" title="${isOn?'Masquer':'Afficher'} dans le panneau"></div>`}
    `;

    row.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('text/plain',def.id);
      setTimeout(()=>row.classList.add('dragging'),0);
    });
    row.addEventListener('dragend',()=>row.classList.remove('dragging'));
    row.addEventListener('dragover',e=>{e.preventDefault();row.classList.add('drag-over');});
    row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));
    row.addEventListener('drop',e=>{
      e.preventDefault();row.classList.remove('drag-over');
      const fromId=e.dataTransfer.getData('text/plain');
      const toId=def.id;
      if(fromId===toId)return;
      const {order:ord,visible:vis,pinned:pin}=getWidgetPrefs();
      const newOrd=[...ord];
      const fi=newOrd.indexOf(fromId), ti=newOrd.indexOf(toId);
      if(fi>-1)newOrd.splice(fi,1);
      const ti2=newOrd.indexOf(toId);
      newOrd.splice(ti2>=0?ti2:newOrd.length,0,fromId);
      saveWidgetPrefs(newOrd,vis,pin);
      renderWidgetManager();
    });

    list.appendChild(row);
  });
}

function toggleWidgetVisible(wid, switchEl){
  const {order,visible,pinned}=getWidgetPrefs();
  const wasOn=visible[wid]!==false;
  visible[wid]=!wasOn;
  if(switchEl)switchEl.setAttribute('aria-checked',String(!wasOn));
  saveWidgetPrefs(order,visible,pinned);
  initSidebarWidgets(curP());
}

function toggleWidgetPinned(wid, btnEl){
  const {order,visible,pinned}=getWidgetPrefs();
  const wasPinned=!!pinned[wid];
  pinned[wid]=!wasPinned;
  saveWidgetPrefs(order,visible,pinned);
  renderWidgetManager();
}

function ensureCatalogWidgetMounted(id){
  const type=widgetTypeOf(id);
  if(type==='static'||!type)return null;
  const existing=document.getElementById('lp-w-'+id);
  if(existing)return existing;
  const cat=window.LivePanelCatalog&&window.LivePanelCatalog[type];
  if(!cat)return null;
  const list=document.getElementById('sb-live-list');
  if(!list)return null;
  const el=document.createElement('div');
  el.className='sb-section lp-catalog-widget';
  el.id='lp-w-'+id;
  list.appendChild(el);
  const {config}=getWidgetPrefs();
  cat.mount(el,{instanceId:id, config:config[id]||{}});
  return el;
}

function unmountCatalogWidget(id){
  const el=document.getElementById('lp-w-'+id);
  if(!el)return;
  const type=widgetTypeOf(id);
  const cat=type&&window.LivePanelCatalog&&window.LivePanelCatalog[type];
  if(cat&&cat.unmount)cat.unmount(el);
  el.remove();
}

function applySidebarWidgetOrder(){
  const {order,visible,pinned}=getWidgetPrefs();
  const parent=document.getElementById('sb-live-list');
  if(!parent)return;

  const idToEl={
    discord: document.getElementById('sb-discord-wrap'),
    nowplaying: document.getElementById('sb-spotify-wrap')||document.getElementById('sb-spotify-iframe-wrap'),
    lastfm: document.getElementById('sb-lastfm-wrap'),
    twitch: document.getElementById('sb-twitch-wrap'),
    steam: document.getElementById('sb-steam-wrap'),
    github: document.getElementById('sb-github-wrap'),
  };

  // Dynamic/custom widgets: mount if visible+never mounted, unmount if hidden.
  order.forEach(id=>{
    const type=widgetTypeOf(id);
    if(type==='static'||!type)return;
    const isOn=visible[id]!==false;
    if(isOn) idToEl[id]=ensureCatalogWidgetMounted(id);
    else unmountCatalogWidget(id);
  });

  const fullOrder=[...order].concat(WIDGET_DEFS.map(d=>d.id).filter(id=>!order.includes(id)));
  const sortedOrder=fullOrder
    .map((id,i)=>({id,i,pinned:!!pinned[id]}))
    .sort((a,b)=> (b.pinned - a.pinned) || (a.i - b.i))
    .map(x=>x.id);

  sortedOrder.forEach(id=>{
    const el=idToEl[id];
    if(el&&el.parentNode===parent)parent.appendChild(el);
    if(el&&typeof window.ensureLivePanelWidgetResizable==='function')window.ensureLivePanelWidgetResizable(el,id);
  });
}

// ── LIVE section visibility: shown only if at least one widget card is visible ──
function updateLiveSectionVisibility(){
  const section=document.getElementById('sb-live-section');
  const list=document.getElementById('sb-live-list');
  const placeholder=document.getElementById('live-panel-empty-placeholder');
  if(!section||!list)return;
  const anyVisible=Array.prototype.some.call(list.children,el=>getComputedStyle(el).display!=='none');
  section.style.setProperty('display',anyVisible?'block':'none','important');
  if(placeholder)placeholder.style.display=anyVisible?'none':'block';
  if(typeof window.ethoneUpdateSidebarScrollFade==='function')window.ethoneUpdateSidebarScrollFade();
}
(function watchLiveSection(){
  document.addEventListener('DOMContentLoaded',()=>{
    const list=document.getElementById('sb-live-list');
    if(!list)return;
    try{
      new MutationObserver(updateLiveSectionVisibility).observe(list,{attributes:true,attributeFilter:['style'],subtree:true,childList:true});
    }catch(e){}
    updateLiveSectionVisibility();
  });
})();
window.updateLiveSectionVisibility=updateLiveSectionVisibility;

// ── Custom widget instances (multi-instance) ────────────────────────────────
function createCustomWidget(){
  const title=(window.prompt('Titre du widget :')||'').trim();
  if(!title)return;
  const content=(window.prompt('Contenu (texte libre, optionnel) :')||'').trim();
  const id='custom-'+Date.now().toString(36);
  const {order,visible,pinned,config}=getWidgetPrefs();
  order.push(id);
  visible[id]=true;
  config[id]={type:'custom', title, content};
  saveWidgetPrefs(order,visible,pinned);
  initSidebarWidgets(curP());
  if(typeof renderWidgetManager==='function')renderWidgetManager();
}
window.createCustomWidget=createCustomWidget;

function removeCustomWidgetInstance(id){
  const {order,visible,pinned,config}=getWidgetPrefs();
  const idx=order.indexOf(id);
  if(idx>-1)order.splice(idx,1);
  delete visible[id];
  delete pinned[id];
  delete config[id];
  unmountCatalogWidget(id);
  saveWidgetPrefs(order,visible,pinned);
  if(typeof renderWidgetManager==='function')renderWidgetManager();
}
window.removeCustomWidgetInstance=removeCustomWidgetInstance;

// ── Live panel header actions ──────────────────────────────────────────────
window.openLivePanelManager=function(){
  if(typeof window.ethoneLivePanelResize!=='undefined' && window.ethoneLivePanelResize.isRetracted()) window.toggleLivePanel(true);
  if(typeof switchPage==='function') switchPage('connections');
  setTimeout(()=>{
    const card=document.getElementById('sidebar-widget-manager');
    if(card)card.scrollIntoView({behavior:'smooth',block:'start'});
  },80);
};

window.openLivePanelAddPicker=function(){
  const existing=document.getElementById('live-panel-add-dd');
  if(existing){existing.remove();return;}
  const btn=document.getElementById('live-panel-add-btn');
  if(!btn)return;
  const {visible}=getWidgetPrefs();
  const p=curP();const conn=(p&&p.state&&p.state.connections)||{};

  const allDefs=WIDGET_DEFS.concat(DYNAMIC_SINGLETON_IDS.map(dynamicDef).filter(Boolean));

  const dd=document.createElement('div');
  dd.id='live-panel-add-dd';
  dd.className='ui-dropdown';
  dd.style.cssText='position:fixed;z-index:1100;min-width:230px';
  const {order:currentOrder}=getWidgetPrefs();
  dd.innerHTML=allDefs.map(def=>{
    const hasConn=def.requires ? def.requires.split('.').reduce((obj,k)=>obj?.[k], conn) : true;
    const isOn=isWidgetEffectivelyOn(def, currentOrder, visible, hasConn);
    const notYetAdded=def.dynamic && !currentOrder.includes(def.id);
    return `<div class="ui-dropdown-item" data-wid="${def.id}" aria-selected="${isOn}">
      <span>${def.label}</span>
      <span style="margin-left:auto;font-size:10px;color:var(--text-tertiary)">${!hasConn?'Non connecté':notYetAdded?'Ajouter':(isOn?'Affiché':'Masqué')}</span>
    </div>`;
  }).join('')
  +'<div class="ui-dropdown-item" data-action="custom" style="border-top:1px solid var(--border-primary);margin-top:4px;padding-top:8px;color:var(--text-accent)"><span>+ Créer un widget personnalisé</span></div>';

  document.body.appendChild(dd);
  const r=btn.getBoundingClientRect();
  dd.style.top=(r.bottom+6)+'px';
  dd.style.right=(window.innerWidth-r.right)+'px';

  dd.addEventListener('click',e=>{
    const item=e.target.closest('.ui-dropdown-item');
    if(!item)return;
    if(item.dataset.action==='custom'){
      dd.remove();
      createCustomWidget();
      return;
    }
    const wid=item.dataset.wid;
    const def=allDefs.find(d=>d.id===wid);
    const {order,visible:vis,pinned}=getWidgetPrefs();
    const hasConn=def.requires ? def.requires.split('.').reduce((obj,k)=>obj?.[k], conn) : true;
    if(!hasConn){
      if(typeof toast==='function')toast('Connecte d\'abord '+def.label+' dans Connexions','info');
      return;
    }
    const wasOn=isWidgetEffectivelyOn(def, order, vis, hasConn);
    vis[wid]=!wasOn;
    if(!order.includes(wid))order.push(wid);
    saveWidgetPrefs(order,vis,pinned);
    initSidebarWidgets(curP());
    dd.remove();
  });

  setTimeout(()=>{
    document.addEventListener('mousedown',function closeOnOutside(e){
      if(!dd.contains(e.target)&&e.target!==btn){dd.remove();document.removeEventListener('mousedown',closeOnOutside);}
    });
  },10);
};
