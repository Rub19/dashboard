/* ETHONE legacy compatibility module: settings-profile. */
// ===================================================
//  SETTINGS / PROFILE
// ===================================================
function updateCurrentProfileName(){
  const p=curP();if(!p)return;
  const v=document.getElementById('settings-name').value.trim();
  p.name=v||'User';p.state.username=p.name;saveStateNow();
  document.getElementById('display-username').textContent=p.name;
  const bn=document.getElementById('profile-banner-name');if(bn)bn.textContent=p.name;
}
function resetProfileData(){
  if(!confirm('Reset ALL your data?'))return;
  const p=curP();if(!p)return;
  p.state=defState(p.name);saveStateNow();
  if(typeof renderItems==='function')renderItems();
  if(typeof renderTodos==='function')renderTodos();
  if(typeof renderActivity==='function')renderActivity();
  if(typeof renderRecentItems==='function')renderRecentItems();
  if(typeof updateStats==='function')updateStats();
  document.getElementById('main-note').value='';document.getElementById('quick-note').value='';
  toast('Data cleared','info');
}

// ===================================================
//  SECURITY / PASSWORD SETTINGS
// ===================================================
function loadSecuritySettings(){
  const p=curP();if(!p)return;
  const toggle=document.getElementById('pw-enable-toggle');
  const activeInfo=document.getElementById('pw-active-info');
  const setupSection=document.getElementById('pw-setup-section');
  if(p.password){
    toggle.checked=true;
    activeInfo.style.display='block';
    setupSection.style.display='none';
    document.getElementById('pw-active-type').textContent=p.password.type==='pin'?'PIN':'Password';
  } else {
    toggle.checked=false;
    activeInfo.style.display='none';
    setupSection.style.display='none';
  }
}

function togglePasswordSetup(){
  const checked=document.getElementById('pw-enable-toggle').checked;
  const p=curP();if(!p)return;
  if(!checked){removePassword();return}
  if(p.password){loadSecuritySettings();return}
  document.getElementById('pw-setup-section').style.display='block';
  document.getElementById('pw-active-info').style.display='none';
  renderPasswordSetup();
}

function renderPasswordSetup(){
  const type=document.getElementById('pw-type-select').value;
  document.getElementById('pw-pin-setup').style.display=type==='pin'?'block':'none';
  document.getElementById('pw-text-setup').style.display=type==='text'?'block':'none';
  document.getElementById('pw-remove-btn').style.display=curP()?.password?'inline-flex':'none';
}

function pinAutoFocus(el,nextId){
  if(el.value.length===1&&nextId){document.getElementById(nextId)?.focus()}
}

async function savePassword(){
  const p=curP();if(!p)return;
  const type=document.getElementById('pw-type-select').value;
  let value='';
  if(type==='pin'){
    const pins=['pw-pin-1','pw-pin-2','pw-pin-3','pw-pin-4'].map(id=>document.getElementById(id).value);
    if(pins.some(v=>!/^\d$/.test(v))){toast('Enter 4 digits','error');return}
    value=pins.join('');
  } else {
    value=document.getElementById('pw-text-setup-input').value;
    if(!value){toast('Enter a password','error');return}
  }
  p.password=window.ETHONESecurity&&ETHONESecurity.createProfileLock
    ? await ETHONESecurity.createProfileLock(type,value)
    : {type,value};
  saveStateNow();
  toast('Protection saved! ','success');
  loadSecuritySettings();
  renderProfileScreen();
}

function removePassword(){
  const p=curP();if(!p)return;
  if(!confirm('Remove password protection?'))return;
  delete p.password;
  saveStateNow();
  document.getElementById('pw-enable-toggle').checked=false;
  document.getElementById('pw-setup-section').style.display='none';
  document.getElementById('pw-active-info').style.display='none';
  toast('Protection removed','info');
  renderProfileScreen();
}
