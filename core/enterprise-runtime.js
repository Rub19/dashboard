/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  'use strict';
  if(window.ETHONE_LIGHT_BOOT_MODE)return;
  if(window.__ethoneEnterprise2026)return;window.__ethoneEnterprise2026=true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const accents={violet:['#8b5cf6','139,92,246'],blue:['#3b82f6','59,130,246'],emerald:['#10b981','16,185,129'],rose:['#f43f5e','244,63,94'],amber:['#f59e0b','245,158,11'],slate:['#94a3b8','148,163,184']};
  const state={accent:localStorage.getItem('ethone:accent')||'violet',bg:localStorage.getItem('ethone:bg')||'aurora',compact:localStorage.getItem('ethone:compact')==='1',reduced:localStorage.getItem('ethone:reducedMotion')==='1'};
  function applyPrefs(){
    const a=accents[state.accent]||accents.violet;
    document.documentElement.style.setProperty('--accent',a[0]);
    document.documentElement.style.setProperty('--accent-h',a[0]);
    document.documentElement.style.setProperty('--eh-accent',a[0]);
    document.documentElement.style.setProperty('--eh-accent-rgb',a[1]);
    document.body.classList.toggle('eh-compact',state.compact);
    document.body.classList.toggle('eh-reduced-motion',state.reduced);
    document.body.classList.remove('eh-bg-aurora','eh-bg-grid','eh-bg-none');
    document.body.classList.add('eh-bg-'+state.bg);
    $$('.eh-bg-option').forEach(b=>b.classList.toggle('active',b.dataset.bg===state.bg));
    const density=$('#eh-density-toggle'); if(density){density.classList.toggle('on',state.compact);density.setAttribute('aria-pressed',String(state.compact));}
    const motion=$('#eh-motion-toggle'); if(motion){motion.classList.toggle('on',state.reduced);motion.setAttribute('aria-pressed',String(state.reduced));}
  }
  function notify(msg,type='info'){
    if(typeof window.toast==='function'){try{window.toast(msg,type);return;}catch(e){}}
    const host=$('#eh-toast'); if(!host)return;
    const el=document.createElement('div'); el.className='eh-toast-item';
    el.innerHTML='<i data-lucide="sparkles"></i><span>'+String(msg).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))+'</span>';
    host.appendChild(el); refreshIcons(); setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(8px) scale(.98)';setTimeout(()=>el.remove(),220)},2600);
  }
  function refreshIcons(){ try{ if(window.lucide&&!window.__lucideFailed) window.lucide.createIcons(); }catch(e){} }
  function buildSwatches(){
    const host=$('#eh-accent-swatches'); if(!host)return;
    host.innerHTML=Object.entries(accents).map(([k,v])=>'<button type="button" class="eh-swatch" data-accent="'+k+'" aria-label="'+k+' accent" style="background:'+v[0]+'"></button>').join('');
    host.addEventListener('click',e=>{const b=e.target.closest('[data-accent]');if(!b)return;state.accent=b.dataset.accent;localStorage.setItem('ethone:accent',state.accent);applyPrefs();notify('Accent updated');});
  }
  function wirePanel(){
    const overlay=$('#eh-personalize-overlay');
    document.addEventListener('click',e=>{
      const action=e.target.closest('[data-eh-action]')?.dataset.ehAction;
      if(action){
        if(action==='dashboard'&&window.switchPage)window.switchPage('dashboard',null);
        if(action==='notes'&&window.switchPage)window.switchPage('notes',null);
        if(action==='tasks'&&window.switchPage)window.switchPage('todos',null);
        if(action==='search'){ if(window.openCmdPalette)window.openCmdPalette(); else document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true})); }
        if(action==='personalize'){ syncEnterpriseChrome(); if(document.body.classList.contains('eh-dashboard-ready')) overlay?.classList.add('open'); }
      }
      if(e.target.closest('[data-eh-close]')||e.target===overlay)overlay?.classList.remove('open');
      const bg=e.target.closest('[data-bg]'); if(bg){state.bg=bg.dataset.bg;localStorage.setItem('ethone:bg',state.bg);applyPrefs();notify('Background updated');}
    });
    $('#eh-density-toggle')?.addEventListener('click',()=>{state.compact=!state.compact;localStorage.setItem('ethone:compact',state.compact?'1':'0');applyPrefs();notify(state.compact?'Compact density on':'Comfort density on');});
    $('#eh-motion-toggle')?.addEventListener('click',()=>{state.reduced=!state.reduced;localStorage.setItem('ethone:reducedMotion',state.reduced?'1':'0');applyPrefs();notify(state.reduced?'Reduced motion on':'Motion restored');});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')overlay?.classList.remove('open'); if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='j'){e.preventDefault();overlay?.classList.toggle('open');}});
  }
  function enhanceCards(){
    const targets='.panel,.stat-card,.conn-card,.game-card,.settings-card,.countdown-card,.goal-card,.journal-entry,.note-item,.kanban-col,.ps-card-inner,.ps-add-card';
    document.addEventListener('pointermove',e=>{
      const card=e.target.closest(targets); if(!card||state.reduced)return;
      const r=card.getBoundingClientRect();
      card.style.setProperty('--eh-mx',((e.clientX-r.left)/r.width*100).toFixed(2)+'%');
      card.style.setProperty('--eh-my',((e.clientY-r.top)/r.height*100).toFixed(2)+'%');
    },{passive:true});
    document.addEventListener('click',e=>{
      const p=e.target.closest('.ps-profile'); if(!p)return;
      $$('.ps-profile.is-selected').forEach(x=>x.classList.remove('is-selected'));
      p.classList.add('is-selected');
    });
  }
  function improveEmptyPages(){
    $$('.tab-content[data-qa-page="true"]').forEach(page=>{
      if(page.dataset.ehChecked)return; page.dataset.ehChecked='1';
      const meaningful=page.textContent.replace(/\s+/g,'').length;
      if(meaningful<24&&!page.querySelector('.empty-state')){
        const name=(page.id||'page').replace('page-','').replace(/-/g,' ');
        page.innerHTML='<div class="empty-state"><div class="empty-icon">◇</div><div class="empty-label">'+name.charAt(0).toUpperCase()+name.slice(1)+'</div><div class="empty-sub">This area is ready. Add content to personalize your workspace.</div></div>';
      }
    });
  }
  function wrapSwitchPage(){
    if(!window.switchPage||window.switchPage.__ehWrapped)return;
    const original=window.switchPage;
    window.switchPage=function(page,navEl){
      document.body.classList.add('eh-loading');
      const current=$('.tab-content.active'); if(current) current.classList.add('eh-skeleton');
      try{return original.apply(this,arguments);}finally{
        requestAnimationFrame(()=>{
          setTimeout(()=>{document.body.classList.remove('eh-loading'); $$('.eh-skeleton').forEach(x=>x.classList.remove('eh-skeleton')); updateDock(page); improveEmptyPages();},260);
        });
      }
    };
    window.switchPage.__ehWrapped=true;
  }
  function isMainDashboardVisible(){
    const auth=$('#auth-screen'), profile=$('#profile-screen'), pw=$('#password-screen'), main=$('#main-content');
    const hidden=(el)=>!el||el.style.display==='none'||getComputedStyle(el).display==='none'||getComputedStyle(el).visibility==='hidden';
    return hidden(auth)&&hidden(profile)&&hidden(pw)&&main&&!hidden(main);
  }
  function syncEnterpriseChrome(){
    const ready=isMainDashboardVisible();
    document.body.classList.toggle('eh-dashboard-ready',ready);
    const dock=$('#eh-dock');
    if(dock) dock.setAttribute('aria-hidden',ready?'false':'true');
    const overlay=$('#eh-personalize-overlay');
    if(!ready&&overlay) overlay.classList.remove('open');
  }
  function updateDock(page){
    syncEnterpriseChrome();
    const active=page||$('.tab-content.active')?.id?.replace('page-','');
    $$('#eh-dock [data-eh-action]').forEach(b=>b.dataset.active='false');
    if(active==='dashboard')$('#eh-dock [data-eh-action="dashboard"]')?.setAttribute('data-active','true');
    if(active==='notes')$('#eh-dock [data-eh-action="notes"]')?.setAttribute('data-active','true');
    if(active==='todos')$('#eh-dock [data-eh-action="tasks"]')?.setAttribute('data-active','true');
  }
  function addTopbarHint(){
    $$('.topbar').forEach(tb=>{
      if(tb.querySelector('.eh-kbd-hint'))return;
      const actions=tb.querySelector('.topbar-actions'); if(!actions)return;
      const hint=document.createElement('button'); hint.type='button'; hint.className='btn btn-ghost eh-kbd-hint'; hint.innerHTML='<i data-lucide="search"></i><span>Ctrl K</span>'; hint.onclick=()=>window.openCmdPalette?window.openCmdPalette():null;
      actions.prepend(hint);
    });
  }
  function audit(){
    const pages=$$('.tab-content[data-qa-page="true"]');
    const empty=pages.filter(p=>p.textContent.replace(/\s+/g,'').length<24).map(p=>p.id);
    const overflow=document.documentElement.scrollWidth>window.innerWidth+2;
    const report={pages:pages.length,empty,overflow,active:$('.tab-content.active')?.id||null,auth:!!$('#auth-screen'),profile:!!$('#profile-screen')};
    console.table(report); notify('Audit complete: '+pages.length+' pages checked'); return report;
  }
  window.ethoneEnterpriseAudit=audit;
  window.ethoneOpenPersonalization=()=>$('#eh-personalize-overlay')?.classList.add('open');
  let _ehSyncTimer=0;
  function scheduleEnterpriseChrome(){
    clearTimeout(_ehSyncTimer);
    _ehSyncTimer=setTimeout(syncEnterpriseChrome,250);
  }
  function boot(){buildSwatches();wirePanel();applyPrefs();refreshIcons();enhanceCards();wrapSwitchPage();addTopbarHint();improveEmptyPages();updateDock();setTimeout(refreshIcons,500);setInterval(syncEnterpriseChrome,5000);try{new MutationObserver(scheduleEnterpriseChrome).observe(document.body,{attributes:true,subtree:true,attributeFilter:['style','class']});}catch(e){}}
  function startBoot(){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();}
  if(window.ethoneRunWhenDashboardReady)window.ethoneRunWhenDashboardReady('enterprise-2026-runtime',startBoot);else startBoot();
})();
