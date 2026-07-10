/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  if(window.__ethoneSafeModeBoot)return;
  window.__ethoneSafeModeBoot=true;
  var params;
  try{params=new URLSearchParams(location.search||"");}catch(e){params={has:function(){return false},get:function(){return null}}}
  var safe=params.has("safe")&&params.get("safe")!=="0";
  function hasSupabaseSession(){
    try{
      for(var i=0;i<localStorage.length;i++){
        var key=localStorage.key(i)||"";
        if(/^sb-/.test(key)&&/auth-token|session/i.test(key))return true;
      }
    }catch(e){}
    return false;
  }
  var authBoot=!safe&&!hasSupabaseSession();
  var lightBoot=safe;
  window.ETHONE_SAFE_MODE=!!safe;
  window.ETHONE_AUTH_BOOT_MODE=!!authBoot;
  window.ETHONE_LIGHT_BOOT_MODE=!!lightBoot;
  window.ETHONE_DISABLE_NON_CRITICAL=!!lightBoot;
  window.__ethoneLeanProductionBoot=true;
  if(authBoot&&!safe){
    window.__ethoneDeferredHeavyForAuth=true;
    window.__ethoneSkipAIPreload=true;
    window.__ethoneSkipBrain=true;
    window.__ethoneSkipMarketplace=true;
    window.__ethoneSkipExternalWidgets=true;
  }
  window.ethoneIsDashboardVisible=function(){
    try{
      var main=document.getElementById("main-content");
      if(!main)return false;
      var cs=getComputedStyle(main);
      var rect=main.getBoundingClientRect();
      return cs.display!=="none"&&cs.visibility!=="hidden"&&rect.width>20&&rect.height>20;
    }catch(e){return false}
  };
  var dashboardReadyQueue=[];
  var dashboardReadyFlushing=false;
  var homeRendererKey={
    "dashboard-v4":"dashboard-v4",
    "home-commercial":"home-commercial",
    "experience-2026-redesign":"experience-2026-redesign",
    "v2-product-redesign":"v2-product-redesign",
    "personal-os-vision":"personal-os-vision",
    "dashboard-os2":"dashboard-os2"
  };
  function readLocal(key,fallback){
    try{var value=localStorage.getItem(key);return value==null?fallback:value}catch(e){return fallback}
  }
  function preferredHomeRenderer(){
    var preferred=readLocal("ethone:home-renderer","dashboard-v4");
    return homeRendererKey[preferred]?preferred:"dashboard-v4";
  }
  function shouldSkipDashboardReady(key){
    if(!key)return false;
    if(homeRendererKey[key]&&key!==preferredHomeRenderer())return true;
    return false;
  }
  function dashboardReadyDelay(key){
    if(key==="dashboard-v4")return 0;
    if(key==="enterprise-2026-runtime")return 120;
    if(key==="release-polish")return 180;
    if(key==="desktop-environment")return 260;
    if(key==="permanent-dock")return 340;
    if(key==="status-bar")return 420;
    return 160;
  }
  function enqueueDashboardReady(key,run){
    dashboardReadyQueue.push({key:key,run:run});
    if(dashboardReadyFlushing)return;
    dashboardReadyFlushing=true;
    function next(){
      var item=dashboardReadyQueue.shift();
      if(!item){dashboardReadyFlushing=false;return}
      setTimeout(function(){
        try{item.run()}finally{setTimeout(next,70)}
      },dashboardReadyDelay(item.key));
    }
    setTimeout(next,0);
  }
  window.ethoneRunWhenDashboardReady=function(key,fn){
    if(typeof fn!=="function")return;
    if(shouldSkipDashboardReady(key)){
      window["__ethoneBootDeferred_"+key]=true;
      return;
    }
    var doneKey="__ethoneBootDeferred_"+key;
    if(window[doneKey])return;
    var timer=0;
    var queued=false;
    var readyHandler=null;
    function cleanup(){
      if(timer){clearInterval(timer);timer=0}
      if(readyHandler){window.removeEventListener("ethone:dashboard-ready",readyHandler);readyHandler=null}
    }
    function run(){
      cleanup();
      if(window[doneKey])return;
      window[doneKey]=true;
      try{fn()}catch(error){
        try{
          if(window.ETHONEBootManager&&typeof window.ETHONEBootManager.setStatus==="function"){
            window.ETHONEBootManager.setStatus("dashboard-ready:"+key,"failed",{error:error&&error.message?error.message:String(error)});
          }
        }catch(e){}
        console.warn("[ETHONE boot] Dashboard-ready module failed:",key,error);
      }
    }
    function queue(){
      if(queued||window[doneKey])return;
      queued=true;
      cleanup();
      enqueueDashboardReady(key,run);
    }
    if(window.ethoneIsDashboardVisible())return queue();
    var started=Date.now();
    timer=setInterval(function(){
      if(window.ethoneIsDashboardVisible()||Date.now()-started>45000){
        queue();
      }
    },600);
    readyHandler=function(){queue()};
    window.addEventListener("ethone:dashboard-ready",readyHandler);
  };
  window.ethoneIsPageVisible=function(page){
    try{
      var el=document.getElementById("page-"+page);
      if(!el)return false;
      var cs=getComputedStyle(el);
      var rect=el.getBoundingClientRect();
      return el.classList.contains("active")&&cs.display!=="none"&&cs.visibility!=="hidden"&&rect.width>20&&rect.height>20;
    }catch(e){return false}
  };
  var pageReadyPending=Object.create(null);
  var pageReadyTimer=0;
  var pageReadyHandler=null;
  function pageReadyKeys(){return Object.keys(pageReadyPending)}
  function releasePageReadyRuntime(){
    if(pageReadyKeys().length)return;
    if(pageReadyTimer){clearInterval(pageReadyTimer);pageReadyTimer=0}
    if(pageReadyHandler){window.removeEventListener("ethone:page-ready",pageReadyHandler);pageReadyHandler=null}
  }
  function runPageReadyEntry(entry){
    if(!entry)return;
    delete pageReadyPending[entry.key];
    if(window[entry.doneKey]){releasePageReadyRuntime();return}
    window[entry.doneKey]=true;
    try{entry.fn()}catch(error){
      try{
        if(window.ETHONEBootManager&&typeof window.ETHONEBootManager.setStatus==="function"){
          window.ETHONEBootManager.setStatus("page-ready:"+entry.key,"failed",{error:error&&error.message?error.message:String(error)});
        }
      }catch(e){}
      console.warn("[ETHONE boot] Page-ready module failed:",entry.key,error);
    }
    releasePageReadyRuntime();
  }
  function flushPageReady(event){
    var page=event&&event.detail&&event.detail.page;
    pageReadyKeys().forEach(function(key){
      var entry=pageReadyPending[key];
      if(!entry)return;
      if(window[entry.doneKey]){delete pageReadyPending[key];return}
      var matchesEvent=page&&entry.pages.indexOf(page)>-1;
      var visible=!event&&entry.pages.some(function(name){return window.ethoneIsPageVisible(name)});
      if(matchesEvent||visible)runPageReadyEntry(entry);
    });
    releasePageReadyRuntime();
  }
  function ensurePageReadyRuntime(){
    if(!pageReadyHandler){
      pageReadyHandler=function(event){flushPageReady(event)};
      window.addEventListener("ethone:page-ready",pageReadyHandler);
    }
    if(pageReadyTimer)return;
    pageReadyTimer=setInterval(function(){
      flushPageReady(null);
      if(!pageReadyKeys().length)return;
      var now=Date.now();
      var hasFresh=pageReadyKeys().some(function(key){return now-pageReadyPending[key].started<=60000});
      if(!hasFresh){clearInterval(pageReadyTimer);pageReadyTimer=0}
    },900);
  }
  window.ethoneRunWhenPageReady=function(key,pages,fn){
    if(typeof fn!=="function")return;
    pages=Array.isArray(pages)?pages:[pages];
    var doneKey="__ethoneBootDeferred_"+key;
    if(window[doneKey])return;
    var entry={key:String(key),doneKey:doneKey,pages:pages.map(String),fn:fn,started:Date.now()};
    if(entry.pages.some(function(page){return window.ethoneIsPageVisible(page)})){runPageReadyEntry(entry);return}
    pageReadyPending[entry.key]=entry;
    ensurePageReadyRuntime();
  };
  if(!safe)return;

  document.documentElement.classList.add("ethone-safe-mode");
  window.__ethoneSkipServiceWorker=true;
  window.__ethoneSkipMarketplace=true;
  window.__ethoneSkipBrain=true;
  window.__ethoneSkipAIPreload=true;
  window.__ethoneSkipExternalWidgets=true;

  var nativeRAF=window.requestAnimationFrame;
  var nativeSetInterval=window.setInterval;
  var nativeFetch=window.fetch;
  function authBootDashboardReady(){
    return false;
    var main=document.getElementById("main-content");
    if(!main)return false;
    var cs=getComputedStyle(main);
    return cs.display!=="none"&&cs.visibility!=="hidden";
  }
  window.requestAnimationFrame=function(cb){
    if(authBootDashboardReady()&&nativeRAF)return nativeRAF.call(window,cb);
    return 0;
  };
  window.cancelAnimationFrame=window.cancelAnimationFrame||function(){};
  window.setInterval=function(fn,delay){
    delay=Number(delay)||0;
    if(authBootDashboardReady())return nativeSetInterval(fn,delay);
    if(delay<5000)return 0;
    return nativeSetInterval(fn,Math.max(delay,30000));
  };
  if(nativeFetch){
    window.fetch=function(input,init){
      var url="";
      try{url=String((input&&input.url)||input||"")}catch(e){}
      var same=!url||url.charAt(0)==="/"||url.indexOf(location.origin)===0;
      var auth=/supabase\.co|cdn\.jsdelivr\.net\/npm\/@supabase|\/supabase\//i.test(url);
      if(authBootDashboardReady())return nativeFetch.apply(this,arguments);
      if(!same&&!auth){
        return Promise.reject(new Error("ETHONE safe mode blocked non-critical request: "+url));
      }
      return nativeFetch.apply(this,arguments);
    };
  }
  if("serviceWorker" in navigator&&navigator.serviceWorker.getRegistrations){
    navigator.serviceWorker.getRegistrations().then(function(regs){
      regs.forEach(function(reg){try{reg.unregister()}catch(e){}});
    }).catch(function(){});
  }
})();
