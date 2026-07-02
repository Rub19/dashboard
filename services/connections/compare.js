/* ETHONE legacy compatibility module: compare. */
// === COMPARE WITH FRIENDS ===
let _compareList=[]; // [{name, tag, region, steamId, displayName, valoData, steamData}]

async function loadCompareDashboardUsers(){
  const container=document.getElementById('compare-dashboard-users');
  if(!container)return;
  // Fetch all profiles from Supabase
  const {data}=await sb.from('dashboard_data').select('profile_name,state,user_id');
  if(!data||!data.length){container.style.display='none';return;}
  const myId=_sbUser?.id;
  const others=data.filter(d=>d.user_id!==myId&&(d.state?.gaming?.valo||d.state?.connections?.steam));
  if(!others.length){container.style.display='none';return;}
  container.innerHTML=`<div style="font-size:11px;font-weight:600;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:8px">Dashboard users</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap">
    ${others.map(d=>{
      const valo=d.state?.gaming?.valo;
      const steam=d.state?.connections?.steam;
      const label=valo?valo.name+'#'+valo.tag:(steam?.data?.displayName||d.profile_name);
      return `<button onclick="addFriendFromDashboard('${d.profile_name}','${valo?.name||''}','${valo?.tag||''}','${valo?.region||'eu'}','${steam?.steamId||''}')" style="background:var(--surface2);border:1px solid var(--border2);border-radius:20px;padding:5px 14px;font-size:12px;cursor:pointer;font-family:var(--font);color:var(--text)">${d.profile_name} (${label})</button>`;
    }).join('')}
  </div>`;
}

function addFriendFromDashboard(profileName,name,tag,region,steamId){
  if(name&&tag){
    document.getElementById('compare-valo-input').value=name+'#'+tag;
    // Update region pills
    document.querySelectorAll('#compare-valo-region').forEach(el=>el.value=region||'eu');
    document.querySelectorAll('.region-pills .region-pill[onclick*="setCompareRegion"]').forEach(p=>{
      p.classList.toggle('active',p.dataset.val===(region||'eu'));
    });
  }
  if(steamId) document.getElementById('compare-steam-input').value=steamId;
  toast('Loaded '+profileName+' — click Add friend','info');
}

async function addFriendToCompare(){
  const raw=document.getElementById('compare-valo-input').value.trim();
  const region=document.getElementById('compare-valo-region').value;
  const steamId=document.getElementById('compare-steam-input').value.trim();
  if(!raw&&!steamId){toast('Enter a Valorant Name#TAG or Steam ID','error');return;}
  const results=document.getElementById('compare-results');
  results.innerHTML='<div style="color:var(--muted);font-size:13px;padding:16px">Loading stats...</div>';
  try{
    const p=curP();
    const myValo=p?.state?.gaming?.valo;
    const mySteam=p?.state?.connections?.steam;
    let friendValo=null,friendSteam=null;
    let friendName=raw||steamId;

    // Fetch friend Valorant stats
    if(raw&&raw.includes('#')){
      const [name,...tagParts]=raw.split('#');
      const tag=tagParts.join('#');
      try{
        const mmr=await fetchHenrik('/v2/mmr/'+region+'/'+encodeURIComponent(name)+'/'+encodeURIComponent(tag));
        const matches=await fetchHenrik('/v3/matches/'+region+'/'+encodeURIComponent(name)+'/'+encodeURIComponent(tag)+'?size=10');
        const acc=await fetchHenrik('/v1/account/'+encodeURIComponent(name)+'/'+encodeURIComponent(tag));
        friendValo={name,tag,mmr:mmr?.data||mmr,matches:Array.isArray(matches?.data)?matches.data:matches||[],puuid:acc?.data?.puuid};
        friendName=name+'#'+tag;
      }catch(e){toast('Could not fetch friend Valorant stats','error');}
    }

    // Fetch friend Steam stats
    if(steamId&&/^\d{17}$/.test(steamId)){
      try{
        const summary=await fetchSteamAPI('/ISteamUser/GetPlayerSummaries/v2/','','steamids='+steamId);
        const player=summary?.response?.players?.[0];
        if(player){
          const gamesJson=await fetchSteamAPI('/IPlayerService/GetRecentlyPlayedGames/v1/','','steamid='+steamId+'&count=5');
          friendSteam={displayName:player.personaname,avatar:player.avatarfull,steamId,recentGames:gamesJson?.response?.games||[]};
          if(!friendName||friendName===steamId)friendName=player.personaname;
        }
      }catch(e){toast('Could not fetch friend Steam stats','error');}
    }

    renderCompareResults(myValo,friendValo,mySteam?.data,friendSteam,friendName);
  }catch(e){results.innerHTML='<div style="color:var(--accent3);font-size:13px;padding:16px">Error: '+e.message+'</div>';}
}

