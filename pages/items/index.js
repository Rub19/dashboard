/* ETHONE Files Explorer.
   Keeps legacy p.state.items storage, adds Finder/Explorer-style UX. */
const tIcons={file:'file',doc:'file',link:'link',image:'image',folder:'folder',code:'code',video:'video'};
const tClass={file:'doc',doc:'doc',link:'link',image:'img',folder:'folder',code:'code',video:'video'};

let curCat='all';
let _filesView=localStorage.getItem('ethone:files:view')||'grid';
let _filesSelectedId=null;
let _filesPreviewOpen=localStorage.getItem('ethone:files:preview')!=='0';
let _filesSort=localStorage.getItem('ethone:files:sort')||'recent';
let _filesPath=[];

function filesEsc(v){
  if(typeof escapeHTML==='function')return escapeHTML(v);
  return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]});
}

function filesToast(msg,type){
  if(typeof toast==='function')toast(msg,type||'info');
}

function fileIconSvg(type){
  const icons={
    folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5a2 2 0 0 1 2-2h4.2l2 2h6.8a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>',
    link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/></svg>',
    image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m20 16-4.2-4.2a2 2 0 0 0-2.8 0L6 19"/></svg>',
    code:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></svg>',
    video:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="12" height="12" rx="2"/><path d="m16 11 4-3v8l-4-3"/></svg>',
    file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z"/><path d="M14 3.5V8h4"/></svg>'
  };
  return icons[type]||icons.file;
}

function filesProfile(){
  try{return typeof curP==='function'?curP():null}catch(e){return null}
}

function filesState(){
  const p=filesProfile();
  if(!p)return null;
  if(!p.state)p.state={};
  if(!Array.isArray(p.state.items))p.state.items=[];
  if(!p.state.filesExplorer)p.state.filesExplorer={favorites:[],recent:[],tags:{},view:_filesView,preview:_filesPreviewOpen};
  if(!Array.isArray(p.state.filesExplorer.favorites))p.state.filesExplorer.favorites=[];
  if(!Array.isArray(p.state.filesExplorer.recent))p.state.filesExplorer.recent=[];
  if(!p.state.filesExplorer.tags)p.state.filesExplorer.tags={};
  return p.state.filesExplorer;
}

function itemId(item){return String(item&&item.id)}
function fileType(item){return item&&item.type==='doc'?'file':(item&&item.type)||'file'}
function itemTags(item){
  if(!item)return [];
  const tags=[];
  if(item.tag)tags.push(...String(item.tag).split(',').map(t=>t.trim()).filter(Boolean));
  const st=filesState();
  const extra=st&&st.tags&&st.tags[itemId(item)];
  if(Array.isArray(extra))extra.forEach(t=>{if(t&&!tags.includes(t))tags.push(t)});
  return tags.slice(0,8);
}
function isFavorite(item){
  const st=filesState();
  return !!(item&&item.favorite)||(st&&st.favorites||[]).includes(itemId(item));
}
function setFavorite(item,value){
  const p=filesProfile(),st=filesState(); if(!p||!st||!item)return;
  const id=itemId(item);
  st.favorites=(st.favorites||[]).filter(x=>x!==id);
  if(value)st.favorites.unshift(id);
  item.favorite=!!value;
  saveStateNow();
  renderItems();
}
function markRecent(item){
  const st=filesState(); if(!st||!item)return;
  const id=itemId(item);
  st.recent=[id].concat((st.recent||[]).filter(x=>x!==id)).slice(0,30);
}
function allItems(){
  const p=filesProfile();
  return p?(p.state.items||[]):[];
}
function selectedItem(){
  return allItems().find(i=>itemId(i)===String(_filesSelectedId))||filteredItems()[0]||null;
}

function switchCategory(cat,el){
  curCat=cat;
  document.querySelectorAll('#page-files .cat-tab,[data-files-filter]').forEach(t=>t.classList.remove('active'));
  if(el)el.classList.add('active');
  const btn=document.querySelector('[data-files-filter="'+cat+'"]');
  if(btn)btn.classList.add('active');
  renderItems();
}

