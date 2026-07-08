/* ETHONE Database Builder — List view. Lightweight Notion-style row list backed by the shared filter/sort pipeline. */
function dbRenderListView(container,db,view){
  if(!view.config)view.config={titleColumn:null,sort:[],filters:[]};
  if(!Array.isArray(view.config.sort))view.config.sort=[];
  if(!Array.isArray(view.config.filters))view.config.filters=[];
  var titleCol=view.config.titleColumn?dbColumnByKey(db,view.config.titleColumn):dbPrimaryColumn(db);
  container.innerHTML=
    '<div class="db-list-toolbar">'+
      '<div class="db-search-wrap">'+DB_SEARCH_SVG+'<input type="text" id="db-search" class="db-search-input" placeholder="Rechercher..." autocomplete="off"></div>'+
      '<div class="db-toolbar-right">'+
        '<button type="button" class="db-toolbar-btn" id="db-filter-btn"><span>Filtres</span><b class="db-toolbar-count" id="db-filter-count"></b></button>'+
        '<button type="button" class="db-toolbar-btn" id="db-sort-btn"><span>Tri</span><b class="db-toolbar-count" id="db-sort-count"></b></button>'+
        '<button type="button" class="db-toolbar-btn" id="db-list-title-btn">'+DB_COLUMNS_SVG+'<span>'+(titleCol?("Titre : "+dbEsc(titleCol.label)):"Titre")+'</span></button>'+
        '<button type="button" class="db-toolbar-btn primary" id="db-list-add-btn">'+DB_PLUS_SVG+'<span>'+dbEsc(t("db_add_row"))+'</span></button>'+
      '</div>'+
    '</div>'+
    '<div class="db-list-view" id="db-list-view"></div>';
  container.querySelector("#db-search").addEventListener("input",function(){dbRenderListRows(container,db,view);});
  container.querySelector("#db-list-add-btn").addEventListener("click",function(){
    var row=dbAddRow(db);
    dbRenderListRows(container,db,view);
    setTimeout(function(){dbOpenDetail(db,row.id);},50);
  });
  container.querySelector("#db-list-title-btn").addEventListener("click",function(e){
    var items=dbVisibleColumns(db).map(function(c){return {value:c.key,label:c.label};});
    dbOpenDropdown(e.currentTarget,{title:"Colonne titre",searchable:false,items:items,selected:view.config.titleColumn||"",onChange:function(val){
      view.config.titleColumn=val||null;
      dbTouch(db);saveStateNow();
      dbRerenderView();
    }});
  });
  if(typeof dbWireFilterSortButtons==="function")dbWireFilterSortButtons(container,db,view);
  dbRenderListRows(container,db,view);
}
function dbRenderListRows(container,db,view){
  var host=container.querySelector("#db-list-view");
  if(!host)return;
  var titleCol=view.config.titleColumn?dbColumnByKey(db,view.config.titleColumn):dbPrimaryColumn(db);
  var metaCols=dbVisibleColumns(db).filter(function(c){return !c.primary&&(!titleCol||c.key!==titleCol.key);}).slice(0,4);
  var rows=(typeof dbGetFilteredRows==="function")?dbGetFilteredRows(db,view):dbRows(db);
  if(!rows.length){
    host.innerHTML='<div class="db-empty">Aucune ligne ne correspond à cette vue.</div>';
    return;
  }
  host.innerHTML=rows.map(function(row){
    var title=(titleCol&&row[titleCol.key])||"Sans titre";
    return '<article class="db-list-row" data-id="'+row.id+'">'+
      '<div class="db-list-row-icon">'+dbEsc(row.icon||String(title).slice(0,1)||"•")+'</div>'+
      '<div class="db-list-row-main"><strong>'+dbEsc(title)+'</strong><div class="db-list-row-meta">'+metaCols.map(function(c){return '<span>'+dbCellHTML(db,row,c)+'</span>';}).join("")+'</div></div>'+
      '<button type="button" class="db-mini-btn db-list-open" data-id="'+row.id+'">Ouvrir</button>'+
    '</article>';
  }).join("");
  host.querySelectorAll(".db-list-row").forEach(function(rowEl){
    rowEl.addEventListener("click",function(e){
      if(e.target.closest("a,button"))return;
      dbOpenDetail(db,parseInt(rowEl.dataset.id,10));
    });
  });
  host.querySelectorAll(".db-list-open").forEach(function(btn){
    btn.addEventListener("click",function(){dbOpenDetail(db,parseInt(btn.dataset.id,10));});
  });
}
