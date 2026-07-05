/* ETHONE Database Builder — Gallery view: card grid keyed off a chosen image column + title column. */

function dbRenderGallery(container,db,view){
  if(!view.config)view.config={imageColumn:null,titleColumn:null,metaColumns:[]};
  var imageCols=dbColumns(db).filter(function(c){return c.type==="image";});
  var imageCol=view.config.imageColumn?dbColumnByKey(db,view.config.imageColumn):null;
  var titleCol=view.config.titleColumn?dbColumnByKey(db,view.config.titleColumn):dbPrimaryColumn(db);
  container.innerHTML=
    '<div class="db-gallery-toolbar">'+
      '<button type="button" class="db-toolbar-btn" id="db-gallery-image-btn">'+DB_COLUMNS_SVG+'<span>'+(imageCol?("Image : "+dbEsc(imageCol.label)):"Choisir une image")+"</span></button>"+
      '<button type="button" class="db-toolbar-btn primary" id="db-gallery-add-btn">'+DB_PLUS_SVG+"<span>"+dbEsc(t("db_add_row"))+"</span></button>"+
    "</div>"+
    '<div class="db-gallery-grid" id="db-gallery-grid"></div>';
  container.querySelector("#db-gallery-image-btn").addEventListener("click",function(e){
    var items=imageCols.map(function(c){return {value:c.key,label:c.label};});
    dbOpenDropdown(e.currentTarget,{title:t("db_image_column"),searchable:false,items:items,selected:view.config.imageColumn||"",onChange:function(val){
      view.config.imageColumn=val||null;
      dbTouch(db);saveStateNow();
      dbRerenderView();
    }});
  });
  container.querySelector("#db-gallery-add-btn").addEventListener("click",function(){
    var row=dbAddRow(db);
    dbRenderGalleryGrid(container,db,view,imageCol,titleCol);
    setTimeout(function(){dbOpenDetail(db,row.id);},50);
  });
  dbRenderGalleryGrid(container,db,view,imageCol,titleCol);
}
function dbRenderGalleryGrid(container,db,view,imageCol,titleCol){
  var grid=container.querySelector("#db-gallery-grid");
  var rows=dbRows(db);
  var metaCols=dbVisibleColumns(db).filter(function(c){return !c.primary&&(!imageCol||c.key!==imageCol.key);}).slice(0,2);
  grid.innerHTML=rows.map(function(r){
    var imgSrc=imageCol?r[imageCol.key]:null;
    var title=(titleCol&&r[titleCol.key])||"Sans titre";
    return '<div class="db-gallery-card" data-id="'+r.id+'">'+
      (imgSrc?'<img class="db-gallery-card-image" src="'+dbEsc(imgSrc)+'" onerror="this.remove()">':'<div class="db-gallery-card-fallback">'+dbEsc(String(title)[0]||"?")+"</div>")+
      '<div class="db-gallery-card-body"><div class="db-gallery-card-title">'+dbEsc(title)+'</div><div class="db-gallery-card-meta">'+metaCols.map(function(c){return dbCellHTML(db,r,c);}).join("")+"</div></div>"+
    "</div>";
  }).join("");
  grid.querySelectorAll(".db-gallery-card").forEach(function(card){
    card.addEventListener("click",function(){dbOpenDetail(db,parseInt(card.dataset.id,10));});
  });
}