function addItem(){
  const p=filesProfile();if(!p)return;
  const name=document.getElementById('item-name').value.trim();
  const tag=document.getElementById('item-tag').value.trim();
  const tab=_itemCurrentTab||'link';
  const date=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
  if(!name){filesToast('Please enter a name','error');return;}
  if(tab==='link'){
    const url=document.getElementById('item-url').value.trim();
    if(!url){filesToast('Please enter a URL','error');return;}
    p.state.items.unshift({id:Date.now(),name,type:'link',url,tag,date,createdAt:new Date().toISOString()});
  }else if(tab==='file'){
    const url=document.getElementById('item-url').value.trim();
    const meta=_itemFileData?`${_itemFileData.name} - ${(_itemFileData.size/1024).toFixed(1)} KB`:'';
    p.state.items.unshift({id:Date.now(),name,type:'file',url:url||'',tag,date,meta,createdAt:new Date().toISOString()});
  }else if(tab==='folder'){
    const fileCount=_itemFolderFiles.length;
    p.state.items.unshift({id:Date.now(),name,type:'folder',url:'',tag,date,meta:fileCount?`${fileCount} file${fileCount>1?'s':''}`:'',files:_itemFolderFiles.slice(0,50),createdAt:new Date().toISOString()});
  }else if(tab==='image'){
    if(!_itemImageData){filesToast('Please select an image','error');return;}
    p.state.items.unshift({id:Date.now(),name,type:'image',url:'',tag,date,imageData:_itemImageData,createdAt:new Date().toISOString()});
  }
  _itemFileData=null;_itemImageData=null;_itemFolderFiles=[];
  saveStateNow();closeModal('add-item');
  ['item-name','item-url','item-tag'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const fl=document.getElementById('item-file-label');if(fl)fl.innerHTML='Click to choose a file, or drag & drop<br><span style="font-size:11px;color:var(--muted)">Any file type</span>';
  const il=document.getElementById('item-image-label');if(il)il.innerHTML='Click to choose an image';
  const ip=document.getElementById('item-image-preview');if(ip)ip.style.display='none';
  const fol=document.getElementById('item-folder-label');if(fol)fol.innerHTML='Click to choose a folder<br><span style="font-size:11px;color:var(--muted)">Lists all files inside</span>';
  renderItems();updateStats();renderRecentItems();
  addActivity(name+' added','var(--accent)','content');filesToast(name+' added!','success');
}

function deleteItem(id){
  const p=filesProfile();if(!p)return;
  const item=p.state.items.find(i=>String(i.id)===String(id));
  p.state.items=p.state.items.filter(i=>String(i.id)!==String(id));
  const st=filesState();
  if(st){
    st.favorites=(st.favorites||[]).filter(x=>x!==String(id));
    st.recent=(st.recent||[]).filter(x=>x!==String(id));
    if(st.tags)delete st.tags[String(id)];
  }
  if(String(_filesSelectedId)===String(id))_filesSelectedId=null;
  saveStateNow();
  renderItems();updateStats();renderRecentItems();
  if(item)addActivity(item.name+' removed','var(--accent3)','content');
  filesToast('Removed','info');
}

function filterItems(){renderItems()}

function ensureFilesExplorer(){
  const page=document.getElementById('page-files');
  const list=document.getElementById('files-list');
  if(!page||!list)return false;
  page.classList.add('files-explorer-page');
  const topbar=page.querySelector('.topbar');
  if(topbar)topbar.classList.add('files-topbar');
  const tabs=page.querySelector('.cat-tabs');
  if(tabs)tabs.style.display='none';
  const showcase=document.getElementById('links-showcase');
  if(showcase)showcase.style.display='none';
  const panel=list.closest('.panel');
  if(!panel)return false;
  panel.classList.add('files-explorer-host');
  if(panel.querySelector('#files-explorer-shell'))return true;
  panel.innerHTML=[
    '<div class="files-explorer" id="files-explorer-shell">',
      '<aside class="files-sidebar" aria-label="Files sections">',
        '<button type="button" class="files-side-item active" data-files-filter="all">'+fileIconSvg('folder')+'<span>All files</span><b id="files-kpi-all">0</b></button>',
        '<button type="button" class="files-side-item" data-files-filter="recent">'+fileIconSvg('file')+'<span>Recent</span><b id="files-kpi-recent">0</b></button>',
        '<button type="button" class="files-side-item" data-files-filter="favorites">'+fileIconSvg('link')+'<span>Favorites</span><b id="files-kpi-fav">0</b></button>',
        '<button type="button" class="files-side-item" data-files-filter="files">'+fileIconSvg('file')+'<span>Documents</span></button>',
        '<button type="button" class="files-side-item" data-files-filter="links">'+fileIconSvg('link')+'<span>Links</span></button>',
        '<button type="button" class="files-side-item" data-files-filter="images">'+fileIconSvg('image')+'<span>Images</span></button>',
        '<div class="files-sidebar-label">Tags</div><div class="files-tags" id="files-tags"></div>',
      '</aside>',
      '<section class="files-main">',
        '<div class="files-toolbar">',
          '<div class="files-breadcrumb" id="files-breadcrumb"></div>',
          '<div class="files-tools">',
            '<select id="files-sort" class="files-select" aria-label="Sort files"><option value="recent">Recent</option><option value="name">Name</option><option value="type">Type</option><option value="favorite">Favorites</option></select>',
            '<div class="files-view-toggle" role="tablist" aria-label="Files view">',
              '<button type="button" data-files-view="grid">Grid</button>',
              '<button type="button" data-files-view="list">List</button>',
              '<button type="button" data-files-view="columns">Columns</button>',
            '</div>',
            '<button type="button" class="files-icon-btn" id="files-preview-toggle" aria-label="Toggle preview">'+fileIconSvg('image')+'</button>',
          '</div>',
        '</div>',
        '<div class="files-dropzone" id="files-dropzone"><strong>Drop files here</strong><span>They will be added to ETHONE as local references.</span></div>',
        '<div class="files-content" id="files-content"><div class="files-results" id="files-list"></div><aside class="files-preview" id="files-preview"></aside></div>',
      '</section>',
    '</div>'
  ].join('');
  bindFilesExplorer();
  return true;
}

function bindFilesExplorer(){
  const shell=document.getElementById('files-explorer-shell');
  if(!shell||shell.dataset.bound)return;
  shell.dataset.bound='1';
  shell.addEventListener('click',function(e){
    const filter=e.target.closest('[data-files-filter]');
    if(filter){switchCategory(filter.dataset.filesFilter,filter);return;}
    const view=e.target.closest('[data-files-view]');
    if(view){setFilesView(view.dataset.filesView);return;}
    const action=e.target.closest('[data-file-action]');
    if(action){
      e.stopPropagation();
      runFileAction(action.dataset.fileAction,action.dataset.fileId);
      return;
    }
    const card=e.target.closest('[data-file-id]');
    if(card){
      selectFile(card.dataset.fileId);
      if(e.detail>=2)openItem(card.dataset.fileId);
      return;
    }
  });
  shell.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&_filesSelectedId){openItem(_filesSelectedId);}
    if(e.key===' '&&_filesSelectedId){e.preventDefault();quickLook(_filesSelectedId);}
    if(e.key==='Delete'&&_filesSelectedId){deleteItem(_filesSelectedId);}
  });
  const sort=document.getElementById('files-sort');
  if(sort){
    sort.value=_filesSort;
    sort.addEventListener('change',function(){_filesSort=this.value;localStorage.setItem('ethone:files:sort',_filesSort);renderItems();});
  }
  const preview=document.getElementById('files-preview-toggle');
  if(preview)preview.addEventListener('click',function(){
    _filesPreviewOpen=!_filesPreviewOpen;
    localStorage.setItem('ethone:files:preview',_filesPreviewOpen?'1':'0');
    renderItems();
  });
  const drop=document.getElementById('files-dropzone');
  if(drop){
    ['dragenter','dragover'].forEach(type=>drop.addEventListener(type,function(e){e.preventDefault();drop.classList.add('is-dragover');}));
    ['dragleave','drop'].forEach(type=>drop.addEventListener(type,function(e){e.preventDefault();drop.classList.remove('is-dragover');}));
    drop.addEventListener('drop',handleExplorerDrop);
  }
}

