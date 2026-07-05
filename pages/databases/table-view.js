/* ETHONE Database Builder — generic Table view engine (columns, cells, sort/filter/group, row CRUD). Ported & generalized from pages/valorant-accounts/index.js. */

var DB_SEARCH_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
var DB_GROUP_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="15" width="7" height="7" rx="1.5"/><rect x="14" y="15" width="7" height="7" rx="1.5"/></svg>';
var DB_COLUMNS_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>';
var DB_LOCK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="10" height="10"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

var DB_COLUMN_TYPE_CHOICES=[
  {value:"text",label:"Texte"},
  {value:"genericNumber",label:"Nombre"},
  {value:"date",label:"Date"},
  {value:"checkbox",label:"Checkbox"},
  {value:"select",label:"Dropdown"},
  {value:"multiselect",label:"Multi Dropdown"},
  {value:"relation",label:"Relation"},
  {value:"image",label:"Image"},
  {value:"tags",label:"Tags"},
  {value:"email",label:"Email"},
  {value:"url",label:"URL"},
  {value:"progress",label:"Progress"},
  {value:"formula",label:"Formula"},
  {value:"button",label:"Button"},
  {value:"rating",label:"Rating"},
  {value:"emoji",label:"Emoji"}
];
function dbIsOptionsType(type){return type==="select"||type==="multiselect"||type==="tags";}

var _dbSelected={},_dbFocusId=null;

function dbFmtDate(iso){
  if(!iso)return "—";
  try{
    var d=new Date(iso);
    if(isNaN(d.getTime()))return String(iso);
    return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"2-digit"});
  }catch(e){return "—";}
}
function dbSetField(db,row,field,value){
  if(JSON.stringify(row[field])===JSON.stringify(value))return;
  row[field]=value;
  row.updatedAt=new Date().toISOString();
  dbTouch(db);
  saveStateNow();
}
function dbBlankRow(db){
  var row={id:dbNewId(),createdAt:new Date().toISOString()};
  db.columns.forEach(function(c){
    if(c.type==="formula")return;
    if(c.type==="multiselect"||c.type==="tags"||c.type==="relation")row[c.key]=[];
    else if(c.type==="checkbox")row[c.key]=false;
    else row[c.key]="";
  });
  return row;
}
function dbAddRow(db){
  var row=dbBlankRow(db);
  dbRows(db).push(row);
  dbTouch(db);saveStateNow();
  return row;
}

// ══════════════════════════════════════════════════════════════
//  CELL RENDER
// ══════════════════════════════════════════════════════════════
function dbCellHTML(db,row,col){
  switch(col.type){
    case "text":
      return '<span class="db-cell-text db-cell-truncate">'+dbEsc(row[col.key]||"—")+"</span>";
    case "email":
      return row[col.key]?'<a class="db-cell-link" href="mailto:'+dbEsc(row[col.key])+'" onclick="event.stopPropagation()">'+dbEsc(row[col.key])+"</a>":'<span class="db-cell-text db-cell-muted">—</span>';
    case "url":
      return row[col.key]?'<a class="db-cell-link" href="'+dbEsc(row[col.key])+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">'+dbEsc(String(row[col.key]).replace(/^https?:\/\//,""))+"</a>":'<span class="db-cell-text db-cell-muted">—</span>';
    case "genericNumber":
      return '<span class="db-cell-text db-cell-muted">'+(row[col.key]!=null&&row[col.key]!==""?dbEsc(row[col.key]):"—")+"</span>";
    case "date":
      return '<span class="db-cell-text db-cell-muted">'+dbEsc(dbFmtDate(row[col.key]))+"</span>";
    case "checkbox":
      return row[col.key]?'<span class="db-bool-yes">✓</span>':'<span class="db-bool-no">–</span>';
    case "select":
      var sd=dbOptionDef(db,col.key,row[col.key]);
      return row[col.key]?'<span class="db-badge" style="--bc:'+sd.color+'">'+(sd.icon?sd.icon+" ":"")+dbEsc(sd.label)+"</span>":'<span class="db-cell-text db-cell-muted">—</span>';
    case "multiselect":
      return '<span class="db-tags-cell">'+(row[col.key]||[]).map(function(v){var d=dbOptionDef(db,col.key,v);return '<span class="db-badge" style="--bc:'+d.color+'">'+(d.icon?d.icon+" ":"")+dbEsc(d.label)+"</span>";}).join("")+"</span>";
    case "tags":
      return '<span class="db-tags-cell">'+(row[col.key]||[]).map(function(v){var d=dbOptionDef(db,col.key,v);return '<span class="db-badge" style="--bc:'+(d.color||"#8b8b93")+'">'+dbEsc(d.label)+"</span>";}).join("")+"</span>";
    case "image":
      return row[col.key]?'<img src="'+dbEsc(row[col.key])+'" class="db-avatar-img" onerror="this.remove()">':'<div class="db-avatar-fallback">—</div>';
    case "emoji":
      return '<span class="db-icon-cell">'+dbEsc(row[col.key]||"—")+"</span>";
    case "button":
      return row[col.key]?'<a class="db-cell-btn" href="'+dbEsc(row[col.key])+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">'+dbEsc(col.buttonLabel||"Ouvrir ↗")+"</a>":'<span class="db-cell-text db-cell-muted">—</span>';
    case "progress":
      var pct=Math.max(0,Math.min(100,parseFloat(row[col.key])||0));
      return '<span class="db-progress-cell"><span class="db-progress-track"><span class="db-progress-fill" style="width:'+pct+'%"></span></span><span class="db-progress-label">'+pct+"%</span></span>";
    case "rating":
      return (typeof dbRatingCellHTML==="function")?dbRatingCellHTML(db,row,col):"";
    case "relation":
      return (typeof dbRelationCellHTML==="function")?dbRelationCellHTML(db,row,col):"";
    case "formula":
      return (typeof dbFormulaCellHTML==="function")?dbFormulaCellHTML(db,row,col):"";
    default:
      return '<span class="db-cell-text">'+dbEsc(row[col.key]||"—")+"</span>";
  }
}

