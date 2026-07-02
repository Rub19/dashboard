/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  function hardShowAuth(){
    try{
      var af=document.getElementById('anti-flash'); if(af) af.remove();
      ['nexus-boot-screen','nexus-page-transition','command-palette','notifications-panel'].forEach(function(id){var e=document.getElementById(id); if(e){e.style.display='none'; e.classList&&e.classList.remove('open','visible','active');}});
      document.documentElement.className=(document.documentElement.className||'').replace(/ethone-\w+-mode/g,'')+' ethone-auth-mode';
      var a=document.getElementById('auth-screen'); if(a){a.style.cssText+=';display:flex!important;visibility:visible!important;opacity:1!important;';}
      var c=document.getElementById('auth-card')||document.getElementById('lb-box'); if(c){c.style.display='block';c.style.visibility='visible';c.style.opacity='1';}
      var s=document.getElementById('main-sidebar'); if(s)s.style.display='none';
      var m=document.getElementById('main-content'); if(m)m.style.display='none';
      var p=document.getElementById('profile-screen'); if(p)p.style.display='none';
      var pw=document.getElementById('password-screen'); if(pw)pw.style.display='none';
    }catch(e){console.warn('[ETHONE] failsafe auth error',e);}
  }
  window.ethoneForceLoginVisible=hardShowAuth;
  setTimeout(function(){
    var boot=document.getElementById('nexus-boot-screen');
    var auth=document.getElementById('auth-screen');
    var profile=document.getElementById('profile-screen');
    var main=document.getElementById('main-content');
    var hasVisibleMain=main&&getComputedStyle(main).display!=='none'&&main.getBoundingClientRect().width>30&&main.innerText.trim().length>20;
    var hasVisibleProfile=profile&&getComputedStyle(profile).display!=='none'&&profile.getBoundingClientRect().width>30&&profile.innerText.trim().length>5;
    var hasVisibleAuth=auth&&getComputedStyle(auth).display!=='none'&&auth.getBoundingClientRect().width>30;
    if(boot && !hasVisibleMain && !hasVisibleProfile && !hasVisibleAuth) hardShowAuth();
  },4500);
})();
