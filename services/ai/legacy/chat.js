/* ETHONE legacy compatibility module: ai-chat. */
// ===================================================
//  NAVIGATION
// ===================================================
// ══════════════════════════════════════════════
//  ETHONE AI — Claude-powered dashboard assistant
// ══════════════════════════════════════════════
let _aiHistory=[];
let _aiTyping=false;

function getAIContext(){
  const p=curP();if(!p)return{summary:'No profile loaded',counts:{}};
  const s=p.state||{};
  const todos=(s.todos||[]);
  const pending=todos.filter(t=>!t.done);
  const done=todos.filter(t=>t.done).length;
  const highPriority=pending.filter(t=>t.priority==='high').map(t=>t.text).slice(0,5);
  const allPending=pending.map(t=>t.text).slice(0,8);
  const habits=(s.habits||[]);
  const notes=(s.notes||[]);
  const items=(s.items||[]);
  const pomoHistory=(s.pomoHistory||[]);
  const todayPomos=pomoHistory.filter(h=>{
    const d=new Date(h.ts||h);
    return d.toLocaleDateString('en-CA')===new Date().toLocaleDateString('en-CA');
  }).length;
  const upcoming=(s.events||[]).filter(e=>new Date(e.date)>=new Date()).slice(0,5).map(e=>`${e.title} (${e.date})`);
  const counts={pending:pending.length,done,habits:habits.length,notes:notes.length,items:items.length,todayPomos};

  // Vrais noms des éléments (pas de compteurs vides)
  const noteNames=notes.slice(0,5).map(n=>`"${n.title||'Sans titre'}"`);
  const itemNames=items.slice(0,5).map(i=>`"${i.name||i.title||'Sans nom'}" [${i.type||'file'}]`);
  const habitNames=habits.map(h=>`${h.name}(${h.streak||0}🔥)`).slice(0,4);
  const goalNames=(s.goals||[]).filter(g=>!g.done).map(g=>g.text).slice(0,3);
  const kanbanCards=(s.kanban||[]).flatMap(col=>(col.cards||[]).filter(c=>!c.done).map(c=>c.text)).slice(0,3);

  // Construire le summary seulement avec les données non-vides
  const parts=[`${p.name}`];
  if(pending.length)parts.push(`tasks:${pending.map(t=>t.text).slice(0,5).join(',')}`);
  if(highPriority.length)parts.push(`urgent:${highPriority.join(',')}`);
  if(noteNames.length)parts.push(`notes:${noteNames.join(',')}`);
  if(itemNames.length)parts.push(`files:${itemNames.join(',')}`);
  if(habitNames.length)parts.push(`habits:${habitNames.join(',')}`);
  if(goalNames.length)parts.push(`goals:${goalNames.join(',')}`);
  if(upcoming.length)parts.push(`events:${upcoming.slice(0,3).join(',')}`);
  if(todayPomos)parts.push(`pomos:${todayPomos}`);
  const summary=parts.join('|');

  return{summary,counts,profile:p.name};
}

// Sauvegarde MANUELLE du chat courant
function saveCurrentAIChat(){
  const p=curP();if(!p||!p.state)return;
  if(!_aiHistory.length){toast('Aucun message à sauvegarder','error');return;}
  if(!p.state.aiSessions)p.state.aiSessions=[];
  const firstUser=_aiHistory.find(m=>m.role==='user')?.content||'';
  const preview=firstUser.slice(0,60)+(firstUser.length>60?'…':'');
  const now=Date.now();
  // Si ce chat a déjà un ID de session → mettre à jour
  const sess=p.state.aiSessions;
  const existing=_aiSessionId?sess.find(s=>s.id===_aiSessionId):null;
  if(existing){
    existing.messages=[..._aiHistory];
    existing.ts=now;
    existing.preview=preview;
    toast('Chat mis à jour ✓','success');
  } else {
    _aiSessionId=now;
    sess.push({id:now,ts:now,preview,title:'',messages:[..._aiHistory]});
    if(sess.length>30)p.state.aiSessions=sess.slice(-30);
    toast('Chat sauvegardé ✓','success');
  }
  saveStateNow();
  if(_sbUser){clearTimeout(_saveCloudTimeout);saveCloudState().catch(()=>{});}
}

