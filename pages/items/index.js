/* ETHONE legacy compatibility module: items. */
// ===================================================
//  ITEMS / FILES
// ===================================================
const tIcons={file:'\uD83D\uDCC4',doc:'\uD83D\uDCC4',link:'\uD83D\uDD17',image:'\uD83D\uDDBC\uFE0F',folder:'\uD83D\uDCC1',code:'\uD83D\uDCBB',video:'\uD83C\uDFAC'};
const tClass={file:'doc',doc:'doc',link:'link',image:'img',folder:'folder',code:'code',video:'video'};
let curCat='all';
function switchCategory(cat,el){curCat=cat;document.querySelectorAll('.cat-tab').forEach(t=>t.classList.remove('active'));if(el)el.classList.add('active');renderItems()}

function addItem(){
  const p=curP();if(!p)return;
  const name=document.getElementById('item-name').value.trim();
  const tag=document.getElementById('item-tag').value.trim();
  const tab=_itemCurrentTab||'link';
  const date=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'});

  if(!name){toast('Please enter a name','error');return;}

  if(tab==='link'){
    const url=document.getElementById('item-url').value.trim();
    if(!url){toast('Please enter a URL','error');return;}
    p.state.items.unshift({id:Date.now(),name,type:'link',url,tag,date});
  } else if(tab==='file'){
    const url=document.getElementById('item-url').value.trim();
    const meta=_itemFileData?`${_itemFileData.name} · ${(_itemFileData.size/1024).toFixed(1)} KB`:'';
    p.state.items.unshift({id:Date.now(),name,type:'file',url:url||'',tag,date,meta});
  } else if(tab==='folder'){
    const fileCount=_itemFolderFiles.length;
    const fileList=_itemFolderFiles.slice(0,20).map(f=>f.name).join(', ')+(fileCount>20?`... +${fileCount-20} more`:'');
    p.state.items.unshift({id:Date.now(),name,type:'folder',url:'',tag,date,
      meta:fileCount?`${fileCount} file${fileCount>1?'s':''}`:'' ,
      files:_itemFolderFiles.slice(0,50)
    });
  } else if(tab==='image'){
    if(!_itemImageData){toast('Please select an image','error');return;}
    p.state.items.unshift({id:Date.now(),name,type:'image',url:'',tag,date,imageData:_itemImageData});
  }

  _itemFileData=null;_itemImageData=null;_itemFolderFiles=[];
  saveStateNow();closeModal('add-item');
  ['item-name','item-url','item-tag'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  // Reset upload labels
  const fl=document.getElementById('item-file-label');if(fl)fl.innerHTML='📄 Click to choose a file, or drag & drop<br><span style="font-size:11px;color:var(--muted)">Any file type</span>';
  const il=document.getElementById('item-image-label');if(il)il.innerHTML='🖼️ Click to choose an image';
  const ip=document.getElementById('item-image-preview');if(ip)ip.style.display='none';
  const fol=document.getElementById('item-folder-label');if(fol)fol.innerHTML='📁 Click to choose a folder<br><span style="font-size:11px;color:var(--muted)">Lists all files inside</span>';
  renderItems();updateStats();renderRecentItems();
  addActivity(name+' added','var(--accent)');toast(name+' added!','success');
}

function deleteItem(id){
  const p=curP();if(!p)return;
  const item=p.state.items.find(i=>i.id===id);
  p.state.items=p.state.items.filter(i=>i.id!==id);saveStateNow();
  renderItems();updateStats();renderRecentItems();
  if(item)addActivity(item.name+' removed','var(--accent3)');toast('Removed','info');
}

function filterItems(){renderItems()}

function renderItems(){
  const list=document.getElementById('files-list');if(!list)return;
  const p=curP(),all=p?(p.state.items||[]):[];
  const q=(document.getElementById('files-search')?.value||'').toLowerCase();
  let items=all;
  if(curCat==='files')items=items.filter(i=>['file','folder','code','video'].includes(i.type));
  if(curCat==='links')items=items.filter(i=>i.type==='link');
  if(curCat==='images')items=items.filter(i=>i.type==='image');
  if(q)items=items.filter(i=>(i.name||'').toLowerCase().includes(q)||(i.tag&&(i.tag||'').toLowerCase().includes(q)));
  const ls=document.getElementById('links-showcase'),lg=document.getElementById('links-grid-inner');
  const lItems=all.filter(i=>i.type==='link');
  if(lItems.length&&(curCat==='all'||curCat==='links')){
    ls.style.display='block';
    lg.innerHTML=lItems.slice(0,4).map(i=>{
      const url=safeUrl(i.url);
      let iconHtml='';
      if(url){
        try{
          const domain=new URL(url).hostname;
          iconHtml='<img src="https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=64" style="width:22px;height:22px;border-radius:4px;image-rendering:auto" onerror="this.outerHTML=\'&#128279;\'">';
        }catch(e){iconHtml='&#128279;';}
      } else iconHtml=tIcons[i.type]||'&#128196;';
      return '<a class="link-card" href="'+escapeHTML(url||'#')+'" target="_blank" rel="noopener noreferrer"><div class="link-favicon">'+iconHtml+'</div><div><div class="link-name">'+escapeHTML(i.name)+'</div><div class="link-url">'+(url?escapeHTML(url.replace(/https?:\/\//,'').slice(0,30)):'No URL')+'</div></div></a>';
    }).join('');
  } else ls.style.display='none';
  if(!items.length){list.innerHTML='<div class="empty-state"><div class="empty-icon"></div>No items'+(q?' matching "'+escapeHTML(q)+'"':'')+'.<br>Click <strong>+ Add item</strong>.</div>';return}
  list.innerHTML=items.map(i=>{
    const url=safeUrl(i.url);
    // Icon/thumbnail
    let iconHtml='';
    if(i.type==='image'&&i.imageData){
      iconHtml=`<img src="${i.imageData}" style="width:100%;height:100%;object-fit:cover;border-radius:7px" onerror="this.outerHTML='🖼️'">`;
    } else {
      iconHtml=tIcons[i.type]||'\uD83D\uDCC4';
    }
    // Meta line
    let meta=escapeHTML(i.date||'');
    if(i.meta)meta+=` · <span style="color:var(--muted)">${escapeHTML(i.meta)}</span>`;
    if(i.tag)meta+=` · <span style="color:var(--accent)">${escapeHTML(i.tag)}</span>`;
    if(url)meta+=` · <span style="color:var(--muted);font-size:10px">${escapeHTML(url.replace(/https?:\/\//,'').slice(0,30))}</span>`;
    return `<div class="item-row" onclick="openItem(${i.id})">
      <div class="item-icon ${tClass[i.type]||'doc'}">${iconHtml}</div>
      <div class="item-info">
        <div class="item-name">${escapeHTML(i.name)}</div>
        <div class="item-meta">${meta}</div>
      </div>
      ${url?`<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:var(--muted);font-size:13px;text-decoration:none;flex-shrink:0">\uD83D\uDD17</a>`:''}
      <div class="item-actions"><button class="item-btn" onclick="event.stopPropagation();deleteItem(${i.id})">\uD83D\uDDD1\uFE0F</button></div>
    </div>`;
  }).join('');
}


function openItem(id){
  const p=curP();if(!p)return;
  const item=p.state.items.find(i=>i.id===id);if(!item)return;

  if(item.type==='image'&&item.imageData){
    // Show image in a lightbox
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out';
    overlay.onclick=()=>overlay.remove();
    overlay.innerHTML=`<div style="position:relative;max-width:90vw;max-height:90vh">
      <img src="${item.imageData}" style="max-width:100%;max-height:90vh;border-radius:var(--r-md);object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,.8)">
      <button onclick="event.stopPropagation();this.closest('[style*=fixed]').remove()" style="position:absolute;top:-12px;right:-12px;background:var(--surface3);border:1px solid var(--border2);color:var(--text);border-radius:50%;width:28px;height:28px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      <div style="text-align:center;margin-top:10px;font-size:13px;color:rgba(255,255,255,.7)">${escapeHTML(item.name)}</div>
    </div>`;
    document.body.appendChild(overlay);
    return;
  }

  if(item.type==='folder'&&item.files?.length){
    // Show folder contents
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
    const fileList=item.files.map(f=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--surface2);border-radius:6px;font-size:12px">
      <span>📄</span><span style="flex:1">${escapeHTML(f.name)}</span>
      <span style="color:var(--muted)">${f.size?(f.size/1024).toFixed(1)+' KB':''}</span>
    </div>`).join('');
    overlay.innerHTML=`<div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--r-md);padding:24px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:16px;font-weight:700">📁 ${escapeHTML(item.name)}</div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer">✕</button>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">${item.files.length} file${item.files.length>1?'s':''}</div>
      <div style="display:flex;flex-direction:column;gap:4px">${fileList}</div>
    </div>`;
    document.body.appendChild(overlay);
    return;
  }

  const url=safeUrl(item.url);
  if(url)window.open(url,'_blank','noopener,noreferrer');
  else if(!item.imageData&&!item.files)toast('No URL for this item','info');
  addActivity('Opened '+item.name,'var(--accent2)');
}

function renderRecentItems(){
  const list=document.getElementById('recent-items-list');if(!list)return;
  const p=curP(),recent=p?(p.state.items||[]).slice(0,5):[];
  if(!recent.length){list.innerHTML='<div class="empty-state"><div class="empty-icon"></div>No items yet!</div>';return}
  list.innerHTML=recent.map(i=>'<div class="item-row" onclick="openItem('+i.id+')"><div class="item-icon '+(tClass[i.type]||'doc')+'" style="width:28px;height:28px;font-size:12px;border-radius:7px">'+(tIcons[i.type]||'\uD83D\uDCC4')+'</div><div class="item-info"><div class="item-name">'+escapeHTML(i.name)+'</div><div class="item-meta">'+escapeHTML(i.date)+(i.tag?' . '+escapeHTML(i.tag):'')+'</div></div></div>').join('');
}
