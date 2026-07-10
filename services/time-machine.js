/* ETHONE Time Machine.
 * Local automatic snapshots for layouts, widgets, settings, notes, dashboard
 * and workspaces. No backend writes; restore is explicit and confirmed.
 */
(function(){
  "use strict";
  if(window.__ethoneTimeMachine)return;
  window.__ethoneTimeMachine=true;

  var STORE_KEY="ethone:time-machine:v1";
  var MAX_SNAPSHOTS=48;
  var AUTO_MIN_INTERVAL=120000;
  var autoTimer=0;
  var lastRenderQuery="";
  var ui={open:false,filter:"all",selectedId:"",query:""};

  var STATE_KEYS=[
    "items","todos","note","notes","activity","connections","gaming","habits","kanban","events",
    "pinned","journal","countdowns","dailyFocus","goals","valorantAccounts","valorantAccountsView",
    "databases","databasesView","automationRules","liveWidgets","notifPrefs","filesState","weatherCache",
    "aiSessions","plugins","permanentDock","dashboard","settings"
  ];
  var LOCAL_PREFIXES=[
    "ethone:dashboard","ethone:active-workspace","ethone:active-space","ethone:smart-layouts",
    "ethone:usage-learning","ethone:settings","ethone:theme","ethone:bg","ethone:accent",
    "ethone:compact","ethone:reducedMotion","ethone:layout-mode","ethone:desktop-enabled",
    "ethone:permanent-dock","ethone:status-bar","ethone:widget","ethone:widgets",
    "ethone:native-shell","ethone:micro","ethone:ai-core","ethone:files:","nexus_lang",
    "sidebar_width","pomo_"
  ];
  var LOCAL_DENY=["ethone:time-machine","ethone:backup-manager","ethone:version-history","supabase","sb-"];

  function now(){return new Date().toISOString()}
  function $(sel,root){return (root||document).querySelector(sel)}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}
  function toast(msg,type){try{if(typeof window.toast==="function")window.toast(msg,type||"info")}catch(e){}}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function saveNow(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function refreshIcons(root){try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons({},root||document)}catch(e){}}
  function currentPage(){
    var active=$(".tab-content.active[id^='page-']");
    return active?active.id.replace(/^page-/,""):"dashboard";
  }
  function activeWorkspace(){
    try{
      var w=window.ETHONEWorkspaces&&window.ETHONEWorkspaces.active?window.ETHONEWorkspaces.active():null;
      if(w)return w;
    }catch(e){}
    var p=profile();
    if(p&&Array.isArray(p.workspaces)){
      return p.workspaces.find(function(w){return w.id===p.activeWorkspaceId})||p.workspaces[0]||null;
    }
    return null;
  }
  function workspaceName(){
    var w=activeWorkspace();
    return w&&(w.name||w.label)||"Default workspace";
  }
  function formatSize(bytes){
    bytes=Number(bytes)||0;
    if(bytes>1024*1024)return (bytes/1024/1024).toFixed(2)+" MB";
    if(bytes>1024)return Math.round(bytes/1024)+" KB";
    return bytes+" B";
  }
  function timeAgo(value){
    var d=new Date(value),diff=Date.now()-d.getTime();
    if(isNaN(d.getTime()))return "-";
    if(diff<60000)return "Now";
    if(diff<3600000)return Math.floor(diff/60000)+"m ago";
    if(diff<86400000)return Math.floor(diff/3600000)+"h ago";
    var days=Math.floor(diff/86400000);
    return days===1?"Yesterday":days+" days ago";
  }
  function dayLabel(value){
    var d=new Date(value);
    if(isNaN(d.getTime()))return "Unknown";
    var today=new Date();today.setHours(0,0,0,0);
    var start=new Date(d);start.setHours(0,0,0,0);
    var diff=Math.round((today-start)/86400000);
    if(diff===0)return "Today";
    if(diff===1)return "Yesterday";
    return d.toLocaleDateString(document.documentElement.lang||"fr",{weekday:"long",month:"short",day:"numeric"});
  }
  function readStore(){
    var store;
    try{store=JSON.parse(localStorage.getItem(STORE_KEY)||"{}")}catch(e){store={}}
    if(!store||typeof store!=="object")store={};
    if(!Array.isArray(store.snapshots))store.snapshots=[];
    store.snapshots=store.snapshots.slice(0,MAX_SNAPSHOTS);
    return store;
  }
  function writeStore(store){
    store.version=1;
    store.snapshots=(store.snapshots||[]).slice(0,MAX_SNAPSHOTS);
    try{
      localStorage.setItem(STORE_KEY,JSON.stringify(store));
    }catch(error){
      store.snapshots=store.snapshots.slice(0,Math.max(8,Math.floor(store.snapshots.length/2)));
      localStorage.setItem(STORE_KEY,JSON.stringify(store));
      toast("Time Machine trimmed older snapshots to fit local storage.","info");
    }
  }
  function shouldCaptureLocalKey(key){
    key=String(key||"");
    if(!key)return false;
    if(LOCAL_DENY.some(function(prefix){return key.indexOf(prefix)===0}))return false;
    return LOCAL_PREFIXES.some(function(prefix){return key.indexOf(prefix)===0});
  }
  function captureLocalStorage(){
    var out={};
    try{
      for(var i=0;i<localStorage.length;i++){
        var key=localStorage.key(i);
        if(shouldCaptureLocalKey(key))out[key]=localStorage.getItem(key);
      }
    }catch(e){}
    return out;
  }
  function captureProfile(){
    var p=profile();
    if(!p)return null;
    var state=p.state||{};
    var stateSnap={};
    STATE_KEYS.forEach(function(key){
      if(state[key]!==undefined)stateSnap[key]=clone(state[key]);
    });
    if(window.ETHONESecurity&&ETHONESecurity.sanitizeObject)stateSnap=ETHONESecurity.sanitizeObject(stateSnap);
    return {
      id:p.id||"",
      name:p.name||p.username||"ETHONE",
      activeWorkspaceId:p.activeWorkspaceId||"",
      workspaces:clone(Array.isArray(p.workspaces)?p.workspaces:[]),
      sidebarConfig:clone(p.sidebarConfig||null),
      state:stateSnap
    };
  }
  function summaryFromProfile(p){
    p=p||captureProfile()||{};
    var s=p.state||{};
    return {
      layouts:Object.keys(captureLocalStorage()).filter(function(k){return /dashboard-v4-layout/.test(k)}).length,
      widgets:(s.liveWidgets&&Object.keys(s.liveWidgets).length)||0,
      notes:Array.isArray(s.notes)?s.notes.length:0,
      tasks:Array.isArray(s.todos)?s.todos.length:0,
      workspaces:Array.isArray(p.workspaces)?p.workspaces.length:0,
      databases:Array.isArray(s.databases)?s.databases.length:0,
      page:currentPage(),
      workspace:workspaceName()
    };
  }
  function snapshotSize(payload){
    try{return new Blob([JSON.stringify(payload)]).size}catch(e){return JSON.stringify(payload).length}
  }
  function signature(payload){
    var safe={
      profile:payload.profile,
      local:payload.localStorage
    };
    var text=JSON.stringify(safe);
    var hash=0;
    for(var i=0;i<text.length;i++){hash=((hash<<5)-hash+text.charCodeAt(i))|0}
    return String(hash)+"-"+text.length;
  }
  function classifyReason(reason){
    reason=String(reason||"manual").toLowerCase();
    if(/layout|dashboard|widget|smart/.test(reason))return "layout";
    if(/setting|theme|density|accent|background/.test(reason))return "settings";
    if(/note|todo|task|file|database/.test(reason))return "data";
    if(/workspace|space/.test(reason))return "workspace";
    if(/restore/.test(reason))return "restore";
    return reason.indexOf("auto")===0?"auto":"manual";
  }
  function createSnapshot(label,reason,opts){
    opts=opts||{};
    var p=captureProfile();
    if(!p){if(!opts.quiet)toast("Time Machine needs an active profile.","error");return null}
    var payload={profile:p,localStorage:captureLocalStorage()};
    if(window.ETHONESecurity&&ETHONESecurity.sanitizeObject)payload=ETHONESecurity.sanitizeObject(payload);
    var sig=signature(payload);
    var store=readStore();
    var type=classifyReason(reason||label);
    var auto=!!opts.auto;
    var ts=Date.now();
    if(auto&&!opts.force){
      if(store.lastSignature===sig)return null;
      if(store.lastAutoAt&&ts-Number(store.lastAutoAt)<AUTO_MIN_INTERVAL)return null;
    }
    var entry={
      id:"tm-"+ts.toString(36)+"-"+Math.random().toString(36).slice(2,7),
      createdAt:now(),
      label:label||"Automatic snapshot",
      reason:reason||"auto",
      type:type,
      page:currentPage(),
      workspace:workspaceName(),
      profileId:p.id,
      profileName:p.name,
      summary:summaryFromProfile(p),
      payload:payload,
      signature:sig
    };
    entry.size=snapshotSize(payload);
    store.snapshots.unshift(entry);
    store.lastSignature=sig;
    if(auto)store.lastAutoAt=ts;
    writeStore(store);
    logActivity("Time Machine snapshot",entry.label,type);
    if(!opts.quiet)toast(auto?"Time Machine saved a restore point.":"Snapshot created.","success");
    render();
    return entry;
  }
  function listSnapshots(){
    return readStore().snapshots.slice().sort(function(a,b){return new Date(b.createdAt||0)-new Date(a.createdAt||0)});
  }
  function findSnapshot(id){
    return listSnapshots().find(function(item){return item.id===id})||null;
  }
  function restoreSnapshot(id){
    var entry=findSnapshot(id);
    if(!entry||!entry.payload||!entry.payload.profile){toast("Snapshot unavailable.","error");return false}
    if(!confirm("Restore ETHONE to this Time Machine snapshot? Current layout, widgets, settings, notes and workspaces will be replaced."))return false;
    createSnapshot("Before restoring "+(entry.label||"snapshot"),"restore guard",{force:true,quiet:true});
    var p=profile();
    if(!p){toast("No active profile to restore.","error");return false}
    var snap=clone(entry.payload.profile);
    p.activeWorkspaceId=snap.activeWorkspaceId||p.activeWorkspaceId;
    p.workspaces=Array.isArray(snap.workspaces)?snap.workspaces:[];
    if(snap.sidebarConfig!==undefined)p.sidebarConfig=snap.sidebarConfig;
    p.state=p.state||{};
    STATE_KEYS.forEach(function(key){
      if(snap.state&&snap.state[key]!==undefined)p.state[key]=clone(snap.state[key]);
      else delete p.state[key];
    });
    restoreLocalStorage(entry.payload.localStorage||{});
    saveNow();
    logActivity("Time Machine restored",entry.label,"restore");
    toast("Time Machine restored. Reloading ETHONE...","success");
    setTimeout(function(){location.reload()},450);
    return true;
  }
  function restoreLocalStorage(snapshot){
    try{
      var current=[];
      for(var i=0;i<localStorage.length;i++){
        var key=localStorage.key(i);
        if(shouldCaptureLocalKey(key))current.push(key);
      }
      current.forEach(function(key){if(snapshot[key]===undefined)localStorage.removeItem(key)});
      Object.keys(snapshot).forEach(function(key){if(shouldCaptureLocalKey(key))localStorage.setItem(key,String(snapshot[key]))});
    }catch(e){}
  }
  function deleteSnapshot(id){
    var store=readStore();
    store.snapshots=store.snapshots.filter(function(item){return item.id!==id});
    if(ui.selectedId===id)ui.selectedId=store.snapshots[0]&&store.snapshots[0].id||"";
    writeStore(store);
    render();
    toast("Snapshot deleted.","info");
  }
  function exportSnapshot(id){
    var entry=id?findSnapshot(id):null;
    if(!entry)entry=createSnapshot("Exported Time Machine snapshot","manual",{quiet:true});
    if(entry)downloadJSON(entry,"ethone-time-machine-"+entry.createdAt.slice(0,19).replace(/:/g,"-")+".json");
  }
  function exportAll(){
    downloadJSON(readStore(),"ethone-time-machine-history-"+now().slice(0,10)+".json");
  }
  function downloadJSON(data,name){
    var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;
    a.download=name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},1000);
  }
  function importFile(event){
    var file=event&&event.target&&event.target.files&&event.target.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(){
      try{
        var parsed=JSON.parse(reader.result);
        var incoming=[];
        if(parsed&&Array.isArray(parsed.snapshots))incoming=parsed.snapshots;
        else if(parsed&&parsed.payload&&parsed.id)incoming=[parsed];
        if(!incoming.length)throw new Error("No snapshots");
        var store=readStore(),added=0;
        incoming.forEach(function(item){
          if(item&&item.id&&item.payload&&!store.snapshots.some(function(x){return x.id===item.id})){
            store.snapshots.unshift(item);
            added++;
          }
        });
        writeStore(store);
        render();
        toast(added+" Time Machine snapshot"+(added>1?"s":"")+" imported.","success");
      }catch(e){
        toast("Invalid Time Machine file.","error");
      }
      if(event&&event.target)event.target.value="";
    };
    reader.readAsText(file);
  }
  function ensureImportInput(){
    var input=document.getElementById("time-machine-import-file");
    if(!input){
      input=document.createElement("input");
      input.id="time-machine-import-file";
      input.type="file";
      input.accept=".json";
      input.hidden=true;
      document.body.appendChild(input);
    }
    if(!input.dataset.bound){
      input.dataset.bound="1";
      input.addEventListener("change",importFile);
    }
    return input;
  }
  function logActivity(title,body,category){
    try{
      if(window.ETHONETimeline&&typeof window.ETHONETimeline.record==="function"){
        window.ETHONETimeline.record({title:title,body:body,category:category||"system",source:"Time Machine",dedupe:"tm-"+Date.now()});
      }
    }catch(e){}
  }
  function filtered(){
    var q=ui.query.trim().toLowerCase();
    return listSnapshots().filter(function(entry){
      var typeOk=ui.filter==="all"||entry.type===ui.filter;
      if(!typeOk)return false;
      if(!q)return true;
      return [entry.label,entry.reason,entry.type,entry.page,entry.workspace,entry.profileName].join(" ").toLowerCase().indexOf(q)>-1;
    });
  }
  function ensureRoot(){
    var root=document.getElementById("ethone-time-machine-root");
    if(!root){
      root=document.createElement("div");
      root.id="ethone-time-machine-root";
      document.body.appendChild(root);
      root.addEventListener("click",handleClick);
      root.addEventListener("input",handleInput);
      root.addEventListener("keydown",function(event){if(event.key==="Escape")close()});
    }
    return root;
  }
  function stat(label,value,icon){
    return '<article class="tm-stat"><i data-lucide="'+esc(icon||"clock")+'"></i><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></article>';
  }
  function filters(){
    var items=[
      ["all","All","layers-3"],
      ["auto","Auto","sparkles"],
      ["manual","Manual","hand"],
      ["layout","Layouts","layout-dashboard"],
      ["settings","Settings","sliders-horizontal"],
      ["data","Notes/Data","notebook-tabs"],
      ["workspace","Workspaces","panels-top-left"],
      ["restore","Restores","rotate-ccw"]
    ];
    return '<div class="tm-filters" role="tablist">'+items.map(function(item){
      return '<button type="button" class="'+(ui.filter===item[0]?"active":"")+'" data-tm-filter="'+item[0]+'" role="tab" aria-selected="'+(ui.filter===item[0]?"true":"false")+'"><i data-lucide="'+item[2]+'"></i>'+item[1]+'</button>';
    }).join("")+'</div>';
  }
  function timelineRows(list){
    if(!list.length)return '<div class="tm-empty"><i data-lucide="history"></i><strong>No snapshot found</strong><span>Create your first restore point or adjust filters.</span></div>';
    var currentDay="";
    return list.map(function(entry){
      var day=dayLabel(entry.createdAt),head="";
      if(day!==currentDay){currentDay=day;head='<div class="tm-day">'+esc(day)+'</div>'}
      var selected=(ui.selectedId||list[0].id)===entry.id;
      return head+'<button type="button" class="tm-row '+(selected?"selected":"")+'" data-tm-select="'+esc(entry.id)+'">'+
        '<span class="tm-dot '+esc(entry.type||"auto")+'"></span>'+
        '<span class="tm-row-main"><strong>'+esc(entry.label||"Snapshot")+'</strong><small>'+esc(new Date(entry.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}))+' / '+esc(entry.workspace||"Workspace")+' / '+esc(entry.page||"dashboard")+'</small></span>'+
        '<span class="tm-row-meta">'+esc(entry.type||"auto")+'</span>'+
      '</button>';
    }).join("");
  }
  function detail(entry){
    if(!entry)return '<aside class="tm-detail"><div class="tm-empty"><i data-lucide="mouse-pointer-2"></i><strong>Select a snapshot</strong><span>Choose a point in time from the timeline.</span></div></aside>';
    var s=entry.summary||{};
    return '<aside class="tm-detail">'+
      '<div class="tm-detail-head"><span>'+esc(entry.type||"Snapshot")+'</span><h2>'+esc(entry.label||"Snapshot")+'</h2><p>'+esc(new Date(entry.createdAt).toLocaleString())+' / '+esc(timeAgo(entry.createdAt))+'</p></div>'+
      '<div class="tm-metrics">'+
        stat("Notes",s.notes||0,"notebook-pen")+stat("Tasks",s.tasks||0,"circle-check")+stat("Workspaces",s.workspaces||0,"panels-top-left")+stat("Size",formatSize(entry.size),"hard-drive")+
      '</div>'+
      '<div class="tm-restore-card"><i data-lucide="rotate-ccw"></i><div><strong>Restore this moment</strong><span>Layouts, widgets, settings, notes, dashboard state and workspaces will return to this snapshot.</span></div></div>'+
      '<div class="tm-detail-actions">'+
        '<button class="btn btn-primary" type="button" data-tm-restore="'+esc(entry.id)+'">Restore</button>'+
        '<button class="btn btn-ghost" type="button" data-tm-export="'+esc(entry.id)+'">Export</button>'+
        '<button class="btn btn-danger" type="button" data-tm-delete="'+esc(entry.id)+'">Delete</button>'+
      '</div>'+
    '</aside>';
  }
  function render(){
    if(!ui.open)return;
    var root=ensureRoot(),list=filtered();
    if(!ui.selectedId||!list.some(function(x){return x.id===ui.selectedId}))ui.selectedId=list[0]&&list[0].id||"";
    var selected=findSnapshot(ui.selectedId)||list[0]||null;
    var all=listSnapshots(),total=all.reduce(function(sum,item){return sum+(item.size||0)},0);
    root.innerHTML='<div class="tm-overlay" role="presentation">'+
      '<section class="tm-shell" role="dialog" aria-modal="true" aria-labelledby="tm-title" tabindex="-1">'+
        '<header class="tm-header">'+
          '<div><span class="tm-kicker">ETHONE Time Machine</span><h1 id="tm-title">Return to any moment.</h1><p>Automatic local snapshots for layouts, widgets, settings, notes, dashboard state and workspaces.</p></div>'+
          '<button class="tm-close" type="button" data-tm-close aria-label="Close"><i data-lucide="x"></i></button>'+
        '</header>'+
        '<section class="tm-stats">'+stat("Snapshots",all.length,"history")+stat("Latest",all[0]?timeAgo(all[0].createdAt):"None","clock")+stat("Storage",formatSize(total),"database")+stat("Workspace",workspaceName(),"panels-top-left")+'</section>'+
        '<section class="tm-toolbar">'+
          '<label class="tm-search"><i data-lucide="search"></i><input id="tm-search" type="search" value="'+esc(ui.query)+'" placeholder="Search snapshots, settings, notes, workspaces..."></label>'+
          '<div class="tm-actions"><button class="btn btn-primary" type="button" data-tm-create>Create snapshot</button><button class="btn btn-ghost" type="button" data-tm-export-all>Export all</button><button class="btn btn-ghost" type="button" data-tm-import>Import</button></div>'+
        '</section>'+
        filters()+
        '<main class="tm-layout"><section class="tm-timeline" aria-label="Snapshot timeline">'+timelineRows(list)+'</section>'+detail(selected)+'</main>'+
      '</section>'+
    '</div>';
    root.classList.add("is-open");
    document.body.classList.add("ethone-time-machine-open");
    refreshIcons(root);
    var shell=$(".tm-shell",root);
    if(shell)try{shell.focus({preventScroll:true})}catch(e){shell.focus()}
    if(lastRenderQuery&&$("#tm-search",root)){
      var input=$("#tm-search",root);
      input.focus({preventScroll:true});
      input.setSelectionRange(input.value.length,input.value.length);
    }
    lastRenderQuery="";
  }
  function open(){
    ui.open=true;
    if(!listSnapshots().length)createSnapshot("Initial restore point","manual",{quiet:true,force:true});
    render();
    return true;
  }
  function close(){
    ui.open=false;
    var root=document.getElementById("ethone-time-machine-root");
    if(root){root.classList.remove("is-open");root.innerHTML=""}
    document.body.classList.remove("ethone-time-machine-open");
  }
  function handleInput(event){
    if(event.target&&event.target.id==="tm-search"){
      ui.query=event.target.value||"";
      lastRenderQuery="tm-search";
      render();
    }
  }
  function handleClick(event){
    var target=event.target;
    if(target.closest("[data-tm-close]")||target.classList&&target.classList.contains("tm-overlay")){close();return}
    var filter=target.closest("[data-tm-filter]");
    if(filter){ui.filter=filter.dataset.tmFilter||"all";render();return}
    var select=target.closest("[data-tm-select]");
    if(select){ui.selectedId=select.dataset.tmSelect;render();return}
    if(target.closest("[data-tm-create]")){createSnapshot("Manual restore point","manual",{force:true});return}
    if(target.closest("[data-tm-export-all]")){exportAll();return}
    if(target.closest("[data-tm-import]")){ensureImportInput().click();return}
    var restore=target.closest("[data-tm-restore]");
    if(restore){restoreSnapshot(restore.dataset.tmRestore);return}
    var exp=target.closest("[data-tm-export]");
    if(exp){exportSnapshot(exp.dataset.tmExport);return}
    var del=target.closest("[data-tm-delete]");
    if(del&&confirm("Delete this Time Machine snapshot?")){deleteSnapshot(del.dataset.tmDelete);return}
  }
  function scheduleAuto(reason){
    clearTimeout(autoTimer);
    autoTimer=setTimeout(function(){
      createSnapshot("Automatic snapshot",reason||"auto",{auto:true,quiet:true});
    },900);
  }
  function wrapSaveState(){
    if(typeof window.saveStateNow!=="function"||window.saveStateNow.__timeMachineWrapped)return;
    var old=window.saveStateNow;
    window.saveStateNow=function(){
      var out=old.apply(this,arguments);
      scheduleAuto("auto save");
      return out;
    };
    window.saveStateNow.__timeMachineWrapped=true;
  }
  function registerActions(){
    var Actions=window.ACTION_REGISTRY||window.ETHONEActions||(window.Ethone&&window.Ethone.get&&window.Ethone.get("actions"));
    if(!Actions||!Actions.register||window.__ethoneTimeMachineActions)return;
    window.__ethoneTimeMachineActions=true;
    Actions.register("timeMachine.open",{label:"Time Machine",handler:function(){return open()}});
    Actions.register("timeMachine.snapshot",{label:"Create Time Machine snapshot",handler:function(){createSnapshot("Manual restore point","manual",{force:true});return true}});
    Actions.register("timeMachine.restoreLatest",{label:"Restore latest Time Machine snapshot",handler:function(){var latest=listSnapshots()[0];return latest?restoreSnapshot(latest.id):false}});
  }
  function bind(){
    ensureImportInput();
    registerActions();
    wrapSaveState();
    document.addEventListener("visibilitychange",function(){if(!document.hidden)scheduleAuto("auto visibility")});
    [
      "ethone:dashboard-ready","ethone:smart-layout-change","ethone:workspace-change","ethone:workspace-update",
      "ethone:space-change","ethone:space-update","ethone:settings-change","ethone:theme-change","ethone:page-ready"
    ].forEach(function(name){window.addEventListener(name,function(){scheduleAuto(name.replace("ethone:","auto "))})});
    window.addEventListener("storage",function(event){if(event&&shouldCaptureLocalKey(event.key))scheduleAuto("auto storage")});
    setTimeout(function(){
      wrapSaveState();
      registerActions();
      createSnapshot("Initial restore point","auto initial",{auto:true,quiet:true,force:false});
    },1600);
  }

  window.ETHONETimeMachine={
    open:open,
    close:close,
    snapshot:function(label){return createSnapshot(label||"Manual restore point","manual",{force:true})},
    restore:restoreSnapshot,
    list:listSnapshots,
    export:exportSnapshot,
    exportAll:exportAll,
    importFile:importFile,
    render:render
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
})();