// Ancienne saveAIChats gardée pour compatibilité mais ne fait plus rien d'auto
function saveAIChats(){/* sauvegarde manuelle uniquement via saveCurrentAIChat */}

function renderAISessions(){
  const p=curP();if(!p)return;
  const sessions=(p.state?.aiSessions||[]).slice().reverse();
  const panel=document.getElementById('ai-sessions-panel');if(!panel)return;
  const countEl=document.getElementById('ai-sessions-count');
  if(countEl)countEl.textContent=sessions.length?`${sessions.length} chat${sessions.length>1?'s':''} sauvegardé${sessions.length>1?'s':''}` :'Aucun chat sauvegardé';
  if(!sessions.length){
    panel.innerHTML=`<div class="ai-sessions-empty">
      <div style="font-size:24px;margin-bottom:8px">💬</div>
      <div>Aucun chat sauvegardé</div>
      <div style="font-size:11px;margin-top:4px;opacity:.6">Clique sur "Sauvegarder" pour conserver un chat</div>
    </div>`;
    return;
  }
  panel.innerHTML=sessions.map(s=>`
    <div class="ai-session-item" style="position:relative" onclick="loadAISession(${s.id})">
      <div class="ai-session-preview">${escapeHTML(s.preview||'Chat')}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
        <div class="ai-session-date">${new Date(s.ts).toLocaleDateString(_lang==='fr'?'fr-FR':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
        <button onclick="event.stopPropagation();deleteAISession(${s.id})" title="Supprimer" style="background:none;border:none;color:rgba(255,255,255,.2);cursor:pointer;font-size:14px;padding:0 4px;line-height:1;border-radius:4px" onmouseover="this.style.color='#f87171'" onmouseout="this.style.color='rgba(255,255,255,.2)'">✕</button>
      </div>
    </div>
  `).join('');
}

function deleteAISession(id){
  if(!confirm('Supprimer ce chat ?'))return;
  const p=curP();if(!p)return;
  p.state.aiSessions=(p.state.aiSessions||[]).filter(s=>s.id!==id);
  if(_aiSessionId===id)_aiSessionId=null;
  renderAISessions();
  saveStateNow();
  if(_sbUser){clearTimeout(_saveCloudTimeout);saveCloudState().catch(()=>{});}
  toast('Chat supprimé','info');
}

function loadAISession(id){
  const p=curP();if(!p)return;
  const sess=(p.state?.aiSessions||[]).find(s=>s.id===id);
  if(!sess)return;
  _aiSessionId=id;
  _aiHistory=[...sess.messages];
  const msgs=document.getElementById('ai-messages');
  if(msgs)msgs.innerHTML='';
  _aiHistory.forEach(m=>addAIMessage(m.role,m.content));
  document.getElementById('ai-history-panel')?.classList.remove('open');
  toast('Chat chargé','info');
}

function toggleAISessions(){
  // Utiliser le panel inline dans page-ai (plus de drawer externe)
  const panel=document.getElementById('ai-history-panel');
  if(!panel)return;
  const open=panel.classList.toggle('open');
  if(open)renderAISessions();
}

let _aiSessionId=null;

