/* ETHONE Database Builder — generic side detail panel. Inspired by (not copied from) pages/valorant-accounts/detail-panel.js's fieldRow() pattern, generalized to iterate any schema. */

var _dbDetailOpenId=null,_dbDetailDbId=null;
var DB_EDIT_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>';

function dbEnsureDetailDom(){
  if(document.getElementById("db-detail-overlay"))return;
  var overlay=document.createElement("div");
  overlay.id="db-detail-overlay";
  overlay.className="db-detail-overlay";
  var panel=document.createElement("div");
  panel.id="db-detail-panel";
  panel.className="db-detail-panel";
  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  overlay.addEventListener("click",dbCloseDetail);
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&panel.classList.contains("open"))dbCloseDetail();});
}
function dbFieldRow(db,row,col){
  var value=row[col.key];
  var display;
  var editable=true;
  if(col.type==="checkbox"){
    display='<span class="db-dp-value">'+(value?"Oui":"Non")+"</span>";
  }else if(col.type==="select"){
    var sd=dbOptionDef(db,col.key,value);
    display=value?'<span class="db-badge" style="--bc:'+sd.color+'">'+(sd.icon?sd.icon+" ":"")+dbEsc(sd.label)+"</span>":'<span class="db-dp-value empty">Non renseigné</span>';
  }else if(col.type==="multiselect"||col.type==="tags"){
    display=(value&&value.length)?value.map(function(v){var d=dbOptionDef(db,col.key,v);return '<span class="db-badge" style="--bc:'+(d.color||"#8b8b93")+'">'+dbEsc(d.label)+"</span>";}).join(""):'<span class="db-dp-value empty">Aucun</span>';
  }else if(col.type==="image"){
    display=value?'<img class="db-dp-image-preview" src="'+dbEsc(value)+'" onerror="this.remove()">':'<span class="db-dp-value empty">Aucune image</span>';
  }else if(col.type==="relation"){
    display=(typeof dbRelationCellHTML==="function")?dbRelationCellHTML(db,row,col):'<span class="db-dp-value empty">—</span>';
    editable=false;
  }else if(col.type==="rating"){
    display=(typeof dbRatingCellHTML==="function")?dbRatingCellHTML(db,row,col):'<span class="db-dp-value empty">—</span>';
    editable=false;
  }else if(col.type==="formula"){
    display='<span class="db-dp-value">'+(typeof dbFormulaCellHTML==="function"?dbFormulaCellHTML(db,row,col):"—")+"</span>";
    editable=false;
  }else if(col.type==="progress"){
    var pct=Math.max(0,Math.min(100,parseFloat(value)||0));
    display='<span class="db-progress-cell"><span class="db-progress-track"><span class="db-progress-fill" style="width:'+pct+'%"></span></span><span class="db-progress-label">'+pct+"%</span></span>";
  }else{
    display='<span class="db-dp-value'+(value?"":" empty")+'">'+dbEsc(value||"Non renseigné")+"</span>";
  }
  return '<div class="db-dp-field" data-col="'+col.key+'">'+
    '<div class="db-dp-field-label">'+dbEsc(col.label)+"</div>"+
    '<div class="db-dp-field-row">'+
      '<div class="db-dp-field-value">'+display+"</div>"+
      (editable?'<button type="button" class="db-mini-btn db-dp-edit" data-col="'+col.key+'" title="Modifier">'+DB_EDIT_SVG+"</button>":"")+
    "</div></div>";
}
function dbRenderDetailPanel(db,row){
  dbEnsureDetailDom();
  var panel=document.getElementById("db-detail-panel");
  var primary=dbPrimaryColumn(db);
  var title=(primary&&row[primary.key])||"Sans titre";
  var cols=dbVisibleColumns(db).filter(function(c){return !c.primary;});
  panel.innerHTML=
    '<div class="db-dp-header">'+
      '<button type="button" class="db-mini-btn db-dp-close" id="db-dp-close" title="Fermer">✕</button>'+
      '<div class="db-dp-title">'+dbEsc(title)+"</div>"+
    "</div>"+
    '<div class="db-dp-body">'+
      (primary?dbFieldRow(db,row,primary):"")+
      cols.map(function(c){return dbFieldRow(db,row,c);}).join("")+
    "</div>";
  document.getElementById("db-dp-close").addEventListener("click",dbCloseDetail);
  panel.querySelectorAll(".db-dp-edit").forEach(function(btn){
    btn.addEventListener("click",function(){dbStartDetailEdit(db,row,btn.dataset.col);});
  });
  panel.classList.add("open");
  document.getElementById("db-detail-overlay").classList.add("open");
}
function dbStartDetailEdit(db,row,colKey){
  var colDef=dbColumnByKey(db,colKey);if(!colDef)return;
  var fieldRowEl=document.querySelector('.db-dp-field[data-col="'+colKey+'"] .db-dp-field-row');
  if(!fieldRowEl||fieldRowEl.querySelector(".db-dp-edit-input"))return;
  var valueEl=fieldRowEl.querySelector(".db-dp-field-value");
  var type=colDef.type;
  if(type==="select"){
    dbOpenDropdown(valueEl,{title:colDef.label,items:dbOptionsFor(db,colKey),selected:row[colKey],onChange:function(v){dbSetField(db,row,colKey,v);dbRenderDetailPanel(db,row);dbRerenderView();}});
    return;
  }
  if(type==="multiselect"||type==="tags"){
    dbOpenDropdown(valueEl,{title:colDef.label,multi:true,allowCreate:true,items:dbOptionsFor(db,colKey),selected:(row[colKey]||[]).slice(),
      onCreate:function(val){
        var opts=dbOptionsFor(db,colKey);
        if(!opts.some(function(o){return o.value===val;})){opts.push({value:val,label:val,color:DB_SWATCHES_HOME[opts.length%DB_SWATCHES_HOME.length]});dbSaveDropdownOptions(db,colKey,opts);}
      },
      onChange:function(vals){dbSetField(db,row,colKey,vals);dbRenderDetailPanel(db,row);dbRerenderView();}});
    return;
  }
  if(type==="checkbox"){
    dbSetField(db,row,colKey,!row[colKey]);
    dbRenderDetailPanel(db,row);dbRerenderView();
    return;
  }
  var input=document.createElement("input");
  input.className="db-dp-edit-input";
  input.value=row[colKey]==null?"":row[colKey];
  input.type=(type==="genericNumber"||type==="progress")?"number":(type==="date"?"date":(type==="email"?"email":"text"));
  valueEl.innerHTML="";
  valueEl.appendChild(input);
  input.focus();
  if(input.select)input.select();
  function commit(){
    var val=input.value;
    if(type==="genericNumber"||type==="progress")val=parseFloat(val)||0;
    dbSetField(db,row,colKey,val);
    dbRenderDetailPanel(db,row);
    dbRerenderView();
  }
  input.addEventListener("blur",commit);
  input.addEventListener("keydown",function(e){
    e.stopPropagation();
    if(e.key==="Enter"){e.preventDefault();commit();}
    if(e.key==="Escape"){dbRenderDetailPanel(db,row);}
  });
  input.addEventListener("click",function(e){e.stopPropagation();});
}
function dbOpenDetail(db,rowId){
  var row=dbRows(db).find(function(r){return r.id===rowId;});
  if(!row)return;
  _dbDetailOpenId=rowId;_dbDetailDbId=db.id;
  dbRenderDetailPanel(db,row);
}
function dbCloseDetail(){
  _dbDetailOpenId=null;_dbDetailDbId=null;
  var panel=document.getElementById("db-detail-panel");
  var overlay=document.getElementById("db-detail-overlay");
  if(panel)panel.classList.remove("open");
  if(overlay)overlay.classList.remove("open");
}
function dbHighlightRow(db,rowId){
  dbOpenDatabase(db.id);
  setTimeout(function(){
    var tr=document.querySelector('.db-row[data-id="'+rowId+'"]');
    if(tr){
      tr.scrollIntoView({block:"center",behavior:"smooth"});
      tr.classList.add("db-flash");
      setTimeout(function(){tr.classList.remove("db-flash");},1200);
    }
  },150);
}
