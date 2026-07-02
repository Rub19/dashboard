/* ETHONE legacy compatibility module: kanban. */
//  KANBAN
// ===================================================
let dragKanbanId=null;
function addKanbanCard(){
  const p=curP();if(!p)return;
  const title=document.getElementById('kcard-title').value.trim();
  if(!title){toast('Enter a title','error');return}
  const tag=document.getElementById('kcard-tag').value.trim();
  const col=document.getElementById('kcard-col').value;
  if(!p.state.kanban)p.state.kanban=[];
  p.state.kanban.push({id:Date.now(),title,tag,col});
  saveStateNow();closeModal('add-kcard');
  document.getElementById('kcard-title').value='';document.getElementById('kcard-tag').value='';
  renderKanban();toast('Card added!','success');
}
function quickAddKanban(col){
  document.getElementById('kcard-col').value=col;openModal('add-kcard');
}
function deleteKanbanCard(id){
  const p=curP();if(!p)return;
  p.state.kanban=(p.state.kanban||[]).filter(c=>c.id!==id);
  saveStateNow();renderKanban();
}
function kanbanDragOver(e,col){
  e.preventDefault();
  document.querySelectorAll('.kanban-drop-zone').forEach(z=>z.classList.remove('drag-over'));
  document.getElementById('kdrop-'+col)?.classList.add('drag-over');
}
function kanbanDragLeave(e){
  if(!e.currentTarget.contains(e.relatedTarget)){
    document.querySelectorAll('.kanban-drop-zone').forEach(z=>z.classList.remove('drag-over'));
  }
}
function kanbanDrop(e,col){
  e.preventDefault();
  document.querySelectorAll('.kanban-drop-zone').forEach(z=>z.classList.remove('drag-over'));
  if(dragKanbanId===null)return;
  const p=curP();if(!p)return;
  const card=p.state.kanban.find(c=>c.id===dragKanbanId);
  if(card){card.col=col;saveStateNow();renderKanban();}
  dragKanbanId=null;
}
const TAG_COLORS=['#7c6af7','#5de0b0','#f76a6a','#f7b26a','#5b8df7','#ec4899'];
function renderKanban(){
  const p=curP();
  const cards=p?.state?.kanban||[];
  ['todo','doing','done'].forEach(col=>{
    const list=document.getElementById('kcards-'+col);
    const count=document.getElementById('kcount-'+col);
    if(!list)return;
    const colCards=cards.filter(c=>c.col===col);
    if(count)count.textContent=colCards.length;
    if(!colCards.length){list.innerHTML='';return}
    list.innerHTML=colCards.map(c=>{
      const tagColor=c.tag?TAG_COLORS[Math.abs(String(c.tag).split('').reduce((a,b)=>a+b.charCodeAt(0),0))%TAG_COLORS.length]:'';
      return '<div class="kanban-card" draggable="true" data-id="'+c.id+'" ondragstart="dragKanbanId='+c.id+';this.classList.add(\'dragging\')" ondragend="this.classList.remove(\'dragging\')">'+
        '<button class="kanban-card-del" onclick="deleteKanbanCard('+c.id+')">&times;</button>'+
        '<div class="kanban-card-title">'+escapeHTML(c.title)+'</div>'+
        (c.tag?'<span class="kanban-card-tag" style="background:'+tagColor+'22;color:'+tagColor+'">'+escapeHTML(c.tag)+'</span>':'')+
      '</div>';
    }).join('');
  });
}


// ===================================================
