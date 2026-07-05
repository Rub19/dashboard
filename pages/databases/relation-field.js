/* ETHONE Database Builder — Relation field type (unidirectional links to rows of another database). No back-links/rollups/lookups — out of scope by design. */

function dbRelationCellHTML(db,row,col){
  var ids=(row[col.key]||[]).map(String);
  if(!ids.length)return '<span class="db-cell-text db-cell-muted">—</span>';
  var targetDb=col.targetDatabaseId?dbGet(col.targetDatabaseId):null;
  if(!targetDb)return '<span class="db-relation-chip missing">Base introuvable</span>';
  var displayCol=col.displayColumn?dbColumnByKey(targetDb,col.displayColumn):dbPrimaryColumn(targetDb);
  return ids.map(function(id){
    var targetRow=dbRows(targetDb).find(function(r){return String(r.id)===id;});
    if(!targetRow)return '<span class="db-relation-chip missing">(supprimé)</span>';
    var label=(displayCol&&targetRow[displayCol.key])||"Sans titre";
    return '<span class="db-relation-chip" data-target-db="'+targetDb.id+'" data-target-row="'+id+'">'+dbEsc(label)+"</span>";
  }).join("");
}
function dbWireRelationChipClicks(scopeEl,db){
  scopeEl.querySelectorAll(".db-relation-chip[data-target-row]").forEach(function(chip){
    if(chip.dataset.wired)return;
    chip.dataset.wired="1";
    chip.addEventListener("click",function(e){
      e.stopPropagation();
      var targetDbId=parseInt(chip.dataset.targetDb,10);
      var targetRowId=parseInt(chip.dataset.targetRow,10);
      var targetDb=dbGet(targetDbId);
      if(!targetDb)return;
      if(typeof dbCloseDetail==="function")dbCloseDetail();
      dbHighlightRow(targetDb,targetRowId);
    });
  });
}
function dbOpenRelationColumnConfig(db,colKey,onDone){
  var col=dbColumnByKey(db,colKey);if(!col)return;
  var others=dbList().filter(function(d){return d.id!==db.id;});
  if(!others.length){toast("Créez d'abord une autre base pour établir une relation","error");return;}
  var anchor=document.querySelector('.db-th[data-col="'+colKey+'"]')||document.body;
  dbOpenDropdown(anchor,{title:t("db_target_database"),searchable:false,items:others.map(function(d){return {value:d.id,label:d.name};}),onChange:function(targetId){
    col.targetDatabaseId=parseInt(targetId,10);
    var targetDb=dbGet(col.targetDatabaseId);
    var primary=dbPrimaryColumn(targetDb);
    col.displayColumn=primary?primary.key:null;
    dbTouch(db);saveStateNow();
    dbOpenRelationDisplayColumnConfig(db,colKey,targetDb,onDone);
  }});
}
function dbOpenRelationDisplayColumnConfig(db,colKey,targetDb,onDone){
  var col=dbColumnByKey(db,colKey);if(!col)return;
  var anchor=document.querySelector('.db-th[data-col="'+colKey+'"]')||document.body;
  dbOpenDropdown(anchor,{title:t("db_display_column"),searchable:false,items:dbColumns(targetDb).map(function(c){return {value:c.key,label:c.label};}),selected:col.displayColumn,onChange:function(val){
    col.displayColumn=val;
    dbTouch(db);saveStateNow();
    if(onDone)onDone();
  }});
}
function dbOpenRelationPicker(cell,db,row,colDef,onDone){
  if(!colDef.targetDatabaseId){toast("Configurez d'abord la base cible pour cette colonne (clic droit sur l'en-tête)","error");return;}
  var targetDb=dbGet(colDef.targetDatabaseId);
  if(!targetDb)return;
  var displayCol=colDef.displayColumn?dbColumnByKey(targetDb,colDef.displayColumn):dbPrimaryColumn(targetDb);
  var items=dbRows(targetDb).map(function(r){return {value:String(r.id),label:(displayCol&&r[displayCol.key])||"Sans titre"};});
  dbOpenDropdown(cell,{title:colDef.label,multi:true,searchable:true,items:items,selected:(row[colDef.key]||[]).map(String),onChange:function(vals){
    dbSetField(db,row,colDef.key,vals);
    if(onDone)onDone();
  }});
}
