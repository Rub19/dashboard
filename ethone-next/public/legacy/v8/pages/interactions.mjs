import { actionButton, element, icon } from "../ui/dom.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { createInteractionsHeatmap } from "../services/interactions-heatmap.mjs";
import { statusState } from "../ui/empty-state.mjs";
import { translateSource } from "../i18n/catalog.mjs";

const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const INTENSITY_COLORS = [
  "var(--v8-heatmap-0)",
  "var(--v8-heatmap-1)",
  "var(--v8-heatmap-2)",
  "var(--v8-heatmap-3)",
  "var(--v8-heatmap-4)"
];

function heatmapDot(day, value) {
  const color = INTENSITY_COLORS[value] || INTENSITY_COLORS[0];
  const interactionLabel = day.count > 1 ? translateSource("interactions") : translateSource("interaction");
  const dot = element("button", {
    className: "v8-heatmap-dot",
    attributes: { type: "button", "aria-label": `${day.date}: ${day.count} ${interactionLabel}` },
    dataset: { date: day.date, count: String(day.count) }
  });
  dot.style.setProperty("--v8-dot-color", color);
  dot.style.setProperty("--v8-dot-level", value);
  const tooltip = element("span", { className: "v8-heatmap-dot__tooltip", text: `${day.date}: ${day.count} ${interactionLabel}` });
  dot.append(tooltip);
  return dot;
}

function formatPercent(value) { return `${value}%`; }

function statCard({ iconName, label, value, sub }) {
  return element("div", { className: "v8-interactions-stat" }, [
    element("div", { className: "v8-interactions-stat__header" }, [icon(iconName), element("span", { text: label })]),
    element("strong", { text: value }),
    element("small", { text: sub })
  ]);
}

function renderGrid(days, range) {
  const weeks = Math.ceil(days.length / 7);
  const grid = element("div", { className: "v8-heatmap-grid", attributes: { role: "grid", "aria-label": translateSource("Carte de chaleur des interactions") } });
  grid.style.setProperty("--v8-heatmap-weeks", String(weeks));

  const header = element("div", { className: "v8-heatmap-header" }, WEEKDAYS.map((d) => element("span", { text: translateSource(d) })));
  grid.append(header);

  const matrix = element("div", { className: "v8-heatmap-matrix" });
  for (let w = 0; w < weeks; w++) {
    const row = element("div", { className: "v8-heatmap-week" });
    for (let d = 0; d < 7; d++) {
      const index = w * 7 + d;
      if (index >= days.length) break;
      const day = days[index];
      const value = Math.max(0, Math.min(4, day.value || 0));
      const dot = heatmapDot(day, value);
      dot.classList.add(`v8-heatmap-dot--level-${value}`);
      row.append(dot);
    }
    matrix.append(row);
  }
  grid.append(matrix);
  return grid;
}

export function mountInteractions(stage, options = {}) {
  const ownerId = options.ownerId || "";
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const heatmap = options.interactions || createInteractionsHeatmap({ ownerId, storage: options.storage });
  if (!options.interactions) heatmap.seed();

  let range = 30;
  let expanded = true;

  const title = element("h1", { text: translateSource("Interactions") });
  const subTitle = element("p", { text: translateSource("Derniers {range} jours").replace("{range}", String(range)) });
  const rangeToggle = element("button", {
    className: "v8-interactions-toggle",
    attributes: { type: "button", "aria-pressed": "false" },
    dataset: { interactionsToggle: "range" }
  }, [
    element("span", { text: translateSource("Moins") }),
    element("span", { className: "v8-interactions-toggle__track" }, [element("span", { className: "v8-interactions-toggle__thumb" })]),
    element("span", { text: translateSource("Plus") })
  ]);

  const heatmapHost = element("div", { className: "v8-heatmap-host" });
  const statsHost = element("div", { className: "v8-interactions-stats" });
  const showLess = element("button", { className: "v8-interactions-less", attributes: { type: "button" } }, [icon("chevron-up"), element("span", { text: translateSource("Afficher moins") })]);

  const refreshButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: () => { heatmap.refresh(); render(); notify({ id: "interactions-refreshed", title: translateSource("Interactions"), message: translateSource("Flux actualisé"), type: "success" }); } } }, [icon("refresh-cw"), element("span", { text: translateSource("Actualiser") })]);

  const page = element("section", { className: "v8-page v8-interactions-page", dataset: { page: "interactions" } }, [
    element("header", { className: "v8-page-heading v8-interactions-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: translateSource("Engagement") }),
        title,
        subTitle
      ]),
      element("div", { className: "v8-page-heading__actions" }, [
        refreshButton
      ])
    ]),
    element("section", { className: "v8-interactions-card" }, [
      element("div", { className: "v8-interactions-card__header" }, [
        element("div", {}, [element("h2", { text: translateSource("Activité") }), element("span", { text: translateSource("Derniers {range} jours").replace("{range}", String(range)) })]),
        rangeToggle
      ]),
      heatmapHost,
      statsHost,
      showLess
    ])
  ]);

  stage.replaceChildren(page);

  function render() {
    const raw = heatmap.days(range);
    const days = raw.map((d) => ({ ...d, value: heatmap.intensity(d.count) }));
    const stats = heatmap.stats(range);

    heatmapHost.replaceChildren(renderGrid(days, range));

    const checks = Math.max(0, Math.min(35, Math.round(stats.thisWeekPercent * 0.35)));
    statsHost.replaceChildren(
      statCard({ iconName: "calendar-check", label: translateSource("Aujourd'hui"), value: `${stats.today}/5`, sub: translateSource("Habitudes réalisées") }),
      statCard({ iconName: "flame", label: translateSource("Série actuelle"), value: `${stats.streak}D`, sub: translateSource("Actif") }),
      statCard({ iconName: "trending-up", label: translateSource("Cette semaine"), value: formatPercent(stats.thisWeekPercent), sub: `${checks}/35 ${translateSource("vérifications")}` }),
      statCard({ iconName: "gauge", label: translateSource("Cohérence"), value: formatPercent(stats.consistency), sub: `${translateSource("Moyenne")} 17 ${translateSource("semaines")}` })
    );

    subTitle.textContent = translateSource("Derniers {range} jours").replace("{range}", String(range));
    const rangeLabel = page.querySelector(".v8-interactions-card__header h2 + span");
    if (rangeLabel) rangeLabel.textContent = translateSource("Derniers {range} jours").replace("{range}", String(range));
    rangeToggle.setAttribute("aria-pressed", range === 90 ? "true" : "false");
    rangeToggle.classList.toggle("is-active", range === 90);

    showLess.replaceChildren(icon(expanded ? "chevron-up" : "chevron-down"), element("span", { text: expanded ? translateSource("Afficher moins") : translateSource("Afficher plus") }));
    heatmapHost.hidden = !expanded;
    statsHost.hidden = !expanded;

    refreshIcons(page);
  }

  rangeToggle.addEventListener("click", () => {
    range = range === 30 ? 90 : 30;
    render();
  });

  showLess.addEventListener("click", () => {
    expanded = !expanded;
    render();
  });

  page.addEventListener("click", (event) => {
    const dot = event.target.closest(".v8-heatmap-dot");
    if (dot) {
      const interactionLabel = Number(dot.dataset.count) > 1 ? translateSource("interactions") : translateSource("interaction");
      notify({ id: "interaction-dot", title: translateSource("Interactions"), message: `${dot.dataset.date}: ${dot.dataset.count} ${interactionLabel}.`, type: "info", duration: 2000 });
    }
  });

  render();

  return () => {};
}
