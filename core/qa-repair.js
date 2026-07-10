/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  'use strict';
  const EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2"/><path d="M7.4 7.7C4.4 9.5 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.8 0 3.3-.4 4.7-1"/><path d="M13.9 5.7c5 1 7.6 6.3 7.6 6.3a17.8 17.8 0 0 1-2.2 2.8"/></svg>';
  function qs(s,r=document){return r.querySelector(s)} function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function show(el,display){if(el){el.style.setProperty('display',display||'block','important');el.style.setProperty('visibility','visible','important');el.removeAttribute('aria-hidden')}}
  function hide(el){if(el){el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important');el.setAttribute('aria-hidden','true')}}
  function showSidebarForLayout(el){
    if(!el)return;
    el.style.setProperty('display','flex','important');
    const closedOffCanvas=window.matchMedia('(max-width: 1024px)').matches&&!el.classList.contains('mobile-open');
    if(closedOffCanvas){
      el.style.removeProperty('visibility');
      el.style.removeProperty('opacity');
      el.setAttribute('aria-hidden','true');
      return;
    }
    el.style.setProperty('visibility','visible','important');
    el.style.setProperty('opacity','1','important');
    el.removeAttribute('aria-hidden');
  }
  function removeAntiFlash(){const af=qs('#anti-flash'); if(af) af.remove(); qsa('#ethone-boot-screen,#nexus-boot-screen,#nexus-page-loader,#nexus-page-transition').forEach(hide)}
  function visible(el){
    if(!el)return false;
    const style=getComputedStyle(el);
    const rect=el.getBoundingClientRect();
    return !el.hidden&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&rect.width>0&&rect.height>0;
  }
  function debugQA(){
    try{return localStorage.getItem('ethone:debug-qa')==='1'||/[?&]debugQA=1\b/.test(location.search)}catch(e){return false}
  }
  function fixEyeButtons(){
    qsa('.lb-eye,button[onclick*="togglePwVis"]').forEach(btn=>{
      btn.classList.add('ethone-eye-btn'); btn.type='button'; btn.setAttribute('aria-label','Afficher ou masquer le mot de passe'); btn.setAttribute('title','Afficher / masquer le mot de passe');
      const inputId=(btn.getAttribute('onclick')||'').match(/togglePwVis\(['"]([^'"]+)/)?.[1];
      const input=inputId?document.getElementById(inputId):btn.parentElement?.querySelector('input[type="password"],input[type="text"]');
      btn.innerHTML=(input&&input.type==='text')?EYE_OFF:EYE;
    });
  }
  const oldToggle=window.togglePwVis;
  window.togglePwVis=function(id,btn){
    const input=document.getElementById(id); if(!input) return;
    input.type=input.type==='password'?'text':'password';
    if(btn){btn.innerHTML=input.type==='text'?EYE_OFF:EYE;btn.setAttribute('aria-pressed',String(input.type==='text'));}
    if(typeof oldToggle==='function' && oldToggle!==window.togglePwVis){ try{}catch(e){} }
  };
  function closeFloatingUI(options){
    const keepCommand=!!(options&&options.keepCommand);
    if(!keepCommand&&window.ethoneForceCloseTransientUI&&typeof window.ethoneForceCloseTransientUI==='function'){
      try{window.ethoneForceCloseTransientUI();}catch(e){}
    }
    if(!keepCommand&&window.ETHONEUIIsolation&&typeof window.ETHONEUIIsolation.closeTransientUI==='function'){
      try{window.ETHONEUIIsolation.closeTransientUI();}catch(e){}
    }
    qsa('.modal-overlay.open').forEach(m=>m.classList.remove('open'));
    const floatingSelector=keepCommand
      ? '#notif-panel,#notif-overlay,#presentation-overlay,#ethone-mission-control,#ethone-version-popup-root,#ethone-whats-new-root,#nexus-page-transition,.lang-menu.open,.dropdown.open'
      : '#notif-panel,#notif-overlay,#cmd-palette,#cmd-palette-overlay,#command-palette,#presentation-overlay,#ethone-mission-control,#ethone-version-popup-root,#ethone-whats-new-root,#nexus-page-transition,.lang-menu.open,.dropdown.open';
    qsa(floatingSelector).forEach(el=>{
      el.classList.remove('open','active','visible','spotlight-open');
      if(el.id==='ethone-mission-control')el.setAttribute('aria-hidden','true');
      if(el.id==='ethone-version-popup-root'||el.id==='ethone-whats-new-root')el.classList.remove('is-open');
      if(!/^(cmd-palette|command-palette|notif-panel|notif-overlay|presentation-overlay|ethone-mission-control|ethone-version-popup-root|ethone-whats-new-root)$/.test(el.id||''))hide(el);
    });
    ['notif-panel','notif-overlay'].forEach(id=>{
      const el=qs('#'+id);
      if(!el)return;
      el.classList.remove('open','active','visible');
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('opacity');
      el.setAttribute('aria-hidden','true');
    });
    document.body.classList.remove('ethone-modal-open','ethone-mission-control-open','ethone-presentation-open','ethone-version-popup-active','ethone-whats-new-active');
    if(!keepCommand)document.body.classList.remove('ethone-command-open');
  }
  function ensurePageReady(){
    const pages=qsa('.tab-content'); if(!pages.length) return;
    let active=pages.find(p=>p.classList.contains('active'));
    if(!active){active=qs('#page-dashboard')||pages[0]; active.classList.add('active');}
    pages.forEach(p=>{ if(p!==active) p.classList.remove('active'); });
    qsa('.tab-content').forEach(p=>{
      p.style.removeProperty('visibility');
      if(!p.dataset.qaRepaired){
        p.dataset.qaRepaired='true';
        p.setAttribute('role','tabpanel');
      }
    });
  }
  function repairLayouts(){
    const notes=qs('#page-notes > div[style*="display:flex"]'); if(notes) notes.classList.add('notes-layout-repair');
    qsa('[style*="overflow:hidden"]').forEach(el=>{ if(el.classList.contains('main')||el.classList.contains('tab-content')) el.style.overflow='visible'; });
    document.documentElement.style.overflowX='hidden'; document.body.style.overflowX='hidden';
  }
  function showLogin(){removeAntiFlash(); closeFloatingUI({keepCommand:true}); hide(qs('#main-sidebar')); hide(qs('#main-content')); hide(qs('#profile-screen')); hide(qs('#password-screen')); const a=qs('#auth-screen'); show(a,'flex'); const card=qs('#auth-card'); if(card) show(card,'block'); fixEyeButtons();}
  window.ethoneForceLoginVisible=showLogin;
  window.ethoneCloseFloatingUI=closeFloatingUI;
  function sanityVisibility(){
    removeAntiFlash(); fixEyeButtons(); ensurePageReady(); repairLayouts();
    const auth=qs('#auth-screen'), profile=qs('#profile-screen'), pass=qs('#password-screen'), main=qs('#main-content');
    const any=visible(auth)||visible(profile)||visible(pass)||visible(main);
    if(!any) showLogin();
    if(visible(main)){ showSidebarForLayout(qs('#main-sidebar')); show(main,'block'); hide(auth); hide(profile); hide(pass); }
  }
  function runAudit(){
    const pages=qsa('.tab-content').map(p=>({id:p.id,text:p.textContent.replace(/\s+/g,' ').trim().length,empty:!p.textContent.trim()}));
    const duplicateIds=[]; const seen=new Set(); qsa('[id]').forEach(el=>{if(seen.has(el.id)) duplicateIds.push(el.id); else seen.add(el.id)});
    const jsKeywords=new Set(['if','for','while','switch','return','typeof','void']);
    const missingHandlers=qsa('[onclick]').filter(el=>{const code=el.getAttribute('onclick')||''; const m=code.match(/^\s*([a-zA-Z_$][\w$]*)\s*\(/); return m && !jsKeywords.has(m[1]) && typeof window[m[1]]!=='function';}).map(el=>({text:(el.textContent||el.title||el.id||el.className||'button').trim().slice(0,80),handler:(el.getAttribute('onclick')||'').slice(0,80)}));
    const horizontalOverflow=Math.max(0,document.documentElement.scrollWidth-window.innerWidth);
    const report={pages,totalPages:pages.length,duplicateIds,missingHandlers,horizontalOverflow,visible:{auth:visible(qs('#auth-screen')),profile:visible(qs('#profile-screen')),password:visible(qs('#password-screen')),main:visible(qs('#main-content'))}};
    window.__ethoneQAAuditReport=report;
    if(debugQA()){
      console.groupCollapsed('%cETHONE QA audit','color:#a78bfa;font-weight:700');
      console.table(pages);
      console.groupEnd();
    }
    return report;
  }
  window.ethoneRunFullAudit=runAudit;
  document.addEventListener('keydown',e=>{if(e.key==='Escape') closeFloatingUI();});
  document.addEventListener('DOMContentLoaded',()=>{fixEyeButtons(); repairLayouts(); setTimeout(sanityVisibility,350); setTimeout(sanityVisibility,1600);});
  window.addEventListener('load',()=>{
    setTimeout(sanityVisibility,500);
    if(debugQA())setTimeout(runAudit,1200);
  });
})();
