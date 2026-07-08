(function(){
  if(window.__ethoneIntegrationHub)return;
  window.__ethoneIntegrationHub=true;

  var defs=[
    {id:"discord",name:"Discord",accent:"#5865F2",icon:"message-circle",desc:"Presence, avatar, activity and Spotify signals through Lanyard.",statePath:"connections.discord",fields:[["userId","Discord User ID","123456789012345678"]],legacyConnect:"connectDiscord",legacyRefresh:"refreshDiscord",legacyDisconnect:"disconnectDiscord",preview:["Presence","Rich activity","Now Playing"]},
    {id:"spotify",name:"Spotify",accent:"#1DB954",icon:"music",desc:"Now Playing widget through your existing widget URL or Discord presence.",statePath:"connections.spotify",fields:[["widgetUrl","Now Playing widget URL","https://widget.nowplaying.site/..."]],legacyConnect:"connectSpotify",legacyRefresh:"refreshSpotifySidebar",legacyDisconnect:"disconnectSpotify",preview:["Track","Artist","Progress"]},
    {id:"github",name:"GitHub",accent:"#f5f5f5",icon:"git-branch",desc:"Developer activity, repositories, commits and profile context.",statePath:"connections.github",fields:[["username","GitHub username","rub19"],["token","Token optional","ghp_...","password"]],legacyConnect:"connectGithubFromConnections",legacyRefresh:"refreshGithub",legacyDisconnect:"disconnectGithub",preview:["Commits","Repositories","Profile"]},
    {id:"steam",name:"Steam",accent:"#66C0F4",icon:"gamepad-2",desc:"Profile, current game, recent games and gaming signals.",statePath:"connections.steam",fields:[["steamId","SteamID64","76561198XXXXXXXXX"],["apiKey","Steam API key optional","XXXXXXXXXXXXXXXX","password"]],legacyConnect:"connectSteam",legacyRefresh:"refreshSteam",legacyDisconnect:"disconnectSteam",preview:["Current game","Recent games","Steam level"]},
    {id:"twitch",name:"Twitch",accent:"#9147FF",icon:"tv",desc:"Track streamers, live status, category and viewer count.",statePath:"connections.twitch",fields:[["username","Streamer username","squeezie"]],legacyConnect:"connectTwitch",legacyRefresh:"refreshTwitch",legacyDisconnect:"disconnectTwitch",preview:["Live status","Category","Viewers"]},
    {id:"valorant",name:"Valorant",accent:"#FF4655",icon:"target",desc:"Rank, recent matches and competitive progression from the Gaming module.",statePath:"gaming.valo",fields:[["riotId","Riot ID","Name#TAG"],["region","Region","eu"]],legacyConnect:"connectValo",legacyRefresh:"loadValoStats",legacyDisconnect:"disconnectValo",preview:["Rank","RR","Matches"]},
    {id:"googlecalendar",name:"Google Calendar",accent:"#A78BFA",icon:"calendar-days",desc:"Upcoming meetings, deadlines and Brain planning context.",statePath:"connections.googlecalendar",fields:[["account","Google account","you@gmail.com"],["calendarId","Calendar ID optional","primary"]],placeholder:"OAuth is prepared for a Worker/Supabase callback. Until then ETHONE stores the account locally and shows the planned calendar surface.",preview:["Upcoming events","Focus blocks","Meeting prep"]},
    {id:"googledrive",name:"Google Drive",accent:"#C4B5FD",icon:"folder",desc:"Recent files, folders and workspace documents.",statePath:"connections.googledrive",fields:[["account","Google account","you@gmail.com"],["folder","Folder or Drive URL optional","https://drive.google.com/..."]],placeholder:"Drive API needs OAuth scopes. This panel is ready for the future backend callback and keeps local settings now.",preview:["Recent files","Pinned folders","Shared docs"]},
    {id:"obs",name:"OBS",accent:"#B794F4",icon:"radio-tower",desc:"Streaming scene status, recording state and quick controls.",statePath:"connections.obs",fields:[["host","OBS WebSocket URL","ws://localhost:4455"],["password","Password optional","••••••••","password"]],placeholder:"Browser pages cannot directly control OBS securely without the local WebSocket handshake. ETHONE stores the endpoint and will use it when the worker/local bridge is enabled.",preview:["Scene","Recording","Stream health"]},
    {id:"youtube",name:"YouTube",accent:"#FF3B30",icon:"play-circle",desc:"Channel uploads, subscriptions and creator analytics summary.",statePath:"connections.youtube",fields:[["channel","Channel URL or handle","@ethone"],["apiKey","API key optional","AIza...","password"]],placeholder:"YouTube Data API support is prepared. Add a channel now; API key/OAuth can be connected later.",preview:["Latest videos","Channel stats","Upload queue"]},
    {id:"battlenet",name:"Battle.net",accent:"#60A5FA",icon:"sparkles",desc:"Battle.net identity, games and session context.",statePath:"connections.battlenet",fields:[["battleTag","BattleTag","Name#1234"],["region","Region","eu"]],placeholder:"Battle.net OAuth requires a client configured server-side. ETHONE keeps the account locally and shows the future sync model.",preview:["BattleTag","Games","Session history"]}
  ];
  var pendingDisconnect={id:"",at:0};

  function p(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]})}
  function now(){return new Date().toISOString()}
  function labelDate(v){try{return v?new Date(v).toLocaleString([], {dateStyle:"medium",timeStyle:"short"}):"Never"}catch(e){return "Never"}}
  function getPath(obj,path){return String(path).split(".").reduce(function(o,k){return o&&o[k]},obj)}
  function setPath(obj,path,value){
    var parts=String(path).split("."),cur=obj;
    parts.slice(0,-1).forEach(function(k){if(!cur[k])cur[k]={};cur=cur[k]});
    cur[parts[parts.length-1]]=value;
  }
  function deletePath(obj,path){
    var parts=String(path).split("."),cur=obj;
    parts.slice(0,-1).forEach(function(k){cur=cur&&cur[k]});
    if(cur)delete cur[parts[parts.length-1]];
  }
  function state(def){
    var prof=p();if(!prof||!prof.state)return null;
    return getPath(prof.state,def.statePath)||null;
  }
  function conn(def){return state(def)||{}}
  function isConnected(def){
    var data=state(def);
    if(!data)return false;
    if(def.id==="twitch")return !!(Array.isArray(data.streamers)&&data.streamers.length);
    return Object.keys(data).length>0;
  }
  function ensureMeta(data){
    if(!data._ethone)data._ethone={};
    if(!Array.isArray(data._ethone.history))data._ethone.history=[];
    return data._ethone;
  }
  function historyPush(def,type,message){
    var prof=p();if(!prof||!prof.state)return;
    var data=conn(def);
    ensureMeta(data).history.unshift({type:type||"info",message:message||"Updated",at:now()});
    data._ethone.history=data._ethone.history.slice(0,5);
    setPath(prof.state,def.statePath,data);
    save();
  }
  function save(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function toast(msg,type){try{if(typeof window.toast==="function")window.toast(msg,type||"info")}catch(e){}}

  function readFields(def){
    var out={};
    def.fields.forEach(function(f){
      var el=document.getElementById("ih-"+def.id+"-"+f[0]);
      out[f[0]]=el?el.value.trim():"";
    });
    return out;
  }
  function writeLegacyInputs(def,values){
    var map={
      discord:{userId:"dc-userid"},
      spotify:{widgetUrl:"spotify-url"},
      github:{username:"github-conn-username",token:"gh-token-input"},
      steam:{steamId:"steam-id",apiKey:"steam-apikey"},
      twitch:{username:"twitch-username"},
      valorant:{riotId:"valo-name",region:"valo-region"}
    }[def.id]||{};
    Object.keys(map).forEach(function(k){
      var el=document.getElementById(map[k]);
      if(el&&values[k])el.value=values[k];
    });
  }
  function validate(def,values){
    var primary=def.fields[0]&&values[def.fields[0][0]];
    if(!primary)return "Renseigne au moins le champ principal.";
    if(def.id==="discord"&&!/^\d{17,20}$/.test(primary))return "Le Discord User ID doit contenir 17 a 20 chiffres.";
    if(def.id==="steam"&&!/^\d{17}$/.test(primary))return "Le SteamID64 doit contenir 17 chiffres.";
    if(def.id==="valorant"&&!String(primary).includes("#"))return "Format attendu: Name#TAG.";
    if(def.id==="obs"&&!/^wss?:\/\//i.test(primary))return "Utilise une URL WebSocket, par exemple ws://localhost:4455.";
    return "";
  }
  function localConnect(def,values,status){
    var prof=p();if(!prof||!prof.state)return;
    var data=Object.assign({},conn(def),values,{connectedAt:conn(def).connectedAt||now(),lastSync:now(),status:status||"ready"});
    ensureMeta(data).history.unshift({type:"success",message:"Configuration saved locally",at:now()});
    data._ethone.history=data._ethone.history.slice(0,5);
    setPath(prof.state,def.statePath,data);
    save();
    render();
  }

  async function connect(id){
    var def=defs.find(function(d){return d.id===id});if(!def)return;
    var values=readFields(def);
    var error=validate(def,values);
    if(error){setMessage(def,error,"error");toast(error,"error");return;}
    setLoading(def,true,"Connecting...");
    writeLegacyInputs(def,values);
    try{
      if(def.legacyConnect&&typeof window[def.legacyConnect]==="function"){
        await Promise.resolve(window[def.legacyConnect]());
        localConnect(def,Object.assign({},conn(def),values),"connected");
        historyPush(def,"success","Connected through existing ETHONE integration");
      }else{
        localConnect(def,values,def.placeholder?"api-pending":"connected");
      }
      toast(def.name+" connected","success");
    }catch(e){
      localConnect(def,values,"limited");
      setMessage(def,"Saved locally. API test failed: "+(e.message||e),"warning");
    }finally{
      setLoading(def,false);
      render();
    }
  }

  async function test(id){
    var def=defs.find(function(d){return d.id===id});if(!def)return;
    if(def.placeholder){
      setMessage(def,def.placeholder,"warning");
      toast(def.name+" live API is coming soon","info");
      return;
    }
    var data=conn(def),values=Object.assign({},data,readFields(def));
    var error=validate(def,values);
    if(error&&Object.keys(data).length===0){setMessage(def,error,"error");toast(error,"error");return;}
    setLoading(def,true,"Testing...");
    try{
      if(def.id==="github"&&values.username){
        var res=await fetch("https://api.github.com/users/"+encodeURIComponent(values.username),{signal:AbortSignal.timeout(8000)});
        if(!res.ok)throw new Error("GitHub returned "+res.status);
      }else if(def.id==="discord"&&values.userId){
        var dres=await fetch("https://api.lanyard.rest/v1/users/"+encodeURIComponent(values.userId),{signal:AbortSignal.timeout(8000)});
        var json=await dres.json();if(!json.success)throw new Error("Lanyard user not found");
      }else if(def.legacyRefresh&&typeof window[def.legacyRefresh]==="function"&&isConnected(def)){
        await Promise.resolve(window[def.legacyRefresh]());
      }
      localConnect(def,values,"verified");
      historyPush(def,"success","Connection test passed");
      setMessage(def,"Connection test passed.","success");
      toast(def.name+" test passed","success");
    }catch(e){
      localConnect(def,values,def.placeholder?"api-pending":"limited");
      historyPush(def,"warning","Test limited: "+(e.message||e));
      setMessage(def,def.placeholder||("Test failed: "+(e.message||e)),"warning");
    }finally{
      setLoading(def,false);
      render();
    }
  }

  async function refresh(id){
    var def=defs.find(function(d){return d.id===id});if(!def)return;
    if(def.placeholder){
      setMessage(def,def.placeholder,"warning");
      toast(def.name+" live sync is coming soon","info");
      return;
    }
    setLoading(def,true,"Refreshing...");
    try{
      if(def.legacyRefresh&&typeof window[def.legacyRefresh]==="function")await Promise.resolve(window[def.legacyRefresh]());
      var data=conn(def);data.lastSync=now();data.status=data.status||"connected";ensureMeta(data).history.unshift({type:"info",message:"Manual refresh",at:now()});data._ethone.history=data._ethone.history.slice(0,5);
      var prof=p();if(prof&&prof.state)setPath(prof.state,def.statePath,data);
      save();
      toast(def.name+" refreshed","success");
    }catch(e){setMessage(def,"Refresh failed: "+(e.message||e),"error");}
    finally{setLoading(def,false);render();}
  }

  async function disconnect(id){
    var def=defs.find(function(d){return d.id===id});if(!def)return;
    if(pendingDisconnect.id!==id||Date.now()-pendingDisconnect.at>5000){
      pendingDisconnect={id:id,at:Date.now()};
      toast("Click Disconnect again to disconnect "+def.name+".","warning");
      return;
    }
    pendingDisconnect={id:"",at:0};
    try{
      if(def.legacyDisconnect&&typeof window[def.legacyDisconnect]==="function"){
        var oldConfirm=window.confirm;
        window.confirm=function(){return true};
        try{await Promise.resolve(window[def.legacyDisconnect]())}finally{window.confirm=oldConfirm}
      }else{
        var prof=p();if(prof&&prof.state){deletePath(prof.state,def.statePath);save();}
      }
    }catch(e){
      var prof2=p();if(prof2&&prof2.state){deletePath(prof2.state,def.statePath);save();}
    }
    toast(def.name+" disconnected","info");
    render();
  }

  function setLoading(def,on,text){
    var card=document.getElementById("ih-card-"+def.id);
    if(card)card.classList.toggle("ih-loading",!!on);
    var msg=document.getElementById("ih-msg-"+def.id);
    if(msg&&text)msg.innerHTML='<span class="ih-spinner"></span>'+esc(text);
  }
  function setMessage(def,msg,type){
    var el=document.getElementById("ih-msg-"+def.id);
    if(el){el.className="ih-message "+(type||"info");el.textContent=msg||"";}
  }
  function statusLabel(def,data){
    if(!isConnected(def))return ["Not connected","disconnected"];
    if(data.status==="api-pending")return ["API pending","pending"];
    if(data.status==="limited")return ["Limited","pending"];
    if(data.status==="verified")return ["Verified","connected"];
    return ["Connected","connected"];
  }
  function valueOf(def,key){
    var data=conn(def);
    if(def.id==="valorant"&&key==="riotId"&&data.name)return data.name+"#"+data.tag;
    return data[key]||"";
  }
  function card(def){
    var data=conn(def),st=statusLabel(def,data),meta=data._ethone||{},history=Array.isArray(meta.history)?meta.history:[];
    var soon=!!def.placeholder;
    var soonAttrs=soon?' data-coming-soon="'+esc(def.name+' live API')+'" data-coming-soon-description="'+esc(def.placeholder)+'" data-coming-soon-note="false"':'';
    return '<article class="ih-card" id="ih-card-'+def.id+'" style="--ih-accent:'+def.accent+'"'+(soon?' data-feature-status="coming-soon" data-feature-name="'+esc(def.name)+' live API" data-coming-soon-description="'+esc(def.placeholder)+'"':'')+'>'+
      '<div class="ih-head"><div class="ih-logo"><i data-lucide="'+def.icon+'"></i></div><div><h3>'+esc(def.name)+'</h3><p>'+esc(def.desc)+'</p></div><span class="ih-status '+st[1]+'">'+st[0]+'</span></div>'+
      '<div class="ih-body">'+
        '<div class="ih-fields">'+def.fields.map(function(f){return '<label><span>'+esc(f[1])+'</span><input id="ih-'+def.id+'-'+f[0]+'" type="'+(f[3]||"text")+'" value="'+esc(valueOf(def,f[0]))+'" placeholder="'+esc(f[2]||"")+'"></label>'}).join("")+'</div>'+
        '<div class="ih-preview"><div class="ih-preview-title">Preview</div><div class="ih-preview-grid">'+def.preview.map(function(x){return '<div><strong>'+esc(previewValue(def,x,data))+'</strong><span>'+esc(x)+'</span></div>'}).join("")+'</div>'+(def.placeholder?'<p class="ih-placeholder">'+esc(def.placeholder)+'</p>':'')+'</div>'+
        '<div class="ih-actions"><button class="btn btn-primary" type="button" data-ih-action="connect" data-ih-id="'+def.id+'">'+(soon?"Save setup":(isConnected(def)?"Reconnect":"Connect"))+'</button>'+(soon?'<button class="btn btn-ghost" type="button"'+soonAttrs+'>Test</button><button class="btn btn-ghost" type="button"'+soonAttrs+'>Refresh</button>':'<button class="btn btn-ghost" type="button" data-ih-action="test" data-ih-id="'+def.id+'">Test</button><button class="btn btn-ghost" type="button" data-ih-action="refresh" data-ih-id="'+def.id+'">Refresh</button>')+'<button class="btn btn-ghost" type="button" data-ih-action="disconnect" data-ih-id="'+def.id+'" '+(!isConnected(def)?"disabled":"")+'>Disconnect</button></div>'+
        '<div class="ih-message" id="ih-msg-'+def.id+'"></div>'+
        '<div class="ih-sync"><div><span>Last sync</span><strong>'+labelDate(data.lastSync)+'</strong></div><div><span>Saved</span><strong>'+(isConnected(def)?"Local profile":"Waiting")+'</strong></div></div>'+
        '<div class="ih-history">'+(history.length?history.map(function(h){return '<div><i class="'+esc(h.type||"info")+'"></i><span>'+esc(h.message)+'</span><time>'+labelDate(h.at)+'</time></div>'}).join(""):'<div><i></i><span>No sync history yet</span><time>-</time></div>')+'</div>'+
      '</div>'+
    '</article>';
  }
  function previewValue(def,label,data){
    if(!isConnected(def))return "-";
    if(def.id==="discord"&&label==="Presence")return data.data&&data.data.discord_status||"Saved";
    if(def.id==="github"&&label==="Profile")return data.username?"@"+data.username:"Saved";
    if(def.id==="steam"&&label==="Current game")return data.data&&data.data.stateMessage?data.data.stateMessage.replace("Currently In-Game ",""):"-";
    if(def.id==="twitch"&&label==="Live status")return (data.streamers||[]).length+" tracked";
    if(def.id==="valorant"&&label==="Rank")return data._lastRank&&data._lastRank.rankName||"Connected";
    return data.status==="api-pending"?"Ready":data.status||"Saved";
  }

  function render(){
    var page=document.getElementById("page-connections");if(!page)return;
    var host=document.getElementById("ethone-integration-hub");
    if(!host){
      host=document.createElement("section");
      host.id="ethone-integration-hub";
      host.className="ih-shell";
      var top=page.querySelector(".topbar");
      if(top&&top.nextSibling)top.parentNode.insertBefore(host,top.nextSibling);
      else page.appendChild(host);
    }
    host.innerHTML='<div class="ih-hero"><div><div class="section-eyebrow">Integration Hub</div><h2>Connected services</h2><p>Every external service has a complete connection surface. Live APIs marked Coming Soon keep local settings safely until their worker/OAuth bridge is ready.</p></div><button class="btn btn-ghost" type="button" data-ih-action="refresh-all">Refresh all ready APIs</button></div><div class="ih-grid">'+defs.map(card).join("")+'</div>';
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }

  function renderSettings(){
    var wrap=document.getElementById("plugins-list");if(!wrap)return;
    var prof=p();if(!prof)return;
    wrap.innerHTML=defs.map(function(def){
      var st=statusLabel(def,conn(def));
      return '<div class="toggle-row ih-plugin-row"><div class="ih-plugin-main"><span class="ih-mini-logo" style="--ih-accent:'+def.accent+'"><i data-lucide="'+def.icon+'"></i></span><div><strong>'+esc(def.name)+(def.placeholder?' <span class="ethone-coming-soon-badge">Coming Soon</span>':'')+'</strong><small>'+esc(def.desc)+'</small></div></div><div class="ih-plugin-actions"><span class="ih-status '+st[1]+'">'+st[0]+'</span><button class="btn btn-ghost" type="button" data-ih-action="configure" data-ih-id="'+def.id+'">Configure</button></div></div>';
    }).join("");
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }

  function boot(){
    render();
    var old=window.renderPluginsSettings;
    if(typeof old==="function"&&!old.__ihWrapped){
      var wrapped=function(){renderSettings()};
      wrapped.__ihWrapped=true;
      window.renderPluginsSettings=wrapped;
    }
    renderSettings();
  }

  document.addEventListener("click",function(e){
    var btn=e.target.closest("[data-ih-action]");if(!btn)return;
    var action=btn.dataset.ihAction,id=btn.dataset.ihId;
    if(action==="connect")connect(id);
    else if(action==="test")test(id);
    else if(action==="refresh")refresh(id);
    else if(action==="disconnect")disconnect(id);
    else if(action==="refresh-all")defs.forEach(function(d){if(isConnected(d)&&!d.placeholder)refresh(d.id)});
    else if(action==="configure"){
      if(typeof window.switchPage==="function")window.switchPage("connections",null);
      setTimeout(function(){
        var card=document.getElementById("ih-card-"+id);
        if(card)card.scrollIntoView({block:"center",behavior:"smooth"});
      },80);
    }
  });

  window.addEventListener("ethone:page-ready",function(event){
    if(!event.detail||["connections","settings","developer"].indexOf(event.detail.page)>-1)boot();
  });
  window.ethoneIntegrationHub={render:render,renderSettings:renderSettings,defs:defs,connect:connect,test:test,refresh:refresh,disconnect:disconnect};
})();
