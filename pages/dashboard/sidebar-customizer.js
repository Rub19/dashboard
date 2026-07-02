/* ETHONE legacy compatibility module: sidebar-customizer. */
// ══════════════════════════════════════════════════════════════
//  SIDEBAR LAYOUT CUSTOMIZER
// ══════════════════════════════════════════════════════════════
function renderSidebarCustomize(){
  const container=document.getElementById('sidebar-customize-list');
  if(!container)return;
  const p=curP();if(!p)return;

  const allItems=getDefaultNav();
  const saved=p.sidebarConfig;
  // Merge saved order/visibility with defaults
  let items=allItems.map(item=>{
    const savedItem=saved?.find?.(s=>s.id===item.id);
    return{...item,visible:savedItem?savedItem.visible!==false:true};
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
    row.setAttribute('draggable','true');
    row.dataset.id=item.id;
    row.style.cssText='display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);cursor:grab;transition:all .15s;margin-bottom:3px';
    row.innerHTML=`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:14px;height:14px;color:rgba(245,245,247,.25);flex-shrink:0"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>
      <span style="flex:1;font-size:13px;font-weight:500;color:${item.visible?'var(--text)':'rgba(245,245,247,.3)'}">${escapeHTML(item.label)}</span>
      <label style="display:flex;align-items:center;cursor:pointer">
        <input type="checkbox" ${item.visible?'checked':''} onchange="toggleSidebarItem('${item.id}',this.checked)" style="display:none">
        <div onclick="toggleSidebarItem('${item.id}',!${item.visible})" style="width:34px;height:18px;border-radius:99px;background:${item.visible?'linear-gradient(90deg,#8b5cf6,#7c3aed)':'rgba(255,255,255,.1)'};position:relative;transition:background .2s;cursor:pointer">
          <div style="position:absolute;top:2px;${item.visible?'right:2px':'left:2px'};width:14px;height:14px;border-radius:50%;background:#fff;transition:all .2s"></div>
        </div>
      </label>
    `;
    // Drag events
    row.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',item.id);row.style.opacity='.4';});
    row.addEventListener('dragend',()=>row.style.opacity='1');
    row.addEventListener('dragover',e=>{e.preventDefault();row.style.borderColor='rgba(139,92,246,.4)';});
    row.addEventListener('dragleave',()=>row.style.borderColor='rgba(255,255,255,.06)');
    row.addEventListener('drop',e=>{
      e.preventDefault();
      row.style.borderColor='rgba(255,255,255,.06)';
      const draggedId=e.dataTransfer.getData('text/plain');
      if(draggedId===item.id)return;
      reorderSidebarItem(draggedId,item.id);
    });
    container.appendChild(row);
  });
}

function toggleSidebarItem(id,visible){
  const p=curP();if(!p)return;
  if(!p.sidebarConfig)p.sidebarConfig=getDefaultNav().map(i=>({id:i.id,visible:true}));
  const item=p.sidebarConfig.find(i=>i.id===id);
  if(item)item.visible=visible;
  else p.sidebarConfig.push({id,visible});
  saveStateNow();
  renderSidebarCustomize();
  renderSidebarNav();
}

function reorderSidebarItem(fromId,toId){
  const p=curP();if(!p)return;
  const allItems=getDefaultNav();
  if(!p.sidebarConfig)p.sidebarConfig=allItems.map(i=>({id:i.id,visible:true}));
  const fromIdx=p.sidebarConfig.findIndex(i=>i.id===fromId);
  const toIdx=p.sidebarConfig.findIndex(i=>i.id===toId);
  if(fromIdx===-1||toIdx===-1)return;
  const [moved]=p.sidebarConfig.splice(fromIdx,1);
  p.sidebarConfig.splice(toIdx,0,moved);
  saveStateNow();
  renderSidebarCustomize();
  renderSidebarNav();
}