// ══════════════════════════════════════════════════════════════
//  SEARCH / SORT / GROUP PIPELINE
// ══════════════════════════════════════════════════════════════
function dbSearchMatch(db,row,q){
  if(!q)return true;
  q=q.toLowerCase();
  var cols=dbVisibleColumns(db);
  var hay=cols.map(function(c){
    var v=row[c.key];
    if(Array.isArray(v))return v.map(function(x){var d=dbOptionDef(db,c.key,x);return d.label||x;}).join(" ");
    if(c.type==="select")return v?dbOptionDef(db,c.key,v).label:"";
    return v==null?"":String(v);
  }).join(" ").toLowerCase();
  return hay.indexOf(q)>-1;
}
function dbCompareRows(db,a,b,col,dir){
  var colDef=dbColumnByKey(db,col);
  var av=a[col],bv=b[col];
  if(colDef&&colDef.type==="select"){av=dbOptionDef(db,col,av).label||"";bv=dbOptionDef(db,col,bv).label||"";}
  if(colDef&&(colDef.type==="multiselect"||colDef.type==="tags")){av=(av||[]).join(",");bv=(bv||[]).join(",");}
  if(av==null)av="";if(bv==null)bv="";
  var res;
  if(typeof av==="number"&&typeof bv==="number")res=av-bv;
  else res=String(av).localeCompare(String(bv),"fr",{numeric:true,sensitivity:"base"});
  return dir==="desc"?-res:res;
}
function dbGetFilteredRows(db,view){
  var rows=dbRows(db).slice();
  var q=(document.getElementById("db-search")||{}).value||"";
  rows=rows.filter(function(r){return dbSearchMatch(db,r,q);});
  var sort=(view.config&&view.config.sort)||[];
  if(sort.length){
    rows.sort(function(a,b){
      for(var i=0;i<sort.length;i++){
        var r=dbCompareRows(db,a,b,sort[i].col,sort[i].dir);
        if(r!==0)return r;
      }
      return 0;
    });
  }
  return rows;
}
function dbGroupRows(db,view,list){
  var groupBy=view.config&&view.config.groupBy;
  if(!groupBy)return [{key:null,label:null,items:list}];
  var groups={},order=[];
  list.forEach(function(r){
    var raw=r[groupBy];
    var keys=Array.isArray(raw)?(raw.length?raw:["__none__"]):[raw||"__none__"];
    keys.forEach(function(key){
      if(!groups[key]){groups[key]=[];order.push(key);}
      groups[key].push(r);
    });
  });
  return order.map(function(key){
    var label=key==="__none__"?"—":(dbOptionDef(db,groupBy,key).label||key);
    return {key:key,label:label,items:groups[key]};
  });
}

