/* ETHONE Analytics VNext.
 * Renders the Statistics page as a lightweight insight center using existing
 * profile state only. No backend calls, no heavy chart dependency.
 */
(function(){
  "use strict";

  var MS_DAY=86400000;
  var COLORS={
    focus:"#f87171",
    spotify:"#a78bfa",
    github:"#8b5cf6",
    habits:"#fbbf24",
    goals:"#34d399",
    gaming:"#fb7185",
    discord:"#c4b5fd",
    productivity:"#7c6df8",
    muted:"rgba(255,255,255,.12)"
  };

  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function state(){var p=profile();return p&&p.state?p.state:{}}
  function esc(value){
    if(typeof window.escapeHTML==="function")return window.escapeHTML(value);
    return String(value==null?"":value).replace(/[&<>"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]});
  }
  function dayKey(date){return new Date(date).toLocaleDateString("en-CA")}
  function dateAdd(days){var d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return d}
  function daysBack(count){
    return Array.from({length:count},function(_,i){
      var d=dateAdd(-(count-1)+i);
      return {date:d,key:dayKey(d),label:d.toLocaleDateString(undefined,{weekday:"short"}).slice(0,2),day:d.getDate()};
    });
  }
  function safeNum(v){return Number.isFinite(Number(v))?Number(v):0}
  function pct(value,total){return total>0?Math.max(0,Math.min(100,Math.round(value/total*100))):0}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function list(value){return Array.isArray(value)?value:[]}
  function text(value){return String(value==null?"":value)}
  function hasText(item,needle){
    var raw=text(item&&item.title)+" "+text(item&&item.body)+" "+text(item&&item.text)+" "+text(item&&item.source)+" "+text(item&&item.category);
    return raw.toLowerCase().indexOf(needle)>-1;
  }
  function timeline(){
    try{
      if(window.ETHONETimeline&&typeof window.ETHONETimeline.items==="function")return list(window.ETHONETimeline.items());
    }catch(e){}
    var s=state();
    return list(s.timeline).concat(list(s.activity));
  }

  function focusMinutesOn(key){
    return list(state().pomoHistory).reduce(function(sum,item){
      if(!item||!item.ts||dayKey(item.ts)!==key)return sum;
      return sum+Math.round(safeNum(item.duration||1500)/60);
    },0);
  }
  function completedTasksOn(key){
    return list(state().todos).filter(function(t){return t&&t.done&&t.doneAt&&dayKey(t.doneAt)===key}).length;
  }
  function notesOn(key){
    return list(state().notes).filter(function(n){return n&&(n.ts||n.createdAt||n.updatedAt)&&dayKey(n.ts||n.createdAt||n.updatedAt)===key}).length;
  }
  function timelineCountOn(key,needle){
    return timeline().filter(function(item){return item&&item.ts&&dayKey(item.ts)===key&&(!needle||hasText(item,needle))}).length;
  }
  function connectionSignal(name){
    var s=state();
    var con=s.connections||{};
    var obj=con[name]||s[name]||{};
    if(obj&&typeof obj==="object"){
      return !!(obj.connected||obj.username||obj.userId||obj.token||obj.data||obj.displayName||obj.steamId||obj.apiKey||obj.lastSync);
    }
    return !!obj;
  }
  function habitDoneOn(habit,key){
    if(!habit)return false;
    if(habit.log&&habit.log[key])return true;
    if(habit.days&&habit.days[key])return true;
    if(habit.history&&habit.history[key])return true;
    return false;
  }
  function sourceForDay(key){
    var s=state();
    var spotify=timelineCountOn(key,"spotify")+timelineCountOn(key,"last.fm")+timelineCountOn(key,"music");
    if(!spotify&&connectionSignal("spotify"))spotify=Math.round(focusMinutesOn(key)/45);
    var github=timelineCountOn(key,"github")+timelineCountOn(key,"commit")+timelineCountOn(key,"pull request");
    var discord=timelineCountOn(key,"discord");
    var gaming=timelineCountOn(key,"valorant")+timelineCountOn(key,"steam")+timelineCountOn(key,"gaming")+timelineCountOn(key,"twitch");
    if(!gaming&&s.gaming&&typeof s.gaming==="object")gaming=safeNum(s.gaming.sessions||s.gaming.matches||0);
    var goals=list(s.goals).filter(function(g){
      return (g.done&&(!g.doneAt||dayKey(g.doneAt)===key))||(g.updatedAt&&dayKey(g.updatedAt)===key);
    }).length;
    var habits=list(s.habits).filter(function(h){return habitDoneOn(h,key)}).length;
    return {
      focus:focusMinutesOn(key),
      spotify:spotify,
      github:github,
      habits:habits,
      goals:goals,
      gaming:gaming,
      discord:discord,
      productivity:completedTasksOn(key)+notesOn(key)+timelineCountOn(key,"task")
    };
  }
  function series(days){
    return daysBack(days).map(function(d){return Object.assign({},d,sourceForDay(d.key))});
  }
  function sum(data,key){return data.reduce(function(total,row){return total+safeNum(row[key])},0)}
  function avg(data,key){return data.length?sum(data,key)/data.length:0}
  function trend(current,previous){
    if(previous<=0&&current>0)return "+100%";
    if(previous<=0)return "0%";
    var diff=Math.round((current-previous)/previous*100);
    return (diff>0?"+":"")+diff+"%";
  }
  function score(data){
    var focus=Math.min(sum(data,"focus")/60,20);
    var tasks=sum(data,"productivity")*3;
    var habits=sum(data,"habits")*2;
    var goals=sum(data,"goals")*4;
    return clamp(Math.round(focus*2+tasks+habits+goals),0,100);
  }

  function ensureShell(){
    var page=document.getElementById("page-stats");
    if(!page)return null;
    page.classList.add("analytics-vnext-ready");
    var root=document.getElementById("analytics-vnext-root");
    if(!root){
      root=document.createElement("section");
      root.id="analytics-vnext-root";
      root.className="analytics-vnext-root";
      var statsRow=page.querySelector(".stats-row");
      if(statsRow&&statsRow.parentNode)statsRow.parentNode.insertBefore(root,statsRow.nextSibling);
      else page.appendChild(root);
    }
    Array.from(page.children).forEach(function(child){
      if(child.id==="analytics-vnext-root"||child.classList.contains("topbar")||child.classList.contains("stats-row"))return;
      child.classList.add("analytics-legacy-panel");
    });
    return root;
  }

  function metricCard(label,value,sub,color,kind){
    return '<article class="anv-metric" style="--anv-accent:'+color+'">'+
      '<div class="anv-metric-top"><span>'+esc(label)+'</span><b>'+esc(kind||"LIVE")+'</b></div>'+
      '<strong>'+esc(value)+'</strong>'+
      '<small>'+esc(sub)+'</small>'+
    '</article>';
  }
  function panel(title,subtitle,body,extraClass){
    return '<section class="anv-panel '+(extraClass||"")+'">'+
      '<div class="anv-panel-head"><div><h3>'+esc(title)+'</h3>'+(subtitle?'<p>'+esc(subtitle)+'</p>':'')+'</div></div>'+
      body+
    '</section>';
  }
  function barChart(data,key,color,unit){
    var max=Math.max.apply(null,data.map(function(row){return safeNum(row[key])}).concat([1]));
    return '<div class="anv-bars" role="img" aria-label="'+esc(key)+' trend">'+data.map(function(row){
      var value=safeNum(row[key]);
      var height=Math.max(4,Math.round(value/max*100));
      return '<span class="anv-bar" style="--h:'+height+'%;--c:'+color+'" title="'+esc(row.key+': '+value+(unit||''))+'"><i></i><em>'+esc(row.label)+'</em></span>';
    }).join("")+'</div>';
  }
  function lineChart(data,key,color){
    var values=data.map(function(row){return safeNum(row[key])});
    var max=Math.max.apply(null,values.concat([1]));
    var points=values.map(function(v,i){
      var x=data.length<=1?0:(i/(data.length-1))*100;
      var y=100-(v/max*82+9);
      return x.toFixed(2)+","+y.toFixed(2);
    }).join(" ");
    return '<svg class="anv-line" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="'+esc(key)+' line chart">'+
      '<polyline points="'+points+'" fill="none" stroke="'+esc(color)+'" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"></polyline>'+
      '<linearGradient id="anv-grad-'+esc(key)+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+esc(color)+'" stop-opacity=".28"/><stop offset="1" stop-color="'+esc(color)+'" stop-opacity="0"/></linearGradient>'+
    '</svg>';
  }
  function donut(rows){
    var total=rows.reduce(function(t,row){return t+safeNum(row.value)},0)||1;
    var offset=25;
    var rings=rows.map(function(row){
      var dash=(safeNum(row.value)/total)*100;
      var html='<circle r="15.915" cx="18" cy="18" style="stroke:'+esc(row.color)+';stroke-dasharray:'+dash+' '+(100-dash)+';stroke-dashoffset:'+offset+'"></circle>';
      offset-=dash;
      return html;
    }).join("");
    return '<div class="anv-donut-wrap"><svg class="anv-donut" viewBox="0 0 36 36"><circle r="15.915" cx="18" cy="18" class="base"></circle>'+rings+'</svg>'+
      '<div class="anv-donut-legend">'+rows.map(function(row){return '<span><i style="background:'+esc(row.color)+'"></i>'+esc(row.label)+' <b>'+esc(row.value)+'</b></span>';}).join("")+'</div></div>';
  }
  function heatmap(data,keys){
    var max=Math.max.apply(null,data.map(function(row){return keys.reduce(function(t,key){return t+safeNum(row[key])},0)}).concat([1]));
    return '<div class="anv-heatmap" role="img" aria-label="analytics heatmap">'+data.map(function(row){
      var total=keys.reduce(function(t,key){return t+safeNum(row[key])},0);
      var level=total?Math.max(1,Math.ceil(total/max*4)):0;
      return '<span data-level="'+level+'" title="'+esc(row.key+': '+total+' signals')+'"></span>';
    }).join("")+'</div>';
  }
  function comparison(rows){
    var max=Math.max.apply(null,rows.map(function(r){return safeNum(r.current)}).concat(rows.map(function(r){return safeNum(r.previous)}),[1]));
    return '<div class="anv-compare">'+rows.map(function(row){
      return '<div class="anv-compare-row">'+
        '<div class="anv-compare-label"><strong>'+esc(row.label)+'</strong><span>'+esc(trend(row.current,row.previous))+'</span></div>'+
        '<div class="anv-compare-bars"><i style="--w:'+pct(row.current,max)+'%;--c:'+row.color+'"></i><b style="--w:'+pct(row.previous,max)+'%"></b></div>'+
      '</div>';
    }).join("")+'</div>';
  }
  function integrationStatus(){
    var services=["spotify","github","discord","steam","twitch","valorant"];
    return '<div class="anv-service-grid">'+services.map(function(name){
      var connected=connectionSignal(name);
      return '<div class="anv-service '+(connected?"on":"off")+'"><span>'+esc(name.slice(0,2).toUpperCase())+'</span><strong>'+esc(name.charAt(0).toUpperCase()+name.slice(1))+'</strong><em>'+esc(connected?"Connected":"Local signals")+'</em></div>';
    }).join("")+'</div>';
  }
  function insightText(data,prev){
    var focus=sum(data,"focus");
    var productivity=sum(data,"productivity");
    var habits=sum(data,"habits");
    var best=[["Focus",focus],["Productivity",productivity],["Habits",habits],["GitHub",sum(data,"github")],["Gaming",sum(data,"gaming")]].sort(function(a,b){return b[1]-a[1]})[0];
    var delta=trend(score(data),score(prev));
    if(!best||best[1]===0)return "ETHONE has enough structure to start tracking, but this period has very few timestamped signals. Complete tasks, focus sessions or sync integrations to unlock richer analytics.";
    return best[0]+" is the strongest signal this period. Your operating score moved "+delta+" versus the previous period, based on focus, tasks, habits and goals.";
  }
  function recentActivity(){
    var items=timeline().slice().sort(function(a,b){return new Date(b.ts||0)-new Date(a.ts||0)}).slice(0,8);
    if(!items.length)return '<div class="anv-empty">No recent activity yet.</div>';
    return '<div class="anv-feed">'+items.map(function(item){
      var d=item.ts?new Date(item.ts):null;
      var when=d?d.toLocaleDateString(undefined,{month:"short",day:"numeric"})+" "+d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}):"";
      return '<div><span></span><strong>'+esc(item.title||item.text||"Activity")+'</strong><em>'+esc(when)+'</em></div>';
    }).join("")+'</div>';
  }

  function renderAnalyticsExtra(){
    var root=ensureShell();
    if(!root)return;
    var data=series(14);
    var previous=series(28).slice(0,14);
    var month=series(30);
    var focus=sum(data,"focus");
    var spotify=sum(data,"spotify");
    var github=sum(data,"github");
    var habits=sum(data,"habits");
    var goals=sum(data,"goals");
    var gaming=sum(data,"gaming");
    var discord=sum(data,"discord");
    var productivity=sum(data,"productivity");
    var currentScore=score(data);
    var previousScore=score(previous);
    var sourceRows=[
      {label:"Focus",value:Math.round(focus/60*10)/10,color:COLORS.focus},
      {label:"Spotify",value:spotify,color:COLORS.spotify},
      {label:"GitHub",value:github,color:COLORS.github},
      {label:"Habits",value:habits,color:COLORS.habits},
      {label:"Goals",value:goals,color:COLORS.goals},
      {label:"Gaming",value:gaming,color:COLORS.gaming},
      {label:"Discord",value:discord,color:COLORS.discord}
    ];
    root.innerHTML=
      '<section class="anv-hero">'+
        '<div><span>Analytics OS</span><h2>Control center for your digital life.</h2><p>'+esc(insightText(data,previous))+'</p></div>'+
        '<div class="anv-score"><b>'+currentScore+'</b><span>Operating score</span><em>'+esc(trend(currentScore,previousScore))+' vs previous 14 days</em></div>'+
      '</section>'+
      '<section class="anv-metrics">'+
        metricCard("Temps Focus",focus>=60?(focus/60).toFixed(1)+"h":focus+"m",trend(focus,sum(previous,"focus"))+" vs previous",COLORS.focus,"FOCUS")+
        metricCard("Temps Spotify",spotify+" signals",connectionSignal("spotify")?"Connected data + timeline":"Timeline estimate",COLORS.spotify,"MUSIC")+
        metricCard("Commits GitHub",github+" signals",connectionSignal("github")?"GitHub connected":"From timeline",COLORS.github,"DEV")+
        metricCard("Productivite",productivity+" actions",trend(productivity,sum(previous,"productivity"))+" vs previous",COLORS.productivity,"WORK")+
      '</section>'+
      '<section class="anv-grid primary">'+
        panel("Tendances principales","Focus, productivity, integrations and gaming over 14 days.",
          '<div class="anv-chart-stack">'+
            '<div><div class="anv-chart-label">Focus time</div>'+barChart(data,"focus",COLORS.focus," min")+'</div>'+
            '<div><div class="anv-chart-label">Productivity</div>'+lineChart(data,"productivity",COLORS.productivity)+'</div>'+
          '</div>',"wide")+
        panel("Repartition des signaux","How ETHONE understands the current period.",donut(sourceRows.filter(function(r){return r.value>0}).length?sourceRows:sourceRows.slice(0,4)),"")+
      '</section>'+
      '<section class="anv-grid secondary">'+
        panel("Heatmap 30 jours","Intensity from focus, tasks, habits, goals, integrations and gaming.",heatmap(month,["focus","productivity","habits","goals","github","spotify","discord","gaming"]),"")+
        panel("Comparaisons","Current 14 days against the previous 14 days.",
          comparison([
            {label:"Focus",current:focus,previous:sum(previous,"focus"),color:COLORS.focus},
            {label:"Productivity",current:productivity,previous:sum(previous,"productivity"),color:COLORS.productivity},
            {label:"Habits",current:habits,previous:sum(previous,"habits"),color:COLORS.habits},
            {label:"Gaming",current:gaming,previous:sum(previous,"gaming"),color:COLORS.gaming}
          ]),"")+
        panel("Integrations","Connected services and local analytics readiness.",integrationStatus(),"")+
      '</section>'+
      '<section class="anv-grid tertiary">'+
        panel("Habitudes et objectifs","Completion signals from habits and weekly goals.",
          '<div class="anv-mini-list">'+
            '<div><strong>'+habits+'</strong><span>habit completions</span></div>'+
            '<div><strong>'+goals+'</strong><span>goal signals</span></div>'+
            '<div><strong>'+Math.round(avg(data,"habits")*10)/10+'</strong><span>daily habit avg</span></div>'+
          '</div>'+barChart(data,"habits",COLORS.habits),"")+
        panel("Gaming et Discord","Session signals from gaming pages, timeline and integrations.",
          '<div class="anv-mini-list">'+
            '<div><strong>'+gaming+'</strong><span>gaming signals</span></div>'+
            '<div><strong>'+discord+'</strong><span>Discord signals</span></div>'+
            '<div><strong>'+sum(data,"spotify")+'</strong><span>music signals</span></div>'+
          '</div>'+barChart(data,"gaming",COLORS.gaming),"")+
        panel("Activite recente","Latest events used by Analytics.",recentActivity(),"")+
      '</section>';
  }

  window.renderAnalyticsExtra=renderAnalyticsExtra;
})();
