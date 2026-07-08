/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  "use strict";
  if(window.__ethoneAuthProductionFix)return;
  window.__ethoneAuthProductionFix=true;
  var AUTH=window.ETHONE_AUTH_TEXT||{};
  function lang(){
    return String(window._lang||localStorage.getItem("nexus_lang")||localStorage.getItem("ethone_lang")||"fr").slice(0,2).toLowerCase();
  }
  function tr(key){
    var l=lang();
    return (AUTH[l]&&AUTH[l][key])||(AUTH.fr&&AUTH.fr[key])||(AUTH.en&&AUTH.en[key])||key;
  }
  function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function setText(selector,key){
    var el=typeof selector==="string"?qs(selector):selector;
    if(el)el.textContent=tr(key);
  }
  function setPlaceholder(selector,key){
    var el=typeof selector==="string"?qs(selector):selector;
    if(el)el.setAttribute("placeholder",tr(key));
  }
  function setErr(message,good){
    var er=qs("#auth-error");
    if(!er)return;
    er.textContent=message||"";
    er.style.display=message?"block":"none";
    er.style.color=good?"#22c55e":"";
  }
  function setLoading(value){
    var ld=qs("#auth-loading");
    if(ld)ld.style.display=value?"block":"none";
    if(value)setErr("");
  }
  function supabaseReady(){
    return !!(window.sb&&window.sb.auth&&!window.sb.__offline);
  }
  function redirectUrl(){
    var path=location.pathname||"/";
    if(/\/404\.html$/i.test(path))path=path.replace(/\/404\.html$/i,"/index.html");
    return location.origin+path;
  }
  function timeout(promise,ms,label){
    return Promise.race([promise,new Promise(function(_,reject){setTimeout(function(){reject(new Error((label||"Request")+" timed out"))},ms)})]);
  }
  function applyAuthTranslations(){
    var l=lang();
    qsa("#auth-lang-bar button").forEach(function(btn){
      var active=btn.dataset.l===l;
      btn.style.background="transparent";
      btn.style.color=active?"#fff":"rgba(255,255,255,.42)";
      btn.style.fontWeight=active?"700":"600";
      btn.type="button";
    });
    qsa("#auth-screen [data-i18n]").forEach(function(el){
      var key=el.getAttribute("data-i18n");
      var attr=el.getAttribute("data-i18n-attr");
      var value=tr(key);
      if(value===key&&/_/.test(key))value=(AUTH.fr&&AUTH.fr[key])||(AUTH.en&&AUTH.en[key])||el.textContent||key;
      if(attr)el.setAttribute(attr,value);
      else el.textContent=value;
    });
    setPlaceholder("#auth-login-id","login_ph");
    setPlaceholder("#auth-login-pw","pw_ph");
    setPlaceholder("#auth-reg-username","reg_user_ph");
    setPlaceholder("#auth-reg-email","reg_email_ph");
    setPlaceholder("#auth-reg-pw","reg_pw_ph");
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
    qsa("#auth-screen button").forEach(function(btn){
      if(!btn.type||btn.type==="submit")btn.type="button";
    });
  }
  function switchTab(tab){
    var login=qs("#form-login"), reg=qs("#form-register");
    var tabLogin=qs("#tab-login"), tabReg=qs("#tab-register");
    if(login)login.style.display=tab==="login"?"block":"none";
    if(reg)reg.style.display=tab==="register"?"block":"none";
    if(tabLogin){
      tabLogin.removeAttribute("style");
      tabLogin.classList.toggle("is-active",tab==="login");
      tabLogin.setAttribute("aria-selected",String(tab==="login"));
    }
    if(tabReg){
      tabReg.removeAttribute("style");
      tabReg.classList.toggle("is-active",tab==="register");
      tabReg.setAttribute("aria-selected",String(tab==="register"));
    }
    setErr("");
    applyAuthTranslations();
    if(typeof window.ethoneSyncAuthHeroLanguage==="function")setTimeout(window.ethoneSyncAuthHeroLanguage,0);
  }
  async function login(){
    var id=(qs("#auth-login-id")&&qs("#auth-login-id").value||"").trim();
    var pw=qs("#auth-login-pw")&&qs("#auth-login-pw").value||"";
    var remember=!!(qs("#auth-remember")&&qs("#auth-remember").checked);
    localStorage.setItem("ethone_remember_auth",remember?"1":"0");
    if(!id||!pw){setErr(tr("fill_all"));return}
    if(!supabaseReady()){setErr(tr("supabase_offline"));return}
    setLoading(true);
    try{
      var email=id;
      if(!/@/.test(id)){
        try{
          var res=await timeout(fetch(WORKER_URL+"/supabase/username?username="+encodeURIComponent(id)),6000,"Username lookup");
          if(res.ok){var json=await res.json();if(json&&json.email)email=json.email}
        }catch(e){}
        if(email===id)email=id+"@dashboard.local";
      }
      var result=await timeout(window.sb.auth.signInWithPassword({email:email,password:pw}),12000,"Email login");
      setLoading(false);
      if(result.error){setErr(result.error.message||tr("wrong"));return}
      if(typeof window.onAuthSuccess==="function")await window.onAuthSuccess(result.data&&result.data.user);
    }catch(e){
      setLoading(false);
      setErr(e.message||tr("connect_error"));
      console.error("[ETHONE] login",e);
    }
  }
  async function register(){
    var username=(qs("#auth-reg-username")&&qs("#auth-reg-username").value||"").trim();
    var email=(qs("#auth-reg-email")&&qs("#auth-reg-email").value||"").trim();
    var pw=qs("#auth-reg-pw")&&qs("#auth-reg-pw").value||"";
    if(!username||!pw){setErr(tr("user_pw_required"));return}
    if(pw.length<6){setErr(tr("pw_short"));return}
    if(!supabaseReady()){setErr(tr("supabase_offline"));return}
    setLoading(true);
    try{
      var existing=await timeout(window.sb.from("profiles").select("id").eq("username",username).maybeSingle(),8000,"Username check");
      if(existing.data){setLoading(false);setErr(tr("username_taken"));return}
      var regEmail=email||username+"@dashboard.local";
      var result=await timeout(window.sb.auth.signUp({email:regEmail,password:pw,options:{data:{username:username}}}),12000,"Create account");
      setLoading(false);
      if(result.error){setErr(result.error.message);return}
      var relogin=await timeout(window.sb.auth.signInWithPassword({email:regEmail,password:pw}),12000,"Post-signup login").catch(function(){return null});
      if(relogin&&!relogin.error&&typeof window.onAuthSuccess==="function")await window.onAuthSuccess(relogin.data&&relogin.data.user);
      else setErr(tr("reset_sent"),true);
    }catch(e){
      setLoading(false);
      setErr(e.message||tr("connect_error"));
      console.error("[ETHONE] register",e);
    }
  }
  async function forgotPassword(){
    var id=(qs("#auth-login-id")&&qs("#auth-login-id").value||"").trim();
    if(!id||!/@/.test(id)){setErr(tr("reset_need_email"));return}
    if(!supabaseReady()){setErr(tr("supabase_offline"));return}
    setLoading(true);
    try{
      var result=await timeout(window.sb.auth.resetPasswordForEmail(id,{redirectTo:redirectUrl()}),12000,"Password reset");
      setLoading(false);
      if(result.error)setErr(result.error.message||tr("reset_error"));
      else setErr(tr("reset_sent"),true);
    }catch(e){setLoading(false);setErr(e.message||tr("reset_error"));console.error("[ETHONE] forgot password",e)}
  }
  async function oauth(provider){
    if(!supabaseReady()){setErr(tr(provider==="google"?"google_error":"github_error"));return}
    setLoading(true);
    try{
      var result=await timeout(window.sb.auth.signInWithOAuth({provider:provider,options:{redirectTo:redirectUrl(),scopes:provider==="google"?"email profile":"read:user user:email"}}),12000,"OAuth");
      if(result.error){setLoading(false);setErr(result.error.message||tr(provider==="google"?"google_error":"github_error"))}
    }catch(e){setLoading(false);setErr(e.message||tr(provider==="google"?"google_error":"github_error"));console.error("[ETHONE] oauth "+provider,e)}
  }
  function bindAuth(){
    applyAuthTranslations();
    var remembered=localStorage.getItem("ethone_remember_auth");
    var remember=qs("#auth-remember");
    if(remember&&remembered!==null)remember.checked=remembered==="1";
    var tabLogin=qs("#tab-login"), tabReg=qs("#tab-register");
    [tabLogin,tabReg,qs("#auth-login-btn"),qs("#form-register .lb-btn-primary"),qs("#form-login .lb-ghost"),qs("#btn-google"),qs("#btn-github")].forEach(function(btn){if(btn)btn.removeAttribute("onclick")});
    if(tabLogin&&!tabLogin.dataset.authFixed){tabLogin.dataset.authFixed="1";tabLogin.addEventListener("click",function(e){e.preventDefault();switchTab("login")})}
    if(tabReg&&!tabReg.dataset.authFixed){tabReg.dataset.authFixed="1";tabReg.addEventListener("click",function(e){e.preventDefault();switchTab("register")})}
    var loginBtn=qs("#auth-login-btn");
    if(loginBtn&&!loginBtn.dataset.authFixed){loginBtn.dataset.authFixed="1";loginBtn.addEventListener("click",function(e){e.preventDefault();login()})}
    var regBtn=qs("#form-register .lb-btn-primary");
    if(regBtn&&!regBtn.dataset.authFixed){regBtn.dataset.authFixed="1";regBtn.addEventListener("click",function(e){e.preventDefault();register()})}
    var forgot=qs("#form-login .lb-ghost");
    if(forgot&&!forgot.dataset.authFixed){forgot.dataset.authFixed="1";forgot.addEventListener("click",function(e){e.preventDefault();forgotPassword()})}
    var google=qs("#btn-google"), github=qs("#btn-github");
    if(google&&!google.dataset.authFixed){google.dataset.authFixed="1";google.addEventListener("click",function(e){e.preventDefault();oauth("google")})}
    if(github&&!github.dataset.authFixed){github.dataset.authFixed="1";github.addEventListener("click",function(e){e.preventDefault();oauth("github")})}
    qsa("#auth-lang-bar button").forEach(function(btn){
      btn.removeAttribute("onclick");
      if(btn.dataset.authFixed)return;
      btn.dataset.authFixed="1";
      btn.addEventListener("click",function(e){
        e.preventDefault();
        var l=btn.dataset.l||"fr";
        l=String(l||"fr").slice(0,2).toLowerCase();
        window._lang=l;
        document.documentElement.lang=l;
        localStorage.setItem("nexus_lang",l);
        localStorage.setItem("ethone_lang",l);
        if(window.applyI18n)try{window.applyI18n()}catch(err){}
        applyAuthTranslations();
        if(typeof window.ethoneSyncAuthHeroLanguage==="function"){
          setTimeout(window.ethoneSyncAuthHeroLanguage,0);
          setTimeout(window.ethoneSyncAuthHeroLanguage,80);
        }
      });
    });
    if(window.sb&&window.sb.__offline)setErr(tr("supabase_offline"));
  }
  window.updateAuthLangBar=function(){
    var result=applyAuthTranslations.apply(this,arguments);
    if(typeof window.ethoneSyncAuthHeroLanguage==="function")setTimeout(window.ethoneSyncAuthHeroLanguage,0);
    return result;
  };
  window.switchAuthTab=switchTab;
  window.doLogin=login;
  window.doRegister=register;
  window.doForgotPassword=forgotPassword;
  window.doGoogle=function(){return oauth("google")};
  window.doGithub=function(){return oauth("github")};
  window.ethoneAuthAudit=function(){
    var raw=qsa("#auth-screen [data-i18n]").filter(function(el){return /^[a-z0-9_]+$/.test((el.textContent||"").trim())}).map(function(el){return el.getAttribute("data-i18n")+":"+el.textContent.trim()});
    return {lang:lang(),supabase:!!window.sb,offline:!!(window.sb&&window.sb.__offline),rawKeys:raw,loginVisible:qs("#form-login")?getComputedStyle(qs("#form-login")).display:null,registerVisible:qs("#form-register")?getComputedStyle(qs("#form-register")).display:null};
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bindAuth);else bindAuth();
  setTimeout(bindAuth,250);
  setTimeout(bindAuth,1200);
})();
