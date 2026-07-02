/* ETHONE legacy compatibility module: auth-ui. */
function ethoneEyeIcon(hidden){
  return hidden
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6A3 3 0 0 0 13.4 13.4"/><path d="M9.9 5.7A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17.5 17.5 0 0 1-2.2 3.1"/><path d="M6.4 6.9C3.9 8.6 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.8 9.8 0 0 0 4-.8"/></svg>';
}
function togglePwVis(inputId,btn){
  const input=document.getElementById(inputId);if(!input)return;
  const show=input.type==='password';
  input.type=show?'text':'password';
  if(btn){btn.classList.add('ethone-pw-eye');btn.innerHTML=ethoneEyeIcon(!show);btn.setAttribute('aria-label',show?'Masquer le mot de passe':'Afficher le mot de passe');btn.setAttribute('title',show?'Masquer le mot de passe':'Afficher le mot de passe');}
}

function switchAuthTab(tab){
  document.getElementById('form-login').style.display=tab==='login'?'block':'none';
  document.getElementById('form-register').style.display=tab==='register'?'block':'none';
  document.getElementById('tab-login').style.background=tab==='login'?'var(--accent)':'transparent';
  document.getElementById('tab-login').style.color=tab==='login'?'#fff':'var(--muted)';
  document.getElementById('tab-register').style.background=tab==='register'?'var(--accent)':'transparent';
  document.getElementById('tab-register').style.color=tab==='register'?'#fff':'var(--muted)';
  document.getElementById('auth-error').textContent='';
}

function setAuthLoading(v){
  document.getElementById('auth-loading').style.display=v?'block':'none';
  document.getElementById('auth-error').textContent='';
}
