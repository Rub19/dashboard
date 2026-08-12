import { brandIcon, element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";
import { showBottomSheet } from "./bottom-sheet.mjs";
import { currentLocale, translateSource } from "../i18n/catalog.mjs";

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDate(date) {
  return new Intl.DateTimeFormat(currentLocale(), { day: "numeric", month: "short" }).format(new Date(date));
}

function toISODate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currencyCode(symbol) {
  if (symbol === "$" || symbol === "USD") return "USD";
  if (symbol === "€" || symbol === "EUR") return "EUR";
  if (symbol === "£" || symbol === "GBP") return "GBP";
  return "EUR";
}

function formatCurrency(amount, currency) {
  try {
    return new Intl.NumberFormat(currentLocale(), { style: "currency", currency: currencyCode(currency) }).format(Number(amount));
  } catch {
    return `${currency}${Number(amount).toFixed(2)}`;
  }
}

function buildWeek(manager, selected, onSelect, today) {
  const days = [];
  const base = startOfDay(new Date());
  const weekdayFormatter = new Intl.DateTimeFormat(currentLocale(), { weekday: "narrow" });
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const bills = manager.forDate(d);
    const isSelected = isSameDay(d, selected);
    const isToday = isSameDay(d, base);
    const hasBill = bills.length > 0;
    const dot = hasBill
      ? element("span", { className: "v8-bills-day__icon", style: { color: bills[0].color } }, [billIcon(bills[0])])
      : null;
    const billCountLabel = `${bills.length} ${bills.length > 1 ? translateSource("factures") : translateSource("facture")}`;
    const dayButton = element("button", {
      className: `v8-bills-day${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}${hasBill ? " has-bill" : ""}`,
      attributes: { type: "button", "aria-label": `${formatDate(d)}, ${billCountLabel}`, "aria-pressed": isSelected ? "true" : "false" },
      events: { click: () => onSelect(d) }
    }, [
      element("small", { text: weekdayFormatter.format(d) }),
      element("strong", { text: String(d.getDate()) }),
      dot
    ]);
    days.push(dayButton);
  }
  return element("div", { className: "v8-bills-week" }, days);
}

const BRAND_ICONS = new Set(["spotify", "netflix"]);

function billIcon(bill) {
  if (BRAND_ICONS.has(bill.icon)) return brandIcon(bill.icon, bill.icon, "");
  return icon(bill.icon);
}

function billDetailCard(bill) {
  return element("div", { className: "v8-bills-detail" }, [
    element("span", { className: "v8-bills-detail__icon", style: { background: bill.color } }, [billIcon(bill)]),
    element("div", { className: "v8-bills-detail__copy" }, [
      element("strong", { text: bill.title }),
      element("small", { text: `${bill.category} · ${formatDate(bill.dueDate)}` })
    ]),
    element("b", { text: formatCurrency(bill.amount, bill.currency) })
  ]);
}

function formField(label, inputEl) {
  return element("label", { className: "v8-bills-form__field" }, [
    element("span", { className: "v8-bills-form__label", text: label }),
    inputEl
  ]);
}

function createSelect(name, options, value) {
  const children = options.map(([key, label]) => element("option", { text: label, attributes: { value: key, ...(key === value ? { selected: "selected" } : {}) } }));
  return element("select", { className: "v8-input", attributes: { name } }, children);
}

export function openBillForm(manager, selected, options = {}) {
  const titleInput = element("input", { className: "v8-input", attributes: { type: "text", name: "title", placeholder: translateSource("Nom de la facture") } });
  const amountInput = element("input", { className: "v8-input", attributes: { type: "number", name: "amount", step: "0.01", min: "0", placeholder: translateSource("Montant") } });
  const currencyInput = element("select", { className: "v8-input", attributes: { name: "currency" } }, [
    element("option", { text: "$", attributes: { value: "$", selected: "" } }),
    element("option", { text: "€", attributes: { value: "€" } }),
    element("option", { text: "£", attributes: { value: "£" } })
  ]);
  const dateInput = element("input", { className: "v8-input", attributes: { type: "date", name: "dueDate", value: toISODate(selected) } });
  const categories = Object.entries(manager.categories).map(([key, value]) => [key, value.label]);
  const categoryInput = createSelect("category", categories, categories[0]?.[0]);
  const recurrences = Object.entries(manager.recurrences);
  const recurrenceInput = createSelect("recurrence", recurrences, recurrences[0]?.[0]);

  let sheetRef = null;

  const fields = [
    formField(translateSource("Nom de la facture"), titleInput),
    element("div", { className: "v8-bills-form__row" }, [
      formField(translateSource("Montant"), amountInput),
      formField(translateSource("Devise"), currencyInput)
    ]),
    formField(translateSource("Date d'échéance"), dateInput),
    element("div", { className: "v8-bills-form__row" }, [
      formField(translateSource("Catégorie"), categoryInput),
      formField(translateSource("Récurrence"), recurrenceInput)
    ])
  ];

  const submitButton = element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [element("span", { text: translateSource("Enregistrer la facture") })]);
  function onSubmit(event) {
    event.preventDefault();
    manager.add({
      title: titleInput.value || translateSource("Nouvelle facture"),
      amount: Number(amountInput.value) || 0,
      currency: currencyInput.value,
      dueDate: new Date(dateInput.value || Date.now()),
      category: categoryInput.value,
      recurrence: recurrenceInput.value
    });
    sheetRef?.close();
  }

  const form = element("form", { className: "v8-bills-form", events: { submit: onSubmit } }, [
    ...fields,
    element("div", { className: "v8-bills-form__actions" }, [
      element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: () => sheetRef?.close() } }, [element("span", { text: translateSource("Annuler") })]),
      submitButton
    ])
  ]);

  sheetRef = showBottomSheet({ title: translateSource("Ajouter une facture"), children: [form], className: "v8-bills-sheet" });
}

