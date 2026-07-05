/* ETHONE Valorant Accounts — premium database-style manager (Phase 1, fixed schema). */

// ══════════════════════════════════════════════════════════════
//  REFERENCE DATA
// ══════════════════════════════════════════════════════════════
var VA_RANK_TIERS=[
  {key:"iron",label:"Iron",color:"#5a5a5f"},
  {key:"bronze",label:"Bronze",color:"#a3733f"},
  {key:"silver",label:"Silver",color:"#b7c0c8"},
  {key:"gold",label:"Gold",color:"#e0b64b"},
  {key:"platinum",label:"Platinum",color:"#3fb7c0"},
  {key:"diamond",label:"Diamond",color:"#c86ee0"},
  {key:"ascendant",label:"Ascendant",color:"#39c98a"},
  {key:"immortal",label:"Immortal",color:"#b8467a"},
];
var VA_RANKS=(function(){
  var out=[{value:"unranked",label:"Unranked",color:"#7a7a82",category:""}];
  VA_RANK_TIERS.forEach(function(t){
    for(var i=1;i<=3;i++)out.push({value:t.key+i,label:t.label+" "+i,color:t.color,category:"Rangs"});
  });
  out.push({value:"radiant",label:"Radiant",color:"#f4e389",category:"Rangs"});
  return out;
})();
function vaRankDef(value){
  var opts=vaOptionsFor("rank");
  return opts.find(function(r){return r.value===value;})||opts[0]||VA_RANKS[0];
}

var VA_REGIONS=[
  {value:"eu",label:"Europe (EU)"},
  {value:"na",label:"Amérique du Nord (NA)"},
  {value:"latam",label:"Amérique Latine (LATAM)"},
  {value:"br",label:"Brésil (BR)"},
  {value:"ap",label:"Asie-Pacifique (AP)"},
  {value:"kr",label:"Corée (KR)"},
];
function vaRegionLabel(v){var r=VA_REGIONS.find(function(x){return x.value===v;});return r?r.label:(v||"—");}

var VA_AUTH_DEFS=[
  {value:"mobile",label:"Mobile",color:"#34d399",icon:"📱"},
  {value:"email",label:"Email",color:"#60a5fa",icon:"✉️"},
  {value:"gmail",label:"Gmail",color:"#f87171",icon:"G"},
  {value:"outlook",label:"Outlook",color:"#38bdf8",icon:"O"},
  {value:"none",label:"Rien",color:"#7a7a82",icon:"—"},
  {value:"noaccess",label:"No Access",color:"#ef4444",icon:"⛔"},
];
function vaAuthDef(value){
  var opts=vaOptionsFor("authMethod");
  return opts.find(function(a){return a.value===value;})||opts.find(function(a){return a.value==="none";})||opts[0]||VA_AUTH_DEFS[4];
}

var VA_TAG_PRESETS=[
  {value:"Main",label:"⭐ Main",color:"#f4c542"},
  {value:"À dérank",label:"🔴 À dérank",color:"#ef4444"},
  {value:"À rank",label:"🟢 À rank",color:"#34d399"},
  {value:"Smurf",label:"🟣 Smurf",color:"#c084fc"},
  {value:"Vente",label:"⚠ Vente",color:"#f59e0b"},
  {value:"Premium",label:"💰 Premium",color:"#facc15"},
];
function vaTagDef(value){
  var opts=vaOptionsFor("tags");
  var d=opts.find(function(t){return t.value===value;});
  if(d)return d;
  return {value:value,label:value,color:"#8b8b93"};
}

// ══════════════════════════════════════════════════════════════
//  DROPDOWN DEFINITIONS — single source of truth for select/multiselect
//  option lists, shared by built-in columns (rank/authMethod/tags) and
//  user-created custom columns. Editable live via the dropdown editor.
// ══════════════════════════════════════════════════════════════
var VA_BUILTIN_DEFAULTS={rank:VA_RANKS,authMethod:VA_AUTH_DEFS,tags:VA_TAG_PRESETS};
function vaCustomColumnDef(colKey){
  return vaView().customColumns.find(function(c){return c.key===colKey;});
}
function vaOptionsFor(colKey){
  var v=vaView();
  if(!v.dropdownDefs)v.dropdownDefs={};
  if(v.dropdownDefs[colKey])return v.dropdownDefs[colKey];
  if(VA_BUILTIN_DEFAULTS[colKey]){
    var seeded=VA_BUILTIN_DEFAULTS[colKey].map(function(o){return Object.assign({},o);});
    v.dropdownDefs[colKey]=seeded;
    return seeded;
  }
  var custom=vaCustomColumnDef(colKey);
  if(custom){
    if(!custom.options)custom.options=[];
    return custom.options;
  }
  return [];
}
function vaOptionDef(colKey,value){
  var opts=vaOptionsFor(colKey);
  var d=opts.find(function(o){return o.value===value;});
  if(d)return d;
  return {value:value,label:value,color:"#8b8b93"};
}
function vaSaveDropdownOptions(colKey,newOptions){
  var v=vaView();
  if(VA_BUILTIN_DEFAULTS[colKey]){
    v.dropdownDefs[colKey]=newOptions;
  }else{
    var custom=vaCustomColumnDef(colKey);
    if(custom)custom.options=newOptions;
  }
  vaSaveView();
}

var VA_COLUMNS=[
  {key:"sel",   label:"",              width:38,  type:"select", lockedVis:true},
  {key:"avatar",label:"",              width:44,  type:"avatar", lockedVis:true},
  {key:"riotId",label:"ID Riot",       width:170, type:"riot"},
  {key:"password",label:"Mot de passe",width:150, type:"password"},
  {key:"inGameName",label:"Pseudo",    width:150, type:"text"},
  {key:"rank",  label:"Rank",          width:130, type:"rank"},
  {key:"region",label:"Région",        width:100, type:"region"},
  {key:"authMethod",label:"Auth",      width:120, type:"auth"},
  {key:"phone", label:"Téléphone",     width:130, type:"text"},
  {key:"email", label:"Email",         width:180, type:"text"},
  {key:"ranked",label:"Ranked",        width:80,  type:"bool"},
  {key:"notes", label:"Notes",         width:180, type:"longtext"},
  {key:"lastLogin",label:"Dernière connexion", width:140, type:"date"},
  {key:"lastModified",label:"Dernière modif.", width:140, type:"date"},
  {key:"tags",  label:"Tags",          width:200, type:"tags"},
  {key:"owner", label:"Propriétaire",  width:120, type:"text"},
  {key:"skinValue",label:"Skin Value", width:100, type:"number"},
  {key:"actions",label:"",             width:44,  type:"actions", lockedVis:true},
];

var VA_FILTER_VIEWS=[
  {id:"all",label:"Toutes",test:function(){return true;}},
  {id:"main",label:"Main",test:function(a){return (a.tags||[]).indexOf("Main")>-1;}},
  {id:"torank",label:"À rank",test:function(a){return (a.tags||[]).indexOf("À rank")>-1;}},
  {id:"todank",label:"À dérank",test:function(a){return (a.tags||[]).indexOf("À dérank")>-1;}},
  {id:"radiant",label:"Radiant",test:function(a){return a.rank==="radiant";}},
  {id:"ascendant",label:"Ascendant",test:function(a){return (a.rank||"").indexOf("ascendant")===0;}},
  {id:"noaccess",label:"No Access",test:function(a){return a.authMethod==="noaccess";}},
  {id:"nomobile",label:"Sans Mobile",test:function(a){return a.authMethod!=="mobile";}},
  {id:"noemail",label:"Sans Email",test:function(a){return !a.email;}},
];

var VA_GROUP_OPTS=[
  {value:"",label:"Aucun regroupement"},
  {value:"rank",label:"Par Rank"},
  {value:"region",label:"Par Région"},
  {value:"authMethod",label:"Par Authentification"},
  {value:"tags",label:"Par Tags"},
];

// ══════════════════════════════════════════════════════════════
//  STATE HELPERS
// ══════════════════════════════════════════════════════════════
var _vaSelected={};
var _vaFocusId=null;

