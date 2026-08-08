import { element, icon } from "../ui/dom.mjs";
import { statusState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";

function getHashQuery() {
  const hash = String(globalThis.location?.hash || "");
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return new URLSearchParams();
  return new URLSearchParams(hash.slice(queryIndex));
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value === 0) return "0 o";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let index = 0;
  let size = value;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function mimeIcon(mimeType = "") {
  const type = String(mimeType).toLowerCase();
  if (type.includes("image")) return "image";
  if (type.includes("video")) return "video";
  if (type.includes("audio")) return "music";
  if (type.includes("pdf")) return "file-text";
  if (type.includes("zip") || type.includes("compressed")) return "folder-archive";
  if (type.includes("text")) return "file-code-2";
  return "file";
}

export function mountDrop(stage, options = {}) {
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const externalServices = options.externalServices || null;
  const page = element("section", { className: "v8-page v8-drop-page", dataset: { page: "drop" } }, [
    element("header", { className: "v8-page-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Drop ETHONE" }),
        element("h1", { text: "Déposer un fichier" })
      ])
    ]),
    element("div", { className: "v8-drop-workspace" })
  ]);
  const workspace = page.querySelector(".v8-drop-workspace");
  stage.replaceChildren(page);

  const query = getHashQuery();
  let slug = query.get("slug") || "";
  let password = query.get("password") || "";
  let state = { loading: true, error: "", needsPassword: false, drop: null, received: [] };

  function render() {
    workspace.replaceChildren();
    if (state.loading) {
      workspace.append(statusState("loading", { iconName: "loader", title: "Chargement", description: "Récupération du drop...", compact: true }));
      refreshIcons();
      return;
    }
    if (state.error) {
      workspace.append(statusState("error", { iconName: "triangle-alert", title: "Drop inaccessible", description: state.error, compact: true }));
      refreshIcons();
      return;
    }
    if (state.needsPassword) {
      const passwordInput = element("input", { className: "v8-input", attributes: { type: "password", placeholder: "Mot de passe", "aria-label": "Mot de passe du drop" } });
      const submit = element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [icon("lock"), element("span", { text: "Ouvrir" })]);
      const form = element("form", { className: "v8-drop-password", events: { submit: (event) => { event.preventDefault(); password = passwordInput.value; load(); } } }, [
        element("p", { text: "Ce drop est protégé par un mot de passe." }),
        passwordInput,
        submit
      ]);
      workspace.append(statusState("info", { iconName: "lock", title: "Drop protégé", description: "", compact: true, actions: [form] }));
      refreshIcons();
      return;
    }
    const drop = state.drop;
    const maxSizeText = drop?.maxSize > 0 ? `Maximum ${formatBytes(drop.maxSize)} par fichier.` : "";
    const maxFilesText = drop?.maxFiles > 0 ? `${drop.fileCount || 0} / ${drop.maxFiles} fichiers reçus.` : "";
    const input = element("input", { attributes: { type: "file", multiple: true, "aria-label": "Fichiers à déposer" }, style: "display:none" });
    const dropZone = element("div", { className: "v8-drop-zone", text: "Glissez des fichiers ici ou cliquez pour choisir", events: { click: () => input.click(), dragover: (event) => { event.preventDefault(); dropZone.classList.add("is-dragover"); }, dragleave: () => dropZone.classList.remove("is-dragover"), drop: (event) => { event.preventDefault(); dropZone.classList.remove("is-dragover"); uploadFiles(event.dataTransfer.files); } } });
    input.addEventListener("change", () => uploadFiles(input.files));
    const receivedList = state.received.length
      ? element("ul", { className: "v8-drop-received" }, state.received.map((file) => element("li", {}, [icon(mimeIcon(file.mimeType)), element("span", { text: file.name }), element("small", { text: formatBytes(file.size) })])))
      : null;
    workspace.append(
      element("div", { className: "v8-drop-card" }, [
        element("h2", { text: drop?.title || "Drop" }),
        drop?.description ? element("p", { text: drop.description }) : null,
        maxSizeText ? element("p", { className: "v8-drop-limit", text: maxSizeText }) : null,
        maxFilesText ? element("p", { className: "v8-drop-limit", text: maxFilesText }) : null,
        dropZone,
        input,
        receivedList
      ].filter(Boolean))
    );
    refreshIcons();
  }

  async function load() {
    if (!externalServices?.cloudDrops?.resolve) {
      state = { ...state, loading: false, error: "Le service de drop n'est pas disponible." };
      render();
      return;
    }
    if (!slug) {
      state = { ...state, loading: false, error: "Aucun lien de drop fourni." };
      render();
      return;
    }
    state = { ...state, loading: true, error: "", needsPassword: false };
    render();
    try {
      const result = await externalServices.cloudDrops.resolve(slug, password);
      state = { ...state, loading: false, drop: result?.data?.drop };
    } catch (err) {
      const code = err?.code || "";
      if (code === "DROP_PASSWORD_REQUIRED" || code === "AUTH_REQUIRED") {
        state = { ...state, loading: false, needsPassword: true };
      } else {
        state = { ...state, loading: false, error: err?.message || "Ce drop n'est pas disponible." };
      }
    }
    render();
  }

  async function uploadFiles(fileList) {
    const drop = state.drop;
    if (!drop || !externalServices?.cloudDrops?.upload) return;
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (drop.maxFiles > 0 && drop.fileCount + files.length > drop.maxFiles) {
      notify({ id: "drop-limit", title: "Drop", message: "Limite de fichiers atteinte.", type: "warning" });
      return;
    }
    for (const file of files) {
      if (drop.maxSize > 0 && file.size > drop.maxSize) {
        notify({ id: "drop-size", title: "Drop", message: `${file.name} dépasse la taille maximale.`, type: "warning" });
        continue;
      }
      try {
        const result = await externalServices.cloudDrops.upload(slug, file, { password });
        const uploaded = result?.data?.file;
        if (uploaded) {
          state.received = [...state.received, uploaded];
        }
        state.drop = { ...state.drop, fileCount: (state.drop.fileCount || 0) + 1 };
        notify({ id: "drop-upload", title: "Drop", message: `${file.name} reçu.`, type: "success", duration: 2200 });
      } catch (err) {
        notify({ id: "drop-upload-error", title: "Drop", message: `${file.name} : ${err.message || "Échec."}`, type: "error" });
      }
    }
    render();
  }

  load();
  refreshIcons();
  return () => page.remove();
}
