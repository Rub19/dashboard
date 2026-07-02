/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
  if(window.__ethoneBootWatchdog)return;
  window.__ethoneBootWatchdog=true;
  var BOOT_TIMEOUT=window.ETHONE_LIGHT_BOOT_MODE?1800:5000;
  var ERROR_TEXT="ETHONE a demarre en mode secours: une ressource externe ou une synchronisation a pris trop de temps.";
  function visible(el){if(!el)return false;var cs=getComputedStyle(el);return cs.display!=="none"&&cs.visibility!=="hidden"&&el.getBoundingClientRect().width>20&&el.getBoundingClientRect().height>20}
  function removeAntiFlash(){var af=document.getElementById("anti-flash");if(af)af.remove()}
  function hideBoot(){["nexus-boot-screen","ethone-boot-screen","nexus-page-loader","nexus-page-transition"].forEach(function(id){var el=document.getElementById(id);if(el){el.style.setProperty("display","none","important");el.style.setProperty("visibility","hidden","important");el.style.opacity="0"}})}
  function showWarning(){if(document.getElementById("ethone-boot-warning"))return;var div=document.createElement("div");div.id="ethone-boot-warning";div.className="ethone-boot-warning";div.setAttribute("role","status");div.textContent=ERROR_TEXT;document.body.appendChild(div)}
  function showFallback(){
    if(!document.body){setTimeout(showFallback,250);return;}
    removeAntiFlash();hideBoot();
    var main=document.getElementById("main-content"),profile=document.getElementById("profile-screen"),auth=document.getElementById("auth-screen"),password=document.getElementById("password-screen");
    if(visible(main)||visible(profile)||visible(auth)||visible(password))return;
    if(auth){auth.style.setProperty("display","grid","important");auth.style.setProperty("visibility","visible","important");auth.style.opacity="1";var card=document.getElementById("auth-card")||document.getElementById("lb-box");if(card){card.style.setProperty("display","block","important");card.style.setProperty("visibility","visible","important");card.style.opacity="1"}}
    else if(main){main.style.setProperty("display","block","important");main.style.setProperty("visibility","visible","important")}
    showWarning();
  }
  window.ethoneBootFallback=showFallback;
  window.addEventListener("error",function(){setTimeout(showFallback,0)});
  window.addEventListener("unhandledrejection",function(){setTimeout(showFallback,0)});
  setTimeout(showFallback,BOOT_TIMEOUT);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(showFallback,BOOT_TIMEOUT)});
  else setTimeout(showFallback,BOOT_TIMEOUT);
  window.addEventListener("load",function(){setTimeout(showFallback,BOOT_TIMEOUT)});
})();
