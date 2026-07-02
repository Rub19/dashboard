/* ETHONE legacy compatibility module: ai-actions. */
// ════════════════════════════════════════════════════════════
//  ETHONE AI — DASHBOARD ACTIONS
//  Parses AI responses for [ACTION:...] commands
// ════════════════════════════════════════════════════════════

const AI_ACTIONS={
  create_task({text,priority,due}){
    const p=curP();if(!p)return t_ai('action_fail');
    if(!text)return t_ai('action_fail');
    const todo={id:Date.now(),text,priority:priority||'medium',done:false,color:'',
      due:due||'',tag:'',date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'})};
    p.state.todos.unshift(todo);saveStateNow();renderTodos();updateStats();
    addActivity('AI: '+text,'var(--accent2)');
    return t_ai('task_created',{text});
  },
  create_note({title,content}){
    const p=curP();if(!p)return t_ai('action_fail');
    if(!p.state.notes)p.state.notes=[];
    const noteId=Date.now();
    const note={id:noteId,title:title||'Note',content:content||'',color:'',
      pinned:false,created:new Date().toISOString(),updated:new Date().toISOString()};
    p.state.notes.unshift(note);saveStateNow();renderNotesList();
    // Return message with clickable link to open the note
    const lang=_lang||'fr';
    const t=title||'Note';
    const msgs={fr:`📝 Note créée : **[${t}](#open-note-${noteId})**`,en:`📝 Note created: **[${t}](#open-note-${noteId})**`,es:`📝 Nota creada: **[${t}](#open-note-${noteId})**`,de:`📝 Notiz erstellt: **[${t}](#open-note-${noteId})**`};
    return msgs[lang]||msgs.fr;
  },
  create_event({title,date}){
    const p=curP();if(!p)return t_ai('action_fail');
    if(!title||!date)return t_ai('action_fail');
    if(!p.state.events)p.state.events=[];
    p.state.events.push({id:Date.now(),title,date,color:'#8b5cf6'});
    p.state.events.sort((a,b)=>a.date.localeCompare(b.date));
    saveStateNow();
    if(typeof renderOverviewEvents==='function')renderOverviewEvents();
    return t_ai('event_created',{title,date});
  },
  complete_task({text}){
    const p=curP();if(!p)return t_ai('action_fail');
    const todo=(p.state.todos||[]).find(t=>!t.done&&t.text.toLowerCase().includes((text||'').toLowerCase()));
    if(!todo)return t_ai('task_not_found',{text});
    todo.done=true;todo.doneAt=new Date().toISOString();
    saveStateNow();renderTodos();updateStats();
    return t_ai('task_done',{text:todo.text});
  },
  delete_task({text}){
    const p=curP();if(!p)return t_ai('action_fail');
    const before=(p.state.todos||[]).length;
    p.state.todos=(p.state.todos||[]).filter(t=>!t.text.toLowerCase().includes((text||'').toLowerCase()));
    if(p.state.todos.length===before)return t_ai('task_not_found',{text});
    saveStateNow();renderTodos();updateStats();
    return t_ai('task_deleted',{text});
  },
  list_tasks(){
    const p=curP();if(!p)return '';
    const todos=(p.state.todos||[]).filter(t=>!t.done);
    if(!todos.length)return t_ai('no_tasks');
    return todos.map((t,i)=>`${i+1}. **${t.text}**${t.priority==='high'?' 🔴':''}${t.due?' ('+t.due+')':''}`).join('\n');
  },
};

// Translation helper for AI action messages
function t_ai(key,vars={}){
  const lang=_lang||'fr';
  const msgs={
    fr:{
      action_fail:'❌ Action impossible.',
      task_created:'✅ Tâche créée : **{text}**',
      note_created:'📝 Note créée : **{title}**',
      event_created:'📅 Événement ajouté : **{title}** le {date}',
      task_done:'✅ Tâche terminée : **{text}**',
      task_deleted:'🗑️ Tâche supprimée : **{text}**',
      task_not_found:'❌ Tâche introuvable : **{text}**',
      no_tasks:'Aucune tâche en attente.',
    },
    en:{
      action_fail:'❌ Action failed.',
      task_created:'✅ Task created: **{text}**',
      note_created:'📝 Note created: **{title}**',
      event_created:'📅 Event added: **{title}** on {date}',
      task_done:'✅ Task completed: **{text}**',
      task_deleted:'🗑️ Task deleted: **{text}**',
      task_not_found:'❌ Task not found: **{text}**',
      no_tasks:'No pending tasks.',
    },
    es:{
      action_fail:'❌ Acción fallida.',
      task_created:'✅ Tarea creada: **{text}**',
      note_created:'📝 Nota creada: **{title}**',
      event_created:'📅 Evento añadido: **{title}** el {date}',
      task_done:'✅ Tarea completada: **{text}**',
      task_deleted:'🗑️ Tarea eliminada: **{text}**',
      task_not_found:'❌ Tarea no encontrada: **{text}**',
      no_tasks:'Sin tareas pendientes.',
    },
    de:{
      action_fail:'❌ Aktion fehlgeschlagen.',
      task_created:'✅ Aufgabe erstellt: **{text}**',
      note_created:'📝 Notiz erstellt: **{title}**',
      event_created:'📅 Ereignis hinzugefügt: **{title}** am {date}',
      task_done:'✅ Aufgabe erledigt: **{text}**',
      task_deleted:'🗑️ Aufgabe gelöscht: **{text}**',
      task_not_found:'❌ Aufgabe nicht gefunden: **{text}**',
      no_tasks:'Keine ausstehenden Aufgaben.',
    },
  };
  let msg=(msgs[lang]||msgs.en)[key]||key;
  Object.entries(vars).forEach(([k,v])=>msg=msg.replace('{'+k+'}',v));
  return msg;
}

// Parse and execute actions from AI reply
function executeAIActions(reply){
  const actionRegex=/\[ACTION:(\w+)\s*({[^}]*})?\]/g;
  let clean=reply;
  const results=[];
  let match;
  while((match=actionRegex.exec(reply))!==null){
    const name=match[1];
    let params={};
    try{if(match[2])params=JSON.parse(match[2]);}catch(e){}
    if(AI_ACTIONS[name]){
      const res=AI_ACTIONS[name](params);
      if(res)results.push(res);
    }
    clean=clean.replace(match[0],'');
  }
  return{clean:clean.trim(),results};
}

