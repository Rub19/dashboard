/* ETHONE Database Builder — Timeline (Gantt) view. Net-new: CSS Grid date-axis, one grid column per day, drag-to-reschedule via the same manual mousedown/mousemove/mouseup pattern used for column/widget resizing elsewhere in the app. */

function dbDaysBetween(a,b){
  var d1=new Date(a+"T00:00:00"),d2=new Date(b+"T00:00:00");
  return Math.round((d2-d1)/86400000);
}
function dbFmtISODate(d){
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function dbTimelineDateRange(db,view){
  var startCol=view.config.startColumn,endCol=view.config.endColumn;
  var rows=dbRows(db);
  var dates=[];
  rows.forEach(function(r){
    if(startCol&&r[startCol])dates.push(r[startCol]);
    if(endCol&&r[endCol])dates.push(r[endCol]);
  });
  var today=new Date().toISOString().slice(0,10);
  if(!dates.length)dates=[today];
  dates.sort();
  var min=new Date(dates[0]+"T00:00:00");
  var max=new Date(dates[dates.length-1]+"T00:00:00");
  min.setDate(min.getDate()-3);
  max.setDate(max.getDate()+7);
  return {startDate:dbFmtISODate(min),endDate:dbFmtISODate(max)};
}
function dbTimelineZoomLevel(dayCount){return dayCount>60?"week":"day";}

function dbRenderTimeline(container,db,view){
  if(!view.config)view.config={startColumn:null,endColumn:null};
  var dateCols=dbColumns(db).filter(function(c){return c.type==="date";});
  var startCol=view.config.startColumn?dbColumnByKey(db,view.config.startColumn):null;
  var endColDef=view.config.endColumn?dbColumnByKey(db,view.config.endColumn):null;
  container.innerHTML=
    '<div class="db-timeline-toolbar">'+
      '<button type="button" class="db-toolbar-btn" id="db-tl-start-btn">'+DB_COLUMNS_SVG+'<span>'+(startCol?("Début : "+dbEsc(startCol.label)):dbEsc(t("db_start_date")))+"</span></button>"+
      '<button type="button" class="db-toolbar-btn" id="db-tl-end-btn">'+DB_COLUMNS_SVG+'<span>'+(endColDef?("Fin : "+dbEsc(endColDef.label)):dbEsc(t("db_end_date")))+"</span></button>"+
    "</div>"+
    '<div class="db-timeline-wrap" id="db-timeline-wrap"></div>';
  container.querySelector("#db-tl-start-btn").addEventListener("click",function(e){
    var items=dateCols.map(function(c){return {value:c.key,label:c.label};});
    dbOpenDropdown(e.currentTarget,{title:t("db_start_date"),searchable:false,items:items,selected:view.config.startColumn||"",onChange:function(val){
      view.config.startColumn=val||null;dbTouch(db);saveStateNow();dbRerenderView();
    }});
  });
  container.querySelector("#db-tl-end-btn").addEventListener("click",function(e){
    var items=[{value:"",label:"Aucune"}].concat(dateCols.map(function(c){return {value:c.key,label:c.label};}));
    dbOpenDropdown(e.currentTarget,{title:t("db_end_date"),searchable:false,items:items,selected:view.config.endColumn||"",onChange:function(val){
      view.config.endColumn=val||null;dbTouch(db);saveStateNow();dbRerenderView();
    }});
  });
  if(!startCol){
    container.querySelector("#db-timeline-wrap").innerHTML='<div class="db-empty">Choisissez au moins une colonne date de début.</div>';
    return;
  }
  dbRenderTimelineGrid(container,db,view,startCol);
}
function dbRenderTimelineGrid(container,db,view,startCol){
  var wrap=container.querySelector("#db-timeline-wrap");
  var range=dbTimelineDateRange(db,view);
  var dayCount=dbDaysBetween(range.startDate,range.endDate)+1;
  var zoom=dbTimelineZoomLevel(dayCount);
  var dayWidth=zoom==="week"?14:32;
  var endCol=view.config.endColumn?dbColumnByKey(db,view.config.endColumn):null;
  var primary=dbPrimaryColumn(db);
  var gridTemplate="200px repeat("+dayCount+","+dayWidth+"px)";
  var startD=new Date(range.startDate+"T00:00:00");
  var headHTML='<div class="db-timeline-head" style="grid-template-columns:'+gridTemplate+'"><div class="db-timeline-head-label"></div>';
  for(var i=0;i<dayCount;i++){
    var d=new Date(startD);d.setDate(d.getDate()+i);
    var dow=d.getDay();
    headHTML+='<div class="db-timeline-day'+(dow===0||dow===6?" weekend":"")+'">'+d.getDate()+"</div>";
  }
  headHTML+="</div>";
  var rows=dbRows(db);
  var rowsHTML=rows.map(function(r){
    var rowHTML='<div class="db-timeline-row" style="grid-template-columns:'+gridTemplate+'" data-id="'+r.id+'">'+
      '<div class="db-timeline-row-label">'+dbEsc((primary&&r[primary.key])||"Sans titre")+"</div>";
    var start=r[startCol.key];
    if(start){
      var startOffset=dbDaysBetween(range.startDate,start);
      var end=endCol?r[endCol.key]:null;
      if(end){
        var span=Math.max(1,dbDaysBetween(start,end)+1);
        rowHTML+='<div class="db-timeline-bar" data-id="'+r.id+'" style="grid-column:'+(startOffset+2)+" / span "+span+'">'+
          '<span class="db-timeline-handle left" data-edge="start"></span>'+
          '<span class="db-timeline-bar-label">'+dbEsc((primary&&r[primary.key])||"")+"</span>"+
          '<span class="db-timeline-handle right" data-edge="end"></span>'+
        "</div>";
      }else{
        rowHTML+='<div class="db-timeline-point" data-id="'+r.id+'" style="grid-column:'+(startOffset+2)+'"></div>';
      }
    }
    rowHTML+="</div>";
    return rowHTML;
  }).join("");
  wrap.innerHTML=headHTML+rowsHTML;
  dbWireTimelineEvents(container,wrap,db,view,startCol,endCol,dayWidth);
}
function dbWireTimelineEvents(container,wrap,db,view,startCol,endCol,dayWidth){
  wrap.querySelectorAll(".db-timeline-point").forEach(function(el){
    el.addEventListener("click",function(){dbOpenDetail(db,parseInt(el.dataset.id,10));});
  });
  wrap.querySelectorAll(".db-timeline-bar").forEach(function(bar){
    bar.addEventListener("click",function(e){
      if(e.target.classList.contains("db-timeline-handle"))return;
      if(bar.dataset.dragged==="1"){bar.dataset.dragged="";return;}
      dbOpenDetail(db,parseInt(bar.dataset.id,10));
    });
    if(!endCol)return;
    bar.addEventListener("mousedown",function(e){
      if(e.target.classList.contains("db-timeline-handle"))return;
      dbStartTimelineDrag(container,db,view,startCol,endCol,dayWidth,e,bar,"move");
    });
  });
  if(!endCol)return;
  wrap.querySelectorAll(".db-timeline-handle").forEach(function(handle){
    handle.addEventListener("mousedown",function(e){
      e.preventDefault();e.stopPropagation();
      dbStartTimelineDrag(container,db,view,startCol,endCol,dayWidth,e,handle.closest(".db-timeline-bar"),handle.dataset.edge);
    });
  });
}
function dbStartTimelineDrag(container,db,view,startCol,endCol,dayWidth,e,bar,mode){
  e.preventDefault();
  var id=parseInt(bar.dataset.id,10);
  var row=dbRows(db).find(function(r){return r.id===id;});
  if(!row)return;
  var startX=e.clientX;
  var origStart=row[startCol.key],origEnd=row[endCol.key];
  var lastDelta=0,moved=false;
  function shift(dateStr,deltaDays){
    var d=new Date(dateStr+"T00:00:00");d.setDate(d.getDate()+deltaDays);
    return dbFmtISODate(d);
  }
  function onMove(ev){
    var deltaDays=Math.round((ev.clientX-startX)/dayWidth);
    if(deltaDays===lastDelta)return;
    lastDelta=deltaDays;moved=true;
    if(mode==="move"){
      row[startCol.key]=shift(origStart,deltaDays);
      row[endCol.key]=shift(origEnd,deltaDays);
    }else if(mode==="start"){
      var ns=shift(origStart,deltaDays);
      if(ns<=origEnd)row[startCol.key]=ns;
    }else{
      var ne=shift(origEnd,deltaDays);
      if(ne>=origStart)row[endCol.key]=ne;
    }
    bar.dataset.dragged="1";
    dbRenderTimelineGrid(container,db,view,startCol);
  }
  function onUp(){
    document.removeEventListener("mousemove",onMove);
    document.removeEventListener("mouseup",onUp);
    if(moved){dbTouch(db);saveStateNow();}
  }
  document.addEventListener("mousemove",onMove);
  document.addEventListener("mouseup",onUp);
}
