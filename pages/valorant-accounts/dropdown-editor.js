/* ETHONE Valorant Accounts — visual dropdown option editor (premium modal). */
(function(){
  "use strict";
  var overlay=null, modal=null, currentKey=null, workingOptions=null;

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function uid(){return "opt_"+Date.now()+"_"+Math.floor(Math.random()*10000);}

  var VA_SWATCHES=["#8b5cf6","#34d399","#60a5fa","#f87171","#f59e0b","#facc15","#c084fc","#f472b6","#38bdf8","#a3e635","#7a7a82","#f4e389"];

  function ensureDom(){
    if(overlay)return;
    overlay=document.createElement("div");
    overlay.className="va-dpe-overlay";
    overlay.addEventListener("mousedown",function(e){if(e.target===overlay)close();});
    modal=document.createElement("div");
    modal.className="va-dpe-modal";
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&overlay.classList.contains("open"))close();});
  }

  function labelForColumn(colKey){
    var colDef=(typeof vaAllColumnDefs==="function"?vaAllColumnDefs():[]).find(function(c){return c.key===colKey;});
    return colDef?colDef.label:colKey;
  }

  function render(){
    modal.innerHTML=
      '<div class="va-dpe-header">'+
        '<div class="va-dpe-title">Modifier le dropdown — '+esc(labelForColumn(currentKey))+"</div>"+
        '<button type="button" class="va-mini-btn va-dpe-close" id="va-dpe-close">✕</button>'+
      "</div>"+
      '<div class="va-dpe-body">'+
        '<div class="va-dpe-list" id="va-dpe-list">'+renderRows()+"</div>"+
        '<button type="button" class="va-dpe-add" id="va-dpe-add">+ Ajouter une option</button>'+
      "</div>"+
      '<div class="va-dpe-footer">'+
        '<span class="va-dpe-hint">Les changements sont enregistrés automatiquement.</span>'+
        '<button type="button" class="va-dpe-done" id="va-dpe-done">Terminé</button>'+
      "</div>";
    wireEvents();
  }

  function renderRows(){
    return workingOptions.map(function(o,i){
      return '<div class="va-dpe-row" draggable="true" data-idx="'+i+'">'+
        '<span class="va-dpe-drag">⠿</span>'+
        '<button type="button" class="va-dpe-color" data-idx="'+i+'" style="--bc:'+esc(o.color||"#8b8b93")+'"></button>'+
        '<input type="text" class="va-dpe-icon-input" data-idx="'+i+'" value="'+esc(o.icon||"")+'" placeholder="🎯" maxlength="4">'+
        '<input type="text" class="va-dpe-label-input" data-idx="'+i+'" value="'+esc(o.label||"")+'" placeholder="Nom de l\'option">'+
        '<span class="va-badge va-dpe-preview" style="--bc:'+esc(o.color||"#8b8b93")+'">'+(o.icon?esc(o.icon)+" ":"")+esc(o.label||"—")+"</span>"+
        '<button type="button" class="va-mini-btn va-dpe-delete" data-idx="'+i+'" title="Supprimer">'+VA_TRASH_SVG+"</button>"+
      "</div>";
    }).join("");
  }
  var VA_TRASH_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

  function refreshList(){
    document.getElementById("va-dpe-list").innerHTML=renderRows();
    wireRowEvents();
  }

  function wireEvents(){
    document.getElementById("va-dpe-close").addEventListener("click",close);
    document.getElementById("va-dpe-done").addEventListener("click",close);
    document.getElementById("va-dpe-add").addEventListener("click",function(){
      workingOptions.push({value:uid(),label:"",color:VA_SWATCHES[workingOptions.length%VA_SWATCHES.length],icon:""});
      persist();
      refreshList();
      var inputs=modal.querySelectorAll(".va-dpe-label-input");
      var last=inputs[inputs.length-1];
      if(last)last.focus();
    });
    wireRowEvents();
  }

  function wireRowEvents(){
    modal.querySelectorAll(".va-dpe-label-input").forEach(function(input){
      input.addEventListener("input",function(){
        var idx=parseInt(input.dataset.idx,10);
        workingOptions[idx].label=input.value;
        persist();
        var preview=input.closest(".va-dpe-row").querySelector(".va-dpe-preview");
        preview.textContent=(workingOptions[idx].icon?workingOptions[idx].icon+" ":"")+(input.value||"—");
      });
    });
    modal.querySelectorAll(".va-dpe-icon-input").forEach(function(input){
      input.addEventListener("input",function(){
        var idx=parseInt(input.dataset.idx,10);
        workingOptions[idx].icon=input.value;
        persist();
        var preview=input.closest(".va-dpe-row").querySelector(".va-dpe-preview");
        preview.textContent=(input.value?input.value+" ":"")+(workingOptions[idx].label||"—");
      });
    });
    modal.querySelectorAll(".va-dpe-color").forEach(function(btn){
      btn.addEventListener("click",function(e){
        openColorPicker(btn,parseInt(btn.dataset.idx,10));
      });
    });
    modal.querySelectorAll(".va-dpe-delete").forEach(function(btn){
      btn.addEventListener("click",function(){
        var idx=parseInt(btn.dataset.idx,10);
        workingOptions.splice(idx,1);
        persist();
        refreshList();
      });
    });
    modal.querySelectorAll(".va-dpe-row").forEach(function(row){
      row.addEventListener("dragstart",function(e){
        e.dataTransfer.setData("text/plain",row.dataset.idx);
        row.classList.add("dragging");
      });
      row.addEventListener("dragend",function(){row.classList.remove("dragging");});
      row.addEventListener("dragover",function(e){e.preventDefault();row.classList.add("drag-over");});
      row.addEventListener("dragleave",function(){row.classList.remove("drag-over");});
      row.addEventListener("drop",function(e){
        e.preventDefault();
        row.classList.remove("drag-over");
        var fromIdx=parseInt(e.dataTransfer.getData("text/plain"),10);
        var toIdx=parseInt(row.dataset.idx,10);
        if(fromIdx===toIdx)return;
        var moved=workingOptions.splice(fromIdx,1)[0];
        workingOptions.splice(toIdx,0,moved);
        persist();
        refreshList();
      });
    });
  }

  var _colorPickerEl=null;
  function openColorPicker(anchorBtn,idx){
    if(_colorPickerEl){_colorPickerEl.remove();_colorPickerEl=null;}
    var pop=document.createElement("div");
    pop.className="va-dpe-swatch-pop";
    pop.innerHTML=VA_SWATCHES.map(function(c){return '<button type="button" class="va-dpe-swatch" style="--sc:'+c+'" data-color="'+c+'"></button>';}).join("")+
      '<input type="color" class="va-dpe-custom-color" value="'+(workingOptions[idx].color||"#8b8b93")+'">';
    document.body.appendChild(pop);
    _colorPickerEl=pop;
    var r=anchorBtn.getBoundingClientRect();
    pop.style.top=(r.bottom+6)+"px";
    pop.style.left=r.left+"px";
    pop.querySelectorAll(".va-dpe-swatch").forEach(function(sw){
      sw.addEventListener("click",function(){
        setColor(idx,sw.dataset.color);
        pop.remove();_colorPickerEl=null;
      });
    });
    pop.querySelector(".va-dpe-custom-color").addEventListener("input",function(e){
      setColor(idx,e.target.value);
    });
    setTimeout(function(){
      document.addEventListener("mousedown",function handler(e){
        if(!pop.contains(e.target)&&e.target!==anchorBtn){
          pop.remove();if(_colorPickerEl===pop)_colorPickerEl=null;
          document.removeEventListener("mousedown",handler);
        }
      });
    },0);
  }
  function setColor(idx,color){
    workingOptions[idx].color=color;
    persist();
    refreshList();
  }

  function persist(){
    if(typeof vaSaveDropdownOptions==="function")vaSaveDropdownOptions(currentKey,workingOptions);
    if(typeof vaRender==="function")vaRender();
  }

  function open(colKey){
    ensureDom();
    currentKey=colKey;
    workingOptions=(typeof vaOptionsFor==="function"?vaOptionsFor(colKey):[]).map(function(o){return Object.assign({},o);});
    render();
    overlay.classList.add("open");
  }
  function close(){
    if(!overlay)return;
    overlay.classList.remove("open");
    if(_colorPickerEl){_colorPickerEl.remove();_colorPickerEl=null;}
  }

  window.vaOpenDropdownEditor=open;
})();
