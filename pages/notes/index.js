/* ETHONE Notes V2: modern markdown workspace with tags, relations, backlinks and local AI helpers. */
(function(){
  "use strict";

  var noteTO=null,_currentNoteId=null,_noteSaveTO=null,_noteSearch="",_noteTag="all",_noteMode="split";
  var _notesConfirmMap={};

  function $(sel,root){return (root||document).querySelector(sel)}
  function $all(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}
  function esc(v){
    try{return window.EthoneCore&&window.EthoneCore.dom?window.EthoneCore.dom.escapeHTML(v):String(v==null?"":v).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])})}
    catch(e){return String(v==null?"":v)}
  }
  function profile(){try{return typeof window.curP==="function"?window.curP():null}catch(e){return null}}
  function nowISO(){return new Date().toISOString()}
  function toastSafe(message,type){try{if(typeof window.toast==="function")window.toast(message,type||"info")}catch(e){}}
  function saveSoon(delay){
    clearTimeout(_noteSaveTO);
    _noteSaveTO=setTimeout(function(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}},delay==null?450:delay);
  }
  function icon(name){return '<i data-lucide="'+esc(name)+'" aria-hidden="true"></i>'}
  function renderIcons(){try{if(window.lucide&&!window.__lucideFailed)window.lucide.createIcons()}catch(e){}}
  function notesTwoStep(key,message){
    var n=Date.now();
    if(!_notesConfirmMap[key]||n-_notesConfirmMap[key]>5000){
      _notesConfirmMap[key]=n;
      toastSafe(message,"warning");
      return false;
    }
    delete _notesConfirmMap[key];
    return true;
  }
  function currentState(){var p=profile();return p&&p.state?p.state:null}
  function normalizeNote(note){
    note=note||{};
    if(note.id==null)note.id=Date.now()+Math.random();
    if(!note.title)note.title="Sans titre";
    if(note.content==null)note.content="";
    if(!note.created)note.created=note.createdAt||nowISO();
    if(!note.updated)note.updated=note.updatedAt||note.created||nowISO();
    if(!Array.isArray(note.tags))note.tags=[];
    if(!Array.isArray(note.relations))note.relations=[];
    if(typeof note.pinned!=="boolean")note.pinned=false;
    if(!note.color)note.color="#8b5cf6";
    return note;
  }
  function getNotesArray(){
    var s=currentState();if(!s)return [];
    if(!Array.isArray(s.notes))s.notes=[];
    if(s.note){
      s.notes.unshift(normalizeNote({id:Date.now(),title:"Quick Note",content:s.note,color:"#8b5cf6",created:nowISO(),updated:nowISO()}));
      s.note="";
      saveSoon(50);
    }
    s.notes=s.notes.map(normalizeNote);
    return s.notes;
  }
  function activeNote(){
    var notes=getNotesArray();
    var note=notes.find(function(n){return String(n.id)===String(_currentNoteId)});
    if(!note&&notes.length){note=sortNotes(notes)[0];_currentNoteId=note.id}
    return note||null;
  }
  function sortNotes(notes){
    return notes.slice().sort(function(a,b){
      if(a.pinned&&!b.pinned)return -1;
      if(!a.pinned&&b.pinned)return 1;
      return new Date(b.updated||0)-new Date(a.updated||0);
    });
  }
  function extractTags(text){
    var found=[],rx=/(^|\s)#([a-zA-Z0-9_-]{2,32})/g,m;
    while((m=rx.exec(text||"")))found.push(m[2].toLowerCase());
    return found;
  }
  function parseTags(value,content){
    var tags=String(value||"").split(/[,\s]+/).map(function(t){return t.replace(/^#/,"").trim().toLowerCase()}).filter(Boolean);
    extractTags(content||"").forEach(function(t){if(tags.indexOf(t)===-1)tags.push(t)});
    return tags.slice(0,14);
  }
  function tagMap(){
    var map={};
    getNotesArray().forEach(function(n){(n.tags||[]).concat(extractTags(n.content)).forEach(function(t){map[t]=(map[t]||0)+1})});
    return map;
  }
  function noteWords(text){return String(text||"").trim()?String(text||"").trim().split(/\s+/).length:0}
  function dateLabel(ts){
    try{return new Date(ts||Date.now()).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}catch(e){return ""}
  }
  function firstLine(text){return String(text||"").split(/\n+/).find(function(l){return l.trim()})||""}
  function filteredNotes(){
    var q=_noteSearch.toLowerCase().trim();
    var notes=sortNotes(getNotesArray());
    return notes.filter(function(n){
      var tags=(n.tags||[]).concat(extractTags(n.content));
      var tagOk=_noteTag==="all"||tags.indexOf(_noteTag)>-1;
      var hay=[n.title,n.content,tags.join(" "),n.aiSummary].join(" ").toLowerCase();
      return tagOk&&(!q||hay.indexOf(q)>-1);
    });
  }
  function backlinksFor(note){
    if(!note)return [];
    var title=String(note.title||"").toLowerCase(),id=String(note.id);
    return getNotesArray().filter(function(n){
      if(String(n.id)===id)return false;
      var content=String(n.content||"").toLowerCase();
      var rel=(n.relations||[]).map(String);
      return rel.indexOf(id)>-1||content.indexOf("[["+title+"]]")>-1||content.indexOf("[["+id+"]]")>-1;
    });
  }
  function relatedNotes(note){
    if(!note)return [];
    var ids=(note.relations||[]).map(String);
    return getNotesArray().filter(function(n){return ids.indexOf(String(n.id))>-1});
  }

  function buildShell(){
    var page=$("#page-notes");if(!page)return null;
    if($("#notes-v2",page))return $("#notes-v2",page);
    page.innerHTML=
      '<section class="notes-v2" id="notes-v2">'+
        '<header class="notes-v2-top">'+
          '<div><span class="notes-kicker">ETHONE Notes</span><h1>Notes</h1><p>Markdown, relations, backlinks et intelligence locale.</p></div>'+
          '<div class="notes-top-actions">'+
            '<button class="notes-icon-btn" type="button" data-note-action="toggle-preview" aria-label="Changer de vue">'+icon("panel-right-open")+'</button>'+
            '<button class="notes-btn" type="button" data-note-action="ai-summary">'+icon("sparkles")+'AI Summary</button>'+
            '<button class="notes-btn" type="button" data-note-action="ai-improve">'+icon("wand-sparkles")+'AI Improve</button>'+
            '<button class="notes-btn primary" type="button" data-note-action="new">'+icon("plus")+'Nouvelle note</button>'+
          '</div>'+
        '</header>'+
        '<div class="notes-v2-grid">'+
          '<aside class="notes-nav">'+
            '<label class="notes-search">'+icon("search")+'<input id="notes-search" type="search" placeholder="Rechercher notes, tags, contenu..."></label>'+
            '<div class="notes-tags" id="notes-tags"></div>'+
            '<div class="notes-list" id="notes-list-panel"></div>'+
          '</aside>'+
          '<main class="notes-editor-shell" id="note-editor-panel">'+
            '<div class="notes-editor-head">'+
              '<input id="note-title-input" class="notes-title-input" placeholder="Titre de la note">'+
              '<div class="notes-editor-meta"><span id="note-saved-status">Auto-save</span><span id="note-word-count">0 mots</span><span id="note-char-count">0 caracteres</span></div>'+
              '<div class="notes-editor-actions">'+
                '<button class="notes-icon-btn" id="note-pin-btn" type="button" data-note-action="pin" aria-label="Epingler">'+icon("pin")+'</button>'+
                '<button class="notes-icon-btn danger" type="button" data-note-action="delete" aria-label="Supprimer">'+icon("trash-2")+'</button>'+
              '</div>'+
            '</div>'+
            '<div class="notes-toolbar" id="note-toolbar">'+
              '<button type="button" data-note-format="h1">H1</button><button type="button" data-note-format="h2">H2</button><button type="button" data-note-format="bold"><b>B</b></button><button type="button" data-note-format="italic"><i>I</i></button><button type="button" data-note-format="code">Code</button>'+
              '<button type="button" data-note-insert="codeblock">'+icon("code-2")+'Block</button><button type="button" data-note-insert="table">'+icon("table-2")+'Table</button><button type="button" data-note-insert="image">'+icon("image")+'Image</button><button type="button" data-note-insert="mermaid">Mermaid</button><button type="button" data-note-insert="math">Math</button><button type="button" data-note-insert="link">'+icon("link")+'Relation</button>'+
              '<button type="button" data-note-action="copy">'+icon("copy")+'Copier</button>'+
            '</div>'+
            '<div class="notes-editor-frame" data-mode="split" id="note-editor-frame">'+
              '<textarea id="main-note" class="notes-markdown-input" spellcheck="true" placeholder="# Commencez a ecrire\n\nMarkdown, tables, images, code, Mermaid, math, tags #project et liens [[Note]]."></textarea>'+
              '<div id="note-preview-area" class="notes-preview-area" aria-label="Apercu markdown"></div>'+
            '</div>'+
          '</main>'+
          '<aside class="notes-inspector" id="note-context-panel" aria-label="Contexte de la note">'+
            '<section class="notes-card"><div class="notes-card-head"><strong>AI Summary</strong><button type="button" data-note-action="ai-summary">Generer</button></div><p id="note-ai-summary">Selectionnez une note.</p><div id="note-ai-draft"></div></section>'+
            '<section class="notes-card"><div class="notes-card-head"><strong>Tags</strong><span id="note-context-state">Standard</span></div><input id="note-tags-input" class="notes-small-input" placeholder="project, idea, todo"><label class="notes-color-control"><span>Couleur</span><input id="note-color-pick" type="color" value="#8b5cf6"></label></section>'+
            '<section class="notes-card"><div class="notes-card-head"><strong>Relations</strong><button type="button" data-note-action="add-relation">Ajouter</button></div><select id="note-relation-select" class="notes-small-input"></select><div class="notes-chip-list" id="note-relations"></div></section>'+
            '<section class="notes-card"><div class="notes-card-head"><strong>Backlinks</strong><span id="note-backlink-count">0</span></div><div class="notes-link-list" id="note-backlinks"></div></section>'+
            '<section class="notes-card"><div class="notes-card-head"><strong>Details</strong><button type="button" data-note-action="ask-brain">Ask Brain</button></div><dl class="notes-stats"><div><dt>Mots</dt><dd id="note-context-words">0</dd></div><div><dt>Caracteres</dt><dd id="note-context-chars">0</dd></div><div><dt>Relations</dt><dd id="note-context-relations">0</dd></div></dl></section>'+
          '</aside>'+
        '</div>'+
      '</section>';
    bindNotesUI(page);
    return $("#notes-v2",page);
  }
  function bindNotesUI(page){
    var shell=$("#notes-v2",page);if(!shell||shell.dataset.bound)return;
    shell.dataset.bound="1";
    shell.addEventListener("click",function(e){
      var noteBtn=e.target.closest("[data-note-id]");
      if(noteBtn){selectNote(noteBtn.dataset.noteId);return}
      var tagBtn=e.target.closest("[data-note-tag]");
      if(tagBtn){_noteTag=tagBtn.dataset.noteTag;renderNotesList();renderTagRail();return}
      var relRemove=e.target.closest("[data-note-relation-remove]");
      if(relRemove){removeRelation(relRemove.dataset.noteRelationRemove);return}
      var backlink=e.target.closest("[data-note-backlink]");
      if(backlink){selectNote(backlink.dataset.noteBacklink);return}
      var wikilink=e.target.closest("[data-note-wikilink]");
      if(wikilink){openWikiLink(wikilink.dataset.noteWikilink);return}
      var action=e.target.closest("[data-note-action]");
      if(action){runNoteAction(action.dataset.noteAction);return}
      var format=e.target.closest("[data-note-format]");
      if(format){runFormat(format.dataset.noteFormat);return}
      var insert=e.target.closest("[data-note-insert]");
      if(insert){runInsert(insert.dataset.noteInsert);return}
    });
    shell.addEventListener("input",function(e){
      if(e.target.id==="notes-search"){filterNotes(e.target.value);return}
      if(e.target.id==="note-title-input"){updateNoteTitle(e.target.value);return}
      if(e.target.id==="main-note"){saveNote();return}
      if(e.target.id==="note-tags-input"){saveNote();return}
      if(e.target.id==="note-color-pick"){updateNoteColor(e.target.value);return}
    });
    shell.addEventListener("change",function(e){
      if(e.target.id==="note-relation-select")return;
      if(e.target.id==="note-tags-input")saveNote();
      if(e.target.id==="note-color-pick")updateNoteColor(e.target.value);
    });
    shell.addEventListener("keydown",function(e){
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();saveNoteNow()}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="b"){e.preventDefault();noteFormat("**","**")}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="i"){e.preventDefault();noteFormat("*","*")}
    });
  }
  function renderAll(){
    var shell=buildShell();if(!shell)return;
    var notes=getNotesArray();
    if(!_currentNoteId&&notes.length)_currentNoteId=sortNotes(notes)[0].id;
    renderTagRail();
    renderNotesList();
    renderEditor();
    renderInspector();
    renderIcons();
  }
  function renderTagRail(){
    var el=$("#notes-tags");if(!el)return;
    var map=tagMap(),tags=Object.keys(map).sort();
    var html='<button type="button" class="'+(_noteTag==="all"?"active":"")+'" data-note-tag="all">All <span>'+getNotesArray().length+'</span></button>';
    html+=tags.map(function(t){return '<button type="button" class="'+(_noteTag===t?"active":"")+'" data-note-tag="'+esc(t)+'">#'+esc(t)+' <span>'+map[t]+'</span></button>'}).join("");
    el.innerHTML=html;
  }
  function renderNotesList(){
    var el=$("#notes-list-panel");if(!el)return;
    var notes=filteredNotes();
    if(!notes.length){el.innerHTML='<div class="notes-empty">Aucune note trouvee.</div>';return}
    el.innerHTML=notes.map(function(n){
      var active=String(n.id)===String(_currentNoteId),preview=firstLine(n.content)||"Note vide";
      var tags=(n.tags||[]).slice(0,3).map(function(t){return '<span>#'+esc(t)+'</span>'}).join("");
      return '<button type="button" class="notes-list-item '+(active?"active":"")+'" data-note-id="'+esc(n.id)+'" style="--note-color:'+esc(n.color||"#8b5cf6")+'">'+
        '<i></i><strong>'+esc(n.title||"Sans titre")+'</strong><small>'+esc(preview.slice(0,90))+'</small><em>'+dateLabel(n.updated)+'</em><div>'+tags+'</div>'+
      '</button>';
    }).join("");
  }
  function renderEditor(){
    var note=activeNote();
    var panel=$("#note-editor-panel"),empty=$("#note-empty-state");
    if(panel)panel.style.display=note?"block":"none";
    if(empty)empty.style.display=note?"none":"block";
    var title=$("#note-title-input"),body=$("#main-note"),tags=$("#note-tags-input"),color=$("#note-color-pick"),pin=$("#note-pin-btn"),frame=$("#note-editor-frame");
    if(!note){
      if(title)title.value="";
      if(body)body.value="";
      if(tags)tags.value="";
      if(color)color.value="#8b5cf6";
      renderPreview("");
      updateStats(null);
      return;
    }
    if(title&&document.activeElement!==title)title.value=note.title||"";
    if(body&&document.activeElement!==body)body.value=note.content||"";
    if(tags&&document.activeElement!==tags)tags.value=(note.tags||[]).join(", ");
    if(color&&document.activeElement!==color)color.value=note.color||"#8b5cf6";
    if(pin)pin.classList.toggle("active",!!note.pinned);
    if(frame)frame.dataset.mode=_noteMode;
    renderPreview(note.content||"");
    updateStats(note);
  }
  function renderInspector(){
    var note=activeNote();
    var summary=$("#note-ai-summary"),draft=$("#note-ai-draft"),stateEl=$("#note-context-state"),relEl=$("#note-relations"),select=$("#note-relation-select"),backEl=$("#note-backlinks"),backCount=$("#note-backlink-count");
    if(!note){
      if(summary)summary.textContent="Selectionnez une note.";
      if(relEl)relEl.innerHTML="";
      if(select)select.innerHTML="";
      if(backEl)backEl.innerHTML="";
      return;
    }
    if(summary)summary.textContent=note.aiSummary||"Aucun resume genere. Cliquez sur Generer.";
    if(draft)draft.innerHTML=note.aiImprovedDraft?'<div class="notes-ai-draft"><strong>Proposition AI Improve</strong><pre>'+esc(note.aiImprovedDraft)+'</pre><button type="button" data-note-action="apply-improve">Appliquer</button></div>':"";
    if(stateEl)stateEl.textContent=note.pinned?"Epinglee":"Standard";
    var related=relatedNotes(note);
    if(relEl)relEl.innerHTML=related.length?related.map(function(r){return '<span class="notes-chip">'+esc(r.title)+'<button type="button" data-note-relation-remove="'+esc(r.id)+'" aria-label="Retirer">x</button></span>'}).join(""):'<div class="notes-muted">Aucune relation.</div>';
    if(select){
      var current=(note.relations||[]).map(String);
      var opts=getNotesArray().filter(function(n){return String(n.id)!==String(note.id)&&current.indexOf(String(n.id))===-1});
      select.innerHTML=opts.length?'<option value="">Choisir une note...</option>'+opts.map(function(n){return '<option value="'+esc(n.id)+'">'+esc(n.title)+'</option>'}).join(""):'<option value="">Aucune note disponible</option>';
    }
    var backs=backlinksFor(note);
    if(backCount)backCount.textContent=backs.length;
    if(backEl)backEl.innerHTML=backs.length?backs.map(function(b){return '<button type="button" data-note-backlink="'+esc(b.id)+'"><strong>'+esc(b.title)+'</strong><span>'+esc(firstLine(b.content).slice(0,80))+'</span></button>'}).join(""):'<div class="notes-muted">Aucun backlink.</div>';
    updateStats(note);
  }
  function updateStats(note){
    note=note||activeNote();
    var text=note?note.content||"":($("#main-note")?$("#main-note").value:"");
    var words=noteWords(text),chars=text.length,rel=note&&note.relations?note.relations.length:0;
    var wc=$("#note-word-count"),cc=$("#note-char-count"),cw=$("#note-context-words"),ch=$("#note-context-chars"),cr=$("#note-context-relations");
    if(wc)wc.textContent=words.toLocaleString("fr-FR")+" mots";
    if(cc)cc.textContent=chars.toLocaleString("fr-FR")+" caracteres";
    if(cw)cw.textContent=words.toLocaleString("fr-FR");
    if(ch)ch.textContent=chars.toLocaleString("fr-FR");
    if(cr)cr.textContent=rel.toLocaleString("fr-FR");
  }

  function renderPreview(markdown){
    var preview=$("#note-preview-area");if(!preview)return;
    preview.innerHTML=markdownToHTML(markdown||"");
    renderIcons();
  }
  function inline(text){
    return esc(text)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img class="notes-md-image" alt="$1" src="$2" loading="lazy" onerror="this.style.display=\'none\'">')
      .replace(/\[\[([^\]]+)\]\]/g,'<button type="button" class="notes-wikilink" data-note-wikilink="$1">$1</button>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,'<em>$1</em>')
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\$([^$\n]+)\$/g,'<span class="notes-math">$1</span>');
  }
  function markdownToHTML(md){
    var lines=String(md||"").replace(/\r\n/g,"\n").split("\n"),out=[],i=0;
    function paragraph(buf){if(buf.length){out.push("<p>"+inline(buf.join(" "))+"</p>");buf.length=0}}
    var para=[];
    while(i<lines.length){
      var line=lines[i],trim=line.trim();
      if(/^```/.test(trim)){
        paragraph(para);
        var lang=trim.replace(/^```/,"").trim().toLowerCase(),code=[];
        i++;
        while(i<lines.length&&!/^```/.test(lines[i].trim())){code.push(lines[i]);i++}
        if(lang==="mermaid")out.push('<div class="notes-mermaid"><div>Mermaid diagram</div><pre>'+esc(code.join("\n"))+'</pre></div>');
        else out.push('<pre class="notes-code"><span>'+esc(lang||"code")+'</span><code>'+esc(code.join("\n"))+'</code></pre>');
      }else if(trim==="$$"){
        paragraph(para);
        var math=[];i++;
        while(i<lines.length&&lines[i].trim()!=="$$"){math.push(lines[i]);i++}
        out.push('<div class="notes-math-block">'+esc(math.join("\n"))+'</div>');
      }else if(/^#{1,3}\s+/.test(trim)){
        paragraph(para);
        var level=trim.match(/^#+/)[0].length;
        out.push("<h"+level+">"+inline(trim.replace(/^#{1,3}\s+/,""))+"</h"+level+">");
      }else if(/^>\s+/.test(trim)){
        paragraph(para);out.push("<blockquote>"+inline(trim.replace(/^>\s+/,""))+"</blockquote>");
      }else if(/^\|.+\|$/.test(trim)&&i+1<lines.length&&/^\|[\s:-]+\|/.test(lines[i+1].trim())){
        paragraph(para);
        var head=trim.split("|").slice(1,-1),rows=[];i+=2;
        while(i<lines.length&&/^\|.+\|$/.test(lines[i].trim())){rows.push(lines[i].trim().split("|").slice(1,-1));i++}
        i--;
        out.push('<table><thead><tr>'+head.map(function(h){return "<th>"+inline(h.trim())+"</th>"}).join("")+'</tr></thead><tbody>'+rows.map(function(r){return "<tr>"+r.map(function(c){return "<td>"+inline(c.trim())+"</td>"}).join("")+"</tr>"}).join("")+'</tbody></table>');
      }else if(/^- \[[ xX]\]\s+/.test(trim)){
        paragraph(para);
        var checked=/^- \[[xX]\]/.test(trim);
        out.push('<div class="notes-check '+(checked?"done":"")+'"><i>'+icon(checked?"check":"circle")+'</i><span>'+inline(trim.replace(/^- \[[ xX]\]\s+/,""))+'</span></div>');
      }else if(/^[-*]\s+/.test(trim)){
        paragraph(para);out.push('<div class="notes-bullet"><i></i><span>'+inline(trim.replace(/^[-*]\s+/,""))+'</span></div>');
      }else if(/^\d+\.\s+/.test(trim)){
        paragraph(para);out.push('<div class="notes-numbered"><span>'+esc(trim.match(/^\d+/)[0])+'</span><p>'+inline(trim.replace(/^\d+\.\s+/,""))+'</p></div>');
      }else if(trim==="---"){
        paragraph(para);out.push("<hr>");
      }else if(!trim){
        paragraph(para);
      }else{
        para.push(trim);
      }
      i++;
    }
    paragraph(para);
    return out.join("")||'<div class="notes-preview-empty">Apercu Markdown</div>';
  }

  function selectNote(id){
    _currentNoteId=id;
    renderAll();
    var title=$("#note-title-input");if(title)setTimeout(function(){title.focus({preventScroll:true})},20);
  }
  function newNote(){
    var s=currentState();if(!s)return;
    var note=normalizeNote({id:Date.now(),title:"Nouvelle note",content:"# Nouvelle note\n\n",color:"#8b5cf6",created:nowISO(),updated:nowISO(),tags:[],relations:[]});
    getNotesArray().unshift(note);
    _currentNoteId=note.id;
    saveSoon(20);
    try{if(typeof window.addActivity==="function")window.addActivity("Nouvelle note creee","var(--accent)","content")}catch(e){}
    renderAll();
    var title=$("#note-title-input");if(title){title.focus();title.select()}
  }
  function saveNote(){
    var s=currentState();if(!s)return;
    var isDash=$("#page-dashboard")&&$("#page-dashboard").classList.contains("active");
    var quick=$("#quick-note"),main=$("#main-note");
    if(isDash&&quick){
      s.note=quick.value;
      if(main)main.value=quick.value;
      clearTimeout(noteTO);noteTO=setTimeout(function(){try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}},600);
      return;
    }
    var note=activeNote();if(!note||!main)return;
    var title=$("#note-title-input"),tags=$("#note-tags-input"),status=$("#note-saved-status");
    note.title=(title&&title.value.trim())||"Sans titre";
    note.content=main.value||"";
    note.tags=parseTags(tags?tags.value:"",note.content);
    note.updated=nowISO();
    if(status)status.textContent="Enregistrement...";
    clearTimeout(_noteSaveTO);
    _noteSaveTO=setTimeout(function(){
      try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){}
      if(status){status.textContent="Enregistree";setTimeout(function(){if(status)status.textContent="Auto-save"},1200)}
      renderNotesList();renderTagRail();renderInspector();
    },550);
    renderPreview(note.content);
    updateStats(note);
  }
  function saveNoteNow(){saveNote();clearTimeout(_noteSaveTO);try{if(typeof window.saveStateNow==="function")window.saveStateNow()}catch(e){};toastSafe("Note sauvegardee","success")}
  function updateNoteTitle(value){var note=activeNote();if(!note)return;note.title=value||"Sans titre";note.updated=nowISO();saveSoon();renderNotesList();renderInspector()}
  function updateNoteColor(color){var note=activeNote();if(!note)return;note.color=color||"#8b5cf6";note.updated=nowISO();saveSoon();renderNotesList()}
  function pinNote(){var note=activeNote();if(!note)return;note.pinned=!note.pinned;note.updated=nowISO();saveSoon(20);renderAll();toastSafe(note.pinned?"Note epinglee":"Note retiree des favoris","info")}
  function deleteCurrentNote(){
    var note=activeNote();if(!note)return;
    if(!notesTwoStep("delete-note-"+note.id,"Clique encore pour supprimer cette note."))return;
    var s=currentState();if(!s)return;
    s.notes=getNotesArray().filter(function(n){return String(n.id)!==String(note.id)}).map(function(n){
      n.relations=(n.relations||[]).filter(function(id){return String(id)!==String(note.id)});
      return n;
    });
    _currentNoteId=s.notes[0]&&s.notes[0].id||null;
    saveSoon(20);renderAll();toastSafe("Note supprimee","info");
  }
  function clearNote(){
    var note=activeNote();if(!note)return;
    if(!notesTwoStep("clear-note-"+note.id,"Clique encore pour vider cette note."))return;
    var main=$("#main-note");if(main){main.value="";saveNote()}
  }
  function copyNote(){
    var text=$("#main-note")?$("#main-note").value:"";
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){toastSafe("Note copiee","success")}).catch(function(){});
  }
  function filterNotes(query){_noteSearch=query||"";renderNotesList()}
  function showNoteEditor(show){
    var panel=$("#note-editor-panel"),empty=$("#note-empty-state");
    if(panel)panel.style.display=show?"":"none";
    if(empty)empty.style.display=show?"none":"block";
  }
  function updateNoteStats(){updateStats(activeNote())}
  function renderNoteContext(){renderInspector()}
  function toggleNotePreview(){
    _noteMode=_noteMode==="split"?"preview":_noteMode==="preview"?"edit":"split";
    var frame=$("#note-editor-frame");if(frame)frame.dataset.mode=_noteMode;
  }
  function renderNotePreview(){renderPreview($("#main-note")?$("#main-note").value:"")}

  function noteFormat(before,after){
    var ta=$("#main-note");if(!ta)return;
    var s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e)||"text";
    ta.value=ta.value.slice(0,s)+before+sel+after+ta.value.slice(e);
    ta.selectionStart=s+before.length;ta.selectionEnd=s+before.length+sel.length;
    ta.focus();saveNote();
  }
  function noteInsert(text){
    var ta=$("#main-note");if(!ta)return;
    var s=ta.selectionStart,e=ta.selectionEnd;
    ta.value=ta.value.slice(0,s)+text+ta.value.slice(e);
    ta.selectionStart=ta.selectionEnd=s+text.length;
    ta.focus();saveNote();
  }
  function runFormat(type){
    if(type==="h1")noteInsert("# ");
    else if(type==="h2")noteInsert("## ");
    else if(type==="bold")noteFormat("**","**");
    else if(type==="italic")noteFormat("*","*");
    else if(type==="code")noteFormat("`","`");
  }
  function runInsert(type){
    if(type==="codeblock")noteInsert("\n```js\nconsole.log('ETHONE');\n```\n");
    if(type==="table")noteInsert("\n| Colonne | Valeur |\n| --- | --- |\n| Exemple | 100% |\n");
    if(type==="image"){var url=prompt("URL de l'image");if(url)noteInsert("\n![Image]("+url+")\n")}
    if(type==="mermaid")noteInsert("\n```mermaid\ngraph TD\n  A[Idea] --> B[Action]\n```\n");
    if(type==="math")noteInsert("\n$$\nE = mc^2\n$$\n");
    if(type==="link"){var n=getNotesArray().find(function(x){return String(x.id)!==String(_currentNoteId)});noteInsert("[["+(n?n.title:"Titre de note")+"]]" )}
  }
  function runNoteAction(action){
    if(action==="new")newNote();
    if(action==="pin")pinNote();
    if(action==="delete")deleteCurrentNote();
    if(action==="copy")copyNote();
    if(action==="toggle-preview")toggleNotePreview();
    if(action==="ai-summary")noteAISummary();
    if(action==="ai-improve")noteAIImprove();
    if(action==="apply-improve")applyAIImprove();
    if(action==="add-relation")addRelation();
    if(action==="ask-brain")askBrainAboutNote();
  }
  function addRelation(){
    var note=activeNote(),sel=$("#note-relation-select");if(!note||!sel||!sel.value)return;
    note.relations=note.relations||[];
    if(note.relations.map(String).indexOf(String(sel.value))===-1)note.relations.push(sel.value);
    note.updated=nowISO();saveSoon(20);renderInspector();renderNotesList();
  }
  function removeRelation(id){
    var note=activeNote();if(!note)return;
    note.relations=(note.relations||[]).filter(function(x){return String(x)!==String(id)});
    note.updated=nowISO();saveSoon(20);renderInspector();
  }
  function openWikiLink(label){
    var q=String(label||"").toLowerCase();
    var found=getNotesArray().find(function(n){return String(n.id)===label||String(n.title||"").toLowerCase()===q});
    if(found)selectNote(found.id);
    else{newNote();var note=activeNote();if(note){note.title=label;note.content="# "+label+"\n\n";saveNoteNow();renderAll()}}
  }
  function noteAISummary(){
    var note=activeNote();if(!note)return;
    var text=note.content||"",lines=text.split(/\n+/).map(function(l){return l.trim()}).filter(Boolean);
    var headings=lines.filter(function(l){return /^#{1,3}\s+/.test(l)}).map(function(l){return l.replace(/^#+\s+/,"")}).slice(0,3);
    var tasks=lines.filter(function(l){return /^- \[[ xX]\]/.test(l)||/^[-*]\s+/.test(l)}).slice(0,4).map(function(l){return l.replace(/^[-*]\s+|^- \[[ xX]\]\s+/,"")});
    var sentences=text.replace(/[#*_`>\[\]()]/g," ").split(/[.!?]\s+/).map(function(s){return s.trim()}).filter(function(s){return s.length>25}).slice(0,2);
    var summary=[];
    summary.push("Resume: "+(sentences.join(". ")||firstLine(text)||"Note vide."));
    if(headings.length)summary.push("Axes: "+headings.join(", ")+".");
    if(tasks.length)summary.push("Actions: "+tasks.join(" / ")+".");
    note.aiSummary=summary.join("\n");
    note.updated=nowISO();saveSoon(20);renderInspector();toastSafe("Resume genere","success");
  }
  function noteAIImprove(){
    var note=activeNote();if(!note)return;
    var text=(note.content||"").trim();
    if(!text){toastSafe("La note est vide","info");return}
    var lines=text.split(/\n+/).map(function(l){return l.trim()}).filter(Boolean);
    var title=note.title&&note.title!=="Sans titre"?note.title:(lines[0]||"Note amelioree").replace(/^#+\s+/,"");
    var body=lines.filter(function(l){return !/^#{1,3}\s+/.test(l)}).join("\n");
    var decisions=lines.filter(function(l){return /decide|decision|choix|todo|faire|next|prochaine|action/i.test(l)}).slice(0,5);
    note.aiImprovedDraft="# "+title+"\n\n## Resume\n"+(body.slice(0,420)||text.slice(0,420))+"\n\n## Points cles\n"+lines.slice(0,5).map(function(l){return "- "+l.replace(/^[-*]\s+/,"")}).join("\n")+"\n\n## Actions\n"+(decisions.length?decisions.map(function(l){return "- [ ] "+l.replace(/^[-*]\s+/,"")}).join("\n"):"- [ ] Clarifier la prochaine action\n- [ ] Relier cette note a un projet")+"\n";
    note.updated=nowISO();saveSoon(20);renderInspector();toastSafe("Proposition AI Improve generee","success");
  }
  function applyAIImprove(){
    var note=activeNote();if(!note||!note.aiImprovedDraft)return;
    var ta=$("#main-note");if(ta)ta.value=note.aiImprovedDraft;
    note.content=note.aiImprovedDraft;
    note.aiImprovedDraft="";
    note.updated=nowISO();saveSoon(20);renderEditor();renderInspector();toastSafe("Amelioration appliquee","success");
  }
  function askBrainAboutNote(){
    var note=activeNote();
    try{
      if(window.Ethone&&window.Ethone.get("actions"))window.Ethone.get("actions").dispatch("brain.open",{source:"notes",noteId:note&&note.id});
      else if(typeof window.switchPage==="function")window.switchPage("ai",null);
    }catch(e){}
  }

  function initNotes(){
    buildShell();
    var notes=getNotesArray();
    if(!_currentNoteId&&notes.length)_currentNoteId=sortNotes(notes)[0].id;
    renderAll();
  }

  window.getNotesArray=getNotesArray;
  window.filterNotes=filterNotes;
  window.renderNotesList=renderNotesList;
  window.showNoteEditor=showNoteEditor;
  window.selectNote=selectNote;
  window.newNote=newNote;
  window.saveNote=saveNote;
  window.updateNoteTitle=updateNoteTitle;
  window.updateNoteColor=updateNoteColor;
  window.pinNote=pinNote;
  window.deleteCurrentNote=deleteCurrentNote;
  window.copyNote=copyNote;
  window.updateNoteStats=updateNoteStats;
  window.renderNoteContext=renderNoteContext;
  window.toggleNotePreview=toggleNotePreview;
  window.renderNotePreview=renderNotePreview;
  window.noteFormat=noteFormat;
  window.noteInsert=noteInsert;
  window.clearNote=clearNote;
  window.initNotes=initNotes;
  window.noteAISummary=noteAISummary;
  window.noteAIImprove=noteAIImprove;

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){if($("#page-notes")&&$("#page-notes").classList.contains("active"))initNotes()},{once:true});
  else if($("#page-notes")&&$("#page-notes").classList.contains("active"))initNotes();
})();
