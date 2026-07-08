/* ETHONE Widget Marketplace.
 * Installs dashboard widget instances into the existing Dashboard V4 layout system.
 * Local-only, no backend changes, no provider calls.
 */
(function(){
  "use strict";
  if(window.__ethoneWidgetMarketplace)return;
  window.__ethoneWidgetMarketplace=true;

  var STORE_KEY="ethone:widget-marketplace:v1";
  var LAYOUTS_KEY="ethone:dashboard-v4-layouts";
  var ACTIVE_LAYOUT_KEY="ethone:dashboard-v4-layout";
  var pageId="widget-marketplace";
  var categories=["Widgets","Mini Apps","AI Widgets","Developer Widgets","Gaming Widgets","Streaming Widgets"];

  function $(s,r){return (r||document).querySelector(s)}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function readJSON(key,fallback){try{var raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
  function writeJSON(key,val){try{localStorage.setItem(key,JSON.stringify(val));return true}catch(e){return false}}
  function lang(){return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}
  function tr(fr,en){return lang()==="fr"?fr:en}
  function toast(message,type){try{if(typeof window.toast==="function")window.toast(message,type||"info")}catch(e){}}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function widgets(){try{return window.Ethone&&window.Ethone.get?window.Ethone.get("widgets"):null}catch(e){return null}}
  function actions(){try{return window.Ethone&&window.Ethone.get?window.Ethone.get("actions"):null}catch(e){return null}}
  function workspaceApi(){try{return window.ETHONEWorkspaces||(window.Ethone&&window.Ethone.get&&window.Ethone.get("workspaces"))||null}catch(e){return null}}
  function activeWorkspace(){var api=workspaceApi();try{return api&&api.active?api.active():null}catch(e){return null}}

  var metadata={
    clock:["Widgets","Clock","Live time, timezone-ready clock and date card.","clock",["time","date","utility"]],
    countdown:["Widgets","Countdown","Track releases, exams, sessions and personal deadlines.","timer",["time","deadline","event"]],
    weather:["Widgets","Weather","Weather context for planning and daily briefings.","cloud-sun",["weather","planning"]],
    goals:["Widgets","Goals","Track objectives, completion and weekly progress.","target",["goals","progress"]],
    calendar:["Mini Apps","Calendar","Upcoming events, deadlines and planning context.","calendar-days",["calendar","schedule"]],
    notes:["Mini Apps","Notes","Recent notes and writing context inside Home.","notebook-pen",["notes","writing"]],
    productivity:["Widgets","Productivity","Task completion, progress and productivity signal.","trending-up",["tasks","productivity"]],
    charts:["Widgets","Charts","Analytics and heatmap preview for activity.","bar-chart-3",["analytics","heatmap"]],
    habits:["Widgets","Habits","Routine tracking and daily consistency summary.","repeat-2",["habits","routine"]],
    timelineFeed:["Mini Apps","Timeline Feed","A compact activity and upcoming-work timeline.","list-tree",["timeline","activity"]],
    aiSuggestions:["AI Widgets","AI Suggestions","Local Brain recommendations without automatic provider calls.","sparkles",["brain","ai","suggestions"]],
    github:["Developer Widgets","GitHub","Developer activity, repository pulse and profile signal.","git-branch",["github","dev","code"]],
    cpu:["Developer Widgets","CPU","Browser-side system signal for performance-focused workspaces.","cpu",["system","performance"]],
    ram:["Developer Widgets","RAM","Memory signal and browser heap indicator.","memory-stick",["system","memory"]],
    network:["Developer Widgets","Network","Online status and browser network signal.","radio-tower",["network","system"]],
    discord:["Gaming Widgets","Discord","Presence and activity snapshot from existing Discord connection.","message-circle",["discord","presence","gaming"]],
    spotify:["Gaming Widgets","Spotify","Music status snapshot from existing Spotify/Now Playing setup.","music",["spotify","music"]],
    lastfm:["Gaming Widgets","Last.fm","Listening history and music profile widget.","radio",["lastfm","music"]],
    steam:["Gaming Widgets","Steam","Gaming profile snapshot and play state.","gamepad-2",["steam","gaming"]],
    valorant:["Gaming Widgets","Valorant","Valorant account/rank card using existing gaming data.","crosshair",["valorant","riot","gaming"]],
    nowPlaying:["Streaming Widgets","Now Playing","Clean music card for focus, gaming and streaming sessions.","disc-3",["music","streaming"]],
    twitch:["Streaming Widgets","Twitch","Streaming channel status snapshot for creator workspaces.","radio",["twitch","streaming"]]
  };

  function store(){
    return Object.assign({category:"Widgets",query:"",favorites:{},selected:"",history:[]},readJSON(STORE_KEY,{})||{});
  }
  function saveStore(next){
    next.history=(next.history||[]).slice(-80);
    writeJSON(STORE_KEY,next);
    var p=profile();
    if(p&&p.state){
      p.state.widgetMarketplace={favorites:next.favorites,history:next.history,updatedAt:Date.now()};
      try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
    }
  }
  function widgetTypes(){
    var W=widgets();
    var types=Array.isArray(window.__ethoneWidgetCatalogTypes)?window.__ethoneWidgetCatalogTypes.slice():[];
    Object.keys(metadata).forEach(function(t){if(types.indexOf(t)<0)types.push(t)});
    return types.filter(function(type){return !!(W&&W.get&&W.get(type))});
  }
  function catalog(){
    var W=widgets();
    return widgetTypes().map(function(type){
      var def=W.get(type)||{},meta=metadata[type]||["Widgets",def.label||type,"Independent ETHONE widget.","square",[type]];
      return {
        id:"wm-"+type,
        type:type,
        category:meta[0],
        title:meta[1]||def.label||type,
        description:meta[2]||"Independent ETHONE widget.",
        icon:meta[3]||def.icon||"square",
        tags:meta[4]||[type],
        defaultSize:def.defaultSize||{col:2,row:1},
        minSize:def.minSize||{col:1,row:1},
        maxSize:def.maxSize||{col:4,row:2},
        maxInstances:def.maxInstances== null?Infinity:def.maxInstances,
        author:type==="aiSuggestions"?"Brain OS":"ETHONE Labs",
        version:"1.0.0",
        kind:meta[0]
      };
    });
  }
  function filtered(){
    var s=store(),q=s.query.trim().toLowerCase();
    return catalog().filter(function(item){
      var cat=s.category==="Favorites"?!!s.favorites[item.type]:item.category===s.category;
      if(!cat)return false;
      if(!q)return true;
      return [item.title,item.description,item.category,item.tags.join(" "),item.type].join(" ").toLowerCase().indexOf(q)>-1;
    }).sort(function(a,b){
      return Number(isInstalled(b.type))-Number(isInstalled(a.type))||
        Number(!!s.favorites[b.type])-Number(!!s.favorites[a.type])||
        a.title.localeCompare(b.title);
    });
  }
  function activeLayout(){
    var lib=readJSON(LAYOUTS_KEY,null),ws=activeWorkspace();
    if(!lib||lib.version!==1||!Array.isArray(lib.layouts))return null;
    var id=ws&&ws.layoutId?ws.layoutId:lib.activeId;
    return lib.layouts.find(function(l){return l&&l.id===id})||lib.layouts.find(function(l){return l&&l.id===lib.activeId})||lib.layouts[0]||null;
  }
  function saveLayout(layout){
    if(!layout||!layout.prefs)return false;
    var lib=readJSON(LAYOUTS_KEY,null);
    if(!lib||lib.version!==1||!Array.isArray(lib.layouts))return false;
    var idx=lib.layouts.findIndex(function(l){return l&&l.id===layout.id});
    if(idx<0)return false;
    lib.layouts[idx]=layout;
    lib.activeId=layout.id;
    writeJSON(LAYOUTS_KEY,lib);
    writeJSON(ACTIVE_LAYOUT_KEY,layout.prefs);
    var api=workspaceApi(),ws=activeWorkspace();
    if(api&&ws&&api.update&&ws.layoutId!==layout.id)api.update(ws.id,{layoutId:layout.id});
    try{if(typeof window.ethoneDashboardV4Render==="function")window.ethoneDashboardV4Render()}catch(e){}
    try{window.dispatchEvent(new CustomEvent("ethone:widget-marketplace-change",{detail:{layoutId:layout.id}}))}catch(e){}
    return true;
  }
  function layoutPrefs(layout){
    layout.prefs=layout.prefs&&layout.prefs.version===2?layout.prefs:{version:2,instances:[],hidden:[],favorites:[]};
    if(!Array.isArray(layout.prefs.instances))layout.prefs.instances=[];
    if(!Array.isArray(layout.prefs.hidden))layout.prefs.hidden=[];
    if(!Array.isArray(layout.prefs.favorites))layout.prefs.favorites=[];
    return layout.prefs;
  }
  function installedInstances(type){
    var layout=activeLayout(),prefs=layout&&layout.prefs;
    return prefs&&Array.isArray(prefs.instances)?prefs.instances.filter(function(w){return w.type===type}):[];
  }
  function isInstalled(type){return installedInstances(type).length>0}
  function install(type){
    var W=widgets(),def=W&&W.get?W.get(type):null,layout=activeLayout();
    if(!def||!layout){toast(tr("Layout dashboard indisponible","Dashboard layout unavailable"),"error");return false}
    var prefs=layoutPrefs(layout),count=prefs.instances.filter(function(w){return w.type===type}).length,max=def.maxInstances==null?Infinity:def.maxInstances;
    if(count>=max){toast(tr("Ce widget est deja installe","This widget is already installed"),"info");return false}
    var size=Object.assign({},def.defaultSize||{col:2,row:1});
    prefs.instances.push({instanceId:type+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),type:type,size:size,locked:false,config:{}});
    var s=store();
    s.history.push({action:"install",type:type,ts:Date.now()});
    saveStore(s);
    saveLayout(layout);
    toast(tr("Widget installe : ","Widget installed: ")+type,"success");
    renderAll();
    return true;
  }
  function remove(type){
    var layout=activeLayout();
    if(!layout){toast(tr("Layout dashboard indisponible","Dashboard layout unavailable"),"error");return false}
    var prefs=layoutPrefs(layout),before=prefs.instances.length;
    prefs.instances=prefs.instances.filter(function(w){return w.type!==type});
    prefs.hidden=prefs.hidden.filter(function(id){return !/^type/.test(id)});
    if(before===prefs.instances.length){toast(tr("Widget non installe","Widget is not installed"),"info");return false}
    var s=store();
    s.history.push({action:"remove",type:type,ts:Date.now()});
    saveStore(s);
    saveLayout(layout);
    toast(tr("Widget supprime : ","Widget removed: ")+type,"info");
    renderAll();
    return true;
  }
  function toggleFavorite(type){
    var s=store();
    s.favorites[type]=!s.favorites[type];
    s.history.push({action:s.favorites[type]?"favorite":"unfavorite",type:type,ts:Date.now()});
    saveStore(s);
    renderAll();
  }
  function ensurePage(){
    var main=$("#main-content")||document.body;
    var page=$("#page-"+pageId);
    if(!page){
      page=document.createElement("div");
      page.id="page-"+pageId;
      page.className="tab-content";
      page.setAttribute("role","tabpanel");
      page.setAttribute("aria-live","polite");
      page.dataset.qaPage="true";
      main.appendChild(page);
    }
    return page;
  }
  function icon(name){return '<i data-lucide="'+esc(name||"square")+'" aria-hidden="true"></i>'}
  function card(item){
    var installed=isInstalled(item.type),fav=!!store().favorites[item.type],count=installedInstances(item.type).length;
    return '<article class="wm-card '+(installed?"installed":"")+'" data-wm-select="'+esc(item.type)+'" tabindex="0">'+
      '<div class="wm-card-top"><span class="wm-icon">'+icon(item.icon)+'</span><button type="button" class="wm-fav '+(fav?"active":"")+'" data-wm-favorite="'+esc(item.type)+'" aria-label="Favorite">'+icon("star")+'</button></div>'+
      '<div class="wm-card-copy"><strong>'+esc(item.title)+'</strong><p>'+esc(item.description)+'</p></div>'+
      '<div class="wm-card-meta"><span>'+esc(item.category)+'</span><span>'+item.defaultSize.col+'x'+item.defaultSize.row+'</span><span>'+esc(item.maxInstances===Infinity?"Multi":"Single")+'</span></div>'+
      '<div class="wm-card-tags">'+item.tags.slice(0,3).map(function(tag){return '<span>'+esc(tag)+'</span>'}).join("")+'</div>'+
      '<div class="wm-card-actions">'+
        '<button type="button" class="wm-btn primary" data-wm-install="'+esc(item.type)+'">'+(installed?tr("Ajouter encore","Add another"):tr("Installer","Install"))+'</button>'+
        '<button type="button" class="wm-btn" data-wm-remove="'+esc(item.type)+'" '+(!installed?'disabled':'')+'>'+tr("Supprimer","Remove")+(count>1?" ("+count+")":"")+'</button>'+
      '</div>'+
    '</article>';
  }
  function detail(item){
    if(!item)return '<div class="wm-empty">'+tr("Aucun widget trouve.","No widget found.")+'</div>';
    var installed=isInstalled(item.type),fav=!!store().favorites[item.type],count=installedInstances(item.type).length;
    return '<aside class="wm-detail">'+
      '<div class="wm-detail-head"><span class="wm-detail-icon">'+icon(item.icon)+'</span><div><span>'+esc(item.category)+'</span><h3>'+esc(item.title)+'</h3><p>'+esc(item.description)+'</p></div></div>'+
      '<div class="wm-detail-actions">'+
        '<button type="button" class="wm-btn primary" data-wm-install="'+esc(item.type)+'">'+(installed?tr("Ajouter une instance","Add instance"):tr("Installer en un clic","Install in one click"))+'</button>'+
        '<button type="button" class="wm-btn" data-wm-remove="'+esc(item.type)+'" '+(!installed?'disabled':'')+'>'+tr("Supprimer","Remove")+'</button>'+
        '<button type="button" class="wm-btn" data-wm-favorite="'+esc(item.type)+'">'+(fav?tr("Retirer favori","Unfavorite"):tr("Favori","Favorite"))+'</button>'+
      '</div>'+
      '<div class="wm-detail-grid">'+
        meta("Type",item.type)+meta("Author",item.author)+meta("Version",item.version)+meta("Instances",String(count))+meta("Size",item.defaultSize.col+" x "+item.defaultSize.row)+meta("Max",item.maxInstances===Infinity?"Unlimited":String(item.maxInstances))+
      '</div>'+
      '<section><h4>'+tr("Independance","Independence")+'</h4><p>'+tr("Ce widget utilise le registre ETHONE et peut etre ajoute, retire ou duplique sans changer le backend.","This widget uses the ETHONE registry and can be added, removed or duplicated without backend changes.")+'</p></section>'+
      '<section><h4>Tags</h4><div class="wm-card-tags">'+item.tags.map(function(tag){return '<span>'+esc(tag)+'</span>'}).join("")+'</div></section>'+
    '</aside>';
  }
  function meta(k,v){return '<div><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>'}
  function render(){
    var page=ensurePage(),s=store(),items=filtered(),selected=items.find(function(i){return i.type===s.selected})||items[0]||catalog()[0];
    if(selected&&s.selected!==selected.type){s.selected=selected.type;saveStore(s)}
    var installedCount=catalog().filter(function(i){return isInstalled(i.type)}).length;
    page.classList.add("widget-marketplace-ready");
    page.innerHTML=
      '<section class="wm-shell">'+
        '<header class="wm-hero">'+
          '<div><span class="wm-kicker">ETHONE Widget Marketplace</span><h2>'+tr("Installe ton systeme, widget par widget.","Build your system, widget by widget.")+'</h2><p>'+tr("Widgets, Mini Apps, AI Widgets, Developer, Gaming et Streaming Widgets. Installation en un clic dans le layout actif.","Widgets, Mini Apps, AI Widgets, Developer, Gaming and Streaming Widgets. One-click install into the active layout.")+'</p></div>'+
          '<div class="wm-hero-stats"><div><strong>'+catalog().length+'</strong><span>Catalog</span></div><div><strong>'+installedCount+'</strong><span>Installed</span></div><div><strong>'+Object.keys(s.favorites||{}).filter(function(k){return s.favorites[k]}).length+'</strong><span>Favorites</span></div></div>'+
        '</header>'+
        '<section class="wm-toolbar">'+
          '<label class="wm-search">'+icon("search")+'<input id="wm-search-input" value="'+esc(s.query)+'" placeholder="'+tr("Rechercher un widget...","Search widgets...")+'" /></label>'+
          '<div class="wm-tabs">'+categories.concat(["Favorites"]).map(function(cat){return '<button type="button" class="'+(s.category===cat?"active":"")+'" data-wm-category="'+esc(cat)+'">'+esc(cat)+'</button>'}).join("")+'</div>'+
        '</section>'+
        '<section class="wm-layout">'+
          '<main class="wm-grid">'+(items.length?items.map(card).join(""):'<div class="wm-empty">'+tr("Aucun widget trouve.","No widget found.")+'</div>')+'</main>'+
          detail(selected)+
        '</section>'+
      '</section>';
    try{window.lucide&&window.lucide.createIcons&&window.lucide.createIcons()}catch(e){}
  }
  function renderAll(){if($("#page-"+pageId))render();injectMarketplaceEntry()}
  function injectMarketplaceEntry(){
    var page=$("#page-marketplace");
    if(!page||$("#wm-marketplace-entry",page))return;
    var hero=$(".mp-store-hero .mp41-top",page)||$(".mp41-hero",page)||page.firstElementChild;
    if(!hero)return;
    var btn=document.createElement("button");
    btn.id="wm-marketplace-entry";
    btn.type="button";
    btn.className="mp41-btn primary";
    btn.textContent="Widget Marketplace";
    btn.setAttribute("data-wm-open","true");
    hero.appendChild(btn);
  }
  function open(){
    ensurePage();
    if(typeof window.switchPage==="function")window.switchPage(pageId,null);
    render();
  }
  function bind(){
    document.addEventListener("click",function(e){
      if(e.target.closest("[data-wm-open]")){open();return}
      var category=e.target.closest("[data-wm-category]");
      if(category){var s=store();s.category=category.dataset.wmCategory;s.query="";saveStore(s);render();return}
      var select=e.target.closest("[data-wm-select]");
      if(select&&!e.target.closest("button")){var st=store();st.selected=select.dataset.wmSelect;saveStore(st);render();return}
      var installBtn=e.target.closest("[data-wm-install]");
      if(installBtn){install(installBtn.dataset.wmInstall);return}
      var removeBtn=e.target.closest("[data-wm-remove]");
      if(removeBtn){remove(removeBtn.dataset.wmRemove);return}
      var fav=e.target.closest("[data-wm-favorite]");
      if(fav){toggleFavorite(fav.dataset.wmFavorite);return}
    });
    document.addEventListener("input",function(e){
      if(e.target&&e.target.id==="wm-search-input"){var s=store();s.query=e.target.value;saveStore(s);render()}
    });
    document.addEventListener("keydown",function(e){
      var cardEl=e.target.closest("[data-wm-select]");
      if(cardEl&&(e.key==="Enter"||e.key===" ")){e.preventDefault();var s=store();s.selected=cardEl.dataset.wmSelect;saveStore(s);render()}
    });
    window.addEventListener("ethone:page-ready",function(e){
      if(e.detail&&e.detail.page===pageId)render();
      if(e.detail&&e.detail.page==="marketplace")setTimeout(injectMarketplaceEntry,80);
    });
    window.addEventListener("ethone:dashboard-ready",function(){setTimeout(renderAll,160)});
    window.addEventListener("ethone:smart-layout-change",function(){setTimeout(renderAll,120)});
  }
  function registerAction(){
    var A=actions();
    if(A&&A.register)A.register("marketplace.widgets.open",{label:"Widget Marketplace",handler:open});
  }
  function boot(){
    ensurePage();
    registerAction();
    bind();
    render();
    setTimeout(injectMarketplaceEntry,700);
  }

  window.ETHONEWidgetMarketplace={
    open:open,
    render:render,
    catalog:catalog,
    install:install,
    remove:remove,
    favorite:toggleFavorite,
    state:store
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
