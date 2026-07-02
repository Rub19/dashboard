/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  function visible(el){return !!(el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0)}
  window.ethoneRunFullAudit=function(){
    var pages=[].slice.call(document.querySelectorAll('.tab-content')).map(x=>x.id||x.dataset.tab||x.className);
    var buttons=[].slice.call(document.querySelectorAll('button,[onclick],.nav-item,.mob-nav-btn')).filter(visible);
    var overflow=[].slice.call(document.body.querySelectorAll('*')).filter(function(el){var r=el.getBoundingClientRect();return r.width>0&&(r.right>window.innerWidth+2||r.left<-2);}).slice(0,30).map(function(el){return el.id||el.className||el.tagName;});
    var state={mode:(document.documentElement.className.match(/ethone-\w+-mode/)||[''])[0],profiles:(window.profiles||[]).map(function(p){return p.name}),pages:pages.length,visibleButtons:buttons.length,overflow:overflow};
    console.table(state); return state;
  };
  window.ethoneCloseFloatingUI=function(){
    ['notifications-panel','command-palette','nexus-page-transition','nexus-page-loader'].forEach(function(id){var e=document.getElementById(id);if(e){e.classList.remove('open','visible','active');e.style.display='none';e.style.opacity='0';}});
  };

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
    document.querySelectorAll('.lb-eye').forEach(function(btn){btn.classList.add('ethone-pw-eye'); if(!btn.querySelector('svg')) btn.innerHTML=window.ethoneEyeIcon?ethoneEyeIcon(true):btn.innerHTML; btn.setAttribute('type','button');});
  });
})();