// ══════════════════════════════════════════════════════════════
//  MAIN RENDER ENTRY
// ══════════════════════════════════════════════════════════════
function dbRenderTable(container,db,view){
  if(!view.config)view.config={sort:[],groupBy:null,filters:[],activeFilterView:"all"};
  container.innerHTML=
    '<div class="db-table-toolbar">'+
      '<div class="db-search-wrap">'+DB_SEARCH_SVG+'<input type="text" id="db-search" class="db-search-input" placeholder="Rechercher…" autocomplete="off"></div>'+
      '<div class="db-toolbar-right">'+
        '<button type="button" class="db-toolbar-btn" id="db-group-btn">'+DB_GROUP_SVG+'<span id="db-group-label"></span></button>'+
        '<button type="button" class="db-toolbar-btn" id="db-columns-btn">'+DB_COLUMNS_SVG+"<span>Colonnes</span></button>"+
        '<button type="button" class="db-toolbar-btn primary" id="db-add-row-btn">'+DB_PLUS_SVG+"<span>"+dbEsc(t("db_add_row"))+"</span></button>"+
      "</div>"+
    "</div>"+
    '<div class="db-table-wrap" id="db-table-wrap">'+
      '<table class="db-table" id="db-table"><thead id="db-thead"></thead><tbody id="db-tbody"></tbody></table>'+
      '<div class="db-empty-state" id="db-empty-state" style="display:none">Aucune ligne — ajoutez-en une ou importez un CSV.</div>'+
    "</div>"+
    '<div class="db-bulk-bar" id="db-bulk-bar"></div>';
  _dbSelected={};_dbFocusId=null;
  container.querySelector("#db-search").addEventListener("input",function(){dbRenderTableRows(container,db,view);});
  container.querySelector("#db-add-row-btn").addEventListener("click",function(){dbAddRow(db);dbRenderTableRows(container,db,view);});
  container.querySelector("#db-columns-btn").addEventListener("click",function(e){dbOpenColumnsMenu(e.currentTarget,db);});
  dbWireGroupBtn(container,db,view);
  dbRenderThead(container,db,view);
  dbRenderTableRows(container,db,view);
}
function dbWireGroupBtn(container,db,view){
  var btn=container.querySelector("#db-group-btn");
  var label=container.querySelector("#db-group-label");
  function refreshLabel(){
    var col=view.config.groupBy?dbColumnByKey(db,view.config.groupBy):null;
    label.textContent=col?("Grouper : "+col.label):"Grouper";
  }
  refreshLabel();
  btn.addEventListener("click",function(e){
    var groupable=dbColumns(db).filter(function(c){return c.type==="select"||c.type==="multiselect"||c.type==="tags";});
    var items=[{value:"",label:"Aucun"}].concat(groupable.map(function(c){return {value:c.key,label:c.label};}));
    dbOpenDropdown(e.currentTarget,{title:t("db_group_by"),searchable:false,items:items,selected:view.config.groupBy||"",onChange:function(val){
      view.config.groupBy=val||null;
      dbTouch(db);saveStateNow();
      dbRerenderView();
    }});
  });
}
function dbOpenColumnsMenu(anchor,db){
  var items=dbAllColumnDefs(db).map(function(c){return {value:c.key,label:c.label};});
  dbOpenDropdown(anchor,{
    title:"Colonnes visibles",multi:true,searchable:false,items:items,
    selected:items.map(function(i){return i.value;}).filter(function(k){return db.hiddenColumns.indexOf(k)===-1;}),
    onChange:function(vals){
      db.hiddenColumns=items.map(function(i){return i.value;}).filter(function(k){return vals.indexOf(k)===-1;});
      dbTouch(db);saveStateNow();
      dbRerenderView();
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  TABLE HEADER + COLUMN CRUD
// ══════════════════════════════════════════════════════════════
function dbRenderThead(container,db,view){
  var thead=container.querySelector("#db-thead");if(!thead)return;
  var cols=dbVisibleColumns(db);
  var allChecked=dbRows(db).length>0&&dbRows(db).every(function(r){return _dbSelected[r.id];});
  var sort=(view.config&&view.config.sort)||[];
  var html='<tr><th class="db-th-sel"><input type="checkbox" class="db-checkbox" id="db-select-all"'+(allChecked?" checked":"")+"></th>";
  cols.forEach(function(c){
    var w=db.columnWidths[c.key]||c.width||150;
    var pinned=db.pinnedColumns.indexOf(c.key)>-1;
    var style="width:"+w+"px;min-width:"+w+"px;max-width:"+w+"px;"+(pinned?"position:sticky;left:32px;z-index:3;":"");
    var sortIdx=sort.findIndex(function(s){return s.col===c.key;});
    var sortInfo=sortIdx>-1?sort[sortIdx]:null;
    var locked=db.lockedColumns.indexOf(c.key)>-1||c.primary;
    html+='<th style="'+style+'" data-col="'+c.key+'" class="db-th'+(sortInfo?" sorted":"")+(locked?" locked":"")+'" draggable="'+(!locked)+'">'+
      (locked?'<span class="db-th-lock">'+DB_LOCK_SVG+"</span>":"")+
      '<span class="db-th-label">'+dbEsc(c.label)+"</span>"+
      (sortInfo?'<span class="db-th-sort">'+(sortInfo.dir==="asc"?"↑":"↓")+"</span>":"")+
      (locked?"":'<span class="db-th-resize" data-col="'+c.key+'"></span>')+
    "</th>";
  });
  html+='<th class="db-th-add"><button type="button" id="db-add-column-btn" title="'+dbEsc(t("db_add_column"))+'">'+DB_PLUS_SVG+"</button></th></tr>";
  thead.innerHTML=html;

  var addBtn=thead.querySelector("#db-add-column-btn");
  if(addBtn)addBtn.addEventListener("click",function(e){dbOpenAddColumnPopover(e.currentTarget,db,view,container);});

  var selectAll=thead.querySelector("#db-select-all");
  if(selectAll)selectAll.addEventListener("change",function(){
    if(selectAll.checked)dbRows(db).forEach(function(r){_dbSelected[r.id]=true;});
    else _dbSelected={};
    dbRenderTableRows(container,db,view);
  });

  thead.querySelectorAll(".db-th").forEach(function(th){
    th.addEventListener("click",function(e){
      if(e.target.classList.contains("db-th-resize"))return;
      var col=th.dataset.col;
      var multi=e.shiftKey;
      if(!view.config.sort)view.config.sort=[];
      var idx=view.config.sort.findIndex(function(s){return s.col===col;});
      if(!multi){
        if(idx===0&&view.config.sort.length===1)view.config.sort[0].dir=view.config.sort[0].dir==="asc"?"desc":"asc";
        else view.config.sort=[{col:col,dir:"asc"}];
      }else{
        if(idx>-1)view.config.sort[idx].dir=view.config.sort[idx].dir==="asc"?"desc":"asc";
        else view.config.sort.push({col:col,dir:"asc"});
      }
      saveStateNow();
      dbRenderThead(container,db,view);
      dbRenderTableRows(container,db,view);
    });
    th.addEventListener("contextmenu",function(e){
      e.preventDefault();
      dbOpenColumnContextMenu(e,db,view,container,th.dataset.col);
    });
    th.addEventListener("dblclick",function(e){
      if(e.target.classList.contains("db-th-resize"))return;
      e.stopPropagation();
      dbStartColumnRename(th,db,view,container,th.dataset.col);
    });
    th.addEventListener("dragstart",function(e){e.dataTransfer.setData("text/plain",th.dataset.col);th.classList.add("dragging");});
    th.addEventListener("dragend",function(){th.classList.remove("dragging");});
    th.addEventListener("dragover",function(e){if(th.classList.contains("locked"))return;e.preventDefault();th.classList.add("drag-over");});
    th.addEventListener("dragleave",function(){th.classList.remove("drag-over");});
    th.addEventListener("drop",function(e){
      e.preventDefault();th.classList.remove("drag-over");
      var fromKey=e.dataTransfer.getData("text/plain");
      var toKey=th.dataset.col;
      if(fromKey===toKey||th.classList.contains("locked"))return;
      dbReorderColumnDef(db,fromKey,toKey);
      dbRenderThead(container,db,view);
      dbRenderTableRows(container,db,view);
    });
  });
  dbWireColumnResize(container,db);
}
function dbReorderColumnDef(db,fromKey,toKey){
  if(!db.columnOrder||!db.columnOrder.length)db.columnOrder=db.columns.map(function(c){return c.key;});
  var fromIdx=db.columnOrder.indexOf(fromKey);
  var toIdx=db.columnOrder.indexOf(toKey);
  if(fromIdx===-1||toIdx===-1)return;
  var moved=db.columnOrder.splice(fromIdx,1)[0];
  db.columnOrder.splice(toIdx,0,moved);
  dbTouch(db);saveStateNow();
}
function dbRenameColumnDef(db,colKey,newLabel){
  newLabel=(newLabel||"").trim();if(!newLabel)return;
  var col=dbColumnByKey(db,colKey);if(!col)return;
  col.label=newLabel;
  dbTouch(db);saveStateNow();
}
function dbStartColumnRename(th,db,view,container,colKey){
  if(th.querySelector(".db-th-rename-input"))return;
  var labelEl=th.querySelector(".db-th-label");
  var current=labelEl.textContent;
  var input=document.createElement("input");
  input.className="db-th-rename-input";
  input.value=current;
  labelEl.replaceWith(input);
  input.focus();input.select();
  function commit(){dbRenameColumnDef(db,colKey,input.value);dbRenderThead(container,db,view);dbRenderTableRows(container,db,view);}
  input.addEventListener("blur",commit);
  input.addEventListener("keydown",function(e){
    e.stopPropagation();
    if(e.key==="Enter"){e.preventDefault();commit();}
    if(e.key==="Escape"){e.preventDefault();dbRenderThead(container,db,view);}
  });
  input.addEventListener("click",function(e){e.stopPropagation();});
}
function dbDuplicateColumnDef(db,colKey){
  var colDef=dbColumnByKey(db,colKey);if(!colDef)return null;
  var newCol=Object.assign({},colDef,{key:"col_"+dbNewId(),label:colDef.label+" (copie)",primary:false});
  if(colDef.options)newCol.options=colDef.options.map(function(o){return Object.assign({},o);});
  db.columns.push(newCol);
  if(!db.columnOrder||!db.columnOrder.length)db.columnOrder=db.columns.map(function(c){return c.key;});
  var idx=db.columnOrder.indexOf(colKey);
  db.columnOrder.splice(idx>-1?idx+1:db.columnOrder.length,0,newCol.key);
  dbTouch(db);saveStateNow();
  return newCol;
}
function dbChangeColumnType(db,colKey,newType){
  var col=dbColumnByKey(db,colKey);if(!col||col.primary)return;
  if(col.type===newType)return;
  if(!confirm("Changer le type effacera les valeurs déjà saisies dans cette colonne. Continuer ?"))return;
  col.type=newType;
  if(dbIsOptionsType(newType))col.options=[];
  else delete col.options;
  dbRows(db).forEach(function(r){delete r[colKey];});
  dbTouch(db);saveStateNow();
}
function dbDeleteColumnDef(db,colKey){
  var col=dbColumnByKey(db,colKey);
  if(!col||col.primary)return;
  if(!confirm("Supprimer cette colonne ? Les données associées seront perdues."))return;
  db.columns=db.columns.filter(function(c){return c.key!==colKey;});
  if(db.columnOrder)db.columnOrder=db.columnOrder.filter(function(k){return k!==colKey;});
  db.hiddenColumns=db.hiddenColumns.filter(function(k){return k!==colKey;});
  db.pinnedColumns=db.pinnedColumns.filter(function(k){return k!==colKey;});
  db.lockedColumns=db.lockedColumns.filter(function(k){return k!==colKey;});
  dbRows(db).forEach(function(r){delete r[colKey];});
  dbTouch(db);saveStateNow();
  toast("Colonne supprimée","success");
}
function dbToggleColumnLock(db,colKey){
  var idx=db.lockedColumns.indexOf(colKey);
  if(idx>-1)db.lockedColumns.splice(idx,1);else db.lockedColumns.push(colKey);
  dbTouch(db);saveStateNow();
}
function dbOpenColumnContextMenu(e,db,view,container,colKey){
  var pinned=db.pinnedColumns.indexOf(colKey)>-1;
  var locked=db.lockedColumns.indexOf(colKey)>-1;
  var colDef=dbColumnByKey(db,colKey);
  var isPrimary=colDef&&colDef.primary;
  var th=container.querySelector('.db-th[data-col="'+colKey+'"]');
  var items=[{label:t("db_rename"),onClick:function(){if(th)dbStartColumnRename(th,db,view,container,colKey);}}];
  if(!isPrimary)items.push({label:t("db_duplicate"),onClick:function(){dbDuplicateColumnDef(db,colKey);dbRenderThead(container,db,view);dbRenderTableRows(container,db,view);}});
  if(!isPrimary)items.push({label:"Changer le type",onClick:function(){
    dbOpenDropdown(th||document.body,{title:"Changer le type",searchable:false,items:DB_COLUMN_TYPE_CHOICES,onChange:function(v2){dbChangeColumnType(db,colKey,v2);dbRenderThead(container,db,view);dbRenderTableRows(container,db,view);}});
  }});
  if(colDef&&dbIsOptionsType(colDef.type))items.push({label:"Modifier le dropdown",onClick:function(){dbOpenDropdownEditor(db,colKey);}});
  if(colDef&&colDef.type==="formula"&&typeof dbOpenFormulaEditor==="function")items.push({label:"Modifier la formule",onClick:function(){dbOpenFormulaEditor(th||document.body,db,colDef,function(){dbRerenderView();});}});
  if(colDef&&colDef.type==="relation"&&typeof dbOpenRelationColumnConfig==="function")items.push({label:"Configurer la relation",onClick:function(){dbOpenRelationColumnConfig(db,colKey,function(){dbRerenderView();});}});
  if(colDef&&colDef.type==="rating")items.push({label:"Nombre d'étoiles",onClick:function(){
    var val=prompt("Nombre d'étoiles (1-10) :",colDef.maxStars||5);
    if(val==null)return;
    var n=Math.max(1,Math.min(10,parseInt(val,10)||5));
    colDef.maxStars=n;
    dbTouch(db);saveStateNow();
    dbRenderTableRows(container,db,view);
  }});
  items.push({divider:true});
  if(!isPrimary)items.push({label:locked?"Déverrouiller":"Verrouiller",onClick:function(){dbToggleColumnLock(db,colKey);dbRenderThead(container,db,view);}});
  if(!locked&&!isPrimary){
    items.push({label:pinned?"Désépingler":"Épingler à gauche",onClick:function(){
      if(pinned)db.pinnedColumns=db.pinnedColumns.filter(function(k){return k!==colKey;});
      else db.pinnedColumns.push(colKey);
      dbTouch(db);saveStateNow();
      dbRenderThead(container,db,view);dbRenderTableRows(container,db,view);
    }});
    items.push({label:"Masquer la colonne",onClick:function(){
      db.hiddenColumns.push(colKey);dbTouch(db);saveStateNow();
      dbRenderThead(container,db,view);dbRenderTableRows(container,db,view);
    }});
  }
  items.push({divider:true});
  items.push({label:"Trier croissant",onClick:function(){view.config.sort=[{col:colKey,dir:"asc"}];saveStateNow();dbRenderThead(container,db,view);dbRenderTableRows(container,db,view);}});
  items.push({label:"Trier décroissant",onClick:function(){view.config.sort=[{col:colKey,dir:"desc"}];saveStateNow();dbRenderThead(container,db,view);dbRenderTableRows(container,db,view);}});
  if(!isPrimary&&!locked){
    items.push({divider:true});
    items.push({label:t("db_delete"),danger:true,onClick:function(){dbDeleteColumnDef(db,colKey);dbRenderThead(container,db,view);dbRenderTableRows(container,db,view);}});
  }
  dbOpenContextMenu(e.clientX,e.clientY,items);
}
function dbWireColumnResize(container,db){
  var thead=container.querySelector("#db-thead");if(!thead)return;
  thead.querySelectorAll(".db-th-resize").forEach(function(handle){
    handle.addEventListener("mousedown",function(e){
      e.preventDefault();e.stopPropagation();
      var col=handle.dataset.col;
      var th=handle.closest(".db-th")||handle.parentElement;
      var startX=e.clientX,startW=th.getBoundingClientRect().width;
      function onMove(ev){
        var w=Math.max(60,startW+(ev.clientX-startX));
        db.columnWidths[col]=Math.round(w);
        dbApplyColumnWidths(container,db);
      }
      function onUp(){
        document.removeEventListener("mousemove",onMove);
        document.removeEventListener("mouseup",onUp);
        dbTouch(db);saveStateNow();
      }
      document.addEventListener("mousemove",onMove);
      document.addEventListener("mouseup",onUp);
    });
  });
}
function dbApplyColumnWidths(container,db){
  container.querySelectorAll("[data-col]").forEach(function(cell){
    var w=db.columnWidths[cell.dataset.col];
    if(w){cell.style.width=w+"px";cell.style.minWidth=w+"px";cell.style.maxWidth=w+"px";}
  });
}

// ══════════════════════════════════════════════════════════════
//  ADD COLUMN POPOVER
// ══════════════════════════════════════════════════════════════
function dbOpenAddColumnPopover(anchorEl,db,view,container){
  var panel=document.getElementById("db-addcol-panel");
  if(!panel){panel=document.createElement("div");panel.id="db-addcol-panel";document.body.appendChild(panel);}
  panel.className="db-dd-panel db-addcol-panel";
  panel.innerHTML=
    '<div class="db-dd-title">Nouvelle colonne</div>'+
    '<div class="db-addcol-body">'+
      '<input type="text" id="db-addcol-name" class="db-dd-search" placeholder="Nom de la colonne" autocomplete="off" style="margin:0 0 8px">'+
      '<div class="db-addcol-types" id="db-addcol-types">'+
        DB_COLUMN_TYPE_CHOICES.map(function(tch,i){return '<button type="button" class="db-addcol-type" data-idx="'+i+'">'+dbEsc(tch.label)+"</button>";}).join("")+
      "</div>"+
      '<button type="button" class="db-addcol-create" id="db-addcol-create" disabled>Créer la colonne</button>'+
    "</div>";
  var nameInput=panel.querySelector("#db-addcol-name");
  var createBtn=panel.querySelector("#db-addcol-create");
  var selectedIdx=null;
  function updateCreateState(){createBtn.disabled=!(nameInput.value.trim()&&selectedIdx!=null);}
  panel.querySelectorAll(".db-addcol-type").forEach(function(btn){
    btn.addEventListener("click",function(){
      panel.querySelectorAll(".db-addcol-type").forEach(function(b){b.classList.remove("selected");});
      btn.classList.add("selected");
      selectedIdx=parseInt(btn.dataset.idx,10);
      updateCreateState();
    });
  });
  nameInput.addEventListener("input",updateCreateState);
  nameInput.addEventListener("keydown",function(e){e.stopPropagation();if(e.key==="Enter"&&!createBtn.disabled)createBtn.click();});
  createBtn.addEventListener("click",function(){
    var typeChoice=DB_COLUMN_TYPE_CHOICES[selectedIdx];
    var newCol=dbCreateColumn(db,nameInput.value.trim(),typeChoice.value);
    closePopover();
    dbRenderThead(container,db,view);
    dbRenderTableRows(container,db,view);
    if(dbIsOptionsType(typeChoice.value))setTimeout(function(){dbOpenDropdownEditor(db,newCol.key);},150);
    if(typeChoice.value==="relation"&&typeof dbOpenRelationColumnConfig==="function")setTimeout(function(){dbOpenRelationColumnConfig(db,newCol.key,function(){dbRerenderView();});},150);
    if(typeChoice.value==="formula"&&typeof dbOpenFormulaEditor==="function")setTimeout(function(){dbOpenFormulaEditor(anchorEl,db,newCol,function(){dbRerenderView();});},150);
  });
  var r=anchorEl.getBoundingClientRect();
  panel.style.visibility="hidden";
  panel.classList.add("open");
  var pw=panel.offsetWidth,ph=panel.offsetHeight;
  var left=Math.min(r.left,window.innerWidth-pw-10);
  var top=r.bottom+6;
  if(top+ph>window.innerHeight-10)top=Math.max(10,r.top-ph-6);
  panel.style.left=left+"px";panel.style.top=top+"px";
  panel.style.visibility="";
  setTimeout(function(){nameInput.focus();},10);
  function closePopover(){panel.classList.remove("open");document.removeEventListener("mousedown",outsideHandler);}
  function outsideHandler(e){if(!panel.contains(e.target)&&e.target!==anchorEl)closePopover();}
  setTimeout(function(){document.addEventListener("mousedown",outsideHandler);},0);
}
function dbCreateColumn(db,name,type){
  var newCol={key:"col_"+dbNewId(),label:name||"Colonne",type:type,width:150};
  if(dbIsOptionsType(type))newCol.options=[];
  if(type==="rating")newCol.maxStars=5;
  db.columns.push(newCol);
  if(!db.columnOrder||!db.columnOrder.length)db.columnOrder=db.columns.map(function(c){return c.key;});
  else db.columnOrder.push(newCol.key);
  dbTouch(db);saveStateNow();
  toast("Colonne créée","success");
  return newCol;
}

// ══════════════════════════════════════════════════════════════
//  ROWS
// ══════════════════════════════════════════════════════════════
function dbRenderTableRows(container,db,view){
  var tbody=container.querySelector("#db-tbody");if(!tbody)return;
  var filtered=dbGetFilteredRows(db,view);
  var cols=dbVisibleColumns(db);
  var emptyEl=container.querySelector("#db-empty-state");
  if(emptyEl)emptyEl.style.display=filtered.length?"none":"flex";
  var wrap=container.querySelector("#db-table-wrap");
  if(wrap)wrap.classList.toggle("empty",!filtered.length);

  var groups=dbGroupRows(db,view,filtered);
  var html="";
  groups.forEach(function(g){
    if(g.key!==null){
      html+='<tr class="db-group-row"><td colspan="'+(cols.length+1)+'"><span class="db-group-label">'+dbEsc(g.label)+'</span><span class="db-group-count">'+g.items.length+"</span></td></tr>";
    }
    g.items.forEach(function(r){
      var sel=!!_dbSelected[r.id];
      var rowColorStyle=r.rowColor?' style="--rc:'+dbEsc(r.rowColor)+'"':"";
      var sortLen=((view.config&&view.config.sort)||[]).length;
      var draggable=!(sortLen||(view.config&&view.config.groupBy));
      html+='<tr class="db-row'+(sel?" selected":"")+(r.rowColor?" colored":"")+'" data-id="'+r.id+'" draggable="'+draggable+'"'+rowColorStyle+'>';
      html+='<td class="db-td-sel"><input type="checkbox" class="db-checkbox db-row-check" data-id="'+r.id+'"'+(sel?" checked":"")+"></td>";
      cols.forEach(function(c){
        var w=db.columnWidths[c.key]||c.width||150;
        var pinned=db.pinnedColumns.indexOf(c.key)>-1;
        var style="width:"+w+"px;min-width:"+w+"px;max-width:"+w+"px;"+(pinned?"position:sticky;left:32px;z-index:2;":"");
        html+='<td style="'+style+'" data-col="'+c.key+'" data-id="'+r.id+'">'+dbCellHTML(db,r,c)+"</td>";
      });
      html+="</tr>";
    });
  });
  tbody.innerHTML=html;
  dbWireRowEvents(container,db,view);
}
function dbWireRowEvents(container,db,view){
  var tbody=container.querySelector("#db-tbody");
  tbody.querySelectorAll(".db-row").forEach(function(tr){
    var id=parseInt(tr.dataset.id,10);
    tr.addEventListener("click",function(e){
      if(e.target.closest(".db-checkbox,.db-mini-btn,a,button"))return;
      if(e.shiftKey){dbSelectRange(container,db,view,id);}
      else if(e.ctrlKey||e.metaKey){_dbSelected[id]=!_dbSelected[id];if(!_dbSelected[id])delete _dbSelected[id];dbRenderTableRows(container,db,view);}
      else{dbOpenDetail(db,id);}
      _dbFocusId=id;
    });
    tr.addEventListener("dblclick",function(e){if(e.target.closest(".db-checkbox"))return;dbOpenDetail(db,id);});
    tr.addEventListener("contextmenu",function(e){
      e.preventDefault();
      _dbFocusId=id;
      if(!_dbSelected[id]){_dbSelected={};_dbSelected[id]=true;dbRenderTableRows(container,db,view);}
      dbOpenRowContextMenu(e.clientX,e.clientY,db,view,container,id);
    });
    tr.addEventListener("dragstart",function(e){e.dataTransfer.setData("text/plain",String(id));tr.classList.add("dragging");});
    tr.addEventListener("dragend",function(){tr.classList.remove("dragging");});
    tr.addEventListener("dragover",function(e){e.preventDefault();tr.classList.add("drag-over");});
    tr.addEventListener("dragleave",function(){tr.classList.remove("drag-over");});
    tr.addEventListener("drop",function(e){
      e.preventDefault();tr.classList.remove("drag-over");
      var fromId=parseInt(e.dataTransfer.getData("text/plain"),10);
      if(fromId===id)return;
      dbReorderRow(db,fromId,id);
      dbRenderTableRows(container,db,view);
    });
  });
  tbody.querySelectorAll(".db-row-check").forEach(function(cb){
    cb.addEventListener("change",function(){
      var id=parseInt(cb.dataset.id,10);
      if(cb.checked)_dbSelected[id]=true;else delete _dbSelected[id];
      dbRenderBulkBar(container,db,view);
      var tr=cb.closest(".db-row");if(tr)tr.classList.toggle("selected",cb.checked);
    });
  });
  tbody.querySelectorAll("[data-col]").forEach(function(cell){
    var colDef=dbColumnByKey(db,cell.dataset.col);
    if(!colDef||colDef.type==="formula"||colDef.type==="rating")return;
    cell.addEventListener("click",function(e){
      if(e.detail>1)return;
      if(e.target.closest("a"))return;
      e.stopPropagation();
      dbOpenCellEditor(cell,db,view,container);
    });
  });
  if(typeof dbWireRatingClicks==="function"){
    tbody.querySelectorAll("[data-col]").forEach(function(cell){
      var colDef=dbColumnByKey(db,cell.dataset.col);
      if(colDef&&colDef.type==="rating"){
        var row=dbRows(db).find(function(r){return r.id===parseInt(cell.dataset.id,10);});
        if(row)dbWireRatingClicks(cell,db,row,colDef,function(){dbRenderTableRows(container,db,view);});
      }
    });
  }
  if(typeof dbWireRelationChipClicks==="function")dbWireRelationChipClicks(tbody,db);
  dbRenderBulkBar(container,db,view);
}
function dbSelectRange(container,db,view,toId){
  var filtered=dbGetFilteredRows(db,view);
  var ids=filtered.map(function(r){return r.id;});
  var fromIdx=_dbFocusId!=null?ids.indexOf(_dbFocusId):0;
  var toIdx=ids.indexOf(toId);
  if(fromIdx===-1)fromIdx=0;
  var lo=Math.min(fromIdx,toIdx),hi=Math.max(fromIdx,toIdx);
  for(var i=lo;i<=hi;i++)_dbSelected[ids[i]]=true;
  dbRenderTableRows(container,db,view);
}
function dbReorderRow(db,fromId,toId){
  var list=dbRows(db);
  var fromIdx=list.findIndex(function(r){return r.id===fromId;});
  var toIdx=list.findIndex(function(r){return r.id===toId;});
  if(fromIdx===-1||toIdx===-1)return;
  var moved=list.splice(fromIdx,1)[0];
  list.splice(toIdx,0,moved);
  dbTouch(db);saveStateNow();
}

// ══════════════════════════════════════════════════════════════
//  CELL EDITING
// ══════════════════════════════════════════════════════════════
function dbOpenCellEditor(cell,db,view,container){
  var id=parseInt(cell.dataset.id,10);
  var col=cell.dataset.col;
  var row=dbRows(db).find(function(r){return r.id===id;});
  if(!row)return;
  var colDef=dbColumnByKey(db,col);
  if(!colDef)return;
  dbOpenGenericCellEditor(cell,db,row,colDef,view,container);
}
function dbOpenGenericCellEditor(cell,db,row,colDef,view,container){
  var type=colDef.type;
  if(type==="select"){
    dbOpenDropdown(cell,{title:colDef.label,items:dbOptionsFor(db,colDef.key),selected:row[colDef.key],onChange:function(v){dbSetField(db,row,colDef.key,v);dbRenderTableRows(container,db,view);}});
  }else if(type==="multiselect"||type==="tags"){
    dbOpenDropdown(cell,{title:colDef.label,multi:true,allowCreate:true,items:dbOptionsFor(db,colDef.key),selected:(row[colDef.key]||[]).slice(),
      onCreate:function(val){
        var opts=dbOptionsFor(db,colDef.key);
        if(!opts.some(function(o){return o.value===val;})){
          opts.push({value:val,label:val,color:DB_SWATCHES_HOME[opts.length%DB_SWATCHES_HOME.length]});
          dbSaveDropdownOptions(db,colDef.key,opts);
        }
      },
      onChange:function(vals){dbSetField(db,row,colDef.key,vals);dbRenderTableRows(container,db,view);}});
  }else if(type==="checkbox"){
    dbSetField(db,row,colDef.key,!row[colDef.key]);
    dbRenderTableRows(container,db,view);
  }else if(type==="relation"){
    if(typeof dbOpenRelationPicker==="function")dbOpenRelationPicker(cell,db,row,colDef,function(){dbRenderTableRows(container,db,view);});
  }else{
    var inputType=(type==="date")?"date":(type==="genericNumber"||type==="progress")?"number":"text";
    dbOpenInlineCellEditor(cell,db,row,colDef,inputType,view,container);
  }
}
function dbOpenInlineCellEditor(cell,db,row,colDef,inputType,view,container){
  if(cell.querySelector(".db-cell-edit-input"))return;
  var current=row[colDef.key]==null?"":row[colDef.key];
  var input=document.createElement("input");
  input.type=inputType;
  input.className="db-cell-edit-input";
  input.value=current;
  if(inputType==="number"&&colDef.type==="progress"){input.min=0;input.max=100;}
  cell.innerHTML="";
  cell.appendChild(input);
  input.focus();
  if(input.select)input.select();
  function commit(){
    var val=input.value;
    if(inputType==="number")val=parseFloat(val)||0;
    dbSetField(db,row,colDef.key,val);
    dbRenderTableRows(container,db,view);
  }
  input.addEventListener("blur",commit);
  input.addEventListener("keydown",function(e){
    e.stopPropagation();
    if(e.key==="Enter"){e.preventDefault();commit();}
    if(e.key==="Escape"){e.preventDefault();dbRenderTableRows(container,db,view);}
  });
  input.addEventListener("click",function(e){e.stopPropagation();});
}

// ══════════════════════════════════════════════════════════════
//  BULK BAR + ROW ACTIONS
// ══════════════════════════════════════════════════════════════
function dbRenderBulkBar(container,db,view){
  var bar=container.querySelector("#db-bulk-bar");if(!bar)return;
  var count=Object.keys(_dbSelected).filter(function(k){return _dbSelected[k];}).length;
  if(!count){bar.classList.remove("open");bar.innerHTML="";return;}
  bar.classList.add("open");
  bar.innerHTML='<span class="db-bulk-count">'+count+" sélectionné"+(count>1?"s":"")+'</span>'+
    '<button type="button" class="db-bulk-btn" id="db-bulk-copy">Copier</button>'+
    '<button type="button" class="db-bulk-btn" id="db-bulk-dup">Dupliquer</button>'+
    '<button type="button" class="db-bulk-btn danger" id="db-bulk-del">Supprimer</button>'+
    '<button type="button" class="db-bulk-btn ghost" id="db-bulk-clear">Annuler</button>';
  bar.querySelector("#db-bulk-copy").addEventListener("click",function(){dbCopySelectedTSV(db);});
  bar.querySelector("#db-bulk-dup").addEventListener("click",function(){dbDuplicateSelectedRows(db,container,view);});
  bar.querySelector("#db-bulk-del").addEventListener("click",function(){dbDeleteSelectedRows(db,container,view);});
  bar.querySelector("#db-bulk-clear").addEventListener("click",function(){_dbSelected={};dbRenderTableRows(container,db,view);});
}
function dbSelectedRows(db){
  var ids=Object.keys(_dbSelected).filter(function(k){return _dbSelected[k];}).map(Number);
  return dbRows(db).filter(function(r){return ids.indexOf(r.id)>-1;});
}
function dbOpenRowContextMenu(x,y,db,view,container,id){
  var row=dbRows(db).find(function(r){return r.id===id;});
  if(!row)return;
  var multi=Object.keys(_dbSelected).filter(function(k){return _dbSelected[k];}).length>1;
  dbOpenContextMenu(x,y,[
    {label:"Ouvrir le détail",shortcut:"Entrée",onClick:function(){dbOpenDetail(db,id);}},
    {divider:true},
    {label:multi?"Dupliquer la sélection":t("db_duplicate"),shortcut:"Ctrl+D",onClick:function(){multi?dbDuplicateSelectedRows(db,container,view):dbDuplicateRowAction(db,id,container,view);}},
    {label:"Copier",shortcut:"Ctrl+C",onClick:function(){dbCopySelectedTSV(db);}},
    {divider:true},
    {label:"Colorer la ligne",onClick:function(){dbColorRow(db,id,x,y,container,view);}},
    {label:"Ajouter une icône",onClick:function(){dbPromptRowIcon(db,id,container,view);}},
    {divider:true},
    {label:t("db_delete"),shortcut:"Suppr",danger:true,onClick:function(){multi?dbDeleteSelectedRows(db,container,view):dbDeleteRowsAction(db,[id],container,view);}}
  ]);
}
function dbColorRow(db,id,x,y,container,view){
  var row=dbRows(db).find(function(r){return r.id===id;});if(!row)return;
  var swatches=["","#ef4444","#f59e0b","#facc15","#34d399","#60a5fa","#8b5cf6","#f472b6"];
  var pop=document.createElement("div");
  pop.className="db-dpe-swatch-pop db-row-color-pop";
  pop.innerHTML=swatches.map(function(c){return '<button type="button" class="db-dpe-swatch'+(c?"":" none")+'" style="--sc:'+(c||"transparent")+'" data-color="'+c+'"></button>';}).join("");
  document.body.appendChild(pop);
  pop.style.top=y+"px";pop.style.left=x+"px";
  pop.querySelectorAll("button").forEach(function(btn){
    btn.addEventListener("click",function(){
      dbSetField(db,row,"rowColor",btn.dataset.color||"");
      pop.remove();
      dbRenderTableRows(container,db,view);
    });
  });
  setTimeout(function(){document.addEventListener("mousedown",function h(e){if(!pop.contains(e.target)){pop.remove();document.removeEventListener("mousedown",h);}});},0);
}
function dbPromptRowIcon(db,id,container,view){
  var row=dbRows(db).find(function(r){return r.id===id;});if(!row)return;
  var val=prompt("Icône / emoji pour cette ligne :",row.icon||"");
  if(val==null)return;
  dbSetField(db,row,"icon",val.trim().slice(0,4));
  dbRenderTableRows(container,db,view);
}
function dbDuplicateRow(db,rowId){
  var list=dbRows(db);
  var idx=list.findIndex(function(r){return r.id===rowId;});
  if(idx===-1)return null;
  var copy=JSON.parse(JSON.stringify(list[idx]));
  copy.id=dbNewId();
  var primary=dbPrimaryColumn(db);
  if(primary)copy[primary.key]=(copy[primary.key]||"")+" (copie)";
  copy.updatedAt=new Date().toISOString();
  list.splice(idx+1,0,copy);
  dbTouch(db);saveStateNow();
  return copy;
}
function dbDuplicateRowAction(db,id,container,view){
  var copy=dbDuplicateRow(db,id);
  if(copy){toast("Ligne dupliquée","success");dbRenderTableRows(container,db,view);}
}
function dbDuplicateSelectedRows(db,container,view){
  dbSelectedRows(db).forEach(function(r){dbDuplicateRow(db,r.id);});
  dbRenderTableRows(container,db,view);
}
function dbDeleteRowsAction(db,ids,container,view){
  if(!confirm(ids.length>1?"Supprimer "+ids.length+" lignes ?":"Supprimer cette ligne ?"))return;
  db.rows=dbRows(db).filter(function(r){return ids.indexOf(r.id)===-1;});
  ids.forEach(function(id){delete _dbSelected[id];});
  dbTouch(db);saveStateNow();
  toast("Supprimé","success");
  if(typeof dbCloseDetail==="function")dbCloseDetail();
  dbRenderTableRows(container,db,view);
}
function dbDeleteSelectedRows(db,container,view){
  var ids=Object.keys(_dbSelected).filter(function(k){return _dbSelected[k];}).map(Number);
  if(!ids.length)return;
  dbDeleteRowsAction(db,ids,container,view);
}
function dbCopySelectedTSV(db){
  var rows=dbSelectedRows(db);
  if(!rows.length)return;
  var cols=dbVisibleColumns(db);
  var header=cols.map(function(c){return c.label;}).join("\t");
  var lines=rows.map(function(r){
    return cols.map(function(c){
      var v=r[c.key];
      if(Array.isArray(v))v=v.map(function(x){return dbOptionDef(db,c.key,x).label||x;}).join(", ");
      else if(c.type==="select")v=v?dbOptionDef(db,c.key,v).label:"";
      return v==null?"":String(v).replace(/\t/g," ");
    }).join("\t");
  });
  var tsv=[header].concat(lines).join("\n");
  navigator.clipboard.writeText(tsv).then(function(){toast(rows.length+" ligne(s) copiée(s)","success");}).catch(function(){toast("Impossible de copier","error");});
}

// ══════════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS (table view only)
// ══════════════════════════════════════════════════════════════
document.addEventListener("keydown",function(e){
  if(!dbIsPageActive()||_dbUI.mode!=="open")return;
  var view=dbActiveView();
  if(!view||view.type!=="table")return;
  var db=dbActiveDb();if(!db)return;
  var container=document.getElementById("db-view-body");if(!container)return;
  var tag=(document.activeElement&&document.activeElement.tagName)||"";
  var inField=tag==="INPUT"||tag==="TEXTAREA"||(document.activeElement&&document.activeElement.isContentEditable);
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="c"&&!inField){
    if(Object.keys(_dbSelected).some(function(k){return _dbSelected[k];})){e.preventDefault();dbCopySelectedTSV(db);}
  }else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"&&!inField){
    e.preventDefault();
    if(Object.keys(_dbSelected).some(function(k){return _dbSelected[k];}))dbDuplicateSelectedRows(db,container,view);
  }else if(e.key==="Delete"&&!inField){
    if(Object.keys(_dbSelected).some(function(k){return _dbSelected[k];}))dbDeleteSelectedRows(db,container,view);
  }else if(e.key==="Enter"&&!inField){
    if(_dbFocusId!=null)dbOpenDetail(db,_dbFocusId);
  }
});
