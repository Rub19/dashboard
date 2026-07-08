/* ETHONE legacy compatibility module: notes. */
// ===================================================
//  NOTES
// ===================================================
let noteTO, _currentNoteId=null, _notePreviewMode=false, _noteSaveTO=null;

function getNotesArray(){
  const p=curP();if(!p)return[];
  if(!p.state.notes){
    p.state.notes=[];
    if(p.state.note){
      p.state.notes.push({id:Date.now(),title:'My Note',content:p.state.note,color:'',pinned:false,created:new Date().toISOString(),updated:new Date().toISOString()});
      p.state.note='';
    }
  }
  return p.state.notes;
}

function filterNotes(query){
  const q=(query||'').toLowerCase().trim();
  const p=curP();if(!p)return;
  const notes=p.state.notes||[];
  const container=document.getElementById('notes-list-panel');if(!container)return;
  const filtered=q?notes.filter(n=>(n.title||'').toLowerCase().includes(q)||(n.content||'').toLowerCase().includes(q)):notes;
  if(!filtered.length){
    container.innerHTML=`<div style="padding:12px;font-size:12px;color:var(--muted);text-align:center">${q?'Aucun résultat':'Aucune note'}</div>`;
    return;
  }
  container.innerHTML=filtered.map(n=>{
    const isActive=n.id===_currentNoteId;
    const preview=(n.content||'').slice(0,50).split('\n').join(' ')||'Note vide';
    const color=n.color||'';
    return `<div class="note-list-item${isActive?' active':''}" onclick="selectNote(${n.id})" style="${color?'border-left:3px solid '+color+';padding-left:9px':''}">
      <div class="note-list-title">${escapeHTML(n.title||'Sans titre')}</div>
      <div class="note-list-preview">${escapeHTML(preview)}</div>
    </div>`;
  }).join('');
}

