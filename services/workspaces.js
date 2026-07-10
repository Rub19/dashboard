/* ETHONE Workspaces service.
 * Source of truth for modular environments: active workspace, scoped profile
 * data, visual theme and dashboard layout binding.
 */
(function(){
  "use strict";
  if(window.__ethoneWorkspacesService)return;
  window.__ethoneWorkspacesService=true;

  var App=window.Ethone;
  var DATA_FIELDS=["items","todos","notes","goals","habits","events","connections","gaming","kanban","pinned","journal","countdowns","dailyFocus","aiSessions","automationRules","databases","valorantAccounts","filesState","notifPrefs","liveWidgets","weatherCache"];
  var transitionTimer=0;
  var lastTemplateClass="";
  var DEFAULTS=[
    {id:"personal",name:"Personal",label:"Personal",icon:"home",emoji:"H",accent:"#8b5cf6",wallpaper:"radial-gradient(circle at 18% 12%, rgba(139,92,246,.18), transparent 34%), #09090b",layoutId:"ws-personal-control",template:"control",description:"Life, notes, planning and daily operating context.",favorites:["dashboard","notes","todos","calendar"]},
    {id:"development",name:"Development",label:"Development",icon:"code-2",emoji:"DEV",accent:"#9d7cff",wallpaper:"radial-gradient(circle at 30% 16%, rgba(157,124,255,.16), transparent 32%), #09090b",layoutId:"ws-dev-focus",template:"focus",description:"Code, GitHub, databases, docs and deep work.",favorites:["dashboard","github","databases","ai"]},
    {id:"gaming",name:"Gaming",label:"Gaming",icon:"gamepad-2",emoji:"GG",accent:"#a855f7",wallpaper:"radial-gradient(circle at 70% 20%, rgba(168,85,247,.18), transparent 30%), #09090b",layoutId:"ws-gaming",template:"gaming",description:"Valorant, Steam, Discord, music and sessions.",favorites:["dashboard","gaming","valorant-accounts","connections"]},
    {id:"study",name:"Study",label:"Study",icon:"graduation-cap",emoji:"ST",accent:"#b794f4",wallpaper:"radial-gradient(circle at 52% 10%, rgba(183,148,244,.14), transparent 34%), #09090b",layoutId:"ws-study-control",template:"control",description:"Courses, notes, files, deadlines and focus blocks.",favorites:["dashboard","notes","files","calendar"]},
    {id:"streaming",name:"Streaming",label:"Streaming",icon:"radio",emoji:"ON",accent:"#c084fc",wallpaper:"radial-gradient(circle at 72% 14%, rgba(192,132,252,.15), transparent 34%), #09090b",layoutId:"ws-streaming",template:"gaming",description:"OBS, Twitch, YouTube, scenes and live planning.",favorites:["dashboard","connections","calendar","ai"]},
    {id:"ai-research",name:"AI Research",label:"AI Research",icon:"brain-circuit",emoji:"AI",accent:"#a78bfa",wallpaper:"radial-gradient(circle at 42% 12%, rgba(167,139,250,.16), transparent 36%), #09090b",layoutId:"ws-ai-research",template:"focus",description:"Models, providers, experiments, papers and Brain memory.",favorites:["dashboard","ai","databases","notes"]}
  ];
  function copy(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function save(){
    try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
  }
  function coreStorage(){
    try{return window.EthoneCore&&window.EthoneCore.storage?window.EthoneCore.storage:null}catch(e){return null}
  }
  function fieldDefault(field){
    if(field==="connections"||field==="gaming"||field==="filesState"||field==="notifPrefs"||field==="liveWidgets"||field==="weatherCache")return {};
    if(field==="dailyFocus")return null;
    return [];
  }
  function defaultWidgets(template){
    var map={
      focus:["hero","brain","tasks","notes","calendar","goals","quickActions"],
      gaming:["hero","brain","discord","spotify","steam","valorant","nowPlaying","quickActions"],
      study:["hero","brain","notes","calendar","files","focus","timeline","quickActions"],
      streaming:["hero","brain","discord","spotify","calendar","activity","quickActions"],
      control:["hero","today","brain","timeline","workspace","activity","quickActions"]
    };
    return (map[template]||map.control).slice();
  }
  function defaultIntegrations(template){
    var map={
      focus:["github","google-calendar","google-drive"],
      gaming:["discord","spotify","steam","riot"],
      study:["google-calendar","google-drive"],
      streaming:["discord","spotify","twitch","youtube","obs"],
      control:["google-calendar","github"]
    };
    return (map[template]||map.control).slice();
  }
  function environmentDefaults(w){
    var template=(w&&w.template)||"control";
    var widgets=defaultWidgets(template);
    var integrations=defaultIntegrations(template);
    return {
      theme:{preset:"ethone-purple",density:"comfortable",motion:true},
      background:{type:"ambient",value:w&&w.wallpaper||"#09090b",dim:.88},
      brain:{enabled:true,mode:template==="gaming"?"coach":template==="focus"?"builder":template==="study"?"study":template==="streaming"?"producer":"contextual",memory:true,suggestions:true},
      dashboard:{layoutId:w&&w.layoutId||"",template:template,widgets:widgets,lastOpened:"dashboard"},
      widgets:{active:widgets,favorites:(w&&Array.isArray(w.favorites)?w.favorites.slice():["dashboard","notes","todos"]),hidden:[],panelPinned:false},
      notes:{pinned:[],tags:[]},
      tasks:{view:"today",priority:"smart"},
      integrations:{enabled:integrations,pinned:integrations.slice(0,3),status:{}}
    };
  }
  function mergeObject(base,value){
    return Object.assign({},base||{},value||{});
  }
  function normalizeArray(value,fallback){
    return Array.isArray(value)?value.slice():(fallback||[]).slice();
  }
  function dataFromState(state){
    var out={};
    state=state||{};
    DATA_FIELDS.forEach(function(field){
      out[field]=copy(state[field]!==undefined?state[field]:fieldDefault(field));
    });
    return out;
  }
  function ensureData(w){
    var env=environmentDefaults(w);
    w.data=w.data||{};
    DATA_FIELDS.forEach(function(field){
      if(w.data[field]===undefined)w.data[field]=fieldDefault(field);
    });
    w.settings=mergeObject({density:"comfortable",animations:true,brainMode:env.brain.mode},w.settings);
    w.theme=mergeObject(env.theme,w.theme);
    w.background=mergeObject(env.background,w.background);
    w.brain=mergeObject(env.brain,w.brain);
    w.dashboard=mergeObject(env.dashboard,w.dashboard);
    w.widgets=mergeObject(env.widgets,w.widgets);
    w.notes=mergeObject(env.notes,w.notes);
    w.tasks=mergeObject(env.tasks,w.tasks);
    w.integrations=mergeObject(env.integrations,w.integrations);
    w.ai=mergeObject({memory:[],briefings:[],provider:null},w.ai);
    w.widgets.active=normalizeArray(w.widgets.active,env.widgets.active);
    w.widgets.favorites=normalizeArray(w.widgets.favorites,env.widgets.favorites);
    w.widgets.hidden=normalizeArray(w.widgets.hidden,[]);
    w.integrations.enabled=normalizeArray(w.integrations.enabled,env.integrations.enabled);
    w.integrations.pinned=normalizeArray(w.integrations.pinned,env.integrations.pinned);
    w.notes.pinned=normalizeArray(w.notes.pinned,[]);
    w.notes.tags=normalizeArray(w.notes.tags,[]);
    w.dashboard.layoutId=w.dashboard.layoutId||w.layoutId||("ws-"+(w.id||Date.now())+"-layout");
    w.layoutId=w.layoutId||w.dashboard.layoutId;
    w.dashboard.template=w.dashboard.template||w.template||"control";
    w.sidebarConfig=Array.isArray(w.sidebarConfig)?w.sidebarConfig:null;
    w.dock=w.dock&&typeof w.dock==="object"?w.dock:null;
    w.logo=w.logo||"";
    w.description=w.description||"";
    w.favorites=Array.isArray(w.favorites)?w.favorites:[];
    w.shared=w.shared||{enabled:false,updatedAt:null};
    return w;
  }
  function seedWorkspace(seed,index,baseState){
    var w=copy(seed);
    w.order=index;
    w.createdAt=w.createdAt||new Date().toISOString();
    w.data=index===0?dataFromState(baseState||{}):dataFromState({});
    return ensureData(w);
  }
  function normalizeWorkspace(raw,index,baseState){
    var seed=DEFAULTS[index]||DEFAULTS[0];
    var w=Object.assign({},copy(seed),raw||{});
    if(!w.id)w.id="ws-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,5);
    if(!w.name)w.name=seed.name;
    if(!w.label)w.label=w.name;
    if(!w.icon)w.icon=seed.icon;
    if(!w.accent)w.accent=seed.accent;
    if(!w.wallpaper)w.wallpaper=seed.wallpaper;
    if(!w.layoutId)w.layoutId=seed.layoutId||("ws-"+w.id+"-layout");
    if(!w.template)w.template=seed.template||"control";
    if(!w.description)w.description=seed.description||"";
    if(!Array.isArray(w.favorites))w.favorites=Array.isArray(seed.favorites)?seed.favorites.slice():[];
    if(!w.emoji)w.emoji=seed.emoji||String(w.name||"S").slice(0,2).toUpperCase();
    if(!w.data)w.data=index===0?dataFromState(baseState||{}):dataFromState({});
    return ensureData(w);
  }
  function ensure(){
    var p=profile();
    if(!p)return [];
    p.state=p.state||{};
    var changed=false;
    if(!Array.isArray(p.workspaces)||!p.workspaces.length){
      p.workspaces=DEFAULTS.map(function(seed,i){return seedWorkspace(seed,i,p.state)});
      p.activeWorkspaceId=p.activeWorkspaceId||p.workspaces[0].id;
      changed=true;
    }else{
      var before="";
      try{before=JSON.stringify(p.workspaces)}catch(e){before=""}
      p.workspaces=p.workspaces.map(function(w,i){return normalizeWorkspace(w,i,p.state)});
      try{changed=changed||before!==JSON.stringify(p.workspaces)}catch(e){changed=true}
    }
    if(!p.activeWorkspaceId||!p.workspaces.some(function(w){return w.id===p.activeWorkspaceId})){
      p.activeWorkspaceId=p.workspaces[0].id;
      changed=true;
    }
    var current=p.workspaces.find(function(w){return w.id===p.activeWorkspaceId})||p.workspaces[0];
    applyVisual(current);
    if(changed)save();
    return p.workspaces;
  }
  function all(){return ensure()}
  function active(){
    var p=profile();if(!p)return null;
    var list=ensure();
    return list.find(function(w){return w.id===p.activeWorkspaceId})||list[0]||null;
  }
  function snapshot(id){
    var p=profile();if(!p||!Array.isArray(p.workspaces))return;
    var w=p.workspaces.find(function(x){return x.id===(id||p.activeWorkspaceId)});
    if(!w)return;
    ensureData(w);
    w.data=dataFromState(p.state||{});
    w.sidebarConfig=copy(p.sidebarConfig||null);
    w.dock=copy(p.state&&p.state.permanentDock||null);
    w.dashboard=mergeObject(w.dashboard,{
      layoutId:w.layoutId,
      activePage:(function(){var el=document.querySelector(".tab-content.active[id^='page-']");return el?el.id.replace(/^page-/,""):"dashboard"})(),
      updatedAt:new Date().toISOString()
    });
    w.widgets=mergeObject(w.widgets,{live:copy(p.state&&p.state.liveWidgets||{})});
    w.settings=Object.assign({},w.settings||{},{
      density:document.documentElement.getAttribute("data-density")||w.settings&&w.settings.density||"comfortable",
      font:document.documentElement.getAttribute("data-font")||w.settings&&w.settings.font||"",
      sidebarWidth:(function(){try{return localStorage.getItem("sidebar_width")||""}catch(e){return ""}})()
    });
    w.updatedAt=new Date().toISOString();
  }
  function applyData(w){
    var p=profile();if(!p||!w)return;
    p.state=p.state||{};
    ensureData(w);
    DATA_FIELDS.forEach(function(field){
      p.state[field]=copy(w.data[field]!==undefined?w.data[field]:fieldDefault(field));
    });
    p.state.activeWorkspaceId=w.id;
    p.state.activeWorkspaceName=w.name;
    p.state.activeSpace=w.id;
    p.state.spaceContext=spaceContext(w.id);
    p.state.spaceBrain=copy(w.brain||{});
    p.state.spaceDashboard=copy(w.dashboard||{});
    if(Array.isArray(w.sidebarConfig))p.sidebarConfig=copy(w.sidebarConfig);
    if(w.dock)p.state.permanentDock=copy(w.dock);
    if(w.settings&&w.settings.sidebarWidth){
      try{localStorage.setItem("sidebar_width",String(w.settings.sidebarWidth))}catch(e){}
    }
  }
  function hexToRgb(hex){
    var v=String(hex||"#8b5cf6").replace("#","");
    if(v.length===3)v=v.split("").map(function(x){return x+x}).join("");
    var n=parseInt(v,16);
    if(!isFinite(n))return [139,92,246];
    return [(n>>16)&255,(n>>8)&255,n&255];
  }
  function mix(hex,amount){
    var rgb=hexToRgb(hex),out=rgb.map(function(v){return Math.max(0,Math.min(255,Math.round(v+(255-v)*amount)))});
    return "#"+out.map(function(v){return v.toString(16).padStart(2,"0")}).join("");
  }
  function applyVisual(w){
    if(!w)return;
    var root=document.documentElement,st=coreStorage(),rgb=hexToRgb(w.accent);
    var body=document.body;
    var template=String(w.template||w.dashboard&&w.dashboard.template||"control").replace(/[^a-z0-9_-]/gi,"-").toLowerCase();
    root.style.setProperty("--accent",w.accent);
    root.style.setProperty("--space-accent",w.accent);
    root.style.setProperty("--space-accent-rgb",rgb.join(","));
    root.style.setProperty("--accent-hover",mix(w.accent,.22));
    root.style.setProperty("--accent-active",mix(w.accent,-.12));
    root.style.setProperty("--accent-border","rgba("+rgb.join(",")+",.32)");
    root.style.setProperty("--accent-soft","rgba("+rgb.join(",")+",.13)");
    root.style.setProperty("--accent-shadow","rgba("+rgb.join(",")+",.22)");
    root.style.setProperty("--workspace-wallpaper",w.wallpaper||w.background&&w.background.value||"#09090b");
    root.style.setProperty("--space-wallpaper",w.wallpaper||w.background&&w.background.value||"#09090b");
    root.dataset.space=w.id;
    root.dataset.spaceTemplate=template;
    root.dataset.spaceBrain=w.brain&&w.brain.mode||"contextual";
    root.dataset.spaceTheme=w.theme&&w.theme.preset||"ethone-purple";
    if(body){
      if(lastTemplateClass)body.classList.remove(lastTemplateClass);
      lastTemplateClass="ethone-space-template-"+template;
      body.dataset.workspace=w.id;
      body.dataset.space=w.id;
      body.dataset.spaceTemplate=template;
      body.dataset.spaceBrain=w.brain&&w.brain.mode||"contextual";
      body.classList.add("ethone-spaces-ready",lastTemplateClass);
    }
    if(st)st.set("ethone:active-workspace",w.name);
    try{localStorage.setItem("ethone:active-workspace-id",w.id)}catch(e){}
    try{localStorage.setItem("ethone:active-space-id",w.id)}catch(e){}
    try{if(window.ETHONEStateConsistency&&window.ETHONEStateConsistency.setWorkspace)window.ETHONEStateConsistency.setWorkspace({id:w.id,name:w.name||w.label||""})}catch(e){}
  }
  function setActive(id,opts){
    opts=opts||{};
    var p=profile();if(!p)return null;
    var list=ensure(),next=list.find(function(w){return w.id===id});
    if(!next)return null;
    var previous=list.find(function(w){return w.id===p.activeWorkspaceId})||null;
    document.body.dataset.spaceTransitionLabel=next.name||"ETHONE Space";
    document.body.dataset.spaceTransitionTemplate=next.template||"control";
    document.body.classList.add("ethone-space-transitioning","ethone-space-changing");
    window.dispatchEvent(new CustomEvent("ethone:space-transition-start",{detail:{from:copy(previous),to:copy(next)}}));
    if(p.activeWorkspaceId!==next.id)snapshot(p.activeWorkspaceId);
    p.activeWorkspaceId=next.id;
    applyData(next);
    applyVisual(next);
    save();
    clearTimeout(transitionTimer);
    transitionTimer=setTimeout(function(){
      document.body.classList.remove("ethone-space-transitioning","ethone-space-changing");
      window.dispatchEvent(new CustomEvent("ethone:space-transition-end",{detail:{space:copy(next),workspace:copy(next)}}));
    },620);
    window.dispatchEvent(new CustomEvent("ethone:workspace-change",{detail:{workspace:copy(next)}}));
    window.dispatchEvent(new CustomEvent("ethone:space-change",{detail:{space:copy(next),workspace:copy(next)}}));
    if(!opts.silent&&typeof window.toast==="function")window.toast("Workspace: "+next.name,"success");
    return next;
  }
  function update(id,patch){
    var p=profile();if(!p)return null;
    var list=ensure(),w=list.find(function(x){return x.id===id});
    if(!w)return null;
    Object.assign(w,patch||{});
    ensureData(w);
    if(p.activeWorkspaceId===w.id)applyVisual(w);
    save();
    window.dispatchEvent(new CustomEvent("ethone:workspace-update",{detail:{workspace:copy(w)}}));
    window.dispatchEvent(new CustomEvent("ethone:space-update",{detail:{space:copy(w),workspace:copy(w)}}));
    return w;
  }
  function create(input){
    var p=profile();if(!p)return null;
    var list=ensure(),base=DEFAULTS[list.length%DEFAULTS.length];
    var w=normalizeWorkspace(Object.assign({},base,input||{},{
      id:(input&&input.id)||"ws-"+Date.now().toString(36),
      layoutId:(input&&input.layoutId)||"ws-"+Date.now().toString(36)+"-layout"
    }),list.length,{});
    w.data=dataFromState({});
    list.push(w);
    save();
    window.dispatchEvent(new CustomEvent("ethone:workspace-update",{detail:{workspace:copy(w)}}));
    window.dispatchEvent(new CustomEvent("ethone:space-update",{detail:{space:copy(w),workspace:copy(w)}}));
    return w;
  }
  function duplicate(id){
    var p=profile();if(!p)return null;
    var list=ensure(),src=list.find(function(w){return w.id===id})||active();
    if(!src)return null;
    snapshot(src.id);
    var clone=copy(src);
    clone.id="ws-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,5);
    clone.name=(src.name||"Space")+" Copy";
    clone.label=clone.name;
    clone.layoutId="ws-"+clone.id+"-layout";
    clone.createdAt=new Date().toISOString();
    clone.updatedAt=clone.createdAt;
    list.push(normalizeWorkspace(clone,list.length,{}));
    save();
    window.dispatchEvent(new CustomEvent("ethone:space-update",{detail:{space:copy(clone),workspace:copy(clone)}}));
    return clone;
  }
  function remove(id){
    var p=profile();if(!p)return false;
    var list=ensure();
    if(list.length<=1)return false;
    var idx=list.findIndex(function(w){return w.id===id});
    if(idx<0)return false;
    list.splice(idx,1);
    if(p.activeWorkspaceId===id)setActive(list[Math.max(0,idx-1)].id,{silent:true});
    save();
    window.dispatchEvent(new CustomEvent("ethone:workspace-update",{}));
    window.dispatchEvent(new CustomEvent("ethone:space-update",{}));
    return true;
  }
  function serialize(id){
    var p=profile(),list=ensure(),w=list.find(function(x){return x.id===id})||active();
    if(!w)return null;
    snapshot(w.id);
    return {type:"ethone-space",version:2,exportedAt:new Date().toISOString(),space:copy(w),profile:{id:p&&p.id,name:p&&p.name}};
  }
  function exportSpace(id){
    var payload=serialize(id);
    return payload?JSON.stringify(payload,null,2):"";
  }
  function importSpace(payload,opts){
    opts=opts||{};
    var parsed=payload;
    if(typeof payload==="string"){
      try{parsed=JSON.parse(payload)}catch(e){return null}
    }
    var source=parsed&&parsed.space?parsed.space:parsed;
    if(!source||typeof source!=="object")return null;
    var p=profile();if(!p)return null;
    var list=ensure();
    var id=opts.keepId&&source.id&&!list.some(function(w){return w.id===source.id})?source.id:"ws-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,5);
    var w=normalizeWorkspace(Object.assign({},source,{id:id,name:opts.name||source.name||"Imported Space",label:opts.name||source.label||source.name||"Imported Space"}),list.length,{});
    w.importedAt=new Date().toISOString();
    list.push(w);
    save();
    window.dispatchEvent(new CustomEvent("ethone:space-update",{detail:{space:copy(w),workspace:copy(w)}}));
    return w;
  }
  function share(id){
    var payload=exportSpace(id);
    var w=active();
    try{
      var encoded=btoa(unescape(encodeURIComponent(payload)));
      var url=location.origin+location.pathname+"#space="+encoded;
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).catch(function(){});
      if(w)update(w.id,{shared:{enabled:true,updatedAt:new Date().toISOString(),url:url}});
      return url;
    }catch(e){
      return payload;
    }
  }
  function setFavorite(id,page,on){
    var p=profile(),list=ensure(),w=list.find(function(x){return x.id===id})||active();
    if(!w||!page)return null;
    w.favorites=Array.isArray(w.favorites)?w.favorites:[];
    var exists=w.favorites.indexOf(page)>-1;
    if(on===false&&exists)w.favorites=w.favorites.filter(function(x){return x!==page});
    else if(on!==false&&!exists)w.favorites.push(page);
    save();
    window.dispatchEvent(new CustomEvent("ethone:space-update",{detail:{space:copy(w),workspace:copy(w)}}));
    return w;
  }
  function scopedState(base){
    var w=active();
    if(!w)return base||{};
    var out=Object.assign({},base||{});
    ensureData(w);
    DATA_FIELDS.forEach(function(field){out[field]=copy(w.data[field]!==undefined?w.data[field]:fieldDefault(field))});
    out.activeWorkspaceId=w.id;
    out.activeWorkspaceName=w.name;
    out.activeSpace=w.id;
    out.spaceContext=spaceContext(w.id);
    return out;
  }
  function spaceContext(id){
    var list=ensure(),w=list.find(function(x){return x.id===(id||active()&&active().id)})||active();
    if(!w)return null;
    ensureData(w);
    return {
      id:w.id,
      name:w.name,
      template:w.template,
      dashboard:copy(w.dashboard),
      widgets:copy(w.widgets),
      theme:copy(w.theme),
      background:copy(w.background),
      brain:copy(w.brain),
      notes:copy(w.notes),
      tasks:copy(w.tasks),
      integrations:copy(w.integrations),
      favorites:copy(w.favorites||[])
    };
  }
  function dashboard(id){var c=spaceContext(id);return c&&c.dashboard}
  function widgets(id){var c=spaceContext(id);return c&&c.widgets}
  function brain(id){var c=spaceContext(id);return c&&c.brain}
  function integrations(id){var c=spaceContext(id);return c&&c.integrations}
  var api={all:all,active:active,setActive:setActive,update:update,create:create,duplicate:duplicate,remove:remove,snapshot:snapshot,scopedState:scopedState,applyVisual:applyVisual,serialize:serialize,exportSpace:exportSpace,importSpace:importSpace,share:share,setFavorite:setFavorite,spaceContext:spaceContext,environment:spaceContext,dashboard:dashboard,widgets:widgets,brain:brain,integrations:integrations,dataFields:DATA_FIELDS.slice(),defaults:function(){return copy(DEFAULTS)}};
  window.ETHONEWorkspaces=api;
  window.ETHONESpaces=api;
  if(App&&App.define)App.define("workspaces",Object.freeze(api));
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){ensure()},{once:true});
  else setTimeout(function(){ensure()},0);
})();
