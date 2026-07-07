/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.__ethoneAuthV3Premium)return;
  window.__ethoneAuthV3Premium=true;
  function qs(sel,root){return (root||document).querySelector(sel)}
  function isVisible(el){
    if(!el)return false;
    var inline=(el.style&&el.style.display)||"";
    if(inline==="none")return false;
    return !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length||inline==="flex"||inline==="grid"||inline==="block");
  }
  function currentLanguage(){
    try{
      return String(window._lang||localStorage.getItem("nexus_lang")||localStorage.getItem("ethone_lang")||document.documentElement.lang||"fr").slice(0,2);
    }catch(e){
      return String(document.documentElement.lang||"fr").slice(0,2);
    }
  }
  var HERO_TEXT={
    fr:{
      title:"Votre système <span>d'exploitation personnel<i>.</i></span>",
      copy:"Brain, vos espaces et vos outils, réunis en un seul endroit.",
      badge:"OS Personnel",search:"Rechercher dans ETHONE…",ready:"Brain en ligne",
      morning:"Session matinale",work:"Session de travail",evening:"Mode soirée",night:"Mode nuit",
      greeting:"Bonjour.",greetingSub:"Votre espace est prêt pour avancer.",
      home:"Accueil",brainNav:"Brain",workspacesNav:"Espaces",tasksNav:"Tâches",calendarNav:"Calendrier",
      brainLabel:"Recommandation Brain",recTitle:"Continuer le projet ETHONE",
      recCopy:"Vos priorités sont organisées et la prochaine action est prête.",
      openPlan:"Ouvrir le plan",askBrain:"Demander à Brain",
      focusLabel:"Focus",deepWork:"Travail profond",nextBreak:"Prochaine pause",focusStreak:"Série focus",days:"7 jours",
      tasksLabel:"TÂCHES DU JOUR",viewAll:"Tout voir",t1:"Synchroniser la mémoire Brain",t2:"Revoir Marketplace",t3:"Session focus · 2h",t4:"Habitudes du jour",
      activityLabel:"ACTIVITÉ",last7:"7 derniers jours",focusTime:"Temps de focus",completed:"Terminées",
      allSystems:"Tous les systèmes opérationnels",synced:"Synchronisé",github:"GitHub connecté",notif:"Notifications"
    },
    en:{
      title:"Your Personal <span>Operating System<i>.</i></span>",
      copy:"Brain, Workspaces and your tools — organized as one.",
      badge:"Personal OS",search:"Search ETHONE…",ready:"Brain online",
      morning:"Morning session",work:"Work session",evening:"Evening mode",night:"Night mode",
      greeting:"Good morning.",greetingSub:"Your workspace is ready for focused work.",
      home:"Home",brainNav:"Brain",workspacesNav:"Workspaces",tasksNav:"Tasks",calendarNav:"Calendar",
      brainLabel:"Brain recommendation",recTitle:"Continue Project ETHONE",
      recCopy:"Your priorities are organized and the next action is ready.",
      openPlan:"Open plan",askBrain:"Ask Brain",
      focusLabel:"Focus",deepWork:"Deep work",nextBreak:"Next break",focusStreak:"Focus streak",days:"7 days",
      tasksLabel:"TODAY'S TASKS",viewAll:"View all",t1:"Sync Brain memory",t2:"Review Marketplace",t3:"Focus session · 2h",t4:"Daily habits",
      activityLabel:"ACTIVITY",last7:"Last 7 days",focusTime:"Focus time",completed:"Completed",
      allSystems:"All systems operational",synced:"Synced",github:"GitHub connected",notif:"Notifications"
    },
    es:{
      title:"Tu sistema <span>operativo personal<i>.</i></span>",
      copy:"Brain, tus espacios y tus herramientas, todo en un mismo lugar.",
      badge:"OS Personal",search:"Buscar en ETHONE…",ready:"Brain conectado",
      morning:"Sesión matutina",work:"Sesión de trabajo",evening:"Modo tarde",night:"Modo noche",
      greeting:"Buenos días.",greetingSub:"Tu espacio está listo para avanzar.",
      home:"Inicio",brainNav:"Brain",workspacesNav:"Espacios",tasksNav:"Tareas",calendarNav:"Calendario",
      brainLabel:"Recomendación de Brain",recTitle:"Continuar Proyecto ETHONE",
      recCopy:"Tus prioridades están organizadas y la siguiente acción está lista.",
      openPlan:"Abrir plan",askBrain:"Preguntar a Brain",
      focusLabel:"Enfoque",deepWork:"Trabajo profundo",nextBreak:"Próxima pausa",focusStreak:"Racha de enfoque",days:"7 días",
      tasksLabel:"TAREAS DE HOY",viewAll:"Ver todo",t1:"Sincronizar memoria Brain",t2:"Revisar Marketplace",t3:"Sesión de enfoque · 2h",t4:"Hábitos diarios",
      activityLabel:"ACTIVIDAD",last7:"Últimos 7 días",focusTime:"Tiempo de enfoque",completed:"Completadas",
      allSystems:"Todos los sistemas operativos",synced:"Sincronizado",github:"GitHub conectado",notif:"Notificaciones"
    },
    de:{
      title:"Dein persönliches <span>Betriebssystem<i>.</i></span>",
      copy:"Brain, Workspaces und deine Werkzeuge an einem Ort.",
      badge:"Persönliches OS",search:"ETHONE durchsuchen…",ready:"Brain online",
      morning:"Morgen-Sitzung",work:"Arbeitssitzung",evening:"Abendmodus",night:"Nachtmodus",
      greeting:"Guten Morgen.",greetingSub:"Dein Workspace ist bereit für fokussierte Arbeit.",
      home:"Start",brainNav:"Brain",workspacesNav:"Workspaces",tasksNav:"Aufgaben",calendarNav:"Kalender",
      brainLabel:"Brain-Empfehlung",recTitle:"Projekt ETHONE fortsetzen",
      recCopy:"Deine Prioritäten sind organisiert und der nächste Schritt ist bereit.",
      openPlan:"Plan öffnen",askBrain:"Brain fragen",
      focusLabel:"Fokus",deepWork:"Deep Work",nextBreak:"Nächste Pause",focusStreak:"Fokus-Serie",days:"7 Tage",
      tasksLabel:"HEUTIGE AUFGABEN",viewAll:"Alle anzeigen",t1:"Brain-Speicher synchronisieren",t2:"Marketplace prüfen",t3:"Fokus-Sitzung · 2h",t4:"Tägliche Gewohnheiten",
      activityLabel:"AKTIVITÄT",last7:"Letzte 7 Tage",focusTime:"Fokuszeit",completed:"Erledigt",
      allSystems:"Alle Systeme betriebsbereit",synced:"Synchronisiert",github:"GitHub verbunden",notif:"Benachrichtigungen"
    }
  };
  function heroText(){return HERO_TEXT[currentLanguage()]||HERO_TEXT.fr}
  function syncLanguageControl(){
    var bar=qs("#auth-lang-bar");
    if(!bar)return;
    var buttons=Array.prototype.slice.call(bar.querySelectorAll("button[data-l]"));
    var styledActive=buttons.filter(function(btn){
      var bg=(btn.style&&btn.style.background||"").replace(/\s+/g,"").toLowerCase();
      return !!bg&&bg!=="transparent"&&bg!=="none"&&bg!=="rgba(0,0,0,0)";
    });
    var active=styledActive.length===1?(styledActive[0].getAttribute("data-l")||currentLanguage()):currentLanguage();
    bar.setAttribute("role","group");
    bar.setAttribute("aria-label","Language");
    var activeBtn=null;
    buttons.forEach(function(btn){
      var code=btn.getAttribute("data-l")||"";
      btn.type="button";
      btn.setAttribute("aria-label",code.toUpperCase());
      btn.setAttribute("aria-pressed",String(code===active));
      if(code===active)activeBtn=btn;
    });
    var slider=qs("#auth-langbar-slider");
    if(slider&&activeBtn){
      var barRect=bar.getBoundingClientRect(),btnRect=activeBtn.getBoundingClientRect();
      if(btnRect.width>0){
        slider.style.width=btnRect.width+"px";
        slider.style.transform="translateX("+(btnRect.left-barRect.left)+"px)";
      }
    }
  }
  function heroMarkup(){
    var copy=heroText();
    return ''+
      '<section id="auth-v3-hero" aria-hidden="true">'+
        '<div class="auth-v3-header">'+
          '<div class="auth-v3-brand"><div class="auth-v3-mark">E</div><span>ETHONE</span><b class="auth-v3-badge" data-auth-hero="badge">'+copy.badge+'</b></div>'+
          '<h2 class="auth-v3-title" data-auth-hero="title">'+copy.title+'</h2>'+
          '<p class="auth-v3-copy" data-auth-hero="copy">'+copy.copy+'</p>'+
        '</div>'+
        '<div class="auth-v3-preview" id="auth-preview">'+
          '<div id="auth-preview-bar">'+
            '<div class="apb-dot apb-r"></div><div class="apb-dot apb-y"></div><div class="apb-dot apb-g"></div>'+
            '<div id="auth-preview-url">'+
              '<span id="apu-time">--:--</span>'+
              '<div id="auth-preview-search" data-auth-hero="search">'+copy.search+'</div>'+
              '<div id="auth-preview-ready"><div class="apr-dot"></div><span data-auth-hero="ready">'+copy.ready+'</span></div>'+
              '<button type="button" id="apc-notif-bell" data-auth-hero-label="notif" tabindex="-1">'+
                '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8a5 5 0 0 1 10 0c0 3.2 1 4.5 1.5 5H3.5C4 12.5 5 11.2 5 8Z"/><path d="M8.3 15.5a1.8 1.8 0 0 0 3.4 0"/></svg>'+
                '<span id="apc-notif-badge">2</span>'+
              '</button>'+
            '</div>'+
          '</div>'+
          '<div id="auth-preview-body">'+
            '<div id="auth-preview-sb">'+
              '<div class="apsb-brand"><div class="apsb-logo">E</div><span>ETHONE</span></div>'+
              '<div class="apsb-nav">'+
                '<div class="apsb-item on"><i data-lucide="house"></i><span data-auth-hero="home">'+copy.home+'</span></div>'+
                '<div class="apsb-item"><i data-lucide="brain"></i><span data-auth-hero="brainNav">'+copy.brainNav+'</span></div>'+
                '<div class="apsb-item"><i data-lucide="panels-top-left"></i><span data-auth-hero="workspacesNav">'+copy.workspacesNav+'</span></div>'+
                '<div class="apsb-item"><i data-lucide="square-check-big"></i><span data-auth-hero="tasksNav">'+copy.tasksNav+'</span></div>'+
                '<div class="apsb-item"><i data-lucide="calendar-days"></i><span data-auth-hero="calendarNav">'+copy.calendarNav+'</span></div>'+
              '</div>'+
              '<div class="apsb-spaces"><span></span><span></span><span></span></div>'+
              '<div class="apsb-user"><div>A</div><span>Alex</span></div>'+
            '</div>'+
            '<div id="auth-preview-content">'+
              '<div id="apc-overview">'+
                '<div class="apc-welcome"><strong data-auth-hero="greeting">'+copy.greeting+'</strong><span data-auth-hero="greetingSub">'+copy.greetingSub+'</span></div>'+
                '<div id="apc-clock">'+
                  '<div id="apc-time">--:--</div>'+
                  '<div id="apc-clock-r"><div id="apc-date">—</div><div id="apc-status"><div class="apc-sdot"></div><span id="apc-stxt"></span></div><div id="apc-week" aria-hidden="true"></div></div>'+
                '</div>'+
              '</div>'+
              '<div id="apc-grid">'+
                '<div id="apc-brain">'+
                  '<div class="apct-lbl"><span class="apct-dot"></span><span data-auth-hero="brainLabel">'+copy.brainLabel+'</span></div>'+
                  '<h3 data-auth-hero="recTitle">'+copy.recTitle+'</h3>'+
                  '<p data-auth-hero="recCopy">'+copy.recCopy+'</p>'+
                  '<div class="apc-brain-actions"><button type="button" tabindex="-1" data-auth-hero="openPlan">'+copy.openPlan+'</button><button type="button" tabindex="-1" data-auth-hero="askBrain">'+copy.askBrain+'</button></div>'+
                '</div>'+
                '<div id="apc-focus">'+
                  '<div class="apct-lbl" data-auth-hero="focusLabel">'+copy.focusLabel+'</div>'+
                  '<div class="apc-focus-row"><span data-auth-hero="deepWork">'+copy.deepWork+'</span><strong>45 min</strong></div>'+
                  '<div class="apc-focus-row"><span data-auth-hero="nextBreak">'+copy.nextBreak+'</span><strong>11:00</strong></div>'+
                  '<div class="apcb-bar"><div class="apcb-bf" id="apcb-f1"></div></div>'+
                  '<div class="apc-focus-row apc-focus-streak"><span data-auth-hero="focusStreak">'+copy.focusStreak+'</span><strong data-auth-hero="days">'+copy.days+'</strong></div>'+
                '</div>'+
                '<div id="apc-tasks">'+
                  '<div class="apc-card-head"><div class="apct-lbl" data-auth-hero="tasksLabel">'+copy.tasksLabel+'</div><span data-auth-hero="viewAll">'+copy.viewAll+'</span></div>'+
                  '<div class="apct-row"><div class="apct-chk done">✓</div><div class="apct-t done" data-auth-hero="t1">'+copy.t1+'</div><time>09:30</time></div>'+
                  '<div class="apct-row"><div class="apct-chk"></div><div class="apct-t" data-auth-hero="t2">'+copy.t2+'</div><time>11:00</time></div>'+
                  '<div class="apct-row"><div class="apct-chk"></div><div class="apct-t" data-auth-hero="t3">'+copy.t3+'</div><time>14:00</time></div>'+
                  '<div class="apct-row"><div class="apct-chk done">✓</div><div class="apct-t done" data-auth-hero="t4">'+copy.t4+'</div><time>17:30</time></div>'+
                '</div>'+
                '<div id="apc-activity">'+
                  '<div class="apc-card-head"><div class="apct-lbl" data-auth-hero="activityLabel">'+copy.activityLabel+'</div><span data-auth-hero="last7">'+copy.last7+'</span></div>'+
                  '<div id="apc-bars"></div>'+
                  '<div class="apc-activity-stats">'+
                    '<div><span data-auth-hero="focusTime">'+copy.focusTime+'</span><strong>32h 14m</strong></div>'+
                    '<div><span data-auth-hero="completed">'+copy.completed+'</span><strong>23</strong></div>'+
                  '</div>'+
                '</div>'+
              '</div>'+
              '<div id="apc-statusbar">'+
                '<span><i></i><b data-auth-hero="allSystems">'+copy.allSystems+'</b></span>'+
                '<span><i data-lucide="refresh-cw"></i><b data-auth-hero="synced">'+copy.synced+'</b></span>'+
                '<span><svg class="apc-github-glyph" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 1.25A8.75 8.75 0 0 0 7.24 18.3c.44.08.6-.2.6-.43v-1.52c-2.44.53-2.95-1.04-2.95-1.04-.4-1.01-.97-1.28-.97-1.28-.8-.55.06-.54.06-.54.88.06 1.35.91 1.35.91.78 1.34 2.05.95 2.55.73.08-.57.31-.95.56-1.17-1.95-.22-4-1-4-4.33 0-.96.34-1.74.9-2.35-.09-.22-.39-1.11.09-2.32 0 0 .74-.24 2.41.9a8.34 8.34 0 0 1 4.4 0c1.67-1.14 2.4-.9 2.4-.9.49 1.21.18 2.1.1 2.32.56.61.9 1.39.9 2.35 0 3.34-2.06 4.1-4.02 4.31.31.27.59.81.59 1.63v2.3c0 .24.16.52.6.43A8.75 8.75 0 0 0 10 1.25Z"/></svg><b data-auth-hero="github">'+copy.github+'</b></span>'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</section>';
  }
  function syncHeroLanguage(){
    var hero=qs("#auth-v3-hero");
    if(!hero)return;
    var copy=heroText();
    Object.keys(copy).forEach(function(key){
      var element=qs('[data-auth-hero="'+key+'"]',hero);
      if(element){
        if(key==="title")element.innerHTML=copy[key];
        else element.textContent=copy[key];
      }
      var labelTarget=qs('[data-auth-hero-label="'+key+'"]',hero);
      if(labelTarget)labelTarget.setAttribute("aria-label",copy[key]);
    });
    updatePreviewRuntime();
  }
  function updatePreviewRuntime(){
    var hero=qs("#auth-v3-hero");
    if(!hero)return;
    var now=new Date();
    var hh=String(now.getHours()).padStart(2,"0");
    var mm=String(now.getMinutes()).padStart(2,"0");
    var t=hh+":"+mm;
    var apcTime=qs("#apc-time",hero); if(apcTime)apcTime.textContent=t;
    var apuTime=qs("#apu-time",hero); if(apuTime)apuTime.textContent=t;
    var dateEl=qs("#apc-date",hero);
    if(dateEl){
      var DAYS={fr:["dim.","lun.","mar.","mer.","jeu.","ven.","sam."],en:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],es:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],de:["So","Mo","Di","Mi","Do","Fr","Sa"]};
      var MONTHS={fr:["jan.","fév.","mar.","avr.","mai","juin","juil.","août","sep.","oct.","nov.","déc."],en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],es:["ene.","feb.","mar.","abr.","may.","jun.","jul.","ago.","sep.","oct.","nov.","dic."],de:["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"]};
      var l=currentLanguage();
      var D=DAYS[l]||DAYS.en, M=MONTHS[l]||MONTHS.en;
      dateEl.textContent=D[now.getDay()]+", "+M[now.getMonth()]+" "+now.getDate();
      var weekEl=qs("#apc-week",hero);
      if(weekEl){
        var todayIdx=now.getDay();
        var order=[1,2,3,4,5,6,0];
        weekEl.innerHTML=order.map(function(dayIndex){
          var isToday=dayIndex===todayIdx;
          return '<span class="apcw-d'+(isToday?" today":"")+'">'+D[dayIndex].replace(/[^A-Za-zÀ-ÿ]/g,"").charAt(0).toUpperCase()+'</span>';
        }).join("");
      }
    }
    var copy=heroText();
    var statusEl=qs("#apc-stxt",hero);
    if(statusEl){
      var h=now.getHours();
      statusEl.textContent=h>=6&&h<12?copy.morning:h>=12&&h<18?copy.work:h>=18&&h<22?copy.evening:copy.night;
    }
    if(!hero.dataset.previewScoreAnimated){
      hero.dataset.previewScoreAnimated="1";
      setTimeout(function(){
        var f1=qs("#apcb-f1",hero),f2=qs("#apcb-f2",hero);
        if(f1)f1.style.transform="scaleX(0.78)";
        if(f2)f2.style.transform="scaleX(0.52)";
      },320);
    }
    var bars=qs("#apc-bars",hero);
    if(bars&&!bars.dataset.built){
      bars.dataset.built="1";
      var d=[10,18,8,28,52,78,66,44,85,94,62,40,70,52,76,88,60,46,32,18,38,52,46,40,26,16,30,48,64,82,74,56,42,28,20,16];
      var mx=Math.max.apply(null,d);
      var ni=Math.floor(now.getHours()/24*d.length);
      bars.innerHTML=d.map(function(v,i){
        var p=Math.round(v/mx*100);
        var scale=(Math.max(p,10)/100).toFixed(3);
        var cl=i===ni?"now":p>80?"pk":p>55?"hi":"";
        return '<div class="ab '+cl+'" style="transform:scaleY('+scale+')"></div>';
      }).join("");
    }
  }
  function nudgeActivityBars(){
    var hero=qs("#auth-v3-hero");
    if(!hero)return;
    var bars=Array.prototype.slice.call(hero.querySelectorAll("#apc-bars .ab"));
    if(!bars.length)return;
    var pick=bars[Math.floor(Math.random()*bars.length)];
    if(pick.classList.contains("now"))return;
    var match=/scaleY\(([\d.]+)\)/.exec(pick.style.transform);
    var current=match?parseFloat(match[1]):0.3;
    var delta=(Math.random()*0.1-0.05);
    var next=Math.min(0.96,Math.max(0.1,current+delta));
    pick.style.transform="scaleY("+next.toFixed(3)+")";
  }
  function startPreviewRuntime(){
    updatePreviewRuntime();
    if(!window.__ethoneAuthV8PreviewTimer){
      window.__ethoneAuthV8PreviewTimer=setInterval(syncHeroLanguage,20000);
      window.addEventListener("online",updatePreviewRuntime);
      window.addEventListener("offline",updatePreviewRuntime);
    }
    if(!window.__ethoneAuthV10ActivityTimer){
      window.__ethoneAuthV10ActivityTimer=setInterval(nudgeActivityBars,4200);
    }
  }
  function syncCardHeight(){
    var loginForm=qs("#form-login");
    var registerForm=qs("#form-register");
    if(!loginForm||!registerForm)return;
    loginForm.style.minHeight="";
    registerForm.style.minHeight="";
    var loginWasHidden=getComputedStyle(loginForm).display==="none";
    var registerWasHidden=getComputedStyle(registerForm).display==="none";
    var measure=function(form,wasHidden){
      if(!wasHidden)return form.scrollHeight;
      var prevPosition=form.style.position,prevVisibility=form.style.visibility,prevDisplay=form.style.display;
      form.style.position="absolute";
      form.style.visibility="hidden";
      form.style.display="block";
      var h=form.scrollHeight;
      form.style.position=prevPosition;
      form.style.visibility=prevVisibility;
      form.style.display=prevDisplay;
      return h;
    };
    var loginHeight=measure(loginForm,loginWasHidden);
    var registerHeight=measure(registerForm,registerWasHidden);
    var target=Math.max(loginHeight,registerHeight);
    if(target>0){
      loginForm.style.minHeight=target+"px";
      registerForm.style.minHeight=target+"px";
    }
  }
  function syncTabControl(){
    var loginForm=qs("#form-login");
    var registerForm=qs("#form-register");
    var loginTab=qs("#tab-login");
    var registerTab=qs("#tab-register");
    if(!loginForm||!registerForm||!loginTab||!registerTab)return;
    var loginActive=getComputedStyle(loginForm).display!=="none";
    var tabList=loginTab.parentElement;
    if(tabList){
      tabList.setAttribute("role","tablist");
      tabList.setAttribute("aria-label","Authentication");
    }
    loginTab.setAttribute("role","tab");
    registerTab.setAttribute("role","tab");
    loginTab.setAttribute("aria-controls","form-login");
    registerTab.setAttribute("aria-controls","form-register");
    loginTab.setAttribute("aria-selected",String(loginActive));
    registerTab.setAttribute("aria-selected",String(!loginActive));
    loginTab.classList.toggle("is-active",loginActive);
    registerTab.classList.toggle("is-active",!loginActive);
    loginForm.setAttribute("aria-hidden",String(!loginActive));
    registerForm.setAttribute("aria-hidden",String(loginActive));
    var tabSlider=qs("#auth-tabs-slider");
    var tabWrap=qs("#auth-tabs-wrap");
    if(tabSlider&&tabWrap){
      var activeTab=loginActive?loginTab:registerTab;
      var wrapRect=tabWrap.getBoundingClientRect(),tabRect=activeTab.getBoundingClientRect();
      if(tabRect.width>0){
        tabSlider.style.width=tabRect.width+"px";
        tabSlider.style.transform="translateX("+(tabRect.left-wrapRect.left)+"px)";
      }
    }
  }
  function apply(){
    var screen=qs("#auth-screen");
    var card=qs("#auth-card");
    if(!screen||!card)return;
    screen.classList.add("ethone-auth-v3");
    if(!qs("#auth-v3-hero",screen)){
      card.insertAdjacentHTML("beforebegin",heroMarkup());
    }
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
    startPreviewRuntime();
    syncTabControl();
    syncLanguageControl();
    syncHeroLanguage();
    syncCardHeight();
    sync();
  }
  function sync(){
    var screen=qs("#auth-screen");
    if(!screen)return;
    var visible=isVisible(screen);
    screen.classList.toggle("ethone-auth-v3-visible",visible);
    if(visible){
      if(screen.style.getPropertyValue("display")!=="flex"||screen.style.getPropertyPriority("display")!=="important"){
        screen.style.setProperty("display","flex","important");
      }
      if(screen.style.getPropertyValue("visibility")!=="visible"||screen.style.getPropertyPriority("visibility")!=="important"){
        screen.style.setProperty("visibility","visible","important");
      }
    }
    syncTabControl();
    syncLanguageControl();
    syncHeroLanguage();
    syncCardHeight();
  }
  function settleEntranceAnimations(){
    ["auth-v3-hero","auth-card"].forEach(function(id){
      var el=qs("#"+id);
      if(el)el.style.animation="none";
    });
    var preview=qs(".auth-v3-preview");
    if(preview)preview.style.animation="none";
  }
  function boot(){
    apply();
    if(typeof window.setLang==="function"&&!window.setLang.__authHeroSyncWrapped){
      var previousSetLang=window.setLang;
      window.setLang=function(){
        var result=previousSetLang.apply(this,arguments);
        setTimeout(syncLanguageControl,20);
        setTimeout(syncHeroLanguage,40);
        setTimeout(syncHeroLanguage,140);
        return result;
      };
      window.setLang.__authHeroSyncWrapped=true;
    }
    try{if(document.fonts&&document.fonts.ready)document.fonts.ready.then(syncCardHeight)}catch(e){}
    var screen=qs("#auth-screen");
    if(screen){
      try{new MutationObserver(sync).observe(screen,{attributes:true,attributeFilter:["style","class"]})}catch(e){}
      setTimeout(sync,80);
      setTimeout(sync,700);
      setTimeout(sync,1800);
      setTimeout(settleEntranceAnimations,900);
      if(!window.__ethoneAuthSliderResize){
        window.__ethoneAuthSliderResize=true;
        var resizeTimer=null;
        window.addEventListener("resize",function(){
          clearTimeout(resizeTimer);
          resizeTimer=setTimeout(function(){syncTabControl();syncLanguageControl();syncCardHeight()},60);
        });
      }
      if(!screen.dataset.authV5LanguageSync){
        screen.dataset.authV5LanguageSync="1";
        screen.addEventListener("click",function(event){
          if(event.target&&event.target.closest&&event.target.closest("#auth-lang-bar button[data-l]")){
            setTimeout(syncLanguageControl,0);
            setTimeout(syncHeroLanguage,0);
            setTimeout(syncHeroLanguage,80);
            setTimeout(syncCardHeight,30);
          }
        },true);
      }
      var cardBox=qs("#lb-box");
      if(cardBox&&!cardBox.dataset.authV10TextObserver){
        cardBox.dataset.authV10TextObserver="1";
        var textSyncTimer=null;
        try{
          new MutationObserver(function(){
            clearTimeout(textSyncTimer);
            textSyncTimer=setTimeout(syncCardHeight,30);
          }).observe(cardBox,{subtree:true,characterData:true,childList:true});
        }catch(e){}
      }
      var languageBar=qs("#auth-lang-bar");
      if(languageBar&&!languageBar.dataset.authV5StyleObserver){
        languageBar.dataset.authV5StyleObserver="1";
        try{
          new MutationObserver(syncLanguageControl).observe(languageBar,{subtree:true,attributes:true,attributeFilter:["style"]});
        }catch(e){}
      }
      var loginForm=qs("#form-login");
      var registerForm=qs("#form-register");
      if(loginForm&&registerForm&&!screen.dataset.authV9TabObserver){
        screen.dataset.authV9TabObserver="1";
        try{
          var tabObserver=new MutationObserver(syncTabControl);
          tabObserver.observe(loginForm,{attributes:true,attributeFilter:["style"]});
          tabObserver.observe(registerForm,{attributes:true,attributeFilter:["style"]});
        }catch(e){}
      }
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
  window.addEventListener("ethone:auth-ready",boot);
})();