function getValoStats(mmr,matches,name,tag,puuid){
  const cd=mmr?.current_data||mmr;
  const rank=cd?.currenttierpatched||'Unranked';
  const rr=cd?.ranking_in_tier||0;
  let wins=0,played=0,totalK=0,totalD=0,totalHS=0,totalShots=0;
  const arr=Array.isArray(matches)?matches:[];
  arr.forEach(m=>{
    const players=m.players?.all_players||[];
    const me=puuid?players.find(pl=>pl.puuid===puuid):players.find(pl=>(pl.name||'').toLowerCase()===(name||'').toLowerCase()&&(pl.tag||'').toLowerCase()===(tag||'').toLowerCase());
    if(!me)return;
    played++;
    if(m.teams?.[me.team?.toLowerCase()]?.has_won)wins++;
    totalK+=me.stats?.kills||0;totalD+=me.stats?.deaths||1;
    const hs=me.stats?.headshots||0,body=me.stats?.bodyshots||0,leg=me.stats?.legshots||0;
    totalHS+=hs;totalShots+=hs+body+leg;
  });
  const wr=played>0?Math.round((wins/played)*100):0;
  const kda=totalD>0?((totalK)/totalD).toFixed(2):'—';
  const hs=totalShots>0?Math.round((totalHS/totalShots)*100):0;
  return {rank,rr,wr,kda,hs,played};
}