function vaAccounts(){
  var p=curP();if(!p)return[];
  if(!p.state.valorantAccounts)p.state.valorantAccounts=[];
  return p.state.valorantAccounts;
}
function vaView(){
  var p=curP();if(!p)return{columnOrder:null,columnWidths:{},hiddenColumns:[],pinnedColumns:[],activeFilterView:"all",sort:[],groupBy:null,knownTags:[],customColumns:[],dropdownDefs:{},lockedColumns:[]};
  if(!p.state.valorantAccountsView)p.state.valorantAccountsView={columnOrder:null,columnWidths:{},hiddenColumns:[],pinnedColumns:[],activeFilterView:"all",sort:[],groupBy:null,knownTags:[],customColumns:[],dropdownDefs:{},lockedColumns:[]};
  var v=p.state.valorantAccountsView;
  if(!v.columnWidths)v.columnWidths={};
  if(!v.hiddenColumns)v.hiddenColumns=[];
  if(!v.pinnedColumns)v.pinnedColumns=[];
  if(!v.sort)v.sort=[];
  if(!v.knownTags)v.knownTags=[];
  if(!v.customColumns)v.customColumns=[];
  if(!v.dropdownDefs)v.dropdownDefs={};
  if(!v.lockedColumns)v.lockedColumns=[];
  if(!v.columnLabels)v.columnLabels={};
  return v;
}
function vaSaveView(){saveStateNow();}
function vaAllColumnDefs(){
  var v=vaView();
  var builtins=VA_COLUMNS.map(function(c){
    var override=v.columnLabels&&v.columnLabels[c.key];
    return override?Object.assign({},c,{label:override}):c;
  });
  return builtins.concat(v.customColumns.map(function(c){
    return {key:c.key,label:c.label,width:c.width||150,type:c.type,custom:true};
  }));
}
function vaOrderedColumns(){
  var v=vaView();
  var all=vaAllColumnDefs();
  var order=v.columnOrder&&v.columnOrder.length?v.columnOrder:all.map(function(c){return c.key;});
  var byKey={};all.forEach(function(c){byKey[c.key]=c;});
  var out=order.map(function(k){return byKey[k];}).filter(Boolean);
  all.forEach(function(c){if(out.indexOf(c)===-1)out.push(c);});
  return out;
}
function vaVisibleColumns(){
  var v=vaView();
  return vaOrderedColumns().filter(function(c){return c.lockedVis||v.hiddenColumns.indexOf(c.key)===-1;});
}

function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function vaNewId(){return Date.now()+Math.floor(Math.random()*1000);}
function vaFmtDate(iso){
  if(!iso)return "—";
  try{
    var d=new Date(iso);
    return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"2-digit"})+" · "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  }catch(e){return "—";}
}
function vaTouch(a){a.lastModified=new Date().toISOString();}
function vaFieldLabel(field){
  var c=VA_COLUMNS.find(function(x){return x.key===field;});
  return c?c.label:field;
}
function vaHumanValue(field,val){
  if(field==="rank")return vaRankDef(val).label;
  if(field==="region")return vaRegionLabel(val);
  if(field==="authMethod")return vaAuthDef(val).label;
  if(field==="tags")return (val||[]).join(", ")||"—";
  if(field==="password")return val?"••••••••":"—";
  if(val===""||val==null)return "—";
  return String(val);
}
function vaSetField(a,field,value){
  var oldVal=a[field];
  if(JSON.stringify(oldVal)===JSON.stringify(value))return;
  if(!a.history)a.history=[];
  a.history.unshift({field:field,oldLabel:vaHumanValue(field,oldVal),newLabel:vaHumanValue(field,value),at:new Date().toISOString()});
  if(a.history.length>50)a.history.length=50;
  a[field]=value;
  vaTouch(a);
  saveStateNow();
}

// ══════════════════════════════════════════════════════════════
//  FILTER / SEARCH / SORT / GROUP PIPELINE
// ══════════════════════════════════════════════════════════════
function vaSearchMatch(a,q){
  if(!q)return true;
  q=q.toLowerCase();
  var hay=[a.riotId,a.riotTag,a.inGameName,a.email,a.phone,a.notes,vaRegionLabel(a.region),vaRankDef(a.rank).label,vaAuthDef(a.authMethod).label]
    .concat(a.tags||[]).join(" ").toLowerCase();
  return hay.indexOf(q)>-1;
}
function vaCompare(a,b,col,dir){
  var av=a[col], bv=b[col];
  if(col==="rank"){av=VA_RANKS.findIndex(function(r){return r.value===a.rank;});bv=VA_RANKS.findIndex(function(r){return r.value===b.rank;});}
  if(col==="tags"){av=(a.tags||[]).join(",");bv=(b.tags||[]).join(",");}
  if(av==null)av="";if(bv==null)bv="";
  var res;
  if(typeof av==="number"&&typeof bv==="number")res=av-bv;
  else res=String(av).localeCompare(String(bv),"fr",{numeric:true,sensitivity:"base"});
  return dir==="desc"?-res:res;
}
function vaGetFiltered(){
  var v=vaView();
  var accounts=vaAccounts().slice();
  var filterView=VA_FILTER_VIEWS.find(function(f){return f.id===v.activeFilterView;})||VA_FILTER_VIEWS[0];
  var q=(document.getElementById("va-search")||{}).value||"";
  accounts=accounts.filter(function(a){return filterView.test(a)&&vaSearchMatch(a,q);});
  if(v.sort&&v.sort.length){
    accounts.sort(function(a,b){
      for(var i=0;i<v.sort.length;i++){
        var s=v.sort[i];
        var r=vaCompare(a,b,s.col,s.dir);
        if(r!==0)return r;
      }
      return 0;
    });
  }
  return accounts;
}
function vaGroupLabel(groupBy,val){
  if(groupBy==="rank")return vaRankDef(val).label;
  if(groupBy==="region")return vaRegionLabel(val);
  if(groupBy==="authMethod")return vaAuthDef(val).label;
  return val||"Sans tag";
}
function vaGroupAccounts(list){
  var v=vaView();
  if(!v.groupBy)return[{key:null,label:null,items:list}];
  var groups={},order=[];
  list.forEach(function(a){
    var keys=v.groupBy==="tags"?((a.tags&&a.tags.length)?a.tags:["__none__"]):[a[v.groupBy]||"__none__"];
    keys.forEach(function(key){
      if(!groups[key]){groups[key]=[];order.push(key);}
      groups[key].push(a);
    });
  });
  return order.map(function(key){
    return {key:key,label:key==="__none__"?"—":vaGroupLabel(v.groupBy,key),items:groups[key]};
  });
}

// ══════════════════════════════════════════════════════════════
//  RENDER: STATS
// ══════════════════════════════════════════════════════════════
function vaRenderStats(){
  var el=document.getElementById("va-stats");if(!el)return;
  var all=vaAccounts();
  var stats=[
    {label:"Comptes",value:all.length,color:"var(--accent)"},
    {label:"Main",value:all.filter(function(a){return (a.tags||[]).indexOf("Main")>-1;}).length,color:"#f4c542"},
    {label:"Radiant",value:all.filter(function(a){return a.rank==="radiant";}).length,color:"#f4e389"},
    {label:"Ascendant",value:all.filter(function(a){return (a.rank||"").indexOf("ascendant")===0;}).length,color:"#39c98a"},
    {label:"Mobile Verify",value:all.filter(function(a){return a.authMethod==="mobile";}).length,color:"#34d399"},
    {label:"No Access",value:all.filter(function(a){return a.authMethod==="noaccess";}).length,color:"#ef4444"},
  ];
  el.innerHTML=stats.map(function(s){
    return '<div class="va-stat-card"><div class="va-stat-value" style="color:'+s.color+'">'+s.value+'</div><div class="va-stat-label">'+esc(s.label)+"</div></div>";
  }).join("");
}

