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
  var originalSwitchPage=null;
  var suppressRoute=false;
  var zSeed=40;
  var clockTimer=null;
  var dockDragPage="";
  var state={
    enabled:localStorage.getItem("ethone:desktop-enabled")!=="0",
    workspace:Number(localStorage.getItem("ethone:desktop-workspace")||0)||0,
    windows:[],
    recents:[],
    dockOrder:[],
    widgetsCollapsed:false,
    activeWindow:""
  };
  var transient={drag:null,resize:null};

  function readSaved(){
    try{
      var raw=localStorage.getItem(storageKey);
      if(!raw)return;
      var saved=JSON.parse(raw);
      if(saved&&Array.isArray(saved.windows)){
        state.windows=saved.windows.filter(function(w){return w&&w.page&&document.getElementById("page-"+w.page)}).slice(0,12);
        state.recents=Array.isArray(saved.recents)?saved.recents.slice(0,8):[];
        state.dockOrder=Array.isArray(saved.dockOrder)?saved.dockOrder.filter(Boolean).slice(0,18):[];
        state.widgetsCollapsed=!!saved.widgetsCollapsed;
        state.activeWindow=typeof saved.activeWindow==="string"?saved.activeWindow:"";
        if(typeof saved.workspace==="number")state.workspace=saved.workspace;
      }
    }catch(e){}
  }
  function save(){
    try{
      localStorage.setItem("ethone:desktop-enabled",state.enabled?"1":"0");
      localStorage.setItem("ethone:desktop-workspace",String(state.workspace));
      localStorage.setItem(storageKey,JSON.stringify({
        workspace:state.workspace,
        recents:state.recents.slice(0,8),
        dockOrder:state.dockOrder.slice(0,18),
        widgetsCollapsed:!!state.widgetsCollapsed,
        activeWindow:state.activeWindow||"",
        windows:state.windows.map(function(w){
          return {id:w.id,page:w.page,x:w.x,y:w.y,w:w.w,h:w.h,z:w.z,minimized:!!w.minimized,maximized:!!w.maximized,pinned:!!w.pinned,workspace:w.workspace||0};
        })
      }));
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
          '<button type="button" class="de-chip" data-de-action="split">Split View</button>'+
          '<button type="button" class="de-chip" data-de-action="minimize-all">Réduire tout</button>'+
          '<button type="button" class="de-chip" data-de-action="classic">Mode classique</button>'+
        '</div>'+
      '</div>'+
      '<div class="de-window-layer" id="de-window-layer"></div>'+
      '<aside class="de-widgets" id="de-widgets" aria-label="Desktop widgets"></aside>'+
      '<div class="de-taskbar" id="de-taskbar"></div>'+
      '<div class="de-dock" id="de-dock" aria-label="Dock"></div>';
    main.prepend(root);
    bindRoot(root);
    renderWorkspaces();
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
    ensureRoot();
    document.body.classList.add("ethone-desktop-mode");
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
    save();
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
      y:Math.max(64,74+(idx%4)*28),
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
    var win={id:"de-win-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),page:page,x:f.x,y:f.y,w:f.w,h:f.h,z:++zSeed,minimized:false,maximized:false,pinned:false,workspace:state.workspace};
    state.windows.push(win);
    mountWindow(win);
    focusWindow(win.id);
    remember(page);
    save();
    return win;
  }
  function openPage(page,opts){
    if(!document.getElementById("page-"+page))return;
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
    if(subtitle)subtitle.textContent=win.pinned?"Pinned above all workspaces":"Workspace "+((win.workspace||0)+1);
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
    el.classList.toggle("minimized",!!win.minimized||(!win.pinned&&win.workspace!==state.workspace));
    el.classList.toggle("maximized",!!win.maximized);
    el.classList.toggle("pinned",!!win.pinned);
    el.style.zIndex=String((win.z||1)+(win.pinned?1000:0));
    if(win.maximized){
      el.style.transform="translate3d(12px,58px,0)";
      el.style.width="calc(100% - 24px)";
      el.style.height="calc(100% - 144px)";
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
    renderAll();
    save();
  }
  function maximizeWindow(id){
    var w=findWindow(id); if(!w)return;
    w.maximized=!w.maximized;
    focusWindow(id);
    renderAll();
    save();
  }
  function togglePinWindow(id){
    var w=findWindow(id); if(!w)return;
    w.pinned=!w.pinned;
    if(!w.pinned)w.workspace=state.workspace;
    focusWindow(id);
    renderAll();
    save();
  }
  function focusWindow(id){
    var w=findWindow(id); if(!w)return;
    w.z=++zSeed;
    w.minimized=false;
    state.activeWindow=id;
    if(!w.pinned)state.workspace=w.workspace||0;
    remember(w.page);
    renderAll();
  }
  function findWindow(id){return state.windows.find(function(w){return w.id===id})}
  function remember(page){
    state.recents=[page].concat(state.recents.filter(function(p){return p!==page})).slice(0,8);
  }
  function renderAll(){
    qsa(".de-window").forEach(function(el){
      var w=findWindow(el.dataset.deWindow);
      if(w)applyFrame(w);
    });
    renderTaskbar();
    renderDock();
    renderWorkspaces();
    renderWidgets();
    save();
  }
  function renderWorkspaces(){
    var host=qs("#de-workspaces"); if(!host)return;
    host.innerHTML=[0,1,2,3].map(function(i){return '<button type="button" class="'+(i===state.workspace?"active":"")+'" data-de-workspace="'+i+'">'+(i+1)+'</button>'}).join("");
    var label=qs("#de-active-workspace-label");
    if(label)label.textContent="Workspace "+(state.workspace+1);
  }
  function renderTaskbar(){
    var host=qs("#de-taskbar"); if(!host)return;
    var visible=state.windows.filter(function(w){return w.pinned||w.workspace===state.workspace});
    var recent=state.recents.filter(function(page){return !visible.some(function(w){return w.page===page})}).slice(0,4);
    host.innerHTML=
      '<div class="de-taskbar-section"><strong>Fenêtres</strong>'+
      (visible.length?visible.map(taskButton).join(""):'<span class="de-muted">Aucune fenêtre ouverte</span>')+'</div>'+
      '<div class="de-taskbar-section de-recents"><strong>Récentes</strong>'+recent.map(function(page){var info=pageInfo(page);return '<button type="button" data-de-open="'+page+'"><span>'+iconHTML(info)+'</span>'+escapeHTML(info.label)+'</button>'}).join("")+'</div>';
  }
  function taskButton(win){
    var info=pageInfo(win.page);
    return '<button type="button" class="'+(win.minimized?"minimized":"")+(win.pinned?" pinned":"")+'" data-de-focus="'+win.id+'"><span>'+iconHTML(info)+'</span>'+escapeHTML(info.label)+(win.pinned?'<i>PIN</i>':'')+'</button>';
  }
  function renderDock(){
    var host=qs("#de-dock"); if(!host)return;
    var base=["dashboard","ai","notes","todos","calendar","databases","marketplace","settings"];
    var pages=base.concat(
      state.windows.filter(function(w){return w.pinned||w.workspace===state.workspace}).map(function(w){return w.page}),
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
      var open=state.windows.some(function(w){return w.page===page&&(w.pinned||w.workspace===state.workspace)&&!w.minimized});
      return '<button type="button" draggable="true" data-de-open="'+page+'" data-de-dock-page="'+page+'" class="'+(open?"active":"")+'" title="'+escapeHTML(info.label)+'" aria-label="'+escapeHTML(info.label)+'">'+iconHTML(info)+'</button>';
    }).join("")+'<span class="de-dock-sep"></span><button type="button" data-de-action="all-apps" title="Toutes les pages"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg></button>';
  }
  function renderWidgets(){
    var host=qs("#de-widgets"); if(!host)return;
    var active=findWindow(state.activeWindow)||state.windows.slice().sort(function(a,b){return (b.z||0)-(a.z||0)})[0];
    var now=new Date();
    var time=now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    var date=now.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"});
    var visible=state.windows.filter(function(w){return w.pinned||w.workspace===state.workspace});
    var info=active?pageInfo(active.page):pageInfo(currentPage()||"dashboard");
    host.classList.toggle("collapsed",!!state.widgetsCollapsed);
    host.innerHTML=
      '<div class="de-widget-head"><strong>Desktop</strong><button type="button" data-de-action="toggle-widgets" aria-label="Masquer les widgets">'+(state.widgetsCollapsed?"+":"-")+'</button></div>'+
      '<div class="de-widget-grid">'+
        '<section class="de-widget de-clock"><span>'+escapeHTML(date)+'</span><strong>'+escapeHTML(time)+'</strong><em>Workspace '+(state.workspace+1)+'</em></section>'+
        '<section class="de-widget"><span>Focus</span><strong>'+escapeHTML(info.label)+'</strong><em>'+visible.length+' fenetre'+(visible.length>1?"s":"")+' ouverte'+(visible.length>1?"s":"")+'</em></section>'+
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
    var wins=state.windows.filter(function(w){return (w.pinned||w.workspace===state.workspace)&&!w.minimized});
    if(wins.length<2){
      var first=wins[0];
      var candidate=["ai","notes","todos","calendar"].find(function(page){return document.getElementById("page-"+page)&&(!first||first.page!==page)});
      if(candidate)openPage(candidate);
      wins=state.windows.filter(function(w){return (w.pinned||w.workspace===state.workspace)&&!w.minimized});
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
    w.x=side==="left"?12:Math.round(r.width/2)+5;
    w.y=58;
    w.w=Math.round(r.width/2)-18;
    w.h=Math.max(420,Math.round(r.height)-148);
    focusWindow(id);
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
    root.addEventListener("pointerup",function(){transient.drag=null;transient.resize=null;save();});
    root.addEventListener("click",function(e){
      var open=e.target.closest("[data-de-open]");
      if(open){openPage(open.dataset.deOpen);var lp=qs("#de-launchpad");if(lp)lp.remove();return;}
      var focus=e.target.closest("[data-de-focus]");
      if(focus){focusWindow(focus.dataset.deFocus);return;}
      var ws=e.target.closest("[data-de-workspace]");
      if(ws){state.workspace=Number(ws.dataset.deWorkspace)||0;renderAll();save();return;}
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
      if(action.dataset.deAction==="toggle-widgets"){state.widgetsCollapsed=!state.widgetsCollapsed;renderWidgets();save();}
      if(action.dataset.deAction==="minimize-all"){state.windows.forEach(function(w){if(w.workspace===state.workspace)w.minimized=true});renderAll();}
      if(action.dataset.deAction==="classic")disable();
      if(action.dataset.deAction==="all-apps")showAllApps();
      if(action.dataset.deAction==="close-launchpad")qs("#de-launchpad")?.remove();
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
      if(state.enabled&&!suppressRoute&&isDashboardVisible()&&document.getElementById("page-"+page)){
        openPage(page);
        return;
      }
      return originalSwitchPage.apply(this,arguments);
    };
    window.switchPage.__deWrapped=true;
  }
  function syncVisibility(){
    var ready=isDashboardVisible();
    ensureLauncher();
    document.body.classList.toggle("ethone-desktop-available",ready);
    if(!ready){stopClock();document.body.classList.remove("ethone-desktop-mode");return;}
    if(state.enabled)enable();
    addWindowizeButtons();
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
  function boot(){
    wrapSwitchPage();
    syncVisibility();
    window.addEventListener("ethone:dashboard-ready",function(){setTimeout(function(){wrapSwitchPage();syncVisibility();addWindowizeButtons();},80)});
    window.addEventListener("ethone:page-ready",function(){addWindowizeButtons();if(state.enabled)renderAll()});
    window.addEventListener("resize",function(){if(state.enabled)renderAll()},{passive:true});
    document.addEventListener("keydown",function(e){
      if(!state.enabled||!isDashboardVisible())return;
      if(e.key==="Escape"){var lp=qs("#de-launchpad");if(lp)lp.remove();}
      if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="d"){e.preventDefault();state.enabled?disable():enable();}
      if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="s"){e.preventDefault();splitActive();}
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
    pin:togglePinWindow,
    split:splitActive,
    closeActive:closeActive,
    minimizeActive:function(){var active=state.activeWindow;if(active)minimizeWindow(active)},
    state:function(){return JSON.parse(JSON.stringify(state))}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
