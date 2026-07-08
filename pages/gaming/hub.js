/* ETHONE Gaming Hub.
 * Premium control center for gaming services while preserving legacy stats logic.
 */
(function(){
  "use strict";
  if(window.__ethoneGamingHub)return;
  window.__ethoneGamingHub=true;

  var legacyLoadGamingUI=typeof window.loadGamingUI==="function"?window.loadGamingUI:null;
  var sessionTimer=0;
  var SERVICES=[
    {id:"valorant",name:"Valorant",accent:"#ff4655",short:"VA",kind:"riot"},
    {id:"steam",name:"Steam",accent:"#66c0f4",short:"ST",kind:"connection"},
    {id:"epic",name:"Epic Games",accent:"#f5f5f5",short:"EP",kind:"local"},
    {id:"battlenet",name:"Battle.net",accent:"#00aeff",short:"BN",kind:"local"},
    {id:"minecraft",name:"Minecraft",accent:"#62b957",short:"MC",kind:"local"},
    {id:"discord",name:"Discord",accent:"#5865f2",short:"DC",kind:"connection"},
    {id:"spotify",name:"Spotify",accent:"#1db954",short:"SP",kind:"connection"}
  ];

  function $(sel,root){return (root||document).querySelector(sel)}
  function esc(value){
    if(typeof window.escapeHTML==="function")return window.escapeHTML(value);
    return String(value==null?"":value).replace(/[&<>"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]});
  }
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function save(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function notify(message,type){if(typeof window.toast==="function")window.toast(message,type||"info")}
  function state(){
    var p=profile();
    if(!p)return null;
    p.state=p.state||{};
    p.state.gaming=p.state.gaming||{};
    p.state.connections=p.state.connections||{};
    p.state.gamingHub=p.state.gamingHub||{};
    var hub=p.state.gamingHub;
    hub.favorites=Array.isArray(hub.favorites)?hub.favorites:[];
    hub.sessions=Array.isArray(hub.sessions)?hub.sessions:[];
    hub.screenshots=Array.isArray(hub.screenshots)?hub.screenshots:[];
    hub.services=hub.services&&typeof hub.services==="object"?hub.services:{};
    return {profile:p,app:p.state,hub:hub};
  }
  function isConnected(id,ctx){
    ctx=ctx||state();
    if(!ctx)return false;
    if(id==="valorant")return !!ctx.app.gaming.valo || (Array.isArray(ctx.app.valorantAccounts)&&ctx.app.valorantAccounts.length>0);
    if(id==="steam")return !!ctx.app.connections.steam;
    if(id==="discord")return !!ctx.app.connections.discord;
    if(id==="spotify")return !!(ctx.app.connections.spotify || ctx.app.connections.lastfm || ctx.app.connections.discord?.data?.spotify);
    return !!ctx.hub.services[id]?.connected;
  }
  function serviceSub(id,ctx){
    ctx=ctx||state();
    if(!ctx)return "Ready";
    if(id==="valorant"){
      var valo=ctx.app.gaming.valo;
      if(valo)return (valo.name||"Valorant")+"#"+(valo.tag||"")+" · "+String(valo.region||"EU").toUpperCase();
      var count=Array.isArray(ctx.app.valorantAccounts)?ctx.app.valorantAccounts.length:0;
      return count?count+" saved accounts":"Rank, matches and accounts";
    }
    if(id==="steam"){
      var steam=ctx.app.connections.steam?.data;
      return steam?.displayName || "Profile, playtime and recent games";
    }
    if(id==="discord"){
      var dc=ctx.app.connections.discord?.data;
      return dc?.discord_user?.global_name || dc?.discord_user?.username || "Presence and voice activity";
    }
    if(id==="spotify"){
      var sp=ctx.app.connections.discord?.data?.spotify;
      return sp?.song ? sp.song+" · "+sp.artist : "Now playing and music context";
    }
    return ctx.hub.services[id]?.handle || "Local gaming profile";
  }
  function totalPlaytime(ctx){
    ctx=ctx||state();
    if(!ctx)return 0;
    var minutes=0;
    ctx.hub.sessions.forEach(function(s){
      if(s.startedAt){
        var end=s.endedAt?new Date(s.endedAt).getTime():Date.now();
        var start=new Date(s.startedAt).getTime();
        if(isFinite(start)&&isFinite(end)&&end>start)minutes+=(end-start)/60000;
      }
    });
    var games=ctx.app.connections.steam?.data?.recentGames||[];
    games.forEach(function(g){
      var recent=parseFloat(g.hoursRecent||0);
      if(isFinite(recent))minutes+=recent*60;
    });
    return Math.round(minutes);
  }
  function fmtMinutes(minutes){
    minutes=Math.max(0,Math.round(minutes||0));
    var h=Math.floor(minutes/60),m=minutes%60;
    if(h&&m)return h+"h "+m+"m";
    if(h)return h+"h";
    return m+"m";
  }
  function activeSession(ctx){
    ctx=ctx||state();
    return ctx&&ctx.hub.sessions.find(function(s){return s.startedAt&&!s.endedAt})||null;
  }
  function progressRows(ctx){
    var steamGames=ctx.app.connections.steam?.data?.recentGames||[];
    var rows=steamGames.slice(0,4).map(function(g){
      return {name:g.name||"Steam game",value:Math.min(100,Math.max(8,parseFloat(g.hoursRecent||g.hours||0)*8||18)),label:(g.hoursRecent||g.hours||"0")+"h"};
    });
    if(ctx.app.gaming.valo)rows.unshift({name:"Valorant",value:72,label:"ranked"});
    if(ctx.hub.services.minecraft?.connected)rows.push({name:"Minecraft",value:48,label:"local"});
    if(!rows.length){
      rows=[
        {name:"Session setup",value:68,label:"ready"},
        {name:"Voice stack",value:isConnected("discord",ctx)?82:28,label:isConnected("discord",ctx)?"on":"off"},
        {name:"Music stack",value:isConnected("spotify",ctx)?78:34,label:isConnected("spotify",ctx)?"on":"off"}
      ];
    }
    return rows.slice(0,5);
  }
  function renderGamingHub(){
    var page=$("#page-gaming");
    var ctx=state();
    if(!page||!ctx)return;
    var connected=SERVICES.filter(function(s){return isConnected(s.id,ctx)}).length;
    var favoriteCount=ctx.hub.favorites.length;
    var session=activeSession(ctx);
    page.innerHTML=
      '<div class="gaming-hub">'+
        heroHTML(ctx,connected,favoriteCount,session)+
        '<div class="gh-metrics">'+
          metricHTML("Connected",connected+"/"+SERVICES.length)+
          metricHTML("Playtime",fmtMinutes(totalPlaytime(ctx)))+
          metricHTML("Favorites",String(favoriteCount))+
          metricHTML("Screenshots",String(ctx.hub.screenshots.length))+
        '</div>'+
        '<div class="gh-grid">'+
          '<div class="gh-stack">'+
            servicesHTML(ctx)+
            accountsHTML(ctx)+
          '</div>'+
          '<div class="gh-stack">'+
            progressionHTML(ctx)+
            sessionsHTML(ctx)+
            screenshotsHTML(ctx)+
          '</div>'+
        '</div>'+
      '</div>';
    hydrateLegacyGaming(ctx);
    startSessionTicker();
    try{window.lucide&&window.lucide.createIcons&&window.lucide.createIcons()}catch(e){}
  }
  function heroHTML(ctx,connected,favoriteCount,session){
    var label=session?("Live · "+serviceName(session.service)):"Ready";
    return '<section class="gh-hero">'+
      '<div>'+
        '<div class="gh-eyebrow">ETHONE Gaming Hub</div>'+
        '<div class="gh-title">Your gaming control center.</div>'+
        '<div class="gh-subtitle">Valorant, Steam, Epic, Battle.net, Minecraft, Discord, Spotify, screenshots, playtime and sessions are grouped into one calm operating space.</div>'+
        '<div class="gh-hero-actions">'+
          '<button class="btn btn-primary" type="button" onclick="ghStartSession()">Start session</button>'+
          '<button class="btn btn-ghost" type="button" onclick="ghOpenConnections()">Open connections</button>'+
          '<button class="btn btn-ghost" type="button" onclick="ghRefresh()">Refresh hub</button>'+
        '</div>'+
      '</div>'+
      '<aside class="gh-live-panel">'+
        '<div class="gh-live-top"><div style="display:flex;align-items:center;gap:10px"><span class="gh-pulse"></span><div><div class="gh-live-title">'+esc(label)+'</div><div class="gh-live-sub">'+esc(session?sessionDuration(session):connected+" services connected · "+favoriteCount+" favorites")+'</div></div></div><span class="gh-status connected">OS</span></div>'+
        '<div class="gh-session-meter">'+[44,72,58,86,48,64,94,68,52,76,60,88].map(function(h){return '<span style="height:'+h+'%"></span>'}).join("")+'</div>'+
      '</aside>'+
    '</section>';
  }
  function metricHTML(label,value){
    return '<div class="gh-metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';
  }
  function servicesHTML(ctx){
    return '<section class="gh-card"><div class="gh-section-head"><div><h2>Gaming stack</h2><p>Connect services, pin favorites and start sessions from one place.</p></div></div>'+
      '<div class="gh-service-grid">'+SERVICES.map(function(service){return serviceHTML(service,ctx)}).join("")+'</div></section>';
  }
  function serviceHTML(service,ctx){
    var connected=isConnected(service.id,ctx);
    var fav=ctx.hub.favorites.indexOf(service.id)>-1;
    var local=service.kind==="local";
    return '<article class="gh-service" style="--gh-accent:'+esc(service.accent)+'">'+
      '<div class="gh-service-main">'+
        '<div class="gh-service-icon">'+esc(service.short)+'</div>'+
        '<div style="min-width:0;flex:1"><h3>'+esc(service.name)+'</h3><p>'+esc(serviceSub(service.id,ctx))+'</p></div>'+
        '<span class="gh-status '+(connected?'connected':'')+'">'+(connected?'connected':'ready')+'</span>'+
      '</div>'+
      '<div class="gh-service-actions">'+
        '<button class="gh-mini-btn '+(fav?'active':'')+'" type="button" onclick="ghToggleFavorite(\''+service.id+'\')">'+(fav?'Pinned':'Pin')+'</button>'+
        '<button class="gh-mini-btn" type="button" onclick="ghStartSession(\''+service.id+'\')">Session</button>'+
        (local
          ? '<button class="gh-mini-btn" type="button" onclick="'+(connected?'ghDisconnectLocal':'ghConnectLocal')+'(\''+service.id+'\')">'+(connected?'Disconnect':'Connect')+'</button>'
          : '<button class="gh-mini-btn" type="button" onclick="ghOpenService(\''+service.id+'\')">'+(connected?'Manage':'Connect')+'</button>')+
      '</div>'+
    '</article>';
  }
  function accountsHTML(ctx){
    var valo=ctx.app.gaming.valo||{};
    var lol=ctx.app.gaming.lol||{};
    var ow=ctx.app.gaming.ow||{};
    return '<section class="gh-card"><div class="gh-section-head"><div><h2>Competitive accounts</h2><p>Existing Valorant, League and Overwatch logic stays wired here.</p></div></div>'+
      '<div class="gh-account-grid">'+
        '<article class="gh-account-card">'+gameHeader("VA","Valorant","valo-account-sub","valo-badge",!!ctx.app.gaming.valo)+
          '<div id="valo-stats-area"><div class="game-not-connected">Connect Riot ID to load rank, matches and progression.</div></div>'+
          '<div class="game-input-row" style="margin-top:12px">'+
            '<input class="modal-input" id="valo-name" placeholder="Name#TAG  (ex: Rub19#Boss)" type="text" value="'+esc(valo.name&&valo.tag?valo.name+"#"+valo.tag:"")+'"/>'+
            '<button class="btn btn-primary" onclick="connectValo()">Connect</button>'+
            '<button class="btn btn-ghost" id="valo-disconnect" onclick="disconnectValo()" style="'+(ctx.app.gaming.valo?'':'display:none')+'">Disconnect</button>'+
          '</div>'+regionHTML("valo",valo.region||"eu",["eu","na","ap","kr","br","latam"])+
          '<div class="game-input-row" style="margin-top:8px">'+
            '<input class="modal-input" id="valo-apikey" placeholder="Henrik Dev API Key (optional)" type="text" value="'+esc(valo.apiKey||"")+'"/>'+
            '<input class="modal-input" id="tracker-apikey" placeholder="Tracker.gg API Key (optional)" type="password" value="'+esc(valo.trackerApiKey||"")+'"/>'+
          '</div>'+
        '</article>'+
        '<article class="gh-account-card">'+gameHeader("LOL","League of Legends","lol-account-sub","lol-badge",!!ctx.app.gaming.lol)+
          '<div id="lol-stats-area"><div class="game-not-connected">Connect Riot API to load ranked data.</div></div>'+
          '<div class="game-input-row" style="margin-top:12px">'+
            '<input class="modal-input" id="lol-name" placeholder="Summoner Name#TAG" type="text" value="'+esc(lol.name||"")+'"/>'+
            '<button class="btn btn-primary" onclick="connectLoL()">Connect</button>'+
            '<button class="btn btn-ghost" id="lol-disconnect" onclick="disconnectLoL()" style="'+(ctx.app.gaming.lol?'':'display:none')+'">Disconnect</button>'+
          '</div>'+regionHTML("lol",lol.region||"euw1",["euw1","eun1","na1","kr","br1","la1","tr1","ru","oc1"])+
          '<div class="game-input-row" style="margin-top:8px"><input class="modal-input" id="lol-apikey" placeholder="Riot API Key" type="text" value="'+esc(lol.apiKey||"")+'"/></div>'+
        '</article>'+
        '<article class="gh-account-card">'+gameHeader("OW","Overwatch 2","ow-account-sub","ow-badge",!!ctx.app.gaming.ow)+
          '<div id="ow-stats-area"><div class="game-not-connected">Optional local Overwatch profile.</div></div>'+
          '<div class="game-input-row" style="margin-top:12px">'+
            '<input class="modal-input" id="ow-username" placeholder="BattleTag (e.g. Rub19-1234)" type="text" value="'+esc(ow.username||"")+'"/>'+
            '<select class="game-region-select" id="ow-platform"><option value="pc">PC</option><option value="psn">PSN</option><option value="xbl">Xbox</option></select>'+
            '<button class="btn btn-primary" onclick="connectOW()">Connect</button>'+
            '<button class="btn btn-ghost" id="ow-disconnect" onclick="disconnectOW()" style="'+(ctx.app.gaming.ow?'':'display:none')+'">Disconnect</button>'+
          '</div>'+
        '</article>'+
        compareHTML()+
      '</div></section>';
  }
  function gameHeader(short,title,subId,badgeId,connected){
    return '<div class="game-card-header"><div class="game-card-logo">'+esc(short)+'</div><div><div class="game-card-title">'+esc(title)+'</div><div class="game-card-sub" id="'+subId+'">'+(connected?'Connected':'Not connected')+'</div></div><span class="conn-status-badge '+(connected?'connected':'disconnected')+'" id="'+badgeId+'" style="margin-left:auto">'+(connected?'Connected':'Not connected')+'</span></div>';
  }
  function regionHTML(kind,current,values){
    return '<div style="margin-top:10px"><div style="font-size:9.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted2);font-family:var(--mono);margin-bottom:7px">Region</div>'+
      '<div class="region-pills" id="'+kind+'-region-pills">'+values.map(function(v){return '<div class="region-pill '+(v===current?'active':'')+'" data-val="'+v+'" onclick="setRegionPill(\''+kind+'\',this)">'+v.toUpperCase()+'</div>'}).join("")+'</div>'+
      '<input id="'+kind+'-region" type="hidden" value="'+esc(current)+'"/></div>';
  }
  function compareHTML(){
    return '<article class="gh-account-card gh-legacy-compare">'+
      '<div class="game-card-header"><div class="game-card-logo">VS</div><div><div class="game-card-title">Compare with friends</div><div class="game-card-sub">Valorant and Steam side by side</div></div></div>'+
      '<div class="game-input-row">'+
        '<input class="modal-input" id="compare-valo-input" placeholder="Friend Valorant Name#TAG" type="text"/>'+
        '<input id="compare-valo-region" type="hidden" value="eu"/>'+
        '<input class="modal-input" id="compare-steam-input" placeholder="Friend Steam ID64 (optional)" type="text"/>'+
        '<button class="btn btn-primary" onclick="addFriendToCompare()">Add friend</button>'+
      '</div>'+
      '<div class="region-pills" style="margin-top:8px">'+["eu","na","ap","kr"].map(function(v,i){return '<div class="region-pill '+(i===0?'active':'')+'" data-val="'+v+'" onclick="setCompareRegion(this)">'+v.toUpperCase()+'</div>'}).join("")+'</div>'+
      '<div id="compare-dashboard-users" style="margin-top:12px"></div><div id="compare-results" style="margin-top:12px"></div>'+
    '</article>';
  }
  function progressionHTML(ctx){
    return '<section class="gh-panel"><div class="gh-section-head"><div><h2>Progression</h2><p>Playtime, favorites and connected signals.</p></div></div><div class="gh-progress-list">'+
      progressRows(ctx).map(function(row){return '<div class="gh-progress-item"><span>'+esc(row.name)+'</span><div class="gh-bar"><i style="width:'+Math.round(row.value)+'%"></i></div><b>'+esc(row.label)+'</b></div>'}).join("")+
    '</div></section>';
  }
  function sessionsHTML(ctx){
    var session=activeSession(ctx);
    var rows=ctx.hub.sessions.slice().sort(function(a,b){return new Date(b.startedAt)-new Date(a.startedAt)}).slice(0,6);
    return '<section class="gh-panel"><div class="gh-section-head"><div><h2>Game sessions</h2><p>Track local sessions without waiting for APIs.</p></div><button class="gh-mini-btn '+(session?'active':'')+'" type="button" onclick="'+(session?'ghEndSession()':'ghStartSession()')+'">'+(session?'End':'Start')+'</button></div>'+
      '<div class="gh-sessions">'+(rows.length?rows.map(function(s){return '<div class="gh-session-row"><div class="gh-service-icon" style="width:34px;height:34px;border-radius:12px">'+esc((serviceName(s.service)||"G").slice(0,2).toUpperCase())+'</div><div style="min-width:0;flex:1"><strong>'+esc(serviceName(s.service))+'</strong><span>'+esc(sessionDuration(s))+'</span></div></div>'}).join(""):'<div class="gh-session-row"><div><strong>No session yet</strong><span>Start one from a service card.</span></div></div>')+'</div></section>';
  }
  function screenshotsHTML(ctx){
    return '<section class="gh-panel"><div class="gh-section-head"><div><h2>Screenshots</h2><p>Local screenshot library metadata.</p></div><button class="gh-mini-btn" type="button" onclick="document.getElementById(\'gh-screenshot-input\').click()">Add</button><input id="gh-screenshot-input" type="file" accept="image/*" multiple hidden onchange="ghAddScreenshot(this)"/></div>'+
      '<div class="gh-screenshots">'+(ctx.hub.screenshots.length?ctx.hub.screenshots.slice(0,6).map(function(s){return '<div class="gh-shot-row"><div class="gh-shot-thumb"></div><div style="min-width:0;flex:1"><strong>'+esc(s.name)+'</strong><span>'+esc(new Date(s.addedAt).toLocaleString())+'</span></div><button class="gh-mini-btn" type="button" onclick="ghRemoveScreenshot(\''+esc(s.id)+'\')">Remove</button></div>'}).join(""):'<div class="gh-shot-row"><div class="gh-shot-thumb"></div><div><strong>No screenshots yet</strong><span>Add captures to keep them with your gaming context.</span></div></div>')+'</div></section>';
  }
  function hydrateLegacyGaming(ctx){
    try{
      if(ctx.app.gaming.valo&&typeof window.loadValoStats==="function")window.loadValoStats();
      if(ctx.app.gaming.lol&&typeof window.loadLoLStats==="function")window.loadLoLStats();
      if(ctx.app.gaming.ow){
        $("#ow-platform")&&( $("#ow-platform").value=ctx.app.gaming.ow.platform||"pc" );
        if(ctx.app.gaming.ow._data&&typeof window.renderOWStats==="function")window.renderOWStats(ctx.app.gaming.ow._data,ctx.app.gaming.ow.username,"comp");
      }
      if(typeof window.loadCompareDashboardUsers==="function")window.loadCompareDashboardUsers();
    }catch(e){console.warn("[ETHONE Gaming Hub] legacy hydrate failed",e)}
  }
  function serviceName(id){
    return (SERVICES.find(function(s){return s.id===id})||{}).name||id||"Gaming";
  }
  function sessionDuration(s){
    if(!s||!s.startedAt)return "0m";
    var start=new Date(s.startedAt).getTime();
    var end=s.endedAt?new Date(s.endedAt).getTime():Date.now();
    return fmtMinutes((end-start)/60000)+(s.endedAt?"":" · active");
  }
  function startSessionTicker(){
    clearInterval(sessionTimer);
    if(!$("#page-gaming")?.classList.contains("active"))return;
    if(!activeSession())return;
    sessionTimer=setInterval(function(){
      if(!$("#page-gaming")?.classList.contains("active")){clearInterval(sessionTimer);return;}
      var sub=$(".gh-live-sub");
      var live=activeSession();
      if(sub&&live)sub.textContent=sessionDuration(live);
    },30000);
  }
  function openConnections(){
    var Actions=window.Ethone&&window.Ethone.get&&window.Ethone.get("actions");
    if(Actions&&Actions.dispatch)Actions.dispatch("connections.open",{source:"gaming-hub"});
    else if(typeof window.switchPage==="function")window.switchPage("connections",null);
  }

  window.renderGamingHub=renderGamingHub;
  window.loadGamingUI=function(){renderGamingHub()};
  window.ghRefresh=function(){renderGamingHub();notify("Gaming Hub refreshed","success")};
  window.ghOpenConnections=openConnections;
  window.ghOpenService=function(id){
    var Actions=window.Ethone&&window.Ethone.get&&window.Ethone.get("actions");
    if(id==="valorant"){
      if(Actions&&Actions.dispatch)Actions.dispatch("navigation.open",{page:"valorant-accounts",source:"gaming-hub"});
      else if(typeof window.switchPage==="function")window.switchPage("valorant-accounts",null);
      return;
    }
    openConnections();
  };
  window.ghToggleFavorite=function(id){
    var ctx=state();if(!ctx)return;
    var idx=ctx.hub.favorites.indexOf(id);
    if(idx>-1)ctx.hub.favorites.splice(idx,1);else ctx.hub.favorites.push(id);
    save();renderGamingHub();
  };
  window.ghConnectLocal=function(id){
    var ctx=state();if(!ctx)return;
    var label=serviceName(id);
    var handle=prompt(label+" handle or username:", ctx.hub.services[id]?.handle||"");
    if(handle===null)return;
    ctx.hub.services[id]={connected:true,handle:handle||label,connectedAt:new Date().toISOString()};
    save();renderGamingHub();notify(label+" connected locally","success");
  };
  window.ghDisconnectLocal=function(id){
    var ctx=state();if(!ctx)return;
    if(!confirm("Disconnect "+serviceName(id)+"?"))return;
    delete ctx.hub.services[id];
    save();renderGamingHub();notify(serviceName(id)+" disconnected","info");
  };
  window.ghStartSession=function(id){
    var ctx=state();if(!ctx)return;
    var active=activeSession(ctx);
    if(active){notify("A session is already running","warning");return;}
    var service=id||ctx.hub.favorites[0]||"valorant";
    ctx.hub.sessions.push({id:"ghs-"+Date.now().toString(36),service:service,startedAt:new Date().toISOString()});
    save();renderGamingHub();notify("Session started","success");
  };
  window.ghEndSession=function(){
    var ctx=state(),active=activeSession(ctx);if(!ctx||!active)return;
    active.endedAt=new Date().toISOString();
    save();renderGamingHub();notify("Session saved","success");
  };
  window.ghAddScreenshot=function(input){
    var ctx=state();if(!ctx||!input.files)return;
    Array.prototype.slice.call(input.files).forEach(function(file){
      ctx.hub.screenshots.unshift({id:"ghshot-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,5),name:file.name,size:file.size,addedAt:new Date().toISOString()});
    });
    input.value="";
    save();renderGamingHub();notify("Screenshot added","success");
  };
  window.ghRemoveScreenshot=function(id){
    var ctx=state();if(!ctx)return;
    ctx.hub.screenshots=ctx.hub.screenshots.filter(function(s){return s.id!==id});
    save();renderGamingHub();
  };

  window.addEventListener("ethone:page-ready",function(event){
    if(event.detail&&event.detail.page==="gaming")setTimeout(renderGamingHub,0);
  });
  if(document.readyState!=="loading"&&$("#page-gaming")?.classList.contains("active"))setTimeout(renderGamingHub,0);
})();
