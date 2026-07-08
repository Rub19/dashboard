/* ETHONE Dashboard widget catalog: Clock, Countdown, Weather, Goals, Calendar, Notes,
 * Productivity, Charts, Discord, Spotify, LastFM, GitHub — registered into the
 * generic Ethone.get("widgets") registry for use by pages/dashboard-v4.js. */
(function(){
  "use strict";
  if(window.__ethoneWidgetCatalog)return;
  window.__ethoneWidgetCatalog=true;
  var App=window.Ethone;
  var Widgets=App&&App.get("widgets");
  if(!Widgets)return;
  window.__ethoneWidgetCatalogTypes=window.__ethoneWidgetCatalogTypes||[];

  function registerType(name,def){
    if(Widgets.register(name,def))window.__ethoneWidgetCatalogTypes.push(name);
  }
  function lang(){
    try{var L=App.get("language");return L?L.current():"en"}catch(e){return "en"}
  }
  var DICT={
    fr:{clock:"Horloge",calendar:"Calendrier",discord:"Discord",spotify:"Spotify",lastfm:"LastFM",notes:"Notes",goals:"Objectifs",weather:"Meteo",charts:"Graphiques",productivity:"Productivite",countdown:"Compte a rebours",github:"GitHub",terminal:"Terminal",noNotes:"Aucune note",noData:"Aucune donnee"},
    en:{clock:"Clock",calendar:"Calendar",discord:"Discord",spotify:"Spotify",lastfm:"LastFM",notes:"Notes",goals:"Goals",weather:"Weather",charts:"Charts",productivity:"Productivity",countdown:"Countdown",github:"GitHub",terminal:"Terminal",noNotes:"No notes",noData:"No data"},
    es:{clock:"Reloj",calendar:"Calendario",discord:"Discord",spotify:"Spotify",lastfm:"LastFM",notes:"Notas",goals:"Objetivos",weather:"Clima",charts:"Graficos",productivity:"Productividad",countdown:"Cuenta atras",github:"GitHub",terminal:"Terminal",noNotes:"Sin notas",noData:"Sin datos"},
    de:{clock:"Uhr",calendar:"Kalender",discord:"Discord",spotify:"Spotify",lastfm:"LastFM",notes:"Notizen",goals:"Ziele",weather:"Wetter",charts:"Diagramme",productivity:"Produktivitat",countdown:"Countdown",github:"GitHub",terminal:"Terminal",noNotes:"Keine Notizen",noData:"Keine Daten"}
  };
  function words(){return DICT[lang()]||DICT.en}
  function esc(v){
    try{return window.EthoneCore&&window.EthoneCore.dom?window.EthoneCore.dom.escapeHTML(v):String(v==null?"":v)}
    catch(e){return String(v==null?"":v)}
  }
  function curP(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function state(){var p=curP();return p&&p.state?p.state:{}}

  var _timers=new WeakMap();
  var _cleanups=new WeakMap();
  function trackInterval(container,id){clearTrackedInterval(container);_timers.set(container,id)}
  function clearTrackedInterval(container){var id=_timers.get(container);if(id)clearInterval(id);_timers.delete(container)}
  function addCleanup(container,fn){
    var list=_cleanups.get(container)||[];
    list.push(fn);
    _cleanups.set(container,list);
  }
  function clearCleanups(container){
    var list=_cleanups.get(container)||[];
    list.forEach(function(fn){try{fn()}catch(e){}});
    _cleanups.delete(container);
  }
  function clearLive(container){clearTrackedInterval(container);clearCleanups(container);container.__ethoneLiveKey=""}
  function setLiveHTML(container,html,key){
    key=key||html;
    if(container.__ethoneLiveKey!==key){
      container.innerHTML=html;
      container.__ethoneLiveKey=key;
    }
  }
  function refreshLoop(container,render,ms){
    function tick(){
      if(!container.isConnected)return;
      try{render()}catch(e){setLiveHTML(container,emptyPremium("Widget",label("Donnee indisponible","Data unavailable","Dato no disponible","Daten nicht verfugbar")),"error")}
    }
    tick();
    trackInterval(container,setInterval(function(){
      if(typeof document!=="undefined"&&document.hidden)return;
      tick();
    },ms));
  }
  function safeJSON(area,key){
    try{
      var store=area==="session"?window.sessionStorage:window.localStorage;
      return JSON.parse(store.getItem(key)||"{}")||{};
    }catch(e){return {}}
  }
  function liveDot(status){
    return '<i class="d4-live-dot '+esc(status||"ready")+'" aria-hidden="true"></i>';
  }
  function liveShell(title,status,body,meta){
    return '<div class="d4-live-widget">'+
      '<div class="d4-live-head"><strong>'+esc(title)+'</strong><span>'+liveDot(status)+esc(meta||status||label("Live","Live","Live","Live"))+'</span></div>'+
      body+
    '</div>';
  }
  function liveBars(values){
    values=(values||[]).slice(-18);
    if(!values.length)values=[18,34,28,44,38,52,46,58];
    return '<div class="d4-live-bars" aria-hidden="true">'+values.map(function(v,i){
      var h=Math.max(8,Math.min(100,Math.round(v||0)));
      return '<i style="height:'+h+'%;animation-delay:'+((i%6)*.08).toFixed(2)+'s"></i>';
    }).join("")+'</div>';
  }
  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function fmtMs(ms){
    ms=Math.max(0,ms||0);
    var sec=Math.floor(ms/1000),m=Math.floor(sec/60),s=String(sec%60).padStart(2,"0");
    return m+":"+s;
  }
  function timeAgo(ts){
    if(!ts)return label("jamais","never","nunca","nie");
    var d=Date.now()-new Date(ts).getTime();
    if(!isFinite(d)||d<0)return label("maintenant","now","ahora","jetzt");
    if(d<60000)return label("a l'instant","just now","ahora","gerade");
    if(d<3600000)return Math.floor(d/60000)+" min";
    if(d<86400000)return Math.floor(d/3600000)+" h";
    return Math.floor(d/86400000)+" d";
  }
  function relativeTime(ts){
    if(!ts)return "";
    var target=new Date(ts).getTime();
    if(!isFinite(target))return "";
    var diff=target-Date.now(),future=diff>=0,abs=Math.abs(diff);
    var value=abs<3600000?Math.max(1,Math.round(abs/60000))+" min":abs<86400000?Math.round(abs/3600000)+" h":Math.round(abs/86400000)+" d";
    return future?label("dans ","in ","en ","in ")+value:timeAgo(ts);
  }
  function mediaMetadata(){
    try{
      var m=navigator.mediaSession&&navigator.mediaSession.metadata;
      return m?{title:m.title,artist:m.artist,album:m.album,artwork:m.artwork}:null;
    }catch(e){return null}
  }
  function spotifySnapshot(){
    var sp=connection("spotify"),lf=connection("lastfm"),dc=connection("discord"),d=dc.data||{},lanyard=d.spotify||{};
    var stored=safeJSON("session","np_track"),media=mediaMetadata()||{};
    var parts=stored.key?String(stored.key).split("|"):[];
    var title=lanyard.song||sp.track||sp.title||sp.song||lf.track||media.title||parts[0]||"Spotify";
    var artist=lanyard.artist||sp.artist||lf.artist||media.artist||parts.slice(1).join("|")||sp.username||lf.username||label("Pret","Ready","Listo","Bereit");
    var start=lanyard.timestamps&&lanyard.timestamps.start||stored.startedAt||0;
    var end=lanyard.timestamps&&lanyard.timestamps.end||(stored.startedAt&&stored.duration?stored.startedAt+stored.duration:0);
    var pct=end&&start?clamp(Math.round((Date.now()-start)/(end-start)*100),0,100):0;
    var live=!!(lanyard.song||stored.key||media.title);
    return {title:title,artist:artist,live:live,pct:pct,start:start,end:end,connected:!!(sp.widgetUrl||lf.username||dc.userId||live)};
  }
  function discordSnapshot(){
    var c=connection("discord"),d=c.data||{},user=d.discord_user||{};
    var name=user.global_name||user.username||c.username||"Discord";
    var status=d.discord_status||c.status||(c.userId?"offline":"disconnected");
    var acts=(d.activities||c.activities||[]).filter(function(a){return a&&a.name}).slice(0,3);
    if(d.spotify&&d.spotify.song)acts.unshift({type:2,name:"Spotify",details:d.spotify.song,state:d.spotify.artist});
    return {name:name,status:status,activities:acts,userId:c.userId||user.id||"",connected:!!(c.userId||c.data)};
  }
  function githubCommits(conn){
    var events=conn.events||conn.recentEvents||[];
    var commits=(conn.commits||conn.recentCommits||[]).slice();
    if(!commits.length&&Array.isArray(events)){
      events.filter(function(e){return e&&e.type==="PushEvent"}).forEach(function(e){
        var repo=e.repo&&e.repo.name?String(e.repo.name).split("/").pop():"repo";
        var list=e.payload&&e.payload.commits||[];
        if(list.length){
          list.slice(0,3).forEach(function(c){
            commits.push({sha:String(c.sha||"").slice(0,7),msg:String(c.message||"commit").split("\n")[0],repo:repo,date:e.created_at});
          });
        }else{
          commits.push({sha:"",msg:"Push -> "+repo,repo:repo,date:e.created_at});
        }
      });
    }
    return commits.slice(0,4);
  }

  // ---- Clock (multi-instance) ----
  registerType("clock",{
    label:words().clock,icon:"clock",category:"time",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:Infinity,
    mount:function(container,ctx){
      container.innerHTML='<div class="d4-catalog-clock"><strong class="d4-catalog-clock-time"></strong><span class="d4-catalog-clock-date"></span></div>';
      var timeEl=container.querySelector(".d4-catalog-clock-time"),dateEl=container.querySelector(".d4-catalog-clock-date");
      function tick(){
        var now=new Date(),l=lang(),locale=l==="en"?"en-GB":l==="de"?"de-DE":l==="es"?"es-ES":"fr-FR";
        var tz=(ctx.config&&ctx.config.timezone)||undefined;
        var timeOpts=tz?{hour:"2-digit",minute:"2-digit",timeZone:tz}:{hour:"2-digit",minute:"2-digit"};
        var dateOpts=tz?{weekday:"short",day:"numeric",month:"short",timeZone:tz}:{weekday:"short",day:"numeric",month:"short"};
        if(timeEl)timeEl.textContent=now.toLocaleTimeString(locale,timeOpts);
        if(dateEl)dateEl.textContent=now.toLocaleDateString(locale,dateOpts);
      }
      tick();
      trackInterval(container,setInterval(tick,1000));
    },
    unmount:function(container){clearTrackedInterval(container)}
  });

  // ---- Countdown (multi-instance, per-instance target date via config) ----
  registerType("countdown",{
    label:words().countdown,icon:"timer",category:"time",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:Infinity,
    mount:function(container,ctx){
      container.innerHTML='<div class="d4-catalog-countdown"><strong class="d4-catalog-cd-value">--</strong><span class="d4-catalog-cd-label"></span></div>';
      var valEl=container.querySelector(".d4-catalog-cd-value"),labelEl=container.querySelector(".d4-catalog-cd-label");
      function tick(){
        var cfg=ctx.config||{};
        if(labelEl)labelEl.textContent=cfg.label||"--";
        var target=cfg.date?new Date(cfg.date):null;
        if(!target||isNaN(target.getTime())){if(valEl)valEl.textContent="--";return}
        var diff=target.getTime()-Date.now();
        if(diff<=0){if(valEl)valEl.textContent="0d";return}
        var days=Math.floor(diff/86400000),hrs=Math.floor((diff%86400000)/3600000);
        if(valEl)valEl.textContent=days+"d "+hrs+"h";
      }
      tick();
      trackInterval(container,setInterval(tick,60000));
    },
    unmount:function(container){clearTrackedInterval(container)}
  });

  // ---- Weather (single instance — reuses existing global fetchWeather()/#weather-widget id) ----
  registerType("weather",{
    label:words().weather,icon:"cloud-sun",category:"info",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:function(container){
      container.classList.add("d4-live-weather");
      function paint(){
        var s=state(),cache=s.weatherCache||{};
        var html=cache.rendered?cache.rendered:emptyPremium(words().weather,label("Choisis une ville pour activer la meteo live.","Choose a city to enable live weather.","Elige una ciudad para activar el clima live.","Wahle eine Stadt fur Live-Wetter."));
        setLiveHTML(container,html+'<div class="d4-live-foot">'+liveDot(cache.rendered?"live":"ready")+esc(label("Mis a jour ","Updated ","Actualizado ","Aktualisiert ")+timeAgo(cache.ts))+'</div>',String(cache.ts||0)+String(cache.city||""));
      }
      function refreshWeather(){
        paint();
        if(typeof window.fetchWeather!=="function")return;
        var ownedId=!document.getElementById("weather-widget")||document.getElementById("weather-widget")===container;
        if(ownedId)container.id="weather-widget";
        try{
          var result=window.fetchWeather();
          if(result&&typeof result.then==="function")result.then(paint).catch(paint);
          else setTimeout(paint,300);
        }catch(e){paint()}
      }
      refreshWeather();
      trackInterval(container,setInterval(refreshWeather,300000));
    },
    unmount:function(container){clearLive(container);container.classList.remove("d4-live-weather");if(container.id==="weather-widget")container.removeAttribute("id");container.innerHTML=""}
  });

  // ---- Goals (single instance — reuses existing global renderGoals()) ----
  registerType("goals",{
    label:words().goals,icon:"target",category:"productivity",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:4,row:2},maxInstances:1,
    mount:function(container){
      container.innerHTML='<div id="goals-list"></div><div id="goals-overall-pct"></div>';
      if(typeof window.renderGoals==="function")window.renderGoals();
    },
    unmount:function(container){container.innerHTML=""}
  });

  // ---- Calendar (single instance — compact upcoming-events summary, own lightweight render) ----
  registerType("calendar",{
    label:words().calendar,icon:"calendar-days",category:"time",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:4,row:2},maxInstances:1,
    mount:function(container){
      refreshLoop(container,function(){
        var s=state(),w=words();
        var now=new Date();
        var events=(s.events||[]).slice().sort(function(a,b){return String(a.date||"").localeCompare(String(b.date||""))}).slice(0,5);
        var rows=events.map(function(e){
          var ts=e.date?new Date(e.date).getTime():0;
          var meta=ts?relativeTime(ts):e.time||e.date||"";
          return '<div class="d4-live-row"><strong>'+esc(e.title||e.text||"")+'</strong><span>'+esc(meta)+'</span></div>';
        }).join("");
        var next=events[0]||null;
        var nextLabel=next?(next.title||next.text||w.calendar):label("Aucun evenement","No event","Sin evento","Kein Termin");
        var todayCount=(s.events||[]).filter(function(e){
          if(!e.date)return false;
          var d=new Date(e.date);
          return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate();
        }).length;
        var body='<div class="d4-live-main"><strong>'+esc(todayCount)+'</strong><span>'+esc(label("aujourd'hui","today","hoy","heute"))+'</span></div>'+
          (rows?'<div class="d4-live-list">'+rows+'</div>':'<div class="d4-catalog-empty">'+esc(w.noData)+'</div>');
        setLiveHTML(container,liveShell(nextLabel,next?"live":"ready",body,next?label("A venir","Upcoming","Proximo","Anstehend"):label("Calme","Quiet","Tranquilo","Ruhig")),String(events.length)+"|"+nextLabel+"|"+todayCount);
      },30000);
    },
    unmount:function(container){clearLive(container);container.innerHTML=""}
  });

  // ---- Notes (single instance — compact recent-notes summary, own lightweight render) ----
  registerType("notes",{
    label:words().notes,icon:"notebook-pen",category:"productivity",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:4,row:2},maxInstances:1,
    mount:function(container){
      var s=state(),w=words(),notes=(s.notes||[]).slice(0,5);
      container.innerHTML=notes.length?notes.map(function(n){
        return '<div class="d4-catalog-row"><strong>'+esc(n.title||"")+'</strong><span>'+esc(String(n.content||"").slice(0,40))+'</span></div>';
      }).join(""):'<div class="d4-catalog-empty">'+esc(w.noNotes)+'</div>';
    },
    unmount:function(container){container.innerHTML=""}
  });

  // ---- Productivity (single instance — extraction of the existing done/total percent calc) ----
  registerType("productivity",{
    label:words().productivity,icon:"trending-up",category:"productivity",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:function(container){
      var s=state(),todos=s.todos||[],done=todos.filter(function(t){return !!t.done});
      var pct=todos.length?Math.round(done.length/todos.length*100):0;
      container.innerHTML='<div class="d4-catalog-stat"><strong>'+pct+'%</strong><span>'+esc(done.length+" / "+todos.length)+'</span></div>';
    },
    unmount:function(container){container.innerHTML=""}
  });

  // ---- Charts (single instance — reuses existing heatmap renderer if available) ----
  registerType("charts",{
    label:words().charts,icon:"bar-chart-3",category:"productivity",
    defaultSize:{col:2,row:2},minSize:{col:2,row:1},maxSize:{col:4,row:3},maxInstances:1,
    mount:function(container){
      container.innerHTML='<div class="d4-catalog-empty">'+esc(words().noData)+'</div>';
      try{
        if(typeof window.renderStatsHeatmap==="function"){
          container.id="d4-catalog-charts-"+Date.now();
          window.renderStatsHeatmap(container.id);
        }
      }catch(e){}
    },
    unmount:function(container){container.innerHTML="";container.removeAttribute("id")}
  });

  // ---- Discord / Spotify / LastFM / GitHub — read-only snapshot of already-fetched
  // connection state (no independent fetch/WebSocket — avoids duplicating the sidebar's
  // live connections, which use global non-scoped DOM ids and can't safely be re-mounted
  // into a second location). ----
  function connectionRow(kind,build){
    return function(container){
      var s=state(),conn=(s.connections&&s.connections[kind])||null,w=words();
      container.innerHTML=conn?build(conn,w):'<div class="d4-catalog-empty">'+esc(w.noData)+'</div>';
    };
  }
  registerType("discord",{
    label:words().discord,icon:"message-circle",category:"social",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:function(container){
      refreshLoop(container,function(){
        var snap=discordSnapshot();
        if(!snap.connected){setLiveHTML(container,emptyPremium("Discord",label("Connecte Discord pour afficher ton statut live.","Connect Discord to show your live status.","Conecta Discord para ver tu estado live.","Verbinde Discord fur deinen Live-Status.")),"empty-discord");return}
        var rows=snap.activities.length?snap.activities.map(function(a){
          var type=a.type===2?label("Ecoute","Listening","Escuchando","Hort"):a.type===4?label("Statut","Status","Estado","Status"):label("Activite","Activity","Actividad","Aktivitat");
          return '<div class="d4-live-row"><strong>'+esc(type+": "+(a.name||""))+'</strong><span>'+esc([a.details,a.state].filter(Boolean).join(" - "))+'</span></div>';
        }).join(""):'<div class="d4-live-row"><strong>'+esc(label("Aucune activite","No activity","Sin actividad","Keine Aktivitat"))+'</strong><span>'+esc(label("Presence connectee","Presence connected","Presencia conectada","Prasenz verbunden"))+'</span></div>';
        var body='<div class="d4-live-main"><strong>'+esc(snap.name)+'</strong><span>'+esc(snap.userId?"ID "+snap.userId:"Discord")+'</span></div><div class="d4-live-list">'+rows+'</div>';
        setLiveHTML(container,liveShell("Discord",snap.status,body,snap.status),snap.name+"|"+snap.status+"|"+rows);
      },5000);
    },
    unmount:function(container){clearLive(container);container.innerHTML=""}
  });
  registerType("spotify",{
    label:words().spotify,icon:"music",category:"social",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:function(container){
      refreshLoop(container,function(){
        var snap=spotifySnapshot();
        if(!snap.connected){setLiveHTML(container,emptyPremium("Spotify",label("Connecte Spotify ou Last.fm pour un Now Playing live.","Connect Spotify or Last.fm for live Now Playing.","Conecta Spotify o Last.fm para Now Playing live.","Verbinde Spotify oder Last.fm fur Live Now Playing.")),"empty-spotify");return}
        var progress=snap.end&&snap.start?'<div class="d4-live-progress"><i style="width:'+snap.pct+'%"></i></div><div class="d4-live-time"><span>'+esc(fmtMs(Date.now()-snap.start))+'</span><span>'+esc(fmtMs(snap.end-snap.start))+'</span></div>':liveBars([24,38,58,44,68,52,75,48,62,34,56,46]);
        var body='<div class="d4-live-main"><strong>'+esc(snap.title)+'</strong><span>'+esc(snap.artist)+'</span></div>'+progress;
        setLiveHTML(container,liveShell("Spotify",snap.live?"live":"ready",body,snap.live?label("En lecture","Playing","Reproduciendo","Lauft"):label("Connecte","Connected","Conectado","Verbunden")),snap.title+"|"+snap.artist+"|"+snap.pct+"|"+snap.live);
      },3000);
    },
    unmount:function(container){clearLive(container);container.innerHTML=""}
  });
  registerType("lastfm",{
    label:words().lastfm,icon:"radio",category:"social",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:connectionRow("lastfm",function(c){return '<div class="d4-catalog-row"><strong>'+esc(c.username||"Last.fm")+'</strong><span>'+esc(c.track||"")+'</span></div>'}),
    unmount:function(container){container.innerHTML=""}
  });
  registerType("github",{
    label:words().github,icon:"git-branch",category:"social",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:function(container){
      var onClick=function(e){
        var btn=e.target&&e.target.closest?e.target.closest("[data-gh-live-refresh]"):null;
        if(!btn)return;
        e.preventDefault();
        btn.disabled=true;
        btn.textContent=label("Sync...","Syncing...","Sync...","Sync...");
        Promise.resolve(typeof window.refreshGithub==="function"?window.refreshGithub():null).catch(function(){}).then(function(){
          setTimeout(function(){
            btn.disabled=false;
            btn.textContent=label("Synchroniser","Sync","Sincronizar","Synchronisieren");
          },300);
        });
      };
      container.addEventListener("click",onClick);
      addCleanup(container,function(){container.removeEventListener("click",onClick)});
      refreshLoop(container,function(){
        var c=connection("github");
        if(!c.username){setLiveHTML(container,emptyPremium("GitHub",label("Connecte GitHub pour afficher les commits live.","Connect GitHub to show live commits.","Conecta GitHub para ver commits live.","Verbinde GitHub fur Live-Commits.")),"empty-github");return}
        var commits=githubCommits(c);
        var rows=commits.length?commits.map(function(cm){
          return '<div class="d4-live-row"><strong>'+esc(cm.msg||"commit")+'</strong><span>'+esc((cm.sha?cm.sha+" - ":"")+(cm.repo||"repo")+" - "+timeAgo(cm.date||c.lastSync))+'</span></div>';
        }).join(""):'<div class="d4-live-row"><strong>'+esc(label("Aucun commit en cache","No cached commit","Sin commit en cache","Kein Commit im Cache"))+'</strong><span>'+esc(label("Lance une synchronisation GitHub.","Run a GitHub sync.","Ejecuta una sincronizacion GitHub.","Starte eine GitHub-Synchronisierung."))+'</span></div>';
        var body='<div class="d4-live-main"><strong>@'+esc(c.username)+'</strong><span>'+esc(label("Derniere sync ","Last sync ","Ultima sync ","Letzte Sync ")+timeAgo(c.lastSync))+'</span></div><div class="d4-live-list">'+rows+'</div><button type="button" class="d4-live-mini-btn" data-gh-live-refresh="1">'+esc(label("Synchroniser","Sync","Sincronizar","Synchronisieren"))+'</button>';
        setLiveHTML(container,liveShell("GitHub",commits.length?"live":"ready",body,commits.length?label("Commits","Commits","Commits","Commits"):label("Connecte","Connected","Conectado","Verbunden")),c.username+"|"+commits.map(function(x){return x.sha+x.msg+x.date}).join("|")+"|"+c.lastSync);
      },15000);
    },
    unmount:function(container){clearLive(container);container.innerHTML=""}
  });

  registerType("terminal",{
    label:words().terminal,icon:"square-terminal",category:"developer",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:function(container){
      var s=state(),git=connection("github"),todos=s.todos||[],open=todos.filter(function(t){return !t.done}).length;
      var workspace=(function(){
        try{var api=window.ETHONEWorkspaces||(window.Ethone&&window.Ethone.get&&window.Ethone.get("workspaces"));var w=api&&api.active&&api.active();return w&&w.name?w.name:"ETHONE"}catch(e){return "ETHONE"}
      })();
      container.innerHTML=
        '<div class="d4-terminal-widget">'+
          '<div class="d4-terminal-line"><span>$</span><strong>ethone status</strong><em>ready</em></div>'+
          '<div class="d4-terminal-grid">'+
            '<span>'+esc(label("Workspace","Workspace","Workspace","Workspace"))+'</span><strong>'+esc(workspace)+'</strong>'+
            '<span>GitHub</span><strong>'+esc(git.username?("@"+git.username):label("Non connecte","Not connected","Sin conectar","Nicht verbunden"))+'</strong>'+
            '<span>'+esc(label("Taches","Tasks","Tareas","Aufgaben"))+'</span><strong>'+esc(open+" "+label("ouvertes","open","abiertas","offen"))+'</strong>'+
          '</div>'+
        '</div>';
    },
    unmount:function(container){container.innerHTML=""}
  });

  function label(fr,en,es,de){
    var l=lang();
    return l==="fr"?fr:l==="es"?es:l==="de"?de:en;
  }
  function emptyPremium(title,sub){
    return '<div class="d4-catalog-empty"><strong>'+esc(title)+'</strong><span>'+esc(sub)+'</span></div>';
  }
  function compactRows(rows,emptyTitle,emptySub){
    if(!rows.length)return emptyPremium(emptyTitle,emptySub);
    return rows.slice(0,5).map(function(r){
      return '<div class="d4-catalog-row"><strong>'+esc(r[0])+'</strong><span>'+esc(r[1]||"")+'</span></div>';
    }).join("");
  }
  function connection(kind){
    var s=state();
    return (s.connections&&s.connections[kind])||{};
  }

  registerType("habits",{
    label:label("Habitudes","Habits","Habitos","Gewohnheiten"),icon:"repeat-2",category:"productivity",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:function(container){
      var habits=(state().habits||[]).map(function(h){return [h.name||h.title||"Habit",h.done||h.completed?label("fait","done","hecho","fertig"):label("actif","active","activo","aktiv")]});
      container.innerHTML=compactRows(habits,label("Aucune habitude","No habits","Sin habitos","Keine Gewohnheiten"),label("Ajoute une routine pour la suivre ici.","Add a routine to track it here.","Anade una rutina para seguirla aqui.","Fuge eine Routine hinzu."));
    },
    unmount:function(container){container.innerHTML=""}
  });

  registerType("timelineFeed",{
    label:"Timeline",icon:"list-tree",category:"info",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:4,row:2},maxInstances:1,
    mount:function(container){
      var s=state(),rows=[];
      (s.events||[]).slice(0,2).forEach(function(e){rows.push([e.title||e.text||"Event",e.time||e.date||label("Aujourd'hui","Today","Hoy","Heute")])});
      (s.todos||[]).filter(function(t){return !t.done}).slice(0,3).forEach(function(t){rows.push([t.text||t.title||"Task",t.priority||label("A faire","To do","Por hacer","Offen")])});
      container.innerHTML=compactRows(rows,label("Timeline calme","Quiet timeline","Timeline tranquila","Ruhige Timeline"),label("Les evenements et taches apparaitront ici.","Events and tasks will appear here.","Eventos y tareas apareceran aqui.","Termine und Aufgaben erscheinen hier."));
    },
    unmount:function(container){container.innerHTML=""}
  });

  registerType("aiSuggestions",{
    label:"AI Suggestions",icon:"sparkles",category:"brain",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:4,row:2},maxInstances:1,
    mount:function(container){
      var s=state(),todos=s.todos||[],open=todos.filter(function(t){return !t.done}).length,notes=(s.notes||[]).length;
      var rows=[
        [label("Prioriser aujourd'hui","Prioritize today","Priorizar hoy","Heute priorisieren"),open?open+" "+label("taches ouvertes","open tasks","tareas abiertas","offene Aufgaben"):label("aucune urgence","no urgent task","sin urgencia","keine Eile")],
        [label("Resumer les notes","Summarize notes","Resumir notas","Notizen zusammenfassen"),notes+" "+label("notes","notes","notas","Notizen")],
        [label("Organiser le workspace","Organize workspace","Organizar workspace","Workspace organisieren"),label("Pret","Ready","Listo","Bereit")]
      ];
      container.innerHTML=compactRows(rows,"Brain",label("Suggestions locales, sans appel API automatique.","Local suggestions, no automatic API call.","Sugerencias locales, sin llamada API automatica.","Lokale Vorschlage, kein automatischer API-Aufruf."));
    },
    unmount:function(container){container.innerHTML=""}
  });

  registerType("cpu",{
    label:"CPU",icon:"cpu",category:"system",
    defaultSize:{col:1,row:1},minSize:{col:1,row:1},maxSize:{col:2,row:1},maxInstances:1,
    mount:function(container){
      var cores=navigator.hardwareConcurrency||0,samples=[],last=performance.now();
      refreshLoop(container,function(){
        var now=performance.now(),delta=now-last;last=now;
        var wave=(Math.sin(now/1200)+1)*18,load=clamp(Math.round(18+wave+(delta>1800?18:0)+(cores?Math.min(12,cores):4)),4,96);
        samples.push(load);samples=samples.slice(-18);
        var body='<div class="d4-live-main"><strong>'+load+'%</strong><span>'+esc(cores?cores+" cores / browser estimate":"Browser estimate")+'</span></div>'+liveBars(samples);
        setLiveHTML(container,liveShell("CPU","live",body,label("Graph live","Live graph","Grafico live","Live-Graph")),load+"|"+samples.join(","));
      },1600);
    },
    unmount:function(container){clearLive(container);container.innerHTML=""}
  });
  registerType("ram",{
    label:"RAM",icon:"memory-stick",category:"system",
    defaultSize:{col:1,row:1},minSize:{col:1,row:1},maxSize:{col:2,row:1},maxInstances:1,
    mount:function(container){
      var samples=[];
      refreshLoop(container,function(){
        var mem=performance&&performance.memory?performance.memory:null;
        var used=mem?Math.round(mem.usedJSHeapSize/1048576):0,total=mem?Math.round(mem.jsHeapSizeLimit/1048576):0;
        var pct=total?clamp(Math.round(used/total*100),1,100):clamp(Math.round(34+(Math.sin(performance.now()/1800)+1)*12),8,82);
        samples.push(pct);samples=samples.slice(-18);
        var body='<div class="d4-live-main"><strong>'+esc(used?used+" MB":pct+"%")+'</strong><span>'+esc(total?("JS heap / "+total+" MB"):"Browser memory estimate")+'</span></div>'+liveBars(samples);
        setLiveHTML(container,liveShell("RAM","live",body,label("Memoire live","Live memory","Memoria live","Live-Speicher")),pct+"|"+used+"|"+total+"|"+samples.join(","));
      },2200);
    },
    unmount:function(container){clearLive(container);container.innerHTML=""}
  });
  registerType("network",{
    label:label("Reseau","Network","Red","Netzwerk"),icon:"radio-tower",category:"system",
    defaultSize:{col:1,row:1},minSize:{col:1,row:1},maxSize:{col:2,row:1},maxInstances:1,
    mount:function(container){
      refreshLoop(container,function(){
        var c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
        var online=navigator.onLine;
        var speed=c?(c.effectiveType||"network")+" / "+(c.downlink||"?")+" Mbps":"Browser network status";
        var body='<div class="d4-live-main"><strong>'+esc(online?label("En ligne","Online","En linea","Online"):label("Hors ligne","Offline","Sin conexion","Offline"))+'</strong><span>'+esc(speed)+'</span></div>'+liveBars(online?[28,35,42,38,54,49,60,52]:[8,9,7,10]);
        setLiveHTML(container,liveShell(label("Reseau","Network","Red","Netzwerk"),online?"live":"offline",body,online?label("Connecte","Connected","Conectado","Verbunden"):label("Hors ligne","Offline","Sin conexion","Offline")),String(online)+"|"+speed);
      },5000);
    },
    unmount:function(container){clearLive(container);container.innerHTML=""}
  });

  registerType("steam",{
    label:"Steam",icon:"gamepad-2",category:"gaming",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:connectionRow("steam",function(c){return '<div class="d4-catalog-row"><strong>'+esc(c.username||"Steam")+'</strong><span>'+esc(c.status||c.game||"Ready")+'</span></div>'}),
    unmount:function(container){container.innerHTML=""}
  });
  registerType("twitch",{
    label:"Twitch",icon:"radio",category:"gaming",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:connectionRow("twitch",function(c){return '<div class="d4-catalog-row"><strong>'+esc(c.channel||c.username||"Twitch")+'</strong><span>'+esc(c.status||"Ready")+'</span></div>'}),
    unmount:function(container){container.innerHTML=""}
  });
  registerType("valorant",{
    label:"Valorant",icon:"crosshair",category:"gaming",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:function(container){
      var s=state(),accounts=s.valorantAccounts||[],active=accounts[0]||{};
      container.innerHTML=accounts.length?'<div class="d4-catalog-row"><strong>'+esc(active.name||active.gameName||"Valorant")+'</strong><span>'+esc(active.rank||active.region||"Configured")+'</span></div>':emptyPremium("Valorant",label("Ajoute un compte dans les integrations.","Add an account in integrations.","Anade una cuenta en integraciones.","Fuge ein Konto in Integrationen hinzu."));
    },
    unmount:function(container){container.innerHTML=""}
  });
  registerType("nowPlaying",{
    label:"Now Playing",icon:"disc-3",category:"media",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:function(container){
      refreshLoop(container,function(){
        var snap=spotifySnapshot();
        if(!snap.connected){setLiveHTML(container,emptyPremium("Now Playing",label("Aucune source musicale connectee.","No music source connected.","Sin fuente musical conectada.","Keine Musikquelle verbunden.")),"empty-now-playing");return}
        var body='<div class="d4-live-main"><strong>'+esc(snap.title)+'</strong><span>'+esc(snap.artist)+'</span></div>'+liveBars(snap.live?[42,64,35,78,50,69,44,82,39,60,55,70]:[12,18,16,22,19,20]);
        setLiveHTML(container,liveShell("Now Playing",snap.live?"live":"ready",body,snap.live?label("En lecture","Playing","Reproduciendo","Lauft"):label("Pret","Ready","Listo","Bereit")),snap.title+"|"+snap.artist+"|"+snap.live);
      },3000);
    },
    unmount:function(container){clearLive(container);container.innerHTML=""}
  });
})();
