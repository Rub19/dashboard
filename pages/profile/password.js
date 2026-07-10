/* ETHONE legacy compatibility module: profile-password. */
// ===================================================
//  PASSWORD SCREEN
// ===================================================
function showPasswordScreen(id){
  setEthoneMode('password');
  pendingPasswordId=id;pinEntry='';
  const p=getP(id);if(!p)return;
  if(typeof ethoneSetSurfaceVisible==='function'){
    ethoneSetSurfaceVisible('auth-screen','none');
    ethoneSetSurfaceVisible('app-shell','none');
    ethoneSetSurfaceVisible('profile-screen','none');
    ethoneSetSurfaceVisible('password-screen','flex');
  }else{
    const appShell=document.getElementById('app-shell');
    if(appShell){appShell.style.display='none';appShell.style.visibility='hidden';appShell.setAttribute('inert','');}
    document.getElementById('profile-screen').style.display='none';
    document.getElementById('password-screen').style.display='flex';
  }

  // avatar
  const avEl=document.getElementById('pw-avatar');
  avEl.style.background=p.avatarBg||'#1e1e24';
  avEl.innerHTML=avatarHTML(p,80,18);

  document.getElementById('pw-name').textContent=p.name;
  const isPIN=p.password.type==='pin';
  document.getElementById('pw-sub').textContent=isPIN?'Enter your PIN to continue':'Enter your password to continue';
  document.getElementById('pw-pin-section').style.display=isPIN?'flex':'none';
  document.getElementById('pw-pin-section').style.flexDirection='column';
  document.getElementById('pw-pin-section').style.alignItems='center';
  document.getElementById('pw-text-section').style.display=isPIN?'none':'block';
  document.getElementById('pw-error').textContent='';
  document.getElementById('pw-text-error').textContent='';
  if(document.getElementById('pw-text-input')) document.getElementById('pw-text-input').value='';

  if(isPIN){
    renderPinDots();
    renderNumpad();
  } else {
    setTimeout(()=>document.getElementById('pw-text-input').focus(),100);
  }
}

function renderPinDots(){
  const d=document.getElementById('pw-dots');
  d.innerHTML='';
  for(let i=0;i<4;i++){
    const dot=document.createElement('div');
    dot.className='pw-pin-dot'+(i<pinEntry.length?' filled':'');
    d.appendChild(dot);
  }
}

function renderNumpad(){
  const nb=document.getElementById('pw-numpad');
  nb.innerHTML='';
  const keys=['1','2','3','4','5','6','7','8','9','','0',''];
  keys.forEach(k=>{
    const btn=document.createElement('button');
    btn.className='pw-num';
    btn.textContent=k;
    if(!k)btn.style.visibility='hidden';
    btn.onclick=()=>pinPress(k);
    nb.appendChild(btn);
  });
}

function pinPress(k){
  if(k===''){pinEntry=pinEntry.slice(0,-1);renderPinDots();document.getElementById('pw-error').textContent='';return}
  if(pinEntry.length>=4)return;
  pinEntry+=k;
  renderPinDots();
  if(pinEntry.length===4){
    setTimeout(()=>checkPinPassword(),150);
  }
}

async function checkPinPassword(){
  const p=getP(pendingPasswordId);if(!p)return;
  const verified=window.ETHONESecurity&&ETHONESecurity.verifyProfileLock
    ? await ETHONESecurity.verifyProfileLock(p.password,pinEntry)
    : {ok:pinEntry===p.password.value};
  if(verified.ok){
    if(verified.migrated){p.password=verified.migrated;saveStateNow();}
    document.getElementById('password-screen').style.display='none';
    enterDashboard(pendingPasswordId);
  } else {
    document.getElementById('pw-error').textContent='Incorrect PIN. Try again.';
    document.querySelectorAll('.pw-pin-dot').forEach(d=>d.classList.add('error'));
    setTimeout(()=>{pinEntry='';renderPinDots();},700);
  }
}

async function checkTextPassword(){
  const p=getP(pendingPasswordId);if(!p)return;
  const val=document.getElementById('pw-text-input').value;
  const verified=window.ETHONESecurity&&ETHONESecurity.verifyProfileLock
    ? await ETHONESecurity.verifyProfileLock(p.password,val)
    : {ok:val===p.password.value};
  if(verified.ok){
    if(verified.migrated){p.password=verified.migrated;saveStateNow();}
    document.getElementById('password-screen').style.display='none';
    enterDashboard(pendingPasswordId);
  } else {
    document.getElementById('pw-text-error').textContent='Incorrect password. Try again.';
    document.getElementById('pw-text-input').value='';
  }
}

function cancelPasswordScreen(){
  document.getElementById('password-screen').style.display='none';
  pendingPasswordId=null;pinEntry='';
  goToProfileScreen();
}
