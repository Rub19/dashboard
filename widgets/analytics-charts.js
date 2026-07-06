/* ETHONE V29 — Analytics. Extends the existing Stats page (widgets/stats-charts.js,
   widgets/heatmap.js) with: Progression (XP), Focus time trend, Productivity trend,
   per-habit calendars, this week's Goals, and a History timeline. All real data —
   see calcProfileXP() in pages/profile/settings.js for the same XP formula used by
   the Profile card, reused here rather than re-implemented. */

function dayKeyLocal(d){return d.toLocaleDateString('en-CA');}
function dayKeyUTC(d){return d.toISOString().slice(0,10);}

function renderProgression(){
  const p=curP();if(!p)return;
  const s=p.state||{};
  const xp=typeof calcProfileXP==='function'?calcProfileXP(p):0;
  const level=Math.max(1,Math.floor(Math.sqrt(xp/50))+1);
  const xpForLevel=Math.pow(level-1,2)*50;
  const xpForNext=Math.pow(level,2)*50;
  const progress=xpForNext>xpForLevel?Math.min(100,Math.round(((xp-xpForLevel)/(xpForNext-xpForLevel))*100)):100;
  const setEl=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  setEl('an-xp-level','Lvl '+level);
  setEl('an-xp-total',xp.toLocaleString()+' XP');
  setEl('an-xp-next','Next: '+xpForNext.toLocaleString()+' XP');
  const bar=document.getElementById('an-xp-progress-bar');
  if(bar)setTimeout(()=>{bar.style.width=progress+'%';},100);

  // Cumulative XP curve from the two timestamped sources (todos.doneAt, pomoHistory.ts)
  const days=30;
  const todos=s.todos||[],pomo=s.pomoHistory||[];
  const perDay={};
  todos.filter(t=>t.done&&t.doneAt).forEach(t=>{const k=dayKeyLocal(new Date(t.doneAt));perDay[k]=(perDay[k]||0)+10;});
  pomo.forEach(h=>{if(!h.ts)return;const k=dayKeyLocal(new Date(h.ts));perDay[k]=(perDay[k]||0)+25;});
  const seq=Array.from({length:days},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(days-1)+i);
    return perDay[dayKeyLocal(d)]||0;
  });
  let running=0;const cumulative=seq.map(v=>running+=v);
  const maxV=Math.max(...cumulative,1);
  const barsEl=document.getElementById('an-progression-bars');
  if(barsEl){
    barsEl.innerHTML=cumulative.map(v=>`<div style="flex:1;background:var(--accent);opacity:.85;border-radius:2px 2px 0 0;height:${Math.max(2,Math.round((v/maxV)*66))}px" title="${v} XP"></div>`).join('');
  }
}

function renderFocusTrend(){
  const p=curP();if(!p)return;
  const pomo=p.state.pomoHistory||[];
  const days=14;
  const data=Array.from({length:days},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(days-1)+i);
    const k=dayKeyLocal(d);
    const mins=Math.round(pomo.filter(h=>h.ts&&dayKeyLocal(new Date(h.ts))===k).reduce((sum,h)=>sum+(h.duration||1500),0)/60);
    return{label:d.toLocaleDateString('en',{day:'numeric'}),mins};
  });
  const totalMins=data.reduce((s,d)=>s+d.mins,0);
  const totalLabel=document.getElementById('an-focus-total');
  if(totalLabel)totalLabel.textContent=(totalMins>=60?(totalMins/60).toFixed(1)+'h':totalMins+'m')+' over 14 days';
  const maxV=Math.max(...data.map(d=>d.mins),1);
  const barsEl=document.getElementById('an-focus-bars');
  const labelsEl=document.getElementById('an-focus-labels');
  if(barsEl)barsEl.innerHTML=data.map(d=>`<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end"><div style="width:100%;background:var(--accent3,#f87171);border-radius:3px 3px 0 0;height:${Math.max(3,Math.round((d.mins/maxV)*76))}px;opacity:${d.mins?1:.2}" title="${d.mins}min"></div></div>`).join('');
  if(labelsEl)labelsEl.innerHTML=data.map((d,i)=>i%2?`<div style="flex:1"></div>`:`<div style="flex:1;text-align:center;font-size:9px;color:var(--muted2)">${d.label}</div>`).join('');
}

function renderProductivityTrend(){
  const p=curP();if(!p)return;
  const todos=p.state.todos||[];
  const days=30;
  const data=Array.from({length:days},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(days-1)+i);
    const k=dayKeyLocal(d);
    return todos.filter(t=>t.done&&t.doneAt&&dayKeyLocal(new Date(t.doneAt))===k).length;
  });
  const maxV=Math.max(...data,1);
  const barsEl=document.getElementById('an-productivity-bars');
  if(barsEl)barsEl.innerHTML=data.map(v=>`<div style="flex:1;background:var(--success,#34d399);border-radius:2px 2px 0 0;height:${Math.max(2,Math.round((v/maxV)*76))}px;opacity:${v?1:.18}" title="${v} completed"></div>`).join('');
}

