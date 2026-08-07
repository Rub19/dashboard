import { element, icon } from "../ui/dom.mjs";
import { translateSource } from "../i18n/catalog.mjs";

const PAGE_TITLE = "Sécurité";

function section(title, children = []) {
  return element("section", { className: "v8-page__section" }, [
    element("h2", { className: "v8-page__heading", text: title }),
    ...children
  ]);
}

function card(title, children = []) {
  return element("article", { className: "v8-card v8-card--outlined" }, [
    element("h3", { className: "v8-card__title", text: title }),
    element("div", { className: "v8-card__body" }, children)
  ]);
}

function list(items, emptyText) {
  if (!items.length) return element("p", { className: "v8-empty", text: emptyText });
  return element("ul", { className: "v8-list" }, items.map((item) => element("li", { className: "v8-list__item" }, [item])));
}

export function mountSecurity(root, options = {}) {
  if (!root) throw new TypeError("Security page requires a root element");
  const security = options.security;
  const notify = options.notify;
  const locale = "fr";

  root.replaceChildren();
  root.dataset.page = "security";

  const container = element("main", { className: "v8-page v8-page--security" }, [
    element("header", { className: "v8-page__header" }, [
      element("h1", { className: "v8-page__title", text: PAGE_TITLE }),
      element("p", { className: "v8-page__lead", text: "Gérez les appareils, les clés d'accès et l'activité de votre compte." })
    ])
  ]);

  const devicesBody = element("div", { className: "v8-security__body" });
  const passkeysBody = element("div", { className: "v8-security__body" });
  const eventsBody = element("div", { className: "v8-security__body" });

  container.appendChild(section("Appareils", [card("Appareils connectés", [devicesBody])]));
  container.appendChild(section("Clés d'accès", [card("Passkeys enregistrées", [passkeysBody])]));
  container.appendChild(section("Journal", [card("Événements récents", [eventsBody])]));

  root.appendChild(container);

  async function loadData() {
    try {
      const [devices, events] = await Promise.all([
        security.listDevices(),
        security.listSecurityEvents(50)
      ]);

      devicesBody.replaceChildren(list(devices.map((device) => {
        const row = element("div", { className: "v8-security__row" }, [
          element("span", { className: "v8-security__name", text: device.name || "Appareil" }),
          element("span", { className: "v8-security__meta", text: `${device.type || "unknown"} · ${device.platform || ""}` }),
          element("span", { className: `v8-security__status ${device.trusted ? "is-trusted" : device.revoked_at ? "is-revoked" : ""}`, text: device.trusted ? "Vérifié" : device.revoked_at ? "Révoqué" : "Non vérifié" })
        ]);
        const actions = element("div", { className: "v8-security__actions" });
        if (!device.trusted && !device.revoked_at) {
          const trustBtn = element("button", { className: "v8-button v8-button--small" }, [icon("shield-check"), element("span", { text: "Approuver" })]);
          trustBtn.addEventListener("click", async () => {
            try {
              await security.trustDevice(device.id, true);
              notify?.({ id: "device-trusted", title: "Appareil approuvé", message: device.name, type: "success" });
              await loadData();
            } catch (error) {
              notify?.({ id: "device-trust-failed", title: "Erreur", message: error.message, type: "error" });
            }
          });
          actions.appendChild(trustBtn);
        }
        if (!device.revoked_at) {
          const revokeBtn = element("button", { className: "v8-button v8-button--small v8-button--danger" }, [icon("x"), element("span", { text: "Révoquer" })]);
          revokeBtn.addEventListener("click", async () => {
            try {
              await security.revokeDevice(device.id);
              notify?.({ id: "device-revoked", title: "Appareil révoqué", message: device.name, type: "warning" });
              await loadData();
            } catch (error) {
              notify?.({ id: "device-revoke-failed", title: "Erreur", message: error.message, type: "error" });
            }
          });
          actions.appendChild(revokeBtn);
        }
        const removeBtn = element("button", { className: "v8-button v8-button--small" }, [icon("trash-2"), element("span", { text: "Supprimer" })]);
        removeBtn.addEventListener("click", async () => {
          try {
            await security.removeDevice(device.id);
            notify?.({ id: "device-removed", title: "Appareil supprimé", message: device.name, type: "info" });
            await loadData();
          } catch (error) {
            notify?.({ id: "device-remove-failed", title: "Erreur", message: error.message, type: "error" });
          }
        });
        actions.appendChild(removeBtn);
        return element("div", { className: "v8-security__device" }, [row, actions]);
      }), "Aucun appareil enregistré."));

      passkeysBody.replaceChildren(list(
        options.security.isAvailable() ? [element("p", { text: "Passkeys ne sont pas encore listés dynamiquement." })] : [element("p", { text: "WebAuthn n'est pas disponible dans cet environnement." })],
        "Aucune clé d'accès."
      ));

      eventsBody.replaceChildren(list(events.map((event) => {
        const date = new Date(event.created_at).toLocaleString(locale);
        return element("div", { className: "v8-security__event" }, [
          element("span", { className: "v8-security__kind", text: event.kind }),
          element("span", { className: "v8-security__time", text: date })
        ]);
      }), "Aucun événement récent."));
    } catch (error) {
      notify?.({ id: "security-load-failed", title: "Sécurité", message: error.message || "Impossible de charger les données de sécurité.", type: "error" });
    }
  }

  loadData();

  return Object.freeze({
    destroy() {
      root.replaceChildren();
      root.removeAttribute("data-page");
    }
  });
}
