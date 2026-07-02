/* ETHONE legacy compatibility module: habits. */
//  HABITS
// ===================================================
function addHabit(){
  const p=curP();if(!p)return;
  const name=document.getElementById('habit-name-input').value.trim();
  const icon=document.getElementById('habit-icon-input').value.trim()||'';
  if(!name){toast('Enter a habit name','error');return}
  if(!p.state.habits)p.state.habits=[];
  p.state.habits.push({id:Date.now(),name,icon,log:{}});
  saveStateNow();closeModal('add-habit');
  document.getElementById('habit-name-input').value='';
  document.getElementById('habit-icon-input').value='';
  renderHabits();toast(name+' added!','success');
}
function toggleHabitDay(habitId,dateStr){
  const p=curP();if(!p)return;
  const h=p.state.habits.find(h=>h.id===habitId);if(!h)return;
  if(!h.log)h.log={};
  h.log[dateStr]=!h.log[dateStr];
  // Recalculer le streak depuis le log
  h.streak=habitStreak(h);
  h.lastDone=h.log[dateStr]?dateStr:(h.lastDone||null);
  saveStateNow();renderHabits();
}
function deleteHabit(id){
  const p=curP();if(!p)return;
  p.state.habits=(p.state.habits||[]).filter(h=>h.id!==id);
  saveStateNow();renderHabits();
}
function getWeekDays(){
  const days=[];const today=new Date();today.setHours(0,0,0,0);
  const mon=new Date(today);mon.setDate(today.getDate()-((today.getDay()+6)%7));
  for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);days.push(d);}
  return days;
}
function habitStreak(h){
  const today=new Date();today.setHours(0,0,0,0);
  let streak=0;let d=new Date(today);
  while(streak<3660){
    const key=d.toISOString().slice(0,10);
    if(!h.log||!h.log[key])break;
    streak++;d.setDate(d.getDate()-1);
  }
  return streak;
}
function renderHabits(){
  const p=curP();if(!p)return;const list=document.getElementById('habits-list');const streakEl=document.getElementById('habits-streaks');
  if(!list)return;
  const habits=p?.state?.habits||[];
  const weekDays=getWeekDays();
  const today=new Date();today.setHours(0,0,0,0);
  const dayLabels=['M','T','W','T','F','S','S'];
  const weekLabel=document.getElementById('habits-week-label');
  if(weekLabel)weekLabel.textContent=weekDays[0].toLocaleDateString('en',{month:'short',day:'numeric'})+'  '+weekDays[6].toLocaleDateString('en',{month:'short',day:'numeric'});
  if(!habits.length){list.innerHTML='<div class="empty-state"><div class="empty-icon"></div>No habits yet - add one!</div>';if(streakEl)streakEl.innerHTML='<div class="empty-state" style="padding:16px"><div class="empty-icon"></div>Complete habits to build streaks!</div>';return}
  list.innerHTML=habits.map(h=>{
    const dayBtns=weekDays.map((d,i)=>{
      const key=d.toISOString().slice(0,10);
      const isToday=d.getTime()===today.getTime();
      const done=h.log&&h.log[key];
      const isFuture=d>today;
      return '<div class="habit-day'+(done?' done':'')+(isToday&&!done?' today':'')+'" onclick="'+(isFuture?'':('toggleHabitDay('+h.id+',\''+key+'\')'))+'" style="'+(isFuture?'opacity:.3;cursor:default':'')+'" title="'+escapeHTML(d.toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'}))+'">'+dayLabels[i]+'</div>';
    }).join('');
    const streak=habitStreak(h);
    return '<div class="habit-row"><span style="font-size:18px">'+escapeHTML(h.icon)+'</span><span class="habit-name">'+escapeHTML(h.name)+'</span><div class="habit-days">'+dayBtns+'</div><span class="habit-streak">'+(streak>0?streak:'')+'</span><button class="habit-del" onclick="deleteHabit('+h.id+')">&times;</button></div>';
  }).join('');
  if(streakEl){
    const sorted=[...habits].sort((a,b)=>habitStreak(b)-habitStreak(a));
    streakEl.innerHTML=sorted.map(h=>{const s=habitStreak(h);return '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--r-sm);background:var(--surface2);margin-bottom:6px"><span style="font-size:18px">'+escapeHTML(h.icon)+'</span><span style="flex:1;font-size:13px">'+escapeHTML(h.name)+'</span><span style="font-family:var(--mono);font-size:13px;color:'+(s>0?'var(--accent3)':'var(--muted)')+'">'+(s>0?' '+s+' day'+(s>1?'s':''):'No streak')+'</span></div>';}).join('');
  }
}


// ===================================================
