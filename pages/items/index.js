/* ETHONE Files Explorer.
   Finder-style library built on the legacy p.state.items storage contract. */
const tIcons={file:"file",doc:"file",link:"link",image:"image",folder:"folder",code:"code",video:"video"};
const tClass={file:"doc",doc:"doc",link:"link",image:"img",folder:"folder",code:"code",video:"video"};

let curCat="all";
let _filesView=normalizeFilesView(localStorage.getItem("ethone:files:view")||"gallery");
let _filesSelectedId=null;
let _filesPreviewOpen=localStorage.getItem("ethone:files:preview")!=="0";
let _filesSort=localStorage.getItem("ethone:files:sort")||"recent";
let _filesPath=[];
let _filesDragId=null;

function filesEsc(v){
  if(typeof escapeHTML==="function")return escapeHTML(v);
  return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]});
}
function filesToast(msg,type){if(typeof toast==="function")toast(msg,type||"info")}
function safeFileUrl(value){try{return typeof safeUrl==="function"?safeUrl(value):String(value||"").trim()}catch(e){return ""}}
function saveFilesState(){try{if(typeof saveStateNow==="function")saveStateNow()}catch(e){}}
function filesActivity(text,color,category){try{if(typeof addActivity==="function")addActivity(text,color||"var(--accent)",category||"content")}catch(e){}}
function itemModalTab(){try{return typeof _itemCurrentTab!=="undefined"?_itemCurrentTab:(window._itemCurrentTab||"link")}catch(e){return "link"}}
function itemModalFileData(){try{return typeof _itemFileData!=="undefined"?_itemFileData:(window._itemFileData||null)}catch(e){return null}}
function itemModalImageData(){try{return typeof _itemImageData!=="undefined"?_itemImageData:(window._itemImageData||null)}catch(e){return null}}
function itemModalFolderFiles(){try{return typeof _itemFolderFiles!=="undefined"?_itemFolderFiles:(window._itemFolderFiles||[])}catch(e){return []}}
function resetItemModalData(){
  try{if(typeof _itemFileData!=="undefined")_itemFileData=null}catch(e){}
  try{if(typeof _itemImageData!=="undefined")_itemImageData=null}catch(e){}
  try{if(typeof _itemFolderFiles!=="undefined")_itemFolderFiles=[]}catch(e){}
  window._itemFileData=null;window._itemImageData=null;window._itemFolderFiles=[];
}

function fileIconSvg(type){
  const icons={
    folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5a2 2 0 0 1 2-2h4.2l2 2h6.8a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>',
    link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/></svg>',
    image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m20 16-4.2-4.2a2 2 0 0 0-2.8 0L6 19"/></svg>',
    code:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></svg>',
    video:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="12" height="12" rx="2"/><path d="m16 11 4-3v8l-4-3"/></svg>',
    file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z"/><path d="M14 3.5V8h4"/></svg>',
    spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>',
    star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
  };
  return icons[type]||icons.file;
}

function filesProfile(){try{return typeof curP==="function"?curP():null}catch(e){return null}}
function filesState(){
  const p=filesProfile();
  if(!p)return null;
  if(!p.state)p.state={};
  if(!Array.isArray(p.state.items))p.state.items=[];
  if(!p.state.filesExplorer)p.state.filesExplorer={favorites:[],recent:[],tags:{},view:_filesView,preview:_filesPreviewOpen,order:[],classes:{}};
  if(!Array.isArray(p.state.filesExplorer.favorites))p.state.filesExplorer.favorites=[];
  if(!Array.isArray(p.state.filesExplorer.recent))p.state.filesExplorer.recent=[];
  if(!Array.isArray(p.state.filesExplorer.order))p.state.filesExplorer.order=[];
  if(!p.state.filesExplorer.tags)p.state.filesExplorer.tags={};
  if(!p.state.filesExplorer.classes)p.state.filesExplorer.classes={};
  return p.state.filesExplorer;
}

function itemId(item){return String(item&&item.id)}
function normalizeFilesView(view){return view==="grid"?"gallery":(["gallery","list","columns"].includes(view)?view:"gallery")}
function fileType(item){return item&&item.type==="doc"?"file":(item&&item.type)||"file"}
function itemExt(item){
  const name=String(item&&item.name||"");
  const match=name.match(/\.([a-z0-9]{1,8})$/i);
  return match?match[1].toLowerCase():"";
}
function itemSize(item){
  if(!item)return "";
  if(item.size)return humanFileSize(item.size);
  const meta=String(item.meta||"");
  const match=meta.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB|B)/i);
  return match?match[0]:meta;
}
function humanFileSize(bytes){
  const n=Number(bytes||0);
  if(!n)return "";
  if(n<1024)return n+" B";
  if(n<1048576)return (n/1024).toFixed(1)+" KB";
  if(n<1073741824)return (n/1048576).toFixed(1)+" MB";
  return (n/1073741824).toFixed(1)+" GB";
}
function fileDate(item){
  if(!item)return "";
  const raw=item.updatedAt||item.createdAt||item.date||item.id;
  const date=typeof raw==="number"?new Date(raw):new Date(raw);
  if(!Number.isNaN(date.getTime()))return date.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
  return item.date||"";
}
function itemTags(item){
  if(!item)return [];
  const tags=[];
  if(item.tag)tags.push(...String(item.tag).split(",").map(t=>t.trim()).filter(Boolean));
  const st=filesState();
  const extra=st&&st.tags&&st.tags[itemId(item)];
  if(Array.isArray(extra))extra.forEach(t=>{if(t&&!tags.some(x=>x.toLowerCase()===String(t).toLowerCase()))tags.push(String(t))});
  return tags.slice(0,12);
}
function setItemTags(item,tags){
  const st=filesState();if(!item||!st)return;
  const clean=String(tags||"").split(",").map(t=>t.trim()).filter(Boolean).slice(0,12);
  item.tag=clean.join(", ");
  st.tags[itemId(item)]=clean;
  item.updatedAt=new Date().toISOString();
  saveFilesState();renderItems();renderRecentItems();
}
function isFavorite(item){
  const st=filesState();
  return !!(item&&item.favorite)||(st&&st.favorites||[]).includes(itemId(item));
}
function setFavorite(item,value){
  const st=filesState();if(!st||!item)return;
  const id=itemId(item);
  st.favorites=(st.favorites||[]).filter(x=>x!==id);
  if(value)st.favorites.unshift(id);
  item.favorite=!!value;
  item.updatedAt=new Date().toISOString();
  saveFilesState();renderItems();renderRecentItems();
}
function markRecent(item){
  const st=filesState();if(!st||!item)return;
  const id=itemId(item);
  st.recent=[id].concat((st.recent||[]).filter(x=>x!==id)).slice(0,40);
}
function allItems(){const p=filesProfile();return p?(p.state.items||[]):[]}
function selectedItem(){return allItems().find(i=>itemId(i)===String(_filesSelectedId))||filteredItems()[0]||null}

