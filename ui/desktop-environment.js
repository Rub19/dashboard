/* ETHONE Desktop Environment.
   Adds an OS-like window manager over existing pages without replacing routing. */
(function(){
  "use strict";
  if(window.__ethoneDesktopEnvironment)return;
  window.__ethoneDesktopEnvironment=true;

  var qs=function(s,r){return (r||document).querySelector(s)};
  var qsa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var clamp=function(v,min,max){return Math.max(min,Math.min(max,v))};
  var escapeHTML=function(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
  var storageKey="ethone:desktop-environment:v1";
  var DESKTOPS=[
    {id:"personal",label:"Personal",hint:"General workspace"},
    {id:"focus",label:"Focus",hint:"Deep work"},
    {id:"creative",label:"Studio",hint:"Creation"},
    {id:"system",label:"System",hint:"Tools"}
  ];
  var DISPLAYS=[
    {id:"main",label:"Main",hint:"Primary display"},
    {id:"side",label:"Side",hint:"Reference display"},
    {id:"focus",label:"Focus",hint:"Immersive display"}
  ];
  var originalSwitchPage=null;
  var suppressRoute=false;
  var zSeed=40;
  var clockTimer=null;
  var dockDragPage="";
  var state={
    enabled:localStorage.getItem("ethone:desktop-enabled")==="1",
    workspace:Number(localStorage.getItem("ethone:desktop-workspace")||0)||0,
    screen:localStorage.getItem("ethone:desktop-screen")||"main",
    windows:[],
    history:[],
    recents:[],
    dockOrder:[],
    desktopNames:[],
    widgetsCollapsed:false,
    activeWindow:""
  };
  var transient={drag:null,resize:null,altTab:null,altTabTimer:null};

  function readSaved(){
    try{
      var raw=localStorage.getItem(storageKey);
      if(!raw)return;
      var saved=JSON.parse(raw);
      if(saved&&Array.isArray(saved.windows)){
        state.windows=saved.windows.filter(function(w){return w&&w.page&&document.getElementById("page-"+w.page)}).slice(0,12).map(function(w){
          if(w.restore&&Number.isFinite(w.restore.x)&&Number.isFinite(w.restore.y)&&Number.isFinite(w.restore.w)&&Number.isFinite(w.restore.h)){
            w.restore={x:w.restore.x,y:w.restore.y,w:w.restore.w,h:w.restore.h};
          }else{
            delete w.restore;
          }
          return w;
        });
        state.windows.forEach(function(w){
          if(!w.screen)w.screen="main";
          if(!Number.isFinite(w.workspace))w.workspace=0;
        });
        state.history=Array.isArray(saved.history)?saved.history.filter(function(item){return item&&item.type}).slice(0,40):[];
        state.recents=Array.isArray(saved.recents)?saved.recents.slice(0,8):[];
        state.dockOrder=Array.isArray(saved.dockOrder)?saved.dockOrder.filter(Boolean).slice(0,18):[];
        state.desktopNames=Array.isArray(saved.desktopNames)?saved.desktopNames.slice(0,4):[];
        state.widgetsCollapsed=!!saved.widgetsCollapsed;
        state.activeWindow=typeof saved.activeWindow==="string"?saved.activeWindow:"";
        if(typeof saved.workspace==="number")state.workspace=saved.workspace;
        if(saved.screen&&DISPLAYS.some(function(display){return display.id===saved.screen}))state.screen=saved.screen;
      }
    }catch(e){}
  }
  function save(){
    try{
      localStorage.setItem("ethone:desktop-enabled",state.enabled?"1":"0");
      localStorage.setItem("ethone:desktop-workspace",String(state.workspace));
      localStorage.setItem("ethone:desktop-screen",String(state.screen||"main"));
      localStorage.setItem(storageKey,JSON.stringify({
        version:2,
        workspace:state.workspace,
        screen:state.screen||"main",
        history:state.history.slice(0,40),
        recents:state.recents.slice(0,8),
        dockOrder:state.dockOrder.slice(0,18),
        desktopNames:state.desktopNames.slice(0,4),
        widgetsCollapsed:!!state.widgetsCollapsed,
        activeWindow:state.activeWindow||"",
        windows:state.windows.map(function(w){
          return {id:w.id,page:w.page,x:w.x,y:w.y,w:w.w,h:w.h,z:w.z,minimized:!!w.minimized,maximized:!!w.maximized,pinned:!!w.pinned,workspace:w.workspace||0,screen:w.screen||"main",restore:w.restore||null};
        })
      }));
    }catch(e){}
  }
  function setDesktopLayout(active){
    try{
      localStorage.setItem("ethone:desktop-enabled",active?"1":"0");
      localStorage.setItem("ethone:layout-mode",active?"desktop":"classic");
    }catch(e){}
    try{
      document.documentElement.classList.toggle("ethone-window-manager-active",!!active);
      document.body.classList.toggle("ethone-window-manager-active",!!active);
    }catch(e){}
    try{
      if(window.ETHONEBootSequence&&typeof window.ETHONEBootSequence.sync==="function")window.ETHONEBootSequence.sync();
    }catch(e){}
  }
  function registry(){
    var nav=[];
    try{if(typeof window.getDefaultNav==="function")nav=window.getDefaultNav()||[]}catch(e){}
    var map={};
    nav.forEach(function(item){map[item.id]={id:item.id,label:item.label||item.id,icon:item.icon||item.id,section:item.section||"main"}});
    qsa(".tab-content[id^='page-']").forEach(function(page){
      var id=page.id.replace(/^page-/,"");
      if(!map[id]){
        var title=qs(".page-title,.section-title",page);
        map[id]={id:id,label:title?title.textContent.trim():id.replace(/-/g," "),icon:id,section:"main"};
      }
    });
    return map;
  }
  function pageInfo(page){
    var reg=registry();
    return reg[page]||{id:page,label:page.replace(/-/g," "),icon:page};
  }
  function desktopInfo(index){
    index=clamp(Number(index)||0,0,DESKTOPS.length-1);
    var custom=state.desktopNames&&state.desktopNames[index];
    return Object.assign({},DESKTOPS[index],custom?{label:custom}:null);
  }
  function displayInfo(id){
    id=id||state.screen||"main";
    return DISPLAYS.find(function(display){return display.id===id})||DISPLAYS[0];
  }
  function activeWindows(){
    return state.windows.filter(function(w){return w.pinned||(w.workspace===state.workspace&&(w.screen||"main")===state.screen)});
  }
  function visibleWindows(){
    return activeWindows().filter(function(w){return !w.minimized});
  }
  function workspaceWindowCount(index){
    return state.windows.filter(function(w){return w.pinned||w.workspace===index}).length;
  }
  function screenWindowCount(id){
    return state.windows.filter(function(w){return w.pinned||(w.screen||"main")===id}).length;
  }
  function iconHTML(info){
    try{
      if(window.SVG_ICONS&&window.SVG_ICONS[info.icon])return window.SVG_ICONS[info.icon];
      if(window.SVG_ICONS&&window.SVG_ICONS[info.id])return window.SVG_ICONS[info.id];
    }catch(e){}
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 9h8M8 13h5"/></svg>';
  }
  function ensureRoot(){
    var main=qs("#main-content");
    if(!main)return null;
    var root=qs("#ethone-desktop");
    if(root)return root;
    root=document.createElement("section");
    root.id="ethone-desktop";
    root.className="de-root";
    root.setAttribute("aria-label","ETHONE Desktop Environment");
    root.innerHTML=
      '<div class="de-wallpaper" aria-hidden="true"></div>'+
      '<div class="de-menubar">'+
        '<div class="de-brand"><span class="de-brand-mark">E</span><div><strong>ETHONE OS</strong><em id="de-active-workspace-label">Workspace 1</em></div></div>'+
        '<div class="de-workspaces" id="de-workspaces" aria-label="Virtual workspaces"></div>'+
        '<div class="de-menubar-actions">'+
          '<button type="button" class="de-chip" data-de-action="mission">Mission Control</button>'+
          '<button type="button" class="de-chip" data-de-action="notifications">Notifications</button>'+
          '<button type="button" class="de-chip" data-de-action="split">Split View</button>'+
          '<button type="button" class="de-chip" data-de-action="next-screen">Screen</button>'+
          '<button type="button" class="de-chip" data-de-action="minimize-all">Réduire tout</button>'+
          '<button type="button" class="de-chip" data-de-action="classic">Mode classique</button>'+
        '</div>'+
      '</div>'+
      '<div class="de-screen-strip" id="de-screen-strip" aria-label="Virtual screens"></div>'+
      '<div class="de-window-layer" id="de-window-layer"></div>'+
      '<aside class="de-widgets" id="de-widgets" aria-label="Desktop widgets"></aside>'+
      '<div class="de-taskbar" id="de-taskbar"></div>'+
      '<div class="de-dock" id="de-dock" aria-label="Dock"></div>'+
      '<div class="de-alt-tab" id="de-alt-tab" hidden aria-live="polite"></div>';
    main.prepend(root);
    bindRoot(root);
    renderWorkspaces();
    renderScreens();
    renderDock();
    return root;
  }
  function ensureLauncher(){
    var btn=qs("#ethone-desktop-launcher");
    if(btn)return btn;
    btn=document.createElement("button");
    btn.id="ethone-desktop-launcher";
    btn.type="button";
    btn.className="de-desktop-launcher";
    btn.innerHTML='<span>ETHONE OS</span><strong>Desktop</strong>';
    btn.addEventListener("click",enable);
    document.body.appendChild(btn);
    return btn;
  }
  function isDashboardVisible(){
    var main=qs("#main-content"), auth=qs("#auth-screen"), profile=qs("#profile-screen"), password=qs("#password-screen");
    var hidden=function(el){return !el||getComputedStyle(el).display==="none"||getComputedStyle(el).visibility==="hidden"};
    return main&&!hidden(main)&&hidden(auth)&&hidden(profile)&&hidden(password);
  }
  function enable(){
    if(!isDashboardVisible())return;
    readSaved();
    state.enabled=true;
    setDesktopLayout(true);
    ensureRoot();
    document.body.classList.add("ethone-desktop-mode");
    var root=qs("#ethone-desktop");
    if(root)root.setAttribute("aria-hidden","false");
    if(!state.windows.length)createWindow(currentPage()||"dashboard",{x:34,y:76,w:980,h:620});
    else restoreSavedWindows();
    renderAll();
    startClock();
    save();
  }
  function disable(){
    state.enabled=false;
    stopClock();
    restoreAllPages();
    document.body.classList.remove("ethone-desktop-mode");
    var root=qs("#ethone-desktop");
    if(root)root.setAttribute("aria-hidden","true");
    save();
    setDesktopLayout(false);
    if(originalSwitchPage){
      suppressRoute=true;
      try{originalSwitchPage(currentPage()||"dashboard",null)}catch(e){}
      suppressRoute=false;
    }
  }
  function currentPage(){
    var active=qs(".tab-content.active[id^='page-']");
    return active?active.id.replace(/^page-/,""):"dashboard";
  }
  function defaultFrame(idx){
    var layer=qs("#de-window-layer");
    var rect=layer?layer.getBoundingClientRect():{width:1200,height:720};
    var w=clamp(Math.round(rect.width*.72),640,1080);
    var h=clamp(Math.round(rect.height*.76),460,720);
    return {
      x:Math.max(18,36+(idx%4)*34),
      y:Math.max(118,126+(idx%4)*28),
      w:w,
      h:h
    };
  }
  function restoreSavedWindows(){
    state.windows.slice().forEach(function(w,i){
      var frame=defaultFrame(i);
      w.x=Number.isFinite(w.x)?w.x:frame.x;
      w.y=Number.isFinite(w.y)?w.y:frame.y;
      w.w=Number.isFinite(w.w)?w.w:frame.w;
      w.h=Number.isFinite(w.h)?w.h:frame.h;
      w.z=++zSeed;
      mountWindow(w);
    });
  }
  function createWindow(page,frame){
    var pageEl=document.getElementById("page-"+page);
    if(!pageEl)return null;
    var existing=state.windows.find(function(w){return w.page===page});
    if(existing){existing.minimized=false;focusWindow(existing.id);renderAll();return existing;}
    var f=frame||defaultFrame(state.windows.length);
    var win={id:"de-win-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),page:page,x:f.x,y:f.y,w:f.w,h:f.h,z:++zSeed,minimized:false,maximized:false,pinned:false,workspace:state.workspace,screen:state.screen||"main",restore:null};
    state.windows.push(win);
    mountWindow(win);
    recordWindowEvent("opened",win);
    focusWindow(win.id);
    remember(page);
    save();
    return win;
  }
  function openPage(page,opts){
    if(!document.getElementById("page-"+page))return;
    state.enabled=true;
    setDesktopLayout(true);
    ensureRoot();
    document.body.classList.add("ethone-desktop-mode");
    if(originalSwitchPage&&!suppressRoute){
      suppressRoute=true;
      try{originalSwitchPage(page,null)}catch(e){}
      suppressRoute=false;
    }
    createWindow(page,opts&&opts.frame);
    renderAll();
  }
  function mountWindow(win){
    var layer=qs("#de-window-layer")||ensureRoot().querySelector("#de-window-layer");
    if(!layer)return;
    var el=qs('[data-de-window="'+win.id+'"]',layer);
    var info=pageInfo(win.page);
    if(!el){
      el=document.createElement("article");
      el.className="de-window";
      el.dataset.deWindow=win.id;
      el.innerHTML=
        '<div class="de-titlebar" data-de-drag-handle>'+
          '<div class="de-traffic"><button type="button" data-de-action="close-window" aria-label="Fermer"></button><button type="button" data-de-action="minimize-window" aria-label="Réduire"></button><button type="button" data-de-action="maximize-window" aria-label="Plein écran"></button></div>'+
          '<div class="de-window-title"><span class="de-window-icon">'+iconHTML(info)+'</span><strong>'+escapeHTML(info.label)+'</strong><em></em></div>'+
          '<div class="de-window-tools"><button type="button" class="de-window-pin" data-de-action="pin-window" aria-label="Epingler la fenetre">Pin</button><button type="button" data-de-action="split-left">Left</button><button type="button" data-de-action="split-right">Right</button></div>'+
        '</div>'+
        '<div class="de-window-body"></div>'+
        '<div class="de-resize" data-de-resize-handle></div>';
      layer.appendChild(el);
    }
    el.dataset.page=win.page;
    el.classList.toggle("pinned",!!win.pinned);
    var pinBtn=qs('[data-de-action="pin-window"]',el);
    if(pinBtn){
      pinBtn.classList.toggle("active",!!win.pinned);
      pinBtn.setAttribute("aria-pressed",String(!!win.pinned));
      pinBtn.textContent=win.pinned?"Pinned":"Pin";
    }
    var subtitle=qs(".de-window-title em",el);
    if(subtitle){
      var desktop=desktopInfo(win.workspace||0);
      var display=displayInfo(win.screen||"main");
      subtitle.textContent=win.pinned?"Pinned above all desktops":desktop.label+" / "+display.label;
    }
    var body=qs(".de-window-body",el);
    var pageEl=document.getElementById("page-"+win.page);
    if(pageEl&&body&&!body.contains(pageEl)){
      if(!pageEl.__ethoneDesktopPlaceholder){
        pageEl.__ethoneDesktopPlaceholder=document.createComment("ethone-desktop-placeholder:"+win.page);
        pageEl.parentNode.insertBefore(pageEl.__ethoneDesktopPlaceholder,pageEl);
      }
      body.appendChild(pageEl);
      pageEl.classList.add("de-window-page","active");
      pageEl.setAttribute("data-de-host",win.id);
    }
    applyFrame(win);
  }
  function applyFrame(win){
    var el=qs('[data-de-window="'+win.id+'"]');
    if(!el)return;
    el.classList.toggle("minimized",!!win.minimized||(!win.pinned&&(win.workspace!==state.workspace||(win.screen||"main")!==state.screen)));
    el.classList.toggle("maximized",!!win.maximized);
    el.classList.toggle("pinned",!!win.pinned);
    el.classList.toggle("active",win.id===state.activeWindow);
    el.style.zIndex=String((win.z||1)+(win.pinned?1000:0));
    if(win.maximized){
      el.style.transform="translate3d(12px,122px,0)";
      el.style.width="calc(100% - 24px)";
      el.style.height="calc(100% - 208px)";
    }else{
      el.style.transform="translate3d("+Math.round(win.x)+"px,"+Math.round(win.y)+"px,0)";
      el.style.width=Math.round(win.w)+"px";
      el.style.height=Math.round(win.h)+"px";
    }
  }
  function restorePage(win){
    var pageEl=document.getElementById("page-"+win.page);
    if(pageEl&&pageEl.__ethoneDesktopPlaceholder&&pageEl.__ethoneDesktopPlaceholder.parentNode){
      pageEl.__ethoneDesktopPlaceholder.parentNode.insertBefore(pageEl,pageEl.__ethoneDesktopPlaceholder);
      pageEl.__ethoneDesktopPlaceholder.parentNode.removeChild(pageEl.__ethoneDesktopPlaceholder);
      pageEl.__ethoneDesktopPlaceholder=null;
    }
    if(pageEl){
      pageEl.classList.remove("de-window-page");
      pageEl.removeAttribute("data-de-host");
    }
  }
  function restoreAllPages(){
    state.windows.forEach(restorePage);
    qsa(".de-window").forEach(function(el){el.remove()});
  }
  function closeWindow(id){
    var idx=state.windows.findIndex(function(w){return w.id===id});
    if(idx<0)return;
    var win=state.windows[idx];
    recordWindowEvent("closed",win);
    restorePage(win);
    var el=qs('[data-de-window="'+id+'"]');
    if(el)el.remove();
    state.windows.splice(idx,1);
    if(state.activeWindow===id)state.activeWindow=(state.windows.slice().sort(function(a,b){return (b.z||0)-(a.z||0)})[0]||{}).id||"";
    renderAll();
    save();
  }
  function minimizeWindow(id){
    var w=findWindow(id); if(!w)return;
    w.minimized=true;
    recordWindowEvent("minimized",w);
    renderAll();
    save();
  }
  function maximizeWindow(id){
    var w=findWindow(id); if(!w)return;
    if(w.maximized){
      if(w.restore){
        w.x=w.restore.x;
        w.y=w.restore.y;
        w.w=w.restore.w;
        w.h=w.restore.h;
      }
      w.restore=null;
      w.maximized=false;
      recordWindowEvent("restored",w);
    }else{
      w.restore={x:w.x,y:w.y,w:w.w,h:w.h};
      w.maximized=true;
      recordWindowEvent("maximized",w);
    }
    focusWindow(id);
    renderAll();
    save();
  }
  function togglePinWindow(id){
    var w=findWindow(id); if(!w)return;
    w.pinned=!w.pinned;
    if(!w.pinned)w.workspace=state.workspace;
    recordWindowEvent(w.pinned?"pinned":"unpinned",w);
    focusWindow(id);
    renderAll();
    save();
  }
  function focusWindow(id){
    var w=findWindow(id); if(!w)return;
    w.z=++zSeed;
    w.minimized=false;
    state.activeWindow=id;
    if(!w.pinned){
      state.workspace=w.workspace||0;
      state.screen=w.screen||"main";
    }
    remember(w.page);
    renderAll();
  }
  function findWindow(id){return state.windows.find(function(w){return w.id===id})}
  function remember(page){
    state.recents=[page].concat(state.recents.filter(function(p){return p!==page})).slice(0,8);
  }
  function recordWindowEvent(type,win,meta){
    try{
      var info=win?pageInfo(win.page):null;
      state.history=[{
        id:"de-hist-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,5),
        time:Date.now(),
        type:type,
        page:win&&win.page||"",
        label:info&&info.label||"",
        windowId:win&&win.id||"",
        workspace:win&&Number.isFinite(win.workspace)?win.workspace:state.workspace,
        meta:meta||{}
      }].concat(state.history.filter(function(item){return item&&item.type})).slice(0,40);
    }catch(e){}
  }
  function switchWorkspace(index){
    var next=clamp(Number(index)||0,0,DESKTOPS.length-1);
    if(state.workspace===next){renderAll();return;}
    state.workspace=next;
    var visible=activeWindows().sort(function(a,b){return (b.z||0)-(a.z||0)})[0];
    state.activeWindow=visible?visible.id:"";
    recordWindowEvent("workspace",null,{workspace:next});
    renderAll();
    save();
  }
  function switchScreen(id){
    var next=displayInfo(id).id;
    if(state.screen===next){renderAll();return;}
    state.screen=next;
    var visible=activeWindows().sort(function(a,b){return (b.z||0)-(a.z||0)})[0];
    state.activeWindow=visible?visible.id:"";
    recordWindowEvent("screen",null,{screen:next});
    renderAll();
    save();
  }
  function cycleScreen(step){
    var idx=DISPLAYS.findIndex(function(display){return display.id===(state.screen||"main")});
    if(idx<0)idx=0;
    var next=DISPLAYS[(idx+(step||1)+DISPLAYS.length)%DISPLAYS.length];
    switchScreen(next.id);
  }
  function moveActiveToWorkspace(index){
    var w=findWindow(state.activeWindow); if(!w)return;
    w.workspace=clamp(Number(index)||0,0,DESKTOPS.length-1);
    w.pinned=false;
    recordWindowEvent("moved-to-workspace",w,{workspace:w.workspace});
    switchWorkspace(w.workspace);
  }
  function moveActiveToScreen(id){
    var w=findWindow(state.activeWindow); if(!w)return;
    w.screen=displayInfo(id).id;
    w.pinned=false;
    recordWindowEvent("moved-to-screen",w,{screen:w.screen});
    switchScreen(w.screen);
  }
  function openMissionControl(){
    try{
      if(window.ETHONEMissionControl&&typeof window.ETHONEMissionControl.open==="function"){
        window.ETHONEMissionControl.open();
        return true;
      }
      if(typeof window.openMissionControl==="function"){window.openMissionControl();return true;}
    }catch(e){}
    showAllApps();
    return false;
  }
  function openNotifications(){
    try{
      if(window.ETHONENotifications&&typeof window.ETHONENotifications.toggle==="function"){window.ETHONENotifications.toggle();return true;}
      if(typeof window.toggleNotifPanel==="function"){window.toggleNotifPanel();return true;}
      var btn=document.getElementById("notif-bell-btn")||document.querySelector("[data-notif-toggle]");
      if(btn){btn.click();return true;}
    }catch(e){}
    if(typeof window.toast==="function")window.toast("Notification Center unavailable","info");
    return false;
  }
  function switchableWindows(){
    return activeWindows().sort(function(a,b){return (b.z||0)-(a.z||0)});
  }
  function cycleAltTab(reverse){
    var list=switchableWindows();
    if(!list.length)return;
    if(!transient.altTab||!transient.altTab.open){
      var activeIndex=list.findIndex(function(w){return w.id===state.activeWindow});
      transient.altTab={open:true,ids:list.map(function(w){return w.id}),index:activeIndex<0?0:activeIndex};
    }
    transient.altTab.ids=transient.altTab.ids.filter(function(id){return !!findWindow(id)});
    if(!transient.altTab.ids.length){hideAltTab();return;}
    transient.altTab.index=(transient.altTab.index+(reverse?-1:1)+transient.altTab.ids.length)%transient.altTab.ids.length;
    renderAltTab();
    if(transient.altTabTimer)clearTimeout(transient.altTabTimer);
    transient.altTabTimer=setTimeout(commitAltTab,1200);
  }
  function renderAltTab(){
    var host=qs("#de-alt-tab")||(ensureRoot()&&qs("#de-alt-tab"));
    if(!host||!transient.altTab)return;
    var ids=transient.altTab.ids;
    host.hidden=false;
    host.innerHTML='<div class="de-alt-tab-card"><strong>Changer de fenetre</strong><div class="de-alt-tab-list">'+ids.map(function(id,idx){
      var w=findWindow(id); if(!w)return "";
      var info=pageInfo(w.page);
      return '<button type="button" class="'+(idx===transient.altTab.index?"active":"")+(w.minimized?" minimized":"")+'" data-de-focus="'+id+'"><span>'+iconHTML(info)+'</span><em>'+escapeHTML(info.label)+'</em><small>W'+((w.workspace||0)+1)+(w.minimized?" - reduite":"")+'</small></button>';
    }).join("")+'</div></div>';
  }
  function commitAltTab(){
    if(!transient.altTab||!transient.altTab.open)return;
    var id=transient.altTab.ids[transient.altTab.index];
    hideAltTab();
    if(id)focusWindow(id);
  }
  function hideAltTab(){
    if(transient.altTabTimer){clearTimeout(transient.altTabTimer);transient.altTabTimer=null;}
    transient.altTab=null;
    var host=qs("#de-alt-tab");
    if(host){host.hidden=true;host.innerHTML="";}
  }
  function renderAll(){
    qsa(".de-window").forEach(function(el){
      var w=findWindow(el.dataset.deWindow);
      if(w)applyFrame(w);
    });
    renderTaskbar();
    renderDock();
    renderWorkspaces();
    renderScreens();
    renderWidgets();
    save();
  }
  function renderWorkspaces(){
    var host=qs("#de-workspaces"); if(!host)return;
    host.innerHTML=DESKTOPS.map(function(desktop,i){
      var info=desktopInfo(i);
      var count=workspaceWindowCount(i);
      return '<button type="button" class="'+(i===state.workspace?"active":"")+'" data-de-workspace="'+i+'" title="'+escapeHTML(info.hint)+'"><span>'+escapeHTML(info.label)+'</span><em>'+count+'</em></button>';
    }).join("");
    var label=qs("#de-active-workspace-label");
    if(label)label.textContent=desktopInfo(state.workspace).label+" / "+displayInfo(state.screen).label;
  }
  function renderScreens(){
    var host=qs("#de-screen-strip"); if(!host)return;
    host.innerHTML=DISPLAYS.map(function(display){
      var active=display.id===(state.screen||"main");
      return '<button type="button" class="'+(active?"active":"")+'" data-de-screen="'+escapeHTML(display.id)+'" title="'+escapeHTML(display.hint)+'"><strong>'+escapeHTML(display.label)+'</strong><span>'+screenWindowCount(display.id)+' windows</span></button>';
    }).join("");
  }
  function renderTaskbarLegacy(){
    var host=qs("#de-taskbar"); if(!host)return;
    var visible=activeWindows();
    var recent=state.recents.filter(function(page){return !visible.some(function(w){return w.page===page})}).slice(0,4);
    host.innerHTML=
      '<div class="de-taskbar-section"><strong>Fenêtres</strong>'+
      (visible.length?visible.map(taskButton).join(""):'<span class="de-muted">Aucune fenêtre ouverte</span>')+'</div>'+
      '<div class="de-taskbar-section de-recents"><strong>Récentes</strong>'+recent.map(function(page){var info=pageInfo(page);return '<button type="button" data-de-open="'+page+'"><span>'+iconHTML(info)+'</span>'+escapeHTML(info.label)+'</button>'}).join("")+'</div>';
  }
  function taskButtonLegacy(win){
    var info=pageInfo(win.page);
    return '<button type="button" class="'+(win.minimized?"minimized":"")+(win.pinned?" pinned":"")+'" data-de-focus="'+win.id+'"><span>'+iconHTML(info)+'</span>'+escapeHTML(info.label)+(win.pinned?'<i>PIN</i>':'')+'</button>';
  }
  function renderTaskbar(){
    var host=qs("#de-taskbar"); if(!host)return;
    var visible=activeWindows();
    var recent=state.recents.filter(function(page){return !visible.some(function(w){return w.page===page})}).slice(0,4);
    var history=state.history.filter(function(item){return item&&item.page&&document.getElementById("page-"+item.page)}).slice(0,3);
    host.innerHTML=
      '<div class="de-taskbar-section de-taskbar-main"><div class="de-taskbar-meta"><strong>'+escapeHTML(desktopInfo(state.workspace).label)+'</strong><span>'+escapeHTML(displayInfo(state.screen).label)+' / '+visible.length+' window'+(visible.length>1?"s":"")+'</span></div>'+
      (visible.length?visible.map(taskButton).join(""):'<span class="de-muted">No open window</span>')+'</div>'+
      '<div class="de-taskbar-section de-recents"><strong>Recent</strong>'+recent.map(function(page){var info=pageInfo(page);return '<button type="button" data-de-open="'+page+'"><span>'+iconHTML(info)+'</span>'+escapeHTML(info.label)+'</button>'}).join("")+'</div>'+
      '<div class="de-taskbar-section de-history"><strong>History</strong>'+history.map(function(item){var info=pageInfo(item.page);return '<button type="button" data-de-open="'+item.page+'" title="'+escapeHTML(item.type)+'"><span>'+iconHTML(info)+'</span>'+escapeHTML(info.label)+'</button>'}).join("")+'</div>'+
      '<div class="de-taskbar-section de-system"><button type="button" data-de-action="mission">Mission</button><button type="button" data-de-action="notifications">Alerts</button><button type="button" data-de-action="next-screen">'+escapeHTML(displayInfo(state.screen).label)+'</button></div>';
  }
  function taskButton(win){
    var info=pageInfo(win.page);
    var cls=["de-task-button"];
    if(win.minimized)cls.push("minimized");
    if(win.pinned)cls.push("pinned");
    if(win.id===state.activeWindow)cls.push("active");
    return '<button type="button" class="'+cls.join(" ")+'" data-de-focus="'+win.id+'"><span>'+iconHTML(info)+'</span>'+escapeHTML(info.label)+(win.pinned?'<i>PIN</i>':'')+'</button>';
  }
  function renderDock(){
    var host=qs("#de-dock"); if(!host)return;
    var base=["dashboard","ai","notes","todos","calendar","databases","marketplace","settings"];
    var pages=base.concat(
      activeWindows().map(function(w){return w.page}),
      state.recents
    ).filter(function(page,idx,arr){return page&&arr.indexOf(page)===idx&&document.getElementById("page-"+page)}).slice(0,14);
    if(state.dockOrder.length){
      pages.sort(function(a,b){
        var ai=state.dockOrder.indexOf(a),bi=state.dockOrder.indexOf(b);
        if(ai===-1&&bi===-1)return 0;
        if(ai===-1)return 1;
        if(bi===-1)return -1;
        return ai-bi;
      });
    }
    host.innerHTML=pages.filter(function(page){return document.getElementById("page-"+page)}).map(function(page){
      var info=pageInfo(page);
      var open=activeWindows().some(function(w){return w.page===page&&!w.minimized});
      return '<button type="button" draggable="true" data-de-open="'+page+'" data-de-dock-page="'+page+'" class="'+(open?"active":"")+'" title="'+escapeHTML(info.label)+'" aria-label="'+escapeHTML(info.label)+'">'+iconHTML(info)+'</button>';
    }).join("")+'<span class="de-dock-sep"></span><button type="button" data-de-action="all-apps" title="Toutes les pages"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg></button>';
  }
  function renderWidgets(){
    var host=qs("#de-widgets"); if(!host)return;
    var active=findWindow(state.activeWindow)||state.windows.slice().sort(function(a,b){return (b.z||0)-(a.z||0)})[0];
    var now=new Date();
    var time=now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    var date=now.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"});
    var visible=activeWindows();
    var info=active?pageInfo(active.page):pageInfo(currentPage()||"dashboard");
    host.classList.toggle("collapsed",!!state.widgetsCollapsed);
    host.innerHTML=
      '<div class="de-widget-head"><strong>Desktop</strong><button type="button" data-de-action="toggle-widgets" aria-label="Masquer les widgets">'+(state.widgetsCollapsed?"+":"-")+'</button></div>'+
      '<div class="de-widget-grid">'+
        '<section class="de-widget de-clock"><span>'+escapeHTML(date)+'</span><strong>'+escapeHTML(time)+'</strong><em>'+escapeHTML(desktopInfo(state.workspace).label)+'</em></section>'+
        '<section class="de-widget"><span>'+escapeHTML(displayInfo(state.screen).label)+'</span><strong>'+escapeHTML(info.label)+'</strong><em>'+visible.length+' window'+(visible.length>1?"s":"")+' open</em></section>'+
        '<section class="de-widget de-brain"><span>Brain OS</span><strong>Contexte actif</strong><em>'+escapeHTML((info.id||active&&active.page||"dashboard").replace(/-/g," "))+'</em></section>'+
        '<section class="de-widget-actions"><button type="button" data-de-action="split">Split View</button><button type="button" data-de-action="all-apps">Launchpad</button></section>'+
      '</div>';
  }
  function startClock(){
    if(clockTimer)return;
    clockTimer=setInterval(function(){if(state.enabled&&isDashboardVisible())renderWidgets();},30000);
  }
  function stopClock(){
    if(clockTimer){clearInterval(clockTimer);clockTimer=null;}
  }
  function splitActive(){
    var wins=visibleWindows();
    if(wins.length<2){
      var first=wins[0];
      var candidate=["ai","notes","todos","calendar"].find(function(page){return document.getElementById("page-"+page)&&(!first||first.page!==page)});
      if(candidate)openPage(candidate);
      wins=visibleWindows();
    }
    wins.sort(function(a,b){return (b.z||0)-(a.z||0)});
    if(wins[0])setSplit(wins[0].id,"left");
    if(wins[1])setSplit(wins[1].id,"right");
  }
  function setSplit(id,side){
    var w=findWindow(id); if(!w)return;
    var layer=qs("#de-window-layer"); if(!layer)return;
    var r=layer.getBoundingClientRect();
    w.maximized=false;
    if(!w.pinned){
      w.workspace=state.workspace;
      w.screen=state.screen||"main";
    }
    w.x=side==="left"?12:Math.round(r.width/2)+5;
    w.y=122;
    w.w=Math.round(r.width/2)-18;
    w.h=Math.max(420,Math.round(r.height)-214);
    recordWindowEvent(side==="left"?"snapped-left":"snapped-right",w);
    focusWindow(id);
  }
  function snapAfterDrag(win){
    var root=qs("#ethone-desktop");
    if(!win||!root)return false;
    if(win.y<=54){maximizeWindow(win.id);return true;}
    if(win.x<=18){setSplit(win.id,"left");return true;}
    if(win.x+win.w>=root.clientWidth-18){setSplit(win.id,"right");return true;}
    return false;
  }
  function showAllApps(){
    var root=ensureRoot();
    var existing=qs("#de-launchpad",root);
    if(existing){existing.remove();return;}
    var reg=registry();
    var pages=Object.keys(reg).filter(function(id){return document.getElementById("page-"+id)});
    var el=document.createElement("div");
    el.id="de-launchpad";
    el.className="de-launchpad";
    el.innerHTML='<div class="de-launchpad-card"><div class="de-launchpad-head"><strong>Toutes les pages</strong><button type="button" data-de-action="close-launchpad">Fermer</button></div><div class="de-app-grid">'+pages.map(function(id){var info=reg[id];return '<button type="button" data-de-open="'+id+'"><span>'+iconHTML(info)+'</span><strong>'+escapeHTML(info.label)+'</strong></button>'}).join("")+'</div></div>';
    root.appendChild(el);
  }
  function bindRoot(root){
    root.addEventListener("pointerdown",function(e){
      var winEl=e.target.closest(".de-window");
      if(winEl)focusWindow(winEl.dataset.deWindow);
      var handle=e.target.closest("[data-de-drag-handle]");
      if(handle&&winEl&&!e.target.closest("button")){
        var w=findWindow(winEl.dataset.deWindow); if(!w||w.maximized)return;
        transient.drag={id:w.id,startX:e.clientX,startY:e.clientY,x:w.x,y:w.y};
        winEl.setPointerCapture&&winEl.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
      var resize=e.target.closest("[data-de-resize-handle]");
      if(resize&&winEl){
        var rw=findWindow(winEl.dataset.deWindow); if(!rw||rw.maximized)return;
        transient.resize={id:rw.id,startX:e.clientX,startY:e.clientY,w:rw.w,h:rw.h};
        winEl.setPointerCapture&&winEl.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });
    root.addEventListener("pointermove",function(e){
      if(transient.drag){
        var dw=findWindow(transient.drag.id); if(!dw)return;
        dw.x=clamp(transient.drag.x+e.clientX-transient.drag.startX,8,Math.max(8,root.clientWidth-180));
        dw.y=clamp(transient.drag.y+e.clientY-transient.drag.startY,48,Math.max(48,root.clientHeight-130));
        requestAnimationFrame(function(){applyFrame(dw)});
      }
      if(transient.resize){
        var rw=findWindow(transient.resize.id); if(!rw)return;
        rw.w=clamp(transient.resize.w+e.clientX-transient.resize.startX,420,Math.max(460,root.clientWidth-24));
        rw.h=clamp(transient.resize.h+e.clientY-transient.resize.startY,300,Math.max(340,root.clientHeight-84));
        requestAnimationFrame(function(){applyFrame(rw)});
      }
    },{passive:true});
    root.addEventListener("pointerup",function(){
      if(transient.drag){
        var dw=findWindow(transient.drag.id);
        if(dw&&!snapAfterDrag(dw))recordWindowEvent("moved",dw);
      }
      if(transient.resize){
        var rw=findWindow(transient.resize.id);
        if(rw)recordWindowEvent("resized",rw);
      }
      transient.drag=null;transient.resize=null;save();
    });
    root.addEventListener("dblclick",function(e){
      var winEl=e.target.closest(".de-window");
      var handle=e.target.closest("[data-de-drag-handle]");
      if(handle&&winEl&&!e.target.closest("button"))maximizeWindow(winEl.dataset.deWindow);
    });
    root.addEventListener("click",function(e){
      var open=e.target.closest("[data-de-open]");
      if(open){openPage(open.dataset.deOpen);var lp=qs("#de-launchpad");if(lp)lp.remove();return;}
      var focus=e.target.closest("[data-de-focus]");
      if(focus){focusWindow(focus.dataset.deFocus);return;}
      var ws=e.target.closest("[data-de-workspace]");
      if(ws){switchWorkspace(ws.dataset.deWorkspace);return;}
      var screen=e.target.closest("[data-de-screen]");
      if(screen){switchScreen(screen.dataset.deScreen);return;}
      var action=e.target.closest("[data-de-action]"); if(!action)return;
      var win=e.target.closest(".de-window");
      var id=win&&win.dataset.deWindow;
    if(action.dataset.deAction==="close-window")closeWindow(id);
    if(action.dataset.deAction==="minimize-window")minimizeWindow(id);
    if(action.dataset.deAction==="maximize-window")maximizeWindow(id);
      if(action.dataset.deAction==="pin-window")togglePinWindow(id);
      if(action.dataset.deAction==="split-left")setSplit(id,"left");
      if(action.dataset.deAction==="split-right")setSplit(id,"right");
      if(action.dataset.deAction==="split")splitActive();
      if(action.dataset.deAction==="mission")openMissionControl();
      if(action.dataset.deAction==="notifications")openNotifications();
      if(action.dataset.deAction==="next-screen")cycleScreen(1);
      if(action.dataset.deAction==="prev-screen")cycleScreen(-1);
      if(action.dataset.deAction==="toggle-widgets"){state.widgetsCollapsed=!state.widgetsCollapsed;renderWidgets();save();}
      if(action.dataset.deAction==="minimize-all"){activeWindows().forEach(function(w){w.minimized=true});renderAll();}
      if(action.dataset.deAction==="classic")disable();
      if(action.dataset.deAction==="all-apps")showAllApps();
      if(action.dataset.deAction==="close-launchpad"){var launchpad=qs("#de-launchpad");if(launchpad)launchpad.remove();}
    });
    root.addEventListener("dragstart",function(e){
      var dockBtn=e.target.closest("[data-de-dock-page]");
      if(!dockBtn)return;
      dockDragPage=dockBtn.dataset.deDockPage||"";
      dockBtn.classList.add("dragging");
      try{e.dataTransfer.setData("text/plain",dockDragPage);e.dataTransfer.effectAllowed="move"}catch(err){}
    });
    root.addEventListener("dragover",function(e){
      if(e.target.closest("[data-de-dock-page]"))e.preventDefault();
    });
    root.addEventListener("dragend",function(){
      dockDragPage="";
      qsa(".de-dock button.dragging",root).forEach(function(btn){btn.classList.remove("dragging")});
    });
    root.addEventListener("drop",function(e){
      var target=e.target.closest("[data-de-dock-page]");
      if(!target||!dockDragPage||target.dataset.deDockPage===dockDragPage)return;
      e.preventDefault();
      var current=qsa("[data-de-dock-page]",root).map(function(btn){return btn.dataset.deDockPage});
      var from=current.indexOf(dockDragPage),to=current.indexOf(target.dataset.deDockPage);
      if(from<0||to<0)return;
      current.splice(to,0,current.splice(from,1)[0]);
      state.dockOrder=current.filter(function(page,idx,arr){return page&&arr.indexOf(page)===idx});
      renderDock();
      save();
    });
  }
  function wrapSwitchPage(){
    if(window.switchPage&&window.switchPage.__deWrapped)return;
    if(typeof window.switchPage!=="function")return;
    originalSwitchPage=window.switchPage;
    window.switchPage=function(page,navEl){
      var allowed=!window.ethoneCanMountUI||window.ethoneCanMountUI("desktop");
      if(state.enabled&&allowed&&!suppressRoute&&isDashboardVisible()&&document.getElementById("page-"+page)){
        openPage(page);
        return;
      }
      return originalSwitchPage.apply(this,arguments);
    };
    window.switchPage.__deWrapped=true;
  }
  function syncVisibility(){
    var ready=isDashboardVisible();
    var allowed=!window.ethoneCanMountUI||window.ethoneCanMountUI("desktop");
    if(state.enabled||localStorage.getItem("ethone:desktop-launcher-visible")==="1")ensureLauncher();
    document.body.classList.toggle("ethone-desktop-available",ready);
    if(!ready){
      stopClock();
      document.body.classList.remove("ethone-desktop-mode");
      var hiddenRoot=qs("#ethone-desktop");
      if(hiddenRoot)hiddenRoot.setAttribute("aria-hidden","true");
      return;
    }
    if(!allowed){
      stopClock();
      if(state.enabled)restoreAllPages();
      state.enabled=false;
      document.body.classList.remove("ethone-desktop-mode");
      var root=qs("#ethone-desktop");
      if(root)root.setAttribute("aria-hidden","true");
      save();
      return;
    }
    if(!state.enabled&&localStorage.getItem("ethone:desktop-enabled")==="1")state.enabled=true;
    if(state.enabled)enable();
    if(state.enabled)addWindowizeButtons();
  }
  function addWindowizeButtons(){
    qsa(".tab-content[id^='page-']").forEach(function(pageEl){
      var page=pageEl.id.replace(/^page-/,"");
      var topbar=qs(".topbar",pageEl);
      if(!topbar||topbar.querySelector(".de-windowize-btn"))return;
      var actions=qs(".topbar-actions",topbar)||topbar;
      var btn=document.createElement("button");
      btn.type="button";
      btn.className="btn btn-ghost de-windowize-btn";
      btn.setAttribute("aria-label","Ouvrir cette page dans une fenetre flottante");
      btn.title="Ouvrir en fenetre";
      btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="14" height="12" rx="2"/><path d="M8 19h12V9"/></svg><span>Window</span>';
      btn.addEventListener("click",function(e){e.preventDefault();openPage(page);});
      actions.prepend(btn);
    });
  }
  function registerActions(){
    var A=window.ETHONEActions||window.ACTION_REGISTRY||(window.Ethone&&window.Ethone.get&&window.Ethone.get("actions"));
    if(!A||typeof A.register!=="function")return false;
    if(A.has&&A.has("desktop.environment.toggle"))return true;
    A.register("desktop.environment.toggle",{label:"Desktop Environment",handler:toggle});
    A.register("desktop.environment.enable",{label:"Enable Desktop Environment",handler:enable});
    A.register("desktop.environment.disable",{label:"Disable Desktop Environment",handler:disable});
    A.register("desktop.window.current",{label:"Open current page in window",handler:function(){openPage(currentPage()||"dashboard")}});
    A.register("desktop.window.close",{label:"Close active desktop window",handler:closeActive});
    A.register("desktop.window.minimize",{label:"Minimize active desktop window",handler:function(){var active=state.activeWindow;if(active)minimizeWindow(active)}});
    A.register("desktop.window.maximize",{label:"Maximize active desktop window",handler:function(){var active=state.activeWindow;if(active)maximizeWindow(active)}});
    A.register("desktop.window.snapLeft",{label:"Snap active window left",handler:function(){var active=state.activeWindow;if(active)setSplit(active,"left")}});
    A.register("desktop.window.snapRight",{label:"Snap active window right",handler:function(){var active=state.activeWindow;if(active)setSplit(active,"right")}});
    A.register("desktop.split",{label:"Split View",handler:splitActive});
    A.register("desktop.missionControl",{label:"Mission Control",handler:openMissionControl});
    A.register("desktop.notifications",{label:"Notifications",handler:openNotifications});
    A.register("desktop.screen.next",{label:"Next virtual screen",handler:function(){cycleScreen(1)}});
    A.register("desktop.screen.previous",{label:"Previous virtual screen",handler:function(){cycleScreen(-1)}});
    A.register("desktop.workspace.next",{label:"Next virtual desktop",handler:function(){switchWorkspace(state.workspace+1)}});
    A.register("desktop.workspace.previous",{label:"Previous virtual desktop",handler:function(){switchWorkspace(state.workspace-1)}});
    return true;
  }
  function registerShortcuts(){
    var K=window.ETHONEKeyboardShortcuts;
    if(!K||typeof K.register!=="function")return false;
    K.register({id:"desktop.mission",group:"Desktop",label:"Open Mission Control",shortcut:"Ctrl+Alt+M",allowInInputs:true,handler:openMissionControl});
    K.register({id:"desktop.screen.next",group:"Desktop",label:"Next virtual screen",shortcut:"Ctrl+Alt+Down",allowInInputs:true,handler:function(){cycleScreen(1)}});
    K.register({id:"desktop.screen.prev",group:"Desktop",label:"Previous virtual screen",shortcut:"Ctrl+Alt+Up",allowInInputs:true,handler:function(){cycleScreen(-1)}});
    K.register({id:"desktop.window.left",group:"Desktop",label:"Snap active window left",shortcut:"Ctrl+Alt+Shift+Left",allowInInputs:true,handler:function(){var active=state.activeWindow;if(active)setSplit(active,"left")}});
    K.register({id:"desktop.window.right",group:"Desktop",label:"Snap active window right",shortcut:"Ctrl+Alt+Shift+Right",allowInInputs:true,handler:function(){var active=state.activeWindow;if(active)setSplit(active,"right")}});
    return true;
  }
  function boot(){
    wrapSwitchPage();
    registerActions();
    registerShortcuts();
    syncVisibility();
    window.addEventListener("ethone:dashboard-ready",function(){setTimeout(function(){wrapSwitchPage();registerActions();registerShortcuts();syncVisibility();if(state.enabled)addWindowizeButtons();},80)});
    window.addEventListener("ethone:page-ready",function(){if(state.enabled)addWindowizeButtons();if(state.enabled)renderAll()});
    window.addEventListener("resize",function(){if(state.enabled)renderAll()},{passive:true});
    document.addEventListener("keydown",function(e){
      if(!state.enabled||!isDashboardVisible())return;
      if(e.altKey&&e.key==="Tab"){e.preventDefault();cycleAltTab(!!e.shiftKey);return;}
      if(e.key==="Escape"){var lp=qs("#de-launchpad");if(lp)lp.remove();}
      if((e.ctrlKey||e.metaKey)&&e.altKey&&e.shiftKey&&/^[1-4]$/.test(e.key)){e.preventDefault();moveActiveToWorkspace(Number(e.key)-1);}
      if((e.ctrlKey||e.metaKey)&&e.altKey&&!e.shiftKey&&/^[1-4]$/.test(e.key)){e.preventDefault();switchWorkspace(Number(e.key)-1);}
      if((e.ctrlKey||e.metaKey)&&e.altKey&&e.shiftKey&&e.key==="ArrowLeft"){e.preventDefault();var activeLeft=state.activeWindow;if(activeLeft)setSplit(activeLeft,"left");}
      if((e.ctrlKey||e.metaKey)&&e.altKey&&e.shiftKey&&e.key==="ArrowRight"){e.preventDefault();var activeRight=state.activeWindow;if(activeRight)setSplit(activeRight,"right");}
      if((e.ctrlKey||e.metaKey)&&e.altKey&&!e.shiftKey&&e.key==="ArrowLeft"){e.preventDefault();switchWorkspace(state.workspace-1);}
      if((e.ctrlKey||e.metaKey)&&e.altKey&&!e.shiftKey&&e.key==="ArrowRight"){e.preventDefault();switchWorkspace(state.workspace+1);}
      if((e.ctrlKey||e.metaKey)&&e.altKey&&e.key==="ArrowUp"){e.preventDefault();cycleScreen(-1);}
      if((e.ctrlKey||e.metaKey)&&e.altKey&&e.key==="ArrowDown"){e.preventDefault();cycleScreen(1);}
      if((e.ctrlKey||e.metaKey)&&e.altKey&&e.key.toLowerCase()==="m"){e.preventDefault();openMissionControl();}
      if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="d"){e.preventDefault();state.enabled?disable():enable();}
      if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="s"){e.preventDefault();splitActive();}
    });
    document.addEventListener("keyup",function(e){
      if(!state.enabled||!isDashboardVisible())return;
      if(e.key==="Alt")commitAltTab();
    });
  }
  function toggle(){
    if(state.enabled)disable();
    else enable();
  }
  function closeActive(){
    var active=state.activeWindow||((state.windows.slice().sort(function(a,b){return (b.z||0)-(a.z||0)})[0]||{}).id);
    if(active)closeWindow(active);
  }
  window.ETHONEDesktop={
    enable:enable,
    disable:disable,
    toggle:toggle,
    open:openPage,
    openCurrent:function(){openPage(currentPage()||"dashboard")},
    allApps:showAllApps,
    missionControl:openMissionControl,
    notifications:openNotifications,
    pin:togglePinWindow,
    split:splitActive,
    snapActive:function(side){var active=state.activeWindow;if(active)setSplit(active,side==="right"?"right":"left");},
    maximizeActive:function(){var active=state.activeWindow;if(active)maximizeWindow(active);},
    pinActive:function(){var active=state.activeWindow;if(active)togglePinWindow(active);},
    closeActive:closeActive,
    minimizeActive:function(){var active=state.activeWindow;if(active)minimizeWindow(active)},
    switchWorkspace:switchWorkspace,
    switchScreen:switchScreen,
    nextScreen:function(){cycleScreen(1)},
    previousScreen:function(){cycleScreen(-1)},
    moveActiveToWorkspace:moveActiveToWorkspace,
    moveActiveToScreen:moveActiveToScreen,
    altTab:function(){cycleAltTab(false)},
    windows:function(){return JSON.parse(JSON.stringify(state.windows))},
    displays:function(){return DISPLAYS.slice()},
    desktops:function(){return DESKTOPS.map(function(item,i){return Object.assign({},item,{label:desktopInfo(i).label,count:workspaceWindowCount(i)})})},
    state:function(){return JSON.parse(JSON.stringify(state))}
  };
  if(window.ethoneRunWhenDashboardReady)window.ethoneRunWhenDashboardReady("desktop-environment",function(){setTimeout(boot,260)});
  else if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