// ══════════════════════════════════════════════════════════════
//  RENDER: FILTER TABS
// ══════════════════════════════════════════════════════════════
function vaRenderFilterTabs(){
  var el=document.getElementById("va-filter-tabs");if(!el)return;
  var v=vaView();
  el.innerHTML='<span class="va-tabs-slider" id="va-tabs-slider"></span>'+VA_FILTER_VIEWS.map(function(f){
    return '<button type="button" class="va-tab'+(v.activeFilterView===f.id?" active":"")+'" data-fv="'+f.id+'">'+esc(f.label)+"</button>";
  }).join("");
  el.querySelectorAll(".va-tab").forEach(function(btn){
    btn.addEventListener("click",function(){
      vaView().activeFilterView=btn.dataset.fv;
      vaSaveView();
      vaRender();
    });
  });
  vaPositionTabsSlider();
}
function vaPositionTabsSlider(){
  var wrap=document.getElementById("va-filter-tabs");
  var slider=document.getElementById("va-tabs-slider");
  var active=wrap&&wrap.querySelector(".va-tab.active");
  if(!wrap||!slider||!active)return;
  var wr=wrap.getBoundingClientRect(),ar=active.getBoundingClientRect();
  slider.style.width=ar.width+"px";
  slider.style.transform="translateX("+(ar.left-wr.left)+"px)";
}

