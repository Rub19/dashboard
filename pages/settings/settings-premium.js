/* ETHONE V28 — Settings Premium.
   Workspaces, Widgets, Plugins, Brain, Automation, Marketplace, Notifications,
   Keyboard, Developer, Experimental, Backup, Import, Export.
   Reuses existing real infra (dashboard-v4 widget layout, p.state.connections,
   ETHONE AI Core, window.ETHONEMarketplace) instead of re-implementing it —
   see the V28 research pass for what was already real vs. built from scratch here.
*/

function _stEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];});}

/* openSettingsTab is defined once in components/command-palette.js — reused here,
   not redeclared, to avoid two competing definitions racing on script load order. */

// ================= GENERAL =================
function renderGeneralSettings(){
  var seg=document.getElementById('general-lang-seg');if(!seg)return;
  var cur=(window._lang||'fr');
  Array.prototype.forEach.call(seg.querySelectorAll('button'),function(b){
    b.classList.toggle('active',b.dataset.val===cur);
  });
}
window.renderGeneralSettings=renderGeneralSettings;

// ================= WORKSPACES =================
function wsEnsure(p){
  if(!Array.isArray(p.workspaces)||!p.workspaces.length){
    p.workspaces=[{id:'personal',name:(window._lang||'fr')==='fr'?'Personnel':'Personal',icon:'🏠'}];
  }
  if(!p.activeWorkspaceId)p.activeWorkspaceId=p.workspaces[0].id;
  return p.workspaces;
}
function renderWorkspacesSettings(){
  var p=curP();if(!p)return;
  var list=wsEnsure(p);
  var wrap=document.getElementById('ws-list');if(!wrap)return;
  wrap.innerHTML=list.map(function(w){
    var active=w.id===p.activeWorkspaceId;
    return '<div class="toggle-row" style="align-items:center">'+
      '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">'+
        '<span style="font-size:18px">'+_stEsc(w.icon)+'</span>'+
        '<input class="modal-input" style="max-width:220px" value="'+_stEsc(w.name)+'" oninput="wsRename(\''+w.id+'\',this.value)"/>'+
      '</div>'+
      '<div style="display:flex;gap:6px;flex-shrink:0">'+
        (active?'<span style="font-size:11px;color:var(--accent);font-weight:700;padding:6px 10px">Active</span>':'<button class="btn btn-ghost" style="font-size:11px;padding:6px 10px" onclick="wsSwitch(\''+w.id+'\')">Activate</button>')+
        (list.length>1?'<button class="btn btn-ghost" style="font-size:11px;padding:6px 10px" onclick="wsDelete(\''+w.id+'\')">Delete</button>':'')+
      '</div></div>';
  }).join('');
}
function wsCreate(){
  var p=curP();if(!p)return;
  var list=wsEnsure(p);
  var name=prompt('Workspace name:');if(!name)return;
  var icons=['🏠','💼','🎮','📚','🎨','🚀'];
  list.push({id:'ws-'+Date.now().toString(36),name:name.slice(0,40),icon:icons[list.length%icons.length]});
  saveStateNow();renderWorkspacesSettings();
  if(typeof toast==='function')toast('Workspace created','success');
}
function wsRename(id,val){
  var p=curP();if(!p)return;
  var w=(p.workspaces||[]).find(function(x){return x.id===id;});if(!w)return;
  w.name=val.slice(0,40);
  saveStateNow();
  if(p.activeWorkspaceId===id&&window.EthoneCore)window.EthoneCore.storage.set('ethone:active-workspace',w.name);
}
function wsSwitch(id){
  var p=curP();if(!p)return;
  var w=(p.workspaces||[]).find(function(x){return x.id===id;});if(!w)return;
  p.activeWorkspaceId=id;
  saveStateNow();
  if(window.EthoneCore)window.EthoneCore.storage.set('ethone:active-workspace',w.name);
  renderWorkspacesSettings();
  if(typeof toast==='function')toast('Switched to '+w.name,'success');
}
function wsDelete(id){
  var p=curP();if(!p)return;
  if(!confirm('Delete this workspace?'))return;
  p.workspaces=(p.workspaces||[]).filter(function(x){return x.id!==id;});
  if(p.activeWorkspaceId===id&&p.workspaces.length)wsSwitch(p.workspaces[0].id);
  saveStateNow();renderWorkspacesSettings();
}
window.wsCreate=wsCreate;window.wsRename=wsRename;window.wsSwitch=wsSwitch;window.wsDelete=wsDelete;

