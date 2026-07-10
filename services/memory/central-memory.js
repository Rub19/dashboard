/* ETHONE Central Memory.
   Records lightweight activity and restorable snapshots without changing backend data. */
(function(){
  "use strict";
  if(window.__ethoneCentralMemory)return;
  window.__ethoneCentralMemory=true;

  var storageKey="ethone:central-memory:v1";
  var maxEvents=220;
  var maxSnapshots=10;
  var maxSnapshotBytes=900000;
  var saveTimer=0;
  var renderTimer=0;
  var searchTimer=0;
  var lastEventSignature="";
  var lastEventAt=0;
  var lastSnapshotHash="";
  var originalSwitchPage=null;
  var originalSaveStateNow=null;
  var originalOpenCmdPalette=null;
  var originalOpenItem=null;
  var lastSaveHash="";
  var state={
    version:1,
    autoRestore:true,
    current:{},
    events:[],
    snapshots:[]
  };

  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var now=function(){return new Date().toISOString()};

  function escapeHTML(value){
    return String(value==null?"":value).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]});
  }

  function clone(value){
    try{return JSON.parse(JSON.stringify(value))}catch(e){return value}
  }

  function safeProfile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }

  function notify(message,type){
    if(typeof window.toast==="function"){
      try{window.toast(message,type||"info");return}catch(e){}
    }
  }

  function currentPage(){
    var active=$(".tab-content.active[id^='page-']");
    return active?active.id.replace(/^page-/,""):"dashboard";
  }

  function isAppVisible(){
    var main=$("#main-content"),auth=$("#auth-screen"),profile=$("#profile-screen"),pw=$("#password-screen");
    var hidden=function(el){
      if(!el)return true;
      var cs=getComputedStyle(el);
      return el.hidden||cs.display==="none"||cs.visibility==="hidden";
    };
    return !!main&&!hidden(main)&&hidden(auth)&&hidden(profile)&&hidden(pw);
  }

  function profileKey(){
    var p=safeProfile();
    return p&&p.id?"profile:"+p.id:"anonymous";
  }

  function readStore(){
    var raw=null;
    try{
      var p=safeProfile();
      if(p&&p.state&&p.state.centralMemory)raw=p.state.centralMemory;
    }catch(e){}
    if(!raw){
      try{raw=JSON.parse(localStorage.getItem(storageKey)||"null")}catch(e){raw=null}
    }
    if(raw&&Array.isArray(raw.events)&&Array.isArray(raw.snapshots)){
      state=Object.assign(state,raw);
      state.current=state.current||{};
      state.events=state.events.slice(0,maxEvents);
      state.snapshots=state.snapshots.slice(0,maxSnapshots);
    }
  }

  function writeStore(){
    state.events=state.events.slice(0,maxEvents);
    state.snapshots=state.snapshots.slice(0,maxSnapshots);
    var payload={version:state.version,autoRestore:state.autoRestore!==false,current:state.current||{},events:state.events,snapshots:state.snapshots};
    try{localStorage.setItem(storageKey,JSON.stringify(payload))}catch(e){}
    try{
      var p=safeProfile();
      if(p){
        p.state=p.state||{};
        p.state.centralMemory=payload;
      }
    }catch(e){}
  }

  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(writeStore,220);
    scheduleRender();
  }

  function scheduleRender(){
    clearTimeout(renderTimer);
    renderTimer=setTimeout(renderPanel,80);
  }

  function addEvent(type,title,meta){
    var signature=[type||"activity",title||type||"Activity",JSON.stringify(meta||{})].join("|");
    var ts=Date.now();
    if(signature===lastEventSignature&&ts-lastEventAt<900)return null;
    lastEventSignature=signature;
    lastEventAt=ts;
    var event={
      id:"mem-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),
      ts:now(),
      type:type||"activity",
      title:String(title||type||"Activity").slice(0,120),
      meta:meta||{}
    };
    state.events.unshift(event);
    updateCurrentFromEvent(event);
    scheduleSave();
    try{window.dispatchEvent(new CustomEvent("ethone:memory-event",{detail:{event:clone(event)}}))}catch(e){}
    return event;
  }

  function updateCurrentFromEvent(event){
    state.current=state.current||{};
    state.current.lastEvent=event;
    state.current.updatedAt=event.ts;
    if(event.type==="page")state.current.activePage=event.meta&&event.meta.page;
    if(event.type==="workspace")state.current.activeWorkspaceId=event.meta&&event.meta.id;
    if(event.type==="search")state.current.lastSearch=event.meta&&event.meta.query;
    if(event.type==="file")state.current.lastFile=event.meta;
  }

  function localStorageSubset(){
    var keys=[
      "ethone:desktop-enabled","ethone:desktop-workspace","ethone:desktop-environment:v1",
      "ethone:permanent-dock:v1","ethone:active-workspace-id","ethone:dashboard-v4-layout",
      "ethone:accent","ethone:bg","ethone:compact","ethone:reducedMotion",
      "lp_width","lp_retracted","sidebar_width"
    ];
    var out={};
    keys.forEach(function(key){
      try{
        var value=localStorage.getItem(key);
        if(value!=null)out[key]=value;
      }catch(e){}
    });
    return out;
  }

  function pruneLarge(value,path){
    path=path||"";
    if(typeof value==="string"){
      if(value.length>120000){
        return {__ethonePruned:true,type:"large-string",path:path,length:value.length,preview:value.slice(0,160)};
      }
      return value;
    }
    if(!value||typeof value!=="object")return value;
    if(Array.isArray(value))return value.map(function(item,i){return pruneLarge(item,path+"["+i+"]")});
    var out={};
    Object.keys(value).forEach(function(key){
      out[key]=pruneLarge(value[key],path?path+"."+key:key);
    });
    return out;
  }

  function captureScroll(){
    var out={window:{x:window.scrollX||0,y:window.scrollY||0},pages:{}};
    $$(".tab-content[id^='page-']").forEach(function(page){
      out.pages[page.id.replace(/^page-/,"")]={x:page.scrollLeft||0,y:page.scrollTop||0};
    });
    var main=$("#main-content");
    if(main)out.main={x:main.scrollLeft||0,y:main.scrollTop||0};
    return out;
  }

  function captureWidgets(){
    var p=safeProfile();
    var st=p&&p.state?p.state:{};
    return {
      liveWidgets:clone(st.liveWidgets||null),
      sidebarConfig:clone(p&&p.sidebarConfig||null),
      permanentDock:clone(st.permanentDock||null)
    };
  }

  function captureWorkspaces(){
    var p=safeProfile();
    var active=null;
    try{active=window.ETHONEWorkspaces&&window.ETHONEWorkspaces.active?window.ETHONEWorkspaces.active():null}catch(e){}
    return {
      activeWorkspaceId:(p&&p.activeWorkspaceId)||(active&&active.id)||null,
      activeWorkspaceName:(active&&active.name)||(p&&p.state&&p.state.activeWorkspaceName)||null,
      workspaces:clone(p&&p.workspaces||[])
    };
  }

  function captureDesktop(){
    try{
      if(window.ETHONEDesktop&&typeof window.ETHONEDesktop.state==="function")return window.ETHONEDesktop.state();
    }catch(e){}
    try{return JSON.parse(localStorage.getItem("ethone:desktop-environment:v1")||"null")}catch(e){return null}
  }

  function hashStateLite(profile){
    try{
      var source=profile&&profile.state?profile.state:{};
      return JSON.stringify({
        items:(source.items||[]).length,
        todos:(source.todos||[]).length,
        notes:(source.notes||[]).length,
        events:(source.events||[]).length,
        liveWidgets:source.liveWidgets||null,
        workspace:profile&&profile.activeWorkspaceId
      });
    }catch(e){return String(Date.now())}
  }

  function snapshotProfile(profile){
    if(!profile)return null;
    var out=clone(profile);
    try{
      if(out&&out.state)delete out.state.centralMemory;
    }catch(e){}
    if(window.ETHONESecurity&&ETHONESecurity.sanitizeObject)out=ETHONESecurity.sanitizeObject(out);
    return out;
  }

  function captureSnapshot(label,reason){
    var p=safeProfile();
    var liteHash=hashStateLite(p)+"|"+currentPage()+"|"+profileKey();
    if(reason==="auto"&&liteHash===lastSnapshotHash)return null;
    lastSnapshotHash=liteHash;
    var profileClone=snapshotProfile(p);
    var snapshot={
      id:"snap-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),
      ts:now(),
      label:label||"Snapshot",
      reason:reason||"manual",
      profileKey:profileKey(),
      activePage:currentPage(),
      scroll:captureScroll(),
      localStorage:window.ETHONESecurity&&ETHONESecurity.sanitizeObject?ETHONESecurity.sanitizeObject(localStorageSubset()):localStorageSubset(),
      workspace:captureWorkspaces(),
      widgets:captureWidgets(),
      desktop:captureDesktop(),
      profile:pruneLarge(profileClone),
      urlHash:location.hash||"",
      viewport:{w:window.innerWidth,h:window.innerHeight}
    };
    snapshot.size=JSON.stringify(snapshot).length;
    if(snapshot.size>maxSnapshotBytes){
      var cleanState=p&&p.state?clone(p.state):null;
      try{if(cleanState)delete cleanState.centralMemory}catch(e){}
      snapshot.profile=pruneLarge({
        id:p&&p.id,
        name:p&&p.name,
        activeWorkspaceId:p&&p.activeWorkspaceId,
        sidebarConfig:p&&p.sidebarConfig,
        state:cleanState
      });
      snapshot.size=JSON.stringify(snapshot).length;
      snapshot.partial=snapshot.size>maxSnapshotBytes;
      if(snapshot.partial){
        snapshot.profile={id:p&&p.id,name:p&&p.name,stateSummary:summaryFromProfile(p)};
        snapshot.size=JSON.stringify(snapshot).length;
      }
    }
    state.snapshots.unshift(snapshot);
    state.snapshots=state.snapshots.slice(0,maxSnapshots);
    state.current.lastSnapshotId=snapshot.id;
    state.current.lastSnapshotAt=snapshot.ts;
    addEvent("snapshot",snapshot.label,{id:snapshot.id,reason:snapshot.reason,partial:!!snapshot.partial});
    writeStore();
    return snapshot;
  }

  function summaryFromProfile(p){
    var s=p&&p.state?p.state:{};
    return {
      items:(s.items||[]).length,
      todos:(s.todos||[]).length,
      notes:(s.notes||[]).length,
      events:(s.events||[]).length,
      widgets:s.liveWidgets||null,
      workspace:p&&p.activeWorkspaceId
    };
  }

  function findSnapshot(id){
    return state.snapshots.find(function(s){return s.id===id})||null;
  }

  function restoreLocalStorage(snapshot){
    var ls=snapshot&&snapshot.localStorage||{};
    Object.keys(ls).forEach(function(key){
      try{localStorage.setItem(key,ls[key])}catch(e){}
    });
  }

  function restoreProfile(snapshot){
    if(!snapshot||!snapshot.profile||snapshot.profile.stateSummary)return false;
    try{
      var p=safeProfile();
      if(!p)return false;
      var saved=clone(snapshot.profile);
      Object.keys(p).forEach(function(key){delete p[key]});
      Object.assign(p,saved);
      if(typeof window.saveStateNow==="function")window.saveStateNow();
      return true;
    }catch(e){
      try{
        window.__ethoneMemoryDiagnostics=(window.__ethoneMemoryDiagnostics||[]).slice(-20);
        window.__ethoneMemoryDiagnostics.push({label:"profile restore",message:e&&e.message?e.message:String(e),at:new Date().toISOString()});
      }catch(_){}
      return false;
    }
  }

  function restoreWorkspace(snapshot){
    try{
      var id=snapshot&&snapshot.workspace&&snapshot.workspace.activeWorkspaceId;
      if(id&&window.ETHONEWorkspaces&&typeof window.ETHONEWorkspaces.setActive==="function"){
        window.ETHONEWorkspaces.setActive(id,{silent:true});
      }
    }catch(e){}
  }

  function restorePage(snapshot){
    var page=snapshot&&snapshot.activePage;
    if(page&&typeof window.switchPage==="function"&&$("#page-"+page)){
      try{window.switchPage(page,null)}catch(e){}
    }
    setTimeout(function(){
      try{
        if(snapshot.scroll&&snapshot.scroll.window)window.scrollTo(snapshot.scroll.window.x||0,snapshot.scroll.window.y||0);
        if(snapshot.scroll&&snapshot.scroll.main&&$("#main-content")){
          $("#main-content").scrollLeft=snapshot.scroll.main.x||0;
          $("#main-content").scrollTop=snapshot.scroll.main.y||0;
        }
        if(snapshot.scroll&&snapshot.scroll.pages){
          Object.keys(snapshot.scroll.pages).forEach(function(id){
            var el=$("#page-"+id),pos=snapshot.scroll.pages[id];
            if(el&&pos){el.scrollLeft=pos.x||0;el.scrollTop=pos.y||0;}
          });
        }
      }catch(e){}
    },160);
  }

  function restoreSnapshot(id,opts){
    opts=opts||{};
    var snapshot=typeof id==="object"?id:findSnapshot(id);
    if(!snapshot)return false;
    restoreLocalStorage(snapshot);
    var profileRestored=restoreProfile(snapshot);
    restoreWorkspace(snapshot);
    restorePage(snapshot);
    addEvent("restore","Restored snapshot",{id:snapshot.id,label:snapshot.label,profileRestored:profileRestored});
    writeStore();
    notify("Snapshot restored","success");
    if(opts.reload){
      setTimeout(function(){location.reload()},260);
    }else{
      setTimeout(function(){
        try{window.dispatchEvent(new CustomEvent("ethone:memory-restored",{detail:{snapshot:clone(snapshot)}}))}catch(e){}
        try{if(typeof window.renderSidebarNav==="function")window.renderSidebarNav()}catch(e){}
        try{if(typeof window.renderWidgetManager==="function")window.renderWidgetManager()}catch(e){}
        try{if(window.ethonePermanentDock&&window.ethonePermanentDock.render)window.ethonePermanentDock.render()}catch(e){}
      },120);
    }
    return true;
  }

  function captureCurrentState(reason){
    var p=safeProfile();
    var hash=hashStateLite(p);
    state.current=Object.assign(state.current||{},{
      profile:summaryFromProfile(p),
      activePage:currentPage(),
      workspace:captureWorkspaces(),
      widgets:captureWidgets(),
      desktop:captureDesktop(),
      scroll:captureScroll(),
      localStorage:localStorageSubset(),
      updatedAt:now(),
      reason:reason||"heartbeat"
    });
    if(reason==="save"&&hash!==lastSaveHash){
      lastSaveHash=hash;
      addEvent("preference","Profile state saved",{page:state.current.activePage});
    }else scheduleSave();
  }

  function wrapSwitchPage(){
    if(typeof window.ethoneAddSwitchPageHook==="function"){
      window.ethoneAddSwitchPageHook("central-memory",function(page){
        addEvent("page","Opened "+page,{page:page});
        captureCurrentState("page");
      });
      return;
    }
    if(typeof window.switchPage!=="function"||window.switchPage.__memoryWrapped)return;
    originalSwitchPage=window.switchPage;
    window.switchPage=function(page,navEl){
      var result=originalSwitchPage.apply(this,arguments);
      addEvent("page","Opened "+page,{page:page});
      captureCurrentState("page");
      return result;
    };
    window.switchPage.__memoryWrapped=true;
  }

  function wrapSaveState(){
    if(typeof window.saveStateNow!=="function"||window.saveStateNow.__memoryWrapped)return;
    originalSaveStateNow=window.saveStateNow;
    window.saveStateNow=function(){
      var result=originalSaveStateNow.apply(this,arguments);
      captureCurrentState("save");
      return result;
    };
    window.saveStateNow.__memoryWrapped=true;
  }

  function wrapSearch(){
    if(typeof window.openCmdPalette==="function"&&!window.openCmdPalette.__memoryWrapped){
      originalOpenCmdPalette=window.openCmdPalette;
      window.openCmdPalette=function(){
        addEvent("search","Command palette opened",{page:currentPage()});
        return originalOpenCmdPalette.apply(this,arguments);
      };
      window.openCmdPalette.__memoryWrapped=true;
    }
    document.addEventListener("input",function(event){
      var target=event.target;
      if(!target)return;
      if(target.id==="cmd-input"||target.id==="global-search"||target.id==="files-search"){
        var value=String(target.value||"").trim();
        clearTimeout(searchTimer);
        if(value){
          searchTimer=setTimeout(function(){
            addEvent("search","Search: "+value,{query:value,field:target.id,page:currentPage()});
          },420);
        }
      }
    },true);
  }

  function wrapFiles(){
    if(typeof window.openItem==="function"&&!window.openItem.__memoryWrapped){
      originalOpenItem=window.openItem;
      window.openItem=function(id){
        var p=safeProfile(),item=null;
        try{item=(p.state.items||[]).find(function(x){return String(x.id)===String(id)})}catch(e){}
        if(item)addEvent("file","Opened "+(item.name||"file"),{id:item.id,name:item.name,type:item.type});
        return originalOpenItem.apply(this,arguments);
      };
      window.openItem.__memoryWrapped=true;
    }
  }

  function bindEvents(){
    window.addEventListener("ethone:page-ready",function(event){
      var page=event.detail&&event.detail.page||currentPage();
      addEvent("page","Opened "+page,{page:page});
      captureCurrentState("page-ready");
    });
    window.addEventListener("ethone:workspace-change",function(event){
      var w=event.detail&&event.detail.workspace;
      addEvent("workspace","Workspace: "+(w&&w.name||"changed"),{id:w&&w.id,name:w&&w.name});
      captureSnapshot("Workspace changed","workspace");
    });
    window.addEventListener("ethone:workspace-update",function(event){
      var w=event.detail&&event.detail.workspace;
      addEvent("workspace","Workspace updated"+(w&&w.name?": "+w.name:""),{id:w&&w.id,name:w&&w.name});
    });
    window.addEventListener("beforeunload",function(){
      try{captureSnapshot("Last session","session")}catch(e){}
    });
    document.addEventListener("click",function(event){
      var target=event.target;
      if(!target)return;
      if(target.closest("#live-panel,#widget-order-list,[data-pdock-id],#ethone-permanent-dock")){
        addEvent("widget","Widget or dock interaction",{page:currentPage()});
      }
      var setting=target.closest(".settings-nav-item,.eh-swatch,.eh-bg-option,#eh-density-toggle,#eh-motion-toggle");
      if(setting)addEvent("preference","Preference changed",{page:currentPage()});
    },true);
  }

  function ensureRoot(){
    if($("#ethone-memory-root"))return $("#ethone-memory-root");
    var root=document.createElement("div");
    root.id="ethone-memory-root";
    root.innerHTML=
      '<button type="button" class="ethone-memory-fab" id="ethone-memory-fab" aria-label="Ouvrir la memoire ETHONE">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a7 7 0 0 0-7 7c0 4 7 11 7 11s7-7 7-11a7 7 0 0 0-7-7Z"/><circle cx="12" cy="10" r="2.4"/></svg><span>Memory</span>'+
      '</button>'+
      '<aside class="ethone-memory-panel" id="ethone-memory-panel" aria-label="Memoire centrale ETHONE">'+
        '<div class="ethone-memory-head"><div><h3 class="ethone-memory-title">Memoire ETHONE</h3><div class="ethone-memory-sub">Pages, widgets, recherches, fichiers, workspaces et snapshots restaurables.</div></div><button type="button" class="ethone-memory-close" data-memory-close aria-label="Fermer">x</button></div>'+
        '<div class="ethone-memory-body" id="ethone-memory-body"></div>'+
      '</aside>';
    document.body.appendChild(root);
    root.addEventListener("click",function(event){
      if(event.target.closest("#ethone-memory-fab")){togglePanel();return;}
      if(event.target.closest("[data-memory-close]")){togglePanel(false);return;}
      var action=event.target.closest("[data-memory-action]");
      if(action){
        var kind=action.dataset.memoryAction;
        var id=action.dataset.snapshotId;
        if(kind==="snapshot"){captureSnapshot("Manual snapshot","manual");notify("Snapshot created","success");}
        if(kind==="restore"&&id){restoreSnapshot(id,{reload:false});}
        if(kind==="restore-reload"&&id){restoreSnapshot(id,{reload:true});}
        if(kind==="delete"&&id){deleteSnapshot(id);}
        if(kind==="toggle-auto"){state.autoRestore=state.autoRestore===false;writeStore();renderPanel();}
      }
    });
    document.addEventListener("keydown",function(event){
      if(event.key==="Escape")togglePanel(false);
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==="m"){
        event.preventDefault();
        togglePanel();
      }
    });
    return root;
  }

  function togglePanel(force){
    var panel=$("#ethone-memory-panel");
    if(!panel)return;
    var open=typeof force==="boolean"?force:!panel.classList.contains("open");
    panel.classList.toggle("open",open);
    if(open)renderPanel();
  }

  function fmt(ts){
    try{return new Date(ts).toLocaleString([], {month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(e){return ""}
  }

  function renderPanel(){
    var body=$("#ethone-memory-body");
    if(!body)return;
    var current=state.current||{};
    var profile=current.profile||{};
    var events=state.events.slice(0,8);
    var snapshots=state.snapshots.slice(0,6);
    body.innerHTML=
      '<section class="ethone-memory-card">'+
        '<h4>Etat actuel</h4>'+
        '<div class="ethone-memory-kpis">'+
          '<div class="ethone-memory-kpi"><strong>'+escapeHTML(current.activePage||currentPage())+'</strong><span>Page</span></div>'+
          '<div class="ethone-memory-kpi"><strong>'+escapeHTML((current.workspace&&current.workspace.activeWorkspaceName)||"Workspace")+'</strong><span>Workspace</span></div>'+
          '<div class="ethone-memory-kpi"><strong>'+escapeHTML(profile.notes||0)+' / '+escapeHTML(profile.todos||0)+'</strong><span>Notes / Tasks</span></div>'+
        '</div>'+
        '<div class="ethone-memory-actions" style="margin-top:12px">'+
          '<button type="button" class="ethone-memory-btn primary" data-memory-action="snapshot">Creer snapshot</button>'+
          '<button type="button" class="ethone-memory-btn" data-memory-action="toggle-auto">'+(state.autoRestore===false?"Activer reprise":"Reprise auto active")+'</button>'+
        '</div>'+
      '</section>'+
      '<section class="ethone-memory-card">'+
        '<h4>Snapshots</h4>'+
        (snapshots.length?snapshots.map(function(s){
          return '<div class="ethone-memory-row">'+
            '<div class="ethone-memory-meta"><strong>'+escapeHTML(s.label)+(s.partial?' <span class="ethone-memory-tag">partial</span>':'')+'</strong><span>'+escapeHTML(fmt(s.ts))+' - '+escapeHTML(s.activePage||"page")+' - '+Math.round((s.size||0)/1024)+' KB</span></div>'+
            '<div class="ethone-memory-actions"><button type="button" class="ethone-memory-btn" data-memory-action="restore" data-snapshot-id="'+escapeHTML(s.id)+'">Restore</button><button type="button" class="ethone-memory-btn" data-memory-action="restore-reload" data-snapshot-id="'+escapeHTML(s.id)+'">Reload</button><button type="button" class="ethone-memory-btn" data-memory-action="delete" data-snapshot-id="'+escapeHTML(s.id)+'">Delete</button></div>'+
          '</div>';
        }).join(""):'<div class="ethone-memory-empty">Aucun snapshot pour le moment.</div>')+
      '</section>'+
      '<section class="ethone-memory-card">'+
        '<h4>Historique recent</h4>'+
        (events.length?events.map(function(e){
          return '<div class="ethone-memory-row"><div class="ethone-memory-meta"><strong>'+escapeHTML(e.title)+'</strong><span>'+escapeHTML(fmt(e.ts))+'</span></div><span class="ethone-memory-tag">'+escapeHTML(e.type)+'</span></div>';
        }).join(""):'<div class="ethone-memory-empty">La memoire commence a observer ETHONE.</div>')+
      '</section>';
  }

  function deleteSnapshot(id){
    state.snapshots=state.snapshots.filter(function(s){return s.id!==id});
    addEvent("snapshot","Deleted snapshot",{id:id});
    writeStore();
    renderPanel();
  }

  function syncVisibility(){
    document.body.classList.toggle("ethone-memory-ready",isAppVisible());
  }

  function resumeLastSession(){
    if(state.autoRestore===false||!isAppVisible())return;
    var last=state.snapshots.find(function(s){return s.reason==="session"})||state.snapshots[0];
    if(!last)return;
    if(last.activePage&&last.activePage!==currentPage())restorePage(last);
  }

  function boot(){
    readStore();
    ensureRoot();
    wrapSwitchPage();
    wrapSaveState();
    wrapSearch();
    wrapFiles();
    bindEvents();
    syncVisibility();
    captureCurrentState("boot");
    setTimeout(resumeLastSession,450);
    setInterval(function(){if(isAppVisible()){syncVisibility();captureCurrentState("heartbeat")}},60000);
    setInterval(function(){if(isAppVisible())captureSnapshot("Auto snapshot","auto")},10*60*1000);
    try{new MutationObserver(syncVisibility).observe(document.body,{attributes:true,attributeFilter:["style","class","hidden"]})}catch(e){}
  }

  window.ETHONEMemory={
    state:function(){return clone(state)},
    event:addEvent,
    createSnapshot:captureSnapshot,
    restoreSnapshot:restoreSnapshot,
    deleteSnapshot:deleteSnapshot,
    open:function(){togglePanel(true)},
    close:function(){togglePanel(false)},
    capture:function(){captureCurrentState("manual");writeStore();return clone(state.current)}
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
