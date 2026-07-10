/* ETHONE Ambient Intelligence: subtle time, context and event-aware dashboard. */
(function(){
  "use strict";
  if(window.__ethoneLivingDashboard)return;
  window.__ethoneLivingDashboard=true;

  var intervalId=0;
  var scheduled=false;
  var reduceMotion=false;
  var lastMetrics=null;
  var lastMode="";
  var audioContext=null;
  var clickBound=false;
  try{reduceMotion=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;}catch(error){}

  function home(){return document.getElementById("ethone-2026-home")}
  function lang(){
    try{return String(window._lang||localStorage.getItem("nexus_lang")||"fr").slice(0,2).toLowerCase()}
    catch(error){return "fr"}
  }
  function isFR(){return lang()==="fr"}
  function text(fr,en){return isFR()?fr:en}
  function list(v){return Array.isArray(v)?v:[]}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(error){return null}}
  function appGet(name){try{return window.Ethone&&window.Ethone.get?window.Ethone.get(name):null}catch(error){return null}}
  function dashboardVisible(){
    var root=home();
    if(!root||document.hidden)return false;
    var page=document.getElementById("page-dashboard");
    if(page&&!page.classList.contains("active"))return false;
    return true;
  }
  function motionEnabled(){
    return !reduceMotion && !document.hidden && !(document.body&&document.body.classList.contains("ethone-low-power"));
  }
  function stopClock(){
    if(intervalId){
      clearInterval(intervalId);
      intervalId=0;
    }
  }

  function state(){
    var p=profile();
    return p&&p.state?p.state:{};
  }

  function activeWorkspace(){
    try{
      if(window.ETHONEWorkspaces&&typeof window.ETHONEWorkspaces.active==="function"){
        return window.ETHONEWorkspaces.active();
      }
    }catch(error){}
    var p=profile();
    return p&&p.activeWorkspaceId?{id:p.activeWorkspaceId,name:p.activeWorkspaceId}:null;
  }

  function workspaceName(){
    var ws=activeWorkspace();
    return ws&&ws.name?String(ws.name):"ETHONE";
  }

  function profileName(){
    var p=profile(),s=state();
    return String((p&&p.name)||s.username||"Utilisateur").trim()||"Utilisateur";
  }

  function pageId(){
    var active=document.querySelector(".tab-content.active[id^='page-']");
    if(active)return active.id.replace(/^page-/,"");
    return document.body.classList.contains("ethone-dashboard-v4")?"dashboard":"";
  }

  function plain(value){
    return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  }

  function ambienceFor(hour){
    if(hour < 6 || hour >= 22)return "night";
    if(hour < 12)return "morning";
    if(hour < 18)return "day";
    return "evening";
  }

  function settingsValue(name,fallback){
    var Settings=appGet("settings");
    try{
      if(Settings&&typeof Settings.get==="function"){
        var v=Settings.get(name,undefined);
        if(v!==undefined)return v;
      }
    }catch(error){}
    try{
      var p=profile();
      if(p&&p.state&&p.state[name]!==undefined)return p.state[name];
    }catch(error){}
    try{
      var raw=localStorage.getItem("ethone:"+name);
      if(raw!=null)return raw==="1"||raw==="true"?true:raw==="0"||raw==="false"?false:raw;
    }catch(error){}
    return fallback;
  }

  function soundEnabled(){
    var localSound=false;
    try{localSound=localStorage.getItem("ethone:ambient-sound")==="1"}catch(error){}
    return settingsValue("ambientSoundFeedback",false)===true ||
      settingsValue("soundFeedback",false)===true ||
      localSound;
  }

  function syncSoundToggle(){
    var toggle=document.getElementById("ambient-sound-toggle");
    if(toggle)toggle.checked=soundEnabled();
    document.body.dataset.ethoneAmbientSound=soundEnabled()?"on":"off";
  }

  function playTone(kind){
    if(!soundEnabled())return;
    try{
      var AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)return;
      audioContext=audioContext||new AudioCtx();
      if(audioContext.state==="suspended"&&audioContext.resume)audioContext.resume();
      var now=audioContext.currentTime;
      var osc=audioContext.createOscillator();
      var gain=audioContext.createGain();
      var freq=kind==="workspace"?420:kind==="success"?520:360;
      osc.type="sine";
      osc.frequency.setValueAtTime(freq,now);
      gain.gain.setValueAtTime(0.0001,now);
      gain.gain.exponentialRampToValueAtTime(0.028,now+0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+0.16);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now);
      osc.stop(now+0.18);
    }catch(error){}
  }

  function contextData(){
    var s=state();
    var todos=list(s.todos),events=list(s.events),notes=list(s.notes),items=list(s.items),habits=list(s.habits);
    var open=todos.filter(function(t){return !t.done});
    var done=todos.filter(function(t){return !!t.done});
    var habitDone=habits.filter(function(h){return h.done||h.completed});
    var focus=Number(s.focusMinutes||s.stats&&s.stats.focusMinutes||s.pomodoro&&s.pomodoro.totalMinutes||0);
    var ws=workspaceName();
    return {
      page:pageId(),
      workspace:ws,
      workspaceLower:plain(ws),
      openTasks:open.length,
      doneTasks:done.length,
      events:events.length,
      notes:notes.length,
      files:items.length,
      habits:habits.length,
      habitDone:habitDone.length,
      focus:focus,
      online:navigator.onLine!==false
    };
  }

  function inferMode(data){
    var hay=plain(data.page+" "+data.workspaceLower);
    if(/gaming|game|valorant|steam|twitch|discord|battle|minecraft|stream/.test(hay))return "gaming";
    if(/study|etude|school|cours|revision|reading|pdf|book/.test(hay))return "study";
    if(/dev|code|github|developer|terminal|database|studio|automation/.test(hay))return "work";
    if(/music|spotify|journal|habit|personal|home|relax|chill/.test(hay))return "relax";
    if(data.focus>0||data.openTasks>2||data.events>1)return "work";
    var hour=new Date().getHours();
    if(hour>=20||hour<7)return "relax";
    return "personal";
  }

  function copyFor(data,ambience,mode){
    var name=profileName();
    var taskCopy=data.openTasks?
      text(data.openTasks+" taches ouvertes",data.openTasks+" open tasks"):
      text("aucune tache urgente","no urgent tasks");
    var eventCopy=data.events?
      text(data.events+" evenements aujourd'hui",data.events+" events today"):
      text("planning calme","calm schedule");
    var modeLabel={
      work:text("Travail","Work"),
      gaming:"Gaming",
      study:text("Etude","Study"),
      relax:text("Calme","Calm"),
      personal:"ETHONE"
    }[mode]||"ETHONE";
    var greetingMap={
      morning:text("Bonjour","Good morning"),
      day:text("Bon apres-midi","Good afternoon"),
      evening:text("Bonsoir","Good evening"),
      night:text("Mode nuit","Night mode")
    };
    var modeIntent={
      work:text("priorite au focus", "focus is the priority"),
      gaming:text("environnement gaming pret", "gaming environment is ready"),
      study:text("session d'etude organisee", "study session organized"),
      relax:text("rythme plus calme", "a calmer rhythm"),
      personal:text("votre espace est synchronise", "your space is synchronized")
    }[mode];
    var sentence={
      work:text("Brain garde le contexte: "+taskCopy+", "+eventCopy+".","Brain is keeping context: "+taskCopy+", "+eventCopy+"."),
      gaming:text("ETHONE baisse le bruit et met Discord, Spotify et vos sessions en contexte.","ETHONE reduces noise and keeps Discord, Spotify and sessions in context."),
      study:text("ETHONE met en avant notes, calendrier et prochaines actions sans vous distraire.","ETHONE highlights notes, calendar and next actions without distraction."),
      relax:text("L'interface passe en ambiance douce. "+eventCopy+".","The interface shifts into a softer rhythm. "+eventCopy+"."),
      personal:text("Votre espace est pret. "+taskCopy+", "+eventCopy+".","Your workspace is ready. "+taskCopy+", "+eventCopy+".")
    }[mode];
    return {
      greeting:greetingMap[ambience]+", "+name+" - "+modeIntent+".",
      sentence:sentence,
      chip:modeLabel+" / "+data.workspace
    };
  }

  function setAmbience(root){
    var now=new Date();
    var ambience=ambienceFor(now.getHours());
    var data=contextData();
    var mode=inferMode(data);
    var drift=(now.getMinutes()%12)/12;
    var html=document.documentElement;

    root.dataset.d4Ambience=ambience;
    root.dataset.d4Mode=mode;
    root.style.setProperty("--d4-minute",String(now.getMinutes()));
    root.style.setProperty("--d4-light-drift",String(drift));
    html.dataset.ethoneAmbient=ambience;
    document.body.dataset.ethoneAmbient=ambience;
    document.body.dataset.ethoneActivityMode=mode;
    document.body.classList.toggle("ethone-offline",!data.online);

    if(mode!==lastMode){
      document.body.classList.add("ethone-mode-shift");
      root.classList.add("d4-mode-shift");
      setTimeout(function(){
        document.body.classList.remove("ethone-mode-shift");
        root.classList.remove("d4-mode-shift");
      },250);
      lastMode=mode;
    }
    return {ambience:ambience,mode:mode,data:data};
  }

  function ensureContextChip(root){
    var copy=root.querySelector(".d4-hero-copy");
    if(!copy)return null;
    var chip=root.querySelector("#d4-ambient-chip");
    if(!chip){
      chip=document.createElement("span");
      chip.id="d4-ambient-chip";
      chip.className="d4-ambient-chip";
      chip.setAttribute("aria-live","polite");
      var p=copy.querySelector("p");
      if(p)p.appendChild(chip);
      else copy.appendChild(chip);
    }
    return chip;
  }

  function updateContextCopy(root,ctx){
    var copy=copyFor(ctx.data,ctx.ambience,ctx.mode);
    var greeting=root.querySelector("#vh-greeting");
    var sentence=root.querySelector("#bh-hero-sentence");
    var chip=ensureContextChip(root);
    if(greeting&&greeting.textContent!==copy.greeting)greeting.textContent=copy.greeting;
    if(sentence&&sentence.textContent!==copy.sentence)sentence.textContent=copy.sentence;
    if(chip&&chip.textContent!==copy.chip)chip.textContent=copy.chip;
  }

  function parseMetric(textValue){
    var value=String(textValue||"").trim();
    var match=value.match(/^(-?\d+(?:[.,]\d+)?)(.*)$/);
    if(!match)return null;
    return {number:Number(match[1].replace(",",".")),suffix:match[2]||""};
  }

  function formatMetric(value,suffix){
    return String(Math.round(value))+suffix;
  }

  function animateMetric(el){
    if(!el||!motionEnabled())return;
    var parsed=parseMetric(el.textContent);
    if(!parsed||!Number.isFinite(parsed.number))return;
    var key=String(parsed.number)+parsed.suffix;
    if(el.dataset.d4LivingMetric===key)return;
    var to=parsed.number;
    el.dataset.d4LivingMetric=key;
    el.dataset.d4LivingNumber=String(to);
    el.textContent=formatMetric(to,parsed.suffix);
    if(window.ETHONEMotion&&typeof window.ETHONEMotion.pop==="function")window.ETHONEMotion.pop(el);
  }

  function animateProgress(bar){
    if(!bar||!motionEnabled())return;
    var target=bar.style.width||"";
    if(!target||bar.dataset.d4LivingProgress===target)return;
    var wrap=bar.closest(".d4-progress,.d4-live-progress");
    bar.dataset.d4LivingProgress=target;
    if(wrap){
      wrap.classList.remove("is-updating");
      queueMicrotask(function(){
        if(document.body.contains(wrap))wrap.classList.add("is-updating");
      });
      setTimeout(function(){wrap.classList.remove("is-updating")},180);
    }
  }

  function signal(root,selector,kind){
    var target=root.querySelector(selector);
    if(!target||!motionEnabled())return;
    target.classList.remove("d4-event-wake","d4-event-wake-"+kind);
    queueMicrotask(function(){
      if(document.body.contains(target))target.classList.add("d4-event-wake","d4-event-wake-"+kind);
    });
    setTimeout(function(){target.classList.remove("d4-event-wake","d4-event-wake-"+kind)},180);
  }

  function reactToImportantChanges(root,data){
    var metrics={
      openTasks:data.openTasks,
      events:data.events,
      notes:data.notes,
      files:data.files,
      focus:data.focus,
      habitDone:data.habitDone,
      online:data.online?1:0
    };
    if(!lastMetrics){
      lastMetrics=metrics;
      return;
    }
    if(metrics.openTasks!==lastMetrics.openTasks)signal(root,'.d4-widget[data-widget-type="brain"]',"tasks");
    if(metrics.events!==lastMetrics.events)signal(root,'.d4-widget[data-widget-type="timeline"]',"events");
    if(metrics.notes!==lastMetrics.notes||metrics.files!==lastMetrics.files)signal(root,'.d4-widget[data-widget-type="workspace"]',"context");
    if(metrics.focus!==lastMetrics.focus||metrics.habitDone!==lastMetrics.habitDone)signal(root,'.d4-widget[data-widget-type="today"]',"focus");
    if(metrics.online!==lastMetrics.online)signal(root,".d4-topbar","sync");
    lastMetrics=metrics;
  }

  function wake(root){
    if(!motionEnabled())return;
    root.classList.add("d4-living-ready");
    setTimeout(function(){root.classList.remove("d4-living-ready")},250);
  }

  function tick(root){
    if(!motionEnabled())return;
    root.classList.remove("d4-living-tick");
    queueMicrotask(function(){
      if(document.body.contains(root))root.classList.add("d4-living-tick");
    });
    setTimeout(function(){root.classList.remove("d4-living-tick")},180);
  }

  function refresh(){
    var root=home();
    if(!root||!dashboardVisible()){
      stopClock();
      return;
    }
    var ctx=setAmbience(root);
    updateContextCopy(root,ctx);
    [
      "#d4-task-count",
      "#d4-event-count",
      "#d4-focus-count",
      "#d4-focus-pct",
      ".d4-brain-metric strong",
      ".d4-state-row strong",
      ".d4-insight-cell strong"
    ].forEach(function(selector){
      Array.prototype.forEach.call(root.querySelectorAll(selector),animateMetric);
    });
    Array.prototype.forEach.call(root.querySelectorAll(".d4-progress i,.d4-live-progress i"),animateProgress);
    reactToImportantChanges(root,ctx.data);
  }

  function schedule(){
    if(!dashboardVisible()){
      stopClock();
      return;
    }
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(function(){
      scheduled=false;
      if(!dashboardVisible()){
        stopClock();
        return;
      }
      var root=home();
      if(root&&!root.dataset.d4LivingBooted){
        root.dataset.d4LivingBooted="1";
        wake(root);
      }
      refresh();
    });
  }

  function startClock(){
    if(!dashboardVisible())return;
    if(intervalId)return;
    intervalId=setInterval(function(){
      var root=home();
      if(!root||!dashboardVisible()){stopClock();return}
      setAmbience(root);
      tick(root);
    },60000);
  }

  function workspaceShift(){
    var root=home();
    if(root&&dashboardVisible()){
      root.classList.add("d4-workspace-shift");
      setTimeout(function(){root.classList.remove("d4-workspace-shift")},250);
    }
    playTone("workspace");
    if(dashboardVisible())schedule();
  }

  function bindActionFeedback(){
    if(clickBound)return;
    clickBound=true;
    document.addEventListener("click",function(event){
      var el=event.target&&event.target.closest?event.target.closest("[data-v4-action-id],.btn,.ui-button,.panel-action,.item-btn,.settings-action"):null;
      if(!el||el.disabled||el.getAttribute("aria-disabled")==="true")return;
      var root=home();
      if(!root||!root.contains(el))return;
      el.classList.add("ethone-ambient-action");
      setTimeout(function(){el.classList.remove("ethone-ambient-action")},180);
      if(el.matches(".primary,.btn-primary,.ui-button--primary,[data-v4-action-id*='save'],[data-v4-action-id*='switch']"))playTone("success");
    },true);
  }

  function boot(){
    bindActionFeedback();
    syncSoundToggle();
    if(dashboardVisible()){
      schedule();
      startClock();
    }
    [
      "ethone:dashboard-ready",
      "ethone:page-ready",
      "ethone:boot-sequence-complete",
      "ethone:workspace-update",
      "ethone:settings-change",
      "settings:changed",
      "ethone:theme-change",
      "ethone:usage-learning-update",
      "ethone:timeline",
      "ethone:memory-update"
    ].forEach(function(name){
      window.addEventListener(name,function(){
        syncSoundToggle();
        if(dashboardVisible()){
          schedule();
          startClock();
        }else{
          stopClock();
        }
      },{passive:true});
    });
    window.addEventListener("ethone:workspace-change",workspaceShift,{passive:true});
  }

  window.ETHONEAmbientIntelligence={
    refresh:schedule,
    setSoundEnabled:function(enabled){
      try{localStorage.setItem("ethone:ambient-sound",enabled?"1":"0")}catch(error){}
      document.body.dataset.ethoneAmbientSound=enabled?"on":"off";
      syncSoundToggle();
    },
    isSoundEnabled:soundEnabled,
    signal:function(kind){
      var root=home();
      if(root)signal(root,".d4-hero",kind||"manual");
      playTone(kind||"action");
    }
  };
  window.toggleAmbientSound=function(enabled){
    window.ETHONEAmbientIntelligence.setSoundEnabled(!!enabled);
    if(enabled)playTone("success");
  };
  window.ETHONELivingDashboard=window.ETHONEAmbientIntelligence;

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
