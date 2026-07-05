/* ETHONE Database Builder — Calendar view (generalizes widgets/calendar.js's month-grid math, driven by a chosen date column instead of a fixed events list). */

var _dbCalNav={};
function dbCalState(view){
  if(!_dbCalNav[view.id]){var now=new Date();_dbCalNav[view.id]={year:now.getFullYear(),month:now.getMonth()};}
  return _dbCalNav[view.id];
}
function dbBuildMonthGrid(year,month){
  var firstDay=new Date(year,month,1);
  var lastDay=new Date(year,month+1,0);
  var startDow=(firstDay.getDay()+6)%7;
  var cells=[];
  for(var i=0;i<startDow;i++)cells.push({date:new Date(year,month,1-startDow+i),inMonth:false});
  for(var day=1;day<=lastDay.getDate();day++)cells.push({date:new Date(year,month,day),inMonth:true});
  var trailing=(7-(cells.length%7))%7;
  for(var j=1;j<=trailing;j++)cells.push({date:new Date(year,month,lastDay.getDate()+j),inMonth:false});
  return cells;
}
function dbRenderCalendarView(container,db,view){
  if(!view.config)view.config={dateColumn:null};
  var dateCols=dbColumns(db).filter(function(c){return c.type==="date";});
  var dateCol=view.config.dateColumn?dbColumnByKey(db,view.config.dateColumn):null;
  container.innerHTML=
    '<div class="db-cal-toolbar">'+
      '<button type="button" class="db-toolbar-btn" id="db-cal-column-btn">'+DB_GROUP_SVG+'<span id="db-cal-column-label">'+(dateCol?("Date : "+dbEsc(dateCol.label)):"Choisir une colonne date")+"</span></button>"+
      '<button type="button" class="db-cal-nav-btn" id="db-cal-prev">‹</button>'+
      '<span class="db-cal-label" id="db-cal-label"></span>'+
      '<button type="button" class="db-cal-nav-btn" id="db-cal-next">›</button>'+
    "</div>"+
    '<div class="db-cal-grid" id="db-cal-grid"></div>';
  container.querySelector("#db-cal-column-btn").addEventListener("click",function(e){
    var items=dateCols.map(function(c){return {value:c.key,label:c.label};});
    dbOpenDropdown(e.currentTarget,{title:t("db_date_column"),searchable:false,items:items,selected:view.config.dateColumn||"",onChange:function(val){
      view.config.dateColumn=val||null;
      dbTouch(db);saveStateNow();
      dbRerenderView();
    }});
  });
  var prevBtn=container.querySelector("#db-cal-prev"),nextBtn=container.querySelector("#db-cal-next");
  if(!dateCol){
    prevBtn.disabled=true;nextBtn.disabled=true;
    return;
  }
  prevBtn.addEventListener("click",function(){dbCalNavMove(container,db,view,dateCol,-1);});
  nextBtn.addEventListener("click",function(){dbCalNavMove(container,db,view,dateCol,1);});
  dbRenderCalendarGrid(container,db,view,dateCol);
}
function dbCalNavMove(container,db,view,dateCol,dir){
  var st=dbCalState(view);
  st.month+=dir;
  if(st.month>11){st.month=0;st.year++;}
  if(st.month<0){st.month=11;st.year--;}
  dbRenderCalendarGrid(container,db,view,dateCol);
}
function dbRenderCalendarGrid(container,db,view,dateCol){
  var st=dbCalState(view);
  var months=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  var labelEl=container.querySelector("#db-cal-label");
  if(labelEl)labelEl.textContent=months[st.month]+" "+st.year;
  var cells=dbBuildMonthGrid(st.year,st.month);
  var rows=dbRows(db);
  var todayStr=new Date().toISOString().slice(0,10);
  var dow=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  var html=dow.map(function(d){return '<div class="db-cal-dow">'+d+"</div>";}).join("");
  var primary=dbPrimaryColumn(db);
  cells.forEach(function(cell){
    var y=cell.date.getFullYear(),m=cell.date.getMonth()+1,d=cell.date.getDate();
    var dateStr=y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    var dayRows=rows.filter(function(r){return r[dateCol.key]===dateStr;});
    var isToday=dateStr===todayStr;
    html+='<div class="db-cal-cell'+(cell.inMonth?"":" outside")+(isToday?" today":"")+'" data-date="'+dateStr+'">'+
      '<div class="db-cal-daynum">'+d+"</div>"+
      dayRows.slice(0,3).map(function(r){return '<div class="db-cal-item" data-id="'+r.id+'">'+dbEsc((primary&&r[primary.key])||"—")+"</div>";}).join("")+
      (dayRows.length>3?'<div class="db-cal-item">+'+(dayRows.length-3)+" autres</div>":"")+
    "</div>";
  });
  var grid=container.querySelector("#db-cal-grid");
  grid.innerHTML=html;
  grid.querySelectorAll(".db-cal-item[data-id]").forEach(function(el){
    el.addEventListener("click",function(e){e.stopPropagation();dbOpenDetail(db,parseInt(el.dataset.id,10));});
  });
  grid.querySelectorAll(".db-cal-cell").forEach(function(cellEl){
    cellEl.addEventListener("dblclick",function(){
      var row=dbAddRow(db);
      row[dateCol.key]=cellEl.dataset.date;
      dbTouch(db);saveStateNow();
      dbRenderCalendarGrid(container,db,view,dateCol);
      setTimeout(function(){dbOpenDetail(db,row.id);},50);
    });
  });
}