function renderCompareResults(myValo,friendValo,mySteam,friendSteam,friendName){
  const results=document.getElementById('compare-results');
  const p=curP();
  const myName=p?.name||'You';
  let html='';

  // Valorant comparison
  if(myValo||friendValo){
    const myStats=myValo?getValoStats(myValo._lastRank,_valoAllMatches,myValo.name,myValo.tag,myValo.puuid):{rank:'—',rr:0,wr:0,kda:'—',hs:0,played:0};
    const fStats=friendValo?getValoStats(friendValo.mmr,friendValo.matches,friendValo.name,friendValo.tag,friendValo.puuid):{rank:'—',rr:0,wr:0,kda:'—',hs:0,played:0};
    html+=`<div style="margin-bottom:20px">
      <div style="font-size:12px;font-weight:600;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:12px">Valorant</div>
      <div style="display:grid;grid-template-columns:1fr 80px 1fr;gap:8px;align-items:center">
        <div style="text-align:right;font-weight:600">${myName}</div>
        <div></div>
        <div style="font-weight:600;color:var(--accent)">${friendName}</div>
      </div>`;
    const rows=[
      {label:'Rank',my:myStats.rank,fr:fStats.rank,compare:false},
      {label:'RR',my:myStats.rr,fr:fStats.rr,compare:true,higher:true},
      {label:'Winrate',my:myStats.wr+'%',fr:fStats.wr+'%',compare:true,higher:true,myNum:myStats.wr,frNum:fStats.wr},
      {label:'K/D',my:myStats.kda,fr:fStats.kda,compare:true,higher:true,myNum:parseFloat(myStats.kda),frNum:parseFloat(fStats.kda)},
      {label:'Headshot %',my:myStats.hs+'%',fr:fStats.hs+'%',compare:true,higher:true,myNum:myStats.hs,frNum:fStats.hs},
      {label:'Matches',my:myStats.played,fr:fStats.played,compare:false},
    ];
    rows.forEach(r=>{
      const myWin=r.compare&&r.myNum>r.frNum;
      const frWin=r.compare&&r.frNum>r.myNum;
      html+=`<div style="display:grid;grid-template-columns:1fr 80px 1fr;gap:8px;align-items:center;padding:8px;background:var(--surface2);border-radius:6px;margin-top:4px">
        <div style="text-align:right;font-size:14px;font-weight:600;color:${myWin?'var(--accent2)':'var(--text)'}">${r.my}${myWin?' ✓':''}</div>
        <div style="text-align:center;font-size:10px;color:var(--muted);text-transform:uppercase">${r.label}</div>
        <div style="font-size:14px;font-weight:600;color:${frWin?'var(--accent2)':'var(--text)'}">${r.fr}${frWin?' ✓':''}</div>
      </div>`;
    });
    html+=`</div>`;
  }

  // Steam comparison
  if(mySteam||friendSteam){
    html+=`<div style="margin-top:20px">
      <div style="font-size:12px;font-weight:600;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:12px">Steam</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">`;
    // Me
    html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        ${mySteam?.avatarFull?`<img src="${mySteam.avatarFull}" style="width:32px;height:32px;border-radius:50%">`:''}
        <div style="font-weight:600;font-size:13px">${mySteam?.displayName||myName}</div>
      </div>
      ${(mySteam?.recentGames||[]).slice(0,3).map(g=>`<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between"><span>${g.name||'?'}</span><span style="color:var(--muted)">${g.hours||'?'}h</span></div>`).join('')}
    </div>`;
    // Friend
    html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--accent);border-radius:var(--r-sm);padding:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        ${friendSteam?.avatar?`<img src="${friendSteam.avatar}" style="width:32px;height:32px;border-radius:50%">`:''}
        <div style="font-weight:600;font-size:13px;color:var(--accent)">${friendSteam?.displayName||friendName}</div>
      </div>
      ${(friendSteam?.recentGames||[]).slice(0,3).map(g=>`<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between"><span>${g.name||'?'}</span><span style="color:var(--muted)">${Math.round((g.playtime_forever||0)/60)}h</span></div>`).join('')}
    </div>`;
    html+=`</div></div>`;
  }

  if(!html)html='<div style="color:var(--muted);font-size:13px;padding:16px">No data to compare</div>';
  results.innerHTML=html;
}
const MANUAL_BADGE_OPTS = [
  {key:'nitro',        e:'', label:'Nitro',          bg:'rgba(88,101,242,.18)', bc:'#5865F2'},
  {key:'nitroClassic', e:'', label:'Nitro Classic',   bg:'rgba(88,101,242,.18)', bc:'#5865F2'},
  {key:'booster',      e:'', label:'Server Boosting', bg:'rgba(255,115,250,.15)', bc:'#ff73fa'},
  {key:'activedev',    e:'', label:'Active Dev',      bg:'rgba(107,220,66,.18)', bc:'#6bdc42'},
  {key:'early',        e:'', label:'Early Supporter', bg:'rgba(249,104,84,.18)', bc:'#f96854'},
  {key:'partner',      e:'', label:'Partner',         bg:'rgba(78,158,212,.18)', bc:'#4e9ed4'},
];

function renderManualBadgesUI(){
  const p=curP();if(!p)return;
  const manual=p.state.manualBadges||{};
  const grid=document.getElementById('dc-manual-badges-grid');
  if(!grid)return;
  grid.innerHTML=MANUAL_BADGE_OPTS.map(b=>{
    const on=!!manual[b.key];
    return '<div onclick="toggleManualBadge(\''+b.key+'\')" style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;cursor:pointer;border:1.5px solid '+(on?b.bc:'var(--border2)')+';background:'+(on?b.bg:'transparent')+';transition:all .15s;font-size:12px;font-weight:500" id="mb-'+b.key+'">'+b.e+' '+b.label+'</div>';
  }).join('');
}

function toggleManualBadge(key){
  const p=curP();if(!p)return;
  if(!p.state.manualBadges)p.state.manualBadges={};
  p.state.manualBadges[key]=!p.state.manualBadges[key];
  saveStateNow();
  renderManualBadgesUI();
  // Re-render discord card if connected
  const data=p.state.connections?.discord?.data;
  if(data){renderDiscordCard(data);refreshDiscordSidebar();}
}
