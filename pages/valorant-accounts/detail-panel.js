/* ETHONE Valorant Accounts — side detail panel. */
(function(){
  "use strict";
  var openId=null;

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

  function riotLoginUrl(){return "https://authenticate.riotgames.com/";}
  function trackerUrl(a){
    if(!a.riotId)return "https://tracker.gg/valorant";
    return "https://tracker.gg/valorant/profile/riot/"+encodeURIComponent(a.riotId+"%23"+(a.riotTag||""))+"/overview";
  }

  function fieldRow(label,field,a,opts){
    opts=opts||{};
    var value=a[field];
    var display;
    if(opts.type==="password"){
      display='<span class="va-dp-pw-dots" id="va-dp-pw-dots">••••••••</span><span class="va-dp-pw-plain" id="va-dp-pw-plain" style="display:none">'+esc(value||"")+"</span>";
    }else if(opts.render){
      display=opts.render(value,a);
    }else{
      display='<span class="va-dp-value'+(value?"":" empty")+'">'+esc(value||"Non renseigné")+"</span>";
    }
    return '<div class="va-dp-field" data-field="'+field+'">'+
      '<div class="va-dp-field-label">'+esc(label)+"</div>"+
      '<div class="va-dp-field-row">'+
        '<div class="va-dp-field-value">'+display+"</div>"+
        (opts.editable!==false?'<button type="button" class="va-mini-btn va-dp-edit" data-field="'+field+'" title="Modifier">'+VA_EDIT_SVG+"</button>":"")+
        (opts.type==="password"?'<button type="button" class="va-mini-btn" id="va-dp-pw-eye" title="Afficher">'+VA_EYE_SVG2+"</button>":"")+
        (opts.copyable!==false?'<button type="button" class="va-mini-btn va-dp-copy" data-field="'+field+'" title="Copier">'+VA_COPY_SVG+"</button>":"")+
      "</div></div>";
  }
  var VA_EDIT_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>';
  var VA_EYE_SVG2='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';

  function renderAvatarBlock(a){
    var initials=(a.inGameName||a.riotId||"?")[0].toUpperCase();
    return '<div class="va-dp-avatar-wrap">'+
      '<div class="va-dp-avatar">'+(a.avatar?'<img src="'+esc(a.avatar)+'" onerror="this.remove()">':'<span>'+esc(initials)+"</span>")+"</div>"+
      '<label class="va-dp-avatar-upload"><input type="file" accept="image/*" id="va-dp-avatar-input" style="display:none">Changer la photo</label>'+
    "</div>";
  }

  function render(a,isNew){
    var panel=document.getElementById("va-detail-panel");
    var rd=vaRankDef(a.rank);
    panel.innerHTML=
      '<div class="va-dp-header">'+
        '<button type="button" class="va-mini-btn va-dp-close" id="va-dp-close" title="Fermer">✕</button>'+
        '<div class="va-dp-title">'+(isNew?"Nouveau compte":esc(a.inGameName||a.riotId||"Compte"))+"</div>"+
      "</div>"+
      '<div class="va-dp-body">'+
        renderAvatarBlock(a)+
        '<div class="va-dp-rank-hero"><span class="va-badge va-rank-badge lg" style="--bc:'+rd.color+'"><span class="va-badge-dot"></span>'+esc(rd.label)+"</span></div>"+
        '<div class="va-dp-section-label">Identité</div>'+
        fieldRow("ID Riot","riotId",a)+
        fieldRow("Tag","riotTag",a)+
        fieldRow("Pseudo In Game","inGameName",a)+
        fieldRow("Mot de passe","password",a,{type:"password"})+
        '<div class="va-dp-section-label">Compte</div>'+
        fieldRow("Rank","rank",a,{copyable:false,render:function(v){var d=vaRankDef(v);return '<span class="va-badge va-rank-badge" style="--bc:'+d.color+'">'+esc(d.label)+"</span>";}})+
        fieldRow("Région","region",a,{copyable:false,render:function(v){return esc(vaRegionLabel(v));}})+
        fieldRow("Authentification","authMethod",a,{copyable:false,render:function(v){var d=vaAuthDef(v);return '<span class="va-badge va-auth-badge" style="--bc:'+d.color+'">'+d.icon+" "+esc(d.label)+"</span>";}})+
        fieldRow("Tags","tags",a,{copyable:false,render:function(v){return (v&&v.length)?v.map(function(t){var td=vaTagDef(t);return '<span class="va-badge va-tag-badge" style="--bc:'+td.color+'">'+esc(td.label)+"</span>";}).join(""):'<span class="va-dp-value empty">Aucun</span>';}})+
        '<div class="va-dp-section-label">Contact</div>'+
        fieldRow("Téléphone","phone",a)+
        fieldRow("Email","email",a)+
        fieldRow("Propriétaire","owner",a)+
        '<div class="va-dp-section-label">Notes</div>'+
        fieldRow("Notes","notes",a,{copyable:false,editable:true})+
        '<div class="va-dp-section-label">Divers</div>'+
        fieldRow("Skin Value","skinValue",a,{copyable:false})+
        '<div class="va-dp-quick-actions">'+
          '<a class="va-dp-action-btn" href="'+riotLoginUrl()+'" target="_blank" rel="noopener">Connexion Riot ↗</a>'+
          '<a class="va-dp-action-btn" href="'+trackerUrl(a)+'" target="_blank" rel="noopener">Ouvrir Tracker ↗</a>'+
        "</div>"+
        '<div class="va-dp-section-label">Historique des modifications</div>'+
        '<div class="va-dp-history">'+renderHistory(a)+"</div>"+
      "</div>";
    wireEvents(a);
    panel.classList.add("open");
    document.getElementById("va-detail-overlay").classList.add("open");
  }

  function renderHistory(a){
    var h=a.history||[];
    if(!h.length)return '<div class="va-dp-history-empty">Aucune modification enregistrée.</div>';
    return h.slice(0,12).map(function(e){
      return '<div class="va-dp-history-row">'+
        '<span class="va-dp-history-field">'+esc(vaFieldLabel(e.field))+"</span>"+
        '<span class="va-dp-history-change">'+esc(e.oldLabel)+" → "+esc(e.newLabel)+"</span>"+
        '<span class="va-dp-history-time">'+esc(vaFmtDate(e.at))+"</span>"+
      "</div>";
    }).join("");
  }

  function wireEvents(a){
    document.getElementById("va-dp-close").addEventListener("click",window.vaCloseDetail);
    var pwEye=document.getElementById("va-dp-pw-eye");
    if(pwEye)pwEye.addEventListener("click",function(){
      var dots=document.getElementById("va-dp-pw-dots"), plain=document.getElementById("va-dp-pw-plain");
      var showing=plain.style.display!=="none";
      dots.style.display=showing?"":"none";
      plain.style.display=showing?"none":"";
    });
    var avInput=document.getElementById("va-dp-avatar-input");
    if(avInput)avInput.addEventListener("change",function(){
      var file=avInput.files[0];if(!file)return;
      var reader=new FileReader();
      reader.onload=function(ev){
        vaSetField(a,"avatar",ev.target.result);
        render(a,false);
        vaRender();
      };
      reader.readAsDataURL(file);
    });
    document.querySelectorAll(".va-dp-copy").forEach(function(btn){
      btn.addEventListener("click",function(){vaCopyField(a,btn.dataset.field);});
    });
    document.querySelectorAll(".va-dp-edit").forEach(function(btn){
      btn.addEventListener("click",function(){startEdit(a,btn.dataset.field);});
    });
  }

  function startEdit(a,field){
    var row=document.querySelector('.va-dp-field[data-field="'+field+'"] .va-dp-field-row');
    if(!row||row.querySelector(".va-dp-edit-input"))return;
    var valueEl=row.querySelector(".va-dp-field-value");
    var current=a[field]==null?"":a[field];
    var isLong=field==="notes";
    var input=document.createElement(isLong?"textarea":"input");
    input.className="va-dp-edit-input";
    input.value=current;
    if(!isLong)input.type=(field==="skinValue")?"number":(field==="email"?"email":"text");
    valueEl.innerHTML="";
    valueEl.appendChild(input);
    input.focus();
    input.select&&input.select();
    function commit(){
      var val=input.value;
      if(field==="skinValue")val=parseFloat(val)||0;
      vaSetField(a,field,val);
      render(a,false);
      vaRender();
    }
    input.addEventListener("blur",commit);
    input.addEventListener("keydown",function(e){
      if(e.key==="Enter"&&!isLong){e.preventDefault();commit();}
      if(e.key==="Escape"){render(a,false);}
    });
  }

  window.vaOpenDetail=function(id,isNew){
    var a=vaAccounts().find(function(x){return x.id===id;});
    if(!a)return;
    openId=id;
    render(a,!!isNew);
  };
  window.vaCloseDetail=function(){
    openId=null;
    var panel=document.getElementById("va-detail-panel");
    var overlay=document.getElementById("va-detail-overlay");
    if(panel)panel.classList.remove("open");
    if(overlay)overlay.classList.remove("open");
  };
  window.vaRefreshDetailIfOpen=function(id){
    if(openId===id){
      var a=vaAccounts().find(function(x){return x.id===id;});
      if(a)render(a,false);
    }
  };
})();
