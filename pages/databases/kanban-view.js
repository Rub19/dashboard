/* ETHONE Database Builder — Kanban view (generalizes widgets/kanban.js: dynamic columns from a select/multiselect/tags column instead of the fixed todo/doing/done). */

function dbRenderKanban(container,db,view){
  if(!view.config)view.config={groupByColumn:null};
  var groupCol=view.config.groupByColumn?dbColumnByKey(db,view.config.groupByColumn):null;
  var groupable=dbColumns(db).filter(function(c){return c.type==="select"||c.type==="multiselect"||c.type==="tags";});
  container.innerHTML=
    '<div class="db-kanban-toolbar">'+
      '<button type="button" class="db-toolbar-btn" id="db-kanban-groupby-btn">'+DB_GROUP_SVG+'<span id="db-kanban-groupby-label">'+(groupCol?("Grouper : "+dbEsc(groupCol.label)):"Choisir une colonne")+"</span></button>"+
    "</div>"+
    '<div class="db-kanban-board" id="db-kanban-board"></div>';
  container.querySelector("#db-kanban-groupby-btn").addEventListener("click",function(e){
    var items=groupable.map(function(c){return {value:c.key,label:c.label};});
    dbOpenDropdown(e.currentTarget,{title:"Grouper par",searchable:false,items:items,selected:view.config.groupByColumn||"",onChange:function(val){
      view.config.groupByColumn=val||null;
      dbTouch(db);saveStateNow();
      dbRerenderView();
    }});
  });
  if(!groupCol){
    container.querySelector("#db-kanban-board").innerHTML='<div class="db-empty">Choisissez une colonne Dropdown, Multi Dropdown ou Tags pour organiser le tableau.</div>';
    return;
  }
  dbRenderKanbanBoard(container,db,view,groupCol);
}
function dbRenderKanbanBoard(container,db,view,groupCol){
  var board=container.querySelector("#db-kanban-board");
  var rows=dbRows(db);
  var options=dbOptionsFor(db,groupCol.key).slice();
  var primary=dbPrimaryColumn(db);
  var metaCols=dbVisibleColumns(db).filter(function(c){return !c.primary&&c.key!==groupCol.key;}).slice(0,2);
  var colsHTML=options.map(function(opt){
    var cards=rows.filter(function(r){
      var v=r[groupCol.key];
      return Array.isArray(v)?v.indexOf(opt.value)>-1:v===opt.value;
    });
    return '<div class="db-kanban-col" data-value="'+dbEsc(opt.value)+'">'+
      '<div class="db-kanban-col-head"><span class="db-badge" style="--bc:'+(opt.color||"#8b8b93")+'">'+(opt.icon?opt.icon+" ":"")+dbEsc(opt.label)+'</span><span class="db-kanban-col-count">'+cards.length+"</span></div>"+
      cards.map(function(r){return dbKanbanCardHTML(db,r,primary,metaCols);}).join("")+
      '<button type="button" class="db-kanban-add" data-value="'+dbEsc(opt.value)+'">+ '+dbEsc(t("db_add_row"))+"</button>"+
    "</div>";
  }).join("");
  var unassigned=rows.filter(function(r){
    var v=r[groupCol.key];
    return Array.isArray(v)?!v.length:!v;
  });
  colsHTML+='<div class="db-kanban-col" data-value="">'+
    '<div class="db-kanban-col-head"><span class="db-cell-text">Sans valeur</span><span class="db-kanban-col-count">'+unassigned.length+"</span></div>"+
    unassigned.map(function(r){return dbKanbanCardHTML(db,r,primary,metaCols);}).join("")+
    '<button type="button" class="db-kanban-add" data-value="">+ '+dbEsc(t("db_add_row"))+"</button>"+
  "</div>";
  board.innerHTML=colsHTML;
  dbWireKanbanEvents(board,db,view,groupCol);
}
function dbKanbanCardHTML(db,row,primary,metaCols){
  return '<div class="db-kanban-card" draggable="true" data-id="'+row.id+'">'+
    '<div class="db-kanban-card-title">'+dbEsc((primary&&row[primary.key])||"Sans titre")+"</div>"+
    '<div class="db-kanban-card-meta">'+metaCols.map(function(c){return dbCellHTML(db,row,c);}).join("")+"</div>"+
  "</div>";
}
function dbWireKanbanEvents(board,db,view,groupCol){
  board.querySelectorAll(".db-kanban-card").forEach(function(card){
    card.addEventListener("click",function(){dbOpenDetail(db,parseInt(card.dataset.id,10));});
    card.addEventListener("dragstart",function(e){card.classList.add("dragging");e.dataTransfer.setData("text/plain",card.dataset.id);});
    card.addEventListener("dragend",function(){card.classList.remove("dragging");});
  });
  board.querySelectorAll(".db-kanban-add").forEach(function(btn){
    btn.addEventListener("click",function(){
      var row=dbAddRow(db);
      var val=btn.dataset.value;
      if(val){
        if(groupCol.type==="multiselect"||groupCol.type==="tags")row[groupCol.key]=[val];
        else row[groupCol.key]=val;
        dbTouch(db);saveStateNow();
      }
      dbRerenderView();
      setTimeout(function(){dbOpenDetail(db,row.id);},50);
    });
  });
  board.querySelectorAll(".db-kanban-col").forEach(function(col){
    col.addEventListener("dragover",function(e){e.preventDefault();col.classList.add("drag-over");});
    col.addEventListener("dragleave",function(e){if(!col.contains(e.relatedTarget))col.classList.remove("drag-over");});
    col.addEventListener("drop",function(e){
      e.preventDefault();
      col.classList.remove("drag-over");
      var id=parseInt(e.dataTransfer.getData("text/plain"),10);
      var row=dbRows(db).find(function(r){return r.id===id;});
      if(!row)return;
      var val=col.dataset.value;
      if(groupCol.type==="multiselect"||groupCol.type==="tags")row[groupCol.key]=val?[val]:[];
      else row[groupCol.key]=val||"";
      dbTouch(db);saveStateNow();
      dbRerenderView();
    });
  });
}
