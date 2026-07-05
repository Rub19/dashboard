/* ETHONE sidebar V7 — shared floating tooltip for compact mode. */
(function(){
  "use strict";
  var tip=null;
  function ensureTip(){
    if(tip)return tip;
    tip=document.createElement('div');
    tip.className='sb-tooltip';
    tip.setAttribute('role','tooltip');
    document.body.appendChild(tip);
    // Force a layout flush so the entrance transition reliably plays even
    // when requestAnimationFrame is throttled (e.g. background tab).
    void tip.offsetWidth;
    return tip;
  }
  function labelFor(el){
    if(el.classList.contains('nav-item')){
      var t=el.querySelector('.nav-label-text');
      return t?t.textContent:'';
    }
    var name=el.querySelector('.sb-wc-name');
    return name?name.textContent:(el.getAttribute('title')||'');
  }
  function isTruncated(el){
    var labelEl=el.querySelector('.nav-label-text');
    return !!(labelEl&&labelEl.scrollWidth>labelEl.clientWidth+1);
  }
  function show(el){
    var text=(labelFor(el)||'').trim();
    if(!text||text==='—')return;
    var t=ensureTip();
    t.textContent=text;
    var r=el.getBoundingClientRect();
    t.style.top=(r.top+r.height/2)+'px';
    t.style.left=(r.right+10)+'px';
    t.classList.add('visible');
  }
  function hide(){
    if(tip)tip.classList.remove('visible');
  }
  document.addEventListener('mouseover',function(e){
    var sidebar=document.querySelector('.sidebar');
    var compactEl=e.target.closest('.sidebar.compact .nav-item, .sidebar.compact .sb-widget-card');
    if(compactEl){show(compactEl);return;}
    if(sidebar&&!sidebar.classList.contains('compact')){
      var navEl=e.target.closest('.sidebar .nav-item');
      if(navEl&&isTruncated(navEl))show(navEl);
    }
  });
  document.addEventListener('mouseout',function(e){
    var el=e.target.closest('.nav-item,.sb-widget-card');
    if(el)hide();
  });
  document.addEventListener('scroll',hide,true);
  window.addEventListener('resize',hide);
})();
