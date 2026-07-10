/* ETHONE Widget Builder: no-code custom dashboard widgets. */
(function(){
  "use strict";
  if(window.ETHONEWidgetBuilder)return;

  var KEY="ethone:custom-widgets:v1";
  var timers=new WeakMap();
  var builderState={draft:null,editingId:null};

  function app(){return window.Ethone||null}
  function storage(){try{return app()&&app().get&&app().get("storage")}catch(e){return null}}
  function actions(){try{return app()&&app().get&&app().get("actions")}catch(e){return null}}
  function registry(){try{return app()&&app().get&&app().get("widgets")}catch(e){return null}}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function state(){var p=profile();return p&&p.state?p.state:{}}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])})}
  function uid(){return "cw-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)}
  function toast(message,type){try{if(typeof window.toast==="function")window.toast(message,type||"info")}catch(e){}}
  function read(){
    var raw=null,s=storage();
    try{raw=s&&s.getJSON?s.getJSON(KEY,null):JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){raw=null}
    var list=raw&&Array.isArray(raw.widgets)?raw.widgets:Array.isArray(raw)?raw:[];
    return list.filter(function(w){return w&&w.id&&w.title}).map(sanitizeWidget);
  }
  function write(list){
    list=list.map(sanitizeWidget);
    var payload={version:1,updatedAt:Date.now(),widgets:list};
    var s=storage();
    try{if(s&&s.setJSON)s.setJSON(KEY,payload);else localStorage.setItem(KEY,JSON.stringify(payload))}catch(e){}
    try{window.dispatchEvent(new CustomEvent("ethone:custom-widgets-change",{detail:{count:list.length}}))}catch(e){}
    registerAll();
  }
  function customType(id){return "custom:"+id}
  function addCatalogType(type){
    window.__ethoneWidgetCatalogTypes=window.__ethoneWidgetCatalogTypes||[];
    if(window.__ethoneWidgetCatalogTypes.indexOf(type)===-1)window.__ethoneWidgetCatalogTypes.push(type);
  }
  function sanitizeWidget(w){
    w=w||{};
    var source=["manual","tasks","notes","calendar","github","spotify","weather","activity"].indexOf(w.source)>-1?w.source:"manual";
    var layout=["hero","stat","list","progress"].indexOf(w.layout)>-1?w.layout:"hero";
    var animation=["none","soft","pulse","bars"].indexOf(w.animation)>-1?w.animation:"soft";
    var action=w.action||{};
    return {
      id:String(w.id||uid()),
      title:String(w.title||"Custom Widget").slice(0,48),
      icon:String(w.icon||"sparkles").slice(0,32),
      color:String(w.color||"#8b5cf6").slice(0,24),
      source:source,
      layout:layout,
      animation:animation,
      metric:String(w.metric||"Live").slice(0,42),
      subtitle:String(w.subtitle||"Created in ETHONE Widget Builder").slice(0,120),
      items:String(w.items||"").slice(0,700),
      action:{
        type:["none","page","brain","url"].indexOf(action.type)>-1?action.type:"none",
        label:String(action.label||"Open").slice(0,32),
        target:String(action.target||"").slice(0,220)
      },
      createdAt:w.createdAt||Date.now(),
      updatedAt:Date.now()
    };
  }
  function defaultWidget(){
    return sanitizeWidget({
      id:uid(),
      title:"Mon widget",
      icon:"sparkles",
      color:"#8b5cf6",
      source:"manual",
      layout:"hero",
      animation:"soft",
      metric:"Ready",
      subtitle:"Un widget personnalise pour mon dashboard.",
      items:"Action principale\nSignal important\nProchaine etape",
      action:{type:"page",label:"Ouvrir",target:"dashboard"}
    });
  }
  function sizeForLayout(layout){
    if(layout==="hero")return {col:3,row:2};
    if(layout==="list")return {col:2,row:2};
    return {col:2,row:1};
  }
  function listRows(text){
    return String(text||"").split(/\n+/).map(function(x){return x.trim()}).filter(Boolean).slice(0,5);
  }
  function sourcePayload(widget){
    var s=state(),c=s.connections||{},rows=[],metric=widget.metric,subtitle=widget.subtitle,progress=0,status="ready";
    if(widget.source==="tasks"){
      var todos=Array.isArray(s.todos)?s.todos:[],open=todos.filter(function(t){return !t.done}),done=todos.filter(function(t){return !!t.done});
      metric=String(open.length);
      subtitle=done.length+" done / "+todos.length+" total";
      progress=todos.length?Math.round(done.length/todos.length*100):0;
      rows=open.slice(0,4).map(function(t){return t.text||t.title||"Task"});
      status=open.length?"active":"clear";
    }else if(widget.source==="notes"){
      var notes=Array.isArray(s.notes)?s.notes:[];
      metric=String(notes.length);
      subtitle=notes.length?"Recent notes":"No notes yet";
      rows=notes.slice(0,4).map(function(n){return n.title||String(n.content||"Untitled").slice(0,50)});
      progress=Math.min(100,notes.length*12);
      status=notes.length?"active":"ready";
    }else if(widget.source==="calendar"){
      var events=Array.isArray(s.events)?s.events:[];
      metric=String(events.length);
      subtitle=events.length?"Upcoming events":"No upcoming event";
      rows=events.slice().sort(function(a,b){return String(a.date||"").localeCompare(String(b.date||""))}).slice(0,4).map(function(e){return (e.title||e.text||"Event")+" "+(e.date||"")});
      progress=Math.min(100,events.length*18);
      status=events.length?"live":"ready";
    }else if(widget.source==="github"){
      var gh=c.github||{},commits=Array.isArray(gh.commits)?gh.commits:[];
      metric=gh.username?"@"+gh.username:"GitHub";
      subtitle=commits.length?commits.length+" cached commits":"Connect or sync GitHub";
      rows=commits.slice(0,4).map(function(x){return (x.msg||"commit")+" - "+(x.repo||"repo")});
      progress=Math.min(100,commits.length*12);
      status=commits.length?"live":gh.username?"ready":"offline";
    }else if(widget.source==="spotify"){
      var dc=c.discord&&c.discord.data||{},sp=dc.spotify||c.spotify||{},lf=c.lastfm||{};
      metric=sp.song||sp.track||lf.track||"Spotify";
      subtitle=sp.artist||lf.artist||lf.username||"Now Playing";
      rows=[sp.album,sp.state,lf.username].filter(Boolean);
      progress=sp.timestamps&&sp.timestamps.start&&sp.timestamps.end?Math.max(0,Math.min(100,Math.round((Date.now()-sp.timestamps.start)/(sp.timestamps.end-sp.timestamps.start)*100))):64;
      status=sp.song||sp.track?"live":"ready";
    }else if(widget.source==="weather"){
      var wx=s.weatherCache||{};
      metric=wx.city||"Weather";
      subtitle=wx.ts?"Updated "+Math.max(1,Math.round((Date.now()-wx.ts)/60000))+" min ago":"Choose a city";
      rows=["Temperature","Wind","Humidity"].filter(function(){return !!wx.rendered});
      progress=wx.rendered?82:18;
      status=wx.rendered?"live":"ready";
    }else if(widget.source==="activity"){
      var acts=Array.isArray(s.activity)?s.activity:Array.isArray(s.timeline)?s.timeline:[];
      metric=String(acts.length);
      subtitle="Recent ETHONE activity";
      rows=acts.slice(0,4).map(function(a){return a.title||a.message||a.type||"Activity"});
      progress=Math.min(100,acts.length*8);
      status=acts.length?"live":"ready";
    }else{
      rows=listRows(widget.items);
      progress=Math.min(100,Math.max(18,rows.length*18));
    }
    if(!rows.length)rows=listRows(widget.items);
    return {metric:metric,subtitle:subtitle,rows:rows,progress:progress,status:status};
  }
  function renderCustom(container,widget,preview){
    widget=sanitizeWidget(widget);
    var data=sourcePayload(widget);
    var action=widget.action&&widget.action.type!=="none";
    var rows=data.rows.slice(0,5).map(function(row){
      return '<div class="wb-widget-row"><span>'+esc(row)+'</span><i></i></div>';
    }).join("");
    var bars=[24,44,34,62,50,76,46,68].map(function(v,i){
      var h=widget.source==="manual"?v:Math.max(12,Math.min(100,data.progress+(i%3-1)*12));
      return '<i style="height:'+h+'%;animation-delay:'+((i%5)*.08).toFixed(2)+'s"></i>';
    }).join("");
    var body="";
    if(widget.layout==="list"){
      body='<div class="wb-widget-list">'+(rows||'<div class="wb-widget-empty">No data</div>')+'</div>';
    }else if(widget.layout==="progress"){
      body='<div class="wb-widget-progress"><i style="width:'+data.progress+'%"></i></div><div class="wb-widget-foot"><span>'+data.progress+'%</span><span>'+esc(widget.source)+'</span></div>';
    }else if(widget.layout==="stat"){
      body='<div class="wb-widget-stat"><strong>'+esc(data.metric)+'</strong><span>'+esc(data.subtitle)+'</span></div>';
    }else{
      body='<div class="wb-widget-hero"><strong>'+esc(data.metric)+'</strong><span>'+esc(data.subtitle)+'</span></div><div class="wb-widget-bars">'+bars+'</div>';
    }
    container.style.setProperty("--wb-accent",widget.color);
    container.classList.toggle("wb-anim-none",widget.animation==="none");
    container.classList.toggle("wb-anim-pulse",widget.animation==="pulse");
    container.classList.toggle("wb-anim-bars",widget.animation==="bars");
    container.innerHTML='<article class="wb-custom-widget">'+
      '<div class="wb-widget-head"><span>'+iconHTML(widget.icon)+'</span><div><strong>'+esc(widget.title)+'</strong><small>'+esc(data.status)+'</small></div></div>'+
      body+
      (action?'<button type="button" class="wb-widget-action" data-wb-widget-action="1">'+esc(widget.action.label||"Open")+'</button>':"")+
    '</article>';
    if(preview)container.classList.add("wb-preview-render");
  }
  function iconHTML(name){return '<i data-lucide="'+esc(name||"sparkles")+'" aria-hidden="true"></i>'}
  function runWidgetAction(widget){
    widget=sanitizeWidget(widget);
    var a=widget.action||{};
    if(a.type==="page"){
      var Actions=actions();
      if(Actions&&Actions.dispatch)Actions.dispatch("navigation.open",{page:a.target||"dashboard",source:"custom-widget"});
      else if(typeof window.switchPage==="function")window.switchPage(a.target||"dashboard");
    }else if(a.type==="brain"){
      var A=actions();
      if(A&&A.dispatch)A.dispatch("brain.open",{source:"custom-widget"});
      else if(typeof window.switchPage==="function")window.switchPage("ai");
    }else if(a.type==="url"&&a.target){
      try{window.open(a.target,"_blank","noopener,noreferrer")}catch(e){}
    }
  }
  function registerWidget(widget){
    widget=sanitizeWidget(widget);
    var reg=registry();
    if(!reg)return false;
    var type=customType(widget.id);
    var size=sizeForLayout(widget.layout);
    var def={
      label:widget.title,
      icon:widget.icon||"sparkles",
      category:"custom",
      defaultSize:size,
      minSize:{col:1,row:1},
      maxSize:{col:6,row:3},
      maxInstances:Infinity,
      mount:function(container){
        clearWidget(container);
        function draw(){renderCustom(container,widget,false);try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}}
        function click(e){if(e.target&&e.target.closest&&e.target.closest("[data-wb-widget-action]"))runWidgetAction(widget)}
        container.addEventListener("click",click);
        draw();
        var id=setInterval(function(){if(!document.hidden&&container.isConnected)draw()},widget.source==="manual"?30000:5000);
        timers.set(container,{id:id,click:click});
      },
      unmount:function(container){clearWidget(container);container.innerHTML=""}
    };
    if(reg.get&&reg.get(type)&&reg.update)reg.update(type,def);
    else if(reg.register)reg.register(type,def);
    addCatalogType(type);
    return true;
  }
  function clearWidget(container){
    var t=timers.get(container);
    if(t){
      if(t.id)clearInterval(t.id);
      if(t.click)container.removeEventListener("click",t.click);
      timers.delete(container);
    }
  }
  function registerAll(){
    read().forEach(registerWidget);
  }
  function formValue(id){var el=document.getElementById(id);return el?el.value:""}
  function formDraft(){
    var current=builderState.draft||defaultWidget();
    return sanitizeWidget({
      id:current.id,
      createdAt:current.createdAt,
      title:formValue("wb-title"),
      icon:formValue("wb-icon"),
      color:formValue("wb-color"),
      source:formValue("wb-source"),
      layout:formValue("wb-layout"),
      animation:formValue("wb-animation"),
      metric:formValue("wb-metric"),
      subtitle:formValue("wb-subtitle"),
      items:formValue("wb-items"),
      action:{type:formValue("wb-action-type"),label:formValue("wb-action-label"),target:formValue("wb-action-target")}
    });
  }
  function option(value,label,selected){return '<option value="'+esc(value)+'"'+(selected===value?' selected':'')+'>'+esc(label)+'</option>'}
  function selectOptions(rows,selected){return rows.map(function(r){return option(r[0],r[1],selected)}).join("")}
  function field(label,id,html){return '<label class="wb-field"><span>'+esc(label)+'</span>'+html+'</label>'}
  function renderLibrary(){
    var list=read();
    if(!list.length)return '<div class="wb-empty">Aucun widget custom pour le moment.</div>';
    return list.map(function(w){
      return '<div class="wb-lib-row" data-wb-id="'+esc(w.id)+'"><span style="--wb-accent:'+esc(w.color)+'">'+iconHTML(w.icon)+'</span><div><strong>'+esc(w.title)+'</strong><small>'+esc(w.source+' / '+w.layout)+'</small></div><button type="button" data-wb-lib="edit">Edit</button><button type="button" data-wb-lib="add">Add</button><button type="button" data-wb-lib="delete">Delete</button></div>';
    }).join("");
  }
  function renderOverlay(widget){
    close();
    builderState.draft=sanitizeWidget(widget||defaultWidget());
    var w=builderState.draft;
    var html='<div class="wb-overlay" id="ethone-widget-builder" role="dialog" aria-modal="true" aria-label="Widget Builder">'+
      '<div class="wb-shell">'+
        '<header class="wb-header"><div><span>ETHONE Studio</span><h2>Widget Builder</h2><p>Creer un widget visuel sans coder, puis l ajouter au Dashboard.</p></div><button type="button" class="wb-close" data-wb-action="close" aria-label="Fermer">'+iconHTML("x")+'</button></header>'+
        '<main class="wb-grid">'+
          '<section class="wb-panel wb-form-panel">'+
            '<div class="wb-section-title"><strong>Identite</strong><span>Titre, icone et couleur.</span></div>'+
            field("Titre","wb-title",'<input id="wb-title" value="'+esc(w.title)+'" maxlength="48">')+
            '<div class="wb-two">'+
              field("Icone","wb-icon",'<select id="wb-icon">'+selectOptions([["sparkles","Sparkles"],["brain","Brain"],["calendar-days","Calendar"],["music","Music"],["git-branch","GitHub"],["activity","Activity"],["target","Target"],["cloud-sun","Weather"],["cpu","CPU"],["database","Database"],["zap","Action"],["layout-dashboard","Dashboard"]],w.icon)+'</select>')+
              field("Couleur","wb-color",'<input id="wb-color" type="color" value="'+esc(w.color)+'">')+
            '</div>'+
            '<div class="wb-section-title"><strong>Structure</strong><span>Source, layout et motion.</span></div>'+
            '<div class="wb-three">'+
              field("Source","wb-source",'<select id="wb-source">'+selectOptions([["manual","Manuel"],["tasks","Taches"],["notes","Notes"],["calendar","Calendrier"],["github","GitHub"],["spotify","Spotify"],["weather","Weather"],["activity","Activity"]],w.source)+'</select>')+
              field("Layout","wb-layout",'<select id="wb-layout">'+selectOptions([["hero","Hero"],["stat","Stat"],["list","List"],["progress","Progress"]],w.layout)+'</select>')+
              field("Animation","wb-animation",'<select id="wb-animation">'+selectOptions([["soft","Soft"],["pulse","Pulse"],["bars","Bars"],["none","None"]],w.animation)+'</select>')+
            '</div>'+
            '<div class="wb-section-title"><strong>Contenu manuel</strong><span>Utilise si la source est Manuel ou en fallback.</span></div>'+
            field("Valeur principale","wb-metric",'<input id="wb-metric" value="'+esc(w.metric)+'" maxlength="42">')+
            field("Description","wb-subtitle",'<input id="wb-subtitle" value="'+esc(w.subtitle)+'" maxlength="120">')+
            field("Lignes","wb-items",'<textarea id="wb-items" rows="5">'+esc(w.items)+'</textarea>')+
            '<div class="wb-section-title"><strong>Action</strong><span>Bouton optionnel du widget.</span></div>'+
            '<div class="wb-three">'+
              field("Type","wb-action-type",'<select id="wb-action-type">'+selectOptions([["none","Aucune"],["page","Ouvrir page"],["brain","Ask Brain"],["url","URL"]],w.action.type)+'</select>')+
              field("Label","wb-action-label",'<input id="wb-action-label" value="'+esc(w.action.label)+'" maxlength="32">')+
              field("Cible","wb-action-target",'<input id="wb-action-target" value="'+esc(w.action.target)+'" placeholder="dashboard, notes, https://...">')+
            '</div>'+
          '</section>'+
          '<aside class="wb-panel wb-preview-panel">'+
            '<div class="wb-section-title"><strong>Preview live</strong><span>Rendu exact du widget.</span></div>'+
            '<div class="wb-preview-stage"><div id="wb-preview"></div></div>'+
            '<div class="wb-actions"><button type="button" class="wb-btn" data-wb-action="save">Sauvegarder</button><button type="button" class="wb-btn primary" data-wb-action="save-add">Sauvegarder + Ajouter</button></div>'+
            '<div class="wb-section-title"><strong>Bibliotheque</strong><span>Widgets deja crees.</span></div>'+
            '<div class="wb-library" id="wb-library">'+renderLibrary()+'</div>'+
          '</aside>'+
        '</main>'+
      '</div>'+
    '</div>';
    document.body.insertAdjacentHTML("beforeend",html);
    bindOverlay();
    updatePreview();
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function bindOverlay(){
    var overlay=document.getElementById("ethone-widget-builder");
    if(!overlay)return;
    overlay.addEventListener("input",function(e){if(e.target&&/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)){builderState.draft=formDraft();updatePreview()}});
    overlay.addEventListener("change",function(e){if(e.target&&/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)){builderState.draft=formDraft();updatePreview()}});
    overlay.addEventListener("click",function(e){
      var closeBtn=e.target.closest("[data-wb-action='close']");
      if(closeBtn||e.target===overlay){close();return}
      var action=e.target.closest("[data-wb-action]");
      if(action){
        var draft=formDraft();
        if(action.dataset.wbAction==="save"){saveWidget(draft,false)}
        if(action.dataset.wbAction==="save-add"){saveWidget(draft,true)}
        return;
      }
      var lib=e.target.closest("[data-wb-lib]");
      if(lib){
        var row=e.target.closest("[data-wb-id]"),id=row&&row.dataset.wbId;
        var widget=read().find(function(x){return x.id===id});
        if(!widget)return;
        if(lib.dataset.wbLib==="edit"){renderOverlay(widget)}
        if(lib.dataset.wbLib==="add"){addToDashboard(customType(widget.id),widget)}
        if(lib.dataset.wbLib==="delete")removeWidget(widget);
      }
    });
    overlay.addEventListener("keydown",function(e){if(e.key==="Escape")close()});
    var first=overlay.querySelector("input,select,textarea,button");
    if(first)first.focus({preventScroll:true});
  }
  function updatePreview(){
    var target=document.getElementById("wb-preview");
    if(!target)return;
    renderCustom(target,builderState.draft||formDraft(),true);
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function saveWidget(widget,add){
    widget=sanitizeWidget(widget);
    var list=read(),idx=list.findIndex(function(x){return x.id===widget.id});
    if(idx>-1)list[idx]=widget;else list.push(widget);
    write(list);
    builderState.draft=widget;
    var lib=document.getElementById("wb-library");
    if(lib)lib.innerHTML=renderLibrary();
    toast("Widget sauvegarde","success");
    if(add)addToDashboard(customType(widget.id),widget);
  }
  function removeWidget(widget){
    if(!confirm("Supprimer ce widget et le retirer des layouts ?"))return;
    var type=customType(widget.id),list=read().filter(function(x){return x.id!==widget.id});
    write(list);
    removeWidgetInstances(type);
    var lib=document.getElementById("wb-library");
    if(lib)lib.innerHTML=renderLibrary();
    toast("Widget supprime","info");
  }
  function removeWidgetInstances(type){
    try{
      var raw=JSON.parse(localStorage.getItem("ethone:dashboard-v4-layouts")||"null");
      if(raw&&Array.isArray(raw.layouts)){
        raw.layouts.forEach(function(l){
          if(l&&l.prefs&&Array.isArray(l.prefs.instances))l.prefs.instances=l.prefs.instances.filter(function(i){return i.type!==type});
        });
        localStorage.setItem("ethone:dashboard-v4-layouts",JSON.stringify(raw));
      }
      var legacy=JSON.parse(localStorage.getItem("ethone:dashboard-v4-layout")||"null");
      if(legacy&&Array.isArray(legacy.instances)){
        legacy.instances=legacy.instances.filter(function(i){return i.type!==type});
        localStorage.setItem("ethone:dashboard-v4-layout",JSON.stringify(legacy));
      }
      if(typeof window.ethoneDashboardV4Render==="function")window.ethoneDashboardV4Render();
    }catch(e){}
  }
  function addToDashboard(type,widget){
    registerWidget(widget);
    if(typeof window.switchPage==="function")window.switchPage("dashboard");
    setTimeout(function(){
      var ok=false;
      if(typeof window.ethoneDashboardV4AddWidget==="function")ok=window.ethoneDashboardV4AddWidget(type,{size:sizeForLayout(widget.layout),source:"widget-builder"});
      if(!ok){
        var A=actions();
        if(A&&A.dispatch){
          var actionElement=document.createElement("button");
          actionElement.dataset.widgetType=type;
          ok=A.dispatch("dashboard.edit.addWidgetType",{el:actionElement,widgetType:type,source:"widget-builder"});
        }
      }
      toast(ok?"Widget ajoute au dashboard":"Impossible d ajouter le widget",""+(ok?"success":"error"));
    },180);
  }
  function open(widgetId){
    registerAll();
    var widget=widgetId?read().find(function(w){return w.id===widgetId||customType(w.id)===widgetId}):null;
    renderOverlay(widget||defaultWidget());
  }
  function close(){
    var el=document.getElementById("ethone-widget-builder");
    if(el)el.remove();
  }

  window.ETHONEWidgetBuilder={
    open:open,
    close:close,
    list:read,
    save:function(widget){saveWidget(widget,false)},
    registerAll:registerAll,
    addToDashboard:addToDashboard
  };

  registerAll();
  window.addEventListener("storage",function(e){if(e.key===KEY)registerAll()});
  window.addEventListener("ethone:custom-widgets-change",registerAll);
})();
