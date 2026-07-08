/* ETHONE Arc-style side panels.
   Reduces page switching by opening common apps from the right side. */
(function(){
  "use strict";
  if(window.__ethoneSidePanels)return;
  window.__ethoneSidePanels=true;

  var $=function(sel,root){return (root||document).querySelector(sel)};
  var $$=function(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))};
  var storageKey="ethone:side-panels:v1";
  var panelPages=["spotify","discord","github","calendar","notes","files","ai"];
  var pageAliases={spotify:"connections",discord:"connections",github:"github",calendar:"calendar",notes:"notes",files:"files",ai:"ai"};
  var state={active:"",pinned:false,detached:false,width:420,history:[]};
  var resizing=null;
  var originalSwitchPage=null;
  var bypass=false;

  function escapeHTML(value){
    return String(value==null?"":value).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]});
  }
  function lang(){return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}
  function fr(){return lang()==="fr"}
  function t(frText,enText){return fr()?frText:enText}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function data(){var p=profile();return p&&p.state?p.state:{}}
  function notify(message,type){
    try{if(typeof window.toast==="function"){window.toast(message,type||"info");return}}catch(e){}
    try{console.log("[ETHONE Side Panels]",message)}catch(e){}
  }
  function save(){
    try{localStorage.setItem(storageKey,JSON.stringify({pinned:state.pinned,width:state.width,history:state.history.slice(0,12)}))}catch(e){}
  }
  function load(){
    try{
      var raw=JSON.parse(localStorage.getItem(storageKey)||"{}");
      state.pinned=!!raw.pinned;
      state.width=Math.max(340,Math.min(720,Number(raw.width)||420));
      state.history=Array.isArray(raw.history)?raw.history.slice(0,12):[];
    }catch(e){}
  }
  function isAppVisible(){
    var main=$("#main-content"),auth=$("#auth-screen"),profileScreen=$("#profile-screen"),password=$("#password-screen");
    function hidden(el){if(!el)return true;var cs=getComputedStyle(el);return el.hidden||cs.display==="none"||cs.visibility==="hidden"}
    return !!main&&!hidden(main)&&hidden(auth)&&hidden(profileScreen)&&hidden(password);
  }
  function panelInfo(id){
    var map={
      spotify:{label:"Spotify",accent:"#1db954",icon:"music"},
      discord:{label:"Discord",accent:"#8b5cf6",icon:"message-circle"},
      github:{label:"GitHub",accent:"#f5f5f7",icon:"git-branch"},
      calendar:{label:t("Calendrier","Calendar"),accent:"#a78bfa",icon:"calendar"},
      notes:{label:"Notes",accent:"#c4b5fd",icon:"file-text"},
      files:{label:t("Fichiers","Files"),accent:"#fbbf24",icon:"folder"},
      ai:{label:"Brain",accent:"#8b5cf6",icon:"bot"}
    };
    return map[id]||{label:id,accent:"var(--accent)",icon:id};
  }
  function icon(id){
    var info=panelInfo(id);
    try{
      if(window.SVG_ICONS&&window.SVG_ICONS[info.icon])return window.SVG_ICONS[info.icon];
      if(window.SVG_ICONS&&window.SVG_ICONS[id])return window.SVG_ICONS[id];
    }catch(e){}
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 9h8M8 13h5"/></svg>';
  }
  function connection(id){
    var st=data();
    var conn=st.connections||{};
    return conn[id]||conn[id==="github"?"github":id]||null;
  }
  function ensureRoot(){
    var root=$("#ethone-side-panels");
    if(root)return root;
    root=document.createElement("section");
    root.id="ethone-side-panels";
    root.className="side-panels-root";
    root.setAttribute("aria-label","ETHONE side panels");
    root.innerHTML=
      '<div class="side-panel-rail" id="side-panel-rail"></div>'+
      '<aside class="side-panel-shell" id="side-panel-shell" aria-hidden="true">'+
        '<div class="side-panel-resize" data-side-panel-resize></div>'+
        '<header class="side-panel-header">'+
          '<div class="side-panel-title"><span id="side-panel-icon"></span><div><strong id="side-panel-label">Panel</strong><em id="side-panel-subtitle">ETHONE</em></div></div>'+
          '<div class="side-panel-controls">'+
            '<button type="button" data-side-panel-pin title="Pin">Pin</button>'+
            '<button type="button" data-side-panel-detach title="Detach">Detach</button>'+
            '<button type="button" data-side-panel-full title="Open page">Page</button>'+
            '<button type="button" data-side-panel-close title="Close">x</button>'+
          '</div>'+
        '</header>'+
        '<div class="side-panel-body" id="side-panel-body"></div>'+
      '</aside>';
    document.body.appendChild(root);
    bindRoot(root);
    renderRail();
    applyWidth();
    return root;
  }
  function renderRail(){
    var rail=$("#side-panel-rail");
    if(!rail)return;
    rail.innerHTML=panelPages.map(function(id){
      var info=panelInfo(id);
      return '<button type="button" class="side-rail-item '+(state.active===id?"active":"")+'" data-side-panel-open="'+id+'" title="'+escapeHTML(info.label)+'"><span>'+icon(id)+'</span><em>'+escapeHTML(info.label)+'</em></button>';
    }).join("");
  }
  function applyWidth(){
    var shell=$("#side-panel-shell");
    if(shell)shell.style.width=state.width+"px";
  }
  function open(id,options){
    if(!panelPages.includes(id))return false;
    if(!isAppVisible())return false;
    ensureRoot();
    state.active=id;
    state.detached=false;
    state.history=[id].concat(state.history.filter(function(x){return x!==id})).slice(0,12);
    var shell=$("#side-panel-shell");
    if(shell){
      shell.classList.add("open");
      shell.setAttribute("aria-hidden","false");
    }
    renderRail();
    renderPanel();
    save();
    try{window.dispatchEvent(new CustomEvent("ethone:side-panel-open",{detail:{panel:id}}))}catch(e){}
    if(options&&options.toast!==false)notify(panelInfo(id).label+" "+t("ouvert en panneau","opened in panel"),"info");
    return true;
  }
  function close(force){
    if(state.pinned&&!force)return;
    state.active="";
    var shell=$("#side-panel-shell");
    if(shell){
      shell.classList.remove("open");
      shell.setAttribute("aria-hidden","true");
    }
    renderRail();
  }
  function togglePin(){
    state.pinned=!state.pinned;
    save();
    renderPanel();
    notify(state.pinned?t("Panneau epingle","Panel pinned"):t("Panneau libere","Panel unpinned"),"info");
  }
  function detach(){
    if(!state.active)return;
    var page=pageAliases[state.active]||state.active;
    state.detached=true;
    close(true);
    if(window.ETHONEDesktop&&typeof window.ETHONEDesktop.open==="function"){
      window.ETHONEDesktop.open(page,{frame:{x:120,y:86,w:760,h:620}});
      return;
    }
    openFullPage(page);
  }
  function openFullPage(page){
    page=page||pageAliases[state.active]||state.active;
    if(!page)return;
    close(true);
    if(typeof window.switchPage==="function"){
      bypass=true;
      try{window.switchPage(page,null)}finally{setTimeout(function(){bypass=false},0)}
    }
  }
  function renderPanel(){
    var id=state.active;
    var info=panelInfo(id);
    var label=$("#side-panel-label"), subtitle=$("#side-panel-subtitle"), iconHost=$("#side-panel-icon"), body=$("#side-panel-body");
    if(label)label.textContent=info.label;
    if(subtitle)subtitle.textContent=subtitleFor(id);
    if(iconHost)iconHost.innerHTML=icon(id);
    var pinBtn=$("[data-side-panel-pin]");
    if(pinBtn){pinBtn.classList.toggle("active",state.pinned);pinBtn.textContent=state.pinned?"Pinned":"Pin";pinBtn.setAttribute("aria-pressed",String(state.pinned))}
    if(body)body.innerHTML=renderContent(id);
  }
  function subtitleFor(id){
    if(id==="ai")return t("Brain partout dans ETHONE","Brain everywhere in ETHONE");
    if(id==="calendar")return t("Planning sans changer de page","Planning without page switching");
    if(id==="notes")return t("Notes rapides et contexte","Quick notes and context");
    if(id==="files")return t("Fichiers et liens recents","Recent files and links");
    return t("Integration en panneau lateral","Integration side panel");
  }
  function renderContent(id){
    if(id==="spotify")return renderSpotify();
    if(id==="discord")return renderDiscord();
    if(id==="github")return renderGithub();
    if(id==="calendar")return renderCalendarPanel();
    if(id==="notes")return renderNotes();
    if(id==="files")return renderFiles();
    if(id==="ai")return renderAI();
    return '<div class="side-panel-empty">Panel</div>';
  }
  function statusCard(id,title,body,actions){
    var conn=connection(id);
    var connected=!!conn;
    return '<section class="side-panel-card">'+
      '<div class="side-panel-card-head"><span class="side-panel-dot '+(connected?"ok":"idle")+'"></span><div><strong>'+escapeHTML(title)+'</strong><em>'+(connected?t("Connecte","Connected"):t("Non connecte","Not connected"))+'</em></div></div>'+
      '<p>'+escapeHTML(body)+'</p>'+
      '<div class="side-panel-actions">'+(actions||'')+'<button type="button" data-side-panel-full>'+t("Ouvrir page","Open page")+'</button></div>'+
    '</section>';
  }
  function renderSpotify(){
    var conn=connection("spotify");
    var url=conn&&conn.widgetUrl||"";
    return statusCard("spotify","Spotify",url?("Widget: "+url):t("Ajoute ton widget Spotify dans Connexions pour afficher l ecoute ici.","Add your Spotify widget in Connections to show listening here."),
      '<button type="button" data-side-panel-action="refresh-spotify">'+t("Actualiser","Refresh")+'</button>')+
      '<section class="side-panel-mini-preview"><strong>Now Playing</strong><span>'+(url?escapeHTML(url):t("Aucun widget configure","No widget configured"))+'</span></section>';
  }
  function renderDiscord(){
    var conn=connection("discord");
    var user=(conn&&conn.data&&conn.data.discord_user&&(conn.data.discord_user.global_name||conn.data.discord_user.username))||(conn&&conn.userId)||"Discord";
    return statusCard("discord","Discord",conn?t("Presence et activite disponibles dans ETHONE.","Presence and activity available in ETHONE."):t("Connecte Discord depuis Connexions pour utiliser le panneau live.","Connect Discord from Connections to use the live panel."),
      '<button type="button" data-side-panel-action="refresh-discord">'+t("Tester","Test")+'</button>')+
      '<section class="side-panel-mini-preview"><strong>'+escapeHTML(user)+'</strong><span>'+escapeHTML(conn&&conn.status||"offline")+'</span></section>';
  }
  function renderGithub(){
    var conn=connection("github");
    var username=conn&&conn.username||conn&&conn.user||"GitHub";
    return statusCard("github","GitHub",conn?t("Repos, commits et synchronisation accessibles sans quitter Home.","Repos, commits and sync available without leaving Home."):t("Configure GitHub pour afficher tes repos et commits ici.","Configure GitHub to show repos and commits here."),
      '<button type="button" data-side-panel-action="refresh-github">'+t("Synchroniser","Sync")+'</button>')+
      '<section class="side-panel-mini-preview"><strong>'+escapeHTML(username)+'</strong><span>'+escapeHTML(conn&&conn.repo||t("Aucun repo selectionne","No repo selected"))+'</span></section>';
  }
  function renderCalendarPanel(){
    var events=Array.isArray(data().events)?data().events:[];
    var list=events.slice(0,7).map(function(e){
      return '<div class="side-panel-row"><strong>'+escapeHTML(e.title||e.name||"Event")+'</strong><span>'+escapeHTML((e.date||"")+" "+(e.time||""))+'</span></div>';
    }).join("");
    return '<section class="side-panel-card"><div class="side-panel-card-head"><span class="side-panel-dot ok"></span><div><strong>'+t("Calendrier","Calendar")+'</strong><em>'+events.length+' '+t("evenement(s)","event(s)")+'</em></div></div><div class="side-panel-list">'+(list||'<div class="side-panel-empty">'+t("Aucun evenement.","No events.")+'</div>')+'</div><div class="side-panel-actions"><button type="button" data-side-panel-action="new-event">'+t("Nouvel evenement","New event")+'</button><button type="button" data-side-panel-full>'+t("Ouvrir calendrier","Open calendar")+'</button></div></section>';
  }
  function renderNotes(){
    var notes=Array.isArray(data().notes)?data().notes:[];
    var list=notes.slice(0,8).map(function(n){
      return '<button type="button" class="side-panel-row as-button" data-side-panel-action="open-notes"><strong>'+escapeHTML(n.title||"Untitled note")+'</strong><span>'+escapeHTML(String(n.content||"").replace(/\s+/g," ").slice(0,80))+'</span></button>';
    }).join("");
    return '<section class="side-panel-card"><div class="side-panel-card-head"><span class="side-panel-dot ok"></span><div><strong>Notes</strong><em>'+notes.length+' '+t("note(s)","note(s)")+'</em></div></div><div class="side-panel-list">'+(list||'<div class="side-panel-empty">'+t("Aucune note.","No notes.")+'</div>')+'</div><div class="side-panel-actions"><button type="button" data-side-panel-action="new-note">'+t("Nouvelle note","New note")+'</button><button type="button" data-side-panel-full>'+t("Ouvrir notes","Open notes")+'</button></div></section>';
  }
  function renderFiles(){
    var items=Array.isArray(data().items)?data().items:[];
    var list=items.slice(0,8).map(function(item){
      return '<div class="side-panel-row"><strong>'+escapeHTML(item.name||item.title||item.url||"Item")+'</strong><span>'+escapeHTML(item.type||"file")+'</span></div>';
    }).join("");
    return '<section class="side-panel-card"><div class="side-panel-card-head"><span class="side-panel-dot ok"></span><div><strong>'+t("Fichiers","Files")+'</strong><em>'+items.length+' item(s)</em></div></div><div class="side-panel-list">'+(list||'<div class="side-panel-empty">'+t("Aucun fichier.","No files.")+'</div>')+'</div><div class="side-panel-actions"><button type="button" data-side-panel-action="add-file">'+t("Ajouter","Add")+'</button><button type="button" data-side-panel-full>'+t("Ouvrir fichiers","Open files")+'</button></div></section>';
  }
  function renderAI(){
    var facts={tasks:(data().todos||[]).filter(function(t){return !t.done}).length,notes:(data().notes||[]).length,files:(data().items||[]).length};
    return '<section class="side-panel-card brain"><div class="side-panel-card-head"><span class="side-panel-dot ok"></span><div><strong>Brain</strong><em>'+t("Contexte actif","Active context")+'</em></div></div><p>'+t("Brain peut resumer, organiser, creer, planifier et analyser sans quitter la page actuelle.","Brain can summarize, organize, create, plan and analyze without leaving the current page.")+'</p><div class="side-panel-kpis"><div><strong>'+facts.tasks+'</strong><span>Tasks</span></div><div><strong>'+facts.notes+'</strong><span>Notes</span></div><div><strong>'+facts.files+'</strong><span>Files</span></div></div><div class="side-panel-actions"><button type="button" data-side-panel-action="ask-brain" class="primary">Ask Brain</button><button type="button" data-side-panel-full>AI Core</button></div></section>';
  }
  function handleAction(action){
    if(action==="refresh-spotify"&&typeof window.renderSpotifyCard==="function")window.renderSpotifyCard();
    else if(action==="refresh-discord"&&typeof window.refreshDiscord==="function")window.refreshDiscord();
    else if(action==="refresh-github"&&typeof window.refreshGithub==="function")window.refreshGithub();
    else if(action==="new-event"&&typeof window.openModal==="function")window.openModal("add-event");
    else if(action==="new-note"&&typeof window.newNote==="function")window.newNote();
    else if(action==="add-file"&&typeof window.openModal==="function")window.openModal("add-item");
    else if(action==="ask-brain"&&window.ETHONEBrainOS&&typeof window.ETHONEBrainOS.open==="function")window.ETHONEBrainOS.open("actions");
    else if(action==="open-notes")openFullPage("notes");
    renderPanel();
  }
  function bindRoot(root){
    root.addEventListener("click",function(e){
      var openBtn=e.target.closest("[data-side-panel-open]");
      if(openBtn){open(openBtn.dataset.sidePanelOpen);return}
      if(e.target.closest("[data-side-panel-close]")){close(true);return}
      if(e.target.closest("[data-side-panel-pin]")){togglePin();return}
      if(e.target.closest("[data-side-panel-detach]")){detach();return}
      if(e.target.closest("[data-side-panel-full]")){openFullPage();return}
      var action=e.target.closest("[data-side-panel-action]");
      if(action)handleAction(action.dataset.sidePanelAction);
    });
    root.addEventListener("pointerdown",function(e){
      if(!e.target.closest("[data-side-panel-resize]"))return;
      var shell=$("#side-panel-shell");
      resizing={startX:e.clientX,startWidth:shell?shell.getBoundingClientRect().width:state.width};
      document.body.classList.add("side-panel-resizing");
      try{e.target.setPointerCapture(e.pointerId)}catch(err){}
    });
  }
  function bindGlobal(){
    document.addEventListener("pointermove",function(e){
      if(!resizing)return;
      state.width=Math.max(340,Math.min(760,resizing.startWidth+(resizing.startX-e.clientX)));
      applyWidth();
    },{passive:true});
    document.addEventListener("pointerup",function(){
      if(!resizing)return;
      resizing=null;
      document.body.classList.remove("side-panel-resizing");
      save();
    });
    document.addEventListener("keydown",function(e){
      if(e.key==="Escape")close(false);
      if((e.ctrlKey||e.metaKey)&&e.altKey&&e.key.toLowerCase()==="b"){e.preventDefault();open(state.active||"ai")}
    });
    window.addEventListener("ethone:page-ready",function(){if(state.active)renderPanel();});
    window.addEventListener("ethone:dashboard-ready",function(){setTimeout(sync,120)});
  }
  function patchNavigation(){
    if(typeof window.switchPage!=="function"||window.switchPage.__sidePanelsWrapped)return;
    originalSwitchPage=window.switchPage;
    window.switchPage=function(page,navEl){
      if(!bypass&&panelPages.includes(page)&&isAppVisible()){
        open(page,{toast:false});
        return;
      }
      if(!bypass&&page==="connections"&&navEl&&navEl.dataset&&/spotify|discord/.test(String(navEl.dataset.panel||""))){
        open(navEl.dataset.panel,{toast:false});
        return;
      }
      return originalSwitchPage.apply(this,arguments);
    };
    window.switchPage.__sidePanelsWrapped=true;
  }
  function sync(){
    if(!isAppVisible())return;
    ensureRoot();
    patchNavigation();
    renderRail();
    if(state.active)renderPanel();
  }
  function boot(){
    load();
    bindGlobal();
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(sync,300)},{once:true});
    else setTimeout(sync,300);
    setTimeout(sync,1200);
  }

  window.ETHONESidePanels={
    open:open,
    close:function(){close(true)},
    pin:togglePin,
    detach:detach,
    full:openFullPage,
    state:function(){return JSON.parse(JSON.stringify(state))}
  };
  boot();
})();
