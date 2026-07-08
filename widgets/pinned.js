/* ETHONE legacy compatibility module: pinned. */
// ===================================================
//  PINNED LINKS
// ===================================================
function addPinnedLink(){
  const p=curP();if(!p)return;
  const name=document.getElementById('pinned-name').value.trim();
  const url=document.getElementById('pinned-url').value.trim();
  const icon=document.getElementById('pinned-icon').value.trim()||'';
  if(!name||!url){toast('Enter a name and URL','error');return}
  if(!p.state.pinned)p.state.pinned=[];
  p.state.pinned.push({id:Date.now(),name,url,icon});
  saveStateNow();closeModal('add-pinned');
  ['pinned-name','pinned-url','pinned-icon'].forEach(i=>document.getElementById(i).value='');
  renderPinnedLinks();toast(name+' pinned!','success');
}
function removePinnedLink(id){
  const p=curP();if(!p)return;
  p.state.pinned=(p.state.pinned||[]).filter(l=>l.id!==id);
  saveStateNow();renderPinnedLinks();
}
function renderPinnedLinks(){
  const p=curP();const grid=document.getElementById('pinned-grid');if(!grid)return;
  const links=p?.state?.pinned||[];
  if(!links.length){grid.innerHTML='<div style="font-size:12px;color:var(--muted);padding:4px 2px">No pinned links yet - click + Pin link</div>';return}
  grid.innerHTML=links.map(l=>{
    const url=safeUrl(l.url);
    return '<a class="pinned-card" href="'+escapeHTML(url||'about:blank')+'" target="_blank" rel="noopener noreferrer">'+
      '<button class="pinned-remove" onclick="event.preventDefault();event.stopPropagation();removePinnedLink('+l.id+')">&times;</button>'+
      '<div class="pinned-favicon">'+escapeHTML(l.icon)+'</div>'+
      '<div class="pinned-name">'+escapeHTML(l.name)+'</div>'+
    '</a>';
  }).join('')+'<div class="pinned-card pinned-add" onclick="openModal(\'add-pinned\')" style="cursor:pointer;text-decoration:none"><div style="font-size:22px">+</div><div class="pinned-name">Add</div></div>';
}
