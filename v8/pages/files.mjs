import { actionButton, element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { filterFiles, sortFiles } from "./files-model.mjs";

const TYPE_ICONS = Object.freeze({
  folder: "folder",
  link: "link-2",
  image: "image",
  video: "video",
  code: "file-code-2",
  doc: "file-text",
  file: "file"
});

function completed(message, data = null) {
  return { ok: true, status: "completed", message, data };
}

function typeLabel(type) {
  return ({ folder: "Dossier", link: "Lien", image: "Image", video: "Vidéo", code: "Code", doc: "Document", file: "Fichier" })[type] || "Fichier";
}

export function mountFiles(stage, options = {}) {
  const repository = options.repository;
  const actions = options.actions;
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const presence = options.presence || null;
  let files = repository.snapshot().files.map((file) => ({ ...file }));
  let selectedId = files[0]?.id || null;
  let query = "";
  let type = "all";
  let favorites = false;
  let sort = "recent";
  let composerType = null;
  let view = repository.snapshot().filesView === "grid" ? "grid" : "list";
  let mounted = true;
  const scopedActions = [];

  const countBadge = element("span", { className: "v8-badge" });
  const search = element("input", { className: "v8-input", attributes: { type: "search", placeholder: "Rechercher dans Fichiers", "aria-label": "Rechercher dans Fichiers", autocomplete: "off" } });
  const sources = element("div", { className: "v8-files-sources", attributes: { role: "group", "aria-label": "Sources" } });
  const content = element("div", { className: "v8-files-content" });
  const preview = element("aside", { className: "v8-files-preview", attributes: { "aria-label": "Aperçu du fichier" } });
  const page = element("section", { className: "v8-page v8-work-page", dataset: { page: "files" } }, [
    element("header", { className: "v8-page-heading v8-work-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Bibliothèque synchronisée" }),
        element("div", { className: "v8-title-line" }, [element("h1", { text: "Fichiers" }), countBadge]),
        element("p", { text: "Retrouvez vos ressources, puis agissez depuis un aperçu unique." })
      ]),
      element("div", { className: "v8-page-heading__actions" }, [
        actionButton({ actionId: "v8.files.new-folder", variant: "secondary" }, [icon("folder-plus"), element("span", { text: "Dossier" })]),
        actionButton({ actionId: "v8.files.new-link", variant: "primary" }, [icon("link-2"), element("span", { text: "Ajouter un lien" })])
      ])
    ]),
    element("section", { className: "v8-work-surface v8-files-workspace" }, [
      element("aside", { className: "v8-files-sidebar" }, [
        element("span", { className: "v8-eyebrow", text: "Bibliothèque" }),
        sources,
        element("div", { className: "v8-files-import-soon" }, [
          icon("upload-cloud"),
          element("strong", { text: "Import de fichiers" }),
          element("span", { text: "Coming Soon dans ETHONE" }),
          element("span", { className: "v8-badge v8-badge--accent", text: "Données préservées" })
        ])
      ]),
      element("div", { className: "v8-files-main" }, [
        element("header", { className: "v8-files-toolbar" }, [
          element("div", { className: "v8-input-wrap v8-files-search" }, [icon("search"), search]),
          element("div", { className: "v8-files-toolbar__tools" }, [
            element("select", { className: "v8-input", attributes: { "aria-label": "Trier les fichiers" } }, [
              element("option", { text: "Récents", attributes: { value: "recent" } }),
              element("option", { text: "Nom", attributes: { value: "name" } }),
              element("option", { text: "Type", attributes: { value: "type" } })
            ]),
            element("div", { className: "v8-view-switch", attributes: { role: "group", "aria-label": "Affichage" } }, [
              element("button", { className: view === "list" ? "is-active" : "", attributes: { type: "button", "aria-label": "Vue liste", "aria-pressed": view === "list" ? "true" : "false" }, dataset: { filesView: "list" } }, [icon("list")]),
              element("button", { className: view === "grid" ? "is-active" : "", attributes: { type: "button", "aria-label": "Vue grille", "aria-pressed": view === "grid" ? "true" : "false" }, dataset: { filesView: "grid" } }, [icon("grid-2x2")])
            ])
          ])
        ]),
        content
      ]),
      preview
    ])
  ]);

  const sortSelect = page.querySelector("[aria-label='Trier les fichiers']");

  function refreshFiles() {
    files = repository.snapshot().files.map((file) => ({ ...file }));
    if (!files.some((file) => String(file.id) === String(selectedId))) selectedId = files[0]?.id || null;
  }

  function visibleFiles() {
    return sortFiles(filterFiles(files, { query, type, favorites }), sort);
  }

  function selectedFile() {
    return files.find((file) => String(file.id) === String(selectedId)) || null;
  }

  function fileRow(id) {
    return [...content.querySelectorAll("[data-file-id]")]
      .find((row) => row.dataset.fileId === String(id)) || null;
  }

  function renderSources() {
    const entries = [
      { id: "all", label: "Tous les fichiers", icon: "files", count: files.length },
      { id: "favorites", label: "Favoris", icon: "star", count: files.filter((file) => file.favorite).length },
      { id: "link", label: "Liens", icon: "link-2", count: files.filter((file) => file.type === "link").length },
      { id: "folder", label: "Dossiers", icon: "folder", count: files.filter((file) => file.type === "folder").length }
    ];
    sources.replaceChildren();
    entries.forEach((entry) => {
      const active = entry.id === "favorites" ? favorites : (!favorites && type === entry.id);
      sources.append(element("button", {
        className: active ? "is-active" : "",
        attributes: { type: "button", "aria-pressed": active ? "true" : "false" },
        dataset: { filesSource: entry.id }
      }, [icon(entry.icon), element("span", { text: entry.label }), element("small", { text: entry.count })]));
    });
    const nextCount = `${files.length} élément${files.length > 1 ? "s" : ""}`;
    if (presence) presence.transitionText(countBadge, nextCount, { kind: "metric" });
    else countBadge.textContent = nextCount;
    refreshIcons();
  }

  function renderContent() {
    const filtered = visibleFiles();
    content.replaceChildren();
    content.dataset.view = view;

    if (composerType) {
      const name = element("input", { className: "v8-input", attributes: { type: "text", placeholder: composerType === "folder" ? "Nom du dossier" : "Nom du lien", "aria-label": "Nom de l'élément", maxlength: "180", required: "", autocomplete: "off" }, dataset: { fileField: "name" } });
      const url = element("input", { className: "v8-input", attributes: { type: "url", placeholder: "https://", "aria-label": "Adresse du lien", required: composerType === "link" ? "" : null, autocomplete: "url" }, dataset: { fileField: "url" } });
      const tag = element("input", { className: "v8-input", attributes: { type: "text", placeholder: "Tag", "aria-label": "Tag du fichier", maxlength: "80", autocomplete: "off" }, dataset: { fileField: "tag" } });
      const form = element("form", { className: "v8-files-composer", attributes: { "aria-label": composerType === "folder" ? "Nouveau dossier" : "Nouveau lien" } }, [
        name,
        composerType === "link" ? url : null,
        tag,
        element("div", {}, [
          actionButton({ actionId: "v8.files.new.cancel" }, [element("span", { text: "Annuler" })]),
          actionButton({ actionId: "v8.files.create", variant: "primary" }, [icon("plus"), element("span", { text: "Ajouter" })])
        ])
      ]);
      form.addEventListener("submit", (event) => { event.preventDefault(); createFile(); }, { once: true });
      content.append(form);
      name.focus({ preventScroll: true });
    }

    const collection = element("div", { className: `v8-files-collection v8-files-collection--${view}`, attributes: { role: "list", "aria-label": "Fichiers" } });
    if (!filtered.length) {
      const hasFilters = Boolean(query || type !== "all" || favorites);
      const reset = hasFilters ? element("button", {
        className: "v8-button v8-button--primary",
        text: "Voir toute la bibliothèque",
        attributes: { type: "button" },
        events: {
          click: () => {
            query = "";
            type = "all";
            favorites = false;
            search.value = "";
            renderAll();
            search.focus({ preventScroll: true });
          }
        }
      }) : null;
      collection.append(emptyState({
        iconName: hasFilters ? "search-x" : "folder-open",
        eyebrow: hasFilters ? "Recherche terminée" : "Bibliothèque prête",
        title: hasFilters ? "Aucun résultat" : "Votre bibliothèque vous attend",
        description: hasFilters ? "Aucune ressource ne correspond à ces filtres." : "Ajoutez un lien ou créez un dossier pour construire votre espace documentaire.",
        actions: hasFilters
          ? [reset]
          : [
            actionButton({ actionId: "v8.files.new-link", variant: "primary" }, [icon("link-2"), element("span", { text: "Ajouter un lien" })]),
            actionButton({ actionId: "v8.files.new-folder", variant: "secondary" }, [icon("folder-plus"), element("span", { text: "Créer un dossier" })])
          ],
        brain: hasFilters ? null : {
          title: "Suggestion Brain",
          description: "Brain peut vous aider à choisir une structure simple pour démarrer.",
          action: actionButton({ actionId: "v8.brain.open", variant: "secondary" }, [icon("brain"), element("span", { text: "Demander à Brain" })])
        },
        className: "v8-empty-state--wide"
      }));
    } else {
      filtered.forEach((file) => {
        const active = String(file.id) === String(selectedId);
        collection.append(element("button", {
          className: `v8-file-item${active ? " is-active" : ""}`,
          attributes: { type: "button", role: "listitem", "aria-current": active ? "true" : null },
          dataset: { fileId: file.id, liveWidget: "planning", liveKind: "planning" }
        }, [
          element("span", { className: "v8-file-item__icon" }, [icon(TYPE_ICONS[file.type] || "file")]),
          element("span", { className: "v8-file-item__copy" }, [element("strong", { text: file.name, attributes: { translate: "no" } }), element("small", { text: `${typeLabel(file.type)}${file.tag ? ` · ${file.tag}` : ""}`, attributes: file.tag ? { translate: "no" } : {} })]),
          file.favorite ? element("span", { className: "v8-file-item__favorite", attributes: { "aria-label": "Favori" } }, [icon("star")]) : null,
          element("time", { text: file.date || "Local", attributes: file.date ? { translate: "no" } : {} })
        ]));
      });
    }
    content.append(collection);
    refreshIcons();
  }

  function renderPreview() {
    preview.replaceChildren();
    const file = selectedFile();
    if (!file) {
      preview.append(emptyState({
        iconName: "panel-right",
        eyebrow: "Aperçu",
        title: "Rien à prévisualiser",
        description: "Sélectionnez une ressource ou ajoutez votre premier lien.",
        actions: [actionButton({ actionId: "v8.files.new-link", variant: "secondary" }, [icon("link-2"), element("span", { text: "Ajouter un lien" })])],
        compact: true,
        className: "v8-empty-state--fill"
      }));
      refreshIcons();
      return;
    }
    preview.append(
      element("header", { className: "v8-files-preview__header" }, [element("span", { className: "v8-eyebrow", text: "Aperçu" }), element("span", { className: "v8-badge", text: typeLabel(file.type) })]),
      element("div", { className: "v8-files-preview__symbol" }, [icon(TYPE_ICONS[file.type] || "file")]),
      element("h2", { text: file.name, attributes: { translate: "no" } }),
      element("p", { text: file.url || (file.type === "folder" ? "Dossier local ETHONE" : "Ressource locale"), attributes: file.url ? { translate: "no" } : {} }),
      element("dl", { className: "v8-files-metadata" }, [
        element("div", {}, [element("dt", { text: "Type" }), element("dd", { text: typeLabel(file.type) })]),
        element("div", {}, [element("dt", { text: "Tag" }), element("dd", { text: file.tag || "Aucun", attributes: file.tag ? { translate: "no" } : {} })]),
        element("div", {}, [element("dt", { text: "Ajouté" }), element("dd", { text: file.date || "Localement", attributes: file.date ? { translate: "no" } : {} })])
      ]),
      element("div", { className: "v8-files-preview__actions" }, [
        file.url ? element("a", { className: "v8-button v8-button--primary", attributes: { href: file.url, target: "_blank", rel: "noopener noreferrer" } }, [icon("external-link"), element("span", { text: "Ouvrir" })]) : null,
        element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { fileFavorite: file.id } }, [icon(file.favorite ? "star-off" : "star"), element("span", { text: file.favorite ? "Retirer des favoris" : "Ajouter aux favoris" })]),
        element("button", { className: "v8-button v8-button--danger", attributes: { type: "button" }, dataset: { fileDelete: file.id } }, [icon("trash-2"), element("span", { text: "Supprimer" })])
      ])
    );
    refreshIcons();
  }

  function renderAll() {
    renderSources();
    renderContent();
    renderPreview();
  }

  function openComposer(nextType) {
    composerType = nextType;
    renderContent();
    return completed("Formulaire ouvert");
  }

  function closeComposer() {
    composerType = null;
    renderContent();
    return completed("Formulaire fermé");
  }

  function createFile() {
    const name = content.querySelector("[data-file-field='name']");
    if (!name?.value.trim()) {
      name?.focus({ preventScroll: true });
      notify({ id: "file-name-required", title: "Fichiers", message: "Ajoutez un nom avant de continuer.", type: "warning" });
      return { ok: false, status: "failed", message: "Nom requis" };
    }
    const created = repository.files.create({
      name: name.value,
      type: composerType,
      url: content.querySelector("[data-file-field='url']")?.value,
      tag: content.querySelector("[data-file-field='tag']")?.value
    });
    if (!created.ok) {
      notify({ id: "file-create-error", title: "Fichiers", message: created.message, type: "error" });
      return created;
    }
    composerType = null;
    refreshFiles();
    selectedId = created.data.id;
    renderAll();
    presence?.signalActivity?.(fileRow(created.data.id), "file", { phase: "enter" });
    presence?.signalActivity?.(preview, "file", { phase: "update" });
    notify({ id: "file-created", title: "Fichiers", message: `${typeLabel(created.data.type)} ajouté.`, type: "success", duration: 2200 });
    return created;
  }

  scopedActions.push(actions.scope("v8.files.new-link", () => openComposer("link")));
  scopedActions.push(actions.scope("v8.files.new-folder", () => openComposer("folder")));
  scopedActions.push(actions.scope("v8.files.new.cancel", closeComposer));
  scopedActions.push(actions.scope("v8.files.create", createFile));

  function handleClick(event) {
    const source = event.target.closest("[data-files-source]");
    if (source && page.contains(source)) {
      const id = source.dataset.filesSource;
      favorites = id === "favorites";
      type = id === "favorites" ? "all" : id;
      renderAll();
      return;
    }
    const viewControl = event.target.closest("[data-files-view]");
    if (viewControl && page.contains(viewControl)) {
      view = viewControl.dataset.filesView === "grid" ? "grid" : "list";
      repository.files.setView(view);
      [...page.querySelectorAll("[data-files-view]")].forEach((button) => {
        const active = button.dataset.filesView === view;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      renderContent();
      return;
    }
    const item = event.target.closest("[data-file-id]");
    if (item && page.contains(item)) {
      selectedId = item.dataset.fileId;
      renderContent();
      renderPreview();
      return;
    }
    const favorite = event.target.closest("[data-file-favorite]");
    if (favorite && page.contains(favorite)) {
      const changed = repository.files.toggleFavorite(favorite.dataset.fileFavorite);
      if (changed.ok) {
        refreshFiles();
        renderAll();
        presence?.signalActivity?.(fileRow(changed.data.id), "file", { phase: "update" });
      }
      return;
    }
    const remove = event.target.closest("[data-file-delete]");
    if (remove && page.contains(remove)) {
      const id = remove.dataset.fileDelete;
      const row = fileRow(id);
      const changed = repository.files.remove(id);
      if (changed.ok) {
        refreshFiles();
        notify({ id: "file-deleted", title: "Fichiers", message: "Élément supprimé.", type: "info", duration: 2200 });
        presence?.signalActivity?.(preview, "file", { phase: "exit" });
        const finish = () => { if (mounted) renderAll(); };
        if (presence?.signalActivity) presence.signalActivity(row, "file", { phase: "exit", onComplete: finish });
        else finish();
      }
    }
  }

  function handleSearch() {
    query = search.value;
    renderContent();
  }

  function handleSort() {
    sort = sortSelect.value;
    renderContent();
  }

  page.addEventListener("click", handleClick);
  search.addEventListener("input", handleSearch);
  sortSelect.addEventListener("change", handleSort);
  stage.replaceChildren(page);
  renderAll();
  refreshIcons();

  return () => {
    mounted = false;
    scopedActions.reverse().forEach((restore) => restore());
    page.removeEventListener("click", handleClick);
    search.removeEventListener("input", handleSearch);
    sortSelect.removeEventListener("change", handleSort);
    page.remove();
  };
}