export function openBillScan(manager, options = {}) {
  const textarea = element("textarea", { className: "v8-input v8-bills-form__scan", attributes: { rows: "4", placeholder: translateSource("Collez le texte de la facture ici...") } });
  let sheetRef = null;
  const onAnalyze = async () => {
    const text = textarea.value.trim();
    if (!text) return;
    await manager.scan(text, options.externalServices);
    sheetRef?.close();
  };
  const form = element("div", { className: "v8-bills-form" }, [
    formField(translateSource("Scanner un reçu"), textarea),
    element("div", { className: "v8-bills-form__actions" }, [
      element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: () => sheetRef?.close() } }, [element("span", { text: translateSource("Annuler") })]),
      element("button", { className: "v8-button v8-button--primary", attributes: { type: "button" }, events: { click: onAnalyze } }, [icon("scan-line"), element("span", { text: translateSource("Analyser") })])
    ])
  ]);
  sheetRef = showBottomSheet({ title: translateSource("Scanner un reçu"), children: [form], className: "v8-bills-sheet" });
}

function buildDetails(manager, selected, onAdd, onScan) {
  const bills = manager.forDate(selected);
  const list = bills.map(billDetailCard);
  const empty = element("div", { className: "v8-bills-empty" }, [
    element("span", {}, [icon("receipt")]),
    element("p", { text: translateSource("Rien à payer ce jour") }),
    element("div", { className: "v8-bills-empty__actions" }, [
      element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: onAdd } }, [icon("plus"), element("span", { text: translateSource("Ajouter") })]),
      element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: onScan } }, [icon("scan-line"), element("span", { text: translateSource("Scanner") })])
    ])
  ]);
  return element("div", { className: "v8-bills-details" }, [
    list.length ? element("div", { className: "v8-bills-details__list" }, list) : empty,
    list.length ? element("button", { className: "v8-bills-add v8-icon-button", attributes: { type: "button", "aria-label": translateSource("Ajouter une facture") }, events: { click: onAdd } }, [icon("plus")]) : null
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
    else openBillForm(manager, selected, { externalServices: options.externalServices });
  }

  function onScan() {
    if (typeof options.onScan === "function") options.onScan();
    else openBillScan(manager, { externalServices: options.externalServices });
  }

  let headerTotal = null;
  let headerCount = null;

  function refresh() {
    if (weekRoot) weekRoot.replaceChildren(...buildWeek(manager, selected, onSelect, today).children);
    if (detailRoot) detailRoot.replaceChildren(buildDetails(manager, selected, onAdd, onScan));
    const snapshot = manager.snapshot();
    if (headerTotal) headerTotal.textContent = formatCurrency(snapshot.total, "$");
    if (headerCount) headerCount.textContent = `${snapshot.count} ${translateSource("à venir dans 30 jours")}`;
    refreshIcons();
  }

  const snapshot = manager.snapshot();
  headerTotal = element("strong", { text: formatCurrency(snapshot.total, "$") });
  headerCount = element("small", { text: `${snapshot.count} ${translateSource("à venir dans 30 jours")}` });
  const header = element("header", { className: "v8-bills-header" }, [
    element("div", {}, [element("span", { className: "v8-eyebrow", text: translateSource("Factures") }), headerTotal]),
    headerCount
  ]);

  const initialWeek = buildWeek(manager, selected, onSelect, today);
  const initialDetail = buildDetails(manager, selected, onAdd, onScan);
  weekRoot = element("div", { className: "v8-bills-week" }, [...initialWeek.children]);
  detailRoot = element("div", { className: "v8-bills-details" }, [initialDetail]);

  const card = element("article", {
    className: "v8-bills-widget v8-surface",
    attributes: { "aria-label": translateSource("Factures") },
    dataset: { liveWidget: "bills", liveKind: "widget" }
  }, [header, weekRoot, detailRoot]);

  const unsubscribe = manager.subscribe(() => refresh());
  card.addEventListener("destroy", unsubscribe);

  return card;
}
