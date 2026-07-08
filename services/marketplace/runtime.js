/* ETHONE Marketplace: premium store surface for widgets, plugins, themes, layouts and packs. */
(function(){
  "use strict";
  if(window.ETHONE_SAFE_MODE)return;
  if(window.__ethoneMarketplaceStore)return;
  window.__ethoneMarketplaceStore=true;

  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const STORE_KEY="ethone:marketplace-store";
  const CATEGORIES=["Widgets","Plugins","Themes","Layouts","Automations","Templates","AI Agents","Packs"];
  const state=loadState();

  const catalog=[
    item("brain-daily-brief","AI Agents","Brain Daily Brief","ETHONE Labs","A morning intelligence agent that turns tasks, calendar, notes and recent activity into a precise daily plan.",["Brain","Planner","Briefing"],"2.4.0",4.9,"24.8k","1.1 MB","Brain OS, Home, Workspaces",["Read tasks","Read notes","Read calendar","Use ETHONE AI"],["New workspace-aware briefing","Better priority explanations","Reduced startup work"],["Feels native to ETHONE.","Actually helps me decide what to do first."],"agent"),
    item("github-command-center","Widgets","GitHub Command Center","ETHONE Labs","Repository pulse, pull requests, commits, issue triage and developer focus signals in one dashboard widget.",["GitHub","Developer","Stats"],"3.1.2",4.8,"19.4k","1.8 MB","Dashboard, Developer Workspace",["Access GitHub","Read dashboard context"],["Pull request health panel","Compact contribution graph","Better error states"],["The developer widget ETHONE needed.","Clean and useful without noise."],"widget"),
    item("spotify-flow","Widgets","Spotify Flow","Studio Pulse","Now playing, focus playlists, recent listening and Brain music context for work or gaming sessions.",["Spotify","Music","Focus"],"1.9.0",4.8,"17.2k","1.2 MB","Dashboard, Gaming, Focus",["Access Spotify","Read workspace mode"],["New minimal now-playing view","Focus playlist shortcut","Timeline events"],["Beautiful in the sidebar panel.","Makes sessions feel alive."],"widget"),
    item("discord-presence-pro","Plugins","Discord Presence Pro","ETHONE Labs","Presence, friends online, voice activity and gaming session context prepared for Brain recommendations.",["Discord","Presence","Gaming"],"2.8.6",4.7,"22.1k","2.3 MB","Gaming, Streaming, Brain",["Access Discord","Read activity status"],["Cleaner connection state","Voice activity preview","Retry controls"],["Finally not an empty placeholder.","The status design is excellent."],"plugin"),
    item("minimal-graphite","Themes","Minimal Graphite","Aster Studio","A quiet ETHONE theme with graphite surfaces, purple focus states, balanced contrast and premium spacing.",["Dark","Minimal","Purple"],"1.5.1",4.9,"34.6k","840 KB","All Workspaces",["Apply theme preferences"],["Sharper focus rings","Improved contrast","Reduced visual noise"],["Feels like a native app.","Perfect dark theme."],"theme"),
    item("developer-pro-layout","Layouts","Developer Pro Layout","ETHONE Labs","A workspace layout for deep work: Brain, GitHub, tasks, notes, files and focus timeline aligned for engineering days.",["Developer","Layout","Focus"],"2.6.0",4.8,"13.9k","460 KB","Dashboard, Workspaces",["Modify dashboard layout","Read widget list"],["Resizable widget map","Better laptop breakpoint","Pinned Brain rail"],["More useful than my old dashboard.","The hierarchy is strong."],"layout"),
    item("morning-startup","Automations","Morning Startup","Brain Systems","Weather, calendar, priorities, habits and Brain briefing automation that prepares ETHONE before you start.",["Automation","Morning","Brain"],"2.0.3",4.9,"11.8k","980 KB","Brain OS, Planner, Home",["Read calendar","Read tasks","Run approved automations"],["Permission review step","Better failed-action handling","Workspace-specific routines"],["This makes ETHONE feel alive.","A perfect start sequence."],"automation"),
    item("evening-recap","Automations","Evening Recap","Brain Systems","Summarizes completed tasks, notes, habits, music and workspace activity into a calm end-of-day recap.",["Automation","Recap","Habits"],"1.8.4",4.8,"9.7k","1.0 MB","Brain OS, Timeline",["Read tasks","Read notes","Write timeline events"],["Timeline export","Habit insights","Less repetitive wording"],["Useful without being intrusive.","Nice final ritual."],"automation"),
    item("student-os","Templates","Student OS","Community Studio","A complete study workspace with notes, tasks, calendar, files, Pomodoro, habits and Brain tutor actions.",["Study","Notes","Calendar"],"1.4.2",4.7,"14.5k","760 KB","Study Workspace",["Create workspace template","Create default widgets"],["Cleaner notes structure","Exam timeline view","Tutor prompt pack"],["Great starting point for school.","Everything is already organized."],"template"),
    item("creator-launch-kit","Templates","Creator Launch Kit","Vercelized","A creator workspace for content planning, uploads, analytics, assets, publishing checklists and AI review.",["Creator","Content","Planning"],"1.2.0",4.6,"8.3k","1.4 MB","Creator Workspace",["Create workspace template","Read files metadata"],["Publishing timeline","Asset checklist","Review prompts"],["Very polished template.","Feels ready for real work."],"template"),
    item("obs-stream-bridge","Plugins","OBS Stream Bridge","StreamForge","Scene status, recording state, stream health and quick controls ready for the local OBS bridge.",["OBS","Streaming","Twitch"],"1.0.1",4.5,"7.4k","3.2 MB","Streaming Workspace",["Connect local bridge","Read stream status"],["Local bridge preparation","Safer connection states","Scene preview cards"],["No more empty placeholder.","The interface explains the limits."],"plugin"),
    item("valorant-session-pack","Packs","Valorant Session Pack","Arena Tools","Gaming dashboard pack with Valorant MMR, session goals, Discord status, Spotify focus and match notes.",["Valorant","Gaming","Pack"],"1.6.5",4.7,"12.6k","2.6 MB","Gaming Workspace",["Read gaming integrations","Create widgets","Write session notes"],["Match note widget","Better rank display","Session timeline"],["Makes the gaming workspace feel complete.","Exactly the pack I wanted."],"pack"),
    item("quiet-aurora-pack","Packs","Quiet Aurora Pack","Aster Studio","Wallpapers, theme accents, icons and dashboard surfaces tuned for a calm premium ETHONE setup.",["Wallpaper","Icons","Theme"],"2.2.0",4.8,"18.9k","6.2 MB","All Workspaces",["Apply appearance settings"],["New low-motion variants","Sharper icon masks","Better OLED contrast"],["Subtle and premium.","Good taste, not flashy."],"pack"),
    item("memory-curator","AI Agents","Memory Curator","Brain Systems","Reviews visible memories, suggests cleanup, explains what Brain remembers and keeps the user in control.",["Memory","Privacy","Brain"],"1.1.3",4.9,"6.8k","720 KB","Brain OS, Settings",["Read visible memories","Suggest memory changes"],["Editable memory review","Privacy summary","Workspace-aware cleanup"],["Makes Brain trustworthy.","Good transparency."],"agent"),
    item("linear-focus-theme","Themes","Linear Focus","Northstar UI","A precise dark theme inspired by professional issue trackers: dense, calm, readable and fast.",["Dark","Productivity","Dense"],"1.0.8",4.7,"15.1k","920 KB","All Workspaces",["Apply theme preferences"],["Better keyboard focus","Softer panel borders","Compact density preset"],["Very professional.","Great for work mode."],"theme"),
    item("automation-scheduler","Plugins","Automation Scheduler","ETHONE Labs","A reusable scheduler UI for recurring routines, reminders, sync jobs and approved automations.",["Scheduler","Automation","System"],"2.3.7",4.8,"10.2k","1.5 MB","Planner, Automation Engine",["Read automations","Create approved schedules"],["Recurring job history","Retry controls","Timeline integration"],["Feels like a real OS service.","Clear and dependable."],"plugin")
  ];

  function item(id,category,title,author,description,tags,version,rating,downloads,size,compat,permissions,changelog,reviews,visual){
    return {id,category,title,author,description,tags,version,rating,downloads,size,compat,permissions,changelog,reviews,visual,updated:changelog.length>2};
  }

  const THEME_MARKETPLACE=[
    themeItem("minimal-graphite","Minimal Graphite","Aster Studio","A quiet graphite interface with violet focus states, soft contrast and low-noise panels.",["Dark","Minimal","Purple"],"1.5.1",4.9,"34.6k",["#09090b","#17171c","#8b5cf6","#f5f3ff","#a1a1aa"],{accent:"#8b5cf6",accent2:"#34d399",accent3:"#fb7185",accent4:"#d8c17a",accent5:"#a78bfa",bg:"#09090b",surface:"#17171c",glow:"rgba(139,92,246,0.23)",radius:1,blur:.85,density:"comfortable",fontFamily:"inter",fontScale:1,opacity:.96,glowScale:.86},["Sharper focus rings","Improved contrast on dark fields","Reduced visual noise"],["Dashboard overview","Settings window","Files explorer"]),
    themeItem("linear-focus-theme","Linear Focus","Northstar UI","A precise productivity theme with compact rhythm, readable borders and professional purple accents.",["Dark","Productivity","Dense"],"1.0.8",4.7,"15.1k",["#0a0a0d","#141419","#7c6df8","#f7f7fb","#8a8a96"],{accent:"#7c6df8",accent2:"#86efac",accent3:"#fb7185",accent4:"#fde68a",accent5:"#c4b5fd",bg:"#0a0a0d",surface:"#141419",glow:"rgba(124,109,248,0.18)",radius:.82,blur:.65,density:"compact",fontFamily:"inter",fontScale:.97,opacity:.98,glowScale:.58},["Compact density preset","Softer panel borders","Better keyboard focus"],["Task board","Command palette","Developer workspace"]),
    themeItem("obsidian-violet","Obsidian Violet","ETHONE Labs","An OLED-first theme with deep black surfaces, high contrast text and a restrained violet glow.",["OLED","High Contrast","Premium"],"2.0.0",4.8,"21.7k",["#050507","#101014","#a78bfa","#ffffff","#71717a"],{accent:"#a78bfa",accent2:"#5eead4",accent3:"#fda4af",accent4:"#facc15",accent5:"#ddd6fe",bg:"#050507",surface:"#101014",glow:"rgba(167,139,250,0.20)",radius:1.08,blur:.5,density:"cozy",fontFamily:"system",fontScale:1.01,opacity:1,glowScale:.72},["OLED-safe background","Higher text contrast","Cleaner glass layers"],["Home hero","Marketplace cards","Brain panel"]),
    themeItem("studio-amethyst","Studio Amethyst","Vercelized","A creative workspace theme with warmer violet panels, soft depth and polished preview surfaces.",["Creative","Purple","Glass"],"1.2.3",4.6,"9.8k",["#0c0812","#1a1124","#9d7cff","#fff7ff","#bda7ff"],{accent:"#9d7cff",accent2:"#34d399",accent3:"#fb7185",accent4:"#fbbf24",accent5:"#c4b5fd",bg:"#0c0812",surface:"#1a1124",glow:"rgba(157,124,255,0.26)",radius:1.22,blur:1.08,density:"comfortable",fontFamily:"grotesk",fontScale:1.03,opacity:.92,glowScale:1.05},["New creative preview states","Warmer glass surfaces","Better panel separation"],["Creator dashboard","Theme detail","Profile view"])
  ];

  function themeItem(id,title,author,description,tags,version,rating,downloads,palette,tokens,changelog,screenshots){
    return {
      id,category:"Themes",title,author,description,tags,version,rating,downloads,
      size:"Theme",compat:"All Workspaces",permissions:["Apply appearance settings","Save theme to profile"],
      changelog,reviews:["Looks native to ETHONE.","Polished without feeling noisy."],visual:"theme",
      updated:changelog.length>2,palette,tokens,screenshots,isTheme:true
    };
  }

  function loadState(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORE_KEY)||"{}");
      return {
        category:CATEGORIES.includes(saved.category)?saved.category:"Widgets",
        query:String(saved.query||""),
        selected:saved.selected||"brain-daily-brief",
        installed:saved.installed&&typeof saved.installed==="object"?saved.installed:{},
        favorites:saved.favorites&&typeof saved.favorites==="object"?saved.favorites:{},
        customThemes:Array.isArray(saved.customThemes)?saved.customThemes:[],
        activeThemeId:saved.activeThemeId||"",
        history:Array.isArray(saved.history)?saved.history:[]
      };
    }catch(e){
      return {category:"Widgets",query:"",selected:"brain-daily-brief",installed:{},favorites:{},customThemes:[],activeThemeId:"",history:[]};
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
    return Object.keys(state.installed).filter(function(id){return !!state.installed[id];});
  }

  function customThemeItems(){
    return state.customThemes.map(function(theme){
      return Object.assign({},theme,{
        category:"Themes",
        author:theme.author||"You",
        tags:Array.isArray(theme.tags)?theme.tags:["Custom","Local"],
        version:theme.version||"1.0.0",
        rating:theme.rating||5,
        downloads:"Local",
        size:"Local",
        compat:"This profile",
        permissions:["Apply appearance settings","Saved locally"],
        changelog:Array.isArray(theme.changelog)?theme.changelog:["Created locally in ETHONE Theme Studio"],
        reviews:["Your custom ETHONE theme."],
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
      return Number(!!state.installed[b.id])-Number(!!state.installed[a.id])||Number(state.activeThemeId===b.id)-Number(state.activeThemeId===a.id)||b.rating-a.rating||a.title.localeCompare(b.title);
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
            '<div class="mp41-title">A real store for your Personal OS.</div>'+
            '<div class="mp41-copy">Discover, preview and install widgets, plugins, themes, layouts, automations, templates, AI agents and packs. Every item has metadata, permissions, reviews and release notes before it touches your workspace.</div>'+
          '</div>'+
          '<div class="mp41-status">'+installed.length+' installed</div>'+
        '</div>'+
        '<div class="mp-store-search" role="search">'+
          '<span class="mp-store-search-icon">K</span>'+
          '<input id="mp41-search-'+pageId+'" value="'+escapeHTML(state.query)+'" placeholder="Search widgets, themes, Brain agents, layouts..." autocomplete="off" />'+
        '</div>'+
        '<div class="mp-store-categories" role="tablist" aria-label="Marketplace categories">'+
          CATEGORIES.map(function(category){
            return '<button class="mp41-tab '+(state.category===category?'active':'')+'" data-mp41-category="'+escapeHTML(category)+'" type="button" role="tab" aria-selected="'+(state.category===category?'true':'false')+'">'+escapeHTML(category)+'</button>';
          }).join("")+
        '</div>'+
        '<div class="mp41-stats">'+
          stat("Catalog",catalog.length,"Production-ready surfaces, no empty placeholder cards")+
          stat("Categories",CATEGORIES.length,"Widgets, plugins, themes, layouts and more")+
          stat("Installed",installed.length,"Saved locally and profile-ready")+
          stat("Updates",catalog.filter(function(i){return i.updated;}).length,"Changelog and rollback metadata")+
        '</div>'+
      '</section>'+
      '<section class="mp-store-layout">'+
        '<main class="mp41-panel mp-store-catalog" aria-label="Marketplace catalog">'+
          '<div class="mp41-section-head"><div><div class="mp41-h">'+escapeHTML(state.category)+'</div><div class="mp41-sub">'+(state.category==="Themes"?"Theme marketplace with previews, palettes, changelogs and local custom themes.":"Raycast-style catalog, tuned for ETHONE workspaces and Brain OS.")+'</div></div><div class="mp41-head-actions">'+(state.category==="Themes"?'<button class="mp41-btn primary" data-theme-create type="button">Create theme</button>':'')+'<button class="mp41-btn" data-mp41-brain type="button">Ask Brain</button></div></div>'+
          '<div class="mp-store-grid">'+filteredItems().map(card).join("")+'</div>'+
        '</main>'+
        '<aside class="mp41-panel mp-store-detail" aria-live="polite">'+detail(selected)+'</aside>'+
      '</section>'+
      '<section class="mp41-panel mp-store-collections">'+
        '<div class="mp41-section-head"><div><div class="mp41-h">Curated collections</div><div class="mp41-sub">Install a direction, not just an item.</div></div></div>'+
        '<div class="mp-store-collection-grid">'+collection("Developer Stack","GitHub Command Center, Developer Pro Layout and Automation Scheduler.","developer")+collection("Brain OS Power","Daily Brief, Memory Curator and Morning Startup.","brain")+collection("Gaming Setup","Valorant Session Pack, Discord Presence Pro and Spotify Flow.","gaming")+collection("Minimal Premium","Minimal Graphite, Linear Focus and Quiet Aurora Pack.","minimal")+'</div>'+
      '</section>';
  }

  function stat(label,value,sub){
    return '<article class="mp41-stat"><span>'+escapeHTML(label)+'</span><strong>'+escapeHTML(value)+'</strong><p>'+escapeHTML(sub)+'</p></article>';
  }

  function card(entry){
    const active=entry.id===getSelected().id;
    const installed=!!state.installed[entry.id];
    const themeActive=entry.category==="Themes"&&state.activeThemeId===entry.id;
    return '<article class="mp-store-card '+(active?'is-active':'')+' '+(installed?'is-installed':'')+'" data-mp41-select="'+entry.id+'" tabindex="0">'+
      '<div class="mp-store-thumb '+escapeHTML(entry.visual)+'">'+previewMarkup(entry)+'</div>'+
      '<div class="mp-store-card-body">'+
        '<div class="mp-store-card-top"><span>'+escapeHTML(entry.category)+'</span><span>'+(themeActive?'Active':'* '+entry.rating)+'</span></div>'+
        '<h3>'+escapeHTML(entry.title)+'</h3>'+
        '<p>'+escapeHTML(entry.description)+'</p>'+
        (entry.category==="Themes"?paletteMarkup(entry.palette):'')+
        '<div class="mp-store-tags">'+entry.tags.slice(0,3).map(function(tag){return '<span>'+escapeHTML(tag)+'</span>';}).join("")+'</div>'+
        '<div class="mp-store-actions">'+
          '<button class="mp41-btn '+(installed?'installed':'primary')+'" data-mp41-install="'+entry.id+'" type="button">'+(entry.category==="Themes"?(themeActive?'Active':installed?'Apply':'Install'):(installed?'Installed':'Install'))+'</button>'+
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
    const installed=!!state.installed[entry.id];
    return '<div class="mp-detail-head">'+
        '<div class="mp-store-thumb large '+escapeHTML(entry.visual)+'">'+previewMarkup(entry)+'</div>'+
        '<div><div class="mp41-kicker">'+escapeHTML(entry.category)+' / '+escapeHTML(entry.author)+'</div><h2>'+escapeHTML(entry.title)+'</h2><p>'+escapeHTML(entry.description)+'</p></div>'+
      '</div>'+
      '<div class="mp-detail-actions">'+
        '<button class="mp41-btn '+(installed?'installed':'primary')+'" data-mp41-install="'+entry.id+'" type="button">'+(installed?'Remove':'Install')+'</button>'+
        '<button class="mp41-btn" data-mp41-favorite="'+entry.id+'" type="button">'+(state.favorites[entry.id]?'Saved':'Save')+'</button>'+
        '<button class="mp41-btn" data-coming-soon="Marketplace live test" data-coming-soon-description="Sandbox testing for marketplace items will be enabled when the plugin/widget runtime verifier is connected." type="button">Test</button>'+
      '</div>'+
      '<div class="mp-detail-meta">'+
        meta("Version",entry.version)+meta("Author",entry.author)+meta("Downloads",entry.downloads)+meta("Size",entry.size)+meta("Compatibility",entry.compat)+
      '</div>'+
      detailSection("Screenshots",[
        "Preview card, compact widget state and installed configuration are available before install.",
        "All previews are HTML/CSS surfaces, not static screenshots."
      ])+
      detailSection("Permissions",entry.permissions)+
      detailSection("Changelog",entry.changelog)+
      detailSection("Reviews",entry.reviews);
  }

  function themeDetail(entry){
    const installed=!!state.installed[entry.id];
    const active=state.activeThemeId===entry.id;
    return '<div class="theme-detail">'+
      '<div class="mp-detail-head">'+
        '<div class="mp-store-thumb large theme">'+previewMarkup(entry)+'</div>'+
        '<div><div class="mp41-kicker">Theme / '+escapeHTML(entry.author)+'</div><h2>'+escapeHTML(entry.title)+'</h2><p>'+escapeHTML(entry.description)+'</p>'+paletteMarkup(entry.palette)+'</div>'+
      '</div>'+
      '<div class="mp-detail-actions">'+
        '<button class="mp41-btn '+(active?'installed':'primary')+'" data-mp41-install="'+entry.id+'" type="button">'+(active?'Active theme':installed?'Apply theme':'Install theme')+'</button>'+
        '<button class="mp41-btn" data-theme-preview="'+entry.id+'" type="button">Preview</button>'+
        '<button class="mp41-btn" data-mp41-favorite="'+entry.id+'" type="button">'+(state.favorites[entry.id]?'Saved':'Save')+'</button>'+
        (entry.custom?'<button class="mp41-btn" data-theme-edit="'+entry.id+'" type="button">Edit</button>':'')+
      '</div>'+
      '<div class="mp-detail-meta">'+
        meta("Version",entry.version)+meta("Author",entry.author)+meta("Downloads",entry.downloads)+meta("Status",active?"Active":installed?"Installed":"Not installed")+meta("Compatibility",entry.compat)+
      '</div>'+
      '<section class="mp-detail-section"><h3>Palette</h3><div class="theme-palette large">'+(entry.palette||[]).map(function(color){return '<span style="background:'+escapeHTML(color)+'"><em>'+escapeHTML(color)+'</em></span>';}).join("")+'</div></section>'+
      detailSection("Screenshots",entry.screenshots||["Dashboard","Settings","Widgets"])+
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
    if(!entry)return;
    if(entry.category==="Themes"){
      state.installed[id]=true;
      state.activeThemeId=id;
      applyThemePackage(entry,true);
      state.history.push({id,action:"apply-theme",title:entry.title,category:entry.category,version:entry.version,ts:Date.now()});
      state.history=state.history.slice(-120);
      save();
      notify("Theme applied: "+entry.title,"Theme Marketplace","success");
      recordTimeline(entry,"applied");
      renderAll();
      return;
    }
    state.installed[id]=!state.installed[id];
    state.history.push({id,action:state.installed[id]?"install":"remove",title:entry.title,category:entry.category,version:entry.version,ts:Date.now()});
    state.history=state.history.slice(-120);
    save();
    notify((state.installed[id]?"Installed ":"Removed ")+entry.title,"Marketplace",state.installed[id]?"success":"info");
    recordTimeline(entry,state.installed[id]?"installed":"removed");
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

  function testConnection(id){
    const entry=allItems().find(function(item){return item.id===id;});
    if(!entry)return;
    if(entry.category==="Themes"){previewTheme(entry);return;}
    if(window.ETHONEComingSoon&&typeof window.ETHONEComingSoon.open==="function"){
      window.ETHONEComingSoon.open("Marketplace live test","Sandbox testing for "+entry.title+" will be available when the runtime verifier is connected.");
    }else notify("Marketplace live testing is coming soon.","Marketplace","info");
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
    const profile=typeof window.curP==="function"?window.curP():null;
    const active=profile&&(profile.marketplaceTheme||(profile.state&&profile.state.marketplaceTheme));
    if(!active||!active.tokens)return;
    applyThemePackage({id:active.id,title:active.title,author:active.author,tokens:active.tokens,palette:active.palette,version:active.version,category:"Themes"},false);
    state.activeThemeId=active.id||state.activeThemeId;
  }

  function previewTheme(entry){
    applyThemePackage(entry,false);
    notify("Previewing "+entry.title+". Install it to keep this theme after reload.","Theme Marketplace","info");
    setTimeout(restoreMarketplaceTheme,6000);
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
    state.installed[id]=true;
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
    const prompt="Recommend Marketplace items for my current ETHONE workspace. Include widgets, plugins, themes, layouts, automations, templates, AI agents and packs. Installed: "+installedIds().join(", ")+". Catalog: "+catalog.map(function(i){return i.title+" ("+i.category+")";}).join(", ");
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
    if(category){state.category=category.dataset.mp41Category;state.query="";state.selected=(filteredItems()[0]||catalog[0]).id;save();renderAll();return;}
    const select=event.target.closest("[data-mp41-select]");
    if(select){setSelected(select.dataset.mp41Select);return;}
    const installButton=event.target.closest("[data-mp41-install]");
    if(installButton){event.stopPropagation();install(installButton.dataset.mp41Install);return;}
    const favoriteButton=event.target.closest("[data-mp41-favorite]");
    if(favoriteButton){favorite(favoriteButton.dataset.mp41Favorite);return;}
    const testButton=event.target.closest("[data-mp41-test]");
    if(testButton){testConnection(testButton.dataset.mp41Test);return;}
    const queryButton=event.target.closest("[data-mp41-query]");
    if(queryButton){state.query=queryButton.dataset.mp41Query;save();renderAll();return;}
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
      renderAll();
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
    }
  }

  function renderAll(){
    ["marketplace","store"].forEach(function(id){
      if($("#page-"+id))renderMarketplacePage(id);
    });
  }

  function run(){
    ensurePage("marketplace");
    restoreMarketplaceTheme();
    setTimeout(restoreMarketplaceTheme,250);
    setTimeout(restoreMarketplaceTheme,1200);
    renderMarketplacePage("marketplace");
    patchActions();
  }

  function start(){
    document.addEventListener("click",handleClick);
    document.addEventListener("input",handleInput);
    document.addEventListener("submit",handleSubmit);
    document.addEventListener("keydown",handleKeydown);
    window.addEventListener("ethone:page-ready",function(event){
      restoreMarketplaceTheme();
      if(event.detail&&event.detail.page==="marketplace")renderMarketplacePage("marketplace");
    });
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});
    else run();
  }

  start();
  window.renderMarketplacePage=function(){renderMarketplacePage("marketplace");};
  window.ETHONEMarketplace={
    run,
    catalog:function(){return catalog.slice();},
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
    favorite,
    search:function(query){state.query=query||"";save();renderAll();return filteredItems();},
    recommendations:function(){return catalog.slice().sort(function(a,b){return b.rating-a.rating;}).slice(0,6);},
    state:function(){return state;}
  };
})();
