/* ETHONE legacy compatibility module: goals. */
// ===================================================
//  WEEKLY GOALS
// ===================================================
function addGoal(){
  const p=curP();if(!p)return;
  const text=document.getElementById('goal-text').value.trim();
  if(!text){toast('Enter a goal','error');return;}
  const target=parseInt(document.getElementById('goal-target').value)||0;
  const unit=document.getElementById('goal-unit').value.trim();
  const emoji=document.getElementById('goal-emoji').value||'🎯';
  const weekStart=getWeekStart();
  if(!p.state.goals)p.state.goals=[];
  p.state.goals.push({id:Date.now(),text,target,unit,emoji,progress:0,done:false,week:weekStart,created:new Date().toISOString()});
  saveStateNow();closeModal('add-goal');
  ['goal-text','goal-target','goal-unit','goal-emoji'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  renderGoals();toast('Goal added! 🎯','success');
}

function getWeekStart(){
  const d=new Date();d.setHours(0,0,0,0);
  d.setDate(d.getDate()-d.getDay()+1);
  return d.toLocaleDateString('en-CA');
}

function incrementGoal(id,delta){
  const p=curP();if(!p)return;
  const g=(p.state.goals||[]).find(g=>g.id===id);if(!g)return;
  g.progress=Math.max(0,(g.progress||0)+delta);
  if(g.target>0&&g.progress>=g.target){g.done=true;if(delta>0)toast(g.emoji+' Goal complete!','success');}
  else g.done=false;
  saveStateNow();renderGoals();
}

function deleteGoal(id){
  const p=curP();if(!p)return;
  p.state.goals=(p.state.goals||[]).filter(g=>g.id!==id);
  saveStateNow();renderGoals();
}

function renderGoals(){
  const p=curP();if(!p)return;
  const week=getWeekStart();
  const all=p.state.goals||[];
  const thisWeek=all.filter(g=>g.week===week);
  const past=all.filter(g=>g.week!==week).sort((a,b)=>b.week.localeCompare(a.week));

  const listEl=document.getElementById('goals-list');
  const overallPct=document.getElementById('goals-overall-pct');
  const overallBar=document.getElementById('goals-overall-bar');
  const weekLabel=document.getElementById('goals-week-label');
  const histEl=document.getElementById('goals-history');

  if(weekLabel){const d=new Date(week);weekLabel.textContent='Week of '+d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}

  if(!listEl)return;
  if(!thisWeek.length){
    listEl.innerHTML='<div class="empty-state" style="padding:20px"><div class="empty-icon">🎯</div>No goals this week</div>';
    if(overallPct)overallPct.textContent='0%';
    if(overallBar)overallBar.style.width='0%';
  } else {
    const doneCount=thisWeek.filter(g=>g.done).length;
    const pct=Math.round((doneCount/thisWeek.length)*100);
    if(overallPct){overallPct.textContent=pct+'%';overallPct.style.color=pct>=100?'var(--accent2)':'var(--accent)';}
    if(overallBar)overallBar.style.width=pct+'%';
    listEl.innerHTML=thisWeek.map(g=>{
      const hasTarget=g.target>0;
      const prog=g.progress||0;
      const barPct=hasTarget?Math.min(100,Math.round((prog/g.target)*100)):g.done?100:0;
      return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:12px 14px;${g.done?'opacity:.75':''}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:20px">${g.emoji}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;${g.done?'text-decoration:line-through;color:var(--muted)':''}">${escapeHTML(g.text)}</div>
            ${hasTarget?`<div style="font-size:11px;color:var(--muted)">${prog} / ${g.target} ${escapeHTML(g.unit)}</div>`:''}
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            ${hasTarget?`<button onclick="incrementGoal(${g.id},-1)" style="background:var(--surface3);border:1px solid var(--border2);border-radius:6px;color:var(--text);width:26px;height:26px;cursor:pointer;font-size:14px">−</button>
            <button onclick="incrementGoal(${g.id},1)" style="background:var(--accent);border:none;border-radius:6px;color:#fff;width:26px;height:26px;cursor:pointer;font-size:14px">+</button>`
            :`<button onclick="incrementGoal(${g.id},${g.done?-1:1})" style="background:${g.done?'var(--surface3)':'var(--accent2)'};border:none;border-radius:6px;color:#fff;padding:3px 10px;cursor:pointer;font-size:12px">${g.done?'Undo':'Done'}</button>`}
            <button onclick="deleteGoal(${g.id})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:0 4px">🗑</button>
          </div>
        </div>
        ${hasTarget?`<div style="height:4px;background:var(--surface3);border-radius:99px;overflow:hidden"><div style="height:100%;width:${barPct}%;background:${barPct>=100?'var(--accent2)':'var(--accent)'};border-radius:99px;transition:width .3s ease"></div></div>`:''}
      </div>`;
    }).join('');
  }

  // Past weeks history
  if(histEl){
    const pastWeeks=[...new Set(past.map(g=>g.week))].slice(0,4);
    histEl.innerHTML=!pastWeeks.length?'<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px">No past weeks</div>':
    pastWeeks.map(w=>{
      const wGoals=past.filter(g=>g.week===w);
      const done=wGoals.filter(g=>g.done).length;
      const pct=Math.round((done/wGoals.length)*100);
      const d=new Date(w);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="flex:1;font-size:12px;color:var(--muted)">${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</div>
        <div style="font-size:12px;font-weight:600;color:${pct>=100?'var(--accent2)':'var(--text)'}">${done}/${wGoals.length} (${pct}%)</div>
      </div>`;
    }).join('');
  }
}
