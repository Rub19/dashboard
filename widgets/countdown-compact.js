/* ETHONE legacy compatibility module: countdown-widget. */
// ===================================================
//  COUNTDOWN
// ===================================================
let cdInterval=null;
function saveCountdown(){
  const label=document.getElementById('cd-label-input').value.trim()||'Event';
  const date=document.getElementById('cd-date-input').value;
  if(!date){toast('Pick a date','error');return}
  const p=curP();if(!p)return;
  p.state.countdown={label,date};saveStateNow();
  closeModal('add-countdown');
  renderCountdown();toast('Countdown set!','success');
}
function renderCountdown(){
  const p=curP();const w=document.getElementById('countdown-widget');if(!w)return;
  const cd=p?.state?.countdown;
  if(!cd){w.innerHTML='<div style="font-size:12px;color:var(--muted)">No countdown set - click Set</div>';return}
  clearInterval(cdInterval);
  function tick(){
    const now=new Date();const target=new Date(cd.date+'T00:00:00');
    const diff=target-now;
    if(diff<=0){
      const isPast=diff<-86400000;
      const daysAgo=Math.floor(-diff/86400000);
      const pastSuffix=isPast?('<div style="font-size:11px;color:var(--muted);margin-top:4px">Il y a '+daysAgo+' jour'+(daysAgo>1?'s':'')+'</div>'):'';
      w.innerHTML='<div class="countdown-wrap"><div class="countdown-label">'+escapeHTML(cd.label)+'</div>'
        +'<div style="font-size:15px;color:'+(isPast?'var(--muted)':'var(--accent2)')+'">'+( isPast?'🗓 Date passée':'🎉 Aujourd\'hui !')+'</div>'
        +pastSuffix+'</div>';
      clearInterval(cdInterval);return;
    }
    const days=Math.floor(diff/86400000);
    const hrs=Math.floor((diff%86400000)/3600000);
    const mins=Math.floor((diff%3600000)/60000);
    const secs=Math.floor((diff%60000)/1000);
    w.innerHTML='<div class="countdown-wrap">'+
      '<div class="countdown-label">'+cd.label+'</div>'+
      '<div class="countdown-digits">'+
        '<div class="cd-unit"><div class="cd-num">'+String(days).padStart(2,'0')+'</div><div class="cd-label">days</div></div>'+
        '<div class="cd-sep">:</div>'+
        '<div class="cd-unit"><div class="cd-num">'+String(hrs).padStart(2,'0')+'</div><div class="cd-label">hrs</div></div>'+
        '<div class="cd-sep">:</div>'+
        '<div class="cd-unit"><div class="cd-num">'+String(mins).padStart(2,'0')+'</div><div class="cd-label">min</div></div>'+
        '<div class="cd-sep">:</div>'+
        '<div class="cd-unit"><div class="cd-num">'+String(secs).padStart(2,'0')+'</div><div class="cd-label">sec</div></div>'+
      '</div>'+
    '</div>';
  }
  tick();cdInterval=setInterval(tick,1000);
}

// ===================================================
