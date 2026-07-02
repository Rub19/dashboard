/* ETHONE legacy compatibility module: sidebar-widget-manager. */
// ── SIDEBAR WIDGET MANAGER ─────────────────────────────────────────────────
const WIDGET_DEFS=[
  {id:'discord', label:'Discord', sub:'Status & activité', icon:'💬', bg:'#5865F2', requires:'discord.userId'},
  {id:'nowplaying', label:'Now Playing', sub:'Last.fm live', icon:'♪', bg:'rgba(29,185,84,.25)', requires:'lastfm.username'},
  {id:'lastfm', label:'Scrobbling', sub:'Last.fm', icon:'♫', bg:'rgba(213,16,7,.2)', requires:'lastfm.username'},
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
  const sidebar=document.querySelector('.sidebar-widgets-area')||document.querySelector('nav .sidebar-scroll')||document.querySelector('nav');
  if(!sidebar)return;

  // Map widget id to wrap element
  const idToEl={
    discord: document.getElementById('sb-discord-wrap'),
    nowplaying: document.getElementById('sb-spotify-wrap')||document.getElementById('sb-spotify-iframe-wrap'),
    lastfm: document.getElementById('sb-lastfm-wrap'),
  };

  // Find common parent
  const wraps=Object.values(idToEl).filter(Boolean);
  if(!wraps.length)return;
  const parent=wraps[0].parentNode;
  if(!parent)return;

  // Reorder in DOM
  order.forEach(id=>{
    const el=idToEl[id];
    if(el&&el.parentNode===parent)parent.appendChild(el);
  });
}
