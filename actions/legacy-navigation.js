/* ETHONE legacy compatibility module: navigation. */
function switchPage(page,navEl){
  if(page==='timeline')page='activity';
  const safeInvoke=(label,fn)=>{
    try{return fn();}
    catch(error){
      console.warn('[ETHONE navigation] '+label+' failed:',error);
      if(typeof toast==='function')toast('Une section a ete chargee en mode degrade.','warning');
      return null;
    }
  };
  // Sauvegarder la quick note avant de changer de page
  const qn=document.getElementById('quick-note');
  const p0=curP();
  if(qn&&p0&&qn.value!==p0.state?.note)safeInvoke('save quick note',()=>{p0.state.note=qn.value;saveStateNow();});
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
  if(window.innerWidth<=768&&typeof closeMobileSidebar==='function')safeInvoke('close mobile sidebar',()=>closeMobileSidebar());
  const p=curP();if(!p)return;
  if(page==='files'&&typeof renderItems==='function')safeInvoke('files render',()=>renderItems());
  if(page==='todos'&&typeof renderTodos==='function')safeInvoke('todos render',()=>renderTodos());
  if(page==='notes'&&typeof initNotes==='function')safeInvoke('notes init',()=>initNotes());
  if(page==='stats'&&typeof renderStatsPage==='function')safeInvoke('stats render',()=>renderStatsPage());
  if(page==='ai'&&typeof initAIChat==='function')safeInvoke('ai init',()=>initAIChat());
  if(page==='goals'&&typeof renderGoals==='function')safeInvoke('goals render',()=>renderGoals());
  if(page==='journal'&&typeof renderJournal==='function')safeInvoke('journal render',()=>renderJournal());
  if(page==='countdown'&&typeof renderCountdowns==='function')safeInvoke('countdown render',()=>renderCountdowns());
  if(page==='github'&&typeof refreshGithub==='function')safeInvoke('github refresh',()=>refreshGithub());
  if(page==='activity'&&typeof renderActivityPage==='function')safeInvoke('activity render',()=>renderActivityPage());
  if(page==='health'&&typeof renderHealthPage==='function')safeInvoke('health render',()=>renderHealthPage());
  if(page==='versions'&&typeof renderVersionHistoryPage==='function')safeInvoke('versions render',()=>renderVersionHistoryPage());
  if(page==='marketplace'&&typeof renderMarketplacePage==='function')safeInvoke('marketplace render',()=>renderMarketplacePage());
  if(page==='studio'&&typeof renderStudioPage==='function')safeInvoke('studio render',()=>renderStudioPage());
  if(page==='import'&&typeof renderImportAssistant==='function')safeInvoke('import render',()=>renderImportAssistant());
  if(page==='valorant-accounts'&&typeof vaRender==='function')safeInvoke('valorant accounts render',()=>vaRender());
  if(page==='databases'&&typeof renderDatabasesHome==='function')safeInvoke('databases render',()=>renderDatabasesHome());
  // Refresh widgets when back on dashboard
  if(page==='dashboard'){
    const wEl=document.getElementById('weather-widget');
    const qEl=document.getElementById('quote-widget');
    const weatherEmpty=!wEl||wEl.querySelector('.empty-icon');
    const quoteEmpty=!qEl||qEl.querySelector('.empty-icon');
    if(weatherEmpty&&typeof fetchWeather==='function')safeInvoke('weather refresh',()=>fetchWeather());
    if(quoteEmpty&&typeof fetchQuote==='function')safeInvoke('quote refresh',()=>fetchQuote());
  }
  if(page==='settings')safeInvoke('settings init',()=>{
    const nameInput=document.getElementById('settings-name');
    if(nameInput)nameInput.value=p.name||'';
    if(typeof updateSettingsPreview==='function')updateSettingsPreview();
    if(typeof loadSecuritySettings==='function')loadSecuritySettings();
    if(typeof loadBannerSettings==='function')loadBannerSettings();
    if(typeof renderBgThemeBtns==='function')renderBgThemeBtns();
    if(typeof renderProfileXP==='function')renderProfileXP(p);
    if(typeof renderProfileQuickStats==='function')renderProfileQuickStats(p);
  });
  if(page==='connections')safeInvoke('connections init',()=>{
    if(typeof loadConnectionsUI==='function')loadConnectionsUI();
    if(typeof renderWidgetManager==='function')renderWidgetManager();
    if(typeof loadGroqKeyUI==='function')loadGroqKeyUI();
  });
  if(page==='gaming'&&typeof loadGamingUI==='function')safeInvoke('gaming init',()=>loadGamingUI());
  if(page==='habits'&&typeof renderHabits==='function')safeInvoke('habits render',()=>renderHabits());
  if(page==='kanban'&&typeof renderKanban==='function')safeInvoke('kanban render',()=>renderKanban());
  if(page==='calendar')safeInvoke('calendar render',()=>{
    window.calYear=new Date().getFullYear();
    window.calMonth=new Date().getMonth();
    if(typeof renderCalendar==='function')renderCalendar();
  });
  try{window.dispatchEvent(new CustomEvent('ethone:page-ready',{detail:{page:page}}))}catch(e){}
}

