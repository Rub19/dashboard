/* ETHONE Sidebar Final Rewrite
 * Stabilizes the sidebar lifecycle, modes, keyboard navigation, profile menu,
 * resize state and click routing without changing backend/auth logic.
 */
(function(){
  "use strict";
  if(window.__ethoneSidebarFinalReady)return;
  window.__ethoneSidebarFinalReady=true;

  var MODE_KEY="ethone:sidebar:mode";
  var WIDTH_KEY="sb_width";
  var MODES=["full","compact","icon"];
  var WIDTHS={full:272,compact:76,icon:58};
  var raf=0;
  var baseRender=typeof window.renderSidebarNav==="function"?window.renderSidebarNav:null;

  function q(selector,root){return (root||document).querySelector(selector)}
  function qsa(selector,root){return Array.prototype.slice.call((root||document).querySelectorAll(selector))}
  function clamp(value,min,max,fallback){
    value=parseInt(value,10);
    if(!Number.isFinite(value))value=fallback;
    return Math.min(Math.max(value,min),max);
  }
  function storageGet(key,fallback){try{return localStorage.getItem(key)||fallback}catch(e){return fallback}}
  function storageSet(key,value){try{localStorage.setItem(key,String(value))}catch(e){}}
  function copy(fr,en,es,de){
    if(typeof window.sidebarCopy==="function")return window.sidebarCopy(fr,en,es,de);
    var lang="fr";
    try{lang=String(document.documentElement.lang||localStorage.getItem("ethone:lang")||"fr").slice(0,2).toLowerCase()}catch(e){}
    return ({fr:fr,en:en,es:es||en,de:de||en})[lang]||en;
  }
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function save(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}}
  function action(id,context,fallback){
    try{
      var A=window.Ethone&&window.Ethone.get&&window.Ethone.get("actions");
      if(A&&typeof A.dispatch==="function"){
        var result=A.dispatch(id,Object.assign({source:"sidebar-final"},context||{}));
        if(result!==false)return result;
      }
    }catch(error){console.warn("[ETHONE Sidebar] action failed:",id,error)}
    try{return typeof fallback==="function"?fallback():false}catch(error){console.warn("[ETHONE Sidebar] fallback failed:",id,error);return false}
  }
  function toast(message,type){try{if(typeof window.toast==="function")window.toast(message,type||"info")}catch(e){}}

  function currentMode(){
    var p=profile();
    var saved=(p&&p.sidebarMode)||storageGet(MODE_KEY,"");
    if(MODES.indexOf(saved)>-1)return saved;
    if((p&&p.sidebarCompact)||storageGet("ethone:sidebar:compact","0")==="1")return "compact";
    return "full";
  }

  function fullWidth(){
    return clamp(storageGet(WIDTH_KEY,WIDTHS.full),236,360,WIDTHS.full);
  }

  function applyMode(mode,options){
    mode=MODES.indexOf(mode)>-1?mode:"full";
    options=options||{};
    var sb=q("#main-sidebar");
    var root=document.documentElement;
    var handle=q("#resize-handle");
    var p=profile();
    if(!sb)return mode;
    sb.classList.toggle("compact",mode==="compact"||mode==="icon");
    sb.classList.toggle("icon-only",mode==="icon");
    sb.dataset.sidebarMode=mode;
    root.dataset.sidebarMode=mode;
    root.style.setProperty("--sidebar-w",(mode==="full"?fullWidth():WIDTHS[mode])+"px");
    if(handle){
      var enabled=mode==="full"&&window.innerWidth>900;
      handle.hidden=!enabled;
      handle.style.display=enabled?"":"none";
      handle.style.pointerEvents=enabled?"auto":"none";
      handle.setAttribute("aria-hidden",enabled?"false":"true");
    }
    if(p){
      p.sidebarMode=mode;
      p.sidebarCompact=mode!=="full";
      if(!options.silent)save();
    }
    storageSet(MODE_KEY,mode);
    storageSet("ethone:sidebar:compact",mode==="full"?"0":"1");
    var btn=q("#sidebar-compact-btn");
    if(btn){
      btn.setAttribute("aria-pressed",mode!=="full"?"true":"false");
      btn.title=mode==="full"
        ?copy("Passer en mode compact","Switch to compact mode","Cambiar al modo compacto","Zum Kompaktmodus wechseln")
        :mode==="compact"
          ?copy("Passer en mode icône","Switch to icon mode","Cambiar al modo de iconos","Zum Symbolmodus wechseln")
          :copy("Revenir au mode complet","Return to full mode","Volver al modo completo","Zum vollständigen Modus zurückkehren");
    }
    schedulePolish();
    return mode;
  }

  function cycleMode(){
    var mode=currentMode();
    var next=mode==="full"?"compact":mode==="compact"?"icon":"full";
    return applyMode(next);
  }

  window.toggleSidebarCompact=function(next){
    if(typeof next==="boolean")return applyMode(next?"compact":"full");
    return cycleMode();
  };

  function finalize(){
    var sb=q("#main-sidebar");
    if(!sb)return;
    sb.classList.add("ethone-sidebar-final");
    sb.setAttribute("aria-label","ETHONE navigation");
    applyMode(currentMode(),{silent:true});
    wireSidebar(sb);
    wireProfileMenu();
    updateOverlayState();
    annotateItems(sb);
    schedulePolish();
  }

  function annotateItems(sb){
    qsa(".SidebarItem,.nav-item",sb).forEach(function(item){
      if(item.dataset.sidebarFinalAnnotated==="1")return;
      item.dataset.sidebarFinalAnnotated="1";
      if(item.tagName!=="BUTTON"&&!item.getAttribute("role"))item.setAttribute("role","button");
      if(!item.getAttribute("tabindex"))item.setAttribute("tabindex","0");
      var label=item.querySelector(".nav-label-text");
      if(label&&!item.getAttribute("aria-label"))item.setAttribute("aria-label",label.textContent.trim());
    });
  }

  function wireSidebar(sb){
    if(sb.dataset.sidebarFinalWired==="1")return;
    sb.dataset.sidebarFinalWired="1";
    sb.addEventListener("click",function(event){
      var target=event.target;
      if(!target||event.defaultPrevented)return;
      // The canonical sidebar shell owns its own actions. This fallback only
      // supports non-shell items, preventing duplicate routing on one click.
      if(target.closest("[data-sidebar-local='1']"))return;
      var item=target.closest(".SidebarItem[data-page],.nav-item[data-page]");
      if(item&&sb.contains(item)){
        event.preventDefault();
        var page=item.dataset.page;
        action("navigation.open",{page:page,el:item},function(){
          if(typeof window.switchPage==="function"){window.switchPage(page,item);return true}
          toast("Navigation indisponible","warning");
          return false;
        });
        return;
      }
      var compact=target.closest("#sidebar-compact-btn");
      if(compact&&sb.contains(compact)){
        event.preventDefault();
        cycleMode();
      }
    },false);
    sb.addEventListener("keydown",function(event){
      var scope=event.target&&event.target.closest
        ? event.target.closest("#sidebar-nav-main,#sidebar-nav-account")||sb
        : sb;
      if(event.key==="ArrowDown"||event.key==="ArrowUp"){
        var focusables=getFocusables(scope);
        var idx=focusables.indexOf(document.activeElement);
        if(idx===-1)return;
        event.preventDefault();
        var dir=event.key==="ArrowDown"?1:-1;
        var next=focusables[(idx+dir+focusables.length)%focusables.length];
        if(next)next.focus({preventScroll:false});
      }
      if(event.key==="Home"||event.key==="End"){
        var list=getFocusables(scope);
        if(!list.length)return;
        event.preventDefault();
        (event.key==="Home"?list[0]:list[list.length-1]).focus({preventScroll:false});
        if(scope.id==="sidebar-nav-main"){
          scope.scrollTo({top:event.key==="End"?scope.scrollHeight:0,behavior:"auto"});
        }
      }
      if(event.key==="Escape")closeProfileMenu();
    },true);
  }

  function getFocusables(root){
    return qsa("button:not([disabled]),a[href],.SidebarItem:not([disabled])",root).filter(function(el){
      var rect=el.getBoundingClientRect();
      var style=getComputedStyle(el);
      return rect.width>0&&rect.height>0&&style.visibility!=="hidden"&&style.display!=="none";
    });
  }

  function wireProfileMenu(){
    var btn=q("#os-sidebar-profile");
    if(!btn||btn.dataset.profileMenuWired==="1")return;
    btn.dataset.profileMenuWired="1";
    btn.setAttribute("aria-haspopup","menu");
    btn.setAttribute("aria-controls","sidebar-profile-menu");
    btn.setAttribute("aria-expanded","false");
    btn.onclick=function(event){
      event.preventDefault();
      event.stopPropagation();
      openProfileMenu(btn);
    };
  }

  var profileMenuReturnFocus=null;
  function syncProfileTrigger(open){
    var trigger=q("#os-sidebar-profile");
    if(trigger)trigger.setAttribute("aria-expanded",open?"true":"false");
  }
  function syncProfileMenuState(node,open){
    if(!node)return;
    node.setAttribute("aria-hidden",open?"false":"true");
    node.inert=!open;
    syncProfileTrigger(open);
  }

  function menuNode(){
    var node=q("#sidebar-profile-menu");
    if(node)return node;
    node=document.createElement("div");
    node.id="sidebar-profile-menu";
    node.className="sidebar-profile-menu";
    node.setAttribute("role","menu");
    syncProfileMenuState(node,false);
    node.innerHTML=[
      '<button type="button" role="menuitem" data-sidebar-menu-action="profile.switch"><span>'+copy("Changer de profil","Switch profile","Cambiar perfil","Profil wechseln")+'</span><kbd>P</kbd></button>',
      '<button type="button" role="menuitem" data-sidebar-menu-action="settings.open"><span>'+copy("Paramètres","Settings","Ajustes","Einstellungen")+'</span><kbd>S</kbd></button>',
      '<button type="button" role="menuitem" data-sidebar-menu-action="notifications.open"><span>Notifications</span><kbd>N</kbd></button>',
      '<button type="button" role="menuitem" data-sidebar-menu-action="auth.signout"><span>'+copy("Se déconnecter","Sign out","Cerrar sesión","Abmelden")+'</span></button>'
    ].join("");
    document.body.appendChild(node);
    node.addEventListener("click",function(event){
      var button=event.target.closest("[data-sidebar-menu-action]");
      if(!button)return;
      event.preventDefault();
      var id=button.dataset.sidebarMenuAction;
      closeProfileMenu(false);
      action(id,{el:button},function(){
        if(id==="profile.switch"&&typeof window.goToProfileScreen==="function"){window.goToProfileScreen();return true}
        if(id==="settings.open"&&typeof window.switchPage==="function"){window.switchPage("settings",null);return true}
        if(id==="notifications.open"&&typeof window.toggleNotifPanel==="function"){window.toggleNotifPanel();return true}
        if(id==="auth.signout"&&typeof window.signOut==="function"){window.signOut();return true}
        toast(copy("Cette commande n'est pas disponible dans cette version.","This command is not available in this release.","Este comando no esta disponible en esta version.","Dieser Befehl ist in dieser Version nicht verfügbar."),"info");
        return false;
      });
    });
    document.addEventListener("click",function(event){
      if(node.classList.contains("open")&&!event.target.closest("#sidebar-profile-menu,#os-sidebar-profile"))closeProfileMenu(false);
    },true);
    document.addEventListener("keydown",function(event){
      if(event.key==="Escape")closeProfileMenu();
    },true);
    return node;
  }

  function openProfileMenu(anchor){
    var node=menuNode();
    if(node.classList.contains("open")){closeProfileMenu();return;}
    profileMenuReturnFocus=anchor;
    var rect=anchor.getBoundingClientRect();
    var top=Math.min(window.innerHeight-node.offsetHeight-12,Math.max(12,rect.bottom-184));
    var left=Math.min(window.innerWidth-232,Math.max(12,rect.right+10));
    if(window.innerWidth<=900){
      left=Math.max(12,rect.left);
      top=Math.max(12,rect.top-190);
    }
    node.style.left=left+"px";
    node.style.top=top+"px";
    node.classList.add("open");
    syncProfileMenuState(node,true);
    var first=node.querySelector("button");
    if(first)setTimeout(function(){first.focus({preventScroll:true})},20);
  }

  function closeProfileMenu(restoreFocus){
    var node=q("#sidebar-profile-menu");
    if(!node){syncProfileTrigger(false);return;}
    var wasOpen=node.classList.contains("open");
    node.classList.remove("open");
    syncProfileMenuState(node,false);
    var target=profileMenuReturnFocus;
    profileMenuReturnFocus=null;
    if(wasOpen&&restoreFocus!==false&&target&&document.contains(target))setTimeout(function(){target.focus({preventScroll:true})},0);
  }

  function updateOverlayState(){
    var overlay=q("#sidebar-overlay");
    if(!overlay)return;
    var open=q("#main-sidebar")&&q("#main-sidebar").classList.contains("mobile-open");
    overlay.classList.toggle("mobile-open",!!open);
    overlay.setAttribute("aria-hidden",open?"false":"true");
    overlay.style.pointerEvents=open?"auto":"none";
  }

  function schedulePolish(){
    if(raf)cancelAnimationFrame(raf);
    raf=requestAnimationFrame(function(){
      raf=0;
      try{if(typeof window.ethoneUpdateSidebarScrollFade==="function")window.ethoneUpdateSidebarScrollFade()}catch(e){}
      try{if(typeof window.ethonePositionNavPill==="function")window.ethonePositionNavPill()}catch(e){}
    });
  }

  if(baseRender){
    window.renderSidebarNav=function(){
      var result=baseRender.apply(this,arguments);
      finalize();
      return result;
    };
  }

  window.ETHONESidebarFinal={
    applyMode:applyMode,
    cycleMode:cycleMode,
    currentMode:currentMode,
    openProfileMenu:openProfileMenu,
    closeProfileMenu:closeProfileMenu,
    refresh:finalize
  };

  window.addEventListener("resize",function(){
    if(currentMode()==="full")document.documentElement.style.setProperty("--sidebar-w",fullWidth()+"px");
    updateOverlayState();
    schedulePolish();
  },{passive:true});
  window.addEventListener("ethone:page-ready",function(){setTimeout(finalize,0)});
  window.addEventListener("ethone:profile-switched",function(){setTimeout(finalize,0)});
  document.addEventListener("DOMContentLoaded",function(){setTimeout(finalize,0)});
  if(document.readyState!=="loading")setTimeout(finalize,0);
})();
