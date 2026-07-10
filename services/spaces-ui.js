/* ETHONE Spaces UI.
   Premium switcher + Settings management for independent operating environments. */
(function(){
  "use strict";
  if(window.__ethoneSpacesUI)return;
  window.__ethoneSpacesUI=true;

  var rootId="ethone-spaces-root";
  var importInputId="ethone-space-import-input";
  var renderTimer=0;
  var previousFocus=null;
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var esc=function(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};

  function api(){return window.ETHONESpaces||window.ETHONEWorkspaces||null}
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function toast(message,type){if(typeof window.toast==="function")window.toast(message,type||"info")}
  function appVisible(){
    var main=$("#main-content"),auth=$("#auth-screen"),profileScreen=$("#profile-screen"),pw=$("#password-screen");
    var hidden=function(el){if(!el)return true;var cs=getComputedStyle(el);return el.hidden||cs.display==="none"||cs.visibility==="hidden"};
    return !!main&&!hidden(main)&&hidden(auth)&&hidden(profileScreen)&&hidden(pw);
  }
  function icon(name){
    return '<i data-lucide="'+esc(name||"layout-grid")+'" aria-hidden="true"></i>';
  }
  function spaceInitial(space){
    return esc((space.emoji||space.name||"S").slice(0,3).toUpperCase());
  }
  function counts(space){
    var d=space&&space.data||{};
    return {
      notes:Array.isArray(d.notes)?d.notes.length:0,
      tasks:Array.isArray(d.todos)?d.todos.filter(function(t){return !t.done}).length:0,
      files:Array.isArray(d.items)?d.items.length:0,
      db:Array.isArray(d.databases)?d.databases.length:0
    };
  }
  function spaceProfile(space){
    var c=counts(space),widgets=space&&space.widgets||{},brain=space&&space.brain||{},integrations=space&&space.integrations||{};
    var activeWidgets=Array.isArray(widgets.active)?widgets.active.length:0;
    var enabledIntegrations=Array.isArray(integrations.enabled)?integrations.enabled.length:0;
    return {
      tasks:c.tasks,
      notes:c.notes,
      files:c.files,
      db:c.db,
      widgets:activeWidgets,
      brain:brain.enabled!==false?brain.mode||"contextual":"off",
      integrations:enabledIntegrations,
      template:space&&space.template||"control",
      theme:space&&space.theme&&space.theme.preset||"ethone-purple"
    };
  }
  function modulePill(label,value,iconName){
    return '<span class="space-module-pill">'+icon(iconName)+'<b>'+esc(label)+'</b><em>'+esc(value)+'</em></span>';
  }
  function environmentHTML(space){
    var p=spaceProfile(space);
    return '<div class="spaces-environment-strip">'+
      modulePill("Dashboard",p.template,"layout-dashboard")+
      modulePill("Widgets",p.widgets,"blocks")+
      modulePill("Brain",p.brain,"brain")+
      modulePill("Integrations",p.integrations,"plug")+
    '</div>';
  }
  function option(value,label,current){
    return '<option value="'+esc(value)+'"'+(String(current)===String(value)?' selected':'')+'>'+esc(label)+'</option>';
  }
  function active(){var svc=api();return svc&&svc.active?svc.active():null}
  function all(){var svc=api();return svc&&svc.all?svc.all():[]}
  function scheduleRender(){
    clearTimeout(renderTimer);
    renderTimer=setTimeout(render,60);
  }
  function ensureRoot(){
    var root=$("#"+rootId);
    if(root)return root;
    root=document.createElement("div");
    root.id=rootId;
    root.className="spaces-root";
    root.innerHTML=
      '<button type="button" class="space-switcher-button" data-space-action="open" aria-label="Open ETHONE Spaces"></button>'+
      '<div class="spaces-overlay" data-space-action="close" aria-hidden="true" inert>'+
        '<section class="spaces-panel" role="dialog" aria-modal="true" aria-label="ETHONE Spaces">'+
          '<div class="spaces-panel-head">'+
            '<div><span>ETHONE Spaces</span><h2>Change environment</h2><p>Dashboards, widgets, notes, tasks, databases, integrations and visual identity stay isolated per Space.</p></div>'+
            '<button type="button" class="spaces-close" data-space-action="close" aria-label="Close">x</button>'+
          '</div>'+
          '<div class="spaces-active-preview" id="spaces-active-preview"></div>'+
          '<div class="spaces-grid" id="spaces-grid"></div>'+
          '<div class="spaces-panel-actions">'+
            '<button type="button" class="spaces-action primary" data-space-action="create">New Space</button>'+
            '<button type="button" class="spaces-action" data-space-action="import">Import</button>'+
            '<button type="button" class="spaces-action" data-space-action="settings">Manage in Settings</button>'+
          '</div>'+
        '</section>'+
      '</div>'+
      '<input id="'+importInputId+'" type="file" accept="application/json,.json" hidden />';
    document.body.appendChild(root);
    bind(root);
    return root;
  }
  function render(){
    var root=ensureRoot();
    var visible=appVisible();
    root.classList.toggle("is-ready",visible);
    if(!visible)return;
    var current=active(),list=all();
    renderButton(root,current);
    renderOverlay(root,current,list);
    renderSettings();
    try{window.lucide&&window.lucide.createIcons&&window.lucide.createIcons()}catch(e){}
  }
  function renderButton(root,current){
    var btn=$(".space-switcher-button",root);
    if(!btn||!current)return;
    btn.style.setProperty("--space-accent",current.accent||"#8b5cf6");
    btn.innerHTML=
      '<span class="space-switcher-mark">'+spaceInitial(current)+'</span>'+
      '<span class="space-switcher-copy"><strong>'+esc(current.name||"Space")+'</strong><small>'+esc((current.brain&&current.brain.mode||"contextual")+" Brain · "+(current.widgets&&Array.isArray(current.widgets.active)?current.widgets.active.length:0)+" widgets")+'</small></span>'+
      '<span class="space-switcher-chevron">'+icon("chevrons-up-down")+'</span>';
  }
  function renderOverlay(root,current,list){
    var preview=$("#spaces-active-preview",root),grid=$("#spaces-grid",root);
    if(preview&&current){
      var c=counts(current),p=spaceProfile(current);
      preview.style.setProperty("--space-accent",current.accent||"#8b5cf6");
      preview.innerHTML=
        '<div class="spaces-preview-mark">'+spaceInitial(current)+'</div>'+
        '<div class="spaces-preview-main"><span>Current environment</span><strong>'+esc(current.name)+'</strong><p>'+esc(current.description||"A complete ETHONE operating context.")+'</p></div>'+
        '<div class="spaces-preview-stats"><b>'+c.tasks+'</b><span>tasks</span><b>'+c.notes+'</b><span>notes</span><b>'+p.widgets+'</b><span>widgets</span><b>'+p.integrations+'</b><span>apps</span></div>'+
        environmentHTML(current);
    }
    if(grid){
      grid.innerHTML=list.map(function(space){
        var isActive=current&&current.id===space.id,c=counts(space);
        return '<article class="space-card'+(isActive?" active":"")+'" style="--space-accent:'+esc(space.accent||"#8b5cf6")+'" data-space-id="'+esc(space.id)+'">'+
          '<button type="button" class="space-card-main" data-space-switch="'+esc(space.id)+'">'+
            '<span class="space-card-logo">'+spaceInitial(space)+'</span>'+
            '<span class="space-card-body"><strong>'+esc(space.name)+'</strong><small>'+esc(space.description||"Independent ETHONE environment")+'</small></span>'+
            '<span class="space-card-state">'+(isActive?"Active":"Switch")+'</span>'+
          '</button>'+
          '<div class="space-card-meta"><span>'+c.tasks+' tasks</span><span>'+c.notes+' notes</span><span>'+c.db+' db</span></div>'+
          environmentHTML(space)+
          '<div class="space-card-actions">'+
            '<button type="button" data-space-action="duplicate" data-space-id="'+esc(space.id)+'">Duplicate</button>'+
            '<button type="button" data-space-action="export" data-space-id="'+esc(space.id)+'">Export</button>'+
            '<button type="button" data-space-action="share" data-space-id="'+esc(space.id)+'">Share</button>'+
            (list.length>1?'<button type="button" class="danger" data-space-action="delete" data-space-id="'+esc(space.id)+'">Delete</button>':"")+
          '</div>'+
        '</article>';
      }).join("");
    }
  }
  function openOverlay(){
    var root=ensureRoot();
    var overlay=$(".spaces-overlay",root);
    previousFocus=document.activeElement;
    overlay.inert=false;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden","false");
    setTimeout(function(){
      var close=$(".spaces-close",overlay);
      if(close)close.focus({preventScroll:true});
    },20);
  }
  function closeOverlay(){
    var root=$("#"+rootId);if(!root)return;
    var overlay=$(".spaces-overlay",root);
    if(overlay){
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden","true");
      overlay.inert=true;
    }
    if(previousFocus&&previousFocus.isConnected&&typeof previousFocus.focus==="function"){
      try{previousFocus.focus({preventScroll:true})}catch(e){previousFocus.focus()}
    }
    previousFocus=null;
  }
  function switchSpace(id){
    var svc=api();if(!svc||!svc.setActive)return;
    var next=svc.setActive(id);
    if(next){
      closeOverlay();
      scheduleRender();
      try{if(typeof window.renderSidebarNav==="function")window.renderSidebarNav()}catch(e){}
      try{window.dispatchEvent(new CustomEvent("ethone:page-ready",{detail:{page:"dashboard"}}))}catch(e){}
      try{window.dispatchEvent(new CustomEvent("ethone:space-ui-switched",{detail:{space:next}}))}catch(e){}
    }
  }
  function createSpace(){
    var name=prompt("Space name:", "New Space");
    if(!name)return;
    var accent=prompt("Accent color:", "#8b5cf6")||"#8b5cf6";
    var svc=api();if(!svc||!svc.create)return;
    var created=svc.create({name:name.slice(0,44),label:name.slice(0,44),accent:accent,emoji:name.slice(0,2).toUpperCase(),description:"Custom ETHONE Space."});
    if(created&&svc.setActive)svc.setActive(created.id);
    toast("Space created","success");
    scheduleRender();
  }
  function duplicateSpace(id){
    var svc=api();if(!svc||!svc.duplicate)return;
    var w=svc.duplicate(id);
    if(w)toast("Space duplicated","success");
    scheduleRender();
  }
  function deleteSpace(id){
    var svc=api();if(!svc||!svc.remove)return;
    var list=all(),space=list.find(function(w){return w.id===id});
    if(!space)return;
    if(!confirm("Delete Space '"+space.name+"'? Its isolated data will be removed from this profile."))return;
    if(svc.remove(id))toast("Space deleted","info");
    scheduleRender();
  }
  function downloadSpace(id){
    var svc=api();if(!svc||!svc.exportSpace)return;
    var space=all().find(function(w){return w.id===id})||active();
    var payload=svc.exportSpace(id);
    if(!payload)return;
    var blob=new Blob([payload],{type:"application/json"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;
    a.download="ethone-space-"+(space&&space.name?space.name:"space").toLowerCase().replace(/[^a-z0-9]+/g,"-")+".json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},1000);
    toast("Space exported","success");
  }
  function shareSpace(id){
    var svc=api();if(!svc||!svc.share)return;
    var result=svc.share(id);
    if(result)toast("Share package copied","success");
  }
  function importSpaceFile(file){
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(){
      var svc=api();if(!svc||!svc.importSpace)return;
      var w=svc.importSpace(reader.result);
      if(w){
        toast("Space imported","success");
        scheduleRender();
      }else toast("Invalid Space file","error");
    };
    reader.readAsText(file);
  }
  function openSettings(){
    closeOverlay();
    if(typeof window.switchPage==="function")window.switchPage("settings",null);
    setTimeout(function(){
      var btn=$('[onclick*="workspaces"],[data-settings-tab="workspaces"]');
      if(typeof window.switchSettingsTab==="function")window.switchSettingsTab("workspaces",btn||$(".settings-nav-item")||document.body);
      renderSettings();
    },120);
  }
  function bind(root){
    root.addEventListener("click",function(e){
      var sw=e.target.closest("[data-space-switch]");
      if(sw){switchSpace(sw.dataset.spaceSwitch);return;}
      var action=e.target.closest("[data-space-action]");
      if(!action)return;
      var name=action.dataset.spaceAction,id=action.dataset.spaceId;
      if(name==="open")openOverlay();
      if(name==="close"&&(action.classList.contains("spaces-close")||e.target===action))closeOverlay();
      if(name==="settings")openSettings();
      if(name==="create")createSpace();
      if(name==="duplicate")duplicateSpace(id);
      if(name==="delete")deleteSpace(id);
      if(name==="export")downloadSpace(id);
      if(name==="share")shareSpace(id);
      if(name==="import")$("#"+importInputId,root).click();
    });
    document.addEventListener("keydown",function(e){
      if(e.key==="Escape"&&$(".spaces-overlay.open",root)){
        e.preventDefault();
        e.stopPropagation();
        closeOverlay();
      }
    });
    $("#"+importInputId,root).addEventListener("change",function(e){
      importSpaceFile(e.target.files&&e.target.files[0]);
      e.target.value="";
    });
  }

  function renderSettings(){
    var wrap=$("#ws-list");
    if(!wrap)return;
    var list=all(),current=active();
    var card=wrap.closest(".settings-card");
    if(card){
      var title=card.querySelector(".settings-card-title");
      if(title)title.textContent="ETHONE Spaces";
      var desc=title&&title.nextElementSibling;
      if(desc)desc.textContent="Create independent operating environments with their own dashboard, widgets, notes, tasks, databases, files, integrations, AI context, sidebar, Dock and visual identity.";
      var oldButton=card.querySelector("button[onclick='wsCreate()']");
      if(oldButton)oldButton.style.display="none";
    }
    wrap.className="spaces-settings";
    wrap.innerHTML=
      '<div class="spaces-settings-head">'+
        '<div><span>Spaces</span><strong>'+list.length+' environments</strong></div>'+
        '<div class="spaces-settings-actions"><button type="button" class="btn btn-primary" onclick="ETHONESpacesUI.create()">New Space</button><button type="button" class="btn btn-ghost" onclick="ETHONESpacesUI.import()">Import</button></div>'+
      '</div>'+
      '<div class="spaces-settings-grid">'+list.map(settingsCard).join("")+'</div>';
    try{window.lucide&&window.lucide.createIcons&&window.lucide.createIcons()}catch(e){}
  }
  function settingsCard(space){
    var isActive=active()&&active().id===space.id,c=counts(space),p=spaceProfile(space);
    var brainMode=space.brain&&space.brain.mode||"contextual";
    var density=space.theme&&space.theme.density||space.settings&&space.settings.density||"comfortable";
    return '<article class="space-settings-card'+(isActive?" active":"")+'" style="--space-accent:'+esc(space.accent||"#8b5cf6")+'">'+
      '<div class="space-settings-top"><div class="space-settings-logo">'+spaceInitial(space)+'</div><div><strong>'+esc(space.name)+'</strong><span>'+esc(space.description||"Independent ETHONE environment")+'</span></div></div>'+
      environmentHTML(space)+
      '<div class="space-settings-fields">'+
        '<label>Name<input value="'+esc(space.name)+'" oninput="ETHONESpacesUI.update(\''+esc(space.id)+'\',{name:this.value,label:this.value})"></label>'+
        '<label>Accent<input value="'+esc(space.accent||"#8b5cf6")+'" oninput="ETHONESpacesUI.update(\''+esc(space.id)+'\',{accent:this.value})"></label>'+
        '<label>Wallpaper<input value="'+esc(space.wallpaper||"")+'" oninput="ETHONESpacesUI.update(\''+esc(space.id)+'\',{wallpaper:this.value})"></label>'+
        '<label>Template<select onchange="ETHONESpacesUI.setField(\''+esc(space.id)+'\',\'template\',this.value)">'+option("control","Control Center",space.template)+option("focus","Development / Focus",space.template)+option("gaming","Gaming",space.template)+option("study","Study",space.template)+option("streaming","Streaming",space.template)+'</select></label>'+
        '<label>Brain<select onchange="ETHONESpacesUI.setField(\''+esc(space.id)+'\',\'brain.mode\',this.value)">'+option("contextual","Contextual",brainMode)+option("builder","Builder",brainMode)+option("coach","Gaming Coach",brainMode)+option("study","Study",brainMode)+option("producer","Producer",brainMode)+'</select></label>'+
        '<label>Density<select onchange="ETHONESpacesUI.setField(\''+esc(space.id)+'\',\'theme.density\',this.value)">'+option("comfortable","Comfortable",density)+option("cozy","Cozy",density)+option("compact","Compact",density)+'</select></label>'+
        '<label>Description<textarea oninput="ETHONESpacesUI.update(\''+esc(space.id)+'\',{description:this.value})">'+esc(space.description||"")+'</textarea></label>'+
      '</div>'+
      '<div class="space-settings-stats"><span>'+c.tasks+' tasks</span><span>'+c.notes+' notes</span><span>'+c.files+' files</span><span>'+c.db+' databases</span><span>'+p.widgets+' widgets</span><span>'+p.integrations+' integrations</span></div>'+
      '<div class="space-settings-card-actions">'+
        (isActive?'<button type="button" class="btn btn-primary" disabled>Active</button>':'<button type="button" class="btn btn-primary" onclick="ETHONESpacesUI.switch(\''+esc(space.id)+'\')">Switch</button>')+
        '<button type="button" class="btn btn-ghost" onclick="ETHONESpacesUI.duplicate(\''+esc(space.id)+'\')">Duplicate</button>'+
        '<button type="button" class="btn btn-ghost" onclick="ETHONESpacesUI.export(\''+esc(space.id)+'\')">Export</button>'+
        '<button type="button" class="btn btn-ghost" onclick="ETHONESpacesUI.share(\''+esc(space.id)+'\')">Share</button>'+
        (all().length>1?'<button type="button" class="btn btn-danger" onclick="ETHONESpacesUI.delete(\''+esc(space.id)+'\')">Delete</button>':"")+
      '</div>'+
    '</article>';
  }
  function updateSpace(id,patch){
    var svc=api();if(!svc||!svc.update)return;
    svc.update(id,patch||{});
    scheduleRender();
  }
  function setField(id,path,value){
    var space=all().find(function(w){return w.id===id});
    if(!space)return;
    var patch={},parts=String(path||"").split(".");
    if(parts.length===1){
      patch[parts[0]]=value;
      if(parts[0]==="template")patch.dashboard=Object.assign({},space.dashboard||{},{template:value});
    }else if(parts.length===2){
      var parent=Object.assign({},space[parts[0]]||{});
      parent[parts[1]]=value;
      patch[parts[0]]=parent;
      if(parts[0]==="theme"&&parts[1]==="density")patch.settings=Object.assign({},space.settings||{},{density:value});
    }
    updateSpace(id,patch);
  }
  function bootHashImport(){
    if(!location.hash||location.hash.indexOf("#space=")!==0)return;
    try{
      var json=decodeURIComponent(escape(atob(location.hash.slice(7))));
      if(confirm("Import the ETHONE Space from this link?")){
        var svc=api();if(svc&&svc.importSpace){svc.importSpace(json);toast("Space imported","success");}
      }
      history.replaceState(null,"",location.pathname+location.search);
    }catch(e){}
  }
  function wireActions(){
    try{
      var Actions=window.Ethone&&window.Ethone.get&&window.Ethone.get("actions");
      if(Actions&&Actions.register){
        Actions.register("spaces.open",{enabled:true,label:"Spaces",handler:openOverlay});
        Actions.register("dashboard.nav.workspaces",{enabled:true,label:"Spaces",handler:openOverlay});
      }
    }catch(e){}
  }

  window.ETHONESpacesUI={
    open:openOverlay,
    close:closeOverlay,
    render:scheduleRender,
    create:createSpace,
    duplicate:duplicateSpace,
    delete:deleteSpace,
    export:downloadSpace,
    share:shareSpace,
    import:function(){var root=ensureRoot();$("#"+importInputId,root).click();},
    switch:switchSpace,
    update:updateSpace,
    setField:setField,
    settings:renderSettings
  };
  window.renderWorkspacesSettings=renderSettings;
  window.wsCreate=createSpace;
  window.wsSwitch=switchSpace;
  window.wsDelete=deleteSpace;
  window.wsRename=function(id,val){updateSpace(id,{name:String(val||"").slice(0,44),label:String(val||"").slice(0,44)})};
  window.wsAccent=function(id,val){updateSpace(id,{accent:val})};

  function boot(){
    ensureRoot();
    bootHashImport();
    wireActions();
    scheduleRender();
    window.addEventListener("ethone:workspace-change",scheduleRender);
    window.addEventListener("ethone:space-change",scheduleRender);
    window.addEventListener("ethone:workspace-update",scheduleRender);
    window.addEventListener("ethone:page-ready",scheduleRender);
    window.addEventListener("ethone:dashboard-ready",function(){wireActions();scheduleRender();});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
