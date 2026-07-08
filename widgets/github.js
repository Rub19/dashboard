/* ETHONE legacy compatibility module: github. */
// ===================================================
//  GITHUB WIDGET
// ===================================================
function saveGhToken(){
  const p=curP();if(!p)return;
  const token=document.getElementById('gh-token-input')?.value?.trim();
  if(!token){toast('Entre un token valide','error');return;}
  if(!p.state.connections)p.state.connections={};
  if(!p.state.connections.github)p.state.connections.github={};
  p.state.connections.github.token=token;
  saveStateNow();
  if(_sbUser){clearTimeout(_saveCloudTimeout);saveCloudState().catch(()=>{});}
  toast('Token GitHub sauvegardé !','success');
  refreshGithub();
}

async function connectGithub(){
  const input=document.getElementById('github-username-input');
  if(!input)return;
  const username=input.value.trim();
  if(!username){toast('Enter a username','error');return;}
  const p=curP();if(!p)return;
  if(!p.state.connections)p.state.connections={};
  p.state.connections.github={username};
  saveStateNow();refreshGithub();
}

async function connectGithubFromConnections(){
  const input=document.getElementById('github-conn-username');
  if(!input)return;
  const username=input.value.trim();
  if(!username){toast('Enter a username','error');return;}
  const p=curP();if(!p)return;
  if(!p.state.connections)p.state.connections={};
  p.state.connections.github={username};
  saveStateNow();
  updateGithubConnBadge();
  renderGithubSidebar();
  toast('GitHub connected!','success');
}

function disconnectGithub(){
  const p=curP();if(!p)return;
  if(p.state.connections)delete p.state.connections.github;
  saveStateNow();
  updateGithubConnBadge();
  const wrap=document.getElementById('sb-github-wrap');
  if(wrap)wrap.style.setProperty('display','none','important');
  const input=document.getElementById('github-conn-username');
  if(input)input.value='';
  toast('GitHub disconnected','info');
}

function updateGithubConnBadge(){
  const p=curP();if(!p)return;
  const username=p.state.connections?.github?.username;
  const badge=document.getElementById('github-conn-badge');
  const disconnectBtn=document.getElementById('github-conn-disconnect-btn');
  const input=document.getElementById('github-conn-username');
  if(badge){
    badge.textContent=username?'Connected':'Not connected';
    badge.className='conn-status-badge '+(username?'connected':'disconnected');
  }
  if(disconnectBtn)disconnectBtn.style.display=username?'inline-flex':'none';
  if(input&&username)input.value=username;
}

async function renderGithubSidebar(){
  const p=curP();if(!p)return;
  const username=p.state.connections?.github?.username;
  const wrap=document.getElementById('sb-github-wrap');
  if(!wrap)return;
  const vis=p.state.sidebarWidgets?.visible||{};
  if(!username||vis.github===false){wrap.style.setProperty('display','none','important');return;}
  const nameEl=document.getElementById('sb-github-name');
  const subEl=document.getElementById('sb-github-activity');
  const avEl=document.getElementById('sb-github-avatar');
  if(nameEl)nameEl.textContent='@'+username;
  if(subEl)subEl.textContent='—';
  wrap.style.setProperty('display','block','important');
  try{
    const [eventsRes,userRes]=await Promise.all([
      fetch(`https://api.github.com/users/${username}/events/public?per_page=10`,{signal:AbortSignal.timeout(8000)}),
      fetch(`https://api.github.com/users/${username}`,{signal:AbortSignal.timeout(8000)})
    ]);
    if(eventsRes.ok){
      const events=await eventsRes.json();
      const pushCount=events.filter(e=>e.type==='PushEvent').length;
      if(subEl)subEl.textContent=pushCount?pushCount+' commit'+(pushCount>1?'s':'')+' récemment':'Aucune activité récente';
    }
    if(userRes.ok){
      const user=await userRes.json();
      if(avEl&&user.avatar_url)avEl.innerHTML=`<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.remove()">`;
    }
  }catch(e){
    if(subEl)subEl.textContent='Hors ligne';
  }
}

