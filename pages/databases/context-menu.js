/* ETHONE Database Builder — generic right-click context menu (duplicated from pages/valorant-accounts/context-menu.js, db-prefixed for independence). */
(function(){
  "use strict";
  var menuEl=null;

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

  function ensureMenu(){
    if(menuEl)return menuEl;
    menuEl=document.getElementById("db-ctx-menu");
    if(!menuEl){
      menuEl=document.createElement("div");
      menuEl.id="db-ctx-menu";
      document.body.appendChild(menuEl);
    }
    menuEl.className="db-ctx-menu";
    return menuEl;
  }

  function close(){
    if(menuEl)menuEl.classList.remove("open");
  }

  function open(x, y, items){
    var m=ensureMenu();
    m.innerHTML=items.map(function(it){
      if(it.divider)return '<div class="db-ctx-divider"></div>';
      var danger=it.danger?" danger":"";
      return '<button type="button" class="db-ctx-item'+danger+'" data-idx="'+items.indexOf(it)+'">'+
        (it.icon?'<span class="db-ctx-icon">'+it.icon+"</span>":"")+
        '<span class="db-ctx-label">'+esc(it.label)+"</span>"+
        (it.shortcut?'<span class="db-ctx-shortcut">'+esc(it.shortcut)+"</span>":"")+
      "</button>";
    }).join("");
    m.querySelectorAll(".db-ctx-item").forEach(function(btn){
      btn.addEventListener("click",function(){
        var it=items[parseInt(btn.dataset.idx,10)];
        close();
        if(it&&it.onClick)it.onClick();
      });
    });
    m.style.visibility="hidden";
    m.classList.add("open");
    var mw=m.offsetWidth, mh=m.offsetHeight;
    var vw=window.innerWidth, vh=window.innerHeight;
    var left=x, top=y;
    if(left+mw>vw-8)left=vw-mw-8;
    if(top+mh>vh-8)top=vh-mh-8;
    m.style.left=left+"px";
    m.style.top=top+"px";
    m.style.visibility="";
  }

  document.addEventListener("mousedown",function(e){
    if(menuEl&&menuEl.classList.contains("open")&&!e.target.closest("#db-ctx-menu"))close();
  });
  document.addEventListener("keydown",function(e){if(e.key==="Escape")close();});
  window.addEventListener("scroll",close,true);
  window.addEventListener("resize",close);

  window.dbOpenContextMenu=open;
  window.dbCloseContextMenu=close;
})();
