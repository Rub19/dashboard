/* ETHONE App Library.
 * iOS-inspired app launcher for every ETHONE feature.
 */
(function(){
  "use strict";
  if(window.__ethoneAppLibrary)return;
  window.__ethoneAppLibrary=true;

  var STORAGE_KEY="ethone:app-library:v1";
  var state={pinned:[],hidden:[],order:[],folders:[],activeFolder:"",filter:"all",query:""};
  var draggedAppId="";
  var renderQueued=false;

  var fallbackIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>';
  var colorMap={
    dashboard:"#8b5cf6",files:"#a78bfa",notes:"#c084fc",todos:"#34d399",habits:"#fbbf24",kanban:"#60a5fa",
    calendar:"#38bdf8",goals:"#f59e0b",journal:"#f472b6",countdown:"#fb7185",stats:"#22c55e",activity:"#a78bfa",
    health:"#34d399",versions:"#818cf8",studio:"#d946ef",marketplace:"#a855f7",github:"#f5f5f5",gaming:"#a855f7",
    "valorant-accounts":"#ff4655",databases:"#8b5cf6",import:"#c084fc",connections:"#7c3aed",settings:"#94a3b8",
    ai:"#a78bfa",widgets:"#8b5cf6",workspaces:"#a78bfa",notifications:"#f59e0b",themes:"#c084fc",keyboard:"#60a5fa",
    plugins:"#8b5cf6",spotify:"#1db954",discord:"#5865f2",steam:"#66c0f4"
  };

  function $(sel,root){return (root||document).querySelector(sel)}
  function $$(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}
  function esc(value){
    if(typeof window.escapeHTML==="function")return window.escapeHTML(value);
    return String(value==null?"":value).replace(/[&<>"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]});
  }
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function toast(message,type){if(typeof window.toast==="function")window.toast(message,type||"info")}
  function clone(value){try{return JSON.parse(JSON.stringify(value))}catch(e){return value}}
  function uid(prefix){return (prefix||"al")+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)}

  function profileState(){
    var p=profile();
    return p&&p.state?p.state:null;
  }
  function load(){
    var saved=null;
    try{
      var ps=profileState();
      saved=ps&&ps.appLibrary?ps.appLibrary:null;
    }catch(e){}
    if(!saved){
      try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")}catch(e){saved=null}
    }
    if(saved&&typeof saved==="object"){
      state.pinned=Array.isArray(saved.pinned)?saved.pinned:[];
      state.hidden=Array.isArray(saved.hidden)?saved.hidden:[];
      state.order=Array.isArray(saved.order)?saved.order:[];
      state.folders=Array.isArray(saved.folders)?saved.folders.map(normalizeFolder):[];
      state.filter=saved.filter||"all";
    }
  }
  function save(){
    var payload={pinned:state.pinned,hidden:state.hidden,order:state.order,folders:state.folders,filter:state.filter};
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(payload))}catch(e){}
    try{
      var p=profile();
      if(p){
        p.state=p.state||{};
        p.state.appLibrary=payload;
        if(typeof window.saveStateNow==="function")window.saveStateNow();
      }
    }catch(e){}
  }
  function normalizeFolder(folder){
    folder=folder||{};
    return {
      id:folder.id||uid("folder"),
      name:folder.name||"Folder",
      appIds:Array.isArray(folder.appIds)?folder.appIds:[]
    };
  }

  function isAppVisible(){
    var main=$("#main-content"),auth=$("#auth-screen"),profileScreen=$("#profile-screen"),pw=$("#password-screen");
    function hidden(el){
      if(!el)return true;
      var cs=getComputedStyle(el);
      return el.hidden||cs.display==="none"||cs.visibility==="hidden";
    }
    return !!main&&!hidden(main)&&hidden(auth)&&hidden(profileScreen)&&hidden(pw);
  }

  function defaultApps(){
    var nav=[];
    try{
      if(typeof window.getDefaultNav==="function")nav=window.getDefaultNav()||[];
    }catch(e){nav=[]}
    if(!nav.length){
      nav=[
        {id:"dashboard",label:"Home",icon:"dashboard"},{id:"files",label:"Files",icon:"files"},{id:"notes",label:"Notes",icon:"notes"},
        {id:"todos",label:"Tasks",icon:"todos"},{id:"calendar",label:"Calendar",icon:"calendar"},{id:"stats",label:"Statistics",icon:"stats"},
        {id:"gaming",label:"Gaming",icon:"gaming"},{id:"marketplace",label:"Marketplace",icon:"marketplace"},{id:"settings",label:"Settings",icon:"settings"},
        {id:"ai",label:"ETHONE AI",icon:"ai"}
      ];
    }
    var apps=nav.map(function(item){
      return app(item.id,item.label,item.icon||item.id,"page",item.id,categoryFor(item.id),keywordsFor(item.id));
    });
    return apps.concat([
      app("widgets","Widgets","widgets","action","widgets","System","widgets dashboard panels cards live"),
      app("workspaces","Workspaces","workspaces","action","workspaces","System","spaces workspace environments switcher"),
      app("notifications","Notifications","bell","action","notifications","System","notification center alerts reminders sync"),
      app("themes","Themes","settings","settings","theme","Settings","theme accent appearance color visual"),
      app("keyboard","Keyboard Shortcuts","keyboard","settings","keyboard","Settings","keyboard shortcuts hotkeys ctrl"),
      app("plugins","Plugin Hub","connections","settings","plugins","System","plugins extensions integrations hub"),
      app("brain-settings","Brain Settings","ai","settings","brain","Settings","brain ai provider memory models"),
      app("spotify","Spotify","spotify","connection","spotify","Integrations","spotify music now playing"),
      app("discord","Discord","discord","connection","discord","Integrations","discord presence voice activity"),
      app("steam","Steam","gaming","connection","steam","Integrations","steam games playtime")
    ]);
  }
  function app(id,label,icon,type,target,category,keywords){
    return {id:id,label:label||id,icon:icon||id,type:type||"page",target:target||id,category:category||"Apps",keywords:keywords||""};
  }
  function categoryFor(id){
    if(["dashboard","ai","activity","health","versions","studio"].indexOf(id)>-1)return "OS";
    if(["files","notes","todos","kanban","calendar","goals","journal","countdown","databases","import"].indexOf(id)>-1)return "Productivity";
    if(["gaming","valorant-accounts","github","connections","marketplace"].indexOf(id)>-1)return "Extensions";
    if(["settings"].indexOf(id)>-1)return "Settings";
    return "Apps";
  }
  function keywordsFor(id){
    return String(id||"").replace(/-/g," ")+" ethone app library";
  }
  function registry(){
    var seen={};
    return defaultApps().filter(function(item){
      if(seen[item.id])return false;
      seen[item.id]=true;
      item.color=item.color||colorMap[item.id]||colorMap[item.icon]||"#8b5cf6";
      return true;
    });
  }
  function appById(id){
    return registry().find(function(item){return item.id===id});
  }
  function iconHTML(item){
    var key=item.icon||item.id;
    try{
      if(window.SVG_ICONS&&window.SVG_ICONS[key])return window.SVG_ICONS[key];
      if(window.SVG_ICONS&&window.SVG_ICONS[item.id])return window.SVG_ICONS[item.id];
      if(window.SVG_ICONS&&window.SVG_ICONS[item.target])return window.SVG_ICONS[item.target];
    }catch(e){}
    if(key==="bell")return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
    if(key==="keyboard")return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 9h.01M11 9h.01M15 9h.01M19 9h.01M7 13h.01M11 13h.01M15 13h.01M8 17h8"/></svg>';
    if(key==="widgets")return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="4" rx="2"/><rect x="13" y="10" width="7" height="10" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/></svg>';
    if(key==="workspaces")return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M4 9h16M9 4v16"/></svg>';
    var initials=String(item.label||item.id||"A").split(/\s+/).map(function(part){return part.charAt(0)}).join("").slice(0,2).toUpperCase();
    return '<span>'+esc(initials||"A")+'</span>';
  }
  function orderedApps(includeHidden){
    var apps=registry();
    if(!includeHidden)apps=apps.filter(function(item){return state.hidden.indexOf(item.id)===-1});
    var index={};
    state.order.forEach(function(id,i){index[id]=i});
    apps.sort(function(a,b){
      var ai=index[a.id],bi=index[b.id];
      if(ai==null&&bi==null)return a.label.localeCompare(b.label);
      if(ai==null)return 1;
      if(bi==null)return -1;
      return ai-bi;
    });
    return apps;
  }
  function filteredApps(includeHidden){
    var q=state.query.toLowerCase().trim();
    var apps=orderedApps(includeHidden);
    if(state.filter==="pinned")apps=apps.filter(function(item){return state.pinned.indexOf(item.id)>-1});
    if(state.filter==="hidden")apps=registry().filter(function(item){return state.hidden.indexOf(item.id)>-1});
    if(q){
      apps=apps.filter(function(item){
        return [item.label,item.id,item.category,item.keywords,item.type].join(" ").toLowerCase().indexOf(q)>-1;
      });
    }
    return apps;
  }
  function visibleFolders(){
    var q=state.query.toLowerCase().trim();
    return state.folders.map(normalizeFolder).filter(function(folder){
      var apps=folder.appIds.map(appById).filter(Boolean).filter(function(item){return state.hidden.indexOf(item.id)===-1});
      if(!apps.length&&!q)return true;
      if(!q)return apps.length;
      return folder.name.toLowerCase().indexOf(q)>-1 || apps.some(function(item){
        return [item.label,item.id,item.keywords].join(" ").toLowerCase().indexOf(q)>-1;
      });
    });
  }
  function ensureRoot(){
    var root=$("#ethone-app-library");
    if(root)return root;
    root=document.createElement("div");
    root.id="ethone-app-library";
    root.innerHTML=
      '<button type="button" class="al-launcher" data-al-action="open" aria-label="Open App Library">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1.6"/><rect x="14" y="4" width="6" height="6" rx="1.6"/><rect x="4" y="14" width="6" height="6" rx="1.6"/><rect x="14" y="14" width="6" height="6" rx="1.6"/></svg>'+
        '<span>Apps</span>'+
      '</button>'+
      '<div class="al-overlay" data-al-action="close" aria-hidden="true">'+
        '<section class="al-shell" role="dialog" aria-modal="true" aria-label="ETHONE App Library">'+
          '<div class="al-head">'+
            '<div><div class="al-eyebrow">ETHONE App Library</div><h2 class="al-title">All apps. One OS.</h2><p class="al-subtitle">Search every ETHONE feature, pin favorites, hide apps, create folders and reorganize the way your personal operating system opens.</p></div>'+
            '<div class="al-head-actions">'+
              '<button type="button" class="al-chip" data-al-action="new-folder">New folder</button>'+
              '<button type="button" class="al-chip" data-al-action="reset">Reset</button>'+
              '<button type="button" class="al-icon-btn" data-al-action="close-panel" aria-label="Close">x</button>'+
            '</div>'+
          '</div>'+
          '<div class="al-search-row">'+
            '<label class="al-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 3.5 3.5"/></svg><input id="al-search-input" autocomplete="off" placeholder="Search apps, widgets, settings, plugins..." type="search"/></label>'+
            '<div class="al-tabs" id="al-tabs"></div>'+
          '</div>'+
          '<div class="al-body" id="al-body"></div>'+
          '<div class="al-folder-view" id="al-folder-view"></div>'+
        '</section>'+
      '</div>';
    document.body.appendChild(root);
    bind(root);
    return root;
  }
  function render(){
    renderQueued=false;
    var root=ensureRoot();
    syncVisibility();
    renderTabs(root);
    renderBody(root);
  }
  function schedule(){
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(render);
  }
  function syncVisibility(){
    document.body.classList.toggle("ethone-app-library-ready",isAppVisible());
  }
  function renderTabs(root){
    var tabs=$("#al-tabs",root);
    if(!tabs)return;
    var filters=[
      ["all","All"],
      ["pinned","Pinned"],
      ["hidden","Hidden"]
    ];
    tabs.innerHTML=filters.map(function(row){
      return '<button type="button" class="al-chip '+(state.filter===row[0]?'active':'')+'" data-al-filter="'+row[0]+'">'+esc(row[1])+'</button>';
    }).join("");
  }
  function renderBody(root){
    var body=$("#al-body",root);
    var folderView=$("#al-folder-view",root);
    var shell=$(".al-shell",root);
    if(!body||!folderView||!shell)return;
    var apps=filteredApps(state.filter==="hidden");
    var folders=visibleFolders();
    if(state.activeFolder){
      shell.classList.add("folder-open");
      renderFolderView(folderView);
      return;
    }
    shell.classList.remove("folder-open");
    folderView.innerHTML="";
    var pinned=orderedApps(false).filter(function(item){return state.pinned.indexOf(item.id)>-1});
    var html="";
    if(state.filter==="all"&&!state.query&&pinned.length){
      html+=sectionHTML("Pinned",""+pinned.length+" apps",'<div class="al-grid">'+pinned.map(appHTML).join("")+'</div>');
    }
    if(state.filter==="all"&&folders.length){
      html+=sectionHTML("Folders",""+folders.length+" folders",'<div class="al-grid al-folder-grid">'+folders.map(folderHTML).join("")+'</div>');
    }
    if(apps.length){
      var label=state.filter==="hidden"?"Hidden apps":state.filter==="pinned"?"Pinned apps":"All apps";
      html+=sectionHTML(label,""+apps.length+" apps",'<div class="al-grid">'+apps.map(appHTML).join("")+'</div>');
    }else{
      html+='<div class="al-empty">No app matches this search.</div>';
    }
    body.innerHTML=html;
  }
  function sectionHTML(title,meta,content){
    return '<section class="al-section"><div class="al-section-head"><div class="al-section-title">'+esc(title)+'</div><div class="al-section-meta">'+esc(meta)+'</div></div>'+content+'</section>';
  }
  function appHTML(item){
    var pinned=state.pinned.indexOf(item.id)>-1;
    var hidden=state.hidden.indexOf(item.id)>-1;
    return '<article class="al-app '+(hidden?'is-hidden':'')+'" tabindex="0" draggable="true" data-al-app="'+esc(item.id)+'" style="--app-color:'+esc(item.color)+'">'+
      '<div class="al-app-icon">'+iconHTML(item)+'</div>'+
      '<div class="al-app-name">'+esc(item.label)+'</div>'+
      '<div class="al-app-type">'+esc(item.category||item.type)+'</div>'+
      '<div class="al-app-controls">'+
        '<button type="button" class="al-control '+(pinned?'active':'')+'" title="Pin" data-al-mini="pin" data-al-id="'+esc(item.id)+'">P</button>'+
        '<button type="button" class="al-control" title="Folder" data-al-mini="folder" data-al-id="'+esc(item.id)+'">F</button>'+
        '<button type="button" class="al-control '+(hidden?'active':'')+'" title="'+(hidden?'Restore':'Hide')+'" data-al-mini="'+(hidden?'restore':'hide')+'" data-al-id="'+esc(item.id)+'">'+(hidden?'R':'H')+'</button>'+
      '</div>'+
    '</article>';
  }
  function folderHTML(folder){
    var apps=folder.appIds.map(appById).filter(Boolean).filter(function(item){return state.hidden.indexOf(item.id)===-1}).slice(0,6);
    return '<article class="al-folder" tabindex="0" data-al-folder="'+esc(folder.id)+'">'+
      '<div class="al-folder-top"><div class="al-folder-name">'+esc(folder.name)+'</div><div class="al-folder-count">'+folder.appIds.length+'</div></div>'+
      '<div class="al-folder-icons">'+apps.map(function(item){return '<span class="al-folder-icon" style="--mini-color:'+esc(item.color)+'">'+iconHTML(item)+'</span>'}).join("")+'</div>'+
    '</article>';
  }
  function renderFolderView(container){
    var folder=state.folders.find(function(f){return f.id===state.activeFolder});
    if(!folder){state.activeFolder="";schedule();return;}
    var apps=folder.appIds.map(appById).filter(Boolean).filter(function(item){return state.hidden.indexOf(item.id)===-1});
    container.innerHTML=
      '<div class="al-section-head"><div><button type="button" class="al-chip" data-al-action="back">Back</button><span style="display:inline-block;width:10px"></span><span class="al-section-title">'+esc(folder.name)+'</span></div><div class="al-head-actions"><button type="button" class="al-chip" data-al-action="rename-folder" data-folder-id="'+esc(folder.id)+'">Rename</button><button type="button" class="al-chip" data-al-action="delete-folder" data-folder-id="'+esc(folder.id)+'">Delete folder</button></div></div>'+
      (apps.length?'<div class="al-grid">'+apps.map(appHTML).join("")+'</div>':'<div class="al-empty">This folder is empty. Move apps into it from the main library.</div>');
  }
  function open(){
    load();
    ensureRoot();
    state.activeFolder="";
    schedule();
    var overlay=$("#ethone-app-library .al-overlay");
    if(overlay){
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden","false");
    }
    setTimeout(function(){var input=$("#al-search-input");if(input)input.focus()},80);
  }
  function close(){
    var overlay=$("#ethone-app-library .al-overlay");
    if(overlay){
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden","true");
    }
    state.activeFolder="";
  }
  function openApp(id){
    var item=appById(id);
    if(!item)return;
    close();
    if(item.type==="page"){
      if(typeof window.switchPage==="function")window.switchPage(item.target,null);
      return;
    }
    if(item.type==="settings"){
      openSettingsTab(item.target);
      return;
    }
    if(item.type==="connection"){
      if(typeof window.switchPage==="function")window.switchPage("connections",null);
      setTimeout(function(){
        var el=$("#ih-card-"+item.target)||$('[data-ih-id="'+item.target+'"]');
        if(el&&el.scrollIntoView)el.scrollIntoView({block:"center",behavior:"smooth"});
      },160);
      return;
    }
    if(item.target==="widgets")openSettingsTab("widgets");
    else if(item.target==="workspaces")openWorkspaces();
    else if(item.target==="notifications")openNotifications();
  }
  function openSettingsTab(tab){
    if(typeof window.switchPage==="function")window.switchPage("settings",null);
    setTimeout(function(){
      var btn=$('[data-settings-tab="'+tab+'"], .settings-nav-item[onclick*="'+tab+'"]');
      if(typeof window.switchSettingsTab==="function")window.switchSettingsTab(tab,btn||$(".settings-nav-item")||document.body);
    },100);
  }
  function openWorkspaces(){
    var btn=$('[data-space-action="open"],.space-switcher-button,[data-v4-action-id="dashboard.workspace.toggle"],.d4-workspace');
    if(btn)btn.click();
    else if(typeof window.switchPage==="function")window.switchPage("dashboard",null);
  }
  function openNotifications(){
    var btn=$("#notif-bell-btn")||$("[data-notif-toggle]");
    if(btn)btn.click();
    else if(window.ETHONENotifications&&typeof window.ETHONENotifications.open==="function")window.ETHONENotifications.open();
  }
  function togglePinned(id){
    var idx=state.pinned.indexOf(id);
    if(idx>-1)state.pinned.splice(idx,1);
    else state.pinned.push(id);
    save();schedule();
  }
  function hideApp(id){
    if(state.hidden.indexOf(id)===-1)state.hidden.push(id);
    save();schedule();
  }
  function restoreApp(id){
    state.hidden=state.hidden.filter(function(x){return x!==id});
    save();schedule();
  }
  function createFolder(){
    var name=prompt("Folder name:", "New Folder");
    if(!name)return;
    state.folders.push(normalizeFolder({name:name.slice(0,42),appIds:[]}));
    save();schedule();
  }
  function renameFolder(id){
    var folder=state.folders.find(function(f){return f.id===id});
    if(!folder)return;
    var name=prompt("Folder name:", folder.name);
    if(!name)return;
    folder.name=name.slice(0,42);
    save();schedule();
  }
  function deleteFolder(id){
    var folder=state.folders.find(function(f){return f.id===id});
    if(!folder)return;
    if(!confirm("Delete folder '"+folder.name+"'? Apps will stay in the library."))return;
    state.folders=state.folders.filter(function(f){return f.id!==id});
    state.activeFolder="";
    save();schedule();
  }
  function moveToFolder(appId){
    if(!state.folders.length){
      createFolder();
      if(!state.folders.length)return;
    }
    var names=state.folders.map(function(f,i){return (i+1)+". "+f.name}).join("\n");
    var answer=prompt("Move to folder:\n"+names+"\n\nType folder number:", "1");
    var index=parseInt(answer,10)-1;
    var folder=state.folders[index];
    if(!folder)return;
    state.folders.forEach(function(f){f.appIds=f.appIds.filter(function(id){return id!==appId})});
    folder.appIds.push(appId);
    save();schedule();
  }
  function addToFolder(appId,folderId){
    var folder=state.folders.find(function(f){return f.id===folderId});
    if(!folder)return;
    state.folders.forEach(function(f){f.appIds=f.appIds.filter(function(id){return id!==appId})});
    folder.appIds.push(appId);
    save();schedule();
  }
  function reset(){
    if(!confirm("Reset App Library layout?"))return;
    state={pinned:[],hidden:[],order:[],folders:[],activeFolder:"",filter:"all",query:""};
    save();schedule();
  }
  function reorder(sourceId,targetId){
    if(!sourceId||!targetId||sourceId===targetId)return;
    var apps=orderedApps(true).map(function(item){return item.id});
    var from=apps.indexOf(sourceId),to=apps.indexOf(targetId);
    if(from<0||to<0)return;
    apps.splice(from,1);
    apps.splice(to,0,sourceId);
    state.order=apps;
    save();schedule();
  }
  function bind(root){
    root.addEventListener("click",function(event){
      var action=event.target.closest("[data-al-action]");
      if(action){
        var name=action.dataset.alAction;
        if(name==="open")open();
        if(name==="close"&&event.target===action)close();
        if(name==="close-panel")close();
        if(name==="new-folder")createFolder();
        if(name==="reset")reset();
        if(name==="back"){state.activeFolder="";schedule();}
        if(name==="rename-folder")renameFolder(action.dataset.folderId);
        if(name==="delete-folder")deleteFolder(action.dataset.folderId);
        return;
      }
      var filter=event.target.closest("[data-al-filter]");
      if(filter){state.filter=filter.dataset.alFilter||"all";save();schedule();return;}
      var mini=event.target.closest("[data-al-mini]");
      if(mini){
        event.stopPropagation();
        var id=mini.dataset.alId,kind=mini.dataset.alMini;
        if(kind==="pin")togglePinned(id);
        if(kind==="hide")hideApp(id);
        if(kind==="restore")restoreApp(id);
        if(kind==="folder")moveToFolder(id);
        return;
      }
      var folder=event.target.closest("[data-al-folder]");
      if(folder){state.activeFolder=folder.dataset.alFolder;schedule();return;}
      var appEl=event.target.closest("[data-al-app]");
      if(appEl)openApp(appEl.dataset.alApp);
    });
    root.addEventListener("input",function(event){
      if(event.target&&event.target.id==="al-search-input"){
        state.query=event.target.value||"";
        schedule();
      }
    });
    root.addEventListener("keydown",function(event){
      if(event.key==="Escape")close();
      if((event.key==="Enter"||event.key===" ")&&event.target.closest("[data-al-app]")){
        event.preventDefault();
        openApp(event.target.closest("[data-al-app]").dataset.alApp);
      }
    });
    root.addEventListener("dragstart",function(event){
      var appEl=event.target.closest("[data-al-app]");
      if(!appEl)return;
      draggedAppId=appEl.dataset.alApp;
      appEl.classList.add("is-dragging");
      try{event.dataTransfer.setData("text/plain",draggedAppId);event.dataTransfer.effectAllowed="move"}catch(e){}
    });
    root.addEventListener("dragend",function(){
      $$(".al-app.is-dragging",root).forEach(function(el){el.classList.remove("is-dragging")});
      draggedAppId="";
    });
    root.addEventListener("dragover",function(event){
      var appEl=event.target.closest("[data-al-app]");
      var folderEl=event.target.closest("[data-al-folder]");
      if(appEl||folderEl){
        event.preventDefault();
        $$(".drag-over",root).forEach(function(el){el.classList.remove("drag-over")});
        (appEl||folderEl).classList.add("drag-over");
      }
    });
    root.addEventListener("dragleave",function(event){
      var target=event.target.closest(".al-app,.al-folder");
      if(target)target.classList.remove("drag-over");
    });
    root.addEventListener("drop",function(event){
      var source=draggedAppId;
      try{source=event.dataTransfer.getData("text/plain")||source}catch(e){}
      var folderEl=event.target.closest("[data-al-folder]");
      var appEl=event.target.closest("[data-al-app]");
      if(folderEl&&source){
        event.preventDefault();
        addToFolder(source,folderEl.dataset.alFolder);
        return;
      }
      if(appEl&&source){
        event.preventDefault();
        reorder(source,appEl.dataset.alApp);
      }
    });
  }
  function bindGlobal(){
    document.addEventListener("keydown",function(event){
      if(event.ctrlKey&&event.shiftKey&&event.key.toLowerCase()==="l"){
        event.preventDefault();
        open();
      }
    });
    window.addEventListener("ethone:page-ready",function(){syncVisibility()});
    window.addEventListener("ethone:space-change",function(){load();schedule()});
    window.addEventListener("ethone:workspace-change",function(){load();schedule()});
    window.addEventListener("resize",syncVisibility,{passive:true});
    try{
      new MutationObserver(syncVisibility).observe(document.body,{attributes:true,subtree:true,attributeFilter:["class","style","hidden"]});
    }catch(e){}
  }
  function boot(){
    load();
    ensureRoot();
    bindGlobal();
    render();
    setTimeout(syncVisibility,250);
    setTimeout(syncVisibility,900);
  }

  window.ETHONEAppLibrary={
    open:open,
    close:close,
    render:schedule,
    getState:function(){return clone(state)},
    getApps:function(){return registry().map(clone)}
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
