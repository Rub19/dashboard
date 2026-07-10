(function(){
  "use strict";

  if(window.__ethoneFinalProductPolish)return;
  window.__ethoneFinalProductPolish=true;

  var scheduled=false;
  var pendingRoot=null;
  var protectedSelector=[
    "script",
    "style",
    "svg",
    "canvas",
    "pre",
    "code",
    "[contenteditable='true']",
    ".ai-message",
    ".note-area",
    "#main-note",
    "[data-user-content='true']"
  ].join(",");

  var textReplacements=[
    [/â€¦/g,"..."],
    [/Loading\.\.\./g,"Loading..."],
    [/Loadingâ€¦/g,"Loading..."],
    [/Â·/g,"-"],
    [/â€”/g,"-"],
    [/â€“/g,"-"],
    [/âœ•/g,"x"],
    [/âœ¨/g,""],
    [/âœ…/g,""],
    [/â³/g,""],
    [/âŒ¨ï¸/g,"Keyboard"],
    [/â†‘â†“/g,"Up/Down"],
    [/â†µ/g,"Enter"],
    [/Ã‰chap/g,"Esc"],
    [/Ã©/g,"e"],
    [/Ã¨/g,"e"],
    [/Ãª/g,"e"],
    [/Ã /g,"a"],
    [/TÃ¢ches/g,"Taches"],
    [/ðŸŽ¯/g,""],
    [/ðŸ“–/g,""],
    [/ðŸ“„/g,""],
    [/ðŸ“/g,""],
    [/ðŸ”—/g,""],
    [/ðŸ–¼ï¸/g,""],
    [/ðŸ”¥/g,""],
    [/ðŸŸ¢/g,""],
    [/ðŸ”´/g,""],
    [/ðŸŸ¡/g,""],
    [/ðŸŸ£/g,""],
    [/ðŸŒ¿/g,""],
    [/ðŸŽ¨/g,""],
    [/ðŸ“Œ/g,""],
    [/ðŸ“‹/g,""],
    [/ðŸ“…/g,""],
    [/ðŸŽ‰/g,""],
    [/ðŸ’§/g,""],
    [/ðŸ”µ/g,""],
    [/ðŸ”’/g,""],
    [/ðŸŽ¬/g,""],
    [/ðŸŽ®/g,""],
    [/ðŸ“§/g,""],
    [/ðŸ˜„|ðŸ™‚|ðŸ˜|ðŸ˜”|ðŸ˜¢|ðŸ˜¤|ðŸ¤©/g,""]
  ];

  function shouldSkip(node){
    var parent=node&&node.parentElement;
    return !!(parent&&parent.closest(protectedSelector));
  }

  function activeSurface(event){
    var page=event&&event.detail&&event.detail.page;
    if(page){
      var pageRoot=document.getElementById("page-"+page);
      if(pageRoot)return pageRoot;
    }
    var active=document.querySelector(".tab-content.active");
    if(active)return active;
    var auth=document.getElementById("auth-screen");
    if(auth&&getComputedStyle(auth).display!=="none")return auth;
    var profile=document.getElementById("profile-screen");
    if(profile&&getComputedStyle(profile).display!=="none")return profile;
    return document.getElementById("main-content")||document.body||document;
  }

  function cleanText(value){
    var result=String(value||"");
    var before=result;
    textReplacements.forEach(function(pair){
      result=result.replace(pair[0],pair[1]);
    });
    if(result!==before){
      result=result
        .replace(/\s{2,}/g," ")
        .replace(/\s+([,.!?;:])/g,"$1")
        .replace(/^\s+|\s+$/g,function(match){return match.indexOf("\n")>=0?match:"";});
    }
    return result;
  }

  function cleanTextNodes(root){
    var walker=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT,{
      acceptNode:function(node){
        if(!node.nodeValue||shouldSkip(node))return NodeFilter.FILTER_REJECT;
        return /[âðÃÂ]/.test(node.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
      }
    });
    var node;
    while((node=walker.nextNode())){
      node.nodeValue=cleanText(node.nodeValue);
    }
  }

  function cleanAttributes(root){
    var attrs=["placeholder","title","aria-label","data-ethone-tooltip"];
    Array.prototype.forEach.call((root||document).querySelectorAll("*"),function(el){
      if(el.closest(protectedSelector))return;
      attrs.forEach(function(attr){
        var value=el.getAttribute&&el.getAttribute(attr);
        if(value&&/[âðÃÂ]/.test(value))el.setAttribute(attr,cleanText(value));
      });
    });
  }

  function normalizeCloseButtons(root){
    [
      ".modal-close",
      ".notif-panel-close",
      ".pres-close",
      ".side-panel-close",
      ".window-close"
    ].forEach(function(selector){
      Array.prototype.forEach.call((root||document).querySelectorAll(selector),function(button){
        if(!button.textContent.trim()||/[âÃ]/.test(button.textContent))button.textContent="x";
        if(!button.getAttribute("aria-label"))button.setAttribute("aria-label","Fermer");
        if(button.tagName==="BUTTON"&&!button.type)button.type="button";
      });
    });
  }

  function normalizeModalTitles(root){
    Array.prototype.forEach.call((root||document).querySelectorAll(".modal-title"),function(title){
      if(title.closest(protectedSelector))return;
      title.textContent=cleanText(title.textContent).replace(/^\s+|\s+$/g,"");
    });
  }

  function normalizeCommandPalette(root){
    var base=root||document;
    var input=base.querySelector&&base.querySelector("#cmd-input");
    if(input)input.setAttribute("autocomplete","off");

    Array.prototype.forEach.call(base.querySelectorAll?base.querySelectorAll("#cmd-footer .cmd-k"):[],function(key){
      key.textContent=cleanText(key.textContent).trim()||key.textContent;
    });
  }

  function normalizeNotificationPanel(root){
    var emptyIcon=(root||document).querySelector(".notif-empty-icon");
    if(emptyIcon&&/[âðÃÂ]/.test(emptyIcon.textContent||"")){
      emptyIcon.textContent="";
      emptyIcon.setAttribute("aria-hidden","true");
      emptyIcon.innerHTML='<i data-lucide="bell" aria-hidden="true"></i>';
    }
  }

  function normalizeLinkPreview(root){
    var base=root||document;
    var banner=base.querySelector&&base.querySelector("#link-preview-banner");
    if(banner&&/[âðÃÂ]/.test(banner.textContent||"")){
      banner.textContent="";
      banner.innerHTML='<i data-lucide="link" aria-hidden="true"></i>';
    }
    var title=base.querySelector&&base.querySelector("#link-preview-title");
    if(title)title.textContent=cleanText(title.textContent);
  }

  function repairMoodButtons(root){
    var moods=[
      ["\uD83D\uDE04","Great"],
      ["\uD83D\uDE42","Good"],
      ["\uD83D\uDE10","Neutral"],
      ["\uD83D\uDE14","Low"],
      ["\uD83D\uDE22","Sad"],
      ["\uD83D\uDE24","Stressed"],
      ["\uD83E\uDD29","Amazing"]
    ];
    Array.prototype.forEach.call((root||document).querySelectorAll("#journal-mood-picks button"),function(button,index){
      var mood=moods[index];
      if(!mood)return;
      button.textContent=mood[0];
      button.dataset.mood=mood[0];
      button.setAttribute("aria-label",mood[1]);
      button.onclick=function(){
        if(typeof window.selectMood==="function")window.selectMood(mood[0],mood[1]);
      };
    });
  }

  function normalizeUploadLabels(root){
    Array.prototype.forEach.call((root||document).querySelectorAll(".upload-zone-text"),function(label){
      if(/[âðÃÂ]/.test(label.textContent||""))label.innerHTML=cleanText(label.innerHTML);
    });
  }

  function normalizeEmptyStates(root){
    Array.prototype.forEach.call((root||document).querySelectorAll(".live-panel-empty"),function(empty){
      var text=(empty.textContent||"").trim();
      if(!text||text.indexOf("Aucun widget actif")!==-1){
        empty.textContent="Aucun widget actif. Ajoute un widget depuis le bouton +.";
      }
      empty.classList.add("ethone-polished-empty-state");
    });
  }

  function normalizeActionButtons(root){
    Array.prototype.forEach.call((root||document).querySelectorAll("button,[role='button']"),function(button){
      if(button.tagName==="BUTTON"&&!button.type)button.type="button";
      if(button.disabled||button.getAttribute("aria-disabled")==="true")button.classList.add("ethone-is-disabled");
      var label=(button.textContent||button.getAttribute("aria-label")||button.title||"").trim();
      if(label&&/[âðÃÂ]/.test(label)){
        if(button.children.length===0)button.textContent=cleanText(label);
        else button.setAttribute("aria-label",cleanText(label));
      }
    });
  }

  function refreshLucide(root){
    if(window.ETHONEIconSystem&&typeof window.ETHONEIconSystem.apply==="function"){
      try{window.ETHONEIconSystem.apply(root||document);return}catch(e){}
    }
    if(window.lucide&&typeof window.lucide.createIcons==="function"){
      try{window.lucide.createIcons();}catch(e){}
    }
  }

  function run(root){
    if(!document.body)return;
    root=root||activeSurface();
    document.documentElement.classList.add("ethone-final-product-polish");
    cleanTextNodes(root);
    cleanAttributes(root);
    normalizeCloseButtons(root);
    normalizeModalTitles(root);
    normalizeCommandPalette(root);
    normalizeNotificationPanel(root);
    normalizeLinkPreview(root);
    repairMoodButtons(root);
    normalizeUploadLabels(root);
    normalizeEmptyStates(root);
    normalizeActionButtons(root);
    refreshLucide(root);
  }

  function schedule(root){
    if(root&&root.nodeType)pendingRoot=root;
    if(scheduled)return;
    scheduled=true;
    window.requestAnimationFrame(function(){
      scheduled=false;
      var target=pendingRoot||activeSurface();
      pendingRoot=null;
      run(target);
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){schedule(activeSurface())},{once:true});
  else schedule(activeSurface());

  window.addEventListener("ethone:dashboard-ready",function(){schedule(document)});
  window.addEventListener("ethone:profile-ready",function(){schedule(document.getElementById("profile-screen")||document)});
  window.addEventListener("ethone:page-ready",function(event){schedule(activeSurface(event))});
  window.addEventListener("ethone:lazy-group-loaded",function(event){schedule(activeSurface(event))});
  window.addEventListener("ethone:command-palette-rendered",function(){schedule(document.getElementById("command-palette")||document.getElementById("cmd-palette-overlay")||activeSurface())});

  window.ETHONEFinalProductPolish={
    run:run,
    schedule:schedule,
    cleanText:cleanText
  };
})();
