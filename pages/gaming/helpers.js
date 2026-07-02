/* ETHONE legacy compatibility module: gaming-helpers. */
// -- HELPERS ---------------------------------------
// Default API keys (fallback if user has none)
const _DEFAULT_HENRIK_KEY='';  // optional, Henrik fonctionne sans cle (rate limit plus bas)
const _DEFAULT_TRACKER_KEY='f157fb9d-03e1-4db4-8b87-e25255d1e74f';

function getHenrikKey(){
  const userKey=(document.getElementById('valo-apikey')?.value||curP()?.state?.gaming?.valo?.apiKey||'').trim();
  return userKey||_DEFAULT_HENRIK_KEY;
}
function getTrackerKey(){
  const userKey=(document.getElementById('tracker-apikey')?.value||curP()?.state?.gaming?.valo?.trackerApiKey||'').trim();
  return userKey||_DEFAULT_TRACKER_KEY;
}

async function fetchHenrik(path, apiKey=''){
  const key=apiKey||getHenrikKey();
  // Route through Cloudflare Worker to avoid CORS issues
  const workerUrl=`${WORKER_URL}/henrik${path}`;
  const headers={};
  if(key) headers['X-Henrik-Key']=key;
  const res=await fetch(workerUrl,{headers});
  if(res.status===401)throw new Error('Henrik API key required - get a free key at docs.henrikdev.xyz');
  if(res.status===404)throw new Error('Player not found - check Name#TAG and region');
  if(res.status===429)throw new Error('Rate limited - wait a moment and retry');
  if(!res.ok)throw new Error('Henrik API error '+res.status);
  return res.json();
}
async function fetchRiot(url,key){
  const res=await fetch(url,{headers:{'X-Riot-Token':key}});
  if(!res.ok)throw new Error('Riot API '+res.status+(res.status===403?' - API key expired or invalid':''));
  return res.json();
}

function refreshGamingStats(){
  const p=curP();if(!p)return;
  if(p.state.gaming?.valo)loadValoStats();
  if(p.state.gaming?.lol)loadLoLStats();
}

function loadGamingUI(){
  const p=curP();if(!p)return;
  if(p.state.gaming?.valo)loadValoStats();
  if(p.state.gaming?.lol)loadLoLStats();
  if(p.state.gaming?.ow){
    const {username,_data}=p.state.gaming.ow;
    document.getElementById('ow-username').value=username||'';
    document.getElementById('ow-disconnect').style.display='inline-flex';
    document.getElementById('ow-account-sub').textContent=username+' · '+(p.state.gaming.ow.platform||'pc').toUpperCase();
    if(_data)renderOWStats(_data,username,'comp');
  }
  loadCompareDashboardUsers();
}
