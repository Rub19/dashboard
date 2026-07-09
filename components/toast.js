/* ETHONE legacy compatibility module: toast. */
// ===================================================
//  TOAST
// ===================================================
(function(){
  "use strict";
  var active=Object.create(null);
  var limit=5;
  function esc(value){
    if(typeof window.escapeHTML==="function")return window.escapeHTML(value);
    return String(value==null?"":value).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }
  function fallbackToast(msg,type){
    msg=String(msg||"").trim();
    if(!msg)return;
    if(typeof window.ethoneToast==="function")return window.ethoneToast(msg,type||"info");
    if(msg.toLowerCase().indexOf("action indisponible")!==-1)msg="Fonctionnalite bientot disponible ou module en cours de chargement.";
    var host=document.getElementById("toasts");
    if(!host){
      host=document.createElement("div");
      host.id="toasts";
      document.body.appendChild(host);
    }
    var key=(type||"info")+"|"+msg.toLowerCase();
    var existing=active[key];
    if(existing&&existing.parentNode){
      existing.dataset.count=String((parseInt(existing.dataset.count||"1",10)||1)+1);
      return;
    }
    var el=document.createElement("div");
    el.className="toast "+(type||"info");
    el.dataset.count="1";
    el.innerHTML='<span aria-hidden="true">'+(type==="success"?"OK":type==="error"?"!":"i")+'</span> '+esc(msg)+' <button type="button" aria-label="Fermer">x</button>';
    active[key]=el;
    host.appendChild(el);
    Array.prototype.slice.call(host.children).slice(0,-limit).forEach(function(child){child.remove()});
    var close=function(){
      delete active[key];
      el.style.opacity="0";
      el.style.transition="opacity .22s ease, transform .22s ease";
      el.style.transform="translateY(6px)";
      setTimeout(function(){if(el.parentNode)el.remove()},240);
    };
    var btn=el.querySelector("button");
    if(btn)btn.onclick=close;
    setTimeout(close,type==="error"?6200:3600);
  }
  window.toast=fallbackToast;
})();
