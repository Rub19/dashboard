/* ETHONE legacy compatibility module: auth-session. */
async function onAuthSuccess(userArg){
  if(window.__ethoneDeferredHeavyForAuth&&!sessionStorage.getItem('ethone:post-auth-full-boot')){
    try{sessionStorage.setItem('ethone:post-auth-full-boot','1')}catch(e){}
  }
  // 1. Supprime l'anti-flash AVANT tout, sinon le !important bloque les display
  removeAntiFlash();
  const authEl=document.getElementById('auth-screen');
  if(authEl){ authEl.style.display='none'; }

  // 2. Montre un écran de chargement simple (réutilise le boot screen)
  let boot=document.getElementById('nexus-boot-screen');
  if(!boot){
    boot=document.createElement('div');
    boot.id='nexus-boot-screen';
    boot.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#050507;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px';
    boot.innerHTML=document.querySelector('#nexus-boot-screen-tpl')?.innerHTML||'<div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="4" y="5" width="12" height="2" rx="1" fill="white" opacity=".95"/><rect x="4" y="9" width="12" height="2" rx="1" fill="white" opacity=".95"/><rect x="4" y="13" width="8" height="2" rx="1" fill="white" opacity=".95"/></svg></div><div style="display:flex;gap:5px"><div style="width:5px;height:5px;border-radius:50%;background:#8b5cf6;animation:pulse 1.2s ease-in-out infinite"></div><div style="width:5px;height:5px;border-radius:50%;background:#8b5cf6;animation:pulse 1.2s ease-in-out infinite .2s"></div><div style="width:5px;height:5px;border-radius:50%;background:#8b5cf6;animation:pulse 1.2s ease-in-out infinite .4s"></div></div>';
    document.body.appendChild(boot);
  } else {
    boot.style.opacity='1';
    boot.style.display='flex';
  }

  try{
    // 3. Utilise le user passé en param (depuis signInWithPassword) ou fallback getUser
    let user=userArg;
    if(!user){
      const {data,error:ue}=await sb.auth.getUser();
      if(!data?.user||ue){
        if(typeof showAuth==='function')showAuth();
        else if(authEl) authEl.style.display='flex';
        hideBoot();
        return;
      }
      user=data.user;
    }
    _sbUser=user;
    _isAdmin=user?.email===ADMIN_EMAIL;

    // 4. Charge les données
    await ethoneWithTimeout(loadCloudState(),4500,'Cloud profile load');
    if(!profiles.length){
      profiles.push({id:Date.now(),name:'Mon profil',
        avatarEmoji:AVATARS[0].e,avatarBg:AVATARS[0].b,
        avatarImg:null,avatarIdx:0,state:defState('Mon profil')});
      await ethoneWithTimeout(saveCloudState(),4500,'Initial cloud profile save').catch(()=>{});
    }
    normalizeAllProfiles();
    try{ sessionStorage.setItem('nexus_profiles_'+_sbUser.id,JSON.stringify(sanitizeProfilesForPersistence(profiles))); }catch(e){}
    try{ if(window.ETHONETimeline)window.ETHONETimeline.record({dedupe:'auth-'+_sbUser.id+'-'+new Date().toLocaleDateString('en-CA'),title:'Connexion ETHONE',body:user.email||'',category:'auth',icon:'log-in',source:'auth'}); }catch(e){}

    // 5. Affiche le dashboard — hideBoot() est appelé à l'intérieur
    showDashboardOrProfiles();

  }catch(err){
    console.error('[ETHONE] onAuthSuccess error:',err);
    if(typeof showAuth==='function')showAuth();
    else if(authEl) authEl.style.display='flex';
    hideBoot();
  }
}