(function installSwitchPageHookApi(){
  if(window.__ethoneSwitchPageHookApi)return;
  window.__ethoneSwitchPageHookApi=true;
  window.__ethoneSwitchPageHooks=[];
  window.ethoneAddSwitchPageHook=function(name,handler){
    if(!name||typeof handler!=='function')return false;
    if(window.__ethoneSwitchPageHooks.some(h=>h.name===name))return true;
    window.__ethoneSwitchPageHooks.push({name:name,handler:handler});
    return true;
  };
  var baseSwitchPage=window.switchPage||switchPage;
  if(baseSwitchPage.__ethoneHookDispatcher)return;
  window.switchPage=function(page,navEl){
    var result=baseSwitchPage.apply(this,arguments);
    var hooks=window.__ethoneSwitchPageHooks||[];
    hooks.slice().forEach(function(hook){
      try{hook.handler(page,navEl,result)}catch(e){console.warn('[ETHONE navigation hook] '+hook.name+' failed',e)}
    });
    return result;
  };
  window.switchPage.__ethoneHookDispatcher=true;
})();

function switchSettingsTab(tab,el){
  document.querySelectorAll('.settings-nav-item').forEach(t=>t.classList.remove('active'));
  if(!el)el=document.querySelector(".settings-nav-item[data-settings-tab='"+tab+"'],.settings-nav-item[onclick*=\"'"+tab+"'\"]");
  if(el)el.classList.add('active');
  document.querySelectorAll('.settings-section').forEach(s=>s.classList.remove('active'));
  const sec=document.getElementById('settings-'+tab);
  if(sec)sec.classList.add('active');
  const safeSettings=(label,fn)=>{try{return fn()}catch(error){console.warn('[ETHONE settings] '+label+' failed:',error);if(typeof toast==='function')toast('Parametre charge en mode degrade.','warning')}};
  if(tab==='account'&&typeof loadAccountInfo==='function')safeSettings('account',()=>loadAccountInfo());
  if(tab==='theme'&&typeof renderThemeEditor==='function')safeSettings('theme',()=>renderThemeEditor());
  if(tab==='workspaces'&&typeof renderWorkspacesSettings==='function')safeSettings('workspaces',()=>renderWorkspacesSettings());
  if(tab==='widgets'&&typeof renderWidgetsSettings==='function')safeSettings('widgets',()=>renderWidgetsSettings());
  if(tab==='plugins'&&typeof renderPluginsSettings==='function')safeSettings('plugins',()=>renderPluginsSettings());
  if(tab==='brain'&&typeof renderBrainSettings==='function')safeSettings('brain',()=>renderBrainSettings());
  if(tab==='automation'&&typeof renderAutomationSettings==='function')safeSettings('automation',()=>renderAutomationSettings());
  if(tab==='marketplace'&&typeof renderMarketplaceSettings==='function')safeSettings('marketplace',()=>renderMarketplaceSettings());
  if(tab==='notifications'&&typeof renderNotificationsSettings==='function')safeSettings('notifications',()=>renderNotificationsSettings());
  if(tab==='keyboard'&&typeof renderKeyboardSettings==='function')safeSettings('keyboard',()=>renderKeyboardSettings());
  if(tab==='developer'&&typeof renderDeveloperSettings==='function')safeSettings('developer',()=>renderDeveloperSettings());
  if(tab==='experimental'&&typeof renderExperimentalSettings==='function')safeSettings('experimental',()=>renderExperimentalSettings());
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
