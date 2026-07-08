/* ETHONE Backup Manager.
 * Full local backup history with restore, rollback, import/export and optional
 * cloud sync through the existing Supabase profile state.
 */
(function(){
  "use strict";
  if(window.__ethoneBackupManager)return;
  window.__ethoneBackupManager=true;

  var STORE_KEY="ethone:backup-manager";
  var BACKUP_VERSION="ETHONE Backup v1";
  var MAX_LOCAL=24;
  var MAX_CLOUD=8;

  function now(){return new Date().toISOString()}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function state(){var p=profile();if(!p)return {};if(!p.state)p.state={};return p.state}
  function toastSafe(message,type){if(typeof window.toast==="function")window.toast(message,type||"info")}
  function esc(value){
    if(typeof window.escapeHTML==="function")return window.escapeHTML(value);
    return String(value==null?"":value).replace(/[&<>"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]});
  }
  function bytes(value){return new Blob([value]).size}
  function formatSize(size){
    size=Number(size)||0;
    if(size>1024*1024)return (size/1024/1024).toFixed(2)+" MB";
    if(size>1024)return Math.round(size/1024)+" KB";
    return size+" B";
  }
  function activeWorkspaceName(){
    try{
      var w=window.ETHONEWorkspaces&&window.ETHONEWorkspaces.active?window.ETHONEWorkspaces.active():null;
      if(w&&w.name)return w.name;
    }catch(e){}
    var p=profile();
    if(p&&p.activeWorkspaceId&&Array.isArray(p.workspaces)){
      var found=p.workspaces.find(function(w){return w.id===p.activeWorkspaceId});
      if(found)return found.name||found.id;
    }
    return "Default workspace";
  }
  function cloneProfiles(){
    var source=[];
    try{source=Array.isArray(profiles)?profiles:(window.profiles||[])}catch(e){source=window.profiles||[]}
    var cloned=JSON.parse(JSON.stringify(source||[]));
    cloned.forEach(function(p){
      if(p&&p.state){
        delete p.state.backupSnapshots;
        delete p.state.backupHistory;
        delete p.state.backupMeta;
      }
    });
    return cloned;
  }
  function makeSnapshot(description){
    var data={
      version:BACKUP_VERSION,
      app:"ETHONE",
      exportedAt:now(),
      activeProfileId:profile()&&profile().id,
      workspace:activeWorkspaceName(),
      description:description||"Manual backup",
      profiles:cloneProfiles()
    };
    data.size=bytes(JSON.stringify(data));
    return data;
  }
  function readStore(){
    var store;
    try{store=JSON.parse(localStorage.getItem(STORE_KEY)||"{}")}catch(e){store={}}
    if(!Array.isArray(store.backups))store.backups=[];
    mergeCloud(store);
    return store;
  }
  function writeStore(store){
    store.backups=(store.backups||[]).slice(0,MAX_LOCAL);
    try{
      localStorage.setItem(STORE_KEY,JSON.stringify(store));
    }catch(e){
      store.backups=store.backups.slice(0,Math.max(4,Math.floor(store.backups.length/2)));
      localStorage.setItem(STORE_KEY,JSON.stringify(store));
      toastSafe("Storage was full, older backups were trimmed.","info");
    }
  }
  function mergeCloud(store){
    var p=profile();
    var cloud=(p&&p.state&&Array.isArray(p.state.backupSnapshots))?p.state.backupSnapshots:[];
    cloud.forEach(function(entry){
      if(!entry||!entry.id)return;
      if(!store.backups.some(function(b){return b.id===entry.id})){
        store.backups.push(Object.assign({},entry,{cloudOnly:true,cloud:true}));
      }
    });
    store.backups.sort(function(a,b){return new Date(b.createdAt||b.exportedAt||0)-new Date(a.createdAt||a.exportedAt||0)});
  }
  function entryFromSnapshot(snapshot,cloud){
    var serialized=JSON.stringify(snapshot);
    return {
      id:"backup-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),
      createdAt:snapshot.exportedAt||now(),
      version:snapshot.version||BACKUP_VERSION,
      workspace:snapshot.workspace||activeWorkspaceName(),
      description:snapshot.description||"Manual backup",
      size:bytes(serialized),
      profileCount:Array.isArray(snapshot.profiles)?snapshot.profiles.length:0,
      currentProfile:profile()&&(profile().name||profile().username)||"ETHONE",
      cloud:!!cloud,
      snapshot:snapshot
    };
  }
  function createBackup(description,opts){
    opts=opts||{};
    var snapshot=makeSnapshot(description);
    var entry=entryFromSnapshot(snapshot,false);
    var store=readStore();
    store.backups.unshift(entry);
    writeStore(store);
    rememberMeta(entry,"created");
    if(opts.cloud)syncBackupToCloud(entry.id);
    renderAll();
    toastSafe("Backup created","success");
    return entry;
  }
  function findBackup(id){
    return readStore().backups.find(function(b){return b.id===id});
  }
  function restoreBackup(id,mode){
    var entry=findBackup(id);
    if(!entry||!entry.snapshot||!Array.isArray(entry.snapshot.profiles)){toastSafe("Backup unavailable","error");return false}
    if(!confirm((mode==="rollback"?"Rollback":"Restore")+" ETHONE to this backup? Current profiles will be replaced."))return false;
    try{profiles=JSON.parse(JSON.stringify(entry.snapshot.profiles));window.profiles=profiles;}catch(e){window.profiles=JSON.parse(JSON.stringify(entry.snapshot.profiles));}
    if(typeof window.normalizeAllProfiles==="function")window.normalizeAllProfiles();
    if(typeof window.saveStateNow==="function")window.saveStateNow();
    if(typeof window.saveCloudState==="function")window.saveCloudState().catch(function(){});
    rememberMeta(entry,mode==="rollback"?"rollback":"restored");
    toastSafe(mode==="rollback"?"Rollback complete":"Backup restored","success");
    setTimeout(function(){
      if(typeof window.goToProfileScreen==="function")window.goToProfileScreen();
      else location.reload();
    },450);
    return true;
  }
  function rollbackLatest(){
    var list=readStore().backups.filter(function(b){return b.snapshot&&Array.isArray(b.snapshot.profiles)});
    if(!list.length){toastSafe("No backup available to rollback","error");return}
    restoreBackup(list[0].id,"rollback");
  }
  function deleteBackup(id){
    var store=readStore();
    store.backups=store.backups.filter(function(b){return b.id!==id});
    writeStore(store);
    var p=profile();
    if(p&&p.state&&Array.isArray(p.state.backupSnapshots)){
      p.state.backupSnapshots=p.state.backupSnapshots.filter(function(b){return b.id!==id});
      saveNow();
    }
    renderAll();
    toastSafe("Backup deleted","info");
  }
  function exportBackup(id){
    var entry=id?findBackup(id):readStore().backups[0];
    if(!entry){
      entry=createBackup("Exported backup");
    }
    downloadSnapshot(entry.snapshot||makeSnapshot(entry.description),entry);
  }
  function exportAll(){
    var store=readStore();
    var payload={version:BACKUP_VERSION,type:"ethone-backup-history",exportedAt:now(),backups:store.backups};
    downloadJSON(payload,"ethone-backup-history-"+now().slice(0,10)+".json");
  }
  function downloadSnapshot(snapshot,entry){
    var name="ethone-backup-"+(entry&&entry.createdAt?entry.createdAt:now()).slice(0,19).replace(/:/g,"-")+".json";
    downloadJSON(snapshot,name);
    toastSafe("Backup exported","success");
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
        var imported=0;
        if(parsed.type==="ethone-backup-history"&&Array.isArray(parsed.backups)){
          var store=readStore();
          parsed.backups.forEach(function(b){if(b&&b.id&&!store.backups.some(function(x){return x.id===b.id})){store.backups.unshift(b);imported++;}});
          writeStore(store);
        }else{
          var snapshot=normalizeImportedSnapshot(parsed);
          var entry=entryFromSnapshot(snapshot,false);
          var store2=readStore();
          store2.backups.unshift(entry);
          writeStore(store2);
          imported=1;
        }
        renderAll();
        toastSafe(imported+" backup"+(imported>1?"s":"")+" imported","success");
      }catch(e){
        toastSafe("Invalid backup file","error");
      }
      if(event&&event.target)event.target.value="";
    };
    reader.readAsText(file);
  }
  function normalizeImportedSnapshot(data){
    if(data&&Array.isArray(data.profiles))return Object.assign({version:BACKUP_VERSION,exportedAt:now(),workspace:"Imported",description:"Imported backup"},data);
    if(Array.isArray(data))return {version:BACKUP_VERSION,exportedAt:now(),workspace:"Imported",description:"Imported legacy profiles backup",profiles:data};
    throw new Error("Invalid backup");
  }
  function syncBackupToCloud(id){
    var entry=findBackup(id);
    var p=profile();
    if(!entry||!p||!p.state){toastSafe("Cloud sync requires an active profile","error");return}
    p.state.backupSnapshots=(Array.isArray(p.state.backupSnapshots)?p.state.backupSnapshots:[]).filter(function(b){return b.id!==entry.id});
    p.state.backupSnapshots.unshift(Object.assign({},entry,{cloud:true,cloudOnly:false}));
    p.state.backupSnapshots=p.state.backupSnapshots.slice(0,MAX_CLOUD);
    saveNow();
    if(typeof window.saveCloudState==="function"){
      window.saveCloudState().then(function(){
        markCloud(id);
        toastSafe("Backup synced to cloud","success");
      }).catch(function(){
        toastSafe("Cloud sync failed","error");
      });
    }else{
      markCloud(id);
      toastSafe("Backup prepared for cloud sync","info");
    }
  }
  function markCloud(id){
    var store=readStore();
    store.backups.forEach(function(b){if(b.id===id)b.cloud=true});
    writeStore(store);
    renderAll();
  }
  function saveNow(){
    try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
  }
  function rememberMeta(entry,action){
    var p=profile();
    if(!p||!p.state)return;
    p.state.backupHistory=Array.isArray(p.state.backupHistory)?p.state.backupHistory:[];
    p.state.backupHistory.unshift({id:entry.id,action:action,createdAt:now(),description:entry.description,size:entry.size,workspace:entry.workspace,version:entry.version});
    p.state.backupHistory=p.state.backupHistory.slice(0,40);
    saveNow();
  }

  function renderAll(){
    renderBackupPage();
    renderImportExportPages();
  }
  function renderBackupPage(){
    var root=document.getElementById("settings-backup");
    if(!root)return;
    var store=readStore();
    var list=store.backups||[];
    var latest=list[0];
    root.innerHTML=
      '<div class="backup-manager">'+
        '<section class="backup-hero settings-card">'+
          '<div><div class="backup-kicker">Backup Manager</div><h3>Your ETHONE recovery system.</h3><p>Create snapshots, restore safely, rollback, export portable archives and sync selected backups to cloud.</p></div>'+
          '<div class="backup-hero-actions">'+
            '<input class="modal-input" id="backup-description" placeholder="Description, e.g. Before dashboard changes" />'+
            '<button class="btn btn-primary" type="button" data-backup-create>Create backup</button>'+
            '<button class="btn btn-ghost" type="button" data-backup-time-machine>Open Time Machine</button>'+
            '<button class="btn btn-ghost" type="button" data-backup-import>Import</button>'+
            '<button class="btn btn-ghost" type="button" data-backup-export-latest>Export latest</button>'+
            '<button class="btn btn-ghost" type="button" data-backup-rollback>Rollback</button>'+
          '</div>'+
        '</section>'+
        '<section class="backup-stats">'+
          stat("Backups",list.length)+stat("Latest",latest?new Date(latest.createdAt).toLocaleDateString():"None")+stat("Cloud",list.filter(function(b){return b.cloud}).length)+stat("Size",formatSize(list.reduce(function(s,b){return s+(b.size||0)},0)))+
        '</section>'+
        '<section class="settings-card backup-list-card">'+
          '<div class="settings-card-title">History</div>'+
          '<div class="backup-list">'+(list.length?list.map(backupRow).join(""):'<div class="backup-empty">No backup yet. Create your first recovery point.</div>')+'</div>'+
        '</section>'+
      '</div>';
  }
  function stat(label,value){
    return '<article class="backup-stat"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></article>';
  }
  function backupRow(entry){
    var date=new Date(entry.createdAt||entry.exportedAt||Date.now());
    return '<article class="backup-row">'+
      '<div class="backup-row-main">'+
        '<strong>'+esc(entry.description||"Backup")+'</strong>'+
        '<span>'+esc(date.toLocaleString())+' · '+esc(entry.workspace||"Workspace")+' · '+esc(entry.version||BACKUP_VERSION)+'</span>'+
      '</div>'+
      '<div class="backup-row-meta"><span>'+esc(formatSize(entry.size))+'</span><span>'+esc(entry.profileCount||0)+' profiles</span><span class="'+(entry.cloud?'cloud-on':'cloud-off')+'">'+(entry.cloud?'Cloud':'Local')+'</span></div>'+
      '<div class="backup-row-actions">'+
        '<button class="btn btn-ghost" type="button" data-backup-restore="'+esc(entry.id)+'">Restore</button>'+
        '<button class="btn btn-ghost" type="button" data-backup-export="'+esc(entry.id)+'">Export</button>'+
        '<button class="btn btn-ghost" type="button" data-backup-cloud="'+esc(entry.id)+'">Cloud</button>'+
        '<button class="btn btn-danger" type="button" data-backup-delete="'+esc(entry.id)+'">Delete</button>'+
      '</div>'+
    '</article>';
  }
  function renderImportExportPages(){
    var importRoot=document.getElementById("settings-importx");
    if(importRoot){
      importRoot.innerHTML='<div class="settings-card backup-io-card"><div class="settings-card-title">Import backups</div><p>Import an ETHONE backup file or a full backup history archive. Imported backups are added to the history first, then you choose when to restore.</p><button class="btn btn-primary" type="button" data-backup-import>Choose backup file</button></div>';
    }
    var exportRoot=document.getElementById("settings-exportx");
    if(exportRoot){
      exportRoot.innerHTML='<div class="settings-card backup-io-card"><div class="settings-card-title">Export backups</div><p>Download the latest snapshot or export the full local backup history as a portable JSON archive.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" type="button" data-backup-export-latest>Export latest</button><button class="btn btn-ghost" type="button" data-backup-export-all>Export history</button><button class="btn btn-ghost" type="button" data-backup-create-export>Create & export</button></div></div>';
    }
  }
  function handleClick(event){
    var target=event.target;
    if(target.closest("[data-backup-create]")){
      createBackup((document.getElementById("backup-description")||{}).value||"Manual backup");
      return;
    }
    if(target.closest("[data-backup-create-export]")){
      exportBackup(createBackup("Created before export").id);
      return;
    }
    if(target.closest("[data-backup-time-machine]")){
      if(window.ETHONETimeMachine&&typeof window.ETHONETimeMachine.open==="function")window.ETHONETimeMachine.open();
      else if(typeof window.runAction==="function")window.runAction("timeMachine.open",{source:"backup-manager"});
      else toastSafe("Time Machine unavailable","info");
      return;
    }
    if(target.closest("[data-backup-import]")){
      ensureImportInput().click();
      return;
    }
    if(target.closest("[data-backup-export-latest]")){exportBackup();return}
    if(target.closest("[data-backup-export-all]")){exportAll();return}
    if(target.closest("[data-backup-rollback]")){rollbackLatest();return}
    var restore=target.closest("[data-backup-restore]");
    if(restore){restoreBackup(restore.dataset.backupRestore,"restore");return}
    var exp=target.closest("[data-backup-export]");
    if(exp){exportBackup(exp.dataset.backupExport);return}
    var cloud=target.closest("[data-backup-cloud]");
    if(cloud){syncBackupToCloud(cloud.dataset.backupCloud);return}
    var del=target.closest("[data-backup-delete]");
    if(del&&confirm("Delete this backup?")){deleteBackup(del.dataset.backupDelete);return}
  }
  function ensureImportInput(){
    var input=document.getElementById("backup-manager-import-file");
    if(!input){
      input=document.createElement("input");
      input.id="backup-manager-import-file";
      input.type="file";
      input.accept=".json";
      input.style.display="none";
      document.body.appendChild(input);
    }
    if(!input.dataset.bound){
      input.dataset.bound="1";
      input.addEventListener("change",importFile);
    }
    return input;
  }
  function wrapSettings(){
    if(typeof window.switchSettingsTab!=="function"||window.switchSettingsTab.__backupWrapped)return;
    var old=window.switchSettingsTab;
    window.switchSettingsTab=function(tab,el){
      var out=old.apply(this,arguments);
      if(tab==="backup"||tab==="importx"||tab==="exportx")setTimeout(renderAll,40);
      return out;
    };
    window.switchSettingsTab.__backupWrapped=true;
  }
  function start(){
    document.addEventListener("click",handleClick);
    ensureImportInput();
    wrapSettings();
    window.addEventListener("ethone:page-ready",function(event){
      if(event.detail&&event.detail.page==="settings")setTimeout(renderAll,120);
    });
    setTimeout(function(){wrapSettings();renderAll();},500);
  }

  window.ETHONEBackupManager={
    create:createBackup,
    restore:restoreBackup,
    rollback:rollbackLatest,
    importFile:importFile,
    export:exportBackup,
    exportAll:exportAll,
    syncCloud:syncBackupToCloud,
    list:function(){return readStore().backups.slice()},
    render:renderAll
  };
  window.backupNow=function(){createBackup("Manual backup",{cloud:true})};
  window.backupDownload=function(){exportBackup()};
  window.backupRestore=importFile;
  start();
})();
