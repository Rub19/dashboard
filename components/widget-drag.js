/* ETHONE legacy compatibility module: widget-drag. */
//  DRAG & DROP OVERVIEW WIDGETS
// ══════════════════════════════════════════════════════════════
let _dragSrc=null;
function _getOverviewBlocks(){
  // Panels dans la colonne gauche du grid principal
  const left=document.getElementById('overview-col-left');
  const dash=document.getElementById('page-dashboard');
  const blocks=[];
  // Pinned panel (enfant direct du dash)
  const pinned=document.getElementById('pinned-panel');
  if(pinned)blocks.push(pinned);
  // Gaming (enfant direct du dash)
  const gaming=document.getElementById('gaming-overview-wrap');
  if(gaming)blocks.push(gaming);
  // Panels dans la colonne gauche
  if(left){
    [...left.children].forEach(el=>{
      if(el.tagName==='DIV')blocks.push(el);
    });
  }
  return blocks;
}

function _makeDraggable(block){
  if(block.dataset.draggable==='ready')return;
  block.dataset.draggable='ready';
  block.classList.add('overview-widget');
  block.setAttribute('draggable','true');
  block.style.cursor='grab';
  block.addEventListener('dragstart',function(e){_dragSrc=this;this.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
  block.addEventListener('dragend',function(){this.classList.remove('dragging');document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));});
  block.addEventListener('dragover',function(e){e.preventDefault();e.dataTransfer.dropEffect='move';this.classList.add('drag-over');});
  block.addEventListener('dragleave',function(){this.classList.remove('drag-over');});
  block.addEventListener('drop',function(e){
    e.preventDefault();e.stopPropagation();this.classList.remove('drag-over');
    if(_dragSrc&&_dragSrc!==this&&_dragSrc.parentNode===this.parentNode){
      const par=this.parentNode;
      const si=[...par.children].indexOf(_dragSrc);
      const ti=[...par.children].indexOf(this);
      if(si<ti)par.insertBefore(_dragSrc,this.nextSibling);
      else par.insertBefore(_dragSrc,this);
      saveOverviewOrder();
    }
  });
}

function initOverviewDragDrop(){
  const left=document.getElementById('overview-col-left');
  const right=document.getElementById('overview-col-right');
  // Assigner des IDs stables aux panels gauche
  const leftNames=['recent-items-panel','tasks-events-panel','quick-note-panel','daily-focus-panel','activity-panel'];
  if(left)[...left.children].forEach((el,i)=>{if(!el.id)el.id=leftNames[i]||('overview-left-'+i);});
  // Assigner des IDs stables aux panels droite
  const rightNames=['pomo-widget-panel','weather-widget-panel','quote-widget-panel','countdown-widget-panel'];
  if(right)[...right.children].forEach((el,i)=>{if(!el.id)el.id=rightNames[i]||('overview-right-'+i);});
  // Rendre tout draggable
  const allBlocks=[...( left?[...left.children]:[]), ...(right?[...right.children]:[])];
  allBlocks.forEach((block,i)=>{if(!block.id)block.id='overview-block-'+i; _makeDraggable(block);});
  restoreOverviewOrder();
}

function saveOverviewOrder(){
  const p=curP();if(!p)return;
  const left=document.getElementById('overview-col-left');
  const right=document.getElementById('overview-col-right');
  const leftIds=left?[...left.children].map(el=>el.id).filter(Boolean):[];
  const rightIds=right?[...right.children].map(el=>el.id).filter(Boolean):[];
  if(!p.state)p.state={};
  p.state.overviewOrder={left:leftIds,right:rightIds};
  saveStateNow();
  if(_sbUser){clearTimeout(_saveCloudTimeout);saveCloudState().catch(()=>{});}
}

function restoreOverviewOrder(){
  const p=curP();if(!p)return;
  const order=p.state?.overviewOrder;
  if(!order)return;
  // Support ancien format (array) et nouveau (object)
  const leftIds=Array.isArray(order)?order:(order.left||[]);
  const rightIds=Array.isArray(order)?[]:(order.right||[]);
  const left=document.getElementById('overview-col-left');
  const right=document.getElementById('overview-col-right');
  if(left)leftIds.forEach(id=>{const el=document.getElementById(id);if(el&&el.parentNode===left)left.appendChild(el);});
  if(right)rightIds.forEach(id=>{const el=document.getElementById(id);if(el&&el.parentNode===right)right.appendChild(el);});
}


// ══════════════════════════════════════════════
