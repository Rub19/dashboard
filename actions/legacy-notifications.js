/* ETHONE legacy compatibility module: notifications. */
//  IN-APP NOTIFICATION SYSTEM
// ══════════════════════════════════════════════════════════════
let _notifs=[];
let _notifOpen=false;

function addNotif(icon,title,sub,action=null){
  const notif={id:Date.now()+'_'+Math.random(),icon,title,sub,time:new Date(),unread:true,action};
  _notifs.unshift(notif);
  if(_notifs.length>50)_notifs=_notifs.slice(0,50);
  updateNotifBadge();
  if(_notifOpen)renderNotifPanel();
}

function updateNotifBadge(){
  const badge=document.getElementById('notif-badge');
  if(!badge)return;
  const unread=_notifs.filter(n=>n.unread).length;
  if(unread>0){badge.textContent=unread>9?'9+':String(unread);badge.classList.add('show');}
  else badge.classList.remove('show');
}

function toggleNotifPanel(){if(_notifOpen)closeNotifPanel();else openNotifPanel();}

function openNotifPanel(){
  _notifOpen=true;
  scanForNotifs();
  renderNotifPanel();
  document.getElementById('notif-panel')?.classList.add('open');
  document.getElementById('notif-overlay')?.classList.add('open');
  setTimeout(()=>{_notifs.forEach(n=>n.unread=false);updateNotifBadge();},600);
}

function closeNotifPanel(){
  _notifOpen=false;
  document.getElementById('notif-panel')?.classList.remove('open');
  document.getElementById('notif-overlay')?.classList.remove('open');
}

function clearAllNotifs(){
  _notifs=[];
  updateNotifBadge();
  renderNotifPanel();
}

function notifRunAction(actionId, context){
  const Actions=window.Ethone&&window.Ethone.get&&window.Ethone.get('actions');
  if(Actions&&Actions.dispatch)return Actions.dispatch(actionId,context||{source:'legacy-notifications'});
  if(actionId==='navigation.open'&&context&&context.page&&typeof switchPage==='function')return switchPage(context.page,null);
  return false;
}

function legacyNotifPrefs(){
  const p=typeof curP==='function'?curP():null;
  if(!p)return {tasks:true,habits:true,events:true,ai:true,system:true,quietStart:'',quietEnd:''};
  p.state=p.state||{};
  if(!p.state.notifPrefs)p.state.notifPrefs={tasks:true,habits:true,events:true,ai:true,system:true,quietStart:'',quietEnd:''};
  return p.state.notifPrefs;
}
function legacyNotifQuiet(prefs){
  const start=prefs&&prefs.quietStart,end=prefs&&prefs.quietEnd;
  if(!start||!end)return false;
  const now=new Date();
  const cur=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  return start<end?(cur>=start&&cur<=end):(cur>=start||cur<=end);
}
function legacyNotifAllowed(key){
  const prefs=legacyNotifPrefs();
  if(legacyNotifQuiet(prefs))return false;
  return prefs[key||'system']!==false;
}

function scanForNotifs(){
  const p=curP();if(!p)return;
  const now=new Date();
  const todayStr=now.toLocaleDateString('en-CA');

  // Overdue tasks
  const overdue=(p.state?.todos||[]).filter(t=>!t.done&&t.dueDate&&new Date(t.dueDate)<now);
  if(legacyNotifAllowed('tasks')&&overdue.length&&!_notifs.find(n=>n.id==='overdue')){
    _notifs.push({id:'overdue',icon:'⚠️',title:`${overdue.length} overdue task${overdue.length>1?'s':''}`,
      sub:overdue.slice(0,2).map(t=>t.text).join(', '),time:now,unread:true,
      action:()=>{closeNotifPanel();notifRunAction('navigation.open',{page:'todos',source:'legacy-notifications'});}});
  }

  // Due today
  const dueToday=(p.state?.todos||[]).filter(t=>!t.done&&t.dueDate&&new Date(t.dueDate).toLocaleDateString('en-CA')===todayStr);
  if(legacyNotifAllowed('tasks')&&dueToday.length&&!_notifs.find(n=>n.id==='due-today')){
    _notifs.push({id:'due-today',icon:'📅',title:`${dueToday.length} task${dueToday.length>1?'s':''} due today`,
      sub:dueToday.slice(0,2).map(t=>t.text).join(', '),time:now,unread:true,
      action:()=>{closeNotifPanel();notifRunAction('navigation.open',{page:'todos',source:'legacy-notifications'});}});
  }

  // Upcoming events
  const upcoming=(p.state?.events||[]).filter(e=>{const d=new Date(e.date);return d>=now&&d<new Date(now.getTime()+86400000);});
  if(legacyNotifAllowed('events')&&upcoming.length&&!_notifs.find(n=>n.id==='upcoming-events')){
    _notifs.push({id:'upcoming-events',icon:'🗓',title:`${upcoming.length} event${upcoming.length>1?'s':''} in next 24h`,
      sub:upcoming.slice(0,2).map(e=>e.title).join(', '),time:now,unread:false,
      action:()=>{closeNotifPanel();notifRunAction('navigation.open',{page:'calendar',source:'legacy-notifications'});}});
  }

  // Habits at risk (streak >= 3 but not done today)
  const atRisk=(p.state?.habits||[]).filter(h=>h.streak>=3&&h.lastDone!==todayStr);
  if(legacyNotifAllowed('habits')&&atRisk.length&&!_notifs.find(n=>n.id==='habit-risk')){
    _notifs.push({id:'habit-risk',icon:'🔥',title:`${atRisk.length} streak${atRisk.length>1?'s':''} at risk!`,
      sub:atRisk.slice(0,2).map(h=>h.name+' ('+h.streak+'d)').join(', '),time:now,unread:true,
      action:()=>{closeNotifPanel();notifRunAction('navigation.open',{page:'habits',source:'legacy-notifications'});}});
  }

  // Pomo milestone
  const todayPomos=(p.state?.pomoHistory||[]).filter(h=>h.ts&&new Date(h.ts).toLocaleDateString('en-CA')===todayStr).length;
  if(legacyNotifAllowed('system')&&todayPomos>=4&&!_notifs.find(n=>n.id==='pomo-milestone')){
    _notifs.push({id:'pomo-milestone',icon:'🍅',title:`${todayPomos} pomodoros today!`,
      sub:'Great focus session — keep it up',time:now,unread:false,
      action:()=>{closeNotifPanel();notifRunAction('navigation.open',{page:'stats',source:'legacy-notifications'});}});
  }
}

