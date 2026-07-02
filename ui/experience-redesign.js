/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.__ethone2026Experience)return;
  window.__ethone2026Experience=true;
  var App=window.Ethone;
  var Events=App.get("events");
  var Navigation=App.get("navigation");
  var Storage=App.get("storage");
  var timer=0;
  function qs(s,r){return (r||document).querySelector(s)}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]})}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function data(){var p=profile();return p&&p.state?p.state:{}}
  function counts(){var s=data(),todos=Array.isArray(s.todos)?s.todos:[],items=Array.isArray(s.items)?s.items:[],notes=Array.isArray(s.notes)?s.notes:[],events=Array.isArray(s.events)?s.events:[],habits=Array.isArray(s.habits)?s.habits:[];return{todos,items,notes,events,habits,open:todos.filter(t=>!t.done).length,done:todos.filter(t=>t.done).length}}
  function phase(){var h=new Date().getHours();return h<5?"Night":h<12?"Morning":h<18?"Afternoon":"Evening"}
  function ensure(){
    var page=qs("#page-dashboard"); if(!page)return;
    if(!qs("#ethone-2026-home",page)){
      page.insertAdjacentHTML("afterbegin",
        '<section class="x26-home" id="ethone-2026-home">'+
          '<div class="x26-stage">'+
            '<div class="x26-commandbar">'+
              '<button class="x26-search" type="button" data-x26-action="search"><strong>Search ETHONE</strong><span>apps, files, commands, Brain</span><em class="x26-kbd">Ctrl K</em></button>'+
              '<div class="x26-status"><i class="x26-dot"></i><span id="x26-status-text">Live workspace</span></div>'+
              '<button class="x26-small-btn" type="button" data-x26-page="settings">Personalize</button>'+
            '</div>'+
            '<div class="x26-hero">'+
              '<div class="x26-hero-inner">'+
                '<div class="x26-context"><span id="x26-date">Today</span><span>•</span><b id="x26-workspace">Personal OS</b></div>'+
                '<div class="x26-title"><h1 id="x26-title">Your day, already organized.</h1><p id="x26-subtitle">ETHONE brings tasks, notes, services, Brain and workspaces into one calm command surface.</p></div>'+
                '<div class="x26-launchpad">'+
                  '<button class="x26-launch" type="button" data-x26-page="ai"><i>AI</i><strong>Brain</strong><span>Ask, organize, explain and prepare your next move.</span></button>'+
                  '<button class="x26-launch" type="button" data-x26-page="marketplace"><i>MK</i><strong>Marketplace</strong><span>Discover widgets, layouts and extensions that fit you.</span></button>'+
                  '<button class="x26-launch" type="button" data-x26-page="workspaces"><i>WS</i><strong>Workspaces</strong><span>Switch context without rebuilding your setup.</span></button>'+
                '</div>'+
              '</div>'+
            '</div>'+
            '<div class="x26-lower">'+
              '<div class="x26-panel"><div class="x26-panel-head"><h2>Today flow</h2><span id="x26-flow-count">0 events</span></div><div class="x26-timeline" id="x26-timeline"></div></div>'+
              '<div class="x26-panel"><div class="x26-panel-head"><h2>Priority stack</h2><span id="x26-task-count">0 open</span></div><div class="x26-task-stack" id="x26-task-stack"></div></div>'+
            '</div>'+
          '</div>'+
          '<aside class="x26-side">'+
            '<section class="x26-brain"><div class="x26-orb">B</div><h2>Brain is present.</h2><p id="x26-brain-copy">It watches context quietly and suggests what matters next.</p><button type="button" data-x26-page="ai">Open Brain</button></section>'+
            '<section class="x26-signal-grid">'+
              '<div class="x26-signal"><span>Focus</span><strong id="x26-focus-count">Ready</strong><p id="x26-focus-copy">The next action is surfaced here.</p></div>'+
              '<div class="x26-signal"><span>Memory</span><strong id="x26-memory-count">0</strong><p>Recent notes, files and activity.</p></div>'+
              '<div class="x26-signal"><span>Widgets</span><strong id="x26-widget-count">Live</strong><p>Different forms for different information.</p></div>'+
              '<div class="x26-signal"><span>Connected</span><strong id="x26-service-count">Ready</strong><p>Services stay available without clutter.</p></div>'+
            '</section>'+
            '<section class="x26-panel"><div class="x26-panel-head"><h2>Quick routes</h2><span>Command</span></div><div class="x26-task-stack"><button class="x26-small-btn" data-x26-page="todos">Tasks</button><button class="x26-small-btn" data-x26-page="notes">Notes</button><button class="x26-small-btn" data-x26-page="calendar">Calendar</button></div></section>'+
          '</aside>'+
        '</section>'+
        '<nav class="x26-dock" id="ethone-2026-dock"><button data-x26-page="dashboard">Home</button><button data-x26-page="ai">Brain</button><button data-x26-page="marketplace">Marketplace</button><button data-x26-page="workspaces">Workspaces</button><button data-x26-action="search">Search</button></nav>'
      );
      Events.listen(page,"click",function(e){
        var a=e.target.closest("[data-x26-action]");
        if(a&&a.dataset.x26Action==="search"&&typeof window.openCmdPalette==="function"){window.openCmdPalette();return}
        var p=e.target.closest("[data-x26-page]");
        if(p)Navigation.go(p.dataset.x26Page,null);
      },false,"experience-redesign-actions");
    }
  }
  function render(){
    ensure();
    var bootWarning=qs("#ethone-boot-warning");
    if(bootWarning)bootWarning.remove();
    var c=counts(),s=data(),p=profile(),ph=phase();
    var name=(p&&p.name)||s.username||"there";
    var firstOpen=c.todos.find(function(t){return !t.done});
    var title=qs("#x26-title"); if(title)title.textContent=ph==="Night"?"Quiet mode, "+name+".":ph+" command center, "+name+".";
    var subtitle=qs("#x26-subtitle"); if(subtitle)subtitle.textContent=firstOpen?("Next: "+(firstOpen.text||firstOpen.title||"continue your priority")+" while Brain keeps the rest organized."):"Everything important is visible. Capture the next idea or open Brain for a recommendation.";
    var date=qs("#x26-date"); if(date)date.textContent=new Date().toLocaleDateString(window._lang||"fr",{weekday:"long",day:"numeric",month:"long"});
    var ws=qs("#x26-workspace"); if(ws)ws.textContent=Storage.get("ethone:active-workspace","Personal OS")||"Personal OS";
    var status=qs("#x26-status-text"); if(status)status.textContent=c.open+" open tasks • "+c.items.length+" items";
    var brain=qs("#x26-brain-copy"); if(brain)brain.textContent=c.open?("Brain found "+c.open+" open task"+(c.open>1?"s":"")+" and can arrange a clean sequence."):
      "Brain is ready to recommend widgets, organize notes or prepare a workspace.";
    var focus=qs("#x26-focus-count"); if(focus)focus.textContent=firstOpen?String(firstOpen.text||firstOpen.title).slice(0,20):"Ready";
    var memory=qs("#x26-memory-count"); if(memory)memory.textContent=String(c.notes.length+c.items.length);
    var services=qs("#x26-service-count"); if(services)services.textContent=s.connections?String(Object.keys(s.connections).length||"Ready"):"Ready";
    var flow=qs("#x26-timeline");
    if(flow){
      qs("#x26-flow-count").textContent=c.events.length+" event"+(c.events.length===1?"":"s");
      flow.innerHTML=(c.events.slice(0,5).map(function(ev){return '<div class="x26-time-row"><time>'+esc(ev.time||ev.date||"Today")+'</time><div><strong>'+esc(ev.title||ev.name||"Event")+'</strong><span>'+esc(ev.note||ev.desc||"Schedule")+'</span></div><em class="x26-chip">Plan</em></div>'}).join("")||
      '<div class="x26-time-row"><time>Now</time><div><strong>No events locked</strong><span>Create a focus block or open Calendar.</span></div><em class="x26-chip">Open</em></div>');
    }
    var stack=qs("#x26-task-stack");
    if(stack){
      qs("#x26-task-count").textContent=c.open+" open";
      stack.innerHTML=(c.todos.filter(function(t){return !t.done}).slice(0,6).map(function(t){return '<div class="x26-task-row"><i class="x26-check"></i><div><strong>'+esc(t.text||t.title||"Untitled task")+'</strong><span>'+esc(t.priority||t.tag||"Task")+'</span></div><em class="x26-chip">Today</em></div>'}).join("")||
      '<div class="x26-task-row"><i class="x26-check"></i><div><strong>No active priority</strong><span>Add a task or ask Brain what to do next.</span></div><em class="x26-chip">Calm</em></div>');
    }
  }
  function apply(){document.body.classList.add("ethone-2026-ui");render()}
  function schedule(){clearTimeout(timer);timer=setTimeout(apply,80)}
  window.ethone2026Render=render;
  function start2026Redesign(){
    if(document.readyState==="loading")Events.listen(document,"DOMContentLoaded",schedule,{once:true},"experience-redesign-boot");else schedule();
    Events.listen(document,"click",function(){setTimeout(render,180)},true,"experience-redesign-refresh");
    setTimeout(schedule,800);
    setTimeout(schedule,2200);
  }
  if(window.ethoneRunWhenDashboardReady)window.ethoneRunWhenDashboardReady("experience-2026-redesign",start2026Redesign);else start2026Redesign();
})();
