/* ETHONE legacy compatibility module: stats-charts. */
// ===================================================
//  STATS PAGE CHARTS
// ===================================================
function renderStatsPage(){
  const p=curP();if(!p)return;
  const todos=p.state.todos||[];
  const items=p.state.items||[];
  const habits=p.state.habits||[];
  const pomo=p.state.pomoHistory||[];

  // Summary stats
  const setEl=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  setEl('st-total-items',items.length);
  setEl('st-total-done',todos.filter(t=>t.done).length);
  setEl('st-best-streak',Math.max(0,...habits.map(h=>habitStreak(h)||0)));
  setEl('st-pomo-total',pomo.length);
  const totalMins=Math.round(pomo.reduce((s,h)=>s+(h.duration||1500),0)/60);
  setEl('st-pomo-time',totalMins>=60?(totalMins/60).toFixed(1)+'h focus':totalMins+'m focus');

  // Heatmap
  renderStatsHeatmap();

  // V29 Analytics — Progression/Focus/Productivity/Habits calendars/Goals/History
  if(typeof renderAnalyticsExtra==='function')renderAnalyticsExtra();

  // Activity bars (last 7 days)
  const barsEl=document.getElementById('stats-activity-bars');
  const labelsEl=document.getElementById('stats-activity-labels');
  if(barsEl&&labelsEl){
    const days=['Su','Mo','Tu','We','Th','Fr','Sa'];
    const data=Array.from({length:7},(_,i)=>{
      const d=new Date();d.setDate(d.getDate()-6+i);
      const ds=d.toLocaleDateString('en-CA');
      const acts=(p.state.activity||[]).filter(a=>a.ts&&new Date(a.ts).toLocaleDateString('en-CA')===ds).length;
      return{day:days[d.getDay()],count:acts};
    });
    const maxV=Math.max(...data.map(d=>d.count),1);
    barsEl.innerHTML=data.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px">
      <div style="width:100%;background:var(--accent);border-radius:4px 4px 0 0;height:${Math.max(4,Math.round((d.count/maxV)*90))}px;opacity:${d.count?1:.2};transition:height .4s ease"></div>
    </div>`).join('');
    labelsEl.innerHTML=data.map(d=>`<div style="flex:1;text-align:center;font-size:10px;color:var(--muted)">${d.day}</div>`).join('');
  }

  // Tasks donut
  const canvas=document.getElementById('stats-tasks-donut');
  const legendEl=document.getElementById('stats-tasks-legend');
  if(canvas){
    const done=todos.filter(t=>t.done).length;
    const pending=todos.filter(t=>!t.done&&t.priority!=='high').length;
    const high=todos.filter(t=>!t.done&&t.priority==='high').length;
    const total=Math.max(todos.length,1);
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,90,90);
    const segments=[
      {val:done,color:'#34d399'},
      {val:pending,color:'#3b82f6'},
      {val:high,color:'#f87171'},
    ];
    let start=-Math.PI/2;
    segments.forEach(s=>{
      if(!s.val)return;
      const angle=(s.val/total)*Math.PI*2;
      ctx.beginPath();ctx.moveTo(45,45);
      ctx.arc(45,45,38,start,start+angle);
      ctx.closePath();ctx.fillStyle=s.color;ctx.fill();
      start+=angle;
    });
    // Center hole
    ctx.beginPath();ctx.arc(45,45,24,0,Math.PI*2);ctx.fillStyle='var(--surface)';ctx.fill();
    if(legendEl)legendEl.innerHTML=[
      {label:'Done',val:done,color:'#34d399'},
      {label:'Pending',val:pending,color:'#3b82f6'},
      {label:'High priority',val:high,color:'#f87171'},
    ].map(s=>`<div style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:${s.color};flex-shrink:0"></span><span style="color:var(--muted)">${s.label}</span><span style="font-weight:700;margin-left:auto">${s.val}</span></div>`).join('');
  }

  // Pomodoro bars
  const pomoBars=document.getElementById('stats-pomo-bars');
  const pomoLabels=document.getElementById('stats-pomo-labels');
  if(pomoBars&&pomoLabels){
    const days=['Su','Mo','Tu','We','Th','Fr','Sa'];
    const data=Array.from({length:7},(_,i)=>{
      const d=new Date();d.setDate(d.getDate()-6+i);
      const ds=d.toLocaleDateString('en-CA');
      return{day:days[d.getDay()],count:pomo.filter(h=>h.ts&&new Date(h.ts).toLocaleDateString('en-CA')===ds).length};
    });
    const maxV=Math.max(...data.map(d=>d.count),1);
    pomoBars.innerHTML=data.map(d=>`<div style="flex:1;background:${d.count?'var(--accent3)':'var(--surface3)'};border-radius:4px 4px 0 0;height:${Math.max(4,Math.round((d.count/maxV)*70))}px;transition:height .4s ease"></div>`).join('');
    pomoLabels.innerHTML=data.map(d=>`<div style="flex:1;text-align:center;font-size:10px;color:var(--muted)">${d.day}</div>`).join('');
  }

  // Habits completion
  const habitsListEl=document.getElementById('stats-habits-list');
  if(habitsListEl){
    habitsListEl.innerHTML=!habits.length?'<div class="empty-state" style="padding:12px"><div class="empty-label">No habits tracked</div></div>':
    habits.map(h=>{
      const total=7,done=Math.min(h.streak||0,7);
      const pct=Math.round((done/total)*100);
      return `<div class="habit-stat-row">
        <div class="habit-stat-name">${h.emoji||'🔥'} ${escapeHTML(h.name)}</div>
        <div class="habit-stat-bar-track"><div class="habit-stat-bar-fill" style="width:${pct}%"></div></div>
        <div class="habit-stat-pct">${h.streak||0}d</div>
      </div>`;
    }).join('');
  }
}
function updateStats(){
  const p=curP(),items=p?(p.state.items||[]):[],todos=p?(p.state.todos||[]):[];
  const sf=document.getElementById('stat-files'),sl=document.getElementById('stat-links'),st=document.getElementById('stat-tasks'),ss=document.getElementById('stat-tasks-sub'),fc=document.getElementById('files-count');
  if(sf)sf.textContent=items.filter(i=>i.type!=='link').length;
  if(sl)sl.textContent=items.filter(i=>i.type==='link').length;
  if(st)st.textContent=todos.filter(t=>t.done).length;
  if(ss)ss.textContent='of '+todos.length+' total';
  if(fc)fc.textContent=items.length;
}
