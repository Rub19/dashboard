/* ETHONE Version Center */
(function(){
  "use strict";
  if(window.__ethoneVersionCenter)return;
  window.__ethoneVersionCenter=true;

  var DATA_URL="./data/version-center.json";
  var SNAPSHOT_KEY="ethone:version-history:v1";
  var READ_KEY="ethone:version-center:read";
  var LAST_SEEN_KEY="ethone:version-center:last-seen";
  var DISABLED_KEY="ethone:version-center:disable-popup";
  var MAX_SNAPSHOTS=36;
  var snapshotSelection=[];
  var state={loading:true,error:"",data:null,query:"",filter:"all",selected:"",snapshotQuery:""};
  var popupRoot=null;
  var pageReady=false;
  var loadPromise=null;

  var FALLBACK_CATEGORIES={
    features:{label:"New Features",icon:"sparkles"},
    improvements:{label:"Improvements",icon:"rocket"},
    fixes:{label:"Bug Fixes",icon:"bug"},
    uiux:{label:"UI / UX",icon:"wand-sparkles"},
    performance:{label:"Performance",icon:"zap"},
    security:{label:"Security",icon:"shield-check"},
    ai:{label:"AI",icon:"brain"},
    integrations:{label:"Integrations",icon:"plug"},
    widgets:{label:"Widgets",icon:"layout-grid"},
    marketplace:{label:"Marketplace",icon:"shopping-bag"}
  };

  function now(){return new Date().toISOString()}
  function esc(v){
    return String(v==null?"":v).replace(/[&<>"']/g,function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
    });
  }
  function safeJSON(value,fallback){
    try{return JSON.parse(value)}catch(e){return fallback}
  }
  function toast(message,type){
    try{if(typeof window.toast==="function")window.toast(message,type||"info")}catch(e){}
  }
  function refreshIcons(root){
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons({},root||document)}catch(e){}
  }
  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }
  function clone(v){
    try{return JSON.parse(JSON.stringify(v))}catch(e){return v}
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
  function compareVersion(a,b){
    var pa=String(a||"0").replace(/^v/i,"").split(/[.-]/).map(function(x){return parseInt(x,10)||0});
    var pb=String(b||"0").replace(/^v/i,"").split(/[.-]/).map(function(x){return parseInt(x,10)||0});
    for(var i=0;i<Math.max(pa.length,pb.length);i++){
      var av=pa[i]||0,bv=pb[i]||0;
      if(av!==bv)return av-bv;
    }
    return 0;
  }
  function categories(){
    return state.data&&state.data.categories||FALLBACK_CATEGORIES;
  }
  function categoryMeta(id){
    return categories()[id]||{label:id,icon:"circle"};
  }
  function normalizeData(data){
    data=data&&typeof data==="object"?data:{};
    data.categories=Object.assign({},FALLBACK_CATEGORIES,data.categories||{});
    data.versions=Array.isArray(data.versions)?data.versions.slice():[];
    data.versions.sort(function(a,b){
      var cmp=compareVersion(b.version,a.version);
      if(cmp)return cmp;
      return String(b.releaseDate||"").localeCompare(String(a.releaseDate||""));
    });
    data.roadmap=Array.isArray(data.roadmap)?data.roadmap:[];
    data.metadata=Object.assign({},data.metadata||{});
    if(!data.currentVersion&&data.versions[0])data.currentVersion=data.versions[0].version;
    if(!state.selected&&data.versions[0])state.selected=data.versions[0].version;
    return data;
  }
  function fallbackData(){
    return normalizeData({
      schema:1,
      product:"ETHONE",
      currentVersion:"1.0.0",
      metadata:{version:"1.0.0",build:"local",releaseDate:now().slice(0,10),branch:"local",commit:"",status:"Preview",internalVersion:"local",environment:"Local",apiVersion:"local"},
      categories:FALLBACK_CATEGORIES,
      versions:[],
      roadmap:[]
    });
  }
  function loadData(force){
    if(loadPromise&&!force)return loadPromise;
    state.loading=true;
    state.error="";
    renderVersionCenterPage();
    loadPromise=fetch(DATA_URL,{cache:"no-store"})
      .then(function(res){
        if(!res.ok)throw new Error("Version manifest HTTP "+res.status);
        return res.json();
      })
      .then(function(data){
        state.data=normalizeData(data);
        state.loading=false;
        state.error="";
        if(!state.selected&&state.data.versions[0])state.selected=state.data.versions[0].version;
        renderVersionCenterPage();
        scheduleAutoPopup(800);
        return state.data;
      })
      .catch(function(error){
        state.data=fallbackData();
        state.loading=false;
        state.error=error.message||"Version manifest unavailable";
        renderVersionCenterPage();
        return state.data;
      });
    return loadPromise;
  }

  function readSnapshots(){
    var raw=safeJSON(localStorage.getItem(SNAPSHOT_KEY)||"null",null);
    if(!raw||!Array.isArray(raw.versions))raw={version:1,versions:[]};
    raw.versions=raw.versions.slice(0,MAX_SNAPSHOTS);
    return raw;
  }
  function writeSnapshots(store){
    store.versions=(store.versions||[]).slice(0,MAX_SNAPSHOTS);
    try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(store))}catch(e){
      store.versions=store.versions.slice(0,Math.max(8,Math.floor(store.versions.length/2)));
      localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(store));
      toast("Version snapshots trimmed to fit local storage","info");
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
      summary:safeStateSummary(p),
      backupId:backupId,
      profile:profileSnapshot()
    };
    snapshot.size=snapshotSize(snapshot);
    var store=readSnapshots();
    store.versions.unshift(snapshot);
    writeSnapshots(store);
    logActivity("Version snapshot created",snapshot.description,"creation");
    renderVersionCenterPage();
    toast("Version snapshot created","success");
    return snapshot;
  }
  function logActivity(title,body,category){
    try{
      if(window.ETHONETimeline&&typeof window.ETHONETimeline.record==="function"){
        window.ETHONETimeline.record({title:title,body:body,category:category||"update",source:"Version Center",dedupe:"version-"+Date.now()});
      }
    }catch(e){}
  }
  function findSnapshot(id){
    return readSnapshots().versions.find(function(v){return v.id===id})||null;
  }
  function restoreVersion(id){
    var version=findSnapshot(id);
    if(!version){toast("Version unavailable","error");return false}
    if(!confirm("Restore ETHONE to this snapshot? Current profile data will be replaced."))return false;
    if(version.backupId&&window.ETHONEBackupManager&&typeof window.ETHONEBackupManager.restore==="function"){
      var restored=window.ETHONEBackupManager.restore(version.backupId,"restore");
      if(restored){logActivity("Version snapshot restored",version.description,"update");return true}
    }
    if(!version.profile){toast("This version cannot be restored","error");return false}
    try{
      var p=profile();
      if(!p)return false;
      var saved=clone(version.profile);
      Object.keys(p).forEach(function(key){delete p[key]});
      Object.assign(p,saved);
      saveNow();
      logActivity("Version snapshot restored",version.description,"update");
      toast("Version restored","success");
      setTimeout(function(){location.reload()},350);
      return true;
    }catch(e){
      toast("Restore failed","error");
      return false;
    }
  }
  function deleteVersion(id){
    var store=readSnapshots();
    store.versions=store.versions.filter(function(v){return v.id!==id});
    snapshotSelection=snapshotSelection.filter(function(x){return x!==id});
    writeSnapshots(store);
    renderVersionCenterPage();
    toast("Version snapshot deleted","info");
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
  function exportVersion(id){
    var version=findSnapshot(id);
    if(version)downloadJSON(version,"ethone-version-"+version.ts.slice(0,19).replace(/:/g,"-")+".json");
  }
  function exportAll(){
    downloadJSON(readSnapshots(),"ethone-version-snapshots-"+now().slice(0,10)+".json");
  }
  function diffSnapshots(a,b){
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
  function versionById(id){
    var data=state.data||fallbackData();
    return data.versions.find(function(v){return String(v.version)===String(id)})||data.versions[0]||null;
  }
  function sectionCount(version){
    var sections=version&&version.sections||{};
    return Object.keys(sections).reduce(function(total,key){return total+(Array.isArray(sections[key])?sections[key].length:0)},0);
  }
  function versionText(version){
    var sections=version&&version.sections||{};
    var text=[version.version,version.build,version.type,version.status,version.description,version.releaseDate,version.branch,version.commit].join(" ");
    Object.keys(sections).forEach(function(key){text+=" "+key+" "+(sections[key]||[]).join(" ")});
    (version.breakingChanges||[]).forEach(function(x){text+=" "+x});
    return text.toLowerCase();
  }
  function filteredVersions(){
    var data=state.data||fallbackData();
    var query=state.query.trim().toLowerCase();
    return data.versions.filter(function(version){
      var sections=version.sections||{};
      var matchesFilter=state.filter==="all"||(Array.isArray(sections[state.filter])&&sections[state.filter].length>0);
      var matchesQuery=!query||versionText(version).indexOf(query)>-1;
      return matchesFilter&&matchesQuery;
    });
  }
  function formatDate(value){
    if(!value)return "-";
    var d=new Date(value);
    if(isNaN(d.getTime()))return value;
    return d.toLocaleDateString(document.documentElement.lang||"fr",{year:"numeric",month:"short",day:"numeric"});
  }
  function timeAgo(value){
    var d=new Date(value);
    if(isNaN(d.getTime()))return "-";
    var diff=Math.max(0,Date.now()-d.getTime());
    var days=Math.floor(diff/86400000);
    if(days<=0)return "Today";
    if(days===1)return "1 day ago";
    if(days<30)return days+" days ago";
    var months=Math.floor(days/30);
    if(months<12)return months+" month"+(months>1?"s":"")+" ago";
    var years=Math.floor(months/12);
    return years+" year"+(years>1?"s":"")+" ago";
  }
  function pill(text,kind){
    return '<span class="version-pill '+esc(kind||"")+'">'+esc(text)+'</span>';
  }
  function stat(label,value,sub,icon){
    return '<article class="version-stat"><i data-lucide="'+esc(icon||"git-commit")+'"></i><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(sub||"")+'</small></article>';
  }
  function filterBar(){
    var keys=["all"].concat(Object.keys(categories()));
    return '<div class="version-filterbar" role="tablist" aria-label="Version filters">'+keys.map(function(key){
      var meta=key==="all"?{label:"All",icon:"layers-3"}:categoryMeta(key);
      return '<button class="version-filter '+(state.filter===key?"active":"")+'" type="button" data-version-filter="'+esc(key)+'" role="tab" aria-selected="'+(state.filter===key?"true":"false")+'"><i data-lucide="'+esc(meta.icon)+'"></i><span>'+esc(meta.label)+'</span></button>';
    }).join("")+'</div>';
  }
  function versionBadges(version){
    var sections=version.sections||{};
    return Object.keys(categories()).filter(function(key){return sections[key]&&sections[key].length}).slice(0,5).map(function(key){
      var meta=categoryMeta(key);
      return '<span><i data-lucide="'+esc(meta.icon)+'"></i>'+esc(meta.label)+'</span>';
    }).join("");
  }
  function versionTimelineRow(version,index){
    var selected=state.selected===version.version;
    return '<button class="version-release-row '+(selected?"selected":"")+'" type="button" data-version-open="'+esc(version.version)+'">'+
      '<span class="version-release-dot"></span>'+
      '<span class="version-release-main">'+
        '<span class="version-release-top"><strong>v'+esc(version.version)+'</strong><time>'+esc(formatDate(version.releaseDate))+'</time></span>'+
        '<span class="version-release-title">'+esc(version.description||"ETHONE release")+'</span>'+
        '<span class="version-release-tags">'+versionBadges(version)+'</span>'+
      '</span>'+
      '<span class="version-release-count">'+sectionCount(version)+'</span>'+
    '</button>';
  }
  function sectionHTML(version,key){
    var items=version&&version.sections&&Array.isArray(version.sections[key])?version.sections[key]:[];
    if(!items.length)return "";
    var meta=categoryMeta(key);
    return '<article class="version-section-card" data-version-section="'+esc(key)+'">'+
      '<header><i data-lucide="'+esc(meta.icon)+'"></i><div><h3>'+esc(meta.label)+'</h3><span>'+items.length+' item'+(items.length>1?"s":"")+'</span></div></header>'+
      '<ul>'+items.map(function(item){return '<li>'+esc(item)+'</li>'}).join("")+'</ul>'+
    '</article>';
  }
  function detailPanel(version){
    if(!version)return '<div class="version-empty"><i data-lucide="git-commit"></i><strong>No version selected</strong><span>Select a release from the timeline.</span></div>';
    var keys=Object.keys(categories()).filter(function(key){return version.sections&&version.sections[key]&&version.sections[key].length});
    return '<section class="version-detail">'+
      '<div class="version-detail-head">'+
        '<div><span class="version-kicker">Release notes</span><h2>v'+esc(version.version)+'</h2><p>'+esc(version.description||"")+'</p></div>'+
        '<div class="version-detail-meta">'+
          pill(version.status||version.type||"Stable","status")+
          pill(formatDate(version.releaseDate),"date")+
          pill((version.branch||"production"),"branch")+
        '</div>'+
      '</div>'+
      '<div class="version-section-grid">'+(keys.length?keys.map(function(key){return sectionHTML(version,key)}).join(""):'<div class="version-empty compact"><strong>No categorized changes</strong><span>This release has no detailed changelog entries.</span></div>')+'</div>'+
      '<div class="version-breaking">'+
        '<div><i data-lucide="triangle-alert"></i><strong>Breaking changes</strong></div>'+
        ((version.breakingChanges||[]).length?'<ul>'+version.breakingChanges.map(function(item){return '<li>'+esc(item)+'</li>'}).join("")+'</ul>':'<p>No breaking changes for this release.</p>')+
      '</div>'+
    '</section>';
  }
  function roadmapHTML(){
    var data=state.data||fallbackData();
    return '<section class="version-panel version-roadmap"><div class="version-panel-head"><div><h2>Roadmap</h2><p>Upcoming product directions without pretending they are already shipped.</p></div></div>'+
      '<div class="version-roadmap-grid">'+(data.roadmap.length?data.roadmap.map(function(item){
        var meta=categoryMeta(item.category);
        return '<article class="version-roadmap-card"><div><i data-lucide="'+esc(meta.icon)+'"></i><span>'+esc(item.status||"Planned")+'</span></div><h3>'+esc(item.title)+'</h3><p>'+esc(item.description)+'</p><small>'+esc(item.target||"Future")+'</small></article>';
      }).join(""):'<div class="version-empty compact"><strong>No roadmap entries</strong><span>Add roadmap objects to data/version-center.json.</span></div>')+'</div></section>';
  }
  function developerHTML(){
    var data=state.data||fallbackData();
    var meta=Object.assign({},data.metadata||{});
    var rows=[
      ["Build ID",meta.build||"-"],
      ["Commit SHA",meta.commit||"Not available"],
      ["Build Time",meta.buildTime||meta.releaseDate||"-"],
      ["Internal Version",meta.internalVersion||meta.version||data.currentVersion||"-"],
      ["Environment",meta.environment||"Production"],
      ["API Version",meta.apiVersion||"-"]
    ];
    return '<section class="version-panel version-devnotes"><div class="version-panel-head"><div><h2>Developer notes</h2><p>Build metadata for deployment and support diagnostics.</p></div></div>'+
      '<div class="version-dev-grid">'+rows.map(function(row){return '<div><span>'+esc(row[0])+'</span><strong>'+esc(row[1])+'</strong></div>'}).join("")+'</div></section>';
  }
  function snapshotRow(v){
    var selected=snapshotSelection.indexOf(v.id)>-1;
    return '<article class="version-snapshot-row '+(selected?"selected":"")+'">'+
      '<button class="version-select" type="button" data-version-select="'+esc(v.id)+'" aria-label="Select snapshot">'+(selected?"✓":"")+'</button>'+
      '<div class="version-snapshot-main"><strong>'+esc(v.description||"Snapshot")+'</strong><span>'+esc(new Date(v.ts).toLocaleString())+' / '+esc(v.workspace||"Workspace")+' / '+esc(v.page||"dashboard")+'</span><small>'+esc(formatSize(v.size))+' / '+esc(v.profileName||"ETHONE")+'</small></div>'+
      '<div class="version-actions"><button class="btn btn-ghost" type="button" data-version-restore="'+esc(v.id)+'">Restore</button><button class="btn btn-ghost" type="button" data-version-export="'+esc(v.id)+'">Export</button><button class="btn btn-danger" type="button" data-version-delete="'+esc(v.id)+'">Delete</button></div>'+
    '</article>';
  }
  function snapshotCompareHTML(){
    if(snapshotSelection.length<2)return '<div class="version-empty compact"><i data-lucide="git-compare"></i><strong>Select two snapshots</strong><span>Compare local state counters before restoring.</span></div>';
    var a=findSnapshot(snapshotSelection[1]),b=findSnapshot(snapshotSelection[0]);
    var rows=diffSnapshots(a,b);
    return '<div class="version-diff-list">'+(rows.length?rows.map(function(r){
      var sign=typeof r.delta==="number"&&r.delta>0?"+":"";
      return '<div class="version-diff-row"><span>'+esc(r.key)+'</span><strong>'+esc(r.before)+'</strong><i>'+esc(sign+r.delta)+'</i><strong>'+esc(r.after)+'</strong></div>';
    }).join(""):'<div class="version-empty compact"><strong>No major difference</strong><span>The main counters are identical.</span></div>')+'</div>';
  }
  function snapshotsHTML(){
    var store=readSnapshots();
    var q=state.snapshotQuery.trim().toLowerCase();
    var list=store.versions.filter(function(v){
      if(!q)return true;
      return (v.description+" "+v.workspace+" "+v.page+" "+v.profileName).toLowerCase().indexOf(q)>-1;
    });
    var totalSize=store.versions.reduce(function(sum,v){return sum+(v.size||0)},0);
    return '<section class="version-panel version-snapshots"><div class="version-panel-head"><div><h2>Local snapshots</h2><p>Manual restore points kept from the previous Version History system. Use Time Machine for automatic dashboard, widgets, settings, notes and workspace recovery.</p></div><span>'+store.versions.length+' saved / '+formatSize(totalSize)+'</span></div>'+
      '<div class="version-snapshot-tools"><input class="modal-input" id="version-description" placeholder="Description, e.g. Before dashboard changes"><button class="btn btn-primary" type="button" data-version-create>Create snapshot</button><button class="btn btn-ghost" type="button" data-version-time-machine>Open Time Machine</button><button class="btn btn-ghost" type="button" data-version-export-all>Export all</button><label class="version-snapshot-search"><i data-lucide="search"></i><input id="version-snapshot-search" value="'+esc(state.snapshotQuery)+'" placeholder="Search snapshots"></label></div>'+
      '<div class="version-snapshot-layout"><div class="version-snapshot-list">'+(list.length?list.map(snapshotRow).join(""):'<div class="version-empty compact"><strong>No snapshots yet</strong><span>Create a snapshot before risky edits.</span></div>')+'</div><aside class="version-snapshot-compare">'+snapshotCompareHTML()+'</aside></div>'+
    '</section>';
  }
  function loadingHTML(){
    return '<div class="version-page"><section class="version-hero"><div><div class="version-kicker">ETHONE Versions</div><h1>Version Center</h1><p>Loading release manifest...</p></div></section><div class="version-skeleton-grid"><span></span><span></span><span></span><span></span></div></div>';
  }
  function renderVersionCenterPage(options){
    ensurePage();
    var root=document.getElementById("version-page-root");
    if(!root)return;
    if(state.loading&&!state.data){root.innerHTML=loadingHTML();return}
    var data=state.data||fallbackData();
    var meta=Object.assign({},data.metadata||{});
    var current=versionById(data.currentVersion)||data.versions[0]||null;
    var selected=versionById(state.selected)||current;
    var list=filteredVersions();
    var totalChanges=data.versions.reduce(function(sum,v){return sum+sectionCount(v)},0);
    root.innerHTML=
      '<section class="version-hero version-center-hero">'+
        '<div><div class="version-kicker">Version Center</div><h1>ETHONE v'+esc(data.currentVersion||meta.version||"-")+'</h1><p>'+esc(current&&current.description||"Professional release tracking for ETHONE.")+'</p><div class="version-hero-pills">'+pill(meta.status||current&&current.status||"Stable","status")+pill(meta.branch||"production","branch")+pill("Updated "+timeAgo(meta.releaseDate||current&&current.releaseDate),"date")+'</div></div>'+
        '<aside class="version-current-card"><span>Current build</span><strong>'+esc(meta.build||current&&current.build||"-")+'</strong><div><small>Date</small><b>'+esc(formatDate(meta.releaseDate||current&&current.releaseDate))+'</b></div><div><small>Commit</small><b>'+esc(meta.commit||"Not available")+'</b></div><button class="btn btn-primary" type="button" data-version-popup-open>View what is new</button></aside>'+
      '</section>'+
      '<section class="version-stats">'+
        stat("Current",data.currentVersion||"-",meta.status||"Stable","badge-check")+
        stat("Versions",data.versions.length,totalChanges+" categorized changes","git-branch")+
        stat("Build",meta.build||"-",meta.environment||"Production","terminal")+
        stat("Updated",timeAgo(meta.releaseDate||current&&current.releaseDate),formatDate(meta.releaseDate||current&&current.releaseDate),"clock")+
      '</section>'+
      '<section class="version-toolbar"><label class="version-search"><i data-lucide="search"></i><input id="version-search" type="search" value="'+esc(state.query)+'" placeholder="Search Sidebar, Discord, AI, Performance..."></label>'+filterBar()+'</section>'+
      (state.error?'<div class="version-warning"><i data-lucide="triangle-alert"></i><span>'+esc(state.error)+'</span></div>':"")+
      '<section class="version-layout">'+
        '<div class="version-panel"><div class="version-panel-head"><div><h2>Release timeline</h2><p>'+list.length+' release'+(list.length>1?"s":"")+' matching current filters.</p></div></div><div class="version-timeline">'+(list.length?list.map(versionTimelineRow).join(""):'<div class="version-empty"><i data-lucide="search-x"></i><strong>No release found</strong><span>Try another search or remove filters.</span></div>')+'</div></div>'+
        '<aside class="version-panel version-release-detail">'+detailPanel(selected)+'</aside>'+
      '</section>'+
      roadmapHTML()+developerHTML()+snapshotsHTML();
    refreshIcons(root);
    if(options&&options.focusId){
      var el=document.getElementById(options.focusId);
      if(el){try{el.focus({preventScroll:true});el.setSelectionRange(el.value.length,el.value.length)}catch(e){}}
    }
  }
  function toggleSnapshot(id){
    snapshotSelection=snapshotSelection.filter(function(x){return x!==id});
    snapshotSelection.unshift(id);
    snapshotSelection=snapshotSelection.slice(0,2);
    renderVersionCenterPage();
  }

  function readSeen(){
    return safeJSON(localStorage.getItem(READ_KEY)||"[]",[]);
  }
  function markSeen(version){
    var list=readSeen();
    if(version&&list.indexOf(version)===-1)list.push(version);
    try{
      localStorage.setItem(READ_KEY,JSON.stringify(list));
      if(version)localStorage.setItem(LAST_SEEN_KEY,version);
    }catch(e){}
  }
  function popupDisabled(){
    try{return localStorage.getItem(DISABLED_KEY)==="1"}catch(e){return false}
  }
  function setPopupDisabled(value){
    try{localStorage.setItem(DISABLED_KEY,value?"1":"0")}catch(e){}
  }
  function latestVersion(){
    var data=state.data||fallbackData();
    return data.currentVersion||data.versions[0]&&data.versions[0].version||"";
  }
  function unseenVersions(manual){
    var data=state.data||fallbackData();
    var latest=latestVersion();
    var last="";
    try{last=localStorage.getItem(LAST_SEEN_KEY)||""}catch(e){}
    if(manual||!last)return data.versions.filter(function(v){return v.version===latest}).slice(0,1);
    return data.versions.filter(function(v){return compareVersion(v.version,last)>0});
  }
  function ensurePopupRoot(){
    if(popupRoot)return popupRoot;
    popupRoot=document.getElementById("ethone-version-popup-root");
    if(!popupRoot){
      popupRoot=document.createElement("div");
      popupRoot.id="ethone-version-popup-root";
      document.body.appendChild(popupRoot);
    }
    popupRoot.addEventListener("click",function(event){
      var action=event.target&&event.target.closest?event.target.closest("[data-version-popup-action]"):null;
      if(!action){
        if(event.target&&event.target.classList&&event.target.classList.contains("version-popup-overlay"))closePopup(false);
        return;
      }
      event.preventDefault();
      var id=action.dataset.versionPopupAction;
      if(id==="close"||id==="ignore")closePopup(true);
      if(id==="disable"){setPopupDisabled(true);closePopup(true)}
      if(id==="read"){
        closePopup(true);
        openVersionsPage();
      }
    });
    popupRoot.addEventListener("keydown",function(event){
      if(event.key==="Escape")closePopup(true);
    });
    return popupRoot;
  }
  function popupSections(version){
    var keys=Object.keys(categories()).filter(function(key){return version.sections&&version.sections[key]&&version.sections[key].length});
    return keys.slice(0,4).map(function(key){
      var meta=categoryMeta(key);
      var items=version.sections[key].slice(0,3);
      return '<article class="version-popup-card"><span><i data-lucide="'+esc(meta.icon)+'"></i>'+esc(meta.label)+'</span><ul>'+items.map(function(item){return '<li>'+esc(item)+'</li>'}).join("")+'</ul></article>';
    }).join("");
  }
  function openPopup(options){
    options=options||{};
    return loadData().then(function(){
      if(!options.manual&&popupDisabled())return false;
      var versions=unseenVersions(!!options.manual);
      if(!versions.length)return false;
      var latest=versions[0];
      var host=ensurePopupRoot();
      host.innerHTML='<div class="version-popup-overlay" role="presentation">'+
        '<section class="version-popup-shell" role="dialog" aria-modal="true" aria-labelledby="version-popup-title" tabindex="-1">'+
          '<button class="version-popup-close" type="button" data-version-popup-action="close" aria-label="Close">x</button>'+
          '<div class="version-popup-hero"><div class="version-popup-logo">E</div><span>What is new in v'+esc(latest.version)+'</span><h2 id="version-popup-title">ETHONE has been updated.</h2><p>'+esc(latest.description||"Review the latest improvements before continuing.")+'</p></div>'+
          '<div class="version-popup-grid">'+popupSections(latest)+'</div>'+
          '<footer class="version-popup-actions"><button class="btn btn-ghost" type="button" data-version-popup-action="disable">Do not show again</button><button class="btn btn-ghost" type="button" data-version-popup-action="ignore">Ignore</button><button class="btn btn-primary" type="button" data-version-popup-action="read">Read more</button></footer>'+
        '</section>'+
      '</div>';
      host.classList.add("is-open");
      document.body.classList.add("ethone-version-popup-active");
      refreshIcons(host);
      setTimeout(function(){
        var shell=host.querySelector(".version-popup-shell");
        if(shell)try{shell.focus({preventScroll:true})}catch(e){shell.focus()}
      },20);
      try{window.dispatchEvent(new CustomEvent("ethone:version-popup-open",{detail:{version:latest.version,manual:!!options.manual}}))}catch(e){}
      return true;
    });
  }
  function closePopup(mark){
    if(mark)markSeen(latestVersion());
    if(popupRoot)popupRoot.classList.remove("is-open");
    document.body.classList.remove("ethone-version-popup-active");
  }
  function isDashboardVisible(){
    var main=document.getElementById("main-content");
    if(!main)return false;
    var cs=getComputedStyle(main);
    return cs.display!=="none"&&cs.visibility!=="hidden";
  }
  function scheduleAutoPopup(delay){
    setTimeout(function(){
      if(isDashboardVisible())openPopup({auto:true});
    },delay||900);
  }
  function openVersionsPage(){
    if(typeof window.switchPage==="function")window.switchPage("versions",null);
    renderVersionCenterPage();
  }

  function handleInput(event){
    var target=event.target;
    if(!target)return;
    if(target.id==="version-search"){
      state.query=target.value;
      renderVersionCenterPage({focusId:"version-search"});
    }
    if(target.id==="version-snapshot-search"){
      state.snapshotQuery=target.value;
      renderVersionCenterPage({focusId:"version-snapshot-search"});
    }
  }
  function handleClick(event){
    var target=event.target;
    if(!target||!target.closest)return;
    var release=target.closest("[data-version-open]");
    if(release){state.selected=release.dataset.versionOpen;renderVersionCenterPage();return}
    var filter=target.closest("[data-version-filter]");
    if(filter){state.filter=filter.dataset.versionFilter||"all";renderVersionCenterPage();return}
    if(target.closest("[data-version-popup-open]")){openPopup({manual:true});return}
    if(target.closest("[data-version-create]")){
      var input=document.getElementById("version-description");
      createVersion(input&&input.value?input.value:"Manual version","manual");
      return;
    }
    if(target.closest("[data-version-time-machine]")){
      if(window.ETHONETimeMachine&&typeof window.ETHONETimeMachine.open==="function")window.ETHONETimeMachine.open();
      else if(typeof window.runAction==="function")window.runAction("timeMachine.open",{source:"version-history"});
      else toast("Time Machine unavailable","info");
      return;
    }
    if(target.closest("[data-version-export-all]")){exportAll();return}
    var select=target.closest("[data-version-select]");
    if(select){toggleSnapshot(select.dataset.versionSelect);return}
    var restore=target.closest("[data-version-restore]");
    if(restore){restoreVersion(restore.dataset.versionRestore);return}
    var exp=target.closest("[data-version-export]");
    if(exp){exportVersion(exp.dataset.versionExport);return}
    var del=target.closest("[data-version-delete]");
    if(del&&confirm("Delete this local snapshot?")){deleteVersion(del.dataset.versionDelete);return}
  }
  function install(){
    ensurePage();
    document.addEventListener("input",handleInput);
    document.addEventListener("click",handleClick);
    window.addEventListener("ethone:page-ready",function(e){
      if(e.detail&&e.detail.page==="versions")renderVersionCenterPage();
      if(e.detail&&e.detail.page==="dashboard")scheduleAutoPopup(1200);
    });
    window.addEventListener("ethone:dashboard-ready",function(){scheduleAutoPopup(1400)});
    pageReady=true;
    renderVersionCenterPage();
    loadData();
  }

  window.ETHONEVersionCenter={
    load:loadData,
    render:renderVersionCenterPage,
    openPopup:openPopup,
    openWhatsNew:openPopup,
    markSeen:markSeen,
    data:function(){return state.data},
    current:function(){return latestVersion()},
    reload:function(){loadPromise=null;return loadData(true)}
  };
  window.ETHONEVersionHistory={
    create:createVersion,
    restore:restoreVersion,
    list:function(){return readSnapshots().versions.slice()},
    compare:diffSnapshots,
    render:renderVersionCenterPage
  };
  window.renderVersionHistoryPage=renderVersionCenterPage;

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
