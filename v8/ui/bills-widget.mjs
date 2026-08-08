import { element, icon } from "./dom.mjs";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sept", "Oct", "Nov", "Dec"];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function formatCurrency(amount, currency) {
  return `${currency}${Number(amount).toFixed(2)}`;
}

function buildWeek(manager, selected, onSelect, today) {
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const bills = manager.forDate(d);
    const isSelected = isSameDay(d, selected);
    const hasBill = bills.length > 0;
    const dayButton = element("button", {
      className: `v8-bills-day${isSelected ? " is-selected" : ""}${hasBill ? " has-bill" : ""}`,
      attributes: { type: "button", "aria-label": `${formatDate(d)}, ${bills.length} facture${bills.length > 1 ? "s" : ""}`, "aria-pressed": isSelected ? "true" : "false" },
      events: { click: () => onSelect(d) }
    }, [
      element("small", { text: WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1] }),
      element("strong", { text: String(d.getDate()) }),
      hasBill ? element("span", { className: "v8-bills-day__dot", style: { background: bills[0].color } }) : null
    ]);
    days.push(dayButton);
  }
  return element("div", { className: "v8-bills-week" }, days);
}

function billDetailCard(bill) {
  return element("div", { className: "v8-bills-detail" }, [
    element("span", { className: "v8-bills-detail__icon", style: { background: bill.color } }, [icon(bill.icon)]),
    element("div", { className: "v8-bills-detail__copy" }, [
      element("strong", { text: bill.title }),
      element("small", { text: `${bill.category} · ${formatDate(bill.dueDate)}` })
    ]),
    element("b", { text: formatCurrency(bill.amount, bill.currency) })
  ]);
}

function buildDetails(manager, selected, onAdd, onScan) {
  const bills = manager.forDate(selected);
  const list = bills.map(billDetailCard);
  const empty = element("div", { className: "v8-bills-empty" }, [
    element("span", {}, [icon("receipt")]),
    element("p", { text: "Rien à payer ce jour" }),
    element("div", { className: "v8-bills-empty__actions" }, [
      element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: onAdd } }, [icon("plus"), element("span", { text: "Ajouter" })]),
      element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: onScan } }, [icon("scan-line"), element("span", { text: "Scanner" })])
    ])
  ]);
  return element("div", { className: "v8-bills-details" }, [
    list.length ? element("div", { className: "v8-bills-details__list" }, list) : empty,
    list.length ? element("button", { className: "v8-bills-add v8-icon-button", attributes: { type: "button", "aria-label": "Ajouter une facture" }, events: { click: onAdd } }, [icon("plus")]) : null
  ]);
}

export function billsLiveCard(manager, options = {}) {
  const today = startOfDay(new Date());
  let selected = today;
  let weekRoot = null;
  let detailRoot = null;

  function onSelect(date) {
    selected = startOfDay(date);
    refresh();
  }

  function onAdd() {
    if (typeof options.onAdd === "function") options.onAdd(selected);
  }

  function onScan() {
    if (typeof options.onScan === "function") options.onScan();
  }

  function refresh() {
    if (weekRoot) weekRoot.replaceChildren(...buildWeek(manager, selected, onSelect, today).children);
    if (detailRoot) detailRoot.replaceChildren(buildDetails(manager, selected, onAdd, onScan));
  }

  const snapshot = manager.snapshot();
  const header = element("header", { className: "v8-bills-header" }, [
    element("div", {}, [element("span", { className: "v8-eyebrow", text: "Factures" }), element("strong", { text: formatCurrency(snapshot.total, "$") })]),
    element("small", { text: `${snapshot.count} à venir dans 30 jours` })
  ]);

  const initialWeek = buildWeek(manager, selected, onSelect, today);
  const initialDetail = buildDetails(manager, selected, onAdd, onScan);
  weekRoot = element("div", { className: "v8-bills-week" }, [...initialWeek.children]);
  detailRoot = element("div", { className: "v8-bills-details" }, [initialDetail]);

  const card = element("article", {
    className: "v8-bills-widget v8-surface",
    attributes: { "aria-label": "Factures" },
    dataset: { liveWidget: "bills", liveKind: "widget" }
  }, [header, weekRoot, detailRoot]);

  const unsubscribe = manager.subscribe(() => refresh());
  card.addEventListener("destroy", unsubscribe);

  return card;
}
