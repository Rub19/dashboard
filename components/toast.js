/* ETHONE legacy compatibility module: toast. */
// ===================================================
//  TOAST
// ===================================================
function toast(msg,type='info'){
  const icons={success:'\u2705',error:'\u274C',info:'\u2139\uFE0F'};
  const el=document.createElement('div');el.className='toast '+type;
  el.innerHTML='<span>'+escapeHTML(icons[type]||icons.info)+'</span> '+escapeHTML(msg);
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .3s';setTimeout(()=>el.remove(),300)},2500);
}
