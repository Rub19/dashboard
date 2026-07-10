/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.ETHONE_LIGHT_BOOT_MODE)return;
  if(window.__ethoneLeanProductionBoot)return;
  if(window.__ethonePersonalOSVision)return;
  window.__ethonePersonalOSVision=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const startedAt=Date.now();
  const status={
    fr:["Preparation de ton espace","Synchronisation des widgets","Verification des services connectes","Chargement de ton environnement"],
    en:["Preparing your workspace","Synchronizing your widgets","Checking connected services","Loading your environment"],
    es:["Preparando tu espacio","Sincronizando widgets","Comprobando servicios conectados","Cargando tu entorno"],
    de:["Arbeitsbereich wird vorbereitet","Widgets werden synchronisiert","Verbundene Dienste werden geprueft","Umgebung wird geladen"]
  };
  function lang(){
    return String(window._lang||localStorage.getItem("nexus_lang")||localStorage.getItem("ethone_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase();
  }
  function isFR(){return lang()==="fr"}
  function greeting(){
    const h=new Date().getHours();
    if(isFR())return h<5?"Bonsoir":h<12?"Bonjour":h<18?"Bon apres-midi":"Bonsoir";
    return h<5?"Good Evening":h<12?"Good Morning":h<18?"Good Afternoon":"Good Evening";
  }
  function getProfile(){
    try{if(typeof window.curP==="function")return window.curP()}catch(e){}
    return null;
  }
  function bootMarkup(){
    const list=status[lang()]||status.en;
    return '<div class="ethone-pos-boot-core" role="status" aria-live="polite">'+
      '<div class="ethone-pos-boot-logo" aria-hidden="true"><svg fill="none" height="30" viewBox="0 0 20 20" width="30"><rect x="4" y="5" width="12" height="2" rx="1" fill="white" opacity=".96"></rect><rect x="4" y="9" width="12" height="2" rx="1" fill="white" opacity=".96"></rect><rect x="4" y="13" width="8" height="2" rx="1" fill="white" opacity=".96"></rect></svg></div>'+
      '<div><div class="ethone-pos-boot-word">ETHONE</div><div class="ethone-pos-boot-greeting">'+greeting()+' - '+(isFR()?"bienvenue dans ton espace":"Welcome Back")+'</div></div>'+
      '<div class="ethone-pos-boot-status" id="ethone-pos-boot-status">'+list[0]+'</div>'+
      '<div class="ethone-pos-boot-progress" aria-hidden="true"><span></span></div>'+
    '</div>';
  }
  function enhanceBoot(){
    const boot=$("#nexus-boot-screen");
    if(!boot)return;
    boot.classList.add("ethone-pos-boot");
    if(!boot.dataset.ethonePersonalOsVision){
      boot.dataset.ethonePersonalOsVision="1";
      boot.innerHTML=bootMarkup();
    }
  }
  let statusIndex=0;
  setInterval(()=>{
    const el=$("#ethone-pos-boot-status");
    if(!el)return;
    const list=status[lang()]||status.en;
    statusIndex=(statusIndex+1)%list.length;
    el.textContent=list[statusIndex];
  },680);
  const previousHideBoot=window.hideBoot;
  window.hideBoot=function(){
    enhanceBoot();
    const finish=()=>{
      try{if(typeof window.removeAntiFlash==="function")window.removeAntiFlash()}catch(e){}
      const boot=$("#nexus-boot-screen");
      if(boot){
        boot.style.transition="opacity .42s cubic-bezier(.2,.8,.2,1), transform .42s cubic-bezier(.2,.8,.2,1)";
        boot.style.opacity="0";
        boot.style.transform="scale(.985)";
        setTimeout(()=>{if(boot.parentNode)boot.remove()},430);
      }else if(typeof previousHideBoot==="function"){
        try{previousHideBoot()}catch(e){}
      }
    };
    const wait=Math.max(0,1050-(Date.now()-startedAt));
    setTimeout(finish,wait);
  };
  function mode(){
    const h=new Date().getHours();
    const steam=$("#sb-steam-wrap");
    const gaming=steam&&getComputedStyle(steam).display!=="none";
    if(gaming)return "gaming";
    if(h>=5&&h<11)return "morning";
    if(h>=11&&h<18)return "focus";
    if(h>=18&&h<22)return "evening";
    return "night";
  }
  function numbers(){
    const p=getProfile();
    const st=p&&p.state?p.state:{};
    const todos=Array.isArray(st.todos)?st.todos:[];
    const items=Array.isArray(st.items)?st.items:[];
    const habits=Array.isArray(st.habits)?st.habits:[];
    const events=Array.isArray(st.events)?st.events:[];
    const budget=st.budget||{};
    const entries=Array.isArray(budget.entries)?budget.entries:[];
    const spent=entries.filter(e=>String(e.type||"expense")!=="income").reduce((a,e)=>a+Math.abs(Number(e.amount)||0),0);
    return {
      name:p&&p.name?p.name:"Utilisateur",
      openTodos:todos.filter(t=>!t.done).length,
      doneTodos:todos.filter(t=>t.done).length,
      files:items.length,
      links:items.filter(i=>String(i.type||"").toLowerCase()==="link").length,
      habits:habits.filter(h=>h.doneToday||h.done).length,
      events,
      spent
    };
  }
  function copyFor(m,n){
    if(isFR()){
      const map={
        morning:["Home vivante","Meteo, agenda, taches importantes et briefing IA restent au premier plan."],
        focus:["Mode concentration","ETHONE met en avant projets, notes, fichiers recents et activite GitHub."],
        gaming:["Session gaming","Discord, Steam, Spotify et les widgets gaming deviennent les signaux principaux."],
        evening:["Fin de journee","Journal, habitudes, resume productivite et musique passent en priorite."],
        night:["Environnement nocturne","ETHONE reduit le bruit visuel et garde l'essentiel sous la main."]
      };
      const row=map[m]||map.focus;
      return {
        mode:"PERSONAL OS / "+row[0],
        title:greeting()+", "+n.name,
        copy:row[1],
        brief:n.openTodos+" tache(s) ouvertes, "+n.files+" element(s) stockes, "+n.habits+" habitude(s) suivies aujourd'hui, "+(n.spent?Math.round(n.spent)+" EUR de depenses ce mois":"budget pret a suivre")+"."
      };
    }
    const map={
      morning:["Living Home","Weather, agenda, key tasks and your AI briefing stay in front."],
      focus:["Focus Mode","ETHONE emphasizes projects, notes, recent files and GitHub activity."],
      gaming:["Gaming Session","Discord, Steam, Spotify and gaming widgets become primary signals."],
      evening:["Evening Mode","Journaling, habits, productivity summaries and music move forward."],
      night:["Night Environment","ETHONE lowers visual noise and keeps the essentials close."]
    };
    const row=map[m]||map.focus;
    return {
      mode:"PERSONAL OS / "+row[0],
      title:greeting()+", "+n.name,
      copy:row[1],
      brief:n.openTodos+" open task(s), "+n.files+" stored item(s), "+n.habits+" habit(s) tracked today, "+(n.spent?"EUR "+Math.round(n.spent)+" spent this month":"budget ready to track")+"."
    };
  }
  function contextCards(m){
    if(isFR()){
      const cards={
        morning:[["Priorite","Agenda, taches et briefing IA"],["Rythme","Demarrage calme et lisible"],["Controle","Tout reste modifiable"],["Signal","Services synchronises"]],
        focus:[["Priorite","Projets, notes et fichiers recents"],["Rythme","Moins de bruit, plus d'action"],["Controle","Recherche globale disponible"],["Signal","Activite et productivite"]],
        gaming:[["Priorite","Gaming et presence sociale"],["Rythme","Musique, Discord et sessions"],["Controle","Widgets de service conserves"],["Signal","Steam, Spotify, Twitch"]],
        evening:[["Priorite","Journal et habitudes"],["Rythme","Synthese de fin de journee"],["Controle","Retour sur les objectifs"],["Signal","Ambiance plus douce"]],
        night:[["Priorite","Essentiel seulement"],["Rythme","Interface plus silencieuse"],["Controle","Acces rapide aux notes"],["Signal","Focus et repos"]]
      };
      return cards[m]||cards.focus;
    }
    const cards={
      morning:[["Priority","Agenda, tasks and AI briefing"],["Rhythm","Calm readable start"],["Control","Everything remains editable"],["Signal","Services synchronized"]],
      focus:[["Priority","Projects, notes and recent files"],["Rhythm","Less noise, more action"],["Control","Global search available"],["Signal","Activity and productivity"]],
      gaming:[["Priority","Gaming and social presence"],["Rhythm","Music, Discord and sessions"],["Control","Service widgets preserved"],["Signal","Steam, Spotify, Twitch"]],
      evening:[["Priority","Journal and habits"],["Rhythm","End of day synthesis"],["Control","Review goals"],["Signal","Softer environment"]],
      night:[["Priority","Essentials only"],["Rhythm","Quieter interface"],["Control","Fast access to notes"],["Signal","Focus and rest"]]
    };
    return cards[m]||cards.focus;
  }
  function ensureHome(){
    const page=$("#page-dashboard");
    if(!page)return;
    let hero=$("#ethone-pos-home",page);
    if(!hero){
      hero=document.createElement("section");
      hero.id="ethone-pos-home";
      hero.className="ethone-pos-home";
      hero.setAttribute("aria-label","ETHONE Home");
      hero.innerHTML='<div class="ethone-pos-home-grid">'+
        '<div>'+
          '<div class="ethone-pos-mode"><span class="ethone-pos-mode-dot"></span><span id="ethone-pos-mode">PERSONAL OS</span></div>'+
          '<div class="ethone-pos-title" id="ethone-pos-title">ETHONE Home</div>'+
          '<div class="ethone-pos-copy" id="ethone-pos-copy">Your digital life, organized calmly.</div>'+
          '<div class="ethone-pos-signals">'+
            '<div class="ethone-pos-signal"><div class="ethone-pos-signal-label">'+(isFR()?"Taches":"Tasks")+'</div><div class="ethone-pos-signal-value" id="ethone-pos-signal-tasks">0</div></div>'+
            '<div class="ethone-pos-signal"><div class="ethone-pos-signal-label">'+(isFR()?"Fichiers":"Files")+'</div><div class="ethone-pos-signal-value" id="ethone-pos-signal-files">0</div></div>'+
            '<div class="ethone-pos-signal"><div class="ethone-pos-signal-label">'+(isFR()?"Habitudes":"Habits")+'</div><div class="ethone-pos-signal-value" id="ethone-pos-signal-habits">0</div></div>'+
            '<div class="ethone-pos-signal"><div class="ethone-pos-signal-label">'+(isFR()?"Mode":"Mode")+'</div><div class="ethone-pos-signal-value" id="ethone-pos-signal-mode">Focus</div></div>'+
          '</div>'+
        '</div>'+
        '<aside class="ethone-pos-brief">'+
          '<div class="ethone-pos-brief-label">'+(isFR()?"Briefing du moment":"Current briefing")+'</div>'+
          '<div class="ethone-pos-brief-text" id="ethone-pos-brief"></div>'+
          '<div class="ethone-pos-actions">'+
            '<button class="btn btn-primary ethone-pos-action" type="button" onclick="runAction(\'brain.open\',{el:this,source:\'personal-os-vision\'})">'+(isFR()?"Ouvrir IA":"Open AI")+'</button>'+
            '<button class="btn btn-ghost ethone-pos-action" type="button" onclick="runAction(\'navigation.open\',{page:\'todos\',el:this,source:\'personal-os-vision\'})">'+(isFR()?"Voir taches":"View tasks")+'</button>'+
          '</div>'+
        '</aside>'+
      '</div>';
      const topbar=$(".topbar",page);
      if(topbar&&topbar.nextSibling)topbar.parentNode.insertBefore(hero,topbar.nextSibling);
      else page.prepend(hero);
    }
    let context=$("#ethone-pos-context",page);
    if(!context){
      context=document.createElement("section");
      context.id="ethone-pos-context";
      context.className="ethone-pos-context";
      const stats=$(".stats-row",page);
      if(stats&&stats.parentNode)stats.parentNode.insertBefore(context,stats.nextSibling);
      else hero.insertAdjacentElement("afterend",context);
    }
    const n=numbers();
    const m=mode();
    const c=copyFor(m,n);
    $("#ethone-pos-mode")&&( $("#ethone-pos-mode").textContent=c.mode );
    $("#ethone-pos-title")&&( $("#ethone-pos-title").textContent=c.title );
    $("#ethone-pos-copy")&&( $("#ethone-pos-copy").textContent=c.copy );
    $("#ethone-pos-brief")&&( $("#ethone-pos-brief").textContent=c.brief );
    $("#ethone-pos-signal-tasks")&&( $("#ethone-pos-signal-tasks").textContent=n.openTodos+" / "+(n.openTodos+n.doneTodos) );
    $("#ethone-pos-signal-files")&&( $("#ethone-pos-signal-files").textContent=String(n.files) );
    $("#ethone-pos-signal-habits")&&( $("#ethone-pos-signal-habits").textContent=String(n.habits) );
    $("#ethone-pos-signal-mode")&&( $("#ethone-pos-signal-mode").textContent=m.charAt(0).toUpperCase()+m.slice(1) );
    context.innerHTML=contextCards(m).map(card=>'<article class="ethone-pos-context-card"><strong>'+card[0]+'</strong><span>'+card[1]+'</span></article>').join("");
    const title=$("#page-dashboard .topbar .page-title");
    if(title)title.textContent="ETHONE Home";
    const subtitle=$("#page-dashboard .topbar .page-subtitle");
    if(subtitle)subtitle.textContent=isFR()?"Ton systeme personnel pour organiser toute ta vie numerique.":"Your personal operating system for your digital life.";
    const role=$("#profile-banner-bio-el");
    if(role&&/dashboard|personal/i.test(role.textContent))role.textContent=isFR()?"Personal OS":"Personal OS";
  }
  function semanticPolish(){
    document.documentElement.classList.add("ethone-personal-os-ready");
    document.body.classList.add("ethone-personal-os-ready");
    $("#main-sidebar")?.setAttribute("aria-label","ETHONE navigation");
    $$(".tab-content").forEach(p=>{
      p.setAttribute("role","tabpanel");
      if(!p.hasAttribute("tabindex"))p.setAttribute("tabindex","-1");
    });
    $$("button:not([type])").forEach(b=>b.type="button");
  }
  function patchLabels(){
    try{
      if(window.I18N){
        window.I18N.fr=window.I18N.fr||{};
        window.I18N.en=window.I18N.en||{};
        window.I18N.es=window.I18N.es||{};
        window.I18N.de=window.I18N.de||{};
        window.I18N.fr.nav_overview="Accueil";
        window.I18N.en.nav_overview="Home";
        window.I18N.es.nav_overview="Inicio";
        window.I18N.de.nav_overview="Home";
      }
      document.title="ETHONE - Personal OS";
      if(typeof window.renderSidebarNav==="function")window.renderSidebarNav();
    }catch(e){}
  }
  function run(){
    enhanceBoot();
    semanticPolish();
    patchLabels();
    ensureHome();
  }
  function startPersonalOs(){
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});
    else run();
    setTimeout(run,240);
    setTimeout(run,1200);
    setInterval(()=>{if($("#page-dashboard.active"))ensureHome()},30000);
    try{
      new MutationObserver(()=>{enhanceBoot(); if($("#page-dashboard"))ensureHome()}).observe(document.body,{childList:true,subtree:true});
    }catch(e){}
  }
  if(window.ethoneRunWhenDashboardReady)window.ethoneRunWhenDashboardReady("personal-os-vision",startPersonalOs);else startPersonalOs();
})();
