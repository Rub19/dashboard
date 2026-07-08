/* ETHONE Notification Center.
 * Persistent, reusable notification history with a right-side command panel.
 * Keeps legacy globals compatible: addNotif(), toast(), openNotifPanel(), etc.
 */
(function(){
  "use strict";
  if(window.__ethoneNotificationCenter)return;
  window.__ethoneNotificationCenter=true;

  var Core=window.EthoneCore;
  var App=window.Ethone;
  var STORAGE_KEY="ethone:notification-center";
  var MAX_ITEMS=160;
  var open=false;
  var originalToast=typeof window.toast==="function"?window.toast:null;
  var actionHandlers=Object.create(null);
  var categories=[
    ["all","inbox"],
    ["sync","cloud"],
    ["reminder","clock"],
    ["activity","activity"],
    ["error","circle-alert"],
    ["success","circle-check"],
    ["update","sparkles"]
  ];
  var activeFilter="all";
  var TEXT={
    fr:{
      title:"Centre de notifications",empty:"Tout est calme",emptySub:"Aucune notification dans cette categorie.",total:"total",unread:"non lues",none:"Aucune notification",markRead:"Lu",markAll:"Tout marquer lu",clear:"Effacer l'historique",open:"Ouvrir",now:"maintenant",
      category:{all:"Tout",sync:"Sync",reminder:"Rappels",activity:"Activite",error:"Erreurs",success:"Succes",update:"Mises a jour"}
    },
    en:{
      title:"Notification Center",empty:"All clear",emptySub:"No notifications in this category.",total:"total",unread:"unread",none:"No notifications",markRead:"Mark read",markAll:"Mark all read",clear:"Clear history",open:"Open",now:"now",
      category:{all:"All",sync:"Sync",reminder:"Reminders",activity:"Activity",error:"Errors",success:"Success",update:"Updates"}
    },
    es:{
      title:"Centro de notificaciones",empty:"Todo en calma",emptySub:"No hay notificaciones en esta categoria.",total:"total",unread:"sin leer",none:"Sin notificaciones",markRead:"Leida",markAll:"Marcar todo leido",clear:"Borrar historial",open:"Abrir",now:"ahora",
      category:{all:"Todo",sync:"Sync",reminder:"Recordatorios",activity:"Actividad",error:"Errores",success:"Exitos",update:"Actualizaciones"}
    },
    de:{
      title:"Benachrichtigungen",empty:"Alles ruhig",emptySub:"Keine Benachrichtigungen in dieser Kategorie.",total:"gesamt",unread:"ungelesen",none:"Keine Benachrichtigungen",markRead:"Gelesen",markAll:"Alle gelesen",clear:"Verlauf leeren",open:"Offnen",now:"jetzt",
      category:{all:"Alle",sync:"Sync",reminder:"Erinnerungen",activity:"Aktivitat",error:"Fehler",success:"Erfolg",update:"Updates"}
    }
  };

  function esc(v){
    return Core&&Core.dom?Core.dom.escapeHTML(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
    });
  }
  function lang(){
    try{
      var service=App&&App.get?App.get("language"):null;
      var value=service&&service.current?service.current():(window._lang||document.documentElement.lang||"fr");
      value=String(value||"fr").slice(0,2).toLowerCase();
      return TEXT[value]?value:"fr";
    }catch(e){return "fr"}
  }
  function tx(key){
    var table=TEXT[lang()]||TEXT.fr;
    return table[key]||TEXT.en[key]||key;
  }
  function catLabel(cat){
    var table=TEXT[lang()]||TEXT.fr;
    return (table.category&&table.category[cat])||(TEXT.en.category&&TEXT.en.category[cat])||cat;
  }
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function notificationPrefs(){
    var p=profile();
    if(!p)return {tasks:true,habits:true,events:true,ai:true,system:true,quietStart:"",quietEnd:""};
    p.state=p.state||{};
    if(!p.state.notifPrefs)p.state.notifPrefs={tasks:true,habits:true,events:true,ai:true,system:true,quietStart:"",quietEnd:""};
    return p.state.notifPrefs;
  }
  function inQuietHours(prefs){
    var start=prefs&&prefs.quietStart,end=prefs&&prefs.quietEnd;
    if(!start||!end)return false;
    var now=new Date();
    var cur=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
    return start<end?(cur>=start&&cur<=end):(cur>=start||cur<=end);
  }
  function preferenceFor(input,cat){
    if(input&&(input.preference||input.pref||input.setting))return input.preference||input.pref||input.setting;
    if(input&&/ai|brain/i.test(String(input.source||input.title||"")))return "ai";
    if(cat==="reminder")return "system";
    if(cat==="sync"||cat==="update"||cat==="error"||cat==="success")return "system";
    return "system";
  }
  function notificationAllowed(input,cat){
    var prefs=notificationPrefs();
    var key=preferenceFor(input,cat);
    if(inQuietHours(prefs))return false;
    return prefs[key]!==false;
  }
  function storageRead(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch(e){return []}}
  function storageWrite(items){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,MAX_ITEMS)))}catch(e){}}
  function saveState(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function nowISO(){return new Date().toISOString()}
  function currentWorkspace(){
    try{
      var w=window.ETHONEWorkspaces&&window.ETHONEWorkspaces.active?window.ETHONEWorkspaces.active():null;
      return w?{id:w.id,name:w.name}:null;
    }catch(e){return null}
  }
  function normalizeCategory(cat,type){
    cat=String(cat||type||"activity").toLowerCase();
    if(cat==="info")return "activity";
    if(cat==="warning")return "reminder";
    if(cat==="saved")return "sync";
    if(cat==="offline")return "error";
    return categories.some(function(c){return c[0]===cat})?cat:"activity";
  }
  function iconFor(cat,explicit){
    if(explicit&&/^[a-z0-9-]+$/i.test(explicit))return explicit;
    var found=categories.find(function(c){return c[0]===cat});
    return found?found[1]:"bell";
  }
  function items(){
    var p=profile();
    if(p){
      p.state=p.state||{};
      if(!Array.isArray(p.state.notifications)){
        var fallback=storageRead();
        p.state.notifications=fallback.length?fallback:[];
      }
      return p.state.notifications;
    }
    return storageRead();
  }
  function persist(next){
    next=next.slice(0,MAX_ITEMS);
    var p=profile();
    if(p){p.state=p.state||{};p.state.notifications=next;saveState()}
    storageWrite(next);
  }
  function unreadCount(){
    return items().filter(function(n){return !n.read}).length;
  }
  function timeAgo(ts){
    var diff=Math.floor((Date.now()-new Date(ts||Date.now()).getTime())/1000);
    if(diff<10)return tx("now");
    if(diff<60)return diff+"s";
    if(diff<3600)return Math.floor(diff/60)+"m";
    if(diff<86400)return Math.floor(diff/3600)+"h";
    return Math.floor(diff/86400)+"d";
  }
  function updateBadge(){
    var badge=document.getElementById("notif-badge");
    if(!badge)return;
    var unread=unreadCount();
    if(unread>0){badge.textContent=unread>9?"9+":String(unread);badge.classList.add("show")}
    else {badge.textContent="";badge.classList.remove("show")}
  }
  function notify(input){
    input=input||{};
    var cat=normalizeCategory(input.category,input.type);
    if(!notificationAllowed(input,cat))return null;
    var list=items();
    var id=input.id||("n-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7));
    if(input.dedupe&&list.some(function(n){return n.dedupe===input.dedupe}))return null;
    var n={
      id:id,
      dedupe:input.dedupe||"",
      title:String(input.title||input.message||"Notification").slice(0,120),
      body:String(input.body||input.sub||"").slice(0,280),
      category:cat,
      icon:iconFor(cat,input.icon),
      createdAt:input.createdAt||nowISO(),
      read:!!input.read,
      workspace:input.workspace||currentWorkspace(),
      action:input.action||null
    };
    list.unshift(n);
    persist(list);
    updateBadge();
    if(open)render();
    window.dispatchEvent(new CustomEvent("ethone:notification",{detail:{notification:n}}));
    return n;
  }
  function addLegacy(icon,title,sub,action){
    var category=/error|fail|denied|invalid|could not|impossible/i.test(String(title||""))?"error":/sync|saved|connected|created|complete|done|updated/i.test(String(title||""))?"success":"activity";
    return notify({title:title,body:sub,category:category,icon:icon,action:typeof action==="function"?{label:tx("open"),handler:action}:action});
  }
  function actionId(n){
    var id=String(n.id||"").replace(/[^a-z0-9_-]/gi,"_");
    if(n.action&&typeof n.action.handler==="function")actionHandlers[id]=n.action.handler;
    return id;
  }
  function runAction(id){
    var list=items(),n=list.find(function(x){return x.id===id});
    if(n){n.read=true;persist(list);updateBadge()}
    if(n&&n.action){
      if(typeof n.action.handler==="function"){n.action.handler();closePanel();return}
      if(n.action.actionId&&App&&App.get){
        var Actions=App.get("actions");
        if(Actions&&Actions.dispatch){Actions.dispatch(n.action.actionId,n.action.context||{});closePanel();return}
      }
      if(n.action.page&&App&&App.get){
        var PageActions=App.get("actions");
        if(PageActions&&PageActions.dispatch){PageActions.dispatch("navigation.open",{page:n.action.page,source:"notification-center"});closePanel();return}
      }
    }
    var safe=String(id||"").replace(/[^a-z0-9_-]/gi,"_");
    if(actionHandlers[safe]){actionHandlers[safe]();closePanel()}
  }
  function markRead(id){
    var list=items();
    list.forEach(function(n){if(!id||n.id===id)n.read=true});
    persist(list);updateBadge();render();
  }
  function clearAll(){
    persist([]);updateBadge();render();
  }
  function scan(){
    var p=profile();if(!p||!p.state)return;
    var now=new Date(),today=now.toLocaleDateString("en-CA");
    var todos=Array.isArray(p.state.todos)?p.state.todos:[];
    var overdue=todos.filter(function(t){return !t.done&&t.dueDate&&new Date(t.dueDate)<now});
    if(overdue.length)notify({dedupe:"overdue-"+today,title:overdue.length+" overdue task"+(overdue.length>1?"s":""),body:overdue.slice(0,2).map(function(t){return t.text||t.title}).join(", "),category:"reminder",preference:"tasks",icon:"triangle-alert",action:{label:"Open tasks",page:"todos"}});
    var due=todos.filter(function(t){return !t.done&&t.dueDate&&new Date(t.dueDate).toLocaleDateString("en-CA")===today});
    if(due.length)notify({dedupe:"due-"+today,title:due.length+" task"+(due.length>1?"s":"")+" due today",body:due.slice(0,2).map(function(t){return t.text||t.title}).join(", "),category:"reminder",preference:"tasks",icon:"calendar-clock",action:{label:"Review",page:"todos"}});
    var events=(Array.isArray(p.state.events)?p.state.events:[]).filter(function(e){var d=new Date(e.date);return d>=now&&d<new Date(now.getTime()+86400000)});
    if(events.length)notify({dedupe:"events-"+today,title:events.length+" event"+(events.length>1?"s":"")+" in next 24h",body:events.slice(0,2).map(function(e){return e.title}).join(", "),category:"reminder",preference:"events",icon:"calendar-days",action:{label:"Open calendar",page:"calendar"},read:true});
  }
  function countsByCategory(){
    var out={all:items().length};
    items().forEach(function(n){out[n.category]=(out[n.category]||0)+1});
    return out;
  }
  function renderCategoryTabs(){
    var counts=countsByCategory();
    return '<div class="nc-tabs" role="tablist">'+categories.map(function(c){
      return '<button class="nc-tab'+(activeFilter===c[0]?' active':'')+'" type="button" role="tab" aria-pressed="'+(activeFilter===c[0]?'true':'false')+'" data-nc-filter="'+c[0]+'"><i data-lucide="'+c[1]+'"></i><span>'+esc(catLabel(c[0]))+'</span><b>'+(counts[c[0]]||0)+'</b></button>';
    }).join("")+'</div>';
  }
  function itemHTML(n){
    var aid=actionId(n),hasAction=!!n.action,cat=n.category||"activity";
    return '<article class="nc-item '+(n.read?'':'unread')+'" data-nc-id="'+esc(n.id)+'" data-cat="'+esc(cat)+'">'+
      '<div class="nc-icon"><i data-lucide="'+esc(n.icon||iconFor(cat))+'"></i></div>'+
      '<div class="nc-content"><div class="nc-meta"><span>'+esc(catLabel(cat))+'</span><time>'+esc(timeAgo(n.createdAt))+'</time></div><h3>'+esc(n.title)+'</h3>'+(n.body?'<p>'+esc(n.body)+'</p>':'')+
      (n.workspace&&n.workspace.name?'<div class="nc-workspace">'+esc(n.workspace.name)+'</div>':'')+'</div>'+
      '<div class="nc-actions">'+(!n.read?'<button type="button" data-nc-read="'+esc(n.id)+'">'+esc(tx("markRead"))+'</button>':'')+(hasAction?'<button class="primary" type="button" data-nc-action="'+esc(aid)+'">'+esc(n.action.label||tx("open"))+'</button>':'')+'</div>'+
    '</article>';
  }
  function render(){
    var panel=document.getElementById("notif-panel"),body=document.getElementById("notif-panel-body"),count=document.getElementById("notif-count-label");
    if(!panel||!body)return;
    panel.classList.add("notification-center");
    var list=items(),filtered=activeFilter==="all"?list:list.filter(function(n){return n.category===activeFilter});
    var unread=unreadCount();
    var title=panel.querySelector(".notif-panel-title");
    if(title)title.textContent=tx("title");
    if(count)count.textContent=list.length?list.length+" "+tx("total")+" - "+unread+" "+tx("unread"):tx("none");
    body.innerHTML=renderCategoryTabs()+(filtered.length?'<div class="nc-list">'+filtered.map(itemHTML).join("")+'</div>':'<div class="nc-empty"><i data-lucide="bell-off"></i><strong>'+esc(tx("empty"))+'</strong><span>'+esc(tx("emptySub"))+'</span></div>');
    var footer=panel.querySelector(".notif-panel-clear");
    if(footer)footer.innerHTML='<button class="btn btn-ghost" type="button" data-nc-mark-all>'+esc(tx("markAll"))+'</button><button class="btn btn-ghost" type="button" data-nc-clear>'+esc(tx("clear"))+'</button>';
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function openPanel(){
    var panel,overlay;
    open=true;scan();render();
    panel=document.getElementById("notif-panel");
    overlay=document.getElementById("notif-overlay");
    if(panel){
      panel.style.setProperty("display","flex","important");
      panel.style.setProperty("visibility","visible","important");
      panel.classList.add("open");
    }
    if(overlay){
      overlay.style.setProperty("display","block","important");
      overlay.style.setProperty("visibility","visible","important");
      overlay.classList.add("open");
    }
  }
  function closePanel(){
    var panel,overlay;
    open=false;
    panel=document.getElementById("notif-panel");
    overlay=document.getElementById("notif-overlay");
    if(panel)panel.classList.remove("open");
    if(overlay)overlay.classList.remove("open");
  }
  function togglePanel(){open?closePanel():openPanel()}
  function installEvents(){
    if(window.__ethoneNotificationCenterEvents)return;
    window.__ethoneNotificationCenterEvents=true;
    document.addEventListener("click",function(e){
      var f=e.target.closest("[data-nc-filter]");if(f){activeFilter=f.dataset.ncFilter;render();return}
      var r=e.target.closest("[data-nc-read]");if(r){markRead(r.dataset.ncRead);return}
      var a=e.target.closest("[data-nc-action]");if(a){runAction(a.dataset.ncAction);return}
      if(e.target.closest("[data-nc-mark-all]")){markRead();return}
      if(e.target.closest("[data-nc-clear]")){clearAll();return}
    });
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&open)closePanel()});
    if(App&&App.get){
      try{
        var Events=App.get("events");
        if(Events&&Events.on)Events.on("language:changed",function(){if(open)render()});
      }catch(e){}
    }
  }
  function startScan(){
    clearInterval(window.__ethoneNotificationScanTimer);
    window.__ethoneNotificationScanTimer=setInterval(function(){scan();updateBadge()},60000);
    scan();updateBadge();
  }
  function toastWrapper(msg,type){
    if(originalToast)originalToast(msg,type||"info");
    notify({title:msg,category:normalizeCategory(type),type:type,read:type==="info"});
  }

  window.ETHONENotifications={notify:notify,history:items,render:render,open:openPanel,close:closePanel,toggle:togglePanel,markRead:markRead,clear:clearAll,scan:scan};
  window.addNotif=addLegacy;
  window.updateNotifBadge=updateBadge;
  window.toggleNotifPanel=togglePanel;
  window.openNotifPanel=openPanel;
  window.closeNotifPanel=closePanel;
  window.clearAllNotifs=clearAll;
  window.renderNotifPanel=render;
  window.scanForNotifs=scan;
  window.toast=toastWrapper;
  installEvents();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){startScan();render()},{once:true});
  else setTimeout(function(){startScan();render()},0);
})();
