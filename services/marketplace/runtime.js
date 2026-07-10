/* ETHONE Marketplace: verified local themes for the production appearance engine. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE)return;
  if(window.__ethoneMarketplaceStore)return;
  window.__ethoneMarketplaceStore=true;

  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const STORE_KEY="ethone:marketplace-store";
  const CATEGORIES=["Featured","Themes"];
  const state=loadState();
  let marketplaceActive=false;
  let themePreviewTimer=0;
  let startupTimers=[];

  const catalog=[];

  const THEME_MARKETPLACE=[
    themeItem("minimal-graphite","Minimal Graphite","A quiet graphite interface with violet focus states, soft contrast and low-noise panels.",["Dark","Minimal","Purple"],"1.5.1",["#09090b","#17171c","#8b5cf6","#f5f3ff","#a1a1aa"],{accent:"#8b5cf6",accent2:"#34d399",accent3:"#fb7185",accent4:"#d8c17a",accent5:"#a78bfa",bg:"#09090b",surface:"#17171c",glow:"rgba(139,92,246,0.23)",radius:1,blur:.85,density:"comfortable",fontFamily:"inter",fontScale:1,opacity:.96,glowScale:.86},["Sharper focus rings","Improved contrast on dark fields","Reduced visual noise"]),
    themeItem("linear-focus-theme","Linear Focus","A precise productivity theme with compact rhythm, readable borders and professional purple accents.",["Dark","Productivity","Dense"],"1.0.8",["#0a0a0d","#141419","#7c6df8","#f7f7fb","#8a8a96"],{accent:"#7c6df8",accent2:"#86efac",accent3:"#fb7185",accent4:"#fde68a",accent5:"#c4b5fd",bg:"#0a0a0d",surface:"#141419",glow:"rgba(124,109,248,0.18)",radius:.82,blur:.65,density:"compact",fontFamily:"inter",fontScale:.97,opacity:.98,glowScale:.58},["Compact density preset","Softer panel borders","Better keyboard focus"]),
    themeItem("obsidian-violet","Obsidian Violet","An OLED-first theme with deep black surfaces, high contrast text and a restrained violet glow.",["OLED","High Contrast","Premium"],"2.0.0",["#050507","#101014","#a78bfa","#ffffff","#71717a"],{accent:"#a78bfa",accent2:"#5eead4",accent3:"#fda4af",accent4:"#facc15",accent5:"#ddd6fe",bg:"#050507",surface:"#101014",glow:"rgba(167,139,250,0.20)",radius:1.08,blur:.5,density:"cozy",fontFamily:"system",fontScale:1.01,opacity:1,glowScale:.72},["OLED-safe background","Higher text contrast","Cleaner glass layers"]),
    themeItem("studio-amethyst","Studio Amethyst","A creative workspace theme with warmer violet panels, soft depth and polished preview surfaces.",["Creative","Purple","Glass"],"1.2.3",["#0c0812","#1a1124","#9d7cff","#fff7ff","#bda7ff"],{accent:"#9d7cff",accent2:"#34d399",accent3:"#fb7185",accent4:"#fbbf24",accent5:"#c4b5fd",bg:"#0c0812",surface:"#1a1124",glow:"rgba(157,124,255,0.26)",radius:1.22,blur:1.08,density:"comfortable",fontFamily:"grotesk",fontScale:1.03,opacity:.92,glowScale:1.05},["New creative preview states","Warmer glass surfaces","Better panel separation"])
  ];

  function themeItem(id,title,description,tags,version,palette,tokens,changelog){
    return {
      id,category:"Themes",title,author:"ETHONE",description,tags,version,
      size:"Theme",compat:"All Workspaces",permissions:["Apply appearance settings","Save theme to profile"],
      changelog,visual:"theme",
      verified:true,badges:["Verified","Theme","One-click"],
      notes:["Applies through the ETHONE appearance variables.","Can be previewed without permanently changing your profile."],
      palette,tokens,isTheme:true
    };
  }

  function loadState(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORE_KEY)||"{}");
      return {
        category:CATEGORIES.includes(saved.category)?saved.category:"Featured",
        query:String(saved.query||""),
        selected:saved.selected||"minimal-graphite",
        installed:saved.installed&&typeof saved.installed==="object"?saved.installed:{},
        favorites:saved.favorites&&typeof saved.favorites==="object"?saved.favorites:{},
        customThemes:Array.isArray(saved.customThemes)?saved.customThemes:[],
        activeThemeId:saved.activeThemeId||"",
        history:Array.isArray(saved.history)?saved.history:[]
      };
    }catch(e){
      return {category:"Featured",query:"",selected:"minimal-graphite",installed:{},favorites:{},customThemes:[],activeThemeId:"",history:[]};
    }
  }

  function save(){
    try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(e){}
    try{
      const profile=typeof window.curP==="function"?window.curP():null;
      if(profile&&profile.state){
        profile.state.marketplace=Object.assign({},profile.state.marketplace||{},{
          installed:state.installed,
          favorites:state.favorites,
          customThemes:state.customThemes,
          activeThemeId:state.activeThemeId,
          history:state.history.slice(-80),
          updatedAt:Date.now()
        });
        if(typeof window.saveStateNow==="function")window.saveStateNow();
      }
    }catch(e){}
  }

  function escapeHTML(value){
    return String(value??"").replace(/[&<>"]/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch];
    });
  }

  function installedIds(){
    return Object.keys(state.installed).filter(function(id){return isInstalled({id:id});});
  }

  function isInstalled(entry){
    return !!(entry&&entry.id&&state.installed&&state.installed[entry.id]);
  }

  function installedVersion(entry){
    const value=entry&&entry.id?state.installed[entry.id]:null;
    if(value&&typeof value==="object")return value.version||"";
    return value?"" :"";
  }

  function hasUpdate(entry){
    if(!isInstalled(entry))return false;
    const current=installedVersion(entry);
    return !!(current&&entry&&current!==entry.version);
  }

  function installLabel(entry){
    if(entry&&entry.category==="Themes"){
      if(state.activeThemeId===entry.id)return "Active";
      return isInstalled(entry)?"Apply":"Install";
    }
    if(hasUpdate(entry))return "Update";
    return isInstalled(entry)?"Installed":"Install";
  }

  function itemScore(entry){
    let score=40;
    const page=currentPageName();
    const text=[entry.id,entry.category,entry.title,entry.description,(entry.tags||[]).join(" "),entry.compat].join(" ").toLowerCase();
    if(/dashboard|home/.test(page)&&/widget|brain|brief|layout/.test(text))score+=22;
    if(/ai|brain/.test(page)&&/brain|ai|memory|automation/.test(text))score+=30;
    if(/gaming|valorant/.test(page)&&/gaming|discord|spotify|steam|valorant/.test(text))score+=30;
    if(/settings/.test(page)&&/theme|sdk|plugin|settings|appearance/.test(text))score+=20;
    if(/files/.test(page)&&/drive|files|search|document/.test(text))score+=24;
    if(isInstalled(entry))score-=16;
    if(entry.verified)score+=4;
    return score;
  }

  function currentPageName(){
    try{
      const active=document.querySelector(".tab-content.active,[data-qa-page].active");
      if(active&&active.id)return active.id.replace(/^page-/,"").toLowerCase();
      if(window.__ethoneCurrentPage)return String(window.__ethoneCurrentPage).toLowerCase();
    }catch(e){}
    return "";
  }

  function brainRecommendations(limit){
    return allItems().filter(function(entry){
      return entry.category!=="Themes"||state.category==="Themes"||entry.id==="minimal-graphite"||entry.id==="linear-focus-theme";
    }).sort(function(a,b){
      return itemScore(b)-itemScore(a)||a.title.localeCompare(b.title);
    }).slice(0,limit||4);
  }

  function customThemeItems(){
    return state.customThemes.map(function(theme){
      return Object.assign({},theme,{
        category:"Themes",
        author:theme.author||"You",
        tags:Array.isArray(theme.tags)?theme.tags:["Custom","Local"],
        version:theme.version||"1.0.0",
        size:"Local",
        compat:"This profile",
        permissions:["Apply appearance settings","Saved locally"],
        changelog:Array.isArray(theme.changelog)?theme.changelog:["Created locally in ETHONE Theme Studio"],
        visual:"theme",
        updated:false,
        isTheme:true,
        custom:true
      });
    });
  }

  function allThemeItems(){
    const existing=catalog.filter(function(entry){return entry.category==="Themes";});
    const existingById={};
    existing.forEach(function(entry){existingById[entry.id]=entry;});
    const enriched=THEME_MARKETPLACE.map(function(theme){
      return Object.assign({},existingById[theme.id]||{},theme);
    });
    return enriched.concat(customThemeItems());
  }

  function marketplaceItems(){
    if(state.category==="Featured")return allItems().sort(function(a,b){return itemScore(b)-itemScore(a)||a.title.localeCompare(b.title);});
    if(state.category==="Themes")return allThemeItems();
    return catalog.filter(function(entry){return entry.category===state.category;});
  }

  function filteredItems(){
    const query=state.query.trim().toLowerCase();
    return marketplaceItems().filter(function(entry){
      if(!query)return true;
      const haystack=[entry.title,entry.author,entry.description,entry.category,entry.tags.join(" "),entry.compat,(entry.palette||[]).join(" ")].join(" ").toLowerCase();
      return haystack.includes(query);
    }).sort(function(a,b){
      if(state.category==="Featured")return itemScore(b)-itemScore(a)||a.title.localeCompare(b.title);
      return Number(isInstalled(b))-Number(isInstalled(a))||Number(state.activeThemeId===b.id)-Number(state.activeThemeId===a.id)||a.title.localeCompare(b.title);
    });
  }

  function ensurePage(id){
    if($("#page-"+id))return;
    const page=document.createElement("div");
    page.className="tab-content";
    page.id="page-"+id;
    page.setAttribute("role","tabpanel");
    page.setAttribute("aria-live","polite");
    page.dataset.qaPage="true";
    page.innerHTML='<div id="ethone-os2-page-'+id+'"></div>';
    const settings=$("#page-settings")||$("#page-ai")||$(".content");
    if(settings&&settings.parentNode)settings.parentNode.insertBefore(page,settings);
    else document.body.appendChild(page);
  }

  function ensureShell(pageId){
    ensurePage(pageId);
    const page=$("#page-"+pageId);
    if(!page)return null;
    let host=$("#ethone-os2-page-"+pageId,page);
    if(!host){
      host=document.createElement("div");
      host.id="ethone-os2-page-"+pageId;
      page.appendChild(host);
    }
    page.classList.add("marketplace41-ready");
    if(!$("#mp41-shell-"+pageId,host)){
      host.innerHTML='<section class="mp41-shell mp-store" id="mp41-shell-'+pageId+'"></section>';
    }
    return $("#mp41-shell-"+pageId,host);
  }

  function getSelected(){
    const visible=filteredItems();
    return visible.find(function(entry){return entry.id===state.selected;})||visible[0]||catalog[0];
  }

  function renderMarketplacePage(pageId){
    const shell=ensureShell(pageId||"marketplace");
    if(!shell)return;
    const selected=getSelected();
    const installed=installedIds();
    shell.innerHTML=
      '<section class="mp41-panel mp41-hero mp-store-hero">'+
        '<div class="mp41-top">'+
          '<div>'+
            '<div class="mp41-kicker">ETHONE Marketplace</div>'+
            '<div class="mp41-title">Themes built for your Personal OS.</div>'+ 
            '<div class="mp41-copy">Preview and apply verified ETHONE themes. Every package uses the current appearance engine, stays local to your profile and can be removed without affecting your content.</div>'+ 
          '</div>'+
          '<div class="mp41-status">'+installed.length+' installed</div>'+
        '</div>'+
        '<div class="mp-store-search" role="search">'+
          '<span class="mp-store-search-icon">K</span>'+
          '<input id="mp41-search-'+pageId+'" value="'+escapeHTML(state.query)+'" placeholder="Search themes, palettes and styles..." autocomplete="off" />'+
        '</div>'+
        '<div class="mp-store-categories" role="tablist" aria-label="Marketplace categories">'+
          CATEGORIES.map(function(category){
            return '<button class="mp41-tab '+(state.category===category?'active':'')+'" data-mp41-category="'+escapeHTML(category)+'" type="button" role="tab" aria-selected="'+(state.category===category?'true':'false')+'">'+escapeHTML(category)+'</button>';
          }).join("")+
        '</div>'+
        '<div class="mp41-stats">'+
          stat("Themes",allItems().length,"Verified packages for the current appearance engine")+
          stat("Installed",installed.length,"Saved locally to this profile")+
          stat("Custom",state.customThemes.length,"Themes created in ETHONE")+
          stat("Active",state.activeThemeId?1:0,state.activeThemeId?"A Marketplace theme is active":"Using the profile appearance")+
        '</div>'+
      '</section>'+
      brainRecommendationSection()+
      '<section class="mp-store-layout">'+
        '<main class="mp41-panel mp-store-catalog" aria-label="Marketplace catalog">'+
          '<div class="mp41-section-head"><div><div class="mp41-h">'+escapeHTML(state.category)+'</div><div class="mp41-sub">Verified themes, live previews and local custom packages.</div></div><div class="mp41-head-actions">'+(state.category==="Themes"?'<button class="mp41-btn primary" data-theme-create type="button">Create theme</button>':'')+'<button class="mp41-btn" data-mp41-brain type="button">Ask Brain</button></div></div>'+ 
          '<div class="mp-store-grid">'+filteredItems().map(card).join("")+'</div>'+
        '</main>'+
        '<aside class="mp41-panel mp-store-detail" aria-live="polite">'+detail(selected)+'</aside>'+
      '</section>'+
      '<section class="mp41-panel mp-store-collections">'+
        '<div class="mp41-section-head"><div><div class="mp41-h">Theme directions</div><div class="mp41-sub">Choose a visual rhythm that remains compatible with every ETHONE surface.</div></div></div>'+ 
        '<div class="mp-store-collection-grid">'+collection("Quiet graphite","Low-noise surfaces and restrained focus states.","graphite")+collection("OLED contrast","Deep black surfaces with clear hierarchy.","oled")+collection("Compact focus","Denser spacing for work sessions.","focus")+collection("Creative glass","Softer depth for visual workspaces.","amethyst")+'</div>'+
      '</section>';
  }

  function stat(label,value,sub){
    return '<article class="mp41-stat"><span>'+escapeHTML(label)+'</span><strong>'+escapeHTML(value)+'</strong><p>'+escapeHTML(sub)+'</p></article>';
  }

  function brainRecommendationSection(){
    const items=brainRecommendations(4);
    return '<section class="mp41-panel mp-store-brain" aria-label="Brain marketplace recommendations">'+
      '<div class="mp41-section-head"><div><div class="mp41-h">Brain recommends</div><div class="mp41-sub">Contextual picks based on the current page, workspace signals and what is not installed yet.</div></div><button class="mp41-btn" data-mp41-brain type="button">Ask Brain why</button></div>'+
      '<div class="mp-brain-grid">'+items.map(function(entry){
        const reason=recommendationReason(entry);
        return '<article class="mp-brain-card" data-mp41-select="'+escapeHTML(entry.id)+'">'+
          '<div class="mp-app-icon '+escapeHTML(entry.visual)+'">'+escapeHTML(entry.title.slice(0,1))+'</div>'+
          '<div><strong>'+escapeHTML(entry.title)+'</strong><span>'+escapeHTML(reason)+'</span><small>'+escapeHTML(entry.category)+' - '+(entry.verified?'Verified':'Community')+'</small></div>'+
          '<button class="mp41-btn '+(isInstalled(entry)&&!hasUpdate(entry)?'installed':'primary')+'" data-mp41-install="'+escapeHTML(entry.id)+'" type="button">'+escapeHTML(installLabel(entry))+'</button>'+
        '</article>';
      }).join("")+'</div>'+
    '</section>';
  }

  function recommendationReason(entry){
    const text=[entry.id,entry.category,entry.title,(entry.tags||[]).join(" "),entry.compat].join(" ").toLowerCase();
    const page=currentPageName();
    if(/ai|brain/.test(page)&&/brain|ai|memory|automation/.test(text))return "Fits the Brain context currently open.";
    if(/gaming|valorant/.test(page)&&/gaming|discord|spotify|steam|valorant/.test(text))return "Matches your gaming workspace signals.";
    if(/settings/.test(page)&&/theme|sdk|appearance|plugin/.test(text))return "Useful for configuring ETHONE safely.";
    if(/files/.test(page)&&/drive|files|search/.test(text))return "Improves files, search and document context.";
    if(/github|developer|dev/.test(text))return "Strong fit for a development workflow.";
    if(/theme|graphite|focus/.test(text))return "Improves visual clarity without adding noise.";
    return "Verified for the current ETHONE appearance engine.";
  }

  function statusBadges(entry){
    const out=[];
    if(entry.verified)out.push({label:"Verified",kind:"verified"});
    if(isInstalled(entry))out.push({label:hasUpdate(entry)?"Update":"Installed",kind:hasUpdate(entry)?"update":"installed"});
    if(entry.category==="Integrations")out.push({label:"API ready",kind:"api"});
    if(entry.category==="AI Agents")out.push({label:"Brain",kind:"brain"});
    return out.concat((entry.badges||[]).filter(function(badge){return !/verified|one-click/i.test(badge);}).slice(0,1).map(function(label){return {label:label,kind:"soft"};})).slice(0,4);
  }

  function card(entry){
    const active=entry.id===getSelected().id;
    const installed=isInstalled(entry);
    const themeActive=entry.category==="Themes"&&state.activeThemeId===entry.id;
    return '<article class="mp-store-card '+(active?'is-active':'')+' '+(installed?'is-installed':'')+' '+(entry.verified?'is-verified':'')+'" data-mp41-select="'+entry.id+'" tabindex="0">'+
      '<div class="mp-store-thumb '+escapeHTML(entry.visual)+'">'+previewMarkup(entry)+'</div>'+
      '<div class="mp-store-card-body">'+
        '<div class="mp-store-card-top"><span>'+escapeHTML(entry.category)+'</span><span>'+(themeActive?'Active':entry.custom?'Local':'Verified')+'</span></div>'+ 
        '<h3>'+escapeHTML(entry.title)+'</h3>'+
        '<p>'+escapeHTML(entry.description)+'</p>'+
        (entry.category==="Themes"?paletteMarkup(entry.palette):'')+
        '<div class="mp-store-badges">'+statusBadges(entry).map(function(badge){return '<span class="'+escapeHTML(badge.kind)+'">'+escapeHTML(badge.label)+'</span>';}).join("")+'</div>'+
        '<div class="mp-store-tags">'+entry.tags.slice(0,3).map(function(tag){return '<span>'+escapeHTML(tag)+'</span>';}).join("")+'</div>'+
        '<div class="mp-store-actions">'+
          '<button class="mp41-btn '+(installed&&!hasUpdate(entry)?'installed':'primary')+'" data-mp41-install="'+entry.id+'" type="button">'+escapeHTML(installLabel(entry))+'</button>'+
          '<button class="mp41-btn" data-mp41-select="'+entry.id+'" type="button">Details</button>'+
        '</div>'+
      '</div>'+
    '</article>';
  }

  function previewMarkup(entry){
    if(entry.category==="Themes"){
      const palette=entry.palette&&entry.palette.length?entry.palette:["#09090b","#17171c","#8b5cf6","#f5f3ff"];
      return '<div class="theme-preview-window" style="--theme-preview-accent:'+escapeHTML(palette[2]||"#8b5cf6")+';--theme-preview-bg:'+escapeHTML(palette[0]||"#09090b")+';--theme-preview-surface:'+escapeHTML(palette[1]||"#17171c")+'"><div class="theme-preview-top"><i></i><i></i><i></i></div><div class="theme-preview-body"><aside></aside><main><strong>'+escapeHTML(entry.title)+'</strong><span></span><span></span><div></div></main></div></div>';
    }
    return '<div class="mp-preview-window"><i></i><i></i><i></i><strong>'+escapeHTML(entry.title.slice(0,2).toUpperCase())+'</strong><span></span><span></span><span></span></div>';
  }

  function paletteMarkup(palette){
    if(!palette||!palette.length)return "";
    return '<div class="theme-palette">'+palette.slice(0,6).map(function(color){return '<span style="background:'+escapeHTML(color)+'" title="'+escapeHTML(color)+'"></span>';}).join("")+'</div>';
  }

  function detail(entry){
    if(!entry)return '<div class="mp-store-empty">Select an item.</div>';
    if(entry.category==="Themes")return themeDetail(entry);
    const installed=isInstalled(entry);
    return '<div class="mp-detail-head">'+
        '<div class="mp-store-thumb large '+escapeHTML(entry.visual)+'">'+previewMarkup(entry)+'</div>'+
        '<div><div class="mp41-kicker">'+escapeHTML(entry.category)+' / '+escapeHTML(entry.author)+'</div><h2>'+escapeHTML(entry.title)+'</h2><p>'+escapeHTML(entry.description)+'</p></div>'+
      '</div>'+
      '<div class="mp-package-meta"><strong>Version '+escapeHTML(entry.version)+'</strong><span>Local package</span><span>'+escapeHTML(entry.verified?'Verified by ETHONE':'Custom package')+'</span><span>'+escapeHTML(hasUpdate(entry)?'Update available':'Current')+'</span></div>'+ 
      '<div class="mp-detail-actions">'+
        '<button class="mp41-btn '+(installed&&!hasUpdate(entry)?'installed':'primary')+'" data-mp41-install="'+entry.id+'" type="button">'+escapeHTML(installLabel(entry))+'</button>'+
        (installed?'<button class="mp41-btn danger" data-mp41-remove="'+escapeHTML(entry.id)+'" type="button">Uninstall</button>':'')+
        '<button class="mp41-btn" data-mp41-favorite="'+entry.id+'" type="button">'+(state.favorites[entry.id]?'Saved':'Save')+'</button>'+
      '</div>'+ 
      '<div class="mp-detail-meta">'+
        meta("Version",entry.version)+meta("Author",entry.author)+meta("Size",entry.size)+meta("Verification",entry.verified?"Verified":"Custom")+meta("Compatibility",entry.compat)+
      '</div>'+ 
      detailSection("Release notes",entry.notes||[])+
      detailSection("Permissions",entry.permissions)+
      detailSection("Changelog",entry.changelog);
  }

  function themeDetail(entry){
    const installed=isInstalled(entry);
    const active=state.activeThemeId===entry.id;
    return '<div class="theme-detail">'+
      '<div class="mp-detail-head">'+
        '<div class="mp-store-thumb large theme">'+previewMarkup(entry)+'</div>'+
        '<div><div class="mp41-kicker">Theme / '+escapeHTML(entry.author)+'</div><h2>'+escapeHTML(entry.title)+'</h2><p>'+escapeHTML(entry.description)+'</p>'+paletteMarkup(entry.palette)+'</div>'+
      '</div>'+
      '<div class="mp-package-meta"><strong>Version '+escapeHTML(entry.version)+'</strong><span>'+(entry.custom?'Local theme':'Built-in theme')+'</span><span>'+(entry.verified?'Verified by ETHONE':'Custom package')+'</span><span>'+(active?'Active now':hasUpdate(entry)?'Update available':'Current')+'</span></div>'+ 
      '<div class="mp-detail-actions">'+
        '<button class="mp41-btn '+(active?'installed':'primary')+'" data-mp41-install="'+entry.id+'" type="button">'+escapeHTML(active?'Active theme':installLabel(entry)+' theme')+'</button>'+
        '<button class="mp41-btn" data-theme-preview="'+entry.id+'" type="button">Preview</button>'+
        '<button class="mp41-btn" data-mp41-favorite="'+entry.id+'" type="button">'+(state.favorites[entry.id]?'Saved':'Save')+'</button>'+
        (installed&&!active?'<button class="mp41-btn danger" data-mp41-remove="'+escapeHTML(entry.id)+'" type="button">Uninstall</button>':'')+
        (entry.custom?'<button class="mp41-btn" data-theme-edit="'+entry.id+'" type="button">Edit</button>':'')+
      '</div>'+
      '<div class="mp-detail-meta">'+
        meta("Version",entry.version)+meta("Author",entry.author)+meta("Status",active?"Active":installed?"Installed":"Not installed")+meta("Compatibility",entry.compat)+
      '</div>'+
      '<section class="mp-detail-section"><h3>Palette</h3><div class="theme-palette large">'+(entry.palette||[]).map(function(color){return '<span style="background:'+escapeHTML(color)+'"><em>'+escapeHTML(color)+'</em></span>';}).join("")+'</div></section>'+
      detailSection("Release notes",entry.notes||[])+
      detailSection("Changelog",entry.changelog||[])+
      detailSection("Permissions",entry.permissions||[])+
    '</div>';
  }

  function meta(label,value){
    return '<div><span>'+escapeHTML(label)+'</span><strong>'+escapeHTML(value)+'</strong></div>';
  }

  function detailSection(title,rows){
    return '<section class="mp-detail-section"><h3>'+escapeHTML(title)+'</h3>'+rows.map(function(row){return '<p>'+escapeHTML(row)+'</p>';}).join("")+'</section>';
  }

  function collection(title,copy,query){
    return '<article class="mp-store-collection"><strong>'+escapeHTML(title)+'</strong><span>'+escapeHTML(copy)+'</span><button class="mp41-btn" data-mp41-query="'+escapeHTML(query)+'" type="button">Explore</button></article>';
  }

  function setSelected(id){
    if(allItems().some(function(entry){return entry.id===id;})){
      state.selected=id;
      save();
      renderAll();
    }
  }

  function install(id){
    const entry=allItems().find(function(item){return item.id===id;});
    if(!entry||entry.category!=="Themes")return false;
    state.installed[id]={version:entry.version,installedAt:(state.installed[id]&&state.installed[id].installedAt)||Date.now(),updatedAt:Date.now()};
    state.activeThemeId=id;
    applyThemePackage(entry,true);
    state.history.push({id,action:"apply-theme",title:entry.title,category:entry.category,version:entry.version,ts:Date.now()});
    state.history=state.history.slice(-120);
    save();
    notify("Theme applied: "+entry.title,"Theme Marketplace","success");
    recordTimeline(entry,"applied");
    renderAll();
    return true;
  }

  function uninstall(id){
    const entry=allItems().find(function(item){return item.id===id;});
    if(!entry||!isInstalled(entry))return;
    delete state.installed[id];
    if(state.activeThemeId===id)state.activeThemeId="";
    state.history.push({id,action:"uninstall",title:entry.title,category:entry.category,version:entry.version,ts:Date.now()});
    state.history=state.history.slice(-120);
    save();
    notify("Uninstalled "+entry.title,"Marketplace","info");
    recordTimeline(entry,"uninstalled");
    renderAll();
  }

  function favorite(id){
    const entry=allItems().find(function(item){return item.id===id;});
    if(!entry)return;
    state.favorites[id]=!state.favorites[id];
    save();
    notify((state.favorites[id]?"Saved ":"Removed ")+entry.title,"Marketplace","info");
    renderAll();
  }

  function allItems(){
    const byId={};
    catalog.forEach(function(entry){byId[entry.id]=entry;});
    allThemeItems().forEach(function(entry){byId[entry.id]=entry;});
    return Object.keys(byId).map(function(id){return byId[id];});
  }

  function applyThemePackage(entry,persist){
    if(!entry||!entry.tokens)return;
    const tokens=entry.tokens;
    const root=document.documentElement.style;
    const accent=tokens.accent||"#8b5cf6";
    const rgb=hexToRgb(accent);
    root.setProperty("--accent",accent);
    root.setProperty("--accent-light",tokens.accent5||accent);
    root.setProperty("--accent2",tokens.accent2||"#34d399");
    root.setProperty("--accent3",tokens.accent3||"#fb7185");
    root.setProperty("--accent4",tokens.accent4||"#fbbf24");
    root.setProperty("--accent5",tokens.accent5||"#a78bfa");
    root.setProperty("--accent-glow",tokens.glow||"rgba("+rgb+",0.24)");
    root.setProperty("--accent-subtle","rgba("+rgb+",0.10)");
    root.setProperty("--border3","rgba("+rgb+",0.24)");
    root.setProperty("--eh-accent-rgb",rgb);
    root.setProperty("--bg",tokens.bg||"#09090b");
    root.setProperty("--surface",tokens.surface||"#17171c");
    root.setProperty("--theme-radius-scale",tokens.radius!=null?tokens.radius:1);
    root.setProperty("--theme-blur-scale",tokens.blur!=null?tokens.blur:1);
    root.setProperty("--theme-glow-scale",tokens.glowScale!=null?tokens.glowScale:1);
    root.setProperty("--theme-surface-opacity",tokens.opacity!=null?tokens.opacity:1);
    root.setProperty("--theme-font-scale",tokens.fontScale!=null?tokens.fontScale:1);
    document.documentElement.setAttribute("data-density",tokens.density==="comfortable"?"":(tokens.density||""));
    document.documentElement.setAttribute("data-font",tokens.fontFamily==="inter"?"":(tokens.fontFamily||""));
    if(persist){
      const profile=typeof window.curP==="function"?window.curP():null;
      if(profile){
        profile.themeIdx=99;
        profile.customAccent=accent;
        profile.marketplaceTheme={id:entry.id,title:entry.title,author:entry.author,tokens:Object.assign({},tokens),palette:(entry.palette||[]).slice(),version:entry.version};
        if(!profile.state)profile.state={};
        profile.state.marketplaceTheme=profile.marketplaceTheme;
        if(profile.theme){
          ["radius","blur","density","fontFamily","fontScale","opacity"].forEach(function(key){
            if(tokens[key]!=null)profile.theme[key]=tokens[key];
          });
        }
        try{if(typeof window.saveStateNow==="function")window.saveStateNow();}catch(e){}
      }
    }
  }

  function restoreMarketplaceTheme(){
    if(themePreviewTimer){clearTimeout(themePreviewTimer);themePreviewTimer=0;}
    const profile=typeof window.curP==="function"?window.curP():null;
    const active=profile&&(profile.marketplaceTheme||(profile.state&&profile.state.marketplaceTheme));
    if(!active||!active.tokens)return;
    applyThemePackage({id:active.id,title:active.title,author:active.author,tokens:active.tokens,palette:active.palette,version:active.version,category:"Themes"},false);
    state.activeThemeId=active.id||state.activeThemeId;
  }

  function previewTheme(entry){
    applyThemePackage(entry,false);
    notify("Previewing "+entry.title+". Install it to keep this theme after reload.","Theme Marketplace","info");
    if(themePreviewTimer)clearTimeout(themePreviewTimer);
    themePreviewTimer=setTimeout(function(){themePreviewTimer=0;restoreMarketplaceTheme();},6000);
  }

  function openThemeCreator(id){
    const existing=id?allThemeItems().find(function(entry){return entry.id===id;}):null;
    const theme=existing&&existing.custom?existing:null;
    const palette=(theme&&theme.palette)||["#09090b","#17171c","#8b5cf6","#f5f3ff","#a1a1aa"];
    const tokens=(theme&&theme.tokens)||{};
    closeThemeCreator();
    const overlay=document.createElement("div");
    overlay.className="theme-creator-overlay";
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-label",theme?"Edit custom ETHONE theme":"Create custom ETHONE theme");
    overlay.innerHTML=
      '<form class="theme-creator-card" data-theme-creator-form data-theme-id="'+escapeHTML(theme?theme.id:"")+'">'+
        '<div class="theme-creator-head">'+
          '<div><span>Theme Studio</span><h2>'+(theme?"Edit your theme":"Create your theme")+'</h2><p>Build a local ETHONE theme with a palette, version and changelog. It stays compatible with the current appearance engine.</p></div>'+
          '<button class="mp41-btn" data-theme-creator-close type="button" aria-label="Close theme creator">Close</button>'+
        '</div>'+
        '<div class="theme-creator-grid">'+
          creatorField("Theme name","title","text",theme?theme.title:"My ETHONE Theme")+
          creatorField("Author","author","text",theme?theme.author:"You")+
          creatorField("Version","version","text",theme?theme.version:"1.0.0")+
          creatorField("Accent","accent","color",tokens.accent||palette[2]||"#8b5cf6")+
          creatorField("Background","bg","color",tokens.bg||palette[0]||"#09090b")+
          creatorField("Surface","surface","color",tokens.surface||palette[1]||"#17171c")+
          creatorField("Text","text","color",palette[3]||"#f5f3ff")+
          creatorField("Muted","muted","color",palette[4]||"#a1a1aa")+
          '<label class="theme-creator-field wide"><span>Description</span><textarea name="description" rows="3">'+escapeHTML(theme?theme.description:"A custom premium ETHONE theme tuned for my workspace.")+'</textarea></label>'+
          '<label class="theme-creator-field wide"><span>Changelog</span><textarea name="changelog" rows="3">'+escapeHTML((theme&&theme.changelog?theme.changelog:["Created locally in ETHONE Theme Studio"]).join("\\n"))+'</textarea></label>'+
        '</div>'+
        '<div class="theme-creator-preview" aria-hidden="true">'+
          '<div class="theme-preview-window" style="--theme-bg:'+(tokens.bg||palette[0]||"#09090b")+';--theme-surface:'+(tokens.surface||palette[1]||"#17171c")+';--theme-accent:'+(tokens.accent||palette[2]||"#8b5cf6")+'">'+
            '<div class="theme-preview-top"><span></span><span></span><span></span><strong>ETHONE</strong></div>'+
            '<div class="theme-preview-body"><aside><i></i><i></i><i></i></aside><main><b></b><em></em><div><span></span><span></span></div></main></div>'+
          '</div>'+
          paletteMarkup([tokens.bg||palette[0],tokens.surface||palette[1],tokens.accent||palette[2],palette[3],palette[4]])+
        '</div>'+
        '<div class="theme-creator-actions">'+
          (theme?'<button class="mp41-btn danger" data-theme-delete="'+escapeHTML(theme.id)+'" type="button">Delete</button>':'<span></span>')+
          '<div><button class="mp41-btn" data-theme-creator-close type="button">Cancel</button><button class="mp41-btn primary" data-theme-save type="submit">Save and apply</button></div>'+
        '</div>'+
      '</form>';
    document.body.appendChild(overlay);
    const first=overlay.querySelector("input[name='title']");
    if(first)first.focus();
  }

  function creatorField(label,name,type,value){
    return '<label class="theme-creator-field"><span>'+escapeHTML(label)+'</span><input name="'+escapeHTML(name)+'" type="'+escapeHTML(type)+'" value="'+escapeHTML(value)+'" required /></label>';
  }

  function closeThemeCreator(){
    $$(".theme-creator-overlay").forEach(function(node){node.remove();});
  }

  function saveCustomTheme(form){
    if(!form)return;
    const data=new FormData(form);
    const id=form.dataset.themeId||("custom-theme-"+Date.now().toString(36));
    const accent=String(data.get("accent")||"#8b5cf6");
    const bg=String(data.get("bg")||"#09090b");
    const surface=String(data.get("surface")||"#17171c");
    const text=String(data.get("text")||"#f5f3ff");
    const muted=String(data.get("muted")||"#a1a1aa");
    const title=String(data.get("title")||"Custom ETHONE Theme").trim()||"Custom ETHONE Theme";
    const theme=themeItem(
      id,
      title,
      String(data.get("author")||"You").trim()||"You",
      String(data.get("description")||"A custom premium ETHONE theme.").trim(),
      ["Custom","Local"],
      String(data.get("version")||"1.0.0").trim()||"1.0.0",
      5,
      "Local",
      [bg,surface,accent,text,muted],
      {
        accent,
        accent2:"#34d399",
        accent3:"#fb7185",
        accent4:"#d8c17a",
        accent5:accent,
        bg,
        surface,
        glow:"rgba("+hexToRgb(accent)+",0.22)",
        radius:1,
        blur:.85,
        density:"comfortable",
        fontFamily:"inter",
        fontScale:1,
        opacity:.96,
        glowScale:.86
      },
      String(data.get("changelog")||"Created locally in ETHONE Theme Studio").split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean),
      ["Custom dashboard preview","Custom card surfaces","Custom focus states"]
    );
    theme.custom=true;
    state.customThemes=state.customThemes.filter(function(item){return item.id!==id;}).concat(theme);
    state.category="Themes";
    state.selected=id;
    state.installed[id]={version:theme.version,installedAt:(state.installed[id]&&state.installed[id].installedAt)||Date.now(),updatedAt:Date.now()};
    state.activeThemeId=id;
    applyThemePackage(theme,true);
    state.history.push({id,action:"create-theme",title:theme.title,category:"Themes",version:theme.version,ts:Date.now()});
    state.history=state.history.slice(-120);
    save();
    closeThemeCreator();
    notify("Custom theme saved and applied: "+theme.title,"Theme Marketplace","success");
    recordTimeline(theme,"created");
    renderAll();
  }

  function deleteCustomTheme(id){
    const entry=state.customThemes.find(function(item){return item.id===id;});
    state.customThemes=state.customThemes.filter(function(item){return item.id!==id;});
    delete state.installed[id];
    if(state.activeThemeId===id)state.activeThemeId="";
    if(state.selected===id)state.selected="minimal-graphite";
    save();
    closeThemeCreator();
    notify("Custom theme removed"+(entry?": "+entry.title:""),"Theme Marketplace","info");
    renderAll();
  }

  function hexToRgb(hex){
    hex=String(hex||"#8b5cf6").replace("#","");
    if(hex.length===3)hex=hex.split("").map(function(c){return c+c;}).join("");
    const r=parseInt(hex.slice(0,2),16)||139,g=parseInt(hex.slice(2,4),16)||92,b=parseInt(hex.slice(4,6),16)||246;
    return r+","+g+","+b;
  }

  function askBrain(){
    const prompt="Recommend a verified ETHONE theme for my current workspace. Compare visual hierarchy, density, contrast and focus states. Installed: "+installedIds().join(", ")+". Available themes: "+allThemeItems().map(function(i){return i.title;}).join(", ");
    if(typeof window.switchPage==="function")window.switchPage("ai",null);
    setTimeout(function(){
      const input=$("#ai-input");
      if(input){
        input.value=prompt;
        input.focus();
      }
    },180);
  }

  function notify(message,title,type){
    if(window.ETHONENotifications&&typeof window.ETHONENotifications.notify==="function"){
      window.ETHONENotifications.notify({title:title||"Marketplace",message,category:type||"info",source:"Marketplace"});
      return;
    }
    if(typeof window.toast==="function")window.toast(message,type||"info");
  }

  function recordTimeline(entry,action){
    if(window.ETHONETimeline&&typeof window.ETHONETimeline.record==="function"){
      window.ETHONETimeline.record({
        title:entry.title+" "+action,
        description:entry.category+" "+entry.version+" in ETHONE Marketplace.",
        category:"system",
        source:"Marketplace"
      });
    }
  }

  function handleClick(event){
    const createTheme=event.target.closest("[data-theme-create]");
    if(createTheme){openThemeCreator();return;}
    const previewThemeButton=event.target.closest("[data-theme-preview]");
    if(previewThemeButton){
      const entry=allItems().find(function(item){return item.id===previewThemeButton.dataset.themePreview;});
      if(entry)previewTheme(entry);
      return;
    }
    const editThemeButton=event.target.closest("[data-theme-edit]");
    if(editThemeButton){openThemeCreator(editThemeButton.dataset.themeEdit);return;}
    if(event.target.closest("[data-theme-creator-close]")){closeThemeCreator();return;}
    const deleteThemeButton=event.target.closest("[data-theme-delete]");
    if(deleteThemeButton){deleteCustomTheme(deleteThemeButton.dataset.themeDelete);return;}
    const category=event.target.closest("[data-mp41-category]");
    if(category){
      state.category=category.dataset.mp41Category;
      state.query="";
      const first=filteredItems()[0];
      if(first)state.selected=first.id;
      save();renderAll();return;
    }
    const installButton=event.target.closest("[data-mp41-install]");
    if(installButton){event.stopPropagation();install(installButton.dataset.mp41Install);return;}
    const removeButton=event.target.closest("[data-mp41-remove]");
    if(removeButton){event.stopPropagation();uninstall(removeButton.dataset.mp41Remove);return;}
    const favoriteButton=event.target.closest("[data-mp41-favorite]");
    if(favoriteButton){favorite(favoriteButton.dataset.mp41Favorite);return;}
    const select=event.target.closest("[data-mp41-select]");
    if(select){setSelected(select.dataset.mp41Select);return;}
    const queryButton=event.target.closest("[data-mp41-query]");
    if(queryButton){state.category="Featured";state.query=queryButton.dataset.mp41Query;save();renderAll();return;}
    if(event.target.closest("[data-mp41-brain]"))askBrain();
  }

  function handleSubmit(event){
    const form=event.target.closest("[data-theme-creator-form]");
    if(!form)return;
    event.preventDefault();
    saveCustomTheme(form);
  }

  function handleInput(event){
    if(event.target&&String(event.target.id||"").startsWith("mp41-search-")){
      state.query=event.target.value;
      const first=filteredItems()[0];
      if(first)state.selected=first.id;
      save();
      renderAll({focusSearch:true,searchId:event.target.id,selectionStart:event.target.selectionStart});
    }
  }

  function handleKeydown(event){
    const card=event.target.closest(".mp-store-card");
    if(!card)return;
    if(event.key==="Enter"||event.key===" "){
      event.preventDefault();
      setSelected(card.dataset.mp41Select);
    }
  }

  function patchActions(){
    const actions=window.Ethone&&window.Ethone.get&&window.Ethone.get("actions");
    if(actions&&typeof actions.register==="function"){
      actions.register("dashboard.nav.marketplace",{label:"Marketplace",handler:function(){
        if(typeof window.switchPage==="function")window.switchPage("marketplace",null);
      }});
      actions.register("marketplace.search",{label:"Search Marketplace",handler:function(ctx){
        if(typeof window.switchPage==="function")window.switchPage("marketplace",null);
        setTimeout(function(){window.ETHONEMarketplace.search(ctx&&ctx.query?ctx.query:"");},120);
      }});
      actions.register("marketplace.install",{label:"Install Marketplace item",handler:function(ctx){
        const id=ctx&&(ctx.id||ctx.itemId);
        if(!id){notify("Choose a Marketplace item to install.","Marketplace","info");return false;}
        install(id);
        return true;
      }});
      actions.register("marketplace.item.open",{label:"Open Marketplace item",handler:function(ctx){
        const id=ctx&&(ctx.id||ctx.itemId);
        if(typeof window.switchPage==="function")window.switchPage("marketplace",null);
        if(id)setTimeout(function(){setSelected(id);},140);
      }});
    }
  }

  function renderAll(options){
    ["marketplace","store"].forEach(function(id){
      if($("#page-"+id))renderMarketplacePage(id);
    });
    if(options&&options.focusSearch){
      const input=document.getElementById(options.searchId)||document.querySelector('[id^="mp41-search-"]');
      if(input){
        input.focus({preventScroll:true});
        try{
          const pos=options.selectionStart==null?input.value.length:options.selectionStart;
          input.setSelectionRange(pos,pos);
        }catch(e){}
      }
    }
  }

  function run(){
    startupTimers.forEach(function(timer){clearTimeout(timer);});
    startupTimers=[];
    ensurePage("marketplace");
    restoreMarketplaceTheme();
    startupTimers.push(setTimeout(restoreMarketplaceTheme,250));
    startupTimers.push(setTimeout(restoreMarketplaceTheme,1200));
    renderMarketplacePage("marketplace");
    patchActions();
  }

  function activateMarketplace(){
    if(marketplaceActive)return;
    marketplaceActive=true;
    document.addEventListener("click",handleClick);
    document.addEventListener("input",handleInput);
    document.addEventListener("submit",handleSubmit);
    document.addEventListener("keydown",handleKeydown);
    run();
  }

  function deactivateMarketplace(){
    if(!marketplaceActive)return;
    marketplaceActive=false;
    document.removeEventListener("click",handleClick);
    document.removeEventListener("input",handleInput);
    document.removeEventListener("submit",handleSubmit);
    document.removeEventListener("keydown",handleKeydown);
    startupTimers.forEach(function(timer){clearTimeout(timer);});
    startupTimers=[];
    if(themePreviewTimer){clearTimeout(themePreviewTimer);themePreviewTimer=0;restoreMarketplaceTheme();}
    closeThemeCreator();
  }

  function marketplacePageActive(){
    return ["marketplace","store"].some(function(id){var page=$("#page-"+id);return !!(page&&page.classList.contains("active"));});
  }

  function start(){
    window.addEventListener("ethone:page-ready",function(event){
      var page=event&&event.detail&&event.detail.page;
      if(page==="marketplace"||page==="store")activateMarketplace();
      else deactivateMarketplace();
    });
    var activateIfVisible=function(){if(marketplacePageActive())activateMarketplace();};
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",activateIfVisible,{once:true});
    else activateIfVisible();
  }

  start();
  window.renderMarketplacePage=function(){renderMarketplacePage("marketplace");};
  window.ETHONEMarketplace={
    run,
    activate:activateMarketplace,
    deactivate:deactivateMarketplace,
    catalog:function(){return allItems();},
    categories:function(){return CATEGORIES.slice();},
    themes:function(){return allThemeItems();},
    applyTheme:function(id){install(id);},
    createTheme:function(theme){
      if(!theme||!theme.id)return null;
      state.customThemes=state.customThemes.filter(function(item){return item.id!==theme.id;}).concat(theme);
      save();
      renderAll();
      return theme;
    },
    install,
    uninstall,
    favorite,
    open:function(id){if(id)setSelected(id);if(typeof window.switchPage==="function")window.switchPage("marketplace",null);},
    search:function(query,category){
      const wanted=category&&CATEGORIES.find(function(item){return item.toLowerCase()===String(category).toLowerCase();});
      state.category=wanted||(query?"Featured":state.category);
      state.query=query||"";
      const first=filteredItems()[0];
      if(first)state.selected=first.id;
      save();
      renderAll({focusSearch:true,searchId:"mp41-search-marketplace"});
      return filteredItems();
    },
    recommendations:function(limit){return brainRecommendations(limit||6);},
    state:function(){return state;},
    audit:function(){return {active:marketplaceActive,previewTimer:!!themePreviewTimer,startupTimers:startupTimers.length};}
  };
})();
