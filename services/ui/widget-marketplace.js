/* ETHONE Widget Marketplace.
 * Real local widget store for Dashboard V4.
 * Supports install/uninstall/update/search/rating/favorites/verification,
 * community widgets and a small SDK without backend changes.
 */
(function(){
  "use strict";
  if(window.__ethoneWidgetMarketplace)return;
  window.__ethoneWidgetMarketplace=true;

  var STORE_KEY="ethone:widget-marketplace:v2";
  var LEGACY_STORE_KEY="ethone:widget-marketplace:v1";
  var LAYOUTS_KEY="ethone:dashboard-v4-layouts";
  var ACTIVE_LAYOUT_KEY="ethone:dashboard-v4-layout";
  var pageId="widget-marketplace";
  var categories=["Widgets","Mini Apps","AI Widgets","Developer Widgets","Gaming Widgets","Streaming Widgets","Community"];
  var sorts=[
    ["recommended","Recommended"],
    ["rating","Top rated"],
    ["updated","Updates"],
    ["installed","Installed"],
    ["name","Name"]
  ];
  var runtimeWidgets={};

  var metadata={
    clock:["Widgets","Clock","Live time, timezone-ready clock and date card.","clock",["time","date","utility"],"ETHONE Labs","1.2.0",4.7,true,["Timezone-ready rendering","Improved low-motion state"],["Read current browser time"]],
    countdown:["Widgets","Countdown","Track releases, exams, sessions and personal deadlines.","timer",["time","deadline","event"],"ETHONE Labs","1.1.0",4.6,true,["Cleaner deadline formatting","Compact mode polish"],["Read local countdown entries"]],
    weather:["Widgets","Weather","Weather context for planning and daily briefings.","cloud-sun",["weather","planning"],"ETHONE Labs","1.3.0",4.8,true,["Better offline fallback","Prepared provider status"],["Read weather cache"]],
    goals:["Widgets","Goals","Track objectives, completion and weekly progress.","target",["goals","progress"],"ETHONE Labs","1.2.1",4.8,true,["Weekly progress state","Clearer empty state"],["Read goals"]],
    calendar:["Mini Apps","Calendar","Upcoming events, deadlines and planning context.","calendar-days",["calendar","schedule"],"ETHONE Labs","1.4.0",4.8,true,["Timeline compatibility","Improved upcoming events"],["Read calendar events"]],
    notes:["Mini Apps","Notes","Recent notes and writing context inside Home.","notebook-pen",["notes","writing"],"ETHONE Labs","1.1.2",4.6,true,["Recent notes preview","Better empty state"],["Read notes metadata"]],
    productivity:["Widgets","Productivity","Task completion, progress and productivity signal.","trending-up",["tasks","productivity"],"ETHONE Labs","1.2.0",4.7,true,["Completion trend signal","Brain summary support"],["Read tasks"]],
    charts:["Widgets","Charts","Analytics and heatmap preview for activity.","bar-chart-3",["analytics","heatmap"],"ETHONE Labs","1.0.4",4.5,true,["Heatmap contrast polish"],["Read local analytics"]],
    habits:["Widgets","Habits","Routine tracking and daily consistency summary.","repeat-2",["habits","routine"],"ETHONE Labs","1.2.0",4.7,true,["Daily streak state","Compact display"],["Read habits"]],
    timelineFeed:["Mini Apps","Timeline Feed","A compact activity and upcoming-work timeline.","list-tree",["timeline","activity"],"ETHONE Labs","1.1.0",4.7,true,["Timeline filters","Activity labels"],["Read timeline events"]],
    aiSuggestions:["AI Widgets","AI Suggestions","Local Brain recommendations without automatic provider calls.","sparkles",["brain","ai","suggestions"],"Brain OS","1.4.0",4.9,true,["Brain Intelligence support","No provider calls on mount"],["Read local Brain context"]],
    github:["Developer Widgets","GitHub","Developer activity, repository pulse and profile signal.","git-branch",["github","dev","code"],"ETHONE Labs","1.1.0",4.7,true,["Safer disconnected state"],["Read GitHub cache"]],
    cpu:["Developer Widgets","CPU","Browser-side system signal for performance-focused workspaces.","cpu",["system","performance"],"ETHONE Labs","1.0.1",4.4,true,["Lower refresh cost"],["Read browser performance hints"]],
    ram:["Developer Widgets","RAM","Memory signal and browser heap indicator.","memory-stick",["system","memory"],"ETHONE Labs","1.0.1",4.4,true,["Safer unsupported fallback"],["Read browser memory hints"]],
    network:["Developer Widgets","Network","Online status and browser network signal.","radio-tower",["network","system"],"ETHONE Labs","1.0.2",4.5,true,["Connection status fallback"],["Read navigator connection"]],
    discord:["Gaming Widgets","Discord","Presence and activity snapshot from existing Discord connection.","message-circle",["discord","presence","gaming"],"ETHONE Labs","1.1.0",4.7,true,["Connection state cards"],["Read Discord connection cache"]],
    spotify:["Gaming Widgets","Spotify","Music status snapshot from existing Spotify/Now Playing setup.","music",["spotify","music"],"ETHONE Labs","1.2.0",4.8,true,["Now playing fallback","Better focus state"],["Read Spotify cache"]],
    lastfm:["Gaming Widgets","Last.fm","Listening history and music profile widget.","radio",["lastfm","music"],"Community Studio","1.0.0",4.4,true,["First production listing"],["Read Last.fm cache"]],
    steam:["Gaming Widgets","Steam","Gaming profile snapshot and play state.","gamepad-2",["steam","gaming"],"ETHONE Labs","1.0.1",4.5,true,["Gaming session state"],["Read Steam connection cache"]],
    valorant:["Gaming Widgets","Valorant","Valorant account/rank card using existing gaming data.","crosshair",["valorant","riot","gaming"],"Arena Tools","1.0.2",4.6,true,["Rank display polish"],["Read Valorant account cache"]],
    nowPlaying:["Streaming Widgets","Now Playing","Clean music card for focus, gaming and streaming sessions.","disc-3",["music","streaming"],"Studio Pulse","1.0.0",4.6,true,["Initial release"],["Read media session cache"]],
    twitch:["Streaming Widgets","Twitch","Streaming channel status snapshot for creator workspaces.","radio",["twitch","streaming"],"StreamForge","1.0.0",4.4,true,["Initial release"],["Read Twitch cache"]]
  };

  function $(s,r){return (r||document).querySelector(s)}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
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
  function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}
  function now(){return Date.now()}

  function migrateStore(raw){
    var legacy=readJSON(LEGACY_STORE_KEY,{})||{};
    raw=raw||{};
    return {
      version:2,
      category:raw.category||legacy.category||"Widgets",
      query:String(raw.query||legacy.query||""),
      sort:raw.sort||"recommended",
      favorites:Object.assign({},legacy.favorites||{},raw.favorites||{}),
      ratings:Object.assign({},raw.ratings||{}),
      installedVersions:Object.assign({},raw.installedVersions||{}),
      verified:Object.assign({},raw.verified||{}),
      community:Array.isArray(raw.community)?raw.community:[],
      selected:raw.selected||legacy.selected||"",
      history:Array.isArray(raw.history)?raw.history:(Array.isArray(legacy.history)?legacy.history:[])
    };
  }
  function store(){
    var s=migrateStore(readJSON(STORE_KEY,null));
    if(categories.concat(["Favorites"]).indexOf(s.category)<0)s.category="Widgets";
    if(!sorts.some(function(row){return row[0]===s.sort}))s.sort="recommended";
    return s;
  }
  function saveStore(next){
    next.version=2;
    next.history=(next.history||[]).slice(-140);
    writeJSON(STORE_KEY,next);
    var p=profile();
    if(p&&p.state){
      p.state.widgetMarketplace={
        favorites:next.favorites,
        ratings:next.ratings,
        installedVersions:next.installedVersions,
        verified:next.verified,
        community:next.community,
        history:next.history,
        updatedAt:now()
      };
      try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
    }
  }

  function normalizeId(id){
    return String(id||"").trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48);
  }
  function cmpVersion(a,b){
    var pa=String(a||"0").split(".").map(Number),pb=String(b||"0").split(".").map(Number);
    for(var i=0;i<Math.max(pa.length,pb.length);i++){
      var da=pa[i]||0,db=pb[i]||0;
      if(da>db)return 1;
      if(da<db)return -1;
    }
    return 0;
  }
  function normalizeDefinition(def,opts){
    opts=opts||{};
    def=def||{};
    var id=normalizeId(def.id||def.type||def.name||def.title);
    if(!id)throw new Error("ETHONEWidgetSDK.register requires an id.");
    var title=String(def.title||def.label||id).slice(0,80);
    var category=def.category||"Community";
    if(categories.indexOf(category)<0)category="Community";
    return {
      id:id,
      type:id,
      category:category,
      title:title,
      description:String(def.description||"Community widget for ETHONE.").slice(0,260),
      icon:String(def.icon||"square"),
      tags:Array.isArray(def.tags)?def.tags.slice(0,8):["community"],
      author:String(def.author||"Community").slice(0,80),
      version:String(def.version||"1.0.0"),
      rating:Number(def.rating||0)||0,
      verified:!!def.verified,
      permissions:Array.isArray(def.permissions)?def.permissions.slice(0,8):["Runs locally inside ETHONE"],
      changelog:Array.isArray(def.changelog)?def.changelog.slice(0,8):["Initial community release"],
      defaultSize:def.defaultSize||{col:2,row:1},
      minSize:def.minSize||{col:1,row:1},
      maxSize:def.maxSize||{col:4,row:3},
      maxInstances:def.maxInstances==null?Infinity:def.maxInstances,
      community:opts.community!==false,
      source:opts.source||"sdk",
      render:typeof def.render==="function"?def.render:null,
      mount:typeof def.mount==="function"?def.mount:null,
      unmount:typeof def.unmount==="function"?def.unmount:null,
      html:typeof def.html==="string"?def.html:"",
      customCSS:typeof def.css==="string"?def.css:""
    };
  }
  function serializeCommunity(def){
    return {
      id:def.id,
      type:def.type,
      category:def.category,
      title:def.title,
      description:def.description,
      icon:def.icon,
      tags:def.tags,
      author:def.author,
      version:def.version,
      rating:def.rating,
      verified:def.verified,
      permissions:def.permissions,
      changelog:def.changelog,
      defaultSize:def.defaultSize,
      minSize:def.minSize,
      maxSize:def.maxSize,
      maxInstances:def.maxInstances,
      html:def.html,
      css:def.customCSS,
      source:"community",
      community:true
    };
  }
  function registerWidget(def,options){
    var normalized=normalizeDefinition(def,options);
    var W=widgets();
    if(!W||typeof W.register!=="function")throw new Error("ETHONE widget registry is not ready.");
    runtimeWidgets[normalized.type]=normalized;
    window.__ethoneWidgetCatalogTypes=window.__ethoneWidgetCatalogTypes||[];
    if(window.__ethoneWidgetCatalogTypes.indexOf(normalized.type)<0)window.__ethoneWidgetCatalogTypes.push(normalized.type);
    var registryDefinition={
      label:normalized.title,
      icon:normalized.icon,
      category:normalized.category,
      defaultSize:normalized.defaultSize,
      minSize:normalized.minSize,
      maxSize:normalized.maxSize,
      maxInstances:normalized.maxInstances,
      mount:function(container,context){
        if(!container)return;
        container.classList.add("ethone-community-widget-host");
        if(normalized.customCSS&&!$("#wm-community-style-"+normalized.type)){
          var style=document.createElement("style");
          style.id="wm-community-style-"+normalized.type;
          style.textContent=normalized.customCSS;
          document.head.appendChild(style);
        }
        if(normalized.mount){normalized.mount(container,context||{},sdk());return}
        if(normalized.render){container.innerHTML=String(normalized.render(context||{},sdk())||"");return}
        container.innerHTML=normalized.html||communityFallbackHTML(normalized);
      },
      unmount:function(container,context){
        if(normalized.unmount)normalized.unmount(container,context||{},sdk());
        else if(container)container.innerHTML="";
      }
    };
    if(W.get&&W.get(normalized.type)&&typeof W.update==="function")W.update(normalized.type,registryDefinition);
    else W.register(normalized.type,registryDefinition);
    if(normalized.community&&options&&options.persist){
      var s=store();
      s.community=(s.community||[]).filter(function(item){return item.id!==normalized.id}).concat(serializeCommunity(normalized));
      s.verified[normalized.type]=verifyManifest(normalized).ok;
      s.history.push({action:"create",type:normalized.type,title:normalized.title,ts:now()});
      saveStore(s);
    }
    try{window.dispatchEvent(new CustomEvent("ethone:widget-sdk-register",{detail:{type:normalized.type,widget:clone(serializeCommunity(normalized))}}))}catch(e){}
    renderAll();
    return normalized;
  }
  function communityFallbackHTML(def){
    return '<div class="wm-community-widget"><span>'+esc(def.category)+'</span><strong>'+esc(def.title)+'</strong><p>'+esc(def.description)+'</p></div>';
  }
  function registerStoredCommunity(){
    var s=store();
    (s.community||[]).forEach(function(def){
      try{registerWidget(def,{persist:false,community:true,source:"community"})}catch(e){}
    });
  }
  function verifyManifest(item){
    var required=["type","title","description","version","author"];
    var missing=required.filter(function(k){return !item[k]});
    var W=widgets();
    var registered=!!(W&&W.get&&W.get(item.type));
    return {ok:!missing.length&&registered,missing:missing,registered:registered};
  }

  function widgetTypes(){
    var W=widgets();
    var types=Array.isArray(window.__ethoneWidgetCatalogTypes)?window.__ethoneWidgetCatalogTypes.slice():[];
    Object.keys(metadata).forEach(function(t){if(types.indexOf(t)<0)types.push(t)});
    Object.keys(runtimeWidgets).forEach(function(t){if(types.indexOf(t)<0)types.push(t)});
    return types.filter(function(type){return !!(W&&W.get&&W.get(type))});
  }
  function catalog(){
    var W=widgets(),s=store();
    return widgetTypes().map(function(type){
      var def=W.get(type)||{},meta=metadata[type],runtime=runtimeWidgets[type]||null;
      var base=runtime?[
        runtime.category,runtime.title,runtime.description,runtime.icon,runtime.tags,runtime.author,runtime.version,runtime.rating,runtime.verified,runtime.changelog,runtime.permissions
      ]:(meta||["Community",def.label||type,"Independent ETHONE widget.","square",[type],"Community","1.0.0",0,false,["Initial release"],["Runs locally inside ETHONE"]]);
      var item={
        id:"wm-"+type,
        type:type,
        category:base[0]||def.category||"Community",
        title:base[1]||def.label||type,
        description:base[2]||"Independent ETHONE widget.",
        icon:base[3]||def.icon||"square",
        tags:base[4]||[type],
        defaultSize:def.defaultSize||runtime&&runtime.defaultSize||{col:2,row:1},
        minSize:def.minSize||runtime&&runtime.minSize||{col:1,row:1},
        maxSize:def.maxSize||runtime&&runtime.maxSize||{col:4,row:2},
        maxInstances:def.maxInstances==null?runtime&&runtime.maxInstances!=null?runtime.maxInstances:Infinity:def.maxInstances,
        author:base[5]||"ETHONE Labs",
        version:base[6]||"1.0.0",
        rating:Number(s.ratings[type]||base[7]||0),
        baseRating:Number(base[7]||0),
        verified:!!(s.verified[type]||base[8]),
        changelog:base[9]||["Initial release"],
        permissions:base[10]||["Runs locally inside ETHONE"],
        community:!metadata[type]||!!(runtime&&runtime.community),
        createdByCommunity:!metadata[type],
        installedVersion:s.installedVersions[type]||"",
        kind:base[0]||"Community"
      };
      item.updateAvailable=isInstalled(type)&&(!item.installedVersion||cmpVersion(item.version,item.installedVersion)>0);
      return item;
    });
  }
  function filtered(){
    var s=store(),q=s.query.trim().toLowerCase();
    return catalog().filter(function(item){
      var cat=s.category==="Favorites"?!!s.favorites[item.type]:s.category==="Community"?item.community:item.category===s.category;
      if(!cat)return false;
      if(!q)return true;
      return [item.title,item.description,item.category,item.tags.join(" "),item.type,item.author].join(" ").toLowerCase().indexOf(q)>-1;
    }).sort(function(a,b){
      if(s.sort==="name")return a.title.localeCompare(b.title);
      if(s.sort==="rating")return b.rating-a.rating||a.title.localeCompare(b.title);
      if(s.sort==="updated")return Number(b.updateAvailable)-Number(a.updateAvailable)||b.rating-a.rating||a.title.localeCompare(b.title);
      if(s.sort==="installed")return Number(isInstalled(b.type))-Number(isInstalled(a.type))||a.title.localeCompare(b.title);
      return Number(isInstalled(b.type))-Number(isInstalled(a.type))||
        Number(!!s.favorites[b.type])-Number(!!s.favorites[a.type])||
        Number(b.verified)-Number(a.verified)||
        b.rating-a.rating||
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
  function getItem(type){return catalog().find(function(item){return item.type===type})||null}
  function pushHistory(action,type,extra){
    var s=store(),item=getItem(type)||{};
    s.history.push(Object.assign({action:action,type:type,title:item.title||type,version:item.version||"",ts:now()},extra||{}));
    saveStore(s);
  }
  function install(type){
    var W=widgets(),def=W&&W.get?W.get(type):null,layout=activeLayout(),item=getItem(type);
    if(!def||!layout){toast(tr("Layout dashboard indisponible","Dashboard layout unavailable"),"error");return false}
    var prefs=layoutPrefs(layout),count=prefs.instances.filter(function(w){return w.type===type}).length,max=def.maxInstances==null?Infinity:def.maxInstances;
    if(count>=max){toast(tr("Ce widget a atteint sa limite d instances","This widget reached its instance limit"),"info");return false}
    var size=Object.assign({},def.defaultSize||{col:2,row:1});
    prefs.instances.push({instanceId:type+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),type:type,size:size,locked:false,config:{}});
    var s=store();
    s.installedVersions[type]=item?item.version:"1.0.0";
    s.history.push({action:"install",type:type,title:item&&item.title||type,version:s.installedVersions[type],ts:now()});
    saveStore(s);
    saveLayout(layout);
    toast(tr("Widget installe : ","Widget installed: ")+(item&&item.title||type),"success");
    renderAll();
    return true;
  }
  function uninstall(type){
    var layout=activeLayout(),item=getItem(type);
    if(!layout){toast(tr("Layout dashboard indisponible","Dashboard layout unavailable"),"error");return false}
    var prefs=layoutPrefs(layout),before=prefs.instances.length;
    prefs.instances=prefs.instances.filter(function(w){return w.type!==type});
    var ids=prefs.instances.map(function(w){return w.instanceId});
    prefs.hidden=prefs.hidden.filter(function(id){return ids.indexOf(id)>-1});
    prefs.favorites=prefs.favorites.filter(function(id){return ids.indexOf(id)>-1});
    if(before===prefs.instances.length){toast(tr("Widget non installe","Widget is not installed"),"info");return false}
    var s=store();
    delete s.installedVersions[type];
    s.history.push({action:"uninstall",type:type,title:item&&item.title||type,ts:now()});
    saveStore(s);
    saveLayout(layout);
    toast(tr("Widget desinstalle : ","Widget uninstalled: ")+(item&&item.title||type),"info");
    renderAll();
    return true;
  }
  function update(type){
    var item=getItem(type),s=store();
    if(!item||!isInstalled(type)){toast(tr("Installe ce widget avant de le mettre a jour","Install this widget before updating it"),"info");return false}
    s.installedVersions[type]=item.version;
    s.history.push({action:"update",type:type,title:item.title,version:item.version,ts:now()});
    saveStore(s);
    toast(tr("Widget mis a jour : ","Widget updated: ")+item.title,"success");
    renderAll();
    return true;
  }
  function toggleFavorite(type){
    var s=store(),item=getItem(type);
    s.favorites[type]=!s.favorites[type];
    s.history.push({action:s.favorites[type]?"favorite":"unfavorite",type:type,title:item&&item.title||type,ts:now()});
    saveStore(s);
    renderAll();
    return !!s.favorites[type];
  }
  function rate(type,value){
    var s=store(),item=getItem(type),rating=Math.max(1,Math.min(5,Number(value)||0));
    if(!rating)return false;
    s.ratings[type]=rating;
    s.history.push({action:"rate",type:type,title:item&&item.title||type,rating:rating,ts:now()});
    saveStore(s);
    toast(tr("Note enregistree","Rating saved"),"success");
    renderAll();
    return rating;
  }
  function verify(type){
    var item=getItem(type),result=item&&verifyManifest(item);
    if(!item||!result)return false;
    var s=store();
    s.verified[type]=!!result.ok;
    s.history.push({action:"verify",type:type,title:item.title,ok:result.ok,ts:now()});
    saveStore(s);
    toast(result.ok?tr("Widget verifie","Widget verified"):tr("Manifest incomplet","Incomplete manifest"),result.ok?"success":"warning");
    renderAll();
    return result;
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
  function ratingStars(value,type){
    var out="";
    for(var i=1;i<=5;i++)out+='<button type="button" class="'+(i<=Math.round(value)?"active":"")+'" data-wm-rate="'+esc(type)+'" data-wm-rating="'+i+'" aria-label="Rate '+i+'">★</button>';
    return '<div class="wm-rating" role="group" aria-label="Widget rating">'+out+'</div>';
  }
  function card(item){
    var installed=isInstalled(item.type),fav=!!store().favorites[item.type],count=installedInstances(item.type).length;
    return '<article class="wm-card '+(installed?"installed":"")+'" data-wm-select="'+esc(item.type)+'" tabindex="0">'+
      '<div class="wm-card-top"><span class="wm-icon">'+icon(item.icon)+'</span><button type="button" class="wm-fav '+(fav?"active":"")+'" data-wm-favorite="'+esc(item.type)+'" aria-label="Favorite">'+icon("star")+'</button></div>'+
      '<div class="wm-card-copy"><div class="wm-badge-row">'+(item.verified?'<span class="wm-badge verified">'+icon("badge-check")+tr("Verifie","Verified")+'</span>':'')+(item.community?'<span class="wm-badge">'+tr("Communaute","Community")+'</span>':'')+(item.updateAvailable?'<span class="wm-badge update">'+tr("Update","Update")+'</span>':'')+'</div><strong>'+esc(item.title)+'</strong><p>'+esc(item.description)+'</p></div>'+
      '<div class="wm-card-meta"><span>'+esc(item.category)+'</span><span>v'+esc(item.version)+'</span><span>'+esc(item.maxInstances===Infinity?"Multi":"Single")+'</span></div>'+
      ratingStars(item.rating,item.type)+
      '<div class="wm-card-tags">'+item.tags.slice(0,3).map(function(tag){return '<span>'+esc(tag)+'</span>'}).join("")+'</div>'+
      '<div class="wm-card-actions">'+
        '<button type="button" class="wm-btn primary" data-wm-install="'+esc(item.type)+'">'+(installed?tr("Ajouter encore","Add another"):tr("Installer","Install"))+'</button>'+
        '<button type="button" class="wm-btn" data-wm-remove="'+esc(item.type)+'" '+(!installed?'disabled':'')+'>'+tr("Desinstaller","Uninstall")+(count>1?" ("+count+")":"")+'</button>'+
      '</div>'+
    '</article>';
  }
  function detail(item){
    if(!item)return '<div class="wm-empty">'+tr("Aucun widget trouve.","No widget found.")+'</div>';
    var installed=isInstalled(item.type),fav=!!store().favorites[item.type],count=installedInstances(item.type).length,verifyState=verifyManifest(item);
    return '<aside class="wm-detail">'+
      '<div class="wm-detail-head"><span class="wm-detail-icon">'+icon(item.icon)+'</span><div><span>'+esc(item.category)+' / '+esc(item.author)+'</span><h3>'+esc(item.title)+'</h3><p>'+esc(item.description)+'</p></div></div>'+
      '<div class="wm-detail-actions">'+
        '<button type="button" class="wm-btn primary" data-wm-install="'+esc(item.type)+'">'+(installed?tr("Ajouter instance","Add instance"):tr("Installer en un clic","Install in one click"))+'</button>'+
        '<button type="button" class="wm-btn" data-wm-remove="'+esc(item.type)+'" '+(!installed?'disabled':'')+'>'+tr("Desinstaller","Uninstall")+'</button>'+
        '<button type="button" class="wm-btn" data-wm-update="'+esc(item.type)+'" '+(!item.updateAvailable?'disabled':'')+'>'+tr("Mettre a jour","Update")+'</button>'+
        '<button type="button" class="wm-btn" data-wm-favorite="'+esc(item.type)+'">'+(fav?tr("Retirer favori","Unfavorite"):tr("Favori","Favorite"))+'</button>'+
        '<button type="button" class="wm-btn" data-wm-verify="'+esc(item.type)+'">'+(item.verified?tr("Reverifier","Recheck"):tr("Verifier","Verify"))+'</button>'+
      '</div>'+
      '<div class="wm-detail-grid">'+
        meta("Status",installed?tr("Installe","Installed"):tr("Disponible","Available"))+meta("Version",item.version)+meta("Installed",item.installedVersion||"-")+meta("Instances",String(count))+meta("Rating",item.rating?item.rating+"/5":"-")+meta("Verified",verifyState.ok?tr("Oui","Yes"):tr("A verifier","Check"))+meta("Author",item.author)+meta("Size",item.defaultSize.col+" x "+item.defaultSize.row)+
      '</div>'+
      '<section><h4>'+tr("Noter ce widget","Rate this widget")+'</h4>'+ratingStars(item.rating,item.type)+'</section>'+
      '<section><h4>'+tr("Permissions","Permissions")+'</h4>'+item.permissions.map(function(row){return '<p>'+esc(row)+'</p>'}).join("")+'</section>'+
      '<section><h4>Changelog</h4>'+item.changelog.map(function(row){return '<p>'+esc(row)+'</p>'}).join("")+'</section>'+
      '<section><h4>'+tr("API developpeur","Developer API")+'</h4><pre class="wm-code">ETHONEWidgetSDK.register({\n  id: "'+esc(item.type)+'-custom",\n  title: "My Widget",\n  category: "Community",\n  render(ctx, sdk) { return "&lt;strong&gt;Hello ETHONE&lt;/strong&gt;"; }\n});</pre></section>'+
    '</aside>';
  }
  function meta(k,v){return '<div><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>'}
  function render(){
    var page=ensurePage(),s=store(),items=filtered(),selected=items.find(function(i){return i.type===s.selected})||items[0]||catalog()[0];
    if(selected&&s.selected!==selected.type){s.selected=selected.type;saveStore(s)}
    var all=catalog(),installedCount=all.filter(function(i){return isInstalled(i.type)}).length,updateCount=all.filter(function(i){return i.updateAvailable}).length,verifiedCount=all.filter(function(i){return i.verified}).length;
    page.classList.add("widget-marketplace-ready");
    page.innerHTML=
      '<section class="wm-shell">'+
        '<header class="wm-hero">'+
          '<div><span class="wm-kicker">ETHONE Widget Marketplace</span><h2>'+tr("Un vrai store pour construire ton OS.","A real store to build your OS.")+'</h2><p>'+tr("Installe, desinstalle, mets a jour, note, verifie et cree des widgets communautaires compatibles avec le dashboard ETHONE.","Install, uninstall, update, rate, verify and create community widgets compatible with the ETHONE dashboard.")+'</p></div>'+
          '<div class="wm-hero-stats"><div><strong>'+all.length+'</strong><span>Catalog</span></div><div><strong>'+installedCount+'</strong><span>Installed</span></div><div><strong>'+updateCount+'</strong><span>Updates</span></div><div><strong>'+verifiedCount+'</strong><span>Verified</span></div></div>'+
        '</header>'+
        '<section class="wm-toolbar">'+
          '<label class="wm-search">'+icon("search")+'<input id="wm-search-input" value="'+esc(s.query)+'" placeholder="'+tr("Rechercher widgets, auteurs, tags...","Search widgets, authors, tags...")+'" /></label>'+
          '<select class="wm-sort" id="wm-sort-select" aria-label="Sort widgets">'+sorts.map(function(row){return '<option value="'+esc(row[0])+'" '+(s.sort===row[0]?"selected":"")+'>'+esc(row[1])+'</option>'}).join("")+'</select>'+
          '<button type="button" class="wm-btn primary" data-wm-create>'+tr("Creer widget","Create widget")+'</button>'+
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
  function openCreator(existing){
    closeCreator();
    var overlay=document.createElement("div");
    overlay.className="wm-creator-overlay";
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.innerHTML=
      '<form class="wm-creator" data-wm-creator-form>'+
        '<div class="wm-creator-head"><div><span>ETHONE Widget SDK</span><h2>'+tr("Creer un widget communautaire","Create a community widget")+'</h2><p>'+tr("Ce createur genere un widget local compatible avec le SDK. Tu peux ensuite remplacer le rendu via ETHONEWidgetSDK.register.","This builder creates a local SDK-compatible widget. You can replace the render later with ETHONEWidgetSDK.register.")+'</p></div><button type="button" class="wm-btn" data-wm-creator-close>Close</button></div>'+
        '<div class="wm-creator-grid">'+
          field("Title","title","My ETHONE Widget")+field("ID","id","my-widget")+field("Author","author","Community")+field("Icon","icon","sparkles")+field("Version","version","1.0.0")+
          '<label><span>Category</span><select name="category">'+categories.map(function(cat){return '<option value="'+esc(cat)+'" '+(cat==="Community"?"selected":"")+'>'+esc(cat)+'</option>'}).join("")+'</select></label>'+
          '<label class="wide"><span>Description</span><textarea name="description" rows="3">A premium community widget for ETHONE.</textarea></label>'+
          '<label class="wide"><span>HTML</span><textarea name="html" rows="5">&lt;div class=&quot;wm-community-widget&quot;&gt;&lt;span&gt;Community&lt;/span&gt;&lt;strong&gt;My Widget&lt;/strong&gt;&lt;p&gt;Built with ETHONEWidgetSDK.&lt;/p&gt;&lt;/div&gt;</textarea></label>'+
        '</div>'+
        '<div class="wm-creator-actions"><button type="button" class="wm-btn" data-wm-creator-close>'+tr("Annuler","Cancel")+'</button><button type="submit" class="wm-btn primary">'+tr("Creer et verifier","Create and verify")+'</button></div>'+
      '</form>';
    document.body.appendChild(overlay);
    var input=overlay.querySelector("[name='title']");
    if(input)input.focus();
  }
  function field(label,name,value){return '<label><span>'+esc(label)+'</span><input name="'+esc(name)+'" value="'+esc(value)+'" required></label>'}
  function closeCreator(){$$(".wm-creator-overlay").forEach(function(el){el.remove()})}
  function saveCreator(form){
    var data=new FormData(form);
    var def={
      id:data.get("id"),
      title:data.get("title"),
      author:data.get("author"),
      icon:data.get("icon"),
      version:data.get("version"),
      category:data.get("category"),
      description:data.get("description"),
      html:data.get("html"),
      tags:["community","local"],
      permissions:["Runs locally inside ETHONE"],
      changelog:["Created locally with ETHONE Widget SDK"]
    };
    var widget=registerWidget(def,{persist:true,community:true,source:"creator"});
    var s=store();
    s.category="Community";
    s.selected=widget.type;
    s.verified[widget.type]=true;
    saveStore(s);
    closeCreator();
    toast(tr("Widget communautaire cree","Community widget created"),"success");
    renderAll();
  }

  function bind(){
    document.addEventListener("click",function(e){
      if(e.target.closest("[data-wm-open]")){open();return}
      if(e.target.closest("[data-wm-create]")){openCreator();return}
      if(e.target.closest("[data-wm-creator-close]")){closeCreator();return}
      var category=e.target.closest("[data-wm-category]");
      if(category){var s=store();s.category=category.dataset.wmCategory;s.query="";saveStore(s);render();return}
      var select=e.target.closest("[data-wm-select]");
      if(select&&!e.target.closest("button")){var st=store();st.selected=select.dataset.wmSelect;saveStore(st);render();return}
      var installBtn=e.target.closest("[data-wm-install]");
      if(installBtn){install(installBtn.dataset.wmInstall);return}
      var removeBtn=e.target.closest("[data-wm-remove]");
      if(removeBtn){uninstall(removeBtn.dataset.wmRemove);return}
      var updateBtn=e.target.closest("[data-wm-update]");
      if(updateBtn){update(updateBtn.dataset.wmUpdate);return}
      var verifyBtn=e.target.closest("[data-wm-verify]");
      if(verifyBtn){verify(verifyBtn.dataset.wmVerify);return}
      var fav=e.target.closest("[data-wm-favorite]");
      if(fav){toggleFavorite(fav.dataset.wmFavorite);return}
      var rateBtn=e.target.closest("[data-wm-rate]");
      if(rateBtn){rate(rateBtn.dataset.wmRate,rateBtn.dataset.wmRating);return}
    });
    document.addEventListener("submit",function(e){
      var form=e.target.closest("[data-wm-creator-form]");
      if(!form)return;
      e.preventDefault();
      try{saveCreator(form)}catch(err){toast(err.message||"Widget creation failed","error")}
    });
    document.addEventListener("input",function(e){
      if(e.target&&e.target.id==="wm-search-input"){var s=store();s.query=e.target.value;saveStore(s);clearTimeout(render._timer);render._timer=setTimeout(render,90)}
    });
    document.addEventListener("change",function(e){
      if(e.target&&e.target.id==="wm-sort-select"){var s=store();s.sort=e.target.value;saveStore(s);render()}
    });
    document.addEventListener("keydown",function(e){
      var cardEl=e.target.closest("[data-wm-select]");
      if(cardEl&&(e.key==="Enter"||e.key===" ")){e.preventDefault();var s=store();s.selected=cardEl.dataset.wmSelect;saveStore(s);render()}
      if(e.key==="Escape")closeCreator();
    });
    window.addEventListener("ethone:page-ready",function(e){
      if(e.detail&&e.detail.page===pageId)render();
      if(e.detail&&e.detail.page==="marketplace")setTimeout(injectMarketplaceEntry,80);
    });
    window.addEventListener("ethone:dashboard-ready",function(){
      if(window.ethoneCanMountUI&&window.ethoneCanMountUI("widgets-panel"))setTimeout(renderAll,900);
    });
    window.addEventListener("ethone:smart-layout-change",function(){setTimeout(renderAll,120)});
  }
  function registerAction(){
    var A=actions();
    if(A&&A.register){
      A.register("marketplace.widgets.open",{label:"Widget Marketplace",handler:open});
      A.register("marketplace.widgets.create",{label:"Create widget",handler:openCreator});
    }
  }
  function sdk(){
    return window.ETHONEWidgetSDK;
  }
  function boot(){
    registerStoredCommunity();
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
    search:function(query){var s=store();s.query=String(query||"");saveStore(s);return filtered()},
    install:install,
    uninstall:uninstall,
    remove:uninstall,
    update:update,
    favorite:toggleFavorite,
    rate:rate,
    verify:verify,
    create:function(def){return registerWidget(def,{persist:true,community:true,source:"api"})},
    registerWidget:registerWidget,
    state:store
  };
  window.ETHONEWidgetSDK={
    version:"1.0.0",
    register:function(def){return registerWidget(def,{persist:!!(def&&def.persist),community:def&&def.community!==false,source:"sdk"})},
    create:function(def){return registerWidget(def,{persist:true,community:true,source:"sdk"})},
    install:install,
    uninstall:uninstall,
    update:update,
    favorite:toggleFavorite,
    rate:rate,
    verify:verify,
    search:function(query){return window.ETHONEWidgetMarketplace.search(query)},
    list:catalog,
    get:getItem,
    state:store,
    toast:toast
  };
  window.defineEthoneWidget=window.ETHONEWidgetSDK.register;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
