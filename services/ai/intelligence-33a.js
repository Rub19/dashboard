/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE||window.__ethoneSkipBrain)return;
  if(window.__ethoneIntelligence33A)return;
  window.__ethoneIntelligence33A=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const storeKey="ethone:intelligence-experience";
  const state={activity:loadActivity(),lastContext:null};
  function lang(){return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}
  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }
  function profileState(){
    const p=profile();
    return p&&p.state?p.state:{};
  }
  function activePage(){
    return document.querySelector(".tab-content.active")?.id?.replace("page-","")||"dashboard";
  }
  function pageLabel(id){
    const map={dashboard:"ETHONE Home",ai:"Intelligence Center",todos:"Tasks",notes:"Notes",files:"Files",habits:"Habits",calendar:"Calendar",github:"GitHub",marketplace:"Marketplace",store:"Store",workspaces:"Workspaces",timeline:"Timeline",settings:"Settings",connections:"Connections",stats:"Statistics",gaming:"Gaming","command-center":"Command Center"};
    return map[id]||String(id||"Workspace");
  }
  function facts(){
    const s=profileState();
    const todos=Array.isArray(s.todos)?s.todos:[];
    const habits=Array.isArray(s.habits)?s.habits:[];
    const events=Array.isArray(s.events)?s.events:[];
    const notes=Array.isArray(s.notes)?s.notes:[];
    const files=Array.isArray(s.items)?s.items:[];
    const done=todos.filter(t=>t.done).length;
    const open=todos.filter(t=>!t.done).length;
    const high=todos.filter(t=>!t.done&&String(t.priority||"").toLowerCase()==="high").length;
    const todayISO=new Date().toISOString().slice(0,10);
    const todayEvents=events.filter(e=>String(e.date||"").slice(0,10)===todayISO).length;
    return {open,done,high,habits:habits.length,events:events.length,todayEvents,notes:notes.length,files:files.length,connections:Object.keys(s.connections||{}).filter(k=>!!s.connections[k]).length};
  }
  function loadActivity(){
    try{return JSON.parse(localStorage.getItem(storeKey)||"{}").activity||[]}catch(e){return []}
  }
  function saveActivity(){
    localStorage.setItem(storeKey,JSON.stringify({activity:state.activity.slice(-40)}));
    const p=profile();
    if(p&&p.state){
      p.state.intelligenceExperience=Object.assign({},p.state.intelligenceExperience||{},{activity:state.activity.slice(-30),updatedAt:Date.now()});
      try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
    }
  }
  function escape(s){
    return String(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  }
  function currentContext(el){
    if(window.ETHONEAIEverywhere&&typeof window.ETHONEAIEverywhere.contextFromElement==="function"){
      try{return window.ETHONEAIEverywhere.contextFromElement(el||document.activeElement)}catch(e){}
    }
    const page=activePage();
    const selected=String(window.getSelection&&window.getSelection()||"").trim();
    return {page,kind:selected?"selection":"page",label:selected?"Selected text":pageLabel(page),text:selected.slice(0,1400),facts:facts()};
  }
  function contextSummary(ctx){
    const f=ctx?.facts||facts();
    return "Context: "+pageLabel(ctx?.page||activePage())+" / "+(ctx?.kind||"page")+" | Tasks "+f.open+" open, "+f.done+" done | Notes "+f.notes+" | Habits "+f.habits+" | Events today "+f.todayEvents;
  }
  function addActivity(type,title,body){
    state.activity.push({id:Date.now()+Math.random(),ts:Date.now(),type,title,body});
    if(state.activity.length>40)state.activity=state.activity.slice(-40);
    saveActivity();
    renderActivity();
  }
  function renameExperience(){
    const page=$("#page-ai");
    if(page){
      page.classList.add("eic-intelligence-ready");
      const powered=page.querySelector("[data-i18n='ai_powered_by']");
      if(powered)powered.textContent="ETHONE Intelligence";
      const title=page.querySelector(".section-title");
      if(title)title.innerHTML='ETHONE <span>Intelligence</span>';
      const input=$("#ai-input");
      if(input)input.placeholder=lang()==="fr"?"Demandez a ETHONE Intelligence...":"Ask ETHONE Intelligence...";
      const ctx=$("#ai-ctx-label");
      if(ctx)ctx.textContent=pageLabel(activePage())+" context";
      const caps=[...page.querySelectorAll("button")];
      caps.forEach(btn=>{
        const txt=(btn.textContent||"").trim().toLowerCase();
        if(txt==="nouveau chat"||txt==="new chat")btn.lastChild&&(btn.lastChild.textContent=" New workspace");
        if(txt.includes("historique"))btn.title="Saved intelligence workspaces";
      });
    }
    $$(".aie-copilot-title").forEach(x=>x.textContent="ETHONE Intelligence");
    $$(".aie-copilot-toggle").forEach(x=>{x.textContent="IN";x.title="Open ETHONE Intelligence"});
    const sub=$("#aie-copilot-sub");
    if(sub)sub.textContent="Native context";
    const ci=$("#aie-copilot-input");
    if(ci)ci.placeholder=lang()==="fr"?"Demandez dans le contexte actuel...":"Ask in the current context...";
    const cmd=$("#cmd-input");
    if(cmd&&cmd.dataset.aieHint)cmd.placeholder=lang()==="fr"?"Rechercher ou demander a Intelligence...":"Search or ask Intelligence...";
  }
  function briefingCards(kind){
    const f=facts();
    if(kind==="evening"){
      return [
        ["Completed",f.done+" task(s) completed today or stored in your progress."],
        ["Reflection",f.open?f.open+" open task(s) remain for tomorrow.":"No open task pressure detected."],
        ["Signals","Notes "+f.notes+", files "+f.files+", connected services "+f.connections+"."]
      ];
    }
    return [
      ["Priorities",f.high?f.high+" high priority item(s) deserve the first block.":(f.open?f.open+" open task(s) are ready for planning.":"No open task pressure.")],
      ["Schedule",f.todayEvents?f.todayEvents+" event(s) are on today's calendar.":"Calendar is calm unless connected services add events."],
      ["Momentum",f.habits?f.habits+" habit(s) can be checked before the day ends.":"Add habits to make the briefing more personal."]
    ];
  }
  function ensureCenter(){
    const page=$("#page-ai");
    if(!page||$("#eic-center",page))return;
    const f=facts();
    const center=document.createElement("section");
    center.id="eic-center";
    center.className="eic-center";
    center.innerHTML=
      '<div class="eic-panel eic-hero">'+
        '<div class="eic-hero-top">'+
          '<div><div class="eic-system-label">ETHONE Intelligence</div><div class="eic-title">The operating system understands the work in front of you.</div><div class="eic-copy">Context, briefings, recommendations, conversations and actions now live as one intelligence layer. The technical AI Core remains underneath; this is the native ETHONE experience above it.</div></div>'+
          '<div class="eic-context-pill"><span class="eic-context-dot"></span><span id="eic-live-context">Context active</span></div>'+
        '</div>'+
        '<div class="eic-briefing-grid" id="eic-briefing-grid"></div>'+
        '<div class="eic-action-row"><button class="eic-btn primary" data-eic-prompt="morning" type="button">Morning Briefing</button><button class="eic-btn" data-eic-prompt="plan" type="button">Plan my day</button><button class="eic-btn" data-eic-prompt="layout" type="button">Suggest layout</button><button class="eic-btn green" data-eic-prompt="task" type="button">Create task</button></div>'+
      '</div>'+
      '<aside class="eic-panel eic-side">'+
        '<div><div class="eic-side-title">Personal signals</div><div class="eic-side-copy">Generated from the current profile, dashboard layout, connected services and visible workspace.</div></div>'+
        '<div class="eic-signal-list" id="eic-signal-list">'+
          signalHTML("Open tasks",f.open)+signalHTML("Habits",f.habits)+signalHTML("Notes",f.notes)+signalHTML("Events today",f.todayEvents)+
        '</div>'+
        '<div class="eic-action-row"><button class="eic-btn" data-eic-prompt="evening" type="button">Evening Recap</button><button class="eic-btn" data-eic-prompt="recommend" type="button">Recommendations</button></div>'+
      '</aside>';
    const topbar=page.querySelector(".topbar");
    if(topbar&&topbar.nextSibling)topbar.parentNode.insertBefore(center,topbar.nextSibling);
    else page.prepend(center);
    renderBriefingGrid("morning");
    addActivity("system","Intelligence Center ready","Contextual workspaces, briefings and actions are available.");
  }
  function signalHTML(label,value){
    return '<div class="eic-signal"><span>'+escape(label)+'</span><strong>'+escape(value)+'</strong></div>';
  }
  function renderBriefingGrid(kind){
    const host=$("#eic-briefing-grid");
    if(!host)return;
    host.innerHTML=briefingCards(kind).map(c=>'<article class="eic-brief-card"><strong>'+escape(c[0])+'</strong><span>'+escape(c[1])+'</span></article>').join("");
  }
  function ensureWorkspaceTools(){
    const page=$("#page-ai");
    const area=page?.querySelector(".ai-page");
    if(!area||$("#eic-workspace-tools",area))return;
    const tools=document.createElement("section");
    tools.id="eic-workspace-tools";
    tools.className="eic-workspace-tools";
    tools.innerHTML=[
      ["summarize","Context Summary","Understand the current page, selected widget and stored profile."],
      ["actions","Action Builder","Turn generated tasks, notes, widgets and events into one-click actions."],
      ["visual","Visual Answer","Ask for tables, timelines, cards, code blocks or layout previews."],
      ["memory","Personalization","Use preferences, workspaces and connected services through AI Core."]
    ].map(x=>'<button class="eic-tool" type="button" data-eic-prompt="'+x[0]+'"><strong>'+x[1]+'</strong><span>'+x[2]+'</span></button>').join("");
    const messages=$("#ai-messages");
    if(messages&&messages.parentNode)messages.parentNode.insertBefore(tools,messages);
    else area.prepend(tools);
    const thread=document.createElement("aside");
    thread.id="eic-thread-panel";
    thread.className="eic-thread-panel";
    thread.innerHTML='<div class="eic-thread-title"><span>Recent intelligence activity</span><button class="eic-btn" data-eic-clear-activity type="button">Clear</button></div><div class="eic-activity" id="eic-activity"></div>';
    const input=area.querySelector(".ai-input-row");
    if(input&&input.parentNode)input.parentNode.insertBefore(thread,input);
    else area.appendChild(thread);
    renderActivity();
  }
  function renderActivity(){
    const host=$("#eic-activity");
    if(!host)return;
    const items=state.activity.slice(-10).reverse();
    host.innerHTML=items.length?items.map(a=>'<div class="eic-activity-item"><strong>'+escape(a.title)+'</strong><span>'+escape(a.body||"")+'</span></div>').join(""):'<div class="eic-activity-item"><strong>No recent activity</strong><span>Briefings, recaps and contextual requests will appear here.</span></div>';
  }
  function ensureHomeRhythm(){
    const page=$("#page-dashboard");
    if(!page||$("#eic-daily-rhythm",page))return;
    const f=facts();
    const section=document.createElement("section");
    section.id="eic-daily-rhythm";
    section.className="eic-daily-rhythm";
    section.innerHTML=
      rhythmCard("Morning Briefing","A concise overview of weather readiness, calendar, priorities, unfinished tasks, habits, GitHub, Spotify and service signals.",[["Priorities",f.high||f.open],["Events",f.todayEvents],["Habits",f.habits],["Services",f.connections]],"morning")+
      rhythmCard("Evening Recap","A reflective summary of completed work, remaining tasks, productivity, activity, listening context and personal achievements.",[["Done",f.done],["Open",f.open],["Notes",f.notes],["Files",f.files]],"evening");
    const anchor=$("#aie-home-insights",page)||$("#ethone-os2-ops-grid",page)||$("#ethone-pos-context",page)||$(".stats-row",page)||page.firstElementChild;
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(section,anchor);
    else page.prepend(section);
  }
  function rhythmCard(title,copy,metrics,action){
    return '<article class="eic-rhythm-card"><h3>'+escape(title)+'</h3><p>'+escape(copy)+'</p><div class="eic-rhythm-list">'+metrics.map(m=>'<div class="eic-rhythm-metric"><span>'+escape(m[0])+'</span><strong>'+escape(m[1])+'</strong></div>').join("")+'</div><button class="eic-btn primary" type="button" data-eic-prompt="'+action+'">Generate</button></article>';
  }
  function promptText(kind,ctx){
    ctx=ctx||currentContext(document.activeElement);
    const base="\n\nCurrent ETHONE context:\n"+JSON.stringify({page:ctx.page,kind:ctx.kind,label:ctx.label,text:ctx.text,facts:ctx.facts,summary:contextSummary(ctx)}).slice(0,2600);
    const prompts={
      morning:"Create a premium ETHONE Intelligence Morning Briefing. Include weather readiness, calendar, priorities, unfinished tasks, habits, GitHub/Discord/Spotify signals when available, marketplace recommendations and concise next actions. Render as cards, a timeline and a prioritized list."+base,
      evening:"Create an elegant Evening Recap for ETHONE. Summarize completed tasks, productivity, calendar, GitHub activity, Discord, Spotify, habits and achievements. Keep it reflective, concise and actionable."+base,
      plan:"Plan my day in ETHONE. Convert the current context into a calm schedule with priorities, quick wins, risks and one-click task suggestions."+base,
      layout:"Recommend an optimized ETHONE Home layout. Include a visual preview description, widget recommendations and ask before applying changes."+base,
      task:"Create one useful task from the current ETHONE context. If uncertain, suggest the task text and priority first."+base,
      recommend:"Suggest subtle contextual recommendations for this workspace: widgets, automations, habits, files, notes and marketplace improvements."+base,
      summarize:"Summarize the active ETHONE context and list the next three useful actions."+base,
      actions:"Turn this context into actionable ETHONE commands. Include create_task, create_note, scheduling or widget actions only when useful."+base,
      visual:"Answer using the best presentation format for the request: table, timeline, cards, code block, diagram text, or checklist. Avoid plain text when structure helps."+base,
      memory:"Explain what personalization and memory would improve this user's ETHONE experience while respecting privacy and stored preferences."+base
    };
    return prompts[kind]||prompts.summarize;
  }
  function openIntelligenceWithPrompt(kind){
    const ctx=currentContext(document.activeElement);
    state.lastContext=ctx;
    addActivity("request",kind==="evening"?"Evening Recap requested":kind==="morning"?"Morning Briefing requested":"Context request",contextSummary(ctx));
    if(activePage()!=="ai"&&typeof window.switchPage==="function"){
      try{window.switchPage("ai",null)}catch(e){}
    }
    setTimeout(()=>{
      const input=$("#ai-input");
      const prompt=promptText(kind,ctx);
      if(input){
        input.value=prompt;
        input.style.height="auto";
        input.style.height=Math.min(input.scrollHeight,160)+"px";
        if(typeof window.sendAIMessage==="function")window.sendAIMessage();
      }else if(window.ETHONEAIEverywhere&&typeof window.ETHONEAIEverywhere.openCopilot==="function"){
        window.ETHONEAIEverywhere.openCopilot(ctx,prompt);
      }
    },180);
  }
  function richMarkdown(text){
    let raw=String(text||"");
    const blocks=[];
    raw=raw.replace(/```([\s\S]*?)```/g,(_,code)=>{const id=blocks.push('<code class="eic-codeblock">'+escape(code.trim())+'</code>')-1;return "\n@@BLOCK"+id+"@@\n"});
    const lines=raw.split(/\n/);
    const out=[];
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(/^\s*\|.+\|\s*$/.test(line)&&lines[i+1]&&/^\s*\|[\s:-]+\|\s*$/.test(lines[i+1])){
        const heads=line.split("|").slice(1,-1).map(x=>x.trim());
        i+=2;
        const rows=[];
        while(i<lines.length&&/^\s*\|.+\|\s*$/.test(lines[i])){
          rows.push(lines[i].split("|").slice(1,-1).map(x=>x.trim()));
          i++;
        }
        i--;
        out.push('<table class="eic-rich-table"><thead><tr>'+heads.map(h=>'<th>'+inline(h)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+inline(c)+'</td>').join("")+'</tr>').join("")+'</tbody></table>');
      }else if(/^#{1,3}\s+/.test(line)){
        out.push('<strong>'+inline(line.replace(/^#{1,3}\s+/,""))+'</strong>');
      }else if(line.trim()){
        out.push(inline(line));
      }else{
        out.push("");
      }
    }
    return out.join("<br>").replace(/@@BLOCK(\d+)@@/g,(_,i)=>blocks[Number(i)]||"");
  }
  function inline(s){
    return escape(s)
      .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
      .replace(/`([^`]+)`/g,"<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" style="color:var(--eic-cyan);text-decoration:underline">$1</a>');
  }
  function wrapMessages(){
    if(typeof window.addAIMessage!=="function"||window.addAIMessage.__eicWrapped)return;
    const old=window.addAIMessage;
    window.addAIMessage=function(role,content){
      const before=$$("#ai-messages .ai-msg").length;
      const result=old.apply(this,arguments);
      const msgs=$$("#ai-messages .ai-msg");
      const msg=msgs[msgs.length-1];
      if(role==="assistant"&&msg&&msgs.length>before){
        const bubble=msg.querySelector(".ai-bubble");
        if(bubble){
          bubble.innerHTML=richMarkdown(content);
          if(!bubble.querySelector(".eic-response-actions")){
            const actions=document.createElement("div");
            actions.className="eic-response-actions";
            actions.innerHTML='<button class="eic-btn green" type="button" data-eic-save-note>Save as note</button><button class="eic-btn" type="button" data-eic-create-task-from-response>Create task</button><button class="eic-btn" type="button" data-eic-copy-response>Copy</button>';
            bubble.appendChild(actions);
          }
          addActivity("response","Response generated","ETHONE Intelligence created an actionable workspace response.");
        }
      }
      return result;
    };
    window.addAIMessage.__eicWrapped=true;
  }
  function patchCoreIdentity(){
    if(!window.ETHONEAICore||window.ETHONEAICore.__eicIdentityPatched)return;
    const old=window.ETHONEAICore.complete;
    if(typeof old!=="function")return;
    window.ETHONEAICore.complete=function(input,opts){
      const prefix="ETHONE Intelligence experience directive: You are not a detached chatbot. You are the native intelligence layer of ETHONE OS. Use the current context automatically. Prefer actionable cards, concise summaries, tables, timelines, task suggestions, note drafts, widget recommendations and confirmation before changes. Refer to the visible product as ETHONE Intelligence, while ETHONE AI Core is only the technical engine.\n\n";
      return old.call(this,prefix+String(input||""),opts);
    };
    window.ETHONEAICore.__eicIdentityPatched=true;
  }
  function patchCommandPalette(){
    if(typeof window.getCmdItems==="function"&&!window.getCmdItems.__eicWrapped){
      const old=window.getCmdItems;
      window.getCmdItems=function(q){
        const res=old.apply(this,arguments);
        const text=String(q||"").trim();
        if(text.length>2){
          const item={icon:"IN",label:"Ask ETHONE Intelligence: "+text,sub:"Native OS context, actions and briefings",tag:"Intelligence",action:()=>{if(typeof window.closeCmdPalette==="function")window.closeCmdPalette();openIntelligenceWithPrompt("summarize")}};
          res.actions=[item].concat(res.actions||[]);
          res.all=[item].concat(res.all||[]);
        }
        return res;
      };
      window.getCmdItems.__eicWrapped=true;
    }
  }
  function updateLiveContext(){
    const ctx=currentContext(document.activeElement);
    const label=pageLabel(ctx.page)+" / "+ctx.kind;
    const live=$("#eic-live-context");
    if(live)live.textContent=label;
    const ctxLabel=$("#ai-ctx-label");
    if(ctxLabel)ctxLabel.textContent=label;
    const signals=$("#eic-signal-list");
    if(signals){
      const f=facts();
      signals.innerHTML=signalHTML("Open tasks",f.open)+signalHTML("High priority",f.high)+signalHTML("Habits",f.habits)+signalHTML("Events today",f.todayEvents)+signalHTML("Connected services",f.connections);
    }
  }
  function handleClick(e){
    const prompt=e.target.closest("[data-eic-prompt]");
    if(prompt){openIntelligenceWithPrompt(prompt.dataset.eicPrompt);return}
    if(e.target.closest("[data-eic-clear-activity]")){
      state.activity=[];
      saveActivity();
      renderActivity();
      return;
    }
    const saveNote=e.target.closest("[data-eic-save-note]");
    if(saveNote){
      const bubble=saveNote.closest(".ai-bubble");
      const text=(bubble?.innerText||"").replace(/Save as note|Create task|Copy/g,"").trim();
      if(text&&typeof AI_ACTIONS!=="undefined"&&AI_ACTIONS.create_note){
        const title="Intelligence note "+new Date().toLocaleDateString();
        const res=AI_ACTIONS.create_note({title,content:text});
        if(typeof window.addAIMessage==="function")window.addAIMessage("assistant",res);
      }
      return;
    }
    const task=e.target.closest("[data-eic-create-task-from-response]");
    if(task){
      const bubble=task.closest(".ai-bubble");
      const text=(bubble?.innerText||"").split(/\n/).find(x=>x.trim().length>8)||"Review ETHONE Intelligence suggestion";
      if(typeof AI_ACTIONS!=="undefined"&&AI_ACTIONS.create_task){
        const res=AI_ACTIONS.create_task({text:text.slice(0,120),priority:"medium"});
        if(typeof window.addAIMessage==="function")window.addAIMessage("assistant",res);
      }
      return;
    }
    const copy=e.target.closest("[data-eic-copy-response]");
    if(copy){
      const bubble=copy.closest(".ai-bubble");
      const text=(bubble?.innerText||"").replace(/Save as note|Create task|Copy/g,"").trim();
      navigator.clipboard?.writeText(text);
      if(typeof window.toast==="function")window.toast("Copied from ETHONE Intelligence","success");
      return;
    }
  }
  function patchSwitchPage(){
    if(typeof window.switchPage==="function"&&!window.switchPage.__eicWrapped){
      const old=window.switchPage;
      window.switchPage=function(){
        const r=old.apply(this,arguments);
        setTimeout(run,100);
        return r;
      };
      window.switchPage.__eicWrapped=true;
    }
  }
  function run(){
    renameExperience();
    ensureCenter();
    ensureWorkspaceTools();
    ensureHomeRhythm();
    wrapMessages();
    patchCoreIdentity();
    patchCommandPalette();
    patchSwitchPage();
    updateLiveContext();
    renderActivity();
  }
  function startIntelligence(){
    document.addEventListener("click",handleClick);
    document.addEventListener("selectionchange",()=>{setTimeout(updateLiveContext,60)});
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
    setTimeout(run,350);
    setTimeout(run,1400);
    setInterval(run,25000);
  }
  if(window.ethoneRunWhenPageReady)window.ethoneRunWhenPageReady("intelligence-33a-runtime","ai",startIntelligence);else startIntelligence();
  window.ETHONEIntelligence={run,open:openIntelligenceWithPrompt,context:currentContext,briefingCards,facts};
})();
