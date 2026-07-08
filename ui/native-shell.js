/* ETHONE Native Shell.
   Orchestrates existing OS primitives without changing auth, backend or routing. */
(function(){
  "use strict";
  if(window.__ethoneNativeShell)return;
  window.__ethoneNativeShell=true;

  var qs=function(s,r){return (r||document).querySelector(s)};
  var qsa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var rootId="ethone-native-shell";
  var originalSwitchPage=null;
  var refreshQueued=false;
  var splitTarget="ai";
  var state={split:false,lastPage:"dashboard"};

  var icon={
    command:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9h6v6H9z"/><path d="M9 3a3 3 0 1 0 0 6M15 3a3 3 0 1 1 0 6M9 15a3 3 0 1 0 0 6M15 15a3 3 0 1 1 0 6"/></svg>',
    split:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="3"/><path d="M12 5v14"/></svg>',
    window:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 9h8"/></svg>',
    desktop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="11" rx="2"/><path d="M9 20h6M12 15.5V20"/></svg>'
  };

  var labels={
    dashboard:"Home",
    ai:"Brain",
    notes:"Notes",
    todos:"Tasks",
    calendar:"Calendar",
    files:"Files",
    marketplace:"Marketplace",
    settings:"Settings",
    connections:"Connections",
    stats:"Analytics",
    gaming:"Gaming",
    databases:"Databases",
    "widget-marketplace":"Widget Store"
  };

  function hidden(el){
    if(!el)return true;
    var cs=getComputedStyle(el);
    return el.hidden||cs.display==="none"||cs.visibility==="hidden";
  }

  function appVisible(){
    return !!qs("#main-content")&&hidden(qs("#auth-screen"))&&hidden(qs("#profile-screen"))&&hidden(qs("#password-screen"));
  }

  function currentPage(){
    var active=qs(".tab-content.active[id^='page-']");
    return active?active.id.replace(/^page-/,""):(state.lastPage||"dashboard");
  }

  function pageLabel(page){
    if(labels[page])return labels[page];
    var el=qs("#page-"+page);
    var title=el&&qs(".page-title,.section-title,h1,h2",el);
    return title&&title.textContent.trim()?title.textContent.trim():String(page||"ETHONE").replace(/-/g," ");
  }

  function workspaceLabel(){
    try{
      if(window.ETHONESpaces&&typeof window.ETHONESpaces.state==="function"){
        var spaces=window.ETHONESpaces.state();
        if(spaces&&spaces.active&&spaces.spaces){
          var active=spaces.spaces.find(function(s){return s.id===spaces.active});
          if(active&&active.name)return active.name;
        }
      }
    }catch(e){}
    try{
      var raw=localStorage.getItem("ethone:active-workspace-id")||localStorage.getItem("ethone:space-active");
      if(raw)return String(raw).replace(/[-_]/g," ");
    }catch(e){}
    return "Personal OS";
  }

  function ensureRoot(){
    var root=qs("#"+rootId);
    if(root)return root;
    root=document.createElement("div");
    root.id=rootId;
    root.setAttribute("aria-live","polite");
    root.innerHTML=
      '<div class="native-titlebar" role="toolbar" aria-label="ETHONE native controls">'+
        '<div class="native-window-dots" aria-hidden="true"><i></i><i></i><i></i></div>'+
        '<div class="native-shell-status"><strong data-native-page>ETHONE</strong><span data-native-workspace>Personal OS</span></div>'+
        '<button type="button" class="native-shell-action is-primary" data-native-action="command" title="Open command palette">'+icon.command+'<span>Command</span><span class="native-shell-kbd">Ctrl K</span></button>'+
        '<button type="button" class="native-shell-action" data-native-action="split" title="Open contextual side panel">'+icon.split+'<span>Split</span></button>'+
        '<button type="button" class="native-shell-action" data-native-action="window" title="Open current page in a window">'+icon.window+'<span>Window</span></button>'+
        '<button type="button" class="native-shell-action" data-native-action="desktop" title="Toggle desktop mode">'+icon.desktop+'<span>Desktop</span></button>'+
      '</div>';
    document.body.appendChild(root);
    return root;
  }

  function notify(message,type){
    if(typeof window.toast==="function"){
      try{window.toast(message,type||"info");return}catch(e){}
    }
  }

  function refresh(){
    refreshQueued=false;
    var visible=appVisible();
    document.documentElement.classList.toggle("ethone-native-shell",visible);
    document.body.classList.toggle("ethone-native-shell-ready",visible);
    document.body.classList.toggle("ethone-native-shell-hidden",!visible);
    if(!visible)return;
    var root=ensureRoot();
    var page=currentPage();
    state.lastPage=page;
    var pageNode=qs("[data-native-page]",root);
    var workspaceNode=qs("[data-native-workspace]",root);
    if(pageNode)pageNode.textContent=pageLabel(page);
    if(workspaceNode)workspaceNode.textContent=workspaceLabel();
  }

  function scheduleRefresh(){
    if(refreshQueued)return;
    refreshQueued=true;
    requestAnimationFrame(refresh);
  }

  function openCommand(){
    if(typeof window.openCmdPalette==="function"){
      window.openCmdPalette();
      return true;
    }
    notify("Command palette is not available yet.","warning");
    return false;
  }

  function openWindow(){
    var page=currentPage();
    if(window.ETHONEDesktop&&typeof window.ETHONEDesktop.open==="function"){
      window.ETHONEDesktop.open(page,{frame:{x:92,y:74,w:980,h:640}});
      return true;
    }
    notify("Desktop windows are not available yet.","warning");
    return false;
  }

  function openDesktop(){
    if(window.ETHONEDesktop&&typeof window.ETHONEDesktop.toggle==="function"){
      window.ETHONEDesktop.toggle();
      return true;
    }
    notify("Desktop mode is not available yet.","warning");
    return false;
  }

  function chooseSplitTarget(){
    var page=currentPage();
    if(page==="ai")return "notes";
    if(page==="notes")return "ai";
    if(page==="files")return "ai";
    if(page==="connections")return "github";
    return splitTarget||"ai";
  }

  function toggleSplit(){
    state.split=!state.split;
    document.body.classList.toggle("ethone-native-split",state.split);
    var target=chooseSplitTarget();
    splitTarget=target;
    if(window.ETHONESidePanels&&typeof window.ETHONESidePanels.open==="function"){
      window.ETHONESidePanels.open(target,{toast:false});
      return true;
    }
    if(window.ETHONEDesktop&&typeof window.ETHONEDesktop.split==="function"){
      window.ETHONEDesktop.split();
      return true;
    }
    return false;
  }

  function wrapSwitchPage(){
    if(typeof window.ethoneAddSwitchPageHook==="function"){
      window.ethoneAddSwitchPageHook("native-shell",function(page){
        setTimeout(function(){
          qsa(".native-page-exit").forEach(function(el){el.classList.remove("native-page-exit")});
          var target=qs("#page-"+page);
          if(target){
            target.classList.add("native-page-enter");
            setTimeout(function(){target.classList.remove("native-page-enter")},260);
          }
          scheduleRefresh();
        },24);
      });
      return;
    }
    if(typeof window.switchPage!=="function"||window.switchPage.__nativeShellWrapped)return;
    originalSwitchPage=window.switchPage;
    window.switchPage=function(page,navEl){
      var active=qs(".tab-content.active[id^='page-']");
      if(active)active.classList.add("native-page-exit");
      var result=originalSwitchPage.apply(this,arguments);
      setTimeout(function(){
        qsa(".native-page-exit").forEach(function(el){el.classList.remove("native-page-exit")});
        var target=qs("#page-"+page);
        if(target){
          target.classList.add("native-page-enter");
          setTimeout(function(){target.classList.remove("native-page-enter")},260);
        }
        scheduleRefresh();
      },24);
      return result;
    };
    window.switchPage.__nativeShellWrapped=true;
  }

  function bind(){
    document.addEventListener("click",function(event){
      var action=event.target.closest("[data-native-action]");
      if(!action)return;
      var type=action.dataset.nativeAction;
      if(type==="command"){event.preventDefault();openCommand();}
      if(type==="split"){event.preventDefault();toggleSplit();}
      if(type==="window"){event.preventDefault();openWindow();}
      if(type==="desktop"){event.preventDefault();openDesktop();}
    });

    document.addEventListener("keydown",function(event){
      var key=(event.key||"").toLowerCase();
      if(event.key==="F12")return;
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&(key==="i"||key==="j"||key==="c"))return;
      if(!appVisible())return;
      if((event.ctrlKey||event.metaKey)&&event.altKey&&key==="w"){
        event.preventDefault();
        openWindow();
      }
      if((event.ctrlKey||event.metaKey)&&event.altKey&&key==="s"){
        event.preventDefault();
        toggleSplit();
      }
      if((event.ctrlKey||event.metaKey)&&event.altKey&&key==="d"){
        event.preventDefault();
        openDesktop();
      }
    });

    window.addEventListener("resize",scheduleRefresh,{passive:true});
    window.addEventListener("ethone:page-ready",function(event){
      if(event&&event.detail&&event.detail.page)state.lastPage=event.detail.page;
      scheduleRefresh();
    });
    ["ethone:workspace-change","ethone:workspace-update","ethone:space-change","ethone:space-update","ethone:dashboard-ready"].forEach(function(name){
      window.addEventListener(name,scheduleRefresh);
    });
  }

  function boot(){
    ensureRoot();
    wrapSwitchPage();
    bind();
    scheduleRefresh();
    setTimeout(function(){wrapSwitchPage();scheduleRefresh()},700);
    setTimeout(scheduleRefresh,1600);
  }

  window.ETHONENativeShell={
    openCommand:openCommand,
    openWindow:openWindow,
    toggleSplit:toggleSplit,
    toggleDesktop:openDesktop,
    refresh:scheduleRefresh,
    state:function(){return {split:state.split,lastPage:state.lastPage,visible:appVisible()}}
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
