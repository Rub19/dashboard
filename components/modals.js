/* ETHONE legacy compatibility module: modals. */
// ===================================================
//  MODALS
// ===================================================
let _modalReturnFocus=null;
function openModal(id){
  const modal=document.getElementById('modal-'+id);
  if(!modal)return;
  _modalReturnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  const fi=modal.querySelector('input:not([type=file]),textarea,select,button');
  if(fi)setTimeout(()=>fi.focus(),100);
  if(id==='add-item')setTimeout(()=>switchItemTab('link'),50);
}
function closeModal(id){
  const modal=document.getElementById('modal-'+id);
  if(!modal)return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  if(_modalReturnFocus&&document.contains(_modalReturnFocus))setTimeout(()=>_modalReturnFocus.focus(),0);
  _modalReturnFocus=null;
}
function closeModalIfOverlay(e,id){if(e.target===document.getElementById('modal-'+id))closeModal(id)}
document.addEventListener('keydown',e=>{
  const modal=document.querySelector('.modal-overlay.open');
  if(!modal)return;
  if(e.key==='Escape'){
    const id=modal.id.replace(/^modal-/,'');
    closeModal(id);
    return;
  }
  if(e.key!=='Tab')return;
  const focusable=Array.from(modal.querySelectorAll('button,[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(el=>el.offsetParent!==null);
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
let _itemCurrentTab='link', _itemFileData=null, _itemImageData=null, _itemFolderFiles=[];

function switchItemTab(tab){
  _itemCurrentTab=tab;
  _itemFileData=null;_itemImageData=null;_itemFolderFiles=[];
  ['link','file','folder','image'].forEach(t=>{
    const btn=document.getElementById('itab-'+t);
    if(btn){btn.style.background=t===tab?'var(--accent)':'none';btn.style.color=t===tab?'#fff':'var(--muted)';}
  });
  document.getElementById('item-url-field').style.display=tab==='link'?'block':'none';
  document.getElementById('item-file-field').style.display=tab==='file'?'block':'none';
  document.getElementById('item-folder-field').style.display=tab==='folder'?'block':'none';
  document.getElementById('item-image-field').style.display=tab==='image'?'block':'none';
  // Update placeholder
  const nameInput=document.getElementById('item-name');
  if(nameInput){
    const placeholders={link:'e.g. Google Drive, Notion...',file:'e.g. Project Brief',folder:'e.g. Assets',image:'e.g. Screenshot'};
    nameInput.placeholder=placeholders[tab]||'Name';
  }
}

function handleItemFileUpload(input){
  const file=input.files[0];if(!file)return;
  _itemFileData={name:file.name,size:file.size,type:file.type};
  const label=document.getElementById('item-file-label');
  if(label)label.innerHTML=`📄 <strong>${file.name}</strong><br><span style="font-size:11px;color:var(--muted)">${(file.size/1024).toFixed(1)} KB · ${file.type||'unknown'}</span>`;
  // Auto-fill name if empty
  const nameInput=document.getElementById('item-name');
  if(nameInput&&!nameInput.value)nameInput.value=file.name.replace(/\.[^/.]+$/,'');
}

function handleItemFolderUpload(input){
  const files=Array.from(input.files);if(!files.length)return;
  _itemFolderFiles=files.map(f=>({name:f.name,path:f.webkitRelativePath||f.name,size:f.size}));
  const folderName=files[0]?.webkitRelativePath?.split('/')?.[0]||'Folder';
  const label=document.getElementById('item-folder-label');
  if(label)label.innerHTML=`📁 <strong>${folderName}</strong><br><span style="font-size:11px;color:var(--muted)">${files.length} file${files.length>1?'s':''} selected</span>`;
  const nameInput=document.getElementById('item-name');
  if(nameInput&&!nameInput.value)nameInput.value=folderName;
}

function handleItemImageUpload(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    _itemImageData=e.target.result;
    const thumb=document.getElementById('item-image-thumb');
    const preview=document.getElementById('item-image-preview');
    const label=document.getElementById('item-image-label');
    if(thumb)thumb.src=_itemImageData;
    if(preview)preview.style.display='block';
    if(label)label.innerHTML=`<span style="font-size:11px;color:var(--muted)">${file.name} · ${(file.size/1024).toFixed(1)} KB</span>`;
    const nameInput=document.getElementById('item-name');
    if(nameInput&&!nameInput.value)nameInput.value=file.name.replace(/\.[^/.]+$/,'');
  };
  reader.readAsDataURL(file);
}

function toggleItemTypeFields(){
  // Legacy — now handled by switchItemTab
  switchItemTab(document.getElementById('item-type')?.value||'link');
}
toggleItemTypeFields();
