/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.__ethoneAuthInteractivityEmergency)return;
  window.__ethoneAuthInteractivityEmergency=true;

  var AUTH=window.ETHONE_AUTH_TEXT||{};
  var REQUIRED=["#tab-login","#tab-register","#form-login","#form-register","#auth-login-btn","#btn-google","#btn-github","#auth-login-id","#auth-login-pw","#auth-remember","#auth-lang-bar"];
  function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function warn(msg,extra){try{console.warn("[ETHONE auth]",msg,extra||"")}catch(e){}}
  function lang(){return String(window._lang||localStorage.getItem("nexus_lang")||localStorage.getItem("ethone_lang")||document.documentElement.lang||"fr").slice(0,2).toLowerCase()}
  function tr(key){
    var l=lang();
    return (AUTH[l]&&AUTH[l][key])||(AUTH.fr&&AUTH.fr[key])||(AUTH.en&&AUTH.en[key])||key;
  }
  function visible(el){return !!(el&&getComputedStyle(el).display!=="none"&&getComputedStyle(el).visibility!=="hidden")}
  function debugMode(){return /(?:localhost|127\.0\.0\.1|file:)/.test(location.href)||/[?&](debugAuth|authDebug)=1\b/.test(location.search)}
  function debugBanner(message){
    if(!debugMode())return;
    var old=qs("#ethone-auth-debug-banner");
    if(old)old.remove();
    var div=document.createElement("div");
    div.id="ethone-auth-debug-banner";
    div.className="ethone-auth-debug-banner";
    div.textContent=message;
    document.body.appendChild(div);
  }
  function setErr(message,good){
    var er=qs("#auth-error");
    if(!er){warn("Missing #auth-error; cannot show auth message",message);return}
    er.textContent=message||"";
    er.style.display=message?"block":"none";
    er.style.color=good?"var(--success)":"";
  }
  function setLoading(value){
    var ld=qs("#auth-loading");
    if(ld)ld.style.display=value?"block":"none";
    if(value)setErr("");
  }
  function withTimeout(promise,ms,label){
    return Promise.race([promise,new Promise(function(_,reject){setTimeout(function(){reject(new Error((label||"Auth request")+" timed out"))},ms)})]);
  }
  function redirectUrl(){
    var path=location.pathname||"/";
    if(/\/404\.html$/i.test(path))path=path.replace(/\/404\.html$/i,"/index.html");
    return location.origin+path;
  }
  function ensureSupabase(){
    if(window.sb&&window.sb.auth&&!window.sb.__offline)return window.sb;
    try{
      if(window.supabase&&typeof window.supabase.createClient==="function"&&window.SUPABASE_URL&&window.SUPABASE_ANON){
        window.sb=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON);
        return window.sb;
      }
    }catch(e){warn("Supabase re-initialization failed",e)}
    return null;
  }
  function supabaseReady(){
    var client=ensureSupabase();
    if(!client||!client.auth||client.__offline){
      setErr(tr("supabase_offline")||"Supabase indisponible. Recharge la page.");
      return null;
    }
    return client;
  }
  function applyTranslations(){
    if(!AUTH.fr)AUTH.fr={};
    var fallback={
      welcome_back:"Bon retour",sign_in_sub:"Connectez-vous a votre dashboard ETHONE",sign_in:"Connexion",create_account:"Creer un compte",
      email_or_username:"Email ou identifiant",password:"Mot de passe",forgot_password:"Mot de passe oublie ?",remember_me:"Se souvenir de moi",
      sign_in_btn:"Se connecter",or_continue_with:"ou continuer avec",username:"Identifiant",email_optional:"Email (optionnel)",
      create_account_btn:"Creer un compte",login_ph:"vous@exemple.com",pw_ph:"Mot de passe",reg_user_ph:"Choisissez un identifiant",
      reg_email_ph:"vous@exemple.com",reg_pw_ph:"Min. 6 caracteres",fill_all:"Veuillez remplir tous les champs",
      user_pw_required:"Identifiant et mot de passe requis",pw_short:"Mot de passe trop court (6 caracteres min)",username_taken:"Cet identifiant est deja pris",
      wrong:"Identifiants incorrects",connect_error:"Erreur de connexion. Reessayez.",reset_need_email:"Entre ton email d'abord",
      reset_sent:"Email de reinitialisation envoye.",reset_error:"Impossible d'envoyer l'email",google_error:"Connexion Google impossible",
      github_error:"Connexion GitHub impossible",supabase_offline:"Supabase n'est pas disponible. Verifie la connexion puis recharge la page."
    };
    Object.keys(fallback).forEach(function(k){if(!AUTH.fr[k])AUTH.fr[k]=fallback[k]});
    qsa("#auth-screen [data-i18n]").forEach(function(el){
      var key=el.getAttribute("data-i18n");
      var attr=el.getAttribute("data-i18n-attr");
      var text=tr(key);
      if(!text||text===key)text=AUTH.fr[key]||key;
      if(attr)el.setAttribute(attr,text);else el.textContent=text;
    });
    var ph={ "#auth-login-id":"login_ph","#auth-login-pw":"pw_ph","#auth-reg-username":"reg_user_ph","#auth-reg-email":"reg_email_ph","#auth-reg-pw":"reg_pw_ph" };
    Object.keys(ph).forEach(function(sel){var el=qs(sel);if(el)el.setAttribute("placeholder",tr(ph[sel]))});
    var loginBtn=qs("#auth-login-btn");
    if(loginBtn){
      var svg=loginBtn.querySelector("svg")?loginBtn.querySelector("svg").outerHTML:"";
      loginBtn.innerHTML=tr("sign_in_btn")+svg;
    }
    var regBtn=qs("#form-register .lb-btn-primary");
    if(regBtn){
      var rsvg=regBtn.querySelector("svg")?regBtn.querySelector("svg").outerHTML:"";
      regBtn.innerHTML=tr("create_account_btn")+rsvg;
    }
    qsa("#auth-lang-bar button").forEach(function(btn){
      btn.type="button";
      var active=(btn.dataset.l||btn.getAttribute("data-l"))===lang();
      btn.style.background="transparent";
      btn.style.color=active?"var(--text-on-accent)":"rgba(var(--text-primary-rgb),.42)";
      btn.style.fontWeight=active?"700":"600";
    });
  }
  function switchTab(tab){
    var login=qs("#form-login"), reg=qs("#form-register"), tl=qs("#tab-login"), trb=qs("#tab-register");
    if(!login||!reg)warn("Missing auth form for tab switch",{login:!!login,register:!!reg});
    if(login)login.style.display=tab==="login"?"block":"none";
    if(reg)reg.style.display=tab==="register"?"block":"none";
    if(tl){
      tl.removeAttribute("style");
      tl.classList.toggle("is-active",tab==="login");
      tl.setAttribute("aria-selected",String(tab==="login"));
    }
    if(trb){
      trb.removeAttribute("style");
      trb.classList.toggle("is-active",tab==="register");
      trb.setAttribute("aria-selected",String(tab==="register"));
    }
    setErr("");
    applyTranslations();
    if(typeof window.ethoneSyncAuthHeroLanguage==="function")setTimeout(window.ethoneSyncAuthHeroLanguage,0);
    try{window.dispatchEvent(new CustomEvent("ethone:auth-tab-change",{detail:{tab:tab}}))}catch(e){}
  }
  function togglePassword(btn){
    var inputId="";
    var onclick=btn.getAttribute("onclick")||"";
    var match=onclick.match(/togglePwVis\(['"]([^'"]+)/);
    if(match)inputId=match[1];
    var input=inputId?qs("#"+CSS.escape(inputId)):btn.parentElement&&btn.parentElement.querySelector("input");
    if(!input){warn("Password visibility input not found",btn);return}
    var show=input.type==="password";
    input.type=show?"text":"password";
    btn.setAttribute("aria-pressed",String(show));
    btn.setAttribute("aria-label",show?"Masquer le mot de passe":"Afficher le mot de passe");
  }
  function updatePasswordStrength(value){
    var bar=qs("#pw-strength-bar");
    if(!bar)return;
    var pw=String(value||"");
    var score=0;
    if(pw.length>=6)score+=1;
    if(pw.length>=10)score+=1;
    if(/[A-Z]/.test(pw)&&/[a-z]/.test(pw))score+=1;
    if(/\d/.test(pw))score+=1;
    if(/[^A-Za-z0-9]/.test(pw))score+=1;
    var pct=Math.min(100,score*20);
    var color=pct>=80?"var(--success)":pct>=60?"var(--primary-hover)":pct>=40?"var(--warning)":"var(--error)";
    bar.style.setProperty("--pw-strength",pct+"%");
    bar.style.setProperty("--pw-strength-color",color);
    bar.setAttribute("aria-valuemin","0");
    bar.setAttribute("aria-valuemax","100");
    bar.setAttribute("aria-valuenow",String(pct));
    bar.setAttribute("role","meter");
    bar.dataset.strength=String(score);
    qsa(".pw-s",bar).forEach(function(segment,index){
      var active=index<Math.ceil(score/1.25);
      segment.style.background=active?color:"rgba(var(--color-white-rgb),.075)";
      segment.style.transform=active?"scaleY(1.25)":"scaleY(1)";
    });
  }
  async function login(){
    var client=supabaseReady(); if(!client)return;
    var id=(qs("#auth-login-id")&&qs("#auth-login-id").value||"").trim();
    var pw=qs("#auth-login-pw")&&qs("#auth-login-pw").value||"";
    var remember=!!(qs("#auth-remember")&&qs("#auth-remember").checked);
    try{localStorage.setItem("ethone_remember_auth",remember?"1":"0")}catch(e){}
    if(!id||!pw){setErr(tr("fill_all"));return}
    setLoading(true);
    try{
      var email=id;
      if(!/@/.test(id)){
        try{
          var res=await withTimeout(fetch(WORKER_URL+"/supabase/username?username="+encodeURIComponent(id)),5000,"Username lookup");
          if(res.ok){var json=await res.json();if(json&&json.email)email=json.email}
        }catch(e){warn("Username lookup failed; using dashboard.local fallback",e)}
        if(email===id)email=id+"@dashboard.local";
      }
      var result=await withTimeout(client.auth.signInWithPassword({email:email,password:pw}),12000,"Email/password login");
      setLoading(false);
      if(result.error){setErr(result.error.message||tr("wrong"));return}
      if(typeof window.onAuthSuccess==="function")await window.onAuthSuccess(result.data&&result.data.user);
    }catch(e){setLoading(false);setErr(e.message||tr("connect_error"));console.error("[ETHONE auth] login failed",e)}
  }
  async function register(){
    var client=supabaseReady(); if(!client)return;
    var username=(qs("#auth-reg-username")&&qs("#auth-reg-username").value||"").trim();
    var email=(qs("#auth-reg-email")&&qs("#auth-reg-email").value||"").trim();
    var pw=qs("#auth-reg-pw")&&qs("#auth-reg-pw").value||"";
    if(!username||!pw){setErr(tr("user_pw_required"));return}
    if(pw.length<6){setErr(tr("pw_short"));return}
    setLoading(true);
    try{
      var existing=await withTimeout(client.from("profiles").select("id").eq("username",username).maybeSingle(),8000,"Username availability");
      if(existing.data){setLoading(false);setErr(tr("username_taken"));return}
      var regEmail=email||username+"@dashboard.local";
      var result=await withTimeout(client.auth.signUp({email:regEmail,password:pw,options:{data:{username:username}}}),12000,"Create account");
      setLoading(false);
      if(result.error){setErr(result.error.message);return}
      setErr(tr("reset_sent"),true);
    }catch(e){setLoading(false);setErr(e.message||tr("connect_error"));console.error("[ETHONE auth] register failed",e)}
  }
  async function forgot(){
    var client=supabaseReady(); if(!client)return;
    var id=(qs("#auth-login-id")&&qs("#auth-login-id").value||"").trim();
    if(!id||!/@/.test(id)){setErr(tr("reset_need_email"));return}
    setLoading(true);
    try{
      var result=await withTimeout(client.auth.resetPasswordForEmail(id,{redirectTo:redirectUrl()}),12000,"Password reset");
      setLoading(false);
      if(result.error)setErr(result.error.message||tr("reset_error"));else setErr(tr("reset_sent"),true);
    }catch(e){setLoading(false);setErr(e.message||tr("reset_error"));console.error("[ETHONE auth] forgot password failed",e)}
  }
  async function oauth(provider){
    var client=supabaseReady(); if(!client)return;
    setLoading(true);
    try{
      var result=await withTimeout(client.auth.signInWithOAuth({provider:provider,options:{redirectTo:redirectUrl(),scopes:provider==="google"?"email profile":"read:user user:email"}}),12000,provider+" OAuth");
      if(result.error){setLoading(false);setErr(result.error.message||tr(provider==="google"?"google_error":"github_error"))}
    }catch(e){setLoading(false);setErr(e.message||tr(provider==="google"?"google_error":"github_error"));console.error("[ETHONE auth] oauth failed",provider,e)}
  }
  function setLanguage(l){
    l=String(l||"fr").slice(0,2).toLowerCase();
    var applied=false;
    if(typeof window.setLang==="function"){
      try{window.setLang(l);applied=true}catch(e){warn("Global language update failed; auth fallback applied",e)}
    }
    if(!applied){
      window._lang=l;
      document.documentElement.lang=l;
      try{localStorage.setItem("nexus_lang",l);localStorage.setItem("ethone_lang",l)}catch(e){}
      if(typeof window.applyI18n==="function"){try{window.applyI18n()}catch(e){warn("Global i18n failed; auth fallback applied",e)}}
    }
    applyTranslations();
    if(typeof window.ethoneSyncAuthHeroLanguage==="function"){
      setTimeout(window.ethoneSyncAuthHeroLanguage,0);
      setTimeout(window.ethoneSyncAuthHeroLanguage,80);
    }
  }
  function routeClick(target,event){
    var button=target.closest&&target.closest("#tab-login,#tab-register,#auth-login-btn,#form-register .lb-btn-primary,#form-login .lb-ghost,#btn-google,#btn-github,#auth-lang-bar button,.lb-eye,button[onclick*='togglePwVis']");
    if(!button)return false;
    event.preventDefault();
    event.stopPropagation();
    if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    if(button.matches("#tab-login"))switchTab("login");
    else if(button.matches("#tab-register"))switchTab("register");
    else if(button.matches("#auth-login-btn"))login();
    else if(button.matches("#form-register .lb-btn-primary"))register();
    else if(button.matches("#form-login .lb-ghost"))forgot();
    else if(button.matches("#btn-google"))oauth("google");
    else if(button.matches("#btn-github"))oauth("github");
    else if(button.closest("#auth-lang-bar"))setLanguage(button.dataset.l||button.getAttribute("data-l")||"fr");
    else if(button.matches(".lb-eye,button[onclick*='togglePwVis']"))togglePassword(button);
    return true;
  }
  function routeSubmit(event){
    var form=event.target;
    if(!form||!form.matches||!form.matches("#form-login,#form-register"))return;
    event.preventDefault();
    event.stopPropagation();
    if(form.id==="form-login")login();else register();
  }
  function bind(){
    var missing=REQUIRED.filter(function(sel){return !qs(sel)});
    missing.forEach(function(sel){warn("Missing auth element "+sel)});
    qsa("#auth-screen button").forEach(function(btn){
      if(!btn.hasAttribute("type"))btn.type="button";
      btn.dataset.authInteractive="1";
    });
    qsa("#auth-screen form").forEach(function(form){form.dataset.authInteractive="1"});
    qsa(".lb-eye,button[onclick*='togglePwVis']").forEach(function(btn){btn.type="button";btn.dataset.authInteractive="1";btn.setAttribute("aria-label","Afficher ou masquer le mot de passe")});
    var remembered=localStorage.getItem("ethone_remember_auth");
    var remember=qs("#auth-remember");
    if(remember&&remembered!==null)remember.checked=remembered==="1";
    applyTranslations();
    if(!ensureSupabase()||window.sb&&window.sb.__offline)setErr(tr("supabase_offline"));
    else if((qs("#auth-error")?.textContent||"")===tr("supabase_offline"))setErr("");
    document.documentElement.dataset.ethoneAuthInteractive="true";
    if(missing.length)debugBanner("Auth binding incomplet: elements manquants: "+missing.join(", "));
    return {missing:missing,bound:qsa("#auth-screen [data-auth-interactive='1']").length,supabase:!!ensureSupabase(),offline:!!(window.sb&&window.sb.__offline),authVisible:visible(qs("#auth-screen"))};
  }
  window.switchAuthTab=switchTab;
  window.doLogin=login;
  window.doRegister=register;
  window.doForgotPassword=forgot;
  window.doGoogle=function(){return oauth("google")};
  window.doGithub=function(){return oauth("github")};
  window.updatePwStrength=updatePasswordStrength;
  window.updateAuthLangBar=applyTranslations;
  if(!window.updateAuthLangBar.__heroSyncWrapped){
    var updateAuthLangBarBase=window.updateAuthLangBar;
    window.updateAuthLangBar=function(){
      var result=updateAuthLangBarBase.apply(this,arguments);
      if(typeof window.ethoneSyncAuthHeroLanguage==="function")setTimeout(window.ethoneSyncAuthHeroLanguage,0);
      return result;
    };
    window.updateAuthLangBar.__heroSyncWrapped=true;
  }
  window.togglePwVis=function(inputId,btn){var b=btn||qs("button[onclick*='"+inputId+"']");if(b)togglePassword(b);else{var input=qs("#"+CSS.escape(inputId));if(input)input.type=input.type==="password"?"text":"password"}};
  window.ethoneAuthInteractivityAudit=function(){
    return bind();
  };
  document.addEventListener("click",function(event){routeClick(event.target,event)},true);
  document.addEventListener("submit",routeSubmit,true);
  document.addEventListener("keydown",function(event){
    if(event.key!=="Enter")return;
    if(event.target&&event.target.closest&&event.target.closest("#form-login")){event.preventDefault();login()}
    else if(event.target&&event.target.closest&&event.target.closest("#form-register")){event.preventDefault();register()}
  },true);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
  window.addEventListener("ethone:supabase-loaded",function(){setTimeout(bind,0)});
  setTimeout(bind,300);
  setTimeout(bind,1500);
})();
