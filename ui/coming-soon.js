(function(){
  "use strict";
  if(window.__ethoneComingSoon)return;
  window.__ethoneComingSoon=true;

  var STORE_KEY="ethone:coming-soon-notify";
  var scanTimer=0;
  var pendingRoots=[];

  function esc(value){
    return String(value==null?"":value).replace(/[&<>"]/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch];
    });
  }
  function lang(){
    return String(window._lang||localStorage.getItem("nexus_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase();
  }
  function text(map,fallback){
    var l=lang();
    return map[l]||map.en||fallback;
  }
  function toast(message,type){
    try{
      if(typeof window.toast==="function"){window.toast(message,type||"info");return;}
      if(window.ETHONENotifications&&typeof window.ETHONENotifications.notify==="function"){
        window.ETHONENotifications.notify({title:"ETHONE",message:message,category:type||"info",source:"Coming Soon"});
        return;
      }
    }catch(e){}
    console.info("[ETHONE Coming Soon]",message);
  }
  function readList(){
    try{
      var data=JSON.parse(localStorage.getItem(STORE_KEY)||"[]");
      return Array.isArray(data)?data:[];
    }catch(e){return [];}
  }
  function writeList(list){
    try{localStorage.setItem(STORE_KEY,JSON.stringify(list.slice(-80)));}catch(e){}
  }
  function remember(feature,description){
    var list=readList();
    var id=String(feature||"feature").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    if(!id)id="feature";
    if(!list.some(function(item){return item.id===id;})){
      list.push({id:id,feature:feature||"Feature",description:description||"",createdAt:new Date().toISOString()});
      writeList(list);
    }
    toast(text({
      fr:"C'est note. ETHONE te le rappellera quand cette fonctionnalite sera prete.",
      en:"Saved. ETHONE will remind you when this feature is ready.",
      es:"Guardado. ETHONE te avisara cuando esta funcion este lista.",
      de:"Gespeichert. ETHONE erinnert dich, sobald diese Funktion bereit ist."
    },"Saved."),"success");
  }
  function labelFor(el){
    return el.getAttribute("data-coming-soon")||
      el.getAttribute("aria-label")||
      el.getAttribute("title")||
      (el.textContent||"").trim()||
      "Feature";
  }
  function descriptionFor(el){
    return el.getAttribute("data-coming-soon-description")||
      text({
        fr:"Cette partie est visible pour montrer la direction produit, mais elle n'est pas encore connectee a une integration complete.",
        en:"This surface is visible to show the product direction, but it is not connected to a complete integration yet.",
        es:"Esta parte muestra la direccion del producto, pero aun no esta conectada a una integracion completa.",
        de:"Dieser Bereich zeigt die Produktrichtung, ist aber noch nicht mit einer vollstandigen Integration verbunden."
      },"This feature is coming soon.");
  }
  function messageFor(el){
    var feature=labelFor(el);
    var desc=descriptionFor(el);
    return text({
      fr:"Coming Soon: "+feature+". "+desc,
      en:"Coming Soon: "+feature+". "+desc,
      es:"Coming Soon: "+feature+". "+desc,
      de:"Coming Soon: "+feature+". "+desc
    },"Coming Soon: "+feature+". "+desc);
  }
  function injectStyles(){
    if(document.getElementById("ethone-coming-soon-style"))return;
    var style=document.createElement("style");
    style.id="ethone-coming-soon-style";
    style.textContent=[
      ".ethone-coming-soon{position:relative!important;cursor:not-allowed!important;opacity:.72!important;filter:saturate(.85)!important}",
      ".ethone-coming-soon:not(.ethone-coming-soon-surface){box-shadow:inset 0 0 0 1px rgba(167,139,250,.18)!important}",
      ".ethone-coming-soon-surface{opacity:1!important;filter:none!important;cursor:default!important}",
      ".ethone-coming-soon:hover{transform:none!important}",
      ".ethone-coming-soon-badge,.ethone-coming-soon-chip{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid rgba(167,139,250,.28);background:rgba(139,92,246,.14);color:#ddd6fe;border-radius:999px;font-size:10px;font-weight:750;line-height:1;letter-spacing:.02em;white-space:nowrap;box-shadow:0 8px 22px rgba(139,92,246,.12)}",
      ".ethone-coming-soon-badge{padding:5px 8px;margin-left:8px;vertical-align:middle}",
      ".ethone-coming-soon-chip{padding:4px 7px;margin-left:7px;font-size:9px}",
      ".ethone-coming-soon-note{margin-top:8px;padding:9px 10px;border:1px solid rgba(167,139,250,.18);border-radius:12px;background:rgba(139,92,246,.075);color:rgba(245,243,255,.68);font-size:11.5px;line-height:1.45}",
      ".ethone-coming-soon-surface{border-color:rgba(167,139,250,.20)!important}",
      ".ethone-coming-soon[aria-disabled='true']{pointer-events:auto!important}",
      "@media(prefers-reduced-motion:reduce){.ethone-coming-soon,.ethone-coming-soon *{transition:none!important;animation:none!important}}"
    ].join("\n");
    document.head.appendChild(style);
  }
  function ensureBadge(el){
    if(el.querySelector&&el.querySelector(".ethone-coming-soon-chip,.ethone-coming-soon-badge"))return;
    var badge=document.createElement("span");
    badge.className=/button/i.test(el.tagName)||el.matches("button,.btn,.aic-btn,.mp41-btn,.wm-btn,.studio-btn,.spaces-action")?"ethone-coming-soon-chip":"ethone-coming-soon-badge";
    badge.textContent="Coming Soon";
    if(el.matches("button,.btn,.aic-btn,.mp41-btn,.wm-btn,.studio-btn,.spaces-action")){
      el.appendChild(badge);
    }else{
      var head=el.querySelector("h2,h3,strong,.aic-provider-name,.ph-status,.ih-status,.mp41-kicker,.studio-kicker");
      if(head&&head.parentNode)head.parentNode.appendChild(badge);
      else el.insertBefore(badge,el.firstChild);
    }
  }
  function ensureNote(el){
    if(el.getAttribute("data-coming-soon-note")==="false")return;
    if(el.querySelector&&el.querySelector(".ethone-coming-soon-note"))return;
    if(!el.matches(".ethone-coming-soon-surface,[data-coming-soon-surface]"))return;
    var note=document.createElement("div");
    note.className="ethone-coming-soon-note";
    note.textContent=descriptionFor(el);
    el.appendChild(note);
  }
  function prepare(el){
    if(!el||el.__ethoneComingSoonPrepared)return;
    el.__ethoneComingSoonPrepared=true;
    el.classList.add("ethone-coming-soon");
    if(el.matches("article,section,div"))el.classList.add("ethone-coming-soon-surface");
    el.setAttribute("aria-disabled","true");
    el.setAttribute("data-action-guard","coming-soon");
    if(!el.getAttribute("title"))el.setAttribute("title",labelFor(el)+" - Coming Soon");
    ensureBadge(el);
    ensureNote(el);
  }
  function scan(root){
    injectStyles();
    var scope=root&&root.querySelectorAll?root:document;
    try{
      if(scope.nodeType===1&&scope.matches&&scope.matches("[data-coming-soon],[data-feature-status='coming-soon']")){
        if(scope.matches("[data-feature-status='coming-soon']")&&!scope.getAttribute("data-coming-soon"))scope.setAttribute("data-coming-soon",scope.getAttribute("data-feature-name")||"Feature");
        prepare(scope);
      }
      scope.querySelectorAll("[data-coming-soon]").forEach(prepare);
      scope.querySelectorAll("[data-feature-status='coming-soon']").forEach(function(el){
        if(!el.getAttribute("data-coming-soon"))el.setAttribute("data-coming-soon",el.getAttribute("data-feature-name")||"Feature");
        prepare(el);
      });
    }catch(e){}
  }
  function scheduleScan(root){
    if(root)pendingRoots.push(root);
    clearTimeout(scanTimer);
    scanTimer=setTimeout(function(){
      var roots=pendingRoots.splice(0,pendingRoots.length);
      if(!roots.length)roots=[document];
      roots.slice(0,80).forEach(function(item){scan(item||document);});
    },40);
  }
  function handleComingSoon(el,event){
    if(!el)return false;
    if(event){
      event.preventDefault();
      event.stopPropagation();
      if(typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();
    }
    var feature=labelFor(el);
    var desc=descriptionFor(el);
    if(el.getAttribute("data-coming-soon-notify")==="true"||/notify/i.test((el.textContent||""))){
      remember(feature,desc);
    }else{
      toast(messageFor(el),"info");
    }
    return false;
  }
  function mark(target,meta){
    var nodes=[];
    if(typeof target==="string")nodes=Array.prototype.slice.call(document.querySelectorAll(target));
    else if(target&&target.nodeType===1)nodes=[target];
    nodes.forEach(function(el){
      meta=meta||{};
      if(meta.feature)el.setAttribute("data-coming-soon",meta.feature);
      if(meta.description)el.setAttribute("data-coming-soon-description",meta.description);
      if(meta.notify)el.setAttribute("data-coming-soon-notify","true");
      prepare(el);
    });
    return nodes.length;
  }
  function bind(){
    document.addEventListener("click",function(event){
      var el=event.target&&event.target.closest&&event.target.closest("[data-coming-soon]");
      if(!el&&event.target&&event.target.closest){
        var surface=event.target.closest("[data-feature-status='coming-soon']");
        var actionable=event.target.closest("button,a,input,textarea,select,[role='button'],[data-action-id],[data-ethone-action],[data-action],[data-ph-action],[data-ih-action],[data-studio-action],[data-ab-run],[data-mp41-install],[data-wm-install]");
        if(surface&&(!actionable||actionable===surface))el=surface;
      }
      if(el)handleComingSoon(el,event);
    },true);
    document.addEventListener("keydown",function(event){
      if(event.key!=="Enter"&&event.key!==" ")return;
      var el=event.target&&event.target.closest&&event.target.closest("[data-coming-soon]");
      if(!el&&event.target&&event.target.closest){
        var surface=event.target.closest("[data-feature-status='coming-soon']");
        var actionable=event.target.closest("button,a,input,textarea,select,[role='button'],[data-action-id],[data-ethone-action],[data-action],[data-ph-action],[data-ih-action],[data-studio-action],[data-ab-run],[data-mp41-install],[data-wm-install]");
        if(surface&&(!actionable||actionable===surface))el=surface;
      }
      if(el)handleComingSoon(el,event);
    },true);
    try{
      var observer=new MutationObserver(function(mutations){
        mutations.forEach(function(mutation){
          Array.prototype.forEach.call(mutation.addedNodes||[],function(node){
            if(node&&node.nodeType===1)scheduleScan(node);
          });
        });
      });
      observer.observe(document.documentElement,{childList:true,subtree:true});
    }catch(e){}
    window.addEventListener("ethone:page-ready",function(){scheduleScan(document);});
    window.addEventListener("ethone:dashboard-ready",function(){scheduleScan(document);});
    registerActionBridge();
    scan(document);
  }
  function registerActionBridge(){
    try{
      var actions=window.Ethone&&window.Ethone.get&&window.Ethone.get("actions");
      if(actions&&typeof actions.register==="function"&&!actions.has("comingSoon.notify")){
        actions.register("comingSoon.notify",{label:"Notify me",handler:function(ctx){
          remember(ctx&&ctx.feature||"Feature",ctx&&ctx.description||"");
          return true;
        }});
        actions.register("comingSoon.learnMore",{label:"Learn more",handler:function(ctx){
          toast((ctx&&ctx.description)||text({
            fr:"Cette fonctionnalite est en preparation.",
            en:"This feature is in preparation.",
            es:"Esta funcion esta en preparacion.",
            de:"Diese Funktion ist in Vorbereitung."
          },"This feature is in preparation."),"info");
          return true;
        }});
      }
    }catch(e){}
  }

  window.ETHONEComingSoon={
    scan:scan,
    mark:mark,
    open:function(feature,description){toast("Coming Soon: "+(feature||"Feature")+(description?". "+description:""),"info");},
    notify:remember,
    list:readList
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
})();
