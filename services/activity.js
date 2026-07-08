/* ETHONE legacy compatibility module: activity.
 * The old dashboard activity feed now reads from ETHONE Timeline.
 */
// ===================================================
//  ACTIVITY
// ===================================================
function renderOverviewEvents(){
  const p=curP();if(!p)return;
  const container=document.getElementById('overview-events');if(!container)return;
  const today=new Date().toISOString().slice(0,10);
  const events=(p.state.events||[]).filter(e=>e.date>=today).slice(0,5);
  if(!events.length){
    container.innerHTML='<div class="empty-state" style="padding:16px"><div style="font-size:20px;margin-bottom:6px">&#128197;</div>No upcoming events!</div>';
    return;
  }
  container.innerHTML=events.map(e=>{
    const d=new Date(e.date+'T00:00:00');
    const isToday=e.date===today;
    const isTomorrow=e.date===new Date(Date.now()+86400000).toISOString().slice(0,10);
    const dayLabel=isToday?'Today':isTomorrow?'Tomorrow':d.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'});
    const daysLeft=Math.ceil((d-new Date().setHours(0,0,0,0))/(1000*60*60*24));
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">'+
      '<div style="width:8px;height:8px;border-radius:50%;background:'+safeThemeColor(e.color)+';flex-shrink:0"></div>'+
      '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escapeHTML(e.title)+'</div>'+
      '<div style="font-size:11px;color:var(--muted);margin-top:1px">'+escapeHTML(dayLabel)+'</div></div>'+
      '<div style="font-size:11px;font-weight:600;flex-shrink:0;color:'+(isToday?'var(--accent3)':daysLeft<=3?'var(--accent4)':'var(--muted)')+'">'+(isToday?'Today':daysLeft===1?'Tomorrow':daysLeft+'d')+'</div></div>';
  }).join('');
}

function addActivity(text,color='var(--accent)',category){
  const p=curP();if(!p)return;
  if(window.ETHONETimeline&&typeof window.ETHONETimeline.record==='function'){
    window.ETHONETimeline.record({title:String(text ?? ''),color,category,source:'legacy'});
    return;
  }
  const n=new Date(),time=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
  const ts=n.toISOString();
  if(!p.state.activity)p.state.activity=[];
  p.state.activity.unshift({text:String(text ?? ''),color,time,ts});
  if(p.state.activity.length>50)p.state.activity.pop();
  saveStateNow();renderActivity();
}

function renderActivity(){
  const list=document.getElementById('activity-list');if(!list)return;
  const p=curP();
  const acts=window.ETHONETimeline&&p?window.ETHONETimeline.items():(p?(p.state.activity||[]):[]);
  if(!acts.length){list.innerHTML='<div class="empty-state"><div class="empty-icon"></div>No activity yet</div>';return}
  list.innerHTML=acts.slice(0,10).map(a=>{
    const title=a.title||a.text||'Activity';
    const body=a.body||'';
    const time=a.time||(a.ts?new Date(a.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'');
    const color=a.color||'var(--accent)';
    return '<div class="activity-item"><div class="activity-dot" style="background:'+escapeHTML(color)+'"></div><div><div class="activity-text">'+escapeHTML(title)+'</div>'+(body?'<div class="activity-meta">'+escapeHTML(body)+'</div>':'')+'<div class="activity-time">'+escapeHTML(time)+'</div></div></div>';
  }).join('');
}

function clearActivity(){
  const p=curP();if(!p)return;
  if(window.ETHONETimeline&&typeof window.ETHONETimeline.clear==='function')window.ETHONETimeline.clear();
  else {p.state.activity=[];saveStateNow();renderActivity();}
}
