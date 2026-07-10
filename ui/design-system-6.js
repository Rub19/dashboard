(function(){
  "use strict";

  if(window.__ethoneDesignSystem6)return;
  window.__ethoneDesignSystem6=true;

  var doc=document;
  var scheduled=false;

  function qsa(selector,root){
    try{return Array.prototype.slice.call((root||doc).querySelectorAll(selector));}
    catch(error){return [];}
  }

  function normalizeButtons(root){
    qsa("button",root).forEach(function(button){
      if(!button.type)button.type="button";
      if(button.disabled)button.setAttribute("aria-disabled","true");
      var text=(button.textContent||"").replace(/\s+/g," ").trim();
      if(!text&&!button.getAttribute("aria-label")){
        var title=button.getAttribute("title");
        button.setAttribute("aria-label",title||"Action ETHONE");
      }
    });
  }

  function normalizeSurfaces(root){
    qsa(".panel,.card,.stat-card,.settings-card,.d4-widget,.d4-panel,.modal,.live-panel,#cmd-palette,#notif-panel",root)
      .forEach(function(surface){
        surface.dataset.ds6Surface="true";
      });
  }

  function normalizeInteractive(root){
    qsa("button,[role='button'],a,input,textarea,select",root).forEach(function(node){
      node.dataset.ds6Interactive="true";
    });
  }

  function activate(){
    doc.documentElement.classList.add("ethone-ds6-ready");
    normalizeButtons(doc);
    normalizeSurfaces(doc);
    normalizeInteractive(doc);
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    window.requestAnimationFrame(function(){
      scheduled=false;
      activate();
    });
  }

  function audit(){
    var tokenNames=[
      "--surface-0","--surface-1","--surface-2","--surface-3",
      "--border-primary","--border-secondary","--accent",
      "--radius-md","--radius-xl","--shadow-sm","--shadow-md",
      "--control-height","--motion-fast"
    ];
    var styles=getComputedStyle(doc.documentElement);
    var tokens={};
    tokenNames.forEach(function(name){tokens[name]=styles.getPropertyValue(name).trim();});
    return {
      ready:doc.documentElement.classList.contains("ethone-ds6-ready"),
      tokens:tokens,
      surfaces:qsa("[data-ds6-surface='true']").length,
      interactive:qsa("[data-ds6-interactive='true']").length,
      buttonsWithoutLabel:qsa("button").filter(function(button){
        return !(button.textContent||"").trim()&&!button.getAttribute("aria-label")&&!button.title;
      }).length
    };
  }

  if(doc.readyState==="loading")doc.addEventListener("DOMContentLoaded",schedule,{once:true});
  else schedule();

  window.addEventListener("ethone:dashboard-ready",schedule);
  window.addEventListener("ethone:page-ready",schedule);
  window.addEventListener("ethone:lazy-group-loaded",schedule);

  window.ETHONEDS6={
    refresh:schedule,
    audit:audit
  };
})();