function timeAgo(date){
  const diff=Math.floor((Date.now()-new Date(date).getTime())/1000);
  if(diff<60)return 'Just now';
  if(diff<3600)return Math.floor(diff/60)+'m ago';
  if(diff<86400)return Math.floor(diff/3600)+'h ago';
  return Math.floor(diff/86400)+'d ago';
}

function renderNotifPanel(){
  const body=document.getElementById('notif-panel-body');
  const countEl=document.getElementById('notif-count-label');
  if(!body)return;
  const unread=_notifs.filter(n=>n.unread).length;
  if(countEl)countEl.textContent=_notifs.length?`${_notifs.length} notification${_notifs.length>1?'s':''}${unread?' · '+unread+' new':''}`:' ';
  if(!_notifs.length){
    body.innerHTML='<div class="notif-empty"><div class="notif-empty-icon">🔔</div><div class="notif-empty-text">You\'re all caught up!</div></div>';
    return;
  }
  const unreadN=_notifs.filter(n=>n.unread);
  const readN=_notifs.filter(n=>!n.unread);
  let html='';
  if(unreadN.length){html+='<div class="notif-section-label">New</div>';html+=unreadN.map(notifItemHTML).join('');}
  if(readN.length){if(unreadN.length)html+='<div class="notif-section-label" style="margin-top:8px">Earlier</div>';html+=readN.map(notifItemHTML).join('');}
  body.innerHTML=html;
}

function notifItemHTML(n){
  const hasAction=typeof n.action==='function';
  const nId=String(n.id).replace(/[^a-z0-9_]/gi,'_');
  window['_nAction_'+nId]=n.action;
  return `<div class="notif-item${n.unread?' unread':''}" ${hasAction?`onclick="if(window['_nAction_${nId}'])window['_nAction_${nId}']()"`:''}  style="${hasAction?'cursor:pointer':''}">
    ${n.unread?'<div class="notif-dot"></div>':'<div style="width:6px"></div>'}
    <div class="notif-icon">${n.icon}</div>
    <div class="notif-content">
      <div class="notif-title">${escapeHTML(n.title)}</div>
      ${n.sub?`<div class="notif-sub">${escapeHTML(n.sub)}</div>`:''}
      <div class="notif-time">${timeAgo(n.time)}</div>
    </div>
    ${hasAction?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;color:var(--muted2);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>':''}
  </div>`;
}

function notifyPomoComplete(count){
  addNotif('🍅',`Session ${count} complete!`,uiLang==='fr'?'Pause méritée !':'Take a break — you earned it',()=>closeNotifPanel());
  if(count>0&&count%4===0)addNotif('🏆','4 pomodoros done!','Time for a long break',()=>closeNotifPanel());
}

let _notifScanInterval=null;
function startNotifScan(){
  clearInterval(_notifScanInterval);
  scanForNotifs();updateNotifBadge();
  _notifScanInterval=setInterval(()=>{scanForNotifs();updateNotifBadge();},60000);
}


// ══════════════════════════════════════════════════════════════
