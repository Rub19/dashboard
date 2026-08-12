import { actionButton, element, icon } from "../ui/dom.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { createTeamManager } from "../services/team-manager.mjs";
import { statusState } from "../ui/empty-state.mjs";

const ROLE_LABELS = {
  owner: "Propriétaire",
  admin: "Administrateur",
  senior: "Senior",
  junior: "Junior",
  assistant: "Assistant",
  viewer: "Lecteur"
};

function roleBadge(role) {
  return element("span", { className: `v8-badge v8-badge--${role}` }, [element("span", { text: ROLE_LABELS[role] || role })]);
}

function statusBadge(status) {
  const tone = status === "active" ? "success" : status === "pending" ? "warning" : status === "revoked" ? "error" : "neutral";
  const label = { active: "Actif", pending: "En attente", declined: "Refusé", revoked: "Révoqué" }[status] || status;
  return element("span", { className: `v8-badge v8-badge--${tone}` }, [element("span", { text: label })]);
}

function memberAvatar(member) {
  if (member.avatarUrl) return element("img", { className: "v8-team-member__avatar", attributes: { src: member.avatarUrl, alt: "" } });
  return element("span", { className: "v8-team-member__avatar v8-team-member__avatar--initials" }, [element("span", { text: member.initials })]);
}

