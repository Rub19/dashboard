/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  'use strict';
  const EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2"/><path d="M7.4 7.7C4.4 9.5 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.8 0 3.3-.4 4.7-1"/><path d="M13.9 5.7c5 1 7.6 6.3 7.6 6.3a17.8 17.8 0 0 1-2.2 2.8"/></svg>';
  function qs(s,r=document){return r.querySelector(s)} function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function show(el,display){if(el){el.style.setProperty('display',display||'block','important');el.style.setProperty('visibility','visible','important');el.removeAttribute('aria-hidden')}}
  function hide(el){if(el){el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important');el.setAttribute('aria-hidden','true')}}
  function removeAntiFlash(){const af=qs('#anti-flash'); if(af) af.remove(); qsa('#ethone-boot-screen,#nexus-boot-screen,#nexus-page-loader,#nexus-page-transition').forEach(hide)}
  function visible(el){return !!(el && el.offsetParent!==null && getComputedStyle(el).display!=='none' && getComputedStyle(el).visibility!=='hidden')}
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
  function closeFloatingUI(){
    qsa('.modal-overlay.open').forEach(m=>m.classList.remove('open'));
    qsa('#notif-panel,#cmd-palette,#command-palette,#nexus-page-transition,.lang-menu.open,.dropdown.open').forEach(el=>{el.classList.remove('open','active','visible'); if(el.id!=='cmd-palette') hide(el);});
    const np=qs('#notif-panel'); if(np) hide(np);
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
      const meaningful=p.textContent.replace(/\s+/g,' ').trim().length;
      if(meaningful<20 && !p.querySelector('.empty-state')){
        const div=document.createElement('div'); div.className='panel ethone-auto-empty'; div.innerHTML='<div class="empty-state"><div class="empty-icon">✦</div><div class="empty-label">Page prête</div><div class="empty-sub">Cette section est disponible. Ajoute du contenu pour commencer.</div></div>'; p.appendChild(div);
      }
    });
  }
  function repairLayouts(){
    const notes=qs('#page-notes > div[style*="display:flex"]'); if(notes) notes.classList.add('notes-layout-repair');
    qsa('[style*="overflow:hidden"]').forEach(el=>{ if(el.classList.contains('main')||el.classList.contains('tab-content')) el.style.overflow='visible'; });
    document.documentElement.style.overflowX='hidden'; document.body.style.overflowX='hidden';
  }
  function showLogin(){removeAntiFlash(); closeFloatingUI(); hide(qs('#main-sidebar')); hide(qs('#main-content')); hide(qs('#profile-screen')); hide(qs('#password-screen')); const a=qs('#auth-screen'); show(a,'flex'); const card=qs('#auth-card'); if(card) show(card,'block'); fixEyeButtons();}
  window.ethoneForceLoginVisible=showLogin;
  window.ethoneCloseFloatingUI=closeFloatingUI;
  function cleanProfilesVisual(){
    try{
      const cards=qsa('#profile-screen .ps-profile'); if(!cards.length) return {changed:0};
      let changed=0; const rub=cards.filter(c=>/\bRub\b/i.test(c.textContent||''));
      const keep = rub[0] || cards[0]; const seen=new Set();
      cards.forEach(c=>{
        const name=(c.textContent||'').replace(/Lv\s*\d+/ig,'').trim().toLowerCase();
        const isRub=c===keep || /\brub\b/i.test(c.textContent||'');
        const duplicate=seen.has(name) || (/rubens\s+lespinasse/i.test(name) && rub.length);
        if(duplicate && !isRub){ c.style.display='none'; changed++; } else { seen.add(name); c.style.display=''; }
      });
      return {changed};
    }catch(e){return {error:e.message}}
  }
  window.ethoneCleanProfileList=cleanProfilesVisual;
  function sanityVisibility(){
    removeAntiFlash(); fixEyeButtons(); ensurePageReady(); repairLayouts();
    const auth=qs('#auth-screen'), profile=qs('#profile-screen'), pass=qs('#password-screen'), main=qs('#main-content');
    const any=visible(auth)||visible(profile)||visible(pass)||visible(main);
    if(!any) showLogin();
    if(visible(main)){ show(qs('#main-sidebar'),'flex'); show(main,'block'); hide(auth); hide(profile); hide(pass); }
    cleanProfilesVisual();
  }
  function runAudit(){
    const pages=qsa('.tab-content').map(p=>({id:p.id,text:p.textContent.replace(/\s+/g,' ').trim().length,empty:!p.textContent.trim()}));
    const duplicateIds=[]; const seen=new Set(); qsa('[id]').forEach(el=>{if(seen.has(el.id)) duplicateIds.push(el.id); else seen.add(el.id)});
    const missingHandlers=qsa('[onclick]').filter(el=>{const code=el.getAttribute('onclick')||''; const m=code.match(/^\s*([a-zA-Z_$][\w$]*)\s*\(/); return m && typeof window[m[1]]!=='function';}).map(el=>({text:(el.textContent||el.title||el.id||el.className||'button').trim().slice(0,80),handler:(el.getAttribute('onclick')||'').slice(0,80)}));
    const horizontalOverflow=Math.max(0,document.documentElement.scrollWidth-window.innerWidth);
    const report={pages,totalPages:pages.length,duplicateIds,missingHandlers,horizontalOverflow,visible:{auth:visible(qs('#auth-screen')),profile:visible(qs('#profile-screen')),password:visible(qs('#password-screen')),main:visible(qs('#main-content'))}};
    console.groupCollapsed('%cETHONE QA audit','color:#a78bfa;font-weight:700'); console.table(pages); console.log(report); console.groupEnd(); return report;
  }
  window.ethoneRunFullAudit=runAudit;
  document.addEventListener('keydown',e=>{if(e.key==='Escape') closeFloatingUI();});
  document.addEventListener('DOMContentLoaded',()=>{fixEyeButtons(); repairLayouts(); setTimeout(sanityVisibility,350); setTimeout(sanityVisibility,1600);});
  window.addEventListener('load',()=>{setTimeout(sanityVisibility,500); setTimeout(runAudit,1200);});
})();
