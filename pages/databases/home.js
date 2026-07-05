/* ETHONE Database Builder — home grid, database shell (view tabs), template picker, Action Registry wiring. */

var _dbUI={mode:"home",openDbId:null,activeViewId:null};
var _dbActionsRegistered=false;

var DB_PLUS_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
var DB_DOTS_SVG='<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>';
var DB_STAR_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
var DB_STAR_FILLED_SVG='<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
var DB_BACK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
var DB_IMPORT_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
var DB_EXPORT_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
var DB_ICON_CHOICES=["📋","📁","🗂️","📊","🧾","🎯","🚀","💡","🛠️","📦","🧠","🎨","📝","🧩","⚙️","🔥","💼","📈","🗓️","🏷️"];
var DB_SWATCHES_HOME=["#8b5cf6","#34d399","#60a5fa","#f87171","#f59e0b","#facc15","#c084fc","#f472b6","#38bdf8","#a3e635","#7a7a82","#f4e389"];

function dbIsPageActive(){
  var page=document.getElementById("page-databases");
  return page&&page.classList.contains("active");
}
function dbActiveDb(){return _dbUI.openDbId?dbGet(_dbUI.openDbId):null;}
function dbActiveView(){
  var db=dbActiveDb();if(!db)return null;
  if(!_dbUI.activeViewId||!db.views.some(function(v){return v.id===_dbUI.activeViewId;}))_dbUI.activeViewId=db.defaultViewId||(db.views[0]&&db.views[0].id);
  return db.views.find(function(v){return v.id===_dbUI.activeViewId;})||db.views[0];
}

// ══════════════════════════════════════════════════════════════
//  MAIN ENTRY
// ══════════════════════════════════════════════════════════════
function renderDatabasesHome(){
  if(!dbIsPageActive())return;
  dbRegisterActions();
  var root=document.getElementById("db-root");
  if(!root)return;
  if(!root.dataset.dbBound){
    root.dataset.dbBound="1";
    root.addEventListener("click",dbRootClickHandler);
    root.addEventListener("contextmenu",function(e){
      var tab=e.target.closest(".db-view-tab");
      if(tab){e.preventDefault();dbOpenViewTabMenu(e.clientX,e.clientY,tab.dataset.viewId);}
    });
  }
  if(_dbUI.mode==="open"&&_dbUI.openDbId&&dbGet(_dbUI.openDbId)){
    dbRenderShell(root);
  }else{
    _dbUI.mode="home";_dbUI.openDbId=null;
    dbRenderHomeGrid(root);
  }
  try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons();}catch(e){}
}
function dbRootClickHandler(e){
  var actionEl=e.target.closest("[data-db-action-id]");
  if(!actionEl)return;
  var Actions=window.Ethone&&window.Ethone.get("actions");
  if(!Actions)return;
  Actions.dispatch(actionEl.dataset.dbActionId,{
    el:actionEl,
    dbId:actionEl.dataset.dbId?parseInt(actionEl.dataset.dbId,10):null,
    viewId:actionEl.dataset.viewId||null
  });
}
function dbRerenderShell(){renderDatabasesHome();}
function dbRerenderView(){
  var db=dbActiveDb(),view=dbActiveView();
  var body=document.getElementById("db-view-body");
  if(!db||!view||!body)return;
  dbRenderActiveView(body,db,view);
}

