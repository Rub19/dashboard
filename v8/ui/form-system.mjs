import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";

const MANAGED_SELECTOR = "input:not([type='hidden']), textarea, select, button[role='switch']";
const VALIDATABLE_SELECTOR = "input:not([type='hidden']):not([type='button']):not([type='submit']):not([type='reset']), textarea, select";
const controllers = new WeakMap();
const pendingForms = new WeakSet();
let fieldSequence = 0;

function fieldRoot(control) {
  return control?.closest?.(".v8-form-field, .v8-field, [data-form-field]") || null;
}

function controlKind(control) {
  if (control?.matches?.("button[role='switch']")) return "switch";
  if (control?.tagName === "TEXTAREA") return "textarea";
  if (control?.tagName === "SELECT") return "select";
  return String(control?.type || "text").toLowerCase();
}

function ensureId(control) {
  if (!control.id) control.id = `v8-field-${++fieldSequence}`;
  return control.id;
}

function hasValue(control) {
  const kind = controlKind(control);
  if (["checkbox", "radio"].includes(kind)) return Boolean(control.checked);
  if (kind === "switch") return control.getAttribute("aria-checked") === "true";
  if (kind === "file") return Boolean(control.files?.length || control.value);
  return String(control.value ?? "").length > 0;
}

function counterValue(control) {
  return control.maxLength > 0 ? `${String(control.value || "").length}/${control.maxLength}` : "";
}

