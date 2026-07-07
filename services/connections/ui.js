/* ETHONE legacy compatibility module: connections-ui. */
//  CONNECTIONS - LOAD UI
// ===================================================
function loadConnectionsUI(){
  const p=curP();if(!p)return;
  const conn=p.state.connections||{};
  if(conn.discord){
    document.getElementById('dc-userid').value=conn.discord.userId||'';
    if(conn.discord.data)renderDiscordCard(conn.discord.data);
    document.getElementById('dc-disconnect-btn').style.display='inline-flex';
    const rfBtn=document.getElementById('dc-refresh-btn');if(rfBtn)rfBtn.style.display='inline-flex';
    const mbs=document.getElementById('dc-manual-badges-section');if(mbs)mbs.style.display='block';
    if(typeof renderManualBadgesUI==='function')renderManualBadgesUI();
  }
  if(conn.steam){
    document.getElementById('steam-id').value=conn.steam.steamId||'';
    const akInp=document.getElementById('steam-apikey');if(akInp&&conn.steam.apiKey)akInp.value=conn.steam.apiKey;
    if(conn.steam.data)renderSteamCard(conn.steam.data);
    document.getElementById('steam-disconnect-btn').style.display='inline-flex';
    const rfBtn=document.getElementById('steam-refresh-btn');if(rfBtn)rfBtn.style.display='inline-block';
  }
  if(conn.spotify){
    document.getElementById('spotify-url').value=conn.spotify.widgetUrl||'';
    document.getElementById('spotify-badge').textContent='Connected';
    document.getElementById('spotify-badge').className='conn-status-badge connected';
    document.getElementById('spotify-disconnect-btn').style.display='inline-flex';
    const rfBtn=document.getElementById('spotify-refresh-btn');if(rfBtn)rfBtn.style.display='inline-block';
  }
  if(conn.twitch){
    renderTwitchCard();
  }
  if(conn.lastfm){
    document.getElementById('lastfm-username').value=conn.lastfm.username||'';
    document.getElementById('lastfm-disconnect-btn').style.display='inline-flex';
    document.getElementById('lastfm-refresh-btn').style.display='inline-block';
    renderLastfmCard(conn.lastfm).catch(()=>{});
    startLastfmAutoRefresh();
  }
  if(typeof updateGithubConnBadge==='function')updateGithubConnBadge();
  // Sync sidebar widgets visibility sans re-render nav (évite le flash)
  const p2=curP();
  if(p2){
    initSidebarWidgetToggles();
    // Ne PAS appeler initSidebarWidgets ici — déjà fait au boot
    // juste mettre à jour les toggles visuels dans la page connexions
  }
  loadGroqKeyUI();
  if(typeof window.ethoneIntegrationHub==='object'&&window.ethoneIntegrationHub){
    window.ethoneIntegrationHub.render();
  }
}
