/* ETHONE Boot Manager
   Centralizes runtime-safe module execution, dependency checks and boot metrics. */
(function initEthoneBootManager(global){
  "use strict";
  if(global.ETHONEBootManager)return;

  var startedAt=Date.now();
  var bootCompletedMs=0;
  var modules=Object.create(null);
  var warned=Object.create(null);
  var activeTimers=new Set();
  var activeIntervals=new Set();
  var activeFrames=new Set();
  var observerCount=0;
  var listenerCount=0;
  var duplicateListeners=0;
  var listenerMap=typeof WeakMap==="function"?new WeakMap():null;

  function now(){return Date.now()-startedAt}
  function moduleState(id){
    id=String(id||"module");
    if(!modules[id])modules[id]={id:id,status:"waiting",loaded:false,waiting:false,failed:false,disabled:false,retry:0,duration:0,error:"",startedAt:0,updatedAt:now()};
    return modules[id];
  }
  function setStatus(id,status,extra){
    var item=moduleState(id);
    item.status=status;
    item.loaded=status==="loaded";
    item.waiting=status==="waiting";
    item.failed=status==="failed";
    item.disabled=status==="disabled";
    item.updatedAt=now();
    if(extra)Object.keys(extra).forEach(function(key){item[key]=extra[key]});
    return item;
  }
  function warnOnce(key,message,error){
    if(warned[key])return;
    warned[key]=true;
    if(error)console.warn(message,error);
    else console.warn(message);
  }
  function fn(name){
    if(typeof name==="function")return name;
    if(!name)return null;
    return typeof global[name]==="function"?global[name]:null;
  }
  function loadGroup(group){
    if(!group)return Promise.resolve(true);
    setStatus("lazy:"+group,"waiting");
    try{
      var lazy=global.ETHONELazyModules;
      if(lazy&&typeof lazy.load==="function"){
        return Promise.resolve(lazy.load(group)).then(function(){
          setStatus("lazy:"+group,"loaded");
          return true;
        }).catch(function(error){
          setStatus("lazy:"+group,"failed",{error:error&&error.message?error.message:String(error)});
          return false;
        });
      }
    }catch(error){
      setStatus("lazy:"+group,"failed",{error:error&&error.message?error.message:String(error)});
      return Promise.resolve(false);
    }
    setStatus("lazy:"+group,"disabled",{error:"Lazy loader unavailable"});
    return Promise.resolve(false);
  }
  function safeCall(id,callee,args,options){
    id=String(id||callee||"task");
    args=Array.isArray(args)?args:[];
    options=options||{};
    var started=Date.now();
    var callable=fn(callee);
    if(!callable){
      setStatus(id,options.autoLoad===false?"waiting":"waiting",{missing:String(callee||"")});
      if(options.lazyGroup&&options.autoLoad!==false){
        return loadGroup(options.lazyGroup).then(function(){
          return safeCall(id,callee,args,Object.assign({},options,{lazyGroup:null,autoLoad:false,retry:(options.retry||0)+1}));
        });
      }
      if(options.required){
        warnOnce(id+":missing","[ETHONE boot] Missing required module: "+id+" ("+callee+")");
        setStatus(id,"failed",{error:"Missing function "+callee,duration:Date.now()-started});
      }else{
        setStatus(id,"disabled",{error:"Missing optional function "+callee,duration:Date.now()-started});
      }
      return false;
    }
    setStatus(id,"waiting",{startedAt:now(),retry:options.retry||0});
    try{
      var result=callable.apply(options.thisArg||global,args);
      if(result&&typeof result.then==="function"){
        return result.then(function(value){
          setStatus(id,"loaded",{duration:Date.now()-started});
          return value;
        }).catch(function(error){
          setStatus(id,"failed",{duration:Date.now()-started,error:error&&error.message?error.message:String(error)});
          warnOnce(id+":async","[ETHONE boot] Module failed: "+id,error);
          return false;
        });
      }
      setStatus(id,"loaded",{duration:Date.now()-started});
      return result===undefined?true:result;
    }catch(error){
      setStatus(id,"failed",{duration:Date.now()-started,error:error&&error.message?error.message:String(error)});
      warnOnce(id+":throw","[ETHONE boot] Module failed: "+id,error);
      return false;
    }
  }
  function run(id,runner,options){
    return safeCall(id,runner,[],options);
  }
  function retry(id){
    var item=moduleState(id);
    item.retry=(item.retry||0)+1;
    item.status="waiting";
    item.failed=false;
    item.disabled=false;
    item.updatedAt=now();
    return item;
  }
  function disable(id,reason){
    return setStatus(id,"disabled",{error:reason||"Disabled"});
  }
  function memory(){
    try{
      var m=performance&&performance.memory;
      if(!m)return null;
      return {used:m.usedJSHeapSize,total:m.totalJSHeapSize,limit:m.jsHeapSizeLimit};
    }catch(e){return null}
  }
  function report(){
    return {
      totalBootMs:bootCompletedMs||now(),
      bootComplete:bootCompletedMs>0,
      memory:memory(),
      modules:Object.keys(modules).map(function(key){return Object.assign({},modules[key])}),
      listeners:listenerCount,
      duplicateListeners:duplicateListeners,
      timers:activeTimers.size,
      intervals:activeIntervals.size,
      animationFrames:activeFrames.size,
      observers:observerCount
    };
  }
  function patchRuntimeCounters(){
    if(global.__ethoneBootManagerPatched)return;
    global.__ethoneBootManagerPatched=true;
    var nativeSetTimeout=global.setTimeout;
    var nativeClearTimeout=global.clearTimeout;
    var nativeSetInterval=global.setInterval;
    var nativeClearInterval=global.clearInterval;
    var nativeRaf=global.requestAnimationFrame;
    var nativeCancelRaf=global.cancelAnimationFrame;
    global.setTimeout=function(callback,delay){
      if(typeof callback!=="function")return nativeSetTimeout.apply(global,arguments);
      var extra=Array.prototype.slice.call(arguments,2);
      var id=nativeSetTimeout.call(global,function(){
        activeTimers.delete(id);
        if(typeof callback==="function")return callback.apply(this,extra);
      },delay);
      activeTimers.add(id);
      return id;
    };
    global.clearTimeout=function(id){activeTimers.delete(id);return nativeClearTimeout.call(global,id)};
    global.setInterval=function(callback,delay){
      if(typeof callback!=="function")return nativeSetInterval.apply(global,arguments);
      var extra=Array.prototype.slice.call(arguments,2);
      var id=nativeSetInterval.call(global,function(){
        return callback.apply(this,extra);
      },delay);
      activeIntervals.add(id);
      return id;
    };
    global.clearInterval=function(id){activeIntervals.delete(id);return nativeClearInterval.call(global,id)};
    if(typeof nativeRaf==="function"){
      global.requestAnimationFrame=function(callback){
        var id=nativeRaf.call(global,function(ts){
          activeFrames.delete(id);
          if(typeof callback==="function")return callback(ts);
        });
        activeFrames.add(id);
        return id;
      };
      global.cancelAnimationFrame=function(id){activeFrames.delete(id);return nativeCancelRaf.call(global,id)};
    }
    if(global.EventTarget&&global.EventTarget.prototype&&global.EventTarget.prototype.addEventListener){
      var nativeAdd=global.EventTarget.prototype.addEventListener;
      var nativeRemove=global.EventTarget.prototype.removeEventListener;
      global.EventTarget.prototype.addEventListener=function(type,listener,options){
        listenerCount++;
        if(listenerMap&&listener){
          var map=listenerMap.get(this);
          if(!map){map=Object.create(null);listenerMap.set(this,map);}
          var key=String(type)+"|"+String(listener);
          if(map[key])duplicateListeners++;
          map[key]=true;
        }
        return nativeAdd.call(this,type,listener,options);
      };
      global.EventTarget.prototype.removeEventListener=function(type,listener,options){
        if(listenerMap&&listener){
          var map=listenerMap.get(this);
          if(map)delete map[String(type)+"|"+String(listener)];
        }
        return nativeRemove.call(this,type,listener,options);
      };
    }
    ["MutationObserver","ResizeObserver","IntersectionObserver"].forEach(function(name){
      var Native=global[name];
      if(typeof Native!=="function")return;
      var Wrapped=function(){
        observerCount++;
        return Reflect.construct(Native,arguments,Wrapped);
      };
      Wrapped.prototype=Native.prototype;
      try{Object.setPrototypeOf(Wrapped,Native)}catch(e){}
      global[name]=Wrapped;
    });
  }

  patchRuntimeCounters();
  global.addEventListener("ethone:boot-sequence-complete",function(event){
    var duration=event&&event.detail&&Number(event.detail.duration);
    bootCompletedMs=Math.max(1,Number.isFinite(duration)&&duration>0?duration:now());
  },{once:true});

  var api={
    startedAt:startedAt,
    module:moduleState,
    setStatus:setStatus,
    safeCall:safeCall,
    call:safeCall,
    run:run,
    loadGroup:loadGroup,
    retry:retry,
    disable:disable,
    report:report,
    status:report,
    recordModule:function(id,duration){setStatus(id,"loaded",{duration:duration||0})}
  };
  global.ETHONEBootManager=api;
  global.ETHONEBootProfiler=api;
  if(global.ETHONEBootPerf&&typeof global.ETHONEBootPerf.recordModule!=="function")global.ETHONEBootPerf.recordModule=api.recordModule;
  try{if(global.Ethone&&typeof global.Ethone.define==="function")global.Ethone.define("bootManager",api)}catch(e){}
})(window);
