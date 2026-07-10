/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE)return;
  if(window.__ethoneAIEverywhere)return;
  window.__ethoneAIEverywhere=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const MAX_VISIBLE_SUGGESTIONS=1;
  const MAX_TRACKED_SUGGESTIONS=80;
  const state={lastContext:null,lastSelection:"",messages:[],pendingAction:null,suggestions:new Set(),recentSuggestions:new Map(),started:false,lastRun:0,workflowHooks:false};
  function diag(label,error){
    try{
      window.__ethoneAIEverywhereDiagnostics=(window.__ethoneAIEverywhereDiagnostics||[]).slice(-30);
      window.__ethoneAIEverywhereDiagnostics.push({label:label,message:error&&error.message?error.message:String(error||""),at:new Date().toISOString()});
    }catch(e){}
  }
  function lang(){return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}
  function isFR(){return lang()==="fr"}
  function profileState(){try{const p=typeof window.curP==="function"?window.curP():null;return p&&p.state?p.state:{}}catch(e){return {}}}
  function osSnapshot(){try{return window.ETHONEOSContext&&typeof window.ETHONEOSContext.snapshot==="function"?window.ETHONEOSContext.snapshot():null}catch(e){return null}}
  function activePage(){const os=osSnapshot();return os&&os.page&&os.page.id?os.page.id:(document.querySelector(".tab-content.active")?.id?.replace("page-","")||"dashboard")}
  function hasCanonicalBrainStrip(page){return !!(page&&page.querySelector(".brain-everywhere-strip"))}
  function pageLabel(page){const map={dashboard:"ETHONE Home",files:"Files",notes:"Notes",todos:"Tasks",habits:"Habits",kanban:"Kanban",calendar:"Calendar",stats:"Statistics",settings:"Settings",connections:"Connections",gaming:"Gaming",github:"GitHub",marketplace:"Marketplace",store:"Store",workspaces:"Workspaces",timeline:"Timeline","command-center":"Command Center",ai:"AI Core",goals:"Goals",journal:"Journal",countdown:"Countdowns","valorant-accounts":"Valorant Accounts",databases:"Databases"};return map[page]||page}
  function facts(){
    const os=osSnapshot();
    if(os&&os.facts){
      const f=os.facts;
      return {
        openTodos:f.tasks&&f.tasks.open||0,
        doneTodos:f.tasks&&f.tasks.done||0,
        notes:f.notes&&f.notes.total||0,
        files:f.files&&f.files.total||0,
        habits:f.habits&&f.habits.total||0,
        events:f.calendar&&f.calendar.total||0,
        quickNote:profileState().note||"",
        integrations:f.integrations&&f.integrations.connected||0,
        providers:f.ai&&f.ai.providers||0
      };
    }
    const s=profileState();
    const todos=Array.isArray(s.todos)?s.todos:[];
    const notes=Array.isArray(s.notes)?s.notes:[];
    const items=Array.isArray(s.items)?s.items:[];
    const habits=Array.isArray(s.habits)?s.habits:[];
    const events=Array.isArray(s.events)?s.events:[];
    return {openTodos:todos.filter(t=>!t.done).length,doneTodos:todos.filter(t=>t.done).length,notes:notes.length,files:items.length,habits:habits.length,events:events.length,quickNote:s.note||""};
  }
  function contextFromElement(el){
    const page=activePage();
    const selected=String(window.getSelection&&window.getSelection()||"").trim();
    let kind="page", label=pageLabel(page), text="";
    const target=el?.closest?.(".todo-item,.item-row,.note-item,.panel,.stat-card,.conn-card,.game-card,.journal-entry,.countdown-card,.goal-card,.kanban-card,.ethone-os2-card,.ethone-pos-context-card");
    if(target){kind=target.className.split(" ")[0]||"widget";label=(target.innerText||label).replace(/\s+/g," ").slice(0,90);text=(target.innerText||"").slice(0,600)}
    if(selected){kind="selection";label=isFR()?"Texte selectionne":"Selected text";text=selected.slice(0,1200)}
    if(page==="notes"){
      const title=$("#note-title-input,#note-title")?.value||$(".note-title.active,.note-item.active")?.innerText||"Current note";
      const body=$("#note-content,#main-note,.note-area")?.value||"";
      label=title; text=body.slice(0,1800)||text;
    }
    if(page==="todos")text=(profileState().todos||[]).map(t=>(t.done?"[x] ":"[ ] ")+(t.text||"")).join("\n").slice(0,1800)||text;
    if(page==="calendar")text=(profileState().events||[]).map(e=>(e.date||"")+" "+(e.time||"")+" - "+(e.title||e.name||"Event")).join("\n").slice(0,1800)||text;
    if(page==="files")text=(profileState().items||[]).map(i=>(i.type||"file")+": "+(i.name||i.title||i.url||"Untitled")).join("\n").slice(0,1800)||text;
    if(page==="valorant-accounts")text=(profileState().valorantAccounts||profileState().databases?.valorantAccounts||[]).map(a=>(a.name||a.username||"Account")+" "+(a.tag||a.rank||"")).join("\n").slice(0,1800)||text;
    if(page==="gaming")text=JSON.stringify(profileState().gaming||profileState().connections||{}).slice(0,1800)||text;
    if(page==="github")text=JSON.stringify(profileState().connections?.github||{}).slice(0,1800)||text;
    var workspace="";
    try{workspace=window.ETHONEWorkspaces&&window.ETHONEWorkspaces.active?window.ETHONEWorkspaces.active():localStorage.getItem("ethone:dashboard-os2")||""}catch(e){workspace=localStorage.getItem("ethone:dashboard-os2")||""}
    const os=osSnapshot();
    return {page,kind,label,text,selected,facts:facts(),workspace:os&&os.workspace?os.workspace:workspace,mode:os&&os.mode?os.mode:null,summary:os&&os.summary?os.summary:""};
  }
  function actionDefs(page){
    const common=[
      ["ask","✨ AI","Ask about this page"],
      ["summarize",isFR()?"Resumer":"Summarize","Summarize current context"]
    ];
    const map={
      dashboard:[["briefing",isFR()?"Briefing du jour":"Daily briefing","Create an ETHONE Home briefing"],["recommend-widgets",isFR()?"Recommander widgets":"Recommend widgets","Suggest useful widgets"],["optimize-home",isFR()?"Optimiser Home":"Optimize Home","Suggest a better dashboard layout"]],
      todos:[["prioritize",isFR()?"Prioriser les taches":"Prioritize tasks","Prioritize current tasks"],["subtasks",isFR()?"Generer sous-taches":"Generate subtasks","Split selected task"],["estimate",isFR()?"Estimer effort":"Estimate effort","Estimate effort and timing"]],
      notes:[["summarize-note",isFR()?"Resumer la note":"Summarize note","Summarize current note"],["rewrite",isFR()?"Ameliorer":"Improve","Improve selected/current note"],["correct",isFR()?"Corriger":"Correct","Correct writing"],["action-items",isFR()?"Extraire actions":"Extract actions","Extract action items"],["title",isFR()?"Generer titre":"Generate title","Generate a title"]],
      files:[["classify",isFR()?"Classer":"Classify","Suggest organization"],["summarize-file",isFR()?"Resumer fichier":"Summarize file","Summarize selected file"],["find-notes",isFR()?"Relier aux notes":"Link to notes","Find related notes/files"]],
      calendar:[["optimize-schedule",isFR()?"Optimiser planning":"Optimize schedule","Suggest better schedule"],["conflicts",isFR()?"Detecter conflits":"Detect conflicts","Find scheduling conflicts"],["plan-week",isFR()?"Planifier semaine":"Plan week","Suggest better planning"]],
      stats:[["insights",isFR()?"Expliquer tendances":"Explain trends","Explain charts and trends"],["anomalies",isFR()?"Detecter anomalies":"Detect anomalies","Find anomalies"]],
      settings:[["explain-settings",isFR()?"Expliquer options":"Explain settings","Explain this settings page"],["safe-config",isFR()?"Configurer avec aide":"Configure safely","Suggest safe configuration"]],
      connections:[["integration-help",isFR()?"Aider integration":"Integration help","Explain integration setup"],["sync-health",isFR()?"Verifier sync":"Check sync","Check connected service health"]],
      marketplace:[["recommend-market",isFR()?"Recommander widgets":"Recommend widgets","Recommend widgets based on habits"],["gaming-setup",isFR()?"Setup gaming":"Gaming setup","Create gaming widget setup"]],
      store:[["theme-advice",isFR()?"Conseiller theme":"Theme advice","Recommend themes and layouts"]],
      workspaces:[["workspace-ai",isFR()?"Suggestions workspace":"Workspace suggestions","Suggest workspace setup"]],
      gaming:[["gaming-summary",isFR()?"Resumer session":"Summarize session","Summarize gaming/activity signals"],["gaming-organize",isFR()?"Organiser gaming":"Organize gaming","Organize gaming accounts and sessions"]],
      "valorant-accounts":[["valorant-organize",isFR()?"Organiser comptes":"Organize accounts","Organize Valorant accounts"],["valorant-review",isFR()?"Analyser comptes":"Review accounts","Review account quality and missing data"]],
      goals:[["goal-plan",isFR()?"Plan objectif":"Goal plan","Turn goals into steps"],["goal-risk",isFR()?"Detecter risques":"Detect risks","Detect goal risks"]],
      journal:[["journal-summary",isFR()?"Resumer journal":"Summarize journal","Summarize journal entries"],["journal-actions",isFR()?"Extraire actions":"Extract actions","Extract useful actions"]],
      databases:[["database-structure",isFR()?"Structurer base":"Structure database","Improve database structure"],["database-cleanup",isFR()?"Nettoyer donnees":"Clean data","Find duplicates and cleanup ideas"]]
    };
    return [common[0]].concat(map[page]||[],common[1]).slice(0,6);
  }
  function promptForAction(action,ctx){
    const base="Context page: "+ctx.page+"\nContext kind: "+ctx.kind+"\nLabel: "+ctx.label+"\nData: "+(ctx.text||JSON.stringify(ctx.facts));
    const prompts={
      ask:"Answer contextually and suggest the next useful action.\n"+base,
      summarize:"Summarize this ETHONE context clearly.\n"+base,
      "summarize-note":"Summarize the current note. Extract key ideas, decisions and next actions. Do not modify the note unless confirmed.\n"+base,
      briefing:"Create a beautiful morning/evening ETHONE briefing with tasks, calendar, habits and widget recommendations.\n"+base,
      "recommend-widgets":"Recommend ETHONE widgets, plugins and automations for this user. Do not install anything.\n"+base,
      "optimize-home":"Suggest a better dashboard layout for this workspace. Preview changes conceptually and ask for confirmation before applying.\n"+base,
      prioritize:"Prioritize these tasks, detect overdue/important work, and suggest an order.\n"+base,
      subtasks:"Split the selected/current task into clear subtasks. Do not create them unless explicitly confirmed.\n"+base,
      estimate:"Estimate effort, time blocks and risk for these tasks.\n"+base,
      rewrite:"Rewrite the selected/current note in a clearer style.\n"+base,
      correct:"Correct spelling, grammar and clarity while preserving the user's voice. Return a proposed version only.\n"+base,
      translate:"Translate the selected/current text to the user's active language or English if already French.\n"+base,
      "action-items":"Extract actionable tasks from this note and propose them for confirmation.\n"+base,
      title:"Generate 5 strong note titles.\n"+base,
      classify:"Classify files/links and suggest folders/tags.\n"+base,
      "summarize-file":"Summarize the selected/current file or link. If content is not available, infer from metadata and suggest tags/folders.\n"+base,
      "explain-file":"Explain this selected file/link and propose organization.\n"+base,
      "find-notes":"Find likely related notes/files from the visible context and suggest search terms.\n"+base,
      conflicts:"Detect scheduling conflicts and suggest a calmer plan.\n"+base,
      "optimize-schedule":"Optimize the visible calendar. Suggest focus blocks, buffers and a calmer order. Ask before changing events.\n"+base,
      "plan-week":"Create a weekly planning suggestion using tasks/events/habits.\n"+base,
      insights:"Explain productivity/statistics trends in plain language.\n"+base,
      anomalies:"Detect anomalies or unexpected patterns in stats.\n"+base,
      "explain-settings":"Explain the visible settings and recommend safe choices.\n"+base,
      "safe-config":"Suggest safe configuration changes. Ask before applying anything.\n"+base,
      "integration-help":"Explain how to connect or improve the visible integration. Include status, risks and next action.\n"+base,
      "sync-health":"Check integration health from visible/local state and recommend fixes without calling external APIs.\n"+base,
      "recommend-market":"Recommend Marketplace widgets based on this workspace and habits.\n"+base,
      "gaming-setup":"Recommend a Gaming workspace setup with Discord, Spotify, Steam, Valorant and Twitch.\n"+base,
      "theme-advice":"Recommend themes, icon packs, wallpapers and layouts.\n"+base,
      "workspace-ai":"Suggest workspace-specific AI automations and widgets.\n"+base,
      "gaming-summary":"Summarize gaming, Discord, Spotify and session signals.\n"+base,
      "gaming-organize":"Organize gaming accounts, sessions and connected services. Suggest a clean structure.\n"+base,
      "valorant-organize":"Organize Valorant accounts. Group accounts, detect missing fields, suggest tags and priorities.\n"+base,
      "valorant-review":"Review Valorant accounts and identify missing data, duplicates, risky notes or useful categories.\n"+base,
      "goal-plan":"Turn current goals into a practical plan with milestones, habits and next session.\n"+base,
      "goal-risk":"Detect blocked or vague goals and suggest concrete fixes.\n"+base,
      "journal-summary":"Summarize the journal context into moods, recurring topics and useful next actions.\n"+base,
      "journal-actions":"Extract tasks, reminders, events and habits from journal entries. Ask before creating anything.\n"+base,
      "database-structure":"Improve this database structure. Suggest properties, views, filters and relations.\n"+base,
      "database-cleanup":"Find cleanup opportunities, duplicates, missing fields and better organization.\n"+base
    };
    return prompts[action]||prompts.ask;
  }
  function localAnswer(prompt,ctx){
    const f=(ctx&&ctx.facts)||facts();
    const page=(ctx&&ctx.page)||activePage();
    const text=String(prompt||"").toLowerCase();
    const lines=[];
    if(isFR()){
      lines.push("Je peux t'aider avec cette page **"+pageLabel(page)+"**.");
      if(/subtask|sous-t/.test(text))lines.push("Proposition: découper la tâche en 3 à 5 étapes, identifier le premier geste concret, puis créer les sous-tâches seulement après confirmation.");
      else if(/briefing|journ/.test(text))lines.push("Briefing: "+f.openTodos+" tâche(s) ouverte(s), "+f.events+" événement(s), "+f.notes+" note(s), "+f.files+" fichier(s). Priorité: choisir une seule action principale maintenant.");
      else if(/note|résum|resume|summary/.test(text))lines.push("Je peux résumer, extraire les décisions, puis proposer des tâches ou événements liés à cette note.");
      else if(/file|fichier|import/.test(text))lines.push("Je peux classer cet élément, proposer des tags et préparer un résumé dès qu'un contenu lisible est disponible.");
      else lines.push("Actions possibles: résumer, analyser, organiser, rechercher, créer ou améliorer ce contexte.");
      lines.push("Connecte un provider dans ETHONE AI Core pour obtenir une réponse générative complète.");
    }else{
      lines.push("I can help with this **"+pageLabel(page)+"** context.");
      if(/subtask/.test(text))lines.push("Suggestion: split the task into 3 to 5 steps, identify the first concrete move, then create subtasks only after confirmation.");
      else if(/briefing|day/.test(text))lines.push("Briefing: "+f.openTodos+" open task(s), "+f.events+" event(s), "+f.notes+" note(s), "+f.files+" file(s). Priority: choose one main action now.");
      else if(/note|summary|summar/.test(text))lines.push("I can summarize, extract decisions, then propose related tasks or events.");
      else if(/file|import/.test(text))lines.push("I can classify this item, suggest tags and prepare a summary when readable content is available.");
      else lines.push("Available actions: summarize, analyze, organize, search, create or improve this context.");
      lines.push("Connect a provider in ETHONE AI Core for a full generative answer.");
    }
    return lines.join("\n\n");
  }
  async function askCore(prompt,opts={}){
    if(!window.ETHONEAICore||typeof window.ETHONEAICore.complete!=="function"){
      return {content:localAnswer(prompt,state.lastContext||contextFromElement(document.activeElement)),provider:"ethone-local",model:"brain-os-fallback",latency:0};
    }
    return window.ETHONEAICore.complete(prompt,opts);
  }
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function saveProfile(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function rememberSignal(type,payload){
    const p=profile();if(!p||!p.state)return;
    if(!p.state.brainSignals)p.state.brainSignals=[];
    p.state.brainSignals.unshift(Object.assign({type,ts:new Date().toISOString(),page:activePage()},payload||{}));
    p.state.brainSignals=p.state.brainSignals.slice(0,40);
    saveProfile();
  }
  function ensureCopilot(){
    if($("#aie-copilot"))return;
    const btn=document.createElement("button");
    btn.id="aie-copilot-toggle";
    btn.className="aie-copilot-toggle";
    btn.type="button";
    btn.textContent="✨ AI";
    btn.title=isFR()?"Ouvrir l'IA contextuelle":"Open contextual AI";
    document.body.appendChild(btn);
    const panel=document.createElement("aside");
    panel.id="aie-copilot";
    panel.className="aie-copilot";
    panel.innerHTML='<div class="aie-copilot-head"><div><div class="aie-copilot-title">✨ ETHONE AI</div><div class="aie-copilot-sub" id="aie-copilot-sub">Context aware</div></div><button class="aie-copilot-close" type="button" data-aie-close>×</button></div><div class="aie-copilot-body"><div class="aie-context-card"><strong id="aie-context-title">Current context</strong><span id="aie-context-body">Open ETHONE AI from any page to summarize, improve, correct, organize or create from context.</span></div><div class="aie-page-actions" id="aie-copilot-actions"></div><div class="aie-copilot-log" id="aie-copilot-log"></div></div><div class="aie-copilot-input"><textarea id="aie-copilot-input" placeholder="Ask ETHONE AI about this page..." rows="1"></textarea><button type="button" data-aie-send>↑</button></div>';
    document.body.appendChild(panel);
  }
  function openCopilot(ctx,prompt){
    ensureCopilot();
    state.lastContext=ctx||contextFromElement(document.activeElement);
    $("#aie-copilot")?.classList.add("open");
    renderCopilot();
    if(prompt){$("#aie-copilot-input").value=prompt;sendCopilot()}
  }
  function closeCopilot(){$("#aie-copilot")?.classList.remove("open")}
  function renderCopilot(){
    const ctx=state.lastContext||contextFromElement(document.activeElement);
    $("#aie-copilot-sub")&&( $("#aie-copilot-sub").textContent=pageLabel(ctx.page)+" / "+ctx.kind );
    $("#aie-context-title")&&( $("#aie-context-title").textContent=ctx.label||pageLabel(ctx.page) );
    $("#aie-context-body")&&( $("#aie-context-body").textContent=(ctx.text||contextSummary(ctx)).slice(0,260) );
    const host=$("#aie-copilot-actions");
    if(host)host.innerHTML=actionDefs(ctx.page).map(([id,label])=>'<button class="aie-chip '+(id==="ask"?"primary":"")+'" type="button" data-aie-action="'+id+'">'+label+'</button>').join("");
    const log=$("#aie-copilot-log");
    if(log)log.innerHTML=state.messages.slice(-8).map(m=>'<div class="aie-msg '+m.role+'">'+escape(m.text)+'</div>').join("");
  }
  function contextSummary(ctx){return "Open tasks: "+ctx.facts.openTodos+" / Notes: "+ctx.facts.notes+" / Files: "+ctx.facts.files+" / Habits: "+ctx.facts.habits}
  async function sendCopilot(){
    if(state.pendingAction==="send")return;
    const input=$("#aie-copilot-input");
    const text=input?.value.trim();
    if(!text)return;
    state.pendingAction="send";
    try{
      input.value="";
      const ctx=state.lastContext||contextFromElement(document.activeElement);
      state.messages.push({role:"user",text});
      try{renderCopilot()}catch(error){diag("copilot render",error)}
      const result=await askCore(text+"\n\nCurrent ETHONE context:\n"+JSON.stringify({page:ctx.page,kind:ctx.kind,label:ctx.label,text:ctx.text,facts:ctx.facts}).slice(0,2400),{allowLocalIntent:true});
      state.messages.push({role:"assistant",text:result.content||"No response."});
    }catch(e){
      state.messages.push({role:"assistant",text:"ETHONE AI Core could not answer yet: "+(e.message||e)});
      console.error("[ETHONE AI Everywhere] copilot request failed",e);
    }finally{
      state.pendingAction=null;
      try{renderCopilot()}catch(error){diag("copilot final render",error)}
    }
  }
  function ensurePageActions(){
    $$(".tab-content[data-qa-page='true']").forEach(page=>{
      let bar=$(".aie-page-actions[data-aie-page-actions]",page);
      if(hasCanonicalBrainStrip(page)){
        if(bar)bar.remove();
        page.dataset.aieActions="canonical";
        return;
      }
      if(page.dataset.aieActions)return;
      page.dataset.aieActions="1";
      const id=page.id.replace("page-","");
      bar=document.createElement("div");
      bar.className="aie-page-actions";
      bar.setAttribute("data-aie-page-actions",id);
      bar.innerHTML=actionDefs(id).slice(0,4).map(([aid,label])=>'<button class="aie-chip '+(aid==="ask"?"primary":"")+'" type="button" data-aie-page-action="'+aid+'">'+label+'</button>').join("");
      const topbar=$(".topbar",page)||$(".ethone-os2-page-hero",page)||page.firstElementChild;
      if(topbar&&topbar.nextSibling)topbar.parentNode.insertBefore(bar,topbar.nextSibling);
      else page.prepend(bar);
    });
  }
  function ensureHomeInsights(){
    const page=$("#page-dashboard");
    if(!page||$("#aie-home-insights",page))return;
    const section=document.createElement("section");
    section.id="aie-home-insights";
    section.className="aie-home-insights";
    const f=facts();
    section.innerHTML=[
      ["AI Briefing",f.openTodos?f.openTodos+" open task(s) need attention. Ask AI to build a calm plan.":"Your task list is quiet. Ask AI for a useful next step.","briefing"],
      ["Suggested Actions","Review habits, upcoming events and the widgets that matter for this workspace.","optimize-home"],
      ["Widget Recommendations","AI can recommend widgets, layouts, themes and automations without installing silently.","recommend-widgets"]
    ].map(c=>'<article class="aie-insight-card"><div class="aie-insight-kicker">ETHONE AI</div><div class="aie-insight-title">'+c[0]+'</div><div class="aie-insight-body">'+c[1]+'</div><button class="aie-chip primary" type="button" data-aie-page-action="'+c[2]+'">✨ AI</button></article>').join("");
    const anchor=$("#ethone-os2-ops-grid",page)||$("#ethone-pos-context",page)||$(".stats-row",page);
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(section,anchor);
    else page.prepend(section);
  }
  function ensureSuggestionStack(){
    let stack=$("#aie-suggestion-stack");
    if(!stack){
      stack=document.createElement("div");
      stack.id="aie-suggestion-stack";
      stack.className="aie-suggestion-stack";
    }
    const page=$(".tab-content.active");
    if(page){
      const anchor=$(".aie-page-bar",page)||page.firstElementChild;
      if(anchor&&anchor.parentNode===page)anchor.insertAdjacentElement("afterend",stack);
      else if(stack.parentNode!==page)page.prepend(stack);
    }else if(!stack.parentNode){
      document.body.appendChild(stack);
    }
    return stack;
  }
  function trimSuggestionStack(stack,incomingId){
    if(!stack)return;
    const incomingIsPageHelp=String(incomingId||"").indexOf("page-help-")===0;
    Array.from(stack.querySelectorAll(".aie-suggestion-card")).forEach(function(card){
      const currentId=String(card.dataset.aieSuggestion||"");
      if(incomingIsPageHelp&&currentId.indexOf("page-help-")===0){
        state.suggestions.delete(currentId);
        card.remove();
      }
    });
    const cards=Array.from(stack.querySelectorAll(".aie-suggestion-card"));
    cards.slice(Math.max(0,MAX_VISIBLE_SUGGESTIONS-1)).forEach(function(card){
      state.suggestions.delete(String(card.dataset.aieSuggestion||""));
      card.remove();
    });
  }
  function emitSuggestion(options){
    const opt=options||{};
    const id=opt.id||("sig-"+Date.now());
    if(state.suggestions.has(id)||state.recentSuggestions.has(id))return;
    state.suggestions.add(id);
    state.recentSuggestions.set(id,Date.now());
    while(state.recentSuggestions.size>MAX_TRACKED_SUGGESTIONS){
      state.recentSuggestions.delete(state.recentSuggestions.keys().next().value);
    }
    const stack=ensureSuggestionStack();
    trimSuggestionStack(stack,id);
    const card=document.createElement("article");
    card.className="aie-suggestion-card";
    card.dataset.aieSuggestion=id;
    const actions=Array.isArray(opt.actions)?opt.actions.slice(0,4):[];
    const actionHTML=actions.length?'<div class="aie-suggestion-actions aie-suggestion-options">'+actions.map(function(action,i){
      return '<button type="button" class="aie-chip" data-aie-suggestion-option="'+escape(id)+'" data-aie-option-index="'+i+'">'+escape(action.label||"Action")+'</button>';
    }).join("")+'</div>':"";
    card.innerHTML='<div class="aie-suggestion-top"><span>Brain OS</span><button type="button" data-aie-dismiss="'+escape(id)+'">×</button></div><strong>'+escape(opt.title||"Suggestion ETHONE")+'</strong><p>'+escape(opt.body||"Brain has a contextual suggestion.")+'</p>'+actionHTML+'<div class="aie-suggestion-actions"><button type="button" class="aie-chip primary" data-aie-suggestion-ask="'+escape(id)+'">'+escape(opt.primaryLabel||"Ask ETHONE")+'</button><button type="button" class="aie-chip" data-aie-suggestion-hide="'+escape(id)+'">'+escape(opt.secondaryLabel||"Later")+'</button></div>';
    card.__aiePrompt=opt.prompt||opt.body||"Help me with this ETHONE context.";
    card.__aieContext=opt.context||contextFromElement(document.activeElement);
    card.__aieActions=actions;
    stack?.prepend(card);
    setTimeout(()=>card.classList.add("visible"),20);
    if(opt.autoHide!==false)setTimeout(()=>dismissSuggestion(id),opt.ttl||18000);
  }
  function dismissSuggestion(id){
    const card=document.querySelector('[data-aie-suggestion="'+CSS.escape(String(id))+'"]');
    state.suggestions.delete(String(id));
    if(card){card.classList.remove("visible");setTimeout(()=>card.remove(),180);}
  }
  function dailyBriefing(){
    const p=profile();if(!p||!p.state)return;
    const today=new Date().toLocaleDateString("en-CA");
    if(p.state.brainLastBriefing===today)return;
    p.state.brainLastBriefing=today;
    saveProfile();
    const pageElement=$(".tab-content.active");
    if(activePage()!=="dashboard"||hasCanonicalBrainStrip(pageElement))return;
    const f=facts();
    emitSuggestion({
      id:"daily-briefing-"+today,
      title:isFR()?"Briefing du jour prêt":"Daily briefing is ready",
      body:isFR()?("Brain a analysé "+f.openTodos+" tâche(s), "+f.events+" événement(s), "+f.notes+" note(s) et ton contexte récent."):("Brain reviewed "+f.openTodos+" task(s), "+f.events+" event(s), "+f.notes+" note(s) and your recent context."),
      primaryLabel:isFR()?"Voir le briefing":"View briefing",
      prompt:"Create my ETHONE daily briefing. Include what I should do now, what changed today, what Brain recommends, tasks, events, notes, files and habits. Keep it concise and actionable.",
      context:{page:"dashboard",kind:"briefing",label:"Daily briefing",text:"Login daily briefing",facts:f}
    });
  }
  function taskCreatedSuggestion(todo){
    if(!todo||!todo.text)return;
    rememberSignal("task_created",{title:todo.text});
    emitSuggestion({
      id:"task-subtasks-"+todo.id,
      title:isFR()?"Créer des sous-tâches ?":"Create subtasks?",
      body:isFR()?("Brain peut découper « "+todo.text+" » en étapes claires."):("Brain can split “"+todo.text+"” into clear next steps."),
      primaryLabel:isFR()?"Générer":"Generate",
      actions:[
        {label:isFR()?"Sous-tâches":"Subtasks",prompt:"Generate practical subtasks for this task and ask before creating them. Task: "+todo.text},
        {label:isFR()?"Rappel":"Reminder",prompt:"Suggest a useful reminder for this task. Ask before creating it. Task: "+todo.text},
        {label:isFR()?"Planifier":"Schedule",prompt:"Suggest the best calendar slot or focus block for this task. Task: "+todo.text}
      ],
      prompt:"Generate practical subtasks for this task, estimate effort and suggest the best first step. Task: "+todo.text,
      context:{page:"todos",kind:"task",label:todo.text,text:JSON.stringify(todo),facts:facts()}
    });
  }
  function noteSuggestion(note){
    if(!note)return;
    const content=(note.content||"").trim();
    if(content.length<40)return;
    rememberSignal("note_updated",{title:note.title||"Note",words:content.split(/\s+/).length});
    emitSuggestion({
      id:"note-actions-"+note.id+"-"+Math.floor(Date.now()/300000),
      title:isFR()?"Transformer cette note ?":"Turn this note into actions?",
      body:isFR()?"Créer une tâche, un rappel, un événement ou préparer un partage depuis cette note.":"Create a task, reminder, event or shareable summary from this note.",
      primaryLabel:isFR()?"Voir options":"Show options",
      actions:[
        {label:isFR()?"Créer tâche":"Create task",prompt:"Extract one useful task from this note. Ask before creating it.\n\n"+content.slice(0,2200)},
        {label:isFR()?"Créer rappel":"Create reminder",prompt:"Extract a useful reminder from this note. Ask before creating it.\n\n"+content.slice(0,2200)},
        {label:isFR()?"Créer événement":"Create event",prompt:"Extract a possible calendar event from this note. Ask before creating it.\n\n"+content.slice(0,2200)},
        {label:isFR()?"Partager":"Share",prompt:"Create a clean shareable summary of this note.\n\n"+content.slice(0,2200)}
      ],
      prompt:"Analyze this note. Extract possible tasks, events, decisions and a short summary. Ask before creating anything.\n\nTitle: "+(note.title||"Note")+"\n\n"+content.slice(0,2500),
      context:{page:"notes",kind:"note",label:note.title||"Note",text:content.slice(0,2500),facts:facts()}
    });
  }
  function fileSuggestion(item){
    if(!item)return;
    rememberSignal("file_imported",{title:item.name,type:item.type});
    emitSuggestion({
      id:"file-summary-"+item.id,
      title:isFR()?"Résumé du fichier ?":"Summarize this item?",
      body:isFR()?("Brain peut résumer, classer et relier « "+item.name+" » à ton workspace."):("Brain can summarize, classify and connect “"+item.name+"” to your workspace."),
      primaryLabel:isFR()?"Résumer":"Summarize",
      actions:[
        {label:isFR()?"Classer":"Classify",prompt:"Classify this imported item and suggest tags/folders.\n\n"+JSON.stringify(item).slice(0,2200)},
        {label:isFR()?"Relier":"Link",prompt:"Suggest related notes, tasks or workspace areas for this item.\n\n"+JSON.stringify(item).slice(0,2200)},
        {label:isFR()?"Créer tâche":"Create task",prompt:"Suggest a task generated from this imported item. Ask before creating it.\n\n"+JSON.stringify(item).slice(0,2200)}
      ],
      prompt:"Summarize or classify this imported ETHONE item. If it is a link/file without readable contents, explain what can be inferred and suggest tags/folders.\n\n"+JSON.stringify(item).slice(0,2200),
      context:{page:"files",kind:"file",label:item.name||"Imported item",text:JSON.stringify(item).slice(0,2200),facts:facts()}
    });
  }
  function eventSuggestion(event){
    if(!event)return;
    rememberSignal("event_created",{title:event.title,date:event.date});
    emitSuggestion({
      id:"event-plan-"+event.id,
      title:isFR()?"Préparer cet événement ?":"Prepare this event?",
      body:isFR()?("Brain peut créer une tâche de préparation, un rappel ou un mini-plan pour « "+(event.title||"événement")+" »."):("Brain can create a prep task, reminder or mini-plan for “"+(event.title||"event")+"”."),
      primaryLabel:isFR()?"Préparer":"Prepare",
      actions:[
        {label:isFR()?"Tâche préparation":"Prep task",prompt:"Create a preparation task suggestion for this event. Ask before creating it.\n\n"+JSON.stringify(event)},
        {label:isFR()?"Rappel":"Reminder",prompt:"Suggest a reminder for this event. Ask before creating it.\n\n"+JSON.stringify(event)},
        {label:isFR()?"Plan":"Plan",prompt:"Create a concise preparation plan for this event.\n\n"+JSON.stringify(event)}
      ],
      prompt:"Help me prepare this ETHONE calendar event. Suggest prep tasks, reminders and possible conflicts. Ask before creating anything.\n\n"+JSON.stringify(event),
      context:{page:"calendar",kind:"event",label:event.title||"Event",text:JSON.stringify(event),facts:facts()}
    });
  }
  function goalSuggestion(goal){
    if(!goal)return;
    rememberSignal("goal_created",{title:goal.text});
    emitSuggestion({
      id:"goal-plan-"+goal.id,
      title:isFR()?"Transformer en plan ?":"Turn this into a plan?",
      body:isFR()?("Brain peut découper « "+(goal.text||"objectif")+" » en jalons, habitudes et prochaine session."):("Brain can split “"+(goal.text||"goal")+"” into milestones, habits and a next session."),
      primaryLabel:isFR()?"Planifier":"Plan",
      actions:[
        {label:isFR()?"Jalons":"Milestones",prompt:"Turn this goal into milestones and checkpoints. Goal: "+(goal.text||"")},
        {label:isFR()?"Habitude":"Habit",prompt:"Suggest one habit that supports this goal. Ask before creating it. Goal: "+(goal.text||"")},
        {label:isFR()?"Session":"Session",prompt:"Suggest the next focus session for this goal. Goal: "+(goal.text||"")}
      ],
      prompt:"Create an actionable plan for this goal with milestones, habits, next action and risk.\n\n"+JSON.stringify(goal),
      context:{page:"goals",kind:"goal",label:goal.text||"Goal",text:JSON.stringify(goal),facts:facts()}
    });
  }
  function habitSuggestion(habit){
    if(!habit)return;
    rememberSignal("habit_created",{title:habit.name});
    emitSuggestion({
      id:"habit-routine-"+habit.id,
      title:isFR()?"Ancrer cette habitude ?":"Anchor this habit?",
      body:isFR()?("Brain peut proposer un meilleur moment, un rappel et une routine autour de « "+(habit.name||"habitude")+" »."):("Brain can suggest a better time, reminder and routine around “"+(habit.name||"habit")+"”."),
      primaryLabel:isFR()?"Optimiser":"Optimize",
      actions:[
        {label:isFR()?"Rappel":"Reminder",prompt:"Suggest a reminder for this habit. Ask before creating it. Habit: "+(habit.name||"")},
        {label:isFR()?"Routine":"Routine",prompt:"Create a lightweight routine around this habit. Habit: "+(habit.name||"")},
        {label:isFR()?"Objectif":"Goal",prompt:"Suggest a goal linked to this habit. Ask before creating it. Habit: "+(habit.name||"")}
      ],
      prompt:"Help me make this habit stick. Suggest trigger, reminder, tracking and small improvements.\n\n"+JSON.stringify(habit),
      context:{page:"habits",kind:"habit",label:habit.name||"Habit",text:JSON.stringify(habit),facts:facts()}
    });
  }
  function journalSuggestion(entry){
    if(!entry)return;
    rememberSignal("journal_saved",{title:entry.title||entry.date});
    emitSuggestion({
      id:"journal-reflect-"+(entry.id||entry.date),
      title:isFR()?"Extraire quelque chose du journal ?":"Extract something from this journal?",
      body:isFR()?"Brain peut repérer tâches, rappels, événements ou tendances personnelles.":"Brain can spot tasks, reminders, events or personal patterns.",
      primaryLabel:isFR()?"Analyser":"Analyze",
      actions:[
        {label:isFR()?"Tâches":"Tasks",prompt:"Extract possible tasks from this journal entry. Ask before creating anything.\n\n"+(entry.text||"")},
        {label:isFR()?"Rappels":"Reminders",prompt:"Extract useful reminders from this journal entry. Ask before creating anything.\n\n"+(entry.text||"")},
        {label:isFR()?"Résumé":"Summary",prompt:"Summarize this journal entry and detect mood or recurring themes.\n\n"+(entry.text||"")}
      ],
      prompt:"Analyze this journal entry. Extract actions, reminders, events, mood and patterns. Ask before creating anything.\n\n"+JSON.stringify(entry),
      context:{page:"journal",kind:"journal",label:entry.title||"Journal",text:entry.text||"",facts:facts()}
    });
  }
  function integrationSuggestion(name,payload){
    const label=name||"integration";
    rememberSignal("integration_changed",{title:label});
    emitSuggestion({
      id:"integration-next-"+label+"-"+Math.floor(Date.now()/300000),
      title:isFR()?("Configurer "+label+" ?"):("Configure "+label+"?"),
      body:isFR()?"Brain peut proposer les widgets, automations et alertes utiles pour cette intégration.":"Brain can suggest useful widgets, automations and alerts for this integration.",
      primaryLabel:isFR()?"Configurer":"Configure",
      actions:[
        {label:"Widgets",prompt:"Recommend ETHONE widgets for this integration: "+label},
        {label:"Automation",prompt:"Suggest safe automations for this integration: "+label},
        {label:isFR()?"Santé":"Health",prompt:"Check local integration health and suggest next steps for: "+label}
      ],
      prompt:"This integration changed in ETHONE. Suggest useful widgets, automations and setup checks. Integration: "+label+"\n\n"+JSON.stringify(payload||{}).slice(0,1800),
      context:{page:"connections",kind:"integration",label:label,text:JSON.stringify(payload||{}).slice(0,1800),facts:facts()}
    });
  }
  function pageContextSuggestion(){
    const page=activePage();
    if(!page||page==="ai"||page==="dashboard")return;
    const pageElement=$(".tab-content.active");
    if(hasCanonicalBrainStrip(pageElement))return;
    const bucket=Math.floor(Date.now()/600000);
    const ctx=contextFromElement(document.activeElement);
    emitSuggestion({
      id:"page-help-"+page+"-"+bucket,
      title:isFR()?("ETHONE peut aider sur "+pageLabel(page)):("ETHONE can help on "+pageLabel(page)),
      body:isFR()?"Résumer, analyser, organiser, rechercher ou créer depuis le contexte de cette page.":"Summarize, analyze, organize, search or create from this page context.",
      primaryLabel:isFR()?"Ouvrir AI":"Open AI",
      actions:actionDefs(page).filter(function(a){return a[0]!=="ask"}).slice(0,3).map(function(a){return {label:a[1],prompt:promptForAction(a[0],ctx)}}),
      prompt:promptForAction("ask",ctx),
      context:ctx,
      ttl:12000
    });
  }
  function pomodoroSuggestion(){
    const f=facts();
    rememberSignal("pomodoro_completed",{openTodos:f.openTodos,doneTodos:f.doneTodos});
    emitSuggestion({
      id:"pomo-analysis-"+Date.now(),
      title:isFR()?"Session terminée":"Focus session complete",
      body:isFR()?"Brain peut analyser ta journée et proposer la prochaine action.":"Brain can analyze your day and suggest the next action.",
      primaryLabel:isFR()?"Analyser":"Analyze",
      prompt:"A Pomodoro/focus session just ended. Analyze my day so far, progress, open tasks, notes, habits and suggest what I should do next.",
      context:{page:"dashboard",kind:"pomodoro",label:"Focus session complete",text:"Pomodoro completed",facts:f}
    });
  }
  function wrapAfter(name,after){
    const fn=window[name];
    if(typeof fn!=="function"||fn.__aieHooked)return false;
    const wrapped=function(){
      let before;
      try{before=JSON.parse(JSON.stringify(profileState()))}catch(e){}
      const args=arguments;
      const result=fn.apply(this,args);
      Promise.resolve(result).catch(function(){}).then(function(){
        setTimeout(()=>{try{after(result,before,args)}catch(e){diag("hook "+name,e)}},80);
      });
      return result;
    };
    wrapped.__aieHooked=true;
    window[name]=wrapped;
    return true;
  }
  function installWorkflowHooks(){
    if(state.workflowHooks)return;
    state.workflowHooks=true;
    wrapAfter("addTodo",function(result,before){
      const todos=profileState().todos||[];
      const prevIds=new Set(((before&&before.todos)||[]).map(t=>t.id));
      const todo=todos.find(t=>!prevIds.has(t.id))||todos[0];
      taskCreatedSuggestion(todo);
    });
    wrapAfter("newNote",function(){
      const notes=profileState().notes||[];
      const note=notes[0];
      if(note)emitSuggestion({
        id:"new-note-help-"+note.id,
        title:isFR()?"Brain peut structurer cette note":"Brain can structure this note",
        body:isFR()?"Ajoute quelques lignes, puis Brain pourra proposer tâches, événements et résumé.":"Write a few lines, then Brain can suggest tasks, events and a summary.",
        primaryLabel:isFR()?"Ouvrir Ask ETHONE":"Open Ask ETHONE",
        prompt:"Help me structure this new note and suggest what information I should capture.",
        context:{page:"notes",kind:"note",label:note.title||"New note",text:"New empty note",facts:facts()}
      });
    });
    let noteTimer=0;
    wrapAfter("saveNote",function(){
      clearTimeout(noteTimer);
      noteTimer=setTimeout(function(){
        const notes=profileState().notes||[];
        const current=typeof window._currentNoteId!=="undefined"?window._currentNoteId:null;
        const note=notes.find(n=>n.id===current)||notes[0];
        noteSuggestion(note);
      },900);
    });
    wrapAfter("addItem",function(result,before){
      const items=profileState().items||[];
      const prevIds=new Set(((before&&before.items)||[]).map(i=>i.id));
      const item=items.find(i=>!prevIds.has(i.id))||items[0];
      fileSuggestion(item);
    });
    wrapAfter("addCalEvent",function(result,before){
      const events=profileState().events||[];
      const prevIds=new Set(((before&&before.events)||[]).map(e=>e.id));
      const event=events.find(e=>!prevIds.has(e.id))||events[events.length-1];
      eventSuggestion(event);
    });
    wrapAfter("addGoal",function(result,before){
      const goals=profileState().goals||[];
      const prevIds=new Set(((before&&before.goals)||[]).map(g=>g.id));
      const goal=goals.find(g=>!prevIds.has(g.id))||goals[0];
      goalSuggestion(goal);
    });
    wrapAfter("addHabit",function(result,before){
      const habits=profileState().habits||[];
      const prevIds=new Set(((before&&before.habits)||[]).map(h=>h.id));
      const habit=habits.find(h=>!prevIds.has(h.id))||habits[0];
      habitSuggestion(habit);
    });
    wrapAfter("addJournalEntry",function(){
      const entries=profileState().journal||[];
      journalSuggestion(entries[entries.length-1]||entries[0]);
    });
    ["connectDiscord","connectSpotify","connectGithub","connectGithubFromConnections","connectSteam","connectTwitch","connectValorant","connectLastFM"].forEach(function(name){
      wrapAfter(name,function(){
        integrationSuggestion(name.replace(/^connect/,""),profileState().connections||{});
      });
    });
    wrapAfter("savePomoSession",pomodoroSuggestion);
    wrapAfter("initDashboard",function(){setTimeout(function(){run({reason:"dashboard-init"});dailyBriefing();pageContextSuggestion()},900)});
  }
  function enhanceWidgets(){
    $$(".panel,.stat-card,.conn-card,.game-card,.settings-card,.ethone-os2-card").forEach((w,i)=>{
      if(w.dataset.aieWidget)return;
      w.dataset.aieWidget="1";
      const header=$(".panel-header,.ethone-os2-card-head",w)||w;
      const btn=document.createElement("button");
      btn.className="aie-widget-ai";
      btn.type="button";
      btn.setAttribute("data-aie-widget","ask");
      btn.textContent="✨ AI";
      if(header.classList.contains("panel-header")||header.classList.contains("ethone-os2-card-head"))header.appendChild(btn);
      else{
        btn.style.position="absolute";btn.style.top="10px";btn.style.right="10px";btn.style.zIndex="15";
        w.style.position=w.style.position||"relative";
        w.appendChild(btn);
      }
    });
  }
  function ensurePageAIButtons(){
    $$(".tab-content[data-qa-page='true']").forEach(page=>{
      const id=page.id.replace("page-","");
      if(id==="ai"||page.dataset.aieTopButton)return;
      page.dataset.aieTopButton="1";
      let actions=$(".topbar-actions",page);
      const topbar=$(".topbar",page);
      if(!actions&&topbar){
        actions=document.createElement("div");
        actions.className="topbar-actions";
        topbar.appendChild(actions);
      }
      if(!actions)return;
      const btn=document.createElement("button");
      btn.className="btn btn-primary aie-page-ai-button";
      btn.type="button";
      btn.setAttribute("data-aie-open-page",id);
      btn.textContent="✨ AI";
      btn.title=isFR()?"IA contextuelle pour "+pageLabel(id):"Contextual AI for "+pageLabel(id);
      actions.prepend(btn);
    });
  }
  function ensureContextMenu(){
    if($("#aie-context-menu"))return;
    const menu=document.createElement("div");
    menu.id="aie-context-menu";
    menu.className="aie-context-menu";
    document.body.appendChild(menu);
  }
  function showContextMenu(e){
    const target=e.target.closest(".todo-item,.item-row,.note-item,.panel,.stat-card,.conn-card,.game-card,.kanban-card,.cal-event,.journal-entry,.ethone-os2-card,textarea,input,[contenteditable='true']");
    const selected=String(window.getSelection&&window.getSelection()||"").trim();
    if(!target&&!selected)return;
    if(e.defaultPrevented)return;
    ensureContextMenu();
    const ctx=contextFromElement(target||e.target);
    state.lastContext=ctx;
    const actions=actionDefs(ctx.page).slice(0,5);
    const menu=$("#aie-context-menu");
    menu.innerHTML=actions.map(([id,label])=>'<button class="aie-menu-item" type="button" data-aie-context-action="'+id+'"><span>AI</span>'+label+'</button>').join("");
    menu.style.left=Math.min(e.clientX,window.innerWidth-260)+"px";
    menu.style.top=Math.min(e.clientY,window.innerHeight-260)+"px";
    menu.classList.add("open");
  }
  function hideContextMenu(){$("#aie-context-menu")?.classList.remove("open")}
  function commandIntent(q){
    const s=q.toLowerCase().trim();
    if(!s||s.length<3)return null;
    if(/^(create|add|make|summarize|explain|find|install|open|change|show|recommend|prioritize|rewrite|translate|organize|optimise|optimize|resume|explique|cree|ajoute|trouve|ouvre|installe|recommande)/.test(s))return s;
    return null;
  }
  function wrapCommandPalette(){
    if(typeof window.getCmdItems==="function"&&!window.getCmdItems.__aieWrapped){
      const oldGet=window.getCmdItems;
      window.getCmdItems=function(q){
        const res=oldGet.apply(this,arguments);
        const intent=commandIntent(q||"");
        if(intent){
          const aiItem={icon:"AI",label:"Ask ETHONE AI: "+q,sub:"Natural language command routed through AI Core",tag:"AI",action:()=>{if(typeof window.closeCmdPalette==="function")closeCmdPalette();openCopilot(contextFromElement(document.activeElement),q)}};
          res.actions=[aiItem].concat(res.actions||[]);
          res.all=[aiItem].concat(res.all||[]);
        }
        return res;
      };
      window.getCmdItems.__aieWrapped=true;
    }
    const input=$("#cmd-input");
    if(input&&!input.dataset.aieHint){
      input.dataset.aieHint="1";
      input.placeholder="Search or ask AI: summarize my day, create a task...";
    }
  }
  function applySafeIntent(text){
    const trusted=!!(window.ETHONEAICore?.config?.().privacy?.trustedActions);
    const lower=text.toLowerCase();
    if(/open gaming workspace|ouvre.*gaming/.test(lower)){
      var actions=window.Ethone&&window.Ethone.get&&window.Ethone.get("actions");
      if(actions&&actions.has("dashboard.nav.workspaces"))actions.dispatch("dashboard.nav.workspaces");
      else if(typeof window.switchPage==="function")switchPage("gaming",null);
      return true;
    }
    if(/install.*spotify|installe.*spotify/.test(lower)){
      if(!trusted&&!confirm("Install/enable Spotify widget recommendation locally?"))return true;
      try{
        const cfg=JSON.parse(localStorage.getItem("ethone:dashboard-os2")||"{}");
        cfg.installed=Object.assign({},cfg.installed,{spotify:true});
        localStorage.setItem("ethone:dashboard-os2",JSON.stringify(cfg));
        toast("Spotify widget enabled locally","success");
      }catch(e){}
      return true;
    }
    if(/create.*task|add.*task|cree.*tache|ajoute.*tache/.test(lower)){
      const task=text.replace(/^(create|add|make|cree|crée|ajoute)\s+(a\s+)?(task|tache|tâche)\s*(for)?/i,"").trim();
      if(task&&(!trusted&&!confirm("Create this task: "+task+" ?")))return true;
      if(task&&typeof AI_ACTIONS!=="undefined"&&AI_ACTIONS.create_task)AI_ACTIONS.create_task({text:task});
      return true;
    }
    return false;
  }
  function toast(msg,type){if(typeof window.toast==="function"){try{window.toast(msg,type||"info");return}catch(e){}}}
  function handleClick(e){
    try{
      if(e.target.closest("#aie-copilot-toggle")){openCopilot(contextFromElement(document.activeElement));return}
      if(e.target.closest("[data-aie-close]")){closeCopilot();return}
      if(e.target.closest("[data-aie-send]")){sendCopilot();return}
      const pageAction=e.target.closest("[data-aie-page-action]");
      if(pageAction){
        const ctx=contextFromElement(pageAction);
        const prompt=promptForAction(pageAction.dataset.aiePageAction,ctx);
        openCopilot(ctx,prompt);
        return;
      }
      const directPage=e.target.closest("[data-aie-open-page]");
      if(directPage){
        const ctx=contextFromElement(directPage);
        openCopilot(ctx,promptForAction("ask",ctx));
        return;
      }
      const panelAction=e.target.closest("[data-aie-action]");
      if(panelAction){
        const ctx=state.lastContext||contextFromElement(panelAction);
        const prompt=promptForAction(panelAction.dataset.aieAction,ctx);
        const input=$("#aie-copilot-input");
        if(input)input.value=prompt;
        sendCopilot();
        return;
      }
      const widget=e.target.closest("[data-aie-widget]");
      if(widget){
        const ctx=contextFromElement(widget);
        openCopilot(ctx,"Explain this widget and suggest one useful improvement.\n"+(ctx.text||ctx.label));
        return;
      }
      const menuAction=e.target.closest("[data-aie-context-action]");
      if(menuAction){
        const ctx=state.lastContext||contextFromElement(menuAction);
        hideContextMenu();
        openCopilot(ctx,promptForAction(menuAction.dataset.aieContextAction,ctx));
        return;
      }
      const suggestionAsk=e.target.closest("[data-aie-suggestion-ask]");
      if(suggestionAsk){
        const id=suggestionAsk.dataset.aieSuggestionAsk;
        const card=document.querySelector('[data-aie-suggestion="'+CSS.escape(String(id))+'"]');
        if(card){openCopilot(card.__aieContext||contextFromElement(card),card.__aiePrompt||"Help me with this.");dismissSuggestion(id);}
        return;
      }
      const suggestionOption=e.target.closest("[data-aie-suggestion-option]");
      if(suggestionOption){
        const id=suggestionOption.dataset.aieSuggestionOption;
        const idx=Number(suggestionOption.dataset.aieOptionIndex||0);
        const card=document.querySelector('[data-aie-suggestion="'+CSS.escape(String(id))+'"]');
        const action=card&&Array.isArray(card.__aieActions)?card.__aieActions[idx]:null;
        if(card&&action){
          openCopilot(card.__aieContext||contextFromElement(card),action.prompt||card.__aiePrompt||action.label||"Help me with this.");
          dismissSuggestion(id);
        }
        return;
      }
      const suggestionHide=e.target.closest("[data-aie-suggestion-hide],[data-aie-dismiss]");
      if(suggestionHide){
        dismissSuggestion(suggestionHide.dataset.aieSuggestionHide||suggestionHide.dataset.aieDismiss);
        return;
      }
      if(!e.target.closest("#aie-context-menu"))hideContextMenu();
    }catch(error){
      console.error("[ETHONE AI Everywhere] action failed",error);
      toast(error.message||"AI action failed","error");
    }
  }
  function patchCoreForSafeIntent(){
    if(!window.ETHONEAICore||window.ETHONEAICore.__aieIntentPatched)return;
    const oldComplete=window.ETHONEAICore.complete;
    window.ETHONEAICore.complete=async function(input,opts){
      if(opts?.allowLocalIntent&&applySafeIntent(String(input||"")))return {content:"Done. I handled that safely inside ETHONE.",provider:"ethone-local",model:"intent-router",latency:0};
      return oldComplete.apply(this,arguments);
    };
    window.ETHONEAICore.__aieIntentPatched=true;
  }
  function patchSwitchPage(){
    if(typeof window.switchPage==="function"&&!window.switchPage.__aieWrapped){
      const old=window.switchPage;
      window.switchPage=function(){
        const r=old.apply(this,arguments);
        const stack=$("#aie-suggestion-stack");
        if(stack){
          $$("[data-aie-suggestion^='page-help-']",stack).forEach(card=>{
            state.suggestions.delete(String(card.dataset.aieSuggestion||""));
            card.remove();
          });
          if(!stack.children.length)stack.remove();
        }
        setTimeout(function(){run({reason:"navigation"});pageContextSuggestion()},120);
        return r;
      };
      window.switchPage.__aieWrapped=true;
    }
  }
  function bindTimelineSuggestions(){
    if(window.__aieTimelineSuggestions)return;
    window.__aieTimelineSuggestions=true;
    window.addEventListener("ethone:timeline",function(e){
      try{
        const entry=e&&e.detail&&e.detail.entry;
        if(!entry)return;
        const title=String(entry.title||"");
        const category=String(entry.category||"");
        const source=String(entry.source||"");
        const raw=(title+" "+category+" "+source).toLowerCase();
        if(/note/.test(raw))pageContextSuggestion();
        else if(/task|todo|tache/.test(raw))emitSuggestion({
          id:"timeline-task-"+entry.id,
          title:isFR()?"Organiser cette tâche ?":"Organize this task?",
          body:isFR()?"Brain peut prioriser, planifier ou découper cette action.":"Brain can prioritize, schedule or split this action.",
          primaryLabel:isFR()?"Organiser":"Organize",
          actions:[
            {label:isFR()?"Prioriser":"Prioritize",prompt:"Prioritize this task/activity: "+title},
            {label:isFR()?"Planifier":"Schedule",prompt:"Suggest when to do this task/activity: "+title},
            {label:isFR()?"Sous-tâches":"Subtasks",prompt:"Split this task/activity into subtasks: "+title}
          ],
          prompt:"Help me organize this task/activity: "+title,
          context:{page:"todos",kind:"timeline",label:title,text:JSON.stringify(entry),facts:facts()},
          ttl:12000
        });
        else if(/github|discord|spotify|steam|twitch|valorant|integration|sync/.test(raw))integrationSuggestion(source||category||title,entry);
      }catch(error){diag("timeline suggestion",error)}
    });
  }
  function escape(s){return String(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
  function run(options){
    options=options||{};
    const now=Date.now();
    if(!options.force&&now-state.lastRun<180)return;
    state.lastRun=now;
    wrapCommandPalette();
    patchCoreForSafeIntent();
    patchSwitchPage();
    bindTimelineSuggestions();
    installWorkflowHooks();
    if(!profile()||document.documentElement.classList.contains("ethone-auth-mode")||document.documentElement.classList.contains("ethone-profile-mode"))return;
    ensureCopilot();
    if(activePage()==="ai")return;
    const activeSuggestionStack=$("#aie-suggestion-stack");
    if(activeSuggestionStack&&activeSuggestionStack.children.length)ensureSuggestionStack();
    ensurePageAIButtons();
    ensurePageActions();
    ensureHomeInsights();
    enhanceWidgets();
    ensureContextMenu();
  }
  function startAIEverywhere(){
    if(state.started)return;
    state.started=true;
    document.addEventListener("click",handleClick);
    // Native browser context menu remains enabled for production debugging and accessibility.
    document.addEventListener("keydown",e=>{
      if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="a"){e.preventDefault();openCopilot(contextFromElement(document.activeElement))}
      if(e.key==="Escape"){hideContextMenu()}
      if(e.key==="Enter"&&document.activeElement?.id==="aie-copilot-input"&&!e.shiftKey){e.preventDefault();sendCopilot()}
    });
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
    setTimeout(run,350);
    setTimeout(run,1400);
    setTimeout(()=>{installWorkflowHooks();dailyBriefing()},1800);
  }
  startAIEverywhere();
  window.ETHONEAIEverywhere={openCopilot,contextFromElement,askCore,run,emitSuggestion,dailyBriefing};
})();
