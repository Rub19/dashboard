/* ETHONE Brain Intelligence.
   Local, lightweight intelligence layer for habits, planning, memory candidates
   and contextual recommendations. It never calls external APIs on boot. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE||window.__ethoneBrainIntelligence)return;
  window.__ethoneBrainIntelligence=true;

  var STORAGE_KEY="ethone:brain-intelligence:v1";
  var DAY=86400000;
  var saveTimer=0;
  var runTimer=0;
  var state={
    version:1,
    lastRun:0,
    lastReport:null,
    dismissed:{},
    preferences:[],
    automationDrafts:[]
  };

  function $(sel,root){return (root||document).querySelector(sel)}
  function clone(value){try{return JSON.parse(JSON.stringify(value))}catch(e){return value}}
  function now(){return Date.now()}
  function iso(ts){return new Date(ts||Date.now()).toISOString()}
  function todayKey(){return new Date().toLocaleDateString("en-CA")}
  function lang(){return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}
  function isFR(){return lang()==="fr"}
  function text(fr,en){return isFR()?fr:en}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function profileState(){var p=profile();return p&&p.state?p.state:{}}
  function saveProfile(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function activePage(){var el=$(".tab-content.active[id^='page-']");return el?el.id.replace(/^page-/,""):"dashboard"}
  function appVisible(){
    var main=$("#main-content"),auth=$("#auth-screen"),profileScreen=$("#profile-screen"),password=$("#password-screen");
    function hidden(el){if(!el)return true;var cs=getComputedStyle(el);return el.hidden||cs.display==="none"||cs.visibility==="hidden"}
    return !!main&&!hidden(main)&&hidden(auth)&&hidden(profileScreen)&&hidden(password);
  }
  function read(){
    try{
      var raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
      if(raw)state=Object.assign(state,raw);
    }catch(e){}
    state.dismissed=state.dismissed||{};
    state.preferences=Array.isArray(state.preferences)?state.preferences:[];
    state.automationDrafts=Array.isArray(state.automationDrafts)?state.automationDrafts:[];
  }
  function write(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}
    try{
      var p=profile();
      if(p){p.state=p.state||{};p.state.brainIntelligence=clone({lastReport:state.lastReport,preferences:state.preferences,automationDrafts:state.automationDrafts});}
    }catch(e){}
  }
  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(write,180);
  }
  function notify(message,type){
    try{if(typeof window.toast==="function"){window.toast(message,type||"info");return}}catch(e){}
    try{if(window.ETHONENotifications&&typeof window.ETHONENotifications.notify==="function")window.ETHONENotifications.notify({title:"Brain",message:message,category:type||"info",source:"Brain Intelligence"})}catch(e){}
  }
  function timeline(input){
    try{if(window.ETHONETimeline&&typeof window.ETHONETimeline.record==="function")return window.ETHONETimeline.record(input)}catch(e){}
    return null;
  }
  function memory(type,title,meta){
    try{if(window.ETHONEMemory&&typeof window.ETHONEMemory.event==="function")window.ETHONEMemory.event(type,title,meta||{})}catch(e){}
  }
  function dateKey(value){
    if(!value)return "";
    try{
      if(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}/.test(value))return value.slice(0,10);
      var d=new Date(value);
      if(isNaN(d.getTime()))return "";
      return d.toLocaleDateString("en-CA");
    }catch(e){return ""}
  }
  function tsFromId(id){
    var n=Number(id);
    if(Number.isFinite(n)&&n>1000000000000)return n;
    return 0;
  }
  function ageDays(ts){
    if(!ts)return 0;
    return Math.floor((Date.now()-ts)/DAY);
  }
  function parseTime(event){
    var raw=String(event.time||event.startTime||event.start||"").trim();
    var m=raw.match(/(\d{1,2}):(\d{2})/);
    if(!m)return null;
    return Number(m[1])*60+Number(m[2]);
  }
  function pageLabel(page){
    var map={dashboard:"Home",files:"Files",notes:"Notes",todos:"Tasks",tasks:"Tasks",habits:"Habits",kanban:"Kanban",calendar:"Calendar",stats:"Analytics",settings:"Settings",connections:"Connections",gaming:"Gaming",github:"GitHub",marketplace:"Marketplace",workspaces:"Workspaces",timeline:"Timeline",ai:"ETHONE AI",goals:"Goals",journal:"Journal",countdown:"Countdowns","valorant-accounts":"Valorant",databases:"Databases"};
    return map[page]||String(page||"dashboard").replace(/-/g," ");
  }
  function workspace(){
    try{
      var active=window.ETHONEWorkspaces&&window.ETHONEWorkspaces.active?window.ETHONEWorkspaces.active():null;
      if(active)return {id:active.id||"",name:active.name||active.id||"Workspace"};
    }catch(e){}
    var p=profile();
    return {id:p&&p.activeWorkspaceId||"default",name:p&&p.activeWorkspaceId||"Default"};
  }
  function usage(){
    var out={scores:{},mode:null,state:null};
    try{
      if(window.ETHONEUsageLearning){
        out.scores=window.ETHONEUsageLearning.scores?window.ETHONEUsageLearning.scores():{};
        out.mode=window.ETHONEUsageLearning.preferredMode?window.ETHONEUsageLearning.preferredMode():null;
        out.state=window.ETHONEUsageLearning.state?window.ETHONEUsageLearning.state():null;
      }
    }catch(e){}
    return out;
  }
  function timelineItems(){
    try{return window.ETHONETimeline&&window.ETHONETimeline.items?window.ETHONETimeline.items().slice(0,180):[]}catch(e){return []}
  }
  function normalizeTask(t){
    var created=Date.parse(t.createdAt||t.created||"")||tsFromId(t.id)||0;
    var due=dateKey(t.due||t.dateDue||t.deadline);
    return {
      id:t.id,
      title:String(t.text||t.title||"Task"),
      done:!!t.done,
      priority:String(t.priority||"normal"),
      due:due,
      tag:t.tag||"",
      createdAt:created,
      doneAt:Date.parse(t.doneAt||"")||0
    };
  }
  function normalizeEvent(e){
    return {
      id:e.id,
      title:String(e.title||e.name||"Event"),
      date:dateKey(e.date||e.start||e.startDate),
      time:e.time||e.startTime||"",
      minutes:parseTime(e)
    };
  }
  function gather(){
    var s=profileState();
    var today=todayKey();
    var tasks=(Array.isArray(s.todos)?s.todos:[]).map(normalizeTask);
    var notes=Array.isArray(s.notes)?s.notes:[];
    var files=Array.isArray(s.items)?s.items:[];
    var events=(Array.isArray(s.events)?s.events:[]).map(normalizeEvent);
    var habits=Array.isArray(s.habits)?s.habits:[];
    var goals=Array.isArray(s.goals)?s.goals:[];
    var tl=timelineItems();
    var u=usage();
    return {
      ts:iso(),
      today:today,
      page:activePage(),
      pageLabel:pageLabel(activePage()),
      workspace:workspace(),
      language:lang(),
      tasks:tasks,
      notes:notes,
      files:files,
      events:events,
      habits:habits,
      goals:goals,
      timeline:tl,
      usage:u,
      connections:s.connections||{},
      settings:{
        theme:localStorage.getItem("ethone:theme")||document.documentElement.dataset.ethoneTheme||"",
        accent:localStorage.getItem("ethone:accent")||getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
        density:document.documentElement.dataset.density||localStorage.getItem("ethone:density")||"",
        reducedMotion:document.documentElement.classList.contains("reduced-motion")||localStorage.getItem("ethone:reducedMotion")==="1"
      }
    };
  }
  function summarizeDay(data){
    var today=data.today;
    var open=data.tasks.filter(function(t){return !t.done});
    var doneToday=data.tasks.filter(function(t){return t.done&&dateKey(t.doneAt)===today});
    var overdue=open.filter(function(t){return t.due&&t.due<today});
    var dueToday=open.filter(function(t){return t.due===today});
    var eventsToday=data.events.filter(function(e){return e.date===today});
    var upcoming=data.events.filter(function(e){return e.date&&e.date>today}).slice(0,5);
    var notesToday=data.notes.filter(function(n){return dateKey(n.updated||n.created||tsFromId(n.id))===today}).map(function(n){return {id:n.id,title:n.title||"Note"}});
    var filesToday=data.files.filter(function(i){return dateKey(i.ts||i.created||tsFromId(i.id))===today}).map(function(i){return {id:i.id,title:i.name||i.title||"File",type:i.type||"file"}});
    var habitsDone=data.habits.filter(function(h){return h.log&&h.log[today]}).map(function(h){return {id:h.id,name:h.name||h.title||"Habit"}});
    var habitsMissed=data.habits.filter(function(h){return !(h.log&&h.log[today])}).map(function(h){return {id:h.id,name:h.name||h.title||"Habit"}});
    return {open:open.length,doneToday:doneToday.length,overdue:overdue,dueToday:dueToday,eventsToday:eventsToday,upcoming:upcoming,notesToday:notesToday,filesToday:filesToday,habitsDone:habitsDone,habitsMissed:habitsMissed};
  }
  function analyzeHabits(data){
    var pageScores=data.usage&&data.usage.state&&data.usage.state.pages||{};
    var widgetScores=data.usage&&data.usage.scores||{};
    var topPages=Object.keys(pageScores).map(function(id){return {id:id,label:pageLabel(id),score:Number(pageScores[id].count||0),last:pageScores[id].last||0}}).sort(function(a,b){return b.score-a.score}).slice(0,5);
    var topWidgets=Object.keys(widgetScores).map(function(id){return {id:id,label:id,score:Number(widgetScores[id]||0)}}).sort(function(a,b){return b.score-a.score}).slice(0,5);
    var byHour={};
    data.timeline.forEach(function(e){
      var d=new Date(e.ts||0);
      if(!isNaN(d.getTime()))byHour[d.getHours()]=(byHour[d.getHours()]||0)+1;
    });
    var activeHours=Object.keys(byHour).map(function(h){return {hour:Number(h),count:byHour[h]}}).sort(function(a,b){return b.count-a.count}).slice(0,3);
    return {mode:data.usage.mode,topPages:topPages,topWidgets:topWidgets,activeHours:activeHours};
  }
  function forgottenTasks(data,summary){
    var today=data.today;
    return data.tasks.filter(function(t){
      if(t.done)return false;
      if(t.due&&t.due<today)return true;
      if(t.priority==="high")return true;
      if(ageDays(t.createdAt)>=7)return true;
      return false;
    }).map(function(t){
      var reason=t.due&&t.due<today?text("En retard","Overdue"):t.priority==="high"?text("Priorite haute","High priority"):text("Ancienne tache","Stale task");
      return {id:t.id,title:t.title,reason:reason,due:t.due,priority:t.priority,ageDays:ageDays(t.createdAt)};
    }).sort(function(a,b){
      if(a.due&&b.due)return a.due.localeCompare(b.due);
      if(a.due)return -1;
      if(b.due)return 1;
      return b.ageDays-a.ageDays;
    }).slice(0,8);
  }
  function detectConflicts(data){
    var groups={};
    data.events.forEach(function(e){if(e.date)(groups[e.date]=groups[e.date]||[]).push(e)});
    var conflicts=[];
    Object.keys(groups).forEach(function(date){
      var list=groups[date].slice().sort(function(a,b){return (a.minutes==null?9999:a.minutes)-(b.minutes==null?9999:b.minutes)});
      var sameTime={};
      list.forEach(function(e){if(e.minutes!=null)(sameTime[e.minutes]=sameTime[e.minutes]||[]).push(e)});
      Object.keys(sameTime).forEach(function(min){
        if(sameTime[min].length>1)conflicts.push({type:"same-time",date:date,time:sameTime[min][0].time,events:sameTime[min].map(function(e){return e.title})});
      });
      for(var i=1;i<list.length;i++){
        if(list[i-1].minutes!=null&&list[i].minutes!=null&&list[i].minutes-list[i-1].minutes<30){
          conflicts.push({type:"tight-buffer",date:date,time:list[i].time,events:[list[i-1].title,list[i].title]});
        }
      }
      if(list.length>=5)conflicts.push({type:"overloaded-day",date:date,events:list.map(function(e){return e.title}).slice(0,5)});
    });
    return conflicts.slice(0,8);
  }
  function buildPlan(data,summary,forgotten,conflicts){
    var blocks=[];
    var h=new Date().getHours();
    blocks.push({time:h<12?"09:00":"Now",title:text("Briefing Brain","Brain briefing"),body:text("Verifier ce qui a change et choisir une priorite.","Review what changed and choose one priority.")});
    if(conflicts.length)blocks.push({time:"Before meetings",title:text("Resoudre les conflits","Resolve conflicts"),body:text("Verifier le calendrier avant de commencer le focus.","Check calendar conflicts before focus.")});
    if(summary.overdue.length)blocks.push({time:"Focus 1",title:summary.overdue[0].title,body:text("Tache en retard a traiter en premier.","Overdue task to handle first.")});
    else if(summary.dueToday.length)blocks.push({time:"Focus 1",title:summary.dueToday[0].title,body:text("A faire aujourd'hui.","Due today.")});
    else if(forgotten.length)blocks.push({time:"Focus 1",title:forgotten[0].title,body:forgotten[0].reason});
    if(summary.eventsToday.length)blocks.push({time:"Calendar",title:summary.eventsToday[0].title,body:text("Preparer l'evenement du jour.","Prepare today's event.")});
    if(summary.habitsMissed.length)blocks.push({time:"Routine",title:summary.habitsMissed[0].name||"Habit",body:text("Habitude encore ouverte aujourd'hui.","Habit still open today.")});
    return blocks.slice(0,5);
  }
  function preferenceCandidates(data,habits){
    var out=[];
    if(data.language)out.push({id:"language",title:text("Langue preferee","Preferred language"),value:data.language,confidence:.95});
    if(data.settings.accent)out.push({id:"accent",title:"ETHONE accent",value:data.settings.accent,confidence:.85});
    if(data.settings.density)out.push({id:"density",title:text("Densite UI","UI density"),value:data.settings.density,confidence:.8});
    if(habits.mode)out.push({id:"mode",title:text("Mode d'utilisation","Usage mode"),value:habits.mode,confidence:.72});
    if(habits.topPages[0])out.push({id:"top-page",title:text("Page la plus utilisee","Most used page"),value:habits.topPages[0].label,confidence:.7});
    if(habits.topWidgets[0])out.push({id:"top-widget",title:text("Widget prioritaire","Priority widget"),value:habits.topWidgets[0].label,confidence:.68});
    return out;
  }
  function mergePreferences(candidates){
    var existing=state.preferences||[];
    candidates.forEach(function(c){
      var prev=existing.find(function(p){return p.id===c.id});
      if(prev){
        prev.value=c.value;
        prev.confidence=c.confidence;
        prev.updatedAt=iso();
      }else{
        existing.push(Object.assign({status:"candidate",createdAt:iso(),updatedAt:iso()},c));
      }
    });
    state.preferences=existing.slice(0,24);
  }
  function automationTemplates(data,summary,forgotten,conflicts,habits){
    var out=[
      {id:"daily-briefing",title:text("Briefing automatique","Automatic briefing"),body:text("Chaque matin, Brain prepare les taches, evenements et recommandations.","Every morning, Brain prepares tasks, events and recommendations."),blocks:["trigger.daily.time","action.ai.analyze","action.notification.send","action.timeline.record"]},
      {id:"note-to-task",title:text("Notes vers actions","Notes to actions"),body:text("Quand une note est creee, Brain propose taches et rappels.","When a note is created, Brain suggests tasks and reminders."),blocks:["trigger.note.created","action.ai.analyze","action.task.create","action.notification.send"]},
      {id:"pomodoro-review",title:text("Analyse apres focus","Post-focus analysis"),body:text("Apres un Pomodoro, Brain resume la session et propose la suite.","After a Pomodoro, Brain summarizes the session and suggests the next step."),blocks:["trigger.pomodoro.completed","action.ai.analyze","action.timeline.record","action.notification.send"]}
    ];
    if(forgotten.length)out.unshift({id:"forgotten-task-rescue",title:text("Rappel taches oubliees","Forgotten task rescue"),body:text("Brain signale les taches anciennes, hautes priorites ou en retard.","Brain flags stale, high-priority or overdue tasks."),blocks:["trigger.daily.time","action.ai.analyze","action.notification.send"]});
    if(conflicts.length)out.unshift({id:"calendar-conflict-watch",title:text("Detection conflits calendrier","Calendar conflict watch"),body:text("Brain surveille les journees chargees et les horaires serres.","Brain watches overloaded days and tight buffers."),blocks:["trigger.daily.time","action.ai.analyze","action.notification.send"]});
    if(habits.mode==="gaming")out.push({id:"gaming-session-brief",title:text("Briefing gaming","Gaming session briefing"),body:text("Preparer Discord, Spotify, Steam/Valorant et cacher les distractions.","Prepare Discord, Spotify, Steam/Valorant and hide distractions."),blocks:["trigger.manual","action.ai.analyze","action.notification.send"]});
    return out.slice(0,6);
  }
  function recommendations(data,summary,forgotten,conflicts,plan,habits,prefs,automations){
    var out=[];
    if(summary.overdue.length)out.push({id:"overdue",severity:"high",title:text("Taches oubliees detectees","Forgotten tasks detected"),body:summary.overdue.length+" "+text("tache(s) en retard demandent une decision.","overdue task(s) need a decision."),action:"plan"});
    if(conflicts.length)out.push({id:"conflicts",severity:"high",title:text("Conflits ou planning serre","Conflicts or tight schedule"),body:text("Brain a detecte des evenements au meme horaire ou sans buffer.","Brain detected same-time events or missing buffers."),action:"detect-conflicts"});
    if(plan.length)out.push({id:"plan",severity:"medium",title:text("Planning propose","Suggested plan"),body:plan[0].title+" - "+plan[0].body,action:"plan"});
    if(summary.habitsMissed.length)out.push({id:"habits",severity:"low",title:text("Routine a terminer","Routine to finish"),body:summary.habitsMissed.length+" "+text("habitude(s) encore ouvertes aujourd'hui.","habit(s) still open today."),action:"analyze"});
    if(prefs.some(function(p){return p.status==="candidate"}))out.push({id:"memory",severity:"low",title:text("Preferences a memoriser","Preferences to remember"),body:text("Brain a trouve des preferences visibles a confirmer.","Brain found visible preference candidates to confirm."),action:"memory"});
    if(automations.length)out.push({id:"automation",severity:"medium",title:text("Automatisation suggeree","Suggested automation"),body:automations[0].title+": "+automations[0].body,action:"automation:"+automations[0].id});
    return out.slice(0,8);
  }
  function buildReport(reason){
    var data=gather();
    var summary=summarizeDay(data);
    var habits=analyzeHabits(data);
    var forgotten=forgottenTasks(data,summary);
    var conflicts=detectConflicts(data);
    var plan=buildPlan(data,summary,forgotten,conflicts);
    var prefs=preferenceCandidates(data,habits);
    mergePreferences(prefs);
    var automations=automationTemplates(data,summary,forgotten,conflicts,habits);
    state.automationDrafts=automations;
    var report={
      version:1,
      reason:reason||"manual",
      generatedAt:iso(),
      page:data.page,
      pageLabel:data.pageLabel,
      workspace:data.workspace,
      summary:summary,
      habits:habits,
      forgottenTasks:forgotten,
      conflicts:conflicts,
      plan:plan,
      preferences:state.preferences.slice(0,24),
      automations:automations,
      recommendations:recommendations(data,summary,forgotten,conflicts,plan,habits,state.preferences,automations)
    };
    state.lastRun=Date.now();
    state.lastReport=report;
    scheduleSave();
    return report;
  }
  function run(reason){
    if(!appVisible()&&reason!=="manual")return state.lastReport||buildReport(reason);
    var report=buildReport(reason);
    try{window.dispatchEvent(new CustomEvent("ethone:brain-intelligence",{detail:{report:clone(report)}}))}catch(e){}
    timeline({dedupe:"brain-intelligence-"+todayKey()+"-"+Math.floor(Date.now()/600000),title:"Brain analyzed ETHONE",body:report.recommendations[0]&&report.recommendations[0].title||"Context updated",category:"ai",source:"brain-intelligence",meta:{recommendations:report.recommendations.length,forgotten:report.forgottenTasks.length,conflicts:report.conflicts.length}});
    memory("brain_intelligence","Brain intelligence updated",{recommendations:report.recommendations.length,page:report.page});
    return report;
  }
  function scheduleRun(reason,delay){
    clearTimeout(runTimer);
    runTimer=setTimeout(function(){run(reason||"scheduled")},delay||450);
  }
  function promptFor(action){
    var report=state.lastReport||run("prompt");
    var data={
      summary:{open:report.summary.open,doneToday:report.summary.doneToday,overdue:report.summary.overdue.length,dueToday:report.summary.dueToday.length,eventsToday:report.summary.eventsToday.length},
      forgottenTasks:report.forgottenTasks,
      conflicts:report.conflicts,
      plan:report.plan,
      recommendations:report.recommendations,
      habits:report.habits,
      preferences:report.preferences.filter(function(p){return p.status==="accepted"})
    };
    var intro={
      briefing:"Create a concise ETHONE daily briefing. Answer: what should I do now, what changed today, what Brain recommends.",
      plan:"Create a practical schedule from this ETHONE intelligence report. Include time blocks, priority order and risks.",
      "detect-conflicts":"Analyze the calendar conflicts and suggest safe fixes without modifying events automatically.",
      memory:"Review preference candidates. Suggest what should be remembered and ask for confirmation.",
      automations:"Recommend safe ETHONE automations and explain why each matters.",
      analyze:"Analyze this ETHONE intelligence report and explain the important signals."
    }[action]||"Analyze this ETHONE intelligence report and recommend the next useful action.";
    return intro+"\n\nETHONE Brain Intelligence Report:\n"+JSON.stringify(data,null,2);
  }
  function openAsk(action){
    var report=state.lastReport||run("ask");
    var ctx={page:report.page,kind:"brain-intelligence",label:"Brain Intelligence",text:JSON.stringify(report).slice(0,2600),facts:{openTodos:report.summary.open,events:report.summary.eventsToday.length,notes:report.summary.notesToday.length||0,files:report.summary.filesToday.length||0}};
    var prompt=promptFor(action||"analyze");
    if(window.ETHONEAIEverywhere&&typeof window.ETHONEAIEverywhere.openCopilot==="function"){
      window.ETHONEAIEverywhere.openCopilot(ctx,prompt);
      return true;
    }
    if(window.ETHONEBrainOS&&typeof window.ETHONEBrainOS.open==="function")window.ETHONEBrainOS.open("suggestions");
    return false;
  }
  function acceptPreference(id){
    var pref=state.preferences.find(function(p){return p.id===id});
    if(!pref)return false;
    pref.status="accepted";
    pref.acceptedAt=iso();
    scheduleSave();
    memory("brain_preference","Preference remembered: "+pref.title,{id:pref.id,value:pref.value});
    timeline({title:"Brain remembered preference",body:pref.title+": "+pref.value,category:"ai",source:"brain-intelligence",meta:{id:pref.id}});
    notify(text("Preference memorisee","Preference remembered"),"success");
    return true;
  }
  function forgetPreference(id){
    state.preferences=state.preferences.filter(function(p){return p.id!==id});
    scheduleSave();
    notify(text("Preference supprimee","Preference removed"),"info");
    return true;
  }
  function createAutomation(templateId){
    if(!Array.isArray(state.automationDrafts)||!state.automationDrafts.length)run("automation");
    var template=(state.automationDrafts||[]).find(function(t){return t.id===templateId});
    if(!template)return false;
    var p=profile();if(!p)return false;
    p.state=p.state||{};
    p.state.automationRules=Array.isArray(p.state.automationRules)?p.state.automationRules:[];
    if(p.state.automationRules.some(function(r){return r.brainTemplateId===templateId})){
      notify(text("Automation deja creee","Automation already created"),"info");
      return true;
    }
    var nowIso=iso();
    var rule={
      id:"brain-auto-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),
      brainTemplateId:templateId,
      name:template.title,
      enabled:false,
      blocks:template.blocks.map(function(type){
        var isDaily=type==="trigger.daily.time";
        return {id:"block-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,5),type:type,label:type,config:isDaily?{time:"09:00"}:type==="action.ai.analyze"?{prompt:template.body}:type==="action.notification.send"?{message:template.title}:{}};
      }),
      createdAt:nowIso,
      updatedAt:nowIso,
      lastFired:null
    };
    p.state.automationRules.unshift(rule);
    saveProfile();
    timeline({title:"Brain created automation draft",body:template.title,category:"ai",source:"brain-intelligence",meta:{templateId:templateId,ruleId:rule.id}});
    notify(text("Automation ajoutee en brouillon","Automation added as draft"),"success");
    try{if(typeof window.renderAutomationSettings==="function")window.renderAutomationSettings()}catch(e){}
    return true;
  }
  function dismiss(id){
    state.dismissed[id]=Date.now();
    scheduleSave();
  }
  function bind(){
    ["ethone:page-ready","ethone:timeline","ethone:memory-event","ethone:usage-learning","ethone:workspace-change"].forEach(function(name){
      window.addEventListener(name,function(){scheduleRun(name,500)});
    });
    document.addEventListener("visibilitychange",function(){if(!document.hidden)scheduleRun("visible",650)});
    window.addEventListener("storage",function(e){if(e.key===STORAGE_KEY)read()});
    setInterval(function(){if(!document.hidden)scheduleRun("interval",1000)},300000);
  }
  function registerActions(){
    try{
      var actions=window.ACTION_REGISTRY||window.ETHONEActions;
      if(!actions||typeof actions.register!=="function")return false;
      actions.register("brain.briefing",{label:"Brain briefing",handler:function(){openAsk("briefing")}});
      actions.register("brain.plan",{label:"Brain plan",handler:function(){openAsk("plan")}});
      actions.register("brain.conflicts",{label:"Brain conflicts",handler:function(){openAsk("detect-conflicts")}});
      actions.register("brain.automations",{label:"Brain automations",handler:function(){openAsk("automations")}});
      actions.register("brain.analyze",{label:"Brain analyze",handler:function(){openAsk("analyze")}});
      return true;
    }catch(e){return false}
  }
  function boot(){
    read();
    bind();
    var registered=registerActions();
    if(!registered)window.addEventListener("DOMContentLoaded",function(){setTimeout(registerActions,350)},{once:true});
    setTimeout(function(){scheduleRun("boot",700)},900);
  }

  window.ETHONEBrainIntelligence={
    run:run,
    schedule:scheduleRun,
    report:function(){return clone(state.lastReport||run("report"))},
    suggestions:function(){var r=state.lastReport||run("suggestions");return clone(r.recommendations||[])},
    prompt:promptFor,
    ask:openAsk,
    acceptPreference:acceptPreference,
    forgetPreference:forgetPreference,
    createAutomation:createAutomation,
    dismiss:dismiss,
    state:function(){return clone(state)}
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