function initAIChat(){
  // Ne réinitialise pas si des messages sont déjà affichés dans le DOM (retour sur onglet)
  const msgContainer=document.getElementById('ai-messages');
  if(msgContainer&&msgContainer.children.length>0){
    // Juste update le context label
    const ctx=getAIContext();
    document.getElementById('ai-ctx-label').textContent=`${ctx.profile} · ${ctx.counts.pending} tasks · ${ctx.counts.habits} habits`;
    return;
  }
  const ctx=getAIContext();
  document.getElementById('ai-ctx-label').textContent=`${ctx.profile} · ${ctx.counts.pending} tasks · ${ctx.counts.habits} habits`;
  if(_aiHistory.length===0){
    const welcomeMsg={
      fr:`Salut **${ctx.profile}** ! Je suis ETHONE AI, ton assistant personnel propulsé par Groq.\n\nJe peux voir tes tâches, habitudes, notes et plus encore. Comment puis-je t'aider aujourd'hui ?`,
      es:`¡Hola **${ctx.profile}**! Soy ETHONE AI, tu asistente personal impulsado por Groq.\n\nPuedo ver tus tareas, hábitos, notas y más. ¿En qué puedo ayudarte hoy?`,
      de:`Hey **${ctx.profile}**! Ich bin ETHONE AI, dein persönlicher Assistent, angetrieben von Groq.\n\nIch kann deine Aufgaben, Gewohnheiten, Notizen und mehr sehen. Wie kann ich dir heute helfen?`,
      en:`Hey **${ctx.profile}**! I'm ETHONE AI, your personal dashboard assistant powered by Groq.\n\nI can see your tasks, habits, notes and more. What can I help you with today?`
    };
    addAIMessage('assistant',welcomeMsg[_lang||'fr']||welcomeMsg.en);
  }
}

function addAIMessage(role,text){
  const p=curP();
  const msgs=document.getElementById('ai-messages');if(!msgs)return;
  const isUser=role==='user';
  const avatarHtml=isUser
    ?`<div class="ai-avatar user-av">${p?.avatarImg?`<img src="${p.avatarImg}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`:(p?.avatarEmoji||'👤')}</div>`
    :`<div class="ai-avatar nexus"><svg viewBox="0 0 20 20" fill="none" style="width:14px;height:14px" aria-hidden="true"><rect x="4" y="5" width="12" height="2" rx="1" fill="white" opacity=".95"/><rect x="4" y="9" width="12" height="2" rx="1" fill="white" opacity=".95"/><rect x="4" y="13" width="8" height="2" rx="1" fill="white" opacity=".95"/></svg></div>`;
  // Simple markdown: **bold**, `code`, [link](url), newlines
  const html=text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\[([^\]]+)\]\(#open-note-(\d+)\)/g,(_,label,id)=>`<a href="#" onclick="event.preventDefault();openNoteFromAI(${id})" style="color:var(--accent);text-decoration:underline;cursor:pointer">${label}</a>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" style="color:var(--accent);text-decoration:underline">$1</a>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\n/g,'<br>');
  const div=document.createElement('div');
  div.className=`ai-msg ${role}`;
  div.innerHTML=`${isUser?'':avatarHtml}<div class="ai-bubble">${html}</div>${isUser?avatarHtml:''}`;
  msgs.appendChild(div);
  msgs.scrollTop=msgs.scrollHeight;
  // Always keep suggestions visible
  if(isUser){const s=document.getElementById('ai-suggestions');if(s)s.style.display='flex';}
}

function showAITyping(){
  const msgs=document.getElementById('ai-messages');if(!msgs)return;
  const div=document.createElement('div');
  div.className='ai-msg assistant';div.id='ai-typing-indicator';
  div.innerHTML=`<div class="ai-avatar nexus"><svg viewBox="0 0 20 20" fill="none" style="width:14px;height:14px" aria-hidden="true"><rect x="4" y="5" width="12" height="2" rx="1" fill="white" opacity=".95"/><rect x="4" y="9" width="12" height="2" rx="1" fill="white" opacity=".95"/><rect x="4" y="13" width="8" height="2" rx="1" fill="white" opacity=".95"/></svg></div><div class="ai-typing"><span></span><span></span><span></span></div>`;
  msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight;
}

function removeAITyping(){
  document.getElementById('ai-typing-indicator')?.remove();
}
