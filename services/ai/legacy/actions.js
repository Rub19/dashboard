/* ETHONE legacy compatibility module: ai-actions. */
// ETHONE AI - DASHBOARD ACTIONS
//  Parses AI responses for [ACTION:...] commands

const AI_ACTIONS={
  create_task({text,priority,due}){
    const p=curP();if(!p)return t_ai('action_fail');
    if(!text)return t_ai('action_fail');
    const todo={id:Date.now(),text,priority:priority||'medium',done:false,color:'',
      due:due||'',tag:'',date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'})};
    p.state.todos.unshift(todo);saveStateNow();if(typeof renderTodos==='function')renderTodos();if(typeof updateStats==='function')updateStats();
    if(typeof addActivity==='function')addActivity('AI: '+text,'var(--accent2)','system');
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
    const msgs={fr:`Note creee : **[${t}](#open-note-${noteId})**`,en:`Note created: **[${t}](#open-note-${noteId})**`,es:`Nota creada: **[${t}](#open-note-${noteId})**`,de:`Notiz erstellt: **[${t}](#open-note-${noteId})**`};
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
    saveStateNow();if(typeof renderTodos==='function')renderTodos();if(typeof updateStats==='function')updateStats();
    return t_ai('task_done',{text:todo.text});
  },
  delete_task({text}){
    const p=curP();if(!p)return t_ai('action_fail');
    const before=(p.state.todos||[]).length;
    p.state.todos=(p.state.todos||[]).filter(t=>!t.text.toLowerCase().includes((text||'').toLowerCase()));
    if(p.state.todos.length===before)return t_ai('task_not_found',{text});
    saveStateNow();if(typeof renderTodos==='function')renderTodos();if(typeof updateStats==='function')updateStats();
    return t_ai('task_deleted',{text});
  },
  list_tasks(){
    const p=curP();if(!p)return '';
    const todos=(p.state.todos||[]).filter(t=>!t.done);
    if(!todos.length)return t_ai('no_tasks');
    return todos.map((t,i)=>`${i+1}. **${t.text}**${t.priority==='high'?' [high]':''}${t.due?' ('+t.due+')':''}`).join('\n');
  },
};

// Translation helper for AI action messages
function t_ai(key,vars={}){
  const lang=_lang||'fr';
  const msgs={
    fr:{
      action_fail:'Action impossible.',
      task_created:'Tache creee : **{text}**',
      note_created:'Note creee : **{title}**',
      event_created:'Evenement ajoute : **{title}** le {date}',
      task_done:'Tache terminee : **{text}**',
      task_deleted:'Tache supprimee : **{text}**',
      task_not_found:'Tache introuvable : **{text}**',
      no_tasks:'Aucune tache en attente.',
    },
    en:{
      action_fail:'Action failed.',
      task_created:'Task created: **{text}**',
      note_created:'Note created: **{title}**',
      event_created:'Event added: **{title}** on {date}',
      task_done:'Task completed: **{text}**',
      task_deleted:'Task deleted: **{text}**',
      task_not_found:'Task not found: **{text}**',
      no_tasks:'No pending tasks.',
    },
    es:{
      action_fail:'Accion fallida.',
      task_created:'Tarea creada: **{text}**',
      note_created:'Nota creada: **{title}**',
      event_created:'Evento anadido: **{title}** el {date}',
      task_done:'Tarea completada: **{text}**',
      task_deleted:'Tarea eliminada: **{text}**',
      task_not_found:'Tarea no encontrada: **{text}**',
      no_tasks:'Sin tareas pendientes.',
    },
    de:{
      action_fail:'Aktion fehlgeschlagen.',
      task_created:'Aufgabe erstellt: **{text}**',
      note_created:'Notiz erstellt: **{title}**',
      event_created:'Ereignis hinzugefuegt: **{title}** am {date}',
      task_done:'Aufgabe erledigt: **{text}**',
      task_deleted:'Aufgabe geloescht: **{text}**',
      task_not_found:'Aufgabe nicht gefunden: **{text}**',
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
  reply=String(reply||'');
  let clean=reply;
  const results=[];
  let match;
  while((match=actionRegex.exec(reply))!==null){
    const name=match[1];
    let params={};
    try{if(match[2])params=JSON.parse(match[2]);}catch(e){params={}}
    if(AI_ACTIONS[name]){
      try{
        const res=AI_ACTIONS[name](params);
        if(res)results.push(res);
      }catch(error){
        console.error('[ETHONE AI Action]',name,error);
        results.push('Action failed safely: '+(error.message||name));
      }
    }
    clean=clean.replace(match[0],'');
  }
  return{clean:clean.trim(),results};
}

async function sendAIMessage(){
  if(_aiTyping)return;
  const inp=document.getElementById('ai-input');if(!inp)return;
  const text=inp.value.trim();if(!text)return;
  const sendBtn=document.getElementById('ai-send-btn');
  let typingShown=false;
  inp.value='';inp.style.height='auto';
  try{addAIMessage('user',text)}catch(error){console.error('[ETHONE AI] user render failed',error)}
  try{_aiHistory.push({role:'user',content:text})}catch(error){console.warn('[ETHONE AI] history push failed',error)}
  _aiTyping=true;
  if(sendBtn)sendBtn.disabled=true;
  try{showAITyping();typingShown=true}catch(error){console.warn('[ETHONE AI] typing render failed',error)}
  try{
    if(window.ETHONEAICore&&typeof window.ETHONEAICore.complete==='function'){
      const result=await window.ETHONEAICore.complete(text);
      const {clean:reply,results}=executeAIActions(result.content);
      if(typingShown){removeAITyping();typingShown=false}
      try{
        addAIMessage('assistant',reply||'No response generated.');
        if(results.length)results.forEach(r=>addAIMessage('assistant',r));
      }catch(error){console.error('[ETHONE AI] assistant render failed',error)}
      try{
        _aiHistory.push({role:'assistant',content:reply,ts:Date.now(),provider:result.provider,model:result.model});
        if(_aiHistory.length>32)_aiHistory=_aiHistory.slice(-32);
        saveAIChats();
      }catch(error){console.warn('[ETHONE AI] history save failed',error)}
      return;
    }
    throw new Error('ETHONE AI Core unavailable. Configure providers from the AI Core interface.');
  }catch(e){
    if(typingShown){removeAITyping();typingShown=false}
    const errMsg=e?.message||'Erreur inconnue';
    try{addAIMessage('assistant','Erreur: '+errMsg+'. Verifie ta configuration dans ETHONE AI Core.')}catch(error){console.error('[ETHONE AI] error render failed',error)}
    console.error('[ETHONE AI]',e);
  }finally{
    _aiTyping=false;
    if(sendBtn)sendBtn.disabled=false;
    document.getElementById('ai-input')?.focus();
  }
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
    fr:`**ETHONE AI peut interagir avec ton dashboard :**\n\n- **Creer une tache** - *Ajoute une tache: acheter du pain*\n- **Terminer une tache** - *Marque X comme fait*\n- **Supprimer une tache** - *Supprime la tache X*\n- **Creer une note** - *Cree une note: idees projet*\n- **Ajouter un evenement** - *Ajoute reunion le 2025-06-20*\n- **Lister mes taches** - *Quelles sont mes taches ?*\n- **Conseils & planning** - *Sur quoi me concentrer ?*\n\nParle-moi naturellement, je comprends le contexte !`,
    en:`**ETHONE AI can:**\n\n- **Tasks** - Summarize, prioritize, suggest a schedule\n- **Notes** - Writing help, summaries\n- **Habits** - Analyze your streaks, suggest improvements\n- **Events** - Remind you of upcoming events\n- **Pomodoro** - Suggest work sessions\n- **Chat** - Answer any question\n\nAsk me anything!`,
    es:`**ETHONE AI puede:**\n\n- **Tareas** - Resumir, priorizar, sugerir un horario\n- **Notas** - Ayuda a escribir, resumenes\n- **Habitos** - Analizar tus rachas, sugerir mejoras\n- **Eventos** - Recordar tus proximos eventos\n- **Pomodoro** - Sugerir sesiones de trabajo\n- **Chat** - Responder cualquier pregunta`,
    de:`**ETHONE AI kann:**\n\n- **Aufgaben** - Zusammenfassen, priorisieren, Zeitplan vorschlagen\n- **Notizen** - Schreibhilfe, Zusammenfassungen\n- **Gewohnheiten** - Streaks analysieren, Verbesserungen vorschlagen\n- **Ereignisse** - Bevorstehende Ereignisse erinnern\n- **Pomodoro** - Arbeitssitzungen vorschlagen\n- **Chat** - Jede Frage beantworten`,
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
