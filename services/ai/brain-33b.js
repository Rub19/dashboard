/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE||window.__ethoneSkipBrain)return;
  if(window.__ethoneBrain33B)return;
  window.__ethoneBrain33B=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const storeKey="ethone:brain-33b";
  const defaultMemory=[
    {id:"layout",key:"Preferred layout",value:"Use the active dashboard and workspace as the default context.",locked:false},
    {id:"provider",key:"Preferred provider",value:"Route through ETHONE AI Core with fallbacks when available.",locked:false},
    {id:"actions",key:"Action style",value:"Recommend useful actions, then ask before changing important data.",locked:false}
  ];
  const state=load();
  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(storeKey)||"{}");
      return {
        timeline:Array.isArray(saved.timeline)?saved.timeline:[],
        memory:Array.isArray(saved.memory)?saved.memory:defaultMemory,
        widgets:Array.isArray(saved.widgets)?saved.widgets:["score","priorities","recommendations","automation"],
        dismissed:Array.isArray(saved.dismissed)?saved.dismissed:[]
      };
    }catch(e){
      return {timeline:[],memory:defaultMemory,widgets:["score","priorities","recommendations","automation"],dismissed:[]};
    }
  }
  function save(){
    localStorage.setItem(storeKey,JSON.stringify(state));
    const p=profile();
    if(p&&p.state){
      p.state.ethoneBrain=Object.assign({},p.state.ethoneBrain||{},{
        timeline:state.timeline.slice(-80),
        memory:state.memory,
        widgets:state.widgets,
        updatedAt:Date.now()
      });
      try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
    }
  }
  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }
  function ps(){
    const p=profile();
    return p&&p.state?p.state:{};
  }
  function lang(){
    return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase();
  }
  function escape(s){
    return String(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  }
  function activePage(){
    return document.querySelector(".tab-content.active")?.id?.replace("page-","")||"dashboard";
  }
  function shouldAutoRefresh(){
    if(document.visibilityState==="hidden")return false;
    const page=activePage();
    return page==="ai"||page==="dashboard";
  }
  function pageLabel(id){
    const map={dashboard:"ETHONE Home",ai:"ETHONE Brain",todos:"Tasks",notes:"Notes",files:"Files",habits:"Habits",calendar:"Calendar",github:"GitHub",marketplace:"Marketplace",store:"Store",workspaces:"Workspaces",timeline:"Timeline",stats:"Statistics",gaming:"Gaming",settings:"Settings",connections:"Connections"};
    return map[id]||String(id||"Workspace");
  }
  function dataFacts(){
    const s=ps();
    const todos=Array.isArray(s.todos)?s.todos:[];
    const habits=Array.isArray(s.habits)?s.habits:[];
    const events=Array.isArray(s.events)?s.events:[];
    const notes=Array.isArray(s.notes)?s.notes:[];
    const files=Array.isArray(s.items)?s.items:[];
    const today=new Date().toISOString().slice(0,10);
    const open=todos.filter(t=>!t.done);
    const done=todos.filter(t=>t.done);
    const high=open.filter(t=>String(t.priority||"").toLowerCase()==="high");
    const todayEvents=events.filter(e=>String(e.date||"").slice(0,10)===today);
    const connections=s.connections||{};
    const aiCore=window.ETHONEAICore?.config?.()||{};
    return {
      open:open.length,
      done:done.length,
      high:high.length,
      habits:habits.length,
      events:events.length,
      todayEvents:todayEvents.length,
      notes:notes.length,
      files:files.length,
      connections:Object.keys(connections).filter(k=>!!connections[k]).length,
      widgets:document.querySelectorAll(".panel,.stat-card,.conn-card,.game-card,.ethone-os2-card").length,
      providers:Object.keys(aiCore.providers||{}).filter(k=>aiCore.providers[k]?.enabled!==false&&(aiCore.providers[k]?.apiKey||String(aiCore.providers[k]?.endpoint||"").includes("localhost"))).length,
      memory:(aiCore.memory||[]).length+state.memory.length
    };
  }
  function greeting(){
    const h=new Date().getHours();
    if(h<5)return "Welcome Back";
    if(h<12)return "Good Morning";
    if(h<18)return "Good Afternoon";
    return "Good Evening";
  }
  function routineMode(){
    const page=activePage();
    const h=new Date().getHours();
    const text=(document.body?.innerText||"").toLowerCase();
    if(page==="gaming"||/steam|valorant|twitch|discord|spotify/.test(text)&&h>=18)return {id:"gaming",label:"Gaming Session",tone:"Discord, Spotify, gaming widgets and unwind routines are prioritized."};
    if(page==="notes"||/study|school|cours|revision|lecture/.test(text))return {id:"study",label:"Study Session",tone:"Notes, files, summaries and focused planning are prioritized."};
    if(["github","todos","calendar","workspaces","stats"].includes(page)||h>=8&&h<18)return {id:"work",label:"Work Session",tone:"Tasks, GitHub, notes, calendar and automations are prioritized."};
    return {id:"personal",label:"Personal Time",tone:"Habits, journaling, reflection and lighter recommendations are prioritized."};
  }
  function summary(){
    const f=dataFacts();
    const mode=routineMode();
    const attention=[];
    if(f.open)attention.push(f.open+" unfinished task"+(f.open>1?"s":""));
    if(f.todayEvents)attention.push(f.todayEvents+" calendar event"+(f.todayEvents>1?"s":""));
    if(f.habits)attention.push(f.habits+" habit signal"+(f.habits>1?"s":""));
    if(!attention.length)attention.push("a calm workspace");
    return "ETHONE Brain sees "+attention.join(", ")+" and detects a "+mode.label.toLowerCase()+". "+mode.tone;
  }
  function productivityScore(){
    const f=dataFacts();
    const total=f.open+f.done;
    if(!total)return Math.min(100,50+f.notes*3+f.habits*4);
    return Math.max(8,Math.min(100,Math.round((f.done/total)*72+f.habits*3+f.todayEvents*2+f.notes)));
  }
  function recommendations(){
    const f=dataFacts();
    const mode=routineMode();
    const recs=[];
    if(mode.id==="work")recs.push({id:"dev-workspace",title:"Create a Developer Workspace",why:"Brain detected work mode, active tasks and developer-oriented context.",action:"developer"});
    if(mode.id==="gaming")recs.push({id:"gaming-workspace",title:"Prepare a Gaming Workspace",why:"Discord, Spotify or gaming signals are stronger during this session.",action:"gaming"});
    if(f.open>=3)recs.push({id:"task-priority",title:"Prioritize unfinished tasks",why:"Several tasks still require attention, so a focused order will reduce context switching.",action:"prioritize"});
    if(f.notes>=3)recs.push({id:"note-summary",title:"Summarize open notes",why:"Your note library is growing; Brain can extract decisions and next actions.",action:"notes"});
    if(f.widgets>16)recs.push({id:"hide-widgets",title:"Review rarely used widgets",why:"A dense dashboard can slow repeated workflows. Brain can propose a calmer layout.",action:"layout"});
    if(f.providers<1)recs.push({id:"provider",title:"Connect an AI provider",why:"Brain uses ETHONE AI Core. A configured provider unlocks live reasoning and workflows.",action:"provider"});
    recs.push({id:"automation",title:"Suggest an automation pack",why:"Brain can convert repeated actions into transparent workflows you approve first.",action:"automation"});
    return recs.filter(r=>!state.dismissed.includes(r.id)).slice(0,5);
  }
  function seedTimeline(){
    if(state.timeline.length)return;
    const f=dataFacts();
    const now=Date.now();
    state.timeline=[
      {id:now-4000,ts:now-4000,type:"session",title:"ETHONE opened",body:"Brain started building today's operating-system memory."},
      {id:now-3000,ts:now-3000,type:"context",title:"Current workspace detected",body:pageLabel(activePage())+" is active."},
      {id:now-2000,ts:now-2000,type:"summary",title:"Digital life scanned",body:f.open+" open tasks, "+f.notes+" notes, "+f.habits+" habits and "+f.todayEvents+" events today."}
    ];
    save();
  }
  function addTimeline(type,title,body){
    state.timeline.push({id:Date.now()+Math.random(),ts:Date.now(),type,title,body});
    if(state.timeline.length>100)state.timeline=state.timeline.slice(-100);
    save();
    renderTimeline();
  }
  function ensureBrainPage(){
    const page=$("#page-ai");
    if(!page)return;
    page.classList.add("ethone-brain-ready");
    const eyebrow=page.querySelector("[data-i18n='ai_powered_by']");
    if(eyebrow)eyebrow.textContent="Central OS Brain";
    const title=page.querySelector(".section-title");
    if(title)title.innerHTML='ETHONE <span>Brain</span>';
    const input=$("#ai-input");
    if(input)input.placeholder=lang()==="fr"?"Demandez a Brain d'orchestrer ETHONE...":"Ask Brain to orchestrate ETHONE...";
    const ctx=$("#ai-ctx-label");
    if(ctx)ctx.textContent=pageLabel(activePage())+" connected";
    if($("#brain-shell",page))return;
    seedTimeline();
    const shell=document.createElement("section");
    shell.id="brain-shell";
    shell.className="brain-shell";
    shell.innerHTML=
      '<div class="brain-panel brain-hero">'+
        '<div class="brain-hero-head">'+
          '<div><div class="brain-greeting" id="brain-greeting">'+escape(greeting())+'</div><div class="brain-summary" id="brain-summary">'+escape(summary())+'</div></div>'+
          '<div class="brain-mode-pill"><span class="brain-mode-dot"></span><span id="brain-mode">'+escape(routineMode().label)+'</span></div>'+
        '</div>'+
        '<div class="brain-overview-grid" id="brain-overview-grid"></div>'+
        '<div class="brain-actions"><button class="brain-btn primary" data-brain-workflow="daily-review" type="button">Daily Review</button><button class="brain-btn" data-brain-workflow="prepare-workspace" type="button">Prepare Workspace</button><button class="brain-btn" data-brain-workflow="weekly-report" type="button">Weekly Report</button><button class="brain-btn green" data-brain-add-widget="recommendations" type="button">Add Brain Widget</button></div>'+
      '</div>'+
      '<aside class="brain-panel brain-side">'+
        '<div class="brain-title-row"><div><div class="brain-section-title">Contextual recommendations</div><div class="brain-section-sub">Each suggestion explains why Brain thinks it matters.</div></div><button class="brain-btn" data-brain-refresh type="button">Refresh</button></div>'+
        '<div class="brain-recommendations" id="brain-recommendations"></div>'+
        '<div class="brain-voice"><div class="brain-section-title">Voice-ready Brain</div><div class="brain-section-sub">Prepared for speech, dictation, spoken answers and future voice actions.</div><div class="brain-actions"><button class="brain-btn" data-brain-voice type="button">Start voice</button><button class="brain-btn" data-brain-workflow="dictate-note" type="button">Dictate note</button></div><div class="brain-voice-status" id="brain-voice-status">Voice is available when the browser exposes speech recognition.</div></div>'+
      '</aside>'+
      '<div class="brain-wide brain-lanes">'+
        '<section class="brain-panel brain-timeline"><div class="brain-title-row"><div><div class="brain-section-title">Intelligence Timeline</div><div class="brain-section-sub">A visual memory of today actions, summaries, widgets, notes and workflows.</div></div><button class="brain-btn" data-brain-clear-timeline type="button">Clear</button></div><div class="brain-timeline-list" id="brain-timeline-list"></div></section>'+
        '<section class="brain-panel brain-workflows"><div class="brain-title-row"><div><div class="brain-section-title">AI Workflows</div><div class="brain-section-sub">Brain orchestrates sequences through ETHONE AI Core, with confirmation before important changes.</div></div></div><div class="brain-workflow-grid" id="brain-workflow-grid"></div></section>'+
      '</div>'+
      '<section class="brain-panel brain-memory brain-wide"><div class="brain-title-row"><div><div class="brain-section-title">Transparent memory</div><div class="brain-section-sub">Everything Brain remembers is visible, editable and removable.</div></div><button class="brain-btn primary" data-brain-add-memory type="button">Add memory</button></div><div class="brain-memory-grid" id="brain-memory-grid"></div></section>';
    const topbar=page.querySelector(".topbar");
    if(topbar&&topbar.nextSibling)topbar.parentNode.insertBefore(shell,topbar.nextSibling);
    else page.prepend(shell);
    renderBrain();
  }
  function overviewCards(){
    const f=dataFacts();
    return [
      ["Productivity",productivityScore(),f.done+" done / "+f.open+" open tasks"],
      ["Priorities",f.high||f.open,f.high?f.high+" high priority item(s)":"Ready for Brain ordering"],
      ["Calendar",f.todayEvents,f.todayEvents?"Events need timing awareness":"No visible events today"],
      ["Habits",f.habits,f.habits?"Streaks can be protected":"Add habits for richer routines"],
      ["GitHub",f.providers?"Connected via AI Core routes":"Ready for provider context"],
      ["Marketplace",recommendations().length,"Personal improvements available"],
      ["Automations",state.timeline.filter(x=>x.type==="workflow").length,"Workflow memory for today"],
      ["Workspace",pageLabel(activePage()),routineMode().label]
    ];
  }
  function renderBrain(){
    $("#brain-greeting")&&($("#brain-greeting").textContent=greeting());
    $("#brain-summary")&&($("#brain-summary").textContent=summary());
    $("#brain-mode")&&($("#brain-mode").textContent=routineMode().label);
    const grid=$("#brain-overview-grid");
    if(grid)grid.innerHTML=overviewCards().map(c=>'<article class="brain-card"><span>'+escape(c[0])+'</span><strong>'+escape(c[1])+'</strong><p>'+escape(c[2])+'</p></article>').join("");
    renderRecommendations();
    renderTimeline();
    renderWorkflows();
    renderMemory();
  }
  function renderRecommendations(){
    const host=$("#brain-recommendations");
    if(!host)return;
    const recs=recommendations();
    host.innerHTML=recs.length?recs.map(r=>'<article class="brain-rec"><strong>'+escape(r.title)+'</strong><span>'+escape(r.why)+'</span><div class="brain-actions"><button class="brain-btn primary" data-brain-rec="'+escape(r.action)+'" type="button">Run</button><button class="brain-btn" data-brain-dismiss="'+escape(r.id)+'" type="button">Dismiss</button></div></article>').join(""):'<article class="brain-rec"><strong>Nothing urgent</strong><span>Brain has no strong recommendation right now. Keep working and it will adapt.</span></article>';
  }
  function renderTimeline(){
    const host=$("#brain-timeline-list");
    if(!host)return;
    const list=state.timeline.slice(-18).reverse();
    host.innerHTML=list.map(e=>'<div class="brain-timeline-entry"><div class="brain-time">'+escape(new Date(e.ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}))+'</div><div class="brain-event"><strong>'+escape(e.title)+'</strong><span>'+escape(e.body||e.type||"")+'</span></div></div>').join("");
  }
  function renderWorkflows(){
    const host=$("#brain-workflow-grid");
    if(!host)return;
    const mode=routineMode().id;
    const defs=[
      ["notes-to-tasks","Create tasks from notes","Extract decisions and next actions from current notes."],
      ["organize-widgets","Organize widgets","Suggest hiding, moving or grouping dashboard components."],
      ["meeting-prep","Prepare meeting workspace","Collect notes, calendar context and priorities before a meeting."],
      ["github-summary","Summarize GitHub activity","Create a developer report from commits, issues and work context."],
      ["archive-done","Archive completed tasks","Review finished tasks before archiving or summarizing."],
      [mode==="gaming"?"gaming-setup":"focus-session",mode==="gaming"?"Prepare gaming environment":"Prepare focus session",mode==="gaming"?"Coordinate Discord, Spotify, Steam and Valorant context.":"Set a calm work block with tasks, notes and habits."]
    ];
    host.innerHTML=defs.map(d=>'<button class="brain-workflow" type="button" data-brain-workflow="'+d[0]+'"><strong>'+escape(d[1])+'</strong><span>'+escape(d[2])+'</span></button>').join("");
  }
  function renderMemory(){
    const host=$("#brain-memory-grid");
    if(!host)return;
    const core=window.ETHONEAICore?.config?.().memory||[];
    const merged=state.memory.concat(core.map((m,i)=>({id:"core-"+(m.id||i),key:m.key||"AI Core memory",value:m.value||"",core:true})));
    host.innerHTML=merged.length?merged.map(m=>'<article class="brain-memory-item"><strong>'+escape(m.key)+'</strong><span>'+escape(m.value)+'</span><div class="brain-actions"><button class="brain-btn" data-brain-edit-memory="'+escape(m.id)+'" type="button">Edit</button><button class="brain-btn" data-brain-remove-memory="'+escape(m.id)+'" type="button">Remove</button></div></article>').join(""):'<article class="brain-memory-item"><strong>No memory</strong><span>Add preferences to help Brain personalize ETHONE transparently.</span></article>';
  }
  function ensureHomeBrainWidgets(){
    const page=$("#page-dashboard");
    if(!page)return;
    let strip=$("#brain-widget-strip",page);
    if(!strip){
      strip=document.createElement("section");
      strip.id="brain-widget-strip";
      strip.className="brain-widget-strip";
      const anchor=$("#eic-daily-rhythm",page)||$("#aie-home-insights",page)||$("#ethone-os2-ops-grid",page)||$(".stats-row",page)||page.firstElementChild;
      if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(strip,anchor);
      else page.prepend(strip);
    }
    strip.innerHTML=state.widgets.map(widgetHTML).join("");
  }
  function widgetHTML(id){
    const f=dataFacts();
    const defs={
      score:["Productivity Score",productivityScore(),f.done+" completed and "+f.open+" still open."],
      priorities:["Upcoming Priorities",f.high||f.open,(f.high||f.open)?"Brain can order your next work block.":"No urgent priority detected."],
      recommendations:["AI Recommendations",recommendations().length,"Personalized improvements without ads."],
      briefing:["Morning Briefing",f.todayEvents+" events","Weather, calendar, habits and tasks in one view."],
      recap:["Evening Recap",f.done+" done","Reflect on progress and prepare tomorrow."],
      focus:["Focus Insights",routineMode().label,routineMode().tone],
      automation:["Automation Suggestions",state.timeline.filter(x=>x.type==="workflow").length,"Turn repeated actions into approved workflows."],
      marketplace:["Marketplace Suggestions",recommendations().length,"Widgets, layouts and plugins matched to behavior."]
    };
    const d=defs[id]||defs.recommendations;
    return '<article class="brain-widget" data-brain-widget="'+escape(id)+'"><span>'+escape(d[0])+'</span><strong>'+escape(d[1])+'</strong><p>'+escape(d[2])+'</p><div class="brain-actions"><button class="brain-btn" data-brain-customize-widget="'+escape(id)+'" type="button">Customize</button><button class="brain-btn" data-brain-remove-widget="'+escape(id)+'" type="button">Hide</button></div></article>';
  }
  function workflowPrompt(id){
    const f=dataFacts();
    const ctx={page:activePage(),pageLabel:pageLabel(activePage()),mode:routineMode(),facts:f,memory:state.memory,timeline:state.timeline.slice(-12)};
    const base="\n\nETHONE Brain context:\n"+JSON.stringify(ctx).slice(0,2800);
    const map={
      "daily-review":"Run a daily ETHONE Brain review. Summarize productivity, unfinished tasks, calendar, habits, workspace, services and next recommendations. Present as cards, timeline and actions."+base,
      "prepare-workspace":"Prepare the current ETHONE workspace. Recommend widgets, files, notes, tasks, automations and connected services. Ask before applying changes."+base,
      "weekly-report":"Generate a weekly productivity report using tasks, notes, habits, calendar and timeline signals. Include trends and next improvements."+base,
      "notes-to-tasks":"Extract tasks from notes and propose one-click task creation. Do not create anything without confirmation."+base,
      "organize-widgets":"Audit dashboard widgets. Recommend which to keep, hide, resize or move, and explain why."+base,
      "meeting-prep":"Prepare a meeting workspace with agenda, notes, tasks, files and follow-up actions."+base,
      "github-summary":"Summarize GitHub activity and developer progress. Include commits, issues, risks and next coding tasks if context exists."+base,
      "archive-done":"Review completed tasks and propose an archive/summary. Ask for confirmation before modifying tasks."+base,
      "gaming-setup":"Prepare a gaming environment using Discord, Spotify, Steam, Valorant and focus boundaries. Recommend a Gaming Workspace setup."+base,
      "focus-session":"Prepare a focused work session with tasks, notes, calendar timing and habit protection."+base,
      "dictate-note":"Prepare to turn voice dictation into a structured ETHONE note with title, summary and tasks."+base,
      developer:"Recommend a Developer Workspace based on current behavior. Include GitHub, Notes, Tasks, Calendar, automations and layout preview."+base,
      gaming:"Recommend a Gaming Workspace based on current behavior. Include Discord, Spotify, Steam, Valorant, Twitch and session recap widgets."+base,
      prioritize:"Prioritize unfinished tasks and explain the order. Offer create/update actions only with confirmation."+base,
      notes:"Summarize notes into decisions, risks and next tasks. Include suggested note organization."+base,
      layout:"Recommend a calmer ETHONE Home layout with widget changes, hidden widgets and a preview before applying."+base,
      provider:"Guide the user through connecting providers in ETHONE AI Core, with privacy and fallback recommendations."+base,
      automation:"Recommend useful ETHONE automation packs based on repeated actions and current workspace context."+base
    };
    return map[id]||map["daily-review"];
  }
  function sendToBrain(id){
    const prompt=workflowPrompt(id);
    addTimeline("workflow","Workflow requested",id.replace(/-/g," "));
    if(activePage()!=="ai"&&typeof window.switchPage==="function"){
      try{window.switchPage("ai",null)}catch(e){}
    }
    setTimeout(()=>{
      const input=$("#ai-input");
      if(input){
        input.value=prompt;
        input.style.height="auto";
        input.style.height=Math.min(input.scrollHeight,170)+"px";
        if(typeof window.sendAIMessage==="function")window.sendAIMessage();
      }else if(window.ETHONEAIEverywhere?.openCopilot){
        window.ETHONEAIEverywhere.openCopilot({page:activePage(),kind:"brain",label:"ETHONE Brain",text:prompt,facts:dataFacts()},prompt);
      }
    },180);
  }
  function patchCore(){
    if(!window.ETHONEAICore||window.ETHONEAICore.__brain33bPatched)return;
    const old=window.ETHONEAICore.complete;
    if(typeof old!=="function")return;
    window.ETHONEAICore.complete=function(input,opts){
      const prefix="ETHONE Brain directive: You are the central intelligence hub of ETHONE OS. Connect pages, widgets, workspaces, routines, marketplace, memory and workflows. Never sound like an embedded chatbot. Start from context, explain why recommendations matter, use actionable steps, and ask before destructive or important changes. Future-ready capabilities include multi-agent reasoning, voice, vision, local AI, MCP servers and autonomous workflows.\n\n";
      return old.call(this,prefix+String(input||""),opts);
    };
    window.ETHONEAICore.__brain33bPatched=true;
  }
  function patchActions(){
    if(typeof window.addAIMessage==="function"&&!window.addAIMessage.__brain33bWrapped){
      const old=window.addAIMessage;
      window.addAIMessage=function(role,content){
        const out=old.apply(this,arguments);
        if(role==="assistant")addTimeline("summary","Brain response generated",String(content||"").replace(/\s+/g," ").slice(0,180));
        return out;
      };
      window.addAIMessage.__brain33bWrapped=true;
    }
    if(typeof window.switchPage==="function"&&!window.switchPage.__brain33bWrapped){
      const oldSwitch=window.switchPage;
      window.switchPage=function(){
        const from=activePage();
        const r=oldSwitch.apply(this,arguments);
        setTimeout(()=>{addTimeline("navigation","Workspace changed",from+" to "+activePage());if(shouldAutoRefresh())run();},120);
        return r;
      };
      window.switchPage.__brain33bWrapped=true;
    }
  }
  function handleClick(e){
    const wf=e.target.closest("[data-brain-workflow]");
    if(wf){sendToBrain(wf.dataset.brainWorkflow);return}
    const rec=e.target.closest("[data-brain-rec]");
    if(rec){sendToBrain(rec.dataset.brainRec);return}
    const dismiss=e.target.closest("[data-brain-dismiss]");
    if(dismiss){
      state.dismissed.push(dismiss.dataset.brainDismiss);
      save();
      renderRecommendations();
      return;
    }
    if(e.target.closest("[data-brain-refresh]")){addTimeline("context","Brain refreshed",summary());renderBrain();ensureHomeBrainWidgets();return}
    if(e.target.closest("[data-brain-clear-timeline]")){state.timeline=[];save();seedTimeline();renderTimeline();return}
    const addWidget=e.target.closest("[data-brain-add-widget]");
    if(addWidget){
      const options=["score","priorities","recommendations","briefing","recap","focus","automation","marketplace"];
      const next=options.find(x=>!state.widgets.includes(x))||addWidget.dataset.brainAddWidget||"recommendations";
      if(!state.widgets.includes(next))state.widgets.push(next);
      save();
      ensureHomeBrainWidgets();
      addTimeline("widget","Brain widget added",next);
      if(typeof window.toast==="function")window.toast("Brain widget added to ETHONE Home","success");
      return;
    }
    const removeWidget=e.target.closest("[data-brain-remove-widget]");
    if(removeWidget){state.widgets=state.widgets.filter(x=>x!==removeWidget.dataset.brainRemoveWidget);save();ensureHomeBrainWidgets();return}
    const customize=e.target.closest("[data-brain-customize-widget]");
    if(customize){sendToBrain("layout");return}
    const addMem=e.target.closest("[data-brain-add-memory]");
    if(addMem){
      const value=prompt("What should ETHONE Brain remember transparently?");
      if(value){state.memory.push({id:Date.now(),key:"User preference",value:value.slice(0,260)});save();renderMemory();addTimeline("memory","Memory added",value.slice(0,120))}
      return;
    }
    const editMem=e.target.closest("[data-brain-edit-memory]");
    if(editMem){
      const item=state.memory.find(m=>String(m.id)===String(editMem.dataset.brainEditMemory));
      if(item){const value=prompt("Edit memory",item.value);if(value!==null){item.value=value.slice(0,260);save();renderMemory();}}
      return;
    }
    const remMem=e.target.closest("[data-brain-remove-memory]");
    if(remMem){state.memory=state.memory.filter(m=>String(m.id)!==String(remMem.dataset.brainRemoveMemory));save();renderMemory();return}
    if(e.target.closest("[data-brain-voice]")){
      const status=$("#brain-voice-status");
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR){if(status)status.textContent="Speech recognition is not exposed by this browser yet.";return}
      const recg=new SR();
      recg.lang=lang()==="fr"?"fr-FR":"en-US";
      recg.interimResults=false;
      recg.onstart=()=>{if(status)status.textContent="Listening in the current ETHONE context..."}
      recg.onerror=err=>{if(status)status.textContent="Voice stopped: "+(err.error||"unknown")}
      recg.onresult=ev=>{
        const text=ev.results?.[0]?.[0]?.transcript||"";
        if(status)status.textContent="Heard: "+text;
        const input=$("#ai-input");
        if(input){input.value=text;input.focus();}
        addTimeline("voice","Voice input captured",text);
      };
      recg.start();
      return;
    }
  }
  function patchCommandPalette(){
    if(typeof window.getCmdItems==="function"&&!window.getCmdItems.__brain33bWrapped){
      const old=window.getCmdItems;
      window.getCmdItems=function(q){
        const res=old.apply(this,arguments);
        const text=String(q||"").trim();
        if(text.length>2){
          const item={icon:"BR",label:"Ask ETHONE Brain: "+text,sub:"Central OS context, routines, workflows and memory",tag:"Brain",action:()=>{if(typeof window.closeCmdPalette==="function")window.closeCmdPalette();sendToBrain("daily-review")}};
          res.actions=[item].concat(res.actions||[]);
          res.all=[item].concat(res.all||[]);
        }
        return res;
      };
      window.getCmdItems.__brain33bWrapped=true;
    }
  }
  function renameCopilot(){
    $$(".aie-copilot-title").forEach(x=>x.textContent="ETHONE Brain");
    $$(".aie-copilot-toggle").forEach(x=>{x.textContent="BR";x.title="Open ETHONE Brain"});
    const sub=$("#aie-copilot-sub");
    if(sub)sub.textContent=routineMode().label+" context";
  }
  function run(){
    ensureBrainPage();
    ensureHomeBrainWidgets();
    patchCore();
    patchActions();
    patchCommandPalette();
    renameCopilot();
    renderBrain();
  }
  function startBrain33B(){
    document.addEventListener("click",handleClick);
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
    setTimeout(run,350);
    setTimeout(run,1500);
    setInterval(()=>{if(shouldAutoRefresh())run();},30000);
  }
  if(window.ethoneRunWhenPageReady)window.ethoneRunWhenPageReady("brain-33b-runtime","ai",startBrain33B);else startBrain33B();
  window.ETHONEBrain={run,open:sendToBrain,facts:dataFacts,timeline:addTimeline,memory:()=>state.memory,recommendations};
})();