function ensureMeta(control) {
  const root = fieldRoot(control);
  if (!root) return null;
  root.classList.add("v8-form-field");
  root.dataset.controlKind = controlKind(control);
  const inputId = ensureId(control);
  let meta = root.querySelector(":scope > .v8-form-field__meta");
  if (!meta) {
    const message = element("span", { className: "v8-form-field__message", id: `${inputId}-feedback`, attributes: { "aria-live": "polite", "aria-atomic": "true" } });
    const counter = root.dataset.counter === "off" ? null : element("span", { className: "v8-form-field__counter", attributes: { "aria-hidden": "true" } });
    meta = element("span", { className: "v8-form-field__meta" }, [message, counter]);
    root.append(meta);
    const describedBy = new Set(String(control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    describedBy.add(message.id);
    control.setAttribute("aria-describedby", [...describedBy].join(" "));
  }
  const message = meta.querySelector(".v8-form-field__message");
  const counter = meta.querySelector(".v8-form-field__counter");
  if (message) {
    message.dataset.help = root.dataset.help || "";
    if (!message.dataset.tone) message.textContent = message.dataset.help;
  }
  if (counter) counter.textContent = counterValue(control);
  return { root, message, counter };
}

function validationCandidate(control) {
  if (!control?.matches?.(VALIDATABLE_SELECTOR) || control.disabled) return false;
  const kind = controlKind(control);
  return Boolean(
    fieldRoot(control) ||
    control.required ||
    control.hasAttribute("data-validate") ||
    control.hasAttribute("pattern") ||
    control.minLength > 0 ||
    ["email", "url"].includes(kind) ||
    control.validity?.customError
  );
}

function messageFor(control) {
  const validity = control.validity || {};
  const kind = controlKind(control);
  if (control.dataset.errorMessage) return control.dataset.errorMessage;
  if (validity.valueMissing) {
    if (["checkbox", "radio"].includes(kind)) return control.dataset.requiredMessage || "Sélectionnez cette option.";
    if (kind === "file") return control.dataset.requiredMessage || "Choisissez un fichier.";
    if (kind === "select") return control.dataset.requiredMessage || "Choisissez une option.";
    return control.dataset.requiredMessage || "Ce champ est requis.";
  }
  if (validity.typeMismatch) return kind === "email" ? "Saisissez une adresse e-mail valide." : "Saisissez une adresse URL valide.";
  if (validity.badInput) return "Vérifiez la valeur saisie.";
  if (validity.tooShort) return `Saisissez au moins ${control.minLength} caractères.`;
  if (validity.tooLong) return `Limitez ce champ à ${control.maxLength} caractères.`;
  if (validity.rangeUnderflow) return `La valeur minimale est ${control.min}.`;
  if (validity.rangeOverflow) return `La valeur maximale est ${control.max}.`;
  if (validity.stepMismatch) return "Choisissez une valeur autorisée.";
  if (validity.patternMismatch) return control.dataset.patternMessage || "Cette valeur ne respecte pas le format attendu.";
  return control.validationMessage || "Vérifiez cette valeur.";
}

function inferredState(control) {
  if (control.disabled || control.getAttribute("aria-disabled") === "true") return "disabled";
  if (control.getAttribute("aria-busy") === "true") return "loading";
  if (control.readOnly || control.getAttribute("aria-readonly") === "true") return "readonly";
  return "default";
}

function updateFilled(control) {
  const filled = hasValue(control);
  control.dataset.filled = String(filled);
  fieldRoot(control)?.classList.toggle("is-filled", filled);
  const meta = ensureMeta(control);
  if (meta?.counter) meta.counter.textContent = counterValue(control);
}

function initializeControl(control) {
  if (!control?.matches?.(MANAGED_SELECTOR)) return control;
  const kind = controlKind(control);
  control.dataset.controlKind = kind;
  if (kind === "checkbox") control.classList.add("v8-checkbox");
  else if (kind === "radio") control.classList.add("v8-radio");
  else if (kind === "range") control.classList.add("v8-range");
  else if (kind === "file") control.classList.add("v8-input", "v8-file-input");
  else if (kind !== "switch") control.classList.add("v8-input");
  updateFilled(control);
  if (!control.dataset.fieldState) setFieldState(control, inferredState(control));
  return control;
}

export function prepareFormControls(root) {
  if (!root?.querySelectorAll) return root;
  if (root.matches?.("form")) root.noValidate = true;
  root.querySelectorAll("form").forEach((form) => { form.noValidate = true; });
  if (root.matches?.(MANAGED_SELECTOR)) initializeControl(root);
  root.querySelectorAll(MANAGED_SELECTOR).forEach(initializeControl);
  return root;
}

export function formField({ label, control, input = control, help = "", className = "", required = input?.required, counter = true } = {}) {
  if (!input || !control) throw new TypeError("formField requires a control");
  const id = ensureId(input);
  const kind = controlKind(input);
  if (required) {
    input.required = true;
    input.setAttribute("aria-required", "true");
  }
  const labelContent = label?.nodeType ? label : element("span", { text: label });
  const requiredMark = required ? element("span", { className: "v8-form-field__required", text: "*", attributes: { "aria-hidden": "true" } }) : null;
  const classes = `v8-field v8-form-field v8-form-field--${kind} ${className}`.trim();
  let body;
  if (["checkbox", "radio"].includes(kind) && control === input) {
    body = element("label", { className: "v8-form-choice", attributes: { for: id } }, [input, element("span", { className: "v8-field__label v8-form-field__label" }, [labelContent, requiredMark])]);
  } else {
    body = [element("label", { className: "v8-field__label v8-form-field__label", attributes: { for: id } }, [labelContent, requiredMark]), control];
  }
  const root = element("div", { className: classes, dataset: { help, formField: "", controlKind: kind, counter: counter === false ? "off" : null } }, body);
  initializeControl(input);
  return root;
}

export function passwordControl(input, options = {}) {
  if (!input) throw new TypeError("passwordControl requires an input");
  const controller = new AbortController();
  let showLabel = options.showLabel || "Afficher le mot de passe";
  let hideLabel = options.hideLabel || "Masquer le mot de passe";
  const toggle = element("button", {
    className: `v8-icon-button v8-form-password__toggle ${options.buttonClassName || ""}`.trim(),
    attributes: { type: "button", "aria-label": showLabel, "aria-pressed": "false" }
  }, icon("eye"));
  const node = element("span", { className: `v8-form-password ${options.className || ""}`.trim() }, [input, toggle]);
  const sync = () => {
    const revealed = input.type === "text";
    toggle.setAttribute("aria-pressed", String(revealed));
    toggle.setAttribute("aria-label", revealed ? hideLabel : showLabel);
    toggle.replaceChildren(icon(revealed ? "eye-off" : "eye"));
    refreshIcons();
  };
  toggle.addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
    sync();
    input.focus({ preventScroll: true });
    input.setSelectionRange?.(input.value.length, input.value.length);
  }, { signal: controller.signal });
  options.signal?.addEventListener?.("abort", () => controller.abort(), { once: true });
  return Object.freeze({
    input,
    node,
    toggle,
    setLabels(nextShow, nextHide) {
      showLabel = nextShow || showLabel;
      hideLabel = nextHide || hideLabel;
      sync();
    },
    destroy: () => controller.abort()
  });
}

