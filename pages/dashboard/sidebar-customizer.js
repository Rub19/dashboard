/* ETHONE legacy compatibility module: sidebar-customizer. */
// ══════════════════════════════════════════════════════════════
//  SIDEBAR LAYOUT CUSTOMIZER
// ══════════════════════════════════════════════════════════════
function renderSidebarCustomize(){
  const container=document.getElementById('sidebar-customize-list');
  if(!container)return;
  bindSidebarCustomizerDrag(container);
  const p=curP();if(!p)return;

  const allItems=getDefaultNav();
  const saved=ensureSidebarConfig(p);
  // Merge saved order/visibility with defaults
  let items=allItems.map(item=>{
    const savedItem=saved?.find?.(s=>s.id===item.id);
    return{...item,visible:savedItem?savedItem.visible!==false:true,pinned:!!savedItem?.pinned};
  });
  // Sort by saved order if available
  if(saved?.length){
    items.sort((a,b)=>{
      const ai=saved.findIndex(s=>s.id===a.id);
      const bi=saved.findIndex(s=>s.id===b.id);
      if(ai===-1)return 1;if(bi===-1)return-1;return ai-bi;
    });
  }

  container.innerHTML='';
  items.forEach(item=>{
    const row=document.createElement('div');
    row.className='sidebar-customize-row';
    row.setAttribute('draggable','true');
    row.dataset.id=item.id;
    row.style.cssText='position:relative;display:flex;align-items:center;gap:10px;padding:8px 34px 8px 10px;border-radius:8px;background:rgba(var(--color-white-rgb),.03);border:1px solid rgba(var(--color-white-rgb),.06);cursor:grab;transition:all .15s;margin-bottom:3px';
    row.innerHTML=`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:14px;height:14px;color:rgba(var(--text-primary-rgb),.25);flex-shrink:0"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>
      <span style="flex:1;font-size:13px;font-weight:500;color:${item.visible?'var(--text)':'rgba(var(--text-primary-rgb),.3)'}">${escapeHTML(item.label)}</span>
      <label class="ui-switch" role="switch">
        <input type="checkbox" ${item.visible?'checked':''} onchange="toggleSidebarItem('${item.id}',this.checked)">
      </label>
      <button type="button" class="sb-pin-btn${item.pinned?' pinned':''}" onclick="toggleSidebarItemPin('${item.id}')" title="${item.pinned?'Retirer des favoris':'Épingler'}">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="${item.pinned?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3H7l3-3-1-6Z"/></svg>
      </button>
    `;
    container.appendChild(row);
  });
}

function bindSidebarCustomizerDrag(container){
  if(container.dataset.dragEventsBound==='true')return;
  container.dataset.dragEventsBound='true';

  const rowFromEvent=event=>{
    const target=event.target instanceof Element?event.target:null;
    const row=target?.closest?.('.sidebar-customize-row[data-id]');
    return row&&container.contains(row)?row:null;
  };

  container.addEventListener('dragstart',event=>{
    const row=rowFromEvent(event);
    if(!row||!event.dataTransfer)return;
    event.dataTransfer.setData('text/plain',row.dataset.id||'');
    row.style.opacity='.4';
  });
  container.addEventListener('dragend',event=>{
    const row=rowFromEvent(event);
    if(row)row.style.opacity='1';
  });
  container.addEventListener('dragover',event=>{
    const row=rowFromEvent(event);
    if(!row)return;
    event.preventDefault();
    row.style.borderColor='rgba(var(--primary-rgb),.4)';
  });
  container.addEventListener('dragleave',event=>{
    const row=rowFromEvent(event);
    if(!row||row.contains(event.relatedTarget))return;
    row.style.borderColor='rgba(var(--color-white-rgb),.06)';
  });
  container.addEventListener('drop',event=>{
    const row=rowFromEvent(event);
    if(!row||!event.dataTransfer)return;
    event.preventDefault();
    row.style.borderColor='rgba(var(--color-white-rgb),.06)';
    const draggedId=event.dataTransfer.getData('text/plain');
    const targetId=row.dataset.id||'';
    if(!draggedId||draggedId===targetId)return;
    reorderSidebarItem(draggedId,targetId);
  });
}

function ensureSidebarConfig(p){
  if(!p)return[];
  const defaults=getDefaultNav().map(item=>({id:item.id,visible:true,pinned:false}));
  const saved=Array.isArray(p.sidebarConfig)?p.sidebarConfig:[];
  const merged=defaults.map(item=>{
    const existing=saved.find(entry=>entry&&entry.id===item.id);
    return existing?{
      id:item.id,
      visible:existing.visible!==false,
      pinned:!!existing.pinned
    }:item;
  });
  saved.forEach(entry=>{
    if(entry&&entry.id&&!merged.some(item=>item.id===entry.id)){
      merged.push({
        id:entry.id,
        visible:entry.visible!==false,
        pinned:!!entry.pinned
      });
    }
  });
  p.sidebarConfig=merged;
  return merged;
}

function toggleSidebarItemPin(id){
  const p=curP();if(!p)return;
  ensureSidebarConfig(p);
  let item=p.sidebarConfig.find(i=>i.id===id);
  if(!item){item={id,visible:true};p.sidebarConfig.push(item);}
  item.pinned=!item.pinned;
  saveStateNow();
  renderSidebarCustomize();
  renderSidebarNav();
}

function toggleSidebarItem(id,visible){
  const p=curP();if(!p)return;
  ensureSidebarConfig(p);
  const item=p.sidebarConfig.find(i=>i.id===id);
  if(item)item.visible=visible;
  else p.sidebarConfig.push({id,visible});
  saveStateNow();
  renderSidebarCustomize();
  renderSidebarNav();
}

function reorderSidebarItem(fromId,toId){
  const p=curP();if(!p)return;
  ensureSidebarConfig(p);
  const fromIdx=p.sidebarConfig.findIndex(i=>i.id===fromId);
  const toIdx=p.sidebarConfig.findIndex(i=>i.id===toId);
  if(fromIdx===-1||toIdx===-1)return;
  const [moved]=p.sidebarConfig.splice(fromIdx,1);
  p.sidebarConfig.splice(toIdx,0,moved);
  saveStateNow();
  renderSidebarCustomize();
  renderSidebarNav();
}
