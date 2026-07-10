/* ETHONE First Run Experience
   Premium onboarding after the first authenticated dashboard mount.
   It stores progress locally and only writes profile preferences on completion. */
(function(){
  "use strict";
  if(window.__ethoneFirstRunReady)return;
  window.__ethoneFirstRunReady=true;

  var BASE_KEY="ethone:first-run:v1";
  var root=null;
  var whatsNewRoot=null;
  var autoTimer=0;
  var settingsTimer=0;
  var userMenuTimer=0;
  var whatsNewTimer=0;
  var previewClockTimer=0;
  var launchTimers=[];
  var previewRevision=0;
  var isCompleting=false;
  var manualOpen=false;
  var devSession=false;
  var globalKeyBound=false;
  var userMenuDocBound=false;
  var currentState=null;
  var WHATS_NEW_VERSION=window.ETHONE_ONBOARDING_RELEASE_VERSION||"5.4.0";
  var WHATS_NEW_KEY="ethone:whats-new:seen";
  var WHATS_NEW_ITEMS=[
    {type:"Nouveau",title:"First Run Experience",body:"Un onboarding premium configure maintenant le Space, le style, le dashboard et Brain."},
    {type:"Amelioration",title:"Dashboard initial",body:"Les widgets choisis sont ajoutes automatiquement au layout ETHONE."},
    {type:"Qualite",title:"Cache et stabilite",body:"Le service worker force une nouvelle version apres chaque grosse mise a jour."}
  ];

  var SPACE_OPTIONS=[
    {id:"personal",code:"PE",label:"Personnel",sub:"Vie quotidienne, notes, objectifs et organisation.",icon:"home"},
    {id:"work",code:"TR",label:"Travail",sub:"Projets, calendrier, fichiers et priorites.",icon:"briefcase"},
    {id:"development",code:"DV",label:"Developpement",sub:"GitHub, notes techniques, tasks et focus.",icon:"code-2"},
    {id:"study",code:"ET",label:"Etudes",sub:"Cours, revision, devoirs et ressources.",icon:"book-open"},
    {id:"gaming",code:"GM",label:"Gaming",sub:"Valorant, Steam, Discord, Spotify et sessions.",icon:"gamepad-2"},
    {id:"streaming",code:"ST",label:"Streaming",sub:"OBS, scenes, chat, musique et planning.",icon:"radio"},
    {id:"creative",code:"CR",label:"Creatif",sub:"Idees, contenus, moodboards et production visuelle.",icon:"palette"},
    {id:"custom",code:"CU",label:"Personnalise",sub:"Construis un environnement ETHONE a ton image.",icon:"sparkles"}
  ];

  var FLOW_OPTIONS=[
    {id:"personal",code:"PE",label:"Personal Flow",sub:"Journal, calendrier et contexte quotidien.",icon:"home",accent:"#8b5cf6"},
    {id:"development",code:"DV",label:"Development Flow",sub:"GitHub, Brain, notes et concentration.",icon:"square-terminal",accent:"#7c3aed"},
    {id:"gaming",code:"GM",label:"Gaming Flow",sub:"Discord, Spotify, jeux et performances.",icon:"gamepad-2",accent:"#a855f7"},
    {id:"study",code:"ST",label:"Study Flow",sub:"Notes, fichiers, planning et focus.",icon:"book-open-check",accent:"#c084fc"},
    {id:"streaming",code:"SR",label:"Streaming Flow",sub:"OBS, chat, musique et production live.",icon:"radio",accent:"#d946ef"}
  ];

  var DASHBOARD_OPTIONS=[
    {id:"control",code:"CT",label:"Control",sub:"Une vue equilibree pour tout piloter.",icon:"layout-dashboard"},
    {id:"focus",code:"FO",label:"Focus",sub:"Priorites et travail profond au premier plan.",icon:"panel-top"},
    {id:"ambient",code:"AM",label:"Ambient",sub:"Un espace plus visuel et respirant.",icon:"gallery-horizontal-end"}
  ];

  var ACCENTS=[
    {id:"purple",label:"ETHONE Purple",value:"#8b5cf6"},
    {id:"violet",label:"Deep Violet",value:"#7c3aed"},
    {id:"rose",label:"Muted Rose",value:"#c084fc"},
    {id:"mono",label:"Soft White",value:"#d8d4ff"}
  ];

  var THEME_OPTIONS=[
    {id:"ethone-purple",label:"Dark",sub:"L'identite ETHONE par defaut."},
    {id:"oled",label:"OLED",sub:"Noir profond, contraste maximal."},
    {id:"glass",label:"Glass",sub:"Surfaces premium plus translucides."}
  ];

  var DENSITIES=[
    {id:"compact",label:"Compact",sub:"Plus dense"},
    {id:"comfortable",label:"Confort",sub:"Equilibre"},
    {id:"cozy",label:"Large",sub:"Plus aere"}
  ];

  var FONT_OPTIONS=[
    {id:"inter",label:"Inter",sub:"Interface claire et moderne."},
    {id:"system",label:"System",sub:"Rendu natif Apple/Windows."},
    {id:"grotesk",label:"Grotesk",sub:"Identite plus editoriale."},
    {id:"mono",label:"Mono",sub:"Developer-first, precise."}
  ];

  var BACKGROUNDS=[
    {id:"none",label:"Noir calme"},
    {id:"aurora",label:"Aurora discret"},
    {id:"glass",label:"Verre sombre"},
    {id:"stars",label:"Etoiles fines"}
  ];

  var WIDGET_OPTIONS=[
    {id:"today",code:"TD",label:"Aujourd'hui",sub:"Vue du jour, focus et habitudes.",icon:"sun"},
    {id:"notes",code:"NO",label:"Notes",sub:"Dernieres notes et idees.",icon:"notebook-pen"},
    {id:"calendar",code:"CA",label:"Calendrier",sub:"Evenements et deadlines.",icon:"calendar-days"},
    {id:"tasks",code:"TA",label:"Taches",sub:"Priorites et progression.",icon:"check-square"},
    {id:"spotify",code:"SP",label:"Spotify",sub:"Musique et contexte.",icon:"music"},
    {id:"discord",code:"DI",label:"Discord",sub:"Presence et communaute.",icon:"message-circle"},
    {id:"github",code:"GH",label:"GitHub",sub:"Dev activity et repositories.",icon:"git-branch"},
    {id:"brain",code:"AI",label:"Brain",sub:"Suggestions et briefing intelligent.",icon:"brain-circuit"},
    {id:"focus",code:"FO",label:"Focus",sub:"Sessions, pomodoro et concentration.",icon:"timer"},
    {id:"clock",code:"CL",label:"Horloge",sub:"Heure locale et rythme de journee.",icon:"clock"},
    {id:"weather",code:"ME",label:"Meteo",sub:"Contexte local et planning.",icon:"cloud-sun"}
  ];

  var CONNECTION_OPTIONS=[
    {id:"google",code:"GO",label:"Google",sub:"Calendar et Drive."},
    {id:"github",code:"GH",label:"GitHub",sub:"Repos, commits et projets."},
    {id:"discord",code:"DI",label:"Discord",sub:"Presence et notifications."},
    {id:"spotify",code:"SP",label:"Spotify",sub:"Musique et historique."},
    {id:"riot",code:"RI",label:"Riot",sub:"Valorant et comptes."},
    {id:"steam",code:"ST",label:"Steam",sub:"Gaming et bibliotheque."},
    {id:"lastfm",code:"FM",label:"Last.fm",sub:"Historique musical."}
  ];

  var PROVIDERS=[
    {id:"groq",label:"Groq",sub:"Rapide pour les actions quotidiennes."},
    {id:"openai",label:"OpenAI",sub:"Generaliste et fiable."},
    {id:"claude",label:"Claude",sub:"Raisonnement et documents."},
    {id:"gemini",label:"Gemini",sub:"Google ecosystem."},
    {id:"openrouter",label:"OpenRouter",sub:"Routage multi-modeles."},
    {id:"ollama",label:"Ollama",sub:"Local et prive."}
  ];

  var STEPS=[
    {id:"welcome",short:"Welcome",title:"Bienvenue dans ETHONE.",sub:"Votre systeme d'exploitation personnel."},
    {id:"space",short:"Space",title:"Choisissez votre Space principal",sub:"Chaque Space possede son dashboard, ses widgets, ses couleurs et son contexte."},
    {id:"style",short:"Style",title:"Definissez l'identite visuelle",sub:"Choisissez un accent, une densite, les animations et le fond de depart."},
    {id:"widgets",short:"Widgets",title:"Composez votre premier dashboard",sub:"Selectionnez les modules qui doivent apparaitre des l'ouverture d'ETHONE."},
    {id:"connections",short:"Connexions",title:"Preparez les connexions rapides",sub:"Aucune API n'est appelee ici. ETHONE prepare seulement les integrations que vous voulez brancher."},
    {id:"brain",short:"Brain",title:"Configurez ETHONE Brain",sub:"Brain peut resumer votre journee, proposer la prochaine action et comprendre votre contexte."},
    {id:"finish",short:"Finaliser",title:"Votre ETHONE est pret",sub:"Verifiez la configuration, puis entrez dans votre nouvel environnement."}
  ];

  function defaultState(){
    return {
      version:2,
      completed:false,
      completedAt:null,
      dismissedAt:null,
      step:0,
      selections:{
        space:"personal",
        customSpaceName:"",
        flow:"personal",
        dashboard:"control",
        style:{theme:"ethone-purple",accent:"#8b5cf6",density:"comfortable",animations:true,background:"aurora",font:"inter"},
        widgets:["today","notes","tasks","calendar","focus","brain"],
        connections:[],
        brain:{enabled:true,provider:"groq",memory:true,automations:false,suggestions:true}
      }
    };
  }

  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }

  function storageKey(){
    var p=profile();
    var id=p&&p.id!=null?String(p.id):"global";
    return BASE_KEY+":"+id;
  }

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function mergeState(raw){
    var base=defaultState();
    raw=raw&&typeof raw==="object"?raw:{};
    base.completed=!!raw.completed;
    base.completedAt=raw.completedAt||null;
    base.dismissedAt=raw.dismissedAt||null;
    base.step=Math.max(0,Math.min(STEPS.length-1,parseInt(raw.step,10)||0));
    if(raw.selections&&typeof raw.selections==="object"){
      base.selections.space=raw.selections.space||base.selections.space;
      base.selections.customSpaceName=raw.selections.customSpaceName||"";
      base.selections.flow=raw.selections.flow||base.selections.flow;
      base.selections.dashboard=raw.selections.dashboard||base.selections.dashboard;
      if(raw.selections.style)base.selections.style=Object.assign({},base.selections.style,raw.selections.style);
      if(Array.isArray(raw.selections.widgets))base.selections.widgets=raw.selections.widgets.slice();
      if(Array.isArray(raw.selections.connections))base.selections.connections=raw.selections.connections.slice();
      if(raw.selections.brain)base.selections.brain=Object.assign({},base.selections.brain,raw.selections.brain);
    }
    return base;
  }

  function readState(){
    var stored=null;
    try{stored=JSON.parse(localStorage.getItem(storageKey())||"null")}catch(e){stored=null}
    var st=mergeState(stored);
    var p=profile();
    var pf=p&&p.state&&p.state.firstRun;
    if(pf&&pf.completed){
      st.completed=true;
      st.completedAt=pf.completedAt||st.completedAt;
    }
    currentState=st;
    return st;
  }

  function writeState(st){
    currentState=mergeState(st);
    try{localStorage.setItem(storageKey(),JSON.stringify(currentState))}catch(e){}
    if(devSession){
      updateSettingsStatus();
      return;
    }
    var p=profile();
    if(p&&p.state){
      p.state.firstRun=Object.assign({},p.state.firstRun||{},{
        version:currentState.version,
        completed:currentState.completed,
        completedAt:currentState.completedAt,
        lastStep:currentState.step,
        selections:clone(currentState.selections)
      });
    }
    updateSettingsStatus();
  }

  function saveProfileNow(){
    try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
  }

  function esc(value){
    return String(value==null?"":value).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch];
    });
  }

  function iconMarkup(name){
    name=name||"sparkles";
    return '<i data-lucide="'+esc(name)+'" aria-hidden="true"></i>';
  }

  function refreshIcons(scope){
    try{
      if(window.lucide&&typeof window.lucide.createIcons==="function"){
        window.lucide.createIcons(scope?{attrs:{"stroke-width":1.8}}:undefined);
      }
    }catch(e){}
  }

  function findById(list,id){
    for(var i=0;i<list.length;i++)if(list[i].id===id)return list[i];
    return list[0];
  }

  function selected(list,id){
    return Array.isArray(list)&&list.indexOf(id)>-1;
  }

  function diagnostic(label,error){
    try{
      window.__ethoneFirstRunDiagnostics=(window.__ethoneFirstRunDiagnostics||[]).slice(-30);
      window.__ethoneFirstRunDiagnostics.push({label:label,message:error&&error.message?error.message:String(error||""),at:new Date().toISOString()});
    }catch(e){}
  }

  function toggleList(list,id){
    list=Array.isArray(list)?list.slice():[];
    var idx=list.indexOf(id);
    if(idx>-1)list.splice(idx,1);
    else list.push(id);
    return list;
  }

  function isDashboardVisible(){
    var main=document.getElementById("main-content");
    if(!main)return false;
    var style=getComputedStyle(main);
    if(style.display==="none"||style.visibility==="hidden")return false;
    var auth=document.getElementById("auth-screen");
    var profileScreen=document.getElementById("profile-screen");
    var password=document.getElementById("password-screen");
    if(auth&&getComputedStyle(auth).display!=="none")return false;
    if(profileScreen&&getComputedStyle(profileScreen).display!=="none")return false;
    if(password&&getComputedStyle(password).display!=="none")return false;
    return true;
  }

  function shouldAutoShow(){
    var st=readState();
    if(st.dismissedAt&&Date.now()-new Date(st.dismissedAt).getTime()<1000*60*60*6)return false;
    return !st.completed&&isDashboardVisible();
  }

  function scheduleAutoOpen(delay){
    clearTimeout(autoTimer);
    autoTimer=setTimeout(function(){
      if(shouldAutoShow())open({auto:true});
    },delay==null?220:delay);
  }

  function ensureRoot(){
    if(root)return root;
    root=document.getElementById("ethone-first-run-root");
    if(!root){
      root=document.createElement("div");
      root.id="ethone-first-run-root";
      root.setAttribute("aria-live","polite");
      document.body.appendChild(root);
    }
    root.addEventListener("click",handleClick);
    root.addEventListener("input",handleInput);
    root.addEventListener("keydown",handleKeydown);
    return root;
  }

  function stepState(st,index){
    if(st.completed||index<st.step)return "done";
    if(index===st.step)return "active";
    return "pending";
  }

  function estimateMinutes(st){
    var remaining=Math.max(0,STEPS.length-1-st.step);
    return Math.max(1,Math.ceil((remaining+1)*0.28));
  }

  function currentSpaceLabel(st){
    if(st.selections.space==="custom")return (st.selections.customSpaceName||"Custom Space").trim()||"Custom Space";
    return labelFrom(SPACE_OPTIONS,st.selections.space);
  }

  function flowForSpace(spaceId){
    if(spaceId==="development"||spaceId==="work")return "development";
    if(spaceId==="gaming")return "gaming";
    if(spaceId==="study")return "study";
    if(spaceId==="streaming"||spaceId==="creative")return "streaming";
    return "personal";
  }

  function dashboardForSpace(spaceId){
    if(spaceId==="development"||spaceId==="work"||spaceId==="study")return "focus";
    if(spaceId==="gaming"||spaceId==="streaming"||spaceId==="creative")return "ambient";
    return "control";
  }

  function currentFlow(st){
    return findById(FLOW_OPTIONS,st.selections.flow||"personal");
  }

  function currentDashboard(st){
    return findById(DASHBOARD_OPTIONS,st.selections.dashboard||"control");
  }

  function syncOnboardingVars(st){
    if(!root||!st||!st.selections)return;
    var style=st.selections.style||defaultState().selections.style;
    var rgb=hexToRgb(style.accent).join(",");
    root.style.setProperty("--fron-accent",style.accent||"#8b5cf6");
    root.style.setProperty("--fron-accent-rgb",rgb);
    root.dataset.fronTheme=style.theme||"ethone-purple";
    root.dataset.fronDensity=style.density||"comfortable";
    root.dataset.fronFont=style.font||"inter";
    root.classList.toggle("fron-motion-off",style.animations===false);
  }

  function assistantCopy(st){
    var space=currentSpaceLabel(st);
    var style=st.selections.style||defaultState().selections.style;
    var widgets=st.selections.widgets||[];
    var connections=st.selections.connections||[];
    var brain=st.selections.brain||{};
    if(st.step===0)return {
      title:"Configuration guidee",
      body:"ETHONE va preparer un environnement clair, rapide et modifiable plus tard.",
      meta:"Aucune API n'est appelee pendant l'onboarding."
    };
    if(st.step===1)return {
      title:"Votre environnement prend forme",
      body:"Le Space "+space+" et le "+currentFlow(st).label+" construisent deja la preview a droite.",
      meta:"Le Flow organise le contexte sans changer vos donnees."
    };
    if(st.step===2)return {
      title:"Identite visuelle",
      body:"Accent "+(style.accent||"#8b5cf6")+" avec densite "+(style.density||"comfortable")+". La preview se met a jour instantanement.",
      meta:style.animations?"Micro-interactions activees.":"Animations reduites pour un rendu plus calme."
    };
    if(st.step===3)return {
      title:"Dashboard vivant",
      body:currentDashboard(st).label+" organise "+widgets.length+" widgets dans la preview en temps reel.",
      meta:widgets.indexOf("brain")>-1?"Brain sera visible au centre de l'experience.":"Vous pourrez ajouter Brain plus tard depuis Widgets."
    };
    if(st.step===4)return {
      title:"Connexions preparees",
      body:connections.length?connections.length+" services seront prepares sans connexion automatique.":"Aucun service externe ne sera prepare pour l'instant.",
      meta:"Les autorisations restent dans Connexions ou Settings."
    };
    if(st.step===5)return {
      title:"Brain OS",
      body:brain.enabled?"Brain utilisera "+labelFrom(PROVIDERS,brain.provider)+" comme provider prefere.":"Brain restera desactive au demarrage.",
      meta:"Memoire, suggestions et automatisations restent controlables."
    };
    return {
      title:"Pret au lancement",
      body:"ETHONE va construire "+space+", activer "+currentFlow(st).label+" et composer le dashboard "+currentDashboard(st).label+".",
      meta:"La sequence finale applique vos choix sans appel reseau."
    };
  }

  function renderAssistant(st){
    var copy=assistantCopy(st);
    return '<div class="fron-assistant-host"><aside class="fron-assistant">'+
      '<span class="fron-assistant-pulse" aria-hidden="true"></span>'+
      '<div><strong>'+esc(copy.title)+'</strong><p>'+esc(copy.body)+'</p><small>'+esc(copy.meta)+'</small></div>'+
    '</aside></div>';
  }

  function renderProgress(st){
    return STEPS.map(function(step,index){
      var classes=["fron-step-link"];
      var state=stepState(st,index);
      if(state==="active")classes.push("is-active");
      if(state==="done")classes.push("is-done");
      return '<button class="'+classes.join(" ")+'" type="button" data-fron-action="goto" data-step="'+index+'">'+
        '<span class="fron-step-num">'+(state==="done"?'&#10003;':(index+1))+'</span>'+
        '<span class="fron-step-meta"><strong>'+esc(step.short)+'</strong><span>'+esc(step.id)+'</span></span>'+
      '</button>';
    }).join("");
  }

  function choiceCard(item,isSelected,action){
    return '<button class="fron-choice'+(isSelected?' is-selected':'')+'" type="button" data-fron-action="'+esc(action)+'" data-id="'+esc(item.id)+'" aria-pressed="'+(isSelected?'true':'false')+'">'+
      '<span class="fron-choice-top"><span class="fron-choice-icon">'+iconMarkup(item.icon||"sparkles")+'</span><span class="fron-choice-code">'+esc(item.code||item.label.slice(0,2).toUpperCase())+'</span></span>'+
      '<b>'+esc(item.label)+'</b>'+
      '<span>'+esc(item.sub||"")+'</span>'+
      (item.status?'<em class="fron-choice-status">'+esc(item.status)+'</em>':'')+
    '</button>';
  }

  function renderWelcome(){
    var items=[
      {label:"Space",sub:"Un environnement principal coherent.",icon:"layout-dashboard"},
      {label:"Style",sub:"Un theme ETHONE applique partout.",icon:"paintbrush"},
      {label:"Widgets",sub:"Un dashboard utile des le premier lancement.",icon:"blocks"},
      {label:"Brain",sub:"Une intelligence contextuelle, jamais intrusive.",icon:"brain-circuit"}
    ];
    return '<div class="fron-welcome">'+
      '<div class="fron-welcome-card">'+
        '<span class="fron-kicker">Personal Operating System</span>'+
        '<h3>Configurez ETHONE comme un environnement, pas comme un formulaire.</h3>'+
        '<p>En quelques choix, ETHONE prepare un Space, un style, un dashboard et Brain tout en gardant une base rapide et reversible.</p>'+
      '</div>'+
      '<div class="fron-mini-grid">'+items.map(function(item){
        return '<article><span>'+iconMarkup(item.icon)+'</span><strong>'+esc(item.label)+'</strong><small>'+esc(item.sub)+'</small></article>';
      }).join("")+'</div>'+
    '</div>';
  }

  function renderSpace(st){
    var current=st.selections.space;
    var html='<div class="fron-card-grid">';
    SPACE_OPTIONS.forEach(function(item){html+=choiceCard(item,current===item.id,"select-space")});
    html+='</div>';
    if(current==="custom"){
      html+='<div class="fron-custom-space"><input class="fron-input" data-fron-field="customSpaceName" value="'+esc(st.selections.customSpaceName)+'" placeholder="Nom du Space"/></div>';
    }
    html+='<section class="fron-experience-section">'+
      '<div class="fron-section-heading"><div><span>Flow initial</span><h3>Choisissez votre rythme</h3></div><small>La preview se transforme instantanement.</small></div>'+
      '<div class="fron-card-grid fron-card-grid-compact fron-flow-grid">'+FLOW_OPTIONS.map(function(item){
        return choiceCard(item,(st.selections.flow||"personal")===item.id,"select-flow");
      }).join("")+'</div>'+
    '</section>';
    return html;
  }

  function renderStyle(st){
    var style=st.selections.style;
    return '<div class="fron-control-panel">'+
      '<div class="fron-control-row">'+
        '<h3>Theme sombre</h3>'+
        '<div class="fron-card-grid fron-card-grid-compact">'+THEME_OPTIONS.map(function(item){
          return choiceCard({id:item.id,code:item.id==="oled"?"OL":item.id==="glass"?"GL":"DK",label:item.label,sub:item.sub},style.theme===item.id,"select-theme");
        }).join("")+'</div>'+
      '</div>'+
      '<div class="fron-control-row">'+
        '<h3>Accent color</h3>'+
        '<div class="fron-segment">'+ACCENTS.map(function(item){
          return '<button class="fron-accent-dot'+(style.accent===item.value?' is-selected':'')+'" type="button" data-fron-action="select-accent" data-id="'+esc(item.value)+'" title="'+esc(item.label)+'" style="background:'+esc(item.value)+'"></button>';
        }).join("")+'</div>'+
      '</div>'+
      '<div class="fron-control-row">'+
        '<h3>Densite</h3>'+
        '<div class="fron-segment">'+DENSITIES.map(function(item){
          return '<button class="fron-chip'+(style.density===item.id?' is-selected':'')+'" type="button" data-fron-action="select-density" data-id="'+esc(item.id)+'">'+esc(item.label)+' · '+esc(item.sub)+'</button>';
        }).join("")+'</div>'+
      '</div>'+
      '<div class="fron-control-row">'+
        '<div class="fron-toggle"><div><h3>Animations</h3><span style="color:var(--fron-muted);font-size:12px">Micro-interactions fluides, desactivables a tout moment.</span></div>'+
        '<button class="fron-switch'+(style.animations?' is-on':'')+'" type="button" data-fron-action="toggle-animations" aria-label="Animations"><i></i></button></div>'+
      '</div>'+
      '<div class="fron-control-row">'+
        '<h3>Fond</h3>'+
        '<div class="fron-segment">'+BACKGROUNDS.map(function(item){
          return '<button class="fron-chip'+(style.background===item.id?' is-selected':'')+'" type="button" data-fron-action="select-background" data-id="'+esc(item.id)+'">'+esc(item.label)+'</button>';
        }).join("")+'</div>'+
      '</div>'+
      '<div class="fron-control-row">'+
        '<h3>Police</h3>'+
        '<div class="fron-segment">'+FONT_OPTIONS.map(function(item){
          return '<button class="fron-chip'+((style.font||"inter")===item.id?' is-selected':'')+'" type="button" data-fron-action="select-font" data-id="'+esc(item.id)+'">'+esc(item.label)+'</button>';
        }).join("")+'</div>'+
      '</div>'+
    '</div>';
  }

  function renderStylePreview(style){
    var rgb=hexToRgb(style.accent).join(",");
    var font=style.font||"inter";
    return '<div class="fron-style-preview" style="--preview-accent:'+esc(style.accent)+';--preview-rgb:'+esc(rgb)+'" data-preview-theme="'+esc(style.theme||"ethone-purple")+'" data-preview-density="'+esc(style.density||"comfortable")+'" data-preview-font="'+esc(font)+'">'+
      '<div class="fron-preview-sidebar"><span></span><i></i><i></i><i></i></div>'+
      '<div class="fron-preview-main">'+
        '<div class="fron-preview-top"><strong>ETHONE</strong><small>Brain ready</small></div>'+
        '<div class="fron-preview-card brain"><span>Brain</span><b>Votre espace est pret.</b><em></em></div>'+
        '<div class="fron-preview-grid"><div></div><div></div><div></div></div>'+
      '</div>'+
    '</div>';
  }

  function previewWidgetLabel(id){
    var item=findById(WIDGET_OPTIONS,id);
    return item&&item.label?item.label:id;
  }

  function previewWidgetIcon(id){
    var item=findById(WIDGET_OPTIONS,id);
    return item&&item.icon?item.icon:"square";
  }

  function previewMetric(id,index){
    var metrics={
      today:"4 focus",
      notes:"12 notes",
      calendar:"2 events",
      tasks:"5 tasks",
      spotify:"Live",
      discord:"Online",
      github:"3 commits",
      brain:"Ready",
      focus:"42 min",
      clock:"Now",
      weather:"18 deg"
    };
    return metrics[id]||("Slot "+(index+1));
  }

  function previewContext(st){
    var flow=currentFlow(st);
    var contexts={
      personal:{eyebrow:"Daily system",headline:"Votre journee, organisee sans bruit.",status:"Contexte personnel actif"},
      development:{eyebrow:"Build session",headline:"Code, notes et priorites dans le meme contexte.",status:"Environnement de developpement pret"},
      gaming:{eyebrow:"Gaming session",headline:"Jeux, presence et musique au meme endroit.",status:"Mode gaming synchronise"},
      study:{eyebrow:"Study session",headline:"Cours, planning et focus restent alignes.",status:"Session d'etude preparee"},
      streaming:{eyebrow:"Live control",headline:"Production, chat et diffusion restent visibles.",status:"Regie streaming prete"}
    };
    return Object.assign({flow:flow},contexts[flow.id]||contexts.personal);
  }

  function orderedWidgetIds(st){
    var widgets=(st.selections.widgets||[]).slice();
    var layout=st.selections.dashboard||"control";
    var priorities={
      control:["brain","today","tasks","calendar","notes","focus","github","spotify","discord","weather","clock"],
      focus:["focus","tasks","calendar","notes","brain","github","today","clock","weather","spotify","discord"],
      ambient:["today","spotify","weather","calendar","brain","discord","github","notes","tasks","focus","clock"]
    };
    var order=priorities[layout]||priorities.control;
    widgets.sort(function(a,b){
      var ai=order.indexOf(a),bi=order.indexOf(b);
      return (ai<0?99:ai)-(bi<0?99:bi);
    });
    return widgets;
  }

  function orderedPreviewWidgets(st,preferredId){
    var all=orderedWidgetIds(st);
    var visible=all.slice(0,6);
    if(preferredId&&all.indexOf(preferredId)>-1&&visible.indexOf(preferredId)===-1){
      if(visible.length<6)visible.push(preferredId);
      else visible[visible.length-1]=preferredId;
    }
    return visible;
  }

  function renderPreviewWidgets(st,preferredId){
    var widgets=orderedPreviewWidgets(st,preferredId);
    if(!widgets.length)widgets=["brain","today","tasks"];
    return widgets.map(function(id,index){
      var layout=st.selections.dashboard||"control";
      var wide=index===0||(layout==="control"&&id==="brain")?" is-wide":"";
      return '<article class="fron-live-widget'+wide+'" data-preview-widget="'+esc(id)+'" style="--delay:'+index+'">'+
        '<span>'+iconMarkup(previewWidgetIcon(id))+'</span>'+
        '<strong>'+esc(previewWidgetLabel(id))+'</strong>'+
        '<small>'+esc(previewMetric(id,index))+'</small>'+
        '<i aria-hidden="true"></i>'+
      '</article>';
    }).join("");
  }

  function renderPreviewConnections(st){
    var connections=(st.selections.connections||[]).slice(0,4);
    if(!connections.length)return '<span class="fron-live-chip is-muted">Connexions optionnelles</span>';
    return connections.map(function(id){
      return '<span class="fron-live-chip">'+esc(labelFrom(CONNECTION_OPTIONS,id))+'</span>';
    }).join("");
  }

  function renderLivePreview(st,cause,preferredWidget){
    var style=st.selections.style||defaultState().selections.style;
    var rgb=hexToRgb(style.accent).join(",");
    var space=currentSpaceLabel(st);
    var flow=currentFlow(st);
    var dashboard=currentDashboard(st);
    var context=previewContext(st);
    var brain=st.selections.brain||{};
    var widgetCount=(st.selections.widgets||[]).length;
    var connectionCount=(st.selections.connections||[]).length;
    var completion=Math.min(100,24+widgetCount*7+connectionCount*3+(brain.enabled?12:0));
    previewRevision+=1;
    return '<section class="fron-live-preview'+(cause?' is-preview-updating':'')+'" style="--preview-accent:'+esc(style.accent)+';--preview-rgb:'+esc(rgb)+';--preview-completion:'+completion+'%;--preview-completion-scale:'+(completion/100)+'" data-preview-revision="'+previewRevision+'" data-preview-cause="'+esc(cause||"initial")+'" data-preview-theme="'+esc(style.theme||"ethone-purple")+'" data-preview-density="'+esc(style.density||"comfortable")+'" data-preview-font="'+esc(style.font||"inter")+'" data-preview-background="'+esc(style.background||"none")+'" data-preview-flow="'+esc(flow.id)+'" data-preview-layout="'+esc(dashboard.id)+'">'+
      '<div class="fron-live-top">'+
        '<div><span>Live ETHONE Preview</span><strong>'+esc(space)+'</strong></div>'+
        '<div class="fron-live-top-meta"><em>'+iconMarkup(flow.icon)+' '+esc(flow.label)+'</em><em>'+esc(dashboard.label)+'</em></div>'+
      '</div>'+
      '<div class="fron-live-window">'+
        '<div class="fron-live-sidebar" aria-hidden="true"><b>E</b><i></i><i></i><i></i><i></i></div>'+
        '<div class="fron-live-main">'+
          '<div class="fron-live-bar"><span>Brain, files, commands...</span><b>'+iconMarkup("sparkles")+' Ready</b></div>'+
          '<div class="fron-live-hero">'+
            '<div><small>'+esc(context.eyebrow)+'</small><strong>'+esc(space)+'</strong><p>'+esc(context.headline)+'</p></div>'+
            '<time data-fron-preview-clock>'+new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})+'</time>'+
          '</div>'+
          '<div class="fron-live-brain '+(brain.enabled?'is-on':'is-off')+'">'+
            '<span class="fron-live-brain-dot"></span>'+
            '<div><strong>'+esc(brain.enabled?context.status:"Brain en pause")+'</strong><small>'+esc(brain.enabled?"Provider "+labelFrom(PROVIDERS,brain.provider):"Activable a tout moment")+'</small></div>'+
          '</div>'+
          '<div class="fron-live-grid">'+renderPreviewWidgets(st,preferredWidget)+'</div>'+
          '<div class="fron-live-footer"><div class="fron-live-connections">'+renderPreviewConnections(st)+'</div><div class="fron-live-build" aria-label="Configuration '+completion+' pour cent"><span>System build</span><i><b></b></i></div></div>'+
        '</div>'+
      '</div>'+
    '</section>';
  }

  function refreshPreviewOnly(st,options){
    if(!root)return;
    options=options||{};
    syncOnboardingVars(st);
    var preview=root.querySelector(".fron-live-preview-host");
    if(preview)preview.innerHTML=renderLivePreview(st,options.cause||"selection",options.cause==="toggle-widget"?options.focusId:null);
    var assistant=root.querySelector(".fron-assistant-host");
    if(assistant)assistant.outerHTML=renderAssistant(st);
    refreshIcons(root);
  }

  function refreshStepOnly(st,options){
    if(!root)return;
    options=options||{};
    var content=root.querySelector(".fron-step-content");
    if(!content)return;
    var scrollTop=content.scrollTop;
    content.innerHTML=renderBody(st);
    content.scrollTop=scrollTop;
    content.dataset.updateCause=options.cause||"selection";
    refreshIcons(content);
    if(options.focusAction){
      var candidates=content.querySelectorAll('[data-fron-action="'+options.focusAction+'"]');
      for(var i=0;i<candidates.length;i++){
        if(options.focusId&&candidates[i].dataset.id!==String(options.focusId))continue;
        try{candidates[i].focus({preventScroll:true})}catch(e){candidates[i].focus()}
        break;
      }
    }
  }

  function updatePreviewClock(){
    if(!root||!root.classList.contains("is-open"))return;
    var clock=root.querySelector("[data-fron-preview-clock]");
    if(clock)clock.textContent=new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  }

  function startPreviewClock(){
    clearInterval(previewClockTimer);
    updatePreviewClock();
    previewClockTimer=setInterval(updatePreviewClock,30000);
  }

  function stopPreviewClock(){
    clearInterval(previewClockTimer);
    previewClockTimer=0;
  }

  function clearLaunchTimers(){
    launchTimers.forEach(function(timer){clearTimeout(timer)});
    launchTimers=[];
  }

  function launchAfter(callback,delay){
    var timer=setTimeout(callback,delay);
    launchTimers.push(timer);
    return timer;
  }

  function renderLaunchSequence(st){
    var space=currentSpaceLabel(st);
    var flow=currentFlow(st);
    var dashboard=currentDashboard(st);
    var widgets=orderedPreviewWidgets(st).slice(0,4);
    if(!widgets.length)widgets=["brain","today","tasks","calendar"];
    var stages=[
      {icon:"palette",label:"Style",detail:labelFrom(THEME_OPTIONS,st.selections.style.theme)},
      {icon:"boxes",label:"Contexte",detail:space+" / "+flow.label},
      {icon:"layout-dashboard",label:"Dashboard",detail:dashboard.label+" / "+st.selections.widgets.length+" widgets"},
      {icon:"brain-circuit",label:"Brain",detail:st.selections.brain.enabled?"Contexte pret":"Desactive"}
    ];
    return '<div class="fron-overlay fron-launch-overlay" role="presentation">'+
      '<section class="fron-launch-shell" role="status" aria-live="polite" aria-label="Construction de votre environnement ETHONE">'+
        '<div class="fron-launch-copy">'+
          '<span class="fron-launch-logo">E<i></i></span>'+
          '<span class="fron-kicker">ETHONE System Launch</span>'+
          '<h2>Construction de '+esc(space)+'</h2>'+
          '<p data-fron-launch-status>Preparation de votre environnement personnel...</p>'+
          '<div class="fron-launch-progress" aria-hidden="true"><i></i></div>'+
          '<ol class="fron-launch-stages">'+stages.map(function(stage,index){
            return '<li data-fron-launch-stage="'+index+'"><span>'+iconMarkup(stage.icon)+'</span><div><strong>'+esc(stage.label)+'</strong><small>'+esc(stage.detail)+'</small></div><i>'+iconMarkup("check")+'</i></li>';
          }).join("")+'</ol>'+
        '</div>'+
        '<div class="fron-launch-visual" style="--preview-accent:'+esc(st.selections.style.accent)+';--preview-rgb:'+esc(hexToRgb(st.selections.style.accent).join(","))+'" data-preview-theme="'+esc(st.selections.style.theme)+'" data-preview-layout="'+esc(dashboard.id)+'">'+
          '<div class="fron-launch-window">'+
            '<header><span><i></i><i></i><i></i></span><b>ETHONE</b><em>System ready</em></header>'+
            '<div class="fron-launch-dashboard">'+
              '<aside><b>E</b><i></i><i></i><i></i></aside>'+
              '<main><div class="fron-launch-hero"><span>'+esc(flow.label)+'</span><strong>'+esc(space)+'</strong><small>Votre environnement se construit.</small></div>'+
              '<div class="fron-launch-widget-grid">'+widgets.map(function(id,index){
                return '<article style="--delay:'+index+'"><span>'+iconMarkup(previewWidgetIcon(id))+'</span><strong>'+esc(previewWidgetLabel(id))+'</strong><i></i></article>';
              }).join("")+'</div></main>'+
            '</div>'+
          '</div>'+
          '<div class="fron-launch-ready"><span>'+iconMarkup("check")+'</span><strong>Votre espace est pret.</strong><small>Bienvenue dans ETHONE.</small></div>'+
        '</div>'+
      '</section>'+
    '</div>';
  }

  function activateLaunchStage(index){
    if(!root)return;
    var stages=root.querySelectorAll("[data-fron-launch-stage]");
    for(var i=0;i<stages.length;i++){
      stages[i].classList.toggle("is-active",i===index);
      stages[i].classList.toggle("is-done",i<index);
    }
    var status=root.querySelector("[data-fron-launch-status]");
    if(status&&stages[index]){
      var label=stages[index].querySelector("strong");
      status.textContent=(label?label.textContent:"ETHONE")+" en cours...";
    }
    var progress=root.querySelector(".fron-launch-progress i");
    if(progress)progress.style.transform="scaleX("+((index+1)/Math.max(1,stages.length))+")";
    var widgets=root.querySelectorAll(".fron-launch-widget-grid article");
    if(widgets[index])widgets[index].classList.add("is-mounted");
  }

  function runLaunchSequence(st,onReady,onDone){
    ensureRoot();
    clearLaunchTimers();
    stopPreviewClock();
    root.classList.add("is-launching");
    root.innerHTML=renderLaunchSequence(st);
    refreshIcons(root);
    var reduced=root.classList.contains("fron-motion-off")||(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var delays=reduced?[0,18,36,54]:[90,340,590,840];
    delays.forEach(function(delay,index){launchAfter(function(){activateLaunchStage(index)},delay)});
    launchAfter(function(){
      var stages=root.querySelectorAll("[data-fron-launch-stage]");
      for(var i=0;i<stages.length;i++){stages[i].classList.remove("is-active");stages[i].classList.add("is-done")}
      var progress=root.querySelector(".fron-launch-progress i");
      if(progress)progress.style.transform="scaleX(1)";
      var status=root.querySelector("[data-fron-launch-status]");
      if(status)status.textContent="Votre environnement est pret.";
      var shell=root.querySelector(".fron-launch-shell");
      if(shell)shell.classList.add("is-ready");
      if(typeof onReady==="function")onReady();
    },reduced?80:1080);
    launchAfter(function(){root.classList.add("is-launch-complete");document.body.classList.add("ethone-first-run-dashboard-enter")},reduced?100:1280);
    launchAfter(function(){if(typeof onDone==="function")onDone()},reduced?130:1510);
  }

  function renderWidgets(st){
    var widgets=st.selections.widgets;
    return '<div class="fron-control-panel">'+
      '<section class="fron-control-row fron-dashboard-choice">'+
        '<div class="fron-section-heading"><div><span>Dashboard</span><h3>Choisissez une composition</h3></div><small>Les widgets gardent les memes donnees.</small></div>'+
        '<div class="fron-card-grid fron-card-grid-compact">'+DASHBOARD_OPTIONS.map(function(item){
          return choiceCard(item,(st.selections.dashboard||"control")===item.id,"select-dashboard");
        }).join("")+'</div>'+
      '</section>'+
      '<section class="fron-control-row">'+
        '<div class="fron-section-heading"><div><span>Modules</span><h3>Composez votre vue</h3></div><small>'+widgets.length+' selectionnes</small></div>'+
        '<div class="fron-card-grid">'+WIDGET_OPTIONS.map(function(item){
          return choiceCard(item,selected(widgets,item.id),"toggle-widget");
        }).join("")+'</div>'+
      '</section>'+
    '</div>';
  }

  function renderConnections(st){
    var connections=st.selections.connections;
    var p=profile(),existing=p&&p.state&&p.state.connections?p.state.connections:{};
    return '<div class="fron-control-panel">'+
      '<div class="fron-control-row"><h3>Connexions rapides</h3><p style="margin:0;color:var(--fron-muted);font-size:12px;line-height:1.55">Selectionner une integration la prepare dans ETHONE. La connexion reelle se fait ensuite depuis Connexions ou Settings.</p></div>'+
      '<div class="fron-card-grid">'+CONNECTION_OPTIONS.map(function(item){
        var connected=!!(existing[item.id]&&(existing[item.id].connected||existing[item.id].data||existing[item.id].userId||existing[item.id].username||existing[item.id].widgetUrl||existing[item.id].apiKey));
        var prepared=selected(connections,item.id);
        return choiceCard(Object.assign({},item,{status:connected?"Deja connecte":prepared?"Prepare":"Optionnel"}),prepared||connected,"toggle-connection");
      }).join("")+'</div>'+
    '</div>';
  }

  function renderBrain(st){
    var brain=st.selections.brain;
    return '<div class="fron-control-panel">'+
      '<div class="fron-control-row">'+
        '<div class="fron-toggle"><div><h3>Activer Brain</h3><span style="color:var(--fron-muted);font-size:12px;line-height:1.55">Brain peut preparer un briefing, comprendre le contexte et suggerer les prochaines actions.</span></div>'+
        '<button class="fron-switch'+(brain.enabled?' is-on':'')+'" type="button" data-fron-action="toggle-brain" aria-label="Brain"><i></i></button></div>'+
      '</div>'+
      '<div class="fron-control-row">'+
        '<h3>Provider prefere</h3>'+
        '<div class="fron-card-grid">'+PROVIDERS.map(function(item){
          return choiceCard({id:item.id,code:item.label.slice(0,2).toUpperCase(),label:item.label,sub:item.sub},brain.provider===item.id,"select-provider");
        }).join("")+'</div>'+
      '</div>'+
      '<div class="fron-control-row">'+
        '<h3>Capacites Brain</h3>'+
        '<div class="fron-brain-toggles">'+
          brainToggle("memory","Memoire",brain.memory,"Retenir les preferences autorisees.")+
          brainToggle("automations","Automatisations",brain.automations,"Proposer des workflows lorsque c'est utile.")+
          brainToggle("suggestions","Suggestions",brain.suggestions,"Afficher des recommandations contextuelles.")+
        '</div>'+
      '</div>'+
    '</div>';
  }

  function brainToggle(id,label,on,sub){
    return '<button class="fron-brain-toggle'+(on?' is-on':'')+'" type="button" data-fron-action="toggle-brain-feature" data-id="'+esc(id)+'">'+
      '<span>'+esc(label)+'</span><small>'+esc(sub)+'</small><i></i>'+
    '</button>';
  }

  function labelFrom(list,id){
    var item=findById(list,id);
    return item&&item.label?item.label:id;
  }

  function renderFinish(st){
    var sel=st.selections;
    var space=sel.space==="custom"?(sel.customSpaceName||"Custom"):labelFrom(SPACE_OPTIONS,sel.space);
    var widgetNames=sel.widgets.map(function(id){return labelFrom(WIDGET_OPTIONS,id)}).join(", ")||"Aucun widget";
    var connNames=sel.connections.map(function(id){return labelFrom(CONNECTION_OPTIONS,id)}).join(", ")||"Aucune connexion rapide";
    var provider=labelFrom(PROVIDERS,sel.brain.provider);
    var theme=labelFrom(THEME_OPTIONS,sel.style.theme);
    var flow=currentFlow(st);
    var dashboard=currentDashboard(st);
    return '<div class="fron-summary">'+
      '<div class="fron-summary-card"><span>Space</span><strong>'+esc(space)+'</strong><p>ETHONE creera ou activera cet environnement comme point de depart.</p></div>'+
      '<div class="fron-summary-card"><span>Flow</span><strong>'+esc(flow.label)+'</strong><p>'+esc(flow.sub)+'</p></div>'+
      '<div class="fron-summary-card"><span>Style</span><strong>'+esc(theme)+' &middot; '+esc(sel.style.density)+'</strong><p>'+esc(findById(BACKGROUNDS,sel.style.background).label)+' avec accent global '+esc(sel.style.accent)+'.</p></div>'+
      '<div class="fron-summary-card"><span>Widgets</span><strong>'+esc(sel.widgets.length)+' selectionnes</strong><p>'+esc(widgetNames)+'</p></div>'+
      '<div class="fron-summary-card"><span>Connexions</span><strong>'+esc(sel.connections.length)+' preparees</strong><p>'+esc(connNames)+'</p></div>'+
      '<div class="fron-summary-card"><span>Brain</span><strong>'+(sel.brain.enabled?'Active':'Desactive')+'</strong><p>Provider prefere : '+esc(provider)+'. Modifiable dans Settings ou ETHONE IA.</p></div>'+
      '<div class="fron-summary-card"><span>Dashboard</span><strong>'+esc(dashboard.label)+'</strong><p>'+esc(dashboard.sub)+'</p></div>'+
    '</div>';
  }

  function renderBody(st){
    if(st.step===0)return renderWelcome(st);
    if(st.step===1)return renderSpace(st);
    if(st.step===2)return renderStyle(st);
    if(st.step===3)return renderWidgets(st);
    if(st.step===4)return renderConnections(st);
    if(st.step===5)return renderBrain(st);
    return renderFinish(st);
  }

  function render(){
    var st=currentState||readState();
    var step=STEPS[st.step]||STEPS[0];
    var isLast=st.step===STEPS.length-1;
    var progress=Math.round(((st.step+1)/STEPS.length)*100);
    var showClose=true;
    ensureRoot();
    syncOnboardingVars(st);
    root.innerHTML='<div class="fron-overlay" role="presentation">'+
      '<section class="fron-shell fron-shell-v6" role="dialog" aria-modal="true" aria-labelledby="fron-title">'+
        '<aside class="fron-rail">'+
          '<div class="fron-brand"><div class="fron-logo">E</div><div><strong>ETHONE</strong><span>First Run Experience</span></div></div>'+
          '<div class="fron-rail-status">'+
            '<div><span>Progression</span><strong>Etape '+(st.step+1)+'/'+STEPS.length+'</strong></div>'+
            '<div><span>Temps restant</span><strong>~ '+estimateMinutes(st)+' min</strong></div>'+
          '</div>'+
          '<div class="fron-progress-list">'+renderProgress(st)+'</div>'+
          '<div class="fron-rail-note">Vos choix restent modifiables dans Settings. Les integrations sont preparees sans requete externe automatique.</div>'+
        '</aside>'+
        '<main class="fron-main">'+
          '<header class="fron-head">'+
            '<div><span class="fron-eyebrow">Configuration ETHONE OS</span><h2 id="fron-title">'+esc(step.title)+'</h2><p>'+esc(step.sub)+'</p></div>'+
            (showClose?'<button class="fron-close" type="button" data-fron-action="close" aria-label="Fermer">'+iconMarkup("x")+'</button>':'')+
          '</header>'+
          '<div class="fron-body">'+
            '<section class="fron-stage">'+renderAssistant(st)+'<div class="fron-step-content">'+renderBody(st)+'</div></section>'+
            '<aside class="fron-live-preview-host" aria-label="Apercu ETHONE en direct">'+renderLivePreview(st)+'</aside>'+
          '</div>'+
          '<footer class="fron-footer">'+
            '<div class="fron-progress-wrap"><span>Step '+(st.step+1)+' of '+STEPS.length+'</span><div class="fron-progress-track" aria-hidden="true" style="--fron-progress:'+progress+'%"><i></i></div></div>'+
            '<div class="fron-actions">'+
              (st.step>0?'<button class="fron-btn" type="button" data-fron-action="back">Retour</button>':'')+
              (!isLast?'<button class="fron-btn" type="button" data-fron-action="skip">Passer cette etape</button>':'')+
              '<button class="fron-btn fron-btn-primary" type="button" data-fron-action="'+(isLast?'finish':'next')+'">'+(isLast?'Entrer dans ETHONE':'Continuer')+'</button>'+
            '</div>'+
          '</footer>'+
        '</main>'+
      '</section>'+
    '</div>';
    root.classList.add("is-open");
    document.body.classList.add("ethone-first-run-active");
    refreshIcons(root);
    startPreviewClock();
    setTimeout(function(){
      var btn=root.querySelector(".fron-btn-primary");
      if(btn)btn.focus({preventScroll:true});
    },30);
  }

  function update(fn,options){
    var st=currentState||readState();
    fn(st);
    st.step=Math.max(0,Math.min(STEPS.length-1,st.step));
    writeState(st);
    if(options&&options.partial){
      refreshStepOnly(st,options);
      refreshPreviewOnly(st,options);
      return;
    }
    render();
  }

  function handleClick(event){
    var btn=event.target.closest("[data-fron-action]");
    if(!btn||!root.contains(btn))return;
    var action=btn.dataset.fronAction;
    if(action==="noop")return;
    event.preventDefault();
    if(action==="close"){close();return}
    if(action==="next"){update(function(st){st.step+=1});return}
    if(action==="back"){update(function(st){st.step-=1});return}
    if(action==="skip"){update(function(st){st.step+=1});return}
    if(action==="goto"){update(function(st){st.step=parseInt(btn.dataset.step,10)||0});return}
    if(action==="finish"){complete();return}
    update(function(st){
      var id=btn.dataset.id;
      if(action==="select-space"){
        st.selections.space=id;
        st.selections.flow=flowForSpace(id);
        st.selections.dashboard=dashboardForSpace(id);
      }
      if(action==="select-flow")st.selections.flow=id;
      if(action==="select-dashboard")st.selections.dashboard=id;
      if(action==="select-theme")st.selections.style.theme=id;
      if(action==="select-accent")st.selections.style.accent=id;
      if(action==="select-density")st.selections.style.density=id;
      if(action==="select-background")st.selections.style.background=id;
      if(action==="select-font")st.selections.style.font=id;
      if(action==="toggle-animations")st.selections.style.animations=!st.selections.style.animations;
      if(action==="toggle-widget")st.selections.widgets=toggleList(st.selections.widgets,id);
      if(action==="toggle-connection")st.selections.connections=toggleList(st.selections.connections,id);
      if(action==="toggle-brain")st.selections.brain.enabled=!st.selections.brain.enabled;
      if(action==="toggle-brain-feature")st.selections.brain[id]=!st.selections.brain[id];
      if(action==="select-provider")st.selections.brain.provider=id;
    },{partial:true,cause:action,focusAction:action,focusId:btn.dataset.id});
  }

  function handleInput(event){
    var field=event.target&&event.target.dataset?event.target.dataset.fronField:null;
    if(!field)return;
    var st=currentState||readState();
    if(field==="customSpaceName")st.selections.customSpaceName=event.target.value.slice(0,48);
    writeState(st);
    refreshPreviewOnly(st,{cause:"custom-space"});
  }

  function handleKeydown(event){
    if(isCompleting)return;
    if(event.key==="Escape"){
      event.preventDefault();
      close();
      return;
    }
    if(event.key==="Enter"){
      var action=event.target&&event.target.closest?event.target.closest("[data-fron-action]"):null;
      if(action&&root&&root.contains(action)&&action.tagName==="BUTTON"){
        event.preventDefault();
        action.click();
      }
    }
  }

  function handleGlobalKeydown(event){
    if(isCompleting||event.key!=="Escape"||!root||!root.classList.contains("is-open"))return;
    event.preventDefault();
    close();
  }

  function bindGlobalKeyboard(){
    if(globalKeyBound)return;
    document.addEventListener("keydown",handleGlobalKeydown,true);
    globalKeyBound=true;
  }

  function unbindGlobalKeyboard(){
    if(!globalKeyBound)return;
    document.removeEventListener("keydown",handleGlobalKeydown,true);
    globalKeyBound=false;
  }

  function close(options){
    options=options||{};
    var st=currentState||readState();
    if(st&&!st.completed&&!options.preserveState){
      st.dismissedAt=new Date().toISOString();
      writeState(st);
    }
    clearLaunchTimers();
    if(root)root.classList.remove("is-open","is-launching","is-launch-complete");
    unbindGlobalKeyboard();
    stopPreviewClock();
    document.body.classList.remove("ethone-first-run-active");
    document.body.classList.remove("ethone-first-run-dashboard-enter");
    isCompleting=false;
    manualOpen=false;
    devSession=false;
  }

  function whatsNewSeen(){
    try{return localStorage.getItem(WHATS_NEW_KEY)===WHATS_NEW_VERSION}catch(e){return false}
  }

  function markWhatsNewSeen(){
    try{localStorage.setItem(WHATS_NEW_KEY,WHATS_NEW_VERSION)}catch(e){}
  }

  function ensureWhatsNewRoot(){
    if(whatsNewRoot)return whatsNewRoot;
    whatsNewRoot=document.getElementById("ethone-whats-new-root");
    if(!whatsNewRoot){
      whatsNewRoot=document.createElement("div");
      whatsNewRoot.id="ethone-whats-new-root";
      document.body.appendChild(whatsNewRoot);
    }
    whatsNewRoot.addEventListener("click",function(event){
      var action=event.target&&event.target.closest?event.target.closest("[data-whats-action]"):null;
      if(!action){
        if(event.target&&event.target.classList&&event.target.classList.contains("fron-whats-overlay"))closeWhatsNew(true);
        return;
      }
      event.preventDefault();
      var id=action.dataset.whatsAction;
      if(id==="close")closeWhatsNew(true);
      if(id==="onboarding"){
        closeWhatsNew(true);
        replay();
      }
    });
    whatsNewRoot.addEventListener("keydown",function(event){
      if(event.key==="Escape")closeWhatsNew(true);
    });
    return whatsNewRoot;
  }

  function renderWhatsNew(){
    return '<div class="fron-whats-overlay" role="presentation">'+
      '<section class="fron-whats-shell" role="dialog" aria-modal="true" aria-labelledby="fron-whats-title" tabindex="-1">'+
        '<button class="fron-whats-close" type="button" data-whats-action="close" aria-label="Fermer">x</button>'+
        '<div class="fron-whats-hero">'+
          '<div class="fron-whats-logo">E</div>'+
          '<span>Nouveautes de la version '+esc(WHATS_NEW_VERSION)+'</span>'+
          '<h2 id="fron-whats-title">ETHONE continue d evoluer.</h2>'+
          '<p>Cette version rend la premiere utilisation plus claire, plus rapide et plus coherente avec l experience Personal Operating System.</p>'+
        '</div>'+
        '<div class="fron-whats-grid">'+WHATS_NEW_ITEMS.map(function(item){
          return '<article class="fron-whats-card"><span>'+esc(item.type)+'</span><strong>'+esc(item.title)+'</strong><p>'+esc(item.body)+'</p></article>';
        }).join("")+'</div>'+
        '<footer class="fron-whats-actions">'+
          '<button class="fron-btn" type="button" data-whats-action="onboarding">Revoir l onboarding</button>'+
          '<button class="fron-btn fron-btn-primary" type="button" data-whats-action="close">Continuer</button>'+
        '</footer>'+
      '</section>'+
    '</div>';
  }

  function openWhatsNew(options){
    options=options||{};
    if(window.ETHONEVersionCenter&&typeof window.ETHONEVersionCenter.openPopup==="function"){
      return window.ETHONEVersionCenter.openPopup({
        manual:!!options.manual,
        source:"first-run"
      });
    }
    if(!options.manual&&whatsNewSeen())return false;
    if(!options.manual&&!isDashboardVisible())return false;
    if(root&&root.classList.contains("is-open"))return false;
    var host=ensureWhatsNewRoot();
    host.innerHTML=renderWhatsNew();
    host.classList.add("is-open");
    document.body.classList.add("ethone-whats-new-active");
    refreshIcons(host);
    setTimeout(function(){
      var shell=host.querySelector(".fron-whats-shell");
      if(shell)try{shell.focus({preventScroll:true})}catch(e){shell.focus()}
    },20);
    try{window.dispatchEvent(new CustomEvent("ethone:whats-new-open",{detail:{version:WHATS_NEW_VERSION,manual:!!options.manual}}))}catch(e){}
    return true;
  }

  function closeWhatsNew(markSeen){
    if(markSeen)markWhatsNewSeen();
    if(whatsNewRoot)whatsNewRoot.classList.remove("is-open");
    document.body.classList.remove("ethone-whats-new-active");
  }

  function scheduleWhatsNew(delay){
    clearTimeout(whatsNewTimer);
    whatsNewTimer=setTimeout(function(){
      var st=readState();
      if(st.completed)openWhatsNew({auto:true});
    },delay==null?900:delay);
  }

  function open(options){
    options=options||{};
    clearLaunchTimers();
    isCompleting=false;
    if(root)root.classList.remove("is-launching","is-launch-complete");
    manualOpen=!!options.manual;
    devSession=!!options.dev;
    var st=readState();
    if(st.completed&&!options.force&&!manualOpen)return false;
    if(options.restart)st.step=0;
    if(options.force&&st.completed)st.step=0;
    if(options.resume)st.dismissedAt=null;
    writeState(st);
    render();
    bindGlobalKeyboard();
    try{window.dispatchEvent(new CustomEvent("ethone:first-run-open",{detail:{manual:manualOpen}}))}catch(e){}
    return true;
  }

  function replay(){
    var st=readState();
    st.step=0;
    writeState(st);
    open({manual:true,force:true,restart:true});
  }

  function reset(){
    var st=defaultState();
    try{localStorage.removeItem(storageKey())}catch(e){}
    var p=profile();
    if(p&&p.state)p.state.firstRun={completed:false,resetAt:new Date().toISOString()};
    writeState(st);
    saveProfileNow();
    return st;
  }

  function resetCompletionOnly(){
    var st=readState();
    st.completed=false;
    st.completedAt=null;
    st.dismissedAt=null;
    st.step=0;
    var p=profile();
    if(p&&p.state){
      p.state.firstRun=Object.assign({},p.state.firstRun||{},{
        completed:false,
        completedAt:null,
        resetAt:new Date().toISOString(),
        selections:clone(st.selections)
      });
    }
    writeState(st);
    saveProfileNow();
    return st;
  }

  function hexToRgb(hex){
    hex=String(hex||"#8b5cf6").replace("#","");
    if(hex.length===3)hex=hex.split("").map(function(x){return x+x}).join("");
    var n=parseInt(hex,16);
    if(!isFinite(n))return [139,92,246];
    return [(n>>16)&255,(n>>8)&255,n&255];
  }

  function applyStylePrefs(style){
    style=style||defaultState().selections.style;
    var rgb=hexToRgb(style.accent);
    var rootEl=document.documentElement;
    var themePreset=style.theme||"ethone-purple";
    rootEl.style.setProperty("--accent",style.accent);
    rootEl.style.setProperty("--eh-accent",style.accent);
    rootEl.style.setProperty("--accent-rgb",rgb.join(","));
    rootEl.style.setProperty("--eh-accent-rgb",rgb.join(","));
    rootEl.dataset.ethoneDensity=style.density||"comfortable";
    rootEl.dataset.ethoneOnboardingTheme=themePreset;
    rootEl.classList.toggle("ethone-motion-off",!style.animations);

    var p=profile();
    if(p){
      p.customAccent=style.accent;
      p.theme=Object.assign({},p.theme||{},{
        preset:themePreset,
        customAccent:style.accent,
        accent:style.accent,
        density:style.density,
        motion:style.animations?1:0,
        background:style.background,
        fontFamily:style.font||"inter"
      });
      p.themePreset=themePreset;
      p.bgTheme=style.background==="none"?"none":style.background;
    }
    try{localStorage.setItem("ethone:onboarding-style",JSON.stringify(style))}catch(e){}
    try{
      if(window.ETHONEThemeEngine&&typeof window.ETHONEThemeEngine.setPreset==="function"){
        window.ETHONEThemeEngine.setPreset(themePreset,{save:false,toast:false});
      }else if(window.ETHONEThemeEngine&&typeof window.ETHONEThemeEngine.apply==="function"){
        window.ETHONEThemeEngine.apply(p&&p.theme?p.theme:{preset:themePreset,customAccent:style.accent,density:style.density,motion:style.animations?1:0});
      }
    }catch(e){}
    try{
      if(window.ETHONEBackgrounds&&typeof window.ETHONEBackgrounds.apply==="function")window.ETHONEBackgrounds.apply(style.background);
    }catch(e){}
    try{if(window.ETHONESettingsFunctional&&window.ETHONESettingsFunctional.apply)window.ETHONESettingsFunctional.apply()}catch(e){}
    try{window.dispatchEvent(new CustomEvent("ethone:theme-changed",{detail:{source:"first-run",style:style}}))}catch(e){}
  }

  function workspaceName(st){
    var id=st.selections.space;
    if(id==="custom")return (st.selections.customSpaceName||"Custom Space").trim()||"Custom Space";
    return labelFrom(SPACE_OPTIONS,id);
  }

  function workspaceTemplate(id){
    if(id==="gaming"||id==="streaming")return "gaming";
    if(id==="development"||id==="work"||id==="study")return "focus";
    return "control";
  }

  function ensureWorkspace(st){
    var svc=window.ETHONEWorkspaces||window.ETHONESpaces;
    var p=profile();
    var name=workspaceName(st);
    var accent=st.selections.style.accent;
    var option=findById(SPACE_OPTIONS,st.selections.space);
    var input={
      name:name,
      label:name,
      description:"Space cree par l onboarding ETHONE.",
      icon:option.icon||"layout-grid",
      accent:accent,
      wallpaper:st.selections.style.background||"aurora",
      template:workspaceTemplate(st.selections.space)
    };
    try{
      if(svc&&typeof svc.all==="function"){
        var existing=(svc.all()||[]).filter(function(w){return String(w.name||"").toLowerCase()===name.toLowerCase()})[0];
        var ws=existing||(typeof svc.create==="function"?svc.create(input):null);
        if(ws&&typeof svc.setActive==="function")svc.setActive(ws.id,{silent:true});
        return ws;
      }
    }catch(e){diagnostic("workspace setup",e)}
    if(p){
      p.activeWorkspaceName=name;
      if(p.state)p.state.activeWorkspaceName=name;
    }
    return null;
  }

  function dashboardInstances(st){
    var widgets=orderedWidgetIds(st);
    var layout=st.selections.dashboard||"control";
    var heroColumns=layout==="control"?4:6;
    var out=[
      {instanceId:"command",type:"hero",size:{col:heroColumns,row:1},locked:false,config:{}}
    ];
    function add(instanceId,type,col,row,locked){
      if(out.some(function(item){return item.instanceId===instanceId}))return;
      out.push({instanceId:instanceId,type:type,size:{col:col,row:row},locked:!!locked,config:{}});
    }
    var definitions={
      brain:["brain","brain",layout==="ambient"?6:4,1],
      today:["today","today",2,layout==="control"?2:1],
      calendar:["calendar-home","calendar",2,1],
      notes:["notes-home","notes",2,1],
      tasks:["tasks-home","timeline",2,1],
      focus:["focus-home","productivity",2,1],
      spotify:["spotify-home","spotify",2,1],
      discord:["discord-home","discord",2,1],
      github:["github-home","github",2,1],
      clock:["clock-home","clock",2,1],
      weather:["weather-home","weather",2,1]
    };
    widgets.forEach(function(id){
      var def=definitions[id];
      if(def)add(def[0],def[1],def[2],def[3],false);
    });
    add("quickActions","quickActions",6,1,false);
    if(out.length<4){
      add("brain","brain",4,1,false);
      add("today","today",2,2,false);
    }
    return out;
  }

  function setJSON(key,value){
    try{
      if(window.EthoneCore&&window.EthoneCore.storage&&window.EthoneCore.storage.setJSON){
        window.EthoneCore.storage.setJSON(key,value);
      }else{
        localStorage.setItem(key,JSON.stringify(value));
      }
    }catch(e){
      try{localStorage.setItem(key,JSON.stringify(value))}catch(ignore){}
    }
  }

  function getJSON(key,fallback){
    try{
      if(window.EthoneCore&&window.EthoneCore.storage&&window.EthoneCore.storage.getJSON){
        return window.EthoneCore.storage.getJSON(key,fallback);
      }
      var raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):fallback;
    }catch(e){return fallback}
  }

  function applyFlowPreference(st){
    var flowId=st&&st.selections&&st.selections.flow?st.selections.flow:"personal";
    var saved=getJSON("ethone:flow:v1",null);
    if(!saved||typeof saved!=="object")saved={version:1,activeId:flowId,customFlows:[],installed:[],favorites:[flowId],recent:[],dismissedSuggestions:{},history:[]};
    saved.activeId=flowId;
    saved.recent=[flowId].concat((Array.isArray(saved.recent)?saved.recent:[]).filter(function(id){return id!==flowId})).slice(0,8);
    saved.history=Array.isArray(saved.history)?saved.history:[];
    saved.history.unshift({id:flowId,at:Date.now(),source:"first-run"});
    saved.history=saved.history.slice(0,40);
    setJSON("ethone:flow:v1",saved);
    try{
      if(window.ETHONEFlow&&typeof window.ETHONEFlow.setInitial==="function")window.ETHONEFlow.setInitial(flowId,{source:"first-run"});
    }catch(e){diagnostic("flow setup",e)}
    try{window.dispatchEvent(new CustomEvent("ethone:first-run-flow",{detail:{id:flowId}}))}catch(e){}
  }

  function applyDashboardLayout(st,workspace){
    var prefs={version:2,instances:dashboardInstances(st),hidden:[],favorites:["brain"]};
    setJSON("ethone:dashboard-v4-layout",prefs);
    var lib=getJSON("ethone:dashboard-v4-layouts",{version:1,activeId:"control",layouts:[]});
    if(!lib||lib.version!==1||!Array.isArray(lib.layouts))lib={version:1,activeId:"control",layouts:[]};
    var layoutId=workspace&&workspace.layoutId?workspace.layoutId:"first-run-layout";
    var layoutName=workspace&&workspace.name?workspace.name:"First Run";
    var index=lib.layouts.findIndex(function(item){return item.id===layoutId});
    var layout={id:layoutId,name:layoutName,prefs:prefs};
    if(index>-1)lib.layouts[index]=layout;
    else lib.layouts.push(layout);
    lib.activeId=layoutId;
    setJSON("ethone:dashboard-v4-layouts",lib);
    try{window.dispatchEvent(new CustomEvent("ethone:dashboard-layout-change",{detail:{source:"first-run",prefs:prefs}}))}catch(e){}
  }

  function applyConnectionPrefs(st){
    var p=profile();
    if(!p||!p.state)return;
    p.state.connections=p.state.connections||{};
    p.state.connectionOnboarding=st.selections.connections.slice();
    st.selections.connections.forEach(function(id){
      p.state.connections[id]=Object.assign({},p.state.connections[id]||{},{
        status:(p.state.connections[id]&&p.state.connections[id].status)||"ready",
        prepared:true,
        preparedAt:new Date().toISOString()
      });
    });
  }

  function applyBrainPrefs(st){
    var p=profile();
    if(!p||!p.state)return;
    p.state.brain=Object.assign({},p.state.brain||{},{
      enabled:!!st.selections.brain.enabled,
      provider:st.selections.brain.provider,
      memory:!!st.selections.brain.memory,
      automations:!!st.selections.brain.automations,
      suggestions:!!st.selections.brain.suggestions,
      onboarded:true,
      updatedAt:new Date().toISOString()
    });
    try{localStorage.setItem("ethone:brain-provider",st.selections.brain.provider)}catch(e){}
  }

  function recordActivity(text){
    var p=profile();
    if(!p||!p.state)return;
    p.state.activity=Array.isArray(p.state.activity)?p.state.activity:[];
    p.state.activity.unshift({id:"first-run-"+Date.now(),type:"system",text:text,time:new Date().toISOString()});
    p.state.activity=p.state.activity.slice(0,200);
  }

  function complete(){
    if(isCompleting)return false;
    isCompleting=true;
    var st=currentState||readState();
    var isDev=devSession;
    try{
      if(isDev){
        try{localStorage.setItem(storageKey()+":dev-preview",JSON.stringify(st))}catch(e){}
      }else{
        applyStylePrefs(st.selections.style);
        var ws=ensureWorkspace(st);
        applyDashboardLayout(st,ws);
        applyFlowPreference(st);
        applyConnectionPrefs(st);
        applyBrainPrefs(st);
        recordActivity("ETHONE onboarding completed");
        st.completed=true;
        st.completedAt=new Date().toISOString();
        st.step=STEPS.length-1;
        writeState(st);
        markWhatsNewSeen();
        saveProfileNow();
      }
      runLaunchSequence(st,function(){
        if(isDev)return;
        try{if(typeof window.initDashboard==="function")window.initDashboard()}catch(e){diagnostic("dashboard refresh",e)}
        try{window.dispatchEvent(new CustomEvent("ethone:first-run-complete",{detail:{state:clone(st)}}))}catch(e){}
      },function(){
        close({preserveState:true});
        if(typeof window.toast==="function")window.toast(isDev?"Apercu termine. Aucune donnee profil modifiee.":"ETHONE est pret.",isDev?"info":"success");
      });
      return true;
    }catch(error){
      console.error("[ETHONE First Run] completion failed",error);
      if(typeof window.toast==="function")window.toast("Configuration partielle enregistree. Vous pouvez continuer dans Settings.","error");
      if(!isDev){
        st.completed=true;
        st.completedAt=new Date().toISOString();
        writeState(st);
        saveProfileNow();
      }
      close({preserveState:true});
      return false;
    }
  }

  function updateSettingsStatus(){
    var el=document.getElementById("ethone-onboarding-status");
    if(!el)return;
    var st=currentState||readState();
    el.textContent=st.completed&&st.completedAt?"Complete le "+new Date(st.completedAt).toLocaleDateString():"Non termine";
  }

  function injectSettingsEntry(){
    clearTimeout(settingsTimer);
    settingsTimer=setTimeout(function(){
      var section=document.getElementById("settings-profilee")||document.querySelector(".settings-content");
      if(!section||document.getElementById("ethone-onboarding-settings-card"))return;
      var card=document.createElement("div");
      card.className="settings-card fron-settings-entry";
      card.id="ethone-onboarding-settings-card";
      card.innerHTML='<div class="settings-card-title">Onboarding ETHONE</div>'+
        '<p style="margin:8px 0 0;color:var(--muted2);font-size:13px;line-height:1.55">Revoir la premiere configuration pour ajuster le Space principal, le style, les widgets, les connexions rapides et Brain.</p>'+
        '<div style="margin-top:12px;font-size:12px;color:var(--muted2)">Etat : <strong id="ethone-onboarding-status" style="color:var(--text)">--</strong></div>'+
        '<div class="fron-settings-actions">'+
          '<button class="btn btn-primary" type="button" id="ethone-onboarding-review-btn">Revoir l onboarding</button>'+
          '<button class="btn btn-ghost" type="button" id="ethone-whats-new-settings-btn">Voir les nouveautes</button>'+
          '<button class="btn btn-ghost" type="button" id="ethone-onboarding-reset-btn">Reinitialiser l experience de premiere utilisation</button>'+
        '</div>';
      var anchor=document.getElementById("profile-quick-stats");
      if(anchor&&anchor.parentNode===section)section.insertBefore(card,anchor.nextSibling);
      else section.insertBefore(card,section.firstElementChild||null);
      var review=document.getElementById("ethone-onboarding-review-btn");
      var resetBtn=document.getElementById("ethone-onboarding-reset-btn");
      var whats=document.getElementById("ethone-whats-new-settings-btn");
      if(review)review.addEventListener("click",function(){replay()});
      if(resetBtn)resetBtn.addEventListener("click",function(){
        resetCompletionOnly();
        if(typeof window.toast==="function")window.toast("Experience de premiere utilisation reinitialisee.","success");
        open({manual:true,force:true,restart:true,resume:true});
      });
      if(whats)whats.addEventListener("click",function(){openWhatsNew({manual:true})});
      updateSettingsStatus();
    },80);
  }

  function injectUserMenu(){
    clearTimeout(userMenuTimer);
    userMenuTimer=setTimeout(function(){
      var btn=document.getElementById("topbar-profile-btn");
      var parent=btn&&btn.parentElement;
      if(!btn||!parent||document.getElementById("ethone-user-menu-btn"))return;
      parent.classList.add("fron-user-menu-host");
      var trigger=document.createElement("button");
      trigger.id="ethone-user-menu-btn";
      trigger.className="fron-user-menu-trigger";
      trigger.type="button";
      trigger.setAttribute("aria-haspopup","menu");
      trigger.setAttribute("aria-expanded","false");
      trigger.title="Menu utilisateur";
      trigger.innerHTML=iconMarkup("chevron-down");
      var menu=document.createElement("div");
      menu.id="ethone-user-menu";
      menu.className="fron-user-menu";
      menu.setAttribute("role","menu");
      menu.innerHTML=
        '<button type="button" role="menuitem" data-fron-user-action="tutorial">'+iconMarkup("sparkles")+'<span>Lancer le tutoriel</span></button>'+
        '<button type="button" role="menuitem" data-fron-user-action="whats-new">'+iconMarkup("megaphone")+'<span>Voir les nouveautes</span></button>'+
        '<button type="button" role="menuitem" data-fron-user-action="reset">'+iconMarkup("rotate-ccw")+'<span>Reinitialiser la premiere utilisation</span></button>';
      parent.appendChild(trigger);
      parent.appendChild(menu);
      trigger.addEventListener("click",function(event){
        event.preventDefault();
        event.stopPropagation();
        var open=menu.classList.toggle("is-open");
        trigger.setAttribute("aria-expanded",open?"true":"false");
      });
      menu.addEventListener("click",function(event){
        var action=event.target.closest("[data-fron-user-action]");
        if(!action)return;
        menu.classList.remove("is-open");
        trigger.setAttribute("aria-expanded","false");
        var id=action.dataset.fronUserAction;
        if(id==="tutorial")replay();
        if(id==="whats-new")openWhatsNew({manual:true});
        if(id==="reset"){
          resetCompletionOnly();
          open({manual:true,force:true,restart:true,resume:true});
        }
      });
      refreshIcons(parent);
      if(!userMenuDocBound){
        userMenuDocBound=true;
        document.addEventListener("click",function(event){
          var currentMenu=document.getElementById("ethone-user-menu");
          var currentTrigger=document.getElementById("ethone-user-menu-btn");
          if(!currentMenu||!currentTrigger)return;
          if(currentMenu.contains(event.target)||currentTrigger.contains(event.target))return;
          currentMenu.classList.remove("is-open");
          currentTrigger.setAttribute("aria-expanded","false");
        },true);
      }
    },100);
  }

  function registerAction(){
    try{
      var Actions=(window.Ethone&&window.Ethone.get&&window.Ethone.get("actions"))||window.ETHONEActions;
      if(Actions&&typeof Actions.register==="function"){
        Actions.register("onboarding.open",{handler:function(){replay();return true}});
        Actions.register("onboarding.reset",{handler:function(){
          resetCompletionOnly();
          open({manual:true,force:true,restart:true,resume:true});
          return true;
        }});
        Actions.register("onboarding.dev.open",{handler:function(){
          open({manual:true,force:true,restart:true,resume:true,dev:true});
          return true;
        }});
        Actions.register("whatsnew.open",{handler:function(){openWhatsNew({manual:true});return true}});
      }
    }catch(e){}
  }

  function init(){
    ensureRoot();
    injectSettingsEntry();
    injectUserMenu();
    registerAction();
    scheduleAutoOpen(260);
    scheduleWhatsNew(1300);
  }

  window.ETHONEFirstRun={
    open:open,
    replay:replay,
    close:close,
    reset:reset,
    resetCompletionOnly:resetCompletionOnly,
    complete:complete,
    openWhatsNew:openWhatsNew,
    closeWhatsNew:closeWhatsNew,
    whatsNewVersion:WHATS_NEW_VERSION,
    state:readState,
    shouldShow:shouldAutoShow
  };

  window.ethoneDevLaunchOnboarding=function(){
    return open({manual:true,force:true,restart:true,resume:true,dev:true});
  };
  window.ethoneResetFirstRunExperience=function(){
    resetCompletionOnly();
    return open({manual:true,force:true,restart:true,resume:true});
  };

  window.addEventListener("ethone:dashboard-ready",function(){injectUserMenu();scheduleAutoOpen(180);scheduleWhatsNew(1200)});
  window.addEventListener("ethone:profile-ready",function(){injectUserMenu();scheduleAutoOpen(260);scheduleWhatsNew(1400)});
  window.addEventListener("ethone:page-ready",function(event){
    injectSettingsEntry();
    injectUserMenu();
    if(event&&event.detail&&event.detail.page==="dashboard")scheduleAutoOpen(180);
    if(event&&event.detail&&event.detail.page==="dashboard")scheduleWhatsNew(1200);
  });
  window.addEventListener("ethone:workspace-change",function(){injectSettingsEntry();injectUserMenu()});
  window.addEventListener("storage",function(event){
    if(event&&event.key&&event.key.indexOf(BASE_KEY)===0)currentState=null;
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else setTimeout(init,0);
  setTimeout(function(){scheduleAutoOpen(900);scheduleWhatsNew(1600);injectSettingsEntry();injectUserMenu()},900);
})();
