/* ETHONE Notification Center 2.0
 * Unified notification engine with persistent history, grouped panel, premium
 * stacked toasts, dedupe, progress timers and legacy global compatibility.
 */
(function(){
  "use strict";

  if(window.__ethoneNotificationCenterV2)return;
  window.__ethoneNotificationCenterV2=true;

  var App=window.Ethone;
  var STORAGE_KEY="ethone:notifications:v2";
  var LEGACY_STORAGE_KEY="ethone:notification-center";
  var MAX_HISTORY=220;
  var MAX_TOASTS=4;
  var DEDUPE_WINDOW=5000;
  var open=false;
  var activeFilter="all";
  var searchTerm="";
  var toastTimers=Object.create(null);
  var toastDedupe=Object.create(null);

  var TYPES={
    success:{icon:"circle-check",label:"Success",accent:"success",duration:3800},
    info:{icon:"info",label:"Info",accent:"info",duration:4200},
    warning:{icon:"triangle-alert",label:"Warning",accent:"warning",duration:5600},
    error:{icon:"circle-alert",label:"Error",accent:"error",duration:7200},
    loading:{icon:"loader-circle",label:"Loading",accent:"info",duration:0},
    brain:{icon:"brain",label:"Brain",accent:"brain",duration:5200},
    sync:{icon:"refresh-cw",label:"Sync",accent:"sync",duration:4600},
    activity:{icon:"activity",label:"Activity",accent:"activity",duration:4200}
  };

  var FILTERS=[
    ["all","inbox","All"],
    ["success","circle-check","Success"],
    ["info","info","Info"],
    ["warning","triangle-alert","Warning"],
    ["error","circle-alert","Errors"],
    ["loading","loader-circle","Loading"],
    ["brain","brain","Brain"],
    ["sync","refresh-cw","Sync"]
  ];

  var TEXT={
    fr:{
      title:"Centre de notifications",
      subtitle:"Alertes, synchronisations et activite recente",
      search:"Rechercher une notification...",
      empty:"Tout est calme",
      emptySub:"Aucune notification ne correspond a ce filtre.",
      total:"total",
      unread:"non lues",
      markAll:"Tout marquer lu",
      clear:"Effacer",
      history:"Historique",
      undo:"Annuler",
      dismiss:"Fermer",
      now:"maintenant",
      grouped:"regroupees",
      filters:{all:"Tout",success:"Succes",info:"Info",warning:"Alertes",error:"Erreurs",loading:"Chargement",brain:"Brain",sync:"Sync",activity:"Activite"}
    },
    en:{
      title:"Notification Center",
      subtitle:"Alerts, sync and recent activity",
      search:"Search notifications...",
      empty:"All clear",
      emptySub:"No notifications match this filter.",
      total:"total",
      unread:"unread",
      markAll:"Mark all read",
      clear:"Clear",
      history:"History",
      undo:"Undo",
      dismiss:"Dismiss",
      now:"now",
      grouped:"grouped",
      filters:{all:"All",success:"Success",info:"Info",warning:"Warnings",error:"Errors",loading:"Loading",brain:"Brain",sync:"Sync",activity:"Activity"}
    }
  };

  function q(selector,root){return (root||document).querySelector(selector)}
  function qsa(selector,root){return Array.prototype.slice.call((root||document).querySelectorAll(selector))}
  function esc(value){
    return String(value==null?"":value).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }
  function cssId(value){
    value=String(value==null?"":value);
    if(window.CSS&&typeof window.CSS.escape==="function")return window.CSS.escape(value);
    return value.replace(/["\\]/g,"\\$&");
  }
  function lang(){
    var value="fr";
    try{value=String(window._lang||localStorage.getItem("ethone_lang")||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}catch(e){}
    return TEXT[value]?value:"fr";
  }
  function tx(key){
    var table=TEXT[lang()]||TEXT.fr;
    return table[key]||TEXT.en[key]||key;
  }
  function filterLabel(type){
    var table=(TEXT[lang()]||TEXT.fr).filters||TEXT.en.filters;
    return table[type]||TEXT.en.filters[type]||type;
  }
  function nowISO(){return new Date().toISOString()}
  function uid(){return "n-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)}
  function typeOf(input){
    var value=String((input&&input.type)||(input&&input.category)||"info").toLowerCase();
    if(value==="danger"||value==="failed"||value==="offline")return "error";
    if(value==="warn"||value==="reminder")return "warning";
    if(value==="ai")return "brain";
    if(value==="saved"||value==="connected"||value==="complete"||value==="done")return "success";
    if(TYPES[value])return value;
    return "info";
  }
  function iconFor(type,icon){
    if(icon&&/^[a-z0-9-]+$/i.test(icon))return icon;
    return (TYPES[type]&&TYPES[type].icon)||"bell";
  }
  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }
  function workspace(){
    try{
      var w=window.ETHONEWorkspaces&&window.ETHONEWorkspaces.active?window.ETHONEWorkspaces.active():null;
      return w?{id:w.id,name:w.name}:null;
    }catch(e){return null}
  }
  function readStorage(){
    try{
      var next=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
      if(Array.isArray(next))return next;
    }catch(e){}
    try{
      var legacy=JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)||"[]");
      if(Array.isArray(legacy))return legacy.map(function(n){
        return normalize({
          id:n.id,
          title:n.title||n.message,
          body:n.body||n.sub,
          type:n.category||n.type,
          icon:n.icon,
          createdAt:n.createdAt||n.time,
          read:!!n.read
        },true);
      });
    }catch(e){}
    return [];
  }
  function store(){
    var p=profile();
    if(p){
      p.state=p.state||{};
      if(!Array.isArray(p.state.notificationsV2))p.state.notificationsV2=readStorage();
      return p.state.notificationsV2;
    }
    return readStorage();
  }
  function persist(list){
    list=list.slice(0,MAX_HISTORY);
    var p=profile();
    if(p){p.state=p.state||{};p.state.notificationsV2=list;try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(list))}catch(e){}
  }
  function prefs(){
    var p=profile();
    if(!p)return {tasks:true,habits:true,events:true,ai:true,system:true,quietStart:"",quietEnd:""};
    p.state=p.state||{};
    if(!p.state.notifPrefs)p.state.notifPrefs={tasks:true,habits:true,events:true,ai:true,system:true,quietStart:"",quietEnd:""};
    return p.state.notifPrefs;
  }
  function inQuietHours(config){
    var start=config&&config.quietStart,end=config&&config.quietEnd;
    if(!start||!end)return false;
    var now=new Date();
    var cur=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
    return start<end?(cur>=start&&cur<=end):(cur>=start||cur<=end);
  }
  function allowed(input,type){
    var config=prefs();
    var key=(input&&input.preference)||(type==="brain"?"ai":type==="warning"?"system":type==="sync"?"system":type==="error"?"system":"system");
    if(inQuietHours(config)&&!(input&&input.force))return false;
    return config[key]!==false;
  }
  function normalize(input,fromStorage){
    input=input||{};
    var type=typeOf(input);
    var title=String(input.title||input.message||filterLabel(type)||"Notification").trim();
    var body=String(input.body||input.sub||input.description||"").trim();
    var id=input.id||uid();
    var createdAt=input.createdAt||input.time||nowISO();
    var dedupe=input.dedupe||[type,title.toLowerCase(),body.toLowerCase()].join("|");
    return {
      id:id,
      dedupe:dedupe,
      type:type,
      category:type,
      icon:iconFor(type,input.icon),
      title:title.slice(0,140),
      body:body.slice(0,360),
      createdAt:createdAt,
      read:!!input.read,
      count:Math.max(1,Number(input.count||1)||1),
      progress:typeof input.progress==="number"?Math.max(0,Math.min(100,input.progress)):null,
      loading:type==="loading"||!!input.loading,
      workspace:input.workspace||workspace(),
      action:input.action||null,
      undo:input.undo||null,
      source:input.source||"",
      meta:fromStorage?input.meta||{}:(input.meta||{})
    };
  }
  function dedupeExisting(list,next){
    var cutoff=Date.now()-DEDUPE_WINDOW;
    return list.find(function(item){
      if(item.dedupe!==next.dedupe)return false;
      return new Date(item.createdAt||0).getTime()>=cutoff;
    });
  }
  function notify(input){
    var next=normalize(input);
    if(!allowed(input,next.type))return null;
    var list=store();
    var existing=dedupeExisting(list,next);
    if(existing){
      existing.count=(existing.count||1)+1;
      existing.createdAt=nowISO();
      existing.read=false;
      existing.body=next.body||existing.body;
      existing.progress=next.progress!=null?next.progress:existing.progress;
      persist(list);
      updateBadge();
      renderPanel();
      renderToast(existing,true);
      return existing;
    }
    list.unshift(next);
    persist(list);
    updateBadge();
    renderPanel();
    if(input&&input.toast!==false)renderToast(next,false);
    window.dispatchEvent(new CustomEvent("ethone:notification",{detail:{notification:next}}));
    return next;
  }
  function toast(message,type,options){
    options=options||{};
    return notify({
      title:message,
      type:type||"info",
      body:options.body||"",
      action:options.action,
      undo:options.undo,
      progress:options.progress,
      source:"toast",
      force:options.force,
      dedupe:options.dedupe
    });
  }
  function host(){
    var node=document.getElementById("toasts");
    if(!node){
      node=document.createElement("div");
      node.id="toasts";
      node.className="toast-container";
      document.body.appendChild(node);
    }
    node.classList.add("nc-toast-stack");
    return node;
  }
  function removeToast(id){
    var el=document.querySelector('[data-toast-id="'+cssId(id)+'"]');
    if(!el)return;
    clearTimeout(toastTimers[id]);
    delete toastTimers[id];
    el.classList.add("is-leaving");
    setTimeout(function(){if(el.parentNode)el.remove()},210);
  }
  function renderToast(item,isUpdate){
    var h=host();
    var id=item.id;
    var duration=(TYPES[item.type]&&TYPES[item.type].duration)||4200;
    if(item.loading)duration=0;
    var el=document.querySelector('[data-toast-id="'+cssId(id)+'"]');
    if(!el){
      el=document.createElement("article");
      el.className="nc-toast";
      el.dataset.toastId=id;
      el.dataset.type=item.type;
      h.appendChild(el);
    }
    el.innerHTML=toastHTML(item,duration);
    el.classList.toggle("is-updated",!!isUpdate);
    var close=el.querySelector("[data-toast-close]");
    if(close)close.onclick=function(){removeToast(id)};
    var action=el.querySelector("[data-toast-action]");
    if(action)action.onclick=function(){runAction(id);removeToast(id)};
    var undo=el.querySelector("[data-toast-undo]");
    if(undo)undo.onclick=function(){runUndo(id);removeToast(id)};
    try{if(window.lucide)window.lucide.createIcons({attrs:{"aria-hidden":"true"}})}catch(e){}
    qsa(".nc-toast",h).slice(0,Math.max(0,h.children.length-MAX_TOASTS)).forEach(function(node){removeToast(node.dataset.toastId)});
    clearTimeout(toastTimers[id]);
    if(duration>0)toastTimers[id]=setTimeout(function(){removeToast(id)},duration);
  }
  function toastHTML(item,duration){
    var pct=item.progress!=null?item.progress:duration>0?100:0;
    var action=item.action?'<button type="button" data-toast-action>'+esc(item.action.label||"Open")+'</button>':"";
    var undo=item.undo?'<button type="button" data-toast-undo>'+esc(tx("undo"))+'</button>':"";
    var count=item.count>1?'<span class="nc-toast-count">x'+item.count+'</span>':"";
    return '<div class="nc-toast-icon"><i data-lucide="'+esc(item.icon)+'"></i></div>'+
      '<div class="nc-toast-main"><div class="nc-toast-row"><strong>'+esc(item.title)+'</strong>'+count+'</div>'+
      (item.body?'<p>'+esc(item.body)+'</p>':'')+
      (action||undo?'<div class="nc-toast-actions">'+action+undo+'</div>':'')+
      '<div class="nc-toast-progress" style="--nc-progress:'+pct+'%;--nc-duration:'+duration+'ms"></div></div>'+
      '<button class="nc-toast-close" type="button" data-toast-close aria-label="'+esc(tx("dismiss"))+'">x</button>';
  }
  function visibleItems(){
    var term=searchTerm.trim().toLowerCase();
    return store().filter(function(item){
      if(activeFilter!=="all"&&item.type!==activeFilter)return false;
      if(!term)return true;
      return [item.title,item.body,item.type,item.source,item.workspace&&item.workspace.name].join(" ").toLowerCase().indexOf(term)!==-1;
    });
  }
  function grouped(items){
    var groups=[];
    var map=Object.create(null);
    items.forEach(function(item){
      var day=new Date(item.createdAt||Date.now()).toLocaleDateString(lang()==="fr"?"fr-FR":"en-US",{weekday:"long",day:"numeric",month:"short"});
      if(!map[day]){map[day]=[];groups.push([day,map[day]])}
      map[day].push(item);
    });
    return groups;
  }
  function updateBadge(){
    var badge=document.getElementById("notif-badge");
    if(!badge)return;
    var unread=store().filter(function(item){return !item.read}).length;
    if(unread>0){badge.textContent=unread>9?"9+":String(unread);badge.classList.add("show")}
    else {badge.textContent="";badge.classList.remove("show")}
  }
  function timeAgo(ts){
    var diff=Math.max(0,Math.floor((Date.now()-new Date(ts||Date.now()).getTime())/1000));
    if(diff<10)return tx("now");
    if(diff<60)return diff+"s";
    if(diff<3600)return Math.floor(diff/60)+"m";
    if(diff<86400)return Math.floor(diff/3600)+"h";
    return Math.floor(diff/86400)+"d";
  }
  function renderPanel(){
    var panel=document.getElementById("notif-panel");
    var body=document.getElementById("notif-panel-body");
    if(!panel||!body)return;
    panel.classList.add("notification-center","notification-center-v2");
    var title=q(".notif-panel-title",panel);
    var count=q("#notif-count-label",panel);
    var list=store();
    var unread=list.filter(function(item){return !item.read}).length;
    if(title)title.textContent=tx("title");
    if(count)count.textContent=list.length+" "+tx("total")+" - "+unread+" "+tx("unread");
    body.innerHTML=panelHTML();
    try{if(window.lucide)window.lucide.createIcons({attrs:{"aria-hidden":"true"}})}catch(e){}
  }
  function panelHTML(){
    var items=visibleItems();
    var counts=store().reduce(function(acc,item){acc.all++;acc[item.type]=(acc[item.type]||0)+1;return acc},{all:0});
    var filters='<div class="nc2-filter-row" role="tablist">'+FILTERS.map(function(f){
      return '<button type="button" class="nc2-filter '+(activeFilter===f[0]?'active':'')+'" data-nc-filter="'+esc(f[0])+'" role="tab" aria-selected="'+(activeFilter===f[0]?'true':'false')+'"><i data-lucide="'+esc(f[1])+'"></i><span>'+esc(filterLabel(f[0]))+'</span><b>'+(counts[f[0]]||0)+'</b></button>';
    }).join("")+'</div>';
    var search='<div class="nc2-search"><i data-lucide="search"></i><input id="nc2-search-input" type="search" value="'+esc(searchTerm)+'" placeholder="'+esc(tx("search"))+'" autocomplete="off"></div>';
    if(!items.length)return '<div class="nc2-top">'+search+filters+'</div><div class="nc-empty"><i data-lucide="bell-off"></i><strong>'+esc(tx("empty"))+'</strong><span>'+esc(tx("emptySub"))+'</span></div>';
    return '<div class="nc2-top">'+search+filters+'</div><div class="nc2-groups">'+grouped(items).map(function(group){
      return '<section class="nc2-group"><div class="nc2-group-title">'+esc(group[0])+'<span>'+group[1].length+' '+esc(tx("grouped"))+'</span></div><div class="nc-list">'+group[1].map(itemHTML).join("")+'</div></section>';
    }).join("")+'</div>';
  }
  function itemHTML(item){
    var hasAction=!!item.action;
    var hasUndo=!!item.undo;
    var count=item.count>1?'<span class="nc2-count">x'+item.count+'</span>':"";
    var progress=item.progress!=null||item.loading?'<div class="nc2-progress"><span style="width:'+(item.progress==null?42:item.progress)+'%"></span></div>':"";
    return '<article class="nc-item nc2-item '+(item.read?'':'unread')+'" data-type="'+esc(item.type)+'" data-nc-id="'+esc(item.id)+'">'+
      '<div class="nc-icon nc2-icon"><i data-lucide="'+esc(item.icon)+'"></i></div>'+
      '<div class="nc-content"><div class="nc-meta"><span>'+esc(filterLabel(item.type))+'</span>'+count+'<time>'+esc(timeAgo(item.createdAt))+'</time></div>'+
      '<h3>'+esc(item.title)+'</h3>'+(item.body?'<p>'+esc(item.body)+'</p>':'')+
      (item.workspace&&item.workspace.name?'<div class="nc-workspace">'+esc(item.workspace.name)+'</div>':'')+progress+'</div>'+
      '<div class="nc-actions">'+(!item.read?'<button type="button" data-nc-read="'+esc(item.id)+'">Lu</button>':'')+
      (hasAction?'<button class="primary" type="button" data-nc-action="'+esc(item.id)+'">'+esc(item.action.label||"Open")+'</button>':'')+
      (hasUndo?'<button type="button" data-nc-undo="'+esc(item.id)+'">'+esc(tx("undo"))+'</button>':'')+'</div></article>';
  }
  function openPanel(){
    var wasOpen=open;
    open=true;
    if(!wasOpen){activeFilter="all";searchTerm=""}
    scan();
    renderPanel();
    var panel=document.getElementById("notif-panel");
    var overlay=document.getElementById("notif-overlay");
    document.documentElement.classList.add("notification-center-open");
    if(panel){
      panel.style.removeProperty("display");
      panel.style.removeProperty("visibility");
      panel.style.removeProperty("opacity");
      panel.classList.add("open","notification-center","notification-center-v2");
      panel.inert=false;
      panel.setAttribute("aria-hidden","false");
    }
    if(overlay){
      overlay.style.removeProperty("display");
      overlay.style.removeProperty("visibility");
      overlay.style.removeProperty("opacity");
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden","false");
    }
    setTimeout(function(){markRead()},650);
  }
  function closePanel(){
    open=false;
    var panel=document.getElementById("notif-panel");
    var overlay=document.getElementById("notif-overlay");
    document.documentElement.classList.remove("notification-center-open");
    if(panel){panel.classList.remove("open");panel.inert=true;panel.setAttribute("aria-hidden","true")}
    if(overlay){overlay.classList.remove("open");overlay.setAttribute("aria-hidden","true")}
  }
  function togglePanel(){
    var panel=document.getElementById("notif-panel");
    var visiblyOpen=!!(panel&&panel.classList.contains("open")&&panel.getAttribute("aria-hidden")!=="true");
    if(visiblyOpen)return closePanel();
    return openPanel();
  }
  function markRead(id){
    var list=store();
    list.forEach(function(item){if(!id||item.id===id)item.read=true});
    persist(list);updateBadge();if(open)renderPanel();
  }
  function clear(){
    activeFilter="all";
    searchTerm="";
    persist([]);
    Object.keys(toastTimers).forEach(function(id){clearTimeout(toastTimers[id]);delete toastTimers[id]});
    qsa(".nc-toast",host()).forEach(function(node){node.remove()});
    updateBadge();
    renderPanel();
  }
  function runAction(id){
    var list=store();
    var item=list.find(function(n){return n.id===id});
    if(!item)return;
    item.read=true;persist(list);updateBadge();
    var action=item.action;
    if(action&&typeof action.handler==="function"){action.handler(item);closePanel();return}
    if(action&&action.actionId&&App&&App.get){
      var Actions=App.get("actions");
      if(Actions&&Actions.dispatch){Actions.dispatch(action.actionId,action.context||{source:"notification-center"});closePanel();return}
    }
    if(action&&action.page&&App&&App.get){
      var PageActions=App.get("actions");
      if(PageActions&&PageActions.dispatch){PageActions.dispatch("navigation.open",{page:action.page,source:"notification-center"});closePanel();return}
    }
  }
  function runUndo(id){
    var item=store().find(function(n){return n.id===id});
    if(item&&item.undo&&typeof item.undo.handler==="function")item.undo.handler(item);
    else if(item&&item.undo&&typeof item.undo==="function")item.undo(item);
    notify({title:"Action annulee",type:"success",dedupe:"undo-"+id});
  }
  function scan(){
    var p=profile();
    if(!p||!p.state)return;
    var now=new Date();
    var today=now.toLocaleDateString("en-CA");
    var todos=Array.isArray(p.state.todos)?p.state.todos:[];
    var overdue=todos.filter(function(t){return !t.done&&t.dueDate&&new Date(t.dueDate)<now});
    if(overdue.length)notify({dedupe:"tasks-overdue-"+today,type:"warning",title:overdue.length+" overdue task"+(overdue.length>1?"s":""),body:overdue.slice(0,2).map(function(t){return t.text||t.title}).join(", "),preference:"tasks",icon:"triangle-alert",action:{label:"Tasks",page:"todos"},toast:false});
    var due=todos.filter(function(t){return !t.done&&t.dueDate&&new Date(t.dueDate).toLocaleDateString("en-CA")===today});
    if(due.length)notify({dedupe:"tasks-due-"+today,type:"warning",title:due.length+" task"+(due.length>1?"s":"")+" due today",body:due.slice(0,2).map(function(t){return t.text||t.title}).join(", "),preference:"tasks",icon:"calendar-clock",action:{label:"Tasks",page:"todos"},toast:false});
    var events=(Array.isArray(p.state.events)?p.state.events:[]).filter(function(e){var d=new Date(e.date);return d>=now&&d<new Date(now.getTime()+86400000)});
    if(events.length)notify({dedupe:"events-24h-"+today,type:"info",title:events.length+" event"+(events.length>1?"s":"")+" in next 24h",body:events.slice(0,2).map(function(e){return e.title}).join(", "),preference:"events",icon:"calendar-days",action:{label:"Calendar",page:"calendar"},toast:false,read:true});
  }
  function installEvents(){
    if(window.__ethoneNotificationCenterV2Events)return;
    window.__ethoneNotificationCenterV2Events=true;
    document.addEventListener("click",function(event){
      var target=event.target;
      var filter=target.closest("[data-nc-filter]");
      if(filter){activeFilter=filter.dataset.ncFilter||"all";renderPanel();return}
      var read=target.closest("[data-nc-read]");
      if(read){markRead(read.dataset.ncRead);return}
      var action=target.closest("[data-nc-action]");
      if(action){runAction(action.dataset.ncAction);return}
      var undo=target.closest("[data-nc-undo]");
      if(undo){runUndo(undo.dataset.ncUndo);return}
      if(target.closest("[data-nc-mark-all]")){markRead();return}
      if(target.closest("[data-nc-clear]")){clear();return}
    });
    document.addEventListener("input",function(event){
      if(event.target&&event.target.id==="nc2-search-input"){searchTerm=event.target.value||"";renderPanel()}
    });
    document.addEventListener("keydown",function(event){
      if(event.key==="Escape"&&open)closePanel();
    });
  }
  function start(){
    installEvents();
    var initialPanel=document.getElementById("notif-panel");
    if(initialPanel&&!initialPanel.classList.contains("open")){initialPanel.inert=true;initialPanel.setAttribute("aria-hidden","true")}
    updateBadge();
    renderPanel();
    clearInterval(window.__ethoneNotificationScanTimer);
    window.__ethoneNotificationScanTimer=setInterval(function(){scan();updateBadge()},60000);
    setTimeout(scan,600);
  }
  function addLegacy(icon,title,sub,action){
    var type=/error|fail|denied|invalid|impossible|crash/i.test(String(title||""))?"error":/sync|saved|connected|created|complete|updated|done/i.test(String(title||""))?"success":"info";
    return notify({icon:icon,type:type,title:title,body:sub,action:typeof action==="function"?{label:"Open",handler:action}:action});
  }
  function notifyPomoComplete(count){
    notify({type:"success",icon:"timer",title:"Session "+count+" complete",body:"Take a break. You earned it.",dedupe:"pomo-session-"+count,action:{label:"Stats",page:"stats"}});
  }

  window.ETHONENotifications={
    notify:notify,
    toast:toast,
    history:function(){return store().slice()},
    open:openPanel,
    close:closePanel,
    toggle:togglePanel,
    render:renderPanel,
    markRead:markRead,
    clear:clear,
    scan:scan
  };
  window.toast=toast;
  window.ethoneToast=toast;
  window.addNotif=addLegacy;
  window.notifyPomoComplete=notifyPomoComplete;
  window.updateNotifBadge=updateBadge;
  window.toggleNotifPanel=togglePanel;
  window.openNotifPanel=openPanel;
  window.closeNotifPanel=closePanel;
  window.clearAllNotifs=clear;
  window.renderNotifPanel=renderPanel;
  window.scanForNotifs=scan;

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