function classifyItem(item){
  const type=fileType(item);
  const name=String(item&&item.name||"").toLowerCase();
  const url=String(item&&item.url||"").toLowerCase();
  const tags=itemTags(item).join(" ").toLowerCase();
  const ext=itemExt(item);
  let label="Document";
  let confidence=72;
  let reason="Based on file type and metadata.";
  if(type==="image"||/(png|jpg|jpeg|webp|gif|svg|psd|fig|sketch)/.test(ext)){label="Visual asset";confidence=94;reason="Image format detected."}
  else if(type==="video"||/(mp4|mov|webm|mkv|avi)/.test(ext)){label="Video media";confidence=93;reason="Video format detected."}
  else if(type==="folder"){label="Project folder";confidence=84;reason="Folder structure detected."}
  else if(type==="code"||/(js|ts|html|css|json|py|md|tsx|jsx|vue|svelte)/.test(ext)){label="Developer file";confidence=91;reason="Code extension detected."}
  else if(type==="link"){
    if(/github|gitlab|vercel|localhost|api|docs/.test(url+name)){label="Developer resource";confidence=86;reason="Developer URL pattern detected."}
    else if(/spotify|youtube|twitch|discord/.test(url+name)){label="Media or social link";confidence=82;reason="Entertainment/service URL detected."}
    else {label="Web link";confidence=75;reason="External URL detected."}
  }else if(/invoice|facture|contract|contrat|receipt|pdf/.test(name+tags)){label="Important document";confidence=81;reason="Administrative keywords detected."}
  return {label:label,confidence:confidence,reason:reason,updatedAt:new Date().toISOString()};
}
function itemClass(item){
  const st=filesState();
  const id=itemId(item);
  if(item&&item.aiClass)return item.aiClass;
  return st&&st.classes&&st.classes[id]||null;
}
function classifyFile(id,options){
  const item=allItems().find(i=>itemId(i)===String(id));if(!item)return null;
  const st=filesState();if(!st)return null;
  const result=classifyItem(item);
  item.aiClass=result;
  st.classes[itemId(item)]=result;
  if(!itemTags(item).some(t=>t.toLowerCase()===result.label.toLowerCase())){
    const tags=itemTags(item);
    tags.unshift(result.label);
    item.tag=tags.slice(0,12).join(", ");
    st.tags[itemId(item)]=tags.slice(0,12);
  }
  item.updatedAt=new Date().toISOString();
  if(!options||options.save!==false){saveFilesState();renderItems();filesToast("AI classification updated","success")}
  return result;
}
function classifyAllFiles(){
  allItems().forEach(item=>classifyFile(itemId(item),{save:false}));
  saveFilesState();renderItems();renderRecentItems();
  filesActivity("Files classified by ETHONE AI","var(--accent2)","content");
  filesToast("Library classified","success");
}

