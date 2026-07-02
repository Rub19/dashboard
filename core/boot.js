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
function showAuth(){
  removeAntiFlash();
  setEthoneMode('auth');
  ['main-sidebar','main-content','profile-screen','password-screen'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='none';el.style.visibility='hidden';}});
  const a=document.getElementById('auth-screen');
  if(a){a.style.display='grid';a.style.visibility='visible';a.style.opacity='1';}
  const card=document.getElementById('auth-card')||document.getElementById('lb-box');
  if(card){card.style.display='block';card.style.visibility='visible';card.style.opacity='1';}
  hideBoot(); updateClock();
}

function normalizeAllProfiles(){
  if(!Array.isArray(profiles)) profiles=[];
  profiles=profiles.filter(Boolean);
  profiles.forEach(p=>{
    if(!p.id)p.id=Date.now()+Math.random().toString(16).slice(2);
    if(!p.name)p.name='Profil';
    if(!p.state)p.state=defState(p.name);
    if(!p.state.connections)p.state.connections={};
    if(!p.state.gaming)p.state.gaming={};
    if(!p.state.pinned)p.state.pinned=[];
    if(!p.state.habits)p.state.habits=[];
    if(!p.state.kanban)p.state.kanban=[];
    if(!p.state.events)p.state.events=[];
  });
  // Anti-bug: if Rub exists, keep only the real Rub profile visible/local.
  const rubs=profiles.filter(p=>String(p.name||'').trim().toLowerCase()==='rub');
  if(rubs.length){
    profiles=[rubs[0]];
  }else{
    const seen=new Map();
    for(const p of profiles){
      const key=String(p.name||'').trim().toLowerCase()+'|'+(p.avatarImg||p.avatarEmoji||'');
      if(!seen.has(key)) seen.set(key,p);
    }
    profiles=Array.from(seen.values()).slice(0,6);
  }
  try{localStorage.setItem('myspace_profiles_backup',JSON.stringify(profiles));}catch(e){}
}
function ethoneCleanProfileList(opts){
  const before=Array.isArray(profiles)?profiles.length:0;
  normalizeAllProfiles();
  if(_sbUser){try{sessionStorage.setItem('nexus_profiles_'+_sbUser.id,JSON.stringify(profiles));}catch(e){}}
  if(!opts||opts.render!==false){try{renderProfileScreen();}catch(e){}}
  return {before:before,after:profiles.length};
}
window.ethoneCleanProfileList=ethoneCleanProfileList;
async function ethoneDeleteDuplicateProfilesFromCloud(){
  normalizeAllProfiles();
  if(!_sbUser||!sb){console.warn('[ETHONE] Connecte-toi avant de nettoyer le cloud.');return;}
  const keep=profiles[0]; if(!keep){return;}
  try{
    const {data}=await sb.from('dashboard_data').select('id,profile_name,created_at').eq('user_id',_sbUser.id);
    const toDelete=(data||[]).filter(row=>String(row.id)!==String(keep._dbId||keep.id));
    for(const row of toDelete){await sb.from('dashboard_data').delete().eq('id',row.id);}
    console.warn('[ETHONE] Profils cloud supprimés:',toDelete.length);
    await loadCloudState(); normalizeAllProfiles(); saveStateNow(); renderProfileScreen();
  }catch(e){console.error('[ETHONE] Nettoyage cloud impossible:',e);}
}
window.ethoneDeleteDuplicateProfilesFromCloud=ethoneDeleteDuplicateProfilesFromCloud;

function showDashboardOrProfiles(){
  normalizeAllProfiles();
  ['auth-screen','password-screen'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='none';el.style.visibility='hidden';}});
  if(profiles.length===1&&!profiles[0].password){
    const p=profiles[0]; currentId=p.id;
    setEthoneMode('dashboard');
    const ps=document.getElementById('profile-screen'); if(ps){ps.style.display='none';ps.style.visibility='hidden';}
    const sbEl=document.getElementById('main-sidebar'); if(sbEl){sbEl.style.display='flex';sbEl.style.visibility='visible';}
    const main=document.getElementById('main-content'); if(main){main.style.display='block';main.style.visibility='visible';}
    renderSidebarNav(); updateSidebarAvatar(); applyI18n(); updateClock();
    initDashboard(); hideBoot();
    try{window.dispatchEvent(new Event('ethone:dashboard-ready'))}catch(e){}
    try{window.dispatchEvent(new CustomEvent('ethone:page-ready',{detail:{page:'dashboard'}}))}catch(e){}
    if(!curP()?.bgTheme||curP()?.bgTheme==='none') setTimeout(startAmbientBg,400);
  } else {
    setEthoneMode('profile');
    const sbEl=document.getElementById('main-sidebar'); if(sbEl){sbEl.style.display='none';sbEl.style.visibility='hidden';}
    const main=document.getElementById('main-content'); if(main){main.style.display='none';main.style.visibility='hidden';}
    renderProfileScreen();
    const ps=document.getElementById('profile-screen'); if(ps){ps.style.display='flex';ps.style.visibility='visible';ps.style.opacity='1';}
    hideBoot(); updateClock();
  }
}

function ethoneWithTimeout(promise,ms,label){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error((label||'Operation')+' timed out')),ms))
  ]);
}

(function(){
  if(typeof I18N!=='undefined')applyI18n();

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
          try{sessionStorage.setItem(cacheKey,JSON.stringify(profiles));}catch(e){}
          const p=curP();if(p)initSidebarWidgets(p);
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
    try{sessionStorage.setItem(cacheKey,JSON.stringify(profiles));}catch(e){}
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
