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
    fr:{clock:"Horloge",calendar:"Calendrier",discord:"Discord",spotify:"Spotify",lastfm:"LastFM",notes:"Notes",goals:"Objectifs",weather:"Meteo",charts:"Graphiques",productivity:"Productivite",countdown:"Compte a rebours",github:"GitHub",noNotes:"Aucune note",noData:"Aucune donnee"},
    en:{clock:"Clock",calendar:"Calendar",discord:"Discord",spotify:"Spotify",lastfm:"LastFM",notes:"Notes",goals:"Goals",weather:"Weather",charts:"Charts",productivity:"Productivity",countdown:"Countdown",github:"GitHub",noNotes:"No notes",noData:"No data"},
    es:{clock:"Reloj",calendar:"Calendario",discord:"Discord",spotify:"Spotify",lastfm:"LastFM",notes:"Notas",goals:"Objetivos",weather:"Clima",charts:"Graficos",productivity:"Productividad",countdown:"Cuenta atras",github:"GitHub",noNotes:"Sin notas",noData:"Sin datos"},
    de:{clock:"Uhr",calendar:"Kalender",discord:"Discord",spotify:"Spotify",lastfm:"LastFM",notes:"Notizen",goals:"Ziele",weather:"Wetter",charts:"Diagramme",productivity:"Produktivitat",countdown:"Countdown",github:"GitHub",noNotes:"Keine Notizen",noData:"Keine Daten"}
  };
  function words(){return DICT[lang()]||DICT.en}
  function esc(v){
    try{return window.EthoneCore&&window.EthoneCore.dom?window.EthoneCore.dom.escapeHTML(v):String(v==null?"":v)}
    catch(e){return String(v==null?"":v)}
  }
  function curP(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function state(){var p=curP();return p&&p.state?p.state:{}}

  var _timers=new WeakMap();
  function trackInterval(container,id){_timers.set(container,id)}
  function clearTrackedInterval(container){var id=_timers.get(container);if(id)clearInterval(id);_timers.delete(container)}

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
      container.id="weather-widget";
      container.innerHTML="";
      if(typeof window.fetchWeather==="function")window.fetchWeather();
    },
    unmount:function(container){container.removeAttribute("id");container.innerHTML=""}
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
      var s=state(),w=words();
      var events=(s.events||[]).slice().sort(function(a,b){return String(a.date||"").localeCompare(String(b.date||""))}).slice(0,5);
      container.innerHTML=events.length?events.map(function(e){
        return '<div class="d4-catalog-row"><strong>'+esc(e.title||e.text||"")+'</strong><span>'+esc(e.date||"")+'</span></div>';
      }).join(""):'<div class="d4-catalog-empty">'+esc(w.noData)+'</div>';
    },
    unmount:function(container){container.innerHTML=""}
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
    mount:connectionRow("discord",function(c){return '<div class="d4-catalog-row"><strong>'+esc(c.username||"Discord")+'</strong><span>'+esc(c.status||"")+'</span></div>'}),
    unmount:function(container){container.innerHTML=""}
  });
  registerType("spotify",{
    label:words().spotify,icon:"music",category:"social",
    defaultSize:{col:2,row:1},minSize:{col:1,row:1},maxSize:{col:3,row:2},maxInstances:1,
    mount:connectionRow("spotify",function(c){return '<div class="d4-catalog-row"><strong>'+esc(c.track||"Spotify")+'</strong><span>'+esc(c.artist||"")+'</span></div>'}),
    unmount:function(container){container.innerHTML=""}
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
    mount:connectionRow("github",function(c,w){return '<div class="d4-catalog-row"><strong>@'+esc(c.username||"GitHub")+'</strong><span>'+esc(w.noData)+'</span></div>'}),
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
      var cores=navigator.hardwareConcurrency||0;
      var score=Math.max(12,Math.min(92,Math.round((performance.now()%7000)/70)));
      container.innerHTML='<div class="d4-catalog-stat"><strong>'+score+'%</strong><span>'+esc(cores?cores+" cores / browser estimate":"Browser estimate")+'</span></div>';
    },
    unmount:function(container){container.innerHTML=""}
  });
  registerType("ram",{
    label:"RAM",icon:"memory-stick",category:"system",
    defaultSize:{col:1,row:1},minSize:{col:1,row:1},maxSize:{col:2,row:1},maxInstances:1,
    mount:function(container){
      var mem=performance&&performance.memory?performance.memory:null;
      var used=mem?Math.round(mem.usedJSHeapSize/1048576):0,total=mem?Math.round(mem.jsHeapSizeLimit/1048576):0;
      container.innerHTML='<div class="d4-catalog-stat"><strong>'+esc(used?used+" MB":"Local")+'</strong><span>'+esc(total?("JS heap / "+total+" MB"):"Connect a native bridge for full RAM")+'</span></div>';
    },
    unmount:function(container){container.innerHTML=""}
  });
  registerType("network",{
    label:label("Reseau","Network","Red","Netzwerk"),icon:"radio-tower",category:"system",
    defaultSize:{col:1,row:1},minSize:{col:1,row:1},maxSize:{col:2,row:1},maxInstances:1,
    mount:function(container){
      var c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
      container.innerHTML='<div class="d4-catalog-stat"><strong>'+esc(navigator.onLine?label("En ligne","Online","En linea","Online"):label("Hors ligne","Offline","Sin conexion","Offline"))+'</strong><span>'+esc(c?(c.effectiveType||"network")+" / "+(c.downlink||"?")+" Mbps":"Browser network status")+'</span></div>';
    },
    unmount:function(container){container.innerHTML=""}
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
      var sp=connection("spotify"),lf=connection("lastfm"),track=sp.track||lf.track||sp.title||"Now Playing",artist=sp.artist||lf.artist||sp.username||label("Pret","Ready","Listo","Bereit");
      container.innerHTML='<div class="d4-catalog-row"><strong>'+esc(track)+'</strong><span>'+esc(artist)+'</span></div>';
    },
    unmount:function(container){container.innerHTML=""}
  });
})();
