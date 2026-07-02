/* ETHONE legacy compatibility module: admin. */
// -- ADMIN PANEL -----------------------------------
async function openAdminPanel(){
  if(!_isAdmin){toast('Access denied','error');return;}
  const {data:users}=await sb.from('profiles').select('*').order('created_at',{ascending:false});
  const {data:allData}=await sb.from('dashboard_data').select('*');
  const totalLogins=users?.reduce((s,u)=>s+(u.login_count||0),0)||0;
  let html=`<div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)this.remove()">
  <div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--r-md);padding:28px;width:100%;max-width:860px;max-height:85vh;overflow-y:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div style="font-size:18px;font-weight:700">Admin Panel</div>
      <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">x</button>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:14px 20px;flex:1;min-width:100px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:var(--accent)">${users?.length||0}</div>
        <div style="font-size:12px;color:var(--muted)">Accounts</div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:14px 20px;flex:1;min-width:100px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:var(--accent2)">${allData?.length||0}</div>
        <div style="font-size:12px;color:var(--muted)">Total profiles</div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:14px 20px;flex:1;min-width:100px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:var(--accent4)">${totalLogins}</div>
        <div style="font-size:12px;color:var(--muted)">Total logins</div>
      </div>
    </div>
    <div style="font-size:12px;font-weight:600;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:10px">All accounts</div>
    <div style="display:flex;flex-direction:column;gap:8px">`;
  users?.forEach(u=>{
    const userProfiles=allData?.filter(d=>d.user_id===u.id)||[];
    const joined=new Date(u.created_at).toLocaleDateString('en-GB');
    const lastSeen=u.last_seen?new Date(u.last_seen).toLocaleDateString('en-GB'):'never';
    const isMe=u.email===ADMIN_EMAIL;
    html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);overflow:hidden">
      <div style="padding:12px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap" onclick="toggleAdminUserDetails('${u.id}')">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600">${u.username} ${isMe?'<span style=\"font-size:10px;background:rgba(124,106,247,.2);color:var(--accent);padding:1px 7px;border-radius:20px\">Admin</span>':''}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${u.email||'-'} · ${userProfiles.length} profile(s) · Joined ${joined}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          ${!isMe?`<button onclick="event.stopPropagation();adminDeleteUser('${u.id}',this)" style="background:rgba(247,106,106,.15);color:var(--accent3);border:1px solid var(--accent3);border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;font-family:var(--font)">Delete</button>`:''}
          <span style="color:var(--muted);font-size:16px">v</span>
        </div>
      </div>
      <div id="admin-user-${u.id}" style="display:none;padding:0 16px 14px;border-top:1px solid var(--border)">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:12px">
          <div style="background:var(--surface3);border-radius:6px;padding:10px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Last seen</div>
            <div style="font-size:13px;font-weight:500">${lastSeen}</div>
          </div>
          <div style="background:var(--surface3);border-radius:6px;padding:10px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Logins</div>
            <div style="font-size:13px;font-weight:500">${u.login_count||0}</div>
          </div>
          <div style="background:var(--surface3);border-radius:6px;padding:10px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Browser / OS</div>
            <div style="font-size:13px;font-weight:500">${u.last_browser||'-'} / ${u.last_os||'-'}</div>
          </div>
          <div style="background:var(--surface3);border-radius:6px;padding:10px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">IP Address</div>
            <div style="font-size:13px;font-weight:500;font-family:var(--mono);min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.45">${escapeHTML(u.last_ip||'-')}</div>
          </div>
          <div style="background:var(--surface3);border-radius:6px;padding:10px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Location</div>
            <div style="font-size:13px;font-weight:500">${u.last_city&&u.last_country?u.last_city+', '+u.last_country:'-'}</div>
          </div>
          <div style="background:var(--surface3);border-radius:6px;padding:10px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Profiles</div>
            <div style="font-size:13px;font-weight:500">${userProfiles.map(p=>p.profile_name).join(', ')||'-'}</div>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          ${userProfiles.map(prof=>`<button onclick="adminViewProfile('${prof.id}','${prof.profile_name.replace(/'/g,'')}')" style="background:rgba(59,130,246,.15);color:var(--accent);border:1px solid var(--accent);border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:var(--font)">View: ${prof.profile_name}</button>`).join('')}
        </div>
      </div>
    </div>`;
  });
  html+=`</div></div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}

function toggleAdminUserDetails(userId){
  const el=document.getElementById('admin-user-'+userId);
  if(el)el.style.display=el.style.display==='none'?'block':'none';
}

async function adminViewProfile(profileId, profileName){
  // Fetch the profile data from Supabase
  const {data,error}=await sb.from('dashboard_data').select('*').eq('id',profileId).single();
  if(error||!data){toast('Could not load profile data','error');return;}
  const s=data.state||{};

  let html=`<div style="position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto" onclick="if(event.target===this)this.remove()">
  <div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--r-md);padding:28px;width:100%;max-width:700px;max-height:85vh;overflow-y:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div style="font-size:16px;font-weight:700">👤 ${profileName}'s dashboard</div>
      <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">x</button>
    </div>`;

  // Notes
  if(s.note){
    html+=`<div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:8px">Notes</div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:12px;font-size:13px;white-space:pre-wrap;max-height:150px;overflow-y:auto">${s.note}</div>
    </div>`;
  }

  // Tasks
  if(s.todos&&s.todos.length){
    html+=`<div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:8px">Tasks (${s.todos.length})</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${s.todos.slice(0,10).map(t=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--surface2);border-radius:6px;font-size:13px">
          <span style="color:${t.done?'var(--accent2)':'var(--muted)'}">${t.done?'✓':'○'}</span>
          <span style="text-decoration:${t.done?'line-through':'none'};color:${t.done?'var(--muted)':'var(--text)'}">${t.text}</span>
          <span style="margin-left:auto;font-size:10px;color:var(--muted)">${t.priority||''}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  // Files & Links
  if(s.items&&s.items.length){
    html+=`<div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:8px">Files & Links (${s.items.length})</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${s.items.slice(0,10).map(i=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--surface2);border-radius:6px;font-size:13px">
          <span>${i.type==='link'?'🔗':'📄'}</span>
          <span>${i.name}</span>
          ${i.url?`<a href="${i.url}" target="_blank" rel="noopener noreferrer" style="margin-left:auto;font-size:11px;color:var(--accent);text-decoration:none">${i.url.slice(0,30)}...</a>`:''}
        </div>`).join('')}
      </div>
    </div>`;
  }

  // Connections
  const conns=s.connections||{};
  const connList=[];
  if(conns.discord)connList.push('Discord: '+( conns.discord.data?.discord_user?.username||conns.discord.userId||'connected'));
  if(conns.steam)connList.push('Steam: '+(conns.steam.data?.displayName||conns.steam.steamId||'connected'));
  if(conns.spotify)connList.push('Spotify: connected');
  if(s.gaming?.valo)connList.push('Valorant: '+s.gaming.valo.name+'#'+s.gaming.valo.tag);
  if(s.gaming?.lol)connList.push('LoL: '+s.gaming.lol.name);
  if(connList.length){
    html+=`<div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:8px">Connections</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${connList.map(c=>`<span style="background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:4px 12px;font-size:12px">${c}</span>`).join('')}
      </div>
    </div>`;
  }

  // Stats
  html+=`<div style="display:flex;gap:10px;flex-wrap:wrap">
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 16px;flex:1;text-align:center">
      <div style="font-size:18px;font-weight:700;color:var(--accent)">${(s.todos||[]).length}</div>
      <div style="font-size:11px;color:var(--muted)">Tasks</div>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 16px;flex:1;text-align:center">
      <div style="font-size:18px;font-weight:700;color:var(--accent2)">${(s.items||[]).length}</div>
      <div style="font-size:11px;color:var(--muted)">Files</div>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 16px;flex:1;text-align:center">
      <div style="font-size:18px;font-weight:700;color:var(--accent4)">${(s.habits||[]).length}</div>
      <div style="font-size:11px;color:var(--muted)">Habits</div>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 16px;flex:1;text-align:center">
      <div style="font-size:18px;font-weight:700;color:var(--accent3)">${(s.activity||[]).length}</div>
      <div style="font-size:11px;color:var(--muted)">Activities</div>
    </div>
  </div>

  </div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}

async function adminDeleteUser(userId,btn){
  if(!confirm('Delete this account and all its data?'))return;
  btn.textContent='';btn.disabled=true;
  await sb.from('dashboard_data').delete().eq('user_id',userId);
  await sb.from('profiles').delete().eq('id',userId);
  btn.closest('[style*=background]').remove();
  toast('Account deleted','success');
}
