/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE||window.__ethoneSkipBrain)return;
  if(window.__ethoneBrainPlatform35)return;
  window.__ethoneBrainPlatform35=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const storeKey="ethone:brain-platform-35";
  const state=load();
  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(storeKey)||"{}");
      return {
        routes:Array.isArray(saved.routes)?saved.routes:[],
        permissions:Array.isArray(saved.permissions)?saved.permissions:[],
        memory:Array.isArray(saved.memory)?saved.memory:[
          {id:"layouts",key:"Preferred layouts",value:"Brain should respect dashboard and workspace choices."},
          {id:"prompts",key:"Favorite prompts",value:"Briefings, summaries, workspace prep and automation suggestions."},
          {id:"providers",key:"Provider preference",value:"Hide provider complexity and route through Brain Core."}
        ],
        behavior:Array.isArray(saved.behavior)?saved.behavior:[]
      };
    }catch(e){
      return {routes:[],permissions:[],memory:[],behavior:[]};
    }
  }
  function save(){
    localStorage.setItem(storeKey,JSON.stringify(state));
    const p=profile();
    if(p&&p.state){
      p.state.ethoneBrainPlatform35=Object.assign({},p.state.ethoneBrainPlatform35||{},{
        routes:state.routes.slice(-80),
        permissions:state.permissions.slice(-30),
        memory:state.memory,
        behavior:state.behavior.slice(-120),
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
    const map={dashboard:"ETHONE Home",ai:"ETHONE Brain",todos:"Tasks",notes:"Notes",files:"Files",habits:"Habits",calendar:"Calendar",github:"GitHub",marketplace:"Marketplace",store:"Store",workspaces:"Workspaces",timeline:"Timeline",stats:"Statistics",gaming:"Gaming",settings:"Settings",connections:"Connections",kanban:"Kanban"};
    return map[id]||String(id||"Workspace");
  }
  function coreConfig(){
    try{return window.ETHONEAICore?.config?.()||{}}catch(e){return {}}
  }
  function facts(){
    const s=ps();
    const todos=Array.isArray(s.todos)?s.todos:[];
    const notes=Array.isArray(s.notes)?s.notes:[];
    const files=Array.isArray(s.items)?s.items:[];
    const habits=Array.isArray(s.habits)?s.habits:[];
    const events=Array.isArray(s.events)?s.events:[];
    const cfg=coreConfig();
    return {
      page:activePage(),
      pageLabel:pageLabel(activePage()),
      selected:String(window.getSelection&&window.getSelection()||"").trim().slice(0,1000),
      widgets:document.querySelectorAll(".panel,.stat-card,.conn-card,.game-card,.ethone-os2-card,.brain-widget").length,
      installedWidgets:JSON.parse(localStorage.getItem("ethone:dashboard-os2")||"{}").installed||{},
      todosOpen:todos.filter(t=>!t.done).length,
      todosDone:todos.filter(t=>t.done).length,
      notes:notes.length,
      files:files.length,
      habits:habits.length,
      events:events.length,
      workspace:localStorage.getItem("ethone:dashboard-os2")||"",
      theme:document.documentElement.getAttribute("data-theme")||localStorage.getItem("nexus_theme")||"",
      providers:Object.keys(cfg.providers||{}).filter(k=>cfg.providers[k]?.enabled!==false).length,
      plugins:Object.keys(cfg.plugins||{}).filter(k=>cfg.plugins[k]).length,
      memory:(cfg.memory||[]).length+state.memory.length,
      recentRoutes:state.routes.slice(-6)
    };
  }
  const engines=[
    ["core","Brain Core","Intent understanding, orchestration, permissions, AI Core communication and unified responses."],
    ["context","Context Engine","Current page, widget, selection, workspace, services, dashboard, preferences and recent activity."],
    ["memory","Memory Engine","Transparent editable memory for layouts, prompts, providers, plugins, widgets and routines."],
    ["insight","Insight Engine","Productivity, tasks, habits, GitHub, Discord, Spotify, marketplace and automation opportunities."],
    ["automation","Automation Engine","Detects repetitive behavior and proposes approved automations instead of silent scripts."],
    ["recommendation","Recommendation Engine","Widgets, layouts, workspace creation, themes, icon packs, providers and marketplace packs."],
    ["workspace","Workspace Engine","Work, Gaming, Streaming, Study, Developer and Personal mode awareness."],
    ["search","Search Engine","Natural-language search across widgets, files, notes, tasks, habits, profiles and conversations."],
    ["action","Action Engine","Tasks, notes, widgets, workspace switching, focus sessions, summaries and dashboard changes."],
    ["provider","Provider Engine","OpenAI, Claude, Groq, Gemini, OpenRouter, DeepSeek, Mistral, Ollama and future providers."],
    ["plugin","Plugin Engine","GitHub, Discord, Spotify, Weather, Calendar, Gmail, Drive, VS Code, OBS, Twitch and Home Assistant."],
    ["vision","Vision Engine","Images, PDFs, screenshots, charts, diagrams, documents and code screenshots."],
    ["voice","Voice Engine","Speech to text, text to speech, push to talk, wake word and streaming voice."],
    ["future","Future Layer","MCP, local AI, reasoning models, agentic workflows, cloud, offline and edge AI."]
  ];
  function workspaceMode(){
    const page=activePage();
    const text=(document.body?.innerText||"").toLowerCase();
    const h=new Date().getHours();
    if(page==="gaming"||/steam|valorant|twitch|discord/.test(text)&&h>=18)return "Gaming";
    if(page==="github"||/vscode|commit|pull request|repository/.test(text)||["todos","calendar","stats"].includes(page))return "Developer";
    if(page==="notes"||/study|revision|school|lecture/.test(text))return "Study";
    if(/obs|stream|twitch/.test(text))return "Streaming";
    if(h>=8&&h<18)return "Work";
    return "Personal";
  }
  function routeIntent(input){
    const text=String(input||"").toLowerCase();
    const modules=["core"];
    if(/search|find|open|where|trouve|cherche/.test(text))modules.push("search");
    if(/remember|memory|prefer|style|layout|souviens/.test(text))modules.push("memory");
    if(/why|trend|insight|analyze|analyse|productivity|habit|github|spotify|discord/.test(text))modules.push("insight");
    if(/automate|automation|routine|every morning|every evening|workflow/.test(text))modules.push("automation");
    if(/recommend|suggest|marketplace|widget|theme|provider|plugin/.test(text))modules.push("recommendation");
    if(/workspace|gaming|study|developer|streaming|work mode/.test(text))modules.push("workspace");
    if(/create|install|switch|start|modify|archive|delete|generate/.test(text))modules.push("action");
    if(/provider|model|openai|claude|groq|gemini|ollama|mistral/.test(text))modules.push("provider");
    if(/plugin|github|discord|spotify|calendar|gmail|drive|obs|twitch/.test(text))modules.push("plugin");
    if(/image|pdf|screenshot|chart|diagram|photo|vision/.test(text))modules.push("vision");
    if(/voice|speak|dictate|microphone|wake word/.test(text))modules.push("voice");
    const unique=[...new Set(modules)];
    const route={id:Date.now()+Math.random(),ts:Date.now(),input:String(input||"").slice(0,240),modules:unique,context:facts(),workspace:workspaceMode()};
    state.routes.push(route);
    if(state.routes.length>100)state.routes=state.routes.slice(-100);
    save();
    renderPlatform();
    return route;
  }
  function requiresPermission(text){
    return /delete|archive|install|modify|change layout|switch workspace|create automation|connect provider|remove|reset/i.test(String(text||""));
  }
  function queuePermission(action,reason){
    const item={id:Date.now()+Math.random(),ts:Date.now(),action,reason,status:"pending"};
    state.permissions.push(item);
    if(state.permissions.length>40)state.permissions=state.permissions.slice(-40);
    save();
    renderPermissions();
    return item;
  }
  function insights(){
    const f=facts();
    const arr=[
      ["Context is complete","Brain sees "+f.pageLabel+", "+f.widgets+" widgets, "+f.todosOpen+" open tasks and "+f.notes+" notes."],
      ["Workspace mode",workspaceMode()+" recommendations are active because Brain observes page, services and routine signals."],
      ["Automation opportunity",state.behavior.length>=4?"Repeated navigation patterns are available for automation review.":"Brain is collecting behavior before suggesting automation."],
      ["Provider abstraction",f.providers?f.providers+" provider configuration(s) are available behind Brain Core.":"Connect providers in AI Core; Brain will hide provider switching."]
    ];
    if(f.habits)arr.push(["Habit consistency",f.habits+" habit signal(s) can improve morning and evening routines."]);
    return arr.slice(0,5);
  }
  function recommendations(){
    const mode=workspaceMode();
    const f=facts();
    const arr=[];
    if(mode==="Developer")arr.push(["Developer Workspace","Because Brain sees developer/work context, group GitHub, notes, tasks and calendar into one workspace.","prepare developer workspace"]);
    if(mode==="Gaming")arr.push(["Gaming Workspace","Because gaming or Discord signals are active, group Discord, Spotify, Steam and recap widgets.","prepare gaming workspace"]);
    if(f.todosOpen>=3)arr.push(["Task automation","Because several tasks are open, Brain can create a recurring priority review.","create task review automation"]);
    if(f.notes>=3)arr.push(["Note intelligence","Because notes are accumulating, Brain can summarize and extract tasks.","summarize notes"]);
    arr.push(["Marketplace pack","Because Brain knows your workspace, it can recommend widgets and automation packs without ads.","recommend marketplace pack"]);
    return arr.slice(0,5);
  }
  function platformHTML(){
    return '<section class="bp35-platform" id="bp35-platform">'+
      '<div class="bp35-panel bp35-hero">'+
        '<div class="bp35-top"><div><div class="bp35-kicker">ETHONE Brain Platform</div><div class="bp35-title">One Brain. Many specialized engines.</div><div class="bp35-copy">Brain Core routes every request across context, memory, insight, automation, recommendation, workspace, search, action, provider, plugin, vision and voice modules while keeping one unified experience.</div></div><div class="bp35-orchestrator" id="bp35-mode">Orchestrating</div></div>'+
        '<div class="bp35-engine-grid" id="bp35-engine-grid"></div>'+
      '</div>'+
      '<aside class="bp35-side">'+
        '<section class="bp35-panel bp35-section"><div class="bp35-head"><div><div class="bp35-h">Live Context Engine</div><div class="bp35-sub">Current operating-system context without asking the user to repeat it.</div></div><button class="bp35-btn" data-bp35-refresh type="button">Refresh</button></div><div class="bp35-list" id="bp35-context"></div></section>'+
        '<section class="bp35-panel bp35-section"><div class="bp35-head"><div><div class="bp35-h">Permission System</div><div class="bp35-sub">Important actions wait for user approval.</div></div></div><div class="bp35-list" id="bp35-permissions"></div></section>'+
      '</aside>'+
      '<section class="bp35-panel bp35-section bp35-wide"><div class="bp35-head"><div><div class="bp35-h">Engine Output Matrix</div><div class="bp35-sub">Insights, recommendations and future-ready capabilities generated by specialized engines.</div></div><button class="bp35-btn primary" data-bp35-route-demo type="button">Route current context</button></div><div class="bp35-matrix" id="bp35-matrix"></div></section>'+
    '</section>';
  }
  function ensurePlatform(){
    const page=$("#page-ai");
    if(!page||$("#bp35-platform",page))return;
    const topbar=page.querySelector(".topbar");
    if(topbar&&topbar.nextSibling)topbar.insertAdjacentHTML("afterend",platformHTML());
    else page.insertAdjacentHTML("afterbegin",platformHTML());
  }
  function renderPlatform(){
    const grid=$("#bp35-engine-grid");
    if(grid){
      const last=state.routes[state.routes.length-1];
      grid.innerHTML=engines.map(e=>{
        const active=last&&last.modules.includes(e[0]);
        return '<button class="bp35-engine" type="button" data-bp35-engine="'+escape(e[0])+'"><strong>'+escape(e[1])+'</strong><span>'+escape(e[2])+'</span><small>'+(active?"Active route":"Ready")+'</small></button>';
      }).join("");
    }
    const mode=$("#bp35-mode");
    if(mode)mode.textContent="Mode: "+workspaceMode();
    renderContext();
    renderPermissions();
    renderMatrix();
    const eyebrow=$("#page-ai [data-i18n='ai_powered_by']");
    if(eyebrow)eyebrow.textContent="Brain Intelligence Platform";
  }
  function renderContext(){
    const host=$("#bp35-context");
    if(!host)return;
    const f=facts();
    const rows=[
      ["Current page",f.pageLabel],
      ["Workspace mode",workspaceMode()],
      ["Selected text",f.selected?f.selected.slice(0,90):"None"],
      ["Widgets",f.widgets],
      ["Installed widgets",Object.keys(f.installedWidgets||{}).filter(k=>f.installedWidgets[k]).join(", ")||"Default"],
      ["AI providers",f.providers],
      ["Plugins",f.plugins],
      ["Memory items",f.memory]
    ];
    host.innerHTML=rows.map(r=>'<div class="bp35-row"><strong>'+escape(r[0])+'</strong><span>'+escape(r[1])+'</span></div>').join("");
  }
  function renderPermissions(){
    const host=$("#bp35-permissions");
    if(!host)return;
    const list=state.permissions.slice(-5).reverse();
    host.innerHTML=list.length?list.map(p=>'<div class="bp35-row bp35-permission"><strong>'+escape(p.action)+'</strong><span>'+escape(p.reason)+' / '+escape(p.status)+'</span><div class="bp35-actions"><button class="bp35-btn primary" data-bp35-approve="'+p.id+'" type="button">Approve</button><button class="bp35-btn" data-bp35-deny="'+p.id+'" type="button">Deny</button></div></div>').join(""):'<div class="bp35-row"><strong>No pending permission</strong><span>Brain will ask before installing, deleting, archiving, modifying dashboards or creating automations.</span></div>';
  }
  function renderMatrix(){
    const host=$("#bp35-matrix");
    if(!host)return;
    const last=state.routes[state.routes.length-1];
    const matrix=[
      ["Brain Core",last?"Routed through "+last.modules.join(", "):"Awaiting a user command or context route."],
      ["Insight Engine",insights().map(x=>x[0]).join(", ")],
      ["Recommendation Engine",recommendations().map(x=>x[0]).join(", ")],
      ["Automation Engine",state.behavior.length>=4?"Repeated behavior available for review.":"Collecting routine signals."],
      ["Provider Engine",(facts().providers||0)+" provider layer(s) configured behind AI Core."],
      ["Plugin Engine",(facts().plugins||0)+" plugin signal(s), future Gmail, Drive, OBS, Twitch and Home Assistant ready."],
      ["Vision Engine","Prepared for images, PDFs, screenshots, charts, diagrams and documents."],
      ["Voice Engine","Prepared for speech to text, text to speech, push to talk and wake word."],
      ["Future Layer","MCP, local AI, reasoning models, agentic workflows, offline and edge AI ready."]
    ];
    host.innerHTML=matrix.map(m=>'<div class="bp35-row"><strong>'+escape(m[0])+'</strong><span>'+escape(m[1])+'</span></div>').join("");
  }
  function runEngine(id){
    const map={
      core:"Explain how Brain Core would orchestrate the current ETHONE context into one unified response.",
      context:"Summarize the live ETHONE context and identify what the user should not need to explain again.",
      memory:"Show transparent memory suggestions and ask what should be remembered or removed.",
      insight:"Generate insights from productivity, tasks, habits, workspace usage and connected services.",
      automation:"Detect repeated behavior and propose automations that require approval.",
      recommendation:"Recommend widgets, marketplace downloads, layouts, themes, icon packs, plugins and providers with reasons.",
      workspace:"Adapt recommendations to the active workspace mode.",
      search:"Search across ETHONE using natural language and explain matching areas.",
      action:"Propose executable actions and identify which require permission.",
      provider:"Choose the best AI provider route while hiding technical complexity.",
      plugin:"Suggest relevant plugins and how they connect through Brain Core.",
      vision:"Explain how image, PDF, screenshot, chart and document understanding would integrate here.",
      voice:"Prepare a voice interaction plan that keeps the same context as text.",
      future:"Explain how MCP, local AI, reasoning models and agentic workflows fit without redesign."
    };
    sendToBrain(map[id]||map.core);
  }
  function sendToBrain(text){
    const route=routeIntent(text);
    if(requiresPermission(text))queuePermission(text,"This action could modify ETHONE data, install something or change the workspace.");
    const prompt="ETHONE Brain Platform request. Route through modules: "+route.modules.join(", ")+". Workspace mode: "+route.workspace+".\n\nUser request: "+text+"\n\nContext snapshot: "+JSON.stringify(route.context).slice(0,2800)+"\n\nReturn one unified Brain response. Mention modules only if it helps clarity. Ask before important changes.";
    if(activePage()!=="ai"&&typeof window.switchPage==="function"){
      try{window.switchPage("ai",null)}catch(e){}
    }
    setTimeout(()=>{
      const input=$("#ai-input");
      if(input){
        input.value=prompt;
        input.style.height="auto";
        input.style.height=Math.min(input.scrollHeight,180)+"px";
        if(typeof window.sendAIMessage==="function")window.sendAIMessage();
      }
    },170);
  }
  function patchCore(){
    if(!window.ETHONEAICore||window.ETHONEAICore.__brainPlatform35Patched)return;
    const old=window.ETHONEAICore.complete;
    if(typeof old!=="function")return;
    window.ETHONEAICore.complete=function(input,opts){
      const route=routeIntent(input);
      if(requiresPermission(input))queuePermission(String(input).slice(0,160),"Brain Platform permission gate detected a potentially modifying action.");
      const prefix="ETHONE Brain Platform 3.5 directive: Brain is an intelligence platform, not one model or chatbot. Brain Core orchestrates specialized engines: Context, Memory, Insight, Automation, Recommendation, Workspace, Search, Action, Provider, Plugin, Vision, Voice and Future Layer. The user should only experience one coherent Brain. Hide provider complexity, use permissions for actions, preserve Supabase/profile/workspace compatibility and explain why recommendations matter.\n\nSelected modules: "+route.modules.join(", ")+". Workspace mode: "+route.workspace+".\n\n";
      return old.call(this,prefix+String(input||""),opts);
    };
    window.ETHONEAICore.__brainPlatform35Patched=true;
  }
  function patchSearch(){
    if(typeof window.getCmdItems==="function"&&!window.getCmdItems.__brainPlatform35Wrapped){
      const old=window.getCmdItems;
      window.getCmdItems=function(q){
        const res=old.apply(this,arguments);
        const text=String(q||"").trim();
        if(text.length>1){
          const route=routeIntent(text);
          const item={icon:"BP",label:"Brain Platform route: "+text,sub:"Modules: "+route.modules.join(", "),tag:"Brain Platform",action:()=>{if(typeof window.closeCmdPalette==="function")window.closeCmdPalette();sendToBrain(text)}};
          res.actions=[item].concat(res.actions||[]);
          res.all=[item].concat(res.all||[]);
        }
        return res;
      };
      window.getCmdItems.__brainPlatform35Wrapped=true;
    }
  }
  function patchNavigation(){
    if(typeof window.switchPage==="function"&&!window.switchPage.__brainPlatform35Wrapped){
      const old=window.switchPage;
      window.switchPage=function(){
        const from=activePage();
        const r=old.apply(this,arguments);
        setTimeout(()=>{
          const to=activePage();
          if(from!==to){
            state.behavior.push({ts:Date.now(),from,to});
            if(state.behavior.length>140)state.behavior=state.behavior.slice(-140);
            save();
            if(state.behavior.length>=5&&state.behavior.slice(-5).filter(x=>x.to===to).length>=3){
              queuePermission("Create automation for opening "+pageLabel(to),"Brain noticed repeated navigation into this workspace.");
            }
          }
          if(shouldAutoRefresh())run();
        },120);
        return r;
      };
      window.switchPage.__brainPlatform35Wrapped=true;
    }
  }
  function handleClick(e){
    const engine=e.target.closest("[data-bp35-engine]");
    if(engine){runEngine(engine.dataset.bp35Engine);return}
    if(e.target.closest("[data-bp35-refresh]")){renderPlatform();return}
    if(e.target.closest("[data-bp35-route-demo]")){routeIntent("Analyze current ETHONE context and recommend next platform action.");renderPlatform();return}
    const approve=e.target.closest("[data-bp35-approve]");
    if(approve){const p=state.permissions.find(x=>String(x.id)===String(approve.dataset.bp35Approve));if(p)p.status="approved";save();renderPermissions();return}
    const deny=e.target.closest("[data-bp35-deny]");
    if(deny){const p=state.permissions.find(x=>String(x.id)===String(deny.dataset.bp35Deny));if(p)p.status="denied";save();renderPermissions();return}
  }
  function rename(){
    const eyebrow=$("#page-ai [data-i18n='ai_powered_by']");
    if(eyebrow)eyebrow.textContent="Brain Intelligence Platform";
    $$(".aie-copilot-title").forEach(x=>x.textContent="ETHONE Brain Platform");
    $$(".aie-copilot-toggle").forEach(x=>{x.textContent="BP";x.title="Open ETHONE Brain Platform"});
  }
  function run(){
    ensurePlatform();
    renderPlatform();
    patchCore();
    patchSearch();
    patchNavigation();
    rename();
  }
  function startBrainPlatform35(){
    document.addEventListener("click",handleClick);
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
    setTimeout(run,350);
    setTimeout(run,1500);
    setInterval(()=>{if(shouldAutoRefresh())run();},30000);
  }
  if(window.ethoneRunWhenPageReady)window.ethoneRunWhenPageReady("brain-platform-35-runtime","ai",startBrainPlatform35);else startBrainPlatform35();
  window.ETHONEBrainPlatform={
    run,
    context:facts,
    route:routeIntent,
    send:sendToBrain,
    engines:()=>engines.slice(),
    memory:()=>state.memory,
    permissions:()=>state.permissions,
    insights,
    recommendations
  };
})();
