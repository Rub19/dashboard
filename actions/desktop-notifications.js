/* ETHONE legacy compatibility module: desktop-notifications. */
//  DESKTOP NOTIFICATIONS
// ===================================================
let _notifEnabled=false;
function requestNotifPermission(){
  if(!('Notification' in window)){toast('Notifications not supported','error');return;}
  Notification.requestPermission().then(perm=>{
    _notifEnabled=perm==='granted';
    const p=curP();
    if(p){p.state.notifEnabled=_notifEnabled;saveStateNow();}
    const btn=document.getElementById('notif-btn');
    if(_notifEnabled){
      toast('Notifications enabled! 🔔','success');
      if(btn){btn.textContent='🔔 Notifications ON';btn.style.color='var(--accent2)';btn.style.borderColor='var(--accent2)';}
    } else {
      toast('Notifications denied — check browser settings','error');
    }
  });
}
function notifPrefs(){
  const p=typeof curP==='function'?curP():null;
  if(!p)return {};
  if(!p.state.notifPrefs)p.state.notifPrefs={tasks:true,habits:true,events:true,ai:true,system:true,quietStart:'',quietEnd:''};
  return p.state.notifPrefs;
}
function isQuietHours(prefs){
  const start=prefs.quietStart,end=prefs.quietEnd;
  if(!start||!end)return false;
  const now=new Date();
  const cur=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  return start<end?(cur>=start&&cur<=end):(cur>=start||cur<=end);
}
function notifCategoryAllowed(category){
  const prefs=notifPrefs();
  const key=category||'system';
  if(isQuietHours(prefs))return false;
  return prefs[key]!==false;
}
function sendNotif(title,body,icon='',category='system'){
  if(!_notifEnabled||Notification.permission!=='granted')return;
  if(!notifCategoryAllowed(category))return;
  try{new Notification(title,{body,icon:'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>'+icon+'</text></svg>'});}
  catch(e){}
}
// Restore notification state on load
function initNotifState(p){
  if(p?.state?.notifEnabled&&Notification.permission==='granted'){
    _notifEnabled=true;
    const btn=document.getElementById('notif-btn');
    if(btn){btn.textContent='🔔 Notifications ON';btn.style.color='var(--accent2)';btn.style.borderColor='var(--accent2)';}
  } else if(Notification.permission==='granted'){
    _notifEnabled=true;
  }
}
(function(){if(Notification.permission==='granted'){_notifEnabled=true;}})();

// ===================================================
