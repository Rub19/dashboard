/* ETHONE legacy compatibility module: presentation. */
//  PRESENTATION MODE
// ══════════════════════════════════════════════════════════════
let _presClockInterval=null;

function openPresentationMode(){
  const overlay=document.getElementById('presentation-overlay');
  if(!overlay)return;
  overlay.classList.add('active');
  renderPresentation();
  // Clock
  clearInterval(_presClockInterval);
  const updateClock=()=>{
    const el=document.getElementById('pres-clock');
    if(el)el.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  };
  updateClock();
  _presClockInterval=setInterval(updateClock,1000);
  // Fullscreen
  try{document.documentElement.requestFullscreen?.();}catch(e){}
  toast('Presentation mode — press ESC to exit','info');
}

function closePresentationMode(){
  document.getElementById('presentation-overlay')?.classList.remove('active');
  clearInterval(_presClockInterval);
  try{document.exitFullscreen?.();}catch(e){}
}

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&document.getElementById('presentation-overlay')?.classList.contains('active')){
    closePresentationMode();
  }
});

function renderPresentation(){
  const p=curP();if(!p)return;
  const nameEl=document.getElementById('pres-username');
  if(nameEl)nameEl.textContent=p.name||'User';
  const body=document.getElementById('pres-body');if(!body)return;
  const s=p.state||{};
  const todos=s.todos||[];const habits=s.habits||[];
  const pomo=s.pomoHistory||[];
  const todayStr=new Date().toLocaleDateString('en-CA');
  const todayPomos=pomo.filter(h=>h.ts&&new Date(h.ts).toLocaleDateString('en-CA')===todayStr).length;
  const pending=todos.filter(t=>!t.done);
  const doneTasks=todos.filter(t=>t.done).length;
  const bestStreak=Math.max(0,...habits.map(h=>h.streak||0));

  // RR from gaming
  const valo=s.gaming?.valo;
  const rank=valo?.lastRank||null;

  body.innerHTML=`
    <!-- Stats grid -->
    <div class="pres-card accent" style="grid-column:1;grid-row:1">
      <div class="pres-card-label">Tasks completed</div>
      <div class="pres-card-value">${doneTasks}</div>
      <div class="pres-card-sub">${pending.length} pending</div>
    </div>

    <div class="pres-card" style="grid-column:2;grid-row:1">
      <div class="pres-card-label">Upcoming tasks</div>
      <div class="pres-tasks-list">
        ${pending.slice(0,5).map(t=>`<div class="pres-task"><div class="pres-task-dot" style="background:${t.priority==='high'?'#f87171':'#8b5cf6'}"></div><span>${escapeHTML(t.text||'')}</span></div>`).join('')||'<div style="color:var(--muted2);font-size:13px;padding:8px">All done! 🎉</div>'}
      </div>
    </div>

    <div class="pres-card" style="grid-column:3;grid-row:1">
      <div class="pres-card-label">Focus today</div>
      <div class="pres-card-value">${todayPomos}</div>
      <div class="pres-card-sub">pomodoro session${todayPomos!==1?'s':''}</div>
    </div>

    <div class="pres-card" style="grid-column:1;grid-row:2">
      <div class="pres-card-label">Best streak</div>
      <div class="pres-card-value" style="color:#8b5cf6">${bestStreak}<span style="font-size:28px">🔥</span></div>
      <div class="pres-card-sub">days in a row</div>
    </div>

    <div class="pres-card" style="grid-column:2;grid-row:2">
      <div class="pres-card-label">Habits</div>
      <div class="pres-habits">
        ${habits.slice(0,6).map(h=>`<div class="pres-habit">
          <div class="pres-habit-name">${h.emoji||'🔥'} ${escapeHTML(h.name)}</div>
          <div class="pres-habit-streak">${h.streak||0}d streak</div>
        </div>`).join('')||'<div style="color:var(--muted2);font-size:13px">No habits yet</div>'}
      </div>
    </div>

    <div class="pres-card" style="grid-column:3;grid-row:2">
      <div class="pres-card-label">Files & links</div>
      <div class="pres-card-value">${(s.items||[]).length}</div>
      <div class="pres-card-sub">${(s.items||[]).filter(i=>i.type==='link').length} links · ${(s.items||[]).filter(i=>i.type!=='link').length} files</div>
    </div>
  `;
}
