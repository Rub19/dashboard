/* ETHONE Plugin SDK.
 * Local-first extension layer for pages, widgets, Brain commands, shortcuts,
 * AI providers and integrations. It composes existing ETHONE registries instead
 * of creating parallel systems.
 */
(function(){
  "use strict";
  if(window.__ethonePluginSDK)return;
  window.__ethonePluginSDK=true;

  var STORAGE_KEY="ethone:plugin-sdk:v1";
  var registry={plugins:{},pages:{},widgets:{},brainCommands:{},shortcuts:{},providers:{},integrations:{}};

  function $(s,r){return (r||document).querySelector(s)}
  function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function clone(value){try{return JSON.parse(JSON.stringify(value))}catch(e){return value}}
  function id(value){
    return String(value||"").trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,64);
  }
  function toast(message,type){try{if(typeof window.toast==="function")window.toast(message,type||"info")}catch(e){}}
  function actions(){try{return window.ACTION_REGISTRY||(window.Ethone&&window.Ethone.get&&window.Ethone.get("actions"))||null}catch(e){return null}}
  function save(){
    var summary={plugins:{},pages:{},widgets:{},brainCommands:{},shortcuts:{},providers:{},integrations:{}};
    Object.keys(registry).forEach(function(group){
      Object.keys(registry[group]).forEach(function(key){
        var item=registry[group][key];
        summary[group][key]={
          id:item.id,
          pluginId:item.pluginId,
          title:item.title||item.name||item.label||item.id,
          version:item.version||"",
          type:item.type||"",
          registeredAt:item.registeredAt||Date.now()
        };
      });
    });
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(summary))}catch(e){}
    try{
      var p=typeof window.curP==="function"?window.curP():null;
      if(p&&p.state){p.state.pluginSDK=summary;if(typeof window.saveStateNow==="function")window.saveStateNow()}
    }catch(e){}
  }
  function timeline(title,body,meta){
    try{
      if(window.ETHONETimeline&&window.ETHONETimeline.record){
        window.ETHONETimeline.record({title:title,body:body||"",category:"plugin",source:"Plugin SDK",meta:meta||{}});
      }
    }catch(e){}
  }
  function dispatch(eventName,detail){
    try{window.dispatchEvent(new CustomEvent(eventName,{detail:clone(detail||{})}))}catch(e){}
  }
  function pluginIdFrom(def){
    var pid=id(def&&def.id||def&&def.name||def&&def.title);
    if(!pid)throw new Error("ETHONEPluginSDK.register requires a plugin id.");
    return pid;
  }
  function publicManifest(manifest,pid){
    return {
      id:pid,
      name:manifest.name||manifest.title||pid,
      title:manifest.title||manifest.name||pid,
      version:manifest.version||"1.0.0",
      author:manifest.author||"Community",
      description:manifest.description||manifest.desc||"Community plugin for ETHONE.",
      icon:manifest.icon||"plug",
      accent:manifest.accent||"#8b5cf6",
      permissions:Array.isArray(manifest.permissions)?manifest.permissions.slice():["Runs locally inside ETHONE"],
      changelog:Array.isArray(manifest.changelog)?manifest.changelog.slice():["Registered with ETHONE Plugin SDK"],
      registeredAt:Date.now()
    };
  }
  function registerPluginShell(manifest,pid){
    var shell=publicManifest(manifest,pid);
    registry.plugins[pid]=shell;
    try{
      if(window.ETHONEPluginHub&&typeof window.ETHONEPluginHub.register==="function"){
        window.ETHONEPluginHub.register(shell);
      }
    }catch(e){}
    return shell;
  }
  function registerPage(pluginId,page){
    page=page||{};
    var localId=id(page.id||page.title);
    if(!localId)throw new Error("Plugin page requires an id.");
    var pageKey="plugin-"+pluginId+"-"+localId;
    var title=page.title||page.label||localId;
    var main=$("#main-content")||document.body;
    var node=$("#page-"+pageKey);
    if(!node){
      node=document.createElement("div");
      node.id="page-"+pageKey;
      node.className="tab-content plugin-sdk-page";
      node.setAttribute("role","tabpanel");
      node.setAttribute("aria-live","polite");
      node.dataset.qaPage="true";
      node.dataset.pluginId=pluginId;
      node.dataset.pluginPage=localId;
      main.appendChild(node);
    }
    function render(){
      try{
        if(typeof page.render==="function"){
          page.render(node,{pluginId:pluginId,pageId:localId,sdk:api});
        }else{
          node.innerHTML=page.html||defaultPageHTML(pluginId,title,page.description);
        }
      }catch(error){
        node.innerHTML='<section class="plugin-sdk-empty"><strong>'+esc(title)+'</strong><p>'+esc(error.message||"Plugin page failed to render.")+'</p></section>';
      }
    }
    render();
    registry.pages[pageKey]={id:pageKey,localId:localId,pluginId:pluginId,title:title,icon:page.icon||"panel-top",render:render,registeredAt:Date.now()};
    var A=actions();
    if(A&&A.register){
      A.register(pageKey+".open",{label:title,handler:function(){openPage(pageKey)}});
      A.register("plugin."+pluginId+".page."+localId+".open",{label:title,handler:function(){openPage(pageKey)}});
    }
    return registry.pages[pageKey];
  }
  function defaultPageHTML(pluginId,title,description){
    return '<section class="plugin-sdk-empty"><span>Plugin Page / '+esc(pluginId)+'</span><strong>'+esc(title)+'</strong><p>'+esc(description||"This page was registered by a plugin.")+'</p></section>';
  }
  function openPage(pageKey){
    if(typeof window.switchPage==="function")window.switchPage(pageKey,null);
    else{
      document.querySelectorAll(".tab-content").forEach(function(page){page.classList.toggle("active",page.id==="page-"+pageKey)});
    }
    var entry=registry.pages[pageKey];
    if(entry&&entry.render)setTimeout(entry.render,20);
  }
  function registerWidget(pluginId,widget){
    widget=widget||{};
    var wid=id(widget.id||widget.title);
    if(!wid)throw new Error("Plugin widget requires an id.");
    var type=pluginId+"-"+wid;
    var def=Object.assign({},widget,{
      id:type,
      type:type,
      title:widget.title||widget.label||wid,
      category:widget.category||"Community",
      author:widget.author||registry.plugins[pluginId]&&registry.plugins[pluginId].author||"Community",
      version:widget.version||registry.plugins[pluginId]&&registry.plugins[pluginId].version||"1.0.0",
      tags:Array.isArray(widget.tags)?widget.tags.concat(["plugin",pluginId]):["plugin",pluginId],
      permissions:Array.isArray(widget.permissions)?widget.permissions:["Runs locally inside ETHONE"],
      changelog:Array.isArray(widget.changelog)?widget.changelog:["Registered by "+pluginId],
      persist:widget.persist===true,
      community:true
    });
    if(!window.ETHONEWidgetSDK||typeof window.ETHONEWidgetSDK.register!=="function"){
      throw new Error("ETHONEWidgetSDK is not ready.");
    }
    var registered=window.ETHONEWidgetSDK.register(def);
    registry.widgets[type]=Object.assign({pluginId:pluginId,registeredAt:Date.now()},registered||def);
    return registry.widgets[type];
  }
  function registerBrainCommand(pluginId,command){
    command=command||{};
    var cid=id(command.id||command.label||command.title);
    if(!cid)throw new Error("Brain command requires an id.");
    var actionId="plugin."+pluginId+".brain."+cid;
    var entry={
      id:actionId,
      localId:cid,
      pluginId:pluginId,
      label:command.label||command.title||cid,
      description:command.description||command.body||"Plugin Brain command.",
      prompt:command.prompt||"",
      icon:command.icon||"sparkles",
      handler:command.handler,
      registeredAt:Date.now()
    };
    registry.brainCommands[actionId]=entry;
    var A=actions();
    if(A&&A.register){
      A.register(actionId,{label:entry.label,handler:function(ctx){return runBrainCommand(actionId,ctx||{})}});
    }
    return entry;
  }
  function runBrainCommand(actionId,ctx){
    var command=registry.brainCommands[actionId];
    if(!command)return false;
    try{
      if(typeof command.handler==="function")return command.handler(Object.assign({sdk:api,command:command},ctx||{}));
      var prompt=command.prompt||("Run Brain command: "+command.label);
      if(window.ETHONEAIEverywhere&&window.ETHONEAIEverywhere.openCopilot){
        window.ETHONEAIEverywhere.openCopilot({page:"plugin",kind:"plugin-command",label:command.label,text:command.description},prompt);
        return true;
      }
      if(window.ETHONEBrainOS&&window.ETHONEBrainOS.open)window.ETHONEBrainOS.open("actions");
      return false;
    }catch(error){
      toast("Brain command failed: "+(error.message||error),"error");
      return false;
    }
  }
  function registerShortcut(pluginId,shortcut){
    shortcut=shortcut||{};
    var sid="plugin."+pluginId+"."+id(shortcut.id||shortcut.label||shortcut.shortcut);
    if(!window.ETHONEKeyboardShortcuts||typeof window.ETHONEKeyboardShortcuts.register!=="function"){
      throw new Error("ETHONEKeyboardShortcuts is not ready.");
    }
    var handler=typeof shortcut.handler==="function"?function(){shortcut.handler({sdk:api,pluginId:pluginId})}:function(){
      if(shortcut.action&&window.runAction)window.runAction(shortcut.action,shortcut.context||{});
    };
    var ok=window.ETHONEKeyboardShortcuts.register({
      id:sid,
      pluginId:pluginId,
      group:shortcut.group||"Plugins",
      label:shortcut.label||sid,
      description:shortcut.description||"",
      shortcut:shortcut.shortcut||"",
      allowInInputs:shortcut.allowInInputs===true,
      handler:handler
    });
    registry.shortcuts[sid]={id:sid,pluginId:pluginId,label:shortcut.label||sid,shortcut:shortcut.shortcut||"",registeredAt:Date.now()};
    return ok;
  }
  function registerProvider(pluginId,provider){
    provider=provider||{};
    var pid=id(provider.id||provider.name);
    if(!pid)throw new Error("AI provider requires an id.");
    if(!window.ETHONEAICore||!Array.isArray(window.ETHONEAICore.providerCatalog)){
      throw new Error("ETHONEAICore is not ready.");
    }
    var meta={
      id:pid,
      name:provider.name||pid,
      kind:provider.kind||"cloud",
      modelMode:provider.modelMode||"openai",
      baseUrl:provider.baseUrl||provider.endpoint||"",
      modelsPath:provider.modelsPath||"/models",
      chatPath:provider.chatPath||"/chat/completions",
      streaming:provider.streaming!==false,
      features:Array.isArray(provider.features)?provider.features:["plugin"],
      pluginId:pluginId
    };
    var list=window.ETHONEAICore.providerCatalog;
    var idx=list.findIndex(function(item){return item.id===pid});
    if(idx>-1)list[idx]=Object.assign(list[idx],meta);
    else list.push(meta);
    if(window.ETHONEAICore.updateProvider){
      window.ETHONEAICore.updateProvider(pid,{enabled:provider.enabled===true,endpoint:meta.baseUrl,model:provider.model||"",models:Array.isArray(provider.models)?provider.models:[]},{render:false,syncProfile:false});
    }
    registry.providers[pid]=Object.assign({registeredAt:Date.now()},meta);
    return registry.providers[pid];
  }
  function registerIntegration(pluginId,integration){
    integration=integration||{};
    var iid=id(integration.id||integration.name);
    if(!iid)throw new Error("Integration requires an id.");
    var hub=window.ethoneIntegrationHub;
    if(!hub||!Array.isArray(hub.defs))throw new Error("Integration Hub is not ready.");
    var def={
      id:iid,
      name:integration.name||iid,
      accent:integration.accent||"#8b5cf6",
      icon:integration.icon||"plug",
      desc:integration.description||integration.desc||"Plugin integration registered through ETHONE Plugin SDK.",
      statePath:integration.statePath||("connections."+iid),
      fields:Array.isArray(integration.fields)?integration.fields:[["account","Account",""]],
      placeholder:integration.placeholder||integration.comingSoon||"",
      preview:Array.isArray(integration.preview)?integration.preview:["Status","Sync","Data"],
      legacyConnect:integration.legacyConnect||"",
      legacyRefresh:integration.legacyRefresh||"",
      legacyDisconnect:integration.legacyDisconnect||"",
      pluginId:pluginId
    };
    var idx=hub.defs.findIndex(function(item){return item.id===iid});
    if(idx>-1)hub.defs[idx]=Object.assign(hub.defs[idx],def);
    else hub.defs.push(def);
    registry.integrations[iid]=Object.assign({registeredAt:Date.now()},def);
    try{if(hub.render)hub.render();if(hub.renderSettings)hub.renderSettings()}catch(e){}
    return registry.integrations[iid];
  }
  function register(manifest){
    manifest=manifest||{};
    var pid=pluginIdFrom(manifest);
    var shell=registerPluginShell(manifest,pid);
    var result={plugin:shell,pages:[],widgets:[],brainCommands:[],shortcuts:[],providers:[],integrations:[]};
    (manifest.pages||[]).forEach(function(page){result.pages.push(registerPage(pid,page))});
    (manifest.widgets||[]).forEach(function(widget){result.widgets.push(registerWidget(pid,widget))});
    (manifest.brainCommands||manifest.commands||[]).forEach(function(command){result.brainCommands.push(registerBrainCommand(pid,command))});
    (manifest.shortcuts||[]).forEach(function(shortcut){result.shortcuts.push(registerShortcut(pid,shortcut))});
    (manifest.providers||manifest.aiProviders||[]).forEach(function(provider){result.providers.push(registerProvider(pid,provider))});
    (manifest.integrations||[]).forEach(function(integration){result.integrations.push(registerIntegration(pid,integration))});
    save();
    timeline(shell.name+" plugin registered","Pages: "+result.pages.length+", widgets: "+result.widgets.length+", Brain commands: "+result.brainCommands.length,{pluginId:pid});
    dispatch("ethone:plugin-sdk-register",result);
    toast(shell.name+" plugin registered","success");
    return result;
  }
  function list(group){
    if(group&&registry[group])return Object.keys(registry[group]).map(function(key){return registry[group][key]});
    return clone(registry);
  }
  function brainCommands(){
    return Object.keys(registry.brainCommands).map(function(key){return registry.brainCommands[key]});
  }
  function state(){
    return clone(registry);
  }

  var api={
    version:"1.0.0",
    register:register,
    page:registerPage,
    widget:registerWidget,
    brainCommand:registerBrainCommand,
    shortcut:registerShortcut,
    provider:registerProvider,
    integration:registerIntegration,
    brainCommands:brainCommands,
    runBrainCommand:runBrainCommand,
    list:list,
    state:state,
    openPage:openPage,
    toast:toast
  };
  window.ETHONEPluginSDK=api;
  window.defineEthonePlugin=register;

  window.addEventListener("ethone:page-ready",function(event){
    var page=event.detail&&event.detail.page;
    var key=page&&registry.pages[page]?page:"";
    if(key&&registry.pages[key].render)setTimeout(registry.pages[key].render,20);
  });
})();
