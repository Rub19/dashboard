/* ETHONE legacy compatibility module: todos. */
// ===================================================
//  TODOS
// ===================================================
let _todoColor='', _todoFilter='all';

function selectTodoColor(c){
  _todoColor=c;
  document.querySelectorAll('#todo-color-picks div').forEach(d=>{
    d.style.border=d.dataset.color===c?'2.5px solid var(--text)':'2px solid transparent';
    if(d.dataset.color===''&&c==='')d.style.border='2.5px solid var(--text)';
  });
}

function setTodoFilter(f){
  _todoFilter=f;
  ['all','pending','done','high'].forEach(t=>{
    const btn=document.getElementById('tf-'+t);
    if(btn)btn.classList.toggle('active',t===f);
  });
  renderTodos();
}

function addTodo(){
  const p=curP();if(!p)return;
  const text=document.getElementById('todo-text').value.trim();
  if(!text){toast('Enter a task','error');return;}
  const priority=document.getElementById('todo-priority').value;
  const due=document.getElementById('todo-due').value;
  const tag=document.getElementById('todo-tag').value.trim();
  const todo={id:Date.now(),text,priority,done:false,color:_todoColor,due,tag,
    date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'})};
  p.state.todos.unshift(todo);saveStateNow();closeModal('add-todo');
  ['todo-text','todo-due','todo-tag'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  _todoColor='';selectTodoColor('');
  renderTodos();if(typeof updateStats==='function')updateStats();
  if(typeof addActivity==='function')addActivity('New task: '+text,'var(--accent2)','task');toast('Task added!','success');
}

function toggleTodo(id){
  const p=curP();if(!p)return;
  const t=p.state.todos.find(t=>t.id===id);if(!t)return;
  t.done=!t.done;if(t.done)t.doneAt=new Date().toISOString();
  saveStateNow();renderTodos();if(typeof updateStats==='function')updateStats();
  if(t.done){if(typeof addActivity==='function')addActivity(t.text+' completed','var(--accent2)','task');toast('Task completed','success');}
}

function deleteTodo(id){
  const p=curP();if(!p)return;
  p.state.todos=p.state.todos.filter(t=>t.id!==id);
  saveStateNow();renderTodos();if(typeof updateStats==='function')updateStats();
  toast('Task deleted','info');
}

function clearDone(){
  const p=curP();if(!p)return;
  p.state.todos=p.state.todos.filter(t=>!t.done);
  saveStateNow();renderTodos();if(typeof updateStats==='function')updateStats();toast('Cleared','info');
}

function renderTodos(){
  const p=curP(),todos=p?(p.state.todos||[]):[];
  const search=(document.getElementById('todo-search')?.value||'').toLowerCase();
  const filter=_todoFilter||'all';

  let filtered=todos;
  if(search)filtered=filtered.filter(t=>t.text.toLowerCase().includes(search)||(t.tag||'').toLowerCase().includes(search));
  if(filter==='pending')filtered=filtered.filter(t=>!t.done);
  else if(filter==='done')filtered=filtered.filter(t=>t.done);
  else if(filter==='high')filtered=filtered.filter(t=>t.priority==='high');

  const pending=filtered.filter(t=>!t.done),done=filtered.filter(t=>t.done);
  const pL=document.getElementById('todo-pending-list'),dL=document.getElementById('todo-done-list');
  const pc=document.getElementById('todo-pending-count');
  if(pc)pc.textContent=pending.length+' pending';

  const renderItem=(t,isDone)=>{
    const pIcon={
      high:'<span class="ethone-inline-icon" aria-label="High priority"><i data-lucide="flame" aria-hidden="true"></i></span>',
      low:'<span class="ethone-inline-icon" aria-label="Low priority"><i data-lucide="circle" aria-hidden="true"></i></span>',
      normal:''
    }[t.priority]||'';
    const today=new Date().toLocaleDateString('en-CA');
    const overdue=t.due&&!t.done&&t.due<today;
    const dueStr=t.due?`<span class="ethone-icon-row" style="font-size:10px;color:${overdue?'var(--accent3)':'var(--muted)'}"><i data-lucide="calendar-days" aria-hidden="true"></i>${new Date(t.due+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}${overdue?'<i data-lucide="triangle-alert" aria-label="Overdue"></i>':''}</span>`:'';
    const tagStr=t.tag?`<span style="font-size:10px;background:var(--surface3);padding:1px 7px;border-radius:10px;color:var(--muted)">${escapeHTML(t.tag)}</span>`:'';
    const colorBar=t.color?`style="border-left:3px solid ${t.color}"`:'' ;
    return `<div class="todo-item" ${colorBar} onclick="toggleTodo(${t.id})">
      <div class="todo-check${isDone?' checked':''}"></div>
      <div style="flex:1;min-width:0">
        <div class="todo-text${isDone?' done':''}">${pIcon} ${escapeHTML(t.text)}</div>
        <div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap">${dueStr}${tagStr}</div>
      </div>
      <button class="item-btn" type="button" aria-label="Delete task" onclick="event.stopPropagation();deleteTodo(${t.id})" style="opacity:.65;flex-shrink:0"><i data-lucide="trash-2" aria-hidden="true"></i></button>
    </div>`;
  };

  if(pL)pL.innerHTML=!pending.length?'<div class="empty-state" style="padding:20px"><div class="empty-icon"><i data-lucide="circle-check-big" aria-hidden="true"></i></div>All done!</div>':pending.map(t=>renderItem(t,false)).join('');
  if(dL)dL.innerHTML=!done.length?'<div class="empty-state" style="padding:20px"><div class="empty-icon"><i data-lucide="list-todo" aria-hidden="true"></i></div>Nothing completed yet</div>':done.map(t=>renderItem(t,true)).join('');

  // Overview mini-list
  const ov=document.getElementById('overview-todos');
  const allPending=todos.filter(t=>!t.done);
  if(ov)ov.innerHTML=!allPending.length?'<div class="empty-state" style="padding:16px"><div class="empty-icon"><i data-lucide="circle-check-big" aria-hidden="true"></i></div>No pending tasks!</div>':allPending.slice(0,3).map(t=>`<div class="todo-item" onclick="toggleTodo(${t.id})"><div class="todo-check"></div><div class="todo-text">${escapeHTML(t.text)}</div></div>`).join('');
  const badge=document.getElementById('todo-count');if(badge)badge.textContent=allPending.length||'';
  try{
    const root=document.getElementById('page-todos')||document.getElementById('overview-todos');
    if(root&&window.ETHONEIconSystem&&typeof window.ETHONEIconSystem.apply==='function')window.ETHONEIconSystem.apply(root);
  }catch(error){}
}
