/* ETHONE Usage Learning.
   Learns lightweight local UI habits and exposes them to Smart Layouts. */
(function(){
  "use strict";
  if(window.__ethoneUsageLearning)return;
  window.__ethoneUsageLearning=true;

  var STORAGE_KEY="ethone:usage-learning:v1";
  var DAY=86400000;
  var saveTimer=0;
  var lastApply=0;
  var state={
    version:1,
    startedAt:new Date().toISOString(),
    pages:{},
    widgets:{},
    sidebar:{navClicks:0,autoCompact:false,manualCompactAt:0,expandedAt:0},
    totals:{pageViews:0,clicks:0}
  };

  function $(sel,root){return (root||document).querySelector(sel)}
  function now(){return Date.now()}
  function read(){
    try{
      var raw=localStorage.getItem(STORAGE_KEY);
      if(raw)state=Object.assign(state,JSON.parse(raw)||{});
    }catch(e){}
    state.pages=state.pages||{};
    state.widgets=state.widgets||{};
    state.sidebar=state.sidebar||{};
    state.totals=state.totals||{};
  }
  function write(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}
    try{
      var p=typeof window.curP==="function"?window.curP():null;
      if(p){p.state=p.state||{};p.state.usageLearning=state;}
    }catch(e){}
  }
  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(write,250);
  }
  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }
  function lang(){return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}
  function label(fr,en){return lang()==="fr"?fr:en}
  function decayScore(entry){
    if(!entry)return 0;
    var count=Number(entry.count||0);
    var last=Number(entry.last||0);
    if(!last)return count;
    var age=Math.max(0,(now()-last)/DAY);
    return Math.round(count*Math.pow(.82,age)*100)/100;
  }
  function bump(bucket,key,weight){
    if(!key)return;
    var map=state[bucket]=state[bucket]||{};
    var item=map[key]||{count:0,last:0};
    item.count=decayScore(item)+(weight||1);
    item.last=now();
    map[key]=item;
    scheduleSave();
  }
  function currentPage(){
    var active=$(".tab-content.active[id^='page-']");
    return active?active.id.replace(/^page-/,""):"dashboard";
  }
  function pageToWidget(page){
    return {
      ai:"ai",
      github:"github",
      studio:"terminal",
      databases:"terminal",
      gaming:"gaming",
      "valorant-accounts":"valorant",
      connections:"connections",
      calendar:"calendar",
      notes:"notes",
      todos:"tasks",
      files:"files",
      goals:"goals",
      habits:"habits",
      stats:"analytics"
    }[page]||null;
  }
  function inferWidgetFromElement(el){
    if(!el)return null;
    var widget=el.closest&&el.closest("[data-widget-type]");
    if(widget&&widget.dataset.widgetType)return widget.dataset.widgetType;
    var container=el.closest&&el.closest("[id],[class]");
    var text="";
    try{text=((container&&container.id)||"")+" "+((container&&container.className)||"")+" "+(container&&container.innerText||"").slice(0,120)}catch(e){}
    text=String(text).toLowerCase();
    if(/spotify|nowplaying|now-playing|lastfm|music/.test(text))return "spotify";
    if(/terminal|console|developer|build|debug/.test(text))return "terminal";
    if(/github|repo|commit/.test(text))return "github";
    if(/brain|ethone ai|ai suggestions|assistant/.test(text))return "ai";
    if(/discord|lanyard/.test(text))return "discord";
    if(/steam/.test(text))return "steam";
    if(/valorant|riot/.test(text))return "valorant";
    if(/calendar|event|planning/.test(text))return "calendar";
    if(/note/.test(text))return "notes";
    if(/task|todo/.test(text))return "tasks";
    return null;
  }
  function trackPage(page){
    page=page||currentPage();
    bump("pages",page,1);
    var widget=pageToWidget(page);
    if(widget)bump("widgets",widget,.8);
    state.totals.pageViews=(Number(state.totals.pageViews)||0)+1;
    scheduleSave();
    scheduleApply();
  }
  function trackClick(e){
    state.totals.clicks=(Number(state.totals.clicks)||0)+1;
    var nav=e.target.closest&&e.target.closest("#main-sidebar .nav-item,[data-nav-id]");
    if(nav){
      state.sidebar.navClicks=(Number(state.sidebar.navClicks)||0)+1;
      bump("pages",nav.dataset.page||nav.dataset.navId,.6);
      scheduleApply();
    }
    var widget=inferWidgetFromElement(e.target);
    if(widget)bump("widgets",widget,.7);
  }
  function usageScore(kind){
    return decayScore((state.widgets||{})[kind]||(state.pages||{})[kind]);
  }
  function scores(){
    var widgets=state.widgets||{};
    var out={};
    Object.keys(widgets).forEach(function(k){out[k]=decayScore(widgets[k])});
    return out;
  }
  function appState(){
    try{
      var p=profile(),base=p&&p.state?p.state:{};
      var api=(window.Ethone&&window.Ethone.get&&window.Ethone.get("workspaces"))||window.ETHONEWorkspaces;
      return api&&typeof api.scopedState==="function"?api.scopedState(base):base;
    }catch(e){return {}}
  }
  function activeWorkspace(){
    try{
      var api=(window.Ethone&&window.Ethone.get&&window.Ethone.get("workspaces"))||window.ETHONEWorkspaces;
      return api&&typeof api.active==="function"?api.active():null;
    }catch(e){return null}
  }
  function textCorpus(s,ws){
    var todos=Array.isArray(s.todos)?s.todos:[],notes=Array.isArray(s.notes)?s.notes:[],events=Array.isArray(s.events)?s.events:[];
    return [
      currentPage(),
      ws&&ws.name,
      ws&&ws.id,
      ws&&ws.template,
      todos.slice(0,25).map(function(t){return t.title||t.text||t.name||""}).join(" "),
      notes.slice(0,12).map(function(n){return n.title||n.content||""}).join(" "),
      events.slice(0,12).map(function(ev){return ev.title||ev.text||""}).join(" ")
    ].join(" ").toLowerCase();
  }
  function round(n){return Math.round(Math.max(0,n)*100)/100}
  function contextScores(){
    var s=scores(),app=appState(),ws=activeWorkspace(),text=textCorpus(app,ws),h=new Date().getHours();
    var conn=app.connections||{};
    var openTasks=Array.isArray(app.todos)?app.todos.filter(function(t){return !t.done}).length:0;
    var events=Array.isArray(app.events)?app.events.length:0;
    var hasSpotify=!!(conn.spotify&&(conn.spotify.track||conn.spotify.artist||conn.spotify.username||conn.spotify.widgetUrl));
    var hasGithub=!!(conn.github&&(conn.github.username||conn.github.connected));
    var valorant=Array.isArray(app.valorantAccounts)&&app.valorantAccounts.length;
    var out={
      development:(s.github||0)*1.35+(s.terminal||0)*1.2+(s.ai||0)*.75+(s.notes||0)*.45,
      gaming:(s.valorant||0)*1.25+(s.steam||0)*1.2+(s.discord||0)*.9+(s.gaming||0)*1.4,
      work:(s.calendar||0)*.9+(s.tasks||0)*1.1+(s.notes||0)*.95+(s.productivity||0)*.85,
      music:(s.spotify||0)*1.15+(s.nowPlaying||0)*1.2+(s.lastfm||0),
      focus:(s.tasks||0)*.75+(s.goals||0)*.65+(s.habits||0)*.55,
      morning:h>=5&&h<12?3:0,
      evening:h>=18||h<5?3:0
    };
    if(/dev|develop|code|github|repo|commit|debug|terminal|database|studio|build|api/.test(text))out.development+=4;
    if(hasGithub)out.development+=3;
    if(/gaming|game|valorant|steam|discord|riot|twitch|minecraft/.test(text))out.gaming+=4;
    if(valorant)out.gaming+=3;
    if(/work|travail|client|meeting|calendar|planning|deadline|task|todo|focus|study|etudes/.test(text))out.work+=3;
    if(openTasks)out.work+=Math.min(4,openTasks*.35);
    if(events)out.work+=Math.min(3,events*.3);
    if(hasSpotify)out.music+=3;
    if(/focus|pomodoro|objectif|goal|habit|deep work/.test(text))out.focus+=2;
    Object.keys(out).forEach(function(k){out[k]=round(out[k])});
    return out;
  }
  function leadingContext(){
    var ctx=contextScores(),best=null,bestScore=0;
    ["development","gaming","work","music","focus","morning","evening"].forEach(function(k){
      if(ctx[k]>bestScore){best=k;bestScore=ctx[k]}
    });
    return bestScore>=3?best:null;
  }
  function preferredMode(){
    var s=scores(),ctx=contextScores(),lead=leadingContext();
    if(lead==="development"&&ctx.development>=4)return "development";
    if(lead==="gaming"&&ctx.gaming>=4)return "gaming";
    if(lead==="music"&&ctx.music>=5)return "music";
    if(lead==="work"&&ctx.work>=4)return "work";
    if((s.spotify||0)>=5 || (s.music||0)>=5)return "music";
    if((s.github||0)>=5 || (s.terminal||0)>=4 || ((s.ai||0)>=4&&(s.notes||0)>=3))return "development";
    if((s.valorant||0)>=4 || (s.steam||0)>=4 || (s.discord||0)>=6 || (s.gaming||0)>=4)return "gaming";
    if((s.tasks||0)>=6 || (s.notes||0)>=6 || (s.calendar||0)>=4)return "work";
    return null;
  }
  function shouldCompactSidebar(){
    var views=Number(state.totals.pageViews||0);
    var nav=Number(state.sidebar.navClicks||0);
    var manual=Number(state.sidebar.manualCompactAt||0);
    if(window.innerWidth<1024)return false;
    if(manual&&now()-manual<DAY)return false;
    if(views<14)return false;
    return nav/Math.max(views,1)<.18;
  }
  function applySidebarLearning(){
    var p=profile();
    var sb=$("#main-sidebar");
    if(!p||!sb)return;
    if(shouldCompactSidebar()){
      if(!p.sidebarCompact){
        p.sidebarCompact=true;
        sb.classList.add("compact");
        if(window.ethoneSidebarResize)window.ethoneSidebarResize.suspendForCompact();
        state.sidebar.autoCompact=true;
        try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
      }
    }else if(state.sidebar.autoCompact&&p.sidebarCompact&&Number(state.sidebar.navClicks||0)>4){
      p.sidebarCompact=false;
      sb.classList.remove("compact");
      if(window.ethoneSidebarResize)window.ethoneSidebarResize.resumeFromCompact();
      state.sidebar.autoCompact=false;
      try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
    }
  }
  function promoteLayoutPrefs(prefs){
    prefs=prefs&&prefs.version===2?JSON.parse(JSON.stringify(prefs)):prefs;
    if(!prefs||!Array.isArray(prefs.instances))return prefs;
    var s=scores();
    var priority=[];
    if((s.spotify||0)>=5)priority.push("spotify","nowPlaying","lastfm");
    if((s.github||0)>=5||(s.terminal||0)>=4)priority.push("github","terminal","brain","aiSuggestions","notes","productivity");
    if((s.tasks||0)>=6||(s.calendar||0)>=4)priority.push("calendar","today","notes","productivity","goals","habits");
    if((s.valorant||0)>=4||(s.steam||0)>=4)priority.push("valorant","steam","discord","spotify","nowPlaying");
    if(!priority.length)return prefs;
    var rank=function(inst){
      var idx=priority.indexOf(inst.type);
      return idx===-1?99:idx;
    };
    var head=prefs.instances.filter(function(i){return i.type==="hero"||i.type==="brain"});
    var rest=prefs.instances.filter(function(i){return i.type!=="hero"&&i.type!=="brain"});
    rest.sort(function(a,b){return rank(a)-rank(b)});
    prefs.instances=head.concat(rest);
    return prefs;
  }
  function scheduleApply(){
    if(now()-lastApply<900)return;
    lastApply=now();
    setTimeout(function(){
      applySidebarLearning();
      try{window.dispatchEvent(new CustomEvent("ethone:usage-learning",{detail:{scores:scores(),contextScores:contextScores(),mode:preferredMode(),recommendations:recommendations()}}))}catch(e){}
    },120);
  }
  function rec(id,title,body,widget,action,score){
    return {id:id,title:title,body:body,widget:widget,action:action,score:round(score||1)};
  }
  function recommendations(mode,limit){
    var ctx=contextScores(),m=mode||preferredMode()||leadingContext()||"work";
    var app=appState(),open=Array.isArray(app.todos)?app.todos.filter(function(t){return !t.done}).length:0;
    var maps={
      development:[
        rec("github","GitHub",label("Signal dev detecte. Le contexte repo reste visible.","Developer signal detected. Keep repository context visible."),"github","github.open",ctx.development+2),
        rec("terminal","Terminal",label("Commandes et debug restent proches de ton espace.","Keep command and debug context close to your workspace."),"terminal","command.open",ctx.development+1.5),
        rec("ai","ETHONE AI",label("Brain peut aider le code, le planning et le debug.","Use Brain for code review, planning and debugging support."),"aiSuggestions","ai.open",ctx.development+1.2),
        rec("notes","Notes",label("Garde les notes d'implementation dans le flow dev.","Keep implementation notes next to your dev flow."),"notes","notes.open",ctx.development)
      ],
      gaming:[
        rec("discord","Discord",label("La presence gaming est utile pendant cette session.","Gaming presence is useful during this session."),"discord","connections.open",ctx.gaming+2),
        rec("spotify","Spotify",label("Musique et contexte de session remontent pour jouer.","Music and focus context move up for gaming sessions."),"nowPlaying","connections.open",ctx.music+ctx.gaming*.4),
        rec("valorant","Valorant",label("Affiche le compte et le rang pendant les sessions jeu.","Show account and rank context while gaming."),"valorant","valorant-accounts.open",ctx.gaming+1.3),
        rec("steam","Steam",label("Garde le statut et l'activite de jeu visibles.","Keep game status and play activity visible."),"steam","gaming.open",ctx.gaming+1)
      ],
      work:[
        rec("calendar","Calendar",label("Evenements et deadlines doivent rester visibles.","Upcoming events and deadlines should stay visible."),"calendar","calendar.open",ctx.work+2),
        rec("tasks",label("Taches","Tasks"),open?label(open+" taches ouvertes demandent ton attention.",open+" open tasks deserve attention."):label("Prepare ta prochaine liste de taches.","Prepare your next task list."),"today","todos.open",ctx.work+1.6),
        rec("notes","Notes",label("Les notes recentes aident Brain a comprendre l'espace.","Recent notes help Brain understand the current workspace."),"notes","notes.open",ctx.work+1.1),
        rec("focus","Focus",label("Demarre ou continue une session de concentration.","Start or continue a focused work session."),"productivity","focus.continue",ctx.focus+ctx.work*.5)
      ],
      music:[
        rec("nowPlaying","Now Playing",label("La musique fait partie du contexte de session.","Music is part of this session context."),"nowPlaying","connections.open",ctx.music+1.5),
        rec("spotify","Spotify",label("Garde Spotify proche du dashboard.","Keep Spotify status close to your dashboard."),"spotify","connections.open",ctx.music+1.2),
        rec("brain","Brain",label("Brain garde la session calme et organisee.","Let Brain keep the session calm and organized."),"brain","ai.open",ctx.music*.8)
      ],
      focus:[
        rec("focus","Focus",label("Reduis les distractions et garde la prochaine action visible.","Reduce distractions and keep the next action visible."),"today","focus.continue",ctx.focus+2),
        rec("brain","Brain",label("Brain peut resumer les priorites sans quitter la page.","Brain can summarize priorities without leaving the page."),"brain","ai.open",ctx.focus+1.2),
        rec("goals",label("Objectifs","Goals"),label("Garde les objectifs visibles pendant le deep work.","Keep objectives visible during deep work."),"goals","goals.open",ctx.focus)
      ],
      morning:[
        rec("calendar","Calendar",label("Commence par ton planning et tes deadlines.","Start with your schedule and deadlines."),"calendar","calendar.open",ctx.morning+2),
        rec("goals",label("Objectifs","Goals"),label("Revois la direction du jour avant les distractions.","Review today's direction before opening distractions."),"goals","goals.open",ctx.morning+1.2),
        rec("weather",label("Meteo","Weather"),label("Contexte utile pour planifier le matin.","Useful morning context for planning."),"weather","dashboard.open",ctx.morning)
      ],
      evening:[
        rec("nowPlaying","Now Playing",label("Le soir favorise musique et contexte detente.","Evening sessions favor music and unwind context."),"nowPlaying","connections.open",ctx.evening+1.4),
        rec("discord","Discord",label("Social et gaming remontent ce soir.","Social and gaming widgets move forward tonight."),"discord","connections.open",ctx.evening+1.2),
        rec("gaming","Gaming",label("Ouvre le hub gaming quand les signaux temps libre montent.","Open your gaming hub when free-time signals rise."),"valorant","gaming.open",ctx.evening)
      ]
    };
    var list=(maps[m]||maps.work).slice().sort(function(a,b){return b.score-a.score});
    return typeof limit==="number"?list.slice(0,limit):list;
  }
  function manualCompactToggle(){
    state.sidebar.manualCompactAt=now();
    state.sidebar.autoCompact=false;
    scheduleSave();
  }
  function bind(){
    document.addEventListener("click",trackClick,true);
    window.addEventListener("ethone:page-ready",function(e){trackPage(e&&e.detail&&e.detail.page)});
    window.addEventListener("ethone:smart-layout-refresh",scheduleApply);
    window.addEventListener("storage",function(e){if(e.key===STORAGE_KEY)read()});
  }
  function boot(){
    read();
    bind();
    setTimeout(function(){trackPage(currentPage());scheduleApply()},800);
  }

  window.ETHONEUsageLearning={
    trackPage:trackPage,
    trackWidget:function(type,weight){bump("widgets",type,weight||1);scheduleApply()},
    score:usageScore,
    scores:scores,
    contextScores:contextScores,
    preferredMode:preferredMode,
    recommendations:recommendations,
    promoteLayoutPrefs:promoteLayoutPrefs,
    apply:applySidebarLearning,
    state:function(){return JSON.parse(JSON.stringify(state))},
    markManualCompactToggle:manualCompactToggle
  };
  var old=window.ethoneNotifyManualCompactToggle;
  window.ethoneNotifyManualCompactToggle=function(){
    manualCompactToggle();
    if(typeof old==="function")try{old()}catch(e){}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
