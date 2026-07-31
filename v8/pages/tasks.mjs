import { actionButton, debounce, element, icon } from "../ui/dom.mjs";
import {
  bulkActionBar,
  collectionDensityControl,
  createRowMenuController,
  createSelectionState,
  selectionControl,
  updateCollectionDensityControl
} from "../ui/dense-content.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { formField, runFormSubmission, validateControl } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { filterTasks, groupTasks, sortTasks, taskStats, TASK_GROUPS } from "./tasks-model.mjs";
import { createSelect } from "../ui/select.mjs";
import { localeTag } from "../i18n/catalog.mjs";

function completed(message, data = null) {
  return { ok: true, status: "completed", message, data };
}

function formatDue(value) {
  if (!value) return "Sans échéance";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeTag(), { day: "2-digit", month: "short" }).format(date);
}

export function mountTasks(stage, options = {}) {
  const repository = options.repository;
  const actions = options.actions;
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const presence = options.presence || null;
  let tasks = repository.snapshot().tasks.map((task) => ({ ...task }));
  let status = "all";
  let query = "";
  let order = "priority";
  let composerOpen = false;
  let bulkDeleteArmed = false;
  let mounted = true;
  const scopedActions = [];
  const selection = createSelectionState();
  const rowMenu = createRowMenuController();

  const statsBadge = element("span", { className: "v8-badge", dataset: { liveWidget: "metric", liveKind: "metric" } });
  const search = element("input", {
    className: "v8-input",
    attributes: { type: "search", placeholder: "Rechercher une tâche", "aria-label": "Rechercher une tâche", autocomplete: "off" }
  });
  const filters = element("div", { className: "v8-segmented", attributes: { role: "group", "aria-label": "Filtrer les tâches" } }, [
    element("button", { className: "is-active", text: "Toutes", attributes: { type: "button", "aria-pressed": "true" }, dataset: { taskStatus: "all" } }),
    element("button", { text: "À faire", attributes: { type: "button", "aria-pressed": "false" }, dataset: { taskStatus: "open" } }),
    element("button", { text: "Terminées", attributes: { type: "button", "aria-pressed": "false" }, dataset: { taskStatus: "completed" } })
  ]);
  const sortSelect = createSelect({ className: "v8-input v8-collection-sort", attributes: { "aria-label": "Trier les tâches" } }, [
    element("option", { text: "Priorité", attributes: { value: "priority" } }),
    element("option", { text: "Échéance", attributes: { value: "due" } }),
    element("option", { text: "Récentes", attributes: { value: "recent" } }),
    element("option", { text: "Nom", attributes: { value: "title" } })
  ]);
  const densityControl = collectionDensityControl(options.state?.density || document.documentElement.dataset.density || "automatic");
  const bulkHost = element("div", { className: "v8-bulk-host" });
  const list = element("div", { className: "v8-task-list", attributes: { role: "list", "aria-label": "Tâches" } });
  const composer = element("form", { className: "v8-task-composer", attributes: { hidden: "", "aria-label": "Nouvelle tâche" } });
  const page = element("section", { className: "v8-page v8-work-page", dataset: { page: "tasks" } }, [
    element("header", { className: "v8-page-heading v8-work-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Priorités" }),
        element("div", { className: "v8-title-line" }, [element("h1", { text: "Tâches" }), statsBadge]),
        element("p", { text: "Une seule liste, assez claire pour décider quoi faire ensuite." })
      ]),
      element("div", { className: "v8-page-heading__actions" }, [
        actionButton({ actionId: "v8.tasks.new", variant: "primary" }, [icon("plus"), element("span", { text: "Nouvelle tâche" })])
      ])
    ]),
    element("section", { className: "v8-work-surface v8-tasks-workspace" }, [
      element("header", { className: "v8-work-toolbar" }, [
        element("div", { className: "v8-input-wrap v8-work-search" }, [icon("search"), search]),
        filters,
        element("div", { className: "v8-collection-tools" }, [sortSelect, densityControl])
      ]),
      bulkHost,
      composer,
      element("div", { className: "v8-task-stream" }, [list])
    ])
  ]);

  function refreshTasks() {
    tasks = repository.snapshot().tasks.map((task) => ({ ...task }));
    selection.prune(tasks.map((task) => task.id));
  }

  function visibleTasks() {
    return sortTasks(filterTasks(tasks, { query, status }), order);
  }

  function taskRow(id) {
    return [...list.querySelectorAll("[data-task-id]")]
      .find((row) => row.dataset.taskId === String(id)) || null;
  }

  function updateStats() {
    const stats = taskStats(tasks);
    const nextValue = `${stats.open} à faire`;
    if (presence) presence.transitionText(statsBadge, nextValue, { kind: "metric" });
    else statsBadge.textContent = nextValue;
  }

  function renderBulk(filtered = visibleTasks()) {
    const selectedCount = selection.size();
    bulkHost.replaceChildren(bulkActionBar({
      count: selectedCount,
      selection,
      visibleIds: filtered.map((task) => task.id),
      onToggleAll: (checked) => {
        filtered.forEach((task) => selection.toggle(task.id, checked));
        bulkDeleteArmed = false;
        renderList();
      },
      onClear: () => {
        selection.clear();
        bulkDeleteArmed = false;
        renderList();
      },
      actions: [
        { label: "Terminer", icon: "check-check", onSelect: () => updateSelectedTasks(true) },
        { label: "Rouvrir", icon: "rotate-ccw", onSelect: () => updateSelectedTasks(false) },
        { label: bulkDeleteArmed ? "Confirmer" : "Supprimer", icon: "trash-2", tone: "danger", onSelect: removeSelectedTasks }
      ]
    }));
    refreshIcons();
  }

  function renderComposer() {
    composer.replaceChildren();
    composer.hidden = !composerOpen;
    if (!composerOpen) return;
    const title = element("input", { className: "v8-input", attributes: { type: "text", placeholder: "Que faut-il accomplir ?", "aria-label": "Titre de la tâche", required: "", maxlength: "240", autocomplete: "off" } });
    const priority = createSelect({ className: "v8-input", attributes: { "aria-label": "Priorité" } }, [
      element("option", { text: "Priorité normale", attributes: { value: "normal" } }),
      element("option", { text: "Priorité haute", attributes: { value: "high" } }),
      element("option", { text: "Priorité basse", attributes: { value: "low" } })
    ]);
    const due = element("input", { className: "v8-input", attributes: { type: "date", "aria-label": "Échéance" } });
    const tag = element("input", { className: "v8-input", attributes: { type: "text", placeholder: "Tag", "aria-label": "Tag", maxlength: "48", autocomplete: "off" } });
    composer.append(
      element("div", { className: "v8-task-composer__fields" }, [
        formField({ label: "Tâche", control: title, required: true }),
        formField({ label: "Priorité", control: priority }),
        formField({ label: "Échéance", control: due }),
        formField({ label: "Tag", control: tag })
      ]),
      element("div", { className: "v8-task-composer__actions" }, [
        actionButton({ actionId: "v8.tasks.new.cancel" }, [element("span", { text: "Annuler" })]),
        element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [icon("plus"), element("span", { text: "Ajouter" })])
      ])
    );
    title.focus({ preventScroll: true });
  }

  function renderList() {
    const filtered = visibleTasks();
    list.replaceChildren();
    updateStats();
    renderBulk(filtered);
    if (!filtered.length) {
      const filteredView = Boolean(query || status !== "all");
      const reset = filteredView ? element("button", {
        className: "v8-button v8-button--primary",
        text: "Voir toutes les tâches",
        attributes: { type: "button" },
        events: {
          click: () => {
            query = "";
            status = "all";
            search.value = "";
            filters.querySelectorAll("[data-task-status]").forEach((button) => {
              const active = button.dataset.taskStatus === "all";
              button.classList.toggle("is-active", active);
              button.setAttribute("aria-pressed", active ? "true" : "false");
            });
            renderList();
            search.focus({ preventScroll: true });
          }
        }
      }) : null;
      list.append(emptyState({
        kind: filteredView ? "no-results" : "empty",
        iconName: status === "completed" ? "list-checks" : query ? "search-x" : "circle-check-big",
        eyebrow: filteredView ? "Vue filtrée" : "Priorités maîtrisées",
        title: query ? "Aucun résultat" : status === "completed" ? "Rien de terminé ici" : "Tout est clair",
        description: filteredView ? "Aucune tâche ne correspond à cette vue." : "Ajoutez une tâche lorsqu'un sujet mérite votre attention.",
        actions: filteredView
          ? [reset]
          : [actionButton({ actionId: "v8.tasks.new", variant: "primary" }, [icon("plus"), element("span", { text: "Ajouter une tâche" })])],
        brain: filteredView ? null : {
          title: "Suggestion Brain",
          description: "Brain peut transformer une intention en prochaine action concrète.",
          action: actionButton({ actionId: "v8.brain.open", variant: "secondary" }, [icon("brain"), element("span", { text: "Ouvrir Brain" })])
        },
        className: "v8-empty-state--wide"
      }));
      refreshIcons();
      return;
    }

    const grouped = groupTasks(filtered);
    TASK_GROUPS.forEach(({ id, label }) => {
      const bucket = grouped[id];
      if (!bucket.length) return;
      list.append(element("div", { className: "v8-task-group-header" }, [
        element("span", { text: label }),
        element("span", { text: String(bucket.length) })
      ]));
      bucket.forEach((task) => list.append(taskRowNode(task)));
    });
    refreshIcons();
  }

  function taskRowNode(task) {
    const overdue = Boolean(task.due && !task.done && task.due < new Date().toISOString().slice(0, 10));
    const selected = selection.has(task.id);
    const select = selectionControl({ id: task.id, checked: selected, label: `Sélectionner ${task.title}` });
    const toggle = element("button", {
      className: `v8-task-check${task.done ? " is-complete" : ""}`,
      attributes: { type: "button", "aria-label": task.done ? `Rouvrir ${task.title}` : `Terminer ${task.title}`, "aria-pressed": task.done ? "true" : "false" },
      dataset: { taskToggle: task.id }
    }, [icon(task.done ? "check" : "circle")]);
    const remove = element("button", {
      className: "v8-icon-button v8-task-delete",
      attributes: { type: "button", "aria-label": `Supprimer ${task.title}` },
      dataset: { taskDelete: task.id }
    }, [icon("trash-2")]);
    const menu = element("button", {
      className: "v8-icon-button v8-task-menu",
      attributes: { type: "button", "aria-label": `Actions pour ${task.title}`, "aria-haspopup": "menu", "aria-expanded": "false" },
      dataset: { taskMenu: task.id }
    }, [icon("more-horizontal")]);
    const meta = [];
    if (task.priority === "high") meta.push(element("span", { className: "v8-task-priority v8-task-priority--high" }, [icon("flame"), "Haute"]));
    if (task.tag) meta.push(element("span", { className: "v8-task-tag", text: task.tag, attributes: { translate: "no" } }));
    meta.push(element("span", { className: overdue ? "is-overdue" : "" }, [icon(overdue ? "triangle-alert" : "calendar-days"), formatDue(task.due)]));
    return element("article", {
      className: `v8-task-row${task.done ? " is-complete" : ""}${selected ? " is-selected" : ""}`,
      attributes: { role: "listitem", tabindex: "0", "aria-selected": selected ? "true" : "false" },
      dataset: { taskId: task.id, liveWidget: "planning", liveKind: "planning" }
    }, [
      select,
      toggle,
      element("div", { className: "v8-task-row__copy" }, [element("strong", { text: task.title, attributes: { translate: "no" } }), element("div", { className: "v8-task-meta" }, meta)]),
      element("div", { className: "v8-row-actions" }, [menu, remove])
    ]);
  }

  function openComposer() {
    composerOpen = true;
    renderComposer();
    refreshIcons();
    return completed("Formulaire ouvert");
  }

  function closeComposer() {
    composerOpen = false;
    renderComposer();
    page.querySelector("[data-action='v8.tasks.new']")?.focus({ preventScroll: true });
    return completed("Formulaire fermé");
  }

  function createTask() {
    const title = composer.querySelector("[aria-label='Titre de la tâche']");
    if (!title || !title.value.trim() || !validateControl(title, { force: true, focus: true })) {
      notify({ id: "task-title-required", title: "Tâches", message: "Ajoutez un titre avant de continuer.", type: "warning" });
      return { ok: false, status: "failed", message: "Titre requis" };
    }
    const created = repository.tasks.create({
      title: title.value,
      priority: composer.querySelector("[aria-label='Priorité']")?.value,
      due: composer.querySelector("[aria-label='Échéance']")?.value,
      tag: composer.querySelector("[aria-label='Tag']")?.value
    });
    if (!created.ok) return created;
    refreshTasks();
    composerOpen = false;
    renderComposer();
    renderList();
    presence?.signalActivity?.(taskRow(created.data.id), "task", { phase: "enter" });
    notify({ id: "task-created", title: "Tâches", message: "Tâche ajoutée.", type: "success", duration: 2200 });
    return created;
  }

  function toggleSelection(id, restore = "control") {
    selection.toggle(id);
    bulkDeleteArmed = false;
    renderList();
    const row = taskRow(id);
    (restore === "row" ? row : row?.querySelector("[data-collection-select]"))?.focus?.({ preventScroll: true });
  }

  function toggleTask(id) {
    const changed = repository.tasks.toggle(id);
    if (!changed.ok) return changed;
    refreshTasks();
    renderList();
    presence?.signalActivity?.(taskRow(changed.data.id), "task", { phase: "update" });
    return changed;
  }

  function updateSelectedTasks(done) {
    const ids = selection.values();
    if (!ids.length) return completed("Aucune tâche sélectionnée");
    const changed = repository.tasks.setDone(ids, done);
    if (!changed.ok) return changed;
    selection.clear();
    bulkDeleteArmed = false;
    refreshTasks();
    renderList();
    notify({
      id: done ? "tasks-bulk-completed" : "tasks-bulk-reopened",
      title: "Tâches",
      message: `${ids.length} tâche${ids.length > 1 ? "s" : ""} ${done ? "terminée" : "rouverte"}${ids.length > 1 ? "s" : ""}.`,
      type: "success",
      duration: 2400
    });
    return changed;
  }

  function removeSelectedTasks() {
    const ids = selection.values();
    if (!ids.length) return completed("Aucune tâche sélectionnée");
    if (!bulkDeleteArmed) {
      bulkDeleteArmed = true;
      renderBulk();
      return completed("Confirmation requise");
    }
    const changed = repository.tasks.removeMany(ids);
    if (!changed.ok) return changed;
    selection.clear();
    bulkDeleteArmed = false;
    refreshTasks();
    renderList();
    notify({ id: "tasks-bulk-deleted", title: "Tâches", message: `${ids.length} tâche${ids.length > 1 ? "s supprimées" : " supprimée"}.`, type: "info", duration: 2400 });
    return changed;
  }

  function removeTask(id) {
    const row = taskRow(id);
    const changed = repository.tasks.remove(id);
    if (!changed.ok) return changed;
    selection.toggle(id, false);
    refreshTasks();
    notify({ id: "task-deleted", title: "Tâches", message: "Tâche supprimée.", type: "info", duration: 2200 });
    const finish = () => { if (mounted) renderList(); };
    if (presence?.signalActivity) presence.signalActivity(row, "task", { phase: "exit", onComplete: finish });
    else finish();
    return changed;
  }

  function openTaskMenu(id, anchor, point = null) {
    const task = tasks.find((entry) => String(entry.id) === String(id));
    if (!task) return false;
    return rowMenu.open(anchor, [
      { label: task.done ? "Rouvrir la tâche" : "Terminer la tâche", icon: task.done ? "rotate-ccw" : "check", onSelect: () => toggleTask(id) },
      { label: selection.has(id) ? "Retirer de la sélection" : "Ajouter à la sélection", icon: selection.has(id) ? "square-minus" : "square-check-big", onSelect: () => toggleSelection(id, "row") },
      { separator: true },
      { label: "Supprimer", icon: "trash-2", tone: "danger", onSelect: () => removeTask(id) }
    ], { label: `Actions pour ${task.title}`, point });
  }

  scopedActions.push(actions.scope("v8.tasks.new", openComposer));
  scopedActions.push(actions.scope("v8.tasks.new.cancel", closeComposer));
  scopedActions.push(actions.scope("v8.tasks.create", createTask));

  function handleClick(event) {
    const filter = event.target.closest("[data-task-status]");
    if (filter && page.contains(filter)) {
      status = filter.dataset.taskStatus;
      [...filters.querySelectorAll("button")].forEach((button) => {
        const active = button === filter;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      renderList();
      return;
    }
    const select = event.target.closest("[data-collection-select]");
    if (select && list.contains(select)) {
      toggleSelection(select.dataset.collectionSelect);
      return;
    }
    const menu = event.target.closest("[data-task-menu]");
    if (menu && page.contains(menu)) {
      openTaskMenu(menu.dataset.taskMenu, menu);
      return;
    }
    const toggle = event.target.closest("[data-task-toggle]");
    if (toggle && page.contains(toggle)) {
      toggleTask(toggle.dataset.taskToggle);
      return;
    }
    const remove = event.target.closest("[data-task-delete]");
    if (remove && page.contains(remove)) {
      removeTask(remove.dataset.taskDelete);
      return;
    }
    const row = event.target.closest("[data-task-id]");
    if (row && list.contains(row) && !event.target.closest("button,input,select,textarea,a")) {
      toggleSelection(row.dataset.taskId, "row");
    }
  }

  function handleContextMenu(event) {
    const row = event.target.closest("[data-task-id]");
    if (!row || !list.contains(row)) return;
    event.preventDefault();
    event.stopPropagation();
    openTaskMenu(row.dataset.taskId, row, { x: event.clientX, y: event.clientY });
  }

  function handleKeyboard(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a" && list.contains(event.target)) {
      event.preventDefault();
      visibleTasks().forEach((task) => selection.toggle(task.id, true));
      bulkDeleteArmed = false;
      renderList();
      return;
    }
    const row = event.target.closest("[data-task-id]");
    if (row && event.target === row && (event.key === " " || event.key === "Enter")) {
      event.preventDefault();
      toggleSelection(row.dataset.taskId, "row");
    }
  }

  const renderSearchResults = debounce(renderList, 120);

  function handleSearch() {
    query = search.value;
    renderSearchResults();
  }

  function handleSort() {
    order = sortSelect.value;
    renderList();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    await runFormSubmission({ form, submit: form.querySelector("[type='submit']"), messages: { loading: "Ajout de la tache..." }, task: createTask });
  }

  page.addEventListener("click", handleClick);
  page.addEventListener("contextmenu", handleContextMenu);
  page.addEventListener("keydown", handleKeyboard);
  search.addEventListener("input", handleSearch);
  sortSelect.addEventListener("change", handleSort);
  composer.addEventListener("submit", handleSubmit);
  stage.replaceChildren(page);
  renderComposer();
  renderList();
  const releaseDensity = options.subscribeState?.((next) => updateCollectionDensityControl(densityControl, next)) || (() => {});
  refreshIcons();

  return () => {
    mounted = false;
    rowMenu.destroy();
    releaseDensity();
    scopedActions.reverse().forEach((restore) => restore());
    page.removeEventListener("click", handleClick);
    page.removeEventListener("contextmenu", handleContextMenu);
    page.removeEventListener("keydown", handleKeyboard);
    search.removeEventListener("input", handleSearch);
    sortSelect.removeEventListener("change", handleSort);
    composer.removeEventListener("submit", handleSubmit);
    page.remove();
  };
}
