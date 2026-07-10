/* ETHONE legacy compatibility module: pomodoro. */
//  POMODORO IMPROVED
// ===================================================
function POMO_MODES(){return [
  {label:t('focus'),       duration:25*60, ring:'#f87171', bg:'rgba(248,113,113,.12)'},
  {label:t('short_break'), duration:5*60,  ring:'#34d399', bg:'rgba(52,211,153,.12)'},
  {label:t('long_break'),  duration:15*60, ring:'#3b82f6', bg:'rgba(59,130,246,.12)'},
];}
let pomoIdx=0, pomoRemaining=0, pomoRunning=false, pomoInterval=null, pomoCount=0;
let _pomoSoundEnabled=true;

function pomoLanguage(){
  return String(window._lang||document.documentElement.lang||'en').toLowerCase().slice(0,2);
}

function sendPomoDesktopNotification(title,body){
  if(!('Notification' in window)||Notification.permission!=='granted')return false;
  try{
    const p=typeof curP==='function'?curP():null;
    if(p&&p.state&&p.state.notifEnabled===false)return false;
    new Notification(title,{body:body||''});
    return true;
  }catch(e){return false;}
}

function togglePomoSound(){
  _pomoSoundEnabled=!_pomoSoundEnabled;
  const icon=document.getElementById('pomo-sound-icon');
  const btn=document.getElementById('pomo-sound-btn');
  if(icon){
    if(_pomoSoundEnabled){
      icon.innerHTML='<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
    } else {
      icon.innerHTML='<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
    }
  }
  if(btn)btn.style.color=_pomoSoundEnabled?'var(--muted2)':'rgba(248,113,113,.7)';
  toast(_pomoSoundEnabled?'Sound on':'Sound off','info');
}

function playPomoSound(type){
  if(!_pomoSoundEnabled)return;
  try{
    const ctx=getAudioCtx();
    const gain=ctx.createGain();gain.connect(ctx.destination);
    if(type==='tick'){
      // Soft tick every minute
      const osc=ctx.createOscillator();
      osc.connect(gain);osc.type='sine';osc.frequency.value=800;
      gain.gain.setValueAtTime(0,ctx.currentTime);
      gain.gain.linearRampToValueAtTime(.06,ctx.currentTime+.01);
      gain.gain.linearRampToValueAtTime(0,ctx.currentTime+.08);
      osc.start(ctx.currentTime);osc.stop(ctx.currentTime+.1);
    } else if(type==='done'){
      // Ascending chime sequence
      [523,659,784,1047].forEach((freq,i)=>{
        const osc=ctx.createOscillator();const g=ctx.createGain();
        osc.connect(g);g.connect(ctx.destination);
        osc.type='sine';osc.frequency.value=freq;
        const t=ctx.currentTime+i*.18;
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(.25,t+.05);
        g.gain.linearRampToValueAtTime(0,t+.35);
        osc.start(t);osc.stop(t+.4);
      });
    } else if(type==='break'){
      // Descending softer tone
      [784,659,523].forEach((freq,i)=>{
        const osc=ctx.createOscillator();const g=ctx.createGain();
        osc.connect(g);g.connect(ctx.destination);
        osc.type='sine';osc.frequency.value=freq;
        const t=ctx.currentTime+i*.2;
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(.18,t+.05);
        g.gain.linearRampToValueAtTime(0,t+.28);
        osc.start(t);osc.stop(t+.3);
      });
    } else if(type==='start'){
      // Short double beep
      [440,660].forEach((freq,i)=>{
        const osc=ctx.createOscillator();const g=ctx.createGain();
        osc.connect(g);g.connect(ctx.destination);
        osc.type='sine';osc.frequency.value=freq;
        const t=ctx.currentTime+i*.12;
        g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.15,t+.04);g.gain.linearRampToValueAtTime(0,t+.12);
        osc.start(t);osc.stop(t+.15);
      });
    }
  }catch(e){}
}

function pomoSelectMode(idx){
  if(pomoRunning)return;
  pomoIdx=idx;
  pomoRemaining=POMO_MODES()[idx].duration;
  renderPomo();
}

function pomoReset(){
  clearInterval(pomoInterval);pomoRunning=false;pomoInterval=null;
  // Supprimer TOUTES les cles pomo du localStorage
  localStorage.removeItem('pomo_end');
  localStorage.removeItem('pomo_idx');
  localStorage.removeItem('pomo_count');
  pomoRemaining=POMO_MODES()[pomoIdx].duration;
  renderPomo();
}

function pomoSkip(){
  clearInterval(pomoInterval);pomoRunning=false;pomoInterval=null;
  localStorage.removeItem('pomo_end');
  if(pomoIdx===0){ // 0=Focus toujours
    pomoCount++;savePomoSession();
    pomoIdx=pomoCount%4===0?2:1;
  } else {
    pomoIdx=0;
  }
  pomoRemaining=POMO_MODES()[pomoIdx].duration;
  renderPomo();
}