// ================= WIDGETS =================
function widgetsCatalog(){
  return (window.Ethone&&window.Ethone.get)?window.Ethone.get('widgets'):null;
}
function widgetsLayout(){
  return window.EthoneCore?window.EthoneCore.storage.getJSON('ethone:dashboard-v4-layout',{}):{};
}
function widgetsSaveLayout(prefs){
  if(window.EthoneCore)window.EthoneCore.storage.setJSON('ethone:dashboard-v4-layout',prefs);
}
function renderWidgetsSettings(){
  var Widgets=widgetsCatalog();
  var prefs=widgetsLayout();
  var instances=(prefs&&prefs.instances)||[];
  var activeWrap=document.getElementById('widgets-active-list');
  if(activeWrap){
    if(!instances.length){
      activeWrap.innerHTML='<div style="font-size:12px;color:var(--muted2)">Open the dashboard at least once to initialize the layout, then manage widgets here.</div>';
    }else{
      activeWrap.innerHTML=instances.map(function(inst){
        var cat=Widgets?Widgets.get(inst.type):null;
        var label=cat?cat.label:inst.type;
        var locked=cat&&cat.hiddenFromPicker;
        return '<div class="toggle-row" style="align-items:center">'+
          '<div style="font-size:13px;color:var(--text)">'+_stEsc(label)+'</div>'+
          (locked?'<span style="font-size:11px;color:var(--muted2)">Core</span>':'<button class="btn btn-ghost" style="font-size:11px;padding:5px 9px" onclick="widgetsRemove(\''+inst.instanceId+'\')">Remove</button>')+
        '</div>';
      }).join('');
    }
  }
  var addGrid=document.getElementById('widgets-add-grid');
  if(addGrid){
    if(!Widgets||!instances.length){
      addGrid.innerHTML='<div style="font-size:12px;color:var(--muted2)">Not available until the dashboard layout is initialized.</div>';
    }else{
      var types=(window.__ethoneWidgetCatalogTypes||[]).filter(function(t){var c=Widgets.get(t);return c&&!c.hiddenFromPicker;});
      addGrid.innerHTML=types.map(function(t){
        var cat=Widgets.get(t);
        var count=instances.filter(function(w){return w.type===t;}).length;
        var atMax=count>=(cat.maxInstances||Infinity);
        return '<button class="btn btn-ghost" style="font-size:12px;padding:10px" '+(atMax?'disabled':'')+' onclick="widgetsAdd(\''+t+'\')">'+_stEsc(cat.label||t)+(atMax?' ✓':' +')+'</button>';
      }).join('');
    }
  }
}
function widgetsAdd(type){
  var Widgets=widgetsCatalog();var cat=Widgets?Widgets.get(type):null;if(!cat)return;
  var prefs=widgetsLayout();
  if(!prefs.instances||!prefs.instances.length)return;
  var count=prefs.instances.filter(function(w){return w.type===type;}).length;
  if(count>=(cat.maxInstances||Infinity)){if(typeof toast==='function')toast('Max reached','info');return;}
  prefs.instances.push({instanceId:type+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),type:type,size:Object.assign({},cat.defaultSize||{col:2,row:1}),locked:false,config:{}});
  widgetsSaveLayout(prefs);
  renderWidgetsSettings();
  if(typeof toast==='function')toast('Widget added — open the dashboard to see it','success');
}
function widgetsRemove(instanceId){
  var prefs=widgetsLayout();
  prefs.instances=(prefs.instances||[]).filter(function(w){return w.instanceId!==instanceId;});
  widgetsSaveLayout(prefs);
  renderWidgetsSettings();
}
function widgetsReset(){
  if(!confirm('Reset the dashboard layout to defaults?'))return;
  widgetsSaveLayout({});
  renderWidgetsSettings();
  if(typeof toast==='function')toast('Layout reset — open the dashboard to see it','success');
}
window.widgetsAdd=widgetsAdd;window.widgetsRemove=widgetsRemove;window.widgetsReset=widgetsReset;

