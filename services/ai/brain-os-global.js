/* ETHONE Brain OS global intelligence layer.
   Keeps Brain available everywhere without turning it into another page. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE||window.__ethoneBrainOSGlobal)return;
  window.__ethoneBrainOSGlobal=true;

  var $=function(sel,root){return (root||document).querySelector(sel)};
  var $$=function(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))};
  var state={open:false,tab:"suggestions",query:"",ctx:null,started:false,renderTimer:0,searchTimer:0,selectionTimer:0,lastRender:0,lastPage:"",lastSelection:""};

  function lang(){return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}
  function fr(){return lang()==="fr"}
  function text(frText,enText){return fr()?frText:enText}
  function escapeHTML(value){return String(value==null?"":value).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function profileState(){var p=profile();return p&&p.state?p.state:{}}
  function osSnapshot(){try{return window.ETHONEOSContext&&typeof window.ETHONEOSContext.snapshot==="function"?window.ETHONEOSContext.snapshot():null}catch(e){return null}}
  function activePage(){var os=osSnapshot();if(os&&os.page&&os.page.id)return os.page.id;var el=$(".tab-content.active[id^='page-']");return el?el.id.replace(/^page-/,""):"dashboard"}
  function pageLabel(page){
    var map={dashboard:"Home",files:"Files",notes:"Notes",todos:"Tasks",habits:"Habits",kanban:"Kanban",calendar:"Calendar",stats:"Analytics",settings:"Settings",connections:"Connections",gaming:"Gaming",github:"GitHub",marketplace:"Marketplace",store:"Store",workspaces:"Workspaces",timeline:"Timeline",ai:"AI Core",goals:"Goals",journal:"Journal",countdown:"Countdowns","valorant-accounts":"Valorant",databases:"Databases"};
    return map[page]||String(page||"dashboard").replace(/-/g," ");
  }
  function facts(){
    var os=osSnapshot();
    if(os&&os.facts){
      return {
        openTodos:os.facts.tasks&&os.facts.tasks.open||0,
        doneTodos:os.facts.tasks&&os.facts.tasks.done||0,
        notes:os.facts.notes&&os.facts.notes.total||0,
        files:os.facts.files&&os.facts.files.total||0,
        habits:os.facts.habits&&os.facts.habits.total||0,
        events:os.facts.calendar&&os.facts.calendar.total||0
      };
    }
    var s=profileState();
    var todos=Array.isArray(s.todos)?s.todos:[];
    var notes=Array.isArray(s.notes)?s.notes:[];
    var items=Array.isArray(s.items)?s.items:[];
    var habits=Array.isArray(s.habits)?s.habits:[];
    var events=Array.isArray(s.events)?s.events:[];
    return {
      openTodos:todos.filter(function(t){return !t.done}).length,
      doneTodos:todos.filter(function(t){return !!t.done}).length,
      notes:notes.length,
      files:items.length,
      habits:habits.length,
      events:events.length
    };
  }
  function workspaceLabel(){
    var os=osSnapshot();
    if(os&&os.workspace&&os.workspace.name)return os.workspace.name;
    try{
      var active=window.ETHONEWorkspaces&&window.ETHONEWorkspaces.active?window.ETHONEWorkspaces.active():null;
      if(active&&active.name)return active.name;
    }catch(e){}
    var p=profile();
    return p&&p.activeWorkspaceId?p.activeWorkspaceId:"Default";
  }
  function currentContext(){
    var page=activePage();
    var selected="";
    try{selected=String(window.getSelection&&window.getSelection()||"").trim().slice(0,1200)}catch(e){}
    var s=profileState();
    var textValue="";
    if(page==="notes"){
      textValue=($("#note-content,#main-note,.note-area")||{}).value||"";
    }else if(page==="todos"){
      textValue=(s.todos||[]).map(function(t){return(t.done?"[x] ":"[ ] ")+(t.text||"")}).join("\n");
    }else if(page==="files"){
      textValue=(s.items||[]).map(function(i){return(i.type||"item")+": "+(i.name||i.title||i.url||"Untitled")}).join("\n");
    }else if(page==="calendar"){
      textValue=(s.events||[]).map(function(e){return(e.date||"")+" "+(e.time||"")+" "+(e.title||e.name||"Event")}).join("\n");
    }
    var ctx={page:page,pageLabel:pageLabel(page),workspace:workspaceLabel(),selection:selected,text:(selected||textValue||"").slice(0,2200),facts:facts(),ts:new Date().toISOString()};
    state.ctx=ctx;
    return ctx;
  }
  function isAppVisible(){
    var main=$("#main-content"),auth=$("#auth-screen"),profileScreen=$("#profile-screen"),password=$("#password-screen");
    function hidden(el){if(!el)return true;var cs=getComputedStyle(el);return el.hidden||cs.display==="none"||cs.visibility==="hidden"}
    return !!main&&!hidden(main)&&hidden(auth)&&hidden(profileScreen)&&hidden(password);
  }
  function recordTimeline(input){
    try{
      if(window.ETHONETimeline&&typeof window.ETHONETimeline.record==="function")return window.ETHONETimeline.record(input);
    }catch(e){}
    return null;
  }
  function recordMemory(type,title,meta){
    try{
      if(window.ETHONEMemory&&typeof window.ETHONEMemory.event==="function")window.ETHONEMemory.event(type,title,meta||{});
    }catch(e){}
  }
  function storeSignal(type,payload){
    var p=profile();if(!p||!p.state)return;
    p.state.brainSignals=Array.isArray(p.state.brainSignals)?p.state.brainSignals:[];
    p.state.brainSignals.unshift(Object.assign({type:type,ts:new Date().toISOString(),page:activePage(),workspace:workspaceLabel()},payload||{}));
    p.state.brainSignals=p.state.brainSignals.slice(0,80);
    try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
  }
  function intelligenceReport(){
    try{
      if(window.ETHONEBrainIntelligence&&typeof window.ETHONEBrainIntelligence.report==="function")return window.ETHONEBrainIntelligence.report();
    }catch(e){}
    return null;
  }
  function suggestions(ctx){
    ctx=ctx||currentContext();
    var f=ctx.facts;
    var out=[];
    var report=intelligenceReport();
    if(report&&Array.isArray(report.recommendations)){
      report.recommendations.forEach(function(r){
        out.push({id:"brain-"+r.id,title:r.title,body:r.body,action:r.action||"analyze",severity:r.severity});
      });
    }
    if(f.openTodos>0)out.push({id:"plan",title:text("Planifier maintenant","Plan now"),body:text("Brain voit "+f.openTodos+" tache(s) ouvertes. Il peut proposer l'ordre le plus calme.","Brain sees "+f.openTodos+" open task(s). It can suggest the calmest order."),action:"plan"});
    if(ctx.page==="notes"&&ctx.text.length>80)out.push({id:"summarize",title:text("Resumer cette note","Summarize this note"),body:text("Transformer la note en resume, decisions et prochaines actions.","Turn the note into a summary, decisions and next actions."),action:"summarize"});
    if(ctx.page==="files"&&f.files>0)out.push({id:"organize",title:text("Organiser les fichiers","Organize files"),body:text("Brain peut proposer tags, dossiers et liens avec tes notes.","Brain can suggest tags, folders and links to notes."),action:"organize"});
    if(ctx.page==="calendar"&&f.events>0)out.push({id:"schedule",title:text("Optimiser le planning","Optimize schedule"),body:text("Detecter conflits, buffers et meilleurs blocs de focus.","Detect conflicts, buffers and better focus blocks."),action:"plan"});
    if(f.notes>3)out.push({id:"memory",title:text("Mettre a jour la memoire","Update memory"),body:text("Brain peut identifier les preferences utiles a retenir, avec validation.","Brain can identify useful preferences to remember, with validation."),action:"memory"});
    out.push({id:"search",title:text("Rechercher dans ETHONE","Search ETHONE"),body:text("Brain Search retrouve pages, notes, taches, fichiers et activite.","Brain Search finds pages, notes, tasks, files and activity."),action:"search"});
    var seen={};
    return out.filter(function(item){
      var key=item.action+"-"+item.id;
      if(seen[key])return false;
      seen[key]=true;
      return true;
    }).slice(0,6);
  }
  function actionList(ctx){
    ctx=ctx||currentContext();
    var base=[
      ["summarize",text("Resumer","Summarize"),text("Resume le contexte actuel","Summarize the current context")],
      ["organize",text("Organiser","Organize"),text("Propose une structure claire","Suggest a clear structure")],
      ["create",text("Creer","Create"),text("Propose taches, notes ou evenements","Propose tasks, notes or events")],
      ["plan",text("Planifier","Plan"),text("Construit la prochaine session","Build the next session")],
      ["analyze",text("Analyser","Analyze"),text("Explique les signaux importants","Explain important signals")],
      ["search",text("Rechercher","Search"),text("Cherche dans ETHONE","Search across ETHONE")]
    ];
    try{
      if(window.ETHONEPluginSDK&&typeof window.ETHONEPluginSDK.brainCommands==="function"){
        window.ETHONEPluginSDK.brainCommands().forEach(function(command){
          base.push([command.id,command.label,command.description||text("Commande Brain ajoutee par un plugin","Brain command added by a plugin")]);
        });
      }
    }catch(e){}
    return base;
  }
  function promptFor(action,ctx){
    ctx=ctx||currentContext();
    try{
      if(window.ETHONEBrainIntelligence&&typeof window.ETHONEBrainIntelligence.prompt==="function"){
        if(action&&action.indexOf("automation:")===0)return window.ETHONEBrainIntelligence.prompt("automations");
        if(/^(briefing|detect-conflicts|automations|memory|plan|analyze)$/.test(action))return window.ETHONEBrainIntelligence.prompt(action);
      }
    }catch(e){}
    var data="Page: "+ctx.page+"\nWorkspace: "+ctx.workspace+"\nFacts: "+JSON.stringify(ctx.facts)+"\nContext: "+(ctx.text||"");
    var prompts={
      summarize:"Summarize this ETHONE context. Extract decisions, important details and next actions.\n"+data,
      organize:"Organize this ETHONE context. Suggest structure, tags, grouping and cleanup. Ask before changing anything.\n"+data,
      create:"Suggest useful tasks, notes or events from this context. Do not create anything without confirmation.\n"+data,
      plan:"Plan the next focused session from this context. Include priority, time blocks and risks.\n"+data,
      analyze:"Analyze this ETHONE context and explain what matters, what changed and what Brain recommends.\n"+data,
      search:"Use Brain Search intent. Tell me what to search for and where it may be inside ETHONE.\n"+data,
      memory:"Review this context and suggest only explicit memories the user may want to approve.\n"+data
    };
    return prompts[action]||prompts.analyze;
  }
  function openCopilot(action,ctx){
    ctx=ctx||currentContext();
    if(action&&/^plugin\.[a-z0-9_-]+\.brain\./.test(action)){
      try{
        if(window.ETHONEPluginSDK&&typeof window.ETHONEPluginSDK.runBrainCommand==="function"){
          window.ETHONEPluginSDK.runBrainCommand(action,{context:ctx});
          return;
        }
      }catch(e){}
    }
    if(action&&action.indexOf("automation:")===0){
      var templateId=action.slice("automation:".length);
      var created=false;
      try{
        created=!!(window.ETHONEBrainIntelligence&&typeof window.ETHONEBrainIntelligence.createAutomation==="function"&&window.ETHONEBrainIntelligence.createAutomation(templateId));
      }catch(e){created=false}
      storeSignal("brain_automation",{action:action,template:templateId,created:created});
      if(created){
        recordTimeline({title:"Brain automation draft created",body:templateId,category:"ai",source:"brain-os",meta:{template:templateId}});
        render();
        return;
      }
    }
    var prompt=promptFor(action,ctx);
    storeSignal("brain_action",{action:action,label:ctx.pageLabel});
    recordTimeline({title:"Brain action: "+action,body:ctx.pageLabel,category:"ai",source:"brain-os",meta:{page:ctx.page,action:action}});
    if(window.ETHONEAIEverywhere&&typeof window.ETHONEAIEverywhere.openCopilot==="function"){
      window.ETHONEAIEverywhere.openCopilot(ctx,prompt);
      return;
    }
    openPanel("actions");
    var input=$("#brain-os-query");
    if(input)input.value=prompt;
  }
  function buildSearchIndex(){
    var s=profileState();
    var list=[
      {type:"page",label:"Home",body:"dashboard brain overview",page:"dashboard"},
      {type:"page",label:"Notes",body:"notes writing summaries",page:"notes"},
      {type:"page",label:"Tasks",body:"todos tasks plan priority",page:"todos"},
      {type:"page",label:"Files",body:"files links imports",page:"files"},
      {type:"page",label:"Calendar",body:"calendar planning events",page:"calendar"},
      {type:"page",label:"Settings",body:"preferences theme integrations",page:"settings"},
      {type:"page",label:"AI Core",body:"providers models memory prompts",page:"ai"}
    ];
    (s.todos||[]).forEach(function(t){list.push({type:"task",label:t.text||"Task",body:t.done?"done":"open",page:"todos",id:t.id})});
    (s.notes||[]).forEach(function(n){list.push({type:"note",label:n.title||"Untitled note",body:n.content||"",page:"notes",id:n.id})});
    (s.items||[]).forEach(function(i){list.push({type:"file",label:i.name||i.title||i.url||"Item",body:(i.type||"")+" "+(i.url||""),page:"files",id:i.id})});
    try{
      var tl=window.ETHONETimeline&&window.ETHONETimeline.items?window.ETHONETimeline.items():[];
      tl.slice(0,80).forEach(function(e){list.push({type:"activity",label:e.title,body:(e.body||"")+" "+e.category,page:"timeline",id:e.id})});
    }catch(e){}
    return list;
  }
  function search(query){
    var q=String(query||"").trim().toLowerCase();
    if(!q)return [];
    return buildSearchIndex().map(function(item){
      var hay=(item.label+" "+item.body+" "+item.type).toLowerCase();
      var score=hay.indexOf(q)>-1?100:0;
      q.split(/\s+/).forEach(function(part){if(part&&hay.indexOf(part)>-1)score+=20});
      return Object.assign({score:score},item);
    }).filter(function(item){return item.score>0}).sort(function(a,b){return b.score-a.score}).slice(0,12);
  }
  function ensureShell(){
    if($("#brain-os-orb"))return;
    var orb=document.createElement("button");
    orb.id="brain-os-orb";
    orb.className="brain-os-orb";
    orb.type="button";
    orb.setAttribute("aria-label","Open Brain OS");
    orb.innerHTML='<span class="brain-os-orb-pulse"></span><strong>Brain</strong>';
    document.body.appendChild(orb);

    var panel=document.createElement("aside");
    panel.id="brain-os-panel";
    panel.className="brain-os-panel";
    panel.setAttribute("aria-label","ETHONE Brain OS");
    panel.innerHTML=
      '<div class="brain-os-head">'+
        '<div><span>Brain OS</span><strong>'+text("Intelligence globale","Global intelligence")+'</strong><em id="brain-os-state">Observing ETHONE</em></div>'+
        '<button type="button" data-brain-close aria-label="Close">x</button>'+
      '</div>'+
      '<div class="brain-os-tabs" role="tablist">'+
        tabButton("briefing",text("Briefing","Briefing"))+
        tabButton("suggestions",text("Suggestions","Suggestions"))+
        tabButton("actions",text("Actions","Actions"))+
        tabButton("context",text("Contexte","Context"))+
        tabButton("search",text("Search","Search"))+
        tabButton("memory",text("Memoire","Memory"))+
        tabButton("timeline",text("Timeline","Timeline"))+
      '</div>'+
      '<div class="brain-os-body" id="brain-os-body"></div>';
    document.body.appendChild(panel);
  }
  function tabButton(id,label){return '<button type="button" data-brain-tab="'+id+'" role="tab">'+escapeHTML(label)+'</button>'}
  function openPanel(tab){
    if(!isAppVisible())return;
    ensureShell();
    state.open=true;
    if(tab)state.tab=tab;
    $("#brain-os-panel").classList.add("open");
    render();
  }
  function closePanel(){
    state.open=false;
    var panel=$("#brain-os-panel");
    if(panel)panel.classList.remove("open");
  }
  function render(){
    if(activePage()==="ai"&&!state.open)return;
    var now=Date.now();
    if(!state.open&&now-state.lastRender<220)return;
    state.lastRender=now;
    if(!isAppVisible())return;
    ensureShell();
    var ctx=currentContext();
    var stateEl=$("#brain-os-state");
    if(stateEl)stateEl.textContent=ctx.pageLabel+" / "+ctx.workspace;
    $$("#brain-os-panel [data-brain-tab]").forEach(function(btn){btn.classList.toggle("active",btn.dataset.brainTab===state.tab)});
    var body=$("#brain-os-body");
    if(!body)return;
    if(state.tab==="briefing")body.innerHTML=renderBriefing(ctx);
    else if(state.tab==="suggestions")body.innerHTML=renderSuggestions(ctx);
    else if(state.tab==="actions")body.innerHTML=renderActions(ctx);
    else if(state.tab==="context")body.innerHTML=renderContext(ctx);
    else if(state.tab==="search")body.innerHTML=renderSearch();
    else if(state.tab==="memory")body.innerHTML=renderMemory();
    else body.innerHTML=renderTimeline();
    renderPageStrip(ctx);
  }
  function renderBriefing(ctx){
    var report=intelligenceReport();
    if(!report){
      return '<div class="brain-os-empty">'+text("Brain prepare le briefing intelligent.","Brain is preparing the intelligent briefing.")+'</div>';
    }
    var summary=report.summary||{};
    var metrics=[
      [text("Taches ouvertes","Open tasks"),summary.open||0],
      [text("Faites aujourd'hui","Done today"),summary.doneToday||0],
      [text("En retard","Overdue"),(summary.overdue||[]).length],
      [text("Evenements","Events"),(summary.eventsToday||[]).length]
    ];
    var plan=(report.plan||[]).slice(0,5).map(function(item){
      return '<div class="brain-os-plan-item"><span>'+escapeHTML(item.time||"")+'</span><strong>'+escapeHTML(item.title||"")+'</strong><p>'+escapeHTML(item.body||"")+'</p></div>';
    }).join("");
    var forgotten=(report.forgottenTasks||[]).slice(0,4).map(function(task){
      return '<div class="brain-os-row"><strong>'+escapeHTML(task.title)+'</strong><span>'+escapeHTML(task.reason||"")+'</span></div>';
    }).join("");
    var conflicts=(report.conflicts||[]).slice(0,3).map(function(conflict){
      return '<div class="brain-os-row"><strong>'+escapeHTML(conflict.date||"")+'</strong><span>'+escapeHTML((conflict.events||[]).join(", "))+'</span></div>';
    }).join("");
    var automations=(report.automations||[]).slice(0,3).map(function(item){
      return '<article class="brain-os-automation"><div><strong>'+escapeHTML(item.title)+'</strong><p>'+escapeHTML(item.body)+'</p></div><button type="button" class="brain-os-action" data-brain-action="automation:'+escapeHTML(item.id)+'">'+text("Creer brouillon","Create draft")+'</button></article>';
    }).join("");
    var prefs=(report.preferences||[]).filter(function(pref){return pref.status==="candidate"}).slice(0,3).map(function(pref){
      return '<div class="brain-os-preference"><div><strong>'+escapeHTML(pref.title)+'</strong><span>'+escapeHTML(String(pref.value||""))+'</span></div><div class="brain-os-pref-actions"><button type="button" data-brain-pref-accept="'+escapeHTML(pref.id)+'">'+text("Memoriser","Remember")+'</button><button type="button" data-brain-pref-forget="'+escapeHTML(pref.id)+'">'+text("Ignorer","Ignore")+'</button></div></div>';
    }).join("");
    return '<section class="brain-os-briefing">'+
      '<div class="brain-os-briefing-head"><span>Brain Intelligence</span><strong>'+text("Briefing du jour","Today briefing")+'</strong><p>'+escapeHTML((report.recommendations&&report.recommendations[0]&&report.recommendations[0].body)||text("Brain analyse tes signaux locaux pour proposer la prochaine action utile.","Brain analyzes local signals to suggest the next useful action."))+'</p></div>'+
      '<div class="brain-os-metrics">'+metrics.map(function(m){return '<div class="brain-os-metric"><span>'+escapeHTML(m[0])+'</span><strong>'+escapeHTML(m[1])+'</strong></div>'}).join("")+'</div>'+
      '<div class="brain-os-section"><div class="brain-os-section-title">'+text("Planning propose","Suggested plan")+'</div><div class="brain-os-plan">'+(plan||'<div class="brain-os-empty">'+text("Aucun planning prioritaire pour le moment.","No priority plan yet.")+'</div>')+'</div></div>'+
      ((forgotten||conflicts)?'<div class="brain-os-split">'+
        '<div class="brain-os-list"><div class="brain-os-section-title">'+text("Taches a recuperer","Tasks to recover")+'</div>'+(forgotten||'<div class="brain-os-empty">'+text("Aucune tache oubliee detectee.","No forgotten tasks detected.")+'</div>')+'</div>'+
        '<div class="brain-os-list"><div class="brain-os-section-title">'+text("Conflits","Conflicts")+'</div>'+(conflicts||'<div class="brain-os-empty">'+text("Aucun conflit detecte.","No conflict detected.")+'</div>')+'</div>'+
      '</div>':"")+
      '<div class="brain-os-section"><div class="brain-os-section-title">'+text("Automatisations suggerees","Suggested automations")+'</div>'+(automations||'<div class="brain-os-empty">'+text("Brain proposera des automatisations apres plus d activite.","Brain will suggest automations after more activity.")+'</div>')+'</div>'+
      '<div class="brain-os-section"><div class="brain-os-section-title">'+text("Memoire a confirmer","Memory to confirm")+'</div>'+(prefs||'<div class="brain-os-empty">'+text("Aucune preference en attente.","No pending preference.")+'</div>')+'</div>'+
    '</section>';
  }
  function renderSuggestions(ctx){
    return suggestions(ctx).map(function(s){
      return '<article class="brain-os-card"><span>'+escapeHTML(s.id)+'</span><strong>'+escapeHTML(s.title)+'</strong><p>'+escapeHTML(s.body)+'</p><button type="button" class="brain-os-action primary" data-brain-action="'+escapeHTML(s.action)+'">'+text("Demander a Brain","Ask Brain")+'</button></article>';
    }).join("")||'<div class="brain-os-empty">'+text("Brain observe ETHONE.","Brain is observing ETHONE.")+'</div>';
  }
  function renderActions(ctx){
    return '<div class="brain-os-action-grid">'+actionList(ctx).map(function(a){
      return '<button type="button" class="brain-os-action-card" data-brain-action="'+a[0]+'"><strong>'+escapeHTML(a[1])+'</strong><span>'+escapeHTML(a[2])+'</span></button>';
    }).join("")+'</div>';
  }
  function renderContext(ctx){
    var selection=ctx.selection?'<div class="brain-os-context-line"><span>Selection</span><strong>'+escapeHTML(ctx.selection.slice(0,140))+'</strong></div>':"";
    return '<section class="brain-os-context">'+
      '<div class="brain-os-context-line"><span>Page</span><strong>'+escapeHTML(ctx.pageLabel)+'</strong></div>'+
      '<div class="brain-os-context-line"><span>Workspace</span><strong>'+escapeHTML(ctx.workspace)+'</strong></div>'+
      '<div class="brain-os-context-line"><span>Tasks</span><strong>'+ctx.facts.openTodos+' open / '+ctx.facts.doneTodos+' done</strong></div>'+
      '<div class="brain-os-context-line"><span>Notes</span><strong>'+ctx.facts.notes+'</strong></div>'+
      '<div class="brain-os-context-line"><span>Files</span><strong>'+ctx.facts.files+'</strong></div>'+
      selection+
      '<button type="button" class="brain-os-action primary" data-brain-action="analyze">'+text("Analyser ce contexte","Analyze this context")+'</button>'+
    '</section>';
  }
  function renderSearch(){
    var results=search(state.query);
    return '<div class="brain-os-search"><input id="brain-os-search-input" value="'+escapeHTML(state.query)+'" placeholder="'+text("Rechercher notes, taches, fichiers...","Search notes, tasks, files...")+'" autocomplete="off"></div>'+
      '<div class="brain-os-results" id="brain-os-results">'+searchResultsHTML(results)+'</div>';
  }
  function searchResultsHTML(results){
    return results.length?results.map(function(r){
      return '<button type="button" class="brain-os-result" data-brain-open-page="'+escapeHTML(r.page)+'"><span>'+escapeHTML(r.type)+'</span><strong>'+escapeHTML(r.label)+'</strong><em>'+escapeHTML(String(r.body||"").slice(0,90))+'</em></button>';
    }).join(""):'<div class="brain-os-empty">'+text("Tape pour lancer Brain Search.","Type to start Brain Search.")+'</div>';
  }
  function updateSearchResults(){
    clearTimeout(state.searchTimer);
    state.searchTimer=setTimeout(function(){
      var host=$("#brain-os-results");
      if(host)host.innerHTML=searchResultsHTML(search(state.query));
    },120);
  }
  function renderMemory(){
    var signals=(profileState().brainSignals||[]).slice(0,8);
    var mem=null;
    var report=intelligenceReport();
    var prefs=report&&Array.isArray(report.preferences)?report.preferences:[];
    try{mem=window.ETHONEMemory&&window.ETHONEMemory.state?window.ETHONEMemory.state():null}catch(e){}
    var rows=signals.map(function(s){return '<div class="brain-os-row"><strong>'+escapeHTML(s.type)+'</strong><span>'+escapeHTML(s.page||"")+" - "+escapeHTML(formatTime(s.ts))+'</span></div>'}).join("");
    var preferenceRows=prefs.slice(0,10).map(function(pref){
      var pending=pref.status==="candidate";
      return '<div class="brain-os-preference"><div><strong>'+escapeHTML(pref.title)+'</strong><span>'+escapeHTML(String(pref.value||""))+' / '+escapeHTML(pref.status||"candidate")+'</span></div>'+
        (pending?'<div class="brain-os-pref-actions"><button type="button" data-brain-pref-accept="'+escapeHTML(pref.id)+'">'+text("Memoriser","Remember")+'</button><button type="button" data-brain-pref-forget="'+escapeHTML(pref.id)+'">'+text("Ignorer","Ignore")+'</button></div>':"")+
      '</div>';
    }).join("");
    return '<section class="brain-os-card"><span>Memory</span><strong>'+text("Memoire visible","Visible memory")+'</strong><p>'+text("Brain garde des signaux legers et visibles pour reprendre le contexte, sans executer d action importante sans confirmation.","Brain keeps lightweight visible signals to resume context, without executing meaningful actions without confirmation.")+'</p><button type="button" class="brain-os-action" data-brain-memory-open>'+text("Ouvrir Memory Center","Open Memory Center")+'</button></section>'+
      '<div class="brain-os-list"><div class="brain-os-section-title">'+text("Preferences Brain","Brain preferences")+'</div>'+(preferenceRows||'<div class="brain-os-empty">'+text("Aucune preference visible pour le moment.","No visible preference yet.")+'</div>')+'</div>'+
      '<div class="brain-os-list">'+(rows||'<div class="brain-os-empty">'+text("Aucun signal Brain pour le moment.","No Brain signals yet.")+'</div>')+'</div>'+
      '<div class="brain-os-mini">'+(mem?text("Snapshots: ","Snapshots: ")+(mem.snapshots||[]).length+" / "+text("Events: ","Events: ")+(mem.events||[]).length:"")+'</div>';
  }
  function renderTimeline(){
    var items=[];
    try{items=window.ETHONETimeline&&window.ETHONETimeline.filtered?window.ETHONETimeline.filtered({query:"brain ai"}):[]}catch(e){}
    if(!items.length){try{items=window.ETHONETimeline&&window.ETHONETimeline.items?window.ETHONETimeline.items().slice(0,10):[]}catch(e){}}
    return '<div class="brain-os-list">'+(items.slice(0,10).map(function(e){
      return '<div class="brain-os-row"><strong>'+escapeHTML(e.title)+'</strong><span>'+escapeHTML(e.category||"activity")+" - "+escapeHTML(formatTime(e.ts))+'</span></div>';
    }).join("")||'<div class="brain-os-empty">'+text("La timeline Brain va apparaitre ici.","Brain timeline will appear here.")+'</div>')+'</div>';
  }
  function renderPageStrip(ctx){
    var page=$(".tab-content.active[id^='page-']");
    if(!page||page.id==="page-ai")return;
    if($(".brain-everywhere-strip",page)){
      var legacyStrip=$(".brain-os-strip",page);
      if(legacyStrip)legacyStrip.remove();
      delete page.dataset.brainStrip;
      return;
    }
    if(page.dataset.brainStrip==="1"){
      var status=$(".brain-os-strip-status",page);
      if(status)status.textContent=ctx.pageLabel+" / "+ctx.workspace;
      return;
    }
    page.dataset.brainStrip="1";
    var strip=document.createElement("section");
    strip.className="brain-os-strip";
    strip.innerHTML='<div><span>Brain Context</span><strong class="brain-os-strip-status">'+escapeHTML(ctx.pageLabel+" / "+ctx.workspace)+'</strong></div><div class="brain-os-strip-actions"><button type="button" data-brain-open-tab="briefing">'+text("Briefing","Briefing")+'</button><button type="button" data-brain-open-tab="suggestions">'+text("Suggestions","Suggestions")+'</button><button type="button" data-brain-open-tab="actions">'+text("Actions","Actions")+'</button><button type="button" data-brain-open-tab="search">Search</button></div>';
    var topbar=$(".topbar",page)||page.firstElementChild;
    if(topbar&&topbar.parentNode)topbar.parentNode.insertBefore(strip,topbar.nextSibling);
    else page.prepend(strip);
  }
  function formatTime(ts){try{return new Date(ts).toLocaleString([], {month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(e){return ""}}
  function scheduleRender(){
    if(activePage()==="ai"&&!state.open)return;
    clearTimeout(state.renderTimer);
    state.renderTimer=setTimeout(render,state.open?90:180);
  }
  function patchNavigation(){
    if(typeof window.switchPage==="function"&&!window.switchPage.__brainOSWrapped){
      var old=window.switchPage;
      window.switchPage=function(){
        var result=old.apply(this,arguments);
        setTimeout(function(){
          var ctx=currentContext();
          if(ctx.page!==state.lastPage){
            state.lastPage=ctx.page;
            recordTimeline({title:"Brain observed page: "+ctx.pageLabel,category:"ai",source:"brain-os",dedupe:"brain-page-"+ctx.page+"-"+Math.floor(Date.now()/30000),meta:{page:ctx.page}});
            recordMemory("brain_context","Brain context: "+ctx.pageLabel,{page:ctx.page,workspace:ctx.workspace});
          }
          if(ctx.page!=="ai")scheduleRender();
        },80);
        return result;
      };
      window.switchPage.__brainOSWrapped=true;
    }
  }
  function bind(){
    document.addEventListener("click",function(e){
      var orb=e.target.closest("#brain-os-orb");
      if(orb){openPanel();return}
      if(e.target.closest("[data-brain-close]")){closePanel();return}
      var tab=e.target.closest("[data-brain-tab],[data-brain-open-tab]");
      if(tab){openPanel(tab.dataset.brainTab||tab.dataset.brainOpenTab);return}
      var action=e.target.closest("[data-brain-action]");
      if(action){openCopilot(action.dataset.brainAction,currentContext());return}
      var prefAccept=e.target.closest("[data-brain-pref-accept]");
      if(prefAccept){
        try{if(window.ETHONEBrainIntelligence&&window.ETHONEBrainIntelligence.acceptPreference)window.ETHONEBrainIntelligence.acceptPreference(prefAccept.dataset.brainPrefAccept)}catch(err){}
        render();
        return;
      }
      var prefForget=e.target.closest("[data-brain-pref-forget]");
      if(prefForget){
        try{if(window.ETHONEBrainIntelligence&&window.ETHONEBrainIntelligence.forgetPreference)window.ETHONEBrainIntelligence.forgetPreference(prefForget.dataset.brainPrefForget)}catch(err){}
        render();
        return;
      }
      if(e.target.closest("[data-brain-memory-open]")){
        if(window.ETHONEMemory&&typeof window.ETHONEMemory.open==="function")window.ETHONEMemory.open();
        return;
      }
      var result=e.target.closest("[data-brain-open-page]");
      if(result){
        var page=result.dataset.brainOpenPage;
        if(typeof window.switchPage==="function")window.switchPage(page,null);
        closePanel();
      }
    });
    document.addEventListener("input",function(e){
      if(e.target&&e.target.id==="brain-os-search-input"){
        state.query=e.target.value;
        updateSearchResults();
        clearTimeout(state.searchSignalTimer);
        state.searchSignalTimer=setTimeout(function(){storeSignal("brain_search",{query:state.query.slice(0,80)})},500);
      }
    });
    document.addEventListener("selectionchange",function(){
      clearTimeout(state.selectionTimer);
      state.selectionTimer=setTimeout(function(){
        if(activePage()==="ai"&&!state.open)return;
        var value="";
        try{value=String(window.getSelection&&window.getSelection()||"").trim()}catch(e){}
        if(value&&value!==state.lastSelection&&value.length>24){
          state.lastSelection=value.slice(0,180);
          scheduleRender();
        }
      },180);
    });
    document.addEventListener("keydown",function(e){
      if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="b"){e.preventDefault();openPanel()}
      if(e.key==="Escape")closePanel();
    });
    window.addEventListener("ethone:timeline",scheduleRender);
    window.addEventListener("ethone:memory-event",scheduleRender);
    window.addEventListener("ethone:brain-intelligence",scheduleRender);
  }
  function boot(){
    if(state.started)return;
    state.started=true;
    bind();
    patchNavigation();
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(render,350)},{once:true});
    else if(activePage()!=="ai")setTimeout(render,350);
    setTimeout(function(){
      if(!isAppVisible())return;
      var ctx=currentContext();
      recordTimeline({title:"Brain OS online",body:ctx.pageLabel+" context layer active.",category:"ai",source:"brain-os",dedupe:"brain-online-"+new Date().toLocaleDateString("en-CA"),meta:{page:ctx.page}});
      storeSignal("brain_online",{page:ctx.page});
      try{if(window.ETHONEBrainIntelligence&&window.ETHONEBrainIntelligence.schedule)window.ETHONEBrainIntelligence.schedule("brain-os-online",350)}catch(e){}
      scheduleRender();
    },1600);
  }

  window.ETHONEBrainOS={
    open:openPanel,
    close:closePanel,
    context:currentContext,
    suggestions:function(){return suggestions(currentContext())},
    actions:function(){return actionList(currentContext())},
    search:search,
    report:function(){return intelligenceReport()},
    runAction:function(action){openCopilot(action,currentContext())},
    render:render
  };
  boot();
})();