function switchCategory(cat,el){
  curCat=cat||"all";
  document.querySelectorAll("#page-files .cat-tab,[data-files-filter]").forEach(t=>t.classList.remove("active"));
  if(el)el.classList.add("active");
  const btn=document.querySelector('[data-files-filter="'+cssEscapeValue(curCat)+'"]');
  if(btn)btn.classList.add("active");
  renderItems();
}
function cssEscapeValue(value){return String(value||"").replace(/\\/g,"\\\\").replace(/"/g,'\\"')}

function addItem(){
  const p=filesProfile();if(!p)return;
  const name=(document.getElementById("item-name")||{}).value?.trim()||"";
  const tag=(document.getElementById("item-tag")||{}).value?.trim()||"";
  const tab=itemModalTab();
  const date=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short"});
  if(!name){filesToast("Please enter a name","error");return}
  let item=null;
  if(tab==="link"){
    const url=(document.getElementById("item-url")||{}).value?.trim()||"";
    if(!url){filesToast("Please enter a URL","error");return}
    item={id:Date.now(),name,type:"link",url,tag,date,createdAt:new Date().toISOString()};
  }else if(tab==="file"){
    const url=(document.getElementById("item-url")||{}).value?.trim()||"";
    const data=itemModalFileData();
    item={id:Date.now(),name,type:"file",url:url||"",tag,date,meta:data?`${data.name} - ${humanFileSize(data.size)}`:"",size:data&&data.size,createdAt:new Date().toISOString()};
    if(data&&/\.(js|ts|html|css|json|py|md)$/i.test(data.name))item.type="code";
    if(data&&/\.(mp4|mov|webm|mkv|avi)$/i.test(data.name))item.type="video";
  }else if(tab==="folder"){
    const files=itemModalFolderFiles().slice(0,80);
    item={id:Date.now(),name,type:"folder",url:"",tag,date,meta:files.length?`${files.length} file${files.length>1?"s":""}`:"",files,createdAt:new Date().toISOString()};
  }else if(tab==="image"){
    const imageData=itemModalImageData();
    if(!imageData){filesToast("Please select an image","error");return}
    item={id:Date.now(),name,type:"image",url:"",tag,date,imageData:imageData,createdAt:new Date().toISOString()};
  }
  if(!item)return;
  const st=filesState();
  item.aiClass=classifyItem(item);
  if(st)st.classes[itemId(item)]=item.aiClass;
  p.state.items.unshift(item);
  resetItemModalData();
  saveFilesState();
  if(typeof closeModal==="function")closeModal("add-item");
  ["item-name","item-url","item-tag"].forEach(id=>{const el=document.getElementById(id);if(el)el.value=""});
  const fl=document.getElementById("item-file-label");if(fl)fl.innerHTML='Click to choose a file, or drag & drop<br><span style="font-size:11px;color:var(--muted)">Any file type</span>';
  const il=document.getElementById("item-image-label");if(il)il.innerHTML="Click to choose an image";
  const ip=document.getElementById("item-image-preview");if(ip)ip.style.display="none";
  const fol=document.getElementById("item-folder-label");if(fol)fol.innerHTML='Click to choose a folder<br><span style="font-size:11px;color:var(--muted)">Lists all files inside</span>';
  renderItems();updateStatsSafe();renderRecentItems();
  filesActivity(name+" added","var(--accent)","content");filesToast(name+" added!","success");
}
function updateStatsSafe(){try{if(typeof updateStats==="function")updateStats()}catch(e){}}
function deleteItem(id){
  const p=filesProfile();if(!p)return;
  const item=p.state.items.find(i=>String(i.id)===String(id));
  p.state.items=p.state.items.filter(i=>String(i.id)!==String(id));
  const st=filesState();
  if(st){
    st.favorites=(st.favorites||[]).filter(x=>x!==String(id));
    st.recent=(st.recent||[]).filter(x=>x!==String(id));
    st.order=(st.order||[]).filter(x=>x!==String(id));
    if(st.tags)delete st.tags[String(id)];
    if(st.classes)delete st.classes[String(id)];
  }
  if(String(_filesSelectedId)===String(id))_filesSelectedId=null;
  saveFilesState();renderItems();updateStatsSafe();renderRecentItems();
  if(item)filesActivity(item.name+" removed","var(--accent3)","content");
  filesToast("Removed","info");
}
function filterItems(){renderItems()}

function ensureFilesExplorer(){
  const page=document.getElementById("page-files");
  const list=document.getElementById("files-list");
  if(!page||!list)return false;
  page.classList.add("files-explorer-page");
  const topbar=page.querySelector(".topbar");
  if(topbar)topbar.classList.add("files-topbar");
  const tabs=page.querySelector(".cat-tabs");if(tabs)tabs.style.display="none";
  const showcase=document.getElementById("links-showcase");if(showcase)showcase.style.display="none";
  const panel=list.closest(".panel");if(!panel)return false;
  panel.classList.add("files-explorer-host");
  if(panel.querySelector("#files-explorer-shell"))return true;
  panel.innerHTML=[
    '<div class="files-explorer" id="files-explorer-shell">',
      '<aside class="files-sidebar" aria-label="Files sections">',
        '<div class="files-sidebar-head"><strong>Finder</strong><span>ETHONE Library</span></div>',
        sideItem("all","folder","All files","files-kpi-all"),
        sideItem("recent","file","Recent","files-kpi-recent"),
        sideItem("favorites","star","Favorites","files-kpi-fav"),
        '<div class="files-sidebar-label">Types</div>',
        sideItem("files","file","Documents","files-kpi-docs"),
        sideItem("links","link","Links","files-kpi-links"),
        sideItem("images","image","Images","files-kpi-images"),
        sideItem("videos","video","Videos","files-kpi-videos"),
        '<div class="files-sidebar-label">Tags</div><div class="files-tags" id="files-tags"></div>',
      '</aside>',
      '<section class="files-main">',
        '<div class="files-toolbar">',
          '<div class="files-breadcrumb" id="files-breadcrumb"></div>',
          '<div class="files-tools">',
            '<button type="button" class="files-tool-btn" data-file-global-action="classify">'+fileIconSvg("spark")+'<span>Classify</span></button>',
            '<select id="files-sort" class="files-select" aria-label="Sort files"><option value="recent">Recent</option><option value="name">Name</option><option value="type">Type</option><option value="favorite">Favorites</option></select>',
            '<div class="files-view-toggle" role="tablist" aria-label="Files view">',
              '<button type="button" data-files-view="gallery">Gallery</button>',
              '<button type="button" data-files-view="list">List</button>',
              '<button type="button" data-files-view="columns">Columns</button>',
            '</div>',
            '<button type="button" class="files-icon-btn" id="files-preview-toggle" aria-label="Toggle preview">'+fileIconSvg("image")+'</button>',
          '</div>',
        '</div>',
        '<div class="files-smart-strip" id="files-smart-strip"></div>',
        '<div class="files-dropzone" id="files-dropzone"><strong>Drop files here</strong><span>Images and small videos get instant previews. Other files become local references.</span></div>',
        '<div class="files-content" id="files-content"><div class="files-results" id="files-list"></div><aside class="files-preview" id="files-preview"></aside></div>',
      '</section>',
    '</div>'
  ].join("");
  bindFilesExplorer();
  return true;
}
function sideItem(filter,icon,label,kpi){
  return '<button type="button" class="files-side-item '+(curCat===filter?"active":"")+'" data-files-filter="'+filesEsc(filter)+'">'+fileIconSvg(icon)+'<span>'+filesEsc(label)+'</span>'+(kpi?'<b id="'+kpi+'">0</b>':"")+"</button>";
}

function bindFilesExplorer(){
  const shell=document.getElementById("files-explorer-shell");
  if(!shell||shell.dataset.bound)return;
  shell.dataset.bound="1";
  shell.addEventListener("click",function(e){
    const global=e.target.closest("[data-file-global-action]");
    if(global){runGlobalFileAction(global.dataset.fileGlobalAction);return}
    const filter=e.target.closest("[data-files-filter]");
    if(filter){switchCategory(filter.dataset.filesFilter,filter);return}
    const view=e.target.closest("[data-files-view]");
    if(view){setFilesView(view.dataset.filesView);return}
    const action=e.target.closest("[data-file-action]");
    if(action){e.stopPropagation();runFileAction(action.dataset.fileAction,action.dataset.fileId,action);return}
    const card=e.target.closest("[data-file-id]");
    if(card){selectFile(card.dataset.fileId);if(e.detail>=2)openItem(card.dataset.fileId);return}
  });
  shell.addEventListener("keydown",function(e){
    if(e.key==="Enter"&&_filesSelectedId){openItem(_filesSelectedId)}
    if(e.key===" "&&_filesSelectedId){e.preventDefault();quickLook(_filesSelectedId)}
    if(e.key==="Delete"&&_filesSelectedId){deleteItem(_filesSelectedId)}
  });
  shell.addEventListener("dragstart",function(e){
    const card=e.target.closest("[data-file-id]");
    if(!card)return;
    _filesDragId=card.dataset.fileId;
    e.dataTransfer.effectAllowed="move";
    try{e.dataTransfer.setData("text/plain",_filesDragId)}catch(err){}
    card.classList.add("is-dragging");
  });
  shell.addEventListener("dragend",function(e){
    const card=e.target.closest("[data-file-id]");
    if(card)card.classList.remove("is-dragging");
    _filesDragId=null;
  });
  shell.addEventListener("dragover",function(e){
    const target=e.target.closest("[data-file-id]");
    if(target&&_filesDragId){e.preventDefault();target.classList.add("is-drop-target")}
  });
  shell.addEventListener("dragleave",function(e){
    const target=e.target.closest("[data-file-id]");
    if(target)target.classList.remove("is-drop-target");
  });
  shell.addEventListener("drop",function(e){
    const target=e.target.closest("[data-file-id]");
    if(target)target.classList.remove("is-drop-target");
    if(target&&_filesDragId&&target.dataset.fileId!==_filesDragId){
      e.preventDefault();reorderFiles(_filesDragId,target.dataset.fileId);return;
    }
  });
  const sort=document.getElementById("files-sort");
  if(sort){
    sort.value=_filesSort;
    sort.addEventListener("change",function(){_filesSort=this.value;localStorage.setItem("ethone:files:sort",_filesSort);renderItems()});
  }
  const preview=document.getElementById("files-preview-toggle");
  if(preview)preview.addEventListener("click",function(){
    _filesPreviewOpen=!_filesPreviewOpen;
    localStorage.setItem("ethone:files:preview",_filesPreviewOpen?"1":"0");
    renderItems();
  });
  const drop=document.getElementById("files-dropzone");
  if(drop){
    ["dragenter","dragover"].forEach(type=>drop.addEventListener(type,function(e){e.preventDefault();drop.classList.add("is-dragover")}));
    ["dragleave","drop"].forEach(type=>drop.addEventListener(type,function(e){e.preventDefault();drop.classList.remove("is-dragover")}));
    drop.addEventListener("drop",handleExplorerDrop);
  }
}

function setFilesView(view){
  _filesView=normalizeFilesView(view);
  localStorage.setItem("ethone:files:view",_filesView);
  const st=filesState();if(st){st.view=_filesView;saveFilesState()}
  renderItems();
}
function selectFile(id){
  _filesSelectedId=String(id);
  markRecent(allItems().find(i=>itemId(i)===String(id)));
  const st=filesState();if(st)saveFilesState();
  renderItems();
}
function reorderFiles(sourceId,targetId){
  const p=filesProfile(),st=filesState();if(!p||!st)return;
  const items=p.state.items||[];
  const from=items.findIndex(i=>itemId(i)===String(sourceId));
  const to=items.findIndex(i=>itemId(i)===String(targetId));
  if(from<0||to<0)return;
  const moved=items.splice(from,1)[0];
  items.splice(to,0,moved);
  st.order=items.map(itemId);
  saveFilesState();renderItems();filesToast("Order updated","success");
}

function filteredItems(){
  const all=allItems();
  const st=filesState();
  const q=(document.getElementById("files-search")?.value||"").toLowerCase().trim();
  let items=all.slice();
  if(curCat==="files")items=items.filter(i=>["file","folder","code","doc"].includes(fileType(i)));
  if(curCat==="links")items=items.filter(i=>fileType(i)==="link");
  if(curCat==="images")items=items.filter(i=>fileType(i)==="image");
  if(curCat==="videos")items=items.filter(i=>fileType(i)==="video");
  if(curCat==="favorites")items=items.filter(isFavorite);
  if(curCat==="recent"){
    const order=(st&&st.recent)||[];
    items=items.filter(i=>order.includes(itemId(i)));
    items.sort((a,b)=>order.indexOf(itemId(a))-order.indexOf(itemId(b)));
  }
  if(curCat&&curCat.indexOf("tag:")===0){
    const tag=curCat.slice(4).toLowerCase();
    items=items.filter(i=>itemTags(i).some(t=>t.toLowerCase()===tag));
  }
  if(q)items=items.filter(i=>{
    const cls=itemClass(i);
    const hay=[i.name,i.type,i.tag,i.url,i.meta,itemTags(i).join(" "),cls&&cls.label,cls&&cls.reason,itemExt(i)].join(" ").toLowerCase();
    return fuzzyContains(hay,q);
  });
  if(curCat!=="recent"){
    items.sort(function(a,b){
      if(_filesSort==="name")return String(a.name||"").localeCompare(String(b.name||""));
      if(_filesSort==="type")return String(fileType(a)).localeCompare(String(fileType(b)))||String(a.name||"").localeCompare(String(b.name||""));
      if(_filesSort==="favorite")return Number(isFavorite(b))-Number(isFavorite(a))||String(a.name||"").localeCompare(String(b.name||""));
      return Number(new Date(b.updatedAt||b.createdAt||b.id).getTime()||b.id||0)-Number(new Date(a.updatedAt||a.createdAt||a.id).getTime()||a.id||0);
    });
  }
  return items;
}
function fuzzyContains(hay,needle){
  if(hay.includes(needle))return true;
  let j=0;
  for(let i=0;i<hay.length&&j<needle.length;i++){if(hay[i]===needle[j])j++}
  return j===needle.length&&needle.length>2;
}

function renderItems(){
  if(!ensureFilesExplorer())return;
  const list=document.getElementById("files-list");if(!list)return;
  const items=filteredItems();
  const all=allItems();
  if(!_filesSelectedId&&items[0])_filesSelectedId=itemId(items[0]);
  if(_filesSelectedId&&!all.some(i=>itemId(i)===String(_filesSelectedId)))_filesSelectedId=items[0]?itemId(items[0]):null;
  const shell=document.getElementById("files-explorer-shell");
  shell.dataset.view=_filesView;
  shell.classList.toggle("preview-open",_filesPreviewOpen);
  document.querySelectorAll("[data-files-view]").forEach(btn=>btn.classList.toggle("active",normalizeFilesView(btn.dataset.filesView)===_filesView));
  document.querySelectorAll("[data-files-filter]").forEach(btn=>btn.classList.toggle("active",btn.dataset.filesFilter===curCat));
  const sort=document.getElementById("files-sort");if(sort&&sort.value!==_filesSort)sort.value=_filesSort;
  updateFilesKpis(all);renderFilesTags(all);renderBreadcrumb();renderSmartStrip(all,items);
  if(!items.length){
    list.innerHTML='<div class="files-empty"><div>'+fileIconSvg("folder")+'</div><strong>No files found</strong><span>Drop files here, add a link, or change your filters.</span><button type="button" class="btn btn-primary" onclick="openModal(\'add-item\')">Add item</button></div>';
  }else if(_filesView==="list"){
    list.innerHTML='<div class="files-list-head"><span>Name</span><span>Kind</span><span>AI Class</span><span>Tags</span><span>Date</span><span></span></div>'+items.map(renderFileListRow).join("");
  }else if(_filesView==="columns"){
    list.innerHTML=renderColumnsView(items);
  }else{
    list.innerHTML=items.map(renderFileCard).join("");
  }
  renderFilePreview();
}

function updateFilesKpis(all){
  const st=filesState();
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v)};
  set("files-kpi-all",all.length);
  set("files-kpi-recent",(st&&st.recent||[]).filter(id=>all.some(i=>itemId(i)===id)).length);
  set("files-kpi-fav",all.filter(isFavorite).length);
  set("files-kpi-docs",all.filter(i=>["file","folder","code","doc"].includes(fileType(i))).length);
  set("files-kpi-links",all.filter(i=>fileType(i)==="link").length);
  set("files-kpi-images",all.filter(i=>fileType(i)==="image").length);
  set("files-kpi-videos",all.filter(i=>fileType(i)==="video").length);
}
function renderFilesTags(all){
  const host=document.getElementById("files-tags");if(!host)return;
  const counts={};
  all.forEach(i=>itemTags(i).forEach(t=>{counts[t]=(counts[t]||0)+1}));
  const tags=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]||a.localeCompare(b)).slice(0,16);
  host.innerHTML=tags.length?tags.map(t=>'<button type="button" class="files-tag '+(curCat==="tag:"+t?"active":"")+'" data-files-filter="tag:'+filesEsc(t)+'"><span>'+filesEsc(t)+'</span><b>'+counts[t]+'</b></button>').join(""):'<div class="files-muted">No tags yet</div>';
}
function renderBreadcrumb(){
  const host=document.getElementById("files-breadcrumb");if(!host)return;
  const labels={all:"All files",recent:"Recent",favorites:"Favorites",files:"Documents",links:"Links",images:"Images",videos:"Videos"};
  const label=curCat.indexOf("tag:")===0?"Tag / "+curCat.slice(4):(labels[curCat]||curCat);
  host.innerHTML='<button type="button" data-files-filter="all">ETHONE</button><span>/</span><button type="button" data-files-filter="'+filesEsc(curCat)+'">'+filesEsc(label)+'</button>';
}
function renderSmartStrip(all,items){
  const host=document.getElementById("files-smart-strip");if(!host)return;
  const selected=selectedItem();
  const unclassified=all.filter(i=>!itemClass(i)).length;
  const videos=all.filter(i=>fileType(i)==="video").length;
  const images=all.filter(i=>fileType(i)==="image").length;
  host.innerHTML=[
    '<article><span>Selection</span><strong>'+(selected?filesEsc(selected.name||"Untitled"):"None")+'</strong><small>'+(selected?filesEsc(fileKind(selected)):"Pick an item")+'</small></article>',
    '<article><span>Library</span><strong>'+all.length+' items</strong><small>'+images+' images / '+videos+' videos</small></article>',
    '<article><span>AI Classification</span><strong>'+(all.length-unclassified)+' classified</strong><small>'+(unclassified?unclassified+" waiting":"Up to date")+'</small></article>',
    '<article><span>Visible</span><strong>'+items.length+' results</strong><small>'+filesEsc(_filesView.charAt(0).toUpperCase()+_filesView.slice(1))+' view</small></article>'
  ].join("");
}

