/* ETHONE Import Assistant - imports local exports into existing ETHONE pages. */
(function(){
  "use strict";
  if(window.__ethoneImportAssistant)return;
  window.__ethoneImportAssistant=true;

  var activeSource="notion";
  var activeRoute="auto";
  var currentPlan=null;
  var xlsxPromise=null;
  var routeDefs=[
    {id:"auto",label:"Auto",sub:"Brain routing"},
    {id:"database",label:"Database",sub:"Rows + views"},
    {id:"notes",label:"Notes",sub:"Markdown pages"},
    {id:"tasks",label:"Tasks",sub:"Todo lists"},
    {id:"calendar",label:"Calendar",sub:"Events"},
    {id:"files",label:"Files",sub:"References"}
  ];
  var sourceDefs=[
    {id:"notion",label:"Notion",icon:"blocks",tag:"Export",hint:"Markdown, CSV, JSON, ZIP exports"},
    {id:"todoist",label:"Todoist",icon:"list-checks",tag:"CSV",hint:"Tasks, projects, due dates"},
    {id:"google-calendar",label:"Google Calendar",icon:"calendar-days",tag:"ICS",hint:"Calendar .ics or CSV export"},
    {id:"discord",label:"Discord",icon:"message-circle",tag:"JSON",hint:"Messages, channels, exports"},
    {id:"spotify",label:"Spotify",icon:"music-2",tag:"JSON",hint:"Streaming history exports"},
    {id:"github",label:"GitHub",icon:"git-branch",tag:"JSON/CSV",hint:"Issues, repos, commits"},
    {id:"csv",label:"CSV",icon:"table",tag:"File",hint:"Universal spreadsheet rows"},
    {id:"excel",label:"Excel",icon:"table-2",tag:"XLSX",hint:"Workbook sheets"},
    {id:"markdown",label:"Markdown",icon:"file-text",tag:"MD",hint:"Notes, tasks, documentation"},
    {id:"json",label:"JSON",icon:"braces",tag:"Data",hint:"Generic structured import"}
  ];

  function $(s,r){return (r||document).querySelector(s)}
  function $all(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function id(){return Date.now()+Math.floor(Math.random()*100000)}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function save(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function notify(message,type){
    if(typeof window.toast==="function")window.toast(message,type||"info");
    try{if(window.ETHONENotifications)window.ETHONENotifications.notify({title:"Import Assistant",body:message,category:type==="error"?"error":"success",source:"Import"})}catch(e){}
  }
  function timeline(title,body,category){
    try{if(window.ETHONETimeline)window.ETHONETimeline.record({title:title,body:body||"",category:category||"content",source:"Import Assistant",icon:"upload"})}catch(e){}
  }
  function icon(name){return '<i data-lucide="'+esc(name)+'" aria-hidden="true"></i>'}
  function renderIcons(){try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}}
  function fileExt(name){return String(name||"").split(".").pop().toLowerCase()}
  function todayLabel(){return new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}
  function normalizeDate(v){
    if(!v)return "";
    var s=String(v).trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
    var d=new Date(s);
    if(!isNaN(d.getTime()))return d.toISOString().slice(0,10);
    var m=s.match(/^(\d{8})T?/);
    if(m)return m[1].slice(0,4)+"-"+m[1].slice(4,6)+"-"+m[1].slice(6,8);
    return "";
  }
  function ensurePage(){
    var page=$("#page-import");
    if(page)return page;
    page=document.createElement("div");
    page.id="page-import";
    page.className="tab-content";
    page.setAttribute("data-qa-page","true");
    page.setAttribute("role","tabpanel");
    page.setAttribute("aria-live","polite");
    var anchor=$("#page-databases")||$("#page-connections")||$(".tab-content:last-of-type");
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(page,anchor.nextSibling);
    else document.body.appendChild(page);
    return page;
  }
  function sourceById(id){return sourceDefs.find(function(s){return s.id===id})||sourceDefs[0]}
  function renderImportAssistant(){
    var page=ensurePage();
    page.innerHTML=
      '<div class="import-assistant">'+
        '<section class="import-hero">'+
          '<div><div class="import-eyebrow">ETHONE Import Assistant</div><h1 class="import-title">Importe ton ancien workspace. ETHONE organise le reste.</h1><p class="import-subtitle">Dépose un export Notion, Todoist, Google Calendar, Discord, Spotify, GitHub ou un fichier CSV, Excel, Markdown ou JSON. L’assistant analyse le contenu, choisit la bonne destination et crée automatiquement notes, tâches, événements, fichiers ou bases de données.</p><div class="import-hero-actions"><button class="btn btn-primary" type="button" data-import-action="pick-file">'+icon("upload-cloud")+'Importer un fichier</button><button class="btn btn-ghost" type="button" data-import-action="sample">'+icon("sparkles")+'Tester avec un exemple</button></div></div>'+
          '<aside class="import-hero-panel">'+
            '<div class="import-kpi"><span>Sources supportées</span><strong>10</strong></div>'+
            '<div class="import-kpi"><span>Destinations ETHONE</span><strong>5</strong></div>'+
            '<div class="import-kpi"><span>Mode</span><strong>Local</strong></div>'+
          '</aside>'+
        '</section>'+
        '<section class="import-shell">'+
          '<aside class="import-sources" aria-label="Import sources">'+sourceDefs.map(sourceButton).join("")+'</aside>'+
          '<main class="import-main">'+
            '<div class="import-stage">'+
              '<section class="import-card">'+
                '<div class="import-card-head"><div><h3 id="import-source-title"></h3><p id="import-source-hint"></p></div><span class="import-pill" id="import-source-tag"></span></div>'+
                '<label class="import-dropzone" id="import-dropzone"><input id="import-file-input" type="file" multiple accept=".csv,.json,.md,.markdown,.txt,.ics,.xlsx,.xls,application/json,text/csv,text/markdown"><div><div class="import-upload-icon">'+icon("upload-cloud")+'</div><strong>Dépose un fichier ou clique pour choisir</strong><span>Analyse locale. Rien n’est envoyé à un serveur.</span></div></label>'+
              '</section>'+
              '<section class="import-card" id="import-analysis-card"><div class="import-card-head"><div><h3>Analyse</h3><p>ETHONE détecte automatiquement la structure et prépare les pages à créer.</p></div></div><div class="import-grid" id="import-metrics"></div><div class="import-status" id="import-status">'+icon("info")+'En attente d’un fichier.</div></section>'+
              '<section class="import-card"><div class="import-card-head"><div><h3>Destination</h3><p>Garde Auto pour laisser ETHONE créer les bonnes pages, ou force une destination.</p></div></div><div class="import-route-grid" id="import-routes"></div></section>'+
              '<section class="import-card"><div class="import-card-head"><div><h3>Prévisualisation</h3><p>Les 8 premières lignes ou entrées détectées.</p></div></div><div class="import-preview" id="import-preview"><table><tbody><tr><td>Aucun fichier analysé.</td></tr></tbody></table></div></section>'+
              '<div class="import-actions"><button class="btn btn-ghost" type="button" data-import-action="reset">Réinitialiser</button><button class="btn btn-primary" type="button" id="import-run-btn" data-import-action="run" disabled>'+icon("wand-sparkles")+'Créer dans ETHONE</button></div>'+
            '</div>'+
          '</main>'+
        '</section>'+
        '<section class="import-history"><div class="import-card-head"><div><h3>Historique d’import</h3><p>Les derniers imports restent visibles dans ton profil.</p></div></div><div class="import-history-list" id="import-history-list"></div></section>'+
      '</div>';
    bind();
    renderSources();
    renderRoutes();
    updateSourcePanel();
    renderHistory();
    renderIcons();
  }
  function sourceButton(s){
    return '<button type="button" class="import-source" data-import-source="'+esc(s.id)+'"><span class="import-source-icon">'+icon(s.icon)+'</span><span><strong>'+esc(s.label)+'</strong><span>'+esc(s.hint)+'</span></span><b>'+esc(s.tag)+'</b></button>';
  }
  function renderSources(){
    $all(".import-source").forEach(function(btn){btn.classList.toggle("active",btn.dataset.importSource===activeSource)});
  }
  function renderRoutes(){
    var el=$("#import-routes");if(!el)return;
    el.innerHTML=routeDefs.map(function(r){
      return '<button type="button" class="import-route '+(activeRoute===r.id?"active":"")+'" data-import-route="'+r.id+'"><strong>'+esc(r.label)+'</strong><span>'+esc(r.sub)+'</span></button>';
    }).join("");
  }
  function updateSourcePanel(){
    var src=sourceById(activeSource);
    var title=$("#import-source-title"),hint=$("#import-source-hint"),tag=$("#import-source-tag");
    if(title)title.textContent=src.label+" import";
    if(hint)hint.textContent=src.hint+". Les imports directs OAuth restent branchés via les pages Connexions; cet assistant lit les exports et données locales.";
    if(tag)tag.innerHTML=icon(src.icon)+esc(src.tag);
    renderIcons();
  }
  function bind(){
    var page=$("#page-import");
    if(!page||page.dataset.importBound==="1")return;
    page.dataset.importBound="1";
    page.addEventListener("click",function(e){
      var s=e.target.closest("[data-import-source]");
      if(s){activeSource=s.dataset.importSource;renderSources();updateSourcePanel();return}
      var r=e.target.closest("[data-import-route]");
      if(r){activeRoute=r.dataset.importRoute;renderRoutes();if(currentPlan){currentPlan.route=resolveRoute(currentPlan);renderAnalysis(currentPlan)}return}
      var action=e.target.closest("[data-import-action]");
      if(action){
        var a=action.dataset.importAction;
        if(a==="pick-file")$("#import-file-input")?.click();
        if(a==="sample")loadSample();
        if(a==="reset")resetPlan();
        if(a==="run")runImport();
      }
    });
    var input=$("#import-file-input");
    if(input)input.addEventListener("change",function(){handleFiles(input.files)});
    var drop=$("#import-dropzone");
    if(drop){
      ["dragenter","dragover"].forEach(function(type){drop.addEventListener(type,function(e){e.preventDefault();drop.classList.add("dragover")})});
      ["dragleave","drop"].forEach(function(type){drop.addEventListener(type,function(e){e.preventDefault();drop.classList.remove("dragover")})});
      drop.addEventListener("drop",function(e){handleFiles(e.dataTransfer.files)});
    }
  }
  function resetPlan(){
    currentPlan=null;
    var input=$("#import-file-input");if(input)input.value="";
    renderMetrics(null);
    renderPreview(null);
    setStatus("En attente d’un fichier.","info");
    var run=$("#import-run-btn");if(run)run.disabled=true;
  }
  function setStatus(text,type){
    var el=$("#import-status");if(!el)return;
    el.className="import-status"+(type==="success"?" success":type==="error"?" error":"");
    el.innerHTML=icon(type==="success"?"check-circle-2":type==="error"?"circle-alert":"info")+esc(text);
    renderIcons();
  }
  async function handleFiles(fileList){
    var files=Array.prototype.slice.call(fileList||[]);
    if(!files.length)return;
    setStatus("Analyse en cours...","info");
    try{
      var plans=[];
      for(var i=0;i<files.length;i++){
        plans.push(await analyzeFile(files[i]));
      }
      currentPlan=mergePlans(plans);
      currentPlan.route=resolveRoute(currentPlan);
      renderAnalysis(currentPlan);
      setStatus("Analyse terminée. "+summaryForPlan(currentPlan),"success");
      var run=$("#import-run-btn");if(run)run.disabled=false;
    }catch(err){
      console.error("[ETHONE Import] analysis failed",err);
      setStatus("Import impossible : "+(err&&err.message?err.message:String(err)),"error");
      notify("Import impossible : "+(err&&err.message?err.message:String(err)),"error");
    }
  }
  async function analyzeFile(file){
    var ext=fileExt(file.name);
    if(ext==="xlsx"||ext==="xls")return analyzeWorkbook(file);
    var text=await readText(file);
    if(ext==="csv")return planFromRows(parseCSV(text),file.name,"csv");
    if(ext==="ics")return planFromICS(text,file.name);
    if(ext==="md"||ext==="markdown"||ext==="txt")return planFromMarkdown(text,file.name);
    if(ext==="json")return planFromJSON(JSON.parse(text),file.name);
    if(text.trim().charAt(0)==="{"||text.trim().charAt(0)==="[")return planFromJSON(JSON.parse(text),file.name);
    return planFromMarkdown(text,file.name);
  }
  function readText(file){
    return new Promise(function(resolve,reject){
      var reader=new FileReader();
      reader.onload=function(){resolve(String(reader.result||""))};
      reader.onerror=function(){reject(reader.error||new Error("Lecture du fichier impossible"))};
      reader.readAsText(file);
    });
  }
  async function loadXLSX(){
    if(window.XLSX)return window.XLSX;
    if(xlsxPromise)return xlsxPromise;
    xlsxPromise=new Promise(function(resolve,reject){
      var s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.async=true;
      s.onload=function(){window.XLSX?resolve(window.XLSX):reject(new Error("Parseur Excel indisponible"))};
      s.onerror=function(){reject(new Error("Impossible de charger le parseur Excel. Exporte le fichier en CSV ou vérifie ta connexion."))};
      document.head.appendChild(s);
    });
    return xlsxPromise;
  }
  async function analyzeWorkbook(file){
    var XLSX=await loadXLSX();
    var buf=await file.arrayBuffer();
    var workbook=XLSX.read(buf,{type:"array"});
    var plans=workbook.SheetNames.map(function(name){
      var rows=XLSX.utils.sheet_to_json(workbook.Sheets[name],{defval:""});
      return rowsToPlan(rows,file.name+" - "+name,"excel");
    });
    return mergePlans(plans);
  }
  function parseCSV(text){
    if(typeof window.dbParseCSV==="function")return window.dbParseCSV(text);
    var rows=[],row=[],field="",q=false;
    for(var i=0;i<text.length;i++){
      var c=text[i],n=text[i+1];
      if(q){
        if(c==='"'&&n==='"'){field+='"';i++}
        else if(c==='"')q=false;
        else field+=c;
      }else{
        if(c==='"')q=true;
        else if(c===","){row.push(field);field=""}
        else if(c==="\n"){row.push(field);rows.push(row);row=[];field=""}
        else if(c!=="\r")field+=c;
      }
    }
    if(field||row.length){row.push(field);rows.push(row)}
    return rows.filter(function(r){return r.length>1||r[0]!==""});
  }
  function rowsToObjects(rows){
    if(!rows||!rows.length)return [];
    if(!Array.isArray(rows[0]))return rows.map(function(r){return Object.assign({},r)});
    var header=rows[0].map(function(h){return String(h||"").trim()||"Column"});
    return rows.slice(1).map(function(cells){
      var o={};
      header.forEach(function(h,i){o[h]=cells[i]==null?"":cells[i]});
      return o;
    });
  }
  function planFromRows(rows,name,source){
    return rowsToPlan(rowsToObjects(rows),name,source);
  }
  function rowsToPlan(rows,name,source){
    rows=rows||[];
    var taskRows=[],eventRows=[],fileRows=[];
    rows.forEach(function(r){
      var keys=Object.keys(r).reduce(function(acc,k){acc[k.toLowerCase().replace(/\s+/g,"_")]=k;return acc},{});
      if(keys.task||keys.content||keys["task_content"]||keys.todo||keys.title&&/todoist/i.test(source+" "+name))taskRows.push(r);
      if(keys.date||keys.start||keys.start_date||keys["due_date"]||keys.when)eventRows.push(r);
      if(keys.url||keys.link||keys.file||keys.path)fileRows.push(r);
    });
    var plan=emptyPlan(name,source);
    plan.rows=rows;
    if(activeSource==="todoist"||/todoist/i.test(name))plan.tasks=rows.map(rowToTodo).filter(Boolean);
    else if(activeSource==="google-calendar"||/calendar/i.test(name))plan.events=rows.map(rowToEvent).filter(Boolean);
    else if(activeSource==="github")plan.tasks=taskRows.map(rowToTodo).filter(Boolean);
    else if(activeSource==="spotify")plan.database=databasePayload(rows,name||"Spotify History");
    else {
      plan.tasks=taskRows.map(rowToTodo).filter(Boolean);
      plan.events=eventRows.map(rowToEvent).filter(Boolean);
      plan.files=fileRows.map(rowToFile).filter(Boolean);
      plan.database=databasePayload(rows,name||"Imported Data");
    }
    if(!plan.database&&rows.length)plan.database=databasePayload(rows,name||"Imported Data");
    return plan;
  }
  function emptyPlan(name,source){return {name:name||"Import",source:source||activeSource,rows:[],notes:[],tasks:[],events:[],files:[],database:null,route:"auto"}}
  function planFromMarkdown(text,name){
    var plan=emptyPlan(name,"markdown");
    var title=(text.match(/^#\s+(.+)$/m)||[])[1]||name.replace(/\.(md|markdown|txt)$/i,"")||"Imported note";
    plan.notes.push({title:title,content:text});
    var lines=text.split(/\r?\n/);
    plan.tasks=lines.map(function(line){
      var m=line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/);
      if(!m)return null;
      return {text:m[2],done:/x/i.test(m[1]),priority:"normal",tag:"import"};
    }).filter(Boolean);
    return plan;
  }
  function planFromICS(text,name){
    var plan=emptyPlan(name,"google-calendar");
    var blocks=text.split("BEGIN:VEVENT").slice(1);
    plan.events=blocks.map(function(block){
      var title=icsValue(block,"SUMMARY")||"Imported event";
      var date=normalizeDate(icsValue(block,"DTSTART")||icsValue(block,"DTSTART;VALUE=DATE"));
      if(!date)return null;
      return {title:title,date:date,color:"accent"};
    }).filter(Boolean);
    return plan;
  }
  function icsValue(block,key){
    var re=new RegExp("^"+key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"[^:]*:(.+)$","m");
    var m=block.match(re);
    return m?m[1].trim().replace(/\\n/g," "):"";
  }
  function planFromJSON(data,name){
    var plan=emptyPlan(name,"json");
    if(Array.isArray(data))return rowsToPlan(data,name,"json");
    if(!data||typeof data!=="object")throw new Error("JSON non supporté");
    if(Array.isArray(data.notes))plan.notes=data.notes.map(function(n){return {title:n.title||n.name||"Imported note",content:n.content||n.body||n.text||""}});
    if(Array.isArray(data.tasks)||Array.isArray(data.todos))plan.tasks=(data.tasks||data.todos).map(objectToTodo).filter(Boolean);
    if(Array.isArray(data.events))plan.events=data.events.map(objectToEvent).filter(Boolean);
    if(Array.isArray(data.items)||Array.isArray(data.files))plan.files=(data.items||data.files).map(objectToFile).filter(Boolean);
    var collections=["issues","repositories","repos","commits","messages","StreamingHistory","streamingHistory","playlists"];
    collections.forEach(function(k){
      if(Array.isArray(data[k])){
        if(activeSource==="github"&&k==="issues")plan.tasks=plan.tasks.concat(data[k].map(objectToTodo).filter(Boolean));
        if(activeSource==="spotify"||/streaming/i.test(k))plan.database=databasePayload(data[k],name||"Spotify Import");
        if(!plan.database)plan.database=databasePayload(data[k],name||k);
      }
    });
    if(!plan.notes.length&&!plan.tasks.length&&!plan.events.length&&!plan.files.length&&!plan.database){
      plan.database=databasePayload([flattenObject(data)],name||"JSON Import");
    }
    return plan;
  }
  function flattenObject(obj,prefix,out){
    out=out||{};
    Object.keys(obj||{}).forEach(function(k){
      var v=obj[k],key=prefix?prefix+"."+k:k;
      if(v&&typeof v==="object"&&!Array.isArray(v))flattenObject(v,key,out);
      else out[key]=Array.isArray(v)?JSON.stringify(v):v;
    });
    return out;
  }
  function objectToTodo(o){return rowToTodo(o)}
  function rowToTodo(r){
    var title=pick(r,["Task content","task","todo","title","name","content","summary","issue","body"]);
    if(!title)return null;
    var due=normalizeDate(pick(r,["Due date","due","dueDate","date","deadline","created_at"]));
    var priority=String(pick(r,["Priority","priority","importance"])||"normal").toLowerCase();
    if(/4|urgent|high/.test(priority))priority="high";else if(/1|low/.test(priority))priority="low";else priority="normal";
    return {id:id(),text:String(title),priority:priority,done:/true|done|completed|closed/i.test(String(pick(r,["done","completed","status","state"])||"")),due:due,tag:String(pick(r,["Project","project","section","tag","labels"])||"import"),date:todayLabel()};
  }
  function objectToEvent(o){return rowToEvent(o)}
  function rowToEvent(r){
    var title=pick(r,["Subject","summary","title","name","event","Task content","content"])||"Imported event";
    var date=normalizeDate(pick(r,["Start Date","date","start","start_date","Due date","due","when","DTSTART"]));
    if(!date)return null;
    return {id:id(),title:String(title),date:date,color:"accent"};
  }
  function objectToFile(o){return rowToFile(o)}
  function rowToFile(r){
    var name=pick(r,["name","title","file","filename","path","url","link"])||"Imported file";
    var url=pick(r,["url","link","href","path"])||"";
    return {id:id(),name:String(name),type:url?"link":"file",url:String(url),tag:"import",date:todayLabel(),createdAt:new Date().toISOString()};
  }
  function pick(obj,keys){
    if(!obj)return "";
    for(var i=0;i<keys.length;i++){
      var want=String(keys[i]).toLowerCase().replace(/\s+/g,"_");
      var found=Object.keys(obj).find(function(k){return String(k).toLowerCase().replace(/\s+/g,"_")===want});
      if(found&&obj[found]!=null&&String(obj[found]).trim()!=="")return obj[found];
    }
    return "";
  }
  function databasePayload(rows,name){
    rows=(rows||[]).filter(Boolean);
    if(!rows.length)return null;
    var keys=[];
    rows.forEach(function(r){Object.keys(r).forEach(function(k){if(keys.indexOf(k)===-1)keys.push(k)})});
    keys=keys.slice(0,40);
    var columns=keys.map(function(k,i){
      return {key:safeKey(k,i),label:k,type:inferType(rows.map(function(r){return r[k]})),width:i===0?240:160,primary:i===0};
    });
    var keyMap={};columns.forEach(function(c,i){keyMap[keys[i]]=c.key});
    var dbRows=rows.map(function(r){
      var out={id:id()};
      keys.forEach(function(k){out[keyMap[k]]=r[k]});
      return out;
    });
    return {name:name.replace(/\.[^.]+$/,"")||"Imported Database",columns:columns,rows:dbRows};
  }
  function safeKey(k,i){
    var s=String(k||("Column "+i)).toLowerCase().trim().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
    return s||("col_"+i);
  }
  function inferType(values){
    var sample=values.map(function(v){return String(v==null?"":v).trim()}).filter(Boolean).slice(0,20);
    if(!sample.length)return "text";
    if(sample.every(function(v){return /^(true|false|yes|no|oui|non|0|1)$/i.test(v)}))return "checkbox";
    if(sample.every(function(v){return !isNaN(Number(v))}))return "genericNumber";
    if(sample.every(function(v){return !!normalizeDate(v)}))return "date";
    if(sample.every(function(v){return /^https?:\/\//i.test(v)}))return "url";
    if(sample.every(function(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}))return "email";
    return "text";
  }
  function mergePlans(plans){
    var out=emptyPlan(plans.map(function(p){return p.name}).join(", "),activeSource);
    plans.forEach(function(p){
      out.rows=out.rows.concat(p.rows||[]);
      out.notes=out.notes.concat(p.notes||[]);
      out.tasks=out.tasks.concat(p.tasks||[]);
      out.events=out.events.concat(p.events||[]);
      out.files=out.files.concat(p.files||[]);
      if(p.database&&!out.database)out.database=p.database;
      else if(p.database&&out.database){
        out.database.rows=out.database.rows.concat(p.database.rows||[]);
      }
    });
    return out;
  }
  function resolveRoute(plan){
    if(activeRoute!=="auto")return activeRoute;
    if(activeSource==="todoist"&&plan.tasks.length)return "tasks";
    if(activeSource==="google-calendar"&&plan.events.length)return "calendar";
    if(activeSource==="markdown"&&plan.notes.length)return "notes";
    if(activeSource==="spotify"&&plan.database)return "database";
    if(activeSource==="github"&&(plan.tasks.length||plan.database))return plan.tasks.length?"tasks":"database";
    if(activeSource==="notion")return plan.notes.length?"notes":"database";
    var counts={database:plan.database?plan.database.rows.length:0,notes:plan.notes.length,tasks:plan.tasks.length,calendar:plan.events.length,files:plan.files.length};
    var best="database",max=0;
    Object.keys(counts).forEach(function(k){if(counts[k]>max){max=counts[k];best=k}});
    return max?best:"database";
  }
  function summaryForPlan(plan){
    return [plan.notes.length+" notes",plan.tasks.length+" tâches",plan.events.length+" événements",plan.files.length+" fichiers",plan.database?plan.database.rows.length+" lignes DB":"0 lignes DB"].join(" · ");
  }
  function renderAnalysis(plan){
    plan.route=resolveRoute(plan);
    renderMetrics(plan);
    renderPreview(plan);
    renderRoutes();
  }
  function renderMetrics(plan){
    var el=$("#import-metrics");if(!el)return;
    var metrics=plan?[
      ["Notes",plan.notes.length],
      ["Tasks",plan.tasks.length],
      ["Events",plan.events.length],
      ["Files",plan.files.length],
      ["Database rows",plan.database?plan.database.rows.length:0],
      ["Route",plan.route]
    ]:[["Notes","-"],["Tasks","-"],["Events","-"],["Files","-"],["Database rows","-"],["Route","-"]];
    el.innerHTML=metrics.map(function(m){return '<div class="import-metric"><span>'+esc(m[0])+'</span><strong>'+esc(m[1])+'</strong></div>'}).join("");
  }
  function renderPreview(plan){
    var el=$("#import-preview");if(!el)return;
    if(!plan){el.innerHTML="<table><tbody><tr><td>Aucun fichier analysé.</td></tr></tbody></table>";return}
    var rows=(plan.database&&plan.database.rows||plan.rows||[]).slice(0,8);
    if(!rows.length){
      var simple=plan.notes.concat(plan.tasks).concat(plan.events).concat(plan.files).slice(0,8);
      el.innerHTML='<table><thead><tr><th>Type</th><th>Titre</th><th>Détail</th></tr></thead><tbody>'+simple.map(function(x){
        return '<tr><td>'+esc(x.text?"Task":x.date?"Event":x.url?"File":"Note")+'</td><td>'+esc(x.title||x.text||x.name||"Item")+'</td><td>'+esc(x.content||x.due||x.date||x.url||"")+'</td></tr>';
      }).join("")+'</tbody></table>';
      return;
    }
    var keys=Object.keys(rows[0]).filter(function(k){return k!=="id"}).slice(0,8);
    el.innerHTML='<table><thead><tr>'+keys.map(function(k){return '<th>'+esc(k)+'</th>'}).join("")+'</tr></thead><tbody>'+rows.map(function(r){
      return '<tr>'+keys.map(function(k){return '<td>'+esc(r[k])+'</td>'}).join("")+'</tr>';
    }).join("")+'</tbody></table>';
  }
  function createDatabase(payload){
    if(!payload)return null;
    if(typeof window.dbCreate==="function"){
      return window.dbCreate({name:payload.name,icon:"DB",color:"#8b5cf6",description:"Imported with ETHONE Import Assistant",columns:payload.columns,rows:payload.rows});
    }
    var p=profile();if(!p)return null;
    if(!p.state.databases)p.state.databases=[];
    var now=new Date().toISOString();
    var db={id:id(),name:payload.name,icon:"DB",color:"#8b5cf6",description:"Imported with ETHONE Import Assistant",columns:payload.columns,columnOrder:payload.columns.map(function(c){return c.key}),columnWidths:{},hiddenColumns:[],pinnedColumns:[],lockedColumns:[],rows:payload.rows,views:[{id:"v1",type:"table",name:"Table",config:{sort:[],filters:[]}}],defaultViewId:"v1",knownTags:{},dropdownDefs:{},createdAt:now,updatedAt:now};
    p.state.databases.push(db);
    return db;
  }
  function runImport(){
    if(!currentPlan)return;
    var p=profile();if(!p){notify("Aucun profil actif.","error");return}
    p.state=p.state||{};
    p.state.notes=p.state.notes||[];
    p.state.todos=p.state.todos||[];
    p.state.events=p.state.events||[];
    p.state.items=p.state.items||[];
    p.state.imports=p.state.imports||[];
    var route=resolveRoute(currentPlan);
    var created={notes:0,tasks:0,events:0,files:0,databases:0};
    if(route==="notes"){
      currentPlan.notes.forEach(function(n){p.state.notes.unshift({id:id(),title:n.title||"Imported note",content:n.content||"",color:"",pinned:false,created:new Date().toISOString(),updated:new Date().toISOString()});created.notes++});
    }
    if(route==="tasks"){
      currentPlan.tasks.forEach(function(t){p.state.todos.unshift(Object.assign({id:id(),date:todayLabel(),priority:"normal",done:false,tag:"import"},t));created.tasks++});
    }
    if(route==="calendar"){
      currentPlan.events.forEach(function(ev){p.state.events.push(Object.assign({id:id(),color:"accent"},ev));created.events++});
      p.state.events.sort(function(a,b){return String(a.date||"").localeCompare(String(b.date||""))});
    }
    if(route==="files"){
      currentPlan.files.forEach(function(f){p.state.items.unshift(Object.assign({id:id(),type:"file",tag:"import",date:todayLabel(),createdAt:new Date().toISOString()},f));created.files++});
    }
    if((route==="database"||(!created.notes&&!created.tasks&&!created.events&&!created.files))&&currentPlan.database){
      createDatabase(currentPlan.database);created.databases++;
    }
    p.state.imports.unshift({id:id(),source:activeSource,name:currentPlan.name,route:route,created:created,ts:new Date().toISOString()});
    p.state.imports=p.state.imports.slice(0,40);
    save();
    if(typeof window.renderTodos==="function")window.renderTodos();
    if(typeof window.renderCalendar==="function")window.renderCalendar();
    if(typeof window.renderItems==="function")window.renderItems();
    if(typeof window.renderDatabasesHome==="function")window.renderDatabasesHome();
    renderHistory();
    setStatus("Import terminé : "+created.notes+" notes, "+created.tasks+" tâches, "+created.events+" événements, "+created.files+" fichiers, "+created.databases+" base(s).","success");
    notify("Import terminé dans ETHONE.","success");
    timeline("Import terminé",summaryForPlan(currentPlan),"content");
  }
  function renderHistory(){
    var el=$("#import-history-list");if(!el)return;
    var p=profile(),items=p&&p.state&&Array.isArray(p.state.imports)?p.state.imports:[];
    if(!items.length){el.innerHTML='<div class="import-status">Aucun import pour le moment.</div>';return}
    el.innerHTML=items.slice(0,8).map(function(x){
      var c=x.created||{};
      return '<div class="import-history-item"><div><strong>'+esc(x.name||x.source)+'</strong><span>'+esc(x.source)+' · '+esc(x.route)+' · '+new Date(x.ts).toLocaleString()+'</span></div><span class="import-pill">'+esc((c.notes||0)+(c.tasks||0)+(c.events||0)+(c.files||0)+(c.databases||0))+' created</span></div>';
    }).join("");
  }
  function loadSample(){
    activeSource="todoist";
    activeRoute="auto";
    renderSources();
    updateSourcePanel();
    renderRoutes();
    var rows=[["Task content","Description","Due date","Priority","Project"],["Préparer ETHONE Import","Créer l’assistant d’import","2026-07-10","high","ETHONE"],["Tester CSV","Vérifier le mapping automatique","2026-07-11","normal","QA"]];
    currentPlan=planFromRows(rows,"todoist-sample.csv","csv");
    currentPlan.route=resolveRoute(currentPlan);
    renderAnalysis(currentPlan);
    setStatus("Exemple chargé. Tu peux créer les données dans ETHONE.","success");
    var run=$("#import-run-btn");if(run)run.disabled=false;
  }
  function installNavigationHook(){
    if(typeof window.ethoneAddSwitchPageHook==="function"){
      window.ethoneAddSwitchPageHook("import-assistant",function(page){
        if(page==="import")setTimeout(renderImportAssistant,0);
      });
      return;
    }
    if(typeof window.switchPage==="function"&&!window.switchPage.__importAssistantWrapped){
      var old=window.switchPage;
      window.switchPage=function(page,navEl){
        var result=old.apply(this,arguments);
        if(page==="import")setTimeout(renderImportAssistant,0);
        return result;
      };
      window.switchPage.__importAssistantWrapped=true;
    }
  }
  function init(){
    ensurePage();
    installNavigationHook();
    if($("#page-import")&&$("#page-import").classList.contains("active"))renderImportAssistant();
  }
  window.renderImportAssistant=renderImportAssistant;
  window.ETHONEImportAssistant={render:renderImportAssistant,analyzeFiles:handleFiles,reset:resetPlan};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