function setFilesView(view){
  _filesView=['grid','list','columns'].includes(view)?view:'grid';
  localStorage.setItem('ethone:files:view',_filesView);
  const st=filesState(); if(st){st.view=_filesView;saveStateNow();}
  renderItems();
}

function selectFile(id){
  _filesSelectedId=String(id);
  markRecent(allItems().find(i=>itemId(i)===String(id)));
  const st=filesState(); if(st)saveStateNow();
  renderItems();
}

function filteredItems(){
  const all=allItems();
  const st=filesState();
  const q=(document.getElementById('files-search')?.value||'').toLowerCase().trim();
  let items=all.slice();
  if(curCat==='files')items=items.filter(i=>['file','folder','code','video','doc'].includes(fileType(i)));
  if(curCat==='links')items=items.filter(i=>fileType(i)==='link');
  if(curCat==='images')items=items.filter(i=>fileType(i)==='image');
  if(curCat==='favorites')items=items.filter(isFavorite);
  if(curCat==='recent'){
    const order=(st&&st.recent)||[];
    items=items.filter(i=>order.includes(itemId(i)));
    items.sort((a,b)=>order.indexOf(itemId(a))-order.indexOf(itemId(b)));
  }
  if(curCat&&curCat.indexOf('tag:')===0){
    const tag=curCat.slice(4).toLowerCase();
    items=items.filter(i=>itemTags(i).some(t=>t.toLowerCase()===tag));
  }
  if(q)items=items.filter(i=>{
    const hay=[i.name,i.type,i.tag,i.url,i.meta,itemTags(i).join(' ')].join(' ').toLowerCase();
    return hay.includes(q);
  });
  if(curCat!=='recent'){
    items.sort(function(a,b){
      if(_filesSort==='name')return String(a.name||'').localeCompare(String(b.name||''));
      if(_filesSort==='type')return String(fileType(a)).localeCompare(String(fileType(b)))||String(a.name||'').localeCompare(String(b.name||''));
      if(_filesSort==='favorite')return Number(isFavorite(b))-Number(isFavorite(a))||String(a.name||'').localeCompare(String(b.name||''));
      return Number(b.id||0)-Number(a.id||0);
    });
  }
  return items;
}