// ══════════════════════════════════════════════════════════════
//  RENDER: GROUP-BY SLOT
// ══════════════════════════════════════════════════════════════
function vaRenderGroupSlot(){
  var slot=document.getElementById("va-group-slot");if(!slot)return;
  var v=vaView();
  var cur=VA_GROUP_OPTS.find(function(g){return g.value===(v.groupBy||"");})||VA_GROUP_OPTS[0];
  slot.innerHTML='<button type="button" class="va-icon-btn va-group-btn" id="va-group-btn" title="Regrouper">'+
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="15" width="7" height="7" rx="1.5"/><rect x="14" y="15" width="7" height="7" rx="1.5"/></svg>'+
    '<span>'+esc(cur.label)+"</span></button>";
  document.getElementById("va-group-btn").addEventListener("click",function(e){
    vaOpenDropdown(e.currentTarget,{
      title:"Regrouper par",
      searchable:false,
      items:VA_GROUP_OPTS,
      selected:v.groupBy||"",
      onChange:function(val){
        vaView().groupBy=val||null;
        vaSaveView();
        vaRender();
      }
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  RENDER: TABLE HEADER
// ══════════════════════════════════════════════════════════════
function vaRenderThead(){
  var thead=document.getElementById("va-thead");if(!thead)return;
  var cols=vaVisibleColumns();
  var v=vaView();
  var allChecked=vaAccounts().length>0&&vaAccounts().every(function(a){return _vaSelected[a.id];});
  var html='<tr>';
  cols.forEach(function(c){
    var w=v.columnWidths[c.key]||c.width;
    var pinned=v.pinnedColumns.indexOf(c.key)>-1;
    var style="width:"+w+"px;min-width:"+w+"px;max-width:"+w+"px;"+(pinned?"position:sticky;left:0;z-index:3;":"");
    if(c.key==="sel"){
      html+='<th style="'+style+'"><input type="checkbox" class="va-checkbox" id="va-select-all"'+(allChecked?" checked":"")+"></th>";
      return;
    }
    if(c.key==="avatar"||c.key==="actions"){html+='<th style="'+style+'"></th>';return;}
    var sortIdx=v.sort.findIndex(function(s){return s.col===c.key;});
    var sortInfo=sortIdx>-1?v.sort[sortIdx]:null;
    var locked=v.lockedColumns.indexOf(c.key)>-1;
    html+='<th style="'+style+'" data-col="'+c.key+'" class="va-th'+(sortInfo?" sorted":"")+(locked?" locked":"")+'" draggable="'+(!locked)+'">'+
      (locked?'<span class="va-th-lock">'+VA_LOCK_SVG+"</span>":"")+
      '<span class="va-th-label">'+esc(c.label)+"</span>"+
      (sortInfo?'<span class="va-th-sort">'+(sortInfo.dir==="asc"?"↑":"↓")+(v.sort.length>1?(sortIdx+1):"")+"</span>":"")+
      (locked?"":'<span class="va-th-resize" data-col="'+c.key+'"></span>')+
    "</th>";
  });
  html+='<th class="va-th-add"><button type="button" id="va-add-column-btn" title="Ajouter une colonne">'+VA_PLUS_SVG+"</button></th>";
  html+="</tr>";
  thead.innerHTML=html;
  var addBtn=document.getElementById("va-add-column-btn");
  if(addBtn)addBtn.addEventListener("click",function(e){vaOpenAddColumnPopover(e.currentTarget);});

  var selectAll=document.getElementById("va-select-all");
  if(selectAll)selectAll.addEventListener("change",function(){
    if(selectAll.checked)vaAccounts().forEach(function(a){_vaSelected[a.id]=true;});
    else _vaSelected={};
    vaRenderRows();vaRenderBulkBar();
  });

  thead.querySelectorAll(".va-th").forEach(function(th){
    th.addEventListener("click",function(e){
      if(e.target.classList.contains("va-th-resize"))return;
      var col=th.dataset.col;
      var multi=e.shiftKey;
      var v2=vaView();
      var idx=v2.sort.findIndex(function(s){return s.col===col;});
      if(!multi){
        if(idx===0&&v2.sort.length===1){
          v2.sort[0].dir=v2.sort[0].dir==="asc"?"desc":"asc";
        }else{
          v2.sort=[{col:col,dir:"asc"}];
        }
      }else{
        if(idx>-1)v2.sort[idx].dir=v2.sort[idx].dir==="asc"?"desc":"asc";
        else v2.sort.push({col:col,dir:"asc"});
      }
      vaSaveView();
      vaRender();
    });
    th.addEventListener("contextmenu",function(e){
      e.preventDefault();
      vaOpenColumnContextMenu(e,th.dataset.col);
    });
    th.addEventListener("dblclick",function(e){
      if(e.target.classList.contains("va-th-resize"))return;
      e.stopPropagation();
      vaStartColumnRename(th,th.dataset.col);
    });
    th.addEventListener("dragstart",function(e){
      e.dataTransfer.setData("text/plain",th.dataset.col);
      th.classList.add("dragging");
    });
    th.addEventListener("dragend",function(){th.classList.remove("dragging");});
    th.addEventListener("dragover",function(e){
      if(th.classList.contains("locked"))return;
      e.preventDefault();
      th.classList.add("drag-over");
    });
    th.addEventListener("dragleave",function(){th.classList.remove("drag-over");});
    th.addEventListener("drop",function(e){
      e.preventDefault();
      th.classList.remove("drag-over");
      var fromKey=e.dataTransfer.getData("text/plain");
      var toKey=th.dataset.col;
      if(fromKey===toKey||th.classList.contains("locked"))return;
      vaReorderColumn(fromKey,toKey);
    });
  });
  vaWireColumnResize();
}
var VA_LOCK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="10" height="10"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
var VA_PLUS_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
function vaReorderColumn(fromKey,toKey){
  var v=vaView();
  if(!v.columnOrder||!v.columnOrder.length)v.columnOrder=vaAllColumnDefs().map(function(c){return c.key;});
  var fromIdx=v.columnOrder.indexOf(fromKey);
  var toIdx=v.columnOrder.indexOf(toKey);
  if(fromIdx===-1||toIdx===-1)return;
  var moved=v.columnOrder.splice(fromIdx,1)[0];
  v.columnOrder.splice(toIdx,0,moved);
  vaSaveView();
  vaRender();
}
var VA_TYPE_TO_GENERIC={rank:"select",auth:"select",tags:"multiselect",riot:"text",longtext:"text",bool:"checkbox",number:"genericNumber",region:"text"};
function vaGenericTypeFor(type){return VA_TYPE_TO_GENERIC[type]||type;}
function vaIsCustomColumn(colKey){return vaView().customColumns.some(function(c){return c.key===colKey;});}
function vaIsOptionsType(type){return type==="select"||type==="multiselect"||type==="rank"||type==="auth"||type==="tags";}

function vaRenameColumn(colKey,newLabel){
  newLabel=(newLabel||"").trim();
  if(!newLabel)return;
  var custom=vaCustomColumnDef(colKey);
  if(custom){
    custom.label=newLabel;
  }else{
    var v=vaView();
    if(!v.columnLabels)v.columnLabels={};
    v.columnLabels[colKey]=newLabel;
  }
  vaSaveView();
  vaRender();
}
function vaStartColumnRename(th,colKey){
  if(th.querySelector(".va-th-rename-input"))return;
  var labelEl=th.querySelector(".va-th-label");
  var current=labelEl.textContent;
  var input=document.createElement("input");
  input.className="va-th-rename-input";
  input.value=current;
  labelEl.replaceWith(input);
  input.focus();input.select();
  function commit(){vaRenameColumn(colKey,input.value);}
  input.addEventListener("blur",commit);
  input.addEventListener("keydown",function(e){
    e.stopPropagation();
    if(e.key==="Enter"){e.preventDefault();commit();}
    if(e.key==="Escape"){e.preventDefault();vaRenderThead();}
  });
  input.addEventListener("click",function(e){e.stopPropagation();});
}
function vaDuplicateColumn(colKey){
  var colDef=vaAllColumnDefs().find(function(c){return c.key===colKey;});
  if(!colDef)return;
  var v=vaView();
  var newType=vaGenericTypeFor(colDef.type);
  var newCol={key:"custom_"+vaNewId(),label:colDef.label+" (copie)",type:newType,width:colDef.width||150};
  if(vaIsOptionsType(colDef.type)||vaIsOptionsType(newType)){
    newCol.options=vaOptionsFor(colKey).map(function(o){return Object.assign({},o);});
  }
  v.customColumns.push(newCol);
  if(!v.columnOrder||!v.columnOrder.length)v.columnOrder=vaAllColumnDefs().map(function(c){return c.key;});
  var idx=v.columnOrder.indexOf(colKey);
  v.columnOrder.splice(idx>-1?idx+1:v.columnOrder.length,0,newCol.key);
  vaSaveView();
  vaRender();
  toast("Colonne dupliquée","success");
}
function vaChangeColumnType(colKey,newType){
  var custom=vaCustomColumnDef(colKey);
  if(!custom)return;
  if(custom.type===newType)return;
  if(!confirm("Changer le type effacera les valeurs déjà saisies dans cette colonne. Continuer ?"))return;
  custom.type=newType;
  if(vaIsOptionsType(newType))custom.options=[];
  else delete custom.options;
  vaAccounts().forEach(function(a){delete a[colKey];});
  vaSaveView();
  saveStateNow();
  vaRender();
}
function vaDeleteColumn(colKey){
  if(!vaIsCustomColumn(colKey))return;
  if(!confirm("Supprimer cette colonne ? Les données associées seront perdues pour tous les comptes."))return;
  var v=vaView();
  v.customColumns=v.customColumns.filter(function(c){return c.key!==colKey;});
  if(v.columnOrder)v.columnOrder=v.columnOrder.filter(function(k){return k!==colKey;});
  v.hiddenColumns=v.hiddenColumns.filter(function(k){return k!==colKey;});
  v.pinnedColumns=v.pinnedColumns.filter(function(k){return k!==colKey;});
  v.lockedColumns=v.lockedColumns.filter(function(k){return k!==colKey;});
  vaAccounts().forEach(function(a){delete a[colKey];});
  vaSaveView();
  saveStateNow();
  vaRender();
  toast("Colonne supprimée","success");
}
function vaToggleColumnLock(colKey){
  var v=vaView();
  var idx=v.lockedColumns.indexOf(colKey);
  if(idx>-1)v.lockedColumns.splice(idx,1);
  else v.lockedColumns.push(colKey);
  vaSaveView();
  vaRender();
}

var VA_COLUMN_TYPE_CHOICES=[
  {value:"text",label:"Texte"},
  {value:"genericNumber",label:"Nombre"},
  {value:"date",label:"Date"},
  {value:"time",label:"Heure"},
  {value:"checkbox",label:"Checkbox"},
  {value:"select",label:"Dropdown"},
  {value:"multiselect",label:"Multi-dropdown"},
  {value:"color",label:"Couleur"},
  {value:"email",label:"Email"},
  {value:"phone",label:"Téléphone"},
  {value:"url",label:"URL"},
  {value:"image",label:"Image"},
  {value:"image",label:"Avatar"},
  {value:"multiselect",label:"Tags"},
  {value:"select",label:"Rang"},
  {value:"progress",label:"Progression"},
  {value:"text",label:"Note"},
  {value:"button",label:"Bouton"},
  {value:"icon",label:"Icône"},
  {value:"select",label:"Badge"},
];

function vaOpenColumnContextMenu(e,colKey){
  var v=vaView();
  var pinned=v.pinnedColumns.indexOf(colKey)>-1;
  var locked=v.lockedColumns.indexOf(colKey)>-1;
  var isCustom=vaIsCustomColumn(colKey);
  var colDef=vaAllColumnDefs().find(function(c){return c.key===colKey;});
  var th=document.querySelector('.va-th[data-col="'+colKey+'"]');
  var items=[
    {label:"Renommer",onClick:function(){if(th)vaStartColumnRename(th,colKey);}},
    {label:"Dupliquer",onClick:function(){vaDuplicateColumn(colKey);}},
  ];
  if(isCustom){
    items.push({label:"Changer le type",onClick:function(){
      vaOpenDropdown(th||document.body,{title:"Changer le type",searchable:false,items:VA_COLUMN_TYPE_CHOICES,onChange:function(v2){vaChangeColumnType(colKey,v2);}});
    }});
  }
  if(colDef&&(vaIsOptionsType(colDef.type)||(isCustom&&(colDef.type==="select"||colDef.type==="multiselect")))){
    items.push({label:"Modifier le dropdown",onClick:function(){vaOpenDropdownEditor(colKey);}});
  }else if(isCustom){
    items.push({label:"Créer un dropdown",onClick:function(){vaChangeColumnType(colKey,"select");vaOpenDropdownEditor(colKey);}});
  }
  items.push({divider:true});
  items.push({label:locked?"Déverrouiller":"Verrouiller",onClick:function(){vaToggleColumnLock(colKey);}});
  if(!locked){
    items.push({label:pinned?"Désépingler":"Épingler à gauche",onClick:function(){
      if(pinned)v.pinnedColumns=v.pinnedColumns.filter(function(k){return k!==colKey;});
      else v.pinnedColumns.push(colKey);
      vaSaveView();vaRender();
    }});
    items.push({label:"Masquer la colonne",onClick:function(){
      v.hiddenColumns.push(colKey);
      vaSaveView();vaRender();
    }});
  }
  items.push({divider:true});
  items.push({label:"Trier croissant",onClick:function(){v.sort=[{col:colKey,dir:"asc"}];vaSaveView();vaRender();}});
  items.push({label:"Trier décroissant",onClick:function(){v.sort=[{col:colKey,dir:"desc"}];vaSaveView();vaRender();}});
  if(isCustom&&!locked){
    items.push({divider:true});
    items.push({label:"Supprimer la colonne",danger:true,onClick:function(){vaDeleteColumn(colKey);}});
  }
  vaOpenContextMenu(e.clientX,e.clientY,items);
}
function vaWireColumnResize(){
  var thead=document.getElementById("va-thead");if(!thead)return;
  thead.querySelectorAll(".va-th-resize").forEach(function(handle){
    handle.addEventListener("mousedown",function(e){
      e.preventDefault();e.stopPropagation();
      var col=handle.dataset.col;
      var th=handle.closest(".va-th")||handle.parentElement;
      var startX=e.clientX, startW=th.getBoundingClientRect().width;
      function onMove(ev){
        var w=Math.max(60,startW+(ev.clientX-startX));
        vaView().columnWidths[col]=Math.round(w);
        vaApplyColumnWidths();
      }
      function onUp(){
        document.removeEventListener("mousemove",onMove);
        document.removeEventListener("mouseup",onUp);
        vaSaveView();
      }
      document.addEventListener("mousemove",onMove);
      document.addEventListener("mouseup",onUp);
    });
  });
}
function vaApplyColumnWidths(){
  var v=vaView();
  document.querySelectorAll("#va-table [data-col]").forEach(function(cell){
    var w=v.columnWidths[cell.dataset.col];
    if(w){cell.style.width=w+"px";cell.style.minWidth=w+"px";cell.style.maxWidth=w+"px";}
  });
}

// ══════════════════════════════════════════════════════════════
//  RENDER: TABLE ROWS
// ══════════════════════════════════════════════════════════════
function vaCellHTML(a,col){
  var v=vaView();
  var w=v.columnWidths[col.key]||col.width;
  switch(col.type){
    case "avatar":
      return a.avatar?'<img src="'+esc(a.avatar)+'" class="va-avatar-img" onerror="this.remove()">':'<div class="va-avatar-fallback">'+esc((a.inGameName||a.riotId||"?")[0].toUpperCase())+"</div>";
    case "riot":
      return '<span class="va-cell-text va-cell-strong">'+(a.icon?'<span class="va-row-icon">'+esc(a.icon)+"</span> ":"")+esc(a.riotId||"—")+(a.riotTag?'<span class="va-riot-tag">#'+esc(a.riotTag)+"</span>":"")+"</span>";
    case "password":
      return '<span class="va-pw-cell" data-id="'+a.id+'"><span class="va-pw-dots">••••••••</span><span class="va-pw-plain" style="display:none">'+esc(a.password||"")+'</span><button type="button" class="va-mini-btn va-pw-eye" title="Afficher">'+VA_EYE_SVG+'</button><button type="button" class="va-mini-btn va-copy-btn" data-copy="password" title="Copier">'+VA_COPY_SVG+"</button></span>";
    case "rank":
      var rd=vaRankDef(a.rank);
      return '<span class="va-badge va-rank-badge" style="--bc:'+rd.color+'"><span class="va-badge-dot"></span>'+esc(rd.label)+"</span>";
    case "region":
      return '<span class="va-cell-text">'+esc(vaRegionLabel(a.region))+"</span>";
    case "auth":
      var ad=vaAuthDef(a.authMethod);
      return '<span class="va-badge va-auth-badge" style="--bc:'+ad.color+'">'+ad.icon+" "+esc(ad.label)+"</span>";
    case "bool":
      return a.ranked?'<span class="va-bool-yes">✓</span>':'<span class="va-bool-no">–</span>';
    case "longtext":
      return '<span class="va-cell-text va-cell-truncate" title="'+esc(a.notes||"")+'">'+esc(a.notes||"—")+"</span>";
    case "date":
      return '<span class="va-cell-text va-cell-muted">'+esc(vaFmtDate(a[col.key]))+"</span>";
    case "tags":
      return '<span class="va-tags-cell">'+(a.tags||[]).map(function(t){var td=vaTagDef(t);return '<span class="va-badge va-tag-badge" style="--bc:'+td.color+'">'+esc(td.label)+"</span>";}).join("")+"</span>";
    case "number":
      return '<span class="va-cell-text va-cell-muted">'+(a.skinValue?esc(a.skinValue):"—")+"</span>";
    case "actions":
      return '<button type="button" class="va-mini-btn va-row-menu-btn" title="Actions">'+VA_DOTS_SVG+"</button>";

    // ── Generic types (custom columns) ──
    case "text":
      return '<span class="va-cell-text va-cell-truncate">'+esc(a[col.key]||"—")+"</span>";
    case "email":
      return a[col.key]?'<a class="va-cell-link" href="mailto:'+esc(a[col.key])+'" onclick="event.stopPropagation()">'+esc(a[col.key])+"</a>":'<span class="va-cell-text va-cell-muted">—</span>';
    case "phone":
      return a[col.key]?'<a class="va-cell-link" href="tel:'+esc(a[col.key])+'" onclick="event.stopPropagation()">'+esc(a[col.key])+"</a>":'<span class="va-cell-text va-cell-muted">—</span>';
    case "url":
      return a[col.key]?'<a class="va-cell-link" href="'+esc(a[col.key])+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">'+esc(a[col.key].replace(/^https?:\/\//,""))+"</a>":'<span class="va-cell-text va-cell-muted">—</span>';
    case "genericNumber":
      return '<span class="va-cell-text va-cell-muted">'+(a[col.key]!=null&&a[col.key]!==""?esc(a[col.key]):"—")+"</span>";
    case "time":
      return '<span class="va-cell-text va-cell-muted">'+esc(a[col.key]||"—")+"</span>";
    case "checkbox":
      return a[col.key]?'<span class="va-bool-yes">✓</span>':'<span class="va-bool-no">–</span>';
    case "select":
      var sd=vaOptionDef(col.key,a[col.key]);
      return a[col.key]?'<span class="va-badge" style="--bc:'+sd.color+'">'+(sd.icon?sd.icon+" ":"")+esc(sd.label)+"</span>":'<span class="va-cell-text va-cell-muted">—</span>';
    case "multiselect":
      return '<span class="va-tags-cell">'+(a[col.key]||[]).map(function(t){var td=vaOptionDef(col.key,t);return '<span class="va-badge" style="--bc:'+td.color+'">'+(td.icon?td.icon+" ":"")+esc(td.label)+"</span>";}).join("")+"</span>";
    case "color":
      return a[col.key]?'<span class="va-color-cell" style="--cc:'+esc(a[col.key])+'"><span class="va-color-swatch"></span>'+esc(a[col.key])+"</span>":'<span class="va-cell-text va-cell-muted">—</span>';
    case "image":
      return a[col.key]?'<img src="'+esc(a[col.key])+'" class="va-avatar-img" onerror="this.remove()">':'<div class="va-avatar-fallback">—</div>';
    case "icon":
      return '<span class="va-icon-cell">'+esc(a[col.key]||"—")+"</span>";
    case "button":
      return a[col.key]?'<a class="va-cell-btn" href="'+esc(a[col.key])+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">'+esc(col.buttonLabel||"Ouvrir ↗")+"</a>":'<span class="va-cell-text va-cell-muted">—</span>';
    case "progress":
      var pct=Math.max(0,Math.min(100,parseFloat(a[col.key])||0));
      return '<span class="va-progress-cell"><span class="va-progress-track"><span class="va-progress-fill" style="width:'+pct+'%"></span></span><span class="va-progress-label">'+pct+"%</span></span>";
    default:
      return '<span class="va-cell-text">'+esc(a[col.key]||"—")+"</span>";
  }
}
var VA_EYE_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
var VA_COPY_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
var VA_DOTS_SVG='<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>';

function vaRenderRows(){
  var tbody=document.getElementById("va-tbody");if(!tbody)return;
  var filtered=vaGetFiltered();
  var cols=vaVisibleColumns();
  var v=vaView();
  document.getElementById("va-empty-state").style.display=filtered.length?"none":"flex";
  document.getElementById("va-table-wrap").classList.toggle("empty",!filtered.length);

  var groups=vaGroupAccounts(filtered);
  var html="";
  groups.forEach(function(g){
    if(g.key!==null){
      html+='<tr class="va-group-row"><td colspan="'+cols.length+'"><span class="va-group-label">'+esc(g.label)+'</span><span class="va-group-count">'+g.items.length+"</span></td></tr>";
    }
    g.items.forEach(function(a){
      var sel=!!_vaSelected[a.id];
      var rowColorStyle=a.rowColor?' style="--rc:'+esc(a.rowColor)+'"':"";
      html+='<tr class="va-row'+(sel?" selected":"")+(a.rowColor?" colored":"")+'" data-id="'+a.id+'" draggable="'+(v.sort.length||v.groupBy?"false":"true")+'"'+rowColorStyle+'>';
      cols.forEach(function(c){
        var w=v.columnWidths[c.key]||c.width;
        var pinned=v.pinnedColumns.indexOf(c.key)>-1;
        var style="width:"+w+"px;min-width:"+w+"px;max-width:"+w+"px;"+(pinned?"position:sticky;left:0;z-index:2;":"");
        if(c.key==="sel"){
          html+='<td style="'+style+'"><input type="checkbox" class="va-checkbox va-row-check" data-id="'+a.id+'"'+(sel?" checked":"")+"></td>";
        }else{
          html+='<td style="'+style+'" data-col="'+c.key+'" data-id="'+a.id+'">'+vaCellHTML(a,c)+"</td>";
        }
      });
      html+="</tr>";
    });
  });
  tbody.innerHTML=html;
  vaWireRowEvents();
}

function vaWireRowEvents(){
  var tbody=document.getElementById("va-tbody");
  tbody.querySelectorAll(".va-row").forEach(function(tr){
    var id=parseInt(tr.dataset.id,10);
    tr.addEventListener("click",function(e){
      if(e.target.closest(".va-checkbox,.va-mini-btn,.va-pw-eye,.va-copy-btn,.va-row-menu-btn"))return;
      if(e.shiftKey){vaSelectRange(id);}
      else if(e.ctrlKey||e.metaKey){_vaSelected[id]=!_vaSelected[id];if(!_vaSelected[id])delete _vaSelected[id];vaRenderRows();vaRenderBulkBar();}
      else{vaOpenDetail(id);}
      _vaFocusId=id;
    });
    tr.addEventListener("dblclick",function(e){
      if(e.target.closest(".va-checkbox"))return;
      vaOpenDetail(id);
    });
    tr.addEventListener("contextmenu",function(e){
      e.preventDefault();
      _vaFocusId=id;
      if(!_vaSelected[id]){_vaSelected={};_vaSelected[id]=true;vaRenderRows();vaRenderBulkBar();}
      vaOpenRowContextMenu(e.clientX,e.clientY,id);
    });
    tr.addEventListener("dragstart",function(e){e.dataTransfer.setData("text/plain",String(id));tr.classList.add("dragging");});
    tr.addEventListener("dragend",function(){tr.classList.remove("dragging");});
    tr.addEventListener("dragover",function(e){e.preventDefault();tr.classList.add("drag-over");});
    tr.addEventListener("dragleave",function(){tr.classList.remove("drag-over");});
    tr.addEventListener("drop",function(e){
      e.preventDefault();tr.classList.remove("drag-over");
      var fromId=parseInt(e.dataTransfer.getData("text/plain"),10);
      if(fromId===id)return;
      vaReorderAccount(fromId,id);
    });
  });
  tbody.querySelectorAll(".va-row-check").forEach(function(cb){
    cb.addEventListener("change",function(){
      var id=parseInt(cb.dataset.id,10);
      if(cb.checked)_vaSelected[id]=true;else delete _vaSelected[id];
      vaRenderBulkBar();
      var tr=cb.closest(".va-row");if(tr)tr.classList.toggle("selected",cb.checked);
    });
  });
  tbody.querySelectorAll(".va-pw-eye").forEach(function(btn){
    btn.addEventListener("click",function(e){
      e.stopPropagation();
      var wrap=btn.closest(".va-pw-cell");
      var dots=wrap.querySelector(".va-pw-dots"), plain=wrap.querySelector(".va-pw-plain");
      var showing=plain.style.display!=="none";
      dots.style.display=showing?"":"none";
      plain.style.display=showing?"none":"";
      btn.classList.toggle("active",!showing);
    });
  });
  tbody.querySelectorAll(".va-copy-btn").forEach(function(btn){
    btn.addEventListener("click",function(e){
      e.stopPropagation();
      var id=parseInt(btn.closest("[data-id]").dataset.id,10);
      var field=btn.dataset.copy;
      var a=vaAccounts().find(function(x){return x.id===id;});
      if(a)vaCopyField(a,field);
    });
  });
  tbody.querySelectorAll(".va-row-menu-btn").forEach(function(btn){
    btn.addEventListener("click",function(e){
      e.stopPropagation();
      var id=parseInt(btn.closest("[data-id]").dataset.id,10);
      var r=btn.getBoundingClientRect();
      _vaFocusId=id;
      vaOpenRowContextMenu(r.left,r.bottom+4,id);
    });
  });
  var VA_READONLY_COLS=["lastLogin","lastModified","password","avatar","actions"];
  tbody.querySelectorAll("[data-col]").forEach(function(cell){
    if(VA_READONLY_COLS.indexOf(cell.dataset.col)>-1)return;
    cell.addEventListener("click",function(e){
      if(e.detail>1)return;
      e.stopPropagation();
      vaOpenCellEditor(cell);
    });
  });
}
function vaSelectRange(toId){
  var filtered=vaGetFiltered();
  var ids=filtered.map(function(a){return a.id;});
  var fromIdx=_vaFocusId!=null?ids.indexOf(_vaFocusId):0;
  var toIdx=ids.indexOf(toId);
  if(fromIdx===-1)fromIdx=0;
  var lo=Math.min(fromIdx,toIdx), hi=Math.max(fromIdx,toIdx);
  for(var i=lo;i<=hi;i++)_vaSelected[ids[i]]=true;
  vaRenderRows();vaRenderBulkBar();
}
function vaReorderAccount(fromId,toId){
  var list=vaAccounts();
  var fromIdx=list.findIndex(function(a){return a.id===fromId;});
  var toIdx=list.findIndex(function(a){return a.id===toId;});
  if(fromIdx===-1||toIdx===-1)return;
  var moved=list.splice(fromIdx,1)[0];
  list.splice(toIdx,0,moved);
  saveStateNow();
  vaRenderRows();
}

function vaOpenCellEditor(cell){
  var id=parseInt(cell.dataset.id,10);
  var col=cell.dataset.col;
  var a=vaAccounts().find(function(x){return x.id===id;});
  if(!a)return;
  if(col==="rank"){
    vaOpenDropdown(cell,{title:"Rank",items:vaOptionsFor("rank"),selected:a.rank,onChange:function(v){vaSetField(a,"rank",v);vaRender();}});
  }else if(col==="region"){
    vaOpenDropdown(cell,{title:"Région",items:VA_REGIONS,selected:a.region,onChange:function(v){vaSetField(a,"region",v);vaRender();}});
  }else if(col==="authMethod"){
    vaOpenDropdown(cell,{title:"Authentification",items:vaOptionsFor("authMethod"),selected:a.authMethod,onChange:function(v){vaSetField(a,"authMethod",v);vaRender();}});
  }else if(col==="tags"){
    var v=vaView();
    var items=vaOptionsFor("tags").concat((v.knownTags||[]).filter(function(kt){return !vaOptionsFor("tags").some(function(p){return p.value===kt;});}).map(function(kt){return vaTagDef(kt);}));
    vaOpenDropdown(cell,{title:"Tags",multi:true,allowCreate:true,items:items,selected:(a.tags||[]).slice(),
      onCreate:function(val){if(v.knownTags.indexOf(val)===-1){v.knownTags.push(val);vaSaveView();}},
      onChange:function(vals){vaSetField(a,"tags",vals);vaRender();}});
  }else{
    var colDef=vaAllColumnDefs().find(function(c){return c.key===col;});
    if(colDef)vaOpenGenericCellEditor(cell,a,colDef);
  }
}
function vaOpenGenericCellEditor(cell,a,colDef){
  var type=colDef.type;
  if(type==="select"){
    vaOpenDropdown(cell,{title:colDef.label,items:vaOptionsFor(colDef.key),selected:a[colDef.key],onChange:function(v){vaSetField(a,colDef.key,v);vaRender();}});
  }else if(type==="multiselect"){
    vaOpenDropdown(cell,{title:colDef.label,multi:true,allowCreate:true,items:vaOptionsFor(colDef.key),selected:(a[colDef.key]||[]).slice(),
      onCreate:function(val){var opts=vaOptionsFor(colDef.key);if(!opts.some(function(o){return o.value===val;})){opts.push({value:val,label:val,color:"#8b8b93"});vaSaveDropdownOptions(colDef.key,opts);}},
      onChange:function(vals){vaSetField(a,colDef.key,vals);vaRender();}});
  }else if(type==="checkbox"||type==="bool"){
    vaSetField(a,colDef.key,!a[colDef.key]);
    vaRenderRows();
  }else{
    var inputType=(type==="color")?"color":(type==="date")?"date":(type==="time")?"time":(type==="genericNumber"||type==="progress"||type==="number")?"number":"text";
    vaOpenInlineCellEditor(cell,a,colDef,inputType);
  }
}
function vaOpenInlineCellEditor(cell,a,colDef,inputType){
  if(cell.querySelector(".va-cell-edit-input"))return;
  var current=a[colDef.key]==null?"":a[colDef.key];
  var input=document.createElement("input");
  input.type=inputType;
  input.className="va-cell-edit-input";
  input.value=current;
  if(inputType==="number"){input.min=0;if(colDef.type==="progress")input.max=100;}
  cell.innerHTML="";
  cell.appendChild(input);
  input.focus();
  if(input.select)input.select();
  function commit(){
    var val=input.value;
    if(inputType==="number")val=parseFloat(val)||0;
    vaSetField(a,colDef.key,val);
    vaRenderRows();
  }
  input.addEventListener("blur",commit);
  input.addEventListener("keydown",function(e){
    e.stopPropagation();
    if(e.key==="Enter"){e.preventDefault();commit();}
    if(e.key==="Escape"){e.preventDefault();vaRenderRows();}
  });
  input.addEventListener("click",function(e){e.stopPropagation();});
}

// ══════════════════════════════════════════════════════════════
//  BULK BAR
// ══════════════════════════════════════════════════════════════
function vaRenderBulkBar(){
  var bar=document.getElementById("va-bulk-bar");if(!bar)return;
  var count=Object.keys(_vaSelected).filter(function(k){return _vaSelected[k];}).length;
  if(!count){bar.classList.remove("open");bar.innerHTML="";return;}
  bar.classList.add("open");
  bar.innerHTML='<span class="va-bulk-count">'+count+" sélectionné"+(count>1?"s":"")+'</span>'+
    '<button type="button" class="va-bulk-btn" id="va-bulk-copy">Copier</button>'+
    '<button type="button" class="va-bulk-btn" id="va-bulk-dup">Dupliquer</button>'+
    '<button type="button" class="va-bulk-btn danger" id="va-bulk-del">Supprimer</button>'+
    '<button type="button" class="va-bulk-btn ghost" id="va-bulk-clear">Annuler</button>';
  document.getElementById("va-bulk-copy").addEventListener("click",vaCopySelectedTSV);
  document.getElementById("va-bulk-dup").addEventListener("click",vaDuplicateSelected);
  document.getElementById("va-bulk-del").addEventListener("click",vaDeleteSelected);
  document.getElementById("va-bulk-clear").addEventListener("click",function(){_vaSelected={};vaRenderRows();vaRenderBulkBar();});
}

// ══════════════════════════════════════════════════════════════
//  ROW ACTIONS
// ══════════════════════════════════════════════════════════════
function vaSelectedAccounts(){
  var ids=Object.keys(_vaSelected).filter(function(k){return _vaSelected[k];}).map(Number);
  return vaAccounts().filter(function(a){return ids.indexOf(a.id)>-1;});
}
function vaOpenRowContextMenu(x,y,id){
  var a=vaAccounts().find(function(x){return x.id===id;});
  if(!a)return;
  var multi=Object.keys(_vaSelected).filter(function(k){return _vaSelected[k];}).length>1;
  vaOpenContextMenu(x,y,[
    {label:"Ouvrir le détail",shortcut:"Entrée",onClick:function(){vaOpenDetail(id);}},
    {divider:true},
    {label:multi?"Dupliquer la sélection":"Dupliquer",shortcut:"Ctrl+D",onClick:function(){multi?vaDuplicateSelected():vaDuplicateAccount(id);}},
    {label:"Copier",shortcut:"Ctrl+C",onClick:vaCopySelectedTSV},
    {divider:true},
    {label:"Colorer la ligne",onClick:function(){vaColorRow(id,x,y);}},
    {label:"Ajouter une note",onClick:function(){
      vaOpenDetail(id);
      setTimeout(function(){var f=document.querySelector('.va-dp-field[data-field="notes"] .va-dp-edit');if(f)f.click();},320);
    }},
    {label:"Ajouter une icône",onClick:function(){vaPromptRowIcon(id);}},
    {divider:true},
    {label:"Supprimer",shortcut:"Suppr",danger:true,onClick:function(){multi?vaDeleteSelected():vaDeleteAccounts([id]);}},
  ]);
}
function vaColorRow(id,x,y){
  var a=vaAccounts().find(function(v){return v.id===id;});
  if(!a)return;
  var swatches=["","#ef4444","#f59e0b","#facc15","#34d399","#60a5fa","#8b5cf6","#f472b6"];
  var pop=document.createElement("div");
  pop.className="va-dpe-swatch-pop va-row-color-pop";
  pop.innerHTML=swatches.map(function(c){return '<button type="button" class="va-dpe-swatch'+(c?"":" none")+'" style="--sc:'+(c||"transparent")+'" data-color="'+c+'" title="'+(c||"Aucune")+'"></button>';}).join("");
  document.body.appendChild(pop);
  pop.style.top=y+"px";pop.style.left=x+"px";
  pop.querySelectorAll("button").forEach(function(btn){
    btn.addEventListener("click",function(){
      vaSetField(a,"rowColor",btn.dataset.color||"");
      pop.remove();
      vaRenderRows();
    });
  });
  setTimeout(function(){
    document.addEventListener("mousedown",function h(e){if(!pop.contains(e.target)){pop.remove();document.removeEventListener("mousedown",h);}});
  },0);
}
function vaPromptRowIcon(id){
  var a=vaAccounts().find(function(v){return v.id===id;});
  if(!a)return;
  var val=prompt("Icône / emoji pour ce compte :",a.icon||"");
  if(val==null)return;
  vaSetField(a,"icon",val.trim().slice(0,4));
  vaRenderRows();
}
function vaDuplicateAccount(id){
  var list=vaAccounts();
  var idx=list.findIndex(function(a){return a.id===id;});
  if(idx===-1)return;
  var copy=Object.assign({},list[idx]);
  copy.id=vaNewId();
  copy.inGameName=(copy.inGameName||"")+" (copie)";
  copy.lastModified=new Date().toISOString();
  list.splice(idx+1,0,copy);
  saveStateNow();
  toast("Compte dupliqué","success");
  vaRender();
}
function vaDuplicateSelected(){
  vaSelectedAccounts().forEach(function(a){vaDuplicateAccount(a.id);});
}
function vaDeleteAccounts(ids){
  if(!confirm(ids.length>1?"Supprimer "+ids.length+" comptes ?":"Supprimer ce compte ?"))return;
  var p=curP();
  p.state.valorantAccounts=vaAccounts().filter(function(a){return ids.indexOf(a.id)===-1;});
  ids.forEach(function(id){delete _vaSelected[id];});
  saveStateNow();
  toast("Supprimé","success");
  vaCloseDetail();
  vaRender();
}
function vaDeleteSelected(){
  var ids=Object.keys(_vaSelected).filter(function(k){return _vaSelected[k];}).map(Number);
  if(!ids.length)return;
  vaDeleteAccounts(ids);
}
function vaCopyField(a,field){
  var val=a[field]||"";
  navigator.clipboard.writeText(String(val)).then(function(){
    toast("Copié","success");
  }).catch(function(){toast("Impossible de copier","error");});
}
function vaCopySelectedTSV(){
  var accounts=vaSelectedAccounts();
  if(!accounts.length)return;
  var cols=vaVisibleColumns().filter(function(c){return !["sel","avatar","actions"].includes(c.key);});
  var header=cols.map(function(c){return c.label;}).join("\t");
  var rows=accounts.map(function(a){
    return cols.map(function(c){
      var v=a[c.key];
      if(c.key==="tags")v=(a.tags||[]).join(", ");
      if(c.key==="rank")v=vaRankDef(a.rank).label;
      if(c.key==="region")v=vaRegionLabel(a.region);
      if(c.key==="authMethod")v=vaAuthDef(a.authMethod).label;
      return v==null?"":String(v).replace(/\t/g," ");
    }).join("\t");
  });
  var tsv=[header].concat(rows).join("\n");
  navigator.clipboard.writeText(tsv).then(function(){toast(accounts.length+" ligne(s) copiée(s)","success");}).catch(function(){toast("Impossible de copier","error");});
}
function vaPasteTSVAsNewRows(text){
  var lines=text.split(/\r?\n/).filter(function(l){return l.trim().length;});
  if(!lines.length)return;
  var cols=vaVisibleColumns().filter(function(c){return !["sel","avatar","actions"].includes(c.key);});
  var startIdx=0;
  var firstCells=lines[0].split("\t");
  if(firstCells[0]===cols[0].label)startIdx=1;
  var added=0;
  for(var i=startIdx;i<lines.length;i++){
    var cells=lines[i].split("\t");
    var a=vaBlankAccount();
    cols.forEach(function(c,ci){
      var val=cells[ci];
      if(val==null)return;
      if(c.key==="tags")a.tags=val.split(",").map(function(s){return s.trim();}).filter(Boolean);
      else if(c.key==="ranked")a.ranked=/^(oui|yes|true|1)$/i.test(val.trim());
      else a[c.key]=val;
    });
    vaAccounts().push(a);
    added++;
  }
  if(added){saveStateNow();toast(added+" ligne(s) importée(s)","success");vaRender();}
}
function vaBlankAccount(){
  var now=new Date().toISOString();
  return {id:vaNewId(),avatar:null,riotId:"",riotTag:"",password:"",inGameName:"",rank:"unranked",region:"eu",authMethod:"none",phone:"",email:"",ranked:false,notes:"",tags:[],lastLogin:null,lastModified:now,owner:"",skinValue:0};
}
function vaOpenNewAccount(){
  var a=vaBlankAccount();
  vaAccounts().push(a);
  saveStateNow();
  vaRender();
  vaOpenDetail(a.id,true);
}

// ══════════════════════════════════════════════════════════════
//  COLUMNS MENU
// ══════════════════════════════════════════════════════════════
function vaOpenColumnsMenu(e){
  var v=vaView();
  var items=vaAllColumnDefs().filter(function(c){return !c.lockedVis;}).map(function(c){return {value:c.key,label:c.label};});
  vaOpenDropdown(e.currentTarget,{
    title:"Colonnes visibles",
    multi:true,
    searchable:false,
    items:items,
    selected:items.map(function(i){return i.value;}).filter(function(k){return v.hiddenColumns.indexOf(k)===-1;}),
    onChange:function(vals){
      v.hiddenColumns=items.map(function(i){return i.value;}).filter(function(k){return vals.indexOf(k)===-1;});
      vaSaveView();
      vaRender();
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  ADD COLUMN POPOVER
// ══════════════════════════════════════════════════════════════
function vaOpenAddColumnPopover(anchorEl){
  var panel=document.getElementById("va-addcol-panel");
  if(!panel){
    panel=document.createElement("div");
    panel.id="va-addcol-panel";
    document.body.appendChild(panel);
  }
  panel.className="va-dd-panel va-addcol-panel";
  panel.innerHTML=
    '<div class="va-dd-title">Nouvelle colonne</div>'+
    '<div class="va-addcol-body">'+
      '<input type="text" id="va-addcol-name" class="va-dd-search" placeholder="Nom de la colonne" autocomplete="off" style="margin:0 0 8px">'+
      '<div class="va-addcol-types" id="va-addcol-types">'+
        VA_COLUMN_TYPE_CHOICES.map(function(t,i){return '<button type="button" class="va-addcol-type" data-idx="'+i+'">'+esc(t.label)+"</button>";}).join("")+
      "</div>"+
      '<button type="button" class="va-addcol-create" id="va-addcol-create" disabled>Créer la colonne</button>'+
    "</div>";
  var nameInput=panel.querySelector("#va-addcol-name");
  var createBtn=panel.querySelector("#va-addcol-create");
  var selectedIdx=null;
  function updateCreateState(){createBtn.disabled=!(nameInput.value.trim()&&selectedIdx!=null);}
  panel.querySelectorAll(".va-addcol-type").forEach(function(btn){
    btn.addEventListener("click",function(){
      panel.querySelectorAll(".va-addcol-type").forEach(function(b){b.classList.remove("selected");});
      btn.classList.add("selected");
      selectedIdx=parseInt(btn.dataset.idx,10);
      updateCreateState();
    });
  });
  nameInput.addEventListener("input",updateCreateState);
  nameInput.addEventListener("keydown",function(e){if(e.key==="Enter"&&!createBtn.disabled)createBtn.click();});
  createBtn.addEventListener("click",function(){
    var typeChoice=VA_COLUMN_TYPE_CHOICES[selectedIdx];
    vaCreateColumn(nameInput.value.trim(),typeChoice.value);
    closePopover();
  });
  var r=anchorEl.getBoundingClientRect();
  panel.style.visibility="hidden";
  panel.classList.add("open");
  var pw=panel.offsetWidth,ph=panel.offsetHeight;
  var left=Math.min(r.left,window.innerWidth-pw-10);
  var top=r.bottom+6;
  if(top+ph>window.innerHeight-10)top=Math.max(10,r.top-ph-6);
  panel.style.left=left+"px";
  panel.style.top=top+"px";
  panel.style.visibility="";
  setTimeout(function(){nameInput.focus();},10);
  function closePopover(){
    panel.classList.remove("open");
    document.removeEventListener("mousedown",outsideHandler);
  }
  function outsideHandler(e){
    if(!panel.contains(e.target)&&e.target!==anchorEl)closePopover();
  }
  setTimeout(function(){document.addEventListener("mousedown",outsideHandler);},0);
}
function vaCreateColumn(name,type){
  var v=vaView();
  var newCol={key:"custom_"+vaNewId(),label:name,type:type,width:150};
  if(vaIsOptionsType(type))newCol.options=[];
  v.customColumns.push(newCol);
  if(!v.columnOrder||!v.columnOrder.length)v.columnOrder=vaAllColumnDefs().map(function(c){return c.key;}).filter(function(k){return k!==newCol.key;});
  var actionsIdx=v.columnOrder.indexOf("actions");
  if(actionsIdx>-1)v.columnOrder.splice(actionsIdx,0,newCol.key);
  else v.columnOrder.push(newCol.key);
  vaSaveView();
  vaRender();
  toast("Colonne créée","success");
  if(vaIsOptionsType(type)){
    setTimeout(function(){vaOpenDropdownEditor(newCol.key);},150);
  }
}

// ══════════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════════
function vaIsPageActive(){
  var page=document.getElementById("page-valorant-accounts");
  return page&&page.classList.contains("active");
}
document.addEventListener("keydown",function(e){
  if(!vaIsPageActive())return;
  var tag=(document.activeElement&&document.activeElement.tagName)||"";
  var inField=tag==="INPUT"||tag==="TEXTAREA"||document.activeElement.isContentEditable;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="c"&&!inField){
    if(Object.keys(_vaSelected).some(function(k){return _vaSelected[k];})){e.preventDefault();vaCopySelectedTSV();}
  }else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="v"&&!inField){
    navigator.clipboard.readText().then(function(text){if(text&&text.indexOf("\t")>-1)vaPasteTSVAsNewRows(text);}).catch(function(){});
  }else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"&&!inField){
    e.preventDefault();
    if(Object.keys(_vaSelected).some(function(k){return _vaSelected[k];}))vaDuplicateSelected();
  }else if(e.key==="Delete"&&!inField){
    if(Object.keys(_vaSelected).some(function(k){return _vaSelected[k];}))vaDeleteSelected();
  }else if(e.key==="Enter"&&!inField){
    if(_vaFocusId!=null)vaOpenDetail(_vaFocusId);
  }
});

// ══════════════════════════════════════════════════════════════
//  MAIN RENDER ENTRY
// ══════════════════════════════════════════════════════════════
function vaRender(){
  if(!vaIsPageActive())return;
  vaRenderStats();
  vaRenderFilterTabs();
  vaRenderGroupSlot();
  vaRenderThead();
  vaRenderRows();
  vaRenderBulkBar();
}
window.vaRender=vaRender;
