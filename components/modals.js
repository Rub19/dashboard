/* ETHONE legacy compatibility module: modals. */
// ===================================================
//  MODALS
// ===================================================
const modalFocusStack=[];
function pruneModalFocusStack(){
  for(let i=modalFocusStack.length-1;i>=0;i--){
    const entry=modalFocusStack[i];
    if(!entry||!entry.modal||!entry.modal.isConnected||!entry.modal.classList.contains('open'))modalFocusStack.splice(i,1);
  }
}
function modalFocusable(modal){
  return Array.from(modal.querySelectorAll('button:not([disabled]),[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(el=>el.offsetParent!==null&&!el.closest('[inert],[aria-hidden="true"]'));
}
function topOpenModal(){
  return Array.from(document.querySelectorAll('.modal-overlay.open')).map((modal,index)=>{
    const z=parseInt(getComputedStyle(modal).zIndex,10);
    return {modal,index,z:Number.isFinite(z)?z:0};
  }).sort((a,b)=>b.z-a.z||b.index-a.index)[0]?.modal||null;
}
function openModal(id){
  const modal=document.getElementById('modal-'+id);
  if(!modal)return;
  pruneModalFocusStack();
  if(!modal.classList.contains('open')){
    const returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    modalFocusStack.push({modal,returnFocus});
  }
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  modal.inert=false;
  const dialog=modal.querySelector('.modal,.modal-box,.modal-card,.modal-content')||modal;
  dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');
  const fi=modal.querySelector('[autofocus]')||modalFocusable(modal)[0];
  if(fi)requestAnimationFrame(()=>{if(modal.classList.contains('open'))fi.focus();});
  if(id==='add-item')setTimeout(()=>switchItemTab('link'),50);
}
function closeModal(id,options){
  const opts=options||{};
  const modal=document.getElementById('modal-'+id);
  if(!modal)return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  modal.inert=true;
  let stackIndex=-1;
  for(let i=modalFocusStack.length-1;i>=0;i--){if(modalFocusStack[i].modal===modal){stackIndex=i;break;}}
  const entry=stackIndex>=0?modalFocusStack.splice(stackIndex,1)[0]:null;
  const returnFocus=entry&&entry.returnFocus;
  if(opts.restoreFocus!==false&&returnFocus&&document.contains(returnFocus)&&!returnFocus.closest('[inert],[aria-hidden="true"]'))setTimeout(()=>returnFocus.focus(),0);
  pruneModalFocusStack();
}
function closeAllModals(options){
  const opts=options||{};
  pruneModalFocusStack();
  const restoreEntry=modalFocusStack.length?modalFocusStack[0]:null;
  Array.from(document.querySelectorAll('.modal-overlay.open')).forEach(modal=>{
    const id=(modal.id||'').replace(/^modal-/, '');
    if(id)closeModal(id,{restoreFocus:false});
    else{
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden','true');
      modal.inert=true;
    }
  });
  modalFocusStack.length=0;
  const returnFocus=restoreEntry&&restoreEntry.returnFocus;
  if(opts.restoreFocus!==false&&returnFocus&&document.contains(returnFocus)&&!returnFocus.closest('[inert],[aria-hidden="true"]')){
    setTimeout(()=>returnFocus.focus(),0);
  }
}
function closeModalIfOverlay(e,id){if(e.target===document.getElementById('modal-'+id))closeModal(id)}
document.addEventListener('keydown',e=>{
  const modal=topOpenModal();
  if(!modal)return;
  if(e.key==='Escape'){
    e.preventDefault();
    const id=modal.id.replace(/^modal-/,'');
    closeModal(id);
    return;
  }
  if(e.key==='Enter'){
    const target=e.target;
    if(target&&target.closest&&target.closest('textarea,[contenteditable="true"],button,a[href],select'))return;
    if(target&&target.closest&&target.closest('form'))return;
    const primary=modal.querySelector('[data-default-action],button[type="submit"],.modal-actions .btn-primary,.modal-footer .btn-primary');
    if(primary&&!primary.disabled){e.preventDefault();primary.click();}
    return;
  }
  if(e.key!=='Tab')return;
  const focusable=modalFocusable(modal);
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
document.querySelectorAll('.modal-overlay:not(.open)').forEach(modal=>{modal.setAttribute('aria-hidden','true');modal.inert=true;});
window.ETHONEModals={
  open:openModal,
  close:closeModal,
  closeAll:closeAllModals,
  stats:function(){pruneModalFocusStack();return {focusEntries:modalFocusStack.length,open:document.querySelectorAll('.modal-overlay.open').length};}
};
let _itemCurrentTab='link', _itemFileData=null, _itemImageData=null, _itemFolderFiles=[];

function setItemFieldVisibility(id,visible){
  const field=document.getElementById(id);
  if(field)field.style.display=visible?'block':'none';
}

function switchItemTab(tab){
  _itemCurrentTab=tab;
  _itemFileData=null;_itemImageData=null;_itemFolderFiles=[];
  ['link','file','folder','image'].forEach(t=>{
    const btn=document.getElementById('itab-'+t);
    if(btn){btn.style.background=t===tab?'var(--accent)':'none';btn.style.color=t===tab?'var(--text-on-accent)':'var(--muted)';}
  });
  setItemFieldVisibility('item-url-field',tab==='link');
  setItemFieldVisibility('item-file-field',tab==='file');
  setItemFieldVisibility('item-folder-field',tab==='folder');
  setItemFieldVisibility('item-image-field',tab==='image');
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
if(document.getElementById('item-url-field')||document.getElementById('item-type'))toggleItemTypeFields();