function renderItems(){
  if(!ensureFilesExplorer())return;
  const list=document.getElementById('files-list');if(!list)return;
  const items=filteredItems();
  const all=allItems();
  if(!_filesSelectedId&&items[0])_filesSelectedId=itemId(items[0]);
  if(_filesSelectedId&&!all.some(i=>itemId(i)===String(_filesSelectedId)))_filesSelectedId=items[0]?itemId(items[0]):null;
  const shell=document.getElementById('files-explorer-shell');
  shell.dataset.view=_filesView;
  shell.classList.toggle('preview-open',_filesPreviewOpen);
  document.querySelectorAll('[data-files-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.filesView===_filesView));
  document.querySelectorAll('[data-files-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.filesFilter===curCat));
  const sort=document.getElementById('files-sort'); if(sort&&sort.value!==_filesSort)sort.value=_filesSort;
  updateFilesKpis(all);
  renderFilesTags(all);
  renderBreadcrumb();
  if(!items.length){
    list.innerHTML="<div class=\"files-empty\"><div>"+fileIconSvg('folder')+"</div><strong>No files found</strong><span>Drop files here, add a link, or change your filters.</span><button type=\"button\" class=\"btn btn-primary\" onclick=\"openModal('add-item')\">Add item</button></div>";
  }else if(_filesView==='list'){
    list.innerHTML='<div class="files-list-head"><span>Name</span><span>Kind</span><span>Tags</span><span>Date</span></div>'+items.map(renderFileListRow).join('');
  }else if(_filesView==='columns'){
    list.innerHTML=renderColumnsView(items);
  }else{
    list.innerHTML=items.map(renderFileCard).join('');
  }
  renderFilePreview();
}

function updateFilesKpis(all){
  const st=filesState();
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v)};
  set('files-kpi-all',all.length);
  set('files-kpi-recent',(st&&st.recent||[]).filter(id=>all.some(i=>itemId(i)===id)).length);
  set('files-kpi-fav',all.filter(isFavorite).length);
}

