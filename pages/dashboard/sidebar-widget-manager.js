/* ETHONE legacy compatibility module: sidebar-widget-manager. */
// ── SIDEBAR WIDGET MANAGER ─────────────────────────────────────────────────
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

function getWidgetPrefs(){
  const p=curP();if(!p)return{order:['discord','nowplaying','lastfm'],visible:{}};
  if(!p.state.sidebarWidgets)p.state.sidebarWidgets={};
  const sw=p.state.sidebarWidgets;
  return {
    order: sw.order||['discord','nowplaying','lastfm'],
    visible: sw.visible||{}
  };
}

function saveWidgetPrefs(order,visible){
  const p=curP();if(!p)return;
  if(!p.state.sidebarWidgets)p.state.sidebarWidgets={};
  p.state.sidebarWidgets.order=order;
  p.state.sidebarWidgets.visible=visible;
  saveStateNow();
  applySidebarWidgetOrder();
}

function renderWidgetManager(){
  const list=document.getElementById('widget-order-list');
  if(!list)return;
  const p=curP();if(!p)return;
  const conn=p.state.connections||{};
  const {order,visible}=getWidgetPrefs();

  // Sort defs by saved order
  const sorted=[...order]
    .map(id=>WIDGET_DEFS.find(d=>d.id===id))
    .filter(Boolean)
    .concat(WIDGET_DEFS.filter(d=>!order.includes(d.id)));

  list.innerHTML='';
  sorted.forEach((def,i)=>{
    // Check if connection exists
    const parts=def.requires.split('.');
    const hasConn=parts.reduce((obj,k)=>obj?.[k], conn);
    const isOn=visible[def.id]!==false&&!!hasConn;

    const row=document.createElement('div');
    row.className='widget-row';
    row.dataset.wid=def.id;
    row.draggable=true;
    row.innerHTML=`
      <span class="widget-drag-handle">⠿</span>
      <div class="widget-row-icon" style="background:${def.bg}">${def.icon}</div>
      <div style="flex:1;min-width:0">
        <div class="widget-row-label">${def.label}</div>
        <div class="widget-row-sub">${hasConn?def.sub:'Not connected'}</div>
      </div>
      <div class="widget-toggle-switch${isOn?' on':''}" onclick="toggleWidgetVisible('${def.id}',this)" title="${isOn?'Hide':'Show'} in sidebar"></div>
    `;

    // Drag events
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
      const {order:ord,visible:vis}=getWidgetPrefs();
      const newOrd=[...ord];
      const fi=newOrd.indexOf(fromId), ti=newOrd.indexOf(toId);
      if(fi>-1)newOrd.splice(fi,1);
      const ti2=newOrd.indexOf(toId);
      newOrd.splice(ti2>=0?ti2:newOrd.length,0,fromId);
      saveWidgetPrefs(newOrd,vis);
      renderWidgetManager();
    });

    list.appendChild(row);
  });
}

function toggleWidgetVisible(wid, switchEl){
  const {order,visible}=getWidgetPrefs();
  const wasOn=visible[wid]!==false;
  visible[wid]=!wasOn;
  switchEl.classList.toggle('on',!wasOn);
  saveWidgetPrefs(order,visible);
  initSidebarWidgets(curP());
}

function applySidebarWidgetOrder(){
  const {order}=getWidgetPrefs();
  const parent=document.getElementById('sb-live-list');
  if(!parent)return;

  // Map widget id to wrap element
  const idToEl={
    discord: document.getElementById('sb-discord-wrap'),
    nowplaying: document.getElementById('sb-spotify-wrap')||document.getElementById('sb-spotify-iframe-wrap'),
    lastfm: document.getElementById('sb-lastfm-wrap'),
    twitch: document.getElementById('sb-twitch-wrap'),
    steam: document.getElementById('sb-steam-wrap'),
    github: document.getElementById('sb-github-wrap'),
  };

  // Reorder in DOM
  order.forEach(id=>{
    const el=idToEl[id];
    if(el&&el.parentNode===parent)parent.appendChild(el);
  });
  // Append any widget not in the saved order (e.g. newly added defs) at the end
  WIDGET_DEFS.forEach(def=>{
    if(order.includes(def.id))return;
    const el=idToEl[def.id];
    if(el&&el.parentNode===parent)parent.appendChild(el);
  });
}

// ── LIVE section visibility: shown only if at least one widget card is visible ──
function updateLiveSectionVisibility(){
  const section=document.getElementById('sb-live-section');
  const list=document.getElementById('sb-live-list');
  if(!section||!list)return;
  const anyVisible=Array.prototype.some.call(list.children,el=>getComputedStyle(el).display!=='none');
  section.style.setProperty('display',anyVisible?'block':'none','important');
  if(typeof window.ethoneUpdateSidebarScrollFade==='function')window.ethoneUpdateSidebarScrollFade();
}
(function watchLiveSection(){
  document.addEventListener('DOMContentLoaded',()=>{
    const list=document.getElementById('sb-live-list');
    if(!list)return;
    try{
      new MutationObserver(updateLiveSectionVisibility).observe(list,{attributes:true,attributeFilter:['style'],subtree:true});
    }catch(e){}
    updateLiveSectionVisibility();
  });
})();
window.updateLiveSectionVisibility=updateLiveSectionVisibility;
