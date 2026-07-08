/* ETHONE legacy compatibility module: valorant-connect. */
async function connectValo(){
  const raw=document.getElementById('valo-name').value.trim();
  const region=document.getElementById('valo-region').value;
  const apiKey=(document.getElementById('valo-apikey')?.value||'').trim();
  const trackerApiKey=(document.getElementById('tracker-apikey')?.value||'').trim();
  if(!raw||!raw.includes('#')){toast('Format: Name#TAG (ex: Rub19#Boss)','error');return}
  const [name,...tagParts]=raw.split('#');
  const tag=tagParts.join('#');
  toast('Fetching Valorant stats...','info');
  try{
    const acc=await fetchHenrik('/v1/account/'+encodeURIComponent(name)+'/'+encodeURIComponent(tag), apiKey);
    if(!acc||acc.status!==200)throw new Error(acc?.message||'Player not found');
    const p=curP();if(!p)return;
    if(!p.state.gaming)p.state.gaming={};
    p.state.gaming.valo={name,tag,region,apiKey,trackerApiKey,puuid:acc.data.puuid,card:acc.data.card?.small||''};
    saveStateNow();
    await loadValoStats();
    document.getElementById('valo-disconnect').style.display='inline-flex';
    toast('Valorant connected!','success');
    addActivity('Connected Valorant account','#ff4655','integration');
  }catch(e){toast('Error: '+e.message,'error');console.error(e)}
}

// Match cache by mode
let _valoMatchCache={};
let _valoAllMatches=[];
async function loadValoStats(mode){
  const p=curP();if(!p||!p.state.gaming?.valo)return;
  const {name,tag,region,apiKey=''}=p.state.gaming.valo;
  const area=document.getElementById('valo-stats-area');
  if(area)area.innerHTML='<div class="game-loading"> Loading stats...</div>';
  try{
    const mmrRaw=await fetchHenrik('/v2/mmr/'+region+'/'+encodeURIComponent(name)+'/'+encodeURIComponent(tag), apiKey).catch(()=>null);
    const mmrData=mmrRaw?.data||mmrRaw||null;

    // Fetch all matches at once (no mode filter)
    const allRaw=await fetchHenrik('/v3/matches/'+region+'/'+encodeURIComponent(name)+'/'+encodeURIComponent(tag)+'?size=25', apiKey).catch(()=>null);
    const allMatches=Array.isArray(allRaw)?allRaw:Array.isArray(allRaw?.data)?allRaw.data:[];
    _valoAllMatches=allMatches;

    // Filtrer cote client par metadata.mode (insensible a la casse)
    const modeMap={competitive:['competitive'],swiftplay:['swiftplay','swift play'],unrated:['unrated']};
    _valoMatchCache={};
    ['competitive','swiftplay','unrated'].forEach(m=>{
      const keywords=modeMap[m];
      _valoMatchCache[m]=allMatches.filter(match=>{
        const modeStr=(match.metadata?.mode||match.metadata?.queue||'').toLowerCase();
        return keywords.some(k=>modeStr.includes(k));
      }).slice(0,10);
    });

    if(allMatches.length===0&&!mmrData){
      if(area)area.innerHTML='<div class="game-loading">No data found - verifie ton Name#TAG, la region, et que ton profile Valorant est public</div>';
      return;
    }

    renderValoStats(mmrData,_valoMatchCache,name,tag,mode||'competitive');
    const badge=document.getElementById('valo-badge');
    if(badge){badge.textContent='Connected';badge.className='conn-status-badge connected';}
    const pGov=curP();
    const currentData=mmrData?.current_data||mmrData;
    if(currentData?.currenttierpatched&&pGov?.state?.gaming?.valo){
      pGov.state.gaming.valo._lastRank={rankName:currentData.currenttierpatched||'Unranked',rr:currentData.ranking_in_tier||0};
      saveStateNow();if(typeof renderGamingOverview==='function')renderGamingOverview();
    }
    const sub=document.getElementById('valo-account-sub');
    if(sub)sub.textContent=name+'#'+tag+' . '+region.toUpperCase();
    document.getElementById('valo-name').value=name+'#'+tag;
    document.getElementById('valo-region').value=region;
    restoreRegionPill('valo', region);
    if(apiKey&&document.getElementById('valo-apikey'))document.getElementById('valo-apikey').value=apiKey;
    const tKey=curP()?.state?.gaming?.valo?.trackerApiKey||'';
    if(tKey&&document.getElementById('tracker-apikey'))document.getElementById('tracker-apikey').value=tKey;
  }catch(e){if(area)area.innerHTML='<div class="game-loading">Error : '+e.message+' - reessaie</div>';console.error(e);}
}
function switchValoTab(mode){
  const p=curP();if(!p||!p.state.gaming?.valo)return;
  const {name,tag}=p.state.gaming.valo;
  ['competitive','swiftplay','unrated'].forEach(m=>{
    const btn=document.getElementById('valo-tab-'+m);
    if(btn){
      btn.style.background=m===mode?'var(--accent)':'var(--surface2)';
      btn.style.color=m===mode?'#fff':'var(--muted)';
      btn.style.borderColor=m===mode?'var(--accent)':'var(--border2)';
    }
  });
  const matches=_valoMatchCache[mode]||[];
  const mmrDiv=document.getElementById('_valo_mmr_store');
  let mmr=null;try{if(mmrDiv)mmr=JSON.parse(mmrDiv.dataset.mmr);}catch(e){}
  renderValoModeContent(mmr,matches,name,tag,mode);
}
