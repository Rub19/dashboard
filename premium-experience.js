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
    fr:{title:"Votre système <span>d'exploitation personnel.</span>",copy:"Brain, vos espaces et vos outils, réunis en un seul endroit.",badge:"OS Personnel",search:"Brain, fichiers, commandes…",ready:"Prêt",morning:"Session matinale",work:"Session de travail",evening:"Mode soirée",night:"Mode nuit",brainLabel:"ETHONE Brain",score:"Score de productivité",tasksLabel:"TÂCHES",t1:"Synchro Brain",t2:"Revoir Marketplace",t3:"Session focus · 2h",t4:"Habitudes du jour",habitsLabel:"HABITUDES",h1:"Session focus",h2:"Espaces",h3:"Automatisations",activityLabel:"ACTIVITÉ DU JOUR"},
    en:{title:"Your Personal <span>Operating System<i>.</i></span>",copy:"Brain, Workspaces and your tools — organized as one.",badge:"Personal OS",search:"Brain, files, commands…",ready:"Ready",morning:"Morning session",work:"Work session",evening:"Evening mode",night:"Night mode",brainLabel:"ETHONE Brain",score:"Productivity score",tasksLabel:"TASKS",t1:"Brain memory sync",t2:"Review Marketplace",t3:"Focus session · 2h",t4:"Daily habits",habitsLabel:"HABITS",h1:"Focus session",h2:"Workspaces",h3:"Automations",activityLabel:"ACTIVITY TODAY"},
    es:{title:"Tu sistema <span>operativo personal.</span>",copy:"Brain, tus espacios y tus herramientas, todo en un mismo lugar.",badge:"OS Personal",search:"Brain, archivos, comandos…",ready:"Listo",morning:"Sesión matutina",work:"Sesión de trabajo",evening:"Modo tarde",night:"Modo noche",brainLabel:"ETHONE Brain",score:"Puntuación de productividad",tasksLabel:"TAREAS",t1:"Sincronizar Brain",t2:"Revisar Marketplace",t3:"Sesión de enfoque · 2h",t4:"Hábitos diarios",habitsLabel:"HÁBITOS",h1:"Sesión de enfoque",h2:"Espacios",h3:"Automatizaciones",activityLabel:"ACTIVIDAD DE HOY"},
    de:{title:"Dein persönliches <span>Betriebssystem.</span>",copy:"Brain, Workspaces und deine Werkzeuge an einem Ort.",badge:"Persönliches OS",search:"Brain, Dateien, Befehle…",ready:"Bereit",morning:"Morgen-Sitzung",work:"Arbeitssitzung",evening:"Abendmodus",night:"Nachtmodus",brainLabel:"ETHONE Brain",score:"Produktivitätswert",tasksLabel:"AUFGABEN",t1:"Brain-Sync",t2:"Marketplace prüfen",t3:"Fokus-Sitzung · 2h",t4:"Tägliche Gewohnheiten",habitsLabel:"GEWOHNHEITEN",h1:"Fokus-Sitzung",h2:"Workspaces",h3:"Automatisierungen",activityLabel:"AKTIVITÄT HEUTE"}
  };
  function heroText(){return HERO_TEXT.en}
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
            '</div>'+
          '</div>'+
          '<div id="auth-preview-body">'+
            '<div id="auth-preview-sb">'+
              '<div class="apsb-logo">E</div>'+
              '<div class="apsb-item on" title="Home"><i data-lucide="layout-dashboard"></i></div>'+
              '<div class="apsb-item" title="Tasks"><i data-lucide="square-check-big"></i></div>'+
              '<div class="apsb-item" title="Notes"><i data-lucide="notebook-pen"></i></div>'+
              '<div class="apsb-item" title="Habits"><i data-lucide="circle-gauge"></i></div>'+
              '<div class="apsb-item" title="Workspaces"><i data-lucide="panels-top-left"></i></div>'+
              '<div class="apsb-item" title="Marketplace"><i data-lucide="store"></i></div>'+
              '<div class="apsb-item apsb-brain" title="Brain"><i data-lucide="brain"></i></div>'+
            '</div>'+
            '<div id="auth-preview-content">'+
              '<div id="apc-clock">'+
                '<div id="apc-time">--:--</div>'+
                '<div id="apc-clock-r"><div id="apc-date">—</div><div id="apc-status"><div class="apc-sdot"></div><span id="apc-stxt"></span></div></div>'+
              '</div>'+
              '<div id="apc-row1">'+
                '<div id="apc-brain">'+
                  '<div class="apct-lbl"><span class="apct-dot"></span><span data-auth-hero="brainLabel">'+copy.brainLabel+'</span></div>'+
                  '<div id="apcb-score">78</div>'+
                  '<div id="apcb-lbl" data-auth-hero="score">'+copy.score+'</div>'+
                  '<div class="apcb-bar"><div class="apcb-bf" id="apcb-f1"></div></div>'+
                  '<div class="apcb-bar"><div class="apcb-bf" id="apcb-f2" style="opacity:.4"></div></div>'+
                  '<div id="apc-modules">'+
                    '<span class="apcm">Brain</span><span class="apcm">Automations</span><span class="apcm">Insights</span><span class="apcm">Workspaces</span><span class="apcm">Marketplace</span>'+
                  '</div>'+
                '</div>'+
                '<div id="apc-tasks">'+
                  '<div class="apct-lbl" data-auth-hero="tasksLabel">'+copy.tasksLabel+'</div>'+
                  '<div class="apct-row"><div class="apct-chk done">✓</div><div class="apct-t done" data-auth-hero="t1">'+copy.t1+'</div></div>'+
                  '<div class="apct-row"><div class="apct-chk"></div><div class="apct-t" data-auth-hero="t2">'+copy.t2+'</div></div>'+
                  '<div class="apct-row"><div class="apct-chk"></div><div class="apct-t" data-auth-hero="t3">'+copy.t3+'</div></div>'+
                  '<div class="apct-row"><div class="apct-chk done">✓</div><div class="apct-t done" data-auth-hero="t4">'+copy.t4+'</div></div>'+
                '</div>'+
              '</div>'+
              '<div id="apc-habits">'+
                '<div class="apct-lbl" data-auth-hero="habitsLabel">'+copy.habitsLabel+'</div>'+
                '<div class="apch-row"><span class="apch-n" data-auth-hero="h1">'+copy.h1+'</span><div class="apch-dots"><div class="apch-d on"></div><div class="apch-d on"></div><div class="apch-d on"></div><div class="apch-d on"></div><div class="apch-d now"></div><div class="apch-d"></div><div class="apch-d"></div></div></div>'+
                '<div class="apch-row"><span class="apch-n" data-auth-hero="h2">'+copy.h2+'</span><div class="apch-dots"><div class="apch-d on"></div><div class="apch-d on"></div><div class="apch-d"></div><div class="apch-d on"></div><div class="apch-d now"></div><div class="apch-d"></div><div class="apch-d"></div></div></div>'+
                '<div class="apch-row"><span class="apch-n" data-auth-hero="h3">'+copy.h3+'</span><div class="apch-dots"><div class="apch-d on"></div><div class="apch-d"></div><div class="apch-d on"></div><div class="apch-d on"></div><div class="apch-d"></div><div class="apch-d"></div><div class="apch-d"></div></div></div>'+
              '</div>'+
              '<div id="apc-activity">'+
                '<div class="apct-lbl" data-auth-hero="activityLabel">'+copy.activityLabel+'</div>'+
                '<div id="apc-bars"></div>'+
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
        if(f1)f1.style.width="78%";
        if(f2)f2.style.width="52%";
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
        var cl=i===ni?"now":p>80?"pk":p>55?"hi":"";
        return '<div class="ab '+cl+'" style="height:'+p+'%"></div>';
      }).join("");
    }
  }
  function startPreviewRuntime(){
    updatePreviewRuntime();
    if(!window.__ethoneAuthV8PreviewTimer){
      window.__ethoneAuthV8PreviewTimer=setInterval(syncHeroLanguage,30000);
      window.addEventListener("online",updatePreviewRuntime);
      window.addEventListener("offline",updatePreviewRuntime);
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
          resizeTimer=setTimeout(function(){syncTabControl();syncLanguageControl()},60);
        });
      }
      if(!screen.dataset.authV5LanguageSync){
        screen.dataset.authV5LanguageSync="1";
        screen.addEventListener("click",function(event){
          if(event.target&&event.target.closest&&event.target.closest("#auth-lang-bar button[data-l]")){
            setTimeout(syncLanguageControl,0);
            setTimeout(syncHeroLanguage,0);
          }
        });
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
