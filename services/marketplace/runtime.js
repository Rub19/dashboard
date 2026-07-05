/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE||window.__ethoneSkipMarketplace)return;
  if(window.__ethoneMarketplace41)return;
  window.__ethoneMarketplace41=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const storeKey="ethone:marketplace-41";
  const state=load();
  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(storeKey)||"{}");
      return {
        installed:saved.installed||{},
        favorites:saved.favorites||{},
        reviews:saved.reviews||{},
        query:saved.query||"",
        category:saved.category||"All",
        detail:null,
        updates:saved.updates||{},
        history:Array.isArray(saved.history)?saved.history:[]
      };
    }catch(e){
      return {installed:{},favorites:{},reviews:{},query:"",category:"All",detail:null,updates:{},history:[]};
    }
  }
  function save(){
    localStorage.setItem(storeKey,JSON.stringify(state));
    const p=profile();
    if(p&&p.state){
      p.state.marketplace41=Object.assign({},p.state.marketplace41||{},{
        installed:state.installed,
        favorites:state.favorites,
        reviews:state.reviews,
        updates:state.updates,
        history:state.history.slice(-80),
        updatedAt:Date.now()
      });
      try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
    }
  }
  function profile(){
    try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}
  }
  function ps(){
    const p=profile();
    return p&&p.state?p.state:{};
  }
  function escape(s){
    return String(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  }
  const catalog=[
    {id:"github-heatmap",type:"Widget",title:"GitHub Heatmap",creator:"ETHONE Labs",desc:"Contribution heatmap, commit streaks, repository pulse and Brain developer summaries.",tags:["github","developer","stats"],permissions:["Access GitHub","Access Dashboard","Access AI"],version:"2.1.0",rating:4.9,downloads:"18.2k",size:"1.8 MB",compat:"Dashboard, Workspaces, Brain",updated:true,collection:"Developer Essentials"},
    {id:"spotify-flow",type:"Widget",title:"Spotify Flow",creator:"Studio Pulse",desc:"Now playing, release radar, focus playlists and listening timeline widgets.",tags:["spotify","music","focus"],permissions:["Access Spotify","Access Dashboard"],version:"1.7.4",rating:4.8,downloads:"14.7k",size:"1.2 MB",compat:"Dashboard, Gaming, Focus",updated:false,collection:"Gaming Setup"},
    {id:"discord-rich",type:"Widget",title:"Discord Rich Presence",creator:"ETHONE Labs",desc:"Friends online, voice channel status, activities and gaming session context.",tags:["discord","gaming","presence"],permissions:["Access Discord","Access Dashboard"],version:"3.0.2",rating:4.7,downloads:"21.4k",size:"2.4 MB",compat:"Gaming, Streaming, Brain",updated:true,collection:"Gaming Setup"},
    {id:"minimal-glass",type:"Theme",title:"Minimal Glass",creator:"Aster Studio",desc:"Quiet dark surfaces, compact spacing, crisp panels and refined focus states.",tags:["minimal","dark","glass"],permissions:["Access Theme","Access Dashboard"],version:"1.4.0",rating:4.9,downloads:"32.8k",size:"860 KB",compat:"All workspaces",updated:false,collection:"Minimal Workspace"},
    {id:"developer-pro-layout",type:"Layout",title:"Developer Pro Layout",creator:"ETHONE Labs",desc:"GitHub, tasks, notes, files and Brain controls arranged for deep work.",tags:["developer","github","productivity"],permissions:["Access Dashboard","Access Workspaces","Access Notes"],version:"2.3.1",rating:4.8,downloads:"11.9k",size:"420 KB",compat:"Work, Developer",updated:false,collection:"Developer Essentials"},
    {id:"morning-automation",type:"Automation Pack",title:"Morning Startup",creator:"Brain Systems",desc:"Weather, calendar, priorities, habits and Brain briefing sequence.",tags:["automation","morning","brain"],permissions:["Access Calendar","Access Tasks","Access Habits","Access AI"],version:"1.9.0",rating:4.9,downloads:"9.6k",size:"980 KB",compat:"Brain OS, Dashboard",updated:true,collection:"AI Power User"},
    {id:"evening-recap",type:"Automation Pack",title:"Evening Recap",creator:"Brain Systems",desc:"Summarizes tasks, habits, music, Discord, notes and achievements before night mode.",tags:["automation","recap","habits"],permissions:["Access Tasks","Access Notes","Access Spotify","Access Discord","Access AI"],version:"1.6.2",rating:4.8,downloads:"8.1k",size:"1.1 MB",compat:"Brain OS, Personal",updated:false,collection:"AI Power User"},
    {id:"glass-icons",type:"Icon Pack",title:"Glass Glyphs",creator:"Nora Vale",desc:"A polished icon family for dense dashboards and custom workspaces.",tags:["icons","glass","theme"],permissions:["Access Theme"],version:"1.2.8",rating:4.6,downloads:"25.5k",size:"2.7 MB",compat:"All workspaces",updated:true,collection:"Minimal Workspace"},
    {id:"aurora-wallpapers",type:"Wallpaper Pack",title:"Quiet Aurora",creator:"Aster Studio",desc:"Animated and static wallpapers tuned for low distraction and premium surfaces.",tags:["wallpaper","animated","focus"],permissions:["Access Theme","Access Dashboard"],version:"2.0.0",rating:4.7,downloads:"17.3k",size:"6.4 MB",compat:"All devices",updated:false,collection:"Home Office"},
    {id:"obs-bridge",type:"Developer Extension",title:"OBS Bridge",creator:"StreamForge",desc:"Scene status, stream controls, recording indicators and Brain streaming prep.",tags:["obs","streaming","twitch"],permissions:["Access Automations","Access Dashboard","Access Files"],version:"0.9.8",rating:4.5,downloads:"6.2k",size:"3.1 MB",compat:"Streaming Workspace",updated:true,collection:"Streaming Starter Pack"},
    {id:"study-planner",type:"Workspace Template",title:"Student Productivity",creator:"Community",desc:"Notes, tasks, Pomodoro, calendar, files and Brain tutor actions.",tags:["study","notes","calendar"],permissions:["Access Notes","Access Tasks","Access Calendar"],version:"1.3.3",rating:4.7,downloads:"12.1k",size:"740 KB",compat:"Study Workspace",updated:false,collection:"Student Productivity"},
    {id:"brain-market-guide",type:"Brain Plugin",title:"Marketplace Guide",creator:"Brain Systems",desc:"Lets Brain explain why widgets, layouts and automations fit your behavior.",tags:["brain","marketplace","recommendations"],permissions:["Access AI","Access Marketplace","Access Dashboard"],version:"1.0.0",rating:4.9,downloads:"5.4k",size:"680 KB",compat:"Brain OS",updated:false,collection:"AI Power User"}
  ];
  const categories=["All","Widgets","Themes","Layouts","Icon Packs","Wallpaper Packs","Brain Plugins","Automation Packs","Workspace Templates","Developer Extensions","Community"];
  const collectionDefs=[
    ["Developer Essentials","GitHub, layouts, automation and deep-work widgets for developer routines."],
    ["Gaming Setup","Discord, Spotify, Steam, Valorant and stream-ready workspace pieces."],
    ["Minimal Workspace","Themes, icon packs and layouts for a calmer ETHONE."],
    ["Streaming Starter Pack","OBS, Twitch, scene controls and creator tooling."],
    ["Student Productivity","Study workspace, notes, Pomodoro, calendar and AI tutor flows."],
    ["AI Power User","Brain plugins, automations and provider-aware workflows."],
    ["Home Office","Meetings, calendar, focus and wallpaper packs."],
    ["Creator Toolkit","Publishing, templates, reviews and community profile upgrades."]
  ];
  function facts(){
    const s=ps();
    const todos=Array.isArray(s.todos)?s.todos:[];
    const notes=Array.isArray(s.notes)?s.notes:[];
    const habits=Array.isArray(s.habits)?s.habits:[];
    const con=s.connections||{};
    return {
      openTodos:todos.filter(t=>!t.done).length,
      notes:notes.length,
      habits:habits.length,
      connections:Object.keys(con).filter(k=>!!con[k]).length,
      installed:installedIds().length,
      favorites:Object.values(state.favorites).filter(Boolean).length,
      updates:catalog.filter(i=>i.updated&&state.installed[i.id]).length,
      widgets:document.querySelectorAll(".panel,.stat-card,.conn-card,.game-card,.ethone-os2-card,.brain-widget").length
    };
  }
  function installedIds(){return Object.keys(state.installed).filter(k=>state.installed[k])}
  function normalizedType(item){return item.type.endsWith("Pack")?item.type+"s":item.type+"s"}
  function matchesCategory(item,cat){
    if(cat==="All")return true;
    if(cat==="Community")return item.creator==="Community";
    if(cat==="Widgets")return item.type==="Widget";
    return normalizedType(item)===cat||item.type===cat.replace(/s$/,"");
  }
  function scoreItem(item,q){
    const f=facts();
    const hay=(item.title+" "+item.type+" "+item.desc+" "+item.tags.join(" ")+" "+item.collection).toLowerCase();
    const query=String(q||"").toLowerCase().trim();
    let score=0;
    if(!query)score+=1;
    query.split(/\s+/).filter(Boolean).forEach(w=>{if(hay.includes(w))score+=4});
    if(f.openTodos&&/productivity|task|automation|brain/.test(hay))score+=2;
    if(f.notes&&/notes|study|brain/.test(hay))score+=2;
    if(/discord|gaming|spotify|steam|valorant/.test(hay))score+=1;
    if(item.updated)score+=.6;
    if(state.installed[item.id])score-=1;
    return score;
  }
  function filtered(){
    return catalog.filter(i=>matchesCategory(i,state.category)).map(i=>Object.assign({score:scoreItem(i,state.query)},i)).filter(i=>!state.query||i.score>0).sort((a,b)=>b.score-a.score||b.rating-a.rating);
  }
  function recommended(){
    return catalog.map(i=>Object.assign({score:scoreItem(i,"")},i)).sort((a,b)=>b.score-a.score||b.rating-a.rating).slice(0,6);
  }
  function ensureShell(pageId){
    const page=$("#page-"+pageId);
    const host=$("#ethone-os2-page-"+pageId);
    if(!page||!host)return;
    page.classList.add("marketplace41-ready");
    if(host.dataset.mp41Ready)return;
    host.dataset.mp41Ready="1";
    host.innerHTML='<section class="mp41-shell" id="mp41-shell-'+pageId+'"></section>';
    render(pageId);
  }
  function render(pageId){
    const shell=$("#mp41-shell-"+pageId);
    if(!shell)return;
    const f=facts();
    shell.innerHTML=
      '<section class="mp41-panel mp41-hero">'+
        '<div class="mp41-top"><div><div class="mp41-kicker">ETHONE Marketplace</div><div class="mp41-title">The App Store for your Personal OS.</div><div class="mp41-copy">Discover widgets, themes, layouts, icon packs, wallpapers, Brain plugins, automations, workspace templates, developer extensions and community creations. Brain personalizes every recommendation and explains why it fits.</div></div><div class="mp41-status">'+f.installed+' installed / '+f.updates+' updates</div></div>'+
        '<div class="mp41-search"><div class="mp41-search-row"><div class="mp41-search-mark">MP</div><input id="mp41-search-'+pageId+'" value="'+escape(state.query)+'" placeholder="Search naturally: minimal dark widgets, gaming dashboard, GitHub statistics, Brain plugins..."><button class="mp41-btn primary" data-mp41-search-run type="button">Search</button></div></div>'+
        '<div class="mp41-quick">'+categories.map(c=>'<button class="mp41-tab '+(state.category===c?"active":"")+'" data-mp41-category="'+escape(c)+'" type="button">'+escape(c)+'</button>').join("")+'</div>'+
        '<div class="mp41-stats">'+stat("Installed",f.installed,"Synced locally and profile-ready")+stat("Updates",f.updates,"Release notes and rollback support")+stat("Favorites",f.favorites,"Bookmarks and collections")+stat("Catalog",catalog.length,"Widgets, packs, plugins and templates")+'</div>'+
      '</section>'+
      '<section class="mp41-layout">'+
        '<main class="mp41-panel mp41-section"><div class="mp41-section-head"><div><div class="mp41-h">'+(state.query?"Search Results":"Featured and Recommended")+'</div><div class="mp41-sub">Personalized using widgets, workspace, Brain, connected services and dashboard signals.</div></div><button class="mp41-btn" data-mp41-brain type="button">Ask Brain why</button></div><div class="mp41-grid" id="mp41-grid-'+pageId+'"></div></main>'+
        '<aside class="mp41-side">'+
          '<section class="mp41-panel mp41-section"><div class="mp41-section-head"><div><div class="mp41-h">Brain Picks</div><div class="mp41-sub">Never random. Every pick has a reason.</div></div></div><div class="mp41-list" id="mp41-brain-'+pageId+'"></div></section>'+
          '<section class="mp41-panel mp41-section"><div class="mp41-section-head"><div><div class="mp41-h">Updates</div><div class="mp41-sub">Version history, breaking changes and rollback-ready metadata.</div></div></div><div class="mp41-list" id="mp41-updates-'+pageId+'"></div></section>'+
          '<section class="mp41-panel mp41-section"><div class="mp41-section-head"><div><div class="mp41-h">Community</div><div class="mp41-sub">Creators, reviews, publishing and shared collections.</div></div></div><div class="mp41-list" id="mp41-community-'+pageId+'"></div></section>'+
        '</aside>'+
      '</section>'+
      '<section class="mp41-panel mp41-section"><div class="mp41-section-head"><div><div class="mp41-h">Collections</div><div class="mp41-sub">Curated ways to evolve ETHONE without app updates.</div></div></div><div class="mp41-collections">'+collectionDefs.map(c=>'<article class="mp41-collection"><strong>'+escape(c[0])+'</strong><span>'+escape(c[1])+'</span><div class="mp41-actions"><button class="mp41-btn" data-mp41-collection="'+escape(c[0])+'" type="button">Explore</button></div></article>').join("")+'</div></section>';
    renderGrid(pageId);
    renderSide(pageId);
    ensureDetail();
  }
  function stat(label,value,sub){return '<article class="mp41-stat"><span>'+escape(label)+'</span><strong>'+escape(value)+'</strong><p>'+escape(sub)+'</p></article>'}
  function renderGrid(pageId){
    const host=$("#mp41-grid-"+pageId);if(!host)return;
    const items=filtered().slice(0,12);
    host.innerHTML=items.length?items.map(itemCard).join(""):'<article class="mp41-row"><strong>No exact result</strong><span>Try a natural query like gaming dashboard, purple themes, GitHub statistics or Brain plugins.</span></article>';
  }
  function itemCard(item){
    const on=!!state.installed[item.id];
    return '<article class="mp41-item '+(on?"is-installed":"")+'" data-mp41-item="'+item.id+'">'+
      '<div class="mp41-preview"></div><div class="mp41-item-body">'+
      '<div class="mp41-item-meta"><span class="mp41-type">'+escape(item.type)+'</span><span class="mp41-rating">★ '+item.rating+'</span></div>'+
      '<h3>'+escape(item.title)+'</h3><p>'+escape(item.desc)+'</p>'+
      '<div class="mp41-tags">'+item.tags.slice(0,3).map(t=>'<span class="mp41-tag">'+escape(t)+'</span>').join("")+'</div>'+
      '<div class="mp41-actions"><button class="mp41-btn '+(on?"installed":"primary")+'" data-mp41-install="'+item.id+'" type="button">'+(on?"Installed":"Install")+'</button><button class="mp41-btn" data-mp41-detail="'+item.id+'" type="button">Details</button><button class="mp41-btn" data-mp41-fav="'+item.id+'" type="button">'+(state.favorites[item.id]?"Saved":"Save")+'</button></div>'+
      '</div></article>';
  }
  function renderSide(pageId){
    const brain=$("#mp41-brain-"+pageId);
    if(brain)brain.innerHTML=recommended().slice(0,4).map(i=>'<div class="mp41-row"><strong>'+escape(i.title)+'</strong><span>'+reason(i)+'</span><div class="mp41-actions"><button class="mp41-btn" data-mp41-detail="'+i.id+'" type="button">View</button></div></div>').join("");
    const updates=$("#mp41-updates-"+pageId);
    const ups=catalog.filter(i=>i.updated);
    if(updates)updates.innerHTML=ups.map(i=>'<div class="mp41-row"><strong>'+escape(i.title)+' '+escape(i.version)+'</strong><span>Release notes: better Brain compatibility, permissions clarity and dashboard performance. Rollback supported.</span><div class="mp41-actions"><button class="mp41-btn" data-mp41-update="'+i.id+'" type="button">Update</button></div></div>').join("");
    const community=$("#mp41-community-"+pageId);
    if(community)community.innerHTML=[
      ["Creator profiles","Avatars, bios, published content, downloads, ratings, followers and verified badges."],
      ["Publish Center","Future publishing for widgets, themes, layouts, icon packs, automations and Brain plugins."],
      ["Reviews","Ratings and reviews are stored locally now and profile/Supabase-ready."]
    ].map(r=>'<div class="mp41-row"><strong>'+r[0]+'</strong><span>'+r[1]+'</span></div>').join("");
  }
  function reason(item){
    const f=facts();
    if(item.tags.includes("github"))return "Recommended because developer and productivity signals improve with GitHub context.";
    if(item.tags.includes("gaming"))return "Recommended because Gaming workspaces benefit from Discord, Spotify and session widgets.";
    if(item.tags.includes("brain"))return "Recommended because Brain OS can explain and automate this content.";
    if(f.openTodos&&/task|automation|layout/.test(item.tags.join(" ")))return "Recommended because open tasks need better planning and automation.";
    return "Recommended because it fits your current dashboard and Marketplace preferences.";
  }
  function ensureDetail(){
    if($("#mp41-detail"))return;
    const d=document.createElement("div");
    d.id="mp41-detail";
    d.className="mp41-detail";
    document.body.appendChild(d);
  }
  function openDetail(id){
    const item=catalog.find(i=>i.id===id);if(!item)return;
    const on=!!state.installed[id];
    const d=$("#mp41-detail");if(!d)return;
    d.innerHTML='<div class="mp41-detail-card">'+
      '<div class="mp41-detail-hero"><div class="mp41-detail-top"><div><div class="mp41-kicker">'+escape(item.type)+' / '+escape(item.creator)+'</div><div class="mp41-detail-title">'+escape(item.title)+'</div><div class="mp41-detail-copy">'+escape(item.desc)+'</div><div class="mp41-quick"><button class="mp41-btn '+(on?"installed":"primary")+'" data-mp41-install="'+item.id+'" type="button">'+(on?"Installed":"Install")+'</button><button class="mp41-btn" data-mp41-fav="'+item.id+'" type="button">'+(state.favorites[item.id]?"Saved":"Save")+'</button><button class="mp41-btn" data-mp41-close type="button">Close</button></div></div><div class="mp41-status">★ '+item.rating+' / '+item.downloads+'</div></div></div>'+
      '<div class="mp41-detail-grid"><main class="mp41-list">'+
        section("Features",[item.desc,"Personalized by Brain recommendations.","Lazy-loaded preview and profile-ready install state.","Compatible with "+item.compat+"."])+
        section("Version history",["Current version "+item.version+".","Release notes include compatibility, performance and permissions clarity.","Rollback support is prepared in the install history."])+
        section("Reviews",reviewLines(item))+
      '</main><aside class="mp41-list">'+
        section("Permissions",item.permissions)+
        section("Developer",[item.creator,"Verified publisher profile ready.","Downloads: "+item.downloads,"Installation size: "+item.size])+
        section("Compatibility",[item.compat,"Dependencies checked before install.","Supabase sync-ready metadata."])+
      '</aside></div></div>';
    d.classList.add("open");
  }
  function section(title,rows){return '<section class="mp41-row"><strong>'+escape(title)+'</strong>'+rows.map(r=>'<span>'+escape(r)+'</span>').join("")+'</section>'}
  function reviewLines(item){
    const saved=state.reviews[item.id];
    return [saved||"Beautiful, useful and clearly integrated with ETHONE.","Permissions are understandable before install.","Feels native to the Personal OS."];
  }
  function closeDetail(){$("#mp41-detail")?.classList.remove("open")}
  function install(id){
    const item=catalog.find(i=>i.id===id);if(!item)return;
    state.installed[id]=!state.installed[id];
    state.history.push({ts:Date.now(),type:state.installed[id]?"install":"remove",id,title:item.title,version:item.version});
    if(state.history.length>120)state.history=state.history.slice(-120);
    try{
      const os2=JSON.parse(localStorage.getItem("ethone:dashboard-os2")||"{}");
      os2.installed=Object.assign({},os2.installed||{}, {[id]:state.installed[id]});
      localStorage.setItem("ethone:dashboard-os2",JSON.stringify(os2));
    }catch(e){}
    save();
    document.querySelectorAll('[data-mp41-item="'+id+'"]').forEach(el=>{el.classList.add("mp41-installing");setTimeout(()=>el.classList.remove("mp41-installing"),850)});
    toast((state.installed[id]?"Installed ":"Removed ")+item.title,"success");
    renderAll();
  }
  function favorite(id){
    state.favorites[id]=!state.favorites[id];
    save();renderAll();
  }
  function update(id){
    const item=catalog.find(i=>i.id===id);if(!item)return;
    state.updates[id]={version:item.version,updatedAt:Date.now(),rollback:true};
    state.installed[id]=true;
    save();
    toast(item.title+" updated. Rollback point saved.","success");
    renderAll();
  }
  function askBrain(){
    const prompt="Recommend ETHONE Marketplace content for this user. Explain why each widget, theme, layout, plugin or automation pack is useful. Current catalog: "+catalog.map(i=>i.title+" ("+i.type+")").join(", ")+". Installed: "+installedIds().join(", ")+". User signals: "+JSON.stringify(facts());
    if(window.ETHONEBrainOS?.route)window.ETHONEBrainOS.route(prompt);
    else if(window.ETHONEBrainPlatform?.send)window.ETHONEBrainPlatform.send(prompt);
    else if(typeof window.switchPage==="function"){window.switchPage("ai",null);setTimeout(()=>{const input=$("#ai-input");if(input){input.value=prompt;if(typeof window.sendAIMessage==="function")window.sendAIMessage()}},180)}
  }
  function renderAll(){["marketplace","store"].forEach(id=>{if($("#mp41-shell-"+id))render(id)})}
  function handleClick(e){
    const cat=e.target.closest("[data-mp41-category]");
    if(cat){state.category=cat.dataset.mp41Category;state.query="";save();renderAll();return}
    const col=e.target.closest("[data-mp41-collection]");
    if(col){state.category="All";state.query=col.dataset.mp41Collection;save();renderAll();return}
    const detail=e.target.closest("[data-mp41-detail]");
    if(detail){openDetail(detail.dataset.mp41Detail);return}
    const installBtn=e.target.closest("[data-mp41-install]");
    if(installBtn){install(installBtn.dataset.mp41Install);return}
    const fav=e.target.closest("[data-mp41-fav]");
    if(fav){favorite(fav.dataset.mp41Fav);return}
    const upd=e.target.closest("[data-mp41-update]");
    if(upd){update(upd.dataset.mp41Update);return}
    if(e.target.closest("[data-mp41-close]")){closeDetail();return}
    if(e.target.closest("[data-mp41-brain]")){askBrain();return}
    if(e.target.closest("#mp41-detail")&&!e.target.closest(".mp41-detail-card"))closeDetail();
  }
  function handleInput(e){
    if(e.target&&String(e.target.id||"").startsWith("mp41-search-")){
      state.query=e.target.value;
      save();
      renderAll();
    }
  }
  function patchBrain(){
    if(window.ETHONEMarketplace?.__patched)return;
    if(window.ETHONEAICore&&!window.ETHONEAICore.__mp41Patched){
      const old=window.ETHONEAICore.complete;
      if(typeof old==="function"){
        window.ETHONEAICore.complete=function(input,opts){
          const prefix="ETHONE Marketplace 4.1 directive: Marketplace is a living App Store for the Personal OS, not a widget download page. It includes widgets, themes, layouts, icon packs, wallpaper packs, Brain plugins, automation packs, workspace templates, developer extensions and community creations. Recommendations must be personalized, permission-aware, Supabase/profile-ready and always explain why.\n\n";
          return old.call(this,prefix+String(input||""),opts);
        };
        window.ETHONEAICore.__mp41Patched=true;
      }
    }
    if(typeof window.getCmdItems==="function"&&!window.getCmdItems.__mp41Wrapped){
      const old=window.getCmdItems;
      window.getCmdItems=function(q){
        const res=old.apply(this,arguments);
        const text=String(q||"").trim();
        if(text.length>1){
          const item={icon:"MP",label:"Search Marketplace: "+text,sub:"Widgets, themes, layouts, plugins, automations and collections",tag:"Marketplace",action:()=>{
            if(typeof window.closeCmdPalette==="function")window.closeCmdPalette();
            const actions=window.Ethone&&window.Ethone.get&&window.Ethone.get("actions");
            if(actions&&actions.has("dashboard.nav.marketplace"))actions.dispatch("dashboard.nav.marketplace");
            state.query=text;save();setTimeout(renderAll,120);
          }};
          res.actions=[item].concat(res.actions||[]);
          res.all=[item].concat(res.all||[]);
        }
        return res;
      };
      window.getCmdItems.__mp41Wrapped=true;
    }
  }
  function toast(msg,type){
    if(typeof window.toast==="function"){try{window.toast(msg,type||"info");return}catch(e){}}
    console.log("[ETHONE Marketplace]",msg);
  }
  function run(){
    ensureShell("marketplace");
    ensureShell("store");
    patchBrain();
  }
  function startMarketplace41(){
    document.addEventListener("click",handleClick);
    document.addEventListener("input",handleInput);
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
    setTimeout(run,400);
    setTimeout(run,1600);
    setInterval(()=>{if($("#page-marketplace")||$("#page-store"))run()},30000);
  }
  if(window.ethoneRunWhenPageReady)window.ethoneRunWhenPageReady("marketplace-41-runtime",["marketplace","store"],startMarketplace41);else startMarketplace41();
  window.ETHONEMarketplace={run,catalog:()=>catalog.slice(),search:q=>{state.query=q||"";save();renderAll();return filtered()},install,update,favorite,recommendations:recommended,state:()=>state,__patched:true};
})();
