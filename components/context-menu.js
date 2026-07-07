/* ETHONE — shared right-click context menu.
   Was duplicated verbatim across pages/databases/context-menu.js (db- prefix)
   and pages/valorant-accounts/context-menu.js (va- prefix). Consolidated into
   one controller factory; each page keeps its own independent menu/class
   prefix (existing CSS in databases/style.css and valorant-accounts/style.css
   keeps working untouched), but there is now exactly one copy of the logic. */
(function(){
  "use strict";

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

  function createContextMenuController(prefix){
    var menuEl=null;
    var menuId=prefix+"-ctx-menu";
    var itemCls=prefix+"-ctx-item";

    function ensureMenu(){
      if(menuEl)return menuEl;
      menuEl=document.getElementById(menuId);
      if(!menuEl){
        menuEl=document.createElement("div");
        menuEl.id=menuId;
        document.body.appendChild(menuEl);
      }
      menuEl.className=prefix+"-ctx-menu";
      return menuEl;
    }

    function close(){
      if(menuEl)menuEl.classList.remove("open");
    }

    function open(x, y, items){
      var m=ensureMenu();
      m.innerHTML=items.map(function(it){
        if(it.divider)return '<div class="'+prefix+'-ctx-divider"></div>';
        var danger=it.danger?" danger":"";
        return '<button type="button" class="'+itemCls+danger+'" data-idx="'+items.indexOf(it)+'">'+
          (it.icon?'<span class="'+prefix+'-ctx-icon">'+it.icon+"</span>":"")+
          '<span class="'+prefix+'-ctx-label">'+esc(it.label)+"</span>"+
          (it.shortcut?'<span class="'+prefix+'-ctx-shortcut">'+esc(it.shortcut)+"</span>":"")+
        "</button>";
      }).join("");
      m.querySelectorAll("."+itemCls).forEach(function(btn){
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
      if(menuEl&&menuEl.classList.contains("open")&&!e.target.closest("#"+menuId))close();
    });
    document.addEventListener("keydown",function(e){if(e.key==="Escape")close();});
    window.addEventListener("scroll",close,true);
    window.addEventListener("resize",close);

    return {open:open, close:close};
  }

  var dbCtrl=createContextMenuController("db");
  window.dbOpenContextMenu=dbCtrl.open;
  window.dbCloseContextMenu=dbCtrl.close;

  var vaCtrl=createContextMenuController("va");
  window.vaOpenContextMenu=vaCtrl.open;
  window.vaCloseContextMenu=vaCtrl.close;
})();
