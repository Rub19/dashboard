/* ETHONE legacy compatibility module: navigation. */
function switchPage(page,navEl){
  // Sauvegarder la quick note avant de changer de page
  const qn=document.getElementById('quick-note');
  const p0=curP();
  if(qn&&p0&&qn.value!==p0.state?.note){p0.state.note=qn.value;saveStateNow();}
  const activePage=document.getElementById('page-'+page);
  if(!activePage){
    console.warn('[ETHONE navigation] Unknown page:',page);
    return;
  }
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  activePage.classList.add('active');
  animatePageIn(activePage,page);
  document.querySelectorAll('.nav-item').forEach(el=>{
    el.classList.remove('active');
    el.setAttribute('aria-current','false');
  });
  if(navEl){
    navEl.classList.add('active');
    navEl.setAttribute('aria-current','page');
  }
  else document.querySelectorAll('.nav-item').forEach(el=>{
    if(el.dataset.page===page){
      el.classList.add('active');
      el.setAttribute('aria-current','page');
    }
  });
  setMobNav(page);
  // Close sidebar on mobile after navigation
  if(window.innerWidth<=768)closeMobileSidebar();
  const p=curP();if(!p)return;
  if(page==='files')renderItems();
  if(page==='todos')renderTodos();
  if(page==='notes'){initNotes();}
  if(page==='stats'){renderStatsPage();}
  if(page==='ai'){initAIChat();}
  if(page==='goals'){renderGoals();}
  if(page==='journal'){renderJournal();}
  if(page==='countdown'){renderCountdowns();}
  if(page==='github'){refreshGithub();}
  if(page==='valorant-accounts'){vaRender();}
  if(page==='databases'){if(typeof renderDatabasesHome==='function')renderDatabasesHome();}
  // Refresh widgets when back on dashboard
  if(page==='dashboard'){
    const wEl=document.getElementById('weather-widget');
    const qEl=document.getElementById('quote-widget');
    const weatherEmpty=!wEl||wEl.querySelector('.empty-icon');
    const quoteEmpty=!qEl||qEl.querySelector('.empty-icon');
    if(weatherEmpty)fetchWeather();
    if(quoteEmpty)fetchQuote();
  }
  if(page==='settings'){document.getElementById('settings-name').value=p.name;updateSettingsPreview();loadSecuritySettings();loadBannerSettings();renderBgThemeBtns();renderProfileXP(p);renderProfileQuickStats(p);}
  if(page==='connections'){loadConnectionsUI();renderWidgetManager();loadGroqKeyUI();}
  if(page==='gaming')loadGamingUI();
  if(page==='habits'){if(typeof renderHabits==='function')renderHabits();}
  if(page==='kanban'){if(typeof renderKanban==='function')renderKanban();}
  if(page==='calendar'){calYear=new Date().getFullYear();calMonth=new Date().getMonth();if(typeof renderCalendar==='function')renderCalendar();}
  try{window.dispatchEvent(new CustomEvent('ethone:page-ready',{detail:{page:page}}))}catch(e){}
}

function switchSettingsTab(tab,el){
  document.querySelectorAll('.settings-nav-item').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.settings-section').forEach(s=>s.classList.remove('active'));
  const sec=document.getElementById('settings-'+tab);
  if(sec)sec.classList.add('active');
  if(tab==='account')loadAccountInfo();
  if(tab==='theme'&&typeof renderThemeEditor==='function')renderThemeEditor();
  if(tab==='workspaces'&&typeof renderWorkspacesSettings==='function')renderWorkspacesSettings();
  if(tab==='widgets'&&typeof renderWidgetsSettings==='function')renderWidgetsSettings();
  if(tab==='plugins'&&typeof renderPluginsSettings==='function')renderPluginsSettings();
  if(tab==='brain'&&typeof renderBrainSettings==='function')renderBrainSettings();
  if(tab==='automation'&&typeof renderAutomationSettings==='function')renderAutomationSettings();
  if(tab==='marketplace'&&typeof renderMarketplaceSettings==='function')renderMarketplaceSettings();
  if(tab==='notifications'&&typeof renderNotificationsSettings==='function')renderNotificationsSettings();
  if(tab==='keyboard'&&typeof renderKeyboardSettings==='function')renderKeyboardSettings();
  if(tab==='developer'&&typeof renderDeveloperSettings==='function')renderDeveloperSettings();
  if(tab==='experimental'&&typeof renderExperimentalSettings==='function')renderExperimentalSettings();
}

async function loadAccountInfo(){
  if(!_sbUser){document.getElementById('account-info').textContent='Not signed in';return;}
  const {data}=await sb.from('profiles').select('username,email').eq('id',_sbUser.id).single();
  const info=document.getElementById('account-info');
  if(data){
    info.innerHTML=`Signed in as <strong>${data.username||'-'}</strong> . <span style="color:var(--muted)">${data.email||_sbUser.email||'-'}</span>`;
    document.getElementById('account-username').value=data.username||'';
    document.getElementById('account-email').value=data.email||_sbUser.email||'';
  }
}

async function updateUsername(){
  if(!_sbUser){toast('Not signed in','error');return;}
  const username=document.getElementById('account-username').value.trim();
  if(!username){toast('Entre un username','error');return;}
  // Check unicite
  const {data:existing}=await sb.from('profiles').select('id').eq('username',username).neq('id',_sbUser.id).single();
  if(existing){toast('Username already taken','error');return;}
  const {error}=await sb.from('profiles').update({username}).eq('id',_sbUser.id);
  if(error){toast('Error : '+error.message,'error');return;}
  toast('Username updated!','success');
  loadAccountInfo();
}

async function updateEmail(){
  if(!_sbUser){toast('Not signed in','error');return;}
  const email=document.getElementById('account-email').value.trim();
  if(!email||!email.includes('@')){toast('Invalid email','error');return;}
  const {error}=await sb.auth.updateUser({email});
  if(error){toast('Error : '+error.message,'error');return;}
  // Also update in profiles
  await sb.from('profiles').update({email}).eq('id',_sbUser.id);
  toast('Email updated!','success');
}

async function updatePassword(){
  if(!_sbUser){toast('Not signed in','error');return;}
  const pw=document.getElementById('account-password').value;
  if(!pw||pw.length<6){toast('Password too short (6 min)','error');return;}
  const {error}=await sb.auth.updateUser({password:pw});
  if(error){toast('Error : '+error.message,'error');return;}
  document.getElementById('account-password').value='';
  toast('Password updated!','success');
}
