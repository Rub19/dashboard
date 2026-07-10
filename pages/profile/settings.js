/* ETHONE legacy compatibility module: profile-settings. */
// ── REGION PILL SELECTOR ───────────────────────
function setCompareRegion(pill){
  document.querySelectorAll('.region-pills [onclick*="setCompareRegion"]').forEach(p=>p.classList.remove('active'));
  pill.classList.add('active');
  document.getElementById('compare-valo-region').value=pill.dataset.val;
}

function setRegionPill(game, el){
  const pillsId = game + '-region-pills';
  document.querySelectorAll(`#${pillsId} .region-pill`).forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  const hiddenInput = document.getElementById(game + '-region');
  if(hiddenInput) hiddenInput.value = el.dataset.val;
}

// Restore region pill selection from saved value
function restoreRegionPill(game, val){
  if(!val) return;
  const pills = document.querySelectorAll(`#${game}-region-pills .region-pill`);
  pills.forEach(p=>{
    p.classList.toggle('active', p.dataset.val === val);
  });
  const hiddenInput = document.getElementById(game + '-region');
  if(hiddenInput) hiddenInput.value = val;
}

function renderProfileXP(p){
  if(!p)return;
  const xpWidget=document.getElementById('profile-xp-widget');
  if(!xpWidget)return;
  const xp=calcProfileXP(p);
  // Level: 1 + floor(sqrt(xp/50)), so level 1=0xp, 2=50xp, 3=200xp, 4=450xp...
  const level=Math.max(1,Math.floor(Math.sqrt(xp/50))+1);
  const xpForLevel=Math.pow(level-1,2)*50;
  const xpForNext=Math.pow(level,2)*50;
  const progress=xpForNext>xpForLevel?Math.min(100,Math.round(((xp-xpForLevel)/(xpForNext-xpForLevel))*100)):100;
  const lvlEl=document.getElementById('profile-level-num');
  const xpLabel=document.getElementById('profile-xp-label');
  const xpNext=document.getElementById('profile-xp-next');
  const xpBar=document.getElementById('profile-xp-bar');
  const xpBreak=document.getElementById('profile-xp-breakdown');
  if(lvlEl)lvlEl.textContent=level;
  if(xpLabel)xpLabel.textContent=xp.toLocaleString()+' XP total';
  if(xpNext)xpNext.textContent='Level '+(level+1)+' at '+xpForNext.toLocaleString()+' XP';
  if(xpBar)setTimeout(()=>{xpBar.style.width=progress+'%';},150);
  // Also update banner level
  const lvlBadge=document.getElementById('profile-banner-level');
  const lvlNum=document.getElementById('profile-banner-level-num');
  if(lvlBadge&&lvlNum){
    lvlBadge.style.display='block';
    lvlNum.textContent=level;
  }
  // Breakdown
  if(xpBreak){
    const s=p.state||{};
    const parts=[];
    const done=(s.todos||[]).filter(t=>t.done).length;
    if(done)parts.push(done+'✅ tasks ('+(done*10)+' XP)');
    const pomo=(s.pomoHistory||[]).length;
    if(pomo)parts.push(pomo+'🍅 pomodoros ('+(pomo*25)+' XP)');
    const notes=(s.notes||[]).length;
    if(notes)parts.push(notes+'📝 notes ('+(notes*5)+' XP)');
    const j=(s.journal||[]).length;
    if(j)parts.push(j+'📖 journal ('+(j*8)+' XP)');
    xpBreak.textContent=parts.length?parts.join(' · '):'Complete tasks, pomodoros, notes to earn XP';
  }
}

function calcProfileXP(p){
  if(!p?.state)return 0;
  const s=p.state;
  let xp=0;
  xp+=(s.todos||[]).filter(t=>t.done).length*10;
  xp+=(s.pomoHistory||[]).length*25;
  (s.habits||[]).forEach(h=>{xp+=(h.streak||0)*5;});
  xp+=(s.items||[]).length*3;
  xp+=(s.events||[]).length*2;
  xp+=(s.notes||[]).length*5;
  xp+=(s.goals||[]).filter(g=>g.done).length*20;
  xp+=(s.journal||[]).length*8;
  (s.kanban||[]).forEach(col=>(col.cards||[]).forEach(c=>{if(col.id==='done'||c.done)xp+=8;}));
  return Math.max(0,xp);
}

function renderProfileQuickStats(p){
  const container=document.getElementById('profile-quick-stats');
  if(!container)return;
  const doneTasks=(p.state.todos||[]).filter(t=>t.done).length;
  const totalTasks=(p.state.todos||[]).length;
  const pomoDone=(p.state.pomoHistory||[]).length;
  const habitStreak=Math.max(...(p.state.habits||[]).map(h=>h.streak||0),0);
  const notesCount=(p.state.notes||[]).length;
  const stats=[
    {label:'Tasks done',val:doneTasks+'/'+totalTasks,icon:'circle-check-big',color:'var(--accent2)'},
    {label:'Pomodoros',val:pomoDone,icon:'timer',color:'var(--accent3)'},
    {label:'Best streak',val:habitStreak,icon:'flame',color:'var(--accent4)'},
    {label:'Notes',val:notesCount,icon:'notebook-pen',color:'var(--accent5)'},
  ];
  container.innerHTML=stats.map(s=>`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px;text-align:center">
    <div style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:16px;font-weight:700;color:${s.color}"><i data-lucide="${s.icon}" aria-hidden="true" style="width:15px;height:15px"></i><span>${s.val}</span></div>
    <div style="font-size:10px;color:var(--muted);margin-top:2px">${s.label}</div>
  </div>`).join('');
  try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons({attrs:{'stroke-width':1.9,'aria-hidden':'true'}},container)}catch(e){}
}

function updateProfileBio(val){
  const p=curP();if(!p)return;
  if(!p.state)p.state={};
  p.state.bio=val;
  clearTimeout(window._bioSaveTO);
  window._bioSaveTO=setTimeout(()=>saveStateNow(),800);
}

function updateSocialLink(key,val){
  const p=curP();if(!p)return;
  if(!p.state.socials)p.state.socials={};
  p.state.socials[key]=val;
  clearTimeout(window._socialSaveTO);
  window._socialSaveTO=setTimeout(()=>saveStateNow(),800);
}