// ================= PLUGINS =================
var PLUGIN_DEFS=[
  {id:'discord',label:'Discord',icon:'🎮',real:true},
  {id:'spotify',label:'Spotify',icon:'🎵',real:true},
  {id:'steam',label:'Steam',icon:'🕹️',real:true},
  {id:'twitch',label:'Twitch',icon:'📺',real:true},
  {id:'lastfm',label:'Last.fm',icon:'🎧',real:true},
  {id:'github',label:'GitHub',icon:'💻',real:true},
  {id:'valorant',label:'Valorant',icon:'🎯',real:true,custom:true},
  {id:'googlecalendar',label:'Google Calendar',icon:'📅',real:false},
  {id:'googledrive',label:'Google Drive',icon:'📁',real:false},
  {id:'obs',label:'OBS',icon:'🎬',real:false},
  {id:'youtube',label:'YouTube',icon:'▶️',real:false},
  {id:'battlenet',label:'Battle.net',icon:'⚔️',real:false}
];
function renderPluginsSettings(){
  var p=curP();if(!p)return;
  var wrap=document.getElementById('plugins-list');if(!wrap)return;
  var conns=(p.state&&p.state.connections)||{};
  wrap.innerHTML=PLUGIN_DEFS.map(function(d){
    var installed=d.custom?((p.state.valorantAccounts||[]).length>0):!!(conns[d.id]&&Object.keys(conns[d.id]||{}).length);
    var configureTarget=d.custom?'valorant-accounts':'connections';
    return '<div class="toggle-row" style="align-items:center">'+
      '<div style="display:flex;align-items:center;gap:10px"><span style="font-size:16px">'+d.icon+'</span><span style="font-size:13px;color:var(--text)">'+_stEsc(d.label)+'</span></div>'+
      (d.real?
        '<div style="display:flex;align-items:center;gap:8px">'+
          '<span style="font-size:11px;color:'+(installed?'#22c55e':'var(--muted2)')+'">'+(installed?'Connected':'Not connected')+'</span>'+
          (installed&&!d.custom?'<button class="btn btn-ghost" style="font-size:11px;padding:5px 9px" onclick="pluginUninstall(\''+d.id+'\')">Uninstall</button>':'')+
          '<button class="btn btn-ghost" style="font-size:11px;padding:5px 9px" onclick="switchPage(\''+configureTarget+'\',null)">Configure</button>'+
        '</div>'
        :'<span style="font-size:11px;color:var(--muted2)">Coming soon</span>')+
    '</div>';
  }).join('');
}
function pluginUninstall(id){
  var p=curP();if(!p||!p.state.connections)return;
  var def=PLUGIN_DEFS.find(function(d){return d.id===id;});
  if(!confirm('Disconnect '+(def?def.label:id)+'? You can reconnect it any time from Connexions.'))return;
  delete p.state.connections[id];
  saveStateNow();
  renderPluginsSettings();
  if(typeof toast==='function')toast('Disconnected','success');
}
window.renderPluginsSettings=renderPluginsSettings;window.pluginUninstall=pluginUninstall;

// ================= BRAIN =================
function renderBrainSettings(){
  var wrap=document.getElementById('brain-status');if(!wrap)return;
  var cfg=null;
  try{cfg=JSON.parse(localStorage.getItem('ethone:ai-core')||'null');}catch(e){}
  if(!cfg){wrap.innerHTML='<div style="font-size:12px;color:var(--muted2)">Open Brain once to initialize ETHONE AI Core.</div>';return;}
  function row(label,val){return '<div class="toggle-row" style="padding:8px 0"><span style="font-size:12px;color:var(--muted2)">'+label+'</span><span style="font-size:12px;color:var(--text);font-weight:600">'+_stEsc(val)+'</span></div>';}
  var provider=cfg.defaultProvider||'-';
  var pState=(cfg.providers&&cfg.providers[provider])||{};
  wrap.innerHTML=
    row('Default provider',provider)+
    row('Model',pState.model||'Dynamic')+
    row('Fallbacks',(cfg.fallbackProviders||[]).join(', ')||'None')+
    row('Visible memory entries',String((cfg.memory||[]).length))+
    row('Telemetry',cfg.privacy&&cfg.privacy.telemetry?'On':'Off');
}
window.renderBrainSettings=renderBrainSettings;

