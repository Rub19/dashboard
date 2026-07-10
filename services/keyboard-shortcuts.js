/* ETHONE Keyboard Shortcuts.
 * Central, configurable keyboard layer for the whole Personal OS.
 */
(function(){
  "use strict";
  if(window.__ethoneKeyboardShortcuts)return;
  window.__ethoneKeyboardShortcuts=true;

  var STORAGE_KEY="ethone:keyboard-shortcuts";
  var recordingId="";
  var resetConfirmAt=0;
  var EXTERNAL=[];
  var DEFAULTS=[
    def("command.palette","Navigation","Open command palette","Ctrl+K",true,function(){toggleCommandPalette()}),
    def("command.spotlight","Navigation","Open Spotlight Search","Ctrl+Space",true,function(){toggleSpotlightSearch()}),
    def("command.quickOpen","Navigation","Quick open page / file","Ctrl+P",true,function(){openCommandPaletteWith("")}),
    def("command.actions","Navigation","Open action palette","Ctrl+Shift+P",true,function(){openCommandPaletteWith("> ")}),
    def("ai.open","AI","Open contextual AI","Ctrl+Shift+A",true,function(){openAI()}),
    def("shortcuts.open","System","Open Keyboard Shortcuts","Ctrl+/",true,function(){openKeyboardPage()}),
    def("focus.main","System","Focus current page","Alt+M",true,function(){focusKeyboardTarget("main")}),
    def("focus.sidebar","System","Focus sidebar","Alt+0",true,function(){focusKeyboardTarget("sidebar")}),
    def("widgets.open","System","Open widgets panel","Ctrl+Alt+B",true,function(){runKeyboardAction("widgets.open")}),
    def("mission.open","System","Open Mission Control","F2",true,function(){openMissionControlShortcut()}),
    def("desktop.toggle","Desktop","Toggle Desktop Mode","Ctrl+Alt+D",true,function(){desktop("toggle")}),
    def("desktop.window","Desktop","Open current page in a window","Ctrl+Alt+W",true,function(){desktop("openCurrent")}),
    def("desktop.split","Desktop","Arrange windows in Split View","Ctrl+Alt+S",true,function(){desktop("split")}),
    def("desktop.close","Desktop","Close active desktop window","Ctrl+Alt+Q",true,function(){desktop("closeActive")}),
    def("create.note","Create","New note","Ctrl+N",false,function(){go("notes");setTimeout(function(){if(typeof window.newNote==="function")window.newNote()},120)}),
    def("create.task","Create","New task","Ctrl+Alt+N",false,function(){go("todos");setTimeout(function(){openModalSafe("add-todo")},120)}),
    def("create.file","Create","Add file / link","Ctrl+Alt+F",false,function(){go("files");setTimeout(function(){openModalSafe("add-item")},120)}),
    def("create.event","Create","New calendar event","Ctrl+Alt+E",false,function(){go("calendar");setTimeout(function(){openModalSafe("add-event")},120)}),
    def("nav.dashboard","Pages","Go to Home","Alt+1",false,function(){go("dashboard")}),
    def("nav.notes","Pages","Go to Notes","Alt+2",false,function(){go("notes")}),
    def("nav.tasks","Pages","Go to Tasks","Alt+3",false,function(){go("todos")}),
    def("nav.files","Pages","Go to Files","Alt+4",false,function(){go("files")}),
    def("nav.calendar","Pages","Go to Calendar","Alt+5",false,function(){go("calendar")}),
    def("nav.analytics","Pages","Go to Analytics","Alt+6",false,function(){go("stats")}),
    def("nav.ai","Pages","Go to ETHONE AI","Alt+7",false,function(){go("ai")}),
    def("nav.marketplace","Pages","Go to Marketplace","Alt+8",false,function(){go("marketplace")}),
    def("nav.settings","Pages","Go to Settings","Alt+9",false,function(){go("settings")}),
    def("system.notifications","System","Open notification center","Ctrl+Shift+N",true,function(){openNotifications()}),
    def("system.escape","System","Close overlays","Escape",true,function(){closeFloatingUI()})
  ];

  function def(id,group,label,shortcut,allowInInputs,handler){
    return {id:id,group:group,label:label,shortcut:shortcut,defaultShortcut:shortcut,allowInInputs:!!allowInInputs,handler:handler};
  }
  function saved(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}catch(e){return {}}
  }
  function save(map){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(map||{}))}catch(e){}
    try{
      var p=typeof window.curP==="function"?window.curP():null;
      if(p&&p.state){p.state.keyboardShortcuts=map||{};if(typeof window.saveStateNow==="function")window.saveStateNow()}
    }catch(e){}
  }
  function customMap(){
    var local=saved();
    try{
      var p=typeof window.curP==="function"?window.curP():null;
      if(p&&p.state&&p.state.keyboardShortcuts&&typeof p.state.keyboardShortcuts==="object"){
        return Object.assign({},local,p.state.keyboardShortcuts);
      }
    }catch(e){}
    return local;
  }
  function shortcuts(){
    var custom=customMap();
    return DEFAULTS.concat(EXTERNAL).map(function(item){
      return Object.assign({},item,{shortcut:custom[item.id]===null?"":(custom[item.id]||item.defaultShortcut)});
    });
  }
  function byId(id){return shortcuts().find(function(item){return item.id===id})}
  function isEnabled(){return true}
  function isEditableTarget(target){
    if(!target)return false;
    var tag=target.tagName;
    return tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||target.isContentEditable;
  }
  function isAppReadyForShortcuts(){
    var main=document.getElementById("main-content");
    if(!main)return false;
    var mainStyle=getComputedStyle(main);
    if(mainStyle.display==="none"||mainStyle.visibility==="hidden")return false;
    var blocking=["auth-screen","profile-screen","password-screen"];
    for(var i=0;i<blocking.length;i++){
      var el=document.getElementById(blocking[i]);
      if(el&&getComputedStyle(el).display!=="none"&&getComputedStyle(el).visibility!=="hidden")return false;
    }
    return true;
  }
  function keyName(event){
    if(event.code&&/^Digit[0-9]$/.test(event.code))return event.code.replace("Digit","");
    if(event.code&&/^Numpad[0-9]$/.test(event.code))return event.code.replace("Numpad","");
    var key=event.key;
    if(key===" ")return "Space";
    if(key==="Esc")return "Escape";
    if(key==="Control"||key==="Meta"||key==="Alt"||key==="Shift")return "";
    if(key==="ArrowUp")return "Up";
    if(key==="ArrowDown")return "Down";
    if(key==="ArrowLeft")return "Left";
    if(key==="ArrowRight")return "Right";
    if(key&&key.length===1)return key.toUpperCase();
    return key||"";
  }
  function eventToCombo(event){
    var key=keyName(event);
    if(!key)return "";
    var parts=[];
    if(event.ctrlKey||event.metaKey)parts.push("Ctrl");
    if(event.altKey)parts.push("Alt");
    if(event.shiftKey)parts.push("Shift");
    parts.push(key);
    return parts.join("+");
  }
  function normalizeCombo(combo){
    combo=String(combo||"").replace(/\s+/g,"").replace(/Cmd|Command|Meta/gi,"Ctrl").replace(/Control/gi,"Ctrl").replace(/Option/gi,"Alt");
    if(!combo)return "";
    var parts=combo.split("+").filter(Boolean);
    var key=parts.pop()||"";
    var mods=[];
    ["Ctrl","Alt","Shift"].forEach(function(mod){
      if(parts.some(function(p){return p.toLowerCase()===mod.toLowerCase()}))mods.push(mod);
    });
    key=key.length===1?key.toUpperCase():key.charAt(0).toUpperCase()+key.slice(1);
    if(key==="/")key="/";
    return mods.concat([key]).join("+");
  }
  function conflictFor(id,combo){
    combo=normalizeCombo(combo);
    if(!combo)return "";
    var found=shortcuts().find(function(item){return item.id!==id&&normalizeCombo(item.shortcut)===combo});
    return found?found.id:"";
  }
  function setShortcut(id,combo){
    var item=byId(id);
    if(!item)return false;
    combo=normalizeCombo(combo);
    var conflict=conflictFor(id,combo);
    if(conflict){
      notify("Shortcut already used by "+byId(conflict).label,"error");
      return false;
    }
    var map=customMap();
    map[id]=combo||null;
    save(map);
    renderKeyboardSettings();
    notify("Shortcut updated","success");
    return true;
  }
  function resetShortcut(id){
    var map=customMap();
    delete map[id];
    save(map);
    renderKeyboardSettings();
    notify("Shortcut reset","info");
  }
  function disableShortcut(id){
    var map=customMap();
    map[id]=null;
    save(map);
    renderKeyboardSettings();
    notify("Shortcut disabled","info");
  }
  function resetAll(){
    if(Date.now()-resetConfirmAt>5000){
      resetConfirmAt=Date.now();
      notify("Click Reset all again to restore default shortcuts.","warning");
      return;
    }
    resetConfirmAt=0;
    save({});
    renderKeyboardSettings();
    notify("Keyboard shortcuts reset","success");
  }
  function registerShortcut(definition){
    if(!definition||!definition.id||typeof definition.handler!=="function")return false;
    var item=def(
      String(definition.id),
      definition.group||"Plugins",
      definition.label||definition.id,
      definition.shortcut||"",
      definition.allowInInputs===true,
      definition.handler
    );
    item.pluginId=definition.pluginId||"";
    item.description=definition.description||"";
    var idx=EXTERNAL.findIndex(function(entry){return entry.id===item.id});
    if(idx>-1)EXTERNAL[idx]=item;
    else EXTERNAL.push(item);
    renderKeyboardSettings();
    return true;
  }
  function execute(item,event){
    if(!item||typeof item.handler!=="function")return false;
    if(event){event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();}
    try{item.handler();return true}catch(e){console.error("[ETHONE keyboard]",item.id,e);notify("Shortcut failed: "+item.label,"error");return false}
  }
  function handleKeydown(event){
    if(recordingId){
      event.preventDefault();
      event.stopImmediatePropagation();
      var combo=eventToCombo(event);
      if(combo==="Escape"){recordingId="";renderKeyboardSettings();return;}
      if(combo)setShortcut(recordingId,combo);
      recordingId="";
      renderKeyboardSettings();
      return;
    }
    var combo=normalizeCombo(eventToCombo(event));
    if(!combo)return;
    var item=shortcuts().find(function(entry){return normalizeCombo(entry.shortcut)===combo});
    if(!item)return;
    if(!isAppReadyForShortcuts()&&item.id!=="system.escape")return;
    if(isEditableTarget(event.target)&&!item.allowInInputs)return;
    execute(item,event);
  }

  function toggleCommandPalette(){
    var overlay=document.getElementById("cmd-palette-overlay");
    if(overlay&&overlay.classList.contains("open")){
      if(typeof window.closeCmdPalette==="function")window.closeCmdPalette();
    }else openCommandPaletteWith("");
  }
  function toggleSpotlightSearch(){
    var overlay=document.getElementById("cmd-palette-overlay");
    if(overlay&&overlay.classList.contains("open")&&overlay.dataset.mode==="spotlight"){
      if(typeof window.closeCmdPalette==="function")window.closeCmdPalette();
    }else if(typeof window.openSpotlightSearch==="function"){
      window.openSpotlightSearch("");
    }else openCommandPaletteWith("");
  }
  function openCommandPaletteWith(prefix){
    if(typeof window.openCmdPalette==="function")window.openCmdPalette({query:prefix||"",mode:"command"});
    setTimeout(function(){
      var input=document.getElementById("cmd-input");
      if(input){
        if(input.value!==(prefix||""))input.value=prefix||"";
        if(typeof window.onCmdInput==="function")window.onCmdInput();
        input.focus();
      }
    },40);
  }
  function runKeyboardAction(id,context){
    try{
      var actions=window.Ethone&&window.Ethone.get&&window.Ethone.get("actions");
      if(actions&&typeof actions.dispatch==="function")return actions.dispatch(id,Object.assign({source:"keyboard-shortcuts"},context||{}));
      if(typeof window.runAction==="function")return window.runAction(id,Object.assign({source:"keyboard-shortcuts"},context||{}));
    }catch(e){}
    return false;
  }
  function focusKeyboardTarget(target){
    if(window.ETHONEKeyboardFirst){
      if(target==="main"&&typeof window.ETHONEKeyboardFirst.focusMain==="function")return window.ETHONEKeyboardFirst.focusMain();
      if(target==="sidebar"&&typeof window.ETHONEKeyboardFirst.focusSidebar==="function")return window.ETHONEKeyboardFirst.focusSidebar();
    }
    var el=target==="sidebar"?(document.getElementById("main-sidebar")||document.querySelector(".sidebar")):(document.getElementById("main-content")||document.querySelector(".main-content"));
    if(!el)return false;
    if(!el.hasAttribute("tabindex"))el.setAttribute("tabindex",target==="main"?"-1":"0");
    try{el.focus({preventScroll:false})}catch(e){try{el.focus()}catch(err){}}
    return document.activeElement===el;
  }
  function openMissionControlShortcut(){
    if(typeof window.openMissionControl==="function")return window.openMissionControl();
    if(runKeyboardAction("mission.open"))return true;
    if(runKeyboardAction("desktop.missionControl"))return true;
    openCommandPaletteWith("mission");
    return true;
  }
  function go(page){
    if(runKeyboardAction(page+".open"))return;
    if(typeof window.switchPage==="function")window.switchPage(page,null);
  }
  function openModalSafe(id){if(typeof window.openModal==="function")window.openModal(id)}
  function openAI(){
    if(window.ETHONEAIEverywhere&&typeof window.ETHONEAIEverywhere.openCopilot==="function"){
      window.ETHONEAIEverywhere.openCopilot(window.ETHONEAIEverywhere.contextFromElement(document.activeElement));
    }else go("ai");
  }
  function openKeyboardPage(){
    go("settings");
    setTimeout(function(){
      var btn=Array.from(document.querySelectorAll(".settings-nav-item")).find(function(el){return /keyboard|clavier/i.test(el.textContent||"")});
      if(typeof window.switchSettingsTab==="function")window.switchSettingsTab("keyboard",btn||document.querySelector(".settings-nav-item"));
      renderKeyboardSettings();
      var first=document.querySelector("#keyboard-list button");
      if(first)first.focus();
    },120);
  }
  function openNotifications(){
    var btn=document.getElementById("notif-bell-btn")||document.querySelector("[data-notif-toggle]");
    if(btn)btn.click();
    else if(window.ETHONENotifications&&typeof window.ETHONENotifications.open==="function")window.ETHONENotifications.open();
  }
  function closeFloatingUI(){
    if(window.ETHONEAccessibility&&typeof window.ETHONEAccessibility.closeTopLayer==="function"){
      try{if(window.ETHONEAccessibility.closeTopLayer())return true}catch(e){}
    }
    if(typeof window.ethoneForceCloseTransientUI==="function"){
      try{window.ethoneForceCloseTransientUI()}catch(e){}
    }
    if(window.ETHONESpacesUI&&typeof window.ETHONESpacesUI.close==="function"){
      try{window.ETHONESpacesUI.close()}catch(e){}
    }
    if(window.ETHONESidebarFinal&&typeof window.ETHONESidebarFinal.closeProfileMenu==="function"){
      try{window.ETHONESidebarFinal.closeProfileMenu()}catch(e){}
    }
    if(typeof window.closeCmdPalette==="function")window.closeCmdPalette();
    document.querySelectorAll(".modal-overlay.open,.dropdown.open,.lang-menu.open,.aie-copilot.open,.aie-context-menu.open,#ethone-version-popup-root.is-open,#ethone-whats-new-root.is-open").forEach(function(el){el.classList.remove("open","active","visible","is-open")});
    document.body.classList.remove("ethone-version-popup-active","ethone-whats-new-active","ethone-modal-open","ethone-command-open","ethone-mission-control-open","ethone-presentation-open");
    return true;
  }
  function desktop(action){
    if(window.ETHONEWindowManager){
      var wm=window.ETHONEWindowManager;
      if(action==="toggle"&&typeof wm.toggle==="function"){wm.toggle();return;}
      if(action==="openCurrent"&&typeof wm.openCurrent==="function"){wm.openCurrent();return;}
      if(action==="split"&&typeof wm.split==="function"){wm.split();return;}
      if(action==="closeActive"&&typeof wm.closeActive==="function"){wm.closeActive();return;}
    }
    if(!window.ETHONEDesktop){
      notify("Desktop Mode indisponible","warning");
      return;
    }
    var api=window.ETHONEDesktop;
    if(action==="toggle"&&typeof api.toggle==="function")api.toggle();
    else if(action==="openCurrent"&&typeof api.openCurrent==="function")api.openCurrent();
    else if(action==="split"&&typeof api.split==="function")api.split();
    else if(action==="closeActive"&&typeof api.closeActive==="function")api.closeActive();
  }
  function notify(message,type){
    if(typeof window.toast==="function")window.toast(message,type||"info");
  }

  function grouped(){
    return shortcuts().reduce(function(acc,item){
      (acc[item.group]=acc[item.group]||[]).push(item);
      return acc;
    },{});
  }
  function esc(value){
    if(typeof window.escapeHTML==="function")return window.escapeHTML(value);
    return String(value==null?"":value).replace(/[&<>"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]});
  }
  function renderKeyboardSettings(){
    var wrap=document.getElementById("keyboard-list");
    if(!wrap)return;
    var groups=grouped();
    wrap.innerHTML=
      '<div class="kb-page-head">'+
        '<div><div class="kb-kicker">Keyboard Shortcuts</div><h3>Use ETHONE without touching the mouse.</h3><p>Every shortcut is editable and stored locally with your profile preferences.</p></div>'+
        '<div class="kb-actions"><button class="btn btn-ghost" type="button" onclick="ETHONEKeyboardShortcuts.resetAll()">Reset all</button></div>'+
      '</div>'+
      Object.keys(groups).map(function(group){
        return '<section class="kb-group"><div class="kb-group-title">'+esc(group)+'</div>'+
          groups[group].map(rowHTML).join("")+
        '</section>';
      }).join("");
  }
  function rowHTML(item){
    var waiting=recordingId===item.id;
    var shortcut=item.shortcut||"Disabled";
    var conflict=conflictFor(item.id,item.shortcut);
    return '<div class="kb-row '+(waiting?"is-recording":"")+' '+(conflict?"has-conflict":"")+'">'+
      '<div class="kb-row-main"><strong>'+esc(item.label)+'</strong><span>'+esc(item.id)+'</span></div>'+
      '<button class="kb-capture" type="button" data-kb-record="'+esc(item.id)+'">'+(waiting?"Press keys...":'<kbd>'+esc(shortcut)+'</kbd>')+'</button>'+
      '<button class="kb-icon" type="button" title="Disable" data-kb-disable="'+esc(item.id)+'">Disable</button>'+
      '<button class="kb-icon" type="button" title="Reset" data-kb-reset="'+esc(item.id)+'">Reset</button>'+
    '</div>';
  }
  function handleClick(event){
    var rec=event.target.closest("[data-kb-record]");
    if(rec){recordingId=rec.dataset.kbRecord;renderKeyboardSettings();return;}
    var reset=event.target.closest("[data-kb-reset]");
    if(reset){resetShortcut(reset.dataset.kbReset);return;}
    var disable=event.target.closest("[data-kb-disable]");
    if(disable){disableShortcut(disable.dataset.kbDisable);return;}
  }
  function start(){
    document.addEventListener("keydown",handleKeydown,true);
    document.addEventListener("click",handleClick);
    window.addEventListener("ethone:page-ready",function(event){
      if(event.detail&&event.detail.page==="settings")setTimeout(renderKeyboardSettings,80);
    });
  }

  window.renderKeyboardSettings=renderKeyboardSettings;
  window.ETHONEKeyboardShortcuts={
    isEnabled:isEnabled,
    list:shortcuts,
    set:setShortcut,
    reset:resetShortcut,
    disable:disableShortcut,
    resetAll:resetAll,
    register:registerShortcut,
    eventToCombo:eventToCombo,
    normalize:normalizeCombo,
    render:renderKeyboardSettings,
    open:openKeyboardPage
  };
  start();
})();
