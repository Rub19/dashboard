/* ETHONE legacy compatibility module: topbar-profile. */
// ===================================================
//  TOPBAR PROFILE SHORTCUT
// ===================================================
function updateTopbarProfile(){
  const p=curP();if(!p)return;
  // Helper to fill an avatar container
  function fillAv(el,size,r){
    if(!el)return;
    el.innerHTML='';
    if(p.avatarImg){
      const img=document.createElement('img');
      img.src=p.avatarImg;
      img.style.cssText=`width:${size}px;height:${size}px;object-fit:cover;border-radius:${r}px;display:block`;
      img.onerror=()=>{el.style.background=p.avatarBg||'rgba(139,92,246,.15)';el.innerHTML=`<span style="font-size:${Math.round(size*.44)}px;font-weight:700;color:var(--accent)">${(p.name||'U')[0].toUpperCase()}</span>`;};
      el.style.background='transparent';
      el.appendChild(img);
    } else {
      el.style.background=p.avatarBg||'rgba(139,92,246,.15)';
      const span=document.createElement('span');
      const emoji=p.avatarEmoji;
      span.style.cssText=`font-size:${emoji?Math.round(size*.48):Math.round(size*.44)}px;line-height:1;font-weight:${emoji?'400':'700'};color:${emoji?'inherit':'var(--accent)'}`;
      span.textContent=emoji||(p.name||'U')[0].toUpperCase();
      el.appendChild(span);
    }
  }
  fillAv(document.getElementById('topbar-avatar'),24,5);
  const un=document.getElementById('topbar-username');
  if(un)un.textContent=p.name||'User';
  fillAv(document.getElementById('mob-topbar-avatar'),32,7);
  const mobNm=document.getElementById('mob-topbar-name');
  if(mobNm)mobNm.textContent=p.name||'User';
}
