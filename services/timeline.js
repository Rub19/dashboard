/* ETHONE Timeline service.
 * Central persistent memory for user-visible activity across the app.
 */
(function(){
  "use strict";
  if(window.__ethoneTimelineService)return;
  window.__ethoneTimelineService=true;

  var STORAGE_KEY="ethone:timeline";
  var MAX_ITEMS=600;
  var lastPage="";
  var lastPageAt=0;
  var CATEGORIES={
    auth:{label:"Connexions",icon:"log-in",color:"#a78bfa"},
    creation:{label:"Creations",icon:"file-plus-2",color:"#34d399"},
    modification:{label:"Modifications",icon:"pencil",color:"#fbbf24"},
    deletion:{label:"Suppressions",icon:"trash-2",color:"#f87171"},
    sync:{label:"Synchronisations",icon:"refresh-cw",color:"#60a5fa"},
    ai:{label:"IA",icon:"bot",color:"#c4b5fd"},
    plugin:{label:"Plugins",icon:"plug",color:"#a78bfa"},
    github:{label:"GitHub",icon:"git-branch",color:"#f5f5f7"},
    discord:{label:"Discord",icon:"message-circle",color:"#8b5cf6"},
    spotify:{label:"Spotify",icon:"music",color:"#34d399"},
    workspace:{label:"Workspaces",icon:"layers-3",color:"#c4b5fd"},
    content:{label:"Contenu",icon:"file-plus",color:"#8b5cf6"},
    task:{label:"Taches",icon:"check-circle-2",color:"#34d399"},
    integration:{label:"Integrations",icon:"plug",color:"#60a5fa"},
    focus:{label:"Focus",icon:"timer",color:"#f87171"},
    system:{label:"Systeme",icon:"cpu",color:"#94a3b8"},
    error:{label:"Erreurs",icon:"circle-alert",color:"#f87171"},
    success:{label:"Succes",icon:"circle-check",color:"#34d399"},
    update:{label:"Mises a jour",icon:"sparkles",color:"#a78bfa"},
    navigation:{label:"Navigation",icon:"mouse-pointer-2",color:"#c4b5fd"}
  };

  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function save(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function readFallback(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch(e){return []}}
  function writeFallback(items){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,MAX_ITEMS)))}catch(e){}}
  function now(){return new Date().toISOString()}
  function esc(v){return String(v==null?"":v)}
  function workspace(){
    try{
      var w=window.ETHONEWorkspaces&&window.ETHONEWorkspaces.active?window.ETHONEWorkspaces.active():null;
      return w?{id:w.id,name:w.name}:null;
    }catch(e){return null}
  }
  function inferCategory(text,category,type){
    var raw=String(category||type||text||"").toLowerCase();
    if(/plugin|extension|installed|reinstalled|repair/.test(raw))return "plugin";
    if(/brain|ai|ia|ethone ai|provider|model|prompt/.test(raw))return "ai";
    if(/github|commit|repository|pull request|repo/.test(raw))return "github";
    if(/discord|lanyard|presence/.test(raw))return "discord";
    if(/spotify|now playing|track|music/.test(raw))return "spotify";
    if(/workspace|space|environment/.test(raw))return "workspace";
    if(/sync|synch|synchron|refresh|cloud|saved/.test(raw))return "sync";
    if(/delete|deleted|remove|removed|suppression|supprime/.test(raw))return "deletion";
    if(/edit|edited|update|updated|modify|modified|change|changed|modification/.test(raw))return "modification";
    if(/create|created|new|add|added|creation|nouveau|nouvelle/.test(raw))return "creation";
    if(/login|log in|welcome|connexion|connecte|sign in|profile|session/.test(raw))return "auth";
    if(/task|todo|tache|objectif|goal|completed|done|accompli/.test(raw))return "task";
    if(/note|file|fichier|item|link|lien|journal|database|added|removed|opened/.test(raw))return "content";
    if(/discord|github|spotify|steam|twitch|valorant|riot|last\.fm|integration|account|api key/.test(raw))return "integration";
    if(/pomodoro|focus|session/.test(raw))return "focus";
    if(/error|erreur|fail|invalid|missing|denied/.test(raw))return "error";
    if(/success|saved|complete|updated|synch|sync|terminee|done/.test(raw))return "success";
    if(/update|version|mise/.test(raw))return "update";
    if(/page|navigation|opened page/.test(raw))return "navigation";
    return CATEGORIES[raw]?raw:"system";
  }
  function iconFor(category,explicit){
    if(explicit&&/^[a-z0-9-]+$/i.test(explicit))return explicit;
    return (CATEGORIES[category]&&CATEGORIES[category].icon)||"activity";
  }
  function colorFor(category,color){
    return color||(CATEGORIES[category]&&CATEGORIES[category].color)||"#8b5cf6";
  }
  function normalize(input){
    input=input||{};
    if(typeof input==="string")input={title:input};
    var category=inferCategory(input.title+" "+(input.body||""),input.category,input.type);
    var ts=input.ts||input.createdAt||now();
    return {
      id:input.id||("tl-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)),
      dedupe:input.dedupe||"",
      title:esc(input.title||input.text||"Activity").slice(0,140),
      body:esc(input.body||input.sub||"").slice(0,320),
      category:category,
      icon:iconFor(category,input.icon),
      color:colorFor(category,input.color),
      ts:ts,
      time:input.time||new Date(ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
      source:input.source||"",
      workspace:input.workspace||workspace(),
      meta:input.meta||null,
      action:input.action||null
    };
  }
  function migrateLegacy(list){
    if(!Array.isArray(list))return [];
    return list.map(function(a){
      if(a&&a.category&&a.title&&a.ts)return a;
      return normalize({
        title:a&&a.text?a.text:"Activity",
        color:a&&a.color,
        ts:a&&a.ts,
        time:a&&a.time,
        source:"legacy"
      });
    });
  }
  function items(){
    var p=profile();
    if(p){
      p.state=p.state||{};
      if(!Array.isArray(p.state.timeline)){
        var legacy=migrateLegacy(p.state.activity);
        var fallback=migrateLegacy(readFallback());
        p.state.timeline=legacy.length?legacy:fallback;
      }
      p.state.timeline=migrateLegacy(p.state.timeline);
      hydrateKnownState(p);
      return p.state.timeline;
    }
    return migrateLegacy(readFallback());
  }
  function persist(next){
    var normalized=migrateLegacy(next).slice(0,MAX_ITEMS);
    var p=profile();
    if(p){
      p.state=p.state||{};
      p.state.timeline=normalized;
      p.state.activity=normalized.slice(0,50).map(function(e){return{text:e.title,color:e.color,time:e.time,ts:e.ts}});
      save();
    }
    writeFallback(normalized);
  }
  function record(input){
    var entry=normalize(input);
    var list=items();
    if(entry.dedupe&&list.some(function(e){return e.dedupe===entry.dedupe}))return null;
    list.unshift(entry);
    persist(list);
    try{window.dispatchEvent(new CustomEvent("ethone:timeline",{detail:{entry:entry}}))}catch(e){}
    if(typeof window.renderActivity==="function")setTimeout(window.renderActivity,0);
    if(typeof window.renderTimelinePage==="function")setTimeout(window.renderTimelinePage,0);
    return entry;
  }
  function clear(){
    persist([]);
    if(typeof window.renderActivity==="function")window.renderActivity();
    if(typeof window.renderTimelinePage==="function")window.renderTimelinePage();
  }
  function filtered(options){
    options=options||{};
    var list=items().slice();
    if(options.category&&options.category!=="all")list=list.filter(function(e){return e.category===options.category});
    if(options.query){
      var q=String(options.query).toLowerCase();
      list=list.filter(function(e){
        var workspace=e.workspace&&e.workspace.name||"";
        var meta="";
        try{meta=JSON.stringify(e.meta||{})}catch(err){}
        return(e.title+" "+e.body+" "+e.category+" "+(e.source||"")+" "+workspace+" "+meta).toLowerCase().indexOf(q)>-1;
      });
    }
    if(options.date){
      list=list.filter(function(e){return String(e.ts||"").slice(0,10)===options.date});
    }
    return list;
  }
  function counts(){
    var out={all:items().length};
    items().forEach(function(e){out[e.category]=(out[e.category]||0)+1});
    return out;
  }
  function byDay(monthDate){
    var base=monthDate?new Date(monthDate):new Date();
    var y=base.getFullYear(),m=base.getMonth();
    var out={};
    items().forEach(function(e){
      var d=new Date(e.ts);
      if(d.getFullYear()!==y||d.getMonth()!==m)return;
      var key=d.toLocaleDateString("en-CA");
      out[key]=(out[key]||0)+1;
    });
    return out;
  }
  function heatmap(days){
    days=Number(days)||84;
    var out=[];
    var counts={};
    items().forEach(function(e){
      var key=String(e.ts||"").slice(0,10);
      if(key)counts[key]=(counts[key]||0)+1;
    });
    var today=new Date();today.setHours(0,0,0,0);
    for(var i=days-1;i>=0;i--){
      var d=new Date(today);d.setDate(today.getDate()-i);
      var key=d.toLocaleDateString("en-CA");
      out.push({date:key,count:counts[key]||0});
    }
    return out;
  }
  function hydrateKnownState(p){
    try{
      if(!p||!p.state||p.state.__activityHydratedV2)return;
      var seeds=[];
      var s=p.state;
      (s.notes||[]).slice(0,12).forEach(function(n){seeds.push({dedupe:"seed-note-"+n.id,title:"Note: "+(n.title||"Untitled"),body:"Existing note discovered in ETHONE.",category:"creation",source:"notes",ts:n.updated||n.created||now()})});
      (s.todos||[]).slice(0,16).forEach(function(t){seeds.push({dedupe:"seed-task-"+t.id,title:(t.done?"Completed task: ":"Task: ")+(t.text||"Untitled"),category:t.done?"success":"task",source:"tasks",ts:t.doneAt||t.createdAt||now()})});
      (s.items||[]).slice(0,12).forEach(function(item){seeds.push({dedupe:"seed-item-"+(item.id||item.name),title:"File/link: "+(item.name||item.title||"Item"),body:item.type||"",category:"content",source:"files",ts:item.ts||item.created||now()})});
      Object.keys(s.connections||{}).forEach(function(id){if(s.connections[id])seeds.push({dedupe:"seed-conn-"+id,title:"Connected service: "+id,category:id==="github"?"github":id==="discord"?"discord":id==="spotify"?"spotify":"integration",source:id,ts:s.connections[id].lastSync||s.connections[id].connectedAt||now()})});
      Object.keys(s.plugins||{}).forEach(function(id){var pl=s.plugins[id];if(pl&&pl.installed)seeds.push({dedupe:"seed-plugin-"+id,title:"Installed plugin: "+id,category:"plugin",source:"plugins",ts:pl.updatedAt||pl.installedAt||now()})});
      if(Array.isArray(s.workspaces))s.workspaces.slice(0,10).forEach(function(w){seeds.push({dedupe:"seed-workspace-"+w.id,title:"Workspace available: "+(w.name||w.id),category:"workspace",source:"workspaces",ts:w.updatedAt||w.createdAt||now()})});
      if(seeds.length){
        var list=p.state.timeline||[];
        seeds.forEach(function(seed){if(!list.some(function(e){return e.dedupe===seed.dedupe}))list.push(normalize(seed))});
        p.state.timeline=migrateLegacy(list).sort(function(a,b){return new Date(b.ts)-new Date(a.ts)}).slice(0,MAX_ITEMS);
        p.state.__activityHydratedV2=true;
        persist(p.state.timeline);
      }else p.state.__activityHydratedV2=true;
    }catch(e){}
  }

  window.ETHONETimeline={record:record,items:items,filtered:filtered,counts:counts,byDay:byDay,heatmap:heatmap,categories:CATEGORIES,clear:clear};
  window.ETHONEActivity=window.ETHONETimeline;
  window.logTimeline=record;
  window.getTimelineEvents=items;

  window.addEventListener("ethone:notification",function(e){
    var n=e&&e.detail&&e.detail.notification;
    if(!n)return;
    record({dedupe:"notif-"+n.id,title:n.title,body:n.body,category:n.category,icon:n.icon,ts:n.createdAt,source:"notification",workspace:n.workspace});
  });
  window.addEventListener("ethone:page-ready",function(e){
    var page=e&&e.detail&&e.detail.page;
    if(!page||page===lastPage&&Date.now()-lastPageAt<2000)return;
    lastPage=page;lastPageAt=Date.now();
    record({dedupe:"nav-"+page+"-"+Math.floor(Date.now()/30000),title:"Opened "+page,category:"navigation",icon:"panel-top-open",source:"navigation",read:true});
  });
})();
