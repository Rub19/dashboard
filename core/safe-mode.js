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
  window.ethoneRunWhenDashboardReady=function(key,fn){
    if(typeof fn!=="function")return;
    var doneKey="__ethoneBootDeferred_"+key;
    if(window[doneKey])return;
    function run(){
      if(window[doneKey])return;
      window[doneKey]=true;
      try{fn()}catch(error){setTimeout(function(){throw error},0)}
    }
    if(window.ethoneIsDashboardVisible())return run();
    var started=Date.now();
    var timer=setInterval(function(){
      if(window.ethoneIsDashboardVisible()||Date.now()-started>45000){
        clearInterval(timer);
        run();
      }
    },600);
    window.addEventListener("ethone:dashboard-ready",function(){
      clearInterval(timer);
      run();
    },{once:true});
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
  window.ethoneRunWhenPageReady=function(key,pages,fn){
    if(typeof fn!=="function")return;
    pages=Array.isArray(pages)?pages:[pages];
    var doneKey="__ethoneBootDeferred_"+key;
    if(window[doneKey])return;
    function ready(){return pages.some(function(page){return window.ethoneIsPageVisible(page)})}
    function run(){
      if(window[doneKey])return;
      window[doneKey]=true;
      try{fn()}catch(error){setTimeout(function(){throw error},0)}
    }
    if(ready())return run();
    var timer=setInterval(function(){if(ready()){clearInterval(timer);run()}},700);
    window.addEventListener("ethone:page-ready",function(event){
      if(event&&event.detail&&pages.indexOf(event.detail.page)>-1){clearInterval(timer);run()}
    });
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
