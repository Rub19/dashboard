/* ETHONE legacy compatibility module: ai-actions. */
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ETHONE AI â€” DASHBOARD ACTIONS
//  Parses AI responses for [ACTION:...] commands
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const AI_ACTIONS={
  create_task({text,priority,due}){
    const p=curP();if(!p)return t_ai('action_fail');
    if(!text)return t_ai('action_fail');
    const todo={id:Date.now(),text,priority:priority||'medium',done:false,color:'',
      due:due||'',tag:'',date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'})};
    p.state.todos.unshift(todo);saveStateNow();renderTodos();updateStats();
    addActivity('AI: '+text,'var(--accent2)','system');
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
    const msgs={fr:`ðŸ“ Note crÃ©Ã©e : **[${t}](#open-note-${noteId})**`,en:`ðŸ“ Note created: **[${t}](#open-note-${noteId})**`,es:`ðŸ“ Nota creada: **[${t}](#open-note-${noteId})**`,de:`ðŸ“ Notiz erstellt: **[${t}](#open-note-${noteId})**`};
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
    return todos.map((t,i)=>`${i+1}. **${t.text}**${t.priority==='high'?' ðŸ”´':''}${t.due?' ('+t.due+')':''}`).join('\n');
  },
};

// Translation helper for AI action messages
function t_ai(key,vars={}){
  const lang=_lang||'fr';
  const msgs={
    fr:{
      action_fail:'âŒ Action impossible.',
      task_created:'âœ… TÃ¢che crÃ©Ã©e : **{text}**',
      note_created:'ðŸ“ Note crÃ©Ã©e : **{title}**',
      event_created:'ðŸ“… Ã‰vÃ©nement ajoutÃ© : **{title}** le {date}',
      task_done:'âœ… TÃ¢che terminÃ©e : **{text}**',
      task_deleted:'ðŸ—‘ï¸ TÃ¢che supprimÃ©e : **{text}**',
      task_not_found:'âŒ TÃ¢che introuvable : **{text}**',
      no_tasks:'Aucune tÃ¢che en attente.',
    },
    en:{
      action_fail:'âŒ Action failed.',
      task_created:'âœ… Task created: **{text}**',
      note_created:'ðŸ“ Note created: **{title}**',
      event_created:'ðŸ“… Event added: **{title}** on {date}',
      task_done:'âœ… Task completed: **{text}**',
      task_deleted:'ðŸ—‘ï¸ Task deleted: **{text}**',
      task_not_found:'âŒ Task not found: **{text}**',
      no_tasks:'No pending tasks.',
    },
    es:{
      action_fail:'âŒ AcciÃ³n fallida.',
      task_created:'âœ… Tarea creada: **{text}**',
      note_created:'ðŸ“ Nota creada: **{title}**',
      event_created:'ðŸ“… Evento aÃ±adido: **{title}** el {date}',
      task_done:'âœ… Tarea completada: **{text}**',
      task_deleted:'ðŸ—‘ï¸ Tarea eliminada: **{text}**',
      task_not_found:'âŒ Tarea no encontrada: **{text}**',
      no_tasks:'Sin tareas pendientes.',
    },
    de:{
      action_fail:'âŒ Aktion fehlgeschlagen.',
      task_created:'âœ… Aufgabe erstellt: **{text}**',
      note_created:'ðŸ“ Notiz erstellt: **{title}**',
      event_created:'ðŸ“… Ereignis hinzugefÃ¼gt: **{title}** am {date}',
      task_done:'âœ… Aufgabe erledigt: **{text}**',
      task_deleted:'ðŸ—‘ï¸ Aufgabe gelÃ¶scht: **{text}**',
      task_not_found:'âŒ Aufgabe nicht gefunden: **{text}**',
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
    fr:`**ETHONE AI peut interagir avec ton dashboard :**\n\nâœ… **CrÃ©er une tÃ¢che** â€” *Ajoute une tÃ¢che: acheter du pain*\nâœ… **Terminer une tÃ¢che** â€” *Marque X comme fait*\nðŸ—‘ï¸ **Supprimer une tÃ¢che** â€” *Supprime la tÃ¢che X*\nðŸ“ **CrÃ©er une note** â€” *CrÃ©e une note: idÃ©es projet*\nðŸ“… **Ajouter un Ã©vÃ©nement** â€” *Ajoute rÃ©union le 2025-06-20*\nðŸ“‹ **Lister mes tÃ¢ches** â€” *Quelles sont mes tÃ¢ches ?*\nðŸ’¬ **Conseils & planning** â€” *Sur quoi me concentrer ?*\n\nParle-moi naturellement, je comprends le contexte !`,
    en:`**ETHONE AI can:**\n\nðŸ“‹ **Tasks** â€” Summarize, prioritize, suggest a schedule\nðŸ“– **Notes** â€” Writing help, summaries\nðŸ”¥ **Habits** â€” Analyze your streaks, suggest improvements\nðŸ“… **Events** â€” Remind you of upcoming events\nâ±ï¸ **Pomodoro** â€” Suggest work sessions\nðŸ’¬ **Chat** â€” Answer any question\n\nAsk me anything!`,
    es:`**ETHONE AI puede:**\n\nðŸ“‹ **Tareas** â€” Resumir, priorizar, sugerir un horario\nðŸ“– **Notas** â€” Ayuda a escribir, resÃºmenes\nðŸ”¥ **HÃ¡bitos** â€” Analizar tus rachas, sugerir mejoras\nðŸ“… **Eventos** â€” Recordar tus prÃ³ximos eventos\nâ±ï¸ **Pomodoro** â€” Sugerir sesiones de trabajo\nðŸ’¬ **Chat** â€” Responder cualquier pregunta`,
    de:`**ETHONE AI kann:**\n\nðŸ“‹ **Aufgaben** â€” Zusammenfassen, priorisieren, Zeitplan vorschlagen\nðŸ“– **Notizen** â€” Schreibhilfe, Zusammenfassungen\nðŸ”¥ **Gewohnheiten** â€” Streaks analysieren, Verbesserungen vorschlagen\nðŸ“… **Ereignisse** â€” Bevorstehende Ereignisse erinnern\nâ±ï¸ **Pomodoro** â€” Arbeitssitzungen vorschlagen\nðŸ’¬ **Chat** â€” Jede Frage beantworten`,
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
