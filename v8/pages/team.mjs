import { actionButton, element, icon } from "../ui/dom.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { createTeamManager } from "../services/team-manager.mjs";
import { statusState } from "../ui/empty-state.mjs";

const ROLE_LABELS = {
  owner: "Propriétaire",
  admin: "Administrateur",
  senior: "Senior Level",
  junior: "Junior Level",
  assistant: "Assistant",
  viewer: "Lecteur"
};

const STATUS_LABELS = {
  pending: "En attente",
  active: "Actif",
  declined: "Décliné",
  revoked: "Révoqué"
};

function avatarNode(member) {
  if (member.avatarUrl) {
    return element("img", { className: "v8-team-avatar__image", attributes: { src: member.avatarUrl, alt: member.displayName || member.email, loading: "lazy" } });
  }
  const seedStyle = `background: conic-gradient(from ${Math.abs(member.seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}deg, var(--v8-accent), var(--v8-brand));`;
  const initials = element("span", { className: "v8-team-avatar__initials", text: member.initials });
  const wrapper = element("span", { className: "v8-team-avatar v8-team-avatar--generated", attributes: { style: seedStyle } }, [initials]);
  return wrapper;
}

function roleBadge(role) {
  return element("span", { className: "v8-team-role", text: ROLE_LABELS[role] || role });
}

function roleSelect(member, onChange) {
  const select = element("select", { className: "v8-team-role-select", attributes: { "aria-label": `Rôle de ${member.displayName || member.email}` } });
  for (const [key, label] of Object.entries(ROLE_LABELS)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    if (member.role === key) option.selected = true;
    select.append(option);
  }
  select.addEventListener("change", () => onChange(member.id, select.value));
  return select;
}

function memberRow(member, options = {}) {
  const onChangeRole = options.onChangeRole || (() => {});
  const onRemove = options.onRemove || (() => {});
  const onRevoke = options.onRevoke || (() => {});

  const actions = [];
  if (member.status !== "revoked") {
    actions.push(element("button", { className: "v8-team-member__action v8-icon-button", attributes: { type: "button", "aria-label": "Révoquer" }, dataset: { action: "revoke" } }, [icon("user-x")]));
  }
  actions.push(element("button", { className: "v8-team-member__action v8-icon-button", attributes: { type: "button", "aria-label": "Supprimer" }, dataset: { action: "remove" } }, [icon("trash-2")]));

  const row = element("li", { className: "v8-team-member", dataset: { status: member.status } }, [
    avatarNode(member),
    element("div", { className: "v8-team-member__meta" }, [
      element("strong", { className: "v8-team-member__name", text: member.displayName || member.email }),
      element("span", { className: "v8-team-member__email", text: member.email })
    ]),
    element("div", { className: "v8-team-member__role" }, [roleSelect(member, onChangeRole)]),
    element("div", { className: "v8-team-member__status", text: STATUS_LABELS[member.status] || member.status }),
    element("div", { className: "v8-team-member__actions" }, actions)
  ]);

  row.querySelector("[data-action='revoke']")?.addEventListener("click", () => onRevoke(member.id));
  row.querySelector("[data-action='remove']")?.addEventListener("click", () => onRemove(member.id));

  return row;
}

function emptyMembers() {
  return statusState("empty", {
    tagName: "div",
    headingTag: "h3",
    iconName: "users",
    title: "Aucun membre",
    description: "Invitez une première personne à rejoindre votre espace."
  });
}

export function mountTeam(stage, options = {}) {
  const ownerId = options.ownerId || "";
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const teamManager = createTeamManager({ ownerId, storage: options.storage });

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
    if (message) setTimeout(() => { feedback.textContent = ""; delete feedback.dataset.type; }, 4000);
  }

  function render(state = { members: teamManager.listMembers(), loading: false }) {
    const members = state.members || [];
    membersList.replaceChildren(...members.length ? members.map((m) => memberRow(m, {
      onChangeRole: (id, role) => {
        const result = teamManager.updateRole(id, role);
        if (!result.ok) showFeedback(result.message, "error");
      },
      onRemove: (id) => {
        const result = teamManager.remove(id);
        if (result.ok) showFeedback("Membre supprimé.", "success");
        else showFeedback(result.message, "error");
      },
      onRevoke: (id) => {
        const result = teamManager.revoke(id);
        if (result.ok) showFeedback("Accès révoqué.", "warning");
        else showFeedback(result.message, "error");
      }
    })) : [emptyMembers()]);
    refreshIcons(page);
  }

  function doInvite() {
    const email = emailInput?.value;
    const role = roleSelectEl?.value || "viewer";
    const result = teamManager.invite({ email, role });
    if (result.ok) {
      emailInput.value = "";
      showFeedback("Invitation envoyée.", "success");
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