// ══════════════════════════════════════════════════════════════
//  HOME GRID
// ══════════════════════════════════════════════════════════════
function dbRenderHomeGrid(root){
  var v=dbViewState();
  var list=dbList().slice();
  list.sort(function(a,b){
    var fa=v.favorites.indexOf(a.id)>-1, fb=v.favorites.indexOf(b.id)>-1;
    if(fa!==fb)return fa?-1:1;
    return (b.updatedAt||"").localeCompare(a.updatedAt||"");
  });
  var cardsHTML=list.map(dbHomeCardHTML).join("");
  root.innerHTML='<div class="db-home">'+
    '<header class="db-home-header"><div class="db-home-title"><h1>'+dbEsc(t("nav_databases"))+'</h1><p>'+list.length+"</p></div>"+
    '<button type="button" class="db-new-btn" data-db-action-id="databases.openTemplatePicker">'+DB_PLUS_SVG+"<span>"+dbEsc(t("db_new_database"))+"</span></button></header>"+
    '<div class="db-home-grid">'+cardsHTML+
      '<button type="button" class="db-home-card db-home-card-new" data-db-action-id="databases.openTemplatePicker">'+DB_PLUS_SVG+"<span>"+dbEsc(t("db_new_database"))+"</span></button>"+
    "</div>"+
    (list.length?"":'<div class="db-home-empty">'+dbEsc(t("db_no_databases"))+"</div>")+
  "</div>";
}
function dbHomeCardHTML(db){
  var v=dbViewState();
  var fav=v.favorites.indexOf(db.id)>-1;
  return '<div class="db-home-card" data-db-action-id="databases.open" data-db-id="'+db.id+'" style="--dc:'+dbEsc(db.color)+'">'+
    '<div class="db-home-card-top"><span class="db-home-card-icon">'+dbEsc(db.icon)+"</span>"+
      '<button type="button" class="db-mini-btn db-home-card-fav'+(fav?" active":"")+'" data-db-action-id="databases.toggleFavorite" data-db-id="'+db.id+'" title="'+dbEsc("Favori")+'">'+(fav?DB_STAR_FILLED_SVG:DB_STAR_SVG)+"</button>"+
      '<button type="button" class="db-mini-btn db-home-card-menu" data-db-action-id="databases.cardMenu" data-db-id="'+db.id+'">'+DB_DOTS_SVG+"</button>"+
    "</div>"+
    '<div class="db-home-card-name">'+dbEsc(db.name)+"</div>"+
    '<div class="db-home-card-meta">'+(db.rows?db.rows.length:0)+" · "+(db.views?db.views.length:0)+"</div>"+
  "</div>";
}
function dbOpenCardMenu(el,dbId){
  var r=el.getBoundingClientRect();
  var db=dbGet(dbId);if(!db)return;
  dbOpenContextMenu(r.left,r.bottom+4,[
    {label:t("db_rename"),onClick:function(){dbStartCardRename(dbId);}},
    {label:"Icône & couleur",onClick:function(){dbOpenIconColorPicker(el,{icon:db.icon,color:db.color},function(icon,color){dbSetIcon(dbId,icon,color);dbRerenderShell();});}},
    {divider:true},
    {label:t("db_duplicate"),onClick:function(){var copy=dbDuplicate(dbId);if(copy){toast(t("db_duplicate")+" ✓","success");}dbRerenderShell();}},
    {divider:true},
    {label:t("db_delete"),danger:true,onClick:function(){dbDelete(dbId);dbRerenderShell();}}
  ]);
}
function dbStartCardRename(dbId){
  var card=document.querySelector('.db-home-card[data-db-id="'+dbId+'"]');
  if(!card)return;
  var nameEl=card.querySelector(".db-home-card-name");
  if(!nameEl||nameEl.querySelector("input"))return;
  var current=nameEl.textContent;
  var input=document.createElement("input");
  input.className="db-inline-rename-input";
  input.value=current;
  nameEl.innerHTML="";
  nameEl.appendChild(input);
  input.focus();input.select();
  function commit(){dbRename(dbId,input.value);dbRerenderShell();}
  input.addEventListener("blur",commit);
  input.addEventListener("keydown",function(e){
    e.stopPropagation();
    if(e.key==="Enter"){e.preventDefault();commit();}
    if(e.key==="Escape"){e.preventDefault();dbRerenderShell();}
  });
  input.addEventListener("click",function(e){e.stopPropagation();});
}

