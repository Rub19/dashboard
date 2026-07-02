/* ETHONE legacy compatibility module: foundation. */
// === GLOBAL CONSTANTS (must be first) ===
var WORKER_URL='https://raspy-fog-bf5b.rub19-mailpro.workers.dev';
const LASTFM_KEY = '20a3130a6a13552131356a4dd2bf8071';

// ===================================================
//  SUPABASE INIT
// ===================================================



// ── LANGUAGE DROPDOWN ─────────────────────────────────────────
var LANG_META={
  "fr": {"flag": '<img src="https://flagcdn.com/20x15/fr.png" width="20" height="15" alt="FR" style="border-radius:2px;display:inline-block;vertical-align:middle">', "name": "French", "native": "Français"},
  "en": {"flag": '<img src="https://flagcdn.com/20x15/gb.png" width="20" height="15" alt="EN" style="border-radius:2px;display:inline-block;vertical-align:middle">', "name": "English", "native": "English"},
  "es": {"flag": '<img src="https://flagcdn.com/20x15/es.png" width="20" height="15" alt="ES" style="border-radius:2px;display:inline-block;vertical-align:middle">', "name": "Spanish", "native": "Español"},
  "de": {"flag": '<img src="https://flagcdn.com/20x15/de.png" width="20" height="15" alt="DE" style="border-radius:2px;display:inline-block;vertical-align:middle">', "name": "German", "native": "Deutsch"}
};

function toggleLangDropdown(id){
  // Close all other dropdowns first
  document.querySelectorAll('.lang-dropdown.open').forEach(d=>{
    if(d.id!==id) d.classList.remove('open');
  });
  document.getElementById(id)?.classList.toggle('open');
}

// Close on outside click
document.addEventListener('click',e=>{
  if(!e.target.closest('.lang-dropdown')){
    document.querySelectorAll('.lang-dropdown.open').forEach(d=>d.classList.remove('open'));
  }
});

function setLangAndClose(lang, dropdownId){
  setLang(lang);
  document.getElementById(dropdownId)?.classList.remove('open');
  updateAllLangDropdowns();
}

function updateAllLangDropdowns(){
  if(!LANG_META||!_lang)return;
  const meta=LANG_META[_lang]||LANG_META['en']||{flag:'🇫🇷',name:'French'};
  document.querySelectorAll('.lang-dropdown').forEach(dd=>{
    const id=dd.id;
    const flag=document.getElementById(id+'-flag');
    if(flag) flag.innerHTML=meta.flag;
    // Update active state on options
    dd.querySelectorAll('.lang-option').forEach(opt=>{
      opt.classList.toggle('active', opt.dataset.lang===_lang);
    });
  });
}

function setLang(lang){
  _lang = lang;
  localStorage.setItem('nexus_lang', lang);
  applyI18n();
  updateAllLangDropdowns();
  if(typeof renderSidebarNav==='function') renderSidebarNav();
  const labels=[t('focus'),t('short_break'),t('long_break')];
  [0,1,2].forEach(i=>{
    const tab=document.getElementById('pomo-tab-'+i);
    if(tab) tab.textContent=labels[i];
  });
}

function applyI18n(){
  if(!I18N||!_lang)return;
  // Apply to all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    const attr = el.getAttribute('data-i18n-attr');
    if(attr) el.setAttribute(attr, t(key));
    else el.textContent = t(key);
  });
  // Update lang selector buttons
  document.querySelectorAll('.lang-btn').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.lang === _lang);
  });
  // Re-render dynamic parts that depend on language
  if(document.getElementById('greeting-time')) updateClock();
  const psTitle=document.getElementById('ps-title-el');
  if(psTitle){
    const w=t('whos_using');
    // Keep gradient span on last word
    const parts=w.split(' ');
    const last=parts.pop();
    psTitle.innerHTML=(parts.length?parts.join(' ')+' ':'')+`<span>${last}</span>`;
  }
  const psSub=document.getElementById('ps-sub-el');
  if(psSub) psSub.textContent=t('choose_profile');
  const psMgr=document.getElementById('ps-manage-btn');
  if(psMgr) psMgr.textContent=managingMode?t('done'):t('manage_profiles');
  const psSignout=document.querySelector('.ps-signout-btn');
  if(psSignout) psSignout.textContent=t('sign_out');
  // Auth form
  const tabLogin=document.getElementById('tab-login');
  if(tabLogin) tabLogin.textContent=t('sign_in');
  const tabReg=document.getElementById('tab-register');
  if(tabReg) tabReg.textContent=t('create_account');
  // Update sidebar user role text
  const srole=document.getElementById('sidebar-user-role');
  if(srole){const p=curP();srole.textContent=p?.state?.bio||'ETHONE';}
  // Update all dropdown triggers
  updateAllLangDropdowns();
}


var SUPABASE_URL='https://bvgifyzhpzkbrwdjrqsg.supabase.co';
var SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Z2lmeXpocHprYnJ3ZGpycXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODgzNjAsImV4cCI6MjA5NjE2NDM2MH0.PCm_g4w7ZrLqNilISt-Xnlw_CZrA8PY1Uvk9H_PUhCc';
var ADMIN_EMAIL='rub19.mailpro@gmail.com';
function createSupabaseOfflineClient(){
  const offlineError={message:'Supabase is unavailable. ETHONE is running in offline/local mode.'};
  function done(data){return Promise.resolve({data:data??null,error:offlineError});}
  function chain(){
    const api={
      select(){return api},eq(){return api},neq(){return api},order(){return api},limit(){return api},
      update(){return api},insert(){return api},delete(){return api},upsert(){return api},
      single(){return done(null)},maybeSingle(){return done(null)},
      then(resolve,reject){return done(null).then(resolve,reject)},
      catch(reject){return done(null).catch(reject)}
    };
    return api;
  }
  return {
    __offline:true,
    auth:{
      signInWithPassword(){return done(null)},
      signUp(){return done(null)},
      signOut(){return Promise.resolve({error:null})},
      getUser(){return Promise.resolve({data:{user:null},error:offlineError})},
      getSession(){return Promise.resolve({data:{session:null},error:offlineError})},
      updateUser(){return done(null)},
      resetPasswordForEmail(){return done(null)},
      signInWithOAuth(){return done(null)}
    },
    from(){return chain()}
  };
}
var sb=(window.supabase&&typeof window.supabase.createClient==='function')?window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON):createSupabaseOfflineClient();
window.sb=sb;
let _sbUser=null;
let _isAdmin=false;
let _ambientFrame=null;
let _bgFrame=null;
let _bgParticles=[];
let _lang=localStorage.getItem('nexus_lang')||'fr';
let _bioSaveTO=null;
let _socialSaveTO=null;
let _npProgressInterval=null;

function escapeHTML(value){
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}
function safeUrl(value){
  const url=String(value ?? '').trim();
  if(!url)return '';
  try{
    const u=new URL(url, window.location.href);
    return ['http:','https:','mailto:','tel:'].includes(u.protocol) ? u.href : '';
  }catch(e){return ''}
}
function safeThemeColor(value){
  const color=String(value ?? '').trim();
  return /^(accent|accent2|accent3|accent4|accent5)$/.test(color) ? `var(--${color})` : 'var(--accent)';
}
