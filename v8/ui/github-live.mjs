import { element, icon } from "./dom.mjs";

function avatar(profile) {
  const inner = profile.avatarUrl
    ? element("span", { className: "v8-github-avatar__image" }, [element("img", {
      attributes: { src: profile.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-github-avatar__image is-fallback" }, [icon("github")]);
  return element("span", { className: "v8-github-avatar" }, [inner]);
}

export function githubLiveCard(profile = {}, options = {}) {
  if (profile.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const activity = profile.recentEvent ? `${profile.recentEvent.kind} sur ${profile.recentEvent.repo}` : `${profile.publicRepos} depot${profile.publicRepos > 1 ? "s" : ""} public${profile.publicRepos > 1 ? "s" : ""} - ${profile.followers} abonne${profile.followers > 1 ? "s" : ""}`;
  return element(options.tagName || "article", {
    className: `v8-github-live v8-github-live--${variant} v8-surface`,
    attributes: { "aria-label": "Profil GitHub" },
    dataset: { liveWidget: "media", liveKind: "profile" }
  }, [
    avatar(profile),
    element("div", { className: "v8-github-live__body" }, [
      element("div", { className: "v8-github-live__meta" }, [
        icon("github"),
        element("small", { text: `@${profile.login}` })
      ]),
      element("strong", { text: profile.name, attributes: { translate: "no" } }),
      element("p", { text: activity, attributes: { translate: "no" } })
    ]),
    profile.htmlUrl ? element("a", {
      className: "v8-icon-button v8-github-live__link",
      attributes: { href: profile.htmlUrl, target: "_blank", rel: "noopener noreferrer", "aria-label": "Ouvrir le profil GitHub" }
    }, [icon("arrow-up-right")]) : null
  ]);
}