async function sendAIMessage(){
  if(_aiTyping)return;
  const inp=document.getElementById('ai-input');if(!inp)return;
  const text=inp.value.trim();if(!text)return;
  inp.value='';inp.style.height='auto';
  addAIMessage('user',text);
  _aiHistory.push({role:'user',content:text});
  _aiTyping=true;
  document.getElementById('ai-send-btn').disabled=true;
  showAITyping();
  const ctx=getAIContext();
  const uiLang=_lang||'fr';
  const lang2=uiLang==='fr'?'fr':uiLang==='es'?'es':uiLang==='de'?'de':'en';
  const today=new Date().toISOString().slice(0,10);
  // Actions ultra-compactes
  const actions='[create_task text,priority,due][create_note title,content][create_event title,date][complete_task text][delete_task text][list_tasks]';
  const system=`ETHONE AI. Lang:${lang2}. Date:${today}.\nACTIONS:${actions}\nDATA:${ctx.summary}\nRègles: concis, réponds en ${lang2}, utilise ACTION si besoin.`;
  try{
    if(window.ETHONEAICore&&typeof window.ETHONEAICore.complete==='function'){
      const result=await window.ETHONEAICore.complete(text);
      const {clean:reply,results}=executeAIActions(result.content);
      removeAITyping();
      addAIMessage('assistant',reply);
      if(results.length)results.forEach(r=>addAIMessage('assistant',r));
      _aiHistory.push({role:'assistant',content:reply,ts:Date.now(),provider:result.provider,model:result.model});
      if(_aiHistory.length>32)_aiHistory=_aiHistory.slice(-32);
      saveAIChats();
      _aiTyping=false;
      document.getElementById('ai-send-btn').disabled=false;
      document.getElementById('ai-input')?.focus();
      return;
    }
    throw new Error('ETHONE AI Core unavailable. Configure providers from the AI Core interface.');
    const groqKey=curP()?.state?.connections?.groqKey||'';
    if(!groqKey){
      removeAITyping();
      addAIMessage('assistant','⚙️ Ajoute ta clé **Groq API** dans Connexions → ETHONE AI. Gratuit sur [console.groq.com/keys](https://console.groq.com/keys).');
      _aiTyping=false;
      document.getElementById('ai-send-btn').disabled=false;
      return;
    }
    const groqMessages=[{role:'system',content:system},..._aiHistory.slice(-4)];
    const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+groqKey},
      body:JSON.stringify({model:'llama-3.1-8b-instant',messages:groqMessages,max_tokens:500,temperature:0.7}),
      signal:AbortSignal.timeout(30000)
    });
    if(!res.ok){
      const err=await res.json().catch(()=>({}));
      throw new Error(err?.error?.message||'HTTP '+res.status);
    }
    const data=await res.json();
    const rawReply=data.choices?.[0]?.message?.content||'Pas de réponse générée.';
    const {clean:reply,results}=executeAIActions(rawReply);
    removeAITyping();
    addAIMessage('assistant',reply);
    if(results.length)results.forEach(r=>addAIMessage('assistant',r));
    _aiHistory.push({role:'assistant',content:reply});
    if(_aiHistory.length>24)_aiHistory=_aiHistory.slice(-24);
    saveAIChats();
  }catch(e){
    removeAITyping();
    const errMsg=e?.message||'Erreur inconnue';
    addAIMessage('assistant','❌ Erreur: '+errMsg+'. Vérifie ta clé Groq dans Connexions → ETHONE AI.');
    console.error('[ETHONE AI]',e);
  }
  _aiTyping=false;
  document.getElementById('ai-send-btn').disabled=false;
  document.getElementById('ai-input')?.focus();
}

