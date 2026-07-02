/* ETHONE legacy compatibility module: countdown. */
// ===================================================
//  COUNTDOWN TIMERS
// ===================================================
let _countdownTick=null;

function addCountdown(){
  const p=curP();if(!p)return;
  const name=document.getElementById('cd-name').value.trim();
  const date=document.getElementById('cd-date').value;
  if(!name||!date){toast('Enter a name and date','error');return;}
  const emoji=document.getElementById('cd-emoji').value||'🎉';
  const color=document.getElementById('cd-color').value||'var(--accent)';
  if(!p.state.countdowns)p.state.countdowns=[];
  p.state.countdowns.push({id:Date.now(),name,date,emoji,color});
  saveStateNow();closeModal('add-countdown');
  ['cd-name','cd-date','cd-emoji'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  renderCountdowns();toast('Countdown added! ⏳','success');
}

function deleteCountdown(id){
  const p=curP();if(!p)return;
  p.state.countdowns=(p.state.countdowns||[]).filter(c=>c.id!==id);
  saveStateNow();renderCountdowns();
}

function renderCountdowns(){
  const p=curP();if(!p)return;
  const grid=document.getElementById('countdown-grid');if(!grid)return;
  const cds=(p.state.countdowns||[]).sort((a,b)=>a.date.localeCompare(b.date));
  if(!cds.length){
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1;padding:40px"><div style="font-size:36px;margin-bottom:12px">⏳</div><div style="font-size:15px;font-weight:600;margin-bottom:8px">No countdowns yet</div><button class="btn btn-primary" onclick="openModal(\'add-countdown\')">+ Add event</button></div>';
    return;
  }
  grid.innerHTML=cds.map(c=>{
    const target=new Date(c.date+'T00:00:00');
    const now=new Date();
    const diff=target-now;
    const days=Math.ceil(diff/86400000);
    const past=diff<0;
    const dStr=past?`${Math.abs(days)} days ago`:(days===0?'Today!':`${days} day${days>1?'s':''} left`);
    const h=Math.abs(Math.floor((diff%86400000)/3600000));
    const m=Math.abs(Math.floor((diff%3600000)/60000));
    return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-md);padding:20px;text-align:center;position:relative">
      <button onclick="deleteCountdown(${c.id})" style="position:absolute;top:8px;right:8px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px">✕</button>
      <div style="font-size:36px;margin-bottom:8px">${c.emoji}</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:4px">${escapeHTML(c.name)}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:16px">${target.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
      <div style="font-size:36px;font-weight:800;font-family:var(--mono);color:${past?'var(--muted)':'var(--accent)'};letter-spacing:-2px;line-height:1">${past?'✅':Math.abs(days)}</div>
      <div style="font-size:12px;color:${past?'var(--muted)':'var(--text)'};margin-top:4px">${dStr}</div>
      ${!past&&days<=1?`<div style="font-size:11px;color:var(--muted);margin-top:2px">${h}h ${m}m</div>`:''}
    </div>`;
  }).join('');
}