// ══════════════════════════════════════════════════════════════
//  ICON / COLOR PICKER
// ══════════════════════════════════════════════════════════════
function dbOpenIconColorPicker(anchor,current,onChange){
  var existing=document.getElementById("db-icon-color-pop");
  if(existing)existing.remove();
  var icon=current.icon,color=current.color;
  var pop=document.createElement("div");
  pop.id="db-icon-color-pop";
  pop.className="db-icon-color-pop";
  pop.innerHTML=
    '<div class="db-icp-icons">'+DB_ICON_CHOICES.map(function(ic){return '<button type="button" class="db-icp-icon'+(ic===icon?" selected":"")+'" data-icon="'+ic+'">'+ic+"</button>";}).join("")+
      '<span class="db-icp-icon db-icp-icon-custom"><input type="text" maxlength="4" id="db-icp-custom-icon" placeholder="…"></span>'+
    "</div>"+
    '<div class="db-icp-colors">'+DB_SWATCHES_HOME.map(function(c){return '<button type="button" class="db-icp-color'+(c===color?" selected":"")+'" style="--cc:'+c+'" data-color="'+c+'"></button>';}).join("")+
      '<input type="color" id="db-icp-custom-color" class="db-icp-custom-color" value="'+(color||"#8b5cf6")+'">'+
    "</div>";
  document.body.appendChild(pop);
  var r=anchor.getBoundingClientRect();
  pop.style.visibility="hidden";
  pop.classList.add("open");
  var pw=pop.offsetWidth,ph=pop.offsetHeight;
  var top=r.bottom+6,left=Math.min(r.left,window.innerWidth-pw-10);
  if(top+ph>window.innerHeight-10)top=Math.max(10,r.top-ph-6);
  pop.style.top=top+"px";pop.style.left=left+"px";
  pop.style.visibility="";
  pop.querySelectorAll(".db-icp-icon[data-icon]").forEach(function(btn){
    btn.addEventListener("click",function(){icon=btn.dataset.icon;onChange(icon,color);close();});
  });
  var customIcon=pop.querySelector("#db-icp-custom-icon");
  customIcon.addEventListener("keydown",function(e){
    e.stopPropagation();
    if(e.key==="Enter"){var v=customIcon.value.trim();if(v){icon=v.slice(0,4);onChange(icon,color);close();}}
  });
  pop.querySelectorAll(".db-icp-color").forEach(function(btn){
    btn.addEventListener("click",function(){color=btn.dataset.color;onChange(icon,color);close();});
  });
  pop.querySelector("#db-icp-custom-color").addEventListener("input",function(e){color=e.target.value;onChange(icon,color);});
  function close(){pop.remove();document.removeEventListener("mousedown",outside);}
  function outside(e){if(!pop.contains(e.target)&&e.target!==anchor)close();}
  setTimeout(function(){document.addEventListener("mousedown",outside);},0);
}

// ══════════════════════════════════════════════════════════════
//  TEMPLATE PICKER
// ══════════════════════════════════════════════════════════════
function dbOpenTemplatePicker(){
  dbCloseTemplatePicker();
  var tpls=(typeof DB_TEMPLATES!=="undefined")?DB_TEMPLATES:[];
  var tiles=tpls.map(dbTemplateTile).join("");
  document.body.insertAdjacentHTML("beforeend",
    '<div class="d4-picker-overlay" id="db-template-picker"><div class="d4-panel d4-picker"><div class="d4-panel-head"><div class="d4-panel-title"><h2>'+dbEsc(t("db_choose_template"))+'</h2></div><button class="d4-icon-button" type="button" id="db-template-close" aria-label="'+dbEsc("Fermer")+'">✕</button></div><div class="d4-picker-grid">'+tiles+"</div></div></div>"
  );
  var overlay=document.getElementById("db-template-picker");
  overlay.addEventListener("click",function(e){if(e.target===overlay)dbCloseTemplatePicker();});
  document.getElementById("db-template-close").addEventListener("click",dbCloseTemplatePicker);
  overlay.querySelectorAll(".d4-picker-tile").forEach(function(btn){
    btn.addEventListener("click",function(){
      var tplId=btn.dataset.templateId;
      dbCloseTemplatePicker();
      dbPromptCreateFromTemplate(tplId);
    });
  });
  document.addEventListener("keydown",dbTemplatePickerEscape);
}
function dbTemplatePickerEscape(e){if(e.key==="Escape")dbCloseTemplatePicker();}
function dbCloseTemplatePicker(){
  var el=document.getElementById("db-template-picker");
  if(el)el.remove();
  document.removeEventListener("keydown",dbTemplatePickerEscape);
}
function dbTemplateTile(tpl){
  return '<button class="d4-picker-tile" type="button" data-template-id="'+tpl.id+'"><i>'+tpl.icon+"</i><strong>"+dbEsc(tpl.label)+"</strong></button>";
}
function dbPromptCreateFromTemplate(templateId){
  var tpl=(typeof dbTemplateById==="function")?dbTemplateById(templateId):null;
  var defaultName=tpl?tpl.label:"Untitled";
  var name=prompt(t("db_new_database")+" :",defaultName);
  if(name==null)return;
  name=name.trim()||defaultName;
  var built=(tpl&&tpl.build)?tpl.build():{columns:null,rows:[]};
  var newDb=dbCreate({name:name,icon:tpl?tpl.icon:"📋",color:tpl?tpl.color:"#8b5cf6",columns:built.columns,rows:built.rows});
  dbOpenDatabase(newDb.id);
}

