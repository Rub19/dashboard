import { actionButton, element, icon } from "../ui/dom.mjs";
import {
  bulkActionBar,
  collectionDensityControl,
  createRowMenuController,
  createSelectionState,
  selectionControl,
  updateCollectionDensityControl
} from "../ui/dense-content.mjs";
import { emptyState, statusState } from "../ui/empty-state.mjs";
import { formField, runFormSubmission, validateForm } from "../ui/form-system.mjs";
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
  let bulkDeleteArmed = false;
  let mounted = true;
  const scopedActions = [];
  const selection = createSelectionState();
  const rowMenu = createRowMenuController();

  const countBadge = element("span", { className: "v8-badge" });
  const search = element("input", { className: "v8-input", attributes: { type: "search", placeholder: "Rechercher dans Fichiers", "aria-label": "Rechercher dans Fichiers", autocomplete: "off" } });
  const sources = element("div", { className: "v8-files-sources", attributes: { role: "group", "aria-label": "Sources" } });
  const content = element("div", { className: "v8-files-content" });
  const preview = element("aside", { className: "v8-files-preview", attributes: { "aria-label": "Aperçu du fichier" } });
  const densityControl = collectionDensityControl(options.state?.density || document.documentElement.dataset.density || "automatic");
  const bulkHost = element("div", { className: "v8-bulk-host" });
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
        statusState("coming-soon", {
          tagName: "div",
          headingTag: "h3",
          iconName: "upload-cloud",
          eyebrow: "Import direct",
          title: "Bientôt disponible",
          description: "Ajoutez un lien dès maintenant; vos ressources restent préservées.",
          actions: [actionButton({ actionId: "v8.files.new-link", variant: "secondary" }, [icon("link-2"), element("span", { text: "Ajouter un lien" })])],
          compact: true,
          className: "v8-files-import-soon"
        })
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
            densityControl,
            element("div", { className: "v8-view-switch", attributes: { role: "group", "aria-label": "Affichage" } }, [
              element("button", { className: view === "list" ? "is-active" : "", attributes: { type: "button", "aria-label": "Vue liste", "aria-pressed": view === "list" ? "true" : "false" }, dataset: { filesView: "list" } }, [icon("list")]),
              element("button", { className: view === "grid" ? "is-active" : "", attributes: { type: "button", "aria-label": "Vue grille", "aria-pressed": view === "grid" ? "true" : "false" }, dataset: { filesView: "grid" } }, [icon("grid-2x2")])
            ])
          ])
        ]),
        bulkHost,
        content
      ]),
      preview
    ])
  ]);

  const sortSelect = page.querySelector("[aria-label='Trier les fichiers']");

  function refreshFiles() {
    files = repository.snapshot().files.map((file) => ({ ...file }));
    selection.prune(files.map((file) => file.id));
    if (!files.some((file) => String(file.id) === String(selectedId))) selectedId = files[0]?.id || null;
  }

  function visibleFiles() {
    return sortFiles(filterFiles(files, { query, type, favorites }), sort);
  }

  function selectedFile() {
    return files.find((file) => String(file.id) === String(selectedId)) || null;
  }

  function fileRow(id) {
    return [...content.querySelectorAll("[data-file-entry]")]
      .find((row) => row.dataset.fileEntry === String(id)) || null;
  }

  function renderBulk(filtered = visibleFiles()) {
    const selectedCount = selection.size();
    bulkHost.replaceChildren(bulkActionBar({
      count: selectedCount,
      selection,
      visibleIds: filtered.map((file) => file.id),
      onToggleAll: (checked) => {
        filtered.forEach((file) => selection.toggle(file.id, checked));
        bulkDeleteArmed = false;
        renderContent();
      },
      onClear: () => {
        selection.clear();
        bulkDeleteArmed = false;
        renderContent();
      },
      actions: [
        { label: "Favoris", icon: "star", onSelect: () => updateSelectedFavorites(true) },
        { label: "Retirer", icon: "star-off", onSelect: () => updateSelectedFavorites(false) },
        { label: bulkDeleteArmed ? "Confirmer" : "Supprimer", icon: "trash-2", tone: "danger", onSelect: removeSelectedFiles }
      ]
    }));
    refreshIcons();
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
    renderBulk(filtered);

    if (composerType) {
      const name = element("input", { className: "v8-input", attributes: { type: "text", placeholder: composerType === "folder" ? "Nom du dossier" : "Nom du lien", "aria-label": "Nom de l'élément", maxlength: "180", required: "", autocomplete: "off" }, dataset: { fileField: "name" } });
      const url = element("input", { className: "v8-input", attributes: { type: "url", placeholder: "https://", "aria-label": "Adresse du lien", required: composerType === "link" ? "" : null, autocomplete: "url" }, dataset: { fileField: "url" } });
      const tag = element("input", { className: "v8-input", attributes: { type: "text", placeholder: "Tag", "aria-label": "Tag du fichier", maxlength: "80", autocomplete: "off" }, dataset: { fileField: "tag" } });
      const form = element("form", { className: "v8-files-composer", attributes: { "aria-label": composerType === "folder" ? "Nouveau dossier" : "Nouveau lien" } }, [
        formField({ label: "Nom", control: name, required: true }),
        composerType === "link" ? formField({ label: "Adresse", control: url, required: true }) : null,
        formField({ label: "Tag", control: tag }),
        element("div", {}, [
          actionButton({ actionId: "v8.files.new.cancel" }, [element("span", { text: "Annuler" })]),
          element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [icon("plus"), element("span", { text: "Ajouter" })])
        ])
      ]);
      form.addEventListener("submit", async (event) => { event.preventDefault(); await runFormSubmission({ form, submit: form.querySelector("[type='submit']"), messages: { loading: "Ajout en cours..." }, task: createFile }); }, { once: true });
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
        kind: hasFilters ? "no-results" : "empty",
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
        const selected = selection.has(file.id);
        const main = element("button", {
          className: `v8-file-item${active ? " is-active" : ""}`,
          attributes: { type: "button", "aria-current": active ? "true" : null },
          dataset: { fileId: file.id, liveWidget: "planning", liveKind: "planning" }
        }, [
          element("span", { className: "v8-file-item__icon" }, [icon(TYPE_ICONS[file.type] || "file")]),
          element("span", { className: "v8-file-item__copy" }, [element("strong", { text: file.name, attributes: { translate: "no" } }), element("small", { text: `${typeLabel(file.type)}${file.tag ? ` · ${file.tag}` : ""}`, attributes: file.tag ? { translate: "no" } : {} })]),
          file.favorite ? element("span", { className: "v8-file-item__favorite", attributes: { "aria-label": "Favori" } }, [icon("star")]) : null,
          element("time", { text: file.date || "Local", attributes: file.date ? { translate: "no" } : {} })
        ]);
        const menu = element("button", {
          className: "v8-icon-button v8-file-menu",
          attributes: { type: "button", "aria-label": `Actions pour ${file.name}`, "aria-haspopup": "menu", "aria-expanded": "false" },
          dataset: { fileMenu: file.id }
        }, [icon("more-horizontal")]);
        collection.append(element("article", {
          className: `v8-file-entry${selected ? " is-selected" : ""}`,
          attributes: { role: "listitem", "aria-selected": selected ? "true" : "false" },
          dataset: { fileEntry: file.id }
        }, [
          selectionControl({ id: file.id, checked: selected, label: `Sélectionner ${file.name}` }),
          main,
          element("div", { className: "v8-row-actions" }, [menu])
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
    const form = content.querySelector(".v8-files-composer");
    if (!name?.value.trim() || (form && !validateForm(form))) {
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

  function toggleFileSelection(id) {
    selection.toggle(id);
    bulkDeleteArmed = false;
    renderContent();
    fileRow(id)?.querySelector("[data-collection-select]")?.focus?.({ preventScroll: true });
  }

  function toggleFavorite(id) {
    const changed = repository.files.toggleFavorite(id);
    if (!changed.ok) return changed;
    refreshFiles();
    renderAll();
    presence?.signalActivity?.(fileRow(changed.data.id), "file", { phase: "update" });
    return changed;
  }

  function updateSelectedFavorites(favorite) {
    const ids = selection.values();
    if (!ids.length) return completed("Aucun fichier sélectionné");
    const changed = repository.files.setFavorite(ids, favorite);
    if (!changed.ok) return changed;
    selection.clear();
    bulkDeleteArmed = false;
    refreshFiles();
    renderAll();
    notify({ id: favorite ? "files-bulk-favorite" : "files-bulk-unfavorite", title: "Fichiers", message: `${ids.length} élément${ids.length > 1 ? "s" : ""} mis à jour.`, type: "success", duration: 2400 });
    return changed;
  }

  function removeSelectedFiles() {
    const ids = selection.values();
    if (!ids.length) return completed("Aucun fichier sélectionné");
    if (!bulkDeleteArmed) {
      bulkDeleteArmed = true;
      renderBulk();
      return completed("Confirmation requise");
    }
    const changed = repository.files.removeMany(ids);
    if (!changed.ok) return changed;
    selection.clear();
    bulkDeleteArmed = false;
    refreshFiles();
    renderAll();
    notify({ id: "files-bulk-deleted", title: "Fichiers", message: `${ids.length} élément${ids.length > 1 ? "s supprimés" : " supprimé"}.`, type: "info", duration: 2400 });
    return changed;
  }

  function removeFile(id) {
    const row = fileRow(id);
    const changed = repository.files.remove(id);
    if (!changed.ok) return changed;
    selection.toggle(id, false);
    refreshFiles();
    notify({ id: "file-deleted", title: "Fichiers", message: "Élément supprimé.", type: "info", duration: 2200 });
    presence?.signalActivity?.(preview, "file", { phase: "exit" });
    const finish = () => { if (mounted) renderAll(); };
    if (presence?.signalActivity) presence.signalActivity(row, "file", { phase: "exit", onComplete: finish });
    else finish();
    return changed;
  }

  function openFileMenu(id, anchor, point = null) {
    const file = files.find((entry) => String(entry.id) === String(id));
    if (!file) return false;
    return rowMenu.open(anchor, [
      { label: file.favorite ? "Retirer des favoris" : "Ajouter aux favoris", icon: file.favorite ? "star-off" : "star", onSelect: () => toggleFavorite(id) },
      { label: selection.has(id) ? "Retirer de la sélection" : "Ajouter à la sélection", icon: selection.has(id) ? "square-minus" : "square-check-big", onSelect: () => toggleFileSelection(id) },
      { separator: true },
      { label: "Supprimer", icon: "trash-2", tone: "danger", onSelect: () => removeFile(id) }
    ], { label: `Actions pour ${file.name}`, point });
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
    const select = event.target.closest("[data-collection-select]");
    if (select && content.contains(select)) {
      toggleFileSelection(select.dataset.collectionSelect);
      return;
    }
    const menu = event.target.closest("[data-file-menu]");
    if (menu && page.contains(menu)) {
      openFileMenu(menu.dataset.fileMenu, menu);
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
      toggleFavorite(favorite.dataset.fileFavorite);
      return;
    }
    const remove = event.target.closest("[data-file-delete]");
    if (remove && page.contains(remove)) {
      removeFile(remove.dataset.fileDelete);
    }
  }

  function handleContextMenu(event) {
    const row = event.target.closest("[data-file-entry]");
    if (!row || !content.contains(row)) return;
    event.preventDefault();
    event.stopPropagation();
    openFileMenu(row.dataset.fileEntry, row, { x: event.clientX, y: event.clientY });
  }

  function handleKeyboard(event) {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "a" || !content.contains(event.target)) return;
    event.preventDefault();
    visibleFiles().forEach((file) => selection.toggle(file.id, true));
    bulkDeleteArmed = false;
    renderContent();
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
  page.addEventListener("contextmenu", handleContextMenu);
  page.addEventListener("keydown", handleKeyboard);
  search.addEventListener("input", handleSearch);
  sortSelect.addEventListener("change", handleSort);
  stage.replaceChildren(page);
  renderAll();
  const releaseDensity = options.subscribeState?.((next) => updateCollectionDensityControl(densityControl, next)) || (() => {});
  refreshIcons();

  return () => {
    mounted = false;
    rowMenu.destroy();
    releaseDensity();
    scopedActions.reverse().forEach((restore) => restore());
    page.removeEventListener("click", handleClick);
    page.removeEventListener("contextmenu", handleContextMenu);
    page.removeEventListener("keydown", handleKeyboard);
    search.removeEventListener("input", handleSearch);
    sortSelect.removeEventListener("change", handleSort);
    page.remove();
  };
}
