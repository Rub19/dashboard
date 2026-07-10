/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  if(window.__ethoneProductionHardening)return;
  window.__ethoneProductionHardening=true;

  var runtimeErrors=[];
  var reducedMotion=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)");
  var scheduleTimer=0;

  function all(selector,root){return Array.prototype.slice.call((root||document).querySelectorAll(selector));}
  function safeText(value){return String(value||"").replace(/[<>&"']/g,function(ch){return {"<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&#39;"}[ch];});}
  function notify(message,type){
    if(typeof window.toast==="function"){
      try{window.toast(message,type||"info");return;}catch(e){}
    }
    if(type==="error")console.error("[ETHONE]",message);
  }
  function recordError(kind,error){
    var message=error&&error.message?error.message:String(error||"Unknown runtime error");
    runtimeErrors.push({kind:kind,message:message,time:Date.now()});
    if(runtimeErrors.length>40)runtimeErrors.shift();
    if(!recordError.silenced){
      recordError.silenced=true;
      notify("Une erreur a ete interceptee et journalisee proprement.","error");
      setTimeout(function(){recordError.silenced=false;},8000);
    }
  }
  function duplicateIds(){
    var counts={};
    all("[id]").forEach(function(node){counts[node.id]=(counts[node.id]||0)+1;});
    return Object.keys(counts).filter(function(id){return counts[id]>1;}).map(function(id){return {id:id,count:counts[id]};});
  }
  function hardenExternalLinks(){
    all("a[href]").forEach(function(link){
      var href=link.getAttribute("href")||"";
      if(/^\s*javascript:/i.test(href)||/^\s*data:/i.test(href)){
        link.setAttribute("href","#");
        link.setAttribute("aria-disabled","true");
        return;
      }
      if(!/^https?:\/\//i.test(href))return;
      var external=false;
      try{external=new URL(href,location.href).origin!==location.origin;}catch(e){}
      if(!external)return;
      if(!link.target)link.target="_blank";
      var rel=(link.getAttribute("rel")||"").split(/\s+/).filter(Boolean);
      ["noopener","noreferrer"].forEach(function(token){if(rel.indexOf(token)===-1)rel.push(token);});
      link.setAttribute("rel",rel.join(" "));
    });
  }
  function hardenMediaUrls(){
    all("[src]").forEach(function(node){
      var src=node.getAttribute("src")||"";
      if(!src)return;
      if(/^\s*javascript:/i.test(src)){node.removeAttribute("src");return;}
      if(/^\s*data:/i.test(src)&&!/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(src)){
        node.removeAttribute("src");
      }
    });
  }
  function normalizeButtons(){
    all("button:not([type])").forEach(function(button){
      if(button.hasAttribute("onclick")||!button.closest("form"))button.type="button";
    });
  }
  function labelInteractiveControls(){
    all("button").forEach(function(button){
      if(button.getAttribute("aria-label")||button.textContent.trim()||button.title)return;
      var icon=button.querySelector("svg");
      if(icon)button.setAttribute("aria-label","Action ETHONE");
    });
  }
  function ethoneSecuritySweepStorage(){
    var allow=/^(?:sb-|supabase\.auth|nexus_lang|ethone_lang|ethone_remember_auth|myspace_profiles_backup|myspace_profiles_backup_owner)$/i;
    var sensitive=window.ETHONESecurity&&ETHONESecurity.isSensitiveKey
      ? ETHONESecurity.isSensitiveKey
      : function(key){return /password|secret|token|api[_-]?key|apikey|credential|bearer/i.test(String(key||""));};
    [localStorage,sessionStorage].forEach(function(store){
      try{
        var remove=[];
        for(var i=0;i<store.length;i++){
          var key=store.key(i);
          if(!key||allow.test(key))continue;
          if(sensitive(key))remove.push(key);
        }
        remove.forEach(function(key){try{store.removeItem(key);}catch(error){}});
      }catch(error){}
    });
  }
  function sanitizeStoredProfileBackup(){
    if(!window.ETHONESecurity||!ETHONESecurity.sanitizeProfilesForPersistence)return;
    try{
      var raw=localStorage.getItem("myspace_profiles_backup");
      if(!raw)return;
      var parsed=JSON.parse(raw);
      if(!Array.isArray(parsed))return;
      var jobs=parsed.map(function(profile){
        if(!profile||!profile.password||!Object.prototype.hasOwnProperty.call(profile.password,"value")||!ETHONESecurity.createProfileLock)return Promise.resolve();
        return ETHONESecurity.createProfileLock(profile.password.type,profile.password.value).then(function(lock){profile.password=lock;}).catch(function(){});
      });
      Promise.all(jobs).then(function(){
        try{localStorage.setItem("myspace_profiles_backup",JSON.stringify(ETHONESecurity.sanitizeProfilesForPersistence(parsed)));}catch(error){}
      });
    }catch(error){}
  }
  function reduceMotionState(){
    if(reducedMotion&&reducedMotion.matches)document.documentElement.classList.add("ethone-reduced-motion");
    else document.documentElement.classList.remove("ethone-reduced-motion");
  }
  function installEmptyPageGuard(){
    all('[id^="page-"],.tab-content').forEach(function(page){
      if(page.dataset&&page.dataset.prodEmptyChecked)return;
      if(page.dataset)page.dataset.prodEmptyChecked="true";
      var text=(page.textContent||"").replace(/\s+/g," ").trim();
      if(text.length<16&&page.children.length===0){
        page.innerHTML='<div class="ethone-prod-fallback" data-prod-empty>ETHONE prepare cette vue.</div>';
      }
    });
  }
  function registerServiceWorker(){
    if(window.ETHONE_SAFE_MODE||window.__ethoneSkipServiceWorker)return;
    if(!("serviceWorker" in navigator))return;
    if(navigator.webdriver)return;
    if(location.protocol==="file:")return;
    navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(function(registration){
      function activateWaitingWorker(){
        if(registration.waiting)registration.waiting.postMessage({type:"ETHONE_SKIP_WAITING"});
      }
      registration.addEventListener("updatefound",function(){
        var worker=registration.installing;
        if(!worker)return;
        worker.addEventListener("statechange",function(){
          if(worker.state==="installed"&&navigator.serviceWorker.controller)activateWaitingWorker();
        });
      });
      activateWaitingWorker();
      registration.update().catch(function(error){recordError("service-worker-update",error);});
    }).catch(function(error){recordError("service-worker",error);});
    if(!registerServiceWorker._controllerBound){
      registerServiceWorker._controllerBound=true;
      navigator.serviceWorker.addEventListener("controllerchange",function(){
        if(registerServiceWorker._refreshing)return;
        registerServiceWorker._refreshing=true;
        window.location.reload();
      });
    }
  }
  function runHardening(){
    reduceMotionState();
    hardenExternalLinks();
    hardenMediaUrls();
    normalizeButtons();
    labelInteractiveControls();
    ethoneSecuritySweepStorage();
    sanitizeStoredProfileBackup();
    installEmptyPageGuard();
  }
  function scheduleHardening(){
    clearTimeout(scheduleTimer);
    scheduleTimer=setTimeout(runHardening,80);
  }

  window.addEventListener("error",function(event){recordError("error",event.error||event.message);});
  window.addEventListener("unhandledrejection",function(event){recordError("promise",event.reason);});
  if(reducedMotion){
    if(typeof reducedMotion.addEventListener==="function")reducedMotion.addEventListener("change",reduceMotionState);
    else if(typeof reducedMotion.addListener==="function")reducedMotion.addListener(reduceMotionState);
  }
  var lightBoot=false;
  try{lightBoot=!!(window.ETHONE_LIGHT_BOOT_MODE||document.documentElement.classList.contains("ethone-stable-boot")||document.documentElement.dataset.ethoneStableBoot==="1")}catch(e){lightBoot=!!window.ETHONE_LIGHT_BOOT_MODE}
  if(!lightBoot&&"MutationObserver" in window){
    if(window.ETHONEDOMRuntime&&typeof window.ETHONEDOMRuntime.subscribe==="function"){
      window.ETHONEDOMRuntime.subscribe("production-hardening",scheduleHardening);
    }else{
      new MutationObserver(scheduleHardening).observe(document.documentElement,{childList:true,subtree:true});
    }
  }

  window.ETHONEProductionQA={
    audit:function(){
      var pages=all('[id^="page-"],.tab-content').map(function(page){
        return {id:page.id||"",textLength:(page.textContent||"").replace(/\s+/g," ").trim().length,children:page.children.length};
      });
      return {
        errors:runtimeErrors.slice(),
        duplicateIds:duplicateIds(),
        pages:pages,
        externalLinks:all('a[href^="http"]').length,
        serviceWorker:!!(navigator.serviceWorker&&navigator.serviceWorker.controller)
      };
    },
    harden:runHardening,
    securitySweep:ethoneSecuritySweepStorage,
    errors:function(){return runtimeErrors.slice();}
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){runHardening();registerServiceWorker();});
  else {runHardening();registerServiceWorker();}
  setTimeout(runHardening,600);
  setTimeout(runHardening,1800);
})();