// ================= AUTOMATION =================
function auRuleLabel(r){
  var trig=r.triggerType==='dailyTime'?('At '+r.triggerValue+' every day'):('Every '+r.triggerValue+' completed tasks');
  return trig+' → show reminder: "'+r.actionValue+'"';
}
function renderAutomationSettings(){
  var p=curP();if(!p)return;
  if(!Array.isArray(p.state.automationRules))p.state.automationRules=[];
  var wrap=document.getElementById('automation-list');if(!wrap)return;
  var rules=p.state.automationRules;
  wrap.innerHTML=rules.length?rules.map(function(r){
    return '<div class="toggle-row" style="align-items:center">'+
      '<div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--text)">'+_stEsc(auRuleLabel(r))+'</div></div>'+
      '<div style="display:flex;gap:6px;align-items:center;flex-shrink:0">'+
        '<label class="toggle"><input type="checkbox" '+(r.enabled?'checked':'')+' onchange="automationToggle(\''+r.id+'\',this.checked)"/><div class="toggle-track"></div><div class="toggle-thumb"></div></label>'+
        '<button class="btn btn-ghost" style="font-size:11px;padding:5px 9px" onclick="automationDelete(\''+r.id+'\')">Delete</button>'+
      '</div></div>';
  }).join(''):'<div style="font-size:12px;color:var(--muted2)">No rules yet.</div>';
}
function automationCreate(){
  var p=curP();if(!p)return;
  if(!Array.isArray(p.state.automationRules))p.state.automationRules=[];
  var triggerType=confirm('OK = daily time trigger. Cancel = completed-task-count trigger.')?'dailyTime':'taskCount';
  var triggerValue=triggerType==='dailyTime'?(prompt('Time (HH:MM):','09:00')||'09:00'):(prompt('Number of completed tasks:','5')||'5');
  var actionValue=prompt('Reminder message to show:','Reminder!')||'Reminder!';
  p.state.automationRules.push({id:'rule-'+Date.now().toString(36),triggerType:triggerType,triggerValue:triggerValue,actionType:'toast',actionValue:actionValue,enabled:true,lastFired:null});
  saveStateNow();renderAutomationSettings();
  if(typeof toast==='function')toast('Rule created','success');
}
function automationToggle(id,val){
  var p=curP();if(!p)return;
  var r=(p.state.automationRules||[]).find(function(x){return x.id===id;});if(!r)return;
  r.enabled=val;saveStateNow();
}
function automationDelete(id){
  var p=curP();if(!p)return;
  p.state.automationRules=(p.state.automationRules||[]).filter(function(x){return x.id!==id;});
  saveStateNow();renderAutomationSettings();
}
window.automationCreate=automationCreate;window.automationToggle=automationToggle;window.automationDelete=automationDelete;

function automationEvaluate(){
  var p=curP();if(!p||!p.state||!Array.isArray(p.state.automationRules))return;
  var now=new Date();
  var hhmm=(now.getHours()<10?'0':'')+now.getHours()+':'+(now.getMinutes()<10?'0':'')+now.getMinutes();
  var completedCount=(p.state.todos||[]).filter(function(t){return t.done;}).length;
  var changed=false;
  p.state.automationRules.forEach(function(r){
    if(!r.enabled)return;
    var todayKey=now.toISOString().slice(0,10);
    if(r.triggerType==='dailyTime'){
      if(r.triggerValue===hhmm&&r.lastFired!==todayKey){
        if(typeof toast==='function')toast(r.actionValue,'info');
        r.lastFired=todayKey;changed=true;
      }
    }else if(r.triggerType==='taskCount'){
      var n=parseInt(r.triggerValue,10)||0;
      var firedAt=r.lastFired||0;
      if(n>0&&completedCount>=firedAt+n){
        if(typeof toast==='function')toast(r.actionValue,'info');
        r.lastFired=completedCount;changed=true;
      }
    }
  });
  if(changed)saveStateNow();
}
if(!window.__ethoneAutomationTimer)window.__ethoneAutomationTimer=setInterval(automationEvaluate,60000);

// ================= MARKETPLACE =================
function renderMarketplaceSettings(){
  var api=window.ETHONEMarketplace;
  var summary=document.getElementById('marketplace-summary');
  var grid=document.getElementById('marketplace-grid');
  if(!api){if(summary)summary.textContent='Marketplace not loaded yet.';return;}
  var st=api.state();
  var catalog=api.catalog();
  var installedCount=Object.keys(st.installed||{}).filter(function(k){return st.installed[k];}).length;
  if(summary)summary.textContent=installedCount+' installed / '+catalog.length+' available';
  if(grid){
    grid.innerHTML=catalog.slice(0,12).map(function(item){
      var on=!!st.installed[item.id];
      return '<div class="settings-card" style="padding:12px;margin:0">'+
        '<div style="font-size:11px;color:var(--muted2);margin-bottom:4px">'+_stEsc(item.type)+'</div>'+
        '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">'+_stEsc(item.title)+'</div>'+
        '<button class="btn '+(on?'btn-ghost':'btn-primary')+'" style="font-size:11px;width:100%" onclick="marketplaceInstall(\''+item.id+'\')">'+(on?'Installed ✓':'Install')+'</button>'+
      '</div>';
    }).join('');
  }
}
function marketplaceInstall(id){
  if(window.ETHONEMarketplace){window.ETHONEMarketplace.install(id);renderMarketplaceSettings();}
}
window.marketplaceInstall=marketplaceInstall;

