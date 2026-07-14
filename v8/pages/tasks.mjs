import { actionButton, element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { filterTasks, taskStats } from "./tasks-model.mjs";
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
  let composerOpen = false;
  let mounted = true;
  const scopedActions = [];

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
        filters
      ]),
      composer,
      element("div", { className: "v8-task-stream" }, [list])
    ])
  ]);

  function refreshTasks() {
    tasks = repository.snapshot().tasks.map((task) => ({ ...task }));
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

  function renderComposer() {
    composer.replaceChildren();
    composer.hidden = !composerOpen;
    if (!composerOpen) return;
    const title = element("input", { className: "v8-input", attributes: { type: "text", placeholder: "Que faut-il accomplir ?", "aria-label": "Titre de la tâche", required: "", maxlength: "240", autocomplete: "off" } });
    const priority = element("select", { className: "v8-input", attributes: { "aria-label": "Priorité" } }, [
      element("option", { text: "Priorité normale", attributes: { value: "normal" } }),
      element("option", { text: "Priorité haute", attributes: { value: "high" } }),
      element("option", { text: "Priorité basse", attributes: { value: "low" } })
    ]);
    const due = element("input", { className: "v8-input", attributes: { type: "date", "aria-label": "Échéance" } });
    const tag = element("input", { className: "v8-input", attributes: { type: "text", placeholder: "Tag", "aria-label": "Tag", maxlength: "48", autocomplete: "off" } });
    composer.append(
      element("div", { className: "v8-task-composer__fields" }, [title, priority, due, tag]),
      element("div", { className: "v8-task-composer__actions" }, [
        actionButton({ actionId: "v8.tasks.new.cancel" }, [element("span", { text: "Annuler" })]),
        actionButton({ actionId: "v8.tasks.create", variant: "primary" }, [icon("plus"), element("span", { text: "Ajouter" })])
      ])
    );
    title.focus({ preventScroll: true });
  }

  function renderList() {
    const filtered = filterTasks(tasks, { query, status });
    list.replaceChildren();
    updateStats();
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

    filtered.forEach((task) => {
      const overdue = Boolean(task.due && !task.done && task.due < new Date().toISOString().slice(0, 10));
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
      const meta = [];
      if (task.priority === "high") meta.push(element("span", { className: "v8-task-priority v8-task-priority--high" }, [icon("flame"), "Haute"]));
      if (task.tag) meta.push(element("span", { className: "v8-task-tag", text: task.tag, attributes: { translate: "no" } }));
      meta.push(element("span", { className: overdue ? "is-overdue" : "" }, [icon(overdue ? "triangle-alert" : "calendar-days"), formatDue(task.due)]));
      list.append(element("article", { className: `v8-task-row${task.done ? " is-complete" : ""}`, attributes: { role: "listitem" }, dataset: { taskId: task.id, liveWidget: "planning", liveKind: "planning" } }, [
        toggle,
        element("div", { className: "v8-task-row__copy" }, [element("strong", { text: task.title, attributes: { translate: "no" } }), element("div", { className: "v8-task-meta" }, meta)]),
        remove
      ]));
    });
    refreshIcons();
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
    if (!title || !title.value.trim()) {
      title?.focus({ preventScroll: true });
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
    const toggle = event.target.closest("[data-task-toggle]");
    if (toggle && page.contains(toggle)) {
      const changed = repository.tasks.toggle(toggle.dataset.taskToggle);
      if (changed.ok) {
        refreshTasks();
        renderList();
        presence?.signalActivity?.(taskRow(changed.data.id), "task", { phase: "update" });
      }
      return;
    }
    const remove = event.target.closest("[data-task-delete]");
    if (remove && page.contains(remove)) {
      const id = remove.dataset.taskDelete;
      const row = taskRow(id);
      const changed = repository.tasks.remove(id);
      if (changed.ok) {
        refreshTasks();
        notify({ id: "task-deleted", title: "Tâches", message: "Tâche supprimée.", type: "info", duration: 2200 });
        const finish = () => { if (mounted) renderList(); };
        if (presence?.signalActivity) presence.signalActivity(row, "task", { phase: "exit", onComplete: finish });
        else finish();
      }
    }
  }

  function handleSearch() {
    query = search.value;
    renderList();
  }

  function handleSubmit(event) {
    event.preventDefault();
    createTask();
  }

  page.addEventListener("click", handleClick);
  search.addEventListener("input", handleSearch);
  composer.addEventListener("submit", handleSubmit);
  stage.replaceChildren(page);
  renderComposer();
  renderList();
  refreshIcons();

  return () => {
    mounted = false;
    scopedActions.reverse().forEach((restore) => restore());
    page.removeEventListener("click", handleClick);
    search.removeEventListener("input", handleSearch);
    composer.removeEventListener("submit", handleSubmit);
    page.remove();
  };
}
