/* ETHONE legacy compatibility module: profile-editor. */
// ===================================================
//  CREATE / EDIT PROFILE
// ===================================================
function toggleCreatePwSection(){
  const on=document.getElementById('create-pw-toggle').checked;
  document.getElementById('create-pw-section').style.display=on?'block':'none';
}
function toggleCreatePwType(){
  const t=document.getElementById('create-pw-type').value;
  document.getElementById('create-pw-pin-row').style.display=t==='pin'?'flex':'none';
  document.getElementById('create-pw-text-row').style.display=t==='text'?'block':'none';
}
function resetCreatePwFields(){
  document.getElementById('create-pw-toggle').checked=false;
  document.getElementById('create-pw-section').style.display='none';
  document.getElementById('create-pw-type').value='pin';
  document.getElementById('create-pw-pin-row').style.display='flex';
  document.getElementById('create-pw-text-row').style.display='none';
  ['create-pw-p1','create-pw-p2','create-pw-p3','create-pw-p4'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('create-pw-text').value='';
}

function openCreateProfile(){
  editingProfileId=null;selAvatarIdx=0;createUpload=null;
  document.getElementById('new-profile-name').value='';
  document.getElementById('create-upload-preview').style.display='none';
  document.getElementById('create-profile-title').textContent=' Create profile';
  document.getElementById('create-profile-btn').textContent='Create';
  resetCreatePwFields();
  renderAvatarGrid('create-avatar-grid',selAvatarIdx);
  openModal('create-profile');
}

function openEditProfile(id){
  const p=getP(id);if(!p)return;
  editingProfileId=id;
  document.getElementById('new-profile-name').value=p.name;
  selAvatarIdx=p.avatarIdx||0;createUpload=p.avatarImg||null;
  if(createUpload){
    const safeUpload=profileSafeImageSrc(createUpload);
    document.getElementById('create-upload-preview').style.display=safeUpload?'flex':'none';
    if(safeUpload)document.getElementById('create-upload-img').src=safeUpload;
  }
  else{document.getElementById('create-upload-preview').style.display='none'}
  document.getElementById('create-profile-title').textContent=' Edit profile';
  document.getElementById('create-profile-btn').textContent='Save';
  renderAvatarGrid('create-avatar-grid',selAvatarIdx);
  openModal('create-profile');
}

function cancelCreateProfile(){editingProfileId=null;closeModal('create-profile')}

async function submitCreateProfile(){
  const name=document.getElementById('new-profile-name').value.trim();
  if(!name){toast('Enter a name','error');return}
  const av=AVATARS[selAvatarIdx]||AVATARS[0];
  const emoji=createUpload?null:av.e;
  const bg=createUpload?'#1e1e24':av.b;
  // read password if set
  let pwObj=null;
  if(document.getElementById('create-pw-toggle').checked){
    const type=document.getElementById('create-pw-type').value;
    if(type==='pin'){
      const pins=['create-pw-p1','create-pw-p2','create-pw-p3','create-pw-p4'].map(id=>document.getElementById(id).value);
      if(pins.some(v=>!/^\d$/.test(v))){toast('Enter a valid 4-digit PIN','error');return}
      pwObj=window.ETHONESecurity&&ETHONESecurity.createProfileLock
        ? await ETHONESecurity.createProfileLock('pin',pins.join(''))
        : {type:'pin',value:pins.join('')};
    } else {
      const val=document.getElementById('create-pw-text').value;
      if(!val){toast('Enter a password','error');return}
      pwObj=window.ETHONESecurity&&ETHONESecurity.createProfileLock
        ? await ETHONESecurity.createProfileLock('text',val)
        : {type:'text',value:val};
    }
  }
  if(editingProfileId){
    const p=getP(editingProfileId);
    if(p){p.name=name;p.avatarEmoji=emoji;p.avatarBg=bg;p.avatarImg=createUpload||null;p.avatarIdx=selAvatarIdx;if(pwObj!==null)p.password=pwObj;saveStateNow()}
    toast(uiLang==='fr'?'Profil mis à jour !':'Profile updated!','success');
  } else {
    const p={id:Date.now(),name,avatarEmoji:emoji,avatarBg:bg,avatarImg:createUpload||null,avatarIdx:selAvatarIdx,state:defState(name)};
    if(pwObj)p.password=pwObj;
    profiles.push(p);saveStateNow();
    toast(name+' created!'+(pwObj?' ':''),'success');
  }
  editingProfileId=null;closeModal('create-profile');createUpload=null;resetCreatePwFields();renderProfileScreen();
}

async function deleteProfile(id){
  if(profiles.length<=1){toast("Impossible de supprimer le dernier profil",'error');return;}
  const _pname=profiles.find(p=>p.id===id)?.name||'ce profil';
  if(!confirm(`Supprimer le profil "${_pname}" ? Cette action est irréversible.`))return;
  if(!confirm('Delete this profile and all its data? This cannot be undone.'))return;
  const toDelete=profiles.find(p=>p.id===id);
  profiles=profiles.filter(p=>p.id!==id);
  // Save locally first
  try{
    localStorage.setItem('myspace_profiles_backup',JSON.stringify(sanitizeProfilesForPersistence(profiles)));
    localStorage.setItem('myspace_profiles_backup_owner',(_sbUser&&_sbUser.id)||'');
  }catch(e){}
  // Delete from Supabase DB if it has a db record
  if(toDelete?._dbId&&_sbUser){
    try{
      await sb.from('dashboard_data').delete().eq('id',toDelete._dbId);
    }catch(e){console.warn('Cloud delete error:',e);}
  }
  // Also re-save remaining profiles to ensure cloud is in sync
  await saveCloudState();
  renderProfileScreen();
  toast(uiLang==='fr'?'Profil supprimé':'Profile deleted','info');
}

function renderAvatarGrid(containerId,selIdx){
  const g=document.getElementById(containerId);if(!g)return;
  g.innerHTML=AVATARS.map((av,i)=>'<div class="avatar-opt'+(i===selIdx?' selected':'')+'" style="background:'+av.b+'" onclick="pickAvatar('+i+',\''+containerId+'\')">'+av.e+'</div>').join('');
}

function pickAvatar(idx,containerId){
  if(containerId==='create-avatar-grid'){selAvatarIdx=idx;createUpload=null;document.getElementById('create-upload-preview').style.display='none'}
  else{editSelAvatarIdx=idx;editUpload=null;document.getElementById('edit-upload-preview').style.display='none'}
  renderAvatarGrid(containerId,idx);
}

function handleAvatarUpload(ctx){
  const inp=document.getElementById(ctx+'-avatar-upload');
  const file=inp.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=e=>{
    const d=e.target.result;
    if(ctx==='create'){createUpload=d;document.getElementById('create-upload-img').src=d;document.getElementById('create-upload-preview').style.display='flex';document.querySelectorAll('#create-avatar-grid .avatar-opt').forEach(el=>el.classList.remove('selected'))}
    else{editUpload=d;document.getElementById('edit-upload-img').src=d;document.getElementById('edit-upload-preview').style.display='flex';document.querySelectorAll('#edit-avatar-grid .avatar-opt').forEach(el=>el.classList.remove('selected'))}
  };r.readAsDataURL(file);
}

function clearUpload(ctx){
  if(ctx==='create'){createUpload=null;document.getElementById('create-upload-preview').style.display='none';document.getElementById('create-avatar-upload').value='';renderAvatarGrid('create-avatar-grid',selAvatarIdx)}
  else{editUpload=null;document.getElementById('edit-upload-preview').style.display='none';document.getElementById('edit-avatar-upload').value='';renderAvatarGrid('edit-avatar-grid',editSelAvatarIdx)}
}

function openEditAvatarModal(){
  const p=curP();if(!p)return;
  editSelAvatarIdx=p.avatarIdx||0;editUpload=null;
  document.getElementById('edit-upload-preview').style.display='none';
  renderAvatarGrid('edit-avatar-grid',editSelAvatarIdx);
  openModal('edit-avatar');
}

function saveEditAvatar(){
  const p=curP();if(!p)return;
  if(editUpload){p.avatarImg=editUpload;p.avatarEmoji=null;p.avatarBg='#1e1e24'}
  else{const av=AVATARS[editSelAvatarIdx]||AVATARS[0];p.avatarEmoji=av.e;p.avatarBg=av.b;p.avatarImg=null;p.avatarIdx=editSelAvatarIdx}
  saveStateNow();closeModal('edit-avatar');updateSidebarAvatar();updateSettingsPreview();toast(uiLang==='fr'?'Avatar mis à jour !':'Avatar updated!','success');
}