// ================= NOTIFICATIONS =================
function renderNotificationsSettings(){
  var p=curP();if(!p)return;
  if(!p.state.notifPrefs)p.state.notifPrefs={tasks:true,habits:true,events:true,ai:true,system:true,quietStart:'',quietEnd:''};
  var prefs=p.state.notifPrefs;
  var cats=[['tasks','Tasks'],['habits','Habits'],['events','Events & calendar'],['ai','Brain / AI'],['system','System']];
  var wrap=document.getElementById('notif-categories');
  if(wrap){
    wrap.innerHTML=cats.map(function(c){
      return '<div class="toggle-row"><div class="toggle-label">'+c[1]+'</div><label class="toggle"><input type="checkbox" '+(prefs[c[0]]?'checked':'')+' onchange="notifToggleCategory(\''+c[0]+'\',this.checked)"/><div class="toggle-track"></div><div class="toggle-thumb"></div></label></div>';
    }).join('');
  }
  var s=document.getElementById('notif-quiet-start');if(s)s.value=prefs.quietStart||'';
  var e=document.getElementById('notif-quiet-end');if(e)e.value=prefs.quietEnd||'';
  var btn=document.getElementById('notif-btn');
  if(btn&&window.Notification)btn.textContent=Notification.permission==='granted'?'🔔 Enabled':'🔔 Enable';
}
function notifToggleCategory(key,val){
  var p=curP();if(!p)return;
  if(!p.state.notifPrefs)p.state.notifPrefs={};
  p.state.notifPrefs[key]=val;saveStateNow();
}
function notifSetQuiet(key,val){
  var p=curP();if(!p)return;
  if(!p.state.notifPrefs)p.state.notifPrefs={};
  p.state.notifPrefs[key]=val;saveStateNow();
}
window.notifToggleCategory=notifToggleCategory;window.notifSetQuiet=notifSetQuiet;

// ================= KEYBOARD =================
function renderKeyboardSettings(){
  var wrap=document.getElementById('keyboard-list');if(!wrap)return;
  var rows=[
    ['Ctrl/Cmd + K','Open command palette'],
    ['N','Go to Notes'],
    ['T','Go to Tasks'],
    ['G','Go to Gaming'],
    ['H','Go to Habits'],
    ['Space','Play/pause Pomodoro (on dashboard)'],
    ['Esc','Close overlay / command palette'],
    ['↑ / ↓','Navigate command palette results'],
    ['Enter','Run selected command palette result']
  ];
  wrap.innerHTML=rows.map(function(r){
    return '<div class="toggle-row" style="padding:7px 0"><span style="font-size:12px;color:var(--muted2)">'+r[1]+'</span><kbd style="font-family:var(--mono);font-size:11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:3px 8px;color:var(--text)">'+r[0]+'</kbd></div>';
  }).join('');
}
window.renderKeyboardSettings=renderKeyboardSettings;

// ================= DEVELOPER =================
function renderDeveloperSettings(){
  var wrap=document.getElementById('dev-env-info');
  if(wrap){
    var lsBytes=0;
    try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);lsBytes+=(k.length+(localStorage.getItem(k)||'').length);}}catch(e){}
    function row(l,v){return '<div>'+l+': <strong style="color:var(--text)">'+_stEsc(v)+'</strong></div>';}
    wrap.innerHTML=
      row('Build','ETHONE 2026.07 (V28)')+
      row('User agent',navigator.userAgent)+
      row('Online',navigator.onLine?'Yes':'No')+
      row('Local storage used',Math.round(lsBytes/1024)+' KB');
  }
  var t=document.getElementById('dev-debug-toggle');
  if(t)t.checked=localStorage.getItem('ethone:debug')==='1';
}
function devSetDebug(val){
  localStorage.setItem('ethone:debug',val?'1':'0');
  window.__ethoneDebug=val;
  if(typeof toast==='function')toast(val?'Verbose logging enabled':'Verbose logging disabled','info');
}
function devClearCaches(){
  if(!confirm('Clear local caches (Marketplace cache, AI Core cache)? This does not delete your profile data.'))return;
  ['ethone:marketplace-41','ethone:ai-core'].forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
  if(typeof toast==='function')toast('Local caches cleared — reload the page','success');
}
window.renderDeveloperSettings=renderDeveloperSettings;window.devSetDebug=devSetDebug;window.devClearCaches=devClearCaches;

