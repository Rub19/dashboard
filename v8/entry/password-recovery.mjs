import { element, icon } from "../ui/dom.mjs";
import { enhanceForm, formField, passwordControl, runFormSubmission, setFieldState } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";

function passwordInput(id, label, signal) {
  const input = element("input", {
    className: "v8-input v8-auth__input",
    id,
    attributes: { type: "password", autocomplete: "new-password", required: true, minlength: "12", maxlength: "128" }
  });
  const password = passwordControl(input, {
    className: "v8-auth__password",
    buttonClassName: "v8-auth__password-toggle",
    signal
  });
  return Object.freeze({
    input,
    node: formField({ label, control: password.node, input, required: true, help: "12 caractères minimum" })
  });
}

export function mountPasswordRecovery(root, options = {}) {
  if (!root) throw new TypeError("Password recovery requires a root element");
  const auth = options.auth;
  if (!auth?.updatePassword) throw new TypeError("Password recovery requires the auth adapter");
  const abortController = new AbortController();
  const first = passwordInput("v8-recovery-password", "Nouveau mot de passe", abortController.signal);
  const confirmation = passwordInput("v8-recovery-confirmation", "Confirmer le mot de passe", abortController.signal);
  const feedback = element("div", { className: "v8-auth__feedback", attributes: { role: "status", "aria-live": "polite", "aria-atomic": "true" } });
  const submit = element("button", { className: "v8-button v8-button--primary v8-auth__submit", attributes: { type: "submit" } }, [
    icon("shield-check"),
    element("span", { text: "Sécuriser mon compte" })
  ]);
  const signOut = element("button", { className: "v8-auth__text-action", attributes: { type: "button" }, text: "Annuler et se déconnecter" });
  const form = element("form", { className: "v8-auth__form", attributes: { novalidate: true } }, [
    first.node,
    confirmation.node,
    element("p", { className: "v8-auth__recovery-copy", text: "12 caractères minimum, avec majuscule, minuscule, chiffre et symbole." }),
    feedback,
    submit,
    signOut
  ]);
  enhanceForm(form, { signal: abortController.signal });
  const panel = element("section", { className: "v8-auth v8-auth--recovery v8-surface", attributes: { "aria-labelledby": "v8-recovery-title" } }, [
    element("div", { className: "v8-auth__header" }, [
      element("div", { className: "v8-auth__status" }, [element("span", { className: "v8-auth__status-dot" }), element("span", { text: "Lien vérifié" })]),
      element("span", { className: "v8-badge v8-badge--accent", text: "SECURITY" })
    ]),
    form
  ]);
  const surface = element("section", { className: "v8-entry v8-entry--recovery", attributes: { "aria-label": "Récupération du compte ETHONE" } }, [
    element("div", { className: "v8-entry__signal-field", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
    element("div", { className: "v8-entry__frame" }, [
      element("header", { className: "v8-entry__topbar" }, [
        element("div", { className: "v8-entry__brand" }, [
          element("span", { className: "v8-entry__mark", text: "E", attributes: { "aria-hidden": "true" } }),
          element("span", { className: "v8-entry__wordmark", text: "ETHONE" })
        ]),
        element("span", { className: "v8-entry__privacy" }, [icon("lock-keyhole"), element("span", { text: "Session de récupération sécurisée" })])
      ]),
      element("main", { className: "v8-entry__main" }, [
        element("div", { className: "v8-entry__intro" }, [
          element("span", { className: "v8-entry__eyebrow", text: "PROTECTION DU COMPTE" }),
          element("h1", { className: "v8-entry__title", id: "v8-recovery-title", text: "Choisissez un nouveau mot de passe" }),
          element("p", { className: "v8-entry__brand-line", text: "Cette session a été validée par le lien de récupération Supabase." })
        ]),
        panel
      ]),
      element("footer", { className: "v8-entry__footer" }, [
        element("span", { className: "v8-entry__privacy" }, [icon("shield"), element("span", { text: "ETHONE ne conserve jamais votre mot de passe." })])
      ])
    ])
  ]);

  root.replaceChildren(surface);
  root.dataset.entryState = "recovery";
  document.documentElement.dataset.entry = "recovery";
  refreshIcons();
  queueMicrotask(() => first.input.focus({ preventScroll: true }));

  function showFeedback(message, type = "error") {
    feedback.textContent = String(message || "");
    feedback.dataset.type = message ? type : "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (first.input.value !== confirmation.input.value) {
      setFieldState(confirmation.input, "invalid", "Les deux mots de passe ne correspondent pas.");
      showFeedback("Les deux mots de passe ne correspondent pas.");
      confirmation.input.focus();
      return;
    }
    showFeedback("");
    const submission = await runFormSubmission({ form, submit, status: feedback, messages: { loading: "Mise à jour sécurisée..." }, task: () => auth.updatePassword(first.input.value) });
    if (!submission.accepted) return;
    const response = submission.value;
    if (submission.error || !response) {
      showFeedback("La mise a jour est momentanement indisponible.");
      return;
    }
    if (!response.ok) {
      first.input.value = "";
      confirmation.input.value = "";
      setFieldState(first.input, "invalid", response.message);
      showFeedback(response.message);
      first.input.focus();
      return;
    }
    showFeedback(response.message, "success");
    await options.onCompleted?.(response.data);
  }, { signal: abortController.signal });

  signOut.addEventListener("click", () => options.onSignOut?.(), { signal: abortController.signal });

  return () => {
    abortController.abort();
    first.input.value = "";
    confirmation.input.value = "";
    surface.remove();
    root.removeAttribute("data-entry-state");
    if (document.documentElement.dataset.entry === "recovery") delete document.documentElement.dataset.entry;
  };
}
