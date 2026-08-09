import { actionButton, element, icon } from "../ui/dom.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { createInteractionsHeatmap } from "../services/interactions-heatmap.mjs";
import { statusState } from "../ui/empty-state.mjs";

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
  const dot = element("button", {
    className: "v8-heatmap-dot",
    attributes: { type: "button", "aria-label": `${day.date}: ${day.count} interaction${day.count > 1 ? "s" : ""}` },
    dataset: { date: day.date, count: String(day.count) }
  });
  dot.style.setProperty("--v8-dot-color", color);
  dot.style.setProperty("--v8-dot-level", value);
  const tooltip = element("span", { className: "v8-heatmap-dot__tooltip", text: `${day.date}: ${day.count}` });
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
  const grid = element("div", { className: "v8-heatmap-grid", attributes: { role: "grid", "aria-label": "Carte de chaleur des interactions" } });
  grid.style.setProperty("--v8-heatmap-weeks", String(weeks));

  const header = element("div", { className: "v8-heatmap-header" }, ["Lun", "Mer", "Ven"].map((d) => element("span", { text: d })));
  grid.append(header);

  const matrix = element("div", { className: "v8-heatmap-matrix" });
  for (let w = 0; w < weeks; w++) {
    const col = element("div", { className: "v8-heatmap-week" });
    for (let d = 0; d < 7; d++) {
      const index = w * 7 + d;
      if (index >= days.length) break;
      const day = days[index];
      const value = Math.max(0, Math.min(4, day.value || 0));
      const dot = heatmapDot(day, value);
      dot.classList.add(`v8-heatmap-dot--level-${value}`);
      col.append(dot);
    }
    matrix.append(col);
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

  const title = element("h1", { text: "Interactions" });
  const subTitle = element("p", { text: "Derniers 30 jours" });
  const rangeToggle = element("button", {
    className: "v8-interactions-toggle",
    attributes: { type: "button", "aria-pressed": "false" },
    dataset: { interactionsToggle: "range" }
  }, [
    element("span", { text: "Less" }),
    element("span", { className: "v8-interactions-toggle__track" }, [element("span", { className: "v8-interactions-toggle__thumb" })]),
    element("span", { text: "More" })
  ]);

  const heatmapHost = element("div", { className: "v8-heatmap-host" });
  const statsHost = element("div", { className: "v8-interactions-stats" });
  const showLess = element("button", { className: "v8-interactions-less", attributes: { type: "button" } }, [icon("chevron-up"), element("span", { text: "Show less" })]);

  const page = element("section", { className: "v8-page v8-interactions-page", dataset: { page: "interactions" } }, [
    element("header", { className: "v8-page-heading v8-interactions-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Engagement" }),
        title,
        subTitle
      ]),
      element("div", { className: "v8-page-heading__actions" }, [
        actionButton({ actionId: "v8.interactions.refresh", variant: "secondary" }, [icon("refresh-cw"), element("span", { text: "Actualiser" })])
      ])
    ]),
    element("section", { className: "v8-interactions-card" }, [
      element("div", { className: "v8-interactions-card__header" }, [
        element("div", {}, [element("h2", { text: "Activity" }), element("span", { text: `Last ${range} Days` })]),
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

    statsHost.replaceChildren(
      statCard({ iconName: "calendar-check", label: "Today", value: `${stats.today}/5`, sub: "Habits done" }),
      statCard({ iconName: "flame", label: "Current Streak", value: `${stats.streak}D`, sub: "Active" }),
      statCard({ iconName: "trending-up", label: "This Week", value: formatPercent(stats.thisWeekPercent), sub: `${Math.round(stats.thisWeekPercent * 0.35)}/35 checks` }),
      statCard({ iconName: "gauge", label: "Consistency", value: formatPercent(stats.consistency), sub: "17-week avg" })
    );

    subTitle.textContent = `Derniers ${range} jours`;
    const rangeLabel = page.querySelector(".v8-interactions-card__header span");
    if (rangeLabel) rangeLabel.textContent = `Last ${range} Days`;
    rangeToggle.setAttribute("aria-pressed", range === 90 ? "true" : "false");
    rangeToggle.classList.toggle("is-active", range === 90);

    refreshIcons(page);
  }

  rangeToggle.addEventListener("click", () => {
    range = range === 30 ? 90 : 30;
    render();
  });

  showLess.addEventListener("click", () => {
    range = 30;
    render();
  });

  page.addEventListener("click", (event) => {
    const dot = event.target.closest(".v8-heatmap-dot");
    if (dot) {
      notify({ id: "interaction-dot", title: "Interactions", message: `${dot.dataset.date}: ${dot.dataset.count} interaction(s).`, type: "info", duration: 2000 });
    }
  });

  render();

  return () => {};
}
