/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.__ethoneHomeCommercial)return;
  window.__ethoneHomeCommercial=true;
  var App=window.Ethone;
  var Events=App.get("events");
  var Navigation=App.get("navigation");
  var Notifications=App.get("notifications");
  var Storage=App.get("storage");
  var renderTimer=0;
  var words={
    en:{
      search:"Search anything...",synced:"Synced just now",offline:"Offline",continueFocus:"Continue focus",askBrain:"Ask Brain",
      analyzed:"Brain analyzed your workspace.",ready:"recommendations are ready.",brain:"Brain",focus:"Focus",timeline:"Timeline",
      workspace:"Workspace",activity:"Activity",quickActions:"Quick Actions",seeAll:"See all",viewPlanner:"View planner",
      viewCalendar:"View calendar",currentRecommendation:"Current recommendation",todaySummary:"Today summary",
      startSession:"Start session",why:"Why this",mostImportant:"Most important task",objective:"Objective",nextSession:"Next session",
      upcoming:"Upcoming events",deadlines:"Deadlines",recent:"Recent",brainInsights:"Brain insights",memorySummary:"Memory summary",
      createNote:"Create note",newTask:"New task",openMarketplace:"Open marketplace",notes:"Notes",files:"Files",projects:"Projects",
      tasks:"Tasks",events:"Events",completed:"Completed",open:"Open",noTasks:"No open task. Brain can help define the next move.",
      noEvents:"No upcoming event. Your calendar is clear.",noRecent:"Recent workspace activity will appear here.",
      noDeadline:"No open deadline.",personalOS:"Personal OS",today:"Today",recently:"Recently",now:"Now",plan:"Plan",
      calmTitle:"Calm workspace",calmCopy:"Nothing urgent is competing for your attention.",contextTitle:"Context is ready",
      contextCopy:"Brain can use your recent notes and events.",scheduleTitle:"Schedule awareness",capture:"Capture what matters",
      addTaskCopy:"Add a task to your focus list",noteCopy:"Capture an idea or decision",marketCopy:"Explore tools and templates",
      brainCopy:"Get answers and recommendations"
    },
    fr:{
      search:"Rechercher dans ETHONE...",synced:"Synchronisé à l'instant",offline:"Hors ligne",continueFocus:"Continuer le focus",askBrain:"Demander à Brain",
      analyzed:"Brain a analysé votre espace.",ready:"recommandations sont prêtes.",brain:"Brain",focus:"Focus",timeline:"Chronologie",
      workspace:"Espace de travail",activity:"Activité",quickActions:"Actions rapides",seeAll:"Tout voir",viewPlanner:"Voir le planning",
      viewCalendar:"Voir le calendrier",currentRecommendation:"Recommandation actuelle",todaySummary:"Résumé du jour",
      startSession:"Démarrer la session",why:"Pourquoi",mostImportant:"Tâche la plus importante",objective:"Objectif",nextSession:"Prochaine session",
      upcoming:"Événements à venir",deadlines:"Échéances",recent:"Récents",brainInsights:"Analyses Brain",memorySummary:"Résumé mémoire",
      createNote:"Créer une note",newTask:"Nouvelle tâche",openMarketplace:"Ouvrir Marketplace",notes:"Notes",files:"Fichiers",projects:"Projets",
      tasks:"Tâches",events:"Événements",completed:"Terminées",open:"Ouvertes",noTasks:"Aucune tâche ouverte. Brain peut définir la prochaine étape.",
      noEvents:"Aucun événement à venir. Votre calendrier est libre.",noRecent:"L'activité récente apparaîtra ici.",
      noDeadline:"Aucune échéance ouverte.",personalOS:"OS personnel",today:"Aujourd'hui",recently:"Récemment",now:"Maintenant",plan:"Planifier",
      calmTitle:"Espace calme",calmCopy:"Rien d'urgent ne réclame votre attention.",contextTitle:"Contexte prêt",
      contextCopy:"Brain peut utiliser vos notes et événements récents.",scheduleTitle:"Lecture du planning",capture:"Capturer l'essentiel",
      addTaskCopy:"Ajouter une tâche à votre focus",noteCopy:"Capturer une idée ou décision",marketCopy:"Explorer outils et modèles",
      brainCopy:"Obtenir réponses et recommandations"
    },
    es:{
      search:"Buscar en ETHONE...",synced:"Sincronizado ahora",offline:"Sin conexión",continueFocus:"Continuar enfoque",askBrain:"Preguntar a Brain",
      analyzed:"Brain analizó tu espacio.",ready:"recomendaciones están listas.",brain:"Brain",focus:"Enfoque",timeline:"Cronología",
      workspace:"Espacio de trabajo",activity:"Actividad",quickActions:"Acciones rápidas",seeAll:"Ver todo",viewPlanner:"Ver planificación",
      viewCalendar:"Ver calendario",currentRecommendation:"Recomendación actual",todaySummary:"Resumen de hoy",
      startSession:"Iniciar sesión",why:"Por qué",mostImportant:"Tarea más importante",objective:"Objetivo",nextSession:"Próxima sesión",
      upcoming:"Próximos eventos",deadlines:"Fechas límite",recent:"Reciente",brainInsights:"Análisis de Brain",memorySummary:"Resumen de memoria",
      createNote:"Crear nota",newTask:"Nueva tarea",openMarketplace:"Abrir Marketplace",notes:"Notas",files:"Archivos",projects:"Proyectos",
      tasks:"Tareas",events:"Eventos",completed:"Completadas",open:"Abiertas",noTasks:"No hay tareas abiertas. Brain puede definir el siguiente paso.",
      noEvents:"No hay próximos eventos. Tu calendario está libre.",noRecent:"La actividad reciente aparecerá aquí.",
      noDeadline:"No hay fechas límite.",personalOS:"OS personal",today:"Hoy",recently:"Recientemente",now:"Ahora",plan:"Plan",
      calmTitle:"Espacio tranquilo",calmCopy:"Nada urgente compite por tu atención.",contextTitle:"Contexto listo",
      contextCopy:"Brain puede usar tus notas y eventos recientes.",scheduleTitle:"Conciencia del calendario",capture:"Captura lo importante",
      addTaskCopy:"Añade una tarea a tu enfoque",noteCopy:"Captura una idea o decisión",marketCopy:"Explora herramientas y plantillas",
      brainCopy:"Obtén respuestas y recomendaciones"
    },
    de:{
      search:"ETHONE durchsuchen...",synced:"Gerade synchronisiert",offline:"Offline",continueFocus:"Fokus fortsetzen",askBrain:"Brain fragen",
      analyzed:"Brain hat deinen Bereich analysiert.",ready:"Empfehlungen sind bereit.",brain:"Brain",focus:"Fokus",timeline:"Zeitleiste",
      workspace:"Arbeitsbereich",activity:"Aktivität",quickActions:"Schnellaktionen",seeAll:"Alle anzeigen",viewPlanner:"Planer öffnen",
      viewCalendar:"Kalender öffnen",currentRecommendation:"Aktuelle Empfehlung",todaySummary:"Heutige Übersicht",
      startSession:"Sitzung starten",why:"Warum",mostImportant:"Wichtigste Aufgabe",objective:"Ziel",nextSession:"Nächste Sitzung",
      upcoming:"Bevorstehende Termine",deadlines:"Fristen",recent:"Zuletzt",brainInsights:"Brain-Einblicke",memorySummary:"Gedächtnisübersicht",
      createNote:"Notiz erstellen",newTask:"Neue Aufgabe",openMarketplace:"Marketplace öffnen",notes:"Notizen",files:"Dateien",projects:"Projekte",
      tasks:"Aufgaben",events:"Termine",completed:"Erledigt",open:"Offen",noTasks:"Keine offene Aufgabe. Brain kann den nächsten Schritt definieren.",
      noEvents:"Keine bevorstehenden Termine. Dein Kalender ist frei.",noRecent:"Letzte Aktivitäten erscheinen hier.",
      noDeadline:"Keine offene Frist.",personalOS:"Persönliches OS",today:"Heute",recently:"Kürzlich",now:"Jetzt",plan:"Plan",
      calmTitle:"Ruhiger Bereich",calmCopy:"Nichts Dringendes beansprucht deine Aufmerksamkeit.",contextTitle:"Kontext ist bereit",
      contextCopy:"Brain kann aktuelle Notizen und Termine nutzen.",scheduleTitle:"Zeitplan erkannt",capture:"Wichtiges festhalten",
      addTaskCopy:"Aufgabe zur Fokusliste hinzufügen",noteCopy:"Idee oder Entscheidung festhalten",marketCopy:"Tools und Vorlagen entdecken",
      brainCopy:"Antworten und Empfehlungen erhalten"
    }
  };
  var brainWords={
    en:{brainHome:"Brain Home",todaysBrief:"Today's Brief",briefSub:"Your day, understood and organized.",morningSummary:"Morning summary",currentPriorities:"Current priorities",suggestedAction:"Suggested Action",suggestedSub:"Brain's next best action for you.",nextBestAction:"Next best action",whyItMatters:"Why it matters",openTask:"Open task",insights:"Insights",context:"Context",automation:"Automation",vision:"Vision",providers:"Providers",memory:"Memory",focusTime:"Focus time",productivity:"Productivity",habits:"Habits",recentFiles:"Recent files",conversations:"Conversations",running:"Running",recommended:"Recommended",images:"Images",documents:"Documents",available:"Available",active:"Active",configured:"Configured",pinned:"Pinned",recentMemories:"Recent memories",noAutomation:"No automation is currently running.",noVision:"No recent visual analysis.",noMemory:"No authorized memory yet.",briefCalm:"Your workspace is calm and ready.",continueProject:"Continue where you left off.",updated:"items updated",schedule:"Schedule"},
    fr:{brainHome:"Accueil Brain",todaysBrief:"Brief du jour",briefSub:"Votre journée, comprise et organisée.",morningSummary:"Résumé du matin",currentPriorities:"Priorités actuelles",suggestedAction:"Action suggérée",suggestedSub:"La meilleure prochaine action selon Brain.",nextBestAction:"Prochaine action",whyItMatters:"Pourquoi c'est important",openTask:"Ouvrir",insights:"Analyses",context:"Contexte",automation:"Automatisation",vision:"Vision",providers:"Fournisseurs",memory:"Mémoire",focusTime:"Temps de focus",productivity:"Productivité",habits:"Habitudes",recentFiles:"Fichiers récents",conversations:"Conversations",running:"En cours",recommended:"Recommandée",images:"Images",documents:"Documents",available:"Disponible",active:"Actif",configured:"Configuré",pinned:"Épinglé",recentMemories:"Mémoires récentes",noAutomation:"Aucune automatisation en cours.",noVision:"Aucune analyse visuelle récente.",noMemory:"Aucune mémoire autorisée.",briefCalm:"Votre espace est calme et prêt.",continueProject:"Reprendre là où vous vous êtes arrêté.",updated:"éléments mis à jour",schedule:"Planning"},
    es:{brainHome:"Inicio Brain",todaysBrief:"Resumen de hoy",briefSub:"Tu día, entendido y organizado.",morningSummary:"Resumen de la mañana",currentPriorities:"Prioridades actuales",suggestedAction:"Acción sugerida",suggestedSub:"La mejor siguiente acción según Brain.",nextBestAction:"Siguiente acción",whyItMatters:"Por qué importa",openTask:"Abrir",insights:"Análisis",context:"Contexto",automation:"Automatización",vision:"Visión",providers:"Proveedores",memory:"Memoria",focusTime:"Tiempo de enfoque",productivity:"Productividad",habits:"Hábitos",recentFiles:"Archivos recientes",conversations:"Conversaciones",running:"En curso",recommended:"Recomendada",images:"Imágenes",documents:"Documentos",available:"Disponible",active:"Activo",configured:"Configurado",pinned:"Fijado",recentMemories:"Memorias recientes",noAutomation:"No hay automatizaciones en curso.",noVision:"No hay análisis visual reciente.",noMemory:"No hay memoria autorizada.",briefCalm:"Tu espacio está tranquilo y listo.",continueProject:"Continúa donde lo dejaste.",updated:"elementos actualizados",schedule:"Agenda"},
    de:{brainHome:"Brain Home",todaysBrief:"Tagesbriefing",briefSub:"Dein Tag, verstanden und organisiert.",morningSummary:"Morgenübersicht",currentPriorities:"Aktuelle Prioritäten",suggestedAction:"Empfohlene Aktion",suggestedSub:"Brains beste nächste Aktion für dich.",nextBestAction:"Nächste Aktion",whyItMatters:"Warum es wichtig ist",openTask:"Öffnen",insights:"Einblicke",context:"Kontext",automation:"Automatisierung",vision:"Vision",providers:"Anbieter",memory:"Gedächtnis",focusTime:"Fokuszeit",productivity:"Produktivität",habits:"Gewohnheiten",recentFiles:"Letzte Dateien",conversations:"Gespräche",running:"Aktiv",recommended:"Empfohlen",images:"Bilder",documents:"Dokumente",available:"Verfügbar",active:"Aktiv",configured:"Konfiguriert",pinned:"Angeheftet",recentMemories:"Letzte Erinnerungen",noAutomation:"Keine Automatisierung aktiv.",noVision:"Keine aktuelle visuelle Analyse.",noMemory:"Noch keine autorisierte Erinnerung.",briefCalm:"Dein Bereich ist ruhig und bereit.",continueProject:"Dort weitermachen, wo du aufgehört hast.",updated:"Elemente aktualisiert",schedule:"Zeitplan"}
  };
  Object.keys(brainWords).forEach(function(l){Object.assign(words[l],brainWords[l])});
  function qs(s,r){return (r||document).querySelector(s)}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]})}
  function lang(){var l=String(window._lang||document.documentElement.lang||"en").toLowerCase().slice(0,2);return words[l]?l:"en"}
  function tr(k){return words[lang()][k]||words.en[k]||k}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function state(){var p=profile();return p&&p.state?p.state:{}}
  function list(v){return Array.isArray(v)?v:[]}
  function workspaceName(){
    return Storage.get("ethone:active-workspace",tr("personalOS"))||tr("personalOS")
  }
  function phase(){
    var h=new Date().getHours(),l=lang();
    if(l==="fr")return h<5?"Bonne nuit":h<12?"Bonjour":h<18?"Bon après-midi":"Bonsoir";
    if(l==="es")return h<5?"Buenas noches":h<12?"Buenos días":h<18?"Buenas tardes":"Buenas noches";
    if(l==="de")return h<5?"Gute Nacht":h<12?"Guten Morgen":h<18?"Guten Tag":"Guten Abend";
    return h<5?"Good night":h<12?"Good morning":h<18?"Good afternoon":"Good evening";
  }
  function icon(name,fallback){return '<i data-lucide="'+name+'" aria-hidden="true">'+(fallback||"")+'</i>'}
  function pageButton(label,page,iconName,primary){
    return '<button class="vh-button'+(primary?' primary':'')+'" type="button" data-vn-page="'+page+'">'+icon(iconName)+'<span>'+label+'</span></button>';
  }
  function panelHead(title,iconName,action,page){
    return '<div class="vh-panel-head"><div class="vh-title">'+icon(iconName)+'<h2>'+title+'</h2><span class="vh-dot" aria-hidden="true"></span></div><button class="vh-link" type="button" data-vn-page="'+page+'">'+action+'</button></div>';
  }
  function markup(){
    return '<section class="vn-home vh-home" id="ethone-2026-home" data-lang="'+lang()+'">'+
      '<header class="vh-topbar">'+
        '<button class="vh-search" type="button" data-vh-action="search" aria-label="'+tr("search")+'">'+icon("search")+'<span>'+tr("search")+'</span><kbd>⌘ K</kbd></button>'+
        '<div class="vh-top-context" aria-label="'+tr("workspace")+'">'+icon("layout-grid")+'<span id="vh-workspace-top">'+esc(workspaceName())+'</span></div>'+
        '<div class="vh-top-actions"><div class="vh-sync"><i class="vh-dot"></i><span id="vh-sync">'+tr("synced")+'</span></div><button class="vh-icon-button" type="button" data-vh-action="notifications" aria-label="Notifications">'+icon("bell")+'</button><button class="vh-avatar" type="button" data-vh-action="profile" id="vh-avatar" aria-label="Profile">E</button></div>'+
      '</header>'+
      '<section class="vh-hero bh-hero"><div><h1 id="vh-greeting">ETHONE</h1><p class="vh-hero-copy">'+icon("brain")+'<span id="bh-hero-sentence">'+tr("analyzed")+'</span></p></div><div class="vh-hero-actions">'+pageButton(tr("continueFocus"),"todos","arrow-right",true)+pageButton(tr("askBrain"),"ai","brain",false)+'</div></section>'+
      '<div class="bh-context-strip" aria-label="'+tr("context")+'"><div class="bh-context-item">'+icon("folder")+'<span>'+tr("workspace")+'</span><strong id="bh-context-workspace"></strong></div><div class="bh-context-item">'+icon("calendar-days")+'<span>'+tr("schedule")+'</span><strong id="bh-context-schedule"></strong></div><div class="bh-context-item">'+icon("target")+'<span>'+tr("focus")+'</span><strong id="bh-context-focus"></strong></div><div class="bh-context-item">'+icon("activity")+'<span>'+tr("activity")+'</span><strong id="bh-context-activity"></strong></div></div>'+
      '<section class="vh-panel bh-core"><div class="bh-core-label">'+tr("brainHome")+'</div><div class="bh-core-grid">'+
        '<div class="bh-brief"><div class="bh-core-heading"><i>'+icon("scan-line")+'</i><div><h2>'+tr("todaysBrief")+'</h2><p>'+tr("briefSub")+'</p></div></div><p class="bh-summary-copy" id="bh-summary-copy"></p><div class="bh-brief-lower"><div><span class="vh-label">'+tr("currentPriorities")+'</span><div id="bh-priorities" style="margin-top:7px"></div></div><div><span class="vh-label">'+tr("upcoming")+'</span><div id="bh-upcoming" style="margin-top:7px"></div></div></div></div>'+
        '<div class="bh-suggested"><div class="bh-core-heading"><i>'+icon("sparkles")+'</i><div><h2>'+tr("suggestedAction")+'</h2><p>'+tr("suggestedSub")+'</p></div></div><div class="bh-action-body"><span class="vh-label">'+tr("nextBestAction")+'</span><div class="bh-action-task"><i class="vh-check"></i><div><strong id="bh-action-title"></strong><span id="bh-action-context"></span></div></div><p class="bh-action-copy" id="bh-action-copy"></p><button class="vh-small-button" type="button" data-vn-page="todos">'+tr("openTask")+' →</button><div class="bh-why"><span class="vh-label">'+tr("whyItMatters")+'</span><div id="bh-why-list" style="margin-top:7px"></div></div></div></div>'+
      '</div></section>'+
      '<div class="bh-module-grid">'+
        '<section class="vh-panel bh-module">'+panelHead(tr("insights"),"chart-no-axes-combined",tr("seeAll"),"stats")+'<div class="bh-module-body" id="bh-insights"></div></section>'+
        '<section class="vh-panel bh-module">'+panelHead(tr("context"),"layout-grid",tr("seeAll"),"files")+'<div class="bh-module-body" id="bh-context-list"></div></section>'+
        '<section class="vh-panel bh-module">'+panelHead(tr("automation"),"bot",tr("seeAll"),"ai")+'<div class="bh-module-body" id="bh-automation"></div></section>'+
        '<section class="vh-panel bh-module">'+panelHead(tr("vision"),"eye",tr("seeAll"),"ai")+'<div class="bh-module-body" id="bh-vision"></div></section>'+
        '<section class="vh-panel bh-module">'+panelHead(tr("providers"),"server",tr("seeAll"),"connections")+'<div class="bh-module-body" id="bh-providers"></div></section>'+
        '<section class="vh-panel bh-module">'+panelHead(tr("memory"),"brain",tr("seeAll"),"ai")+'<div class="bh-module-body" id="bh-memory"></div></section>'+
      '</div>'+
      '<section class="vh-panel vh-quick bh-quick"><div class="vh-quick-head">'+tr("quickActions")+'</div><div class="vh-quick-grid">'+
        quickAction(tr("askBrain"),tr("brainCopy"),"ai","sparkles")+
        quickAction(tr("createNote"),tr("noteCopy"),"notes","notebook-pen")+
        quickAction(tr("newTask"),tr("addTaskCopy"),"todos","circle-check")+
        quickAction(tr("openMarketplace"),tr("marketCopy"),"marketplace","store")+
      '</div></section>'+
    '</section>';
  }
  function quickAction(title,copy,page,iconName){
    return '<button class="vh-quick-action" type="button" data-vn-page="'+page+'"><i>'+icon(iconName)+'</i><span><strong>'+title+'</strong><span>'+copy+'</span></span>'+icon("chevron-right","") .replace("<i ","<i class=\"vh-chevron\" ")+'</button>';
  }
  function ensureMarketplacePage(){
    if(qs("#page-marketplace"))return;
    var main=qs("#main-content");if(!main)return;
    var page=document.createElement("div");
    page.className="tab-content";
    page.id="page-marketplace";
    page.setAttribute("data-qa-page","true");
    page.setAttribute("role","tabpanel");
    page.innerHTML='<div class="ethone-os2-page-hero"><div><div class="ethone-os2-label">ETHONE OS</div><h2>ETHONE Marketplace</h2><p>The App Store for your Personal OS.</p></div><button class="btn btn-primary" type="button" data-vn-page="dashboard">ETHONE Home</button></div><div id="ethone-os2-page-marketplace"></div>';
    main.appendChild(page);
  }
  function ensure(){
    var page=qs("#page-dashboard");if(!page)return null;
    var current=qs("#ethone-2026-home",page);
    if(current&&(!current.classList.contains("vh-home")||current.dataset.lang!==lang()))current.remove();
    var dock=qs("#ethone-2026-dock");if(dock)dock.remove();
    var home=qs("#ethone-2026-home",page);
    if(!home){page.insertAdjacentHTML("afterbegin",markup());home=qs("#ethone-2026-home",page)}
    if(home&&!home.dataset.vhBound){
      home.dataset.vhBound="1";
      Events.listen(home,"click",function(e){
        var action=e.target.closest("[data-vh-action]");
        if(action){
          var kind=action.dataset.vhAction;
          if(kind==="search"&&typeof window.openCmdPalette==="function")window.openCmdPalette();
          if(kind==="notifications")Notifications.toggle();
          if(kind==="profile")Navigation.profile();
          return;
        }
        var button=e.target.closest("[data-vn-page]");
        if(button){
          if(button.dataset.vnPage==="marketplace")ensureMarketplacePage();
          Navigation.go(button.dataset.vnPage,null);
        }
      },false,"home-commercial-actions");
    }
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
    return home;
  }
  function titleOf(v,fallback){return v&&(v.text||v.title||v.name)||fallback}
  function eventRows(events){
    if(!events.length)return '<div class="vh-empty">'+tr("noEvents")+'</div>';
    return events.slice(0,4).map(function(ev){
      return '<div class="vh-event"><time>'+esc(ev.time||ev.date||tr("today"))+'</time><strong>'+esc(titleOf(ev,tr("events")))+'</strong><span>'+esc(ev.duration||ev.tag||tr("plan"))+'</span></div>';
    }).join("");
  }
  function deadlineRows(open){
    if(!open.length)return '<div class="vh-empty">'+tr("noDeadline")+'</div>';
    return open.slice(0,4).map(function(t){
      return '<div class="vh-event"><time>'+esc(t.due||t.date||tr("today"))+'</time><strong>'+esc(titleOf(t,tr("tasks")))+'</strong><span>'+esc(t.priority||tr("open"))+'</span></div>';
    }).join("");
  }
  function workspaceRows(notes,items){
    var rows=notes.map(function(n){return{title:titleOf(n,tr("notes")),type:tr("notes"),icon:"notebook-pen"}})
      .concat(items.map(function(i){return{title:titleOf(i,tr("files")),type:i.type||tr("files"),icon:i.type==="project"?"folder-kanban":"file"}})).slice(0,5);
    if(!rows.length)return '<div class="vh-empty">'+tr("noRecent")+'</div>';
    return rows.map(function(r){return '<div class="vh-list-row"><i class="vh-list-icon">'+icon(r.icon)+'</i><div><strong>'+esc(r.title)+'</strong><small>'+esc(workspaceName())+' · '+esc(r.type)+'</small></div><span>'+tr("recently")+'</span></div>'}).join("");
  }
  function activityRows(done,notes,events){
    var rows=[];
    done.slice(0,2).forEach(function(t){rows.push({title:titleOf(t,tr("completed")),meta:tr("tasks")+" · "+tr("completed"),icon:"circle-check"})});
    notes.slice(0,2).forEach(function(n){rows.push({title:titleOf(n,tr("notes")),meta:tr("notes"),icon:"notebook-pen"})});
    events.slice(0,1).forEach(function(e){rows.push({title:titleOf(e,tr("events")),meta:tr("timeline"),icon:"calendar-days"})});
    if(!rows.length)return '<div class="vh-empty">'+tr("noRecent")+'</div>';
    return rows.slice(0,5).map(function(r){return '<div class="vh-list-row"><i class="vh-list-icon">'+icon(r.icon)+'</i><div><strong>'+esc(r.title)+'</strong><small>'+esc(r.meta)+'</small></div><span>'+tr("recently")+'</span></div>'}).join("");
  }
  function insightRows(open,events,notes){
    var rows=[];
    if(open.length)rows.push({title:titleOf(open[0],tr("mostImportant")),copy:open.length+" "+tr("open").toLowerCase()+" · "+tr("focus"),icon:"target"});
    if(events.length)rows.push({title:tr("scheduleTitle"),copy:events.length+" "+tr("events").toLowerCase()+" · "+titleOf(events[0],tr("nextSession")),icon:"calendar-clock"});
    if(notes.length)rows.push({title:tr("contextTitle"),copy:tr("contextCopy"),icon:"brain"});
    if(!rows.length)rows.push({title:tr("calmTitle"),copy:tr("calmCopy"),icon:"sparkles"});
    return rows.slice(0,3).map(function(r){return '<div class="vh-insight"><i class="vh-insight-icon">'+icon(r.icon)+'</i><div><strong>'+esc(r.title)+'</strong><span>'+esc(r.copy)+'</span></div></div>'}).join("");
  }
  function compactRow(iconName,title,sub,status){
    return '<div class="bh-compact-row"><i>'+icon(iconName)+'</i><div><strong>'+esc(title)+'</strong><small>'+esc(sub||"")+'</small></div>'+(status?'<span>'+esc(status)+'</span>':"")+'</div>';
  }
  function priorityRows(open,events){
    var rows=open.slice(0,3);
    if(!rows.length&&events.length)rows=events.slice(0,2);
    if(!rows.length)return '<div class="bh-empty">'+tr("noTasks")+'</div>';
    return rows.map(function(item,i){return '<div class="bh-priority"><span>'+(i+1)+'</span><strong>'+esc(titleOf(item,tr("tasks")))+'</strong><small>'+esc(item.priority||item.tag||tr("today"))+'</small></div>'}).join("");
  }
  function upcomingRows(events){
    if(!events.length)return '<div class="bh-empty">'+tr("noEvents")+'</div>';
    return events.slice(0,3).map(function(ev){return '<div class="bh-upcoming"><time>'+esc(ev.time||ev.date||tr("today"))+'</time><div><strong>'+esc(titleOf(ev,tr("events")))+'</strong><small>'+esc(ev.duration||ev.tag||tr("schedule"))+'</small></div></div>'}).join("");
  }
  function briefSentence(done,open,notes,events){
    if(!done.length&&!open.length&&!notes.length&&!events.length)return tr("briefCalm");
    var l=lang();
    if(l==="fr")return done.length+" tâche(s) terminée(s), "+notes.length+" note(s) disponible(s) et "+events.length+" événement(s) dans votre planning.";
    if(l==="es")return done.length+" tarea(s) completada(s), "+notes.length+" nota(s) disponible(s) y "+events.length+" evento(s) en tu agenda.";
    if(l==="de")return done.length+" Aufgabe(n) erledigt, "+notes.length+" Notiz(en) verfügbar und "+events.length+" Termin(e) im Zeitplan.";
    return done.length+" task(s) completed, "+notes.length+" note(s) available and "+events.length+" event(s) on your schedule.";
  }
  function heroSentence(recommendation){
    var title=recommendation?titleOf(recommendation,tr("continueProject")):"";
    if(!title)return tr("analyzed")+" "+tr("briefCalm");
    var l=lang();
    if(l==="fr")return "Brain a analysé votre espace. Continuez "+title+".";
    if(l==="es")return "Brain analizó tu espacio. Continúa "+title+".";
    if(l==="de")return "Brain hat deinen Bereich analysiert. Weiter mit "+title+".";
    return "Brain analyzed your workspace. Continue "+title+".";
  }
  function aiConfig(){
    try{return window.ETHONEAICore&&typeof window.ETHONEAICore.config==="function"?window.ETHONEAICore.config():{}}catch(e){return{}}
  }
  function insightsModule(s,todos,habits){
    var done=todos.filter(function(t){return !!t.done}).length,total=todos.length;
    var focus=Number(s.focusMinutes||s.stats&&s.stats.focusMinutes||s.pomodoro&&s.pomodoro.totalMinutes||0);
    var productivity=total?Math.round(done/total*100):0;
    var habitDone=habits.filter(function(h){return h.done||h.completed}).length;
    var habitPct=habits.length?Math.round(habitDone/habits.length*100):0;
    return [
      [tr("focusTime"),Math.floor(focus/60)+"h "+(focus%60)+"m",Math.min(100,Math.round(focus/360*100))],
      [tr("productivity"),done+" / "+total,productivity],
      [tr("habits"),habitDone+" / "+habits.length,habitPct]
    ].map(function(row){return '<div class="bh-stat"><div class="bh-stat-line"><span>'+row[0]+'</span><strong>'+row[1]+'</strong></div><div class="vh-progress"><i style="width:'+row[2]+'%"></i></div></div>'}).join("");
  }
  function contextModule(notes,items){
    var cfg=aiConfig(),conversations=list(cfg.conversations);
    var rows=items.slice(0,2).map(function(i){return compactRow("file",titleOf(i,tr("files")),i.type||tr("files"),tr("recently"))});
    rows=rows.concat(notes.slice(0,2).map(function(n){return compactRow("notebook-pen",titleOf(n,tr("notes")),tr("notes"),tr("recently"))}));
    if(conversations[0])rows.push(compactRow("messages-square",titleOf(conversations[0],"Brain"),tr("conversations"),tr("recently")));
    return rows.slice(0,5).join("")||'<div class="bh-empty">'+tr("noRecent")+'</div>';
  }
  function automationModule(s){
    var autos=list(s.automations);
    if(!autos.length)return '<div class="bh-empty">'+tr("noAutomation")+'</div>'+compactRow("sparkles",tr("recommended"),tr("askBrain"),tr("available"));
    return autos.slice(0,5).map(function(a){return compactRow("bot",titleOf(a,tr("automation")),a.description||tr("automation"),a.status||tr("running"))}).join("");
  }
  function visionModule(items){
    var visual=items.filter(function(i){var t=String(i.type||"").toLowerCase(),n=String(titleOf(i,"")).toLowerCase();return /image|photo|pdf|document/.test(t)||/\.(png|jpe?g|webp|pdf)$/i.test(n)});
    if(!visual.length)return '<div class="bh-empty">'+tr("noVision")+'</div>';
    return visual.slice(0,5).map(function(i){var type=String(i.type||"").toLowerCase();return compactRow(type.indexOf("image")>-1?"image":"file-text",titleOf(i,tr("documents")),i.type||tr("documents"),tr("recently"))}).join("");
  }
  function providerModule(){
    var cfg=aiConfig(),providers=cfg.providers||{},active=cfg.activeProvider||cfg.preferredProvider||cfg.defaultProvider||"";
    var defs=[["openai","OpenAI"],["anthropic","Claude"],["groq","Groq"],["lmstudio","LM Studio"],["ollama","Ollama"]];
    return defs.map(function(row){
      var p=providers[row[0]]||{},configured=!!(p.apiKey||p.endpoint||p.baseUrl),status=active===row[0]?tr("active"):(configured?tr("configured"):tr("available"));
      return compactRow("server",row[1],p.model||p.defaultModel||tr("providers"),status).replace('<span>','<span class="bh-status">');
    }).join("");
  }
  function memoryModule(notes){
    var cfg=aiConfig(),memory=list(cfg.memory),pinned=notes.filter(function(n){return n.pinned||n.favorite});
    var html="";
    if(pinned[0])html+='<div class="bh-memory-section"><span class="vh-label">'+tr("pinned")+'</span><strong>'+esc(titleOf(pinned[0],tr("notes")))+'</strong><span>'+tr("notes")+'</span></div>';
    if(memory[0])html+='<div class="bh-memory-section"><span class="vh-label">'+tr("recentMemories")+'</span><strong>'+esc(titleOf(memory[0],memory[0].value||tr("memory")))+'</strong><span>'+tr("recently")+'</span></div>';
    if(!html&&notes[0])html+='<div class="bh-memory-section"><span class="vh-label">'+tr("recentMemories")+'</span><strong>'+esc(titleOf(notes[0],tr("notes")))+'</strong><span>'+tr("notes")+'</span></div>';
    return html||'<div class="bh-empty">'+tr("noMemory")+'</div>';
  }
  function render(){
    var home=ensure();if(!home)return;
    var s=state(),p=profile();
    var todos=list(s.todos),notes=list(s.notes),items=list(s.items),events=list(s.events),habits=list(s.habits);
    var open=todos.filter(function(t){return !t.done}),done=todos.filter(function(t){return !!t.done});
    var name=(p&&p.name)||s.username||"there";
    var recommendation=open[0]||events[0]||notes[0];
    var recTitle=recommendation?titleOf(recommendation,tr("capture")):tr("capture");
    var recCopy=open[0]?tr("addTaskCopy"):(events[0]?tr("scheduleTitle"):(notes[0]?tr("contextCopy"):tr("calmCopy")));
    function setText(sel,value){var el=qs(sel,home);if(el)el.textContent=value}
    function setHTML(sel,value){var el=qs(sel,home);if(el)el.innerHTML=value}
    setText("#vh-greeting",phase()+", "+name+".");
    setText("#bh-hero-sentence",heroSentence(recommendation));
    setText("#vh-workspace-top",workspaceName());
    setText("#vh-sync",navigator.onLine===false?tr("offline"):tr("synced"));
    setText("#vh-avatar",String(name).trim().charAt(0).toUpperCase()||"E");
    setText("#bh-context-workspace",workspaceName());
    setText("#bh-context-schedule",events.length+" "+tr("events").toLowerCase());
    setText("#bh-context-focus",open.length+" "+tr("open").toLowerCase());
    setText("#bh-context-activity",(done.length+notes.length+items.length)+" "+tr("updated"));
    setText("#bh-summary-copy",briefSentence(done,open,notes,events));
    setHTML("#bh-priorities",priorityRows(open,events));
    setHTML("#bh-upcoming",upcomingRows(events));
    setText("#bh-action-title",recTitle);
    setText("#bh-action-context",workspaceName()+" · "+(open[0]?(open[0].priority||tr("open")):(events[0]?tr("schedule"):tr("context"))));
    setText("#bh-action-copy",recCopy);
    setHTML("#bh-why-list",'<div class="bh-why-row"><i>✓</i><span>'+esc(recCopy)+'</span></div><div class="bh-why-row"><i>✓</i><span>'+esc(events.length?events.length+" "+tr("events").toLowerCase()+" · "+tr("schedule"):tr("calmCopy"))+'</span></div>');
    setHTML("#bh-insights",insightsModule(s,todos,habits));
    setHTML("#bh-context-list",contextModule(notes,items));
    setHTML("#bh-automation",automationModule(s));
    setHTML("#bh-vision",visionModule(items));
    setHTML("#bh-providers",providerModule());
    setHTML("#bh-memory",memoryModule(notes));
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function schedule(){clearTimeout(renderTimer);renderTimer=setTimeout(render,70)}
  function boot(){
    document.body.classList.add("ethone-2026-ui","ethone-home-commercial");
    schedule();
    if(!document.body.dataset.vhDashboardBound){
      document.body.dataset.vhDashboardBound="1";
      Events.listen(document,"click",function(){setTimeout(render,160)},true,"home-commercial-refresh");
      Events.listen(window,"online",render,false,"home-commercial-online");
      Events.listen(window,"offline",render,false,"home-commercial-offline");
    }
    setTimeout(render,700);
    setTimeout(render,1800);
  }
  window.ethoneDashboardVNextRender=render;
  window.ethoneHomeCommercialRender=render;
  if(window.ethoneRunWhenDashboardReady)window.ethoneRunWhenDashboardReady("home-commercial",boot);
  else if(document.readyState==="loading")Events.listen(document,"DOMContentLoaded",boot,{once:true},"home-commercial-boot");
  else boot();
})();
