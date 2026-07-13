import { actionButton, element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { filterNotes, sortNotes, wordCount } from "./notes-model.mjs";
import { localeTag } from "../i18n/catalog.mjs";

function formatUpdated(value) {
  if (!value) return "Note locale";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Note locale";
  return new Intl.DateTimeFormat(localeTag(), { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function completed(message, data = null) {
  return { ok: true, status: "completed", message, data };
}

export function mountNotes(stage, options = {}) {
  const repository = options.repository;
  const actions = options.actions;
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  let notes = repository.snapshot().notes.map((note) => ({ ...note, tags: [...note.tags] }));
  let selectedId = sortNotes(notes)[0]?.id || null;
  let query = "";
  let saveTimer = null;
  let dirty = false;
  let confirmDelete = false;
  const scopedActions = [];

  const countBadge = element("span", { className: "v8-badge", text: `${notes.length} note${notes.length > 1 ? "s" : ""}` });
  const list = element("div", { className: "v8-notes-list", attributes: { role: "list", "aria-label": "Notes" } });
  const search = element("input", {
    className: "v8-input",
    attributes: { type: "search", placeholder: "Rechercher dans les notes", "aria-label": "Rechercher dans les notes", autocomplete: "off" }
  });
  const editor = element("section", { className: "v8-note-editor", attributes: { "aria-label": "Éditeur de note" } });
  const page = element("section", { className: "v8-page v8-work-page", dataset: { page: "notes" } }, [
    element("header", { className: "v8-page-heading v8-work-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Espace d'écriture" }),
        element("div", { className: "v8-title-line" }, [element("h1", { text: "Notes" }), countBadge]),
        element("p", { text: "Capturez, retrouvez et reprenez une idée sans quitter votre contexte." })
      ]),
      element("div", { className: "v8-page-heading__actions" }, [
        actionButton({ actionId: "v8.notes.new", variant: "primary" }, [icon("plus"), element("span", { text: "Nouvelle note" })])
      ])
    ]),
    element("div", { className: "v8-work-surface v8-notes-workspace" }, [
      element("aside", { className: "v8-notes-index" }, [
        element("div", { className: "v8-notes-search v8-input-wrap" }, [icon("search"), search]),
        list
      ]),
      editor
    ])
  ]);

  function selectedNote() {
    return notes.find((note) => String(note.id) === String(selectedId)) || null;
  }

  function setSaveStatus(status, text) {
    const node = editor.querySelector("[data-note-save-status]");
    if (!node) return;
    node.dataset.status = status;
    node.textContent = text;
  }

  function clearSaveTimer() {
    if (saveTimer) globalThis.clearTimeout(saveTimer);
    saveTimer = null;
  }

  function updateLocalNote(patch) {
    notes = notes.map((note) => String(note.id) === String(selectedId) ? { ...note, ...patch } : note);
  }

  function updateVisibleListTitle() {
    const note = selectedNote();
    if (!note) return;
    [...list.querySelectorAll("[data-note-id]")].forEach((control) => {
      if (control.dataset.noteId !== String(note.id)) return;
      const title = control.querySelector("strong");
      if (title) title.textContent = note.title || "Note sans titre";
    });
  }

  function flushSave(showFeedback = false) {
    clearSaveTimer();
    if (!dirty || !selectedId) return completed("Aucune modification");
    const note = selectedNote();
    if (!note) return completed("Aucune note sélectionnée");
    const saved = repository.notes.update(note.id, { title: note.title, content: note.content });
    if (!saved.ok) {
      setSaveStatus("error", "Échec de sauvegarde");
      notify({ id: "notes-save-error", title: "Notes", message: saved.message, type: "error" });
      return saved;
    }
    dirty = false;
    updateLocalNote({ updatedAt: saved.data.updatedAt });
    setSaveStatus("saved", "Enregistré localement");
    if (showFeedback) notify({ id: "notes-saved", title: "Notes", message: "Note enregistrée localement.", type: "success", duration: 2400 });
    return saved;
  }

  function scheduleSave() {
    dirty = true;
    setSaveStatus("pending", "Modifications en cours");
    clearSaveTimer();
    saveTimer = globalThis.setTimeout(() => flushSave(false), 450);
  }

  function renderList() {
    const filtered = filterNotes(notes, query);
    list.replaceChildren();
    countBadge.textContent = `${notes.length} note${notes.length > 1 ? "s" : ""}`;
    if (!filtered.length) {
      const clearSearch = query ? element("button", {
        className: "v8-button v8-button--primary",
        text: "Effacer la recherche",
        attributes: { type: "button" },
        events: {
          click: () => {
            query = "";
            search.value = "";
            renderList();
            search.focus({ preventScroll: true });
          }
        }
      }) : null;
      list.append(emptyState({
        iconName: query ? "search-x" : "notebook-tabs",
        eyebrow: query ? "Recherche terminée" : "Espace d'écriture",
        title: query ? "Aucun résultat" : "Aucune note pour le moment",
        description: query ? "Aucune note ne correspond à cette recherche." : "Créez votre première note et reprenez-la instantanément depuis ETHONE.",
        actions: query
          ? [clearSearch]
          : [actionButton({ actionId: "v8.notes.new", variant: "primary" }, [icon("plus"), element("span", { text: "Créer une note" })])],
        compact: true
      }));
      refreshIcons();
      return;
    }
    filtered.forEach((note) => {
      const active = String(note.id) === String(selectedId);
      const snippet = String(note.content || "").replace(/\s+/g, " ").trim() || "Aucun contenu";
      list.append(element("button", {
        className: `v8-note-row${active ? " is-active" : ""}`,
        attributes: { type: "button", role: "listitem", "aria-current": active ? "true" : null },
        dataset: { noteId: note.id }
      }, [
        element("span", { className: "v8-note-row__marker" }, [icon(note.pinned ? "pin" : "file-text")]),
        element("span", { className: "v8-note-row__copy" }, [
          element("strong", { text: note.title || "Note sans titre", attributes: note.title ? { translate: "no" } : {} }),
          element("small", { text: snippet.slice(0, 74), attributes: note.content ? { translate: "no" } : {} }),
          element("time", { text: formatUpdated(note.updatedAt), attributes: { translate: "no" } })
        ])
      ]));
    });
    refreshIcons();
  }

  function renderEditor() {
    editor.replaceChildren();
    confirmDelete = false;
    const note = selectedNote();
    if (!note) {
      editor.append(emptyState({
        iconName: "notebook-pen",
        eyebrow: "Document prêt",
        title: "Commencez par une note",
        description: "Un espace calme s'ouvrira ici pour écrire et retrouver vos idées.",
        actions: [actionButton({ actionId: "v8.notes.new", variant: "primary" }, [icon("plus"), element("span", { text: "Nouvelle note" })])],
        brain: {
          title: "Suggestion Brain",
          description: "Décrivez votre idée à Brain pour obtenir un premier plan de note.",
          action: actionButton({ actionId: "v8.brain.open", variant: "secondary" }, [icon("brain"), element("span", { text: "Ouvrir Brain" })])
        },
        compact: true,
        className: "v8-empty-state--fill"
      }));
      refreshIcons();
      return;
    }

    const titleInput = element("input", {
      className: "v8-note-title",
      attributes: { type: "text", value: note.title, placeholder: "Titre de la note", "aria-label": "Titre de la note", maxlength: "160" }
    });
    titleInput.value = note.title;
    const contentInput = element("textarea", {
      className: "v8-note-content",
      attributes: { placeholder: "Écrivez quelque chose…", "aria-label": "Contenu de la note", spellcheck: "true" }
    });
    contentInput.value = note.content;
    const words = element("span", { text: `${wordCount(note.content)} mot${wordCount(note.content) > 1 ? "s" : ""}` });
    const confirm = element("div", { className: "v8-inline-confirm", attributes: { hidden: "", role: "alert" } }, [
      element("span", {}, [icon("triangle-alert"), element("strong", { text: "Supprimer cette note ?" })]),
      element("div", {}, [
        actionButton({ actionId: "v8.notes.delete.cancel" }, [element("span", { text: "Annuler" })]),
        actionButton({ actionId: "v8.notes.delete.confirm", variant: "danger" }, [icon("trash-2"), element("span", { text: "Supprimer" })])
      ])
    ]);
    editor.append(
      element("header", { className: "v8-note-toolbar" }, [
        element("span", { className: "v8-save-status", text: "Enregistré localement", dataset: { noteSaveStatus: "", status: "saved" } }),
        element("div", {}, [
          actionButton({ actionId: "v8.notes.save", variant: "secondary" }, [icon("save"), element("span", { text: "Enregistrer" })]),
          actionButton({ actionId: "v8.notes.delete", className: "v8-icon-button", ariaLabel: "Supprimer la note" }, [icon("trash-2")])
        ])
      ]),
      element("div", { className: "v8-note-document" }, [titleInput, contentInput]),
      confirm,
      element("footer", { className: "v8-note-footer" }, [
        words,
        element("span", { text: "Markdown · sauvegarde locale" }),
        element("kbd", { text: "Ctrl S" })
      ])
    );

    titleInput.addEventListener("input", () => {
      updateLocalNote({ title: titleInput.value || "Note sans titre" });
      updateVisibleListTitle();
      scheduleSave();
    });
    contentInput.addEventListener("input", () => {
      updateLocalNote({ content: contentInput.value });
      const count = wordCount(contentInput.value);
      words.textContent = `${count} mot${count > 1 ? "s" : ""}`;
      scheduleSave();
    });
    refreshIcons();
  }

  function createNote() {
    flushSave(false);
    const created = repository.notes.create({ title: "Note sans titre", content: "" });
    if (!created.ok) {
      notify({ id: "notes-create-error", title: "Notes", message: created.message, type: "error" });
      return created;
    }
    notes = repository.snapshot().notes.map((note) => ({ ...note, tags: [...note.tags] }));
    selectedId = created.data.id;
    query = "";
    search.value = "";
    renderList();
    renderEditor();
    editor.querySelector(".v8-note-title")?.focus({ preventScroll: true });
    notify({ id: "notes-created", title: "Notes", message: "Nouvelle note créée.", type: "success", duration: 2200 });
    return created;
  }

  function showDeleteConfirmation() {
    const confirm = editor.querySelector(".v8-inline-confirm");
    if (!confirm) return completed("Aucune note sélectionnée");
    confirmDelete = true;
    confirm.hidden = false;
    confirm.querySelector("button")?.focus({ preventScroll: true });
    return completed("Confirmation affichée");
  }

  function cancelDelete() {
    const confirm = editor.querySelector(".v8-inline-confirm");
    confirmDelete = false;
    if (confirm) confirm.hidden = true;
    editor.querySelector("[data-action='v8.notes.delete']")?.focus({ preventScroll: true });
    return completed("Suppression annulée");
  }

  function confirmDeleteNote() {
    if (!confirmDelete || !selectedId) return completed("Suppression non confirmée");
    clearSaveTimer();
    dirty = false;
    const removed = repository.notes.remove(selectedId);
    if (!removed.ok) return removed;
    notes = repository.snapshot().notes.map((note) => ({ ...note, tags: [...note.tags] }));
    selectedId = sortNotes(notes)[0]?.id || null;
    renderList();
    renderEditor();
    notify({ id: "notes-deleted", title: "Notes", message: "Note supprimée.", type: "info", duration: 2400 });
    return removed;
  }

  scopedActions.push(actions.scope("v8.notes.new", createNote));
  scopedActions.push(actions.scope("v8.notes.save", () => flushSave(true)));
  scopedActions.push(actions.scope("v8.notes.delete", showDeleteConfirmation));
  scopedActions.push(actions.scope("v8.notes.delete.cancel", cancelDelete));
  scopedActions.push(actions.scope("v8.notes.delete.confirm", confirmDeleteNote));

  function handlePageClick(event) {
    const row = event.target.closest("[data-note-id]");
    if (!row || !page.contains(row)) return;
    flushSave(false);
    selectedId = row.dataset.noteId;
    renderList();
    renderEditor();
  }

  function handleSearch() {
    query = search.value;
    renderList();
  }

  function handleKeyboard(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      flushSave(true);
    }
  }

  page.addEventListener("click", handlePageClick);
  page.addEventListener("keydown", handleKeyboard);
  search.addEventListener("input", handleSearch);
  stage.replaceChildren(page);
  renderList();
  renderEditor();
  refreshIcons();

  return () => {
    flushSave(false);
    clearSaveTimer();
    scopedActions.reverse().forEach((restore) => restore());
    page.removeEventListener("click", handlePageClick);
    page.removeEventListener("keydown", handleKeyboard);
    search.removeEventListener("input", handleSearch);
    page.remove();
  };
}
