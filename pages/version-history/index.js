/* ETHONE Version History */
(function(){
  "use strict";
  if(window.__ethoneVersionHistory)return;
  window.__ethoneVersionHistory=true;

  var STORE_KEY="ethone:version-history:v1";
  var MAX_VERSIONS=36;
  var selected=[];
  var search="";

  function now(){return new Date().toISOString()}
  function esc(v){
    return String(v==null?"":v).replace(/[&<>"']/g,function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
    });
  }
  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }
  function clone(v){
    try{return JSON.parse(JSON.stringify(v))}catch(e){return v}
  }
  function toast(message,type){
    try{if(typeof window.toast==="function")window.toast(message,type||"info")}catch(e){}
  }
  function saveNow(){
    try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
  }
  function currentPage(){
    var active=document.querySelector(".tab-content.active[id^='page-']");
    return active?active.id.replace(/^page-/,""):"dashboard";
  }
  function workspaceName(){
    try{
      var w=window.ETHONEWorkspaces&&window.ETHONEWorkspaces.active?window.ETHONEWorkspaces.active():null;
      if(w&&w.name)return w.name;
    }catch(e){}
    var p=profile();
    return p&&p.activeWorkspaceId||"Default";
  }
  function readStore(){
    var raw=null;
    try{raw=JSON.parse(localStorage.getItem(STORE_KEY)||"null")}catch(e){raw=null}
    if(!raw||!Array.isArray(raw.versions))raw={version:1,versions:[]};
    raw.versions=raw.versions.slice(0,MAX_VERSIONS);
    return raw;
  }
  function writeStore(store){
    store.versions=(store.versions||[]).slice(0,MAX_VERSIONS);
    try{localStorage.setItem(STORE_KEY,JSON.stringify(store))}catch(e){
      store.versions=store.versions.slice(0,Math.max(8,Math.floor(store.versions.length/2)));
      localStorage.setItem(STORE_KEY,JSON.stringify(store));
      toast("Version history trimmed to fit storage","info");
    }
  }
  function safeStateSummary(p){
    var s=p&&p.state?p.state:{};
    return {
      items:(s.items||[]).length,
      todos:(s.todos||[]).length,
      notes:(s.notes||[]).length,
      events:(s.events||[]).length,
      goals:(s.goals||[]).length,
      habits:(s.habits||[]).length,
      databases:(s.databases||[]).length,
      automations:(s.automationRules||[]).length,
      plugins:s.plugins?Object.keys(s.plugins).filter(function(id){return s.plugins[id]&&s.plugins[id].installed}).length:0,
      connections:s.connections?Object.keys(s.connections).filter(function(id){return !!s.connections[id]}).length:0,
      workspace:p&&p.activeWorkspaceId||"",
      page:currentPage()
    };
  }
  function profileSnapshot(){
    var p=profile();
    if(!p)return null;
    var out=clone(p);
    try{
      if(out&&out.state){
        delete out.state.centralMemory;
        delete out.state.backupSnapshots;
        delete out.state.backupHistory;
      }
    }catch(e){}
    return out;
  }
  function snapshotSize(snapshot){
    try{return new Blob([JSON.stringify(snapshot)]).size}catch(e){return JSON.stringify(snapshot).length}
  }
  function formatSize(size){
    size=Number(size)||0;
    if(size>1024*1024)return (size/1024/1024).toFixed(2)+" MB";
    if(size>1024)return Math.round(size/1024)+" KB";
    return size+" B";
  }
  function createVersion(description,reason){
    var p=profile();
    if(!p){toast("No active profile for version snapshot","error");return null}
    var before=safeStateSummary(p);
    var backupId="";
    try{
      if(window.ETHONEBackupManager&&typeof window.ETHONEBackupManager.create==="function"){
        var b=window.ETHONEBackupManager.create(description||"Version snapshot",{});
        backupId=b&&b.id||"";
      }
    }catch(e){}
    var snapshot={
      id:"ver-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),
      ts:now(),
      label:description||"Version snapshot",
      description:description||"Manual version",
      reason:reason||"manual",
      page:currentPage(),
      workspace:workspaceName(),
      profileId:p.id||"",
      profileName:p.name||p.username||"ETHONE",
      summary:before,
      backupId:backupId,
      profile:profileSnapshot()
    };
    snapshot.size=snapshotSize(snapshot);
    var store=readStore();
    store.versions.unshift(snapshot);
    writeStore(store);
    logActivity("Version created",snapshot.description,"creation");
    renderVersionHistoryPage();
    toast("Version snapshot created","success");
    return snapshot;
  }
  function logActivity(title,body,category){
    try{
      if(window.ETHONETimeline&&typeof window.ETHONETimeline.record==="function"){
        window.ETHONETimeline.record({title:title,body:body,category:category||"update",source:"Version History",dedupe:"version-"+Date.now()});
      }
    }catch(e){}
  }
  function findVersion(id){
    return readStore().versions.find(function(v){return v.id===id})||null;
  }
  function restoreVersion(id){
    var version=findVersion(id);
    if(!version){toast("Version unavailable","error");return false}
    if(!confirm("Restore ETHONE to this version? Current profile data will be replaced."))return false;
    if(version.backupId&&window.ETHONEBackupManager&&typeof window.ETHONEBackupManager.restore==="function"){
      var restored=window.ETHONEBackupManager.restore(version.backupId,"restore");
      if(restored){logActivity("Version restored",version.description,"update");return true}
    }
    if(!version.profile){toast("This version cannot be restored","error");return false}
    try{
      var p=profile();
      if(!p)return false;
      var saved=clone(version.profile);
      Object.keys(p).forEach(function(key){delete p[key]});
      Object.assign(p,saved);
      saveNow();
      logActivity("Version restored",version.description,"update");
      toast("Version restored","success");
      setTimeout(function(){location.reload()},350);
      return true;
    }catch(e){
      toast("Restore failed","error");
      return false;
    }
  }
  function deleteVersion(id){
    var store=readStore();
    store.versions=store.versions.filter(function(v){return v.id!==id});
    selected=selected.filter(function(x){return x!==id});
    writeStore(store);
    renderVersionHistoryPage();
    toast("Version deleted","info");
  }
  function exportVersion(id){
    var version=findVersion(id);
    if(!version)return;
    downloadJSON(version,"ethone-version-"+version.ts.slice(0,19).replace(/:/g,"-")+".json");
  }
  function exportAll(){
    downloadJSON(readStore(),"ethone-version-history-"+now().slice(0,10)+".json");
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
  function diffVersions(a,b){
    var rows=[];
    var sa=a&&a.summary||{},sb=b&&b.summary||{};
    ["items","todos","notes","events","goals","habits","databases","automations","plugins","connections"].forEach(function(key){
      var av=Number(sa[key]||0),bv=Number(sb[key]||0),delta=bv-av;
      if(delta!==0)rows.push({key:key,before:av,after:bv,delta:delta});
    });
    if((sa.workspace||"")!==(sb.workspace||""))rows.push({key:"workspace",before:sa.workspace||"-",after:sb.workspace||"-",delta:"changed"});
    if((sa.page||"")!==(sb.page||""))rows.push({key:"page",before:sa.page||"-",after:sb.page||"-",delta:"changed"});
    return rows;
  }
  function filteredVersions(){
    var list=readStore().versions;
    var q=search.trim().toLowerCase();
    if(q)list=list.filter(function(v){
      return (v.description+" "+v.workspace+" "+v.page+" "+v.reason+" "+v.profileName).toLowerCase().indexOf(q)>-1;
    });
    return list;
  }
  function ensurePage(){
    if(document.getElementById("page-versions"))return;
    var anchor=document.getElementById("page-health")||document.getElementById("page-activity")||document.querySelector(".tab-content:last-of-type");
    var page=document.createElement("div");
    page.id="page-versions";
    page.className="tab-content";
    page.setAttribute("role","tabpanel");
    page.setAttribute("aria-live","polite");
    page.setAttribute("data-qa-page","true");
    page.innerHTML='<div class="version-page" id="version-page-root"></div>';
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(page,anchor.nextSibling);
    else document.getElementById("main-content")?.appendChild(page);
  }
  function stat(label,value,sub,icon){
    return '<article class="version-stat"><i data-lucide="'+esc(icon||"git-commit")+'"></i><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(sub||"")+'</small></article>';
  }
  function versionRow(v,index){
    var active=selected.indexOf(v.id)>-1;
    return '<article class="version-row '+(active?"selected":"")+'" data-version-id="'+esc(v.id)+'">'+
      '<button class="version-select" type="button" data-version-select="'+esc(v.id)+'" aria-label="Select version">'+(active?"✓":"")+'</button>'+
      '<div class="version-line"><i></i></div>'+
      '<div class="version-main">'+
        '<div class="version-row-top"><span>v'+esc(index+1)+'</span><time>'+esc(new Date(v.ts).toLocaleString())+'</time></div>'+
        '<h3>'+esc(v.description||"Version snapshot")+'</h3>'+
        '<p>'+esc(v.workspace||"Workspace")+' · '+esc(v.page||"dashboard")+' · '+esc(v.reason||"manual")+'</p>'+
        '<div class="version-tags"><span>'+esc(formatSize(v.size))+'</span><span>'+esc(v.profileName||"ETHONE")+'</span>'+(v.backupId?'<span>Backup linked</span>':'')+'</div>'+
      '</div>'+
      '<div class="version-actions">'+
        '<button class="btn btn-ghost" type="button" data-version-restore="'+esc(v.id)+'">Restaurer</button>'+
        '<button class="btn btn-ghost" type="button" data-version-export="'+esc(v.id)+'">Exporter</button>'+
        '<button class="btn btn-danger" type="button" data-version-delete="'+esc(v.id)+'">Supprimer</button>'+
      '</div>'+
    '</article>';
  }
  function compareHTML(){
    if(selected.length<2)return '<div class="version-empty compact"><i data-lucide="git-compare"></i><strong>Selectionnez deux versions</strong><span>Choisissez deux snapshots dans la timeline pour comparer les changements.</span></div>';
    var a=findVersion(selected[1]),b=findVersion(selected[0]);
    var rows=diffVersions(a,b);
    return '<div class="version-compare-head"><div><span>Avant</span><strong>'+esc(a&&a.description||"-")+'</strong></div><i data-lucide="arrow-right"></i><div><span>Apres</span><strong>'+esc(b&&b.description||"-")+'</strong></div></div>'+
      '<div class="version-diff-list">'+(rows.length?rows.map(function(r){
        var sign=typeof r.delta==="number"?(r.delta>0?"+":""):"";
        return '<div class="version-diff-row"><span>'+esc(r.key)+'</span><strong>'+esc(r.before)+'</strong><i>'+esc(sign+r.delta)+'</i><strong>'+esc(r.after)+'</strong></div>';
      }).join(""):'<div class="version-empty compact"><strong>Aucune difference majeure</strong><span>Les compteurs principaux sont identiques.</span></div>')+'</div>';
  }
  function renderVersionHistoryPage(){
    ensurePage();
    var root=document.getElementById("version-page-root");
    if(!root)return;
    var list=filteredVersions();
    var all=readStore().versions;
    var latest=all[0];
    var totalSize=all.reduce(function(sum,v){return sum+(v.size||0)},0);
    root.innerHTML=
      '<section class="version-hero">'+
        '<div><div class="version-kicker">ETHONE Versions</div><h1>Version History</h1><p>Un historique façon Git, Notion et Figma pour créer des snapshots, comparer deux états et revenir en arrière quand nécessaire.</p></div>'+
        '<div class="version-create">'+
          '<input class="modal-input" id="version-description" placeholder="Description, ex: Avant refonte dashboard">'+
          '<button class="btn btn-primary" type="button" data-version-create>Créer un snapshot</button>'+
          '<button class="btn btn-ghost" type="button" data-version-export-all>Exporter tout</button>'+
        '</div>'+
      '</section>'+
      '<section class="version-stats">'+
        stat("Versions",all.length,latest?new Date(latest.ts).toLocaleDateString():"Aucun snapshot","git-branch")+
        stat("Stockage",formatSize(totalSize),"Historique local","hard-drive")+
        stat("Selection",selected.length+"/2","Comparaison active","git-compare")+
        stat("Workspace",workspaceName(),"Contexte actuel","layers-3")+
      '</section>'+
      '<section class="version-toolbar"><div class="version-search"><i data-lucide="search"></i><input id="version-search" type="search" value="'+esc(search)+'" placeholder="Rechercher dans les versions..."></div><button class="btn btn-ghost" type="button" data-version-clear-selection>Vider selection</button></section>'+
      '<section class="version-layout">'+
        '<div class="version-panel"><div class="version-panel-head"><div><h2>Timeline des versions</h2><p>'+list.length+' snapshot'+(list.length>1?"s":"")+' disponible'+(list.length>1?"s":"")+'</p></div></div><div class="version-timeline">'+(list.length?list.map(versionRow).join(""):'<div class="version-empty"><i data-lucide="git-commit"></i><strong>Aucune version</strong><span>Créez un premier snapshot pour commencer l historique.</span></div>')+'</div></div>'+
        '<aside class="version-panel version-compare"><div class="version-panel-head"><div><h2>Comparer</h2><p>Différence entre deux snapshots.</p></div></div>'+compareHTML()+'</aside>'+
      '</section>';
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function toggleSelect(id){
    selected=selected.filter(function(x){return x!==id});
    selected.unshift(id);
    selected=selected.slice(0,2);
    renderVersionHistoryPage();
  }
  function install(){
    ensurePage();
    document.addEventListener("input",function(e){
      if(e.target&&e.target.id==="version-search"){search=e.target.value;renderVersionHistoryPage()}
    });
    document.addEventListener("click",function(e){
      if(e.target.closest("[data-version-create]")){
        var input=document.getElementById("version-description");
        createVersion(input&&input.value?input.value:"Manual version","manual");
        return;
      }
      if(e.target.closest("[data-version-export-all]")){exportAll();return}
      if(e.target.closest("[data-version-clear-selection]")){selected=[];renderVersionHistoryPage();return}
      var select=e.target.closest("[data-version-select]");
      if(select){toggleSelect(select.dataset.versionSelect);return}
      var restore=e.target.closest("[data-version-restore]");
      if(restore){restoreVersion(restore.dataset.versionRestore);return}
      var exp=e.target.closest("[data-version-export]");
      if(exp){exportVersion(exp.dataset.versionExport);return}
      var del=e.target.closest("[data-version-delete]");
      if(del&&confirm("Supprimer cette version ?")){deleteVersion(del.dataset.versionDelete);return}
    });
    window.addEventListener("ethone:page-ready",function(e){
      if(e.detail&&e.detail.page==="versions")renderVersionHistoryPage();
    });
    renderVersionHistoryPage();
  }

  window.ETHONEVersionHistory={create:createVersion,restore:restoreVersion,list:function(){return readStore().versions.slice()},compare:diffVersions,render:renderVersionHistoryPage};
  window.renderVersionHistoryPage=renderVersionHistoryPage;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
