/* ETHONE legacy compatibility module: daily-focus. */
// â•â• FOCUS DU JOUR â•â•
function renderDailyFocus(){
  const p=curP();if(!p)return;
  const today=new Date().toLocaleDateString('en-CA');
  const df=p.state.dailyFocus;
  const textEl=document.getElementById('daily-focus-text');
  const checkBox=document.getElementById('daily-focus-check');
  const checkIcon=document.getElementById('daily-focus-check-icon');
  if(!textEl)return;
  if(df&&df.date===today&&df.text){
    textEl.textContent=df.text;
    textEl.style.fontStyle='normal';
    textEl.style.color=df.done?'var(--muted)':'var(--text)';
    textEl.style.textDecoration=df.done?'line-through':'none';
    if(checkBox){
      checkBox.style.display='flex';
      checkBox.style.border=df.done?'2px solid #4ade80':'2px solid rgba(255,255,255,.15)';
      checkBox.style.background=df.done?'rgba(74,222,128,.12)':'transparent';
    }
    if(checkIcon)checkIcon.style.opacity=df.done?'1':'0';
  } else {
    textEl.textContent="Pas d'objectif pour aujourd'hui...";
    textEl.style.fontStyle='italic';
    textEl.style.color='var(--muted)';
    textEl.style.textDecoration='none';
    if(checkBox)checkBox.style.display='none';
  }
}

function dailyFocusMarkup(){
  return `<div id="daily-focus-check" onclick="toggleDailyFocusDone()" style="display:none;width:22px;height:22px;border-radius:6px;border:2px solid rgba(255,255,255,.15);background:transparent;cursor:pointer;flex-shrink:0;align-items:center;justify-content:center;transition:all .2s">
<svg fill="none" id="daily-focus-check-icon" style="width:12px;height:12px;opacity:0;transition:opacity .15s" viewBox="0 0 16 16"><polyline points="2,8 6,12 14,4" stroke="#4ade80" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></polyline></svg>
</div>
<span id="daily-focus-text" style="flex:1;font-size:13px;color:var(--muted);font-style:italic">Pas d'objectif pour aujourd'hui...</span>`;
}

function editDailyFocus(){
  const p=curP();if(!p)return;
  const today=new Date().toLocaleDateString('en-CA');
  const current=p.state.dailyFocus?.date===today?p.state.dailyFocus?.text||'':'';
  const panel=document.getElementById('daily-focus-panel');if(!panel)return;
  const display=document.getElementById('daily-focus-display');if(!display)return;
  display.innerHTML=`<input id="daily-focus-input" value="${escapeHTML(current)}" placeholder="Mon objectif pour aujourd'hui..."
    style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 10px;color:var(--text);font-family:var(--font);font-size:13px;outline:none">
    <button onclick="saveDailyFocus()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap">OK</button>
    <button onclick="const d=document.getElementById('daily-focus-display');if(d)d.innerHTML=dailyFocusMarkup();renderDailyFocus();" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:0 4px">âœ•</button>`;
  const inp=document.getElementById('daily-focus-input');
  if(inp){inp.focus();inp.select();inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveDailyFocus();}});}
}

function saveDailyFocus(){
  const inp=document.getElementById('daily-focus-input');if(!inp)return;
  const text=inp.value.trim();
  const p=curP();if(!p)return;
  const today=new Date().toLocaleDateString('en-CA');
  if(!p.state)p.state={};
  p.state.dailyFocus={text,date:today,done:false};
  // Restaurer le display
  const display=document.getElementById('daily-focus-display');
  if(display)display.innerHTML=dailyFocusMarkup();
  renderDailyFocus();
  saveStateNow();
  if(_sbUser){clearTimeout(_saveCloudTimeout);saveCloudState().catch(()=>{});}
}

function toggleDailyFocusDone(){
  const p=curP();if(!p)return;
  const today=new Date().toLocaleDateString('en-CA');
  if(!p.state.dailyFocus||p.state.dailyFocus.date!==today)return;
  p.state.dailyFocus.done=!p.state.dailyFocus.done;
  if(p.state.dailyFocus.done){
    addActivity('Objectif du jour accompli !','#4ade80','task');
    toast('ðŸŽ¯ Objectif accompli !','success');
  }
  renderDailyFocus();
  saveStateNow();
  if(_sbUser){clearTimeout(_saveCloudTimeout);saveCloudState().catch(()=>{});}
}

function savePomoSession(){
  const p=curP();if(!p)return;
  if(!p.state.pomoHistory)p.state.pomoHistory=[];
  p.state.pomoHistory.push({ts:new Date().toISOString(),duration:POMO_MODES()[0].duration});
  if(p.state.pomoHistory.length>200)p.state.pomoHistory=p.state.pomoHistory.slice(-200);
  saveStateNow();
  renderPomoStats();
}