function renderFilesTags(all){
  const host=document.getElementById('files-tags');if(!host)return;
  const counts={};
  all.forEach(i=>itemTags(i).forEach(t=>{counts[t]=(counts[t]||0)+1;}));
  const tags=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]||a.localeCompare(b)).slice(0,12);
  host.innerHTML=tags.length?tags.map(t=>'<button type="button" class="files-tag '+(curCat==='tag:'+t?'active':'')+'" data-files-filter="tag:'+filesEsc(t)+'"><span>'+filesEsc(t)+'</span><b>'+counts[t]+'</b></button>').join(''):'<div class="files-muted">No tags yet</div>';
}

function renderBreadcrumb(){
  const host=document.getElementById('files-breadcrumb');if(!host)return;
  const label=curCat==='all'?'All files':curCat==='recent'?'Recent':curCat==='favorites'?'Favorites':curCat==='files'?'Documents':curCat==='links'?'Links':curCat==='images'?'Images':curCat.indexOf('tag:')===0?'Tag / '+curCat.slice(4):curCat;
  host.innerHTML='<button type="button" data-files-filter="all">ETHONE</button><span>/</span><button type="button" data-files-filter="'+filesEsc(curCat)+'">'+filesEsc(label)+'</button>';
}

function fileThumb(item){
  const type=fileType(item);
  if(type==='image'&&item.imageData)return '<img src="'+filesEsc(item.imageData)+'" alt="">';
  return fileIconSvg(type);
}
function fileKind(item){
  const type=fileType(item);
  if(type==='folder'&&item.files)return item.files.length+' files';
  if(type==='link')return 'Link';
  if(type==='image')return 'Image';
  if(type==='video')return 'Video';
  if(type==='code')return 'Code';
  return 'Document';
}
function fileDomain(item){
  const url=safeUrl(item&&item.url);
  if(!url)return '';
  try{return new URL(url).hostname.replace(/^www\./,'')}catch(e){return ''}
}
function renderTagPills(item){
  const tags=itemTags(item);
  return tags.length?tags.map(t=>'<span class="files-pill">'+filesEsc(t)+'</span>').join(''):'<span class="files-muted">No tags</span>';
}
function renderFileActions(item){
  const id=filesEsc(itemId(item));
  return '<div class="files-row-actions">'+
    '<button type="button" data-file-action="favorite" data-file-id="'+id+'" title="Favorite" aria-label="Favorite">'+(isFavorite(item)?'Starred':'Star')+'</button>'+
    '<button type="button" data-file-action="quicklook" data-file-id="'+id+'" title="Quick Look" aria-label="Quick Look">Preview</button>'+
    '<button type="button" data-file-action="delete" data-file-id="'+id+'" title="Delete" aria-label="Delete">Delete</button>'+
  '</div>';
}
function renderFileCard(item){
  const id=filesEsc(itemId(item));
  return '<article class="files-card '+(String(_filesSelectedId)===String(item.id)?'selected':'')+'" tabindex="0" data-file-id="'+id+'" draggable="true">'+
    '<div class="files-card-thumb '+fileType(item)+'">'+fileThumb(item)+'</div>'+
    '<div class="files-card-body"><strong>'+filesEsc(item.name||'Untitled')+'</strong><span>'+filesEsc(fileKind(item))+(fileDomain(item)?' - '+filesEsc(fileDomain(item)):'')+'</span><div class="files-card-tags">'+renderTagPills(item)+'</div></div>'+
    renderFileActions(item)+
  '</article>';
}
function renderFileListRow(item){
  const id=filesEsc(itemId(item));
  return '<article class="files-list-row '+(String(_filesSelectedId)===String(item.id)?'selected':'')+'" tabindex="0" data-file-id="'+id+'" draggable="true">'+
    '<div class="files-list-name"><span class="files-mini-icon '+fileType(item)+'">'+fileThumb(item)+'</span><strong>'+filesEsc(item.name||'Untitled')+'</strong></div>'+
    '<span>'+filesEsc(fileKind(item))+'</span>'+
    '<div class="files-list-tags">'+renderTagPills(item)+'</div>'+
    '<span>'+filesEsc(item.date||'--')+'</span>'+
    renderFileActions(item)+
  '</article>';
}
function renderColumnsView(items){
  const folders=items.filter(i=>fileType(i)==='folder');
  const selected=selectedItem();
  return '<div class="files-columns">'+
    '<div class="files-column"><div class="files-column-title">Library</div>'+items.map(i=>'<button type="button" class="'+(String(_filesSelectedId)===String(i.id)?'active':'')+'" data-file-id="'+filesEsc(itemId(i))+'"><span class="files-mini-icon '+fileType(i)+'">'+fileThumb(i)+'</span><span>'+filesEsc(i.name||'Untitled')+'</span></button>').join('')+'</div>'+
    '<div class="files-column"><div class="files-column-title">Folders</div>'+(folders.length?folders.map(i=>'<button type="button" data-file-id="'+filesEsc(itemId(i))+'"><span class="files-mini-icon folder">'+fileIconSvg('folder')+'</span><span>'+filesEsc(i.name)+'</span></button>').join(''):'<div class="files-column-empty">No folders</div>')+'</div>'+
    '<div class="files-column"><div class="files-column-title">Selection</div>'+(selected?renderColumnDetails(selected):'<div class="files-column-empty">Select an item</div>')+'</div>'+
  '</div>';
}
function renderColumnDetails(item){
  return '<div class="files-column-detail"><div class="files-card-thumb '+fileType(item)+'">'+fileThumb(item)+'</div><strong>'+filesEsc(item.name||'Untitled')+'</strong><span>'+filesEsc(fileKind(item))+'</span><div class="files-card-tags">'+renderTagPills(item)+'</div><button type="button" class="btn btn-primary" data-file-action="open" data-file-id="'+filesEsc(itemId(item))+'">Open</button></div>';
}

