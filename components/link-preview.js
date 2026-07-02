/* ETHONE legacy compatibility module: link-preview. */
//  LINK HOVER PREVIEW
// ══════════════════════════════════════════════════════════════
let _lpTO=null,_lpHideTO=null;
function initLinkPreviews(){
  const preview=document.getElementById('link-preview');if(!preview)return;
  document.addEventListener('mouseover',e=>{
    const link=e.target.closest('[data-preview-url],.link-card,.pinned-card,.item-row[data-url]');
    if(!link)return;
    const url=link.dataset.previewUrl||link.href||link.dataset.url;
    if(!url||!url.startsWith('http'))return;
    clearTimeout(_lpHideTO);clearTimeout(_lpTO);
    _lpTO=setTimeout(()=>showLinkPreview(url,e),500);
  });
  document.addEventListener('mouseout',e=>{
    const link=e.target.closest('[data-preview-url],.link-card,.pinned-card,.item-row[data-url]');
    if(!link)return;
    clearTimeout(_lpTO);
    _lpHideTO=setTimeout(()=>preview.classList.remove('visible'),150);
  });
  document.addEventListener('mousemove',e=>{
    if(preview.classList.contains('visible')){
      const W=window.innerWidth,H=window.innerHeight,pw=290,ph=150;
      let l=e.clientX+16,t=e.clientY+16;
      if(l+pw>W)l=e.clientX-pw-8;if(t+ph>H)t=e.clientY-ph-8;
      preview.style.left=l+'px';preview.style.top=t+'px';
    }
  });
}
function showLinkPreview(url,e){
  const preview=document.getElementById('link-preview');if(!preview)return;
  try{
    const domain=new URL(url).hostname.replace('www.','');
    document.getElementById('link-preview-title').textContent=domain;
    document.getElementById('link-preview-url').textContent=url.replace(/^https?:\/\/(www\.)?/,'').slice(0,50);
    document.getElementById('link-preview-banner').innerHTML=`<div style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:100%"><img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" style="width:32px;height:32px;border-radius:8px" onerror="this.style.display='none'"><span style="font-size:13px;color:rgba(139,92,246,.8);font-family:var(--mono)">${escapeHTML(domain)}</span></div>`;
    const W=window.innerWidth,H=window.innerHeight,pw=290,ph=150;
    let l=e.clientX+16,t=e.clientY+16;
    if(l+pw>W)l=e.clientX-pw-8;if(t+ph>H)t=e.clientY-ph-8;
    preview.style.left=l+'px';preview.style.top=t+'px';
    preview.classList.add('visible');
  }catch(err){}
}

// ══════════════════════════════════════════════════════════════
