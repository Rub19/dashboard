/* ETHONE Activity & Insights Center */
(function(){
  "use strict";
  if(window.__ethoneActivityPage)return;
  window.__ethoneActivityPage=true;

  var state={
    category:"all",
    source:"all",
    workspace:"all",
    user:"all",
    range:"30d",
    query:"",
    month:new Date(),
    date:""
  };
  var inputTimer=null;

  function esc(v){
    return String(v==null?"":v).replace(/[&<>"']/g,function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
    });
  }
  function api(){return window.ETHONETimeline||window.ETHONEActivity}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function categoryMap(){return api()&&api().categories?api().categories:{}}
  function categories(){
    var c=categoryMap();
    return Object.keys(c).map(function(k){return Object.assign({id:k},c[k])});
  }
  function category(id){
    return categoryMap()[id]||categoryMap().system||{label:id||"Activity",icon:"activity",color:"#8b5cf6"};
  }
  function label(id){
    if(id==="all")return "Tout";
    var c=categoryMap()[id];
    return c?c.label:id;
  }
  function dateKey(d){
    var date=d instanceof Date?d:new Date(d);
    return date.toLocaleDateString("en-CA");
  }
  function startOfDay(date){
    var d=new Date(date);d.setHours(0,0,0,0);return d;
  }
  function formatDate(ts,mode){
    var d=new Date(ts||Date.now());
    var opts=mode==="long"?{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}:{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"};
    return d.toLocaleDateString("fr-FR",opts);
  }
  function timeAgo(ts){
    var diff=Math.max(0,Date.now()-new Date(ts||Date.now()).getTime());
    var mins=Math.floor(diff/60000);
    if(mins<1)return "maintenant";
    if(mins<60)return "il y a "+mins+" min";
    var hours=Math.floor(mins/60);
    if(hours<24)return "il y a "+hours+" h";
    var days=Math.floor(hours/24);
    if(days<7)return "il y a "+days+" j";
    return formatDate(ts);
  }
  function ensurePage(){
    if(document.getElementById("page-activity"))return;
    var anchor=document.getElementById("page-goals")||document.getElementById("page-github")||document.querySelector(".tab-content:last-of-type");
    var page=document.createElement("div");
    page.id="page-activity";
    page.className="tab-content";
    page.setAttribute("role","tabpanel");
    page.setAttribute("aria-live","polite");
    page.setAttribute("data-qa-page","true");
    page.innerHTML=
      '<div class="activity-center">'+
        '<header class="aic-hero">'+
          '<div class="aic-hero-copy">'+
            '<span class="aic-eyebrow"><i data-lucide="activity"></i>Activity & Insights</span>'+
            '<h1>Centre de controle ETHONE.</h1>'+
            '<p>Toutes les actions, synchronisations, connexions, pages, widgets et signaux Brain reunis dans une seule vue claire.</p>'+
            '<div class="aic-hero-pills" id="activity-hero-pills"></div>'+
          '</div>'+
          '<aside class="aic-score-card" aria-label="Activity health">'+
            '<span class="aic-score-label">ETHONE pense que</span>'+
            '<strong id="activity-score">--</strong>'+
            '<p id="activity-score-copy">Analyse de votre activite en cours.</p>'+
            '<div class="aic-score-meter"><span id="activity-score-meter"></span></div>'+
          '</aside>'+
        '</header>'+
        '<section class="aic-toolbar">'+
          '<div class="aic-search"><i data-lucide="search"></i><input id="activity-search" type="search" autocomplete="off" placeholder="Rechercher une action, GitHub, Spotify, Brain, Marketplace..."></div>'+
          '<div class="aic-toolbar-actions">'+
            '<button class="aic-button" type="button" data-tl-export><i data-lucide="download"></i>Exporter</button>'+
            '<button class="aic-button danger" type="button" data-tl-clear><i data-lucide="trash-2"></i>Effacer</button>'+
          '</div>'+
        '</section>'+
        '<section class="aic-filters">'+
          '<div class="aic-filter-group" id="activity-range-filter"></div>'+
          '<div class="aic-filter-group" id="activity-source-filter"></div>'+
          '<div class="aic-selects">'+
            '<label><span>Workspace</span><select id="activity-workspace-filter"></select></label>'+
            '<label><span>Utilisateur</span><select id="activity-user-filter"></select></label>'+
          '</div>'+
        '</section>'+
        '<section class="aic-metrics" id="activity-metrics"></section>'+
        '<section class="aic-layout">'+
          '<main class="aic-main">'+
            '<section class="aic-panel aic-smart-panel">'+
              '<div class="aic-panel-head"><div><span>Smart Insights</span><h2>ETHONE pense que...</h2></div><button class="aic-link" type="button" data-aic-run-action="brain.open">Demander a Brain</button></div>'+
              '<div class="aic-insights" id="activity-insights"></div>'+
            '</section>'+
            '<section class="aic-panel">'+
              '<div class="aic-panel-head"><div><span>Statistiques</span><h2>Rythme d utilisation</h2></div><em id="activity-range-label"></em></div>'+
              '<div class="aic-chart-grid">'+
                '<div class="aic-chart-card"><div class="aic-chart-title"><strong>Activite par heure</strong><span id="activity-busy-hour"></span></div><div class="aic-hour-chart" id="activity-hour-chart"></div></div>'+
                '<div class="aic-chart-card"><div class="aic-chart-title"><strong>Pages et modules</strong><span>Top signaux</span></div><div class="aic-bar-list" id="activity-page-bars"></div></div>'+
              '</div>'+
            '</section>'+
            '<section class="aic-panel aic-feed-panel">'+
              '<div class="aic-panel-head"><div><span>Timeline</span><h2>Journal complet</h2></div><button class="activity-reset" type="button" data-tl-reset>Reinitialiser</button></div>'+
              '<div class="aic-feed-summary" id="activity-count">0 evenement</div>'+
              '<div class="timeline-feed aic-feed" id="activity-feed"></div>'+
            '</section>'+
          '</main>'+
          '<aside class="aic-side">'+
            '<section class="aic-panel aic-side-panel">'+
              '<div class="aic-panel-head"><div><span>Heatmap</span><h2>84 derniers jours</h2></div></div>'+
              '<div class="activity-heatmap" id="activity-heatmap"></div>'+
            '</section>'+
            '<section class="aic-panel aic-side-panel">'+
              '<div class="aic-panel-head"><div><span>Types</span><h2>Repartition</h2></div></div>'+
              '<div class="activity-breakdown" id="activity-breakdown"></div>'+
            '</section>'+
            '<section class="aic-panel aic-side-panel">'+
              '<div class="aic-panel-head"><div><span>Workspaces</span><h2>Environnements</h2></div></div>'+
              '<div class="aic-bar-list" id="activity-workspace-bars"></div>'+
            '</section>'+
            '<section class="aic-panel aic-side-panel timeline-calendar-panel">'+
              '<div class="aic-panel-head"><div><span>Calendrier</span><h2 id="activity-month-label"></h2></div><div class="timeline-month-actions"><button type="button" data-tl-month="-1" aria-label="Mois precedent"><i data-lucide="chevron-left"></i></button><button type="button" data-tl-month="1" aria-label="Mois suivant"><i data-lucide="chevron-right"></i></button></div></div>'+
              '<div class="timeline-calendar" id="activity-calendar"></div>'+
            '</section>'+
          '</aside>'+
        '</section>'+
      '</div>';
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(page,anchor);
    else document.getElementById("main-content")?.appendChild(page);
  }
  function rawItems(){
    var items=api()?api().items().slice():[];
    return items.sort(function(a,b){return new Date(b.ts||0)-new Date(a.ts||0)});
  }
  function normalizedItems(){
    var p=profile();
    return rawItems().map(function(e){
      var cat=category(e.category);
      var user=e.user||{id:p&&p.id,name:p&&p.name||"Utilisateur"};
      if(typeof user==="string")user={id:user,name:user};
      return Object.assign({},e,{
        title:e.title||e.text||"Activity",
        body:e.body||"",
        source:e.source||e.category||"ethone",
        workspace:e.workspace||null,
        user:user,
        icon:e.icon||cat.icon||"activity",
        color:e.color||cat.color||"#8b5cf6"
      });
    });
  }
  function inRange(e){
    if(state.date)return String(e.ts||"").slice(0,10)===state.date;
    if(state.range==="all")return true;
    var d=new Date(e.ts||Date.now());
    var now=new Date();
    if(state.range==="today")return dateKey(d)===dateKey(now);
    if(state.range==="month")return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
    var days=state.range==="7d"?7:state.range==="90d"?90:30;
    return d.getTime()>=startOfDay(new Date(now.getTime()-days*86400000)).getTime();
  }
  function matchesQuery(e){
    if(!state.query)return true;
    var q=state.query.toLowerCase();
    var workspace=e.workspace&&e.workspace.name||"";
    var user=e.user&&e.user.name||"";
    var meta="";
    try{meta=JSON.stringify(e.meta||{})}catch(err){}
    return (e.title+" "+e.body+" "+e.category+" "+e.source+" "+workspace+" "+user+" "+meta).toLowerCase().indexOf(q)>-1;
  }
  function matchesSource(e){
    if(state.source==="all")return true;
    var raw=(e.category+" "+e.source+" "+e.title+" "+e.body).toLowerCase();
    return raw.indexOf(state.source)>-1;
  }
  function matchesWorkspace(e){
    if(state.workspace==="all")return true;
    var id=e.workspace&&String(e.workspace.id||e.workspace.name||"");
    return id===state.workspace;
  }
  function matchesUser(e){
    if(state.user==="all")return true;
    var id=e.user&&String(e.user.id||e.user.name||"");
    return id===state.user;
  }
  function filtered(){
    return normalizedItems().filter(function(e){
      return inRange(e)&&matchesQuery(e)&&matchesSource(e)&&matchesWorkspace(e)&&matchesUser(e)&&(state.category==="all"||e.category===state.category);
    });
  }
  function countBy(list,getter){
    var out={};
    list.forEach(function(item){
      var key=getter(item)||"ETHONE";
      out[key]=(out[key]||0)+1;
    });
    return out;
  }
  function topEntries(counts,limit){
    return Object.keys(counts).map(function(k){return{label:k,value:counts[k]}}).sort(function(a,b){return b.value-a.value}).slice(0,limit||6);
  }
  function completionRate(){
    var p=profile(),todos=p&&p.state&&Array.isArray(p.state.todos)?p.state.todos:[];
    if(!todos.length)return null;
    var done=todos.filter(function(t){return t.done||t.completed}).length;
    return {done:done,total:todos.length,rate:Math.round(done/todos.length*100)};
  }
  function statsFor(list,all){
    var activeDays={};
    list.forEach(function(e){activeDays[String(e.ts||"").slice(0,10)]=true});
    var cats=topEntries(countBy(list,function(e){return e.category}),1);
    var hours=countBy(list,function(e){return String(new Date(e.ts||Date.now()).getHours()).padStart(2,"0")});
    var topHour=topEntries(hours,1)[0]||{label:"--",value:0};
    var pages=topEntries(countBy(all,function(e){
      var text=(e.source||"")+" "+(e.title||"");
      var m=text.match(/Opened\s+([a-z0-9-]+)/i);
      return m?m[1]:(e.source||e.category||"ETHONE");
    }),5);
    return {
      total:list.length,
      all:all.length,
      activeDays:Object.keys(activeDays).length,
      topCategory:cats[0]||{label:"system",value:0},
      topHour:topHour,
      pages:pages,
      completion:completionRate()
    };
  }
  function rangeFilterHTML(){
    var ranges=[
      ["today","Aujourd'hui"],["7d","Cette semaine"],["30d","30 jours"],["month","Ce mois"],["90d","90 jours"],["all","Tout"]
    ];
    return ranges.map(function(r){
      return '<button type="button" class="'+(state.range===r[0]&&!state.date?"active":"")+'" data-aic-range="'+r[0]+'">'+esc(r[1])+'</button>';
    }).join("");
  }
  function sourceFilterHTML(){
    var sources=[["all","Tout"],["ai","AI"],["github","GitHub"],["discord","Discord"],["spotify","Spotify"],["marketplace","Marketplace"]];
    return sources.map(function(s){
      return '<button type="button" class="'+(state.source===s[0]?"active":"")+'" data-aic-source="'+s[0]+'">'+esc(s[1])+'</button>';
    }).join("");
  }
  function selectHTML(items,current,allLabel){
    var html='<option value="all">'+esc(allLabel)+'</option>';
    items.forEach(function(item){
      html+='<option value="'+esc(item.id)+'" '+(String(current)===String(item.id)?"selected":"")+'>'+esc(item.name)+'</option>';
    });
    return html;
  }
  function workspaceOptions(all){
    var map={};
    all.forEach(function(e){
      if(e.workspace&&(e.workspace.id||e.workspace.name)){
        map[String(e.workspace.id||e.workspace.name)]={id:String(e.workspace.id||e.workspace.name),name:e.workspace.name||e.workspace.id};
      }
    });
    try{
      var list=window.ETHONEWorkspaces&&window.ETHONEWorkspaces.list?window.ETHONEWorkspaces.list():[];
      list.forEach(function(w){map[String(w.id||w.name)]={id:String(w.id||w.name),name:w.name||w.id}});
    }catch(e){}
    return Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return a.name.localeCompare(b.name)});
  }
  function userOptions(all){
    var map={};
    var p=profile();
    if(p)map[String(p.id||p.name)]={id:String(p.id||p.name),name:p.name||"User"};
    all.forEach(function(e){
      if(e.user&&(e.user.id||e.user.name)){
        map[String(e.user.id||e.user.name)]={id:String(e.user.id||e.user.name),name:e.user.name||e.user.id};
      }
    });
    return Object.keys(map).map(function(k){return map[k]});
  }
  function heroPillsHTML(list,all){
    var s=statsFor(list,all);
    return '<span><i data-lucide="database"></i>'+esc(all.length)+' evenements stockes</span>'+
      '<span><i data-lucide="zap"></i>'+esc(s.activeDays)+' jours actifs</span>'+
      '<span><i data-lucide="layers-3"></i>'+esc(label(s.topCategory.label))+'</span>';
  }
  function healthScore(list){
    var s=statsFor(list,normalizedItems());
    var score=Math.min(100,Math.max(42,Math.round(55+Math.min(20,s.activeDays*4)+Math.min(16,list.length/10)+(s.completion?Math.min(9,s.completion.rate/12):4))));
    var copy=score>84?"Votre activite est dense et bien synchronisee.":"ETHONE detecte assez de signaux pour vous guider, mais certains modules restent calmes.";
    return {score:score,copy:copy};
  }
  function insightCard(icon,title,body,action,kind){
    return {icon:icon,title:title,body:body,action:action||"",kind:kind||"neutral"};
  }
  function smartInsights(list,all){
    var out=[];
    var cats=countBy(list,function(e){return e.category});
    var hours=countBy(list,function(e){var h=new Date(e.ts||Date.now()).getHours();return h<12?"matin":h<18?"apres-midi":h<22?"soir":"nuit"});
    var topHour=topEntries(hours,1)[0];
    var pages=topEntries(countBy(all,function(e){var m=(e.title||"").match(/Opened\s+([a-z0-9-]+)/i);return m?m[1]:""}),2).filter(function(p){return p.label});
    var completion=completionRate();
    if(cats.github){
      out.push(insightCard("git-branch","GitHub ressort fortement","Vous avez "+cats.github+" signaux developpeur dans cette periode. ETHONE peut preparer un recap code ou une liste de prochaines taches.","ai.open","accent"));
    }
    if(cats.spotify||cats.discord){
      out.push(insightCard("music","Mode ambiance detecte","Spotify et Discord apparaissent dans votre activite. Un layout temps libre pourrait remonter musique, chat et gaming.","settings.open","soft"));
    }
    if(topHour){
      out.push(insightCard("clock-3","Votre rythme principal est le "+topHour.label,topHour.value+" evenements sont concentres sur ce moment. ETHONE peut adapter le dashboard automatiquement.","activity.open","neutral"));
    }
    if(completion&&completion.rate<50){
      out.push(insightCard("check-circle-2","Des taches restent ouvertes","Seulement "+completion.rate+"% des taches sont terminees. Brain peut proposer un plan plus court pour finir la semaine.","todos.open","warning"));
    }
    if(!cats.calendar&&!cats.sync){
      out.push(insightCard("calendar-days","Planning silencieux","Calendar ou les synchronisations n'ont pas beaucoup bouge. Pensez a connecter ou verifier vos evenements.","calendar.open","neutral"));
    }
    if(pages.length>1){
      out.push(insightCard("route","Sequence frequente detectee","Vous ouvrez souvent "+pages[0].label+" puis "+pages[1].label+". Cette sequence pourrait devenir un raccourci ou une automation.","ai.open","accent"));
    }
    if(!out.length){
      out.push(insightCard("sparkles","ETHONE apprend votre rythme","Continuez a utiliser Notes, Tasks, Workspaces et les integrations. Les recommandations deviendront plus precises.","dashboard.open","accent"));
    }
    return out.slice(0,4);
  }
  function insightsHTML(list,all){
    return smartInsights(list,all).map(function(i){
      return '<article class="aic-insight '+esc(i.kind)+'"><div><i data-lucide="'+esc(i.icon)+'"></i></div><span>'+esc(i.title)+'</span><p>'+esc(i.body)+'</p>'+(i.action?'<button type="button" data-aic-run-action="'+esc(i.action)+'">Agir</button>':'')+'</article>';
    }).join("");
  }
  function hourChartHTML(list){
    var counts=countBy(list,function(e){return new Date(e.ts||Date.now()).getHours()});
    var max=Object.keys(counts).reduce(function(m,k){return Math.max(m,counts[k])},0)||1;
    var html="";
    for(var h=0;h<24;h++){
      var n=counts[h]||0;
      var hourLabel=h+"h - "+n+" evenements";
      html+='<button type="button" class="aic-hour" title="'+esc(hourLabel)+'" aria-label="'+esc(hourLabel)+'"><span style="height:'+Math.max(4,Math.round(n/max*100))+'%"></span><small>'+((h%4===0)?h:"")+'</small></button>';
    }
    return html;
  }
  function barListHTML(rows,empty){
    if(!rows.length)return '<div class="timeline-empty compact"><strong>'+esc(empty||"Aucune donnee")+'</strong><span>Les donnees apparaitront ici.</span></div>';
    var max=rows.reduce(function(m,r){return Math.max(m,r.value)},0)||1;
    return rows.map(function(r){
      var w=Math.max(5,Math.round(r.value/max*100));
      return '<button type="button" class="aic-data-row" data-aic-query="'+esc(r.label)+'"><span>'+esc(r.label)+'</span><strong>'+esc(r.value)+'</strong><em style="--aic-width:'+w+'%"></em></button>';
    }).join("");
  }
  function itemHTML(e){
    var d=new Date(e.ts||Date.now());
    var cat=category(e.category);
    var workspace=e.workspace&&e.workspace.name?e.workspace.name:"ETHONE";
    var user=e.user&&e.user.name?e.user.name:"User";
    return '<article class="timeline-event activity-event aic-event" data-cat="'+esc(e.category)+'">'+
      '<div class="timeline-event-icon" style="--tl-color:'+esc(e.color||cat.color)+'"><i data-lucide="'+esc(e.icon||cat.icon)+'"></i></div>'+
      '<div class="timeline-event-main">'+
        '<div class="timeline-event-meta"><span>'+esc(label(e.category))+'</span><time>'+esc(formatDate(d,"long"))+'</time></div>'+
        '<h3>'+esc(e.title||"Evenement ETHONE")+'</h3>'+
        (e.body?'<p>'+esc(e.body)+'</p>':'')+
        '<div class="activity-event-tags">'+
          '<small>'+esc(user)+'</small>'+
          '<small>'+esc(workspace)+'</small>'+
          (e.source?'<small>'+esc(e.source)+'</small>':'')+
          '<small>'+esc(timeAgo(e.ts))+'</small>'+
        '</div>'+
      '</div>'+
    '</article>';
  }
  function categoryFilterHTML(list){
    var counts=countBy(list,function(e){return e.category});
    var priority=["all","auth","creation","modification","deletion","sync","ai","github","discord","spotify","marketplace","workspace"];
    var allCats=[{id:"all",label:"Tout",icon:"history",color:"#8b5cf6"}].concat(categories());
    allCats.sort(function(a,b){
      var ia=priority.indexOf(a.id),ib=priority.indexOf(b.id);
      ia=ia<0?99:ia;ib=ib<0?99:ib;
      return ia-ib;
    });
    return allCats.slice(0,12).map(function(c){
      var n=c.id==="all"?list.length:(counts[c.id]||0);
      return '<button class="timeline-stat '+(state.category===c.id?"active":"")+'" type="button" data-tl-category="'+esc(c.id)+'"><i data-lucide="'+esc(c.icon||"activity")+'"></i><span>'+esc(c.label)+'</span><strong>'+n+'</strong></button>';
    }).join("");
  }
  function heatmapHTML(){
    var data=api()&&api().heatmap?api().heatmap(84):[];
    var max=data.reduce(function(m,d){return Math.max(m,d.count||0)},0)||1;
    return '<div class="activity-heatmap-grid">'+data.map(function(day){
      var ratio=(day.count||0)/max;
      var level=day.count?Math.max(1,Math.ceil(ratio*4)):0;
      return '<button type="button" class="activity-heat-cell l'+level+'" data-tl-date="'+esc(day.date)+'" title="'+esc(day.date+' - '+day.count+' evenement(s)')+'"><span>'+esc(day.count||0)+'</span></button>';
    }).join("")+'</div><div class="activity-heat-legend"><span>Calme</span><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>Actif</span></div>';
  }
  function breakdownHTML(list){
    var counts=countBy(list,function(e){return e.category});
    var total=Object.keys(counts).reduce(function(n,k){return n+(counts[k]||0)},0)||1;
    return categories().filter(function(c){return counts[c.id]}).slice(0,10).map(function(c){
      var n=counts[c.id]||0;
      var width=Math.max(4,Math.round(n/total*100));
      return '<button type="button" class="activity-break-row" data-tl-category="'+esc(c.id)+'">'+
        '<span><i data-lucide="'+esc(c.icon||"activity")+'"></i>'+esc(c.label)+'</span>'+
        '<strong>'+n+'</strong>'+
        '<em style="--activity-width:'+width+'%"></em>'+
      '</button>';
    }).join("")||'<div class="timeline-empty compact"><strong>Aucune donnee</strong><span>Les categories apparaitront ici.</span></div>';
  }
  function calendarHTML(){
    var by=api()&&api().byDay?api().byDay(state.month):{};
    var y=state.month.getFullYear(),m=state.month.getMonth();
    var first=new Date(y,m,1),start=(first.getDay()+6)%7;
    var days=new Date(y,m+1,0).getDate();
    var html='<div class="timeline-weekdays"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="timeline-days">';
    for(var b=0;b<start;b++)html+='<div class="timeline-day muted"></div>';
    for(var day=1;day<=days;day++){
      var d=new Date(y,m,day),key=dateKey(d),count=by[key]||0,isToday=key===dateKey(new Date()),isSelected=key===state.date;
      html+='<button class="timeline-day '+(count?"has-events ":"")+(isToday?"today ":"")+(isSelected?"selected":"")+'" type="button" data-tl-date="'+key+'"><span>'+day+'</span>'+(count?'<b>'+count+'</b>':'')+'</button>';
    }
    return html+'</div>';
  }
  function rangeLabel(){
    if(state.date)return "Filtre: "+state.date;
    return {
      today:"Aujourd'hui",
      "7d":"Cette semaine",
      "30d":"30 derniers jours",
      month:"Ce mois",
      "90d":"90 derniers jours",
      all:"Tout l historique"
    }[state.range]||"30 derniers jours";
  }
  function renderActivityPage(){
    ensurePage();
    if(!api())return;
    var all=normalizedItems();
    var list=filtered();
    var limited=list.slice(0,160);
    var health=healthScore(list);
    var metrics=document.getElementById("activity-metrics");
    var pills=document.getElementById("activity-hero-pills");
    var score=document.getElementById("activity-score");
    var scoreCopy=document.getElementById("activity-score-copy");
    var scoreMeter=document.getElementById("activity-score-meter");
    var search=document.getElementById("activity-search");
    var range=document.getElementById("activity-range-filter");
    var source=document.getElementById("activity-source-filter");
    var workspace=document.getElementById("activity-workspace-filter");
    var user=document.getElementById("activity-user-filter");
    var insights=document.getElementById("activity-insights");
    var hourChart=document.getElementById("activity-hour-chart");
    var pageBars=document.getElementById("activity-page-bars");
    var busyHour=document.getElementById("activity-busy-hour");
    var feed=document.getElementById("activity-feed");
    var count=document.getElementById("activity-count");
    var heat=document.getElementById("activity-heatmap");
    var breakdown=document.getElementById("activity-breakdown");
    var workspaceBars=document.getElementById("activity-workspace-bars");
    var calendar=document.getElementById("activity-calendar");
    var month=document.getElementById("activity-month-label");
    var rangeLabelEl=document.getElementById("activity-range-label");
    var s=statsFor(list,all);

    if(search&&search.value!==state.query)search.value=state.query;
    if(metrics)metrics.innerHTML=categoryFilterHTML(list);
    if(pills)pills.innerHTML=heroPillsHTML(list,all);
    if(score)score.textContent=health.score+"%";
    if(scoreCopy)scoreCopy.textContent=health.copy;
    if(scoreMeter)scoreMeter.style.width=health.score+"%";
    if(range)range.innerHTML=rangeFilterHTML();
    if(source)source.innerHTML=sourceFilterHTML();
    if(workspace)workspace.innerHTML=selectHTML(workspaceOptions(all),state.workspace,"Tous les workspaces");
    if(user)user.innerHTML=selectHTML(userOptions(all),state.user,"Tous les utilisateurs");
    if(insights)insights.innerHTML=insightsHTML(list,all);
    if(hourChart)hourChart.innerHTML=hourChartHTML(list);
    if(pageBars)pageBars.innerHTML=barListHTML(s.pages,"Aucune page detectee");
    if(busyHour)busyHour.textContent=s.topHour.value?s.topHour.label+"h":"calme";
    if(count)count.textContent=list.length+" evenement"+(list.length>1?"s":"")+" trouves";
    if(feed)feed.innerHTML=limited.length?limited.map(itemHTML).join("")+(list.length>limited.length?'<div class="aic-more">+'+(list.length-limited.length)+' evenements masques par performance.</div>':''):'<div class="timeline-empty"><i data-lucide="history"></i><strong>Aucune activite trouvee</strong><span>Essayez une autre recherche, un autre filtre ou reinitialisez la vue.</span></div>';
    if(heat)heat.innerHTML=heatmapHTML();
    if(breakdown)breakdown.innerHTML=breakdownHTML(list);
    if(workspaceBars)workspaceBars.innerHTML=barListHTML(topEntries(countBy(list,function(e){return e.workspace&&e.workspace.name||"ETHONE"}),8),"Aucun workspace detecte");
    if(calendar)calendar.innerHTML=calendarHTML();
    if(month)month.textContent=state.month.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
    if(rangeLabelEl)rangeLabelEl.textContent=rangeLabel();
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function resetFilters(){
    state.category="all";state.source="all";state.workspace="all";state.user="all";state.range="30d";state.query="";state.date="";
    renderActivityPage();
  }
  function exportActivity(){
    if(!api())return;
    var data=JSON.stringify(api().items(),null,2);
    var blob=new Blob([data],{type:"application/json"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="ethone-activity-insights.json";
    a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href)},500);
  }
  function runAction(id){
    if(!id)return;
    if(typeof window.runAction==="function")window.runAction(id,{source:"activity-insights"});
    else if(window.ETHONEActions&&typeof window.ETHONEActions.run==="function")window.ETHONEActions.run(id,{source:"activity-insights"});
    else if(typeof window.switchPage==="function")window.switchPage(id.replace(".open",""),null);
  }
  function install(){
    ensurePage();
    document.addEventListener("input",function(e){
      if(e.target&&e.target.id==="activity-search"){
        clearTimeout(inputTimer);
        var value=e.target.value;
        inputTimer=setTimeout(function(){state.query=value;state.date="";renderActivityPage()},120);
      }
    });
    document.addEventListener("change",function(e){
      if(e.target&&e.target.id==="activity-workspace-filter"){state.workspace=e.target.value;renderActivityPage();return}
      if(e.target&&e.target.id==="activity-user-filter"){state.user=e.target.value;renderActivityPage();return}
    });
    document.addEventListener("click",function(e){
      var cat=e.target.closest("[data-tl-category]");
      if(cat){state.category=cat.dataset.tlCategory;state.date="";renderActivityPage();return}
      var range=e.target.closest("[data-aic-range]");
      if(range){state.range=range.dataset.aicRange;state.date="";renderActivityPage();return}
      var source=e.target.closest("[data-aic-source]");
      if(source){state.source=source.dataset.aicSource;state.date="";renderActivityPage();return}
      var month=e.target.closest("[data-tl-month]");
      if(month){state.month=new Date(state.month.getFullYear(),state.month.getMonth()+Number(month.dataset.tlMonth),1);renderActivityPage();return}
      var day=e.target.closest("[data-tl-date]");
      if(day){state.date=day.dataset.tlDate;state.query="";state.category="all";state.range="all";renderActivityPage();return}
      var query=e.target.closest("[data-aic-query]");
      if(query){state.query=query.dataset.aicQuery||"";state.date="";renderActivityPage();return}
      var action=e.target.closest("[data-aic-run-action]");
      if(action){runAction(action.dataset.aicRunAction);return}
      if(e.target.closest("[data-tl-reset]")){resetFilters();return}
      if(e.target.closest("[data-tl-clear]")){if(api()&&confirm("Effacer tout le journal Activity ?"))api().clear();return}
      if(e.target.closest("[data-tl-export]")){exportActivity();return}
    });
    window.addEventListener("ethone:timeline",function(){
      var page=document.getElementById("page-activity");
      if(page&&page.classList.contains("active"))renderActivityPage();
    });
    window.addEventListener("ethone:page-ready",function(e){
      if(e.detail&&(e.detail.page==="activity"||e.detail.page==="timeline"))renderActivityPage();
    });
    renderActivityPage();
  }

  window.renderActivityPage=renderActivityPage;
  window.renderTimelinePage=renderActivityPage;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