function renderHabitsCalendars(){
  const p=curP();if(!p)return;
  const habits=p.state.habits||[];
  const wrap=document.getElementById('an-habits-calendars');if(!wrap)return;
  if(!habits.length){wrap.innerHTML='<div class="empty-state" style="padding:12px"><div class="empty-label">No habits tracked</div></div>';return;}
  const days=30;
  wrap.innerHTML=habits.map(h=>{
    const cells=Array.from({length:days},(_,i)=>{
      const d=new Date();d.setDate(d.getDate()-(days-1)+i);
      const done=!!(h.log&&h.log[dayKeyUTC(d)]);
      return `<div style="width:9px;height:9px;border-radius:2px;background:${done?'var(--accent)':'rgba(255,255,255,.06)'}" title="${d.toLocaleDateString()}"></div>`;
    }).join('');
    const doneCount=Array.from({length:days},(_,i)=>{
      const d=new Date();d.setDate(d.getDate()-(days-1)+i);
      return h.log&&h.log[dayKeyUTC(d)]?1:0;
    }).reduce((a,b)=>a+b,0);
    const pct=Math.round((doneCount/days)*100);
    return `<div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
        <span style="font-size:12px;color:var(--text)">${h.icon||'🔥'} ${escapeHTML(h.name||'Habit')}</span>
        <span style="font-size:11px;color:var(--muted2)">${pct}% · ${h.streak||0}d streak</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(15,1fr);gap:3px">${cells}</div>
    </div>`;
  }).join('');
}

function renderGoalsCard(){
  const p=curP();if(!p)return;
  const wrap=document.getElementById('an-goals-list');if(!wrap)return;
  const week=typeof getWeekStart==='function'?getWeekStart():null;
  const goals=(p.state.goals||[]).filter(g=>!week||g.week===week);
  if(!goals.length){wrap.innerHTML='<div class="empty-state" style="padding:12px"><div class="empty-label">No goals this week</div></div>';return;}
  wrap.innerHTML=goals.map(g=>{
    const hasTarget=g.target>0;
    const pct=hasTarget?Math.min(100,Math.round(((g.progress||0)/g.target)*100)):(g.done?100:0);
    return `<div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="color:var(--text)">${g.emoji||'🎯'} ${escapeHTML(g.text||'Goal')}</span>
        <span style="color:var(--muted2)">${hasTarget?(g.progress||0)+'/'+g.target+' '+escapeHTML(g.unit||''):(g.done?'Done':'In progress')}</span>
      </div>
      <div class="habit-stat-bar-track"><div class="habit-stat-bar-fill" style="width:${pct}%;background:${g.done?'var(--success,#34d399)':'var(--accent)'}"></div></div>
    </div>`;
  }).join('');
}

function analyticsActivityIcon(text){
  const t=String(text||'').toLowerCase();
  if(t.includes('task')||t.includes('todo')||t.includes('complet'))return '✅';
  if(t.includes('note'))return '📝';
  if(t.includes('habit'))return '🔥';
  if(t.includes('goal'))return '🎯';
  if(t.includes('pomo')||t.includes('focus'))return '⏱️';
  if(t.includes('welcome')||t.includes('bon retour')||t.includes('connexion')||t.includes('signed'))return '👋';
  return '•';
}

function renderHistoryList(){
  const p=curP();if(!p)return;
  const wrap=document.getElementById('an-history-list');if(!wrap)return;
  const activity=(p.state.activity||[]).slice().sort((a,b)=>new Date(b.ts||0)-new Date(a.ts||0)).slice(0,60);
  if(!activity.length){wrap.innerHTML='<div class="empty-state" style="padding:12px"><div class="empty-label">No recent activity</div></div>';return;}
  wrap.innerHTML=activity.map(a=>{
    const d=a.ts?new Date(a.ts):null;
    const when=d?d.toLocaleDateString('en',{month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}):(a.time||'');
    return `<div style="display:flex;align-items:center;gap:9px;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.04)">
      <span style="flex-shrink:0">${analyticsActivityIcon(a.text)}</span>
      <span style="flex:1;min-width:0;font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(a.text||'Activity')}</span>
      <span style="flex-shrink:0;font-size:10px;color:var(--muted2);font-family:var(--mono)">${when}</span>
    </div>`;
  }).join('');
}

function renderAnalyticsExtra(){
  renderProgression();
  renderFocusTrend();
  renderProductivityTrend();
  renderHabitsCalendars();
  renderGoalsCard();
  renderHistoryList();
}