async function refreshGithub(){
  renderGithubSidebar();
  const p=curP();if(!p)return;
  const username=p.state.connections?.github?.username;
  const content=document.getElementById('github-content');
  const sub=document.getElementById('github-sub');
  if(!username){
    if(content)content.innerHTML=`<div class="panel" style="max-width:480px;margin:0 auto"><div class="panel-header"><div class="panel-title">🔗 Connect GitHub</div></div><div class="modal-field"><div class="modal-label">GITHUB USERNAME</div><div style="display:flex;gap:8px"><input type="text" class="modal-input" id="github-username-input" placeholder="e.g. rub19" style="flex:1"><button class="btn btn-primary" onclick="connectGithub()">Connect</button></div></div></div>`;
    return;
  }
  if(sub)sub.textContent=`@${username}`;
  if(content)content.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted)">⏳ Loading...</div>';
  const ghToken=p.state.connections?.github?.token||'';
  const ghHeaders={'Accept':'application/vnd.github+json',...(ghToken?{Authorization:`Bearer ${ghToken}`}:{})};
  try{
    const [userRes,eventsRes,reposRes]=await Promise.all([
      fetch(`https://api.github.com/users/${username}`,{headers:ghHeaders,signal:AbortSignal.timeout(8000)}),
      fetch(`https://api.github.com/users/${username}/events/public?per_page=30`,{headers:ghHeaders,signal:AbortSignal.timeout(8000)}),
      fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=5`,{headers:ghHeaders,signal:AbortSignal.timeout(8000)})
    ]);
    if(userRes.status===403||userRes.status===429){
      const reset=userRes.headers.get('x-ratelimit-reset');
      const resetTime=reset?new Date(parseInt(reset)*1000).toLocaleTimeString():'bientôt';
      if(content)content.innerHTML=`<div class="panel" style="max-width:520px;margin:0 auto;padding:20px">
        <div style="font-size:14px;font-weight:600;margin-bottom:8px">⚠️ GitHub API — Rate limit atteint</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px">Limite sans token: 60 req/h. Reset à ${resetTime}.</div>
        <div style="font-size:12px;color:var(--muted2);margin-bottom:8px">Ajoute un token pour 5000 req/h :</div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <input id="gh-token-input" type="password" placeholder="ghp_xxxxx..." class="modal-input" style="flex:1;font-size:12px">
          <button onclick="saveGhToken()" class="btn btn-primary" style="font-size:12px">Sauver</button>
        </div>
        <a href="https://github.com/settings/tokens/new?scopes=public_repo,read:user&description=ETHONE+Dashboard" target="_blank" style="font-size:11px;color:var(--accent)">Créer un token GitHub ↗</a>
      </div>`;
      return;
    }
    const user=await userRes.json();
    const events=eventsRes.ok?await eventsRes.json():[];
    const repos=reposRes.ok?await reposRes.json():[];

    const pushEvents=events.filter(e=>e.type==='PushEvent');
    const commits=pushEvents.flatMap(e=>{
      const cls=e.payload?.commits||[];
      if(cls.length){
        return cls.slice(0,3).map(c=>({
          sha:c.sha?.slice(0,7)||'',
          msg:c.message?.split('\n')[0]||'commit',
          repo:e.repo?.name?.split('/')[1]||e.repo?.name||'',
          date:new Date(e.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})
        }));
      }
      return [{sha:'',msg:`Push → ${e.repo?.name?.split('/')[1]||''}`,repo:e.repo?.name?.split('/')[1]||'',date:new Date(e.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}];
    }).slice(0,8);

    if(!p.state.connections)p.state.connections={};
    if(!p.state.connections.github)p.state.connections.github={username};
    Object.assign(p.state.connections.github,{
      username,
      user:{
        name:user.name||username,
        avatar_url:user.avatar_url||'',
        public_repos:user.public_repos||0,
        followers:user.followers||0,
        following:user.following||0
      },
      events,
      repos:repos.map(r=>({
        name:r.name,
        html_url:r.html_url,
        language:r.language,
        stargazers_count:r.stargazers_count||0,
        forks_count:r.forks_count||0,
        pushed_at:r.pushed_at
      })),
      commits,
      lastSync:Date.now(),
      status:'connected'
    });
    saveStateNow();

    content.innerHTML=`
      <!-- Profile card -->
      <div class="grid-2" style="margin-bottom:16px">
        <div class="panel" style="display:flex;align-items:center;gap:14px">
          <img src="${user.avatar_url}" style="width:54px;height:54px;border-radius:12px;object-fit:cover" onerror="this.style.display='none'">
          <div>
            <div style="font-size:16px;font-weight:700">${escapeHTML(user.name||username)}</div>
            <div style="font-size:12px;color:var(--muted)">@${escapeHTML(username)}</div>
            ${user.bio?`<div style="font-size:12px;color:var(--muted);margin-top:4px">${escapeHTML(user.bio)}</div>`:''}
          </div>
        </div>
        <div class="panel">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${[['Repos',user.public_repos],['Followers',user.followers],['Following',user.following],['Gists',user.public_gists]].map(([l,v])=>`<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--accent)">${v||0}</div><div style="font-size:11px;color:var(--muted)">${l}</div></div>`).join('')}
          </div>
        </div>
      </div>
      <!-- Recent commits -->
      <div class="grid-2">
        <div class="panel">
          <div class="panel-header"><div class="panel-title">📝 Recent commits</div><a href="https://github.com/${username}" target="_blank" style="font-size:12px;color:var(--accent);text-decoration:none">View profile ↗</a></div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${!commits.length?'<div class="empty-state" style="padding:12px;font-size:12px">No recent commits</div>':commits.map(c=>`
              <div style="padding:8px 10px;background:var(--surface2);border-radius:6px;border:1px solid var(--border)">
                <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(c.msg)}</div>
                <div style="display:flex;gap:8px;margin-top:3px">
                  <span style="font-size:10px;color:var(--accent);font-family:var(--mono)">${c.sha}</span>
                  <span style="font-size:10px;color:var(--muted)">📁 ${escapeHTML(c.repo)}</span>
                  <span style="font-size:10px;color:var(--muted);margin-left:auto">${c.date}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>
        <!-- Top repos -->
        <div class="panel">
          <div class="panel-header"><div class="panel-title">📦 Top repositories</div></div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${repos.map(r=>`<a href="${r.html_url}" target="_blank" style="text-decoration:none;display:block;padding:8px 10px;background:var(--surface2);border-radius:6px;border:1px solid var(--border)">
              <div style="font-size:12px;font-weight:600;color:var(--text)">${escapeHTML(r.name)}</div>
              <div style="display:flex;gap:10px;margin-top:3px">
                ${r.language?`<span style="font-size:10px;color:var(--accent)">● ${escapeHTML(r.language)}</span>`:''}
                <span style="font-size:10px;color:var(--muted)">⭐ ${r.stargazers_count}</span>
                <span style="font-size:10px;color:var(--muted)">🍴 ${r.forks_count}</span>
              </div>
            </a>`).join('')}
          </div>
        </div>
      </div>`;
  }catch(e){
    if(content)content.innerHTML='<div class="panel" style="max-width:480px;margin:0 auto"><div class="empty-state" style="padding:20px;font-size:13px">Could not load GitHub data — rate limit or network error</div></div>';
  }
}