function renderFilePreview(){
  const preview=document.getElementById('files-preview');if(!preview)return;
  if(!_filesPreviewOpen){preview.innerHTML='';return;}
  const item=selectedItem();
  if(!item){preview.innerHTML='<div class="files-preview-empty">Select a file to preview.</div>';return;}
  const url=safeUrl(item.url);
  preview.innerHTML='<div class="files-preview-head"><span>Preview</span><button type="button" data-file-action="quicklook" data-file-id="'+filesEsc(itemId(item))+'">Quick Look</button></div>'+
    '<div class="files-preview-art '+fileType(item)+'">'+fileThumb(item)+'</div>'+
    '<div class="files-preview-name">'+filesEsc(item.name||'Untitled')+'</div>'+
    '<div class="files-preview-kind">'+filesEsc(fileKind(item))+'</div>'+
    '<div class="files-preview-meta">'+
      '<div><span>Created</span><strong>'+filesEsc(item.date||'Unknown')+'</strong></div>'+
      '<div><span>Tag</span><strong>'+filesEsc(itemTags(item)[0]||'None')+'</strong></div>'+
      '<div><span>Location</span><strong>'+filesEsc(fileDomain(item)||'ETHONE')+'</strong></div>'+
    '</div>'+
    '<div class="files-preview-tags">'+renderTagPills(item)+'</div>'+
    '<div class="files-preview-actions">'+
      '<button type="button" class="btn btn-primary" data-file-action="open" data-file-id="'+filesEsc(itemId(item))+'">Open</button>'+
      '<button type="button" class="btn btn-ghost" data-file-action="favorite" data-file-id="'+filesEsc(itemId(item))+'">'+(isFavorite(item)?'Unfavorite':'Favorite')+'</button>'+
    '</div>'+
    (url?'<a class="files-preview-url" href="'+filesEsc(url)+'" target="_blank" rel="noopener noreferrer">'+filesEsc(url)+'</a>':'');
}

function runFileAction(action,id){
  const item=allItems().find(i=>itemId(i)===String(id));
  if(!item)return;
  if(action==='favorite')setFavorite(item,!isFavorite(item));
  if(action==='quicklook')quickLook(id);
  if(action==='open')openItem(id);
  if(action==='delete')deleteItem(id);
}

function openItem(id){
  const p=filesProfile();if(!p)return;
  const item=p.state.items.find(i=>String(i.id)===String(id));if(!item)return;
  markRecent(item);saveStateNow();
  if(item.type==='image'&&item.imageData){quickLook(id);return;}
  if(item.type==='folder'&&item.files?.length){quickLook(id);return;}
  const url=safeUrl(item.url);
  if(url)window.open(url,'_blank','noopener,noreferrer');
  else quickLook(id);
  addActivity('Opened '+item.name,'var(--accent2)','content');
}

