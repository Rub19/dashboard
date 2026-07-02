/* ETHONE legacy compatibility module: calendar. */
//  CALENDAR
// ===================================================
let calYear=new Date().getFullYear(),calMonth=new Date().getMonth();
let selectedEventColor='accent';
function pickEventColor(el,color){
  document.querySelectorAll('#modal-add-event .theme-swatch').forEach(s=>s.classList.remove('active'));
  el.classList.add('active');selectedEventColor=color;
  document.getElementById('event-color').value=color;
}
function calNav(dir){calMonth+=dir;if(calMonth>11){calMonth=0;calYear++}if(calMonth<0){calMonth=11;calYear--}renderCalendar()}
function addCalEvent(){
  const p=curP();if(!p)return;
  const title=document.getElementById('event-title').value.trim();
  const date=document.getElementById('event-date').value;
  const color=document.getElementById('event-color').value||'accent';
  if(!title||!date){toast('Enter title and date','error');return}
  if(!p.state.events)p.state.events=[];
  p.state.events.push({id:Date.now(),title,date,color});
  p.state.events.sort((a,b)=>a.date.localeCompare(b.date));
  saveStateNow();closeModal('add-event');
  document.getElementById('event-title').value='';
  renderCalendar();renderAllEvents();renderOverviewEvents();toast(title+' added!','success');
}
function deleteCalEvent(id){
  const p=curP();if(!p)return;
  p.state.events=(p.state.events||[]).filter(e=>e.id!==id);
  saveStateNow();renderCalendar();renderAllEvents();renderOverviewEvents();
}
function clearPastEvents(){
  const p=curP();if(!p)return;
  const today=new Date().toISOString().slice(0,10);
  p.state.events=(p.state.events||[]).filter(e=>e.date>=today);
  saveStateNow();renderCalendar();renderAllEvents();renderOverviewEvents();toast('Past events cleared','info');
}
function renderCalendar(){
  const p=curP();
  const events=p?.state?.events||[];
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const ml=document.getElementById('cal-month-label');if(ml)ml.textContent=months[calMonth]+' '+calYear;
  const dlEl=document.getElementById('cal-day-labels');
  if(dlEl)dlEl.innerHTML=['Mo','Tu','We','Th','Fr','Sa','Su'].map(d=>'<div class="cal-day-label">'+d+'</div>').join('');
  const grid=document.getElementById('cal-grid');if(!grid)return;
  const firstDay=new Date(calYear,calMonth,1);
  const lastDay=new Date(calYear,calMonth+1,0);
  const startDow=(firstDay.getDay()+6)%7;
  const today=new Date();const todayStr=today.toISOString().slice(0,10);
  let out='';
  for(let i=0;i<startDow;i++){
    const d=new Date(calYear,calMonth,1-startDow+i);
    out+='<div class="cal-day other-month">'+d.getDate()+'</div>';
  }
  for(let d=1;d<=lastDay.getDate();d++){
    const dateStr=calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const isToday=dateStr===todayStr;
    const hasEv=events.some(e=>e.date===dateStr);
    out+='<div class="cal-day'+(isToday?' today':'')+(hasEv?' has-event':'')+'" onclick="showDayEvents(\''+dateStr+'\')">'+d+'</div>';
  }
  grid.innerHTML=out;
  const evList=document.getElementById('cal-events-list');
  if(evList){
    const todayEvs=events.filter(e=>e.date===todayStr);
    evList.innerHTML=todayEvs.length?todayEvs.map(e=>'<div class="cal-event-item"><div class="cal-event-dot" style="background:'+safeThemeColor(e.color)+'"></div><div class="cal-event-text">'+escapeHTML(e.title)+'</div></div>').join(''):'<div style="font-size:12px;color:var(--muted);padding:4px">No events today</div>';
  }
  renderAllEvents();
}
function showDayEvents(dateStr){
  const p=curP();const events=(p?.state?.events||[]).filter(e=>e.date===dateStr);
  const evList=document.getElementById('cal-events-list');if(!evList)return;
  if(!events.length){evList.innerHTML='<div style="font-size:12px;color:var(--muted);padding:4px">No events on this day</div>';return}
  evList.innerHTML=events.map(e=>'<div class="cal-event-item"><div class="cal-event-dot" style="background:'+safeThemeColor(e.color)+'"></div><div class="cal-event-text">'+escapeHTML(e.title)+'</div><button onclick="deleteCalEvent('+e.id+')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px">&times;</button></div>').join('');
}
function renderAllEvents(){
  const p=curP();const events=p?.state?.events||[];
  const el=document.getElementById('all-events-list');if(!el)return;
  if(!events.length){el.innerHTML='<div class="empty-state" style="padding:16px"><div class="empty-icon"></div>No events yet</div>';return}
  el.innerHTML=events.map(e=>'<div class="cal-event-item" style="margin-bottom:5px"><div class="cal-event-dot" style="background:'+safeThemeColor(e.color)+'"></div><div class="cal-event-text">'+escapeHTML(e.title)+'</div><div class="cal-event-date">'+escapeHTML(e.date)+'</div><button onclick="deleteCalEvent('+e.id+')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px;margin-left:4px">&times;</button></div>').join('');
}


// ===================================================