function pomoToggle(){
  if(pomoRunning){
    clearInterval(pomoInterval);pomoRunning=false;pomoInterval=null;
    // Supprimer pomo_end: le timer est en pause, pas en cours
    localStorage.removeItem('pomo_end');
    renderPomo();return;
  }
  playPomoSound('start');
  pomoRunning=true;
  const endTime=Date.now()+(pomoRemaining*1000);
  localStorage.setItem('pomo_end',endTime);
  localStorage.setItem('pomo_idx',pomoIdx);
  localStorage.setItem('pomo_count',pomoCount);
  let lastMin=Math.ceil(pomoRemaining/60);
  pomoInterval=setInterval(()=>{
    const remaining=Math.round((parseInt(localStorage.getItem('pomo_end')||endTime)-Date.now())/1000);
    pomoRemaining=Math.max(0,remaining);
    // Mettre a jour localStorage a chaque tick pour fiabilite apres reload
    localStorage.setItem('pomo_idx',pomoIdx);
    localStorage.setItem('pomo_count',pomoCount);
    // Tick sound on each new minute
    const curMin=Math.ceil(pomoRemaining/60);
    if(curMin<lastMin&&curMin>0){lastMin=curMin;playPomoSound('tick');}
    if(pomoRemaining<=0){
      clearInterval(pomoInterval);pomoRunning=false;pomoInterval=null;
      localStorage.removeItem('pomo_end');
      if(pomoIdx===0){ // 0=Focus
        pomoCount++;savePomoSession();
        playPomoSound('done');
        if(typeof addActivity==='function')addActivity('Focus session complete!','var(--accent3)','focus');
        notifyPomoComplete(pomoCount);
        const language=pomoLanguage();
        toast(language==='fr'?'Focus termine ! Prends une pause':language==='es'?'Enfoque completo! Tomate un descanso':'Focus done! Take a break','success');
        sendPomoDesktopNotification('Pomodoro complete!','Time for a break - great work!');
        pomoIdx=pomoCount%4===0?2:1;
        // Flash animation
        const wrap=document.getElementById('pomo-ring-wrap');
        if(wrap){wrap.classList.add('pomo-flash');setTimeout(()=>wrap.classList.remove('pomo-flash'),2000);}
      } else {
        playPomoSound('break');
        toast('Break terminee - au boulot !','info');
        sendPomoDesktopNotification('Pause terminee',"C'est reparti - session Focus !");
        pomoIdx=0;
      }
      pomoRemaining=POMO_MODES()[pomoIdx].duration;
    }
    renderPomo();
  },500);
  renderPomo();
}

// Restore timer if page was reloaded while running
function restorePomoIfRunning(){
  const savedEnd=parseInt(localStorage.getItem('pomo_end')||0);
  if(!savedEnd)return; // pas de timer sauvegarde: rien a faire
  const remaining=Math.round((savedEnd-Date.now())/1000);
  pomoIdx=parseInt(localStorage.getItem('pomo_idx')||0);
  pomoCount=parseInt(localStorage.getItem('pomo_count')||0);
  if(remaining>0){
    // Timer encore actif: reprendre avec l'endTime exact sauvegarde
    pomoRemaining=remaining;
    pomoRunning=true; // marquer comme running avant de demarrer l'interval
    let lastMin=Math.ceil(pomoRemaining/60);
    pomoInterval=setInterval(()=>{
      const rem=Math.round((savedEnd-Date.now())/1000);
      pomoRemaining=Math.max(0,rem);
      localStorage.setItem('pomo_idx',pomoIdx);
      localStorage.setItem('pomo_count',pomoCount);
      const curMin=Math.ceil(pomoRemaining/60);
      if(curMin<lastMin&&curMin>0){lastMin=curMin;playPomoSound('tick');}
      if(pomoRemaining<=0){
        clearInterval(pomoInterval);pomoRunning=false;pomoInterval=null;
        localStorage.removeItem('pomo_end');
        if(pomoIdx===0){
          pomoCount++;savePomoSession();
          playPomoSound('done');
          if(typeof addActivity==='function')addActivity('Focus session complete!','var(--accent3)','focus');
          notifyPomoComplete(pomoCount);
          const language=pomoLanguage();
          toast(language==='fr'?'Focus termine ! Prends une pause':language==='es'?'Enfoque completo! Tomate un descanso':'Focus done! Take a break','success');
          sendPomoDesktopNotification('Pomodoro complete!','Time for a break - great work!');
          pomoIdx=pomoCount%4===0?2:1;
        } else {
          playPomoSound('break');
          toast('Break terminee - au boulot !','info');
          sendPomoDesktopNotification('Pause terminee',"C'est reparti - session Focus !");
          pomoIdx=0;
        }
        pomoRemaining=POMO_MODES()[pomoIdx].duration;
      }
      renderPomo();
    },500);
    renderPomo(); // afficher immediatement le bon temps
  } else {
    // Timer expire pendant l'absence: nettoyer silencieusement
    localStorage.removeItem('pomo_end');
    localStorage.removeItem('pomo_idx');
    localStorage.removeItem('pomo_count');
    pomoRemaining=POMO_MODES()[pomoIdx].duration;
    pomoRunning=false;
    renderPomo();
  }
}
