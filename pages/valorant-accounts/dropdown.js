/* ETHONE Valorant Accounts — premium dropdown component.
   Single shared floating panel, reused for Rank/Region/Auth/Tags/Group-by/Export/Columns menus. */
(function(){
  "use strict";
  var panel=null, activeTrigger=null, state=null;

  function ensurePanel(){
    if(panel)return panel;
    panel=document.createElement("div");
    panel.className="va-dd-panel";
    panel.setAttribute("role","listbox");
    document.body.appendChild(panel);
    panel.addEventListener("mousedown",function(e){e.stopPropagation();});
    return panel;
  }

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

  function normalize(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");}

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
      if(cat)html+='<div class="va-dd-cat">'+esc(cat)+"</div>";
      byCat[cat].forEach(function(it){
        var sel=isSelected(it.value);
        html+='<button type="button" class="va-dd-opt'+(sel?" selected":"")+'" data-value="'+esc(it.value)+'" role="option" aria-selected="'+sel+'">'+
          (it.color?'<span class="va-dd-dot" style="background:'+esc(it.color)+'"></span>':"")+
          (it.icon?'<span class="va-dd-icon">'+it.icon+"</span>":"")+
          '<span class="va-dd-label">'+esc(it.label)+"</span>"+
          (state.opts.multi?'<span class="va-dd-check">'+(sel?CHECK_SVG:"")+"</span>":(sel?'<span class="va-dd-check">'+CHECK_SVG+"</span>":""))+
        "</button>";
      });
    });
    if(!filtered.length){
      if(state.opts.allowCreate&&query&&query.trim()){
        html+='<div class="va-dd-empty">Aucun résultat</div>';
      }else{
        html+='<div class="va-dd-empty">Aucun résultat</div>';
      }
    }
    if(state.opts.allowCreate&&query&&query.trim()){
      var exists=items.some(function(it){return normalize(it.label)===normalize(query);});
      if(!exists){
        html+='<button type="button" class="va-dd-opt va-dd-create" data-create="1"><span class="va-dd-icon">+</span><span class="va-dd-label">Créer « '+esc(query.trim())+" »</span></button>";
      }
    }
    return html;
  }

  var CHECK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>';

  function renderPanel(){
    var p=ensurePanel();
    var opts=state.opts;
    var searchHTML=opts.searchable===false?"":'<div class="va-dd-search-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" class="va-dd-search" id="va-dd-search-input" placeholder="'+esc(opts.placeholder||"Rechercher…")+'" autocomplete="off"></div>';
    p.innerHTML=(opts.title?'<div class="va-dd-title">'+esc(opts.title)+"</div>":"")+searchHTML+'<div class="va-dd-list" id="va-dd-list"></div>';
    var listEl=p.querySelector("#va-dd-list");
    listEl.innerHTML=buildList("");
    var searchInput=p.querySelector("#va-dd-search-input");
    if(searchInput){
      searchInput.addEventListener("input",function(){listEl.innerHTML=buildList(searchInput.value);});
      searchInput.addEventListener("keydown",function(e){
        if(e.key==="Escape"){close();}
        if(e.key==="Enter"){
          var createBtn=listEl.querySelector(".va-dd-create");
          if(createBtn)createBtn.click();
          else{
            var first=listEl.querySelector(".va-dd-opt");
            if(first)first.click();
          }
        }
      });
    }
    listEl.addEventListener("click",function(e){
      var btn=e.target.closest(".va-dd-opt");
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
    if(activeTrigger)activeTrigger.classList.remove("va-dd-trigger-active");
    activeTrigger=null;
    if(state&&state.opts.onClose)state.opts.onClose();
    state=null;
  }

  function open(anchor, opts){
    if(activeTrigger===anchor){close();return;}
    close();
    activeTrigger=anchor;
    anchor.classList.add("va-dd-trigger-active");
    state={opts:opts, selected: opts.multi?(opts.selected||[]).slice():opts.selected};
    renderPanel();
    position(anchor);
    var searchInput=panel.querySelector("#va-dd-search-input");
    if(searchInput)setTimeout(function(){searchInput.focus();},10);
  }

  document.addEventListener("mousedown",function(e){
    if(panel&&panel.classList.contains("open")&&!e.target.closest(".va-dd-panel")&&!e.target.closest(".va-dd-trigger-active")){
      close();
    }
  });
  document.addEventListener("keydown",function(e){
    if(e.key==="Escape"&&panel&&panel.classList.contains("open"))close();
  });
  window.addEventListener("resize",close);
  window.addEventListener("scroll",function(e){
    if(!panel||!panel.classList.contains("open"))return;
    if(panel.contains(e.target))return;
    close();
  },true);

  window.vaOpenDropdown=open;
  window.vaCloseDropdown=close;
})();
