/* ETHONE Studio - local visual builder for pages, widgets, dashboards and themes. */
(function(){
  "use strict";
  if(window.__ethoneStudio)return;
  window.__ethoneStudio=true;

  var STORAGE_KEY="ethone:studio:v1";
  var qs=function(s,r){return (r||document).querySelector(s)};
  var qsa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var esc=function(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
  var uid=function(prefix){return (prefix||"studio")+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)};
  var dragState=null;

  var componentLibrary=[
    {type:"button",name:"Button",hint:"Action, CTA, command",w:180,h:72},
    {type:"card",name:"Card",hint:"Content surface",w:260,h:170},
    {type:"input",name:"Input",hint:"Form field",w:250,h:118},
    {type:"dropdown",name:"Dropdown",hint:"Option selector",w:230,h:126},
    {type:"widget",name:"Widget",hint:"Live module",w:300,h:210},
    {type:"table",name:"Table",hint:"Database view",w:360,h:230},
    {type:"timeline",name:"Timeline",hint:"Activity stream",w:300,h:230},
    {type:"calendar",name:"Calendar",hint:"Schedule block",w:320,h:230},
    {type:"chart",name:"Chart",hint:"Analytics visual",w:300,h:190},
    {type:"sidebar",name:"Sidebar Item",hint:"Navigation item",w:220,h:84},
    {type:"notification",name:"Notification",hint:"System message",w:300,h:118},
    {type:"modal",name:"Modal",hint:"Dialog window",w:330,h:230},
    {type:"tabs",name:"Tabs",hint:"Segmented control",w:300,h:118},
    {type:"accordion",name:"Accordion",hint:"Expandable stack",w:310,h:170},
    {type:"progress",name:"Progress",hint:"Status tracker",w:260,h:120},
    {type:"skeleton",name:"Skeleton",hint:"Loading state",w:250,h:130},
    {type:"toast",name:"Toast",hint:"Feedback message",w:260,h:92}
  ];

  var templates=[
    {id:"developer",name:"Developer Workspace",type:"workspace",desc:"GitHub, focus, tasks and AI context for coding sessions.",components:["card","chart","table","timeline","button"]},
    {id:"streamer",name:"Streamer Dashboard",type:"dashboard",desc:"OBS, Twitch, chat status, schedule and quick actions.",components:["widget","chart","notification","calendar","button"]},
    {id:"valorant",name:"Valorant Dashboard",type:"dashboard",desc:"Accounts, rank overview, goals and match preparation.",components:["card","table","progress","timeline","widget"]},
    {id:"student",name:"Student Dashboard",type:"workspace",desc:"Courses, deadlines, notes, calendar and study progress.",components:["calendar","table","card","progress","input"]},
    {id:"minimal",name:"Minimal Dashboard",type:"dashboard",desc:"A calm Home with only the essentials.",components:["card","button","timeline"]},
    {id:"productivity",name:"Productivity Dashboard",type:"dashboard",desc:"Today, priorities, automations and weekly overview.",components:["widget","progress","calendar","timeline","chart"]}
  ];

  var state=load();

  function defaultProject(){
    return {
      id:uid("project"),
      name:"Personal OS Builder",
      type:"dashboard",
      updated:Date.now(),
      components:[
        makeComponent("card",48,48,{title:"Brain Brief",copy:"Build pages, widgets and workflows visually."}),
        makeComponent("chart",340,48,{title:"System Signal"}),
        makeComponent("button",48,260,{title:"Ask Brain"}),
        makeComponent("timeline",340,270,{title:"Activity"})
      ],
      theme:{accent:"#8b5cf6",surface:"#15151b",radius:18,blur:14,glow:24,typography:"Syne",spacing:14,animations:"Smooth"}
    };
  }

  function load(){
    var saved=null;
    try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")}catch(e){}
    if(!saved||!Array.isArray(saved.projects)||!saved.projects.length){
      saved={activeTab:"canvas",activeProjectId:null,selectedId:null,projects:[defaultProject()],themes:[]};
      saved.activeProjectId=saved.projects[0].id;
    }
    return saved;
  }

  function save(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}
    try{
      var p=typeof window.curP==="function"?window.curP():null;
      if(p){
        if(!p.state)p.state={};
        p.state.studio=state;
        if(typeof window.saveStateNow==="function")window.saveStateNow();
      }
    }catch(e){}
  }

  function activeProject(){
    var project=state.projects.find(function(p){return p.id===state.activeProjectId});
    if(!project){
      project=state.projects[0]||defaultProject();
      if(!state.projects.length)state.projects.push(project);
      state.activeProjectId=project.id;
    }
    return project;
  }

  function makeComponent(type,x,y,overrides){
    var def=componentLibrary.find(function(c){return c.type===type})||componentLibrary[0];
    var o=overrides||{};
    return {
      id:uid("component"),
      type:type,
      x:x||40,
      y:y||40,
      w:o.w||def.w,
      h:o.h||def.h,
      title:o.title||def.name,
      copy:o.copy||def.hint,
      color:o.color||"#8b5cf6",
      animation:o.animation||"Smooth",
      interaction:o.interaction||"Open panel"
    };
  }

  function renderStudioPage(){
    var page=qs("#page-studio");
    if(!page)return;
    var project=activeProject();
    page.innerHTML=
      '<div class="studio-shell">'+
        '<header class="studio-hero">'+
          '<div><div class="studio-kicker">ETHONE Studio <span class="ethone-coming-soon-badge">Runtime publish Coming Soon</span></div><h2>Create your own Personal OS.</h2><p>Build pages, widgets, dashboards, databases, automations and themes visually. The editor, local save, templates and JSON export are active; publishing Studio objects directly into the live app is clearly marked for the next runtime phase.</p></div>'+
          '<div class="studio-hero-actions">'+
            '<button class="studio-btn" type="button" data-studio-action="open-command">Command Palette</button>'+
            '<button class="studio-btn" type="button" data-studio-action="export-project">Export</button>'+
            '<button class="studio-btn primary" type="button" data-studio-action="new-dashboard">New Dashboard</button>'+
          '</div>'+
        '</header>'+
        '<section class="studio-workbench">'+
          renderSidebar(project)+
          renderCanvas(project)+
          renderRightPanel(project)+
        '</section>'+
      '</div>';
    bindStage(page);
  }

  function renderSidebar(project){
    var tabs=[
      ["canvas","Visual Editor","Build"],
      ["components","Components","17"],
      ["templates","Templates","6"],
      ["theme","Theme Builder","Live"],
      ["export","Import / Export","JSON"]
    ];
    return '<aside class="studio-sidebar">'+
      '<div class="studio-tabs">'+tabs.map(function(tab){
        return '<button type="button" class="studio-tab '+(state.activeTab===tab[0]?"active":"")+'" data-studio-tab="'+tab[0]+'"><span>'+tab[1]+'</span><i>'+tab[2]+'</i></button>';
      }).join("")+'</div>'+
      '<div class="studio-projects">'+
        '<button class="studio-btn primary" type="button" data-studio-action="new-project">Create object</button>'+
        state.projects.map(function(p){
          return '<article class="studio-project-card '+(p.id===project.id?"active":"")+'" data-studio-project="'+p.id+'"><strong>'+esc(p.name)+'</strong><span>'+esc(p.type)+' · '+(p.components||[]).length+' components</span></article>';
        }).join("")+
      '</div>'+
    '</aside>';
  }

  function renderCanvas(project){
    return '<section class="studio-stage-wrap">'+
      '<div class="studio-toolbar">'+
        '<div class="studio-toolbar-title"><strong>'+esc(project.name)+'</strong><span>'+esc(project.type)+' · drag components onto the canvas · resize and customize on the right</span></div>'+
        '<div class="studio-toolbar-actions">'+
          '<button class="studio-btn" type="button" data-studio-action="rename-project">Rename</button>'+
          '<button class="studio-btn" type="button" data-studio-action="duplicate-project">Duplicate</button>'+
          '<button class="studio-btn" type="button" data-studio-action="clear-canvas">Clear</button>'+
        '</div>'+
      '</div>'+
      '<div class="studio-canvas-shell">'+
        '<div class="studio-canvas '+((project.components||[]).length?"":"is-empty")+'" data-studio-stage>'+
          (project.components||[]).map(renderBlock).join("")+
        '</div>'+
      '</div>'+
    '</section>';
  }

  function renderBlock(c){
    var style='left:'+c.x+'px;top:'+c.y+'px;width:'+c.w+'px;height:'+c.h+'px;--studio-accent:'+esc(c.color||"#8b5cf6")+';';
    return '<article class="studio-block '+(state.selectedId===c.id?"selected":"")+'" style="'+style+'" data-component-id="'+esc(c.id)+'">'+
      '<div class="studio-block-body">'+blockBody(c)+'</div><span class="studio-resize" data-studio-resize="'+esc(c.id)+'"></span>'+
    '</article>';
  }

  function blockBody(c){
    if(c.type==="button")return '<div class="studio-block-kicker">Action</div><div class="studio-theme-chip" style="--theme-accent:'+esc(c.color)+'">'+esc(c.title)+'</div><div class="studio-block-copy">'+esc(c.interaction)+'</div>';
    if(c.type==="input")return '<div class="studio-block-kicker">Form</div><div class="studio-block-title">'+esc(c.title)+'</div><div class="studio-block-form"><span></span><span></span></div>';
    if(c.type==="dropdown")return '<div class="studio-block-kicker">Select</div><div class="studio-block-title">'+esc(c.title)+'</div><div class="studio-block-form"><span></span><span style="width:68%"></span></div>';
    if(c.type==="table")return '<div class="studio-block-kicker">Database</div><div class="studio-block-title">'+esc(c.title)+'</div><div class="studio-block-table"><span></span><span style="width:78%"></span><span style="width:92%"></span><span style="width:62%"></span></div>';
    if(c.type==="chart")return '<div class="studio-block-kicker">Analytics</div><div class="studio-block-title">'+esc(c.title)+'</div><div class="studio-block-chart"><i style="height:32%"></i><i style="height:68%"></i><i style="height:46%"></i><i style="height:86%"></i><i style="height:58%"></i><i style="height:76%"></i></div>';
    if(c.type==="progress")return '<div class="studio-block-kicker">Progress</div><div class="studio-block-title">'+esc(c.title)+'</div><div class="studio-block-line"><i></i></div><div class="studio-block-copy">'+esc(c.copy)+'</div>';
    if(c.type==="calendar")return '<div class="studio-block-kicker">Calendar</div><div class="studio-block-title">'+esc(c.title)+'</div><div class="studio-block-table"><span></span><span></span><span></span></div>';
    if(c.type==="notification"||c.type==="toast")return '<div class="studio-block-kicker">System</div><div class="studio-block-title">'+esc(c.title)+'</div><div class="studio-block-copy">'+esc(c.copy)+'</div>';
    return '<div class="studio-block-kicker">'+esc(c.type)+'</div><div class="studio-block-title">'+esc(c.title)+'</div><div class="studio-block-copy">'+esc(c.copy)+'</div><div class="studio-block-line"><i></i></div>';
  }

  function renderRightPanel(project){
    var body="";
    if(state.activeTab==="components")body=renderComponentsPanel();
    else if(state.activeTab==="templates")body=renderTemplatesPanel();
    else if(state.activeTab==="theme")body=renderThemePanel(project);
    else if(state.activeTab==="export")body=renderExportPanel(project);
    else body=renderInspector(project);
    return '<aside class="studio-panel"><div class="studio-panel-head"><strong>'+panelTitle()+'</strong><span>'+panelSubtitle()+'</span></div><div class="studio-panel-body">'+body+'</div></aside>';
  }

  function panelTitle(){
    return {canvas:"Inspector",components:"Component Library",templates:"Templates",theme:"Theme Builder",export:"Sharing"}[state.activeTab]||"Inspector";
  }

  function panelSubtitle(){
    return {canvas:"Select a component to edit its design and behavior.",components:"Drag any block into the canvas.",templates:"Start from complete ETHONE environments.",theme:"Create and apply a full ETHONE theme.",export:"Export or import Studio objects."}[state.activeTab]||"";
  }

  function renderComponentsPanel(){
    return '<div class="studio-library">'+componentLibrary.map(function(c){
      return '<div class="studio-component" draggable="true" data-studio-component="'+c.type+'"><strong>'+esc(c.name)+'</strong><span>'+esc(c.hint)+'</span></div>';
    }).join("")+'</div>';
  }

  function renderTemplatesPanel(){
    return '<div class="studio-template-grid">'+templates.map(function(t){
      return '<article class="studio-template"><div class="studio-template-preview"><i></i><i></i><i></i><i></i></div><strong>'+esc(t.name)+'</strong><p>'+esc(t.desc)+'</p><button class="studio-btn primary" type="button" data-studio-template="'+t.id+'">Use template</button></article>';
    }).join("")+'</div>';
  }

  function renderThemePanel(project){
    var theme=project.theme||{};
    return '<div class="studio-field"><label>Accent</label><input class="studio-input" type="color" data-theme-field="accent" value="'+esc(theme.accent||"#8b5cf6")+'"></div>'+
      '<div class="studio-field"><label>Surface</label><input class="studio-input" type="color" data-theme-field="surface" value="'+esc(theme.surface||"#15151b")+'"></div>'+
      '<div class="studio-row"><div class="studio-field"><label>Radius</label><input class="studio-input" type="range" min="8" max="32" data-theme-field="radius" value="'+esc(theme.radius||18)+'"></div><div class="studio-field"><label>Blur</label><input class="studio-input" type="range" min="0" max="28" data-theme-field="blur" value="'+esc(theme.blur||14)+'"></div></div>'+
      '<div class="studio-row"><div class="studio-field"><label>Glow</label><input class="studio-input" type="range" min="0" max="60" data-theme-field="glow" value="'+esc(theme.glow||24)+'"></div><div class="studio-field"><label>Spacing</label><input class="studio-input" type="range" min="8" max="24" data-theme-field="spacing" value="'+esc(theme.spacing||14)+'"></div></div>'+
      '<div class="studio-field"><label>Typography</label><select class="studio-select" data-theme-field="typography"><option '+selected(theme.typography,"Syne")+'>Syne</option><option '+selected(theme.typography,"Inter")+'>Inter</option><option '+selected(theme.typography,"System")+'>System</option></select></div>'+
      '<div class="studio-theme-preview" style="--theme-accent:'+esc(theme.accent||"#8b5cf6")+';--theme-surface:'+esc(theme.surface||"#15151b")+';--theme-radius:'+(theme.radius||18)+';--theme-glow:'+(theme.glow||24)+'"><div class="studio-theme-chip" style="--theme-accent:'+esc(theme.accent||"#8b5cf6")+';--theme-radius:'+(theme.radius||18)+'">ETHONE Theme</div></div>'+
      '<button class="studio-btn primary" type="button" data-studio-action="apply-theme">Apply theme</button><button class="studio-btn" type="button" data-studio-action="save-theme">Save as theme</button>';
  }

  function selected(value,expected){return String(value||"Syne")===expected?"selected":""}

  function renderExportPanel(project){
    var payload=JSON.stringify({version:1,exportedAt:new Date().toISOString(),project:project},null,2);
    return '<div class="studio-export-card"><strong>Export current project</strong><textarea class="studio-textarea" id="studio-export-text">'+esc(payload)+'</textarea><div class="studio-row"><button class="studio-btn primary" type="button" data-studio-action="copy-export">Copy</button><button class="studio-btn" type="button" data-studio-action="download-export">Download</button></div></div>'+
      '<div class="studio-export-card"><strong>Import Studio object</strong><textarea class="studio-textarea" id="studio-import-text" placeholder="Paste a Studio JSON export here"></textarea><button class="studio-btn primary" type="button" data-studio-action="import-json">Import</button></div>';
  }

  function renderInspector(project){
    var selectedComponent=(project.components||[]).find(function(c){return c.id===state.selectedId});
    if(!selectedComponent)return '<div class="studio-inspector-empty">Select a component on the canvas or open the Component Library to drag a new block.</div>'+renderComponentsPanel();
    return '<div class="studio-field"><label>Title</label><input class="studio-input" data-prop-field="title" value="'+esc(selectedComponent.title)+'"></div>'+
      '<div class="studio-field"><label>Description</label><textarea class="studio-textarea" data-prop-field="copy">'+esc(selectedComponent.copy)+'</textarea></div>'+
      '<div class="studio-row"><div class="studio-field"><label>Color</label><input class="studio-input" type="color" data-prop-field="color" value="'+esc(selectedComponent.color)+'"></div><div class="studio-field"><label>Animation</label><select class="studio-select" data-prop-field="animation"><option '+selected(selectedComponent.animation,"Smooth")+'>Smooth</option><option '+selected(selectedComponent.animation,"Pop")+'>Pop</option><option '+selected(selectedComponent.animation,"Slide")+'>Slide</option><option '+selected(selectedComponent.animation,"None")+'>None</option></select></div></div>'+
      '<div class="studio-field"><label>Interaction</label><select class="studio-select" data-prop-field="interaction"><option '+selected(selectedComponent.interaction,"Open panel")+'>Open panel</option><option '+selected(selectedComponent.interaction,"Run automation")+'>Run automation</option><option '+selected(selectedComponent.interaction,"Ask Brain")+'>Ask Brain</option><option '+selected(selectedComponent.interaction,"Navigate")+'>Navigate</option></select></div>'+
      '<div class="studio-row"><button class="studio-btn" type="button" data-studio-action="duplicate-component">Duplicate</button><button class="studio-btn" type="button" data-studio-action="delete-component">Delete</button></div>';
  }

  function bindStage(page){
    var stage=qs("[data-studio-stage]",page);
    qsa("[data-studio-component]",page).forEach(function(el){
      el.addEventListener("dragstart",function(e){e.dataTransfer.setData("text/studio-component",el.dataset.studioComponent)});
    });
    if(stage){
      stage.addEventListener("dragover",function(e){e.preventDefault()});
      stage.addEventListener("drop",function(e){
        e.preventDefault();
        var type=e.dataTransfer.getData("text/studio-component");
        if(!type)return;
        var rect=stage.getBoundingClientRect();
        addComponent(type,Math.round(e.clientX-rect.left+stage.scrollLeft-80),Math.round(e.clientY-rect.top+stage.scrollTop-40));
      });
    }
  }

  function addComponent(type,x,y){
    var project=activeProject();
    var c=makeComponent(type,Math.max(12,x),Math.max(12,y));
    project.components.push(c);
    project.updated=Date.now();
    state.selectedId=c.id;
    state.activeTab="canvas";
    save();
    renderStudioPage();
  }

  function applyTheme(theme){
    if(!theme)return;
    document.documentElement.style.setProperty("--accent",theme.accent||"#8b5cf6");
    document.documentElement.style.setProperty("--radius-lg",(theme.radius||18)+"px");
    document.documentElement.style.setProperty("--theme-blur-scale",String((theme.blur||14)/14));
    document.documentElement.dataset.studioTheme="custom";
    try{localStorage.setItem("ethone:studio:active-theme",JSON.stringify(theme))}catch(e){}
  }

  function installTemplate(id){
    var template=templates.find(function(t){return t.id===id});
    if(!template)return;
    var project=activeProject();
    project.name=template.name;
    project.type=template.type;
    project.components=template.components.map(function(type,i){
      return makeComponent(type,42+(i%2)*330,42+Math.floor(i/2)*210,{title:componentLibrary.find(function(c){return c.type===type}).name});
    });
    project.updated=Date.now();
    state.selectedId=project.components[0]&&project.components[0].id;
    state.activeTab="canvas";
    save();
    renderStudioPage();
    toastSafe("Template applied","success");
  }

  function createProject(type){
    var name=prompt("Name this Studio object",type.charAt(0).toUpperCase()+type.slice(1)+" Builder");
    if(!name)return;
    var project={id:uid("project"),name:name,type:type,updated:Date.now(),components:[],theme:{accent:"#8b5cf6",surface:"#15151b",radius:18,blur:14,glow:24,typography:"Syne",spacing:14,animations:"Smooth"}};
    state.projects.unshift(project);
    state.activeProjectId=project.id;
    state.selectedId=null;
    state.activeTab="components";
    save();
    renderStudioPage();
  }

  function toastSafe(message,type){
    if(typeof window.toast==="function")try{window.toast(message,type||"info")}catch(e){}
  }

  function handleAction(action){
    var project=activeProject();
    if(action==="open-command"&&typeof window.openCmdPalette==="function")return window.openCmdPalette();
    if(action==="new-dashboard")return createProject("dashboard");
    if(action==="new-project"){
      var type=prompt("Type: page, widget, dashboard, database, automation, integration, card, panel, menu, layout, template","page")||"page";
      return createProject(type.trim().toLowerCase());
    }
    if(action==="rename-project"){
      var name=prompt("Project name",project.name);
      if(name){project.name=name;project.updated=Date.now();save();renderStudioPage();}
    }
    if(action==="duplicate-project"){
      var clone=JSON.parse(JSON.stringify(project));
      clone.id=uid("project");
      clone.name=project.name+" Copy";
      clone.updated=Date.now();
      clone.components=(clone.components||[]).map(function(c){c.id=uid("component");return c});
      state.projects.unshift(clone);
      state.activeProjectId=clone.id;
      save();
      renderStudioPage();
    }
    if(action==="clear-canvas"&&confirm("Clear this canvas?")){
      project.components=[];
      state.selectedId=null;
      save();
      renderStudioPage();
    }
    if(action==="duplicate-component"){
      var c=project.components.find(function(x){return x.id===state.selectedId});
      if(c){
        var copy=JSON.parse(JSON.stringify(c));
        copy.id=uid("component");
        copy.x+=24;copy.y+=24;
        project.components.push(copy);
        state.selectedId=copy.id;
        save();renderStudioPage();
      }
    }
    if(action==="delete-component"){
      project.components=project.components.filter(function(c){return c.id!==state.selectedId});
      state.selectedId=null;
      save();renderStudioPage();
    }
    if(action==="apply-theme"){
      applyTheme(project.theme);
      toastSafe("Theme applied","success");
    }
    if(action==="save-theme"){
      state.themes=state.themes||[];
      state.themes.unshift({id:uid("theme"),name:project.name+" Theme",theme:project.theme,createdAt:Date.now()});
      save();
      toastSafe("Theme saved","success");
    }
    if(action==="copy-export"){
      var text=qs("#studio-export-text");
      if(text&&navigator.clipboard)navigator.clipboard.writeText(text.value).then(function(){toastSafe("Export copied","success")});
    }
    if(action==="download-export"){
      var exportText=qs("#studio-export-text");
      if(!exportText)return;
      var blob=new Blob([exportText.value],{type:"application/json"});
      var a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download=(project.name||"ethone-studio").toLowerCase().replace(/[^a-z0-9]+/g,"-")+".json";
      a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href)},1200);
    }
    if(action==="import-json"){
      var importText=qs("#studio-import-text");
      if(!importText||!importText.value.trim())return toastSafe("Paste a Studio export first","warning");
      try{
        var imported=JSON.parse(importText.value);
        var incoming=imported.project||imported;
        if(!incoming||!incoming.name||!Array.isArray(incoming.components))throw new Error("Invalid Studio object");
        incoming.id=uid("project");
        incoming.updated=Date.now();
        incoming.components=incoming.components.map(function(c){c.id=uid("component");return c});
        state.projects.unshift(incoming);
        state.activeProjectId=incoming.id;
        state.selectedId=null;
        state.activeTab="canvas";
        save();
        renderStudioPage();
        toastSafe("Studio object imported","success");
      }catch(e){toastSafe("Import failed: "+e.message,"error")}
    }
  }

  function findComponent(id){
    return activeProject().components.find(function(c){return c.id===id});
  }

  function bindGlobal(){
    document.addEventListener("click",function(e){
      var tab=e.target.closest("[data-studio-tab]");
      if(tab){state.activeTab=tab.dataset.studioTab;save();renderStudioPage();return;}
      var project=e.target.closest("[data-studio-project]");
      if(project){state.activeProjectId=project.dataset.studioProject;state.selectedId=null;state.activeTab="canvas";save();renderStudioPage();return;}
      var action=e.target.closest("[data-studio-action]");
      if(action){handleAction(action.dataset.studioAction);return;}
      var template=e.target.closest("[data-studio-template]");
      if(template){installTemplate(template.dataset.studioTemplate);return;}
      var block=e.target.closest("[data-component-id]");
      if(block&&qs("#page-studio.active")){state.selectedId=block.dataset.componentId;state.activeTab="canvas";save();renderStudioPage();}
    });

    document.addEventListener("input",function(e){
      var prop=e.target.dataset&&e.target.dataset.propField;
      var themeField=e.target.dataset&&e.target.dataset.themeField;
      if(prop&&qs("#page-studio.active")){
        var c=findComponent(state.selectedId);
        if(c){
          c[prop]=e.target.value;
          activeProject().updated=Date.now();
          save();
          updateBlockDom(c);
        }
      }
      if(themeField&&qs("#page-studio.active")){
        var project=activeProject();
        if(!project.theme)project.theme={};
        var value=e.target.value;
        if(["radius","blur","glow","spacing"].indexOf(themeField)>-1)value=Number(value)||0;
        project.theme[themeField]=value;
        project.updated=Date.now();
        save();
        updateThemePreview(project.theme);
      }
    });

    document.addEventListener("pointerdown",function(e){
      if(!qs("#page-studio.active"))return;
      var resize=e.target.closest("[data-studio-resize]");
      var block=e.target.closest("[data-component-id]");
      if(!block)return;
      var c=findComponent(block.dataset.componentId);
      if(!c)return;
      state.selectedId=c.id;
      var rect=block.getBoundingClientRect();
      dragState={id:c.id,mode:resize?"resize":"move",startX:e.clientX,startY:e.clientY,x:c.x,y:c.y,w:c.w,h:c.h,rect:rect};
      block.setPointerCapture&&block.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    document.addEventListener("pointermove",function(e){
      if(!dragState)return;
      var c=findComponent(dragState.id);
      if(!c)return;
      var dx=e.clientX-dragState.startX;
      var dy=e.clientY-dragState.startY;
      if(dragState.mode==="resize"){
        c.w=Math.max(120,Math.round(dragState.w+dx));
        c.h=Math.max(68,Math.round(dragState.h+dy));
      }else{
        c.x=Math.max(0,Math.round(dragState.x+dx));
        c.y=Math.max(0,Math.round(dragState.y+dy));
      }
      var el=qs('[data-component-id="'+c.id+'"]');
      if(el){
        el.style.left=c.x+"px";el.style.top=c.y+"px";el.style.width=c.w+"px";el.style.height=c.h+"px";
        el.classList.add("selected");
      }
    });

    document.addEventListener("pointerup",function(){
      if(dragState){
        activeProject().updated=Date.now();
        save();
        dragState=null;
      }
    });

    window.addEventListener("ethone:page-ready",function(e){
      if(e&&e.detail&&e.detail.page==="studio")renderStudioPage();
    });
  }

  function patchNavigation(){
    if(window.SVG_ICONS&&!window.SVG_ICONS.studio){
      window.SVG_ICONS.studio='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 3v6h6"/><path d="M8 15h8"/><path d="M8 11h3"/></svg>';
    }
    if(typeof window.getDefaultNav==="function"&&!window.getDefaultNav.__studioWrapped){
      var original=window.getDefaultNav;
      window.getDefaultNav=function(){
        var nav=original.apply(this,arguments)||[];
        if(!nav.some(function(item){return item.id==="studio"})){
          var studioItem={id:"studio",icon:"studio",label:"Studio",section:"main",badge:"Create",group:"smart"};
          var idx=nav.findIndex(function(item){return item.id==="marketplace"});
          if(idx>-1)nav.splice(idx,0,studioItem);
          else nav.push(studioItem);
        }
        return nav;
      };
      window.getDefaultNav.__studioWrapped=true;
    }
    if(typeof window.renderSidebarNav==="function"){
      try{window.renderSidebarNav()}catch(e){}
    }
  }

  function updateBlockDom(component){
    var block=qs('[data-component-id="'+component.id+'"]');
    if(!block)return;
    block.style.setProperty("--studio-accent",component.color||"#8b5cf6");
    var body=qs(".studio-block-body",block);
    if(body)body.innerHTML=blockBody(component);
  }

  function updateThemePreview(theme){
    var preview=qs(".studio-theme-preview");
    var chip=qs(".studio-theme-chip",preview);
    if(preview){
      preview.style.setProperty("--theme-accent",theme.accent||"#8b5cf6");
      preview.style.setProperty("--theme-surface",theme.surface||"#15151b");
      preview.style.setProperty("--theme-radius",theme.radius||18);
      preview.style.setProperty("--theme-glow",theme.glow||24);
    }
    if(chip){
      chip.style.setProperty("--theme-accent",theme.accent||"#8b5cf6");
      chip.style.setProperty("--theme-radius",theme.radius||18);
    }
  }

  function boot(){
    patchNavigation();
    bindGlobal();
    try{
      var activeTheme=JSON.parse(localStorage.getItem("ethone:studio:active-theme")||"null");
      if(activeTheme)applyTheme(activeTheme);
    }catch(e){}
    if(qs("#page-studio.active"))renderStudioPage();
    setTimeout(patchNavigation,800);
  }

  window.renderStudioPage=renderStudioPage;
  window.ETHONEStudio={render:renderStudioPage,state:function(){return JSON.parse(JSON.stringify(state))},create:createProject,applyTheme:applyTheme};

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
