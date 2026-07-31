import { actionButton, element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { formField, runFormSubmission, validateControl } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { buildMonth, eventsForDate, tasksForDate } from "./calendar-model.mjs";
import { localeTag } from "../i18n/catalog.mjs";
import { calendarPresenceState } from "../core/presence-engine.mjs";

function weekdayLabels() {
  const formatter = new Intl.DateTimeFormat(localeTag(), { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => {
    const label = formatter.format(new Date(2024, 0, index + 1)).replace(/\.$/u, "");
    return label.charAt(0).toLocaleUpperCase(localeTag()) + label.slice(1);
  });
}

function isoDate(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function monthTitle(year, month) {
  return new Intl.DateTimeFormat(localeTag(), { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

function dayTitle(date) {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(localeTag(), { weekday: "long", day: "numeric", month: "long" }).format(parsed);
}

function completed(message, data = null) {
  return { ok: true, status: "completed", message, data };
}

export function mountCalendar(stage, options = {}) {
  const repository = options.repository;
  const actions = options.actions;
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const presence = options.presence || null;
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();
  let selectedDate = isoDate(today);
  let events = repository.snapshot().events.map((event) => ({ ...event }));
  let tasks = repository.snapshot().tasks.map((task) => ({ ...task }));
  let composerOpen = false;
  let mounted = true;
  const scopedActions = [];

  const monthLabel = element("h2", { text: monthTitle(year, month), attributes: { translate: "no" } });
  const eventsBadge = element("span", { className: "v8-badge", text: `${events.length} événement${events.length > 1 ? "s" : ""}`, dataset: { liveWidget: "metric", liveKind: "metric" } });
  const grid = element("div", { className: "v8-calendar-grid", attributes: { role: "grid", "aria-label": "Calendrier mensuel" } });
  const agenda = element("aside", { className: "v8-calendar-agenda", attributes: { "aria-label": "Agenda du jour" } });
  const page = element("section", { className: "v8-page v8-work-page", dataset: { page: "calendar" } }, [
    element("header", { className: "v8-page-heading v8-work-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Temps" }),
        element("div", { className: "v8-title-line" }, [element("h1", { text: "Calendrier" }), eventsBadge]),
        element("p", { text: "Le mois complet, puis seulement ce qui compte pour la journée choisie." })
      ]),
      element("div", { className: "v8-page-heading__actions" }, [
        actionButton({ actionId: "v8.calendar.new", variant: "primary" }, [icon("plus"), element("span", { text: "Nouvel événement" })])
      ])
    ]),
    element("section", { className: "v8-work-surface v8-calendar-workspace" }, [
      element("div", { className: "v8-calendar-main" }, [
        element("header", { className: "v8-calendar-toolbar" }, [
          monthLabel,
          element("div", {}, [
            element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Mois précédent" }, dataset: { calendarNav: "previous" } }, [icon("chevron-left")]),
            element("button", { className: "v8-button", text: "Aujourd'hui", attributes: { type: "button" }, dataset: { calendarNav: "today" } }),
            element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Mois suivant" }, dataset: { calendarNav: "next" } }, [icon("chevron-right")])
          ])
        ]),
        element("div", { className: "v8-calendar-weekdays", attributes: { "aria-hidden": "true", translate: "no" } }, weekdayLabels().map((day) => element("span", { text: day }))),
        grid
      ]),
      agenda
    ])
  ]);

  function refreshEvents(config = {}) {
    events = repository.snapshot().events.map((event) => ({ ...event }));
    tasks = repository.snapshot().tasks.map((task) => ({ ...task }));
    const calendarState = calendarPresenceState(events);
    const repeatedApproach = presence?.state?.().calendar === "approaching" && calendarState === "approaching";
    presence?.update?.({ calendar: calendarState });
    if (config.signal === true && repeatedApproach) presence?.signalIcon?.("calendar");
    const eventCount = `${events.length} événement${events.length > 1 ? "s" : ""}`;
    if (presence) presence.transitionText(eventsBadge, eventCount, { kind: "metric" });
    else eventsBadge.textContent = eventCount;
  }

  function eventRow(id) {
    return [...agenda.querySelectorAll("[data-event-id]")]
      .find((row) => row.dataset.eventId === String(id)) || null;
  }

  function renderGrid() {
    const nextMonth = monthTitle(year, month);
    if (presence) presence.transitionText(monthLabel, nextMonth, { kind: "planning" });
    else monthLabel.textContent = nextMonth;
    grid.replaceChildren();
    buildMonth(year, month, today).forEach((cell) => {
      const cellEvents = eventsForDate(events, cell.date);
      const cellTasks = tasksForDate(tasks, cell.date);
      const selected = cell.date === selectedDate;
      const markers = [
        cellEvents.length ? element("span", { className: "v8-calendar-day__events" }, [element("i", { attributes: { "aria-hidden": "true" } }), element("small", { text: cellEvents.length })]) : null,
        cellTasks.length ? element("span", { className: "v8-calendar-day__tasks" }, [element("i", { attributes: { "aria-hidden": "true" } }), element("small", { text: cellTasks.length })]) : null
      ].filter(Boolean);
      const labelParts = [cell.date];
      if (cellEvents.length) labelParts.push(`${cellEvents.length} événement${cellEvents.length > 1 ? "s" : ""}`);
      if (cellTasks.length) labelParts.push(`${cellTasks.length} tâche${cellTasks.length > 1 ? "s" : ""} à échéance`);
      grid.append(element("button", {
        className: ["v8-calendar-day", !cell.inMonth ? "is-outside" : "", cell.today ? "is-today" : "", selected ? "is-selected" : ""].filter(Boolean).join(" "),
        attributes: {
          type: "button",
          role: "gridcell",
          "aria-label": labelParts.join(", "),
          "aria-selected": selected ? "true" : "false"
        },
        dataset: { calendarDate: cell.date }
      }, [
        element("span", { text: cell.day }),
        markers.length ? element("span", { className: "v8-calendar-day__markers" }, markers) : null
      ]));
    });
  }

  function renderAgenda() {
    agenda.replaceChildren();
    const dayEvents = eventsForDate(events, selectedDate);
    const composer = element("form", { className: "v8-calendar-composer", attributes: { hidden: "", "aria-label": "Nouvel événement" } });
    if (composerOpen) {
      const title = element("input", { className: "v8-input", attributes: { type: "text", placeholder: "Titre de l'événement", "aria-label": "Titre de l'événement", maxlength: "180", required: "", autocomplete: "off" }, dataset: { eventField: "title" } });
      const date = element("input", { className: "v8-input", attributes: { type: "date", value: selectedDate, "aria-label": "Date de l'événement", required: "" }, dataset: { eventField: "date" } });
      date.value = selectedDate;
      const time = element("input", { className: "v8-input", attributes: { type: "time", "aria-label": "Heure de l'événement" }, dataset: { eventField: "time" } });
      composer.hidden = false;
      composer.append(formField({ label: "Événement", control: title, required: true }), formField({ label: "Date", control: date, required: true }), formField({ label: "Heure", control: time }), element("div", {}, [
        actionButton({ actionId: "v8.calendar.new.cancel" }, [element("span", { text: "Annuler" })]),
        element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [icon("plus"), element("span", { text: "Ajouter" })])
      ]));
      title.focus({ preventScroll: true });
    }
    const dayTasks = tasksForDate(tasks, selectedDate);
    const list = element("div", { className: "v8-calendar-agenda__list", attributes: { role: "list" } });
    if (!dayEvents.length && !dayTasks.length) {
      list.append(emptyState({
        iconName: "calendar-check-2",
        eyebrow: "Agenda disponible",
        title: "Journée disponible",
        description: "Réservez ce temps ou profitez d'un agenda dégagé.",
        actions: [actionButton({ actionId: "v8.calendar.new", variant: "primary" }, [icon("plus"), element("span", { text: "Planifier un événement" })])],
        compact: true,
        className: "v8-empty-state--fill"
      }));
    } else {
      dayEvents.forEach((event) => {
        list.append(element("article", { className: "v8-calendar-event", attributes: { role: "listitem" }, dataset: { eventId: event.id, liveWidget: "planning", liveKind: "planning" } }, [
          element("span", { className: "v8-calendar-event__signal", attributes: { "aria-hidden": "true" } }),
          element("div", {}, [element("strong", { text: event.title, attributes: { translate: "no" } }), element("small", { text: event.time || "Toute la journée", attributes: { translate: "no" } })]),
          element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": `Supprimer ${event.title}` }, dataset: { eventDelete: event.id } }, [icon("trash-2")])
        ]));
      });
      if (dayTasks.length) {
        list.append(element("span", { className: "v8-eyebrow v8-calendar-agenda__tasks-label", text: `Tâches (${dayTasks.length})` }));
        dayTasks.forEach((task) => {
          list.append(element("article", { className: "v8-calendar-task", attributes: { role: "listitem" }, dataset: { calendarTaskId: task.id } }, [
            element("button", {
              className: "v8-task-check",
              attributes: { type: "button", "aria-label": `Terminer ${task.title}` },
              dataset: { calendarTaskToggle: task.id }
            }, [icon("circle")]),
            element("button", { className: "v8-calendar-task__link", attributes: { type: "button" }, dataset: { action: "v8.tasks.open" } }, [
              element("strong", { text: task.title, attributes: { translate: "no" } }),
              element("small", { text: task.priority === "high" ? "Priorité haute" : "À faire", attributes: { translate: "no" } })
            ])
          ]));
        });
      }
    }
    agenda.append(
      element("header", { className: "v8-calendar-agenda__header" }, [element("span", { className: "v8-eyebrow", text: "Agenda" }), element("h2", { text: dayTitle(selectedDate), attributes: { translate: "no" } }), element("span", { text: `${dayEvents.length} événement${dayEvents.length > 1 ? "s" : ""}` })]),
      composer,
      list
    );
    composer.addEventListener("submit", async (event) => {
      event.preventDefault();
      await runFormSubmission({ form: composer, submit: composer.querySelector("[type='submit']"), messages: { loading: "Ajout de l'evenement..." }, task: createEvent });
    }, { once: true });
    refreshIcons();
  }

  function openComposer() {
    composerOpen = true;
    renderAgenda();
    return completed("Formulaire ouvert");
  }

  function closeComposer() {
    composerOpen = false;
    renderAgenda();
    page.querySelector("[data-action='v8.calendar.new']")?.focus({ preventScroll: true });
    return completed("Formulaire fermé");
  }

  function createEvent() {
    const title = agenda.querySelector("[data-event-field='title']");
    const date = agenda.querySelector("[data-event-field='date']");
    const time = agenda.querySelector("[data-event-field='time']");
    if (!title?.value.trim() || !validateControl(title, { force: true, focus: true })) {
      notify({ id: "calendar-title-required", title: "Calendrier", message: "Ajoutez un titre à l'événement.", type: "warning" });
      return { ok: false, status: "failed", message: "Titre requis" };
    }
    const created = repository.events.create({ title: title.value, date: date?.value || selectedDate, time: time?.value || "" });
    if (!created.ok) return created;
    selectedDate = created.data.date;
    const parsed = new Date(`${selectedDate}T12:00:00`);
    year = parsed.getFullYear();
    month = parsed.getMonth();
    composerOpen = false;
    refreshEvents({ signal: true });
    renderGrid();
    renderAgenda();
    presence?.signalActivity?.(eventRow(created.data.id), "calendar", { phase: "enter" });
    notify({ id: "event-created", title: "Calendrier", message: "Événement ajouté.", type: "success", duration: 2200 });
    return created;
  }

  scopedActions.push(actions.scope("v8.calendar.new", openComposer));
  scopedActions.push(actions.scope("v8.calendar.new.cancel", closeComposer));
  scopedActions.push(actions.scope("v8.calendar.create", createEvent));

  function handleClick(event) {
    const day = event.target.closest("[data-calendar-date]");
    if (day && page.contains(day)) {
      selectedDate = day.dataset.calendarDate;
      renderGrid();
      renderAgenda();
      return;
    }
    const nav = event.target.closest("[data-calendar-nav]");
    if (nav && page.contains(nav)) {
      if (nav.dataset.calendarNav === "today") {
        year = today.getFullYear();
        month = today.getMonth();
        selectedDate = isoDate(today);
      } else {
        month += nav.dataset.calendarNav === "next" ? 1 : -1;
        if (month > 11) { month = 0; year += 1; }
        if (month < 0) { month = 11; year -= 1; }
        selectedDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      }
      renderGrid();
      renderAgenda();
      return;
    }
    const remove = event.target.closest("[data-event-delete]");
    if (remove && page.contains(remove)) {
      const id = remove.dataset.eventDelete;
      const row = eventRow(id);
      const deleted = repository.events.remove(id);
      if (deleted.ok) {
        refreshEvents();
        notify({ id: "event-deleted", title: "Calendrier", message: "Événement supprimé.", type: "info", duration: 2200 });
        const finish = () => {
          if (!mounted) return;
          renderGrid();
          renderAgenda();
        };
        if (presence?.signalActivity) presence.signalActivity(row, "calendar", { phase: "exit", onComplete: finish });
        else finish();
      }
      return;
    }
    const taskToggle = event.target.closest("[data-calendar-task-toggle]");
    if (taskToggle && page.contains(taskToggle)) {
      const changed = repository.tasks.toggle(taskToggle.dataset.calendarTaskToggle);
      if (changed.ok) {
        refreshEvents();
        renderGrid();
        renderAgenda();
        notify({ id: "calendar-task-done", title: "Calendrier", message: "Tâche terminée.", type: "success", duration: 2000 });
      }
    }
  }

  page.addEventListener("click", handleClick);
  stage.replaceChildren(page);
  renderGrid();
  renderAgenda();
  refreshIcons();

  return () => {
    mounted = false;
    scopedActions.reverse().forEach((restore) => restore());
    page.removeEventListener("click", handleClick);
    page.remove();
  };
}
