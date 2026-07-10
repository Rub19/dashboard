/* ETHONE legacy compatibility module: profile-state. */
// ===================================================
//  CONSTANTS & STATE
// ===================================================
const AVATARS=[
  {e:'🐱',b:'#2a1f3d'},{e:'🦊',b:'#2d1a0e'},{e:'🐼',b:'#1a2a1a'},
  {e:'🐸',b:'#0e2a1a'},{e:'🦁',b:'#2d2000'},{e:'🐺',b:'#1a1a2a'},
  {e:'🐧',b:'#0a1a2d'},{e:'🦋',b:'#2d0a2d'},{e:'🐉',b:'#2a0a0a'},
  {e:'🦄',b:'#2a0a2a'},{e:'🤖',b:'#0a2a2a'},{e:'👾',b:'#1a0a2d'},
  {e:'🎭',b:'#2d1a00'},{e:'🌙',b:'#0a0a2d'},{e:'⚡',b:'#2d2500'},
];

let profiles=[], currentId=null, managingMode=false;
let selAvatarIdx=0, editSelAvatarIdx=0;
let createUpload=null, editUpload=null;
let editingProfileId=null;
let pendingPasswordId=null; // profile waiting for password check
let pinEntry='';

// ===================================================
//  PERSISTENCE
// ===================================================
function profileEscapeHTML(value){
  if(window.ETHONESecurity&&ETHONESecurity.escapeHTML)return ETHONESecurity.escapeHTML(value);
  return String(value==null?'':value).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function profileSafeImageSrc(value){
  if(window.ETHONESecurity&&ETHONESecurity.safeImageSrc)return ETHONESecurity.safeImageSrc(value);
  value=String(value||'').trim();
  return /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(value)||/^https?:\/\//i.test(value)?value:'';
}
function sanitizeProfilesForPersistence(list){
  if(window.ETHONESecurity&&ETHONESecurity.sanitizeProfilesForPersistence)return ETHONESecurity.sanitizeProfilesForPersistence(list);
  return Array.isArray(list)?list.map(p=>JSON.parse(JSON.stringify(p||{}))):[];
}
function upgradeLoadedProfileLocks(list){
  if(!window.ETHONESecurity||!ETHONESecurity.createProfileLock||!Array.isArray(list))return;
  var changed=false;
  var jobs=list.map(function(p){
    if(!p||!p.password||!Object.prototype.hasOwnProperty.call(p.password,'value'))return Promise.resolve();
    var legacy=p.password;
    return ETHONESecurity.createProfileLock(legacy.type,legacy.value).then(function(lock){
      p.password=lock;
      changed=true;
    }).catch(function(){});
  });
  Promise.all(jobs).then(function(){
    if(changed)saveStateNow();
  }).catch(function(){});
}
function loadState(){try{const d=localStorage.getItem('myspace_profiles_backup');if(d){profiles=JSON.parse(d);upgradeLoadedProfileLocks(profiles)}}catch(e){}}
let _saveCloudTimeout=null;
function emitSaveStateEvent(name,detail){
  try{window.dispatchEvent(new CustomEvent(name,{detail:detail||{}}));}catch(e){}
}
function saveStateNow(){
  const startedAt=Date.now();
  emitSaveStateEvent('ethone:save-start',{source:'profile',startedAt});
  let localOk=true;
  let localError=null;
  try{
    localStorage.setItem('myspace_profiles_backup',JSON.stringify(sanitizeProfilesForPersistence(profiles)));
    localStorage.setItem('myspace_profiles_backup_owner',(_sbUser&&_sbUser.id)||'');
  }catch(e){localOk=false;localError=e}
  if(localOk){
    emitSaveStateEvent('ethone:save-complete',{source:'profile',startedAt,duration:Date.now()-startedAt,cloud:!!_sbUser});
  }else{
    emitSaveStateEvent('ethone:save-error',{source:'profile',startedAt,error:localError});
  }
  if(_sbUser){
    clearTimeout(_saveCloudTimeout);
    _saveCloudTimeout=setTimeout(()=>{
      emitSaveStateEvent('ethone:cloud-save-start',{source:'profile'});
      saveCloudState().then(()=>{
        emitSaveStateEvent('ethone:cloud-save-complete',{source:'profile'});
      }).catch(e=>{
        emitSaveStateEvent('ethone:cloud-save-error',{source:'profile',error:e});
        console.warn('Cloud sync error:',e);
      });
    },2000);
  }
}
function getP(id){return profiles.find(p=>String(p.id)===String(id))}
function curP(){return getP(currentId)}
function defState(name){return{items:[],todos:[],note:'',notes:[],activity:[],username:name||'User',connections:{},gaming:{},habits:[],kanban:[],events:[],pinned:[],manualBadges:{},banner:null,countdown:null,pomoHistory:[],notifEnabled:false,notifPrefs:{tasks:true,habits:true,events:true,ai:true,system:true,quietStart:'',quietEnd:''},bio:'',socials:{},goals:[],journal:[],countdowns:[],xp:0,dailyFocus:null,valorantAccounts:[],valorantAccountsView:{columnOrder:null,columnWidths:{},hiddenColumns:[],pinnedColumns:[],activeFilterView:'all',sort:[],groupBy:null,knownTags:[],customColumns:[],dropdownDefs:{},lockedColumns:[],columnLabels:{}},databases:[],databasesView:{lastOpenedId:null,order:null,favorites:[]},automationRules:[]}}

// ===================================================
//  AVATAR HELPERS
// ===================================================
function avatarHTML(p,size,r){
  const imgSrc=profileSafeImageSrc(p.avatarImg);
  if(imgSrc){
    // Use simple block img — container must be overflow:hidden + fixed size
    return `<img src="${profileEscapeHTML(imgSrc)}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:${r}px;display:block;flex-shrink:0" onerror="this.remove()">`;
  }
  const emoji=p.avatarEmoji||null;
  const initial=(p.name||'U')[0].toUpperCase();
  const fs=emoji?Math.round(size*.48):Math.round(size*.44);
  const content=profileEscapeHTML(emoji||initial);
  const color=emoji?'inherit':'var(--accent)';
  const fw=emoji?'400':'700';
  return `<span style="font-size:${fs}px;line-height:1;font-weight:${fw};color:${color}">${content}</span>`;
}

// ===================================================
//  PROFILE SCREEN
// ===================================================
// ===================================================
//  PROFILE SCREEN — Tilt + Spotlight + Embers
// ===================================================
function psTilt(e,el){
  const card=el.querySelector('.ps-card-inner');if(!card)return;
  const r=el.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width;
  const y=(e.clientY-r.top)/r.height;
  const tiltX=(y-.5)*14;
  const tiltY=-((x-.5)*14);
  el.style.transform=`perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.04)`;
  // spotlight on card-inner
  const cx=((e.clientX-r.left)/r.width*100).toFixed(1)+'%';
  const cy=((e.clientY-r.top)/r.height*100).toFixed(1)+'%';
  card.style.setProperty('--mx',cx);card.style.setProperty('--my',cy);
}
function psUntilt(el){
  el.style.transform='perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)';
}

let _psEmbersRunning=false;
let _psEmbersCleanup=null;
function psStopEmbers(){
  if(_psEmbersCleanup){
    try{_psEmbersCleanup();}catch(e){}
    _psEmbersCleanup=null;
  }
  _psEmbersRunning=false;
}
function psStartEmbers(){
  if(window.ETHONE_LIGHT_BOOT_MODE||window.__ethoneLeanProductionBoot)return;
  if(_psEmbersRunning)return;
  const canvas=document.getElementById('ps-canvas');
  if(!canvas)return;
  _psEmbersRunning=true;
  const ctx=canvas.getContext('2d');
  let W,H,particles=[];
  function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;}
  resize();window.addEventListener('resize',resize,{passive:true});
  _psEmbersCleanup=function(){window.removeEventListener('resize',resize);};
  const COLORS=['rgba(139,92,246,','rgba(239,68,68,','rgba(167,139,250,','rgba(124,58,237,'];
  function spawn(){
    return{
      x:Math.random()*W,y:H+10,
      vx:(Math.random()-.5)*.6,
      vy:-(Math.random()*1.2+.4),
      life:1,decay:Math.random()*.006+.003,
      r:Math.random()*2+1,
      color:COLORS[Math.floor(Math.random()*COLORS.length)]
    };
  }
  for(let i=0;i<60;i++){const p=spawn();p.y=Math.random()*H;p.life=Math.random();particles.push(p);}
  function frame(){
    if(!document.getElementById('ps-canvas'))return psStopEmbers();
    const screen=document.getElementById('profile-screen');
    if(!screen||screen.style.display==='none')return psStopEmbers();
    ctx.clearRect(0,0,W,H);
    if(Math.random()<.4)particles.push(spawn());
    particles=particles.filter(p=>p.life>0);
    for(const p of particles){
      p.x+=p.vx;p.y+=p.vy;p.life-=p.decay;
      ctx.save();
      ctx.globalAlpha=p.life*.7;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.color+'1)';
      ctx.fill();
      // glow
      ctx.beginPath();ctx.arc(p.x,p.y,p.r*2.5,0,Math.PI*2);
      ctx.fillStyle=p.color+'.12)';
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  frame();
}

function renderProfileScreen(){
  const list=document.getElementById('ps-profiles-list');
  let html='';
  profiles.forEach(p=>{
    const locked=p.password?'<div class="ps-lock">🔒 locked</div>':'';
    const safeId=profileEscapeHTML(String(p.id));
    const safeName=profileEscapeHTML(p.name);
    const safeAvatar=profileSafeImageSrc(p.avatarImg);
    html+='<div class="ps-profile'+(managingMode?' managing':'')+(p.password?' locked':'')+'" data-id="'+safeId+'" onclick="handleProfileClick(\''+safeId+'\')" onmousemove="psTilt(event,this)" onmouseleave="psUntilt(this)">'+
      '<div class="ps-card-inner">'+
        '<div class="ps-avatar-wrap">'+
          '<div class="ps-avatar" style="background:'+(safeAvatar?'var(--surface3)':(p.avatarBg||'var(--surface2)'))+'">'+
            (safeAvatar?`<img src="${profileEscapeHTML(safeAvatar)}" style="width:80px;height:80px;object-fit:cover;border-radius:18px;display:block" onerror="this.remove()">`:'')+
            (safeAvatar?'':avatarHTML(p,80,18))+
          '</div>'+
          locked+
        '</div>'+
        '<div class="ps-pname">'+safeName+'</div>'+
        '<button class="ps-edit-btn" onclick="event.stopPropagation();openEditProfile(\''+safeId+'\')" title="Edit">✎</button>'+
        (managingMode&&profiles.length>1?'<button class="ps-delete-btn" onclick="event.stopPropagation();deleteProfile(\''+safeId+'\')" title="Delete">✕</button>':'')+
      '</div>'+
    '</div>';
  });
  if(profiles.length<6){
    html+='<div class="ps-add-card" onclick="openCreateProfile()">'+
      '<div class="ps-add-icon">+</div>'+
      '<div class="ps-add-label">'+(typeof t==='function'?t('add_profile'):'Ajouter profil')+'</div>'+
    '</div>';
  }
  list.innerHTML=html;
  document.getElementById('ps-manage-btn').textContent=managingMode?t('done'):t('manage_profiles');
  // Start ember canvas if not running
  psStartEmbers();
}

function handleProfileClick(id){
  if(managingMode)return;
  const p=getP(id);if(!p)return;
  if(p.password){
    showPasswordScreen(id);
  } else {
    enterDashboard(id);
  }
}

function toggleManageMode(){managingMode=!managingMode;renderProfileScreen()}

function enterDashboard(id){
  normalizeAllProfiles(); setEthoneMode('dashboard');
  try{if(window.ETHONEBootSequence)window.ETHONEBootSequence.prepareDashboardMount();}catch(e){}
  currentId=id;
  // Reinit global caches for new profile
  _valoMatchCache={};
  _valoAllMatches=[];
  const screen=document.getElementById('profile-screen');
  screen.style.transition='opacity .18s ease';
  screen.style.opacity='0';
  setTimeout(()=>{
    screen.style.opacity=''; screen.style.transition='';
    if(typeof ethoneSetSurfaceVisible==='function'){
      ethoneSetSurfaceVisible('auth-screen','none');
      ethoneSetSurfaceVisible('profile-screen','none');
      ethoneSetSurfaceVisible('password-screen','none');
      ethoneSetSurfaceVisible('app-shell','css');
      ethoneSetSurfaceVisible('main-sidebar','flex');
      ethoneSetSurfaceVisible('main-content','block');
    }else{
      screen.style.display='none';
      const appShell=document.getElementById('app-shell');
      const sidebar=document.getElementById('main-sidebar');
      const content=document.getElementById('main-content');
      if(appShell){appShell.style.removeProperty('display');appShell.style.visibility='visible';appShell.style.opacity='1';appShell.removeAttribute('inert');}
      if(sidebar){sidebar.style.display='flex';sidebar.style.visibility='visible';sidebar.style.opacity='1';}
      if(content){content.style.display='block';content.style.visibility='visible';content.style.opacity='1';}
    }
    try{applyI18n();}catch(e){}
    try{initDashboard();}catch(error){console.error('[ETHONE boot] Dashboard init failed',error);}
    try{window.dispatchEvent(new Event('ethone:dashboard-ready'))}catch(e){}
    try{window.dispatchEvent(new CustomEvent('ethone:page-ready',{detail:{page:'dashboard'}}))}catch(e){}
    try{if(window.ETHONEBootSequence)window.ETHONEBootSequence.finishDashboardMount();}catch(e){}
    // Only start ambient bg if no custom bg theme is set
    if((!curP()?.bgTheme||curP()?.bgTheme==='none')&&typeof startAmbientBg==='function') setTimeout(startAmbientBg,300);
  },180);
}

function goToProfileScreen(){
  normalizeAllProfiles(); setEthoneMode('profile');
  // Nettoyer TOUS les intervals actifs
  if(typeof stopLanyardWS==='function')stopLanyardWS();
  else if(typeof _lanyardWS!=='undefined'&&_lanyardWS){_lanyardWS.onclose=null;_lanyardWS.close();clearInterval(_lanyardHB);_lanyardWS=null;}
  if(typeof stopLastfmAutoRefresh==='function')stopLastfmAutoRefresh();
  else if(typeof _lastfmInterval!=='undefined'){clearInterval(_lastfmInterval);_lastfmInterval=null;}
  if(typeof stopSpotifyAutoRefresh==='function')stopSpotifyAutoRefresh();
  if(typeof stopSpotifyPlaybackTimers==='function')stopSpotifyPlaybackTimers();
  if(typeof _npProgressInterval!=='undefined')clearInterval(window._npProgressInterval);window._npProgressInterval=null;
  _valoMatchCache={};
  _valoAllMatches=[];
  if(typeof stopAmbientBg==='function')stopAmbientBg();
  const s=document.getElementById('profile-screen');
  if(typeof ethoneSetSurfaceVisible==='function'){
    ethoneSetSurfaceVisible('auth-screen','none');
    ethoneSetSurfaceVisible('app-shell','none');
    ethoneSetSurfaceVisible('main-sidebar','none');
    ethoneSetSurfaceVisible('main-content','none');
    ethoneSetSurfaceVisible('password-screen','none');
    ethoneSetSurfaceVisible('profile-screen','flex');
  }else{
    const appShell=document.getElementById('app-shell');
    if(appShell){appShell.style.display='none';appShell.style.visibility='hidden';appShell.setAttribute('inert','');}
    document.getElementById('main-sidebar').style.display='none';
    document.getElementById('main-content').style.display='none';
    document.getElementById('password-screen').style.display='none';
    s.style.display='flex';s.style.visibility='visible';s.style.opacity='1';
  }
  s.classList.remove('hiding');
  s.style.animation='none';setTimeout(()=>s.style.animation='',10);
  managingMode=false;renderProfileScreen();
  if(typeof initPsCursorGlow==='function')setTimeout(initPsCursorGlow,100);
}
