/* ETHONE legacy compatibility module: mobile-sidebar. */
// ===================================================
//  MOBILE SIDEBAR
// ===================================================
function setMobNav(page){
  document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('mob-btn-'+page);
  if(btn)btn.classList.add('active');
}

function syncMobileSidebarA11y(sidebar,open){
  if(sidebar){
    sidebar.setAttribute('aria-hidden',open?'false':'true');
    sidebar.setAttribute('aria-expanded',open?'true':'false');
  }
  document.querySelectorAll('#hamburger,#mobile-topbar button[onclick*="toggleMobileSidebar"]').forEach(button=>{
    button.setAttribute('aria-controls','main-sidebar');
    button.setAttribute('aria-expanded',open?'true':'false');
    button.setAttribute('aria-label',open?'Close sidebar':'Open sidebar');
    button.title=open?'Close sidebar':'Open sidebar';
  });
}

function toggleMobileSidebar(){
  const sidebarEl=document.getElementById('main-sidebar');
  const ov=document.getElementById('sidebar-overlay');
  if(!sidebarEl)return;
  sidebarEl.classList.toggle('mobile-open');
  const open=sidebarEl.classList.contains('mobile-open');
  syncMobileSidebarA11y(sidebarEl,open);
  if(ov){
    ov.classList.toggle('mobile-open',open);
    ov.setAttribute('aria-hidden',open?'false':'true');
  }
  // Hide swipe hint once user discovers the sidebar
  const hint=document.getElementById('swipe-hint');
  if(hint&&sidebarEl.classList.contains('mobile-open')){
    hint.style.opacity='0';setTimeout(()=>{if(hint)hint.style.display='none';},500);
    localStorage.setItem('nexus_swipe_discovered','1');
  }
}

// Hide swipe hint if already discovered
if(localStorage.getItem('nexus_swipe_discovered')){
  const h=document.getElementById('swipe-hint');if(h)h.style.display='none';
}
function closeMobileSidebar(){
  const sidebar=document.getElementById('main-sidebar');
  const overlay=document.getElementById('sidebar-overlay');
  sidebar?.classList.remove('mobile-open');
  syncMobileSidebarA11y(sidebar,false);
  overlay?.classList.remove('mobile-open');
  overlay?.setAttribute('aria-hidden','true');
}
// Auto-close sidebar on nav click (mobile)
document.addEventListener('click',e=>{
  if(window.innerWidth<=768&&e.target.closest('.nav-item')){
    setTimeout(closeMobileSidebar,120);
  }
});
// Show/hide hamburger based on viewport
function checkMobileLayout(){
  const isMobile=window.innerWidth<=768;
  const isTablet=window.innerWidth>768&&window.innerWidth<=1024;
  const usesOffCanvas=isMobile||isTablet;
  const mobTopbar=document.getElementById('mobile-topbar');
  if(mobTopbar) mobTopbar.style.setProperty('display',isMobile?'flex':'none','important');
  // Tablet-only: #mobile-topbar already ships its own toggle button (and its
  // own avatar/name/add-button header) for true mobile widths, so showing
  // this standalone button there too would duplicate it on-screen.
  const hb=document.getElementById('hamburger');
  if(hb) hb.style.setProperty('display',isTablet?'flex':'none','important');

  const sidebar=document.getElementById('main-sidebar');
  const overlay=document.getElementById('sidebar-overlay');
  if(!sidebar)return;

  if(!usesOffCanvas){
    sidebar.classList.remove('mobile-open');
    syncMobileSidebarA11y(sidebar,false);
    sidebar.removeAttribute('aria-hidden');
    sidebar.removeAttribute('aria-expanded');
    overlay?.classList.remove('mobile-open');
    overlay?.setAttribute('aria-hidden','true');
    return;
  }

  const isOpen=sidebar.classList.contains('mobile-open');
  syncMobileSidebarA11y(sidebar,isOpen);
  overlay?.classList.toggle('mobile-open',isOpen);
  overlay?.setAttribute('aria-hidden',isOpen?'false':'true');
}

// ── Laptop range (1025-1200px): auto-compact unless the user explicitly
// expanded the sidebar while in this range (tracked separately from the
// persisted p.sidebarCompact preference so a real toggle click always wins).
function applyResponsiveSidebar(){
  const sb=document.getElementById('main-sidebar');
  if(!sb)return;
  const w=window.innerWidth;
  const inLaptopRange=w>=1025&&w<=1200;
  if(!inLaptopRange){
    if(sb.dataset.autoCompact==='1'){
      sb.classList.remove('compact');
      if(window.ethoneSidebarResize)window.ethoneSidebarResize.resumeFromCompact();
    }
    delete sb.dataset.autoCompact;
    delete sb.dataset.userExpandedLaptop;
    return;
  }
  if(sb.dataset.userExpandedLaptop==='1')return;
  if(!sb.classList.contains('compact')){
    sb.classList.add('compact');
    sb.dataset.autoCompact='1';
    if(window.ethoneSidebarResize)window.ethoneSidebarResize.suspendForCompact();
  }
}
window.ethoneNotifyManualCompactToggle=function(){
  const sb=document.getElementById('main-sidebar');
  if(!sb)return;
  const w=window.innerWidth;
  if(w>=1025&&w<=1200){
    if(!sb.classList.contains('compact'))sb.dataset.userExpandedLaptop='1';
    else delete sb.dataset.userExpandedLaptop;
  }
  delete sb.dataset.autoCompact;
};

let _responsiveTimer=null;
window.addEventListener('resize',()=>{
  checkMobileLayout();
  clearTimeout(_responsiveTimer);
  _responsiveTimer=setTimeout(applyResponsiveSidebar,80);
});
document.addEventListener('DOMContentLoaded',()=>{
  checkMobileLayout();
  setTimeout(()=>applyResponsiveSidebar(),300);
});

// ===================================================
