/* ETHONE Micro Interactions Controller
   Delegated feedback layer: hover, focus, clicks, inputs, switches,
   dropdowns, cards, notifications, optional sound and haptics. */
(function(){
  "use strict";

  const keys={
    feedback:"ethone:micro:feedback",
    sound:"ethone:micro:sound",
    haptics:"ethone:micro:haptics"
  };

  const interactiveSelector=[
    "button","a[href]","[role='button']","[role='tab']","[role='menuitem']",
    ".btn",".panel-action",".nav-item",".cat-tab",".settings-nav-item",
    ".dropdown-item",".context-menu-item",".cmd-item",".notif-item",
    ".pdock-item",".de-chip",".item-row",".todo-item",".note-list-item",
    ".kanban-card",".link-card",".pinned-card",".stat-card",".panel",
    ".settings-card",".conn-card",".game-card",".d4-card",".d4-widget",
    ".db-card",".db-list-row",".va-panel",".timeline-card",".timeline-event",
    ".ph-card",".ui-button",".ui-card[data-interactive='true']",".ui-widget[data-interactive='true']"
  ].join(",");

  const inputSelector="input,textarea,select,.ui-input,.ui-search,.modal-input,.lb-input";
  const toggleSelector="input[type='checkbox'],input[type='radio'],.ui-switch,label.ui-switch,.toggle,[role='switch']";

  function readBool(key,def){
    const value=localStorage.getItem(key);
    if(value===null)return def;
    return value==="1"||value==="true";
  }

  function writeBool(key,value){
    localStorage.setItem(key,value?"1":"0");
  }

  function prefs(){
    return {
      feedback:readBool(keys.feedback,true),
      sound:readBool(keys.sound,false),
      haptics:readBool(keys.haptics,false)
    };
  }

  function applyPrefs(){
    const p=prefs();
    document.documentElement.classList.toggle("ethone-micro-feedback",p.feedback);
    document.documentElement.classList.toggle("ethone-micro-sound",p.sound);
    document.documentElement.classList.toggle("ethone-micro-haptics",p.haptics);
  }

  function setPref(name,value){
    if(!keys[name])return;
    writeBool(keys[name],!!value);
    applyPrefs();
    syncSettingsCard();
  }

  function feedbackEnabled(){
    return prefs().feedback;
  }

  function soundEnabled(){
    return prefs().sound;
  }

  function hapticsEnabled(){
    return prefs().haptics&&"vibrate" in navigator;
  }

  function haptic(pattern){
    if(!hapticsEnabled())return;
    try{navigator.vibrate(pattern||8);}catch(e){}
  }

  function classify(el){
    if(!el)return "soft";
    if(el.matches(".nav-item,.settings-nav-item,.pdock-item"))return "nav";
    if(el.matches(".btn-primary,.primary,[data-variant='primary'],.modal-submit"))return "success";
    if(el.matches("input,textarea,select"))return "focus";
    return "soft";
  }

  function pulse(el,kind){
    if(!feedbackEnabled()||!el)return;
    el.classList.remove(kind);
    void el.offsetWidth;
    el.classList.add(kind);
    window.setTimeout(()=>el.classList.remove(kind),360);
  }

  function setPointerVars(el,event){
    if(!feedbackEnabled()||!el||!event)return;
    const rect=el.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const x=((event.clientX-rect.left)/rect.width)*100;
    const y=((event.clientY-rect.top)/rect.height)*100;
    el.style.setProperty("--mi-x",Math.max(0,Math.min(100,x)).toFixed(1)+"%");
    el.style.setProperty("--mi-y",Math.max(0,Math.min(100,y)).toFixed(1)+"%");
  }

  function bindDelegatedEvents(){
    if(document.documentElement.dataset.microInteractionsBound==="1")return;
    document.documentElement.dataset.microInteractionsBound="1";

    document.addEventListener("pointerover",function(event){
      const el=event.target.closest(interactiveSelector);
      if(!el||!feedbackEnabled())return;
      el.classList.add("mi-hover-ready");
      setPointerVars(el,event);
    },{passive:true});

    document.addEventListener("pointermove",function(event){
      const el=event.target.closest(".panel,.stat-card,.settings-card,.conn-card,.game-card,.d4-card,.d4-widget,.db-card,.va-panel,.timeline-card,.ph-card");
      if(el)setPointerVars(el,event);
    },{passive:true});

    document.addEventListener("focusin",function(event){
      const input=event.target.closest(inputSelector);
      if(input){
        input.classList.add("mi-input-active");
        pulse(input,"mi-focus-pulse");
        haptic(5);
      }
    },true);

    document.addEventListener("focusout",function(event){
      const input=event.target.closest(inputSelector);
      if(input)input.classList.remove("mi-input-active");
    },true);

    document.addEventListener("click",function(event){
      const el=event.target.closest(interactiveSelector);
      if(!el||el.disabled)return;
      pulse(el,"mi-clicked");
      const type=classify(el);
      haptic(type==="success"?[8,24,8]:6);
    },{passive:true});

    document.addEventListener("change",function(event){
      const el=event.target.closest(toggleSelector);
      if(!el)return;
      pulse(el,"mi-toggle-pop");
      haptic(8);
    },true);

    document.addEventListener("input",function(event){
      const input=event.target.closest(inputSelector);
      if(!input||input.dataset.miTyping==="1")return;
      input.dataset.miTyping="1";
      pulse(input,"mi-focus-pulse");
      window.setTimeout(()=>{delete input.dataset.miTyping;},180);
    },true);
  }

  function observeDynamicFeedback(){
    if(!("MutationObserver" in window)||document.documentElement.dataset.microObserverBound==="1")return;
    document.documentElement.dataset.microObserverBound="1";
    const observer=new MutationObserver(function(records){
      records.forEach(function(record){
        record.addedNodes&&Array.prototype.forEach.call(record.addedNodes,function(node){
          if(!(node instanceof HTMLElement))return;
          if(node.matches&&node.matches(".notif-item,.ethone-quality-toast-item,.toast,.notification-item")){
            node.classList.add("mi-new");
            haptic(8);
          }
          node.querySelectorAll&&node.querySelectorAll(".notif-item,.ethone-quality-toast-item,.toast,.notification-item").forEach(function(item){
            item.classList.add("mi-new");
          });
        });
      });
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function prefSwitch(name,label,sub){
    const p=prefs();
    return '<div class="mi-pref-row">'+
      '<div><strong>'+label+'</strong><span>'+sub+'</span></div>'+
      '<button type="button" class="mi-pref-switch" data-mi-pref="'+name+'" aria-pressed="'+(p[name]?'true':'false')+'" aria-label="'+label+'"></button>'+
    '</div>';
  }

  function installSettingsCard(){
    const root=document.getElementById("settings-theme")||document.getElementById("settings-notifications")||document.querySelector("#page-settings .settings-content");
    if(!root||document.getElementById("micro-interactions-settings"))return;
    const card=document.createElement("div");
    card.className="settings-card mi-pref-card";
    card.id="micro-interactions-settings";
    card.innerHTML=
      '<div class="settings-card-title">Micro interactions</div>'+
      prefSwitch("feedback","Visual feedback","Hover, focus, click and notification feedback across ETHONE.")+
      prefSwitch("sound","Interface sounds","Optional soft sounds for clicks and successful actions.")+
      prefSwitch("haptics","Mobile haptics","Optional vibration feedback on compatible touch devices.");
    root.appendChild(card);
    card.addEventListener("click",function(event){
      const btn=event.target.closest("[data-mi-pref]");
      if(!btn)return;
      const name=btn.dataset.miPref;
      const next=btn.getAttribute("aria-pressed")!=="true";
      setPref(name,next);
      if(name==="sound"&&next&&window.playClick)window.playClick("success",{force:true});
      if(name==="haptics"&&next)haptic([8,20,8]);
    });
  }

  function syncSettingsCard(){
    const p=prefs();
    document.querySelectorAll("[data-mi-pref]").forEach(function(btn){
      const name=btn.dataset.miPref;
      if(name in p)btn.setAttribute("aria-pressed",p[name]?"true":"false");
    });
  }

  function boot(){
    applyPrefs();
    bindDelegatedEvents();
    observeDynamicFeedback();
    installSettingsCard();
    syncSettingsCard();
    window.addEventListener("ethone:page-ready",function(){
      window.setTimeout(function(){
        installSettingsCard();
        syncSettingsCard();
      },80);
    });
  }

  window.ETHONEFeedback={
    prefs,
    setPref,
    soundEnabled,
    hapticsEnabled,
    haptic,
    refresh:boot
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
