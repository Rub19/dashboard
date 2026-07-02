/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.__ethoneLeanProductionBoot)return;
  if(window.__ethoneV2ProductRedesign)return;
  window.__ethoneV2ProductRedesign=true;
  var App=window.Ethone;
  var Events=App.get("events");
  var Navigation=App.get("navigation");
  var Storage=App.get("storage");
  var renderTimer=0;
  function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]})}
  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }
  function state(){
    var p=profile();
    return p&&p.state?p.state:{};
  }
  function nowPhase(){
    var h=new Date().getHours();
    if(h<5)return {name:"Night",greeting:"Quiet night",tone:"Plan lightly and keep the workspace calm."};
    if(h<12)return {name:"Morning",greeting:"Good morning",tone:"Start with focus, then clear the small things."};
    if(h<18)return {name:"Afternoon",greeting:"Good afternoon",tone:"Keep momentum with the next useful action."};
    return {name:"Evening",greeting:"Good evening",tone:"Review, close loops, and prepare tomorrow."};
  }
  function counts(){
    var s=state();
    var todos=Array.isArray(s.todos)?s.todos:[];
    var notes=Array.isArray(s.notes)?s.notes:[];
    var items=Array.isArray(s.items)?s.items:[];
    var habits=Array.isArray(s.habits)?s.habits:[];
    var events=Array.isArray(s.events)?s.events:[];
    var done=todos.filter(function(t){return !!t.done}).length;
    return {todos:todos,notes:notes,items:items,habits:habits,events:events,open:todos.length-done,done:done,files:items.length,links:items.filter(function(i){return i&&i.type==="link"}).length};
  }
  function bestAction(c){
    if(c.open>0)return "Brain suggests prioritizing "+c.open+" open task"+(c.open>1?"s":"")+" before opening new work.";
    if(c.events.length)return "Brain suggests reviewing today's schedule and preparing the next transition.";
    if(c.notes.length)return "Brain found recent notes that can be organized into a cleaner workspace.";
    return "Brain is ready to help shape this workspace. Add tasks, notes, files or widgets to make it personal.";
  }
  function shortDate(){
    try{return new Date().toLocaleDateString((window._lang||"fr"),{weekday:"long",day:"numeric",month:"long"})}catch(e){return new Date().toDateString()}
  }
  function nextItems(list,n,map){
    return list.slice(0,n).map(map).join("")||"";
  }
  function ensureHome(){
    var page=qs("#page-dashboard");
    if(!page)return;
    if(!qs("#ethone-v2-home",page)){
      page.insertAdjacentHTML("afterbegin",
        '<section class="ethone-v2-home" id="ethone-v2-home">'+
          '<div class="v2-hero">'+
            '<div class="v2-horizon"></div>'+
            '<div class="v2-hero-content">'+
              '<div class="v2-command-row">'+
                '<button class="v2-command-search" type="button" data-v2-action="search"><span>Search ETHONE</span><span class="v2-kbd">Ctrl K</span></button>'+
                '<div class="v2-pill" id="v2-workspace-pill">Workspace: Personal</div>'+
              '</div>'+
              '<div class="v2-hero-title"><h1 id="v2-greeting">Good afternoon</h1><p id="v2-tone">ETHONE is organizing your day.</p></div>'+
              '<div class="v2-context-strip">'+
                '<div class="v2-context-item"><span>Today</span><strong id="v2-today">-</strong></div>'+
                '<div class="v2-context-item"><span>Focus</span><strong id="v2-focus">Ready</strong></div>'+
                '<div class="v2-context-item"><span>Recent</span><strong id="v2-recent">0 items</strong></div>'+
                '<div class="v2-context-item"><span>Connected</span><strong id="v2-connected">Services</strong></div>'+
              '</div>'+
            '</div>'+
          '</div>'+
          '<aside class="v2-side">'+
            '<div class="v2-brain-panel">'+
              '<div class="v2-panel-head"><div class="v2-panel-title"><span class="v2-orbit">AI</span><span>Brain suggests</span></div><button class="v2-mini-action" type="button" data-v2-page="ai">Open</button></div>'+
              '<div class="v2-brain-text" id="v2-brain-text">Brain is reading your context.</div>'+
              '<div class="v2-brain-actions">'+
                '<button class="v2-brain-action" type="button" data-v2-page="todos"><span>Organize priorities</span><span>-></span></button>'+
                '<button class="v2-brain-action" type="button" data-v2-page="marketplace"><span>Recommend widgets</span><span>-></span></button>'+
                '<button class="v2-brain-action" type="button" data-v2-page="workspaces"><span>Prepare workspace</span><span>-></span></button>'+
              '</div>'+
            '</div>'+
            '<div class="v2-flow-panel">'+
              '<div class="v2-panel-head"><div class="v2-panel-title">Today flow</div><button class="v2-mini-action" type="button" data-v2-page="calendar">Calendar</button></div>'+
              '<div class="v2-flow-list" id="v2-flow-list"></div>'+
            '</div>'+
          '</aside>'+
        '</section>'+
        '<section class="v2-section-title"><h2>Live workspace</h2><span>Widgets now adapt to their purpose</span></section>'+
        '<section class="v2-widget-grid" id="ethone-v2-widgets">'+
          '<article class="v2-widget tall"><h3>Priority stack</h3><p>Open work ordered for the current moment.</p><div class="v2-tasks" id="v2-priority-stack"></div></article>'+
          '<article class="v2-widget"><h3>Momentum</h3><p id="v2-momentum-copy">Activity signal</p><div class="v2-spark" id="v2-spark"></div></article>'+
          '<article class="v2-widget"><h3>Recent memory</h3><p>Notes and files that are still warm.</p><div class="v2-activity" id="v2-recent-memory"></div></article>'+
          '<article class="v2-widget wide"><h3>Connected signals</h3><p id="v2-connected-copy">Spotify, Discord, GitHub and services stay available without taking over the page.</p><div class="v2-activity" id="v2-signal-list"></div></article>'+
          '<article class="v2-widget"><h3>Marketplace fit</h3><p id="v2-market-copy">Brain can recommend the next widget or layout based on how you actually work.</p><button class="v2-brain-action" type="button" data-v2-page="marketplace"><span>Explore recommendations</span><span>-></span></button></article>'+
        '</section>'
      );
      Events.listen(page,"click",function(e){
        var action=e.target.closest("[data-v2-action]");
        if(action&&action.dataset.v2Action==="search"){
          if(typeof window.openCmdPalette==="function")window.openCmdPalette();
          return;
        }
        var target=e.target.closest("[data-v2-page]");
        if(target){
          Navigation.go(target.dataset.v2Page,null);
        }
      },false,"product-redesign-actions");
    }
  }
  function renderHome(){
    ensureHome();
    var home=qs("#ethone-v2-home");
    if(!home)return;
    var c=counts();
    var s=state();
    var p=profile();
    var phase=nowPhase();
    var name=(p&&p.name)||s.username||"there";
    var workspace=Storage.get("ethone:active-workspace",null)||Storage.get("ethone:dashboard-os2","Personal")||"Personal";
    var focus=s.dailyFocus||((c.open>0&&c.todos.find(function(t){return !t.done})||{}).text)||"Ready";
    qs("#v2-greeting").textContent=phase.greeting+", "+name;
    qs("#v2-tone").textContent=phase.tone;
    qs("#v2-today").textContent=shortDate();
    qs("#v2-focus").textContent=String(focus).slice(0,28);
    qs("#v2-recent").textContent=c.files+" item"+(c.files===1?"":"s");
    qs("#v2-connected").textContent=(s.connections&&Object.keys(s.connections).length?Object.keys(s.connections).length:"Ready")+" services";
    qs("#v2-workspace-pill").textContent="Workspace: "+String(workspace).slice(0,34);
    qs("#v2-brain-text").textContent=bestAction(c);
    var flow=qs("#v2-flow-list");
    if(flow){
      var events=c.events.slice(0,4);
      flow.innerHTML=events.length?events.map(function(ev){
        return '<div class="v2-flow-item"><span class="v2-flow-dot"></span><div><strong>'+esc(ev.title||ev.name||"Event")+'</strong><span>'+esc(ev.note||ev.desc||"Scheduled")+'</span></div><span class="v2-flow-time">'+esc(ev.time||ev.date||"Today")+'</span></div>';
      }).join(""):[
        '<div class="v2-flow-item"><span class="v2-flow-dot"></span><div><strong>No fixed events</strong><span>Use the calendar to shape the day.</span></div><span class="v2-flow-time">Open</span></div>',
        '<div class="v2-flow-item"><span class="v2-flow-dot" style="background:var(--v2-green)"></span><div><strong>Focus block</strong><span>'+esc(phase.name)+' workspace is ready.</span></div><span class="v2-flow-time">Now</span></div>'
      ].join("");
    }
    var stack=qs("#v2-priority-stack");
    if(stack){
      var open=c.todos.filter(function(t){return !t.done}).slice(0,5);
      stack.innerHTML=open.length?open.map(function(t){return '<div class="v2-task"><i></i><span>'+esc(t.text||t.title||"Untitled task")+'</span></div>'}).join(""):'<div class="v2-task"><i style="border-color:var(--v2-green);background:rgba(54,211,153,.22)"></i><span>No urgent tasks. Capture the next useful action.</span></div>';
    }
    var spark=qs("#v2-spark");
    if(spark){
      var values=[c.done+1,c.open+2,c.notes.length+1,c.files+1,c.habits.length+2,Math.max(2,c.links+1),c.events.length+1];
      var max=Math.max.apply(Math,values);
      spark.innerHTML=values.map(function(v){return '<span style="height:'+Math.max(18,Math.round(v/max*72))+'px"></span>'}).join("");
    }
    var momentum=qs("#v2-momentum-copy");
    if(momentum)momentum.textContent=c.done+" tasks completed, "+c.open+" open, "+c.notes.length+" notes in memory.";
    var recent=qs("#v2-recent-memory");
    if(recent){
      var merged=[].concat(c.notes.map(function(n){return {label:n.title||"Note",meta:"Note"}}),c.items.map(function(i){return {label:i.name||i.title||i.url||"Item",meta:i.type||"File"}})).slice(0,4);
      recent.innerHTML=merged.length?merged.map(function(x){return '<div><span>'+esc(String(x.label).slice(0,34))+'</span><em>'+esc(x.meta)+'</em></div>'}).join(""):'<div><span>No recent memory yet</span><em>Ready</em></div>';
    }
    var signals=qs("#v2-signal-list");
    if(signals){
      var con=s.connections||{};
      var names=Object.keys(con).slice(0,4);
      signals.innerHTML=(names.length?names:["Brain","Marketplace","Workspaces"]).map(function(k){return '<div><span>'+esc(k)+'</span><em>Available</em></div>'}).join("");
    }
  }
  function apply(){
    document.body.classList.add("ethone-v2");
    document.documentElement.classList.add("ethone-v2-ready");
    renderHome();
  }
  function schedule(){
    clearTimeout(renderTimer);
    renderTimer=setTimeout(apply,120);
  }
  window.ethoneV2Render=renderHome;
  function startV2Redesign(){
    if(document.readyState==="loading")Events.listen(document,"DOMContentLoaded",schedule,{once:true},"product-redesign-boot");else schedule();
    Events.listen(window,"storage",schedule,false,"product-redesign-storage");
    Events.listen(document,"click",function(e){
      if(e.target.closest(".nav-item,.panel-action,.btn,.stat-card"))setTimeout(schedule,180);
    },true,"product-redesign-refresh");
    setTimeout(schedule,900);
    setTimeout(schedule,2400);
    setInterval(renderHome,30000);
  }
  if(window.ethoneRunWhenDashboardReady)window.ethoneRunWhenDashboardReady("v2-product-redesign",startV2Redesign);else startV2Redesign();
})();
