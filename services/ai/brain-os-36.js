/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE||window.__ethoneSkipBrain)return;
  if(window.__ethoneBrainOS36)return;
  window.__ethoneBrainOS36=true;
  const $=(s,r=document)=>r.querySelector(s);
  const storeKey="ethone:brain-os-36";
  const state=load();
  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(storeKey)||"{}");
      return {
        predictions:Array.isArray(saved.predictions)?saved.predictions:[],
        evolution:Array.isArray(saved.evolution)?saved.evolution:[],
        memory:Array.isArray(saved.memory)?saved.memory:[
          {id:"control",key:"User control",value:"Brain OS may recommend and prepare, but must ask before meaningful changes."},
          {id:"invisible",key:"Invisible layer",value:"Brain OS should feel like ETHONE understanding the user, not another app."},
          {id:"supabase",key:"Compatibility",value:"Respect profiles, settings, workspaces, widgets, Marketplace and Supabase data."}
        ],
        providerSignals:Array.isArray(saved.providerSignals)?saved.providerSignals:[]
      };
    }catch(e){
      return {predictions:[],evolution:[],memory:[],providerSignals:[]};
    }
  }
  function save(){
    localStorage.setItem(storeKey,JSON.stringify(state));
    const p=profile();
    if(p&&p.state){
      p.state.ethoneBrainOS36=Object.assign({},p.state.ethoneBrainOS36||{},{
        predictions:state.predictions.slice(-80),
        evolution:state.evolution.slice(-80),
        memory:state.memory,
        providerSignals:state.providerSignals.slice(-40),
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
    const habits=Array.isArray(s.habits)?s.habits:[];
    const events=Array.isArray(s.events)?s.events:[];
    const cfg=coreConfig();
    return {
      page:activePage(),
      pageLabel:pageLabel(activePage()),
      widgets:document.querySelectorAll(".panel,.stat-card,.conn-card,.game-card,.ethone-os2-card,.brain-widget").length,
      openTasks:todos.filter(t=>!t.done).length,
      doneTasks:todos.filter(t=>t.done).length,
      notes:notes.length,
      habits:habits.length,
      events:events.length,
      providers:Object.keys(cfg.providers||{}).filter(k=>cfg.providers[k]?.enabled!==false).length,
      plugins:Object.keys(cfg.plugins||{}).filter(k=>cfg.plugins[k]).length,
      memory:(cfg.memory||[]).length+state.memory.length,
      workspace:localStorage.getItem("ethone:dashboard-os2")||"",
      selected:String(window.getSelection&&window.getSelection()||"").trim().slice(0,900),
      theme:document.documentElement.getAttribute("data-theme")||localStorage.getItem("nexus_theme")||""
    };
  }
  const engines=[
    ["core","Brain Core","Intent, global context, permissions, Supabase sync, AI Core communication, conversations, routing and unified responses."],
    ["memory","Memory Engine","Long-term memory explicitly authorized by the user, visible, editable and removable."],
    ["vision","Vision Engine","Images, PDFs, screenshots, charts, diagrams, code screenshots, documents and future camera input."],
    ["automation","Automation Engine","Repetitive workflows, habits, approved automations, workspace preparation and recurring reports."],
    ["insight","Insight Engine","Productivity, tasks, habits, GitHub, Spotify, Discord, marketplace, workspace and dashboard usage."],
    ["planner","Planner Engine","Tasks, projects, calendar, goals, habits, deadlines, meetings and focus sessions."],
    ["marketplace","Marketplace Intelligence","Widgets, layouts, themes, extensions, plugins, automation packs, icon packs and community templates."],
    ["context","Context Engine","Current page, widget, workspace, dashboard, profile, services, files, selection, theme, automation and activity."],
    ["provider","Provider Manager","Groq, OpenAI, Claude, Gemini, OpenRouter, DeepSeek, Mistral, Ollama, LM Studio and future providers."],
    ["prediction","Prediction Engine","Anticipates work sessions, gaming sessions, workflow repetition, widget usage and workspace needs."],
    ["evolution","Brain Evolution","Improves over time while staying quiet, explainable and under user control."]
  ];
  function mode(){
    const page=activePage();
    const h=new Date().getHours();
    /* Scoped to the active page's textContent, not document.body.innerText: with ~18 pages
       simultaneously present in the DOM (hidden via CSS, not removed), .innerText on body forces
       a full layout/visibility resolution across all of them every call — confirmed via live
       testing to be expensive enough (called from run() at 350ms/1500ms/every 30s/every click)
       to make the whole tab appear hung. textContent skips layout entirely. */
    const activeEl=document.querySelector(".tab-content.active");
    const text=(activeEl?activeEl.textContent:"").toLowerCase();
    if(page==="gaming"||/steam|valorant|twitch|discord/.test(text)&&h>=18)return "Gaming";
    if(page==="github"||/vscode|commit|repository|pull request/.test(text))return "Developer";
    if(page==="notes"||/study|revision|school|lecture/.test(text))return "Study";
    if(h>=8&&h<18)return "Work";
    return "Personal";
  }
  function predict(){
    const f=facts();
    const out=[];
    if(mode()==="Work"||mode()==="Developer")out.push(["Prepare Work Workspace","Brain OS predicts you may need tasks, notes, calendar and GitHub grouped next.","workspace"]);
    if(mode()==="Gaming")out.push(["Prepare Gaming Workspace","Brain OS sees gaming signals and can prepare Discord, Spotify, Steam and recap widgets.","workspace"]);
    if(f.openTasks>=3)out.push(["Priority planning","Several tasks are open, so Planner Engine should propose a better order.","planner"]);
    if(f.habits)out.push(["Habit protection","Habits are active; Brain OS can remind without interrupting.","insight"]);
    if(f.providers<1)out.push(["Provider setup","Provider Manager can help configure AI Core while keeping provider choices invisible later.","provider"]);
    out.push(["Marketplace fit","Marketplace Intelligence can suggest content before the user searches for it.","marketplace"]);
    state.predictions=out.map((p,i)=>({id:i,ts:Date.now(),title:p[0],body:p[1],engine:p[2]}));
    save();
    return state.predictions;
  }
  function evolve(){
    const f=facts();
    const entries=[
      ["Routine understanding",mode()+" mode is inferred from page, time, widgets and activity."],
      ["Layout learning",f.widgets+" visible widget signals help Brain OS understand dashboard organization."],
      ["Memory discipline",f.memory+" memory item(s) remain visible and editable."],
      ["Provider abstraction",f.providers+" provider layer(s) can be hidden behind Brain OS routing."],
      ["Control preserved","Predictions are explainable and never apply important changes silently."]
    ];
    state.evolution=entries.map((e,i)=>({id:i,ts:Date.now(),title:e[0],body:e[1]}));
    save();
    return state.evolution;
  }
  function osHTML(){
    return '<section class="bos36-shell" id="bos36-shell">'+
      '<div class="bos36-panel bos36-hero">'+
        '<div class="bos36-top"><div><div class="bos36-kicker">Brain OS</div><div class="bos36-title">The invisible intelligence layer of ETHONE.</div><div class="bos36-copy">Brain OS coordinates specialized engines through ETHONE AI Core, Supabase-aware profiles, workspaces, widgets, Marketplace, connected services and future extensions while presenting one seamless experience.</div></div><div class="bos36-state" id="bos36-state">Operating quietly</div></div>'+
        '<div class="bos36-engine-map" id="bos36-engine-map"></div>'+
      '</div>'+
      '<aside class="bos36-side">'+
        '<section class="bos36-panel bos36-section"><div class="bos36-head"><div><div class="bos36-h">Prediction Engine</div><div class="bos36-sub">Anticipates needs without taking control.</div></div><button class="bos36-btn" data-bos36-predict type="button">Predict</button></div><div class="bos36-list" id="bos36-predictions"></div></section>'+
        '<section class="bos36-panel bos36-section"><div class="bos36-head"><div><div class="bos36-h">Brain Memory</div><div class="bos36-sub">Explicit, editable and removable.</div></div><button class="bos36-btn primary" data-bos36-memory type="button">Add</button></div><div class="bos36-list" id="bos36-memory"></div></section>'+
      '</aside>'+
      '<section class="bos36-panel bos36-section bos36-wide"><div class="bos36-head"><div><div class="bos36-h">Brain Evolution Matrix</div><div class="bos36-sub">How ETHONE becomes more intelligent over time without becoming intrusive.</div></div><button class="bos36-btn primary" data-bos36-route type="button">Route OS Context</button></div><div class="bos36-matrix" id="bos36-evolution"></div></section>'+
    '</section>';
  }
  function ensureOS(){
    const page=$("#page-ai");
    if(!page||$("#bos36-shell",page))return;
    const topbar=page.querySelector(".topbar");
    if(topbar&&topbar.nextSibling)topbar.insertAdjacentHTML("afterend",osHTML());
    else page.insertAdjacentHTML("afterbegin",osHTML());
  }
  function render(){
    ensureOS();
    const stateEl=$("#bos36-state");
    if(stateEl)stateEl.textContent="Mode: "+mode();
    const map=$("#bos36-engine-map");
    if(map){
      map.innerHTML=engines.map(e=>'<article class="bos36-engine"><strong>'+escape(e[1])+'</strong><span>'+escape(e[2])+'</span><small>'+statusFor(e[0])+'</small></article>').join("");
    }
    renderPredictions();
    renderMemory();
    renderEvolution();
    const eyebrow=$("#page-ai [data-i18n='ai_powered_by']");
    if(eyebrow)eyebrow.textContent="Brain OS";
  }
  function statusFor(id){
    const f=facts();
    if(id==="provider")return f.providers?"Routed":"Ready";
    if(id==="memory")return f.memory+" memories";
    if(id==="prediction")return state.predictions.length?"Predicting":"Ready";
    if(id==="planner")return f.openTasks+" tasks";
    if(id==="context")return f.pageLabel;
    return "Online";
  }
  function renderPredictions(){
    const host=$("#bos36-predictions");
    if(!host)return;
    const list=state.predictions.length?state.predictions:predict();
    host.innerHTML=list.map(p=>'<div class="bos36-row bos36-prediction"><strong>'+escape(p.title)+'</strong><span>'+escape(p.body)+'</span><div class="bos36-actions"><button class="bos36-btn" data-bos36-send="'+escape(p.title)+'" type="button">Ask Brain OS</button></div></div>').join("");
  }
  function renderMemory(){
    const host=$("#bos36-memory");
    if(!host)return;
    host.innerHTML=state.memory.map(m=>'<div class="bos36-row bos36-memory"><strong>'+escape(m.key)+'</strong><span>'+escape(m.value)+'</span><div class="bos36-actions"><button class="bos36-btn" data-bos36-edit-memory="'+escape(m.id)+'" type="button">Edit</button><button class="bos36-btn" data-bos36-remove-memory="'+escape(m.id)+'" type="button">Remove</button></div></div>').join("");
  }
  function renderEvolution(){
    const host=$("#bos36-evolution");
    if(!host)return;
    const list=state.evolution.length?state.evolution:evolve();
    host.innerHTML=list.map(e=>'<div class="bos36-row"><strong>'+escape(e.title)+'</strong><span>'+escape(e.body)+'</span></div>').join("");
  }
  function routeOS(text){
    const prompt="ETHONE Brain OS request: "+text+"\n\nBrain OS is the invisible intelligence layer, not a chatbot. Coordinate Brain Core, Memory, Vision, Automation, Insight, Planner, Marketplace Intelligence, Context, Provider Manager, Prediction and Evolution. Preserve Supabase/profile/workspace/widget compatibility. Explain predictions and ask before important changes.\n\nContext: "+JSON.stringify(facts()).slice(0,2800);
    if(window.ETHONEBrainPlatform?.send){
      window.ETHONEBrainPlatform.send(prompt);
      return;
    }
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
    if(!window.ETHONEAICore||window.ETHONEAICore.__brainOS36Patched)return;
    const old=window.ETHONEAICore.complete;
    if(typeof old!=="function")return;
    window.ETHONEAICore.complete=function(input,opts){
      const prefix="ETHONE Brain OS 3.6 directive: Brain must not evolve into a larger chatbot. Brain OS is the invisible intelligence operating platform of ETHONE. Coordinate Brain Core, Memory Engine, Vision Engine, Automation Engine, Insight Engine, Planner Engine, Marketplace Intelligence, Context Engine, Provider Manager, Prediction Engine and Brain Evolution. Users never choose engines manually. Preserve Supabase auth, profiles, widgets, Marketplace, Workspaces, settings, personalization and connected services. Predict needs explainably and keep the user in control.\n\nCurrent Brain OS mode: "+mode()+".\n\n";
      return old.call(this,prefix+String(input||""),opts);
    };
    window.ETHONEAICore.__brainOS36Patched=true;
  }
  function patchCommand(){
    if(typeof window.getCmdItems==="function"&&!window.getCmdItems.__brainOS36Wrapped){
      const old=window.getCmdItems;
      window.getCmdItems=function(q){
        const res=old.apply(this,arguments);
        const text=String(q||"").trim();
        if(text.length>1){
          const item={icon:"OS",label:"Brain OS: "+text,sub:"Invisible intelligence layer with prediction, planning and provider routing",tag:"Brain OS",action:()=>{if(typeof window.closeCmdPalette==="function")window.closeCmdPalette();routeOS(text)}};
          res.actions=[item].concat(res.actions||[]);
          res.all=[item].concat(res.all||[]);
        }
        return res;
      };
      window.getCmdItems.__brainOS36Wrapped=true;
    }
  }
  function handleClick(e){
    if(e.target.closest("[data-bos36-predict]")){predict();renderPredictions();return}
    if(e.target.closest("[data-bos36-route]")){routeOS("Analyze current ETHONE state and explain what Brain OS should prepare next.");return}
    const send=e.target.closest("[data-bos36-send]");
    if(send){routeOS(send.dataset.bos36Send);return}
    if(e.target.closest("[data-bos36-memory]")){
      const value=prompt("What should Brain OS remember with your permission?");
      if(value){state.memory.push({id:Date.now(),key:"User-authorized memory",value:value.slice(0,260)});save();renderMemory();}
      return;
    }
    const edit=e.target.closest("[data-bos36-edit-memory]");
    if(edit){
      const item=state.memory.find(m=>String(m.id)===String(edit.dataset.bos36EditMemory));
      if(item){const value=prompt("Edit Brain OS memory",item.value);if(value!==null){item.value=value.slice(0,260);save();renderMemory();}}
      return;
    }
    const remove=e.target.closest("[data-bos36-remove-memory]");
    if(remove){state.memory=state.memory.filter(m=>String(m.id)!==String(remove.dataset.bos36RemoveMemory));save();renderMemory();return}
  }
  function rename(){
    const title=$("#page-ai .section-title");
    if(title)title.innerHTML='ETHONE <span>Brain OS</span>';
    const input=$("#ai-input");
    if(input)input.placeholder="Ask Brain OS to prepare, remember, predict, organize or optimize ETHONE...";
    $$(".aie-copilot-title").forEach(x=>x.textContent="ETHONE Brain OS");
    $$(".aie-copilot-toggle").forEach(x=>{x.textContent="OS";x.title="Open ETHONE Brain OS"});
  }
  function run(){
    render();
    patchCore();
    patchCommand();
    rename();
  }
  function startBrainOS36(){
    document.addEventListener("click",handleClick);
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
    setTimeout(run,350);
    setTimeout(run,1500);
    setInterval(run,30000);
  }
  if(window.ethoneRunWhenPageReady)window.ethoneRunWhenPageReady("brain-os-36-runtime","ai",startBrainOS36);else startBrainOS36();
  window.ETHONEBrainOS={
    run,
    facts,
    predict,
    evolve,
    route:routeOS,
    engines:()=>engines.slice(),
    memory:()=>state.memory,
    mode
  };
})();
