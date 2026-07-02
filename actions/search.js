/* ETHONE legacy compatibility module: search. */
// ===================================================
//  GLOBAL SEARCH
// ===================================================
document.getElementById('global-search').addEventListener('input',function(){
  const q=this.value.toLowerCase();if(!q)return;
  const p=curP(),match=p?(p.state.items||[]).filter(i=>i.name.toLowerCase().includes(q)):[];
  if(match.length){toast('Found '+match.length+' item(s)','info');setTimeout(()=>{switchPage('files',null);document.getElementById('files-search').value=q;filterItems()},400)}
});


// ===================================================