function renderNotesList(){
  const notes=getNotesArray();
  const container=document.getElementById('notes-list-panel');
  if(!container)return;
  const sorted=[...notes.filter(n=>n.pinned),...notes.filter(n=>!n.pinned)].sort((a,b)=>{
    if(a.pinned&&!b.pinned)return-1;if(!a.pinned&&b.pinned)return 1;
    return new Date(b.updated)-new Date(a.updated);
  });
  if(!sorted.length){container.innerHTML='<div style="font-size:12px;color:var(--muted);text-align:center;padding:20px">Aucune note</div>';showNoteEditor(false);renderNoteContext();return;}
  container.innerHTML=sorted.map(n=>{
    const isActive=n.id===_currentNoteId;
    const preview=n.content?.slice(0,60).replace(/[#*`\n]/g,' ')||'Note vide';
    const dot=n.color?`<span style="width:7px;height:7px;border-radius:50%;background:${n.color};flex-shrink:0;display:inline-block"></span>`:'';
    return `<div class="note-list-item${isActive?' active':''}" onclick="selectNote(${n.id})" style="padding:10px 12px;border-radius:var(--r-sm);cursor:pointer;border:1.5px solid ${isActive?'var(--accent)':'var(--border)'};background:${isActive?'var(--accent-subtle)':'var(--surface2)'};transition:all .15s">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        ${dot}
        <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;color:${isActive?'var(--accent-light)':'var(--text)'}">${escapeHTML(n.title||'Sans titre')}</div>
        ${n.pinned?'<span style="font-size:10px">📌</span>':''}
      </div>
      <div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(preview)}</div>
      <div style="font-size:10px;color:var(--muted2);margin-top:3px">${new Date(n.updated).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
    </div>`;
  }).join('');
}

function showNoteEditor(show){
  const editor=document.getElementById('note-editor-panel');
  const empty=document.getElementById('note-empty-state');
  if(editor)editor.style.display=show?'block':'none';
  if(empty)empty.style.display=show?'none':'block';
}

function selectNote(id){
  _currentNoteId=id;
  const note=getNotesArray().find(n=>n.id===id);
  if(!note)return;
  showNoteEditor(true);
  const ta=document.getElementById('main-note');
  const title=document.getElementById('note-title-input');
  const colorPick=document.getElementById('note-color-pick');
  const pinBtn=document.getElementById('note-pin-btn');
  if(ta)ta.value=note.content||'';
  if(title)title.value=note.title||'';
  if(colorPick)colorPick.value=note.color||'';
  if(pinBtn)pinBtn.style.opacity=note.pinned?'1':'0.5';
  updateNoteStats();renderNotesList();renderNoteContext();
  if(_notePreviewMode)renderNotePreview();
}

function newNote(){
  const p=curP();if(!p)return;
  if(!p.state.notes)p.state.notes=[];
  const note={id:Date.now(),title:'Nouvelle note',content:'',color:'',pinned:false,created:new Date().toISOString(),updated:new Date().toISOString()};
  p.state.notes.unshift(note);saveStateNow();
  _currentNoteId=note.id;renderNotesList();selectNote(note.id);
  addActivity('Nouvelle note creee','var(--accent)','content');
  setTimeout(()=>{const t=document.getElementById('note-title-input');if(t){t.focus();t.select();}},100);
}

function saveNote(){
  const p=curP();if(!p)return;
  const isDash=document.getElementById('page-dashboard')?.classList.contains('active');
  const quickNote=document.getElementById('quick-note');
  const mainNote=document.getElementById('main-note');
  if(isDash&&quickNote){
    p.state.note=quickNote.value;
    if(mainNote)mainNote.value=quickNote.value;
    clearTimeout(noteTO);noteTO=setTimeout(()=>saveStateNow(),600);
    return;
  }
  // Multi-note save
  const note=getNotesArray().find(n=>n.id===_currentNoteId);
  if(!note)return;
  note.content=mainNote?.value||'';note.updated=new Date().toISOString();
  const st=document.getElementById('note-saved-status');if(st)st.textContent='Enregistrement...';
  clearTimeout(_noteSaveTO);
  _noteSaveTO=setTimeout(()=>{
    saveStateNow();
    if(st){st.textContent='Enregistrée';setTimeout(()=>{if(st)st.textContent='Enregistrement automatique';},1500);}
    renderNotesList();
    renderNoteContext();
  },600);
  updateNoteStats();
  if(_notePreviewMode)renderNotePreview();
}

function updateNoteTitle(val){
  const note=getNotesArray().find(n=>n.id===_currentNoteId);if(!note)return;
  note.title=val;note.updated=new Date().toISOString();
  clearTimeout(_noteSaveTO);_noteSaveTO=setTimeout(()=>{saveStateNow();renderNotesList();},600);
}

function updateNoteColor(color){
  const note=getNotesArray().find(n=>n.id===_currentNoteId);if(!note)return;
  note.color=color;note.updated=new Date().toISOString();saveStateNow();renderNotesList();
  renderNoteContext();
}

function pinNote(){
  const note=getNotesArray().find(n=>n.id===_currentNoteId);if(!note)return;
  note.pinned=!note.pinned;note.updated=new Date().toISOString();saveStateNow();renderNotesList();
  const btn=document.getElementById('note-pin-btn');if(btn)btn.style.opacity=note.pinned?'1':'0.5';
  renderNoteContext();
  toast(note.pinned?'Note épinglée':'Note retirée des favoris','info');
}

function deleteCurrentNote(){
  if(!_currentNoteId||!confirm('Supprimer cette note ?'))return;
  const p=curP();if(!p)return;
  p.state.notes=(p.state.notes||[]).filter(n=>n.id!==_currentNoteId);saveStateNow();
  const notes=getNotesArray();
  _currentNoteId=notes[0]?.id||null;
  if(_currentNoteId)selectNote(_currentNoteId);else showNoteEditor(false);
  renderNotesList();renderNoteContext();toast('Note supprimée','info');
}

function copyNote(){
  const ta=document.getElementById('main-note');if(!ta)return;
  navigator.clipboard.writeText(ta.value).then(()=>toast('Note copiée','success'));
}

function updateNoteStats(){
  const ta=document.getElementById('main-note');if(!ta)return;
  const chars=ta.value.length,words=ta.value.trim()?ta.value.trim().split(/\s+/).length:0;
  const cc=document.getElementById('note-char-count'),wc=document.getElementById('note-word-count');
  if(cc)cc.textContent=chars.toLocaleString('fr-FR')+' caractères';
  if(wc)wc.textContent=words.toLocaleString('fr-FR')+' mots';
  renderNoteContext();
}

function renderNoteContext(){
  const note=getNotesArray().find(n=>n.id===_currentNoteId);
  const words=document.getElementById('note-context-words');
  const chars=document.getElementById('note-context-chars');
  const state=document.getElementById('note-context-state');
  const content=note?.content||'';
  if(words)words.textContent=(content.trim()?content.trim().split(/\s+/).length:0).toLocaleString('fr-FR');
  if(chars)chars.textContent=content.length.toLocaleString('fr-FR');
  if(state)state.textContent=note?.pinned?'Épinglée':'Standard';
}

function toggleNotePreview(){
  _notePreviewMode=!_notePreviewMode;
  const ta=document.getElementById('main-note'),preview=document.getElementById('note-preview-area'),btn=document.getElementById('note-preview-btn');
  if(ta)ta.style.display=_notePreviewMode?'none':'block';
  if(preview)preview.style.display=_notePreviewMode?'block':'none';
  if(btn){
    btn.innerHTML=_notePreviewMode?'<i data-lucide="pencil" aria-hidden="true"></i> Modifier':'<i data-lucide="eye" aria-hidden="true"></i> Aperçu';
    btn.style.background=_notePreviewMode?'var(--accent-subtle)':'';
    try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
  }
  if(_notePreviewMode)renderNotePreview();
}

function renderNotePreview(){
  const ta=document.getElementById('main-note'),preview=document.getElementById('note-preview-area');
  if(!ta||!preview)return;
  let html=escapeHTML(ta.value)
    .replace(/^### (.+)$/gm,'<h3 style="font-size:15px;font-weight:700;margin:12px 0 6px;color:var(--accent-light)">$1</h3>')
    .replace(/^## (.+)$/gm,'<h2 style="font-size:17px;font-weight:700;margin:14px 0 7px">$1</h2>')
    .replace(/^# (.+)$/gm,'<h1 style="font-size:20px;font-weight:800;margin:16px 0 8px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em style="color:var(--muted)">$1</em>')
    .replace(/`(.+?)`/g,'<code style="background:var(--surface3);padding:1px 5px;border-radius:4px;font-family:var(--mono);font-size:12px;color:var(--accent2)">$1</code>')
    .replace(/^- \[x\] (.+)$/gm,'<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="color:var(--accent2)">✅</span><s style="color:var(--muted)">$1</s></div>')
    .replace(/^- \[ \] (.+)$/gm,'<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span>⬜</span>$1</div>')
    .replace(/^- (.+)$/gm,'<div style="display:flex;gap:8px;margin:2px 0"><span style="color:var(--accent)">•</span>$1</div>')
    .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid var(--border2);margin:14px 0">')
    .replace(/\n/g,'<br>');
  preview.innerHTML=html;
}

function noteFormat(before,after){
  const ta=document.getElementById('main-note');if(!ta)return;
  const s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e)||'text';
  ta.value=ta.value.slice(0,s)+before+sel+after+ta.value.slice(e);
  ta.selectionStart=s+before.length;ta.selectionEnd=s+before.length+sel.length;
  ta.focus();saveNote();
}

function noteInsert(text){
  const ta=document.getElementById('main-note');if(!ta)return;
  const pos=ta.selectionStart,lineStart=ta.value.lastIndexOf('\n',pos-1)+1;
  ta.value=ta.value.slice(0,lineStart)+text+ta.value.slice(lineStart);
  ta.selectionStart=ta.selectionEnd=lineStart+text.length;
  ta.focus();saveNote();
}

function initNotes(){
  const notes=getNotesArray();
  renderNotesList();
  if(notes.length){
    const sorted=[...notes].sort((a,b)=>new Date(b.updated)-new Date(a.updated));
    _currentNoteId=sorted[0].id;selectNote(_currentNoteId);
  } else {showNoteEditor(false);}
  renderNoteContext();
  try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}
}

function clearNote(){
  if(!confirm('Clear this note\'s content?'))return;
  const ta=document.getElementById('main-note');if(ta){ta.value='';saveNote();}
}
