/* ETHONE legacy compatibility module: mobile-sidebar. */
// ===================================================
//  MOBILE SIDEBAR
// ===================================================
function setMobNav(page){
  document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('mob-btn-'+page);
  if(btn)btn.classList.add('active');
}

function toggleMobileSidebar(){
  const sidebarEl=document.getElementById('main-sidebar');
  const ov=document.getElementById('sidebar-overlay');
  sidebarEl.classList.toggle('mobile-open');
  if(ov)ov.classList.toggle('mobile-open');
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
  document.getElementById('main-sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebar-overlay')?.classList.remove('mobile-open');
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
  const mobTopbar=document.getElementById('mobile-topbar');
  if(mobTopbar) mobTopbar.style.setProperty('display',isMobile?'flex':'none','important');
  const hb=document.getElementById('hamburger');
  if(hb) hb.style.setProperty('display',(isMobile||isTablet)?'flex':'none','important');
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
      const main=document.getElementById('main-content');
      if(main)main.style.marginLeft='';
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
    const main=document.getElementById('main-content');
    if(main)main.style.marginLeft='58px';
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
document.addEventListener('DOMContentLoaded',()=>setTimeout(applyResponsiveSidebar,300));

// ===================================================
