/* ETHONE runtime compatibility bridge.
   Lightweight boot-safe wrappers for handlers that live in lazy modules. */
(function(){
  "use strict";
  if(window.__ethoneRuntimeCompatReady)return;
  window.__ethoneRuntimeCompatReady=true;

  function notify(message,type){
    try{
      if(typeof window.toast==="function")window.toast(message,type||"info");
    }catch(error){}
  }

  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(error){return null}
  }

  function save(){
    try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(error){}
  }

  function lazy(groups){
    groups=Array.isArray(groups)?groups:[groups];
    try{
      if(window.ETHONELazyModules&&typeof window.ETHONELazyModules.loadGroups==="function"){
        return window.ETHONELazyModules.loadGroups(groups);
      }
    }catch(error){}
    return Promise.resolve();
  }

  function invokeLazy(name,groups,args,fallback){
    var wrapper=window[name];
    return lazy(groups).then(function(){
      var fn=window[name];
      if(typeof fn==="function"&&fn!==wrapper)return fn.apply(window,args||[]);
      if(typeof fallback==="function")return fallback.apply(window,args||[]);
      notify("Module en cours de chargement. Reessaie dans un instant.","info");
      return false;
    }).catch(function(error){
      console.warn("[ETHONE compat] "+name+" failed",error);
      if(typeof fallback==="function")return fallback.apply(window,args||[]);
      notify("Cette action n'a pas pu etre chargee.","warning");
      return false;
    });
  }

  function defineLazy(name,groups,fallback){
    if(typeof window[name]==="function")return;
    window[name]=function(){
      return invokeLazy(name,groups,Array.prototype.slice.call(arguments),fallback);
    };
  }

  function fallbackOpenNotif(){
    var panel=document.getElementById("notif-panel");
    var overlay=document.getElementById("notif-overlay");
    if(overlay)overlay.classList.add("open");
    if(panel){
      panel.classList.add("open");
      panel.removeAttribute("aria-hidden");
      panel.style.visibility="visible";
    }
    return true;
  }

  function fallbackCloseNotif(){
    var panel=document.getElementById("notif-panel");
    var overlay=document.getElementById("notif-overlay");
    if(overlay){
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden","true");
    }
    if(panel){
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden","true");
    }
    return true;
  }

  function fallbackToggleNotif(){
    var panel=document.getElementById("notif-panel");
    if(panel&&panel.classList.contains("open"))return fallbackCloseNotif();
    return fallbackOpenNotif();
  }

  function fallbackClearNotif(){
    var body=document.getElementById("notif-panel-body");
    if(body){
      body.innerHTML='<div class="notif-empty"><div class="notif-empty-icon">🔔</div><div class="notif-empty-text">No notifications</div></div>';
    }
    var badge=document.getElementById("notif-badge");
    if(badge)badge.textContent="";
    notify("Notifications nettoyees.","success");
    return true;
  }

  defineLazy("toggleNotifPanel",["notifications"],fallbackToggleNotif);
  defineLazy("openNotifPanel",["notifications"],fallbackOpenNotif);
  defineLazy("closeNotifPanel",["notifications"],fallbackCloseNotif);
  defineLazy("clearAllNotifs",["notifications"],fallbackClearNotif);
  defineLazy("openPresentationMode",["presentation"],function(){
    var overlay=document.getElementById("presentation-overlay");
    if(overlay)overlay.classList.add("active");
    notify("Mode presentation ouvert.","info");
    return true;
  });
  defineLazy("closePresentationMode",["presentation"],function(){
    var overlay=document.getElementById("presentation-overlay");
    if(overlay)overlay.classList.remove("active");
    return true;
  });
  defineLazy("backupNow",["settings-advanced"],function(){
    notify("Backup Manager en cours de chargement.","info");
    return false;
  });
  defineLazy("backupDownload",["settings-advanced"],function(){
    notify("Export backup en cours de chargement.","info");
    return false;
  });
  defineLazy("automationCreate",["automation"],function(){
    notify("Automation Builder en cours de chargement.","info");
    return false;
  });
  defineLazy("switchCategory",["files"],function(category,button){
    try{
      if(button&&button.parentElement){
        Array.prototype.forEach.call(button.parentElement.querySelectorAll(".active"),function(el){el.classList.remove("active")});
        button.classList.add("active");
      }
    }catch(error){}
    notify("Explorateur de fichiers en cours de chargement.","info");
    return false;
  });
  defineLazy("addItem",["files"],function(){
    notify("Explorateur de fichiers en cours de chargement.","info");
    return false;
  });
  defineLazy("addGoal",["goals"],function(){
    notify("Objectifs en cours de chargement.","info");
    return false;
  });
  defineLazy("selectMood",["journal"],function(){
    notify("Journal en cours de chargement.","info");
    return false;
  });
  defineLazy("addJournalEntry",["journal"],function(){
    notify("Journal en cours de chargement.","info");
    return false;
  });
  defineLazy("addCountdown",["countdown"],function(){
    notify("Compte a rebours en cours de chargement.","info");
    return false;
  });
  defineLazy("clearActivity",["activity"],function(){
    notify("Activity Center en cours de chargement.","info");
    return false;
  });
  [
    "toggleNotePreview",
    "newNote",
    "pinNote",
    "deleteCurrentNote",
    "noteFormat",
    "noteInsert",
    "copyNote",
    "saveNote"
  ].forEach(function(name){
    defineLazy(name,["notes"],function(){
      notify("Notes en cours de chargement.","info");
      return false;
    });
  });
  [
    "setTodoFilter",
    "clearDone",
    "selectTodoColor",
    "addTodo",
    "toggleTodo",
    "deleteTodo"
  ].forEach(function(name){
    defineLazy(name,["tasks"],function(){
      notify("Taches en cours de chargement.","info");
      return false;
    });
  });
  defineLazy("addHabit",["habits"],function(){
    notify("Habitudes en cours de chargement.","info");
    return false;
  });
  [
    "quickAddKanban",
    "addKanbanCard",
    "renderKanban"
  ].forEach(function(name){
    defineLazy(name,["kanban"],function(){
      notify("Kanban en cours de chargement.","info");
      return false;
    });
  });
  [
    "calNav",
    "clearPastEvents",
    "pickEventColor",
    "addCalEvent",
    "renderCalendar"
  ].forEach(function(name){
    defineLazy(name,["calendar"],function(){
      notify("Calendrier en cours de chargement.","info");
      return false;
    });
  });
  [
    "toggleAISessions",
    "saveCurrentAIChat",
    "showAICapabilities",
    "clearAIChat",
    "sendAISuggestion",
    "sendAIMessage",
    "initAIChat"
  ].forEach(function(name){
    defineLazy(name,["ai"],function(){
      notify("ETHONE AI en cours de chargement.","info");
      return false;
    });
  });
  [
    "resetProfileData",
    "savePassword",
    "removePassword"
  ].forEach(function(name){
    defineLazy(name,["settings-advanced"],function(){
      notify("Parametres avances en cours de chargement.","info");
      return false;
    });
  });
  defineLazy("refreshGithub",["github"],function(){
    notify("GitHub en cours de chargement.","info");
    return false;
  });
  defineLazy("connectGithubFromConnections",["github","connections"],function(){
    notify("Connexion GitHub en cours de chargement.","info");
    return false;
  });
  defineLazy("disconnectGithub",["github","connections"],function(){
    notify("Connexion GitHub en cours de chargement.","info");
    return false;
  });
  [
    "refreshGamingStats",
    "connectValo",
    "disconnectValo",
    "connectLoL",
    "disconnectLoL",
    "connectOW",
    "disconnectOW",
    "addFriendToCompare",
    "vaExportMenu",
    "vaOpenNewAccount",
    "vaOpenColumnsMenu",
    "vaCloseDetail"
  ].forEach(function(name){
    defineLazy(name,["gaming","connections"],function(){
      notify("Module Gaming en cours de chargement.","info");
      return false;
    });
  });
  [
    "refreshDiscord",
    "connectDiscord",
    "disconnectDiscord",
    "refreshSteam",
    "connectSteam",
    "disconnectSteam",
    "savesteamApiKey",
    "refreshSpotifySidebar",
    "connectSpotify",
    "disconnectSpotify",
    "refreshTwitch",
    "connectTwitch",
    "refreshLastfm",
    "connectLastfm",
    "disconnectLastfm"
  ].forEach(function(name){
    defineLazy(name,["connections"],function(){
      notify("Integration en cours de chargement.","info");
      return false;
    });
  });
  defineLazy("wsCreate",["spaces"],function(){
    var api=window.ETHONESpaces||window.ETHONEWorkspaces;
    if(api&&typeof api.create==="function"){
      var item=api.create({name:"New Space",label:"New Space"});
      try{
        if(typeof window.renderWorkspacesSettings==="function")window.renderWorkspacesSettings();
      }catch(error){}
      notify("Workspace cree.","success");
      return item;
    }
    notify("Spaces en cours de chargement.","info");
    return false;
  });

  if(typeof window.widgetsReset!=="function"){
    window.widgetsReset=function(){
      var p=profile();
      if(!p||!p.state)return false;
      p.state.liveWidgets={
        order:["discord","nowplaying","lastfm"],
        visible:{},
        pinned:{},
        config:{},
        sizes:{}
      };
      save();
      try{if(typeof window.initSidebarWidgets==="function")window.initSidebarWidgets(p)}catch(error){}
      try{if(typeof window.renderWidgetManager==="function")window.renderWidgetManager()}catch(error){}
      notify("Layout widgets restaure.","success");
      return true;
    };
  }

  if(typeof window.devClearCaches!=="function"){
    window.devClearCaches=function(){
      var removed=0;
      try{
        Object.keys(localStorage).forEach(function(key){
          if(/^(ethone:(cache|tmp|perf|health|debug)|nexus_cache|myspace_tmp)/i.test(key)){
            localStorage.removeItem(key);
            removed++;
          }
        });
      }catch(error){}
      try{
        Object.keys(sessionStorage).forEach(function(key){
          if(!/^nexus_profiles_/i.test(key)){
            sessionStorage.removeItem(key);
            removed++;
          }
        });
      }catch(error){}
      notify(removed?removed+" cache(s) nettoye(s).":"Aucun cache temporaire a nettoyer.","success");
      return true;
    };
  }

  if(typeof window.requestNotifPermission!=="function"){
    window.requestNotifPermission=function(){
      if(!("Notification" in window)){
        notify("Notifications navigateur non supportees.","warning");
        return Promise.resolve(false);
      }
      return Notification.requestPermission().then(function(permission){
        var p=profile();
        if(p&&p.state)p.state.notifEnabled=permission==="granted";
        save();
        try{if(window.ETHONESettingsFunctional&&window.ETHONESettingsFunctional.sync)window.ETHONESettingsFunctional.sync()}catch(error){}
        notify(permission==="granted"?"Notifications activees.":"Notifications non activees.",permission==="granted"?"success":"info");
        return permission==="granted";
      }).catch(function(){
        notify("Impossible de demander les notifications.","warning");
        return false;
      });
    };
  }

  if(typeof window.onThemeSegmented!=="function"){
    window.onThemeSegmented=function(key,value,button){
      var p=profile();
      if(!p)return false;
      if(!p.theme)p.theme={};
      p.theme[key]=value;
      try{
        if(button&&button.parentElement){
          Array.prototype.forEach.call(button.parentElement.querySelectorAll("button"),function(btn){
            btn.classList.toggle("active",btn===button);
          });
        }
      }catch(error){}
      try{if(window.ETHONESettingsFunctional&&window.ETHONESettingsFunctional.apply)window.ETHONESettingsFunctional.apply()}catch(error){}
      save();
      return true;
    };
  }

  function forceCloseTransientUI(){
    if(window.ETHONENotifications&&typeof window.ETHONENotifications.close==="function"){
      try{window.ETHONENotifications.close()}catch(error){fallbackCloseNotif()}
    }else fallbackCloseNotif();
    var presentation=document.getElementById("presentation-overlay");
    if(presentation)presentation.classList.remove("active","open","visible");
    var commandOverlay=document.getElementById("cmd-palette-overlay");
    if(commandOverlay&&commandOverlay.classList.contains("open")&&typeof window.closeCmdPalette==="function"){
      try{window.closeCmdPalette()}catch(error){}
    }else{
      if(commandOverlay){
        commandOverlay.classList.remove("open","active","visible","spotlight-open");
        commandOverlay.setAttribute("aria-hidden","true");
      }
      var command=document.getElementById("cmd-palette")||document.getElementById("command-palette");
      if(command)command.classList.remove("open","active","visible","spotlight-open");
    }
    var mission=document.getElementById("ethone-mission-control");
    if(mission){
      mission.classList.remove("open","active","visible");
      mission.setAttribute("aria-hidden","true");
    }
    var versionPopup=document.getElementById("ethone-version-popup-root");
    if(versionPopup){
      versionPopup.classList.remove("is-open","open","active","visible");
      versionPopup.setAttribute("aria-hidden","true");
    }
    var whatsNew=document.getElementById("ethone-whats-new-root");
    if(whatsNew){
      whatsNew.classList.remove("is-open","open","active","visible");
      whatsNew.setAttribute("aria-hidden","true");
    }
    var widgets=document.getElementById("widgets-panel-overlay");
    if(widgets)widgets.classList.remove("open","active","visible");
    document.body.classList.remove(
      "ethone-modal-open",
      "ethone-command-open",
      "ethone-mission-control-open",
      "ethone-presentation-open",
      "ethone-version-popup-active",
      "ethone-whats-new-active"
    );
    return true;
  }

  window.ethoneForceCloseTransientUI=forceCloseTransientUI;

  document.addEventListener("keydown",function(event){
    if(event.key==="Escape")forceCloseTransientUI();
  },true);
})();
