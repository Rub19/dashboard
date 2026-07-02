/* ETHONE legacy compatibility module: resizable-sidebar. */
//  RESIZABLE SIDEBAR
// ===================================================
(function(){
  const handle = document.getElementById('resize-handle');
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main');
  if(!handle||!sidebar||!main) return;

  // Restore saved width
  const savedW = parseInt(localStorage.getItem('sb_width')||'240');
  const w = Math.min(Math.max(savedW, 160), 400);
  sidebar.style.width = w+'px';
  main.style.marginLeft = w+'px';
  handle.style.left = w+'px';

  let dragging = false, startX = 0, startW = 0;

  handle.addEventListener('mousedown', e=>{
    dragging = true;
    startX = e.clientX;
    startW = sidebar.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e=>{
    if(!dragging) return;
    const newW = Math.min(Math.max(startW + (e.clientX - startX), 160), 400);
    sidebar.style.width = newW+'px';
    main.style.marginLeft = newW+'px';
    handle.style.left = newW+'px';
    // also update nowplaying iframe scale dynamically
    const availW = newW - 24;
    const scale = Math.min(availW / 310, 0.95);
    const iframe = document.getElementById('nowplaying-iframe');
    if(iframe){
      iframe.style.transform = 'translateX(-50%) scale('+scale.toFixed(3)+')';
      const wrap = document.getElementById('nowplaying-iframe-wrap');
      if(wrap) wrap.style.height = Math.round(68*scale)+'px';
    }
  });

  document.addEventListener('mouseup', ()=>{
    if(!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    localStorage.setItem('sb_width', sidebar.offsetWidth);
  });
})();


// ===================================================