function memberRow(member, handlers) {
  const roleSelect = element("select", { className: "v8-input v8-team-member__role" }, Object.entries(ROLE_LABELS).filter(([key]) => key !== "owner").map(([key, label]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    option.selected = key === member.role;
    return option;
  }));
  roleSelect.addEventListener("change", () => handlers.onChangeRole(member.id, roleSelect.value));

  const actions = [];
  if (member.status !== "revoked") actions.push(element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Révoquer" }, events: { click: () => handlers.onRevoke(member.id) } }, [icon("ban")]));
  actions.push(element("button", { className: "v8-icon-button v8-icon-button--danger", attributes: { type: "button", "aria-label": "Supprimer" }, events: { click: () => handlers.onRemove(member.id) } }, [icon("trash-2")]));

  return element("li", { className: "v8-team-member" }, [
    memberAvatar(member),
    element("div", { className: "v8-team-member__copy" }, [
      element("strong", { text: member.displayName || member.email }),
      element("small", { text: member.email })
    ]),
    element("div", { className: "v8-team-member__badges" }, [roleBadge(member.role), statusBadge(member.status)]),
    element("div", { className: "v8-team-member__actions" }, [roleSelect, ...actions])
  ]);
}

function emptyMembers() {
  return statusState("empty", { title: "Aucun membre", description: "Invitez un collègue pour démarrer.", compact: true, inline: true });
}

export function mountTeam(stage, options = {}) {
  const ownerId = options.ownerId || "";
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const clientProvider = typeof options.clientProvider === "function" ? options.clientProvider : null;
  const externalServices = options.externalServices || null;
  const sendEmail = externalServices?.execute
    ? async (payload) => {
      try {
        const result = await externalServices.execute("teamInvite", {
          email: payload.email,
          display_name: payload.displayName,
          invite_url: payload.url,
          token: payload.token
        });
        return result?.data || { sent: false };
      } catch {
        return { sent: false };
      }
    }
    : null;
  const teamManager = createTeamManager({ ownerId, storage: options.storage, clientProvider, sendEmail });

  const page = element("section", { className: "v8-page v8-team-page" }, [
    element("header", { className: "v8-page-heading v8-team-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Collaboration" }),
        element("div", { className: "v8-title-line" }, [element("h1", { text: "Équipe" })]),
        element("p", { text: "Invitez des membres, définissez leurs rôles et gérez l'accès aux fichiers." })
      ])
    ]),
    element("div", { className: "v8-team-invite" }, [
      element("div", { className: "v8-team-invite__header" }, [
        icon("user-plus"),
        element("div", {}, [
          element("h2", { text: "Inviter un membre" }),
          element("p", { text: "Partagez des tâches et des fichiers avec votre équipe." })
        ])
      ]),
      element("div", { className: "v8-team-invite__form" }, [
        element("div", { className: "v8-team-invite__field" }, [
          icon("mail"),
          element("input", { className: "v8-input v8-team-invite__email", attributes: { type: "email", placeholder: "collegue@exemple.com", "aria-label": "E-mail du membre" } })
        ]),
        element("select", { className: "v8-team-invite__role", attributes: { "aria-label": "Rôle du membre" } },
          Object.entries(ROLE_LABELS).filter(([key]) => key !== "owner").map(([key, label]) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = label;
            return option;
          })
        ),
        actionButton({ actionId: "v8.team.invite", variant: "primary" }, [icon("send"), element("span", { text: "Inviter" })])
      ]),
      element("div", { className: "v8-team-invite__feedback", attributes: { role: "status", "aria-live": "polite" } })
    ]),
    element("div", { className: "v8-team-list" }, [
      element("h2", { className: "v8-team-list__title", text: "Membres" }),
      element("ul", { className: "v8-team-members" }, [emptyMembers()])
    ])
  ]);

  stage.replaceChildren(page);

  const emailInput = page.querySelector(".v8-team-invite__email");
  const roleSelectEl = page.querySelector(".v8-team-invite__role");
  const inviteButton = page.querySelector('[data-action="v8.team.invite"]') || page.querySelector(".v8-team-invite__form .v8-button");
  const membersList = page.querySelector(".v8-team-members");
  const feedback = page.querySelector(".v8-team-invite__feedback");

  function showFeedback(message, type = "info") {
    feedback.textContent = message;
    feedback.dataset.type = type;
    if (message) setTimeout(() => { feedback.textContent = ""; delete feedback.dataset.type; }, 5000);
  }

  function renderInviteLink(url) {
    const existing = page.querySelector(".v8-team-invite__link");
    if (existing) existing.remove();
    if (!url) return;
    const linkHost = element("div", { className: "v8-team-invite__link" }, [
      element("p", { text: "Lien d'invitation généré :" }),
      element("input", { className: "v8-input", attributes: { type: "text", value: url, readonly: true, "aria-label": "Lien d'invitation" } }),
      element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: () => copyUrl(url) } }, [icon("copy"), element("span", { text: "Copier" })])
    ]);
    feedback.after(linkHost);
  }

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      showFeedback("Lien copié dans le presse-papiers.", "success");
    } catch {
      showFeedback("Impossible de copier automatiquement.", "error");
    }
  }

  function render(state = { members: [], loading: false }) {
    const members = state.members || [];
    membersList.replaceChildren(...members.length ? members.map((m) => memberRow(m, {
      onChangeRole: async (id, role) => {
        const result = await teamManager.updateRole(id, role);
        if (!result.ok) showFeedback(result.message, "error");
      },
      onRemove: async (id) => {
        const result = await teamManager.remove(id);
        if (result.ok) showFeedback("Membre supprimé.", "success");
        else showFeedback(result.message, "error");
      },
      onRevoke: async (id) => {
        const result = await teamManager.revoke(id);
        if (result.ok) showFeedback("Accès révoqué.", "warning");
        else showFeedback(result.message, "error");
      }
    })) : [emptyMembers()]);
    if (state.loading) membersList.classList.add("is-loading");
    else membersList.classList.remove("is-loading");
    refreshIcons(page);
  }

  async function doInvite() {
    const email = emailInput?.value;
    const role = roleSelectEl?.value || "viewer";
    const result = await teamManager.invite({ email, role });
    if (result.ok) {
      emailInput.value = "";
      showFeedback("Invitation enregistrée.", "success");
      if (result.url) renderInviteLink(result.url);
    } else {
      showFeedback(result.message, "error");
    }
  }

  inviteButton?.addEventListener("click", doInvite);
  emailInput?.addEventListener("keydown", (event) => { if (event.key === "Enter") doInvite(); });

  const release = teamManager.subscribe(render);

  render();
  refreshIcons(page);

  return () => {
    release();
    teamManager.destroy();
  };
}