function fileThumb(item){
  const type=fileType(item);
  if(type==="image"&&item.imageData)return '<img src="'+filesEsc(item.imageData)+'" alt="">';
  if(type==="video"&&item.videoData)return '<video muted playsinline preload="metadata" src="'+filesEsc(item.videoData)+'"></video>';
  return fileIconSvg(type);
}
function previewMedia(item){
  const type=fileType(item);
  const url=safeFileUrl(item&&item.url);
  if(type==="image"&&item.imageData)return '<img src="'+filesEsc(item.imageData)+'" alt="'+filesEsc(item.name||"Image")+'">';
  if(type==="image"&&url)return '<img src="'+filesEsc(url)+'" alt="'+filesEsc(item.name||"Image")+'">';
  if(type==="video"&&item.videoData)return '<video controls playsinline preload="metadata" src="'+filesEsc(item.videoData)+'"></video>';
  if(type==="video"&&url)return '<video controls playsinline preload="metadata" src="'+filesEsc(url)+'"></video>';
  return '<div class="files-preview-icon '+type+'">'+fileIconSvg(type)+'</div>';
}
function fileKind(item){
  const type=fileType(item);
  if(type==="folder"&&item.files)return item.files.length+" files";
  if(type==="link")return "Link";
  if(type==="image")return "Image";
  if(type==="video")return "Video";
  if(type==="code")return "Code";
  return itemExt(item)?itemExt(item).toUpperCase()+" document":"Document";
}
function fileDomain(item){
  const url=safeFileUrl(item&&item.url);
  if(!url)return "";
  try{return new URL(url).hostname.replace(/^www\./,"")}catch(e){return ""}
}
function renderTagPills(item){
  const tags=itemTags(item);
  return tags.length?tags.map(t=>'<span class="files-pill">'+filesEsc(t)+'</span>').join(""):'<span class="files-muted">No tags</span>';
}
function renderClassBadge(item){
  const cls=itemClass(item);
  return cls?'<span class="files-ai-badge">'+fileIconSvg("spark")+filesEsc(cls.label)+' <b>'+filesEsc(cls.confidence)+"%</b></span>":'<span class="files-ai-badge muted">'+fileIconSvg("spark")+'Not classified</span>';
}
function renderFileActions(item){
  const id=filesEsc(itemId(item));
  return '<div class="files-row-actions">'+
    '<button type="button" data-file-action="favorite" data-file-id="'+id+'" title="Favorite" aria-label="Favorite">'+(isFavorite(item)?"Starred":"Star")+'</button>'+
    '<button type="button" data-file-action="quicklook" data-file-id="'+id+'" title="Quick Look" aria-label="Quick Look">Preview</button>'+
    '<button type="button" data-file-action="classify" data-file-id="'+id+'" title="Classify" aria-label="Classify">AI</button>'+
    '<button type="button" data-file-action="delete" data-file-id="'+id+'" title="Delete" aria-label="Delete">Delete</button>'+
  '</div>';
}
function renderFileCard(item){
  const id=filesEsc(itemId(item));
  return '<article class="files-card '+(String(_filesSelectedId)===String(item.id)?"selected":"")+'" tabindex="0" data-file-id="'+id+'" draggable="true">'+
    '<div class="files-card-thumb '+fileType(item)+'">'+fileThumb(item)+'</div>'+
    '<div class="files-card-body"><strong>'+filesEsc(item.name||"Untitled")+'</strong><span>'+filesEsc(fileKind(item))+(fileDomain(item)?" - "+filesEsc(fileDomain(item)):"")+'</span><div class="files-class-line">'+renderClassBadge(item)+'</div><div class="files-card-tags">'+renderTagPills(item)+'</div></div>'+
    renderFileActions(item)+
  '</article>';
}
function renderFileListRow(item){
  const id=filesEsc(itemId(item));
  return '<article class="files-list-row '+(String(_filesSelectedId)===String(item.id)?"selected":"")+'" tabindex="0" data-file-id="'+id+'" draggable="true">'+
    '<div class="files-list-name"><span class="files-mini-icon '+fileType(item)+'">'+fileThumb(item)+'</span><strong>'+filesEsc(item.name||"Untitled")+'</strong></div>'+
    '<span>'+filesEsc(fileKind(item))+'</span>'+
    '<span>'+renderClassBadge(item)+'</span>'+
    '<div class="files-list-tags">'+renderTagPills(item)+'</div>'+
    '<span>'+filesEsc(fileDate(item)||"--")+'</span>'+
    renderFileActions(item)+
  '</article>';
}
function renderColumnsView(items){
  const folders=items.filter(i=>fileType(i)==="folder");
  const selected=selectedItem();
  const peers=selected?items.filter(i=>fileType(i)===fileType(selected)):items;
  return '<div class="files-columns">'+
    '<div class="files-column"><div class="files-column-title">Library</div>'+items.map(i=>columnButton(i)).join("")+'</div>'+
    '<div class="files-column"><div class="files-column-title">'+(selected?filesEsc(fileKind(selected)):"Folders")+'</div>'+(peers.length?peers.map(i=>columnButton(i)).join(""):(folders.length?folders.map(i=>columnButton(i)).join(""):'<div class="files-column-empty">No related items</div>'))+'</div>'+
    '<div class="files-column"><div class="files-column-title">Quick Preview</div>'+(selected?renderColumnDetails(selected):'<div class="files-column-empty">Select an item</div>')+'</div>'+
  '</div>';
}
function columnButton(item){
  return '<button type="button" class="'+(String(_filesSelectedId)===String(item.id)?"active":"")+'" data-file-id="'+filesEsc(itemId(item))+'"><span class="files-mini-icon '+fileType(item)+'">'+fileThumb(item)+'</span><span>'+filesEsc(item.name||"Untitled")+'</span></button>';
}
function renderColumnDetails(item){
  return '<div class="files-column-detail"><div class="files-card-thumb '+fileType(item)+'">'+fileThumb(item)+'</div><strong>'+filesEsc(item.name||"Untitled")+'</strong><span>'+filesEsc(fileKind(item))+'</span>'+renderClassBadge(item)+'<div class="files-card-tags">'+renderTagPills(item)+'</div><button type="button" class="btn btn-primary" data-file-action="open" data-file-id="'+filesEsc(itemId(item))+'">Open</button></div>';
}

