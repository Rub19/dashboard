/* ETHONE legacy compatibility module: journal. */
// ===================================================
//  JOURNAL
// ===================================================
let _selectedMood='';

function selectMood(emoji,label){
  _selectedMood=emoji;
  document.querySelectorAll('#journal-mood-picks button').forEach(b=>{
    const active=b.dataset.mood===emoji;
    b.style.background=active?'var(--accent)':'none';
    b.style.color=active?'var(--text-on-accent)':'var(--text)';
    b.style.borderColor=active?'var(--accent)':'var(--border2)';
  });
}

function addJournalEntry(){
  const p=curP();if(!p)return;
  const text=document.getElementById('journal-text').value.trim();
  if(!text&&!_selectedMood){toast('Write something or select a mood','error');return;}
  const title=document.getElementById('journal-title').value.trim();
  if(!p.state.journal)p.state.journal=[];
  const today=new Date().toLocaleDateString('en-CA');
  // Replace today's entry if exists
  const existing=p.state.journal.find(e=>e.date===today);
  if(existing){existing.text=text;existing.mood=_selectedMood;existing.title=title;existing.updated=new Date().toISOString();}
  else{p.state.journal.push({id:Date.now(),date:today,text,mood:_selectedMood,title,created:new Date().toISOString()});}
  p.state.journal=p.state.journal.slice(-365); // keep 1 year
  saveStateNow();closeModal('add-journal');
  document.getElementById('journal-text').value='';
  document.getElementById('journal-title').value='';
  _selectedMood='';
  document.querySelectorAll('#journal-mood-picks button').forEach(b=>{b.style.background='none';b.style.color='var(--text)';b.style.borderColor='var(--border2)';});
  renderJournal();toast('Entry saved 📖','success');
}

function renderJournal(){
  const p=curP();if(!p)return;
  const entries=(p.state.journal||[]).sort((a,b)=>b.date.localeCompare(a.date));
  const listEl=document.getElementById('journal-entries-list');
  const contentEl=document.getElementById('journal-entry-content');
  if(!listEl)return;
  if(!entries.length){
    listEl.innerHTML='<div style="font-size:11px;color:var(--muted);text-align:center;padding:12px">No entries yet</div>';
    return;
  }
  listEl.innerHTML=entries.map((e,i)=>{
    const d=new Date(e.date);
    const isToday=e.date===new Date().toLocaleDateString('en-CA');
    return `<div onclick="showJournalEntry(${e.id||i})" style="padding:8px 10px;border-radius:6px;cursor:pointer;background:var(--surface2);border:1px solid var(--border);transition:all .15s">
      <div style="display:flex;align-items:center;gap:6px">
        ${e.mood?`<span style="font-size:14px">${e.mood}</span>`:''}
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:600;color:var(--muted)">${isToday?'Today':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</div>
          ${e.title?`<div style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(e.title)}</div>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
  // Show most recent entry
  if(entries[0])showJournalEntryData(entries[0]);
}

function showJournalEntry(id){
  const p=curP();if(!p)return;
  const e=(p.state.journal||[]).find(e=>e.id===id||(e.id&&e.id===id));
  if(e)showJournalEntryData(e);
}

function showJournalEntryData(e){
  const contentEl=document.getElementById('journal-entry-content');
  if(!contentEl)return;
  const d=new Date(e.date);
  contentEl.innerHTML=`<div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border)">
      ${e.mood?`<div style="font-size:36px">${e.mood}</div>`:''}
      <div>
        <div style="font-size:16px;font-weight:700">${e.title?escapeHTML(e.title):'Journal entry'}</div>
        <div style="font-size:12px;color:var(--muted)">${d.toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>
      </div>
      <button onclick="openModal('add-journal')" style="margin-left:auto;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;color:var(--muted);padding:5px 10px;cursor:pointer;font-size:12px;font-family:var(--font)">✏️ Edit today</button>
    </div>
    <div style="font-size:14px;line-height:1.8;white-space:pre-wrap;color:var(--text)">${escapeHTML(e.text||'')}</div>
  </div>`;
}
