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
  const mobTopbar=document.getElementById('mobile-topbar');
  if(mobTopbar) mobTopbar.style.display=isMobile?'flex':'none';
  const hb=document.getElementById('hamburger');
  if(hb) hb.style.display=isMobile?'flex':'none';
}
window.addEventListener('resize',checkMobileLayout);

// ===================================================