function renderFilePreview(){
  const preview=document.getElementById("files-preview");if(!preview)return;
  if(!_filesPreviewOpen){preview.innerHTML="";return}
  const item=selectedItem();
  if(!item){preview.innerHTML='<div class="files-preview-empty">Select a file to preview.</div>';return}
  const url=safeFileUrl(item.url);
  const cls=itemClass(item);
  preview.innerHTML='<div class="files-preview-head"><span>Quick Preview</span><button type="button" data-file-action="quicklook" data-file-id="'+filesEsc(itemId(item))+'">Open</button></div>'+
    '<div class="files-preview-art '+fileType(item)+'">'+previewMedia(item)+'</div>'+
    '<div class="files-preview-name">'+filesEsc(item.name||"Untitled")+'</div>'+
    '<div class="files-preview-kind">'+filesEsc(fileKind(item))+'</div>'+
    '<div class="files-preview-tags">'+renderTagPills(item)+'</div>'+
    '<label class="files-tags-editor"><span>Tags</span><input type="text" value="'+filesEsc(itemTags(item).join(", "))+'" data-file-action="tags" data-file-id="'+filesEsc(itemId(item))+'" placeholder="design, project, important"></label>'+
    '<div class="files-ai-panel">'+
      '<div class="files-ai-title">'+fileIconSvg("spark")+'AI Classification</div>'+
      (cls?'<strong>'+filesEsc(cls.label)+' <em>'+filesEsc(cls.confidence)+'%</em></strong><p>'+filesEsc(cls.reason)+'</p>':'<p>Classify this item to generate a local ETHONE category and smart tags.</p>')+
      '<button type="button" data-file-action="classify" data-file-id="'+filesEsc(itemId(item))+'">Run classification</button>'+
    '</div>'+
    '<div class="files-preview-meta">'+
      '<div><span>Created</span><strong>'+filesEsc(fileDate(item)||"Unknown")+'</strong></div>'+
      '<div><span>Size</span><strong>'+filesEsc(itemSize(item)||"Reference")+'</strong></div>'+
      '<div><span>Location</span><strong>'+filesEsc(fileDomain(item)||"ETHONE")+'</strong></div>'+
    '</div>'+
    '<div class="files-preview-actions">'+
      '<button type="button" class="btn btn-primary" data-file-action="open" data-file-id="'+filesEsc(itemId(item))+'">Open</button>'+
      '<button type="button" class="btn btn-ghost" data-file-action="favorite" data-file-id="'+filesEsc(itemId(item))+'">'+(isFavorite(item)?"Unfavorite":"Favorite")+'</button>'+
      '<button type="button" class="btn btn-ghost" data-file-action="rename" data-file-id="'+filesEsc(itemId(item))+'">Rename</button>'+
    '</div>'+
    (url?'<a class="files-preview-url" href="'+filesEsc(url)+'" target="_blank" rel="noopener noreferrer">'+filesEsc(url)+'</a>':"");
  const input=preview.querySelector("[data-file-action='tags']");
  if(input)input.addEventListener("change",function(){setItemTags(item,this.value)});
}

