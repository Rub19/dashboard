/* ETHONE Health Center */
(function(){
  "use strict";
  if(window.__ethoneHealthCenter)return;
  window.__ethoneHealthCenter=true;

  var ERROR_KEY="ethone:health-errors";
  var API_KEY="ethone:health-api-failures";
  var PAGE_KEY="ethone:health-page-metrics";
  var SAMPLE_KEY="ethone:health-monitor-samples";
  var lastScan=null;
  var timers={refresh:null};
  var storageEstimatePromise=null;
  var storageEstimateAt=0;
  var samplingActive=false;
  var performanceObservers=[];

  function esc(v){
    return String(v==null?"":v).replace(/[&<>"']/g,function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
    });
  }
  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }
  function state(){
    var p=profile();
    return p&&p.state?p.state:{};
  }
  function saveErrors(list){
    try{localStorage.setItem(ERROR_KEY,JSON.stringify((list||[]).slice(0,25)))}catch(e){}
  }
  function readErrors(){
    try{
      var list=JSON.parse(localStorage.getItem(ERROR_KEY)||"[]");
      return Array.isArray(list)?list:[];
    }catch(e){return []}
  }
  function recordError(type,message,source){
    var entry={type:type||"error",message:String(message||"Unknown error").slice(0,260),source:String(source||"runtime").slice(0,120),ts:Date.now()};
    var list=readErrors();
    list.unshift(entry);
    saveErrors(list);
    try{
      if(window.ETHONETimeline&&typeof window.ETHONETimeline.record==="function"){
        window.ETHONETimeline.record({title:"Runtime issue captured",body:entry.message,category:"error",source:"Health Center",dedupe:"health-error-"+Math.floor(entry.ts/1000)});
      }
    }catch(e){}
  }
  function saveJSON(key,list,max){
    try{localStorage.setItem(key,JSON.stringify((list||[]).slice(0,max||60)))}catch(e){}
  }
  function readJSON(key){
    try{
      var list=JSON.parse(localStorage.getItem(key)||"[]");
      return Array.isArray(list)?list:[];
    }catch(e){return []}
  }
  function recordApiFailure(url,status,message,kind,latency){
    var entry={
      url:String(url||"unknown").slice(0,220),
      status:String(status||"failed").slice(0,40),
      message:String(message||"Request failed").slice(0,220),
      kind:String(kind||"fetch").slice(0,40),
      latency:Math.round(latency||0),
      ts:Date.now()
    };
    var list=readJSON(API_KEY);
    list.unshift(entry);
    saveJSON(API_KEY,list,80);
  }
  function recordPageMetric(page,latency){
    var entry={page:String(page||"unknown").slice(0,60),latency:Math.round(latency||0),ts:Date.now()};
    var list=readJSON(PAGE_KEY).filter(function(x){return Date.now()-(x.ts||0)<1000*60*60*24*7});
    list.unshift(entry);
    saveJSON(PAGE_KEY,list,120);
  }
  function installHealthMonitor(){
    if(window.__ethoneHealthMonitorInstalled)return;
    window.__ethoneHealthMonitorInstalled=true;
    window.__ethoneHealthCounters=window.__ethoneHealthCounters||{listeners:0,intervals:0,activeIntervals:0,lagSamples:[],consoleErrors:0};
    var counters=window.__ethoneHealthCounters;
    try{
      var originalError=console.error;
      if(originalError&&!console.error.__ethoneHealthWrapped){
        console.error=function(){
          counters.consoleErrors++;
          try{recordError("console",Array.prototype.slice.call(arguments).map(function(a){return a&&a.message?a.message:String(a)}).join(" "),"console.error")}catch(e){}
          return originalError.apply(console,arguments);
        };
        console.error.__ethoneHealthWrapped=true;
      }
    }catch(e){}
    try{
      var originalFetch=window.fetch;
      if(originalFetch&&!originalFetch.__ethoneHealthWrapped){
        window.fetch=function(){
          var started=performance.now();
          var input=arguments[0];
          var url=typeof input==="string"?input:(input&&input.url)||"fetch";
          return originalFetch.apply(this,arguments).then(function(resp){
            if(resp&&!resp.ok)recordApiFailure(url,resp.status,resp.statusText||"HTTP error","fetch",performance.now()-started);
            return resp;
          }).catch(function(err){
            recordApiFailure(url,"network",err&&err.message?err.message:String(err||"Network error"),"fetch",performance.now()-started);
            throw err;
          });
        };
        window.fetch.__ethoneHealthWrapped=true;
      }
    }catch(e){}
    try{
      var originalAdd=EventTarget.prototype.addEventListener;
      if(originalAdd&&!originalAdd.__ethoneHealthWrapped){
        EventTarget.prototype.addEventListener=function(){
          counters.listeners++;
          return originalAdd.apply(this,arguments);
        };
        EventTarget.prototype.addEventListener.__ethoneHealthWrapped=true;
      }
    }catch(e){}
    try{
      var originalSetInterval=window.setInterval;
      var originalClearInterval=window.clearInterval;
      var active={};
      if(originalSetInterval&&!originalSetInterval.__ethoneHealthWrapped){
        window.setInterval=function(){
          var ref=originalSetInterval.apply(this,arguments);
          counters.intervals++;
          counters.activeIntervals++;
          active[ref]=true;
          return ref;
        };
        window.setInterval.__ethoneHealthWrapped=true;
        window.clearInterval=function(ref){
          if(active[ref]){delete active[ref];counters.activeIntervals=Math.max(0,counters.activeIntervals-1)}
          return originalClearInterval.apply(this,arguments);
        };
      }
    }catch(e){}
    try{
      window.addEventListener("error",function(e){
        var target=e&&e.target;
        if(target&&target!==window){
          var url=target.src||target.href||target.currentSrc||target.id||target.tagName;
          recordApiFailure(url,"resource","Resource failed to load","resource",0);
        }
      },true);
    }catch(e){}
    installPageMonitor();
  }
  function installPerformanceObservers(){
    if(performanceObservers.length)return;
    window.__ethoneHealthPerfObserversInstalled=true;
    window.__ethoneHealthLongTasks=window.__ethoneHealthLongTasks||[];
    window.__ethoneHealthPaints=window.__ethoneHealthPaints||{};
    window.__ethoneHealthObservers=window.__ethoneHealthObservers||[];
    try{
      if("PerformanceObserver" in window){
        var longTaskObserver=new PerformanceObserver(function(list){
          list.getEntries().forEach(function(entry){
            window.__ethoneHealthLongTasks.push({name:entry.name||"longtask",duration:Math.round(entry.duration||0),start:Math.round(entry.startTime||0),ts:Date.now()});
          });
          window.__ethoneHealthLongTasks=window.__ethoneHealthLongTasks.slice(-80);
        });
        longTaskObserver.observe({entryTypes:["longtask"]});
        performanceObservers.push(longTaskObserver);
        window.__ethoneHealthObservers.push(longTaskObserver);
      }
    }catch(e){}
    try{
      if("PerformanceObserver" in window){
        var paintObserver=new PerformanceObserver(function(list){
          list.getEntries().forEach(function(entry){
            window.__ethoneHealthPaints[entry.name]=Math.round(entry.startTime||0);
          });
        });
        paintObserver.observe({entryTypes:["paint"]});
        performanceObservers.push(paintObserver);
        window.__ethoneHealthObservers.push(paintObserver);
      }
    }catch(e){}
  }
  function healthPageActive(){
    var page=document.getElementById("page-health");
    return !!(page&&page.classList.contains("active")&&!document.hidden);
  }
  function startHealthSampling(){
    if(samplingActive||!healthPageActive())return;
    samplingActive=true;
    var counters=window.__ethoneHealthCounters||{lagSamples:[]};
    try{
      var lagLast=performance.now();
      window.__ethoneHealthLagTimer=setInterval(function(){
        var now=performance.now();
        var lag=Math.max(0,now-lagLast-2500);
        lagLast=now;
        counters.lagSamples.push(lag);
        counters.lagSamples=counters.lagSamples.slice(-30);
      },2500);
    }catch(e){}
    installPerformanceObservers();
    if(timers.refresh)clearInterval(timers.refresh);
    timers.refresh=setInterval(function(){if(healthPageActive())renderHealthPage()},30000);
  }
  function stopHealthSampling(){
    samplingActive=false;
    if(window.__ethoneHealthLagTimer)clearInterval(window.__ethoneHealthLagTimer);
    window.__ethoneHealthLagTimer=null;
    if(timers.refresh)clearInterval(timers.refresh);
    timers.refresh=null;
    performanceObservers.forEach(function(observer){try{observer.disconnect()}catch(e){}});
    performanceObservers=[];
    window.__ethoneHealthObservers=[];
    window.__ethoneHealthPerfObserversInstalled=false;
  }
  function installPageMonitor(){
    if(typeof window.switchPage!=="function"||window.switchPage.__healthWrapped)return;
    var old=window.switchPage;
    window.switchPage=function(page,navEl){
      var started=performance.now();
      var result=old.apply(this,arguments);
      requestAnimationFrame(function(){
        setTimeout(function(){recordPageMetric(page,performance.now()-started)},0);
      });
      return result;
    };
    window.switchPage.__healthWrapped=true;
  }

  window.addEventListener("error",function(e){
    recordError("error",e.message||"Script error",e.filename||"window");
  });
  window.addEventListener("unhandledrejection",function(e){
    var reason=e&&e.reason;
    recordError("promise",reason&&reason.message?reason.message:String(reason||"Unhandled promise rejection"),"promise");
  });

  function status(score){
    if(score>=94)return {key:"excellent",title:"Excellent",label:"ETHONE fonctionne avec une marge saine.",tone:"good"};
    if(score>=86)return {key:"ok",title:"Stable",label:"Tout fonctionne correctement.",tone:"good"};
    if(score>=74)return {key:"watch",title:"A surveiller",label:"Quelques points demandent attention.",tone:"warn"};
    return {key:"critical",title:"Critique",label:"ETHONE necessite un diagnostic.",tone:"bad"};
  }
  function bytes(n){
    n=Number(n)||0;
    if(n>1024*1024*1024)return (n/1024/1024/1024).toFixed(1)+" GB";
    if(n>1024*1024)return (n/1024/1024).toFixed(1)+" MB";
    if(n>1024)return (n/1024).toFixed(1)+" KB";
    return n+" B";
  }
  function pushIssue(out,severity,title,body,area,action){
    out.push({severity:severity||"info",title:title,body:body||"",area:area||"System",action:action||""});
  }
  function connectedValue(value){
    if(!value)return false;
    if(typeof value==="string")return !!value.trim();
    if(Array.isArray(value))return value.length>0;
    if(typeof value==="object")return Object.keys(value).some(function(k){
      var v=value[k];
      return typeof v==="boolean"?v:!!v;
    });
    return !!value;
  }
  function integrationRows(s,issues){
    var con=s.connections||{};
    var specs=[
      ["discord","Discord","message-circle","Presence and community context"],
      ["spotify","Spotify","music","Music and focus context"],
      ["github","GitHub","git-branch","Developer activity"],
      ["steam","Steam","gamepad-2","Gaming sessions"],
      ["twitch","Twitch","tv","Streaming status"],
      ["lastfm","Last.fm","radio","Listening history"],
      ["googlecalendar","Google Calendar","calendar-days","Planning sync"],
      ["googledrive","Google Drive","folder","Files sync"]
    ];
    return specs.map(function(row){
      var id=row[0],connected=connectedValue(con[id]);
      if((id==="spotify"||id==="github")&&!connected)pushIssue(issues,"warn",row[1]+" deconnecte",row[3]+" indisponible pour Brain OS.","Integrations","Connecter "+row[1]);
      return {id:id,name:row[1],icon:row[2],desc:row[3],state:connected?"connected":"disconnected",label:connected?"Connecte":"Non connecte"};
    });
  }
  function pluginRows(s,issues){
    var plugins=s.plugins||{};
    var defs=[];
    try{
      if(window.ETHONEPluginHub&&Array.isArray(window.ETHONEPluginHub.plugins))defs=window.ETHONEPluginHub.plugins.slice();
    }catch(e){}
    var ids=Object.keys(plugins);
    defs.forEach(function(def){if(def&&def.id&&ids.indexOf(def.id)===-1)ids.push(def.id)});
    var rows=ids.map(function(id){
      var p=plugins[id]||{};
      var def=defs.find(function(item){return item&&item.id===id})||{};
      var installed=!!p.installed;
      var enabled=!!p.enabled;
      var bad=p.status==="error"||p.status==="failed";
      var soon=def.ready===false;
      if(installed&&!enabled)pushIssue(issues,"warn","Plugin desactive: "+(def.name||id),"Le plugin est installe mais inactif.","Plugins","Activer ou reparer");
      if(bad)pushIssue(issues,"bad","Plugin en erreur: "+(def.name||id),"Le dernier statut indique un echec.","Plugins","Reparer");
      return {id:id,name:def.name||id,icon:def.icon||"plug",installed:installed,ready:def.ready!==false,state:bad?"error":soon?"pending":enabled?"connected":installed?"pending":"disconnected",label:bad?"Erreur":soon?"Pret API":enabled?"Actif":installed?"Installe":"Disponible",memory:p.memory||p.memoryMb||def.memory||0};
    });
    if(!rows.length)rows.push({id:"none",name:"Aucun plugin installe",state:"pending",label:"Disponible",memory:0});
    return rows;
  }
  function apiRows(s,issues){
    var con=s.connections||{};
    var aiConfig=null;
    try{aiConfig=JSON.parse(localStorage.getItem("ethone:ai-core:v1")||"null")}catch(e){}
    var aiProviders=aiConfig&&aiConfig.providers||{};
    var providers=[
      ["groq","Groq",con.groqKey||con.groq&&con.groq.key||aiProviders.groq&&aiProviders.groq.apiKey],
      ["openai","OpenAI",con.openaiKey||con.openai&&con.openai.key||aiProviders.openai&&aiProviders.openai.apiKey],
      ["anthropic","Claude",con.claudeKey||con.claude&&con.claude.key||aiProviders.anthropic&&aiProviders.anthropic.apiKey],
      ["gemini","Gemini",con.geminiKey||con.gemini&&con.gemini.key||aiProviders.gemini&&aiProviders.gemini.apiKey],
      ["openrouter","OpenRouter",con.openrouterKey||con.openrouter&&con.openrouter.key||aiProviders.openrouter&&aiProviders.openrouter.apiKey],
      ["ollama","Ollama",con.ollama&&con.ollama.url||aiProviders.ollama&&aiProviders.ollama.endpoint]
    ];
    var rows=providers.map(function(p){
      var ok=connectedValue(p[2]);
      return {id:p[0],name:p[1],state:ok?"connected":"disconnected",label:ok?"Configure":"Non configure"};
    });
    if(!rows.some(function(row){return row.state==="connected"})){
      pushIssue(issues,"warn","Aucun provider IA configure","ETHONE AI Core n'a pas encore de provider disponible.","API","Configurer un provider");
    }
    return rows;
  }
  function storageInfo(issues){
    var used=0,keys=0,quota=0;
    try{
      keys=localStorage.length;
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);
        used+=String(k||"").length+String(localStorage.getItem(k)||"").length;
      }
    }catch(e){pushIssue(issues,"warn","Stockage local limite","Impossible de lire completement localStorage.","Stockage","Verifier le navigateur")}
    var estimate={used:used,quota:quota,keys:keys,ratio:0,label:bytes(used)};
    if(navigator&&navigator.storage&&navigator.storage.estimate){
      estimate.async=true;
      var shouldRefresh=Date.now()-storageEstimateAt>60000;
      if(shouldRefresh&&!storageEstimatePromise){
        storageEstimateAt=Date.now();
        storageEstimatePromise=navigator.storage.estimate().then(function(v){
          try{
            var hadEstimate=!!window.__ethoneStorageEstimate;
            window.__ethoneStorageEstimate={used:v.usage||used,quota:v.quota||0};
            if(!hadEstimate&&document.getElementById("page-health")?.classList.contains("active")){
              setTimeout(renderHealthPage,0);
            }
          }catch(e){}
        }).catch(function(){}).then(function(){storageEstimatePromise=null});
      }
    }
    var asyncEstimate=window.__ethoneStorageEstimate;
    if(asyncEstimate){
      estimate.used=asyncEstimate.used||used;
      estimate.quota=asyncEstimate.quota||0;
      estimate.ratio=estimate.quota?estimate.used/estimate.quota:0;
      estimate.label=bytes(estimate.used);
      if(estimate.ratio>.82)pushIssue(issues,"warn","Stockage presque plein","ETHONE utilise "+Math.round(estimate.ratio*100)+"% du quota disponible.","Stockage","Exporter ou nettoyer");
    }
    return estimate;
  }
  function memoryInfo(issues){
    var mem=performance&&performance.memory?performance.memory:null;
    if(!mem)return {available:false,label:"Non exposee",ratio:0,used:0,limit:0};
    var ratio=mem.jsHeapSizeLimit?mem.usedJSHeapSize/mem.jsHeapSizeLimit:0;
    if(ratio>.7)pushIssue(issues,"warn","Memoire elevee","Le heap JavaScript utilise "+Math.round(ratio*100)+"% de la limite exposee.","Memoire","Fermer les panneaux lourds");
    return {available:true,label:bytes(mem.usedJSHeapSize)+" / "+bytes(mem.jsHeapSizeLimit),ratio:ratio,used:mem.usedJSHeapSize,limit:mem.jsHeapSizeLimit};
  }
  function performanceInfo(issues){
    var nav=null;
    try{nav=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0]}catch(e){}
    var load=nav?Math.round(nav.loadEventEnd||nav.domContentLoadedEventEnd||0):0;
    var domReady=nav?Math.round(nav.domContentLoadedEventEnd||nav.domInteractive||0):0;
    var response=nav?Math.round((nav.responseEnd||0)-(nav.requestStart||0)):0;
    var paints=window.__ethoneHealthPaints||{};
    var fcp=paints["first-contentful-paint"]||0;
    var resources=0;
    try{resources=performance.getEntriesByType("resource").length}catch(e){}
    if(load>5000)pushIssue(issues,"warn","Demarrage lent","Le chargement a pris environ "+load+" ms.","Performance","Verifier les scripts lourds");
    if(fcp>2500)pushIssue(issues,"warn","Premier rendu lent","Le premier rendu utile est mesure autour de "+fcp+" ms.","Chargement","Reduire les scripts initiaux");
    if(resources>260)pushIssue(issues,"warn","Beaucoup de ressources","ETHONE a observe "+resources+" ressources chargees.","Performance","Surveiller le bundle");
    return {load:load,domReady:domReady,response:response,fcp:fcp,resources:resources,online:navigator?navigator.onLine!==false:true};
  }
  function cpuInfo(issues){
    var counters=window.__ethoneHealthCounters||{lagSamples:[]};
    var samples=Array.isArray(counters.lagSamples)?counters.lagSamples.slice(-30):[];
    var avgLag=samples.length?samples.reduce(function(a,b){return a+b},0)/samples.length:0;
    var maxLag=samples.length?Math.max.apply(Math,samples):0;
    var longTasks=(window.__ethoneHealthLongTasks||[]).filter(function(x){return Date.now()-(x.ts||0)<1000*60*10});
    var longTotal=longTasks.reduce(function(sum,item){return sum+(item.duration||0)},0);
    var cores=(navigator&&navigator.hardwareConcurrency)||0;
    var pressure=Math.min(100,Math.round((avgLag/2.2)+(maxLag/6)+(longTasks.length*3)+(longTotal/180)));
    if(pressure>70)pushIssue(issues,"bad","CPU sous pression","Lag moyen "+Math.round(avgLag)+" ms, "+longTasks.length+" long tasks recentes.","CPU","Reduire animations ou modules actifs");
    else if(pressure>42)pushIssue(issues,"warn","CPU a surveiller","ETHONE detecte une reactivite plus faible que normal.","CPU","Fermer les panneaux lourds");
    return {pressure:pressure,avgLag:Math.round(avgLag),maxLag:Math.round(maxLag),longTasks:longTasks.length,longTaskTime:Math.round(longTotal),cores:cores,label:pressure+"%"};
  }
  function isVisible(el){
    if(!el||!el.isConnected)return false;
    var s=getComputedStyle(el);
    if(s.display==="none"||s.visibility==="hidden"||Number(s.opacity)===0)return false;
    var r=el.getBoundingClientRect();
    return r.width>0&&r.height>0;
  }
  function scanButtons(issues){
    var buttons=Array.prototype.slice.call(document.querySelectorAll("button,a[role='button'],[onclick]")).filter(isVisible);
    var missing=[],placeholder=[],disabled=0;
    buttons.forEach(function(btn){
      if(btn.disabled||btn.getAttribute("aria-disabled")==="true")disabled++;
      var raw=btn.getAttribute("onclick")||"";
      var href=btn.getAttribute("href")||"";
      var text=(btn.textContent||btn.title||btn.getAttribute("aria-label")||"").replace(/\s+/g," ").trim().slice(0,80);
      if(raw){
        var calls=Array.prototype.slice.call(raw.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g));
        calls.forEach(function(call){
          var fn=call[2];
          if(["if","for","while","switch","function","setTimeout","setInterval","requestAnimationFrame","Number","String","Boolean","Array","Object","parseInt","parseFloat","isNaN","Math","Date","confirm","alert"].indexOf(fn)>-1)return;
          if(raw.indexOf("window.")>-1||raw.indexOf("?.")>-1)return;
          if(typeof window[fn]!=="function")missing.push({label:text||fn,handler:fn});
        });
      }
      if(href==="#"||/javascript:void\(0\)/i.test(href)||/coming soon|bientot|soon/i.test(text))placeholder.push({label:text||href});
    });
    if(missing.length)pushIssue(issues,"bad",missing.length+" bouton(s) avec handler manquant","Des boutons visibles appellent une fonction introuvable.","Boutons","Corriger les handlers");
    if(placeholder.length)pushIssue(issues,"warn",placeholder.length+" bouton(s) placeholder","Certains boutons semblent pointer vers une action vide.","Boutons","Ajouter feedback ou action");
    return {total:buttons.length,missing:missing.slice(0,12),placeholder:placeholder.slice(0,12),disabled:disabled};
  }
  function scanWidgets(issues){
    var selectors=[
      "[id*='widget']",".overview-widget",".d4-widget",".sb-widget-card",".lp-catalog-widget",
      "#weather-widget","#quote-widget","#countdown-widget","#overview-todos","#overview-events"
    ];
    var seen=[],nodes=[];
    selectors.forEach(function(sel){
      Array.prototype.slice.call(document.querySelectorAll(sel)).forEach(function(n){
        if(seen.indexOf(n)>-1)return;
        seen.push(n);nodes.push(n);
      });
    });
    var visible=nodes.filter(isVisible);
    var broken=[];
    visible.forEach(function(n){
      var txt=(n.textContent||"").replace(/\s+/g," ").trim();
      if(/loading|chargement|failed|error|erreur|undefined|nan|cannot|coming soon/i.test(txt)){
        broken.push({id:n.id||n.className||n.tagName,text:txt.slice(0,110)});
      }
      if(n.querySelector("iframe")&&n.querySelector("iframe").dataset.healthFailed==="1"){
        broken.push({id:n.id||"iframe",text:"Iframe failed"});
      }
    });
    if(broken.length)pushIssue(issues,broken.length>3?"bad":"warn",broken.length+" widget(s) suspects","Certains widgets affichent loading, erreur, undefined ou NaN.","Widgets","Recharger ou isoler le widget");
    return {total:visible.length,broken:broken.slice(0,12)};
  }
  function pagePerformanceInfo(issues){
    var list=readJSON(PAGE_KEY);
    var byPage={};
    list.forEach(function(x){
      if(!byPage[x.page])byPage[x.page]=[];
      byPage[x.page].push(x.latency||0);
    });
    var rows=Object.keys(byPage).map(function(page){
      var arr=byPage[page].slice(0,12);
      var avg=arr.reduce(function(a,b){return a+b},0)/Math.max(1,arr.length);
      return {page:page,avg:Math.round(avg),last:arr[0]||0,count:arr.length};
    }).sort(function(a,b){return b.avg-a.avg});
    var slow=rows.filter(function(r){return r.avg>700});
    if(slow.length)pushIssue(issues,slow.length>2?"bad":"warn",slow.length+" page(s) lente(s)","Certaines transitions de pages depassent 700 ms en moyenne.","Pages","Optimiser le rendu");
    return {rows:rows.slice(0,10),slow:slow.slice(0,8)};
  }
  function apiFailureInfo(issues){
    var list=readJSON(API_KEY).filter(function(x){return Date.now()-(x.ts||0)<1000*60*60*24});
    var grouped={};
    list.forEach(function(x){
      var key=(x.kind||"api")+"|"+(x.url||"unknown").replace(/[?#].*$/,"").slice(0,90);
      if(!grouped[key])grouped[key]={url:x.url,status:x.status,kind:x.kind,count:0,last:x.ts,message:x.message};
      grouped[key].count++;
      grouped[key].last=Math.max(grouped[key].last,x.ts||0);
    });
    var rows=Object.keys(grouped).map(function(k){return grouped[k]}).sort(function(a,b){return b.last-a.last});
    if(rows.length)pushIssue(issues,rows.length>5?"bad":"warn",rows.length+" API/ressource indisponible(s)","Des requetes ou assets ont echoue dans les dernieres 24h.","API","Verifier reseau/cache");
    return {rows:rows.slice(0,12),total:list.length};
  }
  function leakInfo(issues){
    var counters=window.__ethoneHealthCounters||{listeners:0,intervals:0,activeIntervals:0,lagSamples:[]};
    var domNodes=document.getElementsByTagName("*").length;
    var avgLag=0;
    if(counters.lagSamples&&counters.lagSamples.length){
      avgLag=counters.lagSamples.reduce(function(a,b){return a+b},0)/counters.lagSamples.length;
    }
    var signals=[];
    if(domNodes>6500)signals.push("DOM eleve: "+domNodes);
    if(counters.activeIntervals>35)signals.push("Intervals actifs: "+counters.activeIntervals);
    if(counters.listeners>1400)signals.push("Listeners ajoutes: "+counters.listeners);
    if(avgLag>120)signals.push("Lag moyen: "+Math.round(avgLag)+" ms");
    if(signals.length)pushIssue(issues,signals.length>2?"bad":"warn","Risque de fuite memoire","Signaux detectes: "+signals.join(", ")+".","Memoire","Verifier listeners/timers");
    return {domNodes:domNodes,listeners:counters.listeners||0,intervals:counters.activeIntervals||0,totalIntervals:counters.intervals||0,avgLag:Math.round(avgLag),signals:signals};
  }
  function syncInfo(s,issues){
    var last=s.lastSyncAt||s.cloudSyncAt||s.updatedAt||s.savedAt||0;
    var age=last?Date.now()-new Date(last).getTime():0;
    var stateText=last?("Derniere sync "+new Date(last).toLocaleString()):"Aucune sync recente";
    if(!last)pushIssue(issues,"info","Synchronisation non verifiee","Aucune date de synchronisation persistante detectee.","Synchronisation","Sauvegarder le profil");
    else if(age>1000*60*60*24)pushIssue(issues,"warn","Synchronisation ancienne","La derniere synchronisation date de plus de 24h.","Synchronisation","Forcer une sauvegarde");
    return {last:last,age:age,label:stateText,state:last?"connected":"pending"};
  }
  function scan(){
    var s=state();
    var issues=[];
    var perf=performanceInfo(issues);
    var cpu=cpuInfo(issues);
    var mem=memoryInfo(issues);
    var storage=storageInfo(issues);
    var errors=readErrors();
    var integrations=integrationRows(s,issues);
    var plugins=pluginRows(s,issues);
    var apis=apiRows(s,issues);
    var sync=syncInfo(s,issues);
    var buttons=scanButtons(issues);
    var widgets=scanWidgets(issues);
    var pages=pagePerformanceInfo(issues);
    var apiFailures=apiFailureInfo(issues);
    var leaks=leakInfo(issues);
    if(errors.length){
      var recent=errors.filter(function(e){return Date.now()-(e.ts||0)<1000*60*60*24});
      if(recent.length)pushIssue(issues,recent.length>4?"bad":"warn",recent.length+" erreur(s) recente(s)","Des erreurs runtime ont ete capturees dans les dernieres 24h.","Erreurs","Ouvrir le detail");
    }
    var score=100;
    issues.forEach(function(i){score-=i.severity==="bad"?14:i.severity==="warn"?7:3});
    if(mem.ratio>.7)score-=5;
    if(cpu.pressure>70)score-=12;
    else if(cpu.pressure>42)score-=6;
    if(storage.ratio>.82)score-=7;
    if(widgets.broken.length)score-=Math.min(16,widgets.broken.length*4);
    if(buttons.missing.length)score-=Math.min(20,buttons.missing.length*6);
    if(pages.slow.length)score-=Math.min(12,pages.slow.length*4);
    if(apiFailures.rows.length)score-=Math.min(14,apiFailures.rows.length*3);
    if(leaks.signals.length)score-=Math.min(18,leaks.signals.length*5);
    if(!perf.online)score-=18;
    if(perf.fcp>2500)score-=6;
    score=Math.max(0,Math.min(100,score));
    var st=status(score);
    lastScan={score:score,status:st,perf:perf,cpu:cpu,memory:mem,storage:storage,errors:errors,integrations:integrations,plugins:plugins,apis:apis,sync:sync,buttons:buttons,widgets:widgets,pages:pages,apiFailures:apiFailures,leaks:leaks,issues:issues,at:Date.now()};
    saveSample(lastScan);
    return lastScan;
  }
  function saveSample(data){
    try{
      var list=JSON.parse(localStorage.getItem(SAMPLE_KEY)||"[]");
      if(!Array.isArray(list))list=[];
      var last=list[0];
      if(last&&Date.now()-(last.ts||0)<25000)return;
      list.unshift({ts:Date.now(),score:data.score,cpu:data.cpu.pressure,memory:Math.round((data.memory.ratio||0)*100),load:data.perf.load||0,errors:data.errors.length,api:data.apiFailures.total||0});
      localStorage.setItem(SAMPLE_KEY,JSON.stringify(list.slice(0,96)));
    }catch(e){}
  }
  function ensurePage(){
    if(document.getElementById("page-health"))return;
    var anchor=document.getElementById("page-activity")||document.getElementById("page-github")||document.querySelector(".tab-content:last-of-type");
    var page=document.createElement("div");
    page.id="page-health";
    page.className="tab-content";
    page.setAttribute("role","tabpanel");
    page.setAttribute("aria-live","polite");
    page.setAttribute("data-qa-page","true");
    page.innerHTML='<div class="health-page" id="health-page-root"></div>';
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(page,anchor.nextSibling);
    else document.getElementById("main-content")?.appendChild(page);
  }
  function gauge(score,tone){
    var title=lastScan&&lastScan.status&&lastScan.status.title||"Health";
    return '<div class="health-gauge '+esc(tone)+'" style="--health-score:'+score+'"><div><strong>'+score+'%</strong><span>'+esc(title)+'</span></div></div>';
  }
  function metric(label,value,sub,icon,tone){
    return '<article class="health-metric '+esc(tone||"")+'"><i data-lucide="'+esc(icon||"activity")+'"></i><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(sub||"")+'</small></article>';
  }
  function issueHTML(i){
    return '<article class="health-issue '+esc(i.severity)+'"><div><span>'+esc(i.area)+'</span><strong>'+esc(i.title)+'</strong><p>'+esc(i.body)+'</p></div>'+(i.action?'<em>'+esc(i.action)+'</em>':'')+'</article>';
  }
  function rowHTML(item){
    return '<div class="health-row '+esc(item.state)+'"><span><i data-lucide="'+esc(item.icon||"circle")+'"></i><strong>'+esc(item.name)+'</strong></span><em>'+esc(item.label)+'</em></div>';
  }
  function diagRow(title,sub,value,tone,icon){
    return '<div class="health-diagnostic-row '+esc(tone||"")+'"><span><i data-lucide="'+esc(icon||"activity")+'"></i><strong>'+esc(title)+'</strong><small>'+esc(sub||"")+'</small></span><em>'+esc(value||"OK")+'</em></div>';
  }
  function detailRows(rows,empty,mapper){
    if(!rows||!rows.length)return '<div class="health-empty compact"><strong>'+esc(empty||"Aucun signal")+'</strong><span>Le diagnostic est propre.</span></div>';
    return rows.map(mapper).join("");
  }
  function readSamples(){
    try{
      var list=JSON.parse(localStorage.getItem(SAMPLE_KEY)||"[]");
      return Array.isArray(list)?list.slice(0,18):[];
    }catch(e){return []}
  }
  function sparkline(values,key){
    if(!values.length)return '<div class="health-spark empty"></div>';
    return '<div class="health-spark" aria-hidden="true">'+values.slice().reverse().map(function(item){
      var value=Math.max(4,Math.min(100,Number(item[key])||0));
      return '<i style="height:'+value+'%"></i>';
    }).join("")+'</div>';
  }
  function renderHealthPage(){
    ensurePage();
    var data=scan();
    var root=document.getElementById("health-page-root");
    if(!root)return;
    var memValue=data.memory.available?Math.round(data.memory.ratio*100)+"%":"N/A";
    var storageValue=data.storage.quota?Math.round(data.storage.ratio*100)+"%":data.storage.label;
    var loadValue=data.perf.load?data.perf.load+" ms":"OK";
    var fcpValue=data.perf.fcp?data.perf.fcp+" ms":"N/A";
    var pluginProblems=data.plugins.filter(function(p){return p.state==="error"||(p.installed&&p.state==="pending")}).length;
    var samples=readSamples();
    var widgetValue=data.widgets.broken.length?data.widgets.broken.length+" broken":"OK";
    var buttonValue=data.buttons.missing.length?data.buttons.missing.length+" dead":"OK";
    var apiValue=data.apiFailures.rows.length?data.apiFailures.rows.length+" fail":"OK";
    var leakValue=data.leaks.signals.length?data.leaks.signals.length+" signal":"OK";
    root.innerHTML=
      '<section class="health-hero">'+
        '<div class="health-copy"><div class="health-kicker">ETHONE Health Monitor</div><h1>ETHONE Health</h1><p><strong>'+esc(data.score+'% '+data.status.title)+'.</strong> '+esc(data.status.label)+'</p><div class="health-hero-actions"><button class="btn btn-primary" type="button" data-health-refresh>Relancer le diagnostic</button><button class="btn btn-ghost" type="button" data-health-clear-errors>Effacer les erreurs</button><button class="btn btn-ghost" type="button" data-health-clear-api>Effacer API logs</button></div></div>'+
        gauge(data.score,data.status.tone)+
      '</section>'+
      '<section class="health-monitor-strip">'+
        '<article><span>Score</span><strong>'+esc(data.score)+'%</strong>'+sparkline(samples,"score")+'</article>'+
        '<article><span>CPU</span><strong>'+esc(data.cpu.label)+'</strong>'+sparkline(samples,"cpu")+'</article>'+
        '<article><span>Memoire</span><strong>'+esc(memValue)+'</strong>'+sparkline(samples,"memory")+'</article>'+
        '<article><span>Load</span><strong>'+esc(loadValue)+'</strong>'+sparkline(samples,"load")+'</article>'+
      '</section>'+
      '<section class="health-metrics">'+
        metric("CPU",data.cpu.label,data.cpu.cores?data.cpu.cores+" coeurs / "+data.cpu.avgLag+" ms lag":"Event loop "+data.cpu.avgLag+" ms","cpu",data.cpu.pressure>70?"bad":data.cpu.pressure>42?"warn":"good")+
        metric("Memoire",memValue,data.memory.label,"memory-stick",data.memory.ratio>.7?"warn":"good")+
        metric("API",apiValue,data.apiFailures.total+" echecs 24h / "+data.apis.filter(function(x){return x.state==="connected"}).length+" providers","cloud-off",data.apiFailures.rows.length?"warn":"good")+
        metric("Plugins",pluginProblems?pluginProblems+" attention":"OK",data.plugins.length+" plugins surveilles","plug",pluginProblems?"warn":"good")+
        metric("Erreurs",String(data.errors.length),data.errors.length?"Capturees par Health Monitor":"Aucune erreur recente","bug",data.errors.length?"warn":"good")+
        metric("Temps de chargement",loadValue,"DOM "+data.perf.domReady+" ms / FCP "+fcpValue,"timer",data.perf.load>5000||data.perf.fcp>2500?"warn":"good")+
        metric("Performances",data.pages.slow.length?data.pages.slow.length+" lente(s)":"OK",data.perf.resources+" ressources / "+data.pages.rows.length+" pages","gauge",data.pages.slow.length?"warn":"good")+
        metric("Stockage",storageValue,data.storage.keys+" entrees locales","database",data.storage.ratio>.82?"warn":"good")+
        metric("Widgets",widgetValue,data.widgets.total+" widgets visibles","layout-dashboard",data.widgets.broken.length?"warn":"good")+
        metric("Boutons",buttonValue,data.buttons.total+" controles visibles","mouse-pointer-click",data.buttons.missing.length?"bad":data.buttons.placeholder.length?"warn":"good")+
        metric("Pages lentes",String(data.pages.slow.length),data.pages.rows.length+" pages mesurees","timer",data.pages.slow.length?"warn":"good")+
        metric("Fuites",leakValue,data.leaks.domNodes+" DOM nodes","radar",data.leaks.signals.length?"warn":"good")+
      '</section>'+
      '<section class="health-grid">'+
        '<article class="health-panel health-issues"><div class="health-panel-head"><div><h2>Attention</h2><p>Les signaux qui peuvent impacter ETHONE.</p></div><span>'+data.issues.length+'</span></div><div class="health-issue-list">'+(data.issues.length?data.issues.map(issueHTML).join(""):'<div class="health-empty"><i data-lucide="circle-check"></i><strong>Aucun probleme critique</strong><span>ETHONE fonctionne correctement.</span></div>')+'</div></article>'+
        '<article class="health-panel health-dashboard"><div class="health-panel-head"><div><h2>Dashboard Integrity</h2><p>Widgets, boutons morts, pages lentes et signaux de fuite.</p></div></div><div class="health-diagnostic-list">'+
          diagRow("Widgets",data.widgets.broken.length?data.widgets.broken.length+" widget(s) suspect(s)":"Aucun widget casse",data.widgets.total+" total",data.widgets.broken.length?"warn":"good","layout-dashboard")+
          diagRow("Boutons",data.buttons.missing.length?data.buttons.missing.length+" handler(s) manquant(s)":"Handlers OK",data.buttons.total+" boutons",data.buttons.missing.length?"bad":"good","mouse-pointer-click")+
          diagRow("CPU",data.cpu.pressure>42?"Pression detectee":"CPU stable",data.cpu.longTasks+" long tasks / "+data.cpu.longTaskTime+" ms",data.cpu.pressure>70?"bad":data.cpu.pressure>42?"warn":"good","cpu")+
          diagRow("Chargement",data.perf.load>5000?"Demarrage lent":"Chargement OK","Load "+data.perf.load+" ms / FCP "+fcpValue,data.perf.load>5000||data.perf.fcp>2500?"warn":"good","timer")+
          diagRow("Pages",data.pages.slow.length?data.pages.slow.length+" transition(s) lente(s)":"Transitions OK",data.pages.rows.length+" mesurees",data.pages.slow.length?"warn":"good","timer")+
          diagRow("Memory leaks",data.leaks.signals.length?data.leaks.signals.join(" / "):"Aucun signal fort",data.leaks.avgLag+" ms lag",data.leaks.signals.length?"warn":"good","radar")+
        '</div></article>'+
        '<article class="health-panel"><div class="health-panel-head"><div><h2>Integrations</h2><p>Discord, Spotify, GitHub et services connectes.</p></div></div><div class="health-list">'+data.integrations.map(rowHTML).join("")+'</div></article>'+
        '<article class="health-panel"><div class="health-panel-head"><div><h2>API & IA</h2><p>Providers disponibles pour ETHONE AI Core.</p></div></div><div class="health-list">'+data.apis.map(rowHTML).join("")+'</div></article>'+
        '<article class="health-panel"><div class="health-panel-head"><div><h2>API indisponibles</h2><p>Fetch, scripts, images et ressources echouees.</p></div><span>'+data.apiFailures.rows.length+'</span></div><div class="health-error-list">'+detailRows(data.apiFailures.rows,"Aucune API indisponible",function(x){return '<div class="health-error api"><strong>'+esc(x.url)+'</strong><span>'+esc(x.kind)+' · '+esc(x.status)+' · '+esc(x.count)+' fois · '+esc(x.message)+'</span></div>'})+'</div></article>'+
        '<article class="health-panel"><div class="health-panel-head"><div><h2>Pages lentes</h2><p>Mesures de transition entre pages.</p></div><span>'+data.pages.rows.length+'</span></div><div class="health-error-list">'+detailRows(data.pages.rows,"Aucune page lente mesuree",function(x){return '<div class="health-error page"><strong>'+esc(x.page)+'</strong><span>'+esc(x.avg)+' ms moyen · '+esc(x.count)+' mesure(s) · dernier '+esc(x.last)+' ms</span></div>'})+'</div></article>'+
        '<article class="health-panel"><div class="health-panel-head"><div><h2>Plugins</h2><p>Etat des extensions installees.</p></div></div><div class="health-list">'+data.plugins.slice(0,8).map(rowHTML).join("")+'</div></article>'+
        '<article class="health-panel health-sync"><div class="health-panel-head"><div><h2>Synchronisation</h2><p>'+esc(data.sync.label)+'</p></div><span class="'+esc(data.sync.state)+'">'+(data.sync.state==="connected"?"OK":"A verifier")+'</span></div><div class="health-sync-grid">'+metric("Online",data.perf.online?"Oui":"Non","Etat reseau navigateur","wifi",data.perf.online?"good":"bad")+metric("Dernier scan",new Date(data.at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),"Diagnostic local","refresh-cw","good")+'</div></article>'+
        '<article class="health-panel health-errors"><div class="health-panel-head"><div><h2>Erreurs recentes</h2><p>Capture locale des erreurs JS et promesses.</p></div></div><div class="health-error-list">'+(data.errors.length?data.errors.slice(0,6).map(function(e){return '<div class="health-error"><strong>'+esc(e.message)+'</strong><span>'+esc(e.source)+' - '+esc(new Date(e.ts).toLocaleString())+'</span></div>'}).join(""):'<div class="health-empty compact"><strong>Aucune erreur capturee</strong><span>Le runtime est calme.</span></div>')+'</div></article>'+
      '</section>';
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  function clearErrors(){
    saveErrors([]);
    renderHealthPage();
    try{if(typeof window.toast==="function")window.toast("Erreurs Health effacees","success")}catch(e){}
  }
  function clearApiFailures(){
    saveJSON(API_KEY,[],80);
    renderHealthPage();
    try{if(typeof window.toast==="function")window.toast("Logs API effaces","success")}catch(e){}
  }
  function install(){
    installHealthMonitor();
    ensurePage();
    registerActions();
    document.addEventListener("click",function(e){
      if(e.target.closest("[data-health-refresh]")){renderHealthPage();return}
      if(e.target.closest("[data-health-clear-errors]")){clearErrors();return}
      if(e.target.closest("[data-health-clear-api]")){clearApiFailures();return}
    });
    window.addEventListener("ethone:page-ready",function(e){
      var page=e&&e.detail&&e.detail.page;
      if(page!=="health"){stopHealthSampling();return}
      startHealthSampling();
      renderHealthPage();
    });
    document.addEventListener("visibilitychange",function(){if(healthPageActive())startHealthSampling();else stopHealthSampling()});
    startHealthSampling();
    renderHealthPage();
  }
  function registerActions(){
    var Actions=window.ACTION_REGISTRY||window.ETHONEActions||(window.Ethone&&window.Ethone.get&&window.Ethone.get("actions"));
    if(!Actions||!Actions.register||window.__ethoneHealthActions)return;
    window.__ethoneHealthActions=true;
    Actions.register("health.open",{label:"Open Health Monitor",handler:function(){
      if(typeof window.switchPage==="function")window.switchPage("health");
      setTimeout(renderHealthPage,80);
      return true;
    }});
    Actions.register("health.scan",{label:"Run Health Monitor scan",handler:function(){
      renderHealthPage();
      try{if(typeof window.toast==="function")window.toast("Health Monitor scan complete","success")}catch(e){}
      return true;
    }});
    Actions.register("health.clearErrors",{label:"Clear Health Monitor errors",handler:function(){clearErrors();return true}});
  }

  window.ETHONEHealth={scan:scan,render:renderHealthPage,recordError:recordError,errors:readErrors,clearErrors:clearErrors,clearApiFailures:clearApiFailures,start:startHealthSampling,stop:stopHealthSampling};
  window.ETHONEHealthMonitor=window.ETHONEHealth;
  window.renderHealthPage=renderHealthPage;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
