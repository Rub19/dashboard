import { actionButton, element, icon } from "../ui/dom.mjs";
import { statusState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { formatBytes } from "../utils/format.mjs";

function getHashQuery() {
  const hash = String(globalThis.location?.hash || "");
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return new URLSearchParams();
  return new URLSearchParams(hash.slice(queryIndex));
}



function mimeIcon(mimeType = "") {
  const type = String(mimeType).toLowerCase();
  if (type.includes("image")) return "image";
  if (type.includes("video")) return "video";
  if (type.includes("audio")) return "music";
  if (type.includes("pdf")) return "file-text";
  if (type.includes("zip") || type.includes("compressed")) return "folder-archive";
  if (type.includes("text")) return "file-code-2";
  if (type.includes("folder") || type.includes("application/vnd.google-apps.folder")) return "folder";
  return "file";
}

export function mountShare(stage, options = {}) {
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const externalServices = options.externalServices || null;
  const page = element("section", { className: "v8-page v8-share-page", dataset: { page: "share" } }, [
    element("header", { className: "v8-page-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Partage ETHONE" }),
        element("h1", { text: "Fichier partagé" })
      ])
    ]),
    element("div", { className: "v8-share-workspace" })
  ]);
  const workspace = page.querySelector(".v8-share-workspace");
  stage.replaceChildren(page);

  const query = getHashQuery();
  let slug = query.get("slug") || "";
  let password = query.get("password") || "";
  let state = { loading: true, error: "", needsPassword: false, share: null, file: null };

  function render() {
    workspace.replaceChildren();
    if (state.loading) {
      workspace.append(statusState("loading", { iconName: "loader", title: "Chargement", description: "Récupération du partage...", compact: true }));
      refreshIcons();
      return;
    }
    if (state.error) {
      workspace.append(statusState("error", { iconName: "triangle-alert", title: "Partage inaccessible", description: state.error, compact: true }));
      refreshIcons();
      return;
    }
    if (state.needsPassword) {
      const passwordInput = element("input", { className: "v8-input", attributes: { type: "password", placeholder: "Mot de passe", "aria-label": "Mot de passe du partage" } });
      const submit = element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [icon("lock"), element("span", { text: "Ouvrir" })]);
      const form = element("form", { className: "v8-share-password", events: { submit: (event) => { event.preventDefault(); password = passwordInput.value; load(); } } }, [
        element("p", { text: "Ce partage est protégé par un mot de passe." }),
        passwordInput,
        submit
      ]);
      workspace.append(statusState("info", { iconName: "lock", title: "Partage protégé", description: "", compact: true, actions: [form] }));
      refreshIcons();
      return;
    }
    const file = state.file;
    const share = state.share;
    const expiryText = share?.expiresAt ? `Expire le ${new Date(share.expiresAt).toLocaleString()}.` : "";
    const limitText = share?.maxDownloads > 0 ? `${share.downloadCount || 0} / ${share.maxDownloads} téléchargements.` : "";
    const shareUrl = `${globalThis.location?.origin || ""}${globalThis.location?.pathname || "/"}#/share?slug=${encodeURIComponent(slug)}`;
    const downloadButton = element("button", { className: "v8-button v8-button--primary", attributes: { type: "button" }, events: { click: download } }, [icon("download"), element("span", { text: "Télécharger" })]);
    const copyButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: copyLink } }, [icon("link"), element("span", { text: "Copier le lien" })]);
    const fileIcon = icon(mimeIcon(file?.mimeType));
    const brainSummary = file?.brainSummary ? element("blockquote", { className: "v8-share-brain", text: file.brainSummary }) : null;
    const tags = Array.isArray(file?.tags) && file.tags.length
      ? element("div", { className: "v8-files-tags" }, file.tags.map((tag) => element("span", { className: "v8-badge v8-files-tag", text: tag })))
      : null;
    const thumbnail = file?.thumbnailLink ? element("img", { className: "v8-share-thumbnail", attributes: { src: file.thumbnailLink, alt: file?.name || "Aperçu" } }) : null;
    const qrCode = element("img", { className: "v8-share-qr", attributes: { src: `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}`, alt: "QR code" } });

    workspace.append(
      element("div", { className: "v8-share-card" }, [
        thumbnail || element("div", { className: "v8-share-icon" }, [fileIcon]),
        thumbnail ? null : qrCode,
        element("h2", { text: file?.name || "Fichier" }),
        element("p", { text: file?.mimeType || "application/octet-stream" }),
        tags,
        brainSummary,
        element("dl", { className: "v8-share-meta" }, [
          element("div", {}, [element("dt", { text: "Taille" }), element("dd", { text: formatBytes(file?.size) })]),
          element("div", {}, [element("dt", { text: "Téléchargements" }), element("dd", { text: limitText || "Illimité" })])
        ]),
        expiryText ? element("p", { className: "v8-share-expiry", text: expiryText }) : null,
        element("div", { className: "v8-share-actions" }, [downloadButton, copyButton])
      ].filter(Boolean))
    );
    refreshIcons();
  }

  async function load() {
    if (!externalServices?.cloudShares?.resolve) {
      state = { ...state, loading: false, error: "Le service de partage n'est pas disponible." };
      render();
      return;
    }
    if (!slug) {
      state = { ...state, loading: false, error: "Aucun lien de partage fourni." };
      render();
      return;
    }
    state = { ...state, loading: true, error: "", needsPassword: false };
    render();
    try {
      const result = await externalServices.cloudShares.resolve(slug, password);
      state = { ...state, loading: false, share: result?.data?.share, file: result?.data?.file };
    } catch (err) {
      const code = err?.code || "";
      if (code === "SHARE_PASSWORD_REQUIRED" || code === "AUTH_REQUIRED") {
        state = { ...state, loading: false, needsPassword: true };
      } else {
        state = { ...state, loading: false, error: err?.message || "Ce partage n'est pas disponible." };
      }
    }
    render();
  }

  async function download() {
    if (!externalServices?.cloudShares?.download) return;
    try {
      const { blob } = await externalServices.cloudShares.download(slug, password);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = state.file?.name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify({ id: "share-download", title: "Partage", message: "Téléchargement démarré.", type: "success", duration: 2200 });
    } catch (err) {
      notify({ id: "share-download-error", title: "Partage", message: err.message || "Impossible de télécharger.", type: "error" });
    }
  }

  async function copyLink() {
    const shareUrl = `${globalThis.location?.origin || ""}${globalThis.location?.pathname || "/"}#/share?slug=${encodeURIComponent(slug)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify({ id: "share-link-copied", title: "Partage", message: "Lien copié dans le presse-papiers.", type: "success", duration: 2200 });
    } catch {
      notify({ id: "share-link-copy-error", title: "Partage", message: "Impossible de copier le lien.", type: "error" });
    }
  }

  load();
  refreshIcons();
  return () => page.remove();
}