export function setFieldState(control, state = "default", message = "") {
  if (!control) return;
  const meta = ensureMeta(control);
  const previous = control.dataset.fieldState;
  const normalized = ["invalid", "valid", "loading", "readonly", "disabled"].includes(state) ? state : "default";
  control.dataset.fieldState = normalized;
  if (meta?.root) meta.root.dataset.fieldState = normalized;
  if (normalized === "invalid") control.setAttribute("aria-invalid", "true");
  else control.removeAttribute("aria-invalid");
  if (normalized === "loading") {
    if (!control.hasAttribute("aria-busy")) control.dataset.formOwnedBusy = "true";
    control.setAttribute("aria-busy", "true");
  } else if (previous === "loading" && control.dataset.formOwnedBusy === "true") {
    control.removeAttribute("aria-busy");
    delete control.dataset.formOwnedBusy;
  }
  if (meta?.message) {
    const tone = normalized === "invalid" ? "error" : normalized === "valid" ? "success" : normalized === "loading" ? "loading" : "";
    meta.message.dataset.tone = tone;
    meta.message.setAttribute("role", tone === "error" ? "alert" : "status");
    meta.message.textContent = message || meta.message.dataset.help || "";
  }
}

export function clearFieldState(control) {
  if (!control) return;
  delete control.dataset.touched;
  setFieldState(control, inferredState(control));
  updateFilled(control);
}

export function validateControl(control, { force = false, focus = false } = {}) {
  if (!control?.matches?.(VALIDATABLE_SELECTOR) || control.disabled) return true;
  initializeControl(control);
  if (!validationCandidate(control)) return true;
  const valid = control.validity?.valid ?? control.checkValidity();
  if (force) control.dataset.touched = "true";
  if (!valid && (force || control.dataset.touched === "true")) setFieldState(control, "invalid", messageFor(control));
  else if (valid && control.dataset.touched === "true" && hasValue(control)) setFieldState(control, "valid");
  else setFieldState(control, inferredState(control));
  if (!valid && focus) control.focus();
  return valid;
}

export function validateForm(form, { focus = true } = {}) {
  const controls = [...form.querySelectorAll(VALIDATABLE_SELECTOR)].filter(validationCandidate);
  let firstInvalid = null;
  controls.forEach((control) => {
    if (!validateControl(control, { force: true }) && !firstInvalid) firstInvalid = control;
  });
  if (firstInvalid && focus) {
    firstInvalid.focus();
    const reclaimFocus = () => {
      if (!firstInvalid.isConnected || firstInvalid.validity?.valid) return;
      const active = firstInvalid.ownerDocument?.activeElement;
      if (active === firstInvalid || active?.matches?.("button[type='submit'], input[type='submit']") || !form.contains(active)) {
        firstInvalid.focus();
      }
    };
    queueMicrotask(reclaimFocus);
    firstInvalid.ownerDocument?.defaultView?.requestAnimationFrame?.(reclaimFocus);
  }
  return !firstInvalid;
}

export function setFormStatus(node, state = "default", message = "") {
  if (!node) return;
  const normalized = ["loading", "saved", "error"].includes(state) ? state : "default";
  node.dataset.formState = normalized;
  node.dataset.type = normalized === "saved" ? "success" : normalized === "error" ? "error" : "";
  node.setAttribute("role", normalized === "error" ? "alert" : "status");
  node.setAttribute("aria-live", normalized === "error" ? "assertive" : "polite");
  node.setAttribute("aria-atomic", "true");
  node.toggleAttribute("aria-busy", normalized === "loading");
  node.textContent = String(message || "");
}

