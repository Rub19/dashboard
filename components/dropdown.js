/* ETHONE — shared floating dropdown panel.
   Was duplicated verbatim across pages/databases/dropdown.js (db- prefix) and
   pages/valorant-accounts/dropdown.js (va- prefix). Consolidated into one
   controller factory; each page still gets its own independent panel/class
   prefix (so existing CSS in databases/style.css and valorant-accounts/style.css
   keeps working untouched), but there is now exactly one copy of the logic. */
(function(){
  "use strict";

  var CHECK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>';

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

  function normalize(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");}

  function createDropdownController(prefix){
    var panel=null, activeTrigger=null, state=null;
    var cls=function(name){return prefix+"-"+name;};

    function ensurePanel(){
      if(panel)return panel;
      panel=document.createElement("div");
      panel.className=cls("panel");
      panel.setAttribute("role","listbox");
      document.body.appendChild(panel);
      panel.addEventListener("mousedown",function(e){e.stopPropagation();});
      return panel;
    }

    function isSelected(value){
      if(!state)return false;
      if(state.opts.multi)return (state.selected||[]).indexOf(value)>-1;
      return state.selected===value;
    }

    function buildList(query){
      var items=state.opts.items;
      var q=normalize(query||"");
      var filtered=q?items.filter(function(it){return normalize(it.label).indexOf(q)>-1;}):items;
      var byCat={}, catOrder=[];
      filtered.forEach(function(it){
        var cat=it.category||"";
        if(!byCat[cat]){byCat[cat]=[];catOrder.push(cat);}
        byCat[cat].push(it);
      });
      var html="";
      catOrder.forEach(function(cat){
        if(cat)html+='<div class="'+cls("cat")+'">'+esc(cat)+"</div>";
        byCat[cat].forEach(function(it){
          var sel=isSelected(it.value);
          html+='<button type="button" class="'+cls("opt")+(sel?" selected":"")+'" data-value="'+esc(it.value)+'" role="option" aria-selected="'+sel+'">'+
            (it.color?'<span class="'+cls("dot")+'" style="background:'+esc(it.color)+'"></span>':"")+
            (it.icon?'<span class="'+cls("icon")+'">'+it.icon+"</span>":"")+
            '<span class="'+cls("label")+'">'+esc(it.label)+"</span>"+
            (state.opts.multi?'<span class="'+cls("check")+'">'+(sel?CHECK_SVG:"")+"</span>":(sel?'<span class="'+cls("check")+'">'+CHECK_SVG+"</span>":""))+
          "</button>";
        });
      });
      if(!filtered.length){
        html+='<div class="'+cls("empty")+'">Aucun résultat</div>';
      }
      if(state.opts.allowCreate&&query&&query.trim()){
        var exists=items.some(function(it){return normalize(it.label)===normalize(query);});
        if(!exists){
          html+='<button type="button" class="'+cls("opt")+" "+cls("create")+'" data-create="1"><span class="'+cls("icon")+'">+</span><span class="'+cls("label")+'">Créer « '+esc(query.trim())+" »</span></button>";
        }
      }
      return html;
    }

    function renderPanel(){
      var p=ensurePanel();
      var opts=state.opts;
      var searchInputId=cls("search-input");
      var searchHTML=opts.searchable===false?"":'<div class="'+cls("search-wrap")+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" class="'+cls("search")+'" id="'+searchInputId+'" placeholder="'+esc(opts.placeholder||"Rechercher…")+'" autocomplete="off"></div>';
      p.innerHTML=(opts.title?'<div class="'+cls("title")+'">'+esc(opts.title)+"</div>":"")+searchHTML+'<div class="'+cls("list")+'" id="'+cls("list")+'"></div>';
      var listEl=p.querySelector("#"+cls("list"));
      listEl.innerHTML=buildList("");
      var searchInput=p.querySelector("#"+searchInputId);
      if(searchInput){
        searchInput.addEventListener("input",function(){listEl.innerHTML=buildList(searchInput.value);});
        searchInput.addEventListener("keydown",function(e){
          if(e.key==="Escape"){close();}
          if(e.key==="Enter"){
            var createBtn=listEl.querySelector("."+cls("create"));
            if(createBtn)createBtn.click();
            else{
              var first=listEl.querySelector("."+cls("opt"));
              if(first)first.click();
            }
          }
        });
      }
      listEl.addEventListener("click",function(e){
        var btn=e.target.closest("."+cls("opt"));
        if(!btn)return;
        if(btn.dataset.create){
          var val=searchInput?searchInput.value.trim():"";
          if(!val)return;
          if(opts.onCreate)opts.onCreate(val);
          if(opts.multi){
            state.selected=(state.selected||[]).concat([val]);
            if(opts.onChange)opts.onChange(state.selected.slice());
            if(searchInput){searchInput.value="";listEl.innerHTML=buildList("");searchInput.focus();}
          }else{
            if(opts.onChange)opts.onChange(val);
            close();
          }
          return;
        }
        var value=btn.dataset.value;
        if(opts.multi){
          var cur=(state.selected||[]).slice();
          var idx=cur.indexOf(value);
          if(idx>-1)cur.splice(idx,1);else cur.push(value);
          state.selected=cur;
          if(opts.onChange)opts.onChange(cur.slice());
          var q=searchInput?searchInput.value:"";
          listEl.innerHTML=buildList(q);
        }else{
          state.selected=value;
          if(opts.onChange)opts.onChange(value);
          close();
        }
      });
    }

    function position(anchor){
      var p=ensurePanel();
      var r=anchor.getBoundingClientRect();
      var width=Math.max(r.width,260);
      p.style.minWidth=width+"px";
      var vh=window.innerHeight, vw=window.innerWidth;
      p.style.visibility="hidden";
      p.classList.add("open");
      var ph=p.offsetHeight, pw=p.offsetWidth;
      var top=r.bottom+6;
      if(top+ph>vh-10)top=Math.max(10,r.top-ph-6);
      var left=r.left;
      if(left+pw>vw-10)left=Math.max(10,vw-pw-10);
      p.style.top=top+"px";
      p.style.left=left+"px";
      p.style.visibility="";
    }

    function close(){
      if(!panel)return;
      panel.classList.remove("open");
      if(activeTrigger)activeTrigger.classList.remove(cls("trigger-active"));
      activeTrigger=null;
      if(state&&state.opts.onClose)state.opts.onClose();
      state=null;
    }

    function open(anchor, opts){
      if(activeTrigger===anchor){close();return;}
      close();
      activeTrigger=anchor;
      anchor.classList.add(cls("trigger-active"));
      state={opts:opts, selected: opts.multi?(opts.selected||[]).slice():opts.selected};
      renderPanel();
      position(anchor);
      var searchInput=panel.querySelector("#"+cls("search-input"));
      if(searchInput)setTimeout(function(){searchInput.focus();},10);
    }

    function handleDocumentMouseDown(e){
      if(panel&&panel.classList.contains("open")&&!e.target.closest("."+cls("panel"))&&!e.target.closest("."+cls("trigger-active"))){
        close();
      }
    }
    function handleScroll(e){
      if(!panel||!panel.classList.contains("open"))return;
      if(panel.contains(e.target))return;
      close();
    }

    return {open:open, close:close, handleDocumentMouseDown:handleDocumentMouseDown, handleScroll:handleScroll};
  }

  var dbCtrl=createDropdownController("db-dd");
  var vaCtrl=createDropdownController("va-dd");
  var controllers=[dbCtrl,vaCtrl];
  document.addEventListener("mousedown",function(e){controllers.forEach(function(controller){controller.handleDocumentMouseDown(e);});});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")controllers.forEach(function(controller){controller.close();});});
  window.addEventListener("resize",function(){controllers.forEach(function(controller){controller.close();});});
  window.addEventListener("scroll",function(e){controllers.forEach(function(controller){controller.handleScroll(e);});},true);

  window.dbOpenDropdown=dbCtrl.open;
  window.dbCloseDropdown=dbCtrl.close;

  window.vaOpenDropdown=vaCtrl.open;
  window.vaCloseDropdown=vaCtrl.close;
})();