// ══════════════════════════════════════════════════════════════
//  DATABASE SHELL (open view)
// ══════════════════════════════════════════════════════════════
function dbOpenDatabase(dbId){
  var db=dbGet(dbId);if(!db)return;
  _dbUI.mode="open";
  _dbUI.openDbId=dbId;
  _dbUI.activeViewId=db.defaultViewId||(db.views[0]&&db.views[0].id);
  var v=dbViewState();
  v.lastOpenedId=dbId;
  saveStateNow();
  dbRerenderShell();
}
function dbRenderShell(root){
  var db=dbGet(_dbUI.openDbId);
  if(!db){_dbUI.mode="home";_dbUI.openDbId=null;dbRenderHomeGrid(root);return;}
  var view=dbActiveView();
  var v=dbViewState();
  var fav=v.favorites.indexOf(db.id)>-1;
  root.innerHTML='<div class="db-shell">'+
    '<header class="db-shell-header">'+
      '<button type="button" class="db-back-btn" data-db-action-id="databases.backToHome">'+DB_BACK_SVG+"</button>"+
      '<span class="db-shell-icon" data-db-action-id="databases.iconPicker" data-db-id="'+db.id+'">'+dbEsc(db.icon)+"</span>"+
      '<span class="db-shell-name" data-db-action-id="databases.startRename">'+dbEsc(db.name)+"</span>"+
      '<div class="db-shell-actions">'+
        '<button type="button" class="db-mini-btn'+(fav?" active":"")+'" data-db-action-id="databases.toggleFavorite" data-db-id="'+db.id+'" title="'+dbEsc("Favori")+'">'+(fav?DB_STAR_FILLED_SVG:DB_STAR_SVG)+"</button>"+
        '<button type="button" class="db-mini-btn" data-db-action-id="databases.import" title="'+dbEsc(t("db_import"))+'">'+DB_IMPORT_SVG+"</button>"+
        '<button type="button" class="db-mini-btn" data-db-action-id="databases.export" title="'+dbEsc(t("db_export"))+'">'+DB_EXPORT_SVG+"</button>"+
        '<button type="button" class="db-mini-btn" data-db-action-id="databases.shellMenu">'+DB_DOTS_SVG+"</button>"+
      "</div>"+
    "</header>"+
    dbRenderViewTabsHTML(db,view)+
    '<div class="db-view-body" id="db-view-body"></div>'+
  "</div>";
  var body=document.getElementById("db-view-body");
  dbRenderActiveView(body,db,view);
}
function dbRenderViewTabsHTML(db,activeView){
  var tabs=db.views.map(function(vw){
    return '<button type="button" class="db-view-tab'+(activeView&&vw.id===activeView.id?" active":"")+'" data-db-action-id="databases.switchView" data-view-id="'+vw.id+'">'+dbViewIcon(vw.type)+"<span>"+dbEsc(vw.name)+"</span></button>";
  }).join("");
  return '<div class="db-view-tabs">'+tabs+'<button type="button" class="db-view-tab-add" data-db-action-id="databases.addView" title="'+dbEsc(t("db_add_view"))+'">'+DB_PLUS_SVG+"</button></div>";
}
function dbViewIcon(type){
  var m={table:"📋",kanban:"🗂️",gallery:"🖼️",calendar:"📅",timeline:"📊"};
  return '<span class="db-view-tab-icon">'+(m[type]||"📋")+"</span>";
}
function dbRenderActiveView(container,db,view){
  if(!view){container.innerHTML="";return;}
  if(view.type==="table"&&typeof dbRenderTable==="function")dbRenderTable(container,db,view);
  else if(view.type==="kanban"&&typeof dbRenderKanban==="function")dbRenderKanban(container,db,view);
  else if(view.type==="gallery"&&typeof dbRenderGallery==="function")dbRenderGallery(container,db,view);
  else if(view.type==="calendar"&&typeof dbRenderCalendarView==="function")dbRenderCalendarView(container,db,view);
  else if(view.type==="timeline"&&typeof dbRenderTimeline==="function")dbRenderTimeline(container,db,view);
  else container.innerHTML="";
  try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons();}catch(e){}
}

