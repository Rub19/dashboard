/* ETHONE Dashboard V4 page controller. */
(function(){
  "use strict";
  if(window.__ethoneDashboardV4)return;
  window.__ethoneDashboardV4=true;
  var Core=window.EthoneCore;
  var App=window.Ethone;
  var Events=App.get("events");
  var Navigation=App.get("navigation");
  var Notifications=App.get("notifications");
  var Language=App.get("language");
  var Storage=App.get("storage");
  var timer=0,clockTimer=0;
  var words={
    fr:{search:"Rechercher dans ETHONE...",workspace:"Espace de travail",synced:"Synchronisé à l'instant",offline:"Hors ligne",personal:"OS personnel",continueFocus:"Continuer le focus",askBrain:"Demander à Brain",brainAnalyzed:"Brain a analysé votre espace.",today:"Aujourd'hui",brainOS:"Brain OS",brainSub:"Votre journée, comprise et organisée.",summary:"Résumé du jour",globalState:"État général",recommendation:"Recommandation du jour",nextAction:"Prochaine action",why:"Pourquoi c'est important",reminders:"Rappels",open:"Ouvrir",focus:"Focus",objectives:"Objectifs",habits:"Habitudes",planning:"Planning",timeline:"Chronologie",workspacePanel:"Espace de travail",activity:"Activité et analyses",quick:"Actions rapides",quickHint:"Disponibles partout dans ETHONE",note:"Nouvelle note",task:"Nouvelle tâche",file:"Nouveau fichier",event:"Nouvel événement",market:"Marketplace",brain:"Brain",spaces:"Espaces",tasks:"Tâches",events:"Événements",notes:"Notes",files:"Fichiers",productivity:"Productivité",energy:"Énergie",load:"Charge",concentration:"Concentration",session:"Session active",online:"En ligne",noReminder:"Aucun rappel urgent.",noEvent:"Aucun événement à venir.",noRecent:"Aucune activité récente.",noGoal:"Aucun objectif actif.",noHabit:"Aucune habitude active.",calm:"Votre espace est calme. Brain reste disponible.",updated:"mis à jour",favorite:"Ajouter aux favoris",unfavorite:"Retirer des favoris"},
    en:{search:"Search ETHONE...",workspace:"Workspace",synced:"Synced just now",offline:"Offline",personal:"Personal OS",continueFocus:"Continue focus",askBrain:"Ask Brain",brainAnalyzed:"Brain analyzed your workspace.",today:"Today",brainOS:"Brain OS",brainSub:"Your day, understood and organized.",summary:"Today summary",globalState:"Overall state",recommendation:"Recommendation of the day",nextAction:"Next action",why:"Why it matters",reminders:"Reminders",open:"Open",focus:"Focus",objectives:"Goals",habits:"Habits",planning:"Planning",timeline:"Timeline",workspacePanel:"Workspace",activity:"Activity & insights",quick:"Quick actions",quickHint:"Available everywhere in ETHONE",note:"New note",task:"New task",file:"New file",event:"New event",market:"Marketplace",brain:"Brain",spaces:"Workspaces",tasks:"Tasks",events:"Events",notes:"Notes",files:"Files",productivity:"Productivity",energy:"Energy",load:"Load",concentration:"Concentration",session:"Active session",online:"Online",noReminder:"No urgent reminder.",noEvent:"No upcoming event.",noRecent:"No recent activity.",noGoal:"No active goal.",noHabit:"No active habit.",calm:"Your workspace is calm. Brain remains available.",updated:"updated",favorite:"Add to favorites",unfavorite:"Remove from favorites"},
    es:{search:"Buscar en ETHONE...",workspace:"Espacio de trabajo",synced:"Sincronizado ahora",offline:"Sin conexion",personal:"OS personal",continueFocus:"Continuar enfoque",askBrain:"Preguntar a Brain",brainAnalyzed:"Brain analizo tu espacio.",today:"Hoy",brainOS:"Brain OS",brainSub:"Tu dia, entendido y organizado.",summary:"Resumen de hoy",globalState:"Estado general",recommendation:"Recomendacion del dia",nextAction:"Siguiente accion",why:"Por que importa",reminders:"Recordatorios",open:"Abrir",focus:"Enfoque",objectives:"Objetivos",habits:"Habitos",planning:"Agenda",timeline:"Cronologia",workspacePanel:"Espacio de trabajo",activity:"Actividad y analisis",quick:"Acciones rapidas",quickHint:"Disponibles en todo ETHONE",note:"Nueva nota",task:"Nueva tarea",file:"Nuevo archivo",event:"Nuevo evento",market:"Marketplace",brain:"Brain",spaces:"Espacios",tasks:"Tareas",events:"Eventos",notes:"Notas",files:"Archivos",productivity:"Productividad",energy:"Energia",load:"Carga",concentration:"Concentracion",session:"Sesion activa",online:"En linea",noReminder:"Sin recordatorios urgentes.",noEvent:"Sin proximos eventos.",noRecent:"Sin actividad reciente.",noGoal:"Sin objetivo activo.",noHabit:"Sin habito activo.",calm:"Tu espacio esta tranquilo. Brain sigue disponible.",updated:"actualizado",favorite:"Anadir a favoritos",unfavorite:"Quitar de favoritos"},
    de:{search:"ETHONE durchsuchen...",workspace:"Arbeitsbereich",synced:"Gerade synchronisiert",offline:"Offline",personal:"Personliches OS",continueFocus:"Fokus fortsetzen",askBrain:"Brain fragen",brainAnalyzed:"Brain hat deinen Bereich analysiert.",today:"Heute",brainOS:"Brain OS",brainSub:"Dein Tag, verstanden und organisiert.",summary:"Tagesubersicht",globalState:"Gesamtstatus",recommendation:"Empfehlung des Tages",nextAction:"Nachste Aktion",why:"Warum es wichtig ist",reminders:"Erinnerungen",open:"Offnen",focus:"Fokus",objectives:"Ziele",habits:"Gewohnheiten",planning:"Planung",timeline:"Zeitleiste",workspacePanel:"Arbeitsbereich",activity:"Aktivitat & Einblicke",quick:"Schnellaktionen",quickHint:"Uberall in ETHONE verfugbar",note:"Neue Notiz",task:"Neue Aufgabe",file:"Neue Datei",event:"Neuer Termin",market:"Marketplace",brain:"Brain",spaces:"Bereiche",tasks:"Aufgaben",events:"Termine",notes:"Notizen",files:"Dateien",productivity:"Produktivitat",energy:"Energie",load:"Auslastung",concentration:"Konzentration",session:"Aktive Sitzung",online:"Online",noReminder:"Keine dringende Erinnerung.",noEvent:"Kein bevorstehender Termin.",noRecent:"Keine aktuelle Aktivitat.",noGoal:"Kein aktives Ziel.",noHabit:"Keine aktive Gewohnheit.",calm:"Dein Bereich ist ruhig. Brain bleibt verfugbar.",updated:"aktualisiert",favorite:"Zu Favoriten hinzufugen",unfavorite:"Aus Favoriten entfernen"}
  };
  function qs(s,r){return Core.dom.query(s,r)}
  function esc(v){return Core.dom.escapeHTML(v)}
  function lang(){var l=Language.current();return words[l]?l:"fr"}
  function tr(k){return words[lang()][k]||words.en[k]||k}
  function icon(name){return '<i data-lucide="'+name+'" aria-hidden="true"></i>'}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function state(){var p=profile();return p&&p.state?p.state:{}}
  function list(v){return Array.isArray(v)?v:[]}
  function titleOf(v,fallback){return v&&(v.text||v.title||v.name)||fallback}
  function workspaceName(){return Core.storage.get("ethone:active-workspace",tr("personal"))||tr("personal")}
  function phase(){
    var h=new Date().getHours(),l=lang();
    if(l==="fr")return h<5?"Bonne nuit":h<12?"Bonjour":h<18?"Bon apres-midi":"Bonsoir";
    if(l==="es")return h<5?"Buenas noches":h<12?"Buenos dias":h<18?"Buenas tardes":"Buenas noches";
    if(l==="de")return h<5?"Gute Nacht":h<12?"Guten Morgen":h<18?"Guten Tag":"Guten Abend";
    return h<5?"Good night":h<12?"Good morning":h<18?"Good afternoon":"Good evening";
  }
  function layoutPrefs(){
    return Object.assign({order:[],hidden:[],favorites:[]},Storage.getJSON("ethone:dashboard-v4-layout",{}));
  }
  function savePrefs(p){Storage.setJSON("ethone:dashboard-v4-layout",p)}
  function widgetHead(title,sub,iconName,id){
    return '<div class="d4-panel-head"><div class="d4-panel-title">'+icon(iconName)+'<div><h2>'+title+'</h2>'+(sub?'<p>'+sub+'</p>':"")+'</div></div><button class="d4-favorite" type="button" data-v4-favorite="'+id+'" aria-label="'+tr("favorite")+'">'+icon("star")+'</button></div>';
  }
  function quick(label,page,iconName){
    return '<button class="d4-quick-action" type="button" data-v4-page="'+page+'"><i>'+icon(iconName)+'</i><span>'+label+'</span></button>';
  }
  function markup(){
    return '<section class="vn-home vh-home d4-home" id="ethone-2026-home" data-vh-bound="1" data-lang="'+lang()+'">'+
      '<header class="d4-topbar"><button class="d4-search" type="button" data-v4-action="search" aria-label="'+tr("search")+'">'+icon("search")+'<span>'+tr("search")+'</span><kbd>Ctrl K</kbd></button><div class="d4-workspace">'+icon("layout-grid")+'<span id="vh-workspace-top">'+esc(workspaceName())+'</span></div><div class="d4-top-actions"><div class="d4-sync"><i class="d4-live-dot"></i><span id="vh-sync">'+tr("synced")+'</span></div><button class="d4-icon-button" type="button" data-v4-action="notifications" aria-label="Notifications">'+icon("bell")+'</button><button class="d4-avatar" type="button" data-v4-action="profile" id="vh-avatar" aria-label="Profile">E</button></div></header>'+
      '<div class="d4-command"><section class="d4-panel d4-hero d4-widget" data-widget-id="command"><span class="d4-drag" aria-hidden="true">'+icon("grip-vertical")+'</span><div class="d4-hero-copy"><h1 id="vh-greeting">ETHONE</h1><p>'+icon("brain")+'<span id="bh-hero-sentence">'+tr("brainAnalyzed")+'</span></p></div><div class="d4-session"><div><span class="d4-date" id="d4-date"></span><strong class="d4-time" id="d4-time"></strong></div><div class="d4-session-state"><span>'+icon("cloud")+'<b id="d4-session">'+tr("session")+'</b></span><span>'+icon("circle-dot")+'<b>'+tr("online")+'</b></span></div></div><div class="d4-hero-actions"><button class="d4-button primary" type="button" data-v4-page="todos">'+icon("arrow-right")+'<span>'+tr("continueFocus")+'</span></button><button class="d4-button" type="button" data-v4-page="ai">'+icon("brain")+'<span>'+tr("askBrain")+'</span></button></div></section>'+
      '<aside class="d4-panel d4-today d4-widget" data-widget-id="today">'+widgetHead(tr("today"),"", "sun","today")+'<div class="d4-today-block"><span class="d4-label">'+tr("focus")+'</span><div class="d4-today-line"><span id="d4-focus-copy">0m / 3h</span><strong id="d4-focus-pct">0%</strong></div><div class="d4-progress"><i id="d4-focus-bar" style="width:0%"></i></div></div><div class="d4-today-block"><span class="d4-label">'+tr("objectives")+'</span><div class="d4-mini-list" id="d4-goals"></div></div><div class="d4-today-block"><span class="d4-label">'+tr("habits")+'</span><div class="d4-mini-list" id="d4-habits"></div></div><div class="d4-today-block"><span class="d4-label">'+tr("planning")+'</span><div class="d4-mini-list" id="d4-planning"></div></div></aside>'+
      '<div class="d4-main"><section class="d4-panel d4-brain d4-widget" data-widget-id="brain"><span class="d4-drag" aria-hidden="true">'+icon("grip-vertical")+'</span>'+widgetHead(tr("brainOS"),tr("brainSub"),"brain-circuit","brain")+'<div class="d4-brain-grid"><div class="d4-brain-column d4-brain-status"><span class="d4-label">'+tr("summary")+'</span><div class="d4-brain-metrics"><div class="d4-brain-metric"><strong id="d4-task-count">0</strong><span>'+tr("tasks")+'</span></div><div class="d4-brain-metric"><strong id="d4-event-count">0</strong><span>'+tr("events")+'</span></div><div class="d4-brain-metric"><strong id="d4-focus-count">0m</strong><span>'+tr("focus")+'</span></div><div class="d4-brain-metric"><strong id="d4-habit-count">0 / 0</strong><span>'+tr("habits")+'</span></div></div><span class="d4-label">'+tr("globalState")+'</span><div id="d4-global-state"></div></div><div class="d4-brain-column d4-recommendation"><span class="d4-label">'+tr("recommendation")+'</span><p id="bh-summary-copy"></p><span class="d4-label">'+tr("nextAction")+'</span><div class="d4-next-action"><i></i><div><strong id="bh-action-title"></strong><span id="bh-action-context"></span></div><button class="d4-open-action" type="button" data-v4-page="todos">'+tr("open")+' '+icon("arrow-right")+'</button></div><p class="d4-explanation" id="bh-action-copy"></p></div><div class="d4-brain-column d4-reminders"><span class="d4-label">'+tr("reminders")+'</span><div id="bh-why-list"></div><button class="d4-view-link" type="button" data-v4-page="todos">'+tr("open")+' '+tr("reminders")+' '+icon("arrow-right")+'</button></div></div><div class="d4-compat"><div id="bh-priorities"></div><div id="bh-upcoming"></div><div id="bh-automation"></div><div id="bh-vision"></div><div id="bh-providers"></div><div id="bh-memory"></div><div id="bh-context-workspace"></div><div id="bh-context-schedule"></div><div id="bh-context-focus"></div><div id="bh-context-activity"></div></div></section></div></div>'+
      '<div class="d4-modules" id="d4-widget-grid"><section class="d4-panel d4-module d4-widget" data-widget-id="timeline"><span class="d4-drag" aria-hidden="true">'+icon("grip-vertical")+'</span>'+widgetHead(tr("timeline"),"", "calendar-clock","timeline")+'<div class="d4-module-body" id="d4-timeline"></div></section><section class="d4-panel d4-module d4-widget" data-widget-id="workspace"><span class="d4-drag" aria-hidden="true">'+icon("grip-vertical")+'</span>'+widgetHead(tr("workspacePanel"),"", "folder-kanban","workspace")+'<div class="d4-module-body"><div class="vh-list" id="bh-context-list"></div></div></section><section class="d4-panel d4-module d4-widget" data-widget-id="activity"><span class="d4-drag" aria-hidden="true">'+icon("grip-vertical")+'</span>'+widgetHead(tr("activity"),"", "chart-no-axes-combined","activity")+'<div class="d4-module-body"><div id="bh-insights"></div><div class="d4-insights-grid" id="d4-activity"></div></div></section></div>'+
      '<section class="d4-panel d4-quick"><div class="d4-quick-head"><h2>'+tr("quick")+'</h2><span>'+tr("quickHint")+'</span></div><div class="d4-quick-grid">'+quick(tr("note"),"notes","notebook-pen")+quick(tr("task"),"todos","circle-check")+quick(tr("file"),"files","file-plus-2")+quick(tr("event"),"calendar","calendar-plus")+quick(tr("market"),"marketplace","store")+quick(tr("brain"),"ai","brain")+quick(tr("spaces"),"workspaces","layout-grid")+'</div></section>'+
    '</section>';
  }
  function ensure(){
    var page=qs("#page-dashboard");if(!page)return null;
    var old=qs("#ethone-2026-home",page);
    if(old&&(!old.classList.contains("d4-home")||old.dataset.lang!==lang()))old.remove();
    var home=qs("#ethone-2026-home",page);
    if(!home){page.insertAdjacentHTML("afterbegin",markup());home=qs("#ethone-2026-home",page)}
    if(home&&!home.dataset.d4Bound){
      home.dataset.d4Bound="1";
      Events.listen(home,"click",function(e){
        var favorite=e.target.closest("[data-v4-favorite]");
        if(favorite){toggleFavorite(favorite.dataset.v4Favorite);return}
        var action=e.target.closest("[data-v4-action]");
        if(action){
          if(action.dataset.v4Action==="search"&&typeof window.openCmdPalette==="function")window.openCmdPalette();
          if(action.dataset.v4Action==="notifications")Notifications.toggle();
          if(action.dataset.v4Action==="profile")Navigation.profile();
          return;
        }
        var pageButton=e.target.closest("[data-v4-page]");
        if(pageButton)Navigation.go(pageButton.dataset.v4Page,null);
      },false,"dashboard-v4-actions");
    }
    applyLayout(home);
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
    return home;
  }
  function applyLayout(home){
    var prefs=layoutPrefs(),grid=qs("#d4-widget-grid",home);
    if(grid&&prefs.order.length)prefs.order.forEach(function(id){var w=qs('[data-widget-id="'+id+'"]',grid);if(w)grid.appendChild(w)});
    Array.prototype.forEach.call(home.querySelectorAll("[data-widget-id]"),function(w){
      var id=w.dataset.widgetId,hidden=prefs.hidden.indexOf(id)>-1,fav=prefs.favorites.indexOf(id)>-1;
      w.dataset.v4Hidden=hidden?"true":"false";
      var b=qs('[data-v4-favorite="'+id+'"]',w);
      if(b){b.classList.toggle("is-favorite",fav);b.setAttribute("aria-label",fav?tr("unfavorite"):tr("favorite"));b.setAttribute("aria-pressed",fav?"true":"false")}
    });
  }
  function toggleFavorite(id){
    var p=layoutPrefs(),i=p.favorites.indexOf(id);
    if(i>-1)p.favorites.splice(i,1);else p.favorites.push(id);
    savePrefs(p);var home=qs("#ethone-2026-home");if(home)applyLayout(home);
  }
  function clock(home){
    var now=new Date(),locale=lang()==="en"?"en-GB":lang()==="de"?"de-DE":lang()==="es"?"es-ES":"fr-FR";
    var date=qs("#d4-date",home),time=qs("#d4-time",home);
    if(date)date.textContent=now.toLocaleDateString(locale,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    if(time)time.textContent=now.toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"});
  }
  function percent(n,d){return d?Math.max(0,Math.min(100,Math.round(n/d*100))):0}
  function brainSentence(open,events,notes){
    if(open.length)return tr("brainAnalyzed")+" "+open.length+" "+tr("tasks").toLowerCase()+".";
    if(events.length)return tr("brainAnalyzed")+" "+events.length+" "+tr("events").toLowerCase()+".";
    if(notes.length)return tr("brainAnalyzed")+" "+notes.length+" "+tr("notes").toLowerCase()+".";
    return tr("calm");
  }
  function miniRows(items,type,empty){
    if(!items.length)return '<div class="d4-mini-row"><i>-</i><span>'+empty+'</span><small></small></div>';
    return items.slice(0,3).map(function(x){return '<div class="d4-mini-row"><i></i><span>'+esc(titleOf(x,type))+'</span><small>'+esc(x.progress!=null?x.progress+"%":x.time||x.date||"")+'</small></div>'}).join("");
  }
  function timelineRows(events,open){
    var rows=events.slice(0,3).map(function(e){return{time:e.time||e.date||tr("today"),title:titleOf(e,tr("events")),meta:e.duration||e.tag||tr("planning")}});
    if(rows.length<3)open.slice(0,3-rows.length).forEach(function(t){rows.push({time:t.due||tr("today"),title:titleOf(t,tr("tasks")),meta:t.priority||tr("focus")})});
    if(!rows.length)return '<div class="vh-empty">'+tr("noEvent")+'</div>';
    return rows.map(function(r){return '<div class="d4-timeline-row"><time>'+esc(r.time)+'</time><i class="d4-timeline-mark"></i><div><strong>'+esc(r.title)+'</strong><small>'+esc(r.meta)+'</small></div></div>'}).join("");
  }
  function workspaceRows(notes,items){
    var rows=notes.map(function(n){return{title:titleOf(n,tr("notes")),type:tr("notes"),icon:"notebook-pen"}}).concat(items.map(function(i){return{title:titleOf(i,tr("files")),type:i.type||tr("files"),icon:"file"}})).slice(0,5);
    if(!rows.length)return '<div class="vh-empty">'+tr("noRecent")+'</div>';
    return rows.map(function(r){return '<div class="vh-list-row"><i class="vh-list-icon">'+icon(r.icon)+'</i><div><strong>'+esc(r.title)+'</strong><small>'+esc(workspaceName())+' · '+esc(r.type)+'</small></div><span>'+tr("updated")+'</span></div>'}).join("");
  }
  function render(){
    var home=ensure();if(!home)return;
    var s=state(),p=profile(),todos=list(s.todos),notes=list(s.notes),items=list(s.items),events=list(s.events),habits=list(s.habits),goals=list(s.goals);
    var open=todos.filter(function(t){return !t.done}),done=todos.filter(function(t){return !!t.done}),habitDone=habits.filter(function(h){return h.done||h.completed});
    var focus=Number(s.focusMinutes||s.stats&&s.stats.focusMinutes||s.pomodoro&&s.pomodoro.totalMinutes||0),focusTarget=Number(s.focusTarget||180),focusPct=percent(focus,focusTarget);
    var name=(p&&p.name)||s.username||"ETHONE",rec=open[0]||events[0]||notes[0],recTitle=titleOf(rec,tr("calm"));
    qs("#vh-greeting",home).textContent=phase()+", "+name+".";
    qs("#bh-hero-sentence",home).textContent=brainSentence(open,events,notes);
    qs("#vh-workspace-top",home).textContent=workspaceName();
    qs("#vh-sync",home).textContent=navigator.onLine===false?tr("offline"):tr("synced");
    qs("#vh-avatar",home).textContent=String(name).trim().charAt(0).toUpperCase()||"E";
    qs("#d4-session",home).textContent=workspaceName();
    qs("#d4-task-count",home).textContent=open.length;
    qs("#d4-event-count",home).textContent=events.length;
    qs("#d4-focus-count",home).textContent=focus+"m";
    qs("#d4-habit-count",home).textContent=habitDone.length+" / "+habits.length;
    qs("#d4-focus-copy",home).textContent=focus+"m / "+focusTarget+"m";
    qs("#d4-focus-pct",home).textContent=focusPct+"%";
    qs("#d4-focus-bar",home).style.width=focusPct+"%";
    qs("#d4-goals",home).innerHTML=miniRows(goals,tr("objectives"),tr("noGoal"));
    qs("#d4-habits",home).innerHTML=miniRows(habits,tr("habits"),tr("noHabit"));
    qs("#d4-planning",home).innerHTML=miniRows(events,tr("events"),tr("noEvent"));
    qs("#bh-summary-copy",home).textContent=brainSentence(open,events,notes);
    qs("#bh-action-title",home).textContent=recTitle;
    qs("#bh-action-context",home).textContent=workspaceName()+" · "+(open[0]?tr("focus"):events[0]?tr("planning"):tr("brain"));
    qs("#bh-action-copy",home).textContent=open[0]?tr("continueFocus"):events[0]?tr("planning"):tr("calm");
    var reminderRows=open.slice(0,2).concat(events.slice(0,1));
    qs("#bh-why-list",home).innerHTML=reminderRows.length?reminderRows.map(function(x){return '<div class="bh-why-row"><i>✓</i><span>'+esc(titleOf(x,tr("reminders")))+'</span></div>'}).join(""):'<div class="bh-why-row"><i>✓</i><span>'+tr("noReminder")+'</span></div>';
    var productivity=percent(done.length,todos.length),habitPct=percent(habitDone.length,habits.length);
    qs("#d4-global-state",home).innerHTML=[[tr("productivity"),productivity],[tr("energy"),Math.min(100,35+focusPct)],[tr("load"),Math.min(100,open.length*12+events.length*8)],[tr("concentration"),Math.max(focusPct,habitPct)]].map(function(r){return '<div class="d4-state-row"><span>'+r[0]+'</span><div class="d4-progress"><i style="width:'+r[1]+'%"></i></div><strong>'+r[1]+'%</strong></div>'}).join("");
    qs("#d4-timeline",home).innerHTML=timelineRows(events,open);
    qs("#bh-context-list",home).innerHTML=workspaceRows(notes,items);
    qs("#bh-insights",home).innerHTML="";
    qs("#d4-activity",home).innerHTML='<div class="d4-insight-cell"><span>'+tr("focus")+'</span><strong>'+focus+'m</strong></div><div class="d4-insight-cell"><span>'+tr("tasks")+'</span><strong>'+done.length+" / "+todos.length+'</strong></div><div class="d4-insight-cell"><span>'+tr("habits")+'</span><strong>'+habitDone.length+" / "+habits.length+'</strong></div><div class="d4-insight-cell"><span>'+tr("files")+'</span><strong>'+items.length+'</strong></div>';
    clock(home);applyLayout(home);
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,80)}
  function boot(){
    document.body.classList.add("ethone-2026-ui","ethone-dashboard-v4");
    schedule();
    Events.listen(window,"storage",schedule,false,"dashboard-v4-storage");
    Events.listen(window,"online",schedule,false,"dashboard-v4-online");
    Events.listen(window,"offline",schedule,false,"dashboard-v4-offline");
    Events.listen(document,"visibilitychange",function(){if(!document.hidden)schedule()},false,"dashboard-v4-visibility");
    clearInterval(clockTimer);
    clockTimer=setInterval(function(){if(!document.hidden){var h=qs("#ethone-2026-home.d4-home");if(h)clock(h)}},60000);
    setTimeout(schedule,650);
    setTimeout(schedule,1900);
  }
  window.ethoneDashboardV4Render=render;
  if(window.ethoneRunWhenDashboardReady)window.ethoneRunWhenDashboardReady("dashboard-v4",boot);
  else if(document.readyState==="loading")Events.listen(document,"DOMContentLoaded",boot,{once:true},"dashboard-v4-boot");
  else boot();
})();
