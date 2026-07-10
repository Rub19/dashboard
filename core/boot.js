/* ETHONE legacy compatibility module: boot. */
// === BOOT ===
function removeAntiFlash(){
  const s=document.getElementById('anti-flash');
  if(s)s.remove();
}

function hideBoot(){
  removeAntiFlash();
  ['nexus-boot-screen'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.style.transition='opacity .22s ease';el.style.opacity='0';setTimeout(()=>{if(el.parentNode)el.remove();},230);}
  });
}

function setEthoneMode(mode){
  document.documentElement.className=(document.documentElement.className||'').replace(/ethone-\w+-mode/g,'').trim()+' ethone-'+mode+'-mode';
}
function ethoneSetSurfaceInert(el,inert){
  if(!el)return;
  try{
    if('inert' in el)el.inert=!!inert;
    else if(inert)el.setAttribute('inert','');
    else el.removeAttribute('inert');
  }catch(error){
    if(inert)el.setAttribute('inert','');
    else el.removeAttribute('inert');
  }
}
function ethoneSetSurfaceVisible(id,display){
  const el=document.getElementById(id);
  if(!el)return;
  if(display==='none'){
    el.classList.remove('ethone-auth-v3-visible');
    ethoneSetSurfaceInert(el,true);
    el.style.setProperty('display','none','important');
    el.style.setProperty('visibility','hidden','important');
    el.style.setProperty('opacity','0','important');
    el.setAttribute('aria-hidden','true');
    return;
  }
  const closedMobileSidebar=id==='main-sidebar'&&
    window.matchMedia&&window.matchMedia('(max-width: 1024px)').matches&&
    !el.classList.contains('mobile-open');
  if(closedMobileSidebar){
    ethoneSetSurfaceInert(el,true);
    el.style.setProperty('display',display,'important');
    el.style.removeProperty('visibility');
    el.style.removeProperty('opacity');
    el.setAttribute('aria-hidden','true');
    return;
  }
  ethoneSetSurfaceInert(el,false);
  if(display==='css')el.style.removeProperty('display');
  else el.style.setProperty('display',display,'important');
  el.style.setProperty('visibility','visible','important');
  el.style.setProperty('opacity','1','important');
  el.removeAttribute('aria-hidden');
}
function showAuth(){
  removeAntiFlash();
  setEthoneMode('auth');
  ['app-shell','main-sidebar','main-content','profile-screen','password-screen'].forEach(id=>ethoneSetSurfaceVisible(id,'none'));
  const a=document.getElementById('auth-screen');
  if(a){a.classList.add('ethone-auth-v3-visible');ethoneSetSurfaceVisible('auth-screen','grid');}
  const card=document.getElementById('auth-card')||document.getElementById('lb-box');
  if(card){card.style.setProperty('display','block','important');card.style.setProperty('visibility','visible','important');card.style.setProperty('opacity','1','important');}
  hideBoot(); if(typeof updateClock==='function')updateClock();
}

function normalizeAllProfiles(){
  if(!Array.isArray(profiles)) profiles=[];
  const seenIds=new Set();
  const normalized=[];
  profiles.filter(p=>p&&typeof p==='object').forEach(p=>{
    if(!p.id)p.id=Date.now()+Math.random().toString(16).slice(2);
    const stableId=String(p.id);
    if(seenIds.has(stableId))return;
    seenIds.add(stableId);
    if(!p.name)p.name='Profil';
    if(!p.state)p.state=defState(p.name);
    if(!p.state.connections)p.state.connections={};
    if(!p.state.gaming)p.state.gaming={};
    if(!p.state.pinned)p.state.pinned=[];
    if(!p.state.habits)p.state.habits=[];
    if(!p.state.kanban)p.state.kanban=[];
    if(!p.state.events)p.state.events=[];
    normalized.push(p);
  });
  profiles=normalized;
  try{
    localStorage.setItem('myspace_profiles_backup',JSON.stringify(sanitizeProfilesForPersistence(profiles)));
    localStorage.setItem('myspace_profiles_backup_owner',(_sbUser&&_sbUser.id)||'');
  }catch(e){}
}
function ethoneCleanProfileList(opts){
  const before=Array.isArray(profiles)?profiles.length:0;
  normalizeAllProfiles();
  if(_sbUser){try{sessionStorage.setItem('nexus_profiles_'+_sbUser.id,JSON.stringify(sanitizeProfilesForPersistence(profiles)));}catch(e){}}
  if(!opts||opts.render!==false){try{renderProfileScreen();}catch(e){}}
  return {before:before,after:profiles.length};
}
window.ethoneCleanProfileList=ethoneCleanProfileList;