function dbOpenShellMenu(el){
  var db=dbActiveDb();if(!db)return;
  var r=el.getBoundingClientRect();
  dbOpenContextMenu(r.right-180,r.bottom+4,[
    {label:t("db_rename"),onClick:function(){dbStartShellRename(document.querySelector(".db-shell-name"));}},
    {label:"Icône & couleur",onClick:function(){dbOpenIconColorPicker(el,{icon:db.icon,color:db.color},function(icon,color){dbSetIcon(db.id,icon,color);dbRerenderShell();});}},
    {divider:true},
    {label:t("db_duplicate"),onClick:function(){var copy=dbDuplicate(db.id);if(copy)dbOpenDatabase(copy.id);}},
    {divider:true},
    {label:t("db_delete"),danger:true,onClick:function(){dbDelete(db.id);_dbUI.mode="home";_dbUI.openDbId=null;dbRerenderShell();}}
  ]);
}
function dbStartShellRename(nameEl){
  var db=dbActiveDb();if(!db||!nameEl||nameEl.querySelector("input"))return;
  var current=nameEl.textContent;
  var input=document.createElement("input");
  input.className="db-inline-rename-input db-shell-rename-input";
  input.value=current;
  nameEl.innerHTML="";
  nameEl.appendChild(input);
  input.focus();input.select();
  function commit(){dbRename(db.id,input.value);dbRerenderShell();}
  input.addEventListener("blur",commit);
  input.addEventListener("keydown",function(e){
    e.stopPropagation();
    if(e.key==="Enter"){e.preventDefault();commit();}
    if(e.key==="Escape"){e.preventDefault();dbRerenderShell();}
  });
  input.addEventListener("click",function(e){e.stopPropagation();});
}