export function enhanceForm(form, { signal } = {}) {
  if (!form) return () => {};
  if (controllers.has(form)) return controllers.get(form);
  const controller = new AbortController();
  const options = { signal: controller.signal };
  if (form.tagName === "FORM") form.noValidate = true;
  prepareFormControls(form);
  form.addEventListener("input", (event) => {
    const control = event.target.closest?.(MANAGED_SELECTOR);
    if (!control || !form.contains(control)) return;
    updateFilled(control);
    if (control.dataset.touched === "true") validateControl(control, { force: true });
  }, options);
  form.addEventListener("change", (event) => {
    const control = event.target.closest?.(MANAGED_SELECTOR);
    if (!control || !form.contains(control)) return;
    updateFilled(control);
    if (validationCandidate(control)) validateControl(control, { force: true });
    else {
      const state = inferredState(control);
      if (state !== "default" || !control.dataset.fieldState) setFieldState(control, state);
    }
  }, options);
  form.addEventListener("focusout", (event) => {
    const control = event.target.closest?.(VALIDATABLE_SELECTOR);
    if (control && form.contains(control) && validationCandidate(control)) validateControl(control, { force: true });
  }, options);
  form.addEventListener("click", (event) => {
    const control = event.target.closest?.("button[role='switch']");
    if (control && form.contains(control)) queueMicrotask(() => updateFilled(control));
  }, options);
  form.addEventListener("invalid", (event) => {
    event.preventDefault();
    validateControl(event.target, { force: true });
  }, { ...options, capture: true });
  form.addEventListener("submit", (event) => {
    if (validateForm(form)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { ...options, capture: true });
  const destroy = () => { controller.abort(); controllers.delete(form); };
  controllers.set(form, destroy);
  signal?.addEventListener?.("abort", destroy, { once: true });
  return destroy;
}

export async function runFormSubmission({ form, submit, status, messages = {}, task } = {}) {
  if (!form || typeof task !== "function") throw new TypeError("runFormSubmission requires a form and a task");
  const copy = { invalid: "Vérifiez les champs signalés.", loading: "Enregistrement en cours...", saved: "Enregistré.", error: "L'enregistrement a échoué.", ...messages };
  const statusNode = status || form.querySelector("[data-form-status]");
  if (pendingForms.has(form)) return Object.freeze({ accepted: false, reason: "pending", value: null, error: null });
  if (!validateForm(form)) {
    setFormStatus(statusNode, "error", copy.invalid);
    return Object.freeze({ accepted: false, reason: "invalid", value: null, error: null });
  }
  pendingForms.add(form);
  const buttons = (Array.isArray(submit) ? submit : [submit]).filter(Boolean);
  const buttonState = buttons.map((button) => ({ disabled: button.disabled, busy: button.getAttribute("aria-busy") }));
  form.setAttribute("aria-busy", "true");
  form.dataset.submitState = "loading";
  setFormStatus(statusNode, "loading", copy.loading);
  buttons.forEach((button) => { button.disabled = true; button.setAttribute("aria-busy", "true"); button.classList.add("is-loading"); });
  try {
    const value = await task();
    const ok = value?.ok !== false;
    form.dataset.submitState = ok ? "saved" : "error";
    setFormStatus(statusNode, ok ? "saved" : "error", value?.message || (ok ? copy.saved : copy.error));
    return Object.freeze({ accepted: true, reason: "completed", value, error: null });
  } catch (error) {
    form.dataset.submitState = "error";
    setFormStatus(statusNode, "error", error?.message || copy.error);
    return Object.freeze({ accepted: true, reason: "failed", value: null, error });
  } finally {
    form.setAttribute("aria-busy", "false");
    buttons.forEach((button, index) => {
      button.disabled = buttonState[index].disabled;
      if (buttonState[index].busy == null) button.removeAttribute("aria-busy");
      else button.setAttribute("aria-busy", buttonState[index].busy);
      button.classList.remove("is-loading");
    });
    pendingForms.delete(form);
  }
}
