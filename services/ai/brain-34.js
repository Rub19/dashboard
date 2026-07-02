/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE||window.__ethoneSkipBrain)return;
  if(window.__ethoneBrain34)return;
  window.__ethoneBrain34=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const storeKey="ethone:brain-34";
  const state=load();
  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(storeKey)||"{}");
      return {
        timeline:Array.isArray(saved.timeline)?saved.timeline:[],
        searches:Array.isArray(saved.searches)?saved.searches:[],
        commands:Array.isArray(saved.commands)?saved.commands:[],
        memory:Array.isArray(saved.memory)?saved.memory:[
          {id:"writing",key:"Writing style",value:"Concise, structured and action-oriented."},
          {id:"layout",key:"Preferred layout",value:"Start with Brain, then open the active workspace."},
          {id:"control",key:"User control",value:"Explain why, then ask before important changes."}
        ],
        booted:saved.booted||""
      };
    }catch(e){
      return {timeline:[],searches:[],commands:[],memory:[],booted:""};
    }
  }
  function save(){
    localStorage.setItem(storeKey,JSON.stringify(state));
    const p=profile();
    if(p&&p.state){
      p.state.ethoneBrain34=Object.assign({},p.state.ethoneBrain34||{},{
        timeline:state.timeline.slice(-120),
        searches:state.searches.slice(-30),
        commands:state.commands.slice(-40),
        memory:state.memory,
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
  function name(){
    const p=profile();
    return p?.name||p?.profile_name||p?.username||ps().displayName||"";
  }
  function activePage(){
    return document.querySelector(".tab-content.active")?.id?.replace("page-","")||"dashboard";
  }
  function pageLabel(id){
    const map={dashboard:"ETHONE Home",ai:"ETHONE Brain",todos:"Tasks",notes:"Notes",files:"Files",habits:"Habits",calendar:"Calendar",github:"GitHub",marketplace:"Marketplace",store:"Store",workspaces:"Workspaces",timeline:"Timeline",stats:"Statistics",gaming:"Gaming",settings:"Settings",connections:"Connections",notes:"Notes",kanban:"Kanban"};
    return map[id]||String(id||"Workspace");
  }
  function escape(s){
    return String(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  }
  function facts(){
    const s=ps();
    const todos=Array.isArray(s.todos)?s.todos:[];
    const habits=Array.isArray(s.habits)?s.habits:[];
    const events=Array.isArray(s.events)?s.events:[];
    const notes=Array.isArray(s.notes)?s.notes:[];
    const files=Array.isArray(s.items)?s.items:[];
    const today=new Date().toISOString().slice(0,10);
    const open=todos.filter(t=>!t.done);
    const done=todos.filter(t=>t.done);
    const todayEvents=events.filter(e=>String(e.date||"").slice(0,10)===today);
    const high=open.filter(t=>String(t.priority||"").toLowerCase()==="high");
    const con=s.connections||{};
    const core=window.ETHONEAICore?.config?.()||{};
    const providers=Object.keys(core.providers||{}).filter(k=>core.providers[k]?.enabled!==false&&(core.providers[k]?.apiKey||String(core.providers[k]?.endpoint||"").includes("localhost"))).length;
    return {
      open:open.length,
      done:done.length,
      high:high.length,
      habits:habits.length,
      events:events.length,
      todayEvents:todayEvents.length,
      notes:notes.length,
      files:files.length,
      widgets:document.querySelectorAll(".panel,.stat-card,.conn-card,.game-card,.ethone-os2-card,.brain-widget").length,
      connections:Object.keys(con).filter(k=>!!con[k]).length,
      providers,
      commands:state.commands.length,
      timeline:state.timeline.length
    };
  }
  function greeting(){
    const h=new Date().getHours();
    if(h<5)return "Welcome Back";
    if(h<12)return "Good Morning";
    if(h<18)return "Good Afternoon";
    return "Good Evening";
  }
  function session(){
    const page=activePage();
    const h=new Date().getHours();
    const text=(document.body?.innerText||"").toLowerCase();
    if(page==="gaming"||/steam|valorant|twitch|discord/.test(text)&&h>=18)return {id:"gaming",label:"Gaming Workspace",focus:"Discord, Spotify, Steam, Valorant and session recap"};
    if(page==="notes"||/study|revision|school|course/.test(text))return {id:"study",label:"Study Workspace",focus:"Notes, files, summaries and focus blocks"};
    if(page==="github"||["todos","calendar","workspaces","stats"].includes(page)||h>=8&&h<18)return {id:"work",label:"Work Workspace",focus:"Tasks, GitHub, notes, meetings and automations"};
    return {id:"personal",label:"Personal Workspace",focus:"Habits, journal, recap and calm planning"};
  }
  function todaySummary(){
    const f=facts();
    const who=name();
    const pieces=[];
    pieces.push(greeting()+(who?" "+who:"")+".");
    pieces.push("Today you have "+f.open+" unfinished task"+(f.open===1?"":"s")+" and "+f.done+" completed task"+(f.done===1?"":"s")+".");
    pieces.push(f.todayEvents?("You have "+f.todayEvents+" meeting or calendar event"+(f.todayEvents===1?"":"s")+" today."):"No meeting is visible in today's calendar.");
    pieces.push(f.habits?("Brain sees "+f.habits+" habit signal"+(f.habits===1?"":"s")+"."):"No habit streak is visible yet.");
    pieces.push("Current mode looks like "+session().label+".");
    pieces.push("Would you like Brain to prepare your "+session().label+"?");
    return pieces.join(" ");
  }
  function score(){
    const f=facts();
    const total=f.open+f.done;
    return Math.max(6,Math.min(100,Math.round((total?f.done/total*68:42)+f.habits*4+f.todayEvents*2+f.notes)));
  }
  function focusScore(){
    const f=facts();
    return Math.max(10,Math.min(100,Math.round(80-f.open*5+f.done*3+f.high*-4+f.habits*2)));
  }
  function bootTimeline(){
    const today=new Date().toISOString().slice(0,10);
    if(state.booted===today&&state.timeline.length)return;
    state.booted=today;
    addTimeline("brain","Brain opened",todaySummary(),false);
    addTimeline("overview","Digital life scanned","Tasks, events, habits, widgets, marketplace and workspace context were indexed.",false);
    save();
  }
  function addTimeline(type,title,body,render=true){
    state.timeline.push({id:Date.now()+Math.random(),ts:Date.now(),type,title,body});
    if(state.timeline.length>140)state.timeline=state.timeline.slice(-140);
    save();
    if(render)renderTimeline();
  }
  function cards(){
    const f=facts();
    return [
      ["Productivity Score",score(),f.done+" completed / "+f.open+" unfinished"],
      ["Focus Score",focusScore(),session().focus],
      ["Meetings",f.todayEvents,f.todayEvents?"Brain can prepare notes":"Calendar looks clear"],
      ["Tasks",f.open,f.high?f.high+" high priority":"Ready for ordering"],
      ["Habits",f.habits,f.habits?"Streaks can be protected":"Add habits for better insight"],
      ["GitHub",f.providers?"Core ready":"Provider needed","Developer signals route through AI Core"],
      ["Marketplace",marketplace().length,"Personal improvements available"],
      ["Automations",automations().length,"Suggested routines ready"]
    ];
  }
  function insights(){
    const f=facts();
    const arr=[];
    arr.push({title:"Brain sees your current routine",body:"The active context suggests "+session().label+". Recommendations are tuned for "+session().focus+"."});
    arr.push({title:"Productivity trend",body:f.done>f.open?"You completed more than remains open. Brain recommends preserving momentum.":"Unfinished work is heavier than completed work. Brain recommends a focused priority pass."});
    if(f.notes>2)arr.push({title:"Notes can become actions",body:"Your notes are ready for summarization, task extraction or meeting preparation."});
    if(f.widgets>14)arr.push({title:"Dashboard density is high",body:"Brain can suggest which widgets to hide, group or resize without applying changes silently."});
    if(!f.providers)arr.push({title:"AI Core provider missing",body:"Connect a provider to unlock live reasoning, natural language commands and workflows."});
    return arr.slice(0,5);
  }
  function recommendations(){
    const f=facts();
    const s=session();
    const arr=[];
    if(s.id==="work")arr.push({title:"Prepare Work Workspace",why:"Work signals are active, so Brain can collect tasks, notes, GitHub and calendar context.",cmd:"prepare work workspace"});
    if(s.id==="gaming")arr.push({title:"Create Gaming Workspace",why:"Gaming signals are present. Brain can group Discord, Spotify, Steam, Twitch and session recap widgets.",cmd:"create gaming workspace"});
    if(f.open>=3)arr.push({title:"Prioritize current tasks",why:"Several tasks are unfinished. A short ordered list will reduce switching.",cmd:"prioritize tasks"});
    if(f.notes>=3)arr.push({title:"Organize notes",why:"Your note library has enough content for summaries and action extraction.",cmd:"organize notes"});
    arr.push({title:"Create morning automation",why:"Brain opens with a daily summary. Automating it would make ETHONE feel ready every morning.",cmd:"create morning automation"});
    return arr.slice(0,5);
  }
  function marketplace(){
    const s=session();
    const f=facts();
    const base=[
      {title:"GitHub Heatmap widget",body:"Recommended when developer or work context is active.",cmd:"install github heatmap widget"},
      {title:"Morning Briefing widget",body:"Turns the daily summary into a movable dashboard card.",cmd:"install morning briefing widget"},
      {title:"Automation Pack",body:"Adds morning, evening and weekly productivity routines.",cmd:"install automation pack"}
    ];
    if(s.id==="gaming")base.unshift({title:"Twitch widget",body:"Gaming mode detected; stream and session widgets fit this workspace.",cmd:"install twitch widget"});
    if(f.todayEvents)base.unshift({title:"Calendar Sync pack",body:"Meetings are visible today, so calendar automation can reduce prep time.",cmd:"enable calendar sync"});
    return base.slice(0,4);
  }
  function automations(){
    const f=facts();
    return [
      {title:"Every morning briefing",body:"Generate Brain summary when ETHONE opens.",cmd:"create morning briefing automation"},
      {title:"Every evening recap",body:"Summarize completed tasks, habits, notes and focus sessions.",cmd:"create evening recap automation"},
      {title:"Sunday productivity report",body:"Turn the week into a clear report with trends and next actions.",cmd:"create weekly report automation"},
      {title:"Archive completed tasks",body:f.done+" completed task(s) can be reviewed before archiving.",cmd:"archive completed tasks"}
    ];
  }
  function searchIndex(){
    const s=ps();
    const out=[];
    const pages=["dashboard","ai","todos","notes","files","habits","calendar","github","marketplace","store","workspaces","stats","gaming","settings","connections"];
    pages.forEach(id=>out.push({type:"Page",title:pageLabel(id),body:"Open "+pageLabel(id),action:()=>switchTo(id)}));
    (s.todos||[]).forEach(t=>out.push({type:"Task",title:t.text||"Task",body:t.done?"Completed task":"Open task",action:()=>switchTo("todos")}));
    (s.notes||[]).forEach(n=>out.push({type:"Note",title:n.title||"Untitled note",body:String(n.content||"").slice(0,120),action:()=>switchTo("notes")}));
    (s.items||[]).forEach(i=>out.push({type:"File",title:i.name||i.title||"File",body:i.url||i.type||"Stored item",action:()=>switchTo("files")}));
    (s.habits||[]).forEach(h=>out.push({type:"Habit",title:h.name||h.title||"Habit",body:"Habit tracked in ETHONE",action:()=>switchTo("habits")}));
    (s.events||[]).forEach(ev=>out.push({type:"Calendar",title:ev.title||"Event",body:ev.date||"Calendar event",action:()=>switchTo("calendar")}));
    marketplace().forEach(m=>out.push({type:"Marketplace",title:m.title,body:m.body,action:()=>executeCommand(m.cmd)}));
    automations().forEach(a=>out.push({type:"Automation",title:a.title,body:a.body,action:()=>executeCommand(a.cmd)}));
    state.timeline.slice(-20).forEach(t=>out.push({type:"Timeline",title:t.title,body:t.body,action:()=>switchTo("ai")}));
    state.memory.forEach(m=>out.push({type:"Memory",title:m.key,body:m.value,action:()=>switchTo("ai")}));
    return out;
  }
  function runSearch(q){
    q=String(q||"").trim().toLowerCase();
    const host=$("#b34-results");
    if(!host)return;
    if(!q){
      host.classList.remove("open");
      host.innerHTML="";
      return;
    }
    const words=q.split(/\s+/).filter(Boolean);
    let results=searchIndex().map(item=>{
      const hay=(item.type+" "+item.title+" "+item.body).toLowerCase();
      const rank=words.reduce((n,w)=>n+(hay.includes(w)?1:0),0);
      return Object.assign({rank},item);
    }).filter(x=>x.rank>0).sort((a,b)=>b.rank-a.rank).slice(0,9);
    if(!results.length&&q.length>2)results=[{type:"Brain Command",title:"Ask Brain: "+q,body:"Run this as a natural language command.",action:()=>executeCommand(q)}];
    host.innerHTML=results.map((r,i)=>'<button class="b34-result" type="button" data-b34-result="'+i+'"><strong>'+escape(r.type+" / "+r.title)+'</strong><span>'+escape(r.body)+'</span></button>').join("");
    host._results=results;
    host.classList.add("open");
  }
  function switchTo(id){
    if(typeof window.switchPage==="function"){
      try{window.switchPage(id,null)}catch(e){}
    }
  }
  function executeCommand(cmd){
    cmd=String(cmd||"").trim();
    if(!cmd)return;
    state.commands.push({cmd,ts:Date.now()});
    if(state.commands.length>60)state.commands=state.commands.slice(-60);
    save();
    addTimeline("command","Universal command",cmd);
    const lower=cmd.toLowerCase();
    if(/open discord/.test(lower)){switchTo("connections");return}
    if(/gaming workspace|switch to gaming/.test(lower)){switchTo("workspaces");return}
    if(/start focus/.test(lower)){switchTo("dashboard");return}
    if(/install|marketplace|widget|theme|layout|plugin|automation|summarize|analyze|prepare|create|generate|explain|organize|prioritize|archive/.test(lower)){
      sendToBrain(cmd);
      return;
    }
    sendToBrain(cmd);
  }
  function sendToBrain(text){
    const prompt="ETHONE Brain universal command: "+text+"\n\nUse all visible ETHONE context. If this requires changing data, ask for confirmation first. Prefer cards, timeline, direct actions and a short explanation of why.";
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
      }else if(window.ETHONEBrain?.open){
        window.ETHONEBrain.open("daily-review");
      }
    },160);
  }
  function renderDashboard(){
    const page=$("#page-ai");
    if(!page)return;
    page.classList.add("ethone-brain34-ready");
    const eyebrow=page.querySelector("[data-i18n='ai_powered_by']");
    if(eyebrow)eyebrow.textContent="Brain Control Center";
    const title=page.querySelector(".section-title");
    if(title)title.innerHTML='ETHONE <span>Brain</span>';
    const input=$("#ai-input");
    if(input)input.placeholder="Ask Brain anything. Create, open, install, summarize, prepare, analyze...";
    let dash=$("#b34-dashboard",page);
    if(!dash){
      dash=document.createElement("section");
      dash.id="b34-dashboard";
      dash.className="b34-dashboard";
      dash.innerHTML=
        '<div class="b34-panel b34-morning">'+
          '<div class="b34-head"><div><div class="b34-greeting" id="b34-greeting"></div><div class="b34-summary" id="b34-summary"></div></div><div class="b34-status"><span class="b34-dot"></span><span id="b34-mode"></span></div></div>'+
          '<div class="b34-command"><div class="b34-command-row"><div class="b34-command-mark">BR</div><input id="b34-command-input" autocomplete="off" placeholder="Search everything or run a command: create task, install widget, prepare workspace..."><button class="primary" id="b34-command-run" type="button">Run</button></div><div class="b34-results" id="b34-results"></div></div>'+
          '<div class="b34-quick"><button class="b34-btn primary" data-b34-cmd="summarize today activity" type="button">Summarize today</button><button class="b34-btn" data-b34-cmd="prepare work workspace" type="button">Prepare workspace</button><button class="b34-btn" data-b34-cmd="create morning automation" type="button">Create automation</button><button class="b34-btn" data-b34-cmd="optimize dashboard layout" type="button">Optimize layout</button></div>'+
          '<div class="b34-card-grid" id="b34-card-grid"></div>'+
        '</div>'+
        '<aside class="b34-side">'+
          '<section class="b34-panel b34-section"><div class="b34-section-head"><div><div class="b34-title">Intelligent insights</div><div class="b34-sub">Brain notices patterns and keeps you in control.</div></div></div><div class="b34-list" id="b34-insights"></div></section>'+
          '<section class="b34-panel b34-section"><div class="b34-section-head"><div><div class="b34-title">Smart recommendations</div><div class="b34-sub">Every recommendation explains why.</div></div></div><div class="b34-list" id="b34-recommendations"></div></section>'+
        '</aside>'+
        '<div class="b34-wide b34-lower">'+
          '<section class="b34-panel b34-section"><div class="b34-section-head"><div><div class="b34-title">Intelligence Timeline</div><div class="b34-sub">A visual memory of the day instead of chat history.</div></div><button class="b34-btn" data-b34-clear-timeline type="button">Clear</button></div><div class="b34-timeline-list" id="b34-timeline"></div></section>'+
          '<section class="b34-panel b34-section"><div class="b34-section-head"><div><div class="b34-title">Marketplace and Automations</div><div class="b34-sub">Widgets, layouts, plugins, providers and routine packs matched to behavior.</div></div></div><div class="b34-list" id="b34-market-auto"></div></section>'+
        '</div>'+
        '<section class="b34-panel b34-section b34-wide"><div class="b34-section-head"><div><div class="b34-title">Brain Memory</div><div class="b34-sub">Editable memory. Nothing hidden.</div></div><button class="b34-btn primary" data-b34-add-memory type="button">Add memory</button></div><div class="b34-memory-grid" id="b34-memory"></div></section>';
      const topbar=page.querySelector(".topbar");
      if(topbar&&topbar.nextSibling)topbar.parentNode.insertBefore(dash,topbar.nextSibling);
      else page.prepend(dash);
    }
    updateDashboard();
  }
  function updateDashboard(){
    const f=facts();
    $("#b34-greeting")&&($("#b34-greeting").textContent=greeting()+(name()?" "+name():""));
    $("#b34-summary")&&($("#b34-summary").textContent=todaySummary());
    $("#b34-mode")&&($("#b34-mode").textContent=session().label);
    const grid=$("#b34-card-grid");
    if(grid)grid.innerHTML=cards().map(c=>'<article class="b34-card"><span>'+escape(c[0])+'</span><strong>'+escape(c[1])+'</strong><p>'+escape(c[2])+'</p></article>').join("");
    const ins=$("#b34-insights");
    if(ins)ins.innerHTML=insights().map(x=>'<article class="b34-insight"><strong>'+escape(x.title)+'</strong><span>'+escape(x.body)+'</span></article>').join("");
    const rec=$("#b34-recommendations");
    if(rec)rec.innerHTML=recommendations().map(x=>'<article class="b34-rec"><strong>'+escape(x.title)+'</strong><span>'+escape(x.why)+'</span><div class="b34-quick"><button class="b34-btn primary" type="button" data-b34-cmd="'+escape(x.cmd)+'">Run</button></div></article>').join("");
    const ma=$("#b34-market-auto");
    if(ma)ma.innerHTML=marketplace().map(x=>'<article class="b34-market"><strong>'+escape(x.title)+'</strong><span>'+escape(x.body)+'</span><div class="b34-quick"><button class="b34-btn" type="button" data-b34-cmd="'+escape(x.cmd)+'">Install</button></div></article>').join("")+automations().map(x=>'<article class="b34-auto"><strong>'+escape(x.title)+'</strong><span>'+escape(x.body)+'</span><div class="b34-quick"><button class="b34-btn" type="button" data-b34-cmd="'+escape(x.cmd)+'">Create</button></div></article>').join("");
    renderTimeline();
    renderMemory();
  }
  function renderTimeline(){
    const host=$("#b34-timeline");
    if(!host)return;
    const list=state.timeline.slice(-18).reverse();
    host.innerHTML=list.length?list.map(e=>'<div class="b34-time-row"><div class="b34-time">'+escape(new Date(e.ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}))+'</div><div class="b34-event"><strong>'+escape(e.title)+'</strong><span>'+escape(e.body||e.type||"")+'</span></div></div>').join(""):'<div class="b34-event"><strong>Brain is ready</strong><span>Your timeline will fill as ETHONE activity happens.</span></div>';
  }
  function renderMemory(){
    const host=$("#b34-memory");
    if(!host)return;
    const core=window.ETHONEAICore?.config?.().memory||[];
    const merged=state.memory.concat(core.map((m,i)=>({id:"core-"+(m.id||i),key:m.key||"AI Core memory",value:m.value||""})));
    host.innerHTML=merged.map(m=>'<article class="b34-memory"><strong>'+escape(m.key)+'</strong><span>'+escape(m.value)+'</span><div class="b34-quick"><button class="b34-btn" data-b34-edit-memory="'+escape(m.id)+'" type="button">Edit</button><button class="b34-btn" data-b34-remove-memory="'+escape(m.id)+'" type="button">Remove</button></div></article>').join("");
  }
  function patchCore(){
    if(!window.ETHONEAICore||window.ETHONEAICore.__brain34Patched)return;
    const old=window.ETHONEAICore.complete;
    if(typeof old!=="function")return;
    window.ETHONEAICore.complete=function(input,opts){
      const prefix="ETHONE Brain 3.4 directive: Brain is not an AI page, chatbot or assistant. Brain is the intelligence layer of the Personal Operating System. Always start from the user's current digital life: today summary, timeline, widgets, tasks, notes, habits, marketplace, automations, workspace, providers and connected services. Use natural language commands, explain why recommendations matter, keep the user in control, and avoid empty chat-like responses.\n\n";
      return old.call(this,prefix+String(input||""),opts);
    };
    window.ETHONEAICore.__brain34Patched=true;
  }
  function patchCommandPalette(){
    if(typeof window.getCmdItems==="function"&&!window.getCmdItems.__brain34Wrapped){
      const old=window.getCmdItems;
      window.getCmdItems=function(q){
        const res=old.apply(this,arguments);
        const text=String(q||"").trim();
        if(text.length>1){
          const item={icon:"BR",label:"Brain Search: "+text,sub:"Search pages, widgets, files, notes, tasks, habits, marketplace and commands",tag:"Brain",action:()=>{if(typeof window.closeCmdPalette==="function")window.closeCmdPalette();switchTo("ai");setTimeout(()=>{$("#b34-command-input")?.focus();$("#b34-command-input")&&(($("#b34-command-input").value=text),runSearch(text));},150)}};
          res.actions=[item].concat(res.actions||[]);
          res.all=[item].concat(res.all||[]);
        }
        return res;
      };
      window.getCmdItems.__brain34Wrapped=true;
    }
  }
  function patchSwitch(){
    if(typeof window.switchPage==="function"&&!window.switchPage.__brain34Wrapped){
      const old=window.switchPage;
      window.switchPage=function(){
        const from=activePage();
        const r=old.apply(this,arguments);
        setTimeout(()=>{if(from!==activePage())addTimeline("navigation","Opened "+pageLabel(activePage()),"Brain observed workspace movement from "+pageLabel(from)+".");run();},100);
        return r;
      };
      window.switchPage.__brain34Wrapped=true;
    }
    if(typeof window.addAIMessage==="function"&&!window.addAIMessage.__brain34Wrapped){
      const oldMsg=window.addAIMessage;
      window.addAIMessage=function(role,content){
        const r=oldMsg.apply(this,arguments);
        if(role==="assistant")addTimeline("brain","Brain response",String(content||"").replace(/\s+/g," ").slice(0,180));
        return r;
      };
      window.addAIMessage.__brain34Wrapped=true;
    }
  }
  function handleClick(e){
    const cmd=e.target.closest("[data-b34-cmd]");
    if(cmd){executeCommand(cmd.dataset.b34Cmd);return}
    const result=e.target.closest("[data-b34-result]");
    if(result){
      const host=$("#b34-results");
      const item=host?._results?.[Number(result.dataset.b34Result)];
      if(item&&typeof item.action==="function")item.action();
      host?.classList.remove("open");
      return;
    }
    if(e.target.closest("#b34-command-run")){executeCommand($("#b34-command-input")?.value||"");return}
    if(e.target.closest("[data-b34-clear-timeline]")){state.timeline=[];save();bootTimeline();renderTimeline();return}
    if(e.target.closest("[data-b34-add-memory]")){
      const value=prompt("What should Brain remember?");
      if(value){state.memory.push({id:Date.now(),key:"User memory",value:value.slice(0,260)});save();renderMemory();addTimeline("memory","Memory added",value.slice(0,120));}
      return;
    }
    const edit=e.target.closest("[data-b34-edit-memory]");
    if(edit){
      const item=state.memory.find(m=>String(m.id)===String(edit.dataset.b34EditMemory));
      if(item){const value=prompt("Edit memory",item.value);if(value!==null){item.value=value.slice(0,260);save();renderMemory();}}
      return;
    }
    const remove=e.target.closest("[data-b34-remove-memory]");
    if(remove){state.memory=state.memory.filter(m=>String(m.id)!==String(remove.dataset.b34RemoveMemory));save();renderMemory();return}
  }
  function handleInput(e){
    if(e.target?.id==="b34-command-input")runSearch(e.target.value);
  }
  function handleKey(e){
    if(e.target?.id==="b34-command-input"&&e.key==="Enter"){e.preventDefault();executeCommand(e.target.value)}
  }
  function renameCopilot(){
    $$(".aie-copilot-title").forEach(x=>x.textContent="ETHONE Brain");
    $$(".aie-copilot-toggle").forEach(x=>{x.textContent="BR";x.title="Open ETHONE Brain"});
    const sub=$("#aie-copilot-sub");
    if(sub)sub.textContent=session().label+" context";
  }
  function run(){
    bootTimeline();
    renderDashboard();
    patchCore();
    patchCommandPalette();
    patchSwitch();
    renameCopilot();
    updateDashboard();
  }
  function startBrain34(){
    document.addEventListener("click",handleClick);
    document.addEventListener("input",handleInput);
    document.addEventListener("keydown",handleKey);
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
    setTimeout(run,350);
    setTimeout(run,1500);
    setInterval(run,30000);
  }
  if(window.ethoneRunWhenPageReady)window.ethoneRunWhenPageReady("brain-34-runtime","ai",startBrain34);else startBrain34();
  window.ETHONEBrain34={run,search:runSearch,command:executeCommand,timeline:addTimeline,facts,recommendations,marketplace,automations};
})();