// ══════════════════════════════════════════════════════════════
//  VIEWS: add / switch / rename / delete
// ══════════════════════════════════════════════════════════════
function dbViewTypeChoices(){
  return [
    {value:"table",label:t("db_table_view")},
    {value:"kanban",label:t("db_kanban_view")},
    {value:"gallery",label:t("db_gallery_view")},
    {value:"calendar",label:t("db_calendar_view")},
    {value:"timeline",label:t("db_timeline_view")}
  ];
}
function dbOpenAddViewMenu(anchor){
  dbOpenDropdown(anchor,{title:t("db_add_view"),searchable:false,items:dbViewTypeChoices(),onChange:function(type){
    var db=dbActiveDb();if(!db)return;
    dbAddView(db,type);
    dbRerenderShell();
  }});
}
function dbAddView(db,type){
  var id="v"+dbNewId();
  var names={table:"Table",kanban:"Board",gallery:"Gallery",calendar:"Calendar",timeline:"Timeline"};
  var view={id:id,type:type,name:names[type]||type,config:dbDefaultViewConfig(db,type)};
  db.views.push(view);
  dbTouch(db);saveStateNow();
  _dbUI.activeViewId=id;
}
function dbDefaultViewConfig(db,type){
  var cols=dbColumns(db);
  var selectCol=cols.find(function(c){return c.type==="select"||c.type==="multiselect";});
  var imageCol=cols.find(function(c){return c.type==="image";});
  var dateCols=cols.filter(function(c){return c.type==="date";});
  var primary=dbPrimaryColumn(db);
  if(type==="kanban")return {groupByColumn:selectCol?selectCol.key:null};
  if(type==="gallery")return {imageColumn:imageCol?imageCol.key:null,titleColumn:primary?primary.key:null,metaColumns:[]};
  if(type==="calendar")return {dateColumn:dateCols[0]?dateCols[0].key:null};
  if(type==="timeline")return {startColumn:dateCols[0]?dateCols[0].key:null,endColumn:dateCols[1]?dateCols[1].key:null};
  return {sort:[],groupBy:null,filters:[],activeFilterView:"all"};
}
function dbOpenViewTabMenu(x,y,viewId){
  var db=dbActiveDb();if(!db)return;
  var view=db.views.find(function(v){return v.id===viewId;});if(!view)return;
  var items=[{label:t("db_rename"),onClick:function(){dbStartViewTabRename(viewId);}}];
  if(db.views.length>1){
    items.push({divider:true});
    items.push({label:t("db_delete"),danger:true,onClick:function(){
      if(!confirm(t("db_delete_confirm")))return;
      db.views=db.views.filter(function(v){return v.id!==viewId;});
      if(_dbUI.activeViewId===viewId)_dbUI.activeViewId=db.views[0]&&db.views[0].id;
      if(db.defaultViewId===viewId)db.defaultViewId=db.views[0]&&db.views[0].id;
      dbTouch(db);saveStateNow();
      dbRerenderShell();
    }});
  }
  dbOpenContextMenu(x,y,items);
}
function dbStartViewTabRename(viewId){
  var tabLabel=document.querySelector('.db-view-tab[data-view-id="'+viewId+'"] span:last-child');
  var db=dbActiveDb();if(!tabLabel||!db)return;
  var view=db.views.find(function(v){return v.id===viewId;});if(!view)return;
  var input=document.createElement("input");
  input.className="db-inline-rename-input";
  input.value=view.name;
  tabLabel.replaceWith(input);
  input.focus();input.select();
  function commit(){var val=input.value.trim();if(val){view.name=val;dbTouch(db);saveStateNow();}dbRerenderShell();}
  input.addEventListener("blur",commit);
  input.addEventListener("keydown",function(e){
    e.stopPropagation();
    if(e.key==="Enter"){e.preventDefault();commit();}
    if(e.key==="Escape"){e.preventDefault();dbRerenderShell();}
  });
  input.addEventListener("click",function(e){e.stopPropagation();});
}

// ══════════════════════════════════════════════════════════════
//  ACTION REGISTRY
// ══════════════════════════════════════════════════════════════
function dbRegisterActions(){
  if(_dbActionsRegistered)return;
  var Actions=window.Ethone&&window.Ethone.get("actions");
  if(!Actions)return;
  _dbActionsRegistered=true;
  Actions.register("databases.open",{handler:function(ctx){dbOpenDatabase(ctx.dbId);}});
  Actions.register("databases.toggleFavorite",{handler:function(ctx){dbToggleFavorite(ctx.dbId);dbRerenderShell();}});
  Actions.register("databases.cardMenu",{handler:function(ctx){dbOpenCardMenu(ctx.el,ctx.dbId);}});
  Actions.register("databases.openTemplatePicker",{handler:function(){dbOpenTemplatePicker();}});
  Actions.register("databases.backToHome",{handler:function(){_dbUI.mode="home";_dbUI.openDbId=null;dbRerenderShell();}});
  Actions.register("databases.shellMenu",{handler:function(ctx){dbOpenShellMenu(ctx.el);}});
  Actions.register("databases.startRename",{handler:function(ctx){dbStartShellRename(ctx.el);}});
  Actions.register("databases.iconPicker",{handler:function(ctx){
    var db=dbActiveDb();if(!db)return;
    dbOpenIconColorPicker(ctx.el,{icon:db.icon,color:db.color},function(icon,color){dbSetIcon(db.id,icon,color);dbRerenderShell();});
  }});
  Actions.register("databases.addView",{handler:function(ctx){dbOpenAddViewMenu(ctx.el);}});
  Actions.register("databases.switchView",{handler:function(ctx){if(!dbActiveDb())return;_dbUI.activeViewId=ctx.viewId;dbRerenderShell();}});
  Actions.register("databases.export",{handler:function(ctx){var db=dbActiveDb();if(db&&typeof dbExportMenu==="function")dbExportMenu(db,ctx.el);}});
  Actions.register("databases.import",{handler:function(){var db=dbActiveDb();if(db&&typeof dbStartImport==="function")dbStartImport(db);}});
}
dbRegisterActions();