function sendAISuggestion(btn){
  const inp=document.getElementById('ai-input');
  if(inp){inp.value=btn.textContent;sendAIMessage();}
}



function openNoteFromAI(noteId){
  switchPage('notes', null);
  setTimeout(()=>{
    _currentNoteId=noteId;
    renderNotesList();
    selectNote(noteId);
  }, 150);
}
function showAICapabilities(){
  const lang=_lang||'fr';
  const caps={
    fr:`**ETHONE AI peut interagir avec ton dashboard :**\n\n✅ **Créer une tâche** — *Ajoute une tâche: acheter du pain*\n✅ **Terminer une tâche** — *Marque X comme fait*\n🗑️ **Supprimer une tâche** — *Supprime la tâche X*\n📝 **Créer une note** — *Crée une note: idées projet*\n📅 **Ajouter un événement** — *Ajoute réunion le 2025-06-20*\n📋 **Lister mes tâches** — *Quelles sont mes tâches ?*\n💬 **Conseils & planning** — *Sur quoi me concentrer ?*\n\nParle-moi naturellement, je comprends le contexte !`,
    en:`**ETHONE AI can:**\n\n📋 **Tasks** — Summarize, prioritize, suggest a schedule\n📖 **Notes** — Writing help, summaries\n🔥 **Habits** — Analyze your streaks, suggest improvements\n📅 **Events** — Remind you of upcoming events\n⏱️ **Pomodoro** — Suggest work sessions\n💬 **Chat** — Answer any question\n\nAsk me anything!`,
    es:`**ETHONE AI puede:**\n\n📋 **Tareas** — Resumir, priorizar, sugerir un horario\n📖 **Notas** — Ayuda a escribir, resúmenes\n🔥 **Hábitos** — Analizar tus rachas, sugerir mejoras\n📅 **Eventos** — Recordar tus próximos eventos\n⏱️ **Pomodoro** — Sugerir sesiones de trabajo\n💬 **Chat** — Responder cualquier pregunta`,
    de:`**ETHONE AI kann:**\n\n📋 **Aufgaben** — Zusammenfassen, priorisieren, Zeitplan vorschlagen\n📖 **Notizen** — Schreibhilfe, Zusammenfassungen\n🔥 **Gewohnheiten** — Streaks analysieren, Verbesserungen vorschlagen\n📅 **Ereignisse** — Bevorstehende Ereignisse erinnern\n⏱️ **Pomodoro** — Arbeitssitzungen vorschlagen\n💬 **Chat** — Jede Frage beantworten`,
  };
  addAIMessage('assistant', caps[lang]||caps.fr);
}
function clearAIChat(){
  _aiHistory=[];
  _aiSessionId=null;
  const msgs=document.getElementById('ai-messages');
  if(msgs)msgs.innerHTML='';
  const sugg=document.getElementById('ai-suggestions');
  if(sugg)sugg.style.display='flex';
  initAIChat();
}
