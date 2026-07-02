/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  'use strict';
  var selectedProfileId=null;
  function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}
  function label(key,fallback){try{var v=typeof window.t==='function'?window.t(key):fallback;return (!v||v===key)?fallback:v;}catch(e){return fallback;}}
  function getProfiles(){try{return Array.isArray(profiles)?profiles:[]}catch(e){return [];}}
  function isManaging(){try{return !!managingMode}catch(e){return false;}}
  window.renderProfileScreen=function renderProfileScreenPremium(){
    var list=document.getElementById('ps-profiles-list');
    if(!list)return;
    var ps=getProfiles();
    if(!ps.length){
      try{
        var backup=localStorage.getItem('myspace_profiles_backup');
        if(backup){
          var parsed=JSON.parse(backup);
          if(Array.isArray(parsed)&&parsed.length){profiles=parsed; if(typeof normalizeAllProfiles==='function')normalizeAllProfiles(); ps=getProfiles();}
        }
      }catch(e){}
    }
    var html='';
    if(!ps.length){
      html='<div class="ps-empty-state" role="status">'+
        '<div class="ps-empty-icon" aria-hidden="true">+</div>'+
        '<div class="ps-empty-title">'+esc(label('no_profiles','Aucun profil'))+'</div>'+
        '<div class="ps-empty-sub">Crée ton premier espace ETHONE pour retrouver ton dashboard, tes réglages et tes personnalisations.</div>'+
        '<button class="ps-empty-btn" type="button" onclick="openCreateProfile()">'+esc(label('add_profile','Ajouter un profil'))+'</button>'+
      '</div>';
    }else{
      ps.forEach(function(p,i){
        var locked=p.password?'<div class="ps-lock">Locked</div>':'';
        var active=selectedProfileId===p.id?' selected':'';
        var avatar=(p.avatarImg?'<img src="'+esc(p.avatarImg)+'" alt="" onerror="this.remove()">':(typeof window.avatarHTML==='function'?window.avatarHTML(p,78,24):'👤'));
        var name=esc(p.name||'Profile');
        html+='<div class="ps-profile'+(isManaging()?' managing':'')+(p.password?' locked':'')+active+'" role="button" tabindex="0" aria-label="Open profile '+name+'" data-id="'+esc(p.id)+'" onclick="handleProfileClick(\''+esc(p.id)+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();handleProfileClick(\''+esc(p.id)+'\')}" onmousemove="psTilt(event,this)" onmouseleave="psUntilt(this)" style="animation-delay:'+(0.05+i*0.055)+'s">'+
          '<div class="ps-card-inner">'+
            '<div class="ps-avatar-wrap"><div class="ps-avatar" style="background:'+(p.avatarImg?'rgba(255,255,255,.06)':esc(p.avatarBg||'rgba(139,92,246,.16)'))+'">'+avatar+'</div>'+locked+'</div>'+
            '<div class="ps-pname">'+name+'</div>'+
            '<div class="ps-profile-meta">'+(p.password?'Protected workspace':'Personal workspace')+'</div>'+
            '<button class="ps-edit-btn" type="button" onclick="event.stopPropagation();openEditProfile(\''+esc(p.id)+'\')" title="Edit profile" aria-label="Edit '+name+'">✎</button>'+
            ((isManaging()&&ps.length>1)?'<button class="ps-delete-btn" type="button" onclick="event.stopPropagation();deleteProfile(\''+esc(p.id)+'\')" title="Delete profile" aria-label="Delete '+name+'">×</button>':'')+
          '</div></div>';
      });
      if(ps.length<6){
        html+='<button class="ps-add-card" type="button" onclick="openCreateProfile()" aria-label="Add profile">'+
          '<div class="ps-add-icon" aria-hidden="true">+</div><div class="ps-add-label">'+esc(label('add_profile','Ajouter profil'))+'</div><div class="ps-profile-meta">New workspace</div></button>';
      }
    }
    list.innerHTML=html;
    var manage=document.getElementById('ps-manage-btn');
    if(manage){
      manage.textContent=isManaging()?label('done','Terminé'):label('manage_profiles','Gérer les profils');
      manage.style.display=ps.length?'inline-flex':'none';
    }
    var actions=document.querySelector('#profile-screen .ps-actions');
    if(actions) actions.style.display=ps.length?'flex':'none';
    if(typeof window.psStartEmbers==='function')window.psStartEmbers();
  };
  window.handleProfileClick=function handleProfileClickPremium(id){
    if(isManaging())return;
    var p=(typeof window.getP==='function')?window.getP(id):getProfiles().find(function(x){return x.id===id;});
    if(!p)return;
    selectedProfileId=id;
    document.querySelectorAll('#profile-screen .ps-profile').forEach(function(card){card.classList.toggle('selected',card.getAttribute('data-id')===id);});
    if(navigator.vibrate)try{navigator.vibrate(12);}catch(e){}
    setTimeout(function(){
      if(p.password && typeof window.showPasswordScreen==='function') window.showPasswordScreen(id);
      else if(typeof window.enterDashboard==='function') window.enterDashboard(id);
    },220);
  };
  window.psTilt=function psTiltPremium(ev,el){
    var card=el&&el.querySelector?el.querySelector('.ps-card-inner'):null;
    if(!card)return;
    var r=card.getBoundingClientRect();
    var x=ev.clientX-r.left, y=ev.clientY-r.top;
    card.style.setProperty('--mx',x+'px');
    card.style.setProperty('--my',y+'px');
    var rx=((y/r.height)-.5)*-3.2;
    var ry=((x/r.width)-.5)*3.2;
    card.style.transform='translateY(-3px) rotateX('+rx+'deg) rotateY('+ry+'deg)';
  };
  window.psUntilt=function psUntiltPremium(el){
    var card=el&&el.querySelector?el.querySelector('.ps-card-inner'):null;
    if(card) card.style.transform='';
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
    var title=document.getElementById('ps-title-el');
    var sub=document.getElementById('ps-sub-el');
    if(title) title.innerHTML='Qui utilise <span>ETHONE&nbsp;?</span>';
    if(sub) sub.textContent='Choisissez un profil pour ouvrir votre espace.';
    setTimeout(function(){if(document.getElementById('profile-screen')&&document.getElementById('profile-screen').style.display!=='none')window.renderProfileScreen();},250);
  });
})();