function runGlobalFileAction(action){
  if(action==="classify")classifyAllFiles();
}
function runFileAction(action,id,el){
  const item=allItems().find(i=>itemId(i)===String(id));
  if(!item)return;
  if(action==="favorite")setFavorite(item,!isFavorite(item));
  if(action==="quicklook")quickLook(id);
  if(action==="open")openItem(id);
  if(action==="delete")deleteItem(id);
  if(action==="classify")classifyFile(id);
  if(action==="rename")renameFile(id);
  if(action==="tags"&&el)setItemTags(item,el.value||"");
}
function renameFile(id){
  const item=allItems().find(i=>itemId(i)===String(id));if(!item)return;
  const next=prompt("Rename item",item.name||"Untitled");
  if(next==null)return;
  const clean=next.trim();
  if(!clean){filesToast("Name cannot be empty","error");return}
  item.name=clean;item.updatedAt=new Date().toISOString();item.aiClass=classifyItem(item);
  const st=filesState();if(st)st.classes[itemId(item)]=item.aiClass;
  saveFilesState();renderItems();renderRecentItems();filesToast("Renamed","success");
}

function openItem(id){
  const p=filesProfile();if(!p)return;
  const item=p.state.items.find(i=>String(i.id)===String(id));if(!item)return;
  markRecent(item);saveFilesState();
  if((item.type==="image"&&item.imageData)||(item.type==="video"&&item.videoData)||(item.type==="folder"&&item.files?.length)){quickLook(id);return}
  const url=safeFileUrl(item.url);
  if(url)window.open(url,"_blank","noopener,noreferrer");
  else quickLook(id);
  filesActivity("Opened "+item.name,"var(--accent2)","content");
}
function quickLook(id){
  const item=allItems().find(i=>itemId(i)===String(id));if(!item)return;
  selectFile(id);
  const old=document.getElementById("files-quicklook");if(old)old.remove();
  const url=safeFileUrl(item.url);
  const overlay=document.createElement("div");
  overlay.id="files-quicklook";
  overlay.className="files-quicklook";
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
  let body="";
  if(fileType(item)==="image"&&(item.imageData||url)){
    body='<div class="files-ql-media">'+previewMedia(item)+"</div>";
  }else if(fileType(item)==="video"&&(item.videoData||url)){
    body='<div class="files-ql-media">'+previewMedia(item)+"</div>";
  }else if(fileType(item)==="folder"&&item.files?.length){
    body='<div class="files-ql-files">'+item.files.map(f=>'<div><span>'+fileIconSvg(fileType({type:f.type||"file",name:f.name}))+'</span><strong>'+filesEsc(f.name)+'</strong><em>'+filesEsc(f.size?humanFileSize(f.size):"")+'</em></div>').join("")+"</div>";
  }else{
    body='<div class="files-ql-generic"><div class="files-card-thumb '+fileType(item)+'">'+fileThumb(item)+'</div><strong>'+filesEsc(item.name||"Untitled")+'</strong><span>'+filesEsc(item.meta||fileKind(item))+'</span>'+renderClassBadge(item)+(url?'<a href="'+filesEsc(url)+'" target="_blank" rel="noopener noreferrer">'+filesEsc(url)+"</a>":"")+"</div>";
  }
  overlay.innerHTML='<section class="files-ql-card"><header><div><strong>'+filesEsc(item.name||"Untitled")+'</strong><span>'+filesEsc(fileKind(item))+'</span></div><button type="button" aria-label="Close">x</button></header>'+body+"</section>";
  overlay.querySelector("button").onclick=()=>overlay.remove();
  document.body.appendChild(overlay);
}