function renderPomo(){
  const mode=POMO_MODES()[pomoIdx];
  const total=mode.duration;
  const pct=pomoRemaining/total;
  // r=68, circumference = 2*PI*68 â‰ˆ 427
  const circumference=427;

  // Time display
  const m=String(Math.floor(pomoRemaining/60)).padStart(2,'0');
  const sec=String(pomoRemaining%60).padStart(2,'0');
  const el=document.getElementById('pomo-time');if(el)el.textContent=m+':'+sec;

  // Mode badge
  const badge=document.getElementById('pomo-mode-badge');
  if(badge)badge.textContent=mode.label.toUpperCase()+(pomoIdx===0?' Â· SESSION '+(pomoCount+1):'');

  // Ring progress + color + pulse
  const ring=document.getElementById('pomo-ring');
  if(ring){
    ring.style.strokeDashoffset=circumference*(1-pct);
    ring.style.stroke=mode.ring;
  }
  const wrap=document.getElementById('pomo-ring-wrap');
  if(wrap){
    if(pomoRunning)wrap.classList.add('pomo-ring-running');
    else wrap.classList.remove('pomo-ring-running');
  }

  // Mode tabs
  POMO_MODES().forEach((_,i)=>{
    const tab=document.getElementById('pomo-tab-'+i);
    if(!tab)return;
    tab.classList.toggle('active',i===pomoIdx);
    if(i===pomoIdx){tab.style.background=`rgba(${hexToRgb(mode.ring)},0.15)`;tab.style.color=mode.ring;}
    else{tab.style.background='';tab.style.color='';}
  });

  // Session dots
  const dots=document.getElementById('pomo-session-dots');
  if(dots){
    dots.innerHTML=Array.from({length:4},(_,i)=>{
      const done=i<(pomoCount%4);
      return`<div class="pomo-dot${done?' done':''}" style="${done?`background:${mode.ring};box-shadow:0 0 6px ${mode.ring}40`:''}"></div>`;
    }).join('');
  }

  // Play button
  const btn=document.getElementById('pomo-play-btn');
  const icon=document.getElementById('pomo-play-icon');
  if(btn){
    btn.style.background=pomoRunning?'rgba(255,255,255,.06)':mode.ring;
    btn.style.boxShadow=pomoRunning?'none':`0 4px 20px ${mode.ring}50`;
    btn.style.color='#fff';
  }
  if(icon){
    icon.innerHTML=pomoRunning
      ?'<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>'
      :'<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>';
  }

  renderPomoStats();
}

function renderPomoStats(){
  const p=curP();
  const container=document.getElementById('pomo-today-stats');
  if(!container)return;
  if(!p?.state?.pomoHistory)if(p?.state)p.state.pomoHistory=[];
  const history=p?.state?.pomoHistory||[];
  const todayLocal=new Date().toLocaleDateString('en-CA');
  const todaySessions=history.filter(s=>{
    if(!s.ts)return false;
    return new Date(s.ts).toLocaleDateString('en-CA')===todayLocal;
  }).length;
  const totalSessions=history.length;
  const totalMins=Math.round(history.reduce((s,h)=>s+(h.duration||1500),0)/60);
  const streak=getPomoDayStreak(history);
  const mode=POMO_MODES()[pomoIdx];

  container.innerHTML=[
    {label:'Today',   val:todaySessions, extra:'ðŸ…', color:mode.ring},
    {label:'Total',   val:totalSessions, extra:'', color:'var(--text)'},
    {label:'Focus',   val:totalMins>=60?(totalMins/60).toFixed(1)+'h':totalMins+'m', extra:'', color:'#34d399'},
    {label:'Streak',  val:streak,        extra:'ðŸ”¥', color:'#fbbf24'},
  ].map(s=>`<div class="pomo-stat-cell">
    <div class="pomo-stat-val">${s.val}${s.extra}</div>
    <div class="pomo-stat-lbl">${s.label}</div>
  </div>`).join('');
}

function getPomoDayStreak(history){
  if(!history.length)return 0;
  const dates=[...new Set(history.map(s=>new Date(s.ts||s).toLocaleDateString('en-CA')))].sort().reverse();
  let streak=0;
  const today=new Date().toLocaleDateString('en-CA');
  const yesterday=new Date(Date.now()-86400000).toLocaleDateString('en-CA');
  if(dates[0]!==today&&dates[0]!==yesterday)return 0;
  for(let i=0;i<dates.length;i++){
    const expected=new Date(Date.now()-i*86400000).toLocaleDateString('en-CA');
    if(dates[i]===expected)streak++;
    else break;
  }
  return streak;
}

// ===================================================
