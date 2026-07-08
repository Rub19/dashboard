/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE)return;
  if(window.__ethoneAICoreRuntime)return;
  window.__ethoneAICoreRuntime=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const storeKey="ethone:ai-core";
  const providerPageSize=4;
  const modelDisplayLimit=120;
  const pendingRequests=new Map();
  let saveTimer=0;
  let logSaveTimer=0;
  let providersExpanded=false;
  let runtimeStarted=false;
  let pageMountScheduled=false;
  let renderLocked=false;
  let legacyMigrationChecked=false;
  let activeManagerTab="settings";
  const mountedTabs=new Set();
  const aiState={status:"disconnected",message:"Provider manager ready.",sync:false,error:""};
  const clock=()=>window.performance&&typeof window.performance.now==="function"?window.performance.now():Date.now();
  const debug=message=>console.info("[ETHONE IA] "+message);
  const providerCatalog=[
    {id:"groq",name:"Groq",kind:"cloud",modelMode:"openai",baseUrl:"https://api.groq.com/openai/v1",modelsPath:"/models",chatPath:"/chat/completions",streaming:true,features:["fast","tools","openai-compatible"]},
    {id:"openai",name:"OpenAI",kind:"cloud",modelMode:"openai",baseUrl:"https://api.openai.com/v1",modelsPath:"/models",chatPath:"/chat/completions",streaming:true,features:["reasoning","vision","tools"]},
    {id:"anthropic",name:"Anthropic Claude",kind:"cloud",modelMode:"anthropic",baseUrl:"https://api.anthropic.com/v1",modelsPath:"/models",chatPath:"/messages",streaming:true,features:["reasoning","long-context"]},
    {id:"gemini",name:"Google Gemini",kind:"cloud",modelMode:"gemini",baseUrl:"https://generativelanguage.googleapis.com/v1beta",modelsPath:"/models",chatPath:"",streaming:true,features:["reasoning","multimodal"]},
    {id:"openrouter",name:"OpenRouter",kind:"cloud",modelMode:"openai",baseUrl:"https://openrouter.ai/api/v1",modelsPath:"/models",chatPath:"/chat/completions",streaming:true,features:["routing","many-models"]},
    {id:"ollama",name:"Ollama",kind:"local",modelMode:"ollama",baseUrl:"http://localhost:11434",modelsPath:"/api/tags",chatPath:"/api/chat",streaming:true,features:["local","private"]},
    {id:"lmstudio",name:"LM Studio",kind:"local",modelMode:"openai",baseUrl:"http://localhost:1234/v1",modelsPath:"/models",chatPath:"/chat/completions",streaming:true,features:["local","openai-compatible"]},
    {id:"deepseek",name:"DeepSeek",kind:"cloud",modelMode:"openai",baseUrl:"https://api.deepseek.com/v1",modelsPath:"/models",chatPath:"/chat/completions",streaming:true,features:["coding","reasoning"]},
    {id:"mistral",name:"Mistral",kind:"cloud",modelMode:"openai",baseUrl:"https://api.mistral.ai/v1",modelsPath:"/models",chatPath:"/chat/completions",streaming:true,features:["fast","reasoning"]},
    {id:"grok",name:"Grok",kind:"cloud",modelMode:"openai",baseUrl:"https://api.x.ai/v1",modelsPath:"/models",chatPath:"/chat/completions",streaming:true,features:["reasoning"]},
    {id:"perplexity",name:"Perplexity",kind:"cloud",modelMode:"openai",baseUrl:"https://api.perplexity.ai",modelsPath:"/models",chatPath:"/chat/completions",streaming:true,features:["search","citations"]}
  ];
  const defaultConfig={
    version:1,
    defaultProvider:"groq",
    fallbackProviders:["openrouter","openai","ollama","lmstudio"],
    taskRouting:{fast:"groq",reasoning:"anthropic",coding:"openai",private:"ollama",search:"perplexity"},
    privacy:{memory:false,telemetry:true,storeRaw:false,trustedActions:false},
    settings:{temperature:.7,maxTokens:650,contextSize:6,streaming:false,systemPrompt:""},
    providers:{},
    memory:[],
    plugins:{github:false,discord:false,spotify:false,weather:true,calendar:true,notes:true,files:true,mcp:false},
    logs:[],
    conversations:[]
  };
  function clone(v){return JSON.parse(JSON.stringify(v))}
  function loadConfig(){
    let cfg;
    try{cfg=Object.assign(clone(defaultConfig),JSON.parse(localStorage.getItem(storeKey)||"{}"))}catch(e){cfg=clone(defaultConfig)}
    cfg.providers=Object.assign({},defaultConfig.providers,cfg.providers||{});
    cfg.privacy=Object.assign({},defaultConfig.privacy,cfg.privacy||{});
    cfg.settings=Object.assign({},defaultConfig.settings,cfg.settings||{});
    cfg.taskRouting=Object.assign({},defaultConfig.taskRouting,cfg.taskRouting||{});
    cfg.fallbackProviders=Array.isArray(cfg.fallbackProviders)?cfg.fallbackProviders:[];
    cfg.memory=Array.isArray(cfg.memory)?cfg.memory.slice(-80):[];
    cfg.logs=Array.isArray(cfg.logs)?cfg.logs.slice(-120):[];
    cfg.conversations=Array.isArray(cfg.conversations)?cfg.conversations.slice(-80):[];
    Object.keys(cfg.providers).forEach(id=>{
      const provider=cfg.providers[id];
      if(provider&&Array.isArray(provider.models))provider.models=provider.models.slice(0,300);
    });
    return cfg;
  }
  let config=loadConfig();
  function finite(value,fallback,min,max){
    const n=Number(value);
    const v=Number.isFinite(n)?n:fallback;
    return Math.min(max,Math.max(min,v));
  }
  function saveConfig(syncProfile){
    try{localStorage.setItem(storeKey,JSON.stringify(config))}catch(error){console.warn("[ETHONE IA] config save failed",error)}
    if(syncProfile!==false){
      clearTimeout(saveTimer);
      saveTimer=setTimeout(syncProfileConfig,180);
    }
  }
  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }
  function syncProfileConfig(){
    try{
      const p=profile();
      if(!p||!p.state)return;
      p.state.aiCore=Object.assign({},p.state.aiCore||{},{
        defaultProvider:config.defaultProvider,
        fallbackProviders:config.fallbackProviders,
        privacy:config.privacy,
        settings:config.settings,
        memory:config.memory,
        plugins:config.plugins,
        conversations:config.conversations.slice(-30)
      });
      try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
    }catch(error){
      console.warn("[ETHONE IA] profile sync failed",error);
    }
  }
  function migrateLegacy(){
    if(legacyMigrationChecked)return;
    legacyMigrationChecked=true;
    const p=profile();
    const groqKey=p?.state?.connections?.groqKey||"";
    if(groqKey&&!config.providers.groq?.apiKey){
      config.providers.groq=Object.assign({},config.providers.groq||{},{
        enabled:true,
        apiKey:groqKey,
        model:config.providers.groq?.model||"",
        health:"unknown",
        endpoint:providerCatalog.find(x=>x.id==="groq").baseUrl
      });
      config.defaultProvider=config.defaultProvider||"groq";
      log("migration","Legacy Groq key imported into ETHONE AI Core.");
      saveConfig(false);
    }
  }
  function catalog(id){return providerCatalog.find(p=>p.id===id)}
  function providerState(id){
    const meta=catalog(id);
    const saved=config.providers[id]||{};
    return Object.assign({enabled:false,apiKey:"",endpoint:meta?.baseUrl||"",model:"",models:[],health:"unknown",latency:null,lastError:"",updatedAt:0},saved);
  }
  function updateProvider(id,next,options){
    const opts=options||{};
    config.providers[id]=Object.assign(providerState(id),next||{});
    saveConfig(opts.syncProfile!==false);
    if(opts.render!==false)renderAIManager({force:true});
  }
  function fetchWithTimeout(url,options,timeout,key){
    const controller=new AbortController();
    if(key&&pendingRequests.has(key))pendingRequests.get(key).abort();
    if(key)pendingRequests.set(key,controller);
    const timer=setTimeout(()=>controller.abort(),timeout);
    return fetch(url,Object.assign({},options||{},{signal:controller.signal})).finally(()=>{
      clearTimeout(timer);
      if(key&&pendingRequests.get(key)===controller)pendingRequests.delete(key);
    });
  }
  function authHeaders(meta,st){
    if(meta.kind==="local")return {"Content-Type":"application/json"};
    if(meta.modelMode==="gemini")return {"Content-Type":"application/json"};
    if(meta.modelMode==="anthropic")return {"Content-Type":"application/json","x-api-key":st.apiKey||"","anthropic-version":"2023-06-01"};
    return {"Content-Type":"application/json","Authorization":"Bearer "+(st.apiKey||"")};
  }
  function normalizeModels(meta,data){
    if(!data)return [];
    if(meta.modelMode==="ollama")return (data.models||[]).map(m=>m.name).filter(Boolean);
    const arr=data.data||data.models||[];
    return arr.map(m=>typeof m==="string"?m:(m.id||m.name||m.model)).filter(Boolean);
  }
  async function refreshModels(id){
    const meta=catalog(id), st=providerState(id);
    if(!meta)throw new Error("Unknown provider");
    if(meta.kind==="cloud"&&!st.apiKey)throw new Error("API key required");
    setAIState("syncing","Refreshing "+meta.name+" models...",true,"");
    const base=(st.endpoint||meta.baseUrl).replace(/\/$/,"");
    const url=meta.modelMode==="gemini"
      ? base+meta.modelsPath+(st.apiKey?"?key="+encodeURIComponent(st.apiKey):"")
      : base+meta.modelsPath;
    const started=Date.now();
    const res=await fetchWithTimeout(url,{headers:authHeaders(meta,st)},12000,"models:"+id);
    if(!res.ok)throw new Error("Models HTTP "+res.status);
    const data=await res.json();
    let models=normalizeModels(meta,data);
    if(meta.modelMode==="gemini")models=models.map(m=>String(m).replace(/^models\//,""));
    if(models.length>modelDisplayLimit){
      log("models",meta.name+" returned "+models.length+" model(s); showing first "+modelDisplayLimit+" for UI stability.");
      models=models.slice(0,modelDisplayLimit);
    }
    updateProvider(id,{models,health:"ok",latency:Date.now()-started,lastError:"",updatedAt:Date.now(),model:st.model&&models.includes(st.model)?st.model:(models[0]||"")},{render:false,syncProfile:false});
    log("models",meta.name+" returned "+models.length+" model(s).");
    setAIState("connected",meta.name+" connected. "+models.length+" model(s) available.",false,"");
    return models;
  }
  function chooseProvider(task){
    migrateLegacy();
    const route=task&&config.taskRouting[task]?config.taskRouting[task]:config.defaultProvider;
    const ordered=[route,config.defaultProvider,...config.fallbackProviders].filter(Boolean);
    const unique=[...new Set(ordered)];
    return unique.filter(id=>{
      const st=providerState(id), meta=catalog(id);
      return meta&&st.enabled!==false&&(meta.kind==="local"||!!st.apiKey);
    });
  }
  async function ensureModel(id){
    const st=providerState(id);
    if(st.model)return st.model;
    if(st.models&&st.models.length){updateProvider(id,{model:st.models[0]},{render:false,syncProfile:false});return st.models[0]}
    const models=await refreshModels(id);
    if(models[0])return models[0];
    throw new Error("No model available for "+id);
  }
  function toOpenAIMessages(system,messages){
    return [{role:"system",content:system}].concat(messages.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.content||""})));
  }
  async function callProvider(id,request){
    const meta=catalog(id), st=providerState(id);
    if(!meta)throw new Error("Provider not found");
    if(meta.kind==="cloud"&&!st.apiKey)throw new Error(meta.name+" API key is missing");
    const model=await ensureModel(id);
    const base=(st.endpoint||meta.baseUrl).replace(/\/$/,"");
    const started=Date.now();
    let url, body, headers=authHeaders(meta,st);
    if(meta.modelMode==="ollama"){
      url=base+meta.chatPath;
      body={model,messages:request.messages,stream:false,options:{temperature:request.temperature}};
    }else if(meta.modelMode==="anthropic"){
      url=base+meta.chatPath;
      body={model,max_tokens:request.maxTokens,temperature:request.temperature,system:request.system,messages:request.messages.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.content||""}))};
    }else if(meta.modelMode==="gemini"){
      url=base+"/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(st.apiKey||"");
      body={contents:request.messages.map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content||""}]})),generationConfig:{temperature:request.temperature,maxOutputTokens:request.maxTokens},systemInstruction:{parts:[{text:request.system}]}};
    }else{
      url=base+meta.chatPath;
      body={model,messages:toOpenAIMessages(request.system,request.messages),max_tokens:request.maxTokens,temperature:request.temperature,stream:false};
    }
    const res=await fetchWithTimeout(url,{method:"POST",headers,body:JSON.stringify(body)},35000,"chat:"+id);
    if(!res.ok){
      let err=await res.json().catch(()=>null);
      throw new Error(err?.error?.message||err?.message||("HTTP "+res.status));
    }
    const data=await res.json();
    let content="";
    if(meta.modelMode==="ollama")content=data.message?.content||data.response||"";
    else if(meta.modelMode==="anthropic")content=(data.content||[]).map(x=>x.text||"").join("");
    else if(meta.modelMode==="gemini")content=(data.candidates?.[0]?.content?.parts||[]).map(x=>x.text||"").join("");
    else content=data.choices?.[0]?.message?.content||"";
    updateProvider(id,{health:"ok",latency:Date.now()-started,lastError:"",updatedAt:Date.now(),model},{render:false,syncProfile:false});
    return {content:content||"No response generated.",provider:id,model,latency:Date.now()-started,raw:data};
  }
  function buildSystemPrompt(ctx,lang2){
    const today=new Date().toISOString().slice(0,10);
    const actions="[create_task text,priority,due][create_note title,content][create_event title,date][complete_task text][delete_task text][list_tasks]";
    const memory=config.privacy.memory?config.memory.map(m=>m.key+":"+m.value).join("|"):"memory disabled";
    const custom=config.settings.systemPrompt?("\nCUSTOM:"+config.settings.systemPrompt):"";
    return "ETHONE AI Core. Lang:"+lang2+". Date:"+today+".\nACTIONS:"+actions+"\nDATA:"+(ctx.summary||"")+"\nMEMORY:"+memory+"\nRules: concise, answer in "+lang2+", use ACTION when useful, never expose API keys."+custom;
  }
  async function complete(input){
    setAIState("loading","Generating response...",true,"");
    const ctx=typeof window.getAIContext==="function"?window.getAIContext():{summary:""};
    const uiLang=window._lang||"fr";
    const lang2=uiLang==="fr"?"fr":uiLang==="es"?"es":uiLang==="de"?"de":"en";
    const messages=(typeof _aiHistory!=="undefined"?_aiHistory:(window._aiHistory||[])).slice(-finite(config.settings.contextSize,6,2,24));
    const request={system:buildSystemPrompt(ctx,lang2),messages,temperature:finite(config.settings.temperature,.7,0,2),maxTokens:finite(config.settings.maxTokens,650,128,8192),task:detectTask(input)};
    const candidates=chooseProvider(request.task);
    if(!candidates.length){
      const error=new Error("No configured AI provider. Open AI Core Provider Manager and connect Groq, OpenAI, Ollama or another provider.");
      setAIState("empty","No provider configured.",false,error.message);
      throw error;
    }
    const failures=[];
    for(const id of candidates){
      try{
        const result=await callProvider(id,request);
        log("request","Answered by "+catalog(id).name+" / "+result.model+" in "+result.latency+"ms.");
        recordConversation(input,result,ctx);
        maybeMemory(input,result.content);
        setAIState("connected","Answered by "+catalog(result.provider).name+".",false,"");
        return result;
      }catch(e){
        updateProvider(id,{health:"error",lastError:e.message,updatedAt:Date.now()},{render:false,syncProfile:false});
        failures.push(catalog(id).name+": "+e.message);
        log("failover",catalog(id).name+" failed. "+e.message);
      }
    }
    const error=new Error("All configured providers failed. "+failures.join(" | "));
    setAIState("error","All configured providers failed.",false,error.message);
    throw error;
  }
  function detectTask(text){
    const t=String(text||"").toLowerCase();
    if(/code|bug|javascript|css|html|github|commit/.test(t))return "coding";
    if(/why|analyse|reason|strategy|architecture|complex/.test(t))return "reasoning";
    if(/local|private|offline/.test(t))return "private";
    if(/search|web|news|source/.test(t))return "search";
    return "fast";
  }
  function recordConversation(input,result,ctx){
    config.conversations.push({id:Date.now(),ts:Date.now(),origin:document.querySelector(".tab-content.active")?.id||"unknown",input:String(input||"").slice(0,500),provider:result.provider,model:result.model,latency:result.latency,context:ctx?.summary||"",metadata:{plugins:Object.keys(config.plugins).filter(k=>config.plugins[k])}});
    if(config.conversations.length>80)config.conversations=config.conversations.slice(-80);
    saveConfig();
  }
  function maybeMemory(input,reply){
    if(!config.privacy.memory)return;
    const text=String(input||"");
    const m=text.match(/remember(?: that)? (.+)$/i)||text.match(/souviens-toi(?: que)? (.+)$/i);
    if(m){
      config.memory.push({id:Date.now(),key:"user-note",value:m[1].slice(0,240),source:"explicit",ts:Date.now()});
      if(config.memory.length>80)config.memory=config.memory.slice(-80);
      saveConfig();
      renderAIManager({force:activeManagerTab==="memory"});
    }
  }
  function log(type,message){
    config.logs.push({ts:Date.now(),type,message});
    if(config.logs.length>120)config.logs=config.logs.slice(-120);
    clearTimeout(logSaveTimer);
    logSaveTimer=setTimeout(()=>{try{localStorage.setItem(storeKey,JSON.stringify(config))}catch(e){}},240);
  }
  function setAIState(status,message,sync,error){
    aiState.status=status||aiState.status;
    aiState.message=message||aiState.message||"";
    aiState.sync=!!sync;
    aiState.error=error||"";
    updateAIStateUI();
  }
  function updateAIStateUI(){
    const root=$("#aic-state");
    if(!root)return;
    root.dataset.state=aiState.status;
    root.setAttribute("aria-busy",String(!!aiState.sync));
    const label=$(".aic-state-label",root),copy=$(".aic-state-copy",root);
    if(label)label.textContent=aiState.status;
    if(copy)copy.textContent=aiState.error||aiState.message||"Ready";
  }
  function gracefulError(err){
    const msg=err?.message||String(err||"Unknown error");
    return "**ETHONE AI Core** could not complete the request.\n\n"+msg+"\n\nOpen **AI Core** to check provider health, refresh models, or configure a fallback provider.";
  }
  window.ETHONEAICore={
    complete,
    refreshModels,
    providerCatalog,
    providerState,
    updateProvider,
    config:()=>config,
    save:saveConfig,
    log,
    chooseProvider,
    audit:()=>({
      runtimeStarted,
      activeTab:activeManagerTab,
      mountedTabs:Array.from(mountedTabs),
      providerCards:$$(".aic-provider",$("#aic-tab-providers")||document).length,
      pendingRequests:pendingRequests.size,
      pageMountScheduled
    })
  };
  function aiCoreHeader(){
    const ai=$("#page-ai");
    if(!ai||$("#aic-shell",ai))return;
    const shell=document.createElement("section");
    shell.id="aic-shell";
    shell.className="aic-shell";
    shell.innerHTML=
      '<div class="aic-panel aic-hero">'+
        '<div><div class="aic-kicker">ETHONE AI Core</div><div class="aic-title">Unified intelligence platform</div><div class="aic-copy">Provider-neutral AI routing for Groq, OpenAI, Claude, Gemini, OpenRouter, Ollama, LM Studio and future MCP plugins. The chat below now talks only through ETHONE AI Core.</div>'+
        '<div class="aic-state" id="aic-state" data-state="disconnected" aria-live="polite"><span class="aic-state-dot"></span><strong class="aic-state-label">disconnected</strong><span class="aic-state-copy">Provider manager ready.</span></div>'+
        '<div class="aic-status-grid"><div class="aic-status"><span>Default</span><strong id="aic-default-status">-</strong></div><div class="aic-status"><span>Model</span><strong id="aic-model-status">-</strong></div><div class="aic-status"><span>Fallbacks</span><strong id="aic-fallback-status">-</strong></div><div class="aic-status"><span>Memory</span><strong id="aic-memory-status">-</strong></div></div></div>'+
      '</div>'+
      '<aside class="aic-panel aic-side-card"><div class="aic-kicker">Routing</div><div id="aic-routing-summary"></div></aside>';
    const pageArea=$(".ai-page",ai)||ai;
    const topbar=$(".topbar",ai);
    if(topbar&&topbar.nextSibling)topbar.parentNode.insertBefore(shell,topbar.nextSibling);
    else pageArea.prepend(shell);
    const manager=document.createElement("section");
    manager.id="aic-manager";
    manager.className="aic-panel";
    manager.innerHTML=
      '<div class="aic-tabs">'+
        '<button class="aic-tab" data-aic-tab="providers" type="button">Providers</button>'+
        '<button class="aic-tab active" data-aic-tab="settings" type="button">Settings</button>'+
        '<button class="aic-tab" data-aic-tab="memory" type="button">Memory</button>'+
        '<button class="aic-tab" data-aic-tab="plugins" type="button">Plugins / MCP</button>'+
        '<button class="aic-tab" data-aic-tab="logs" type="button">Logs</button>'+
      '</div>'+
      '<div class="aic-tab-content" id="aic-tab-providers"></div>'+
      '<div class="aic-tab-content active" id="aic-tab-settings"></div>'+
      '<div class="aic-tab-content" id="aic-tab-memory"></div>'+
      '<div class="aic-tab-content" id="aic-tab-plugins"></div>'+
      '<div class="aic-tab-content" id="aic-tab-logs"></div>';
    shell.insertAdjacentElement("afterend",manager);
  }
  function updateManagerSummary(){
    const def=catalog(config.defaultProvider);
    const st=providerState(config.defaultProvider);
    $("#aic-default-status")&&( $("#aic-default-status").textContent=def?def.name:"None" );
    $("#aic-model-status")&&( $("#aic-model-status").textContent=st.model||"Dynamic" );
    $("#aic-fallback-status")&&( $("#aic-fallback-status").textContent=String(config.fallbackProviders.length) );
    $("#aic-memory-status")&&( $("#aic-memory-status").textContent=config.privacy.memory?"On":"Off" );
    const routing=$("#aic-routing-summary");
    if(routing)routing.innerHTML=Object.entries(config.taskRouting).map(([task,id])=>'<div class="aic-route-item"><strong>'+task+'</strong><span>'+((catalog(id)||{}).name||id)+'</span></div>').join("");
    const active=chooseProvider("fast");
    if(active.length)setAIState("connected","Ready. "+active.length+" provider route(s) configured.",false,"");
    else setAIState("empty","No provider is fully configured yet.",false,"");
    patchAILabels();
  }
  function renderManagerTab(tab,force){
    try{
      const name=["providers","settings","memory","plugins","logs"].includes(tab)?tab:"providers";
      const host=$("#aic-tab-"+name);
      if(!host)return;
      if(!force&&mountedTabs.has(name)&&host.childElementCount)return;
      if(name==="providers")renderProviders();
      if(name==="settings")renderSettings();
      if(name==="memory")renderMemory();
      if(name==="plugins")renderPlugins();
      if(name==="logs")renderLogs();
      mountedTabs.add(name);
      debug("tab mounted: "+name);
    }catch(error){
      console.error("[ETHONE IA] tab render failed",error);
      setAIState("error","AI tab render failed.",false,error.message);
    }
  }
  function renderAIManager(options){
    if(renderLocked)return;
    renderLocked=true;
    const opts=options||{};
    try{
      migrateLegacy();
      updateManagerSummary();
      renderManagerTab(activeManagerTab,!!opts.force);
    }catch(error){
      console.error("[ETHONE IA] manager render failed",error);
      setAIState("error","AI manager render failed.",false,error.message);
    }finally{
      renderLocked=false;
    }
  }
  function renderProviders(){
    const host=$("#aic-tab-providers");if(!host)return;
    const ordered=providerCatalog.slice().sort((a,b)=>{
      if(a.id===config.defaultProvider)return -1;
      if(b.id===config.defaultProvider)return 1;
      return Number(providerState(b.id).enabled)-Number(providerState(a.id).enabled);
    });
    const visible=providersExpanded?ordered:ordered.slice(0,providerPageSize);
    host.innerHTML='<div class="aic-provider-list">'+visible.map(meta=>{
      const st=providerState(meta.id);
      const status=st.health==="ok"?"ok":st.health==="error"?"warn":"";
      return '<article class="aic-provider" data-provider="'+meta.id+'">'+
        '<div class="aic-provider-head"><div><div class="aic-provider-name">'+meta.name+'</div><div class="aic-provider-meta">'+meta.kind+' / '+meta.features.join(", ")+'</div></div><span class="aic-badge '+status+'">'+(st.health||"unknown")+'</span></div>'+
        '<div class="aic-field"><label>Endpoint</label><input data-aic-endpoint="'+meta.id+'" value="'+escape(st.endpoint||meta.baseUrl)+'" placeholder="'+escape(meta.baseUrl)+'"></div>'+
        (meta.kind==="cloud"?'<div class="aic-field"><label>API key</label><input type="password" data-aic-key="'+meta.id+'" value="'+escape(st.apiKey||"")+'" placeholder="Stored locally"></div>':'')+
        '<div class="aic-field"><label>Model</label><select data-aic-model="'+meta.id+'">'+modelOptions(st)+'</select></div>'+
        '<div class="aic-actions"><button class="aic-btn primary" data-aic-save-provider="'+meta.id+'" type="button">Save</button><button class="aic-btn" data-aic-refresh-models="'+meta.id+'" type="button">Refresh models</button><button class="aic-btn" data-aic-default="'+meta.id+'" type="button">'+(config.defaultProvider===meta.id?"Default":"Set default")+'</button></div>'+
        (st.lastError?'<div class="aic-log" style="margin-top:8px;color:#fecaca">'+escape(st.lastError)+'</div>':'')+
      '</article>';
    }).join("")+'</div>'+
      (ordered.length>providerPageSize?'<div class="aic-actions"><button class="aic-btn" data-aic-provider-toggle type="button">'+(providersExpanded?"Show fewer providers":"Show all providers ("+ordered.length+")")+'</button></div>':'');
    debug("providers rendered");
  }
  function modelOptions(st){
    const models=st.models&&st.models.length?st.models:(st.model?[st.model]:[""]);
    return ['<option value="">Dynamic model discovery</option>'].concat(models.map(m=>'<option value="'+escape(m)+'" '+(st.model===m?"selected":"")+'>'+escape(m)+'</option>')).join("");
  }
  function renderSettings(){
    const host=$("#aic-tab-settings");if(!host)return;
    host.innerHTML='<div class="aic-provider-list">'+
      '<div class="aic-provider"><div class="aic-provider-name">Generation</div><div class="aic-field"><label>Temperature</label><input data-aic-setting="temperature" type="number" min="0" max="2" step="0.1" value="'+config.settings.temperature+'"></div><div class="aic-field"><label>Max tokens</label><input data-aic-setting="maxTokens" type="number" min="128" max="8192" step="64" value="'+config.settings.maxTokens+'"></div><div class="aic-field"><label>Context messages</label><input data-aic-setting="contextSize" type="number" min="2" max="24" step="1" value="'+config.settings.contextSize+'"></div><div class="aic-field"><label>System prompt extension</label><textarea data-aic-setting="systemPrompt" rows="4">'+escape(config.settings.systemPrompt||"")+'</textarea></div></div>'+
      '<div class="aic-provider"><div class="aic-provider-name">Privacy & failover</div><div class="aic-actions"><button class="aic-btn '+(config.privacy.memory?"primary":"")+'" data-aic-toggle="memory" type="button">Memory '+(config.privacy.memory?"On":"Off")+'</button><button class="aic-btn '+(config.privacy.telemetry?"primary":"")+'" data-aic-toggle="telemetry" type="button">Telemetry '+(config.privacy.telemetry?"On":"Off")+'</button><button class="aic-btn '+(config.privacy.trustedActions?"primary":"")+'" data-aic-toggle="trustedActions" type="button">Trusted actions '+(config.privacy.trustedActions?"On":"Off")+'</button></div><div class="aic-field"><label>Fallback providers</label><input data-aic-fallbacks value="'+escape(config.fallbackProviders.join(","))+'" placeholder="openrouter,openai,ollama"></div><div class="aic-actions"><button class="aic-btn primary" data-aic-save-settings type="button">Apply settings</button></div></div>'+
    '</div>';
  }
  function renderMemory(){
    const host=$("#aic-tab-memory");if(!host)return;
    host.innerHTML='<div class="aic-actions" style="margin-bottom:10px"><button class="aic-btn primary" data-aic-add-memory type="button">Add visible memory</button><button class="aic-btn danger" data-aic-clear-memory type="button">Clear memory</button></div><div class="aic-memory-list">'+(config.memory.length?config.memory.map(m=>'<div class="aic-memory"><div><strong>'+escape(m.key||"memory")+'</strong><span>'+escape(m.value||"")+'</span></div><button class="aic-btn danger" data-aic-delete-memory="'+m.id+'" type="button">Remove</button></div>').join(""):'<div class="aic-log">No memory stored. Memory remains disabled until you turn it on.</div>')+'</div>';
  }
  function renderPlugins(){
    const host=$("#aic-tab-plugins");if(!host)return;
    const defs=[["github","GitHub MCP","Repositories, issues, commits and pull requests."],["discord","Discord","Presence and community context."],["spotify","Spotify","Listening context and playback signals."],["weather","Weather","Forecast context for planning."],["calendar","Calendar","Agenda and scheduling context."],["notes","Notes","Notebook and writing actions."],["files","Files","Library and local knowledge."],["mcp","External MCP","Future standardized tool servers."]];
    host.innerHTML='<div class="aic-plugin-grid">'+defs.map(([id,name,sub])=>{
      const soon=id==="mcp";
      return '<div class="aic-plugin"'+(soon?' data-feature-status="coming-soon" data-feature-name="'+escape(name)+'" data-coming-soon-description="External MCP servers need the future secure tool bridge before they can run inside ETHONE."':'')+'><div><strong>'+name+'</strong><span>'+sub+'</span></div>'+(soon?'<button class="aic-btn" data-coming-soon="'+escape(name)+'" data-coming-soon-description="External MCP servers need the future secure tool bridge before they can run inside ETHONE." data-coming-soon-notify="true" type="button">Notify me</button>':'<button class="aic-btn '+(config.plugins[id]?"primary":"")+'" data-aic-plugin="'+id+'" type="button">'+(config.plugins[id]?"Enabled":"Enable")+'</button>')+'</div>';
    }).join("")+'</div>';
  }
  function renderLogs(){
    const host=$("#aic-tab-logs");if(!host)return;
    host.innerHTML='<div class="aic-log-list">'+(config.logs.slice(-30).reverse().map(l=>'<div class="aic-log"><strong>'+new Date(l.ts).toLocaleTimeString()+' / '+escape(l.type)+'</strong><br>'+escape(l.message)+'</div>').join("")||'<div class="aic-log">No technical logs yet.</div>')+'</div>';
  }
  function patchAILabels(){
    const powered=$("#page-ai [data-i18n='ai_powered_by']");
    if(powered)powered.textContent="Powered by ETHONE AI Core";
    const ctx=$("#ai-ctx-label");
    if(ctx&&ctx.textContent&&!ctx.textContent.includes("Core"))ctx.textContent=ctx.textContent+" / Core";
  }
  function handleClick(e){
    try{
      const page=$("#page-ai");
      if(!page||!page.contains(e.target))return;
      const tab=e.target.closest("[data-aic-tab]");
      if(tab){
        activeManagerTab=tab.dataset.aicTab;
        $$(".aic-tab").forEach(x=>x.classList.toggle("active",x===tab));
        $$(".aic-tab-content").forEach(x=>x.classList.toggle("active",x.id==="aic-tab-"+activeManagerTab));
        renderManagerTab(activeManagerTab,true);
        return;
      }
      const providerToggle=e.target.closest("[data-aic-provider-toggle]");
      if(providerToggle){
        providersExpanded=!providersExpanded;
        renderProviders();
        return;
      }
      const save=e.target.closest("[data-aic-save-provider]");
      if(save){
        const id=save.dataset.aicSaveProvider;
        const meta=catalog(id);
        if(!meta)throw new Error("Unknown provider: "+id);
        setAIState("syncing","Saving "+meta.name+" provider...",true,"");
        updateProvider(id,{enabled:true,endpoint:$("[data-aic-endpoint='"+id+"']")?.value.trim()||meta.baseUrl,apiKey:$("[data-aic-key='"+id+"']")?.value.trim()||providerState(id).apiKey,model:$("[data-aic-model='"+id+"']")?.value||""});
        if(id==="groq"&&profile()?.state?.connections){
          profile().state.connections.groqKey=providerState(id).apiKey;
          try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(err){}
        }
        setAIState("connected","Provider saved: "+meta.name,false,"");
        toast("Provider saved: "+meta.name,"success");
        return;
      }
      const refresh=e.target.closest("[data-aic-refresh-models]");
      if(refresh){
        const providerId=refresh.dataset.aicRefreshModels;
        refresh.disabled=true;
        refresh.setAttribute("aria-busy","true");
        refreshModels(providerId)
          .then(()=>{renderAIManager({force:true});toast("Models refreshed","success")})
          .catch(err=>{setAIState("error","Model refresh failed.",false,err.message);log("models",err.message);renderAIManager({force:true});toast(err.name==="AbortError"?"Model refresh cancelled":err.message,"error")})
          .finally(()=>{refresh.disabled=false;refresh.removeAttribute("aria-busy")});
        return;
      }
      const def=e.target.closest("[data-aic-default]");
      if(def){config.defaultProvider=def.dataset.aicDefault;providerState(config.defaultProvider).enabled=true;saveConfig();renderAIManager({force:true});toast("Default provider updated","success");return}
      const setBtn=e.target.closest("[data-aic-save-settings]");
      if(setBtn){
        $$("[data-aic-setting]").forEach(el=>{
          const k=el.dataset.aicSetting;
          if(el.type==="number"){
            const limits={temperature:[.7,0,2],maxTokens:[650,128,8192],contextSize:[6,2,24]}[k]||[0,0,9999];
            config.settings[k]=finite(el.value,limits[0],limits[1],limits[2]);
            el.value=String(config.settings[k]);
          }else config.settings[k]=el.value;
        });
        const fb=$("[data-aic-fallbacks]")?.value||"";
        config.fallbackProviders=fb.split(",").map(x=>x.trim()).filter(Boolean);
        saveConfig();renderAIManager({force:true});toast("AI settings applied","success");return;
      }
      const toggle=e.target.closest("[data-aic-toggle]");
      if(toggle){const k=toggle.dataset.aicToggle;config.privacy[k]=!config.privacy[k];saveConfig();renderAIManager({force:true});return}
      const plugin=e.target.closest("[data-aic-plugin]");
      if(plugin&&plugin.hasAttribute("data-coming-soon"))return;
      if(plugin){const k=plugin.dataset.aicPlugin;config.plugins[k]=!config.plugins[k];saveConfig();renderAIManager({force:true});return}
      const addMem=e.target.closest("[data-aic-add-memory]");
      if(addMem){const value=prompt("Visible memory to store in ETHONE AI Core:");if(value){config.memory.push({id:Date.now(),key:"manual",value:value.slice(0,300),source:"user",ts:Date.now()});config.privacy.memory=true;saveConfig();renderAIManager({force:true})};return}
      const delMem=e.target.closest("[data-aic-delete-memory]");
      if(delMem){config.memory=config.memory.filter(m=>String(m.id)!==String(delMem.dataset.aicDeleteMemory));saveConfig();renderAIManager({force:true});return}
      const clear=e.target.closest("[data-aic-clear-memory]");
      if(clear&&confirm("Clear all visible AI memory?")){config.memory=[];saveConfig();renderAIManager({force:true});return}
    }catch(error){
      console.error("[ETHONE IA] action failed",error);
      setAIState("error","AI action failed.",false,error.message);
      toast(error.message||"AI action failed","error");
    }
  }
  function wrapLegacyGroqKey(){
    if(typeof window.saveGroqKey==="function"&&!window.saveGroqKey.__aicWrapped){
      const old=window.saveGroqKey;
      window.saveGroqKey=function(){
        const result=old.apply(this,arguments);
        const key=$("#groq-key-input")?.value?.trim()||profile()?.state?.connections?.groqKey||"";
        if(key)updateProvider("groq",{enabled:true,apiKey:key});
        return result;
      };
      window.saveGroqKey.__aicWrapped=true;
    }
  }
  function overrideChat(){
    if(typeof window.sendAIMessage!=="function"||window.sendAIMessage.__aicWrapped)return;
    window.sendAIMessage=async function(){
      const send=$("#ai-send-btn");if(send)send.disabled=true;
      let typingShown=false;
      try{
        if(typeof _aiTyping!=="undefined"&&_aiTyping)return;
        const inp=$("#ai-input");if(!inp)return;
        const text=inp.value.trim();if(!text)return;
        inp.value="";inp.style.height="auto";
        try{if(typeof window.addAIMessage==="function")addAIMessage("user",text)}catch(error){console.warn("[ETHONE IA] user message render failed",error)}
        try{_aiHistory.push({role:"user",content:text,ts:Date.now(),origin:document.querySelector(".tab-content.active")?.id||"page-ai"})}catch(e){}
        try{_aiTyping=true}catch(e){}
        if(typeof window.showAITyping==="function"){showAITyping();typingShown=true}
        const result=await complete(text);
        let executed={clean:result.content,results:[]};
        try{
          executed=typeof window.executeAIActions==="function"?executeAIActions(result.content):executed;
        }catch(error){
          console.warn("[ETHONE IA] action execution failed",error);
          executed={clean:result.content,results:["AI action failed safely: "+error.message]};
        }
        if(typingShown&&typeof window.removeAITyping==="function"){removeAITyping();typingShown=false}
        try{
          if(typeof window.addAIMessage==="function"){
            addAIMessage("assistant",executed.clean);
            if(executed.results?.length)executed.results.forEach(r=>addAIMessage("assistant",r));
          }
        }catch(error){
          console.error("[ETHONE IA] assistant message render failed",error);
          setAIState("error","AI response render failed.",false,error.message);
        }
        try{_aiHistory.push({role:"assistant",content:executed.clean,ts:Date.now(),provider:result.provider,model:result.model});if(_aiHistory.length>32)_aiHistory=_aiHistory.slice(-32)}catch(e){}
        try{if(typeof window.saveAIChats==="function")saveAIChats()}catch(e){}
      }catch(e){
        if(typingShown&&typeof window.removeAITyping==="function"){removeAITyping();typingShown=false}
        try{if(typeof window.addAIMessage==="function")addAIMessage("assistant",gracefulError(e))}catch(renderError){console.error("[ETHONE IA] error render failed",renderError)}
        setAIState("error","AI request failed.",false,e.message);
        console.error("[ETHONE AI Core]",e);
      }finally{
        try{_aiTyping=false}catch(e){}
        if(send)send.disabled=false;
        try{$("#ai-input")?.focus()}catch(e){}
        try{renderAIManager({force:activeManagerTab==="logs"})}catch(error){console.error("[ETHONE IA] final render failed",error)}
      }
    };
    window.sendAIMessage.__aicWrapped=true;
  }
  function patchWelcome(){
    if(typeof window.initAIChat==="function"&&!window.initAIChat.__aicWrapped){
      const old=window.initAIChat;
      window.initAIChat=function(){
        old.apply(this,arguments);
        mountAIPage();
      };
      window.initAIChat.__aicWrapped=true;
    }
  }
  function toast(msg,type){
    if(typeof window.toast==="function"){try{window.toast(msg,type||"info");return}catch(e){}}
    console.log("[ETHONE AI Core]",msg);
  }
  function escape(s){return String(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
  function isAIVisible(){
    const page=$("#page-ai");
    return !!(page&&page.classList.contains("active"));
  }
  function abortPending(prefix){
    pendingRequests.forEach((controller,key)=>{
      if(!prefix||key.startsWith(prefix))controller.abort();
    });
  }
  function scheduleIdle(callback){
    let done=false;
    function run(){
      if(done)return;
      done=true;
      callback();
    }
    if(window.requestIdleCallback){
      const id=window.requestIdleCallback(run,{timeout:350});
      setTimeout(run,420);
      return id;
    }
    if(window.requestAnimationFrame)return window.requestAnimationFrame(run);
    return setTimeout(run,0);
  }
  function mountAIPage(){
    if(pageMountScheduled||!isAIVisible())return;
    pageMountScheduled=true;
    const started=clock();
    debug("init start");
    try{
      aiCoreHeader();
      updateManagerSummary();
    }catch(error){
      pageMountScheduled=false;
      console.error("[ETHONE IA] shell mount failed",error);
      setAIState("error","AI shell mount failed.",false,error.message);
      return;
    }
    scheduleIdle(()=>{
      pageMountScheduled=false;
      if(!isAIVisible())return;
      try{
        renderAIManager();
        debug("init complete in "+Math.round(clock()-started)+"ms");
      }catch(error){
        console.error("[ETHONE IA] init failed",error);
        setAIState("error","AI init failed.",false,error.message);
      }
    });
  }
  function startAICore(){
    if(runtimeStarted)return;
    runtimeStarted=true;
    document.addEventListener("click",handleClick);
    wrapLegacyGroqKey();
    overrideChat();
    patchWelcome();
    mountAIPage();
    window.addEventListener("ethone:page-ready",event=>{
      if(event?.detail?.page==="ai")mountAIPage();
      else abortPending("models:");
    });
  }
  if(window.ethoneRunWhenPageReady)window.ethoneRunWhenPageReady("ai-core-runtime","ai",startAICore);else startAICore();
})();
