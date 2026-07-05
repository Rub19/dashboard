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
  var lastRenderState={nextActionTarget:"todos",reminderTarget:"todos"};
  var editMode=false,workingPrefs=null;
  var RESIZE_MIN_COL=1,RESIZE_MAX_COL=6,RESIZE_MIN_ROW=1,RESIZE_MAX_ROW=3;
  var TYPE_CLASS={hero:"d4-hero",today:"d4-today",brain:"d4-brain",timeline:"d4-module",workspace:"d4-module",activity:"d4-module",quickActions:"d4-quick"};
  var DEFAULT_WIDGET_INSTANCES=[
    {instanceId:"command",type:"hero",size:{col:4,row:1},locked:false,config:{}},
    {instanceId:"today",type:"today",size:{col:2,row:2},locked:false,config:{}},
    {instanceId:"brain",type:"brain",size:{col:4,row:1},locked:false,config:{}},
    {instanceId:"timeline",type:"timeline",size:{col:2,row:1},locked:false,config:{}},
    {instanceId:"workspace",type:"workspace",size:{col:2,row:1},locked:false,config:{}},
    {instanceId:"activity",type:"activity",size:{col:2,row:1},locked:false,config:{}},
    {instanceId:"quickActions",type:"quickActions",size:{col:6,row:1},locked:false,config:{}}
  ];
  var words={
    fr:{search:"Rechercher dans ETHONE...",workspace:"Espace de travail",synced:"Synchronisé à l'instant",offline:"Hors ligne",personal:"OS personnel",continueFocus:"Voir mes tâches",askBrain:"Demander à Brain",editMode:"Mode édition",editReset:"Réinitialiser",editCancel:"Annuler",editSave:"Enregistrer",editToggleLabel:"Éditer le tableau de bord",layoutSaved:"Disposition enregistrée",comingSoon:"bientôt disponible",brainAnalyzed:"Brain a analysé votre espace.",today:"Aujourd'hui",brainOS:"Brain OS",brainSub:"Votre journée, comprise et organisée.",summary:"Résumé du jour",globalState:"État général",recommendation:"Recommandation du jour",nextAction:"Prochaine action",why:"Pourquoi c'est important",reminders:"Rappels",open:"Ouvrir",focus:"Focus",objectives:"Objectifs",habits:"Habitudes",planning:"Planning",timeline:"Chronologie",workspacePanel:"Espace de travail",activity:"Activité et analyses",quick:"Actions rapides",quickHint:"Disponibles partout dans ETHONE",note:"Nouvelle note",task:"Nouvelle tâche",file:"Nouveau fichier",event:"Nouvel événement",market:"Marketplace",brain:"Brain",spaces:"Espaces",tasks:"Tâches",events:"Événements",notes:"Notes",files:"Fichiers",productivity:"Productivité",energy:"Énergie",load:"Charge",concentration:"Concentration",session:"Session active",online:"En ligne",noReminder:"Aucun rappel urgent.",noEvent:"Aucun événement à venir.",noRecent:"Aucune activité récente.",noGoal:"Aucun objectif actif.",noHabit:"Aucune habitude active.",calm:"Votre espace est calme. Brain reste disponible.",updated:"mis à jour",favorite:"Ajouter aux favoris",unfavorite:"Retirer des favoris",addWidget:"Ajouter un widget",lock:"Verrouiller",unlock:"Déverrouiller",duplicate:"Dupliquer",delete:"Supprimer",hide:"Masquer",show:"Afficher",close:"Fermer",maxInstancesReached:"Un seul widget de ce type est autorisé"},
    en:{search:"Search ETHONE...",workspace:"Workspace",synced:"Synced just now",offline:"Offline",personal:"Personal OS",continueFocus:"View tasks",askBrain:"Ask Brain",editMode:"Edit mode",editReset:"Reset",editCancel:"Cancel",editSave:"Save",editToggleLabel:"Edit dashboard",layoutSaved:"Layout saved",comingSoon:"coming soon",brainAnalyzed:"Brain analyzed your workspace.",today:"Today",brainOS:"Brain OS",brainSub:"Your day, understood and organized.",summary:"Today summary",globalState:"Overall state",recommendation:"Recommendation of the day",nextAction:"Next action",why:"Why it matters",reminders:"Reminders",open:"Open",focus:"Focus",objectives:"Goals",habits:"Habits",planning:"Planning",timeline:"Timeline",workspacePanel:"Workspace",activity:"Activity & insights",quick:"Quick actions",quickHint:"Available everywhere in ETHONE",note:"New note",task:"New task",file:"New file",event:"New event",market:"Marketplace",brain:"Brain",spaces:"Workspaces",tasks:"Tasks",events:"Events",notes:"Notes",files:"Files",productivity:"Productivity",energy:"Energy",load:"Load",concentration:"Concentration",session:"Active session",online:"Online",noReminder:"No urgent reminder.",noEvent:"No upcoming event.",noRecent:"No recent activity.",noGoal:"No active goal.",noHabit:"No active habit.",calm:"Your workspace is calm. Brain remains available.",updated:"updated",favorite:"Add to favorites",unfavorite:"Remove from favorites",addWidget:"Add widget",lock:"Lock",unlock:"Unlock",duplicate:"Duplicate",delete:"Delete",hide:"Hide",show:"Show",close:"Close",maxInstancesReached:"Only one widget of this type is allowed"},
    es:{search:"Buscar en ETHONE...",workspace:"Espacio de trabajo",synced:"Sincronizado ahora",offline:"Sin conexion",personal:"OS personal",continueFocus:"Ver mis tareas",askBrain:"Preguntar a Brain",editMode:"Modo edicion",editReset:"Restablecer",editCancel:"Cancelar",editSave:"Guardar",editToggleLabel:"Editar panel",layoutSaved:"Diseno guardado",comingSoon:"proximamente",brainAnalyzed:"Brain analizo tu espacio.",today:"Hoy",brainOS:"Brain OS",brainSub:"Tu dia, entendido y organizado.",summary:"Resumen de hoy",globalState:"Estado general",recommendation:"Recomendacion del dia",nextAction:"Siguiente accion",why:"Por que importa",reminders:"Recordatorios",open:"Abrir",focus:"Enfoque",objectives:"Objetivos",habits:"Habitos",planning:"Agenda",timeline:"Cronologia",workspacePanel:"Espacio de trabajo",activity:"Actividad y analisis",quick:"Acciones rapidas",quickHint:"Disponibles en todo ETHONE",note:"Nueva nota",task:"Nueva tarea",file:"Nuevo archivo",event:"Nuevo evento",market:"Marketplace",brain:"Brain",spaces:"Espacios",tasks:"Tareas",events:"Eventos",notes:"Notas",files:"Archivos",productivity:"Productividad",energy:"Energia",load:"Carga",concentration:"Concentracion",session:"Sesion activa",online:"En linea",noReminder:"Sin recordatorios urgentes.",noEvent:"Sin proximos eventos.",noRecent:"Sin actividad reciente.",noGoal:"Sin objetivo activo.",noHabit:"Sin habito activo.",calm:"Tu espacio esta tranquilo. Brain sigue disponible.",updated:"actualizado",favorite:"Anadir a favoritos",unfavorite:"Quitar de favoritos",addWidget:"Anadir widget",lock:"Bloquear",unlock:"Desbloquear",duplicate:"Duplicar",delete:"Eliminar",hide:"Ocultar",show:"Mostrar",close:"Cerrar",maxInstancesReached:"Solo se permite un widget de este tipo"},
    de:{search:"ETHONE durchsuchen...",workspace:"Arbeitsbereich",synced:"Gerade synchronisiert",offline:"Offline",personal:"Personliches OS",continueFocus:"Aufgaben ansehen",askBrain:"Brain fragen",editMode:"Bearbeitungsmodus",editReset:"Zurucksetzen",editCancel:"Abbrechen",editSave:"Speichern",editToggleLabel:"Dashboard bearbeiten",layoutSaved:"Layout gespeichert",comingSoon:"bald verfugbar",brainAnalyzed:"Brain hat deinen Bereich analysiert.",today:"Heute",brainOS:"Brain OS",brainSub:"Dein Tag, verstanden und organisiert.",summary:"Tagesubersicht",globalState:"Gesamtstatus",recommendation:"Empfehlung des Tages",nextAction:"Nachste Aktion",why:"Warum es wichtig ist",reminders:"Erinnerungen",open:"Offnen",focus:"Fokus",objectives:"Ziele",habits:"Gewohnheiten",planning:"Planung",timeline:"Zeitleiste",workspacePanel:"Arbeitsbereich",activity:"Aktivitat & Einblicke",quick:"Schnellaktionen",quickHint:"Uberall in ETHONE verfugbar",note:"Neue Notiz",task:"Neue Aufgabe",file:"Neue Datei",event:"Neuer Termin",market:"Marketplace",brain:"Brain",spaces:"Bereiche",tasks:"Aufgaben",events:"Termine",notes:"Notizen",files:"Dateien",productivity:"Produktivitat",energy:"Energie",load:"Auslastung",concentration:"Konzentration",session:"Aktive Sitzung",online:"Online",noReminder:"Keine dringende Erinnerung.",noEvent:"Kein bevorstehender Termin.",noRecent:"Keine aktuelle Aktivitat.",noGoal:"Kein aktives Ziel.",noHabit:"Keine aktive Gewohnheit.",calm:"Dein Bereich ist ruhig. Brain bleibt verfugbar.",updated:"aktualisiert",favorite:"Zu Favoriten hinzufugen",unfavorite:"Aus Favoriten entfernen",addWidget:"Widget hinzufugen",lock:"Sperren",unlock:"Entsperren",duplicate:"Duplizieren",delete:"Loschen",hide:"Ausblenden",show:"Einblenden",close:"Schliessen",maxInstancesReached:"Nur ein Widget dieses Typs ist erlaubt"}
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
  function setText(sel,root,val){var el=qs(sel,root);if(el)el.textContent=val}
  function setHTML(sel,root,val){var el=qs(sel,root);if(el)el.innerHTML=val}
  function setWidth(sel,root,val){var el=qs(sel,root);if(el)el.style.width=val}
  function phase(){
    var h=new Date().getHours(),l=lang();
    if(l==="fr")return h<5?"Bonne nuit":h<12?"Bonjour":h<18?"Bon apres-midi":"Bonsoir";
    if(l==="es")return h<5?"Buenas noches":h<12?"Buenos dias":h<18?"Buenas tardes":"Buenas noches";
    if(l==="de")return h<5?"Gute Nacht":h<12?"Guten Morgen":h<18?"Guten Tag":"Guten Abend";
    return h<5?"Good night":h<12?"Good morning":h<18?"Good afternoon":"Good evening";
  }

  // ── Layout persistence + migration ──────────────────────────────────
  function defaultsById(){
    var m={};DEFAULT_WIDGET_INSTANCES.forEach(function(w){m[w.instanceId]=w});
    return m;
  }
  function migrateLayoutPrefs(raw){
    if(raw&&raw.version===2&&Array.isArray(raw.instances))return raw;
    var legacyOrder=(raw&&Array.isArray(raw.order))?raw.order:[];
    var legacyHidden=(raw&&Array.isArray(raw.hidden))?raw.hidden:[];
    var legacyFavorites=(raw&&Array.isArray(raw.favorites))?raw.favorites:[];
    var byId=defaultsById();
    var baseIds=legacyOrder.length?legacyOrder:DEFAULT_WIDGET_INSTANCES.map(function(w){return w.instanceId});
    var instances=baseIds.map(function(id){
      var d=byId[id];
      return d?JSON.parse(JSON.stringify(d)):{instanceId:id,type:id,size:{col:2,row:1},locked:false,config:{}};
    });
    if(!instances.some(function(w){return w.instanceId==="quickActions"}))instances.push(JSON.parse(JSON.stringify(byId.quickActions)));
    return{version:2,instances:instances,hidden:legacyHidden.slice(),favorites:legacyFavorites.slice()};
  }
  function layoutPrefs(){
    var raw=Storage.getJSON("ethone:dashboard-v4-layout",{});
    return migrateLayoutPrefs(raw);
  }
  function savePrefs(p){Storage.setJSON("ethone:dashboard-v4-layout",p)}

  // ── Markup helpers ───────────────────────────────────────────────────
  function widgetHead(title,sub,iconName){
    return '<div class="d4-panel-head"><div class="d4-panel-title">'+icon(iconName)+'<div><h2>'+title+'</h2>'+(sub?'<p>'+sub+'</p>':"")+'</div></div></div>';
  }
  function quick(label,actionId,iconName,enabled){
    var dis=enabled===false;
    return '<button class="d4-quick-action'+(dis?' is-disabled':'')+'" type="button" data-v4-action-id="'+actionId+'"'+(dis?' aria-disabled="true"':'')+'><i>'+icon(iconName)+'</i><span>'+label+'</span></button>';
  }
  function heroInnerHTML(){
    return '<div class="d4-hero-copy"><h1 id="vh-greeting">ETHONE</h1><p>'+icon("brain")+'<span id="bh-hero-sentence">'+tr("brainAnalyzed")+'</span></p></div><div class="d4-session"><div><span class="d4-date" id="d4-date"></span><strong class="d4-time" id="d4-time"></strong></div><div class="d4-session-state"><span>'+icon("cloud")+'<b id="d4-session">'+tr("session")+'</b></span><span>'+icon("circle-dot")+'<b>'+tr("online")+'</b></span></div></div><div class="d4-hero-actions"><button class="d4-button primary" type="button" data-v4-action-id="dashboard.hero.continueFocus">'+icon("arrow-right")+'<span>'+tr("continueFocus")+'</span></button><button class="d4-button" type="button" data-v4-action-id="dashboard.hero.askBrain">'+icon("brain")+'<span>'+tr("askBrain")+'</span></button></div>';
  }
  function todayInnerHTML(){
    return widgetHead(tr("today"),"","sun")+'<div class="d4-today-block"><span class="d4-label">'+tr("focus")+'</span><div class="d4-today-line"><span id="d4-focus-copy">0m / 3h</span><strong id="d4-focus-pct">0%</strong></div><div class="d4-progress"><i id="d4-focus-bar" style="width:0%"></i></div></div><div class="d4-today-block"><span class="d4-label">'+tr("objectives")+'</span><div class="d4-mini-list" id="d4-goals"></div></div><div class="d4-today-block"><span class="d4-label">'+tr("habits")+'</span><div class="d4-mini-list" id="d4-habits"></div></div><div class="d4-today-block"><span class="d4-label">'+tr("planning")+'</span><div class="d4-mini-list" id="d4-planning"></div></div>';
  }
  function brainInnerHTML(){
    return widgetHead(tr("brainOS"),tr("brainSub"),"brain-circuit")+'<div class="d4-brain-grid"><div class="d4-brain-column d4-brain-status"><span class="d4-label">'+tr("summary")+'</span><div class="d4-brain-metrics"><div class="d4-brain-metric"><strong id="d4-task-count">0</strong><span>'+tr("tasks")+'</span></div><div class="d4-brain-metric"><strong id="d4-event-count">0</strong><span>'+tr("events")+'</span></div><div class="d4-brain-metric"><strong id="d4-focus-count">0m</strong><span>'+tr("focus")+'</span></div><div class="d4-brain-metric"><strong id="d4-habit-count">0 / 0</strong><span>'+tr("habits")+'</span></div></div><span class="d4-label">'+tr("globalState")+'</span><div id="d4-global-state"></div></div><div class="d4-brain-column d4-recommendation"><span class="d4-label">'+tr("recommendation")+'</span><p id="bh-summary-copy"></p><span class="d4-label">'+tr("nextAction")+'</span><div class="d4-next-action"><i></i><div><strong id="bh-action-title"></strong><span id="bh-action-context"></span></div><button class="d4-open-action" type="button" data-v4-action-id="dashboard.brain.openNextAction">'+tr("open")+' '+icon("arrow-right")+'</button></div><p class="d4-explanation" id="bh-action-copy"></p></div><div class="d4-brain-column d4-reminders"><span class="d4-label">'+tr("reminders")+'</span><div id="bh-why-list"></div><button class="d4-view-link" type="button" data-v4-action-id="dashboard.brain.openReminders">'+tr("open")+' '+tr("reminders")+' '+icon("arrow-right")+'</button></div></div><div class="d4-compat"><div id="bh-priorities"></div><div id="bh-upcoming"></div><div id="bh-automation"></div><div id="bh-vision"></div><div id="bh-providers"></div><div id="bh-memory"></div><div id="bh-context-workspace"></div><div id="bh-context-schedule"></div><div id="bh-context-focus"></div><div id="bh-context-activity"></div></div>';
  }
  function timelineInnerHTML(){
    return widgetHead(tr("timeline"),"","calendar-clock")+'<div class="d4-module-body" id="d4-timeline"></div>';
  }
  function workspaceInnerHTML(){
    return widgetHead(tr("workspacePanel"),"","folder-kanban")+'<div class="d4-module-body"><div class="vh-list" id="bh-context-list"></div></div>';
  }
  function activityInnerHTML(){
    return widgetHead(tr("activity"),"","chart-no-axes-combined")+'<div class="d4-module-body"><div id="bh-insights"></div><div class="d4-insights-grid" id="d4-activity"></div></div>';
  }
  function quickActionsInnerHTML(){
    return '<div class="d4-quick-head"><h2>'+tr("quick")+'</h2><span>'+tr("quickHint")+'</span></div><div class="d4-quick-grid">'+quick(tr("note"),"dashboard.nav.notes","notebook-pen")+quick(tr("task"),"dashboard.nav.todos","circle-check")+quick(tr("file"),"dashboard.nav.files","file-plus-2")+quick(tr("event"),"dashboard.nav.calendar","calendar-plus")+quick(tr("market"),"dashboard.nav.marketplace","store",false)+quick(tr("brain"),"dashboard.nav.ai","brain")+quick(tr("spaces"),"dashboard.nav.workspaces","layout-grid",false)+'</div>';
  }
  function registerCoreWidgetTypes(){
    var Widgets=App.get("widgets");
    if(!Widgets||window.__ethoneD4CoreWidgetsRegistered)return;
    window.__ethoneD4CoreWidgetsRegistered=true;
    window.__ethoneWidgetCatalogTypes=window.__ethoneWidgetCatalogTypes||[];
    function reg(type,def){if(Widgets.register(type,def))window.__ethoneWidgetCatalogTypes.push(type)}
    reg("hero",{label:"Hero",icon:"layout-dashboard",category:"core",defaultSize:{col:4,row:1},minSize:{col:2,row:1},maxSize:{col:6,row:2},maxInstances:1,hiddenFromPicker:true,
      mount:function(container){container.innerHTML=heroInnerHTML()},unmount:function(container){container.innerHTML=""}});
    reg("today",{label:tr("today"),icon:"sun",category:"core",defaultSize:{col:2,row:2},minSize:{col:1,row:1},maxSize:{col:3,row:3},maxInstances:1,hiddenFromPicker:true,
      mount:function(container){container.innerHTML=todayInnerHTML()},unmount:function(container){container.innerHTML=""}});
    reg("brain",{label:tr("brainOS"),icon:"brain-circuit",category:"productivity",defaultSize:{col:4,row:1},minSize:{col:2,row:1},maxSize:{col:6,row:2},maxInstances:1,
      mount:function(container){container.innerHTML=brainInnerHTML()},unmount:function(container){container.innerHTML=""}});
    reg("timeline",{label:tr("timeline"),icon:"calendar-clock",category:"info",defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:4,row:2},maxInstances:1,hiddenFromPicker:true,
      mount:function(container){container.innerHTML=timelineInnerHTML()},unmount:function(container){container.innerHTML=""}});
    reg("workspace",{label:tr("workspacePanel"),icon:"folder-kanban",category:"info",defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:4,row:2},maxInstances:1,hiddenFromPicker:true,
      mount:function(container){container.innerHTML=workspaceInnerHTML()},unmount:function(container){container.innerHTML=""}});
    reg("activity",{label:tr("activity"),icon:"chart-no-axes-combined",category:"info",defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:4,row:2},maxInstances:1,hiddenFromPicker:true,
      mount:function(container){container.innerHTML=activityInnerHTML()},unmount:function(container){container.innerHTML=""}});
    reg("quickActions",{label:tr("quick"),icon:"zap",category:"actions",defaultSize:{col:6,row:1},minSize:{col:2,row:1},maxSize:{col:6,row:1},maxInstances:1,
      mount:function(container){container.innerHTML=quickActionsInnerHTML()},unmount:function(container){container.innerHTML=""}});
  }

  // ── Widget shell + instance rendering ───────────────────────────────
  function widgetShell(inst){
    var extra=TYPE_CLASS[inst.type]||"";
    var locked=!!inst.locked;
    return '<section class="d4-panel d4-widget'+(extra?" "+extra:"")+(locked?" d4-locked":"")+'" data-widget-id="'+esc(inst.instanceId)+'" data-widget-type="'+esc(inst.type)+'" draggable="'+(locked?"false":"true")+'" style="grid-column:span '+inst.size.col+';grid-row:span '+inst.size.row+'">'+
      '<span class="d4-drag" aria-hidden="true">'+icon("grip-vertical")+'</span>'+
      '<div class="d4-widget-toolbar">'+
        '<button class="d4-favorite" type="button" data-v4-favorite="'+esc(inst.instanceId)+'" aria-label="'+tr("favorite")+'">'+icon("star")+'</button>'+
        '<button class="d4-widget-btn" type="button" data-v4-action-id="dashboard.widget.lock" data-widget-id="'+esc(inst.instanceId)+'" aria-label="'+tr(locked?"unlock":"lock")+'">'+icon(locked?"lock":"lock-open")+'</button>'+
        '<button class="d4-widget-btn" type="button" data-v4-action-id="dashboard.widget.duplicate" data-widget-id="'+esc(inst.instanceId)+'" aria-label="'+tr("duplicate")+'">'+icon("copy")+'</button>'+
        '<button class="d4-widget-btn" type="button" data-v4-action-id="dashboard.widget.hide" data-widget-id="'+esc(inst.instanceId)+'" aria-label="'+tr("hide")+'">'+icon("eye-off")+'</button>'+
        '<button class="d4-widget-btn danger" type="button" data-v4-action-id="dashboard.widget.delete" data-widget-id="'+esc(inst.instanceId)+'" aria-label="'+tr("delete")+'">'+icon("trash-2")+'</button>'+
      '</div>'+
      '<div class="d4-widget-body" data-widget-mount="'+esc(inst.instanceId)+'"></div>'+
      '<span class="d4-resize-handle" aria-hidden="true"></span>'+
    '</section>';
  }
  function renderWidgetInstances(home,prefs){
    var grid=qs("#d4-widget-grid",home);if(!grid)return;
    var Widgets=App.get("widgets");if(!Widgets)return;
    var existing={};
    Array.prototype.forEach.call(grid.children,function(el){existing[el.dataset.widgetId]=el});
    var seen={};
    prefs.instances.forEach(function(inst){
      seen[inst.instanceId]=true;
      var cat=Widgets.get(inst.type);
      var el=existing[inst.instanceId];
      if(!el){
        grid.insertAdjacentHTML("beforeend",widgetShell(inst));
        el=grid.lastElementChild;
        var mountEl=el?qs("[data-widget-mount]",el):null;
        if(cat&&typeof cat.mount==="function"&&mountEl)cat.mount(mountEl,{instanceId:inst.instanceId,config:inst.config||{},home:home});
      }else{
        el.style.gridColumn="span "+inst.size.col;
        el.style.gridRow="span "+inst.size.row;
        el.classList.toggle("d4-locked",!!inst.locked);
        el.setAttribute("draggable",inst.locked?"false":"true");
        var lockBtn=qs('[data-v4-action-id="dashboard.widget.lock"]',el);
        if(lockBtn){lockBtn.setAttribute("aria-label",tr(inst.locked?"unlock":"lock"));lockBtn.innerHTML=icon(inst.locked?"lock":"lock-open")}
        grid.appendChild(el);
      }
    });
    Object.keys(existing).forEach(function(id){
      if(seen[id])return;
      var el=existing[id];
      var cat=Widgets.get(el.dataset.widgetType);
      var mountEl=qs("[data-widget-mount]",el);
      if(cat&&typeof cat.unmount==="function"&&mountEl)cat.unmount(mountEl);
      el.remove();
    });
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function applyLayout(home,overridePrefs){
    var prefs=overridePrefs||layoutPrefs();
    renderWidgetInstances(home,prefs);
    var grid=qs("#d4-widget-grid",home);
    Array.prototype.forEach.call(grid?grid.querySelectorAll("[data-widget-id]"):[],function(w){
      var id=w.dataset.widgetId,hidden=prefs.hidden.indexOf(id)>-1,fav=prefs.favorites.indexOf(id)>-1;
      w.dataset.v4Hidden=hidden?"true":"false";
      var b=qs('[data-v4-favorite="'+id+'"]',w);
      if(b){b.classList.toggle("is-favorite",fav);b.setAttribute("aria-label",fav?tr("unfavorite"):tr("favorite"));b.setAttribute("aria-pressed",fav?"true":"false")}
    });
  }
  function toggleFavorite(id){
    var p=layoutPrefs(),i=p.favorites.indexOf(id);
    if(i>-1)p.favorites.splice(i,1);else p.favorites.push(id);
    savePrefs(p);var home=qs("#ethone-2026-home");if(home)applyLayout(home,editMode?workingPrefs:null);
  }

  // ── Drag reorder ─────────────────────────────────────────────────────
  function bindDragAndDrop(home){
    var grid=qs("#d4-widget-grid",home);
    if(!grid)return;
    var dragEl=null;
    function cleanupDrag(){
      if(dragEl)dragEl.classList.remove("d4-dragging");
      Array.prototype.forEach.call(grid.querySelectorAll(".d4-drag-over"),function(w){w.classList.remove("d4-drag-over")});
      dragEl=null;
    }
    Events.listen(grid,"dragstart",function(e){
      if(!document.body.classList.contains("d4-editing")){e.preventDefault();return}
      var widget=e.target.closest(".d4-widget");
      if(!widget||!grid.contains(widget)||widget.classList.contains("d4-locked")){e.preventDefault();return}
      dragEl=widget;
      e.dataTransfer.setData("text/plain",widget.dataset.widgetId);
      e.dataTransfer.effectAllowed="move";
      widget.classList.add("d4-dragging");
    },false,"dashboard-v4-dragstart");
    Events.listen(grid,"dragover",function(e){
      if(!document.body.classList.contains("d4-editing")||!dragEl)return;
      var widget=e.target.closest(".d4-widget");
      if(!widget||!grid.contains(widget)||widget===dragEl)return;
      e.preventDefault();
      widget.classList.add("d4-drag-over");
    },false,"dashboard-v4-dragover");
    Events.listen(grid,"dragleave",function(e){
      var widget=e.target.closest(".d4-widget");
      if(widget)widget.classList.remove("d4-drag-over");
    },false,"dashboard-v4-dragleave");
    Events.listen(grid,"drop",function(e){
      if(!document.body.classList.contains("d4-editing")||!dragEl)return;
      e.preventDefault();
      var widget=e.target.closest(".d4-widget");
      if(!widget||!grid.contains(widget)||widget===dragEl){cleanupDrag();return}
      if(!workingPrefs)workingPrefs=layoutPrefs();
      var fromIdx=workingPrefs.instances.findIndex(function(w){return w.instanceId===dragEl.dataset.widgetId});
      var toIdx=workingPrefs.instances.findIndex(function(w){return w.instanceId===widget.dataset.widgetId});
      if(fromIdx>-1&&toIdx>-1){
        var moved=workingPrefs.instances.splice(fromIdx,1)[0];
        workingPrefs.instances.splice(toIdx,0,moved);
        applyLayout(home,workingPrefs);
      }
      cleanupDrag();
    },false,"dashboard-v4-drop");
    Events.listen(grid,"dragend",cleanupDrag,false,"dashboard-v4-dragend");
  }

  // ── Resize (mousedown/mousemove/mouseup, RAF-throttled) ─────────────
  function bindWidgetResize(home){
    var grid=qs("#d4-widget-grid",home);if(!grid)return;
    var dragging=null,startX=0,startY=0,startCol=1,startRow=1,pending=null,raf=null,trackW=100,trackH=60;
    function flush(){
      raf=null;if(!pending||!dragging)return;
      dragging.style.gridColumn="span "+pending.col;
      dragging.style.gridRow="span "+pending.row;
    }
    Events.listen(grid,"mousedown",function(e){
      var handle=e.target.closest(".d4-resize-handle");if(!handle)return;
      if(!document.body.classList.contains("d4-editing"))return;
      var widget=handle.closest(".d4-widget");if(!widget||widget.classList.contains("d4-locked"))return;
      if(!workingPrefs)workingPrefs=layoutPrefs();
      var inst=workingPrefs.instances.find(function(w){return w.instanceId===widget.dataset.widgetId});
      if(!inst||inst.locked)return;
      dragging=widget;startX=e.clientX;startY=e.clientY;
      startCol=inst.size.col;startRow=inst.size.row;
      trackW=grid.clientWidth/6;
      trackH=Math.max(40,widget.getBoundingClientRect().height/Math.max(1,startRow));
      widget.classList.add("d4-resizing");
      document.body.style.userSelect="none";document.body.style.cursor="nwse-resize";
      e.preventDefault();
    },false,"dashboard-v4-resize-mousedown");
    Events.listen(document,"mousemove",function(e){
      if(!dragging)return;
      var dCol=Math.round((e.clientX-startX)/trackW);
      var dRow=Math.round((e.clientY-startY)/trackH);
      var col=Math.max(RESIZE_MIN_COL,Math.min(RESIZE_MAX_COL,startCol+dCol));
      var row=Math.max(RESIZE_MIN_ROW,Math.min(RESIZE_MAX_ROW,startRow+dRow));
      var Widgets=App.get("widgets"),cat=Widgets?Widgets.get(dragging.dataset.widgetType):null;
      if(cat&&cat.minSize){col=Math.max(cat.minSize.col,col);row=Math.max(cat.minSize.row,row)}
      if(cat&&cat.maxSize){col=Math.min(cat.maxSize.col,col);row=Math.min(cat.maxSize.row,row)}
      pending={col:col,row:row};
      if(raf==null)raf=requestAnimationFrame(flush);
    },false,"dashboard-v4-resize-mousemove");
    Events.listen(document,"mouseup",function(){
      if(!dragging)return;
      if(raf!=null){cancelAnimationFrame(raf);raf=null}
      if(pending&&workingPrefs){
        var inst=workingPrefs.instances.find(function(w){return w.instanceId===dragging.dataset.widgetId});
        if(inst)inst.size={col:pending.col,row:pending.row};
      }
      dragging.classList.remove("d4-resizing");
      document.body.style.userSelect="";document.body.style.cursor="";
      var home2=qs("#ethone-2026-home");
      var target=dragging;dragging=null;pending=null;
      if(home2&&workingPrefs)applyLayout(home2,workingPrefs);
    },false,"dashboard-v4-resize-mouseup");
  }

  // ── Widget picker ────────────────────────────────────────────────────
  function pickerTile(type,cat){
    if(!cat)return "";
    var count=((workingPrefs&&workingPrefs.instances)||[]).filter(function(w){return w.type===type}).length;
    var atMax=count>=(cat.maxInstances||Infinity);
    return '<button class="d4-picker-tile'+(atMax?" is-disabled":"")+'" type="button" data-v4-action-id="dashboard.edit.addWidgetType" data-widget-type="'+esc(type)+'"'+(atMax?' aria-disabled="true"':"")+'>'+
      '<i>'+icon(cat.icon||"square")+'</i><strong>'+esc(cat.label||type)+'</strong>'+
    '</button>';
  }
  function openWidgetPicker(home){
    closeWidgetPicker();
    var Widgets=App.get("widgets");if(!Widgets)return;
    if(!workingPrefs)workingPrefs=layoutPrefs();
    var types=(window.__ethoneWidgetCatalogTypes||[]).filter(function(t){var c=Widgets.get(t);return c&&!c.hiddenFromPicker});
    var tiles=types.map(function(t){return pickerTile(t,Widgets.get(t))}).join("");
    home.insertAdjacentHTML("beforeend",'<div class="d4-picker-overlay" id="d4-widget-picker"><div class="d4-panel d4-picker"><div class="d4-panel-head"><div class="d4-panel-title"><h2>'+tr("addWidget")+'</h2></div><button class="d4-icon-button" type="button" data-v4-action-id="dashboard.edit.closePicker" aria-label="'+tr("close")+'">'+icon("x")+'</button></div><div class="d4-picker-grid">'+tiles+'</div></div></div>');
    var overlay=qs("#d4-widget-picker",home);
    if(overlay)Events.listen(overlay,"click",function(e){if(e.target===overlay)closeWidgetPicker()},false,"d4-picker-overlay-click");
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function closeWidgetPicker(){
    var el=qs("#d4-widget-picker");
    if(el)el.remove();
  }

  // ── Markup + boot ────────────────────────────────────────────────────
  function markup(){
    return '<section class="vn-home vh-home d4-home" id="ethone-2026-home" data-vh-bound="1" data-lang="'+lang()+'">'+
      '<header class="d4-topbar"><button class="d4-search" type="button" data-v4-action-id="dashboard.action.search" aria-label="'+tr("search")+'">'+icon("search")+'<span>'+tr("search")+'</span><kbd>Ctrl K</kbd></button><div class="d4-workspace">'+icon("layout-grid")+'<span id="vh-workspace-top">'+esc(workspaceName())+'</span></div><div class="d4-top-actions"><div class="d4-sync"><i class="d4-live-dot"></i><span id="vh-sync">'+tr("synced")+'</span></div><button class="d4-icon-button" type="button" data-v4-action-id="dashboard.action.notifications" aria-label="Notifications">'+icon("bell")+'</button><button class="d4-icon-button" type="button" data-v4-action-id="dashboard.edit.toggle" id="d4-edit-toggle" aria-label="'+tr("editToggleLabel")+'" aria-pressed="false">'+icon("layout-dashboard")+'</button><button class="d4-avatar" type="button" data-v4-action-id="dashboard.action.profile" id="vh-avatar" aria-label="Profile">E</button></div></header>'+
      '<div class="d4-editbar" id="d4-editbar" hidden><span class="d4-editbar-title">'+icon("move")+tr("editMode")+'</span><div class="d4-editbar-actions"><button class="d4-editbar-btn" type="button" data-v4-action-id="dashboard.edit.addWidget">'+icon("plus")+tr("addWidget")+'</button><button class="d4-editbar-btn" type="button" data-v4-action-id="dashboard.edit.reset">'+tr("editReset")+'</button><button class="d4-editbar-btn" type="button" data-v4-action-id="dashboard.edit.cancel">'+tr("editCancel")+'</button><button class="d4-editbar-btn primary" type="button" data-v4-action-id="dashboard.edit.save">'+tr("editSave")+'</button></div></div>'+
      '<div class="d4-widgetgrid" id="d4-widget-grid"></div>'+
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
        var actionEl=e.target.closest("[data-v4-action-id]");
        if(actionEl){
          var Actions=App.get("actions");
          if(Actions)Actions.dispatch(actionEl.dataset.v4ActionId,{el:actionEl,home:home});
          return;
        }
      },false,"dashboard-v4-actions");
      Events.listen(document,"keydown",function(e){
        if(e.key==="Escape"&&qs("#d4-widget-picker"))closeWidgetPicker();
      },false,"dashboard-v4-picker-escape");
      bindDragAndDrop(home);
      bindWidgetResize(home);
    }
    applyLayout(home,editMode?workingPrefs:null);
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
    return home;
  }

  function clock(home){
    var now=new Date(),locale=lang()==="en"?"en-GB":lang()==="de"?"de-DE":lang()==="es"?"es-ES":"fr-FR";
    setText("#d4-date",home,now.toLocaleDateString(locale,{weekday:"long",day:"numeric",month:"long",year:"numeric"}));
    setText("#d4-time",home,now.toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"}));
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
    lastRenderState.nextActionTarget=open[0]?"todos":events[0]?"calendar":notes[0]?"notes":"todos";
    setText("#vh-greeting",home,phase()+", "+name+".");
    setText("#bh-hero-sentence",home,brainSentence(open,events,notes));
    setText("#vh-workspace-top",home,workspaceName());
    setText("#vh-sync",home,navigator.onLine===false?tr("offline"):tr("synced"));
    setText("#vh-avatar",home,String(name).trim().charAt(0).toUpperCase()||"E");
    setText("#d4-session",home,workspaceName());
    setText("#d4-task-count",home,open.length);
    setText("#d4-event-count",home,events.length);
    setText("#d4-focus-count",home,focus+"m");
    setText("#d4-habit-count",home,habitDone.length+" / "+habits.length);
    setText("#d4-focus-copy",home,focus+"m / "+focusTarget+"m");
    setText("#d4-focus-pct",home,focusPct+"%");
    setWidth("#d4-focus-bar",home,focusPct+"%");
    setHTML("#d4-goals",home,miniRows(goals,tr("objectives"),tr("noGoal")));
    setHTML("#d4-habits",home,miniRows(habits,tr("habits"),tr("noHabit")));
    setHTML("#d4-planning",home,miniRows(events,tr("events"),tr("noEvent")));
    setText("#bh-summary-copy",home,brainSentence(open,events,notes));
    setText("#bh-action-title",home,recTitle);
    setText("#bh-action-context",home,workspaceName()+" · "+(open[0]?tr("focus"):events[0]?tr("planning"):tr("brain")));
    setText("#bh-action-copy",home,open[0]?tr("continueFocus"):events[0]?tr("planning"):tr("calm"));
    var reminderRows=open.slice(0,2).concat(events.slice(0,1));
    lastRenderState.reminderTarget=reminderRows.length?(open.indexOf(reminderRows[0])>-1?"todos":"calendar"):"todos";
    setHTML("#bh-why-list",home,reminderRows.length?reminderRows.map(function(x){return '<div class="bh-why-row"><i>✓</i><span>'+esc(titleOf(x,tr("reminders")))+'</span></div>'}).join(""):'<div class="bh-why-row"><i>✓</i><span>'+tr("noReminder")+'</span></div>');
    var productivity=percent(done.length,todos.length),habitPct=percent(habitDone.length,habits.length);
    setHTML("#d4-global-state",home,[[tr("productivity"),productivity],[tr("energy"),Math.min(100,35+focusPct)],[tr("load"),Math.min(100,open.length*12+events.length*8)],[tr("concentration"),Math.max(focusPct,habitPct)]].map(function(r){return '<div class="d4-state-row"><span>'+r[0]+'</span><div class="d4-progress"><i style="width:'+r[1]+'%"></i></div><strong>'+r[1]+'%</strong></div>'}).join(""));
    setHTML("#d4-timeline",home,timelineRows(events,open));
    setHTML("#bh-context-list",home,workspaceRows(notes,items));
    setHTML("#bh-insights",home,"");
    setHTML("#d4-activity",home,'<div class="d4-insight-cell"><span>'+tr("focus")+'</span><strong>'+focus+'m</strong></div><div class="d4-insight-cell"><span>'+tr("tasks")+'</span><strong>'+done.length+" / "+todos.length+'</strong></div><div class="d4-insight-cell"><span>'+tr("habits")+'</span><strong>'+habitDone.length+" / "+habits.length+'</strong></div><div class="d4-insight-cell"><span>'+tr("files")+'</span><strong>'+items.length+'</strong></div>');
    clock(home);applyLayout(home,editMode?workingPrefs:null);
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }

  function requireEditingInstance(widgetId){
    if(!document.body.classList.contains("d4-editing"))return -1;
    if(!workingPrefs)workingPrefs=layoutPrefs();
    return workingPrefs.instances.findIndex(function(w){return w.instanceId===widgetId});
  }
  function registerActions(){
    var Actions=App.get("actions");
    if(!Actions||window.__ethoneD4ActionsRegistered)return;
    window.__ethoneD4ActionsRegistered=true;
    function navTo(page){return function(){Navigation.go(page,null)}}
    Actions.register("dashboard.action.search",{handler:function(){if(typeof window.openCmdPalette==="function")window.openCmdPalette()}});
    Actions.register("dashboard.action.notifications",{handler:function(){Notifications.toggle()}});
    Actions.register("dashboard.action.profile",{handler:function(){Navigation.profile()}});
    Actions.register("dashboard.nav.notes",{handler:navTo("notes")});
    Actions.register("dashboard.nav.todos",{handler:navTo("todos")});
    Actions.register("dashboard.nav.files",{handler:navTo("files")});
    Actions.register("dashboard.nav.calendar",{handler:navTo("calendar")});
    Actions.register("dashboard.nav.ai",{handler:navTo("ai")});
    Actions.register("dashboard.nav.marketplace",{enabled:false,label:tr("market"),handler:function(){}});
    Actions.register("dashboard.nav.workspaces",{enabled:false,label:tr("spaces"),handler:function(){}});
    Actions.register("dashboard.hero.continueFocus",{handler:navTo("todos")});
    Actions.register("dashboard.hero.askBrain",{handler:navTo("ai")});
    Actions.register("dashboard.brain.openNextAction",{handler:function(){Navigation.go(lastRenderState.nextActionTarget||"todos",null)}});
    Actions.register("dashboard.brain.openReminders",{handler:function(){Navigation.go(lastRenderState.reminderTarget||"todos",null)}});
    Actions.register("dashboard.edit.toggle",{handler:function(){
      var home=qs("#ethone-2026-home");if(!home)return;
      editMode=!editMode;
      workingPrefs=editMode?JSON.parse(JSON.stringify(layoutPrefs())):null;
      document.body.classList.toggle("d4-editing",editMode);
      var bar=qs("#d4-editbar",home);if(bar)bar.hidden=!editMode;
      var btn=qs("#d4-edit-toggle",home);if(btn){btn.setAttribute("aria-pressed",editMode?"true":"false");btn.classList.toggle("active",editMode)}
      if(!editMode)closeWidgetPicker();
      applyLayout(home,editMode?workingPrefs:null);
    }});
    Actions.register("dashboard.edit.save",{handler:function(){
      var home=qs("#ethone-2026-home");if(!home)return;
      if(workingPrefs)savePrefs(workingPrefs);
      editMode=false;workingPrefs=null;
      document.body.classList.remove("d4-editing");
      closeWidgetPicker();
      var bar=qs("#d4-editbar",home);if(bar)bar.hidden=true;
      var btn=qs("#d4-edit-toggle",home);if(btn){btn.setAttribute("aria-pressed","false");btn.classList.remove("active")}
      applyLayout(home);
      if(typeof window.toast==="function")window.toast(tr("layoutSaved"),"success");
    }});
    Actions.register("dashboard.edit.cancel",{handler:function(){
      var home=qs("#ethone-2026-home");if(!home)return;
      editMode=false;workingPrefs=null;
      document.body.classList.remove("d4-editing");
      closeWidgetPicker();
      var bar=qs("#d4-editbar",home);if(bar)bar.hidden=true;
      var btn=qs("#d4-edit-toggle",home);if(btn){btn.setAttribute("aria-pressed","false");btn.classList.remove("active")}
      applyLayout(home);
    }});
    Actions.register("dashboard.edit.reset",{handler:function(){
      var home=qs("#ethone-2026-home");if(!home)return;
      workingPrefs={version:2,instances:JSON.parse(JSON.stringify(DEFAULT_WIDGET_INSTANCES)),hidden:[],favorites:(workingPrefs&&workingPrefs.favorites)||[]};
      applyLayout(home,workingPrefs);
    }});
    Actions.register("dashboard.edit.addWidget",{handler:function(){
      var home=qs("#ethone-2026-home");if(!home)return;
      openWidgetPicker(home);
    }});
    Actions.register("dashboard.edit.addWidgetType",{handler:function(ctx){
      var home=qs("#ethone-2026-home");if(!home)return;
      var type=ctx.el.dataset.widgetType;
      var Widgets=App.get("widgets"),cat=Widgets?Widgets.get(type):null;
      if(!cat)return;
      if(!workingPrefs)workingPrefs=layoutPrefs();
      var count=workingPrefs.instances.filter(function(w){return w.type===type}).length;
      var max=cat.maxInstances||Infinity;
      if(count>=max){if(typeof window.toast==="function")window.toast(tr("maxInstancesReached"),"info");return}
      workingPrefs.instances.push({instanceId:type+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),type:type,size:Object.assign({},cat.defaultSize||{col:2,row:1}),locked:false,config:{}});
      closeWidgetPicker();
      applyLayout(home,workingPrefs);
    }});
    Actions.register("dashboard.edit.closePicker",{handler:function(){closeWidgetPicker()}});
    Actions.register("dashboard.widget.lock",{handler:function(ctx){
      var home=qs("#ethone-2026-home");if(!home)return;
      var idx=requireEditingInstance(ctx.el.dataset.widgetId);if(idx<0)return;
      workingPrefs.instances[idx].locked=!workingPrefs.instances[idx].locked;
      applyLayout(home,workingPrefs);
    }});
    Actions.register("dashboard.widget.duplicate",{handler:function(ctx){
      var home=qs("#ethone-2026-home");if(!home)return;
      var idx=requireEditingInstance(ctx.el.dataset.widgetId);if(idx<0)return;
      var src=workingPrefs.instances[idx];
      var Widgets=App.get("widgets"),cat=Widgets?Widgets.get(src.type):null;
      var count=workingPrefs.instances.filter(function(w){return w.type===src.type}).length;
      var max=(cat&&cat.maxInstances)||Infinity;
      if(count>=max){if(typeof window.toast==="function")window.toast(tr("maxInstancesReached"),"info");return}
      var copy=JSON.parse(JSON.stringify(src));
      copy.instanceId=src.type+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6);
      workingPrefs.instances.splice(idx+1,0,copy);
      applyLayout(home,workingPrefs);
    }});
    Actions.register("dashboard.widget.hide",{handler:function(ctx){
      var home=qs("#ethone-2026-home");if(!home)return;
      if(!document.body.classList.contains("d4-editing"))return;
      if(!workingPrefs)workingPrefs=layoutPrefs();
      var id=ctx.el.dataset.widgetId,i=workingPrefs.hidden.indexOf(id);
      if(i>-1)workingPrefs.hidden.splice(i,1);else workingPrefs.hidden.push(id);
      applyLayout(home,workingPrefs);
    }});
    Actions.register("dashboard.widget.delete",{handler:function(ctx){
      var home=qs("#ethone-2026-home");if(!home)return;
      var idx=requireEditingInstance(ctx.el.dataset.widgetId);if(idx<0)return;
      workingPrefs.instances.splice(idx,1);
      applyLayout(home,workingPrefs);
    }});
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,80)}
  function boot(){
    document.body.classList.add("ethone-2026-ui","ethone-dashboard-v4");
    registerCoreWidgetTypes();
    registerActions();
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
