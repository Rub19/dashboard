/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.ETHONE_LIGHT_BOOT_MODE)return;
  if(window.__ethoneLeanProductionBoot)return;
  if(window.__ethoneDashboardOS2)return;
  window.__ethoneDashboardOS2=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const storageKey="ethone:dashboard-os2";
  const defaultState={
    edit:false,
    workspace:"Work",
    preset:"Work",
    density:"comfortable",
    blur:18,
    radius:20,
    spacing:12,
    transparency:55,
    dockAutoHide:false,
    theme:"default",
    installed:{weather:true,tasks:true,notes:true,github:false,spotify:false,discord:false,steam:false,valorant:false},
    favorites:["dashboard","ai","marketplace","command-center","settings"],
    history:[]
  };
  function load(){
    try{return Object.assign({},defaultState,JSON.parse(localStorage.getItem(storageKey)||"{}"))}catch(e){return Object.assign({},defaultState)}
  }
  let state=load();
  function save(){localStorage.setItem(storageKey,JSON.stringify(state))}
  function lang(){return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}
  function fr(){return lang()==="fr"}
  function toast(msg,type){
    if(typeof window.toast==="function"){try{window.toast(msg,type||"info");return}catch(e){}}
  }
  function profileState(){
    try{const p=typeof window.curP==="function"?window.curP():null;return p&&p.state?p.state:{}}catch(e){return {}}
  }
  function facts(){
    const st=profileState();
    const todos=Array.isArray(st.todos)?st.todos:[];
    const items=Array.isArray(st.items)?st.items:[];
    const habits=Array.isArray(st.habits)?st.habits:[];
    const events=Array.isArray(st.events)?st.events:[];
    const activity=Array.isArray(st.activity)?st.activity:[];
    return {
      openTodos:todos.filter(t=>!t.done).length,
      doneTodos:todos.filter(t=>t.done).length,
      files:items.length,
      links:items.filter(i=>String(i.type||"").toLowerCase()==="link").length,
      habits:habits.filter(h=>h.done||h.doneToday).length,
      events:events.length,
      activity:activity.slice(-6).reverse()
    };
  }
  function pageTitle(id){
    const map={
      dashboard:"ETHONE Home",ai:"AI",settings:"Settings",marketplace:"Marketplace",store:"Store",
      "command-center":"Command Center",timeline:"Timeline",workspaces:"Workspaces",todos:"Tasks",
      notes:"Notes",files:"Files",calendar:"Calendar",gaming:"Gaming",github:"GitHub"
    };
    return map[id]||id.charAt(0).toUpperCase()+id.slice(1);
  }
  function mode(){
    const h=new Date().getHours();
    const gaming=$("#sb-steam-wrap")&&getComputedStyle($("#sb-steam-wrap")).display!=="none";
    if(gaming||state.workspace==="Gaming")return "Gaming";
    if(h>=5&&h<11)return "Morning";
    if(h>=11&&h<18)return "Work";
    if(h>=18&&h<22)return "Evening";
    return "Night";
  }
  function makeTopbar(){
    const page=$("#page-dashboard");
    if(!page||$("#ethone-os2-commandbar",page))return;
    const bar=document.createElement("section");
    bar.id="ethone-os2-commandbar";
    bar.className="ethone-os2-commandbar";
    bar.setAttribute("aria-label","ETHONE workspace controls");
    bar.innerHTML=
      '<div class="ethone-os2-workspaces" id="ethone-os2-workspaces"></div>'+
      '<div class="ethone-os2-mode-chip"><span class="ethone-os2-live-dot"></span><span id="ethone-os2-mode">Live Home</span></div>'+
      '<div class="ethone-os2-actions">'+
        '<button class="ethone-os2-iconbtn" type="button" data-os2-page="command-center">Center</button>'+
        '<button class="ethone-os2-iconbtn" type="button" data-os2-page="marketplace">Market</button>'+
        '<button class="ethone-os2-iconbtn" type="button" data-os2-page="store">Store</button>'+
        '<button class="ethone-os2-iconbtn" type="button" data-os2-page="timeline">Timeline</button>'+
        '<button class="ethone-os2-iconbtn" type="button" id="ethone-os2-edit-toggle">Edit Mode</button>'+
      '</div>';
    const edit=document.createElement("section");
    edit.id="ethone-os2-editbar";
    edit.className="ethone-os2-editbar";
    edit.innerHTML=
      '<span class="ethone-os2-editbar-title">Dashboard Edit Mode</span>'+
      '<button class="ethone-os2-preset" data-os2-preset="Work" type="button">Work</button>'+
      '<button class="ethone-os2-preset" data-os2-preset="Gaming" type="button">Gaming</button>'+
      '<button class="ethone-os2-preset" data-os2-preset="Developer" type="button">Developer</button>'+
      '<button class="ethone-os2-preset" data-os2-preset="Streaming" type="button">Streaming</button>'+
      '<button class="ethone-os2-preset" data-os2-preset="Minimal" type="button">Minimal</button>'+
      '<button class="ethone-os2-preset" data-os2-preset="Study" type="button">Study</button>'+
      '<button class="ethone-os2-iconbtn" data-os2-action="undo" type="button">Undo</button>'+
      '<button class="ethone-os2-iconbtn" data-os2-action="save-layout" type="button">Save</button>'+
      '<button class="ethone-os2-iconbtn" data-os2-action="reset-layout" type="button">Reset</button>';
    const banner=$("#profile-banner",page);
    if(banner&&banner.nextSibling){
      banner.parentNode.insertBefore(bar,banner.nextSibling);
      bar.parentNode.insertBefore(edit,bar.nextSibling);
    }else{
      page.prepend(edit);
      page.prepend(bar);
    }
  }
  function renderWorkspaces(){
    const host=$("#ethone-os2-workspaces");
    if(!host)return;
    const items=["Work","Gaming","Streaming","Study","Personal","Minimal"];
    host.innerHTML=items.map(w=>'<button class="ethone-os2-workspace '+(state.workspace===w?"active":"")+'" data-os2-workspace="'+w+'" type="button">'+w+'</button>').join("");
    const modeEl=$("#ethone-os2-mode");
    if(modeEl)modeEl.textContent=mode()+" / "+state.preset;
  }
  function addOps(){
    const page=$("#page-dashboard");
    if(!page||$("#ethone-os2-ops-grid",page))return;
    const grid=document.createElement("section");
    grid.id="ethone-os2-ops-grid";
    grid.className="ethone-os2-ops-grid";
    grid.innerHTML=
      '<section class="ethone-os2-command-center" aria-label="Command Center preview">'+
        '<div class="ethone-os2-section-head"><div><div class="ethone-os2-label">Command Center</div><div class="ethone-os2-title">'+(fr()?"Hub operationnel":"Operational hub")+'</div></div><button class="ethone-os2-pillbtn primary" data-os2-page="command-center" type="button">'+(fr()?"Ouvrir":"Open")+'</button></div>'+
        '<div class="ethone-os2-command-list" id="ethone-os2-command-list"></div>'+
      '</section>'+
      '<section class="ethone-os2-timeline-strip" aria-label="Timeline preview">'+
        '<div class="ethone-os2-section-head"><div><div class="ethone-os2-label">Timeline</div><div class="ethone-os2-title">'+(fr()?"Memoire du jour":"Daily memory")+'</div></div><button class="ethone-os2-pillbtn" data-os2-page="timeline" type="button">'+(fr()?"Voir":"View")+'</button></div>'+
        '<div class="ethone-os2-timeline" id="ethone-os2-timeline-preview"></div>'+
      '</section>';
    const hero=$("#ethone-pos-home",page)||$("#ethone-home-hero",page)||$(".topbar",page);
    if(hero&&hero.nextSibling)hero.parentNode.insertBefore(grid,hero.nextSibling);
    else page.prepend(grid);
  }
  function renderOps(){
    const f=facts();
    const list=$("#ethone-os2-command-list");
    if(list){
      const cards=[
        [fr()?"AI Briefing":"AI Briefing", f.openTodos?(fr()?f.openTodos+" tache(s) a prioriser":f.openTodos+" task(s) to prioritize"):(fr()?"Aucune urgence detectee":"No urgent item detected")],
        [fr()?"Agenda":"Agenda", f.events?(fr()?f.events+" evenement(s) a suivre":f.events+" event(s) to track"):(fr()?"Planning libre":"Schedule is clear")],
        [fr()?"Widgets":"Widgets", installedCount()+" installed, "+enabledCount()+" enabled"],
        [fr()?"Workspace":"Workspace", state.workspace+" / "+state.preset]
      ];
      list.innerHTML=cards.map(c=>'<article class="ethone-os2-command-item"><strong>'+c[0]+'</strong><span>'+c[1]+'</span></article>').join("");
    }
    const timeline=$("#ethone-os2-timeline-preview");
    if(timeline)timeline.innerHTML=timelineItems().slice(0,5).map(t=>timeCard(t)).join("");
  }
  function timelineItems(){
    const f=facts();
    const now=new Date();
    const base=[
      {time:"Now",title:fr()?"Home adaptee":"Adaptive Home",sub:mode()+" mode is active"},
      {time:new Date(now-1000*60*22).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),title:fr()?"Dashboard pret":"Dashboard ready",sub:state.workspace+" workspace"},
      {time:new Date(now-1000*60*55).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),title:fr()?"Focus":"Focus",sub:f.openTodos+" open tasks"}
    ];
    f.activity.forEach(a=>base.push({time:"Activity",title:String(a.text||a).slice(0,32),sub:fr()?"Depuis ton journal ETHONE":"From your ETHONE log"}));
    return base;
  }
  function timeCard(t){return '<article class="ethone-os2-timecard"><div class="time">'+t.time+'</div><strong>'+escape(t.title)+'</strong><span>'+escape(t.sub)+'</span></article>'}
  function installedCount(){return Object.values(state.installed||{}).filter(Boolean).length}
  function enabledCount(){return Object.values(state.installed||{}).filter(Boolean).length}
  function escape(s){return String(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
  function ensureDock(){
    if($("#ethone-os2-dock"))return;
    const dock=document.createElement("nav");
    dock.id="ethone-os2-dock";
    dock.className="ethone-os2-dock";
    dock.setAttribute("aria-label","ETHONE Dock");
    document.body.appendChild(dock);
  }
  function renderDock(){
    const dock=$("#ethone-os2-dock");
    if(!dock)return;
    const visible=isAppVisible();
    dock.setAttribute("aria-hidden",visible?"false":"true");
    const favs=state.favorites||defaultState.favorites;
    dock.innerHTML=favs.map(id=>'<button class="ethone-os2-dock-btn" type="button" title="'+pageTitle(id)+'" data-os2-page="'+id+'">'+dockLabel(id)+'</button>').join("");
  }
  function dockLabel(id){
    const map={dashboard:"H",ai:"AI",marketplace:"M",store:"S","command-center":"C",timeline:"T",settings:"Set",workspaces:"W"};
    return map[id]||id.slice(0,2).toUpperCase();
  }
  function isAppVisible(){
    const main=$("#main-content");
    if(!main)return false;
    return getComputedStyle(main).display!=="none"&&getComputedStyle(main).visibility!=="hidden";
  }
  function ensurePages(){
    const main=$("#main-content");
    if(!main)return;
    const pages=[
      ["command-center","Command Center",fr()?"Un hub operationnel qui rassemble priorites, IA, activite, widgets et signaux du jour.":"An operational hub for priorities, AI, activity, widgets and today's signals."],
      ["marketplace","ETHONE Marketplace",fr()?"Installe, configure, active et organise tes widgets comme des apps.":"Install, configure, enable and organize widgets like apps."],
      ["store","ETHONE Store",fr()?"Themes, icon packs, wallpapers, layouts, automations et plugins IA.":"Themes, icon packs, wallpapers, layouts, automations and AI plugins."],
      ["timeline","Timeline",fr()?"La memoire chronologique de ta journee numerique.":"A chronological memory of your digital day."],
      ["workspaces","Workspaces",fr()?"Un environnement different pour Work, Gaming, Streaming, Study, Personal et Minimal.":"Different environments for Work, Gaming, Streaming, Study, Personal and Minimal."]
    ];
    pages.forEach(([id,title,sub])=>{
      if($("#page-"+id))return;
      const p=document.createElement("div");
      p.className="tab-content";
      p.id="page-"+id;
      p.setAttribute("data-qa-page","true");
      p.setAttribute("role","tabpanel");
      p.innerHTML='<div class="ethone-os2-page-hero"><div><div class="ethone-os2-label">ETHONE OS</div><h2>'+title+'</h2><p>'+sub+'</p></div><button class="btn btn-primary" type="button" data-os2-page="dashboard">ETHONE Home</button></div><div id="ethone-os2-page-'+id+'"></div>';
      main.appendChild(p);
    });
  }
  function renderPages(){
    renderCommandCenterPage();
    renderMarketplace();
    renderStore();
    renderTimelinePage();
    renderWorkspacesPage();
  }
  function renderCommandCenterPage(){
    const host=$("#ethone-os2-page-command-center");
    if(!host)return;
    const f=facts();
    host.innerHTML='<div class="ethone-os2-page-grid">'+[
      card("AI","AI Briefing",fr()?"Priorise "+f.openTodos+" tache(s), verifie l agenda et garde tes widgets critiques visibles.":"Prioritize "+f.openTodos+" task(s), check agenda and keep critical widgets visible.","ai"),
      card("Now","Current Activity",state.workspace+" workspace / "+mode()+" mode.","activity"),
      card("Focus","Productivity",f.doneTodos+" done, "+f.openTodos+" open, "+f.habits+" habits tracked.","todos"),
      card("Media","Music & Presence",fr()?"Spotify, Discord et Last.fm restent connectes quand disponibles.":"Spotify, Discord and Last.fm stay connected when available.","media"),
      card("Files","Recent Knowledge",f.files+" files and "+f.links+" links in your library.","files"),
      card("Timer","Focus Sessions",fr()?"Pomodoro, objectifs et rappels restent disponibles depuis Home.":"Pomodoro, goals and reminders stay available from Home.","timer")
    ].join("")+'</div>';
  }
  function marketplaceDefs(){
    return [
      ["weather","Weather Pro","Hourly forecast, weekly forecast and contextual recommendations."],
      ["tasks","Smart Tasks","Priority rings, estimates and AI suggestions."],
      ["notes","AI Notes","Summarize, rewrite, continue writing and translate."],
      ["github","GitHub Stats","Contribution graph, commits, repositories and summaries."],
      ["spotify","Spotify Mini Player","Album art, progress, lyrics shortcut and queue preview."],
      ["discord","Discord Presence","Rich Presence, voice status and activity."],
      ["steam","Steam","Recent games, playtime and library signals."],
      ["valorant","Valorant","Rank, recent matches and progression."],
      ["obs","OBS Studio","Streaming controls and scene status."],
      ["notion","Notion","Pages, databases and quick capture."]
    ];
  }
  function renderMarketplace(){
    const host=$("#ethone-os2-page-marketplace");
    if(!host)return;
    host.innerHTML='<div class="ethone-os2-page-grid">'+marketplaceDefs().map(([id,name,sub])=>{
      const on=!!state.installed[id];
      return '<article class="ethone-os2-card"><div class="ethone-os2-card-head"><div><div class="ethone-os2-card-icon">'+name.slice(0,2).toUpperCase()+'</div></div><button class="ethone-os2-pillbtn '+(on?"primary":"")+'" data-os2-install="'+id+'" type="button">'+(on?"Installed":"Install")+'</button></div><h3>'+name+'</h3><p>'+sub+'</p><div class="ethone-os2-card-actions"><button class="ethone-os2-pillbtn" data-os2-fav="'+id+'" type="button">Favorite</button><button class="ethone-os2-pillbtn" data-os2-config="'+id+'" type="button">Configure</button><button class="ethone-os2-pillbtn" data-os2-update="'+id+'" type="button">Update</button></div></article>';
    }).join("")+'</div>';
  }
  function renderStore(){
    const host=$("#ethone-os2-page-store");
    if(!host)return;
    const items=[
      ["Themes","Glass Focus","A refined glass theme with calmer contrast."],
      ["Icon Pack","Mono Glyphs","Consistent compact icons for dense workflows."],
      ["Wallpaper","Quiet Aurora","Animated background tuned for low distraction."],
      ["Layout","Developer Pro","GitHub, notes, files and AI in front."],
      ["Automation","Morning Startup","Weather, agenda, tasks and briefing sequence."],
      ["AI Plugin","Recap Engine","End-of-day recap and journal prompt."]
    ];
    host.innerHTML='<div class="ethone-os2-page-grid">'+items.map((it,i)=>'<article class="ethone-os2-card"><div class="ethone-os2-card-head"><div class="ethone-os2-card-icon">'+it[0].slice(0,2).toUpperCase()+'</div><button class="ethone-os2-pillbtn primary" data-os2-store="'+i+'" type="button">Add</button></div><h3>'+it[1]+'</h3><p>'+it[2]+'</p><div class="ethone-os2-card-actions"><button class="ethone-os2-pillbtn" type="button">Preview</button><button class="ethone-os2-pillbtn" type="button">Details</button></div></article>').join("")+'</div>';
  }
  function renderTimelinePage(){
    const host=$("#ethone-os2-page-timeline");
    if(!host)return;
    host.innerHTML='<div class="ethone-os2-timeline" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));overflow:visible">'+timelineItems().concat([
      {time:"Music",title:"Spotify / Last.fm",sub:"Listening sessions appear here when connected."},
      {time:"Gaming",title:"Discord / Steam",sub:"Gaming sessions appear here when widgets are enabled."},
      {time:"AI",title:"ETHONE AI",sub:"Prompts and summaries become part of the memory."}
    ]).map(t=>timeCard(t)).join("")+'</div>';
  }
  function renderWorkspacesPage(){
    const host=$("#ethone-os2-page-workspaces");
    if(!host)return;
    const items=["Work","Gaming","Streaming","Study","Personal","Minimal"];
    host.innerHTML='<div class="ethone-os2-page-grid">'+items.map(w=>'<article class="ethone-os2-card"><div class="ethone-os2-card-head"><div class="ethone-os2-card-icon">'+w.slice(0,2).toUpperCase()+'</div><button class="ethone-os2-pillbtn '+(state.workspace===w?"primary":"")+'" data-os2-workspace="'+w+'" type="button">'+(state.workspace===w?"Active":"Switch")+'</button></div><h3>'+w+'</h3><p>'+workspaceCopy(w)+'</p><div class="ethone-os2-card-actions"><button class="ethone-os2-pillbtn" data-os2-duplicate="'+w+'" type="button">Duplicate</button><button class="ethone-os2-pillbtn" data-os2-preset="'+w+'" type="button">Apply preset</button></div></article>').join("")+'</div>';
  }
  function workspaceCopy(w){
    const map={Work:"Projects, calendar, tasks, files and focus widgets.",Gaming:"Discord, Spotify, Steam, Valorant and session widgets.",Streaming:"OBS, Twitch, chat and production controls.",Study:"Notes, tasks, timers, reading and AI tutor.",Personal:"Journal, habits, reminders and relaxed media.",Minimal:"Only essential cards, low noise and compact density."};
    return map[w]||"Custom ETHONE environment.";
  }
  function card(icon,title,sub,page){
    return '<article class="ethone-os2-card"><div class="ethone-os2-card-head"><div class="ethone-os2-card-icon">'+icon+'</div><button class="ethone-os2-pillbtn" data-os2-page="'+(page||"dashboard")+'" type="button">Open</button></div><h3>'+title+'</h3><p>'+sub+'</p></article>';
  }
  function wrapSwitchPage(){
    if(!window.switchPage||window.switchPage.__os2Wrapped)return;
    const old=window.switchPage;
    window.switchPage=function(page,navEl){
      // ETHONE IA owns its own lazy lifecycle. Rebuilding every OS2 page here
      // caused dozens of unrelated cards and observers to run before first paint.
      if(page==="ai")return old.apply(this,arguments);
      ensurePages();
      const target=$("#page-"+page);
      if(target){
        try{old.apply(this,arguments)}catch(e){
          $$(".tab-content").forEach(el=>el.classList.remove("active"));
          target.classList.add("active");
        }
        renderPages();
        renderDock();
        return;
      }
      return old.apply(this,arguments);
    };
    window.switchPage.__os2Wrapped=true;
  }
  function enhanceWidgets(){
    const page=$("#page-dashboard");
    if(!page)return;
    const widgets=$$(".panel,.stat-card,.overview-widget",page).filter(el=>!el.closest(".ethone-os2-commandbar,.ethone-os2-editbar,.ethone-os2-ops-grid"));
    widgets.forEach((el,i)=>{
      if(el.dataset.os2Widget)return;
      el.dataset.os2Widget="w"+i;
      el.classList.add("ethone-os2-widget");
      el.setAttribute("draggable","true");
      const tb=document.createElement("div");
      tb.className="ethone-os2-widget-toolbar";
      tb.innerHTML='<button type="button" data-os2-widget-action="pin" title="Pin">P</button><button type="button" data-os2-widget-action="collapse" title="Collapse">-</button><button type="button" data-os2-widget-action="duplicate" title="Duplicate">D</button><button type="button" data-os2-widget-action="hide" title="Hide">H</button>';
      el.appendChild(tb);
      el.addEventListener("dragstart",e=>{
        if(!document.body.classList.contains("ethone-os2-editing")){e.preventDefault();return}
        e.dataTransfer.setData("text/plain",el.dataset.os2Widget);
        state.history.push("drag:"+el.dataset.os2Widget);
        save();
      });
      el.addEventListener("dragover",e=>{if(document.body.classList.contains("ethone-os2-editing"))e.preventDefault()});
      el.addEventListener("drop",e=>{
        if(!document.body.classList.contains("ethone-os2-editing"))return;
        e.preventDefault();
        const from=page.querySelector('[data-os2-widget="'+e.dataTransfer.getData("text/plain")+'"]');
        if(from&&from!==el&&el.parentNode)el.parentNode.insertBefore(from,el);
      });
    });
  }
  function applyState(){
    document.body.classList.toggle("ethone-os2-editing",!!state.edit);
    document.body.classList.toggle("os2-density-compact",state.density==="compact");
    document.body.classList.toggle("os2-theme-glass",state.theme==="glass");
    document.body.classList.toggle("os2-theme-focus",state.theme==="focus");
    document.documentElement.style.setProperty("--os2-radius",state.radius+"px");
    document.documentElement.style.setProperty("--os2-blur",state.blur+"px");
    document.documentElement.style.setProperty("--os2-spacing",state.spacing+"px");
    const t=$("#ethone-os2-edit-toggle");
    if(t)t.textContent=state.edit?(fr()?"Quitter Edit":"Exit Edit"):"Edit Mode";
    $$(".ethone-os2-preset").forEach(b=>b.classList.toggle("active",b.dataset.os2Preset===state.preset));
    renderWorkspaces();
    renderDock();
  }
  function applyPreset(preset){
    state.preset=preset;
    state.workspace=preset==="Developer"?"Work":preset;
    if(preset==="Minimal"){state.density="compact";state.theme="focus"}
    if(preset==="Gaming"){state.theme="glass";state.density="comfortable"}
    if(preset==="Study"){state.theme="focus";state.density="comfortable"}
    save();
    applyState();
    renderPages();
    toast(preset+" preset applied","success");
  }
  function handleClick(e){
    const pageBtn=e.target.closest("[data-os2-page]");
    if(pageBtn){
      const page=pageBtn.dataset.os2Page;
      const Actions=window.Ethone&&window.Ethone.get&&window.Ethone.get("actions");
      if(Actions&&Actions.dispatch)Actions.dispatch("navigation.open",{page:page,el:pageBtn,source:"dashboard-os2"});
      else if(window.switchPage)window.switchPage(page,null);
      return;
    }
    const ws=e.target.closest("[data-os2-workspace]");
    if(ws){state.workspace=ws.dataset.os2Workspace;state.preset=state.workspace;save();applyState();renderPages();toast("Workspace: "+state.workspace,"success");return}
    const edit=e.target.closest("#ethone-os2-edit-toggle");
    if(edit){state.edit=!state.edit;save();applyState();return}
    const preset=e.target.closest("[data-os2-preset]");
    if(preset){applyPreset(preset.dataset.os2Preset);return}
    const act=e.target.closest("[data-os2-action]");
    if(act){
      const a=act.dataset.os2Action;
      if(a==="undo"){const last=state.history.pop();save();toast(last?"Undo: "+last:"Nothing to undo","info")}
      if(a==="save-layout"){save();toast("Dashboard layout saved","success")}
      if(a==="reset-layout"){state=Object.assign({},defaultState,{installed:state.installed});save();applyState();renderPages();toast("Dashboard layout reset","info")}
      return;
    }
    const install=e.target.closest("[data-os2-install]");
    if(install){const id=install.dataset.os2Install;state.installed[id]=!state.installed[id];save();renderMarketplace();renderOps();toast((state.installed[id]?"Installed ":"Removed ")+id,"success");return}
    const store=e.target.closest("[data-os2-store]");
    if(store){toast("Store item added to ETHONE","success");return}
    const fav=e.target.closest("[data-os2-fav]");
    if(fav){const id=fav.dataset.os2Fav;if(!state.favorites.includes("marketplace"))state.favorites.push("marketplace");save();renderDock();toast(id+" favorited","success");return}
    const config=e.target.closest("[data-os2-config],[data-os2-update],[data-os2-duplicate]");
    if(config){toast("Saved locally for this workspace","info");return}
    const wa=e.target.closest("[data-os2-widget-action]");
    if(wa){
      const widget=wa.closest(".ethone-os2-widget");
      if(!widget)return;
      const a=wa.dataset.os2WidgetAction;
      if(a==="pin")widget.classList.toggle("is-pinned");
      if(a==="collapse")widget.classList.toggle("is-collapsed");
      if(a==="hide")widget.style.display="none";
      if(a==="duplicate"){const clone=widget.cloneNode(true);clone.dataset.os2Widget=widget.dataset.os2Widget+"-copy-"+Date.now();widget.parentNode.insertBefore(clone,widget.nextSibling);clone.classList.add("ethone-os2-widget");}
      state.history.push(a+":"+widget.dataset.os2Widget);
      save();
    }
  }
  function exposePersonalization(){
    window.ethoneOS2SetDensity=function(v){state.density=v==="compact"?"compact":"comfortable";save();applyState()};
    window.ethoneOS2SetTheme=function(v){state.theme=v||"default";save();applyState()};
    window.ethoneOS2Audit=function(){return {state,facts:facts(),pages:$$(".tab-content").length,widgets:$$(".ethone-os2-widget").length}};
  }
  function dashboardActive(){
    const page=$("#page-dashboard");
    return !!(page&&page.classList.contains("active"));
  }
  let mutationTimer=0;
  function scheduleDashboardSync(){
    if(!dashboardActive())return;
    clearTimeout(mutationTimer);
    mutationTimer=setTimeout(()=>{
      if(!dashboardActive())return;
      makeTopbar();
      addOps();
      enhanceWidgets();
      applyState();
    },120);
  }
  function run(){
    ensurePages();
    makeTopbar();
    addOps();
    ensureDock();
    renderWorkspaces();
    renderOps();
    renderPages();
    enhanceWidgets();
    wrapSwitchPage();
    applyState();
    exposePersonalization();
  }
  function startOS2(){
    document.addEventListener("click",handleClick);
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
    setTimeout(run,300);
    setTimeout(run,1200);
    setInterval(()=>{if(dashboardActive()){renderOps();renderDock()}},30000);
    try{new MutationObserver(scheduleDashboardSync).observe(document.body,{childList:true,subtree:true})}catch(e){}
  }
  if(window.ethoneRunWhenDashboardReady)window.ethoneRunWhenDashboardReady("dashboard-os2",startOS2);else startOS2();
})();
