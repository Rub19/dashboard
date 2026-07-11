/* ETHONE legacy compatibility module: clock. */
// ===================================================
//  CLOCK
// ===================================================
function ethoneSetClockText(id,value){
  const element=document.getElementById(id);
  if(element&&element.textContent!==value)element.textContent=value;
}
function updateClock(){
  const n=new Date(),h=String(n.getHours()).padStart(2,'0'),m=String(n.getMinutes()).padStart(2,'0'),s=String(n.getSeconds()).padStart(2,'0');
  ethoneSetClockText('clock-main',h+':'+m);
  // Localized day/month names
  const days={
    fr:['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
    en:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    es:['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
    de:['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']
  };
  const months={
    fr:['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'],
    en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    es:['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    de:['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  };
  const lang=typeof _lang!=='undefined'?_lang:'fr';
  const dayNames=days[lang]||days.en;
  const monthNames=months[lang]||months.en;
  const ds=dayNames[n.getDay()]+', '+monthNames[n.getMonth()]+' '+n.getDate();
  ethoneSetClockText('clock-date-sub',ds);
  const h24=n.getHours();
  // Full localized greetings — no dependency on t() to avoid key fallback bug
  const GREETS={
    fr:{morning:'Bonjour',afternoon:'Bon après-midi',evening:'Bonsoir'},
    en:{morning:'Good morning',afternoon:'Good afternoon',evening:'Good evening'},
    es:{morning:'Buenos días',afternoon:'Buenas tardes',evening:'Buenas noches'},
    de:{morning:'Guten Morgen',afternoon:'Guten Tag',evening:'Guten Abend'},
  };
  const slot=h24<12?'morning':h24<18?'afternoon':'evening';
  const fullGreet=(GREETS[lang]||GREETS.en)[slot];
  ethoneSetClockText('greeting-time','');
  ethoneSetClockText('greeting-full',fullGreet);
  ethoneSetClockText('greeting-date',ds+', '+h+':'+m+':'+s);
}
function startEthoneClock(){
  if(window.__ethoneClockInterval)return;
  updateClock();
  window.__ethoneClockInterval=setInterval(function(){
    if(document.hidden)return;
    if(!document.getElementById('clock-main')&&!document.getElementById('greeting-date'))return;
    updateClock();
  },1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startEthoneClock,{once:true});
else startEthoneClock();
