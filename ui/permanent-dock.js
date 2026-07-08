/* ETHONE Permanent Dock.
   Uses existing navigation/actions and stores only UI preferences. */
(function(){
  "use strict";
  if(window.__ethonePermanentDock)return;
  window.__ethonePermanentDock=true;

  var qs=function(s,r){return (r||document).querySelector(s)};
  var qsa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var storageKey="ethone:permanent-dock:v1";
  var renderQueued=false;
  var draggedId=null;
  var openFolderId=null;
  var contextItemId=null;
  var state={items:[],collapsedSections:{},recents:[]};

  var sectionLabels={
    favorites:"Favoris",
    applications:"Applications",
    widgets:"Widgets",
    workspaces:"Workspaces",
    shortcuts:"Raccourcis"
  };

  var fallbackIcons={
    apps:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>',
    folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5a2 2 0 0 1 2-2h4.2l2 2H18.5a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>',
    widgets:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="4" rx="2"/><rect x="13" y="10" width="7" height="10" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/></svg>',
    workspaces:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5h16M4 16.5h16"/><rect x="4" y="4" width="16" height="16" rx="4"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 3.5 3.5"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    desktop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="11" rx="2"/><path d="M9 20h6M12 15.5V20"/></svg>',
    note:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    task:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l2 2 4-5"/><rect x="4" y="4" width="16" height="16" rx="3"/></svg>',
    event:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>',
    manager:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/><path d="M8 5v4M16 10v4M11 15v4"/></svg>'
  };

  function escapeHTML(value){
    return String(value==null?"":value).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]});
  }

  function uid(prefix){
    return (prefix||"dock")+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
  }

  function notify(message,type){
    if(typeof window.toast==="function"){
      try{window.toast(message,type||"info");return}catch(e){}
    }
    try{console.log("[ETHONE Dock]",message)}catch(e){}
  }

  function registry(){
    var map={};
    try{
      if(typeof window.getDefaultNav==="function"){
        (window.getDefaultNav()||[]).forEach(function(item){
          map[item.id]={id:item.id,label:item.label||item.id,icon:item.icon||item.id,type:"page"};
        });
      }
    }catch(e){}
    qsa(".tab-content[id^='page-']").forEach(function(page){
      var id=page.id.replace(/^page-/,"");
      if(!map[id]){
        var title=qs(".page-title,.section-title,h1,h2",page);
        map[id]={id:id,label:title?title.textContent.trim():id.replace(/-/g," "),icon:id,type:"page"};
      }
    });
    return map;
  }

  function iconHTML(item){
    var key=item.icon||item.page||item.action||item.id;
    try{
      if(window.SVG_ICONS&&window.SVG_ICONS[key])return window.SVG_ICONS[key];
      if(item.page&&window.SVG_ICONS&&window.SVG_ICONS[item.page])return window.SVG_ICONS[item.page];
    }catch(e){}
    return fallbackIcons[key]||fallbackIcons.folder;
  }

  function defaultItems(){
    return [
      {id:"dock-dashboard",type:"page",page:"dashboard",label:"Home",icon:"dashboard",section:"favorites",pinned:true},
      {id:"dock-ai",type:"page",page:"ai",label:"Brain",icon:"ai",section:"favorites",pinned:true},
      {id:"dock-notes",type:"page",page:"notes",label:"Notes",icon:"notes",section:"favorites"},
      {id:"dock-tasks",type:"page",page:"todos",label:"Tasks",icon:"todos",section:"favorites"},
      {id:"dock-apps",type:"folder",label:"Applications",icon:"apps",section:"applications",children:[
        {id:"dock-app-marketplace",type:"page",page:"marketplace",label:"Marketplace",icon:"marketplace"},
        {id:"dock-app-databases",type:"page",page:"databases",label:"Databases",icon:"databases"},
        {id:"dock-app-calendar",type:"page",page:"calendar",label:"Calendar",icon:"calendar"},
        {id:"dock-app-settings",type:"page",page:"settings",label:"Settings",icon:"settings"}
      ]},
      {id:"dock-widgets",type:"action",action:"widgets",label:"Widgets",icon:"widgets",section:"widgets"},
      {id:"dock-workspaces",type:"action",action:"workspaces",label:"Workspaces",icon:"workspaces",section:"workspaces"},
      {id:"dock-search",type:"action",action:"search",label:"Command",icon:"search",section:"shortcuts",pinned:true},
      {id:"dock-create",type:"folder",label:"Create",icon:"plus",section:"shortcuts",children:[
        {id:"dock-create-note",type:"action",action:"add-item",label:"New note",icon:"note"},
        {id:"dock-create-task",type:"action",action:"add-task",label:"New task",icon:"task"},
        {id:"dock-create-event",type:"action",action:"add-event",label:"New event",icon:"event"}
      ]},
      {id:"dock-notifications",type:"action",action:"notifications",label:"Notifications",icon:"bell",section:"shortcuts"},
      {id:"dock-desktop",type:"action",action:"desktop",label:"Desktop",icon:"desktop",section:"shortcuts"}
    ];
  }

  function clone(value){
    try{return JSON.parse(JSON.stringify(value))}catch(e){return value}
  }

  function allItems(items,out){
    out=out||[];
    (items||[]).forEach(function(item){
      out.push(item);
      if(item.children)allItems(item.children,out);
    });
    return out;
  }

  function findItem(id,items,parent){
    items=items||state.items;
    for(var i=0;i<items.length;i++){
      if(items[i].id===id)return {item:items[i],items:items,index:i,parent:parent||null};
      if(items[i].children){
        var found=findItem(id,items[i].children,items[i]);
        if(found)return found;
      }
    }
    return null;
  }

  function normalizeItem(item){
    if(!item||!item.id)item.id=uid("dock");
    item.section=item.section||"favorites";
    if(item.type==="folder"){
      item.icon=item.icon||"folder";
      item.children=Array.isArray(item.children)?item.children:[];
      item.children.forEach(function(child){child.section=item.section;normalizeItem(child)});
    }
    return item;
  }

  function readProfileDock(){
    try{
      var p=typeof window.curP==="function"?window.curP():null;
      return p&&p.state&&p.state.permanentDock?p.state.permanentDock:null;
    }catch(e){return null}
  }

  function load(){
    var saved=readProfileDock();
    if(!saved){
      try{saved=JSON.parse(localStorage.getItem(storageKey)||"null")}catch(e){saved=null}
    }
    if(saved&&Array.isArray(saved.items)&&saved.items.length){
      state.items=saved.items.map(function(item){return normalizeItem(item)});
      state.collapsedSections=saved.collapsedSections||{};
      state.recents=Array.isArray(saved.recents)?saved.recents:[];
      return;
    }
    state.items=defaultItems().map(function(item){return normalizeItem(item)});
  }

  function save(){
    var payload={items:state.items,collapsedSections:state.collapsedSections||{},recents:state.recents||[]};
    try{localStorage.setItem(storageKey,JSON.stringify(payload))}catch(e){}
    try{
      var p=typeof window.curP==="function"?window.curP():null;
      if(p){
        if(!p.state)p.state={};
        p.state.permanentDock=payload;
        if(typeof window.saveStateNow==="function")window.saveStateNow();
      }
    }catch(e){}
  }

  function ensureRoot(){
    var root=qs("#ethone-permanent-dock");
    if(root)return root;
    root=document.createElement("nav");
    root.id="ethone-permanent-dock";
    root.className="pdock";
    root.setAttribute("aria-label","ETHONE Dock");
    root.innerHTML='<div class="pdock-rail" id="pdock-rail"></div><div class="pdock-popover" id="pdock-popover" role="menu"></div><aside class="pdock-manager" id="pdock-manager" aria-label="Dock manager"></aside>';
    document.body.appendChild(root);
    bindRoot(root);
    return root;
  }

  function currentPage(){
    var active=qs(".tab-content.active[id^='page-']");
    return active?active.id.replace(/^page-/,""):"dashboard";
  }

  function isAppVisible(){
    var main=qs("#main-content"), auth=qs("#auth-screen"), profile=qs("#profile-screen"), pw=qs("#password-screen");
    var hidden=function(el){
      if(!el)return true;
      var cs=getComputedStyle(el);
      return cs.display==="none"||cs.visibility==="hidden"||el.hidden;
    };
    return !!main&&!hidden(main)&&hidden(auth)&&hidden(profile)&&hidden(pw);
  }

  function syncVisibility(){
    document.body.classList.toggle("ethone-permanent-dock-ready",isAppVisible());
  }

  function itemButton(item){
    var folder=item.type==="folder";
    var page=currentPage();
    var active=item.type==="page"&&item.page===page;
    if(folder){
      active=allItems(item.children||[]).some(function(child){return child.type==="page"&&child.page===page});
    }
    return '<button type="button" class="pdock-item'+(active?" is-active":"")+(item.pinned?" is-pinned":"")+'" draggable="true" data-pdock-id="'+escapeHTML(item.id)+'" data-pdock-type="'+escapeHTML(item.type||"page")+'" aria-label="'+escapeHTML(item.label)+'" aria-current="'+(active?"page":"false")+'" title="'+escapeHTML(item.label)+'">'+
      iconHTML(item)+
      '<span class="pdock-item-label">'+escapeHTML(item.label)+(folder?"":"")+'</span>'+
    '</button>';
  }

  function renderRail(){
    var rail=qs("#pdock-rail");
    if(!rail)return;
    var sections=["favorites","applications","widgets","workspaces","shortcuts"];
    var html=['<button type="button" class="pdock-item pdock-manager-toggle" draggable="false" data-pdock-manager="open" aria-label="Personnaliser le Dock" title="Personnaliser le Dock">'+fallbackIcons.manager+'<span class="pdock-item-label">Dock</span></button>'];
    sections.forEach(function(section,sectionIndex){
      var items=state.items.filter(function(item){return (item.section||"favorites")===section});
      if(!items.length)return;
      if(sectionIndex>0||html.length>1)html.push('<span class="pdock-separator" aria-hidden="true"></span>');
      html.push('<div class="pdock-section" data-section="'+section+'" aria-label="'+escapeHTML(sectionLabels[section]||section)+'">');
      items.forEach(function(item){html.push(itemButton(item))});
      html.push("</div>");
    });
    rail.innerHTML=html.join("");
  }

  function renderManager(){
    var manager=qs("#pdock-manager");
    if(!manager)return;
    var reg=registry();
    var existingPages=allItems(state.items).filter(function(item){return item.type==="page"}).map(function(item){return item.page});
    var available=Object.keys(reg).filter(function(id){return existingPages.indexOf(id)===-1}).slice(0,18).map(function(id){return reg[id]});
    var rootItems=state.items.map(function(item){
      return '<div class="pdock-manager-row" data-manager-id="'+escapeHTML(item.id)+'">'+
        '<div class="pdock-manager-meta">'+iconHTML(item)+'<span>'+escapeHTML(item.label)+'</span></div>'+
        '<div class="pdock-manager-actions">'+
          '<button type="button" class="pdock-chip" data-manager-action="pin">'+(item.pinned?"Unpin":"Pin")+'</button>'+
          '<button type="button" class="pdock-chip danger" data-manager-action="remove">Remove</button>'+
        '</div>'+
      '</div>';
    }).join("");
    var addRows=available.length?available.map(function(item){
      return '<div class="pdock-manager-row" data-add-page="'+escapeHTML(item.id)+'">'+
        '<div class="pdock-manager-meta">'+iconHTML(item)+'<span>'+escapeHTML(item.label)+'</span></div>'+
        '<button type="button" class="pdock-chip" data-manager-action="add-page">Add</button>'+
      '</div>';
    }).join(""):'<div class="pdock-manager-sub">Toutes les pages principales sont deja dans le Dock.</div>';
    manager.innerHTML=
      '<div class="pdock-manager-head">'+
        '<div><h3 class="pdock-manager-title">Dock ETHONE</h3><div class="pdock-manager-sub">Ajoute, supprime, epingle et reorganise tes raccourcis. Glisse une icone pour la deplacer.</div></div>'+
        '<button type="button" class="pdock-manager-close" data-pdock-manager="close" aria-label="Fermer">x</button>'+
      '</div>'+
      '<div class="pdock-manager-body">'+
        '<section class="pdock-manager-section"><h4>Elements actifs</h4>'+rootItems+'</section>'+
        '<section class="pdock-manager-section"><h4>Ajouter une page</h4>'+addRows+'</section>'+
      '</div>'+
      '<div class="pdock-manager-footer">'+
        '<button type="button" class="pdock-chip" data-manager-action="new-folder">New folder</button>'+
        '<button type="button" class="pdock-chip danger" data-manager-action="reset">Reset Dock</button>'+
      '</div>';
  }

  function render(){
    renderQueued=false;
    ensureRoot();
    syncVisibility();
    renderRail();
    renderManager();
  }

  function scheduleRender(){
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(render);
  }

  function closePopover(){
    var pop=qs("#pdock-popover");
    if(pop){
      pop.classList.remove("is-open");
      pop.innerHTML="";
    }
    openFolderId=null;
    contextItemId=null;
  }

  function positionPopover(anchor){
    var pop=qs("#pdock-popover");
    if(!pop||!anchor)return;
    var rect=anchor.getBoundingClientRect();
    var width=Math.min(360,window.innerWidth-24);
    pop.style.width="";
    var popRect=pop.getBoundingClientRect();
    var left=Math.max(12,Math.min(window.innerWidth-(popRect.width||width)-12,rect.left+rect.width/2-(popRect.width||width)/2));
    var top=Math.max(12,rect.top-(popRect.height||180)-14);
    if(top<12)top=Math.min(window.innerHeight-(popRect.height||180)-12,rect.bottom+14);
    pop.style.left=left+"px";
    pop.style.top=top+"px";
  }

  function openFolder(item,anchor){
    var pop=qs("#pdock-popover");
    if(!pop||!item)return;
    openFolderId=item.id;
    contextItemId=null;
    var children=item.children||[];
    pop.innerHTML='<div class="pdock-folder-grid">'+(children.length?children.map(function(child){
      return '<button type="button" class="pdock-folder-btn" data-folder-child="'+escapeHTML(child.id)+'">'+iconHTML(child)+'<span>'+escapeHTML(child.label)+'</span></button>';
    }).join(""):'<button type="button" class="pdock-menu-btn" disabled>Dossier vide</button>')+'</div>';
    pop.classList.add("is-open");
    requestAnimationFrame(function(){positionPopover(anchor)});
  }

  function openContext(item,anchor){
    var pop=qs("#pdock-popover");
    if(!pop||!item)return;
    contextItemId=item.id;
    openFolderId=null;
    pop.innerHTML=
      '<button type="button" class="pdock-menu-btn" data-context-action="open">'+iconHTML(item)+'<span>Ouvrir '+escapeHTML(item.label)+'</span></button>'+
      (item.type==="page"?'<button type="button" class="pdock-menu-btn" data-context-action="window">'+fallbackIcons.desktop+'<span>Ouvrir en fenetre</span></button>':"")+
      '<button type="button" class="pdock-menu-btn" data-context-action="pin">'+fallbackIcons.plus+'<span>'+(item.pinned?"Retirer l epingle":"Epingler")+'</span></button>'+
      '<button type="button" class="pdock-menu-btn danger" data-context-action="remove">'+fallbackIcons.folder+'<span>Supprimer du Dock</span></button>';
    pop.classList.add("is-open");
    requestAnimationFrame(function(){positionPopover(anchor)});
  }

  function openManager(force){
    var manager=qs("#pdock-manager");
    if(!manager)return;
    if(force===false)manager.classList.remove("is-open");
    else if(force===true)manager.classList.add("is-open");
    else manager.classList.toggle("is-open");
  }

  function rememberPage(page){
    if(!page)return;
    state.recents=[page].concat((state.recents||[]).filter(function(p){return p!==page})).slice(0,10);
    save();
  }

  function activate(item){
    if(!item)return;
    if(item.type==="folder")return;
    closePopover();
    if(item.type==="page"){
      if(typeof window.switchPage==="function"){
        window.switchPage(item.page,null);
        rememberPage(item.page);
      }else notify("Navigation indisponible","error");
      scheduleRender();
      return;
    }
    if(item.type==="action")runAction(item.action);
  }

  function runAction(action){
    if(action==="widgets"){
      if(typeof window.toggleLivePanel==="function")window.toggleLivePanel(true);
      else if(typeof window.openLivePanelManager==="function")window.openLivePanelManager();
      else notify("Panneau widgets indisponible","warning");
      return;
    }
    if(action==="workspaces"){
      if(typeof window.switchPage==="function")window.switchPage("settings",null);
      setTimeout(function(){
        var tab=qs('[data-settings-tab="workspaces"], .settings-nav-item[onclick*="workspaces"]');
        if(typeof window.switchSettingsTab==="function")window.switchSettingsTab("workspaces",tab||qs(".settings-nav-item")||document.body);
      },80);
      return;
    }
    if(action==="search"){
      if(typeof window.openCmdPalette==="function")window.openCmdPalette();
      else document.dispatchEvent(new KeyboardEvent("keydown",{key:"k",ctrlKey:true,bubbles:true}));
      return;
    }
    if(action==="notifications"){
      if(typeof window.toggleNotifPanel==="function")window.toggleNotifPanel();
      else if(typeof window.openNotificationCenter==="function")window.openNotificationCenter();
      else notify("Centre de notifications indisponible","warning");
      return;
    }
    if(action==="desktop"){
      if(window.ETHONEDesktop&&typeof window.ETHONEDesktop.enable==="function")window.ETHONEDesktop.enable();
      else notify("Desktop mode indisponible","warning");
      return;
    }
    if(action==="add-item"){
      if(typeof window.openModal==="function")window.openModal("add-item");
      else notify("Creation indisponible","warning");
      return;
    }
    if(action==="add-task"){
      if(typeof window.openModal==="function")window.openModal("add-todo");
      else if(typeof window.switchPage==="function")window.switchPage("todos",null);
      return;
    }
    if(action==="add-event"){
      if(typeof window.openModal==="function")window.openModal("add-event");
      else if(typeof window.switchPage==="function")window.switchPage("calendar",null);
    }
  }

  function removeItem(id){
    var found=findItem(id);
    if(!found)return;
    if(found.item.pinned){
      notify("Element epingle. Retire l epingle avant suppression.","warning");
      return;
    }
    found.items.splice(found.index,1);
    save();
    closePopover();
    scheduleRender();
  }

  function togglePin(id){
    var found=findItem(id);
    if(!found)return;
    found.item.pinned=!found.item.pinned;
    save();
    scheduleRender();
  }

  function addPage(page){
    var reg=registry();
    var item=reg[page];
    if(!item)return;
    state.items.push(normalizeItem({id:"dock-page-"+page,type:"page",page:page,label:item.label,icon:item.icon||page,section:"applications"}));
    save();
    scheduleRender();
  }

  function addFolder(){
    var name="Dossier";
    try{
      var promptValue=window.prompt&&window.prompt("Nom du dossier",name);
      if(promptValue)name=promptValue.trim().slice(0,32)||name;
    }catch(e){}
    state.items.push(normalizeItem({id:uid("dock-folder"),type:"folder",label:name,icon:"folder",section:"shortcuts",children:[]}));
    save();
    scheduleRender();
  }

  function resetDock(){
    state.items=defaultItems().map(function(item){return normalizeItem(item)});
    state.collapsedSections={};
    state.recents=[];
    save();
    closePopover();
    scheduleRender();
  }

  function moveItem(sourceId,targetId){
    if(!sourceId||!targetId||sourceId===targetId)return;
    var source=findItem(sourceId);
    var target=findItem(targetId);
    if(!source||!target)return;
    var item=source.items.splice(source.index,1)[0];
    if(target.item.type==="folder"){
      item.section=target.item.section||item.section;
      target.item.children=target.item.children||[];
      target.item.children.push(item);
    }else{
      var refreshedTarget=findItem(targetId);
      if(!refreshedTarget)return;
      item.section=refreshedTarget.item.section||item.section;
      refreshedTarget.items.splice(refreshedTarget.index,0,item);
    }
    save();
    scheduleRender();
  }

  function bindRoot(root){
    root.addEventListener("click",function(event){
      var managerBtn=event.target.closest("[data-pdock-manager]");
      if(managerBtn){
        openManager(managerBtn.dataset.pdockManager==="open"?undefined:false);
        return;
      }
      var dockBtn=event.target.closest("[data-pdock-id]");
      if(dockBtn){
        var found=findItem(dockBtn.dataset.pdockId);
        if(!found)return;
        if(found.item.type==="folder"){
          if(openFolderId===found.item.id)closePopover();
          else openFolder(found.item,dockBtn);
        }else activate(found.item);
        return;
      }
      var childBtn=event.target.closest("[data-folder-child]");
      if(childBtn){
        var child=findItem(childBtn.dataset.folderChild);
        if(child)activate(child.item);
        return;
      }
      var contextAction=event.target.closest("[data-context-action]");
      if(contextAction&&contextItemId){
        var foundContext=findItem(contextItemId);
        if(!foundContext)return;
        var action=contextAction.dataset.contextAction;
        if(action==="open")activate(foundContext.item);
        if(action==="window"&&foundContext.item.type==="page"){
          if(window.ETHONEDesktop&&typeof window.ETHONEDesktop.open==="function")window.ETHONEDesktop.open(foundContext.item.page);
          else activate(foundContext.item);
        }
        if(action==="pin")togglePin(contextItemId);
        if(action==="remove")removeItem(contextItemId);
        closePopover();
        return;
      }
      var managerAction=event.target.closest("[data-manager-action]");
      if(managerAction){
        var actionName=managerAction.dataset.managerAction;
        var row=managerAction.closest("[data-manager-id],[data-add-page]");
        if(actionName==="pin"&&row)togglePin(row.dataset.managerId);
        if(actionName==="remove"&&row)removeItem(row.dataset.managerId);
        if(actionName==="add-page"&&row)addPage(row.dataset.addPage);
        if(actionName==="new-folder")addFolder();
        if(actionName==="reset")resetDock();
      }
    });

    root.addEventListener("contextmenu",function(event){
      var dockBtn=event.target.closest("[data-pdock-id]");
      if(!dockBtn)return;
      event.preventDefault();
      var found=findItem(dockBtn.dataset.pdockId);
      if(found)openContext(found.item,dockBtn);
    });

    root.addEventListener("dragstart",function(event){
      var dockBtn=event.target.closest("[data-pdock-id]");
      if(!dockBtn)return;
      draggedId=dockBtn.dataset.pdockId;
      dockBtn.classList.add("is-dragging");
      try{event.dataTransfer.setData("text/plain",draggedId);event.dataTransfer.effectAllowed="move"}catch(e){}
    });

    root.addEventListener("dragend",function(){
      qsa(".pdock-item.is-dragging",root).forEach(function(el){el.classList.remove("is-dragging")});
      draggedId=null;
    });

    root.addEventListener("dragover",function(event){
      if(event.target.closest("[data-pdock-id]"))event.preventDefault();
    });

    root.addEventListener("drop",function(event){
      var target=event.target.closest("[data-pdock-id]");
      if(!target)return;
      event.preventDefault();
      var sourceId=draggedId;
      try{sourceId=event.dataTransfer.getData("text/plain")||sourceId}catch(e){}
      moveItem(sourceId,target.dataset.pdockId);
    });

    root.addEventListener("pointerover",function(event){
      var btn=event.target.closest(".pdock-item");
      if(!btn)return;
      qsa(".pdock-item.is-neighbor",root).forEach(function(el){el.classList.remove("is-neighbor")});
      var previous=btn.previousElementSibling;
      var next=btn.nextElementSibling;
      if(previous&&previous.classList.contains("pdock-item"))previous.classList.add("is-neighbor");
      if(next&&next.classList.contains("pdock-item"))next.classList.add("is-neighbor");
    },{passive:true});

    root.addEventListener("pointerleave",function(){
      qsa(".pdock-item.is-neighbor",root).forEach(function(el){el.classList.remove("is-neighbor")});
    },{passive:true});
  }

  function bindGlobal(){
    document.addEventListener("click",function(event){
      if(event.target.closest("#ethone-permanent-dock"))return;
      if(event.target.closest("#pdock-manager"))return;
      closePopover();
    });
    document.addEventListener("keydown",function(event){
      if(event.key==="Escape"){
        closePopover();
        openManager(false);
      }
    });
    window.addEventListener("ethone:page-ready",function(){scheduleRender()});
    window.addEventListener("ethone:space-change",function(){
      load();
      closePopover();
      openManager(false);
      scheduleRender();
    });
    window.addEventListener("ethone:workspace-change",function(){
      load();
      closePopover();
      openManager(false);
      scheduleRender();
    });
    window.addEventListener("resize",function(){syncVisibility();closePopover()},{passive:true});
    try{
      new MutationObserver(function(){syncVisibility()}).observe(document.body,{attributes:true,subtree:true,attributeFilter:["class","style","hidden"]});
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

  window.ethonePermanentDock={
    render:scheduleRender,
    reset:resetDock,
    openManager:function(){openManager(true)},
    getState:function(){return clone(state)}
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