function quickLook(id){
  const item=allItems().find(i=>itemId(i)===String(id)); if(!item)return;
  selectFile(id);
  const old=document.getElementById('files-quicklook');
  if(old)old.remove();
  const url=safeUrl(item.url);
  const overlay=document.createElement('div');
  overlay.id='files-quicklook';
  overlay.className='files-quicklook';
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
  let body='';
  if(item.type==='image'&&item.imageData){
    body='<img class="files-ql-image" src="'+filesEsc(item.imageData)+'" alt="'+filesEsc(item.name||'Image')+'">';
  }else if(item.type==='folder'&&item.files?.length){
    body='<div class="files-ql-files">'+item.files.map(f=>'<div><span>'+fileIconSvg('file')+'</span><strong>'+filesEsc(f.name)+'</strong><em>'+filesEsc(f.size?(f.size/1024).toFixed(1)+' KB':'')+'</em></div>').join('')+'</div>';
  }else{
    body='<div class="files-ql-generic"><div class="files-card-thumb '+fileType(item)+'">'+fileThumb(item)+'</div><strong>'+filesEsc(item.name||'Untitled')+'</strong><span>'+filesEsc(item.meta||fileKind(item))+'</span>'+(url?'<a href="'+filesEsc(url)+'" target="_blank" rel="noopener noreferrer">'+filesEsc(url)+'</a>':'')+'</div>';
  }
  overlay.innerHTML='<section class="files-ql-card"><header><div><strong>'+filesEsc(item.name||'Untitled')+'</strong><span>'+filesEsc(fileKind(item))+'</span></div><button type="button" aria-label="Close">x</button></header>'+body+'</section>';
  overlay.querySelector('button').onclick=()=>overlay.remove();
  document.body.appendChild(overlay);
}

function handleExplorerDrop(e){
  const p=filesProfile();if(!p)return;
  const files=Array.from(e.dataTransfer&&e.dataTransfer.files||[]).slice(0,20);
  if(!files.length)return;
  const date=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
  files.forEach(file=>{
    const type=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':(/\.(js|ts|html|css|json|py|md)$/i.test(file.name)?'code':'file');
    const item={id:Date.now()+Math.random(),name:file.name,type:type,date:date,tag:'Dropped',meta:(file.size/1024).toFixed(1)+' KB',createdAt:new Date().toISOString()};
    if(type==='image'&&file.size<1200000){
      const reader=new FileReader();
      reader.onload=function(){item.imageData=reader.result;p.state.items.unshift(item);saveStateNow();renderItems();renderRecentItems();updateStats();};
      reader.readAsDataURL(file);
    }else p.state.items.unshift(item);
  });
  saveStateNow();renderItems();renderRecentItems();updateStats();
  filesToast(files.length+' item'+(files.length>1?'s':'')+' added','success');
}

function renderRecentItems(){
  const list=document.getElementById('recent-items-list');if(!list)return;
  const p=filesProfile(),all=p?(p.state.items||[]):[],st=filesState();
  const recentIds=(st&&st.recent||[]);
  let recent=recentIds.map(id=>all.find(i=>itemId(i)===id)).filter(Boolean);
  if(!recent.length)recent=all.slice(0,5);
  if(!recent.length){list.innerHTML='<div class="empty-state"><div class="empty-icon"></div>No items yet!</div>';return;}
  list.innerHTML=recent.slice(0,5).map(i=>'<div class="item-row" onclick="openItem('+filesEsc(i.id)+')"><div class="item-icon '+(tClass[i.type]||'doc')+'" style="width:28px;height:28px;font-size:12px;border-radius:7px">'+fileIconSvg(fileType(i))+'</div><div class="item-info"><div class="item-name">'+filesEsc(i.name)+'</div><div class="item-meta">'+filesEsc(i.date||'')+(itemTags(i)[0]?' . '+filesEsc(itemTags(i)[0]):'')+'</div></div></div>').join('');
}
