/* ETHONE Activity page */
(function(){
  "use strict";
  if(window.__ethoneActivityPage)return;
  window.__ethoneActivityPage=true;

  var state={category:"all",query:"",month:new Date(),date:""};

  function esc(v){
    return String(v==null?"":v).replace(/[&<>"']/g,function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
    });
  }
  function api(){return window.ETHONETimeline||window.ETHONEActivity}
  function categoryMap(){
    return api()&&api().categories?api().categories:{};
  }
  function categories(){
    var c=categoryMap();
    return Object.keys(c).map(function(k){return Object.assign({id:k},c[k])});
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
      '<div class="timeline-page activity-page">'+
        '<header class="timeline-hero activity-hero">'+
          '<div>'+
            '<div class="timeline-kicker">ETHONE Activity</div>'+
            '<h1>Activity</h1>'+
            '<p>Le journal complet d ETHONE: connexions, creations, modifications, suppressions, synchronisations, IA, plugins, GitHub, Discord, Spotify et Workspaces.</p>'+
          '</div>'+
          '<div class="timeline-hero-actions">'+
            '<button class="btn btn-ghost" type="button" data-tl-export>Exporter</button>'+
            '<button class="btn btn-ghost" type="button" data-tl-clear>Effacer</button>'+
          '</div>'+
        '</header>'+
        '<section class="timeline-stats" id="activity-stats"></section>'+
        '<section class="timeline-toolbar activity-toolbar">'+
          '<div class="timeline-search"><i data-lucide="search"></i><input id="activity-search" type="search" placeholder="Rechercher une action, une integration, un workspace..."></div>'+
          '<div class="timeline-filter" id="activity-filter"></div>'+
        '</section>'+
        '<section class="timeline-layout activity-layout">'+
          '<div class="timeline-panel timeline-feed-panel activity-feed-panel">'+
            '<div class="timeline-panel-head"><div><h2>Journal</h2><span id="activity-count">0 evenement</span></div><button class="activity-reset" type="button" data-tl-reset>Reinitialiser</button></div>'+
            '<div class="timeline-feed" id="activity-feed"></div>'+
          '</div>'+
          '<aside class="activity-side">'+
            '<section class="timeline-panel activity-panel">'+
              '<div class="timeline-panel-head"><div><h2>Heatmap</h2><span>84 derniers jours</span></div></div>'+
              '<div class="activity-heatmap" id="activity-heatmap"></div>'+
            '</section>'+
            '<section class="timeline-panel activity-panel">'+
              '<div class="timeline-panel-head"><div><h2>Categories</h2><span>Repartition du journal</span></div></div>'+
              '<div class="activity-breakdown" id="activity-breakdown"></div>'+
            '</section>'+
            '<section class="timeline-panel activity-panel timeline-calendar-panel">'+
              '<div class="timeline-panel-head"><div><h2>Calendrier</h2><span id="activity-month-label"></span></div><div class="timeline-month-actions"><button type="button" data-tl-month="-1" aria-label="Mois precedent"><i data-lucide="chevron-left"></i></button><button type="button" data-tl-month="1" aria-label="Mois suivant"><i data-lucide="chevron-right"></i></button></div></div>'+
              '<div class="timeline-calendar" id="activity-calendar"></div>'+
            '</section>'+
          '</aside>'+
        '</section>'+
      '</div>';
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(page,anchor);
    else document.getElementById("main-content")?.appendChild(page);
  }
  function filtered(extra){
    var options={category:state.category,query:state.query,date:state.date};
    if(extra)Object.keys(extra).forEach(function(k){options[k]=extra[k]});
    return api()?api().filtered(options):[];
  }
  function itemHTML(e){
    var d=new Date(e.ts||Date.now());
    var cat=categoryMap()[e.category]||categoryMap().system||{icon:"activity",color:"#8b5cf6"};
    return '<article class="timeline-event activity-event" data-cat="'+esc(e.category)+'">'+
      '<div class="timeline-event-icon" style="--tl-color:'+esc(e.color||cat.color)+'"><i data-lucide="'+esc(e.icon||cat.icon)+'"></i></div>'+
      '<div class="timeline-event-main">'+
        '<div class="timeline-event-meta"><span>'+esc(label(e.category))+'</span><time>'+esc(d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"}))+' - '+esc(e.time||d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}))+'</time></div>'+
        '<h3>'+esc(e.title||"Evenement ETHONE")+'</h3>'+
        (e.body?'<p>'+esc(e.body)+'</p>':'')+
        '<div class="activity-event-tags">'+
          (e.source?'<small>'+esc(e.source)+'</small>':'')+
          (e.workspace&&e.workspace.name?'<small>'+esc(e.workspace.name)+'</small>':'')+
        '</div>'+
      '</div>'+
    '</article>';
  }
  function statsHTML(list){
    var counts=api()&&api().counts?api().counts():{};
    var priority=["auth","creation","modification","deletion","sync","ai","plugin","github","discord","spotify","workspace"];
    var source=priority.map(function(id){return Object.assign({id:id},categoryMap()[id]||{})}).filter(function(c){return c.label});
    var cats=[{id:"all",label:"Total",icon:"history",color:"#8b5cf6"}].concat(source);
    return cats.slice(0,8).map(function(c){
      var n=c.id==="all"?list.length:(counts[c.id]||0);
      return '<button class="timeline-stat '+(state.category===c.id?"active":"")+'" type="button" data-tl-category="'+esc(c.id)+'"><i data-lucide="'+esc(c.icon||"activity")+'"></i><span>'+esc(c.label)+'</span><strong>'+n+'</strong></button>';
    }).join("");
  }
  function filterHTML(){
    return '<button class="'+(state.category==="all"?"active":"")+'" type="button" data-tl-category="all">Tout</button>'+categories().map(function(c){
      return '<button class="'+(state.category===c.id?"active":"")+'" type="button" data-tl-category="'+esc(c.id)+'">'+esc(c.label)+'</button>';
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
  function breakdownHTML(){
    var counts=api()&&api().counts?api().counts():{};
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
  function renderActivityPage(){
    ensurePage();
    if(!api())return;
    var list=filtered();
    var stats=document.getElementById("activity-stats");
    var filter=document.getElementById("activity-filter");
    var feed=document.getElementById("activity-feed");
    var count=document.getElementById("activity-count");
    var heat=document.getElementById("activity-heatmap");
    var breakdown=document.getElementById("activity-breakdown");
    var cal=document.getElementById("activity-calendar");
    var month=document.getElementById("activity-month-label");
    var input=document.getElementById("activity-search");
    if(input&&input.value!==state.query)input.value=state.query;
    if(stats)stats.innerHTML=statsHTML(list);
    if(filter)filter.innerHTML=filterHTML();
    if(count)count.textContent=list.length+" evenement"+(list.length>1?"s":"")+(state.date?" le "+state.date:"");
    if(feed)feed.innerHTML=list.length?list.map(itemHTML).join(""):'<div class="timeline-empty"><i data-lucide="history"></i><strong>Aucune activite trouvee</strong><span>Essayez une autre recherche ou reinitialisez les filtres.</span></div>';
    if(heat)heat.innerHTML=heatmapHTML();
    if(breakdown)breakdown.innerHTML=breakdownHTML();
    if(cal)cal.innerHTML=calendarHTML();
    if(month)month.textContent=state.month.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function resetFilters(){
    state.category="all";
    state.query="";
    state.date="";
    renderActivityPage();
  }
  function exportActivity(){
    if(!api())return;
    var data=JSON.stringify(api().items(),null,2);
    var blob=new Blob([data],{type:"application/json"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="ethone-activity.json";
    a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href)},500);
  }
  function install(){
    ensurePage();
    document.addEventListener("input",function(e){
      if(e.target&&e.target.id==="activity-search"){state.query=e.target.value;state.date="";renderActivityPage()}
    });
    document.addEventListener("click",function(e){
      var cat=e.target.closest("[data-tl-category]");
      if(cat){state.category=cat.dataset.tlCategory;state.date="";renderActivityPage();return}
      var month=e.target.closest("[data-tl-month]");
      if(month){state.month=new Date(state.month.getFullYear(),state.month.getMonth()+Number(month.dataset.tlMonth),1);renderActivityPage();return}
      var day=e.target.closest("[data-tl-date]");
      if(day){state.date=day.dataset.tlDate;state.query="";state.category="all";renderActivityPage();return}
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
