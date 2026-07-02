/* ETHONE legacy compatibility module: twitch. */
// === TWITCH ===
async function fetchTwitch(endpoint, params=''){
  const url=`${WORKER_URL}/twitch/${endpoint}${params?'?'+params:''}`;
  const res=await fetch(url,{signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw new Error('Twitch API error '+res.status);
  return res.json();
}

function getTwitchStreamers(){
  const p=curP();
  const conn=p?.state?.connections?.twitch;
  if(!conn)return[];
  // Support both old format (single) and new format (array)
  if(Array.isArray(conn.streamers))return conn.streamers;
  if(conn.username)return[{username:conn.username,userId:conn.userId,displayName:conn.displayName,avatar:conn.avatar}];
  return[];
}

function saveTwitchStreamers(streamers){
  const p=curP();if(!p)return;
  if(!p.state.connections)p.state.connections={};
  p.state.connections.twitch={streamers};
  saveStateNow();
}

async function connectTwitch(){
  const username=document.getElementById('twitch-username').value.trim().toLowerCase();
  if(!username){toast('Enter a Twitch username','error');return;}
  const streamers=getTwitchStreamers();
  if(streamers.length>=3){toast('Max 3 streamers reached','error');return;}
  if(streamers.find(s=>s.username===username)){toast('Already added','error');return;}
  toast('Looking up '+username+'...','info');
  try{
    const data=await fetchTwitch('users','login='+encodeURIComponent(username));
    const user=data?.data?.[0];
    if(!user){toast('Twitch user not found','error');return;}
    streamers.push({username:user.login,userId:user.id,displayName:user.display_name,avatar:user.profile_image_url});
    saveTwitchStreamers(streamers);
    document.getElementById('twitch-username').value='';
    await renderTwitchCard();
    toast(user.display_name+' added!','success');
  }catch(e){toast('Error: '+e.message,'error');}
}

async function removeTwitchStreamer(username){
  const streamers=getTwitchStreamers().filter(s=>s.username!==username);
  saveTwitchStreamers(streamers);
  await renderTwitchCard();
  toast('Removed '+username,'info');
}

async function renderTwitchCard(){
  const streamers=getTwitchStreamers();
  const badge=document.getElementById('twitch-badge');
  const list=document.getElementById('twitch-streamers-list');
  const addSection=document.getElementById('twitch-add-section');
  const refreshBtn=document.getElementById('twitch-refresh-btn');

  if(!streamers.length){
    if(badge){badge.textContent='Not connected';badge.className='conn-status-badge disconnected';}
    if(list)list.innerHTML='';
    if(refreshBtn)refreshBtn.style.display='none';
    updateTwitchSidebar([]);
    return;
  }

  if(badge){badge.textContent=streamers.length+' streamer'+(streamers.length>1?'s':'');badge.className='conn-status-badge connected';}
  if(refreshBtn)refreshBtn.style.display='inline-block';
  if(addSection)addSection.style.display=streamers.length>=3?'none':'block';

  // Fetch live status for all streamers at once
  let liveMap={};
  try{
    const userIds=streamers.map(s=>s.userId).join('&user_id=');
    const streams=await fetchTwitch('streams','user_id='+userIds);
    (streams?.data||[]).forEach(s=>{liveMap[s.user_id]=s;});
  }catch(e){console.warn('Twitch streams error:',e);}

  // Render list in connections panel
  if(list){
    list.innerHTML=streamers.map(s=>{
      const live=liveMap[s.userId];
      return `<div style="background:var(--surface2);border:1px solid ${live?'rgba(145,71,255,.3)':'var(--border)'};border-radius:var(--r-sm);padding:10px 12px;display:flex;align-items:center;gap:10px">
        <img src="${s.avatar||''}" style="width:36px;height:36px;border-radius:50%;border:2px solid ${live?'#ff0000':'#9147ff'};flex-shrink:0" onerror="this.style.display='none'">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${s.displayName||s.username}</div>
          <div style="font-size:11px;color:${live?'#ff4545':'var(--muted)'};margin-top:1px">${live?'&#9679; LIVE — '+(live.game_name||''):'Offline'}</div>
          ${live?`<div style="font-size:11px;color:#9147ff;font-weight:600">${(live.viewer_count||0).toLocaleString()} viewers</div>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          ${live?`<a href="https://twitch.tv/${s.username}" target="_blank" rel="noopener noreferrer" style="font-size:11px;background:#9147ff;color:#fff;padding:3px 10px;border-radius:20px;text-decoration:none;font-weight:600">Watch</a>`:''}
          <button onclick="removeTwitchStreamer('${s.username}')" style="background:none;border:1px solid var(--border2);color:var(--muted);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;font-family:var(--font)">Remove</button>
        </div>
      </div>`;
    }).join('');
  }

  // Update sidebar — show only live streamers
  const liveStreamers=streamers.filter(s=>liveMap[s.userId]).map(s=>({...s,live:liveMap[s.userId]}));
  updateTwitchSidebar(liveStreamers);
}

function updateTwitchSidebar(liveStreamers){
  const wrap=document.getElementById('sb-twitch-wrap');
  const listEl=document.getElementById('sb-twitch-list');
  if(!wrap||!listEl)return;
  if(!liveStreamers.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  listEl.innerHTML=liveStreamers.map(s=>`
    <a href="https://twitch.tv/${s.username}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:8px;text-decoration:none;padding:6px 8px;background:rgba(145,71,255,.08);border:1px solid rgba(145,71,255,.2);border-radius:var(--r-sm)">
      <img src="${s.avatar||''}" style="width:28px;height:28px;border-radius:50%;border:2px solid #ff0000;flex-shrink:0" onerror="this.style.display='none'">
      <div style="min-width:0;flex:1">
        <div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.displayName||s.username}</div>
        <div style="font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.live?.game_name||''}</div>
      </div>
      <div style="font-size:10px;color:#9147ff;font-weight:600;flex-shrink:0">${(s.live?.viewer_count||0).toLocaleString()}</div>
    </a>`).join('');
}

async function refreshTwitch(){
  const btn=document.getElementById('twitch-refresh-btn');
  if(btn){btn.textContent='...';btn.disabled=true;}
  await renderTwitchCard();
  if(btn){btn.textContent='↻ Refresh';btn.disabled=false;}
  toast('Twitch refreshed!','success');
}

function disconnectTwitch(){
  const p=curP();if(!p)return;
  if(p.state.connections)delete p.state.connections.twitch;
  saveStateNow();
  renderTwitchCard();
  document.getElementById('sb-twitch-wrap').style.display='none';
  toast('Twitch disconnected','info');
}