function handleExplorerDrop(e){
  const p=filesProfile();if(!p)return;
  const files=Array.from(e.dataTransfer&&e.dataTransfer.files||[]).slice(0,24);
  if(!files.length)return;
  const date=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short"});
  let pending=0;
  files.forEach(file=>{
    const type=file.type.startsWith("image/")?"image":file.type.startsWith("video/")?"video":(/\.(js|ts|html|css|json|py|md|tsx|jsx)$/i.test(file.name)?"code":"file");
    const item={id:Date.now()+Math.random(),name:file.name,type:type,date:date,tag:"Dropped",meta:humanFileSize(file.size),size:file.size,createdAt:new Date().toISOString()};
    item.aiClass=classifyItem(item);
    const st=filesState();if(st)st.classes[itemId(item)]=item.aiClass;
    const canStoreImage=type==="image"&&file.size<1500000;
    const canStoreVideo=type==="video"&&file.size<2500000;
    if(canStoreImage||canStoreVideo){
      pending++;
      const reader=new FileReader();
      reader.onload=function(){
        if(type==="image")item.imageData=reader.result;
        if(type==="video")item.videoData=reader.result;
        p.state.items.unshift(item);
        pending--;
        if(pending===0){saveFilesState();renderItems();renderRecentItems();updateStatsSafe()}
      };
      reader.onerror=function(){
        pending--;
        p.state.items.unshift(item);
        if(pending===0){saveFilesState();renderItems();renderRecentItems();updateStatsSafe()}
      };
      reader.readAsDataURL(file);
    }else{
      p.state.items.unshift(item);
    }
  });
  if(!pending){saveFilesState();renderItems();renderRecentItems();updateStatsSafe()}
  filesToast(files.length+" item"+(files.length>1?"s":"")+" added","success");
}

function renderRecentItems(){
  const list=document.getElementById("recent-items-list");if(!list)return;
  const p=filesProfile(),all=p?(p.state.items||[]):[],st=filesState();
  const recentIds=(st&&st.recent||[]);
  let recent=recentIds.map(id=>all.find(i=>itemId(i)===id)).filter(Boolean);
  if(!recent.length)recent=all.slice(0,5);
  if(!recent.length){list.innerHTML='<div class="empty-state"><div class="empty-icon"></div>No items yet!</div>';return}
  list.innerHTML=recent.slice(0,5).map(i=>'<div class="item-row" onclick="openItem(\''+filesEsc(itemId(i))+'\')"><div class="item-icon '+(tClass[fileType(i)]||"doc")+'" style="width:28px;height:28px;font-size:12px;border-radius:7px">'+fileIconSvg(fileType(i))+'</div><div class="item-info"><div class="item-name">'+filesEsc(i.name)+'</div><div class="item-meta">'+filesEsc(fileDate(i)||"")+(itemTags(i)[0]?" . "+filesEsc(itemTags(i)[0]):"")+"</div></div></div>").join("");
}
