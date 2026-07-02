/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE||window.__ethoneSkipAIPreload)return;
  if(window.__ethoneAIEverywhere)return;
  window.__ethoneAIEverywhere=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const state={lastContext:null,lastSelection:"",messages:[],pendingAction:null};
  function lang(){return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}
  function isFR(){return lang()==="fr"}
  function profileState(){try{const p=typeof window.curP==="function"?window.curP():null;return p&&p.state?p.state:{}}catch(e){return {}}}
  function activePage(){return document.querySelector(".tab-content.active")?.id?.replace("page-","")||"dashboard"}
  function pageLabel(page){const map={dashboard:"ETHONE Home",files:"Files",notes:"Notes",todos:"Tasks",habits:"Habits",kanban:"Kanban",calendar:"Calendar",stats:"Statistics",settings:"Settings",connections:"Connections",gaming:"Gaming",github:"GitHub",marketplace:"Marketplace",store:"Store",workspaces:"Workspaces",timeline:"Timeline","command-center":"Command Center",ai:"AI Core"};return map[page]||page}
  function facts(){
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
    return {page,kind,label,text,selected,facts:facts(),workspace:localStorage.getItem("ethone:dashboard-os2")||""};
  }
  function actionDefs(page){
    const common=[
      ["ask",isFR()?"Demander a l'IA":"Ask AI","Ask about this page"],
      ["summarize",isFR()?"Resumer":"Summarize","Summarize current context"]
    ];
    const map={
      dashboard:[["briefing",isFR()?"Briefing du jour":"Daily briefing","Create an ETHONE Home briefing"],["recommend-widgets",isFR()?"Recommander widgets":"Recommend widgets","Suggest useful widgets"],["optimize-home",isFR()?"Optimiser Home":"Optimize Home","Suggest a better dashboard layout"]],
      todos:[["prioritize",isFR()?"Prioriser les taches":"Prioritize tasks","Prioritize current tasks"],["subtasks",isFR()?"Generer sous-taches":"Generate subtasks","Split selected task"],["estimate",isFR()?"Estimer effort":"Estimate effort","Estimate effort and timing"]],
      notes:[["rewrite",isFR()?"Reecrire":"Rewrite","Rewrite selected/current note"],["translate",isFR()?"Traduire":"Translate","Translate selected/current note"],["action-items",isFR()?"Extraire actions":"Extract actions","Extract action items"],["title",isFR()?"Generer titre":"Generate title","Generate a title"]],
      files:[["classify",isFR()?"Classer fichiers":"Classify files","Suggest organization"],["explain-file",isFR()?"Expliquer fichier":"Explain file","Explain selected file"],["find-notes",isFR()?"Chercher notes":"Find notes","Find related notes/files"]],
      calendar:[["conflicts",isFR()?"Detecter conflits":"Detect conflicts","Find scheduling conflicts"],["plan-week",isFR()?"Planifier semaine":"Plan week","Suggest better planning"]],
      stats:[["insights",isFR()?"Expliquer tendances":"Explain trends","Explain charts and trends"],["anomalies",isFR()?"Detecter anomalies":"Detect anomalies","Find anomalies"]],
      settings:[["explain-settings",isFR()?"Expliquer options":"Explain settings","Explain this settings page"],["safe-config",isFR()?"Configurer avec aide":"Configure safely","Suggest safe configuration"]],
      marketplace:[["recommend-market",isFR()?"Recommander widgets":"Recommend widgets","Recommend widgets based on habits"],["gaming-setup",isFR()?"Setup gaming":"Gaming setup","Create gaming widget setup"]],
      store:[["theme-advice",isFR()?"Conseiller theme":"Theme advice","Recommend themes and layouts"]],
      workspaces:[["workspace-ai",isFR()?"Suggestions workspace":"Workspace suggestions","Suggest workspace setup"]],
      gaming:[["gaming-summary",isFR()?"Resumer session":"Summarize session","Summarize gaming/activity signals"]]
    };
    return (map[page]||[]).concat(common).slice(0,6);
  }
  function promptForAction(action,ctx){
    const base="Context page: "+ctx.page+"\nContext kind: "+ctx.kind+"\nLabel: "+ctx.label+"\nData: "+(ctx.text||JSON.stringify(ctx.facts));
    const prompts={
      ask:"Answer contextually and suggest the next useful action.\n"+base,
      summarize:"Summarize this ETHONE context clearly.\n"+base,
      briefing:"Create a beautiful morning/evening ETHONE briefing with tasks, calendar, habits and widget recommendations.\n"+base,
      "recommend-widgets":"Recommend ETHONE widgets, plugins and automations for this user. Do not install anything.\n"+base,
      "optimize-home":"Suggest a better dashboard layout for this workspace. Preview changes conceptually and ask for confirmation before applying.\n"+base,
      prioritize:"Prioritize these tasks, detect overdue/important work, and suggest an order.\n"+base,
      subtasks:"Split the selected/current task into clear subtasks. Do not create them unless explicitly confirmed.\n"+base,
      estimate:"Estimate effort, time blocks and risk for these tasks.\n"+base,
      rewrite:"Rewrite the selected/current note in a clearer style.\n"+base,
      translate:"Translate the selected/current text to the user's active language or English if already French.\n"+base,
      "action-items":"Extract actionable tasks from this note and propose them for confirmation.\n"+base,
      title:"Generate 5 strong note titles.\n"+base,
      classify:"Classify files/links and suggest folders/tags.\n"+base,
      "explain-file":"Explain this selected file/link and propose organization.\n"+base,
      "find-notes":"Find likely related notes/files from the visible context and suggest search terms.\n"+base,
      conflicts:"Detect scheduling conflicts and suggest a calmer plan.\n"+base,
      "plan-week":"Create a weekly planning suggestion using tasks/events/habits.\n"+base,
      insights:"Explain productivity/statistics trends in plain language.\n"+base,
      anomalies:"Detect anomalies or unexpected patterns in stats.\n"+base,
      "explain-settings":"Explain the visible settings and recommend safe choices.\n"+base,
      "safe-config":"Suggest safe configuration changes. Ask before applying anything.\n"+base,
      "recommend-market":"Recommend Marketplace widgets based on this workspace and habits.\n"+base,
      "gaming-setup":"Recommend a Gaming workspace setup with Discord, Spotify, Steam, Valorant and Twitch.\n"+base,
      "theme-advice":"Recommend themes, icon packs, wallpapers and layouts.\n"+base,
      "workspace-ai":"Suggest workspace-specific AI automations and widgets.\n"+base,
      "gaming-summary":"Summarize gaming, Discord, Spotify and session signals.\n"+base
    };
    return prompts[action]||prompts.ask;
  }
  async function askCore(prompt,opts={}){
    if(!window.ETHONEAICore||typeof window.ETHONEAICore.complete!=="function"){
      throw new Error("ETHONE AI Core is not available yet.");
    }
    return window.ETHONEAICore.complete(prompt,opts);
  }
  function ensureCopilot(){
    if($("#aie-copilot"))return;
    const btn=document.createElement("button");
    btn.id="aie-copilot-toggle";
    btn.className="aie-copilot-toggle";
    btn.type="button";
    btn.textContent="AI";
    btn.title="Open ETHONE AI Copilot";
    document.body.appendChild(btn);
    const panel=document.createElement("aside");
    panel.id="aie-copilot";
    panel.className="aie-copilot";
    panel.innerHTML='<div class="aie-copilot-head"><div><div class="aie-copilot-title">ETHONE Copilot</div><div class="aie-copilot-sub" id="aie-copilot-sub">Context aware</div></div><button class="aie-copilot-close" type="button" data-aie-close>×</button></div><div class="aie-copilot-body"><div class="aie-context-card"><strong id="aie-context-title">Current context</strong><span id="aie-context-body">Open Copilot from any page to get contextual help.</span></div><div class="aie-page-actions" id="aie-copilot-actions"></div><div class="aie-copilot-log" id="aie-copilot-log"></div></div><div class="aie-copilot-input"><textarea id="aie-copilot-input" placeholder="Ask about this page..." rows="1"></textarea><button type="button" data-aie-send>↑</button></div>';
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
    if(host)host.innerHTML=actionDefs(ctx.page).map(([id,label])=>'<button class="aie-chip" type="button" data-aie-action="'+id+'">'+label+'</button>').join("");
    const log=$("#aie-copilot-log");
    if(log)log.innerHTML=state.messages.slice(-8).map(m=>'<div class="aie-msg '+m.role+'">'+escape(m.text)+'</div>').join("");
  }
  function contextSummary(ctx){return "Open tasks: "+ctx.facts.openTodos+" / Notes: "+ctx.facts.notes+" / Files: "+ctx.facts.files+" / Habits: "+ctx.facts.habits}
  async function sendCopilot(){
    const input=$("#aie-copilot-input");
    const text=input?.value.trim();
    if(!text)return;
    input.value="";
    const ctx=state.lastContext||contextFromElement(document.activeElement);
    state.messages.push({role:"user",text});
    renderCopilot();
    try{
      const result=await askCore(text+"\n\nCurrent ETHONE context:\n"+JSON.stringify({page:ctx.page,kind:ctx.kind,label:ctx.label,text:ctx.text,facts:ctx.facts}).slice(0,2400),{allowLocalIntent:true});
      state.messages.push({role:"assistant",text:result.content||"No response."});
    }catch(e){
      state.messages.push({role:"assistant",text:"ETHONE AI Core could not answer yet: "+(e.message||e)});
    }
    renderCopilot();
  }
  function ensurePageActions(){
    $$(".tab-content[data-qa-page='true']").forEach(page=>{
      if(page.dataset.aieActions)return;
      page.dataset.aieActions="1";
      const id=page.id.replace("page-","");
      const bar=document.createElement("div");
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
    ].map(c=>'<article class="aie-insight-card"><div class="aie-insight-kicker">ETHONE AI</div><div class="aie-insight-title">'+c[0]+'</div><div class="aie-insight-body">'+c[1]+'</div><button class="aie-chip primary" type="button" data-aie-page-action="'+c[2]+'">Ask AI</button></article>').join("");
    const anchor=$("#ethone-os2-ops-grid",page)||$("#ethone-pos-context",page)||$(".stats-row",page);
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(section,anchor);
    else page.prepend(section);
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
      btn.textContent="Ask AI";
      if(header.classList.contains("panel-header")||header.classList.contains("ethone-os2-card-head"))header.appendChild(btn);
      else{
        btn.style.position="absolute";btn.style.top="10px";btn.style.right="10px";btn.style.zIndex="15";
        w.style.position=w.style.position||"relative";
        w.appendChild(btn);
      }
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
    if(/open gaming workspace|ouvre.*gaming/.test(lower)){if(typeof window.switchPage==="function")switchPage("workspaces",null);return true}
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
  function toast(msg,type){if(typeof window.toast==="function"){try{window.toast(msg,type||"info");return}catch(e){}}console.log("[ETHONE AI Everywhere]",msg)}
  function handleClick(e){
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
    if(!e.target.closest("#aie-context-menu"))hideContextMenu();
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
        setTimeout(run,80);
        return r;
      };
      window.switchPage.__aieWrapped=true;
    }
  }
  function escape(s){return String(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
  function run(){
    ensureCopilot();
    ensurePageActions();
    ensureHomeInsights();
    enhanceWidgets();
    ensureContextMenu();
    wrapCommandPalette();
    patchCoreForSafeIntent();
    patchSwitchPage();
  }
  function startAIEverywhere(){
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
    setInterval(()=>{if(document.body)run()},20000);
  }
  if(window.ethoneRunWhenPageReady)window.ethoneRunWhenPageReady("ai-everywhere-runtime","ai",startAIEverywhere);else startAIEverywhere();
  window.ETHONEAIEverywhere={openCopilot,contextFromElement,askCore,run};
})();
