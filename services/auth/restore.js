/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  'use strict';
  const AUTH_TEXT={
    fr:{welcome_back:'Bon retour',sign_in_sub:'Connectez-vous à votre dashboard ETHONE',sign_in:'Connexion',create_account:'Créer un compte',email_or_username:'Email ou identifiant',password:'Mot de passe',forgot_password:'Mot de passe oublié ?',remember_me:'Se souvenir de moi',sign_in_btn:'Se connecter',or_continue_with:'ou continuer avec',username:'Identifiant',email_optional:'Email (optionnel)',reg_user_ph:'Choisissez un identifiant',reg_email_ph:'vous@exemple.com',reg_pw_ph:'Min. 6 caractères',login_ph:'vous@exemple.com',pw_ph:'••••••••',reset_need_email:'Entre ton email d’abord',reset_sent:'✓ Email de réinitialisation envoyé.',reset_error:'Impossible d’envoyer l’email',fill_all:'Veuillez remplir tous les champs',wrong:'Identifiants incorrects',connect_error:'Erreur de connexion — réessayez',user_pw_required:'Identifiant et mot de passe requis',pw_short:'Mot de passe trop court (6 caractères min)',username_taken:'Cet identifiant est déjà pris',google_error:'Connexion Google impossible',github_error:'Connexion GitHub impossible'},
    en:{welcome_back:'Welcome back',sign_in_sub:'Sign in to your ETHONE dashboard',sign_in:'Sign in',create_account:'Create account',email_or_username:'Email or username',password:'Password',forgot_password:'Forgot password?',remember_me:'Remember me',sign_in_btn:'Sign in',or_continue_with:'or continue with',username:'Username',email_optional:'Email (optional)',reg_user_ph:'Choose a username',reg_email_ph:'you@example.com',reg_pw_ph:'Min. 6 characters',login_ph:'you@example.com',pw_ph:'••••••••',reset_need_email:'Enter your email address first',reset_sent:'✓ Reset email sent. Check your inbox.',reset_error:'Error sending reset email',fill_all:'Fill in all fields',wrong:'Wrong credentials',connect_error:'Connection error — please try again',user_pw_required:'Username and password required',pw_short:'Password too short (6 chars min)',username_taken:'Username already taken',google_error:'Google sign-in unavailable',github_error:'GitHub sign-in unavailable'},
    es:{welcome_back:'Bienvenido de nuevo',sign_in_sub:'Conéctate a tu dashboard ETHONE',sign_in:'Iniciar sesión',create_account:'Crear cuenta',email_or_username:'Email o usuario',password:'Contraseña',forgot_password:'¿Olvidaste la contraseña?',remember_me:'Recordarme',sign_in_btn:'Entrar',or_continue_with:'o continuar con',username:'Usuario',email_optional:'Email (opcional)',reg_user_ph:'Elige un usuario',reg_email_ph:'tu@ejemplo.com',reg_pw_ph:'Mín. 6 caracteres',login_ph:'tu@ejemplo.com',pw_ph:'••••••••',reset_need_email:'Introduce primero tu email',reset_sent:'✓ Email enviado.',reset_error:'Error al enviar el email',fill_all:'Completa todos los campos',wrong:'Credenciales incorrectas',connect_error:'Error de conexión — inténtalo de nuevo',user_pw_required:'Usuario y contraseña requeridos',pw_short:'Contraseña demasiado corta',username_taken:'Usuario ya usado',google_error:'Conexión Google imposible',github_error:'Conexión GitHub imposible'},
    de:{welcome_back:'Willkommen zurück',sign_in_sub:'Melde dich in deinem ETHONE Dashboard an',sign_in:'Anmelden',create_account:'Konto erstellen',email_or_username:'E-Mail oder Benutzername',password:'Passwort',forgot_password:'Passwort vergessen?',remember_me:'Angemeldet bleiben',sign_in_btn:'Anmelden',or_continue_with:'oder weiter mit',username:'Benutzername',email_optional:'E-Mail (optional)',reg_user_ph:'Benutzernamen wählen',reg_email_ph:'du@beispiel.com',reg_pw_ph:'Mind. 6 Zeichen',login_ph:'du@beispiel.com',pw_ph:'••••••••',reset_need_email:'Gib zuerst deine E-Mail ein',reset_sent:'✓ Reset-E-Mail gesendet.',reset_error:'Fehler beim Senden',fill_all:'Bitte alle Felder ausfüllen',wrong:'Falsche Zugangsdaten',connect_error:'Verbindungsfehler — bitte erneut versuchen',user_pw_required:'Benutzername und Passwort erforderlich',pw_short:'Passwort zu kurz',username_taken:'Benutzername bereits vergeben',google_error:'Google-Anmeldung nicht möglich',github_error:'GitHub-Anmeldung nicht möglich'}
  };
  function lang(){ return (window._lang || localStorage.getItem('nexus_lang') || localStorage.getItem('ethone_lang') || 'fr').slice(0,2); }
  function tr(k){ const l=lang(); return (AUTH_TEXT[l]&&AUTH_TEXT[l][k]) || AUTH_TEXT.fr[k] || k; }
  function setText(id,txt){ const el=document.getElementById(id); if(el) el.textContent=txt; }
  function setPh(id,txt){ const el=document.getElementById(id); if(el) el.setAttribute('placeholder',txt); }
  window.updateAuthLangBar=function(){
    const l=lang();
    document.querySelectorAll('#auth-lang-bar button').forEach(btn=>{
      const active=btn.dataset.l===l;
      btn.style.background=active?'rgba(124,58,237,.85)':'transparent';
      btn.style.color=active?'#fff':'rgba(255,255,255,.42)';
      btn.style.fontWeight=active?'700':'600';
    });
    setText('auth-form-title',tr('welcome_back'));
    setText('auth-form-sub',tr('sign_in_sub'));
    setText('tab-login',tr('sign_in'));
    setText('tab-register',tr('create_account'));
    setText('auth-or-text',tr('or_continue_with'));
    setPh('auth-login-id',tr('login_ph'));
    setPh('auth-login-pw',tr('pw_ph'));
    setPh('auth-reg-username',tr('reg_user_ph'));
    setPh('auth-reg-email',tr('reg_email_ph'));
    setPh('auth-reg-pw',tr('reg_pw_ph'));
    const labels=document.querySelectorAll('#form-login label, #form-register label');
    labels.forEach(lb=>{
      const key=lb.getAttribute('data-i18n');
      if(key && AUTH_TEXT[l]?.[key]) lb.textContent=AUTH_TEXT[l][key];
    });
    const forgot=document.querySelector('#form-login .lb-ghost'); if(forgot) forgot.textContent=tr('forgot_password');
    const remember=document.querySelector('label[for="auth-remember"], #auth-remember + span'); if(remember) remember.textContent=tr('remember_me');
    const loginBtn=document.getElementById('auth-login-btn'); if(loginBtn){ const svg=loginBtn.querySelector('svg')?.outerHTML||''; loginBtn.innerHTML=tr('sign_in_btn')+svg; }
  };
  const oldSetLang=window.setLang;
  window.setLang=function(l){
    try{ if(typeof oldSetLang==='function') oldSetLang(l); else { window._lang=l; localStorage.setItem('nexus_lang',l); } }catch(e){ window._lang=l; localStorage.setItem('nexus_lang',l); }
    try{ localStorage.setItem('ethone_lang',l); }catch(e){}
    setTimeout(window.updateAuthLangBar,0);
  };
  function setErr(msg, good){ const er=document.getElementById('auth-error'); if(!er)return; er.textContent=msg||''; er.style.display=msg?'block':'none'; er.style.color=good?'#22c55e':''; }
  window.setAuthLoading=function(v){ const ld=document.getElementById('auth-loading'); if(ld)ld.style.display=v?'block':'none'; if(v)setErr(''); };
  window.ethoneEyeIcon=function(off){ return off ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M2.5 2.5l15 15"/><path d="M8.6 8.6a2 2 0 0 0 2.8 2.8"/><path d="M7.1 4.4A8.9 8.9 0 0 1 10 4c5 0 8 6 8 6a13.4 13.4 0 0 1-2.1 2.9"/><path d="M5.1 5.9C3.2 7.2 2 10 2 10s3 6 8 6a8.8 8.8 0 0 0 4.1-1"/></svg>' : '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></svg>'; };
  window.togglePwVis=function(inputId,btn){
    const input=document.getElementById(inputId); if(!input)return;
    const show=input.type==='password'; input.type=show?'text':'password';
    if(btn){ btn.innerHTML=window.ethoneEyeIcon(show); btn.setAttribute('aria-label',show?'Masquer le mot de passe':'Afficher le mot de passe'); btn.setAttribute('title',show?'Masquer le mot de passe':'Afficher le mot de passe'); btn.classList.add('ethone-pw-eye'); }
  };
  window.switchAuthTab=function(tab){
    const loginForm=document.getElementById('form-login'), regForm=document.getElementById('form-register');
    const tabLogin=document.getElementById('tab-login'), tabReg=document.getElementById('tab-register');
    if(loginForm)loginForm.style.display=tab==='login'?'block':'none';
    if(regForm)regForm.style.display=tab==='register'?'block':'none';
    const base='flex:1;height:38px;border:none;border-radius:9px;font-size:13px;font-family:Inter,system-ui,sans-serif;cursor:pointer;transition:all .15s';
    if(tabLogin)tabLogin.style.cssText=base+(tab==='login'?';font-weight:600;background:#1c1c1f;color:rgba(250,250,249,.92);box-shadow:0 1px 4px rgba(0,0,0,.4)':' ;font-weight:500;background:transparent;color:rgba(250,250,249,.35)');
    if(tabReg)tabReg.style.cssText=base+(tab==='register'?';font-weight:600;background:#1c1c1f;color:rgba(250,250,249,.92);box-shadow:0 1px 4px rgba(0,0,0,.4)':' ;font-weight:500;background:transparent;color:rgba(250,250,249,.35)');
    setErr(''); window.updateAuthLangBar();
  };
  window.doForgotPassword=async function(){
    const id=document.getElementById('auth-login-id')?.value.trim();
    if(!id || !id.includes('@')){ setErr(tr('reset_need_email')); return; }
    window.setAuthLoading(true);
    try{ const {error}=await sb.auth.resetPasswordForEmail(id,{redirectTo:window.location.origin+window.location.pathname}); window.setAuthLoading(false); if(error)setErr(error.message); else setErr(tr('reset_sent'),true); }
    catch(e){ window.setAuthLoading(false); setErr(tr('reset_error')); console.error('[ETHONE] reset password:',e); }
  };
  async function oauth(provider){
    const isGoogle=provider==='google';
    if(!window.sb && typeof sb==='undefined'){ setErr(isGoogle?tr('google_error'):tr('github_error')); return; }
    window.setAuthLoading(true);
    try{
      const client=window.sb || sb;
      const {error}=await client.auth.signInWithOAuth({
        provider,
        options:{
          redirectTo:window.location.origin+window.location.pathname,
          scopes:isGoogle?'email profile':'read:user user:email'
        }
      });
      if(error){ window.setAuthLoading(false); setErr(error.message|| (isGoogle?tr('google_error'):tr('github_error'))); }
    }catch(e){ window.setAuthLoading(false); setErr(isGoogle?tr('google_error'):tr('github_error')); console.error('[ETHONE] OAuth '+provider,e); }
  }
  window.doGoogle=function(){ return oauth('google'); };
  window.doGithub=function(){ return oauth('github'); };
  // Replace initial eye icons and keep auth language bar synced after first paint

  window.ethoneRepairProfilesView=function(){
    try{
      var backup=localStorage.getItem('myspace_profiles_backup');
      if(backup){var parsed=JSON.parse(backup); if(Array.isArray(parsed)&&parsed.length){profiles=parsed;}}
      if(typeof normalizeAllProfiles==='function')normalizeAllProfiles();
      window.renderProfileScreen();
      return {profiles:getProfiles().map(function(p){return p.name;})};
    }catch(e){console.error('[ETHONE] profile repair failed',e); return null;}
  };
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('.lb-eye').forEach(btn=>{ btn.innerHTML=window.ethoneEyeIcon(false); btn.classList.add('ethone-pw-eye'); });
    window.updateAuthLangBar();
  });
  setTimeout(window.updateAuthLangBar,50);
})();
