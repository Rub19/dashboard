/* ETHONE Smart Layouts.
 * Context-aware dashboard layouts for Development, Work, Gaming, Music and Focus.
 * Reads existing local state only: no provider calls, no Supabase writes, no backend changes.
 */
(function(){
  "use strict";
  if(window.__ethoneSmartLayouts)return;
  window.__ethoneSmartLayouts=true;

  var STORAGE_KEY="ethone:smart-layouts:v1";
  var LAYOUT_KEY="ethone:dashboard-v4-layouts";
  var ACTIVE_LAYOUT_KEY="ethone:dashboard-v4-layout";
  var timer=0,lastSignature="",lastApplied="";

  function $(s,r){return (r||document).querySelector(s)}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function readJSON(key,fallback){try{var raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
  function writeJSON(key,val){try{localStorage.setItem(key,JSON.stringify(val));return true}catch(e){return false}}
  function lang(){return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}
  function t(fr,en){return lang()==="fr"?fr:en}
  function toast(msg,type){try{if(typeof window.toast==="function")window.toast(msg,type||"info")}catch(e){}}
  function appVisible(){
    var main=$("#main-content"),auth=$("#auth-screen"),profile=$("#profile-screen"),pw=$("#password-screen");
    function hidden(el){if(!el)return true;var cs=getComputedStyle(el);return el.hidden||cs.display==="none"||cs.visibility==="hidden"}
    return !!main&&!hidden(main)&&hidden(auth)&&hidden(profile)&&hidden(pw);
  }
  function currentPage(){
    var active=$(".tab-content.active[id^='page-']");
    return active?active.id.replace(/^page-/,""):"dashboard";
  }
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function workspaceApi(){try{return window.ETHONEWorkspaces||(window.Ethone&&window.Ethone.get&&window.Ethone.get("workspaces"))||null}catch(e){return null}}
  function activeWorkspace(){var api=workspaceApi();try{return api&&api.active?api.active():null}catch(e){return null}}
  function scopedState(){
    var p=profile(),base=p&&p.state?p.state:{},api=workspaceApi();
    try{return api&&api.scopedState?api.scopedState(base):base}catch(e){return base}
  }
  function state(){
    var saved=readJSON(STORAGE_KEY,null);
    return Object.assign({enabled:true,overrideMode:null,lastMode:"control",lastReason:""},saved||{});
  }
  function saveState(next){writeJSON(STORAGE_KEY,next)}
  function flowControlsLayout(){
    try{
      var flow=readJSON("ethone:flow:v1",null);
      return !!(flow&&flow.activeId&&document.body.classList.contains("ethone-flow-active"));
    }catch(e){return false}
  }

  function inst(instanceId,type,col,row,locked){
    return {instanceId:instanceId,type:type,size:{col:col,row:row},locked:!!locked,config:{}};
  }
  function prefs(instances,hidden,favorites){
    return {version:2,instances:instances,hidden:hidden||[],favorites:favorites||[]};
  }
  var LAYOUTS={
    "smart-morning":{
      id:"smart-morning",
      name:"Smart Morning",
      prefs:prefs([
        inst("command","hero",4,1),
        inst("calendar-morning","calendar",2,1),
        inst("brain","brain",4,1),
        inst("weather-morning","weather",2,1),
        inst("goals-morning","goals",2,1),
        inst("today","today",2,2),
        inst("timeline-feed-morning","timelineFeed",2,1),
        inst("quickActions","quickActions",6,1)
      ],[],["calendar-morning","weather-morning","goals-morning"])
    },
    "smart-work":{
      id:"smart-work",
      name:"Smart Work",
      prefs:prefs([
        inst("command","hero",4,1),
        inst("github-smart","github",2,1),
        inst("brain","brain",4,1),
        inst("today-work","today",2,2),
        inst("notes-work","notes",2,1),
        inst("productivity-work","productivity",2,1),
        inst("ai-suggestions-work","aiSuggestions",2,1),
        inst("timeline","timeline",2,1),
        inst("quickActions","quickActions",6,1)
      ],[],["github-smart","notes-work","today-work"])
    },
    "smart-development":{
      id:"smart-development",
      name:"Smart Development",
      prefs:prefs([
        inst("command","hero",4,1),
        inst("github-development","github",2,1),
        inst("brain","brain",4,1),
        inst("terminal-development","terminal",2,1),
        inst("ai-suggestions-development","aiSuggestions",2,1),
        inst("notes-development","notes",2,1),
        inst("productivity-development","productivity",2,1),
        inst("timeline-feed-development","timelineFeed",2,1),
        inst("quickActions","quickActions",6,1)
      ],[],["github-development","terminal-development","ai-suggestions-development"])
    },
    "smart-gaming":{
      id:"smart-gaming",
      name:"Smart Gaming",
      prefs:prefs([
        inst("command","hero",4,1),
        inst("valorant-smart","valorant",2,1),
        inst("brain","brain",4,1),
        inst("discord-smart","discord",2,1),
        inst("steam-smart","steam",2,1),
        inst("now-playing-smart","nowPlaying",2,1),
        inst("timeline-feed-gaming","timelineFeed",2,1),
        inst("quickActions","quickActions",6,1)
      ])
    },
    "smart-evening":{
      id:"smart-evening",
      name:"Smart Evening",
      prefs:prefs([
        inst("command","hero",4,1),
        inst("now-playing-evening","nowPlaying",2,1),
        inst("brain","brain",4,1),
        inst("discord-evening","discord",2,1),
        inst("spotify-evening","spotify",2,1),
        inst("steam-evening","steam",2,1),
        inst("valorant-evening","valorant",2,1),
        inst("timeline-feed-evening","timelineFeed",2,1),
        inst("quickActions","quickActions",6,1)
      ],[],["now-playing-evening","discord-evening","valorant-evening"])
    },
    "smart-music":{
      id:"smart-music",
      name:"Smart Music",
      prefs:prefs([
        inst("command","hero",4,1),
        inst("now-playing-smart","nowPlaying",2,1),
        inst("brain","brain",4,1),
        inst("spotify-smart","spotify",2,1),
        inst("lastfm-smart","lastfm",2,1),
        inst("activity","activity",2,1),
        inst("timeline-feed-music","timelineFeed",2,1),
        inst("quickActions","quickActions",6,1)
      ])
    },
    "smart-focus":{
      id:"smart-focus",
      name:"Smart Focus",
      prefs:prefs([
        inst("command","hero",4,1),
        inst("today","today",2,2),
        inst("brain","brain",4,1),
        inst("ai-suggestions-focus","aiSuggestions",2,1),
        inst("goals-focus","goals",2,1),
        inst("habits-focus","habits",2,1),
        inst("timeline","timeline",2,1),
        inst("quickActions","quickActions",6,1)
      ],[],["brain","today","ai-suggestions-focus"])
    }
  };
  var MODE_LAYOUT={morning:"smart-morning",development:"smart-development",work:"smart-work",gaming:"smart-gaming",evening:"smart-evening",music:"smart-music",focus:"smart-focus",control:null};
  var CONTROL_LAYOUT={
    id:"control",
    name:"Control Center",
    prefs:prefs([
      inst("command","hero",4,1),
      inst("today","today",2,2),
      inst("brain","brain",4,1),
      inst("timeline","timeline",2,1),
      inst("workspace","workspace",2,1),
      inst("activity","activity",2,1),
      inst("quickActions","quickActions",6,1)
    ])
  };

  function ensureLibrary(){
    var lib=readJSON(LAYOUT_KEY,null),changed=false;
    if(!lib||lib.version!==1||!Array.isArray(lib.layouts)){
      lib={version:1,activeId:"control",layouts:[JSON.parse(JSON.stringify(CONTROL_LAYOUT))]};
      changed=true;
    }
    if(!lib.layouts.some(function(l){return l&&l.id==="control"})){
      lib.layouts.unshift(JSON.parse(JSON.stringify(CONTROL_LAYOUT)));
      changed=true;
    }
    Object.keys(LAYOUTS).forEach(function(id){
      var existing=lib.layouts.find(function(l){return l&&l.id===id});
      if(existing){
        existing.name=LAYOUTS[id].name;
        existing.prefs=LAYOUTS[id].prefs;
      }else{
        lib.layouts.push(JSON.parse(JSON.stringify(LAYOUTS[id])));
      }
      changed=true;
    });
    if(changed)writeJSON(LAYOUT_KEY,lib);
    return lib;
  }
  function applyLayout(mode){
    var layoutId=MODE_LAYOUT[mode]||null;
    if(!layoutId)return false;
    var lib=ensureLibrary(),layout=lib.layouts.find(function(l){return l.id===layoutId});
    if(!layout)return false;
    var prefs=layout.prefs;
    try{
      if(window.ETHONEUsageLearning&&typeof window.ETHONEUsageLearning.promoteLayoutPrefs==="function"){
        prefs=window.ETHONEUsageLearning.promoteLayoutPrefs(layout.prefs)||layout.prefs;
      }
    }catch(e){prefs=layout.prefs}
    var api=workspaceApi(),ws=activeWorkspace();
    if(ws&&api&&typeof api.update==="function"&&ws.layoutId!==layoutId){
      api.update(ws.id,{layoutId:layoutId,smartLayoutMode:mode});
    }
    lib.activeId=layoutId;
    writeJSON(LAYOUT_KEY,lib);
    writeJSON(ACTIVE_LAYOUT_KEY,prefs);
    lastApplied=layoutId;
    if(typeof window.ethoneDashboardV4Render==="function")setTimeout(function(){window.ethoneDashboardV4Render()},40);
    try{window.dispatchEvent(new CustomEvent("ethone:smart-layout-change",{detail:{mode:mode,layoutId:layoutId}}))}catch(e){}
    return true;
  }
  function restoreWorkspaceLayout(){
    var api=workspaceApi(),ws=activeWorkspace();
    if(!api||!ws||typeof api.update!=="function")return;
    if(/^smart-/.test(String(ws.layoutId||""))){
      var fallback=ws.template==="gaming"?"ws-gaming":ws.template==="focus"?"ws-dev-focus":"ws-"+ws.id+"-layout";
      api.update(ws.id,{layoutId:fallback,smartLayoutMode:null});
      if(typeof window.ethoneDashboardV4Render==="function")setTimeout(function(){window.ethoneDashboardV4Render()},40);
    }
  }

  function focusRunning(){
    try{
      var end=Number(localStorage.getItem("pomo_end")||0);
      var idx=Number(localStorage.getItem("pomo_idx")||0);
      return !!end&&end>Date.now()&&idx===0;
    }catch(e){return false}
  }
  function discordActivity(conn){
    var d=conn&&conn.data||{},acts=Array.isArray(d.activities)?d.activities:[];
    return acts.map(function(a){return String((a&&a.name)||"").toLowerCase()}).join(" ");
  }
  function hasMusic(s){
    var c=s.connections||{},dc=c.discord||{},activity=discordActivity(dc);
    var discordSpotify=!!(dc.data&&dc.data.spotify);
    var lfm=c.lastfm&&c.lastfm.username;
    var sp=c.spotify&&(c.spotify.widgetUrl||c.spotify.track||c.spotify.artist);
    var np=readJSON("np_track",null);
    return !!(discordSpotify||lfm||sp||(np&&np.key)||/spotify|music|last\.fm|deezer|apple music/.test(activity));
  }
  function hasGaming(s,page,ws){
    var name=((ws&&ws.name)||"")+" "+((ws&&ws.id)||"")+" "+page;
    var conn=s.connections||{},activity=discordActivity(conn.discord||{});
    return /gaming|game|valorant|steam|twitch|streaming/.test(name.toLowerCase())||
      !!(s.gaming&&s.gaming.valo)||!!(Array.isArray(s.valorantAccounts)&&s.valorantAccounts.length)||
      /valorant|league of legends|steam|counter-strike|fortnite|minecraft|rocket league|game/.test(activity);
  }
  function hasWork(s,page,ws){
    var name=((ws&&ws.name)||"")+" "+((ws&&ws.id)||"")+" "+page;
    var c=s.connections||{},open=(s.todos||[]).filter(function(t){return !t.done});
    var taskText=open.map(function(t){return String(t.title||t.text||"")}).join(" ").toLowerCase();
    return /work|study|etudes|school|client|notes|files|todos|calendar|planning|focus/.test(name.toLowerCase())||
      /client|projet|project|meeting|deadline|review|brief|task|todo|planning|focus/.test(taskText);
  }
  function hasDevelopment(s,page,ws){
    var name=((ws&&ws.name)||"")+" "+((ws&&ws.id)||"")+" "+((ws&&ws.template)||"")+" "+page;
    var c=s.connections||{},open=(s.todos||[]).filter(function(t){return !t.done});
    var notes=(s.notes||[]).slice(0,8);
    var text=(name+" "+open.map(function(t){return t.title||t.text||""}).join(" ")+" "+notes.map(function(n){return n.title||n.content||""}).join(" ")).toLowerCase();
    return /dev|develop|code|github|repo|commit|debug|terminal|database|studio|build|api|bug|fix/.test(text)||
      !!(c.github&&(c.github.username||c.github.connected));
  }
  function timeContext(){
    var h=new Date().getHours();
    if(h>=5&&h<12)return "morning";
    if(h>=18||h<5)return "evening";
    return "control";
  }
  function detect(){
    var s=scopedState(),page=currentPage(),ws=activeWorkspace();
    var timeMode=timeContext();
    var learned=null,learnedScores={},contextScores={};
    try{
      if(window.ETHONEUsageLearning){
        learned=window.ETHONEUsageLearning.preferredMode&&window.ETHONEUsageLearning.preferredMode();
        learnedScores=window.ETHONEUsageLearning.scores&&window.ETHONEUsageLearning.scores()||{};
        contextScores=window.ETHONEUsageLearning.contextScores&&window.ETHONEUsageLearning.contextScores()||{};
      }
    }catch(e){}
    var signals={focus:focusRunning(),development:hasDevelopment(s,page,ws)||learned==="development",gaming:hasGaming(s,page,ws)||learned==="gaming",music:hasMusic(s)||learned==="music",work:hasWork(s,page,ws)||learned==="work",morning:timeMode==="morning",evening:timeMode==="evening",learned:!!learned};
    if(signals.focus)return {mode:"focus",reason:t("Session Focus active : distractions reduites.","Active Focus session: distractions reduced."),signals:signals};
    if(signals.development)return {mode:"development",reason:learned==="development"?t("Habitude detectee : GitHub, Terminal, AI et Notes remontent automatiquement.","Habit detected: GitHub, Terminal, AI and Notes move up automatically."):t("Contexte developpement detecte : GitHub, Terminal, AI et Notes passent devant.","Development context detected: GitHub, Terminal, AI and Notes move forward."),signals:signals,scores:learnedScores,contextScores:contextScores};
    if(signals.gaming)return {mode:"gaming",reason:learned==="gaming"?t("Habitude detectee : Valorant, Steam et Discord remontent automatiquement.","Habit detected: Valorant, Steam and Discord move up automatically."):t("Contexte gaming detecte : Valorant et presence passent devant.","Gaming context detected: Valorant and presence move forward."),signals:signals,scores:learnedScores};
    if(signals.work)return {mode:"work",reason:learned==="work"?t("Habitude detectee : GitHub, notes et taches remontent automatiquement.","Habit detected: GitHub, notes and tasks move up automatically."):t("Contexte travail detecte : GitHub et Brain restent visibles.","Work context detected: GitHub and Brain stay visible."),signals:signals,scores:learnedScores};
    if(signals.music)return {mode:"music",reason:learned==="music"?t("Habitude detectee : Spotify et Now Playing remontent automatiquement.","Habit detected: Spotify and Now Playing move up automatically."):t("Musique detectee : Now Playing devient prioritaire.","Music detected: Now Playing becomes a priority."),signals:signals,scores:learnedScores};
    if(timeMode==="morning")return {mode:"morning",reason:t("Matin detecte : calendrier, objectifs, meteo et planning passent devant.","Morning detected: calendar, goals, weather and planning move forward."),signals:signals};
    if(timeMode==="evening")return {mode:"evening",reason:t("Soir detecte : musique, Discord, gaming et temps libre remontent.","Evening detected: music, Discord, gaming and free-time widgets move forward."),signals:signals};
    return {mode:"control",reason:t("Aucun signal fort : layout controle par defaut.","No strong signal: default control layout."),signals:signals};
  }

  function modeLabel(mode){
    var map={
      control:t("Controle","Control"),
      morning:t("Matin","Morning"),
      development:t("Dev","Dev"),
      work:t("Travail","Work"),
      gaming:"Gaming",
      evening:t("Soir","Evening"),
      music:t("Musique","Music"),
      focus:"Focus"
    };
    return map[mode]||mode;
  }
  function icon(mode){
    return {control:"layout-dashboard",morning:"sunrise",development:"square-terminal",work:"briefcase-business",gaming:"crosshair",evening:"moon-star",music:"music",focus:"timer"}[mode]||"sparkles";
  }
  function recommendationsFor(mode){
    try{
      if(window.ETHONEUsageLearning&&typeof window.ETHONEUsageLearning.recommendations==="function"){
        return window.ETHONEUsageLearning.recommendations(mode,4)||[];
      }
    }catch(e){}
    var fallback={
      development:[
        {id:"github",title:"GitHub",body:t("Contexte repo visible.","Repository context visible."),widget:"github",action:"github.open"},
        {id:"terminal",title:"Terminal",body:t("Commandes et debug proches.","Commands and debug nearby."),widget:"terminal",action:"command.open"},
        {id:"ai",title:"ETHONE AI",body:t("Brain aide le code.","Brain helps the code flow."),widget:"aiSuggestions",action:"ai.open"},
        {id:"notes",title:t("Notes","Notes"),body:t("Notes techniques visibles.","Technical notes visible."),widget:"notes",action:"notes.open"}
      ],
      gaming:[
        {id:"discord",title:"Discord",body:t("Presence gaming visible.","Gaming presence visible."),widget:"discord",action:"connections.open"},
        {id:"spotify",title:"Spotify",body:t("Musique de session.","Session music."),widget:"nowPlaying",action:"connections.open"},
        {id:"valorant",title:"Valorant",body:t("Compte et rang visibles.","Account and rank visible."),widget:"valorant",action:"valorant-accounts.open"},
        {id:"steam",title:"Steam",body:t("Activite jeu visible.","Game activity visible."),widget:"steam",action:"gaming.open"}
      ],
      work:[
        {id:"calendar",title:"Calendar",body:t("Planning en premier.","Schedule first."),widget:"calendar",action:"calendar.open"},
        {id:"tasks",title:t("Taches","Tasks"),body:t("Priorites ouvertes.","Open priorities."),widget:"today",action:"todos.open"},
        {id:"notes",title:t("Notes","Notes"),body:t("Contexte recent.","Recent context."),widget:"notes",action:"notes.open"},
        {id:"focus",title:"Focus",body:t("Session profonde.","Deep work session."),widget:"productivity",action:"focus.continue"}
      ]
    };
    return fallback[mode]||fallback.work;
  }
  function actionRegistry(){
    try{return window.ACTION_REGISTRY||window.ETHONEActions||(window.Ethone&&window.Ethone.get&&window.Ethone.get("actions"))||null}catch(e){return null}
  }
  function runSmartAction(action,ctx){
    var A=actionRegistry();
    if(A&&typeof A.dispatch==="function")return A.dispatch(action,ctx||{source:"smart-layouts"});
    if(typeof window.runAction==="function")return window.runAction(action,ctx||{source:"smart-layouts"});
    toast(t("Action indisponible","Action unavailable"),"info");
    return false;
  }
  function renderBar(result,settings){
    var home=$("#ethone-2026-home");
    if(!home)return;
    var top=$(".d4-topbar",home);
    var bar=$("#ethone-smart-layout-bar",home);
    if(!bar){
      bar=document.createElement("section");
      bar.id="ethone-smart-layout-bar";
      bar.className="d4-smartbar";
      if(top&&top.nextSibling)top.parentNode.insertBefore(bar,top.nextSibling);
      else home.prepend(bar);
    }
    var modes=["morning","development","work","gaming","evening","music","focus"];
    var recs=recommendationsFor(result.mode).slice(0,4);
    bar.innerHTML=
      '<div class="d4-smartbar-main">'+
        '<span class="d4-smart-kicker">Smart Layouts</span>'+
        '<strong><i data-lucide="'+icon(result.mode)+'" aria-hidden="true"></i>'+modeLabel(result.mode)+'</strong>'+
        '<p>'+esc(result.reason)+'</p>'+
      '</div>'+
      '<div class="d4-smartbar-signals">'+modes.map(function(m){
        return '<button type="button" class="d4-smart-chip '+(result.signals[m]?'active':'')+'" data-smart-mode="'+m+'" aria-pressed="'+(settings.overrideMode===m?"true":"false")+'">'+modeLabel(m)+'</button>';
      }).join("")+'</div>'+
      '<div class="d4-smartbar-actions">'+
        '<button type="button" class="d4-smart-toggle '+(settings.enabled?'active':'')+'" data-smart-action="toggle">'+(settings.enabled?"Auto":"Off")+'</button>'+
        (settings.overrideMode?'<button type="button" class="d4-smart-toggle" data-smart-action="auto">'+t("Auto","Auto")+'</button>':"")+
      '</div>'+
      '<div class="d4-smartbar-recs" aria-label="'+t("Recommandations dashboard","Dashboard recommendations")+'">'+
        recs.map(function(r){
          return '<button type="button" class="d4-smart-rec" data-smart-run="'+esc(r.action||"")+'" data-smart-widget="'+esc(r.widget||"")+'" data-smart-rec-id="'+esc(r.id||"")+'">'+
            '<i data-lucide="'+icon(r.id||r.widget||"sparkles")+'" aria-hidden="true"></i>'+
            '<span><strong>'+esc(r.title||r.id||"Recommendation")+'</strong><small>'+esc(r.body||"")+'</small></span>'+
          '</button>';
        }).join("")+
      '</div>';
    try{window.lucide&&window.lucide.createIcons&&window.lucide.createIcons()}catch(e){}
  }
  function applyClasses(mode,settings){
    document.body.classList.toggle("ethone-smart-layouts-ready",!!settings.enabled);
    document.body.classList.toggle("ethone-smart-focus",mode==="focus"&&settings.enabled);
    document.body.dataset.smartLayout=mode;
  }
  function evaluate(force){
    if(!appVisible())return;
    ensureLibrary();
    var settings=state();
    var result=detect();
    if(settings.overrideMode){
      result.mode=settings.overrideMode;
      result.reason=t("Mode manuel actif : ETHONE garde ce dashboard jusqu'au retour en Auto.","Manual mode active: ETHONE keeps this dashboard until Auto is restored.");
    }
    applyClasses(result.mode,settings);
    renderBar(result,settings);
    if(flowControlsLayout()){
      document.body.classList.add("ethone-flow-controls-layout");
      return;
    }
    var signature=[settings.enabled,settings.overrideMode||"auto",result.mode,result.reason,currentPage()].join("|");
    if(!force&&signature===lastSignature)return;
    lastSignature=signature;
    if(settings.enabled&&result.mode!=="control"&&!document.body.classList.contains("d4-editing")){
      if(applyLayout(result.mode)){
        settings.lastMode=result.mode;
        settings.lastReason=result.reason;
        saveState(settings);
      }
    }else if(settings.enabled&&result.mode==="control"&&!document.body.classList.contains("d4-editing")){
      restoreWorkspaceLayout();
    }else if(!settings.enabled){
      restoreWorkspaceLayout();
    }
  }
  function schedule(delay){clearTimeout(timer);timer=setTimeout(function(){evaluate(false)},delay||120)}
  function bind(){
    document.addEventListener("click",function(e){
      var action=e.target.closest("[data-smart-action]");
      if(action){
        var settings=state();
        if(action.dataset.smartAction==="toggle"){
          settings.enabled=!settings.enabled;
          if(!settings.enabled)settings.overrideMode=null;
          saveState(settings);
          toast(settings.enabled?t("Smart Layouts active","Smart Layouts enabled"):t("Smart Layouts desactive","Smart Layouts disabled"),"info");
          evaluate(true);
        }
        if(action.dataset.smartAction==="auto"){
          settings.overrideMode=null;
          settings.enabled=true;
          saveState(settings);
          evaluate(true);
        }
        return;
      }
      var chip=e.target.closest("[data-smart-mode]");
      if(chip){
        var st=state();
        st.enabled=true;
        st.overrideMode=chip.dataset.smartMode;
        saveState(st);
        toast(t("Layout force : ","Forced layout: ")+modeLabel(st.overrideMode),"info");
        evaluate(true);
      }
      var rec=e.target.closest("[data-smart-run]");
      if(rec){
        var widget=rec.dataset.smartWidget;
        if(widget&&window.ETHONEUsageLearning&&typeof window.ETHONEUsageLearning.trackWidget==="function"){
          window.ETHONEUsageLearning.trackWidget(widget,1.5);
        }
        runSmartAction(rec.dataset.smartRun,{source:"smart-layout-recommendation",widget:widget,el:rec});
      }
    });
    ["ethone:page-ready","ethone:workspace-change","ethone:workspace-update","ethone:space-change","ethone:space-update","ethone:smart-layout-refresh"].forEach(function(name){
      window.addEventListener(name,function(){schedule(160)});
    });
    window.addEventListener("ethone:dashboard-ready",function(){schedule(1800)});
    window.addEventListener("storage",function(e){if(!e.key||/ethone|pomo|np_track/.test(e.key))schedule(160)});
    document.addEventListener("visibilitychange",function(){if(!document.hidden)schedule(120)});
    setInterval(function(){if(!document.hidden)evaluate(false)},8000);
  }
  function boot(){
    ensureLibrary();
    bind();
    schedule(400);
    setTimeout(function(){evaluate(true)},1600);
  }

  window.ETHONESmartLayouts={
    refresh:function(){evaluate(true)},
    detect:detect,
    recommendations:function(mode){return recommendationsFor(mode||detect().mode)},
    state:state,
    setEnabled:function(on){var s=state();s.enabled=!!on;if(!on)s.overrideMode=null;saveState(s);evaluate(true)},
    setMode:function(mode){var s=state();s.enabled=true;s.overrideMode=MODE_LAYOUT[mode]?mode:null;saveState(s);evaluate(true)}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
