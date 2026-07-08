/* ETHONE Usage Learning.
   Learns lightweight local UI habits and exposes them to Smart Layouts. */
(function(){
  "use strict";
  if(window.__ethoneUsageLearning)return;
  window.__ethoneUsageLearning=true;

  var STORAGE_KEY="ethone:usage-learning:v1";
  var DAY=86400000;
  var saveTimer=0;
  var lastApply=0;
  var state={
    version:1,
    startedAt:new Date().toISOString(),
    pages:{},
    widgets:{},
    sidebar:{navClicks:0,autoCompact:false,manualCompactAt:0,expandedAt:0},
    totals:{pageViews:0,clicks:0}
  };

  function $(sel,root){return (root||document).querySelector(sel)}
  function now(){return Date.now()}
  function read(){
    try{
      var raw=localStorage.getItem(STORAGE_KEY);
      if(raw)state=Object.assign(state,JSON.parse(raw)||{});
    }catch(e){}
    state.pages=state.pages||{};
    state.widgets=state.widgets||{};
    state.sidebar=state.sidebar||{};
    state.totals=state.totals||{};
  }
  function write(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}
    try{
      var p=typeof window.curP==="function"?window.curP():null;
      if(p){p.state=p.state||{};p.state.usageLearning=state;}
    }catch(e){}
  }
  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(write,250);
  }
  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }
  function decayScore(entry){
    if(!entry)return 0;
    var count=Number(entry.count||0);
    var last=Number(entry.last||0);
    if(!last)return count;
    var age=Math.max(0,(now()-last)/DAY);
    return Math.round(count*Math.pow(.82,age)*100)/100;
  }
  function bump(bucket,key,weight){
    if(!key)return;
    var map=state[bucket]=state[bucket]||{};
    var item=map[key]||{count:0,last:0};
    item.count=decayScore(item)+(weight||1);
    item.last=now();
    map[key]=item;
    scheduleSave();
  }
  function currentPage(){
    var active=$(".tab-content.active[id^='page-']");
    return active?active.id.replace(/^page-/,""):"dashboard";
  }
  function pageToWidget(page){
    return {
      github:"github",
      gaming:"gaming",
      "valorant-accounts":"valorant",
      connections:"connections",
      calendar:"calendar",
      notes:"notes",
      todos:"tasks",
      files:"files",
      goals:"goals",
      habits:"habits",
      stats:"analytics"
    }[page]||null;
  }
  function inferWidgetFromElement(el){
    if(!el)return null;
    var widget=el.closest&&el.closest("[data-widget-type]");
    if(widget&&widget.dataset.widgetType)return widget.dataset.widgetType;
    var container=el.closest&&el.closest("[id],[class]");
    var text="";
    try{text=((container&&container.id)||"")+" "+((container&&container.className)||"")+" "+(container&&container.innerText||"").slice(0,120)}catch(e){}
    text=String(text).toLowerCase();
    if(/spotify|nowplaying|now-playing|lastfm|music/.test(text))return "spotify";
    if(/github|repo|commit/.test(text))return "github";
    if(/discord|lanyard/.test(text))return "discord";
    if(/steam/.test(text))return "steam";
    if(/valorant|riot/.test(text))return "valorant";
    if(/calendar|event|planning/.test(text))return "calendar";
    if(/note/.test(text))return "notes";
    if(/task|todo/.test(text))return "tasks";
    return null;
  }
  function trackPage(page){
    page=page||currentPage();
    bump("pages",page,1);
    var widget=pageToWidget(page);
    if(widget)bump("widgets",widget,.8);
    state.totals.pageViews=(Number(state.totals.pageViews)||0)+1;
    scheduleSave();
    scheduleApply();
  }
  function trackClick(e){
    state.totals.clicks=(Number(state.totals.clicks)||0)+1;
    var nav=e.target.closest&&e.target.closest("#main-sidebar .nav-item,[data-nav-id]");
    if(nav){
      state.sidebar.navClicks=(Number(state.sidebar.navClicks)||0)+1;
      bump("pages",nav.dataset.page||nav.dataset.navId,.6);
      scheduleApply();
    }
    var widget=inferWidgetFromElement(e.target);
    if(widget)bump("widgets",widget,.7);
  }
  function usageScore(kind){
    return decayScore((state.widgets||{})[kind]||(state.pages||{})[kind]);
  }
  function scores(){
    var widgets=state.widgets||{};
    var out={};
    Object.keys(widgets).forEach(function(k){out[k]=decayScore(widgets[k])});
    return out;
  }
  function preferredMode(){
    var s=scores();
    if((s.spotify||0)>=5 || (s.music||0)>=5)return "music";
    if((s.github||0)>=5 || (s.tasks||0)>=6 || (s.notes||0)>=6)return "work";
    if((s.valorant||0)>=4 || (s.steam||0)>=4 || (s.discord||0)>=6 || (s.gaming||0)>=4)return "gaming";
    return null;
  }
  function shouldCompactSidebar(){
    var views=Number(state.totals.pageViews||0);
    var nav=Number(state.sidebar.navClicks||0);
    var manual=Number(state.sidebar.manualCompactAt||0);
    if(window.innerWidth<1024)return false;
    if(manual&&now()-manual<DAY)return false;
    if(views<14)return false;
    return nav/Math.max(views,1)<.18;
  }
  function applySidebarLearning(){
    var p=profile();
    var sb=$("#main-sidebar");
    if(!p||!sb)return;
    if(shouldCompactSidebar()){
      if(!p.sidebarCompact){
        p.sidebarCompact=true;
        sb.classList.add("compact");
        if(window.ethoneSidebarResize)window.ethoneSidebarResize.suspendForCompact();
        state.sidebar.autoCompact=true;
        try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
      }
    }else if(state.sidebar.autoCompact&&p.sidebarCompact&&Number(state.sidebar.navClicks||0)>4){
      p.sidebarCompact=false;
      sb.classList.remove("compact");
      if(window.ethoneSidebarResize)window.ethoneSidebarResize.resumeFromCompact();
      state.sidebar.autoCompact=false;
      try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
    }
  }
  function promoteLayoutPrefs(prefs){
    prefs=prefs&&prefs.version===2?JSON.parse(JSON.stringify(prefs)):prefs;
    if(!prefs||!Array.isArray(prefs.instances))return prefs;
    var s=scores();
    var priority=[];
    if((s.spotify||0)>=5)priority.push("spotify","nowPlaying","lastfm");
    if((s.github||0)>=5)priority.push("github","notes","productivity");
    if((s.valorant||0)>=4||s.steam>=4)priority.push("valorant","steam","discord","spotify");
    if(!priority.length)return prefs;
    var rank=function(inst){
      var idx=priority.indexOf(inst.type);
      return idx===-1?99:idx;
    };
    var head=prefs.instances.filter(function(i){return i.type==="hero"||i.type==="brain"});
    var rest=prefs.instances.filter(function(i){return i.type!=="hero"&&i.type!=="brain"});
    rest.sort(function(a,b){return rank(a)-rank(b)});
    prefs.instances=head.concat(rest);
    return prefs;
  }
  function scheduleApply(){
    if(now()-lastApply<900)return;
    lastApply=now();
    setTimeout(function(){
      applySidebarLearning();
      try{window.dispatchEvent(new CustomEvent("ethone:usage-learning",{detail:{scores:scores(),mode:preferredMode()}}))}catch(e){}
    },120);
  }
  function manualCompactToggle(){
    state.sidebar.manualCompactAt=now();
    state.sidebar.autoCompact=false;
    scheduleSave();
  }
  function bind(){
    document.addEventListener("click",trackClick,true);
    window.addEventListener("ethone:page-ready",function(e){trackPage(e&&e.detail&&e.detail.page)});
    window.addEventListener("ethone:smart-layout-refresh",scheduleApply);
    window.addEventListener("storage",function(e){if(e.key===STORAGE_KEY)read()});
  }
  function boot(){
    read();
    bind();
    setTimeout(function(){trackPage(currentPage());scheduleApply()},800);
  }

  window.ETHONEUsageLearning={
    trackPage:trackPage,
    trackWidget:function(type,weight){bump("widgets",type,weight||1);scheduleApply()},
    score:usageScore,
    scores:scores,
    preferredMode:preferredMode,
    promoteLayoutPrefs:promoteLayoutPrefs,
    apply:applySidebarLearning,
    state:function(){return JSON.parse(JSON.stringify(state))},
    markManualCompactToggle:manualCompactToggle
  };
  var old=window.ethoneNotifyManualCompactToggle;
  window.ethoneNotifyManualCompactToggle=function(){
    manualCompactToggle();
    if(typeof old==="function")try{old()}catch(e){}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
