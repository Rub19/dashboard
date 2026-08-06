import { brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function avatar(profile) {
  const inner = profile.avatarUrl
    ? element("span", { className: "v8-github-avatar__image" }, [element("img", {
      attributes: { src: profile.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-github-avatar__image is-fallback" }, [icon("github")]);
  return element("span", { className: "v8-github-avatar" }, [inner, livePulseDot()]);
}

export function githubLiveCard(profile = {}, options = {}) {
  if (profile.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const activity = profile.recentEvent ? `${profile.recentEvent.kind} sur ${profile.recentEvent.repo}` : `${profile.publicRepos} depot${profile.publicRepos > 1 ? "s" : ""} public${profile.publicRepos > 1 ? "s" : ""} - ${profile.followers} abonne${profile.followers > 1 ? "s" : ""}`;

  const front = element("div", { className: `v8-github-live v8-github-live--${variant} v8-surface v8-live-card-front` }, [
    avatar(profile),
    element("div", { className: "v8-github-live__body" }, [
      element("div", { className: "v8-github-live__meta" }, [
        brandIcon("github", "github", "v8-live-brand-mark"),
        element("small", { text: `@${profile.login}` })
      ]),
      element("strong", { text: profile.name, attributes: { translate: "no" } }),
      element("p", { text: activity, attributes: { translate: "no" } }),
      liveFreshnessNode(profile.updatedAt)
    ]),
    profile.htmlUrl ? element("a", {
      className: "v8-icon-button v8-github-live__link",
      attributes: { href: profile.htmlUrl, target: "_blank", rel: "noopener noreferrer", "aria-label": "Ouvrir le profil GitHub" }
    }, [icon("arrow-up-right")]) : null
  ]);

  const back = element("div", { className: "v8-live-card-back v8-github-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [brandIcon("github", "github", "v8-live-brand-mark"), element("strong", { text: "GitHub", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: profile.name, attributes: { translate: "no" } }),
      element("p", { text: `@${profile.login}`, attributes: { translate: "no" } }),
      element("p", { text: `${profile.publicRepos} dépôt(s) public(s)` }),
      element("p", { text: `${profile.followers} abonné(s)` })
    ]),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: profile.recentEvent ? `${profile.recentEvent.kind} sur ${profile.recentEvent.repo}` : "GitHub", attributes: { translate: "no" } })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-github-live v8-github-live--${variant}`,
    attributes: { "aria-label": "Profil GitHub" },
    dataset: { liveWidget: "media", liveKind: "profile" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input")) return;
    card.classList.toggle("is-flipped");
  });

  return card;
}