function showDashboardOrProfiles(){
  normalizeAllProfiles();
  ['auth-screen','password-screen'].forEach(id=>ethoneSetSurfaceVisible(id,'none'));
  if(profiles.length===1&&!profiles[0].password){
    const p=profiles[0]; currentId=p.id;
    setEthoneMode('dashboard');
    try{if(window.ETHONEBootSequence)window.ETHONEBootSequence.prepareDashboardMount();}catch(e){}
    ethoneSetSurfaceVisible('profile-screen','none');
    ethoneSetSurfaceVisible('app-shell','css');
    ethoneSetSurfaceVisible('main-sidebar','flex');
    ethoneSetSurfaceVisible('main-content','block');
    try{applyI18n();}catch(error){console.warn('[ETHONE boot] i18n refresh skipped',error);}
    try{initDashboard();}catch(error){console.error('[ETHONE boot] Dashboard init failed',error);}
    hideBoot();
    try{window.dispatchEvent(new Event('ethone:dashboard-ready'))}catch(e){}
    try{window.dispatchEvent(new CustomEvent('ethone:page-ready',{detail:{page:'dashboard'}}))}catch(e){}
    try{if(window.ETHONEBootSequence)window.ETHONEBootSequence.finishDashboardMount();}catch(e){}
    if(!window.__ethoneSkipAnimatedBackgrounds&&(!curP()?.bgTheme||curP()?.bgTheme==='none')&&typeof startAmbientBg==='function') setTimeout(startAmbientBg,400);
  } else {
    setEthoneMode('profile');
    ethoneSetSurfaceVisible('app-shell','none');
    ethoneSetSurfaceVisible('main-sidebar','none');
    ethoneSetSurfaceVisible('main-content','none');
    renderProfileScreen();
    ethoneSetSurfaceVisible('profile-screen','flex');
    hideBoot(); if(typeof updateClock==='function')updateClock();
  }
}

function ethoneWithTimeout(promise,ms,label){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error((label||'Operation')+' timed out')),ms))
  ]);
}

(function(){
  if(typeof I18N!=='undefined'&&typeof applyI18n==='function')applyI18n();

  ethoneWithTimeout(sb.auth.getSession(),4200,'Supabase session').then(async({data:{session},error})=>{
    // If getSession fails or returns null, try getUser() as fallback
    if(!session || error){
      // Attempt getUser to force token refresh
      try{
        const {data:{user},error:ue}=await ethoneWithTimeout(sb.auth.getUser(),3500,'Supabase user');
        if(!user||ue){ showAuth(); return; }
        // getUser succeeded — get fresh session
        const {data:{session:s2}}=await ethoneWithTimeout(sb.auth.getSession(),3500,'Supabase refreshed session');
        if(!s2){ showAuth(); return; }
        session=s2;
      }catch(e){ showAuth(); return; }
    }

    _sbUser=session.user;
    _isAdmin=session.user?.email===ADMIN_EMAIL;

    const cacheKey='nexus_profiles_'+_sbUser.id;
    const cached=sessionStorage.getItem(cacheKey);
    if(cached){
      try{
        profiles=JSON.parse(cached);
        normalizeAllProfiles();
        showDashboardOrProfiles();
        ethoneWithTimeout(loadCloudState(),4500,'Cloud profile refresh').then(()=>{
          normalizeAllProfiles();
          try{sessionStorage.setItem(cacheKey,JSON.stringify(sanitizeProfilesForPersistence(profiles)));}catch(e){}
          const p=curP();
          if(
            p &&
            !window.__ethoneSkipExternalWidgets &&
            (!window.ethoneCanMountUI||window.ethoneCanMountUI('widgets-panel')) &&
            typeof initSidebarWidgets==='function'
          )initSidebarWidgets(p);
        }).catch(()=>{});
        return;
      }catch(e){ sessionStorage.removeItem(cacheKey); }
    }

    await ethoneWithTimeout(loadCloudState(),4500,'Cloud profile load');
    if(!profiles.length){
      profiles.push({id:Date.now(),name:'Mon profil',
        avatarEmoji:AVATARS[0].e,avatarBg:AVATARS[0].b,
        avatarImg:null,avatarIdx:0,state:defState('Mon profil')});
      await ethoneWithTimeout(saveCloudState(),4500,'Initial cloud profile save').catch(()=>{});
    }
    normalizeAllProfiles();
    try{sessionStorage.setItem(cacheKey,JSON.stringify(sanitizeProfilesForPersistence(profiles)));}catch(e){}
    showDashboardOrProfiles();

  }).catch(err=>{
    console.warn('[ETHONE] Boot error:',err);
    showAuth();
  });
})();
window.addEventListener('ethone:supabase-loaded',function(){
  setTimeout(async function(){
    try{
      if(window.ETHONE_AUTH_BOOT_MODE)return;
      if(window.ethoneIsDashboardVisible&&window.ethoneIsDashboardVisible())return;
      const auth=document.getElementById('auth-screen');
      if(!auth||getComputedStyle(auth).display==='none')return;
      if(!(window.supabase&&typeof window.supabase.createClient==='function'))return;
      window.sb=sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON);
      const result=await ethoneWithTimeout(window.sb.auth.getSession(),4200,'Supabase session retry');
      const session=result&&result.data&&result.data.session;
      if(session&&session.user&&typeof onAuthSuccess==='function')await onAuthSuccess(session.user);
    }catch(e){console.warn('[ETHONE] Supabase async session retry failed:',e)}
  },0);
});
// ══════════════════════════════════════════════════════════════
