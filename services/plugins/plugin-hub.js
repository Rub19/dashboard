(function(){
  "use strict";
  if(window.__ethonePluginHub)return;
  window.__ethonePluginHub=true;

  var plugins=[
    plugin("discord","Discord","message-circle","#8b5cf6","ETHONE Labs","2.8.6","Presence, activity and community context for Brain OS.",["Read presence","Read activity","Use avatar"],["Presence stability pass","Voice activity preview","Repair flow added"],{sync:"Presence",memory:18.4,settings:{workspace:"Gaming",presence:true,activity:true}}),
    plugin("spotify","Spotify","music","#8b5cf6","ETHONE Labs","2.4.1","Now Playing, listening history and focus-session music context.",["Read current track","Read playback state","Use listening context"],["Now Playing bridge","Better local fallback","Memory budget reduced"],{sync:"Playback",memory:14.7,settings:{widgetUrl:"",nowPlaying:true,history:false}}),
    plugin("github","GitHub","git-branch","#f5f5f7","ETHONE Dev","3.1.0","Repositories, commits, pull requests and developer workflow signals.",["Read profile","Read repositories","Read public activity"],["Repository health card","Commit timeline support","Token field hardening"],{sync:"Developer activity",memory:22.8,settings:{username:"",token:"",repos:true}}),
    plugin("steam","Steam","gamepad-2","#8b5cf6","ETHONE Gaming","1.9.4","Games, profile status and session history for gaming Spaces.",["Read profile","Read recent games","Read playtime"],["SteamID validation","Recent games preview","Safer reconnect"],{sync:"Gaming status",memory:19.1,settings:{steamId:"",apiKey:""}}),
    plugin("twitch","Twitch","tv","#8b5cf6","ETHONE Creator","1.6.2","Live status, followed streamers and creator dashboard context.",["Read channel","Read live status","Track streamers"],["Multi-streamer list","Live badge polish","Retry button added"],{sync:"Live status",memory:16.5,settings:{username:"",notifications:true}}),
    plugin("youtube","YouTube","play-circle","#8b5cf6","ETHONE Creator","1.2.0","Channel uploads, creator stats and publishing workflow context.",["Read channel","Read uploads","Read analytics summary"],["Channel placeholder complete","Upload queue preview","API key setting prepared"],{sync:"Creator updates",memory:20.2,ready:false,soon:"YouTube Data API and OAuth are prepared, but the production worker callback is not connected yet.",settings:{channel:"",apiKey:""}}),
    plugin("valorant","Valorant","target","#8b5cf6","ETHONE Gaming","2.2.3","Riot identity, rank context and account organization for Valorant Spaces.",["Read Riot ID","Read local accounts","Use gaming context"],["Account database link","Rank card fallback","Repair keeps local accounts"],{sync:"Accounts",memory:17.9,settings:{riotId:"",region:"eu"}}),
    plugin("obs","OBS","radio-tower","#8b5cf6","StreamForge","1.0.1","Streaming scenes, recording status and local bridge readiness.",["Connect local WebSocket","Read scene status","Read recording state"],["WebSocket endpoint settings","Local bridge placeholder","Repair checks URL format"],{sync:"Local bridge",memory:24.6,ready:false,soon:"OBS requires the secure local WebSocket bridge before plugin runtime can be enabled.",settings:{host:"ws://localhost:4455",password:""}}),
    plugin("googlecalendar","Google Calendar","calendar-days","#8b5cf6","ETHONE Labs","1.4.0","Meetings, deadlines and planning context for Planner Engine.",["Read calendar","Read events","Create approved reminders"],["OAuth-ready settings","Focus block preview","Local account persistence"],{sync:"Planning",memory:15.8,ready:false,soon:"Google Calendar OAuth is ready in the UI but waits for the production callback.",settings:{account:"",calendarId:"primary"}}),
    plugin("googledrive","Google Drive","folder","#8b5cf6","ETHONE Labs","1.1.5","Workspace files, folders and document context for Vision and Brain.",["Read files metadata","Read selected documents","Use workspace folders"],["Folder setting added","Drive API placeholder","Quick Look preparation"],{sync:"Files",memory:21.3,ready:false,soon:"Google Drive needs OAuth scopes and file permissions before live sync can run.",settings:{account:"",folder:""}}),
    plugin("battlenet","Battle.net","sparkles","#8b5cf6","ETHONE Gaming","1.0.0","Battle.net identity, games and session context for gaming environments.",["Read BattleTag","Read game library","Use session context"],["BattleTag setting","Region selector","OAuth placeholder complete"],{sync:"Gaming profile",memory:13.2,ready:false,soon:"Battle.net OAuth needs a server-side client before live game library sync is available.",settings:{battleTag:"",region:"eu"}})
  ];
  var pendingRemoval={id:"",at:0};

  function releasePlugins(){
    return plugins.filter(function(def){return def.ready!==false;});
  }

  function plugin(id,name,icon,accent,author,version,desc,permissions,changelog,extra){
    return Object.assign({id:id,name:name,icon:icon,accent:accent,author:author,version:version,desc:desc,permissions:permissions,changelog:changelog},extra||{});
  }
  function p(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]})}
  function save(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function toast(msg,type){try{if(typeof window.toast==="function")window.toast(msg,type||"info")}catch(e){}}
  function now(){return new Date().toISOString()}
  function labelDate(v){try{return v?new Date(v).toLocaleString([], {dateStyle:"medium",timeStyle:"short"}):"Never"}catch(e){return "Never"}}
  function activity(def,action,body){
    try{
      if(window.ETHONETimeline&&typeof window.ETHONETimeline.record==="function"){
        window.ETHONETimeline.record({title:def.name+" plugin "+action,body:body||"",category:"plugin",source:"Plugin Hub",dedupe:"plugin-"+def.id+"-"+action+"-"+Math.floor(Date.now()/1000)});
      }
    }catch(e){}
  }
  function getProfileState(){
    var prof=p();if(!prof||!prof.state)return null;
    if(!prof.state.plugins)prof.state.plugins={};
    if(!prof.state.pluginHub)prof.state.pluginHub={selected:"",lastAudit:null};
    return prof.state;
  }
  function pluginState(id){
    var s=getProfileState();if(!s)return {};
    if(!s.plugins[id])s.plugins[id]={installed:false,enabled:false,status:"available",permissionsGranted:[],settings:{},history:[]};
    if(!Array.isArray(s.plugins[id].permissionsGranted))s.plugins[id].permissionsGranted=[];
    if(!Array.isArray(s.plugins[id].history))s.plugins[id].history=[];
    return s.plugins[id];
  }
  function connState(id){
    var s=getProfileState();if(!s)return null;
    if(id==="valorant")return s.gaming&&s.gaming.valo||((s.valorantAccounts||[]).length?{accounts:s.valorantAccounts.length}:null);
    return s.connections&&s.connections[id]||null;
  }
  function isConnected(id){
    var c=connState(id);
    return !!(c&&Object.keys(c).length);
  }
  function memoryFor(def,st){
    var jitter=(def.id.length*1.7)+(st.enabled?4.2:0)+(isConnected(def.id)?2.5:0);
    return Math.round((def.memory+jitter)*10)/10;
  }
  function statusFor(def,st){
    if(def.ready===false)return ["Coming Soon","pending"];
    if(!st.installed)return ["Available","available"];
    if(st.status==="repairing")return ["Repairing","sync"];
    if(st.status==="reinstalled")return ["Reinstalled","connected"];
    if(isConnected(def.id))return [st.enabled?"Connected":"Installed","connected"];
    if(st.enabled)return ["Installed","pending"];
    return ["Disabled","disabled"];
  }
  function pushHistory(st,type,message){
    st.history.unshift({type:type||"info",message:message||"Updated",at:now()});
    st.history=st.history.slice(0,6);
  }
  function install(id){
    var def=find(id),st=pluginState(id);if(!def)return;
    st.installed=true;st.enabled=true;st.status=isConnected(id)?"connected":"installed";st.version=def.version;st.author=def.author;st.installedAt=st.installedAt||now();st.updatedAt=now();
    st.settings=Object.assign({},def.settings||{},st.settings||{});
    st.permissionsGranted=def.permissions.slice();
    pushHistory(st,"success","Plugin installed");
    activity(def,"installed","Version "+def.version+" by "+def.author);
    save();render();toast(def.name+" installed","success");
  }
  function uninstall(id){
    var def=find(id),st=pluginState(id);if(!def)return;
    if(pendingRemoval.id!==id||Date.now()-pendingRemoval.at>5000){
      pendingRemoval={id:id,at:Date.now()};
      toast("Click Remove again to uninstall "+def.name+". Connection data is kept.","warning");
      return;
    }
    pendingRemoval={id:"",at:0};
    st.installed=false;st.enabled=false;st.status="available";st.updatedAt=now();
    pushHistory(st,"info","Plugin uninstalled");
    activity(def,"removed","Connection data kept in Integration Hub.");
    save();render();toast(def.name+" uninstalled","info");
  }
  function toggle(id){
    var def=find(id),st=pluginState(id);if(!def)return;
    if(!st.installed){install(id);return}
    st.enabled=!st.enabled;st.status=st.enabled?"installed":"disabled";st.updatedAt=now();
    pushHistory(st,st.enabled?"success":"info",st.enabled?"Plugin enabled":"Plugin disabled");
    activity(def,st.enabled?"enabled":"disabled","");
    save();render();toast(def.name+(st.enabled?" enabled":" disabled"),"success");
  }
  function repair(id){
    var def=find(id),st=pluginState(id);if(!def)return;
    st.status="repairing";st.updatedAt=now();save();render();
    setTimeout(function(){
      try{
        st.installed=true;st.enabled=true;st.status=isConnected(id)?"connected":"installed";st.version=def.version;
        st.settings=Object.assign({},def.settings||{},st.settings||{});
        def.permissions.forEach(function(permission){if(!st.permissionsGranted.includes(permission))st.permissionsGranted.push(permission)});
        pushHistory(st,"success","Repair completed");
        activity(def,"repaired","Permissions and settings verified.");
        save();render();toast(def.name+" repaired","success");
      }catch(error){toast("Repair failed: "+(error.message||error),"error")}
    },260);
  }
  function reinstall(id){
    var def=find(id),st=pluginState(id);if(!def)return;
    st.installed=true;st.enabled=true;st.status="reinstalled";st.version=def.version;st.updatedAt=now();st.installedAt=now();
    st.settings=Object.assign({},def.settings||{},st.settings||{});
    st.permissionsGranted=def.permissions.slice();
    pushHistory(st,"success","Plugin reinstalled at version "+def.version);
    activity(def,"reinstalled","Version "+def.version);
    save();render();toast(def.name+" reinstalled","success");
  }
  function configure(id){
    var def=find(id);if(!def)return;
    if(typeof window.switchPage==="function")window.switchPage("connections",null);
    setTimeout(function(){
      var card=document.getElementById("ih-card-"+id);
      if(card)card.scrollIntoView({block:"center",behavior:"smooth"});
      else toast(def.name+" settings are available in Plugin Hub.","info");
    },90);
  }
  function audit(){
    var s=getProfileState();if(!s)return;
    s.pluginHub.lastAudit=now();
    plugins.forEach(function(def){
      var st=pluginState(def.id);
      if(st.installed&&!st.version)st.version=def.version;
      if(st.installed&&!st.settings)st.settings=Object.assign({},def.settings||{});
    });
    save();render();toast("Plugin Hub audit complete","success");
  }
  function register(definition){
    if(!definition||!definition.id)return null;
    var id=String(definition.id).trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"");
    if(!id)return null;
    var existing=find(id);
    var normalized=plugin(
      id,
      definition.name||definition.title||id,
      definition.icon||"plug",
      definition.accent||"#8b5cf6",
      definition.author||"Community",
      definition.version||"1.0.0",
      definition.description||definition.desc||"Community plugin for ETHONE.",
      Array.isArray(definition.permissions)?definition.permissions:["Runs locally inside ETHONE"],
      Array.isArray(definition.changelog)?definition.changelog:["Registered with ETHONE Plugin SDK"],
      Object.assign({sync:definition.sync||"Plugin runtime",memory:Number(definition.memory||12),settings:definition.settings||{}},definition.extra||{})
    );
    normalized.sdk=true;
    if(existing)Object.assign(existing,normalized);
    else plugins.push(normalized);
    try{window.dispatchEvent(new CustomEvent("ethone:plugin-hub-register",{detail:{plugin:normalized}}))}catch(e){}
    render();
    return normalized;
  }
  function find(id){return plugins.find(function(x){return x.id===id})}
  function settingRows(def,st){
    var settings=Object.assign({},def.settings||{},st.settings||{});
    return Object.keys(settings).slice(0,3).map(function(key){
      var value=settings[key];
      var hidden=/token|key|password/i.test(key);
      return '<label class="ph-setting"><span>'+esc(key)+'</span><input data-ph-setting="'+esc(key)+'" data-ph-id="'+def.id+'" type="'+(hidden?"password":"text")+'" value="'+esc(value)+'" placeholder="'+esc(key)+'"></label>';
    }).join("");
  }
  function card(def){
    var st=pluginState(def.id),status=statusFor(def,st),mem=memoryFor(def,st);
    var granted=st.permissionsGranted||[];
    var soon=def.ready===false;
    var soonAttrs=soon?' data-coming-soon="'+esc(def.name+' plugin runtime')+'" data-coming-soon-description="'+esc(def.soon||'This plugin runtime is not connected to a production integration yet.')+'" data-coming-soon-note="false"':'';
    return '<article class="ph-card" id="ph-card-'+def.id+'" data-ih-id="'+def.id+'" style="--ph-accent:'+def.accent+'"'+(soon?' data-feature-status="coming-soon" data-feature-name="'+esc(def.name)+' plugin" data-coming-soon-description="'+esc(def.soon||'This plugin runtime is not connected to a production integration yet.')+'"':'')+'>'+
      '<div class="ph-card-head"><span class="ph-logo"><i data-lucide="'+def.icon+'"></i></span><div><h3>'+esc(def.name)+'</h3><p>'+esc(def.desc)+'</p></div><span class="ph-status '+status[1]+'">'+status[0]+'</span></div>'+
      '<div class="ph-meta"><div><span>Version</span><strong>'+esc(st.version||def.version)+'</strong></div><div><span>Author</span><strong>'+esc(def.author)+'</strong></div><div><span>Memory</span><strong>'+mem+' MB</strong></div><div><span>Updated</span><strong>'+labelDate(st.updatedAt)+'</strong></div></div>'+
      '<div class="ph-section"><div class="ph-title">Permissions</div><div class="ph-perms">'+def.permissions.map(function(permission){return '<span class="'+(granted.includes(permission)?"granted":"")+'">'+esc(permission)+'</span>'}).join("")+'</div></div>'+
      '<div class="ph-section"><div class="ph-title">Settings</div><div class="ph-settings">'+settingRows(def,st)+'</div></div>'+
      '<div class="ph-section"><div class="ph-title">Changelog</div><ul class="ph-change">'+def.changelog.map(function(item){return '<li>'+esc(item)+'</li>'}).join("")+'</ul></div>'+
      '<div class="ph-history">'+((st.history||[]).length?st.history.slice(0,3).map(function(h){return '<div><i class="'+esc(h.type)+'"></i><span>'+esc(h.message)+'</span><time>'+labelDate(h.at)+'</time></div>'}).join(""):'<div><i></i><span>No plugin activity yet</span><time>-</time></div>')+'</div>'+
      '<div class="ph-actions">'+
        (soon?'<button class="btn btn-primary" type="button" data-coming-soon-notify="true"'+soonAttrs+'>Notify me</button>':'<button class="btn btn-primary" type="button" data-ph-action="'+(st.installed?"toggle":"install")+'" data-ph-id="'+def.id+'">'+(st.installed?(st.enabled?"Disable":"Enable"):"Install")+'</button>')+
        '<button class="btn btn-ghost" type="button" data-ph-action="configure" data-ph-id="'+def.id+'">Settings</button>'+
        (soon?'<button class="btn btn-ghost" type="button"'+soonAttrs+'>Repair</button>':'<button class="btn btn-ghost" type="button" data-ph-action="repair" data-ph-id="'+def.id+'" '+(!st.installed?"disabled":"")+'>Repair</button>')+
        (soon?'<button class="btn btn-ghost" type="button"'+soonAttrs+'>Reinstall</button>':'<button class="btn btn-ghost" type="button" data-ph-action="reinstall" data-ph-id="'+def.id+'" '+(!st.installed?"disabled":"")+'>Reinstall</button>')+
        (st.installed?'<button class="btn btn-ghost ph-danger" type="button" data-ph-action="uninstall" data-ph-id="'+def.id+'">Remove</button>':'')+
      '</div>'+
    '</article>';
  }
  function summary(){
    var available=releasePlugins();
    var installed=available.filter(function(def){return pluginState(def.id).installed}).length;
    var enabled=available.filter(function(def){var st=pluginState(def.id);return st.installed&&st.enabled}).length;
    var connected=available.filter(function(def){return isConnected(def.id)}).length;
    var memory=available.reduce(function(sum,def){var st=pluginState(def.id);return sum+(st.installed?memoryFor(def,st):0)},0);
    return {installed:installed,enabled:enabled,connected:connected,memory:Math.round(memory*10)/10};
  }
  function render(){
    var host=document.getElementById("plugins-list");if(!host)return;
    getProfileState();
    var s=summary();
    host.innerHTML='<section class="ph-shell">'+
      '<div class="ph-hero"><div><div class="section-eyebrow">Plugin Hub</div><h2>Extensions for your Personal OS</h2><p>Install, repair and manage modular plugins without touching backend logic. Connections remain configured in the Integration Hub.</p></div><button class="btn btn-ghost" type="button" data-ph-action="audit">Audit plugins</button></div>'+
      '<div class="ph-stats"><div><span>Installed</span><strong>'+s.installed+'/'+releasePlugins().length+'</strong></div><div><span>Enabled</span><strong>'+s.enabled+'</strong></div><div><span>Connected</span><strong>'+s.connected+'</strong></div><div><span>Memory</span><strong>'+s.memory+' MB</strong></div></div>'+ 
      '<div class="ph-grid">'+releasePlugins().map(card).join("")+'</div>'+ 
    '</section>';
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function saveSetting(input){
    var def=find(input.dataset.phId),st=pluginState(input.dataset.phId);if(!def)return;
    if(!st.settings)st.settings={};
    st.settings[input.dataset.phSetting]=input.value;
    st.updatedAt=now();
    pushHistory(st,"info","Setting updated: "+input.dataset.phSetting);
    save();
  }
  document.addEventListener("click",function(e){
    var btn=e.target.closest("[data-ph-action]");if(!btn)return;
    var action=btn.dataset.phAction,id=btn.dataset.phId;
    try{
      if(action==="install")install(id);
      else if(action==="toggle")toggle(id);
      else if(action==="configure")configure(id);
      else if(action==="repair")repair(id);
      else if(action==="reinstall")reinstall(id);
      else if(action==="uninstall")uninstall(id);
      else if(action==="audit")audit();
    }catch(error){console.error("[ETHONE Plugin Hub]",error);toast(error.message||"Plugin action failed","error")}
  });
  document.addEventListener("change",function(e){
    var input=e.target.closest("[data-ph-setting]");if(!input)return;
    try{saveSetting(input);render()}catch(error){console.error("[ETHONE Plugin Hub]",error)}
  });
  function boot(){
    var old=window.renderPluginsSettings;
    if(typeof old==="function"&&!old.__pluginHubWrapped){
      var wrapped=function(){render()};
      wrapped.__pluginHubWrapped=true;
      window.renderPluginsSettings=wrapped;
    }
    render();
  }
  window.addEventListener("ethone:page-ready",function(event){
    if(!event.detail||["settings","plugins","developer"].indexOf(event.detail.page)>-1)boot();
  });
  window.ETHONEPluginHub={render:render,install:install,uninstall:uninstall,repair:repair,reinstall:reinstall,audit:audit,register:register,plugins:plugins,state:pluginState};
})();
