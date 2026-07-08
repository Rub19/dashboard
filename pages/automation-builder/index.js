/* ETHONE Automation Builder — visual block workflow builder for existing automationRules. */
(function(){
  "use strict";
  if(window.__ethoneAutomationBuilder)return;
  window.__ethoneAutomationBuilder=true;

  var CATALOG={
    triggers:[
      {type:"trigger.note.created",label:"Nouvelle note",desc:"Quand une note est créée dans ETHONE.",icon:"note",defaults:{}},
      {type:"trigger.task.completed",label:"Tâche terminée",desc:"Quand une tâche passe en terminé.",icon:"check",defaults:{}},
      {type:"trigger.file.imported",label:"Fichier importé",desc:"Quand un fichier est ajouté.",icon:"file",defaults:{}},
      {type:"trigger.pomodoro.completed",label:"Pomodoro terminé",desc:"Quand une session focus se termine.",icon:"timer",defaults:{}},
      {type:"trigger.daily.time",label:"Heure précise",desc:"Chaque jour à une heure donnée.",icon:"clock",defaults:{time:"09:00"}},
      {type:"trigger.manual",label:"Déclenchement manuel",desc:"Lancé depuis le builder.",icon:"play",defaults:{}}
    ],
    actions:[
      {type:"action.ai.analyze",label:"Analyser avec ETHONE AI",desc:"Demander à Brain d'analyser le contexte.",icon:"brain",defaults:{prompt:"Analyse le contenu et propose la prochaine action."}},
      {type:"action.task.create",label:"Créer une tâche",desc:"Créer une tâche dans ETHONE.",icon:"task",defaults:{title:"Nouvelle tâche automatisée"}},
      {type:"action.reminder.schedule",label:"Programmer un rappel",desc:"Préparer un rappel visible dans ETHONE.",icon:"bell",defaults:{delay:"30 min"}},
      {type:"action.notification.send",label:"Envoyer une notification",desc:"Afficher une notification ETHONE.",icon:"notify",defaults:{message:"Automation exécutée"}},
      {type:"action.note.create",label:"Créer une note",desc:"Créer une note de synthèse.",icon:"note",defaults:{title:"Note automatisée"}},
      {type:"action.timeline.record",label:"Ajouter à la Timeline",desc:"Enregistrer l'événement dans la mémoire ETHONE.",icon:"timeline",defaults:{title:"Automation exécutée"}}
    ]
  };
  var selectedId=null;

  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function save(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function esc(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function rules(){
    var p=profile();if(!p)return [];
    p.state=p.state||{};
    if(!Array.isArray(p.state.automationRules))p.state.automationRules=[];
    p.state.automationRules.forEach(migrateRule);
    return p.state.automationRules;
  }
  function newId(prefix){return prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6)}
  function catalogItem(type){
    return CATALOG.triggers.concat(CATALOG.actions).find(function(item){return item.type===type;})||{type:type,label:type,desc:"Bloc personnalisé",icon:"dot",defaults:{}};
  }
  function makeBlock(type){
    var def=catalogItem(type);
    return {id:newId("block"),type:type,label:def.label,config:Object.assign({},def.defaults||{})};
  }
  function migrateRule(rule){
    if(!rule.id)rule.id=newId("rule");
    if(!rule.name)rule.name=rule.actionValue||"Automation";
    if(!Array.isArray(rule.blocks)){
      var trigger=rule.triggerType==="dailyTime"?makeBlock("trigger.daily.time"):rule.triggerType==="taskCount"?makeBlock("trigger.task.completed"):makeBlock("trigger.manual");
      if(rule.triggerType==="dailyTime")trigger.config.time=rule.triggerValue||"09:00";
      rule.blocks=[trigger,makeBlock("action.notification.send")];
      rule.blocks[1].config.message=rule.actionValue||"Automation exécutée";
    }
    rule.enabled=rule.enabled!==false;
    rule.updatedAt=rule.updatedAt||new Date().toISOString();
    return rule;
  }
  function createRule(template){
    var blockTypes=template||["trigger.note.created","action.ai.analyze","action.task.create","action.reminder.schedule","action.notification.send"];
    var rule={
      id:newId("rule"),
      name:"Nouvelle automation",
      enabled:true,
      blocks:blockTypes.map(makeBlock),
      lastFired:null,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    rules().push(rule);
    selectedId=rule.id;
    save();
    renderAutomationSettings();
    notify("Automation créée","success");
  }
  function selectedRule(){
    var list=rules();
    if(!selectedId&&list[0])selectedId=list[0].id;
    return list.find(function(rule){return rule.id===selectedId})||list[0]||null;
  }
  function icon(type){
    var map={note:"N",check:"✓",file:"F",timer:"T",clock:"H",play:"▶",brain:"AI",task:"✓",bell:"B",notify:"!",timeline:"TL",dot:"•"};
    return map[type]||"•";
  }
  function renderAutomationSettings(){
    var wrap=document.getElementById("automation-list");if(!wrap)return;
    var list=rules();
    if(!list.length){createRule(["trigger.note.created","action.ai.analyze","action.task.create","action.reminder.schedule","action.notification.send"]);return;}
    var active=selectedRule();
    wrap.innerHTML=
      '<section class="ab-shell">'+
        '<aside class="ab-sidebar">'+
          '<div class="ab-head"><div><span>Automation Builder</span><strong>'+list.length+' workflows</strong></div><button type="button" class="ab-primary" data-ab-new>+</button></div>'+
          '<div class="ab-list">'+list.map(ruleCard).join("")+'</div>'+
        '</aside>'+
        '<main class="ab-canvas">'+(active?canvasHTML(active):emptyHTML())+'</main>'+
        '<aside class="ab-library">'+libraryHTML()+'</aside>'+
      '</section>';
    bind(wrap);
  }
  function ruleCard(rule){
    var first=rule.blocks[0]?catalogItem(rule.blocks[0].type).label:"Manual";
    return '<button type="button" class="ab-rule '+(rule.id===selectedId?"active":"")+'" data-ab-select="'+rule.id+'">'+
      '<span class="ab-rule-dot '+(rule.enabled?"on":"")+'"></span><strong>'+esc(rule.name)+'</strong><em>'+esc(first)+' • '+rule.blocks.length+' blocs</em>'+
    '</button>';
  }
  function emptyHTML(){
    return '<div class="ab-empty"><strong>Aucune automation</strong><span>Crée un workflow visuel pour automatiser ETHONE.</span><button class="ab-primary" type="button" data-ab-new>Créer</button></div>';
  }
  function canvasHTML(rule){
    return '<div class="ab-canvas-top">'+
      '<div><input class="ab-title-input" data-ab-name value="'+esc(rule.name)+'"><p>Crée une suite logique de blocs : déclencheur, Brain, actions, rappel, notification.</p></div>'+
      '<div class="ab-actions"><label class="ab-switch"><input type="checkbox" data-ab-enabled '+(rule.enabled?"checked":"")+'>Actif</label><button type="button" class="ab-btn" data-ab-run>Tester</button><button type="button" class="ab-btn danger" data-ab-delete>Supprimer</button></div>'+
    '</div>'+
    '<div class="ab-flow" data-ab-flow="'+rule.id+'">'+rule.blocks.map(blockHTML).join("")+'</div>'+
    '<div class="ab-drop-hint">Glisse un bloc depuis la bibliothèque, puis réordonne la séquence par drag & drop.</div>';
  }
  function blockHTML(block,index){
    var def=catalogItem(block.type);
    var isTrigger=block.type.indexOf("trigger.")===0;
    return '<article class="ab-block '+(isTrigger?"trigger":"action")+'" draggable="true" data-ab-block="'+block.id+'">'+
      '<div class="ab-block-icon">'+icon(def.icon)+'</div><div class="ab-block-main"><strong>'+esc(def.label)+'</strong><span>'+esc(def.desc)+'</span>'+blockConfigHTML(block)+'</div>'+
      '<div class="ab-block-tools"><button type="button" data-ab-duplicate="'+block.id+'">Dupliquer</button>'+(index?'<button type="button" data-ab-remove="'+block.id+'">Retirer</button>':"")+'</div>'+
    '</article>';
  }
  function blockConfigHTML(block){
    var c=block.config||{};
    if(block.type==="trigger.daily.time")return '<label class="ab-config">Heure <input type="time" data-ab-config="'+block.id+'" data-key="time" value="'+esc(c.time||"09:00")+'"></label>';
    if(block.type==="action.ai.analyze")return '<label class="ab-config">Prompt <input data-ab-config="'+block.id+'" data-key="prompt" value="'+esc(c.prompt||"")+'"></label>';
    if(block.type==="action.task.create")return '<label class="ab-config">Titre <input data-ab-config="'+block.id+'" data-key="title" value="'+esc(c.title||"")+'"></label>';
    if(block.type==="action.reminder.schedule")return '<label class="ab-config">Délai <input data-ab-config="'+block.id+'" data-key="delay" value="'+esc(c.delay||"30 min")+'"></label>';
    if(block.type==="action.notification.send")return '<label class="ab-config">Message <input data-ab-config="'+block.id+'" data-key="message" value="'+esc(c.message||"")+'"></label>';
    if(block.type==="action.note.create")return '<label class="ab-config">Titre <input data-ab-config="'+block.id+'" data-key="title" value="'+esc(c.title||"")+'"></label>';
    if(block.type==="action.timeline.record")return '<label class="ab-config">Titre <input data-ab-config="'+block.id+'" data-key="title" value="'+esc(c.title||"")+'"></label>';
    return "";
  }
  function libraryHTML(){
    return '<div class="ab-lib-title">Blocs</div><div class="ab-lib-section"><strong>Quand</strong>'+CATALOG.triggers.map(libBlock).join("")+'</div><div class="ab-lib-section"><strong>Actions</strong>'+CATALOG.actions.map(libBlock).join("")+'</div>';
  }
  function libBlock(item){
    return '<button type="button" class="ab-lib-block" draggable="true" data-ab-add-type="'+item.type+'"><i>'+icon(item.icon)+'</i><span>'+esc(item.label)+'</span><em>'+esc(item.desc)+'</em></button>';
  }
  function bind(root){
    root.querySelectorAll("[data-ab-select]").forEach(function(btn){btn.addEventListener("click",function(){selectedId=btn.dataset.abSelect;renderAutomationSettings();});});
    root.querySelectorAll("[data-ab-new]").forEach(function(btn){btn.addEventListener("click",function(){createRule();});});
    root.querySelector("[data-ab-name]")?.addEventListener("input",function(e){var r=selectedRule();if(r){r.name=e.target.value||"Automation";touch(r);}});
    root.querySelector("[data-ab-enabled]")?.addEventListener("change",function(e){var r=selectedRule();if(r){r.enabled=e.target.checked;touch(r);renderAutomationSettings();}});
    root.querySelector("[data-ab-delete]")?.addEventListener("click",function(){deleteRule();});
    root.querySelector("[data-ab-run]")?.addEventListener("click",function(){runRule(selectedRule(),true);});
    root.querySelectorAll("[data-ab-remove]").forEach(function(btn){btn.addEventListener("click",function(){removeBlock(btn.dataset.abRemove);});});
    root.querySelectorAll("[data-ab-duplicate]").forEach(function(btn){btn.addEventListener("click",function(){duplicateBlock(btn.dataset.abDuplicate);});});
    root.querySelectorAll("[data-ab-config]").forEach(function(input){input.addEventListener("input",function(){updateBlockConfig(input.dataset.abConfig,input.dataset.key,input.value);});});
    root.querySelectorAll("[data-ab-add-type]").forEach(function(el){
      el.addEventListener("click",function(){addBlock(el.dataset.abAddType);});
      el.addEventListener("dragstart",function(e){e.dataTransfer.setData("text/ethone-block",el.dataset.abAddType);});
    });
    root.querySelectorAll("[data-ab-block]").forEach(function(block){
      block.addEventListener("dragstart",function(e){e.dataTransfer.setData("text/ethone-existing-block",block.dataset.abBlock);block.classList.add("dragging");});
      block.addEventListener("dragend",function(){block.classList.remove("dragging");});
      block.addEventListener("dragover",function(e){e.preventDefault();block.classList.add("over");});
      block.addEventListener("dragleave",function(){block.classList.remove("over");});
      block.addEventListener("drop",function(e){e.preventDefault();block.classList.remove("over");handleDrop(block.dataset.abBlock,e);});
    });
    var flow=root.querySelector("[data-ab-flow]");
    if(flow){
      flow.addEventListener("dragover",function(e){e.preventDefault();flow.classList.add("receiving");});
      flow.addEventListener("dragleave",function(e){if(!flow.contains(e.relatedTarget))flow.classList.remove("receiving");});
      flow.addEventListener("drop",function(e){e.preventDefault();flow.classList.remove("receiving");handleDrop(null,e);});
    }
  }
  function touch(rule){rule.updatedAt=new Date().toISOString();save();}
  function addBlock(type){
    var r=selectedRule();if(!r)return;
    if(type.indexOf("trigger.")===0&&r.blocks.some(function(b){return b.type.indexOf("trigger.")===0;})){
      r.blocks[0]=makeBlock(type);
    }else r.blocks.push(makeBlock(type));
    touch(r);renderAutomationSettings();
  }
  function removeBlock(id){var r=selectedRule();if(!r)return;r.blocks=r.blocks.filter(function(b,i){return i===0||b.id!==id;});touch(r);renderAutomationSettings();}
  function duplicateBlock(id){var r=selectedRule();if(!r)return;var idx=r.blocks.findIndex(function(b){return b.id===id;});if(idx<0)return;var copy=JSON.parse(JSON.stringify(r.blocks[idx]));copy.id=newId("block");r.blocks.splice(idx+1,0,copy);touch(r);renderAutomationSettings();}
  function updateBlockConfig(id,key,value){var r=selectedRule();if(!r)return;var b=r.blocks.find(function(x){return x.id===id});if(!b)return;b.config=b.config||{};b.config[key]=value;touch(r);}
  function handleDrop(targetId,e){
    var newType=e.dataTransfer.getData("text/ethone-block");
    var existing=e.dataTransfer.getData("text/ethone-existing-block");
    var r=selectedRule();if(!r)return;
    var targetIndex=targetId?r.blocks.findIndex(function(b){return b.id===targetId;}):r.blocks.length;
    if(targetIndex<0)targetIndex=r.blocks.length;
    if(newType){
      var block=makeBlock(newType);
      if(newType.indexOf("trigger.")===0){r.blocks[0]=block;}
      else r.blocks.splice(Math.max(1,targetIndex),0,block);
    }else if(existing){
      var from=r.blocks.findIndex(function(b){return b.id===existing;});
      if(from<0||from===targetIndex)return;
      var moved=r.blocks.splice(from,1)[0];
      if(moved.type.indexOf("trigger.")===0)r.blocks.unshift(moved);
      else r.blocks.splice(Math.max(1,targetIndex),0,moved);
    }
    touch(r);renderAutomationSettings();
  }
  function deleteRule(){
    var p=profile();if(!p||!selectedId)return;
    p.state.automationRules=rules().filter(function(r){return r.id!==selectedId;});
    selectedId=(p.state.automationRules[0]&&p.state.automationRules[0].id)||null;
    save();renderAutomationSettings();notify("Automation supprimée","info");
  }
  function runRule(rule,manual){
    if(!rule)return;
    migrateRule(rule);
    rule.lastFired=Date.now();
    touch(rule);
    rule.blocks.filter(function(b){return b.type.indexOf("action.")===0;}).forEach(function(block){
      if(block.type==="action.notification.send")notify(block.config.message||"Automation exécutée","info");
      if(block.type==="action.timeline.record")recordTimeline(block.config.title||rule.name,"Automation Builder");
      if(block.type==="action.task.create")createTask(block.config.title||"Tâche automatisée");
      if(block.type==="action.note.create")createNote(block.config.title||"Note automatisée");
      if(block.type==="action.ai.analyze"&&manual)notify("ETHONE AI a préparé l'analyse du workflow.","success");
    });
    if(manual)notify("Workflow testé avec succès","success");
  }
  function createTask(title){
    var p=profile();if(!p)return;p.state.todos=p.state.todos||[];
    p.state.todos.push({id:Date.now(),text:title,done:false,createdAt:new Date().toISOString(),tag:"Automation"});
    save();
  }
  function createNote(title){
    var p=profile();if(!p)return;p.state.notes=p.state.notes||[];
    p.state.notes.push({id:Date.now(),title:title,content:"Créée par Automation Builder.",createdAt:new Date().toISOString()});
    save();
  }
  function recordTimeline(title,body){
    if(window.ETHONETimeline&&typeof window.ETHONETimeline.record==="function")window.ETHONETimeline.record({title:title,body:body,category:"system",source:"Automation"});
  }
  function notify(message,type){
    if(window.ETHONENotifications&&typeof window.ETHONENotifications.notify==="function")window.ETHONENotifications.notify({title:"Automation",message:message,category:type||"info",source:"Automation Builder"});
    else if(typeof window.toast==="function")window.toast(message,type||"info");
  }
  function evaluate(){
    var now=new Date();
    var hhmm=(now.getHours()<10?"0":"")+now.getHours()+":"+(now.getMinutes()<10?"0":"")+now.getMinutes();
    rules().forEach(function(rule){
      if(!rule.enabled||!rule.blocks.length)return;
      var trigger=rule.blocks[0];
      if(trigger.type==="trigger.daily.time"&&(trigger.config||{}).time===hhmm){
        var today=now.toISOString().slice(0,10);
        if(rule.lastFired!==today){rule.lastFired=today;runRule(rule,false);}
      }
    });
  }
  window.renderAutomationSettings=renderAutomationSettings;
  window.automationCreate=function(){createRule();};
  window.automationToggle=function(id,val){var r=rules().find(function(x){return x.id===id});if(r){r.enabled=val;touch(r);renderAutomationSettings();}};
  window.automationDelete=function(id){selectedId=id;deleteRule();};
  window.ETHONEAutomationBuilder={render:renderAutomationSettings,create:createRule,run:function(id){runRule(rules().find(function(r){return r.id===id})||selectedRule(),true)},rules:rules,catalog:function(){return CATALOG;}};
  if(window.__ethoneAutomationTimer){clearInterval(window.__ethoneAutomationTimer);window.__ethoneAutomationTimer=null;}
  if(window.__ethoneAutomationBuilderTimer)clearInterval(window.__ethoneAutomationBuilderTimer);
  window.__ethoneAutomationBuilderTimer=setInterval(evaluate,60000);
})();
