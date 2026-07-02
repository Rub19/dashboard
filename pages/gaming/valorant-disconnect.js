/* ETHONE legacy compatibility module: valorant-disconnect. */
function disconnectValo(){
  const p=curP();if(!p)return;
  if(!confirm('Disconnect Valorant?'))return;
  delete p.state.gaming?.valo;saveStateNow();
  document.getElementById('valo-stats-area').innerHTML='<div class="game-not-connected"><div style="font-size:28px;margin-bottom:8px"></div><div>Enter your Riot Name#Tag to connect</div></div>';
  document.getElementById('valo-badge').textContent='Not connected';document.getElementById('valo-badge').className='conn-status-badge disconnected';
  document.getElementById('valo-account-sub').textContent='Not connected';
  document.getElementById('valo-disconnect').style.display='none';
  document.getElementById('valo-name').value='';
  toast('Valorant disconnected','info');
}