// ================= EXPERIMENTAL =================
function renderExperimentalSettings(){
  var wrap=document.getElementById('experimental-list');if(!wrap)return;
  var flags=[
    {key:'ethone:compact',label:'Legacy compact runtime',sub:'Enterprise runtime compact layout (independent of Appearance density)'},
    {key:'ethone:reducedMotion',label:'Legacy reduced motion',sub:'Enterprise runtime motion override'}
  ];
  wrap.innerHTML=flags.map(function(f){
    var val=localStorage.getItem(f.key)==='1';
    return '<div class="toggle-row"><div><div class="toggle-label">'+f.label+'</div><div class="toggle-sub">'+f.sub+'</div></div><label class="toggle"><input type="checkbox" '+(val?'checked':'')+' onchange="expToggle(\''+f.key+'\',this.checked)"/><div class="toggle-track"></div><div class="toggle-thumb"></div></label></div>';
  }).join('');
}
function expToggle(key,val){
  localStorage.setItem(key,val?'1':'0');
  if(typeof toast==='function')toast('Applied — reload to see full effect','info');
}
window.renderExperimentalSettings=renderExperimentalSettings;window.expToggle=expToggle;

// ================= BACKUP / IMPORT / EXPORT =================
function backupNow(){
  saveStateNow();
  if(typeof saveCloudState==='function'){
    saveCloudState().then(function(){if(typeof toast==='function')toast('Synced to cloud','success');}).catch(function(){if(typeof toast==='function')toast('Sync failed — check connection','error');});
  }else if(typeof toast==='function')toast('Saved locally','success');
}
function backupDownload(){
  try{
    var blob=new Blob([JSON.stringify(profiles,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;a.download='ethone-backup-'+new Date().toISOString().slice(0,19).replace(/:/g,'-')+'.json';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    if(typeof toast==='function')toast('Backup downloaded','success');
  }catch(e){if(typeof toast==='function')toast('Backup failed','error');}
}
function backupRestore(evt){
  var file=evt.target.files&&evt.target.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(){
    try{
      var parsed=JSON.parse(reader.result);
      if(!Array.isArray(parsed)||!parsed.length)throw new Error('bad format');
      if(!confirm('Replace ALL local profiles with this backup file? This cannot be undone.')){evt.target.value='';return;}
      profiles=parsed;
      if(typeof normalizeAllProfiles==='function')normalizeAllProfiles();
      saveStateNow();
      if(typeof toast==='function')toast('Backup restored','success');
      if(typeof renderProfileScreen==='function')renderProfileScreen();
    }catch(e){if(typeof toast==='function')toast('Invalid backup file','error');}
    evt.target.value='';
  };
  reader.readAsText(file);
}
window.backupNow=backupNow;window.backupDownload=backupDownload;window.backupRestore=backupRestore;

// ================= Wire previously dead nav buttons into real Settings tabs =================
(function(){
  function wireDeadButtons(){
    var Actions=(window.Ethone&&window.Ethone.get)?window.Ethone.get('actions'):null;
    if(!Actions)return;
    Actions.register('dashboard.nav.workspaces',{enabled:true,label:'Workspaces',handler:function(){openSettingsTab('workspaces');}});
    Actions.register('dashboard.nav.marketplace',{enabled:true,label:'Marketplace',handler:function(){openSettingsTab('marketplace');}});
  }
  function wireDeadButtonsDeferred(){setTimeout(wireDeadButtons,300);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireDeadButtonsDeferred);
  else wireDeadButtonsDeferred();
  // dashboard-v4.js registers these two ids as disabled stubs from its own boot(),
  // which can run at any point relative to this script depending on load timing —
  // re-apply our override (deferred, so it runs after same-tick competing registration)
  // whenever the dashboard is shown, so it always wins the race.
  window.addEventListener('ethone:dashboard-ready',wireDeadButtonsDeferred);
  window.addEventListener('ethone:page-ready',wireDeadButtonsDeferred);
})();
