/* ETHONE legacy compatibility module: profile-banner. */
// ===================================================
//  PROFILE BANNER
// ===================================================
function handleBannerUpload(){
  const inp=document.getElementById('banner-upload');
  const file=inp.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=e=>{
    const p=curP();if(!p)return;
    p.bannerImg=e.target.result;
    saveStateNow();
    updateBannerDisplay();
    // update settings preview
    const prev=document.getElementById('banner-preview-wrap');
    const img=document.getElementById('banner-preview-img');
    if(prev&&img){img.src=e.target.result;prev.style.display='block'}
    toast(uiLang==='fr'?'Bannière mise à jour !':'Banner updated!','success');
  };
  r.readAsDataURL(file);
}

function removeBanner(){
  const p=curP();if(!p)return;
  delete p.bannerImg;
  saveStateNow();
  updateBannerDisplay();
  const prev=document.getElementById('banner-preview-wrap');
  if(prev)prev.style.display='none';
  toast(uiLang==='fr'?'Bannière supprimée':'Banner removed','info');
}

function updateBannerDisplay(){
  const p=curP();if(!p)return;
  const banner=document.getElementById('profile-banner');
  const img=document.getElementById('profile-banner-img');

  // Banner image
  if(banner&&img){
    if(p.bannerImg){
      img.src=p.bannerImg;img.style.display='block';
      banner.classList.remove('profile-banner-empty');
    } else {
      img.style.display='none';
      banner.classList.add('profile-banner-empty');
      const t=THEMES[p.themeIdx||0]||THEMES[0];
      banner.style.background=`linear-gradient(135deg,${t.accent}44,${t.accent2||t.accent}22)`;
    }
  }

  // Avatar
  const bav=document.getElementById('profile-banner-avatar');
  if(bav){
    bav.style.background=p.avatarImg?'transparent':(p.avatarBg||'var(--surface3)');
    bav.innerHTML=avatarHTML(p,64,13);
  }

  // Name
  const bn=document.getElementById('profile-banner-name');
  if(bn)bn.textContent=p.name||'User';

  // Bio
  const bioEl=document.getElementById('profile-banner-bio-el');
  if(bioEl)bioEl.textContent=p.state.bio||'ETHONE';

  // XP level badge
  if(typeof renderProfileXP==='function')renderProfileXP(p);

  // Social links
  const socialsEl=document.getElementById('profile-banner-socials');
  if(socialsEl){
    const s=p.state.socials||{};
    const links=[];
    if(s.twitter)links.push(`<a href="https://twitter.com/${s.twitter.replace('@','')}" target="_blank" style="color:rgba(255,255,255,.7);font-size:11px;text-decoration:none;background:rgba(0,0,0,.25);padding:2px 8px;border-radius:20px">🐦 ${s.twitter}</a>`);
    if(s.github)links.push(`<a href="https://${s.github.startsWith('github')?s.github:'github.com/'+s.github}" target="_blank" style="color:rgba(255,255,255,.7);font-size:11px;text-decoration:none;background:rgba(0,0,0,.25);padding:2px 8px;border-radius:20px">💻 ${s.github.replace('github.com/','')}</a>`);
    if(s.website)links.push(`<a href="https://${s.website.replace(/https?:\/\//,'')}" target="_blank" style="color:rgba(255,255,255,.7);font-size:11px;text-decoration:none;background:rgba(0,0,0,.25);padding:2px 8px;border-radius:20px">🌐 ${s.website.replace(/https?:\/\//,'')}</a>`);
    if(s.instagram)links.push(`<a href="https://instagram.com/${s.instagram.replace('@','')}" target="_blank" style="color:rgba(255,255,255,.7);font-size:11px;text-decoration:none;background:rgba(0,0,0,.25);padding:2px 8px;border-radius:20px">📸 ${s.instagram}</a>`);
    socialsEl.innerHTML=links.join('');
  }

  // NE PAS appeler updateSidebarAvatar ici — elle appelle updateBannerDisplay → boucle infinie
  if(typeof updateTopbarProfile==='function')updateTopbarProfile();
}

function loadBannerSettings(){
  const p=curP();if(!p)return;
  const prev=document.getElementById('banner-preview-wrap');
  const img=document.getElementById('banner-preview-img');
  if(prev&&img){
    if(p.bannerImg){img.src=p.bannerImg;prev.style.display='block'}
    else prev.style.display='none';
  }
  if(typeof renderThemeSwatches==='function')renderThemeSwatches();
  if(typeof renderBgThemeBtns==='function')renderBgThemeBtns();
  if(typeof renderSidebarCustomize==='function')renderSidebarCustomize();
}
