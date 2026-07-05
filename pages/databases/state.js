/* ETHONE Database Builder — state helpers (mirrors pages/valorant-accounts/index.js's vaAccounts()/vaView() pattern, generalized for multiple independent databases). */

function dbEsc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function dbNewId(){return Date.now()+Math.floor(Math.random()*1000);}

function dbListRaw(){
  var p=curP();if(!p)return[];
  if(!p.state.databases)p.state.databases=[];
  return p.state.databases;
}
function dbList(){return dbListRaw();}
function dbGet(dbId){
  return dbList().find(function(d){return d.id===dbId;});
}
function dbViewState(){
  var p=curP();if(!p)return{lastOpenedId:null,order:null,favorites:[]};
  if(!p.state.databasesView)p.state.databasesView={lastOpenedId:null,order:null,favorites:[]};
  var v=p.state.databasesView;
  if(!v.favorites)v.favorites=[];
  return v;
}

function dbDefaultViews(startCol,endCol,dateCol,imageCol,groupCol,titleCol){
  return [
    {id:"v1",type:"table",name:"Table",config:{sort:[],groupBy:null,filters:[],activeFilterView:"all"}},
    {id:"v2",type:"kanban",name:"Board",config:{groupByColumn:groupCol||null}},
    {id:"v3",type:"calendar",name:"Calendar",config:{dateColumn:dateCol||null}},
    {id:"v4",type:"gallery",name:"Gallery",config:{imageColumn:imageCol||null,titleColumn:titleCol||null,metaColumns:[]}},
    {id:"v5",type:"timeline",name:"Timeline",config:{startColumn:startCol||null,endColumn:endCol||null}}
  ];
}

function dbCreate(opts){
  opts=opts||{};
  var p=curP();if(!p)return null;
  var columns=opts.columns&&opts.columns.length?opts.columns:[{key:"title",label:"Name",type:"text",width:220,primary:true}];
  var primaryCol=columns.find(function(c){return c.primary;})||columns[0];
  var dateCol=columns.find(function(c){return c.type==="date";});
  var selectCol=columns.find(function(c){return c.type==="select"||c.type==="multiselect";});
  var imageCol=columns.find(function(c){return c.type==="image";});
  var dateCols=columns.filter(function(c){return c.type==="date";});
  var now=new Date().toISOString();
  var db={
    id:dbNewId(),
    name:opts.name||"Untitled",
    icon:opts.icon||"📋",
    color:opts.color||"#8b5cf6",
    favorite:false,
    description:opts.description||"",
    columns:columns,
    columnOrder:columns.map(function(c){return c.key;}),
    columnWidths:{},
    hiddenColumns:[],
    pinnedColumns:[],
    lockedColumns:[],
    rows:opts.rows||[],
    views:dbDefaultViews(
      dateCols[0]?dateCols[0].key:null,
      dateCols[1]?dateCols[1].key:null,
      dateCol?dateCol.key:null,
      imageCol?imageCol.key:null,
      selectCol?selectCol.key:null,
      primaryCol.key
    ),
    defaultViewId:"v1",
    knownTags:{},
    dropdownDefs:{},
    createdAt:now,
    updatedAt:now
  };
  dbListRaw().push(db);
  saveStateNow();
  return db;
}
function dbTouch(db){db.updatedAt=new Date().toISOString();}
function dbDuplicate(dbId){
  var src=dbGet(dbId);if(!src)return null;
  var copy=JSON.parse(JSON.stringify(src));
  copy.id=dbNewId();
  copy.name=(copy.name||"Untitled")+" (copie)";
  var now=new Date().toISOString();
  copy.createdAt=now;copy.updatedAt=now;
  var idMap={};
  copy.rows.forEach(function(r){var oldId=r.id;r.id=dbNewId()+Math.floor(Math.random()*100);idMap[oldId]=r.id;});
  dbListRaw().push(copy);
  saveStateNow();
  return copy;
}
function dbDelete(dbId){
  var p=curP();if(!p)return;
  var db=dbGet(dbId);
  if(!db)return;
  if(!confirm(t("db_delete_confirm")))return;
  p.state.databases=dbListRaw().filter(function(d){return d.id!==dbId;});
  var v=dbViewState();
  if(v.lastOpenedId===dbId)v.lastOpenedId=null;
  v.favorites=v.favorites.filter(function(id){return id!==dbId;});
  saveStateNow();
  if(typeof toast==="function")toast(t("db_delete")+" ✓","success");
}
function dbRename(dbId,newName){
  var db=dbGet(dbId);if(!db)return;
  newName=(newName||"").trim();
  if(!newName)return;
  db.name=newName;
  dbTouch(db);
  saveStateNow();
}
function dbSetIcon(dbId,icon,color){
  var db=dbGet(dbId);if(!db)return;
  if(icon!=null)db.icon=icon;
  if(color!=null)db.color=color;
  dbTouch(db);
  saveStateNow();
}
function dbToggleFavorite(dbId){
  var v=dbViewState();
  var i=v.favorites.indexOf(dbId);
  if(i>-1)v.favorites.splice(i,1);else v.favorites.push(dbId);
  saveStateNow();
}

function dbColumns(db){return db.columns;}
function dbRows(db){return db.rows;}
function dbPrimaryColumn(db){return db.columns.find(function(c){return c.primary;})||db.columns[0];}
function dbAllColumnDefs(db){return db.columns;}
function dbOrderedColumns(db){
  var all=db.columns;
  var order=db.columnOrder&&db.columnOrder.length?db.columnOrder:all.map(function(c){return c.key;});
  var byKey={};all.forEach(function(c){byKey[c.key]=c;});
  var out=order.map(function(k){return byKey[k];}).filter(Boolean);
  all.forEach(function(c){if(out.indexOf(c)===-1)out.push(c);});
  return out;
}
function dbVisibleColumns(db){
  return dbOrderedColumns(db).filter(function(c){return db.hiddenColumns.indexOf(c.key)===-1;});
}
function dbColumnByKey(db,key){
  return db.columns.find(function(c){return c.key===key;});
}

function dbOptionsFor(db,colKey){
  if(!db.dropdownDefs)db.dropdownDefs={};
  if(db.dropdownDefs[colKey])return db.dropdownDefs[colKey];
  var col=dbColumnByKey(db,colKey);
  if(col&&col.options){db.dropdownDefs[colKey]=col.options;return col.options;}
  return [];
}
function dbOptionDef(db,colKey,value){
  var opts=dbOptionsFor(db,colKey);
  var d=opts.find(function(o){return o.value===value;});
  if(d)return d;
  return {value:value,label:value,color:"#8b8b93"};
}
function dbSaveDropdownOptions(db,colKey,newOptions){
  if(!db.dropdownDefs)db.dropdownDefs={};
  db.dropdownDefs[colKey]=newOptions;
  var col=dbColumnByKey(db,colKey);
  if(col)col.options=newOptions;
  dbTouch(db);
  saveStateNow();
}
function dbSaveView(){saveStateNow();}
