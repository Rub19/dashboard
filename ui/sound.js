/* ETHONE legacy compatibility module: sound. */
//  UI CLICK SOUND (Web Audio API - no file needed)
// ===================================================
let _audioCtx = null;
function getAudioCtx(){
  if(!_audioCtx || _audioCtx.state==='closed'){
    _audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  }
  return _audioCtx;
}

function playClick(type='soft'){
  try{
    const ctx = getAudioCtx();
    if(ctx.state==='suspended') ctx.resume();
    const now = ctx.currentTime;
    if(type==='soft'){
      // Soft pop: sine sweep 900->200Hz, 60ms
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now); osc.stop(now + 0.06);
      osc.onended = () => {};
    } else if(type==='nav'){
      // Softer lower tick for nav items
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
    } else if(type==='success'){
      // Two-tone chime for success actions (add item, create profilee...)
      [0, 0.07].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = i===0 ? 660 : 880;
        gain.gain.setValueAtTime(0.08, now+delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now+delay+0.12);
        osc.start(now+delay); osc.stop(now+delay+0.12);
      });
    }
  }catch(e){}
}

function createPressRipple(el,e){
  if(!el||el.disabled)return;
  const rect=el.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const size=Math.max(rect.width,rect.height)*1.65;
  const ripple=document.createElement('span');
  ripple.className='press-ripple';
  ripple.style.width=size+'px';
  ripple.style.height=size+'px';
  ripple.style.left=(e.clientX-rect.left)+'px';
  ripple.style.top=(e.clientY-rect.top)+'px';
  const cs=getComputedStyle(el);
  if(cs.position==='static')el.style.position='relative';
  if(cs.overflow==='visible')el.style.overflow='hidden';
  el.appendChild(ripple);
  ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
}

// Delegated click listener - covers ALL interactive elements
document.addEventListener('click', e => {
  const t = e.target;
  const interactive=t.closest('.btn, button, .nav-item, .cat-tab, .settings-tab, .todo-item, .item-row, .kanban-card, .pinned-card, .link-card, .stat-card, .ps-add, .ps-profile, .ps-manage-btn, .pw-num, .toggle, .theme-swatch, .avatar-opt, .habit-day, .cal-day, .cal-nav, .panel-action');
  if(interactive)createPressRipple(interactive,e);
  // Success sound for primary action buttons
  if(t.classList.contains('btn-primary')){
    playClick('success'); return;
  }
  // Nav items
  if(t.closest('.nav-item')){
    playClick('nav'); return;
  }
  // Everything else interactive
  if(interactive){
    playClick('soft');
  }
}, { passive: true });



// ===================================================
