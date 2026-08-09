import { actionButton, attachTypeToSelect, debounce, element, icon } from "../ui/dom.mjs";
import { formatBytes } from "../utils/format.mjs";
import { isExpired, isExpiringSoon } from "../utils/date.mjs";
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
import { createSelect } from "../ui/select.mjs";
import { createDriveClient } from "../services/drive-client.mjs";
import { createCloudCache } from "../services/cloud-cache.mjs";
import { descendantFolderIds, filterFiles, folderPath, sortFiles } from "./files-model.mjs";
import { translateSource } from "../i18n/catalog.mjs";

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
  return translateSource(({ folder: "Dossier", link: "Lien", image: "Image", video: "Vidéo", code: "Code", doc: "Document", file: "Fichier" })[type] || "Fichier");
}

function isDriveConnected(repository) {
  return repository.snapshot().connections.some((connection) => connection.id === "google-drive" && connection.status === "connected");
}

function getDriveClientId(repository) {
  return repository.snapshot().connections.find((connection) => connection.id === "google-drive")?.reference || "";
}

export function mountFiles(stage, options = {}) {
  const repository = options.repository;
  const actions = options.actions;
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const presence = options.presence || null;
  const externalServices = options.externalServices || null;

  const cloudCache = createCloudCache();
  const driveClient = createDriveClient({
    externalServices,
    getClientId: () => getDriveClientId(repository),
    notify,
    cloudCache
  });

  let files = [];
  let loading = false;
  let error = "";
  let quota = null;
  let selectedId = null;
  let currentFolderId = null;
  let query = "";
  let type = "all";
  let favorites = false;
  let sort = "recent";
  let composerType = null;
  let view = repository.snapshot().filesView === "grid" ? "grid" : "list";
  let bulkDeleteArmed = false;
  let adminOpen = false;
  let shares = [];
  let drops = [];
  let dashboard = null;
  let adminLoading = false;
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
  const breadcrumb = element("nav", { className: "v8-files-breadcrumb", attributes: { "aria-label": "Chemin du dossier" } });
  const storageHost = element("div", { className: "v8-files-storage" });
  const page = element("section", { className: "v8-page v8-work-page", dataset: { page: "files" } }, [
    element("header", { className: "v8-page-heading v8-work-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Bibliothèque synchronisée" }),
        element("div", { className: "v8-title-line" }, [element("h1", { text: "Fichiers" }), countBadge]),
        element("p", { text: "Retrouvez vos ressources, puis agissez depuis un aperçu unique." })
      ]),
      element("div", { className: "v8-page-heading__actions" }, [
        element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: openAdmin }, dataset: { fileAdmin: "true" } }, [icon("shield"), element("span", { text: "Admin" })]),
        actionButton({ actionId: "v8.files.new-folder", variant: "secondary" }, [icon("folder-plus"), element("span", { text: "Dossier" })]),
        actionButton({ actionId: "v8.files.upload", variant: "primary" }, [icon("upload-cloud"), element("span", { text: "Envoyer" })])
      ])
    ]),
    element("section", { className: "v8-work-surface v8-files-workspace" }, [
      element("aside", { className: "v8-files-sidebar" }, [
        element("span", { className: "v8-eyebrow", text: "Bibliothèque" }),
        sources,
        storageHost,
        statusState("coming-soon", {
          tagName: "div",
          headingTag: "h3",
          iconName: "cloud",
          eyebrow: "ETHONE Cloud",
          title: isDriveConnected(repository) ? "Connecté à Google Drive" : "Google Drive",
          description: isDriveConnected(repository)
            ? "Vos fichiers sont synchronisés avec Google Drive."
            : "Connectez Google Drive dans Connexions pour activer le stockage cloud.",
          compact: true,
          className: "v8-files-import-soon"
        })
      ]),
      element("div", { className: "v8-files-main", attributes: { role: "region", "aria-label": "Contenu" } }, [
        breadcrumb,
        element("header", { className: "v8-files-toolbar" }, [
          element("div", { className: "v8-input-wrap v8-files-search" }, [icon("search"), search]),
          element("div", { className: "v8-files-toolbar__tools" }, [
            createSelect({ className: "v8-input", attributes: { "aria-label": "Trier les fichiers" } }, [
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

  const adminPanel = element("dialog", { className: "v8-files-admin" }, [
    element("div", { className: "v8-files-admin__content" }, [
      element("header", { className: "v8-files-admin__header" }, [
        element("h2", { text: "Partages & drops" }),
        element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Fermer" }, events: { click: closeAdmin } }, [icon("x")])
      ]),
      element("div", { className: "v8-files-admin__body" })
    ])
  ]);

  const sortSelect = page.querySelector("[aria-label='Trier les fichiers']");

  async function refreshFiles() {
    if (!isDriveConnected(repository)) {
      files = repository.snapshot().files.map((file) => ({ ...file }));
      selection.prune(files.map((file) => file.id));
      if (currentFolderId && !files.some((file) => String(file.id) === String(currentFolderId) && file.type === "folder")) currentFolderId = null;
      if (selectedId && !files.some((file) => String(file.id) === String(selectedId))) selectedId = null;
      loading = false;
      error = "";
      return;
    }
    loading = true;
    error = "";
    try {
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine !== false : true;
      if (!isOnline && !query.trim() && driveClient.getCachedFiles) {
        const cached = await driveClient.getCachedFiles();
        files = Array.isArray(cached) ? cached.map((file) => ({ ...file })) : [];
        quota = await driveClient.quota().catch(() => null);
        if (!files.length) {
          notify({ id: "files-offline-empty", title: "Fichiers", message: "Aucune donnée en cache. Reconnectez-vous pour charger.", type: "warning" });
        }
      } else if (query.trim()) {
        const result = await driveClient.search(query.trim());
        files = Array.isArray(result.files) ? result.files.map((file) => ({ ...file })) : [];
        quota = await driveClient.quota().catch(() => null);
      } else {
        const [result, quotaResult] = await Promise.all([
          driveClient.list(currentFolderId, { pageSize: 100, orderBy: "folder,name" }),
          driveClient.quota().catch(() => null)
        ]);
        files = Array.isArray(result.files) ? result.files.map((file) => ({ ...file })) : [];
        quota = quotaResult || null;
        if (quota && quota.limit > 0) {
          const ratio = quota.usage / quota.limit;
          if (ratio >= 0.95) notify({ id: "drive-quota-critical", title: "Stockage", message: `Espace critique : ${(ratio * 100).toFixed(0)}% utilisé.`, type: "error", duration: 6000 });
          else if (ratio >= 0.85) notify({ id: "drive-quota-warning", title: "Stockage", message: `Espace presque plein : ${(ratio * 100).toFixed(0)}% utilisé.`, type: "warning", duration: 6000 });
        }
        if (files.length) {
          await driveClient.sync(files);
          const cloudResult = await externalServices.cloudFiles.list({ parentId: currentFolderId, trashed: false, limit: 200 });
          const cloudMap = new Map((cloudResult?.data?.files || []).map((cloudFile) => [String(cloudFile.driveFileId || cloudFile.id), cloudFile]));
          files = files.map((file) => {
            const cloud = cloudMap.get(String(file.id));
            if (!cloud) return file;
            return { ...file, tags: Array.isArray(cloud.tags) ? cloud.tags : [], favorite: cloud.isFavorite === true };
          });
        }
      }
      selection.prune(files.map((file) => file.id));
      if (currentFolderId && !files.some((file) => String(file.id) === String(currentFolderId) && file.type === "folder")) currentFolderId = null;
      if (selectedId && !files.some((file) => String(file.id) === String(selectedId))) selectedId = null;
    } catch (err) {
      error = err?.message || "Impossible de charger les fichiers.";
      files = [];
      quota = null;
    } finally {
      loading = false;
    }
  }

  function usingGlobalFilter() {
    return Boolean(query) || favorites || type !== "all";
  }

  function visibleFiles() {
    const filters = { type, favorites };
    if (query.trim()) filters.query = "";
    else if (!usingGlobalFilter()) filters.parentId = currentFolderId;
    return sortFiles(filterFiles(files, filters), sort);
  }

  function navigateToFolder(folderId) {
    currentFolderId = folderId;
    query = "";
    type = "all";
    favorites = false;
    search.value = "";
    selectedId = null;
    refreshFiles().then(renderAll).catch(() => renderAll());
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
      { id: "folder", label: "Dossiers", icon: "folder", count: files.filter((file) => file.type === "folder").length },
      { id: "image", label: "Images", icon: "image", count: files.filter((file) => file.type === "image").length },
      { id: "doc", label: "Documents", icon: "file-text", count: files.filter((file) => file.type === "doc").length },
      { id: "video", label: "Vidéos", icon: "video", count: files.filter((file) => file.type === "video").length }
    ];
    sources.replaceChildren();
    entries.forEach((entry) => {
      const active = entry.id === "favorites" ? favorites : (!favorites && type === entry.id);
      sources.append(element("button", {
        className: active ? "is-active" : "",
        attributes: { type: "button", "aria-pressed": active ? "true" : "false" },
        dataset: { filesSource: entry.id }
      }, [icon(entry.icon), element("span", { text: entry.label }), element("small", { text: entry.count })]));;
    });
    const nextCount = `${files.length} élément${files.length > 1 ? "s" : ""}`;
    if (presence) presence.transitionText(countBadge, nextCount, { kind: "metric" });
    else countBadge.textContent = nextCount;
    refreshIcons();
  }

  function renderBreadcrumb() {
    breadcrumb.replaceChildren();
    breadcrumb.hidden = usingGlobalFilter();
    if (breadcrumb.hidden) return;
    const path = folderPath(files, currentFolderId);
    const crumbs = [{ id: null, label: "Bibliothèque" }, ...path.map((folder) => ({ id: folder.id, label: folder.name }))];
    crumbs.forEach((crumb, index) => {
      const isLast = index === crumbs.length - 1;
      breadcrumb.append(element("button", {
        className: `v8-files-breadcrumb__item${isLast ? " is-current" : ""}`,
        attributes: { type: "button", "aria-current": isLast ? "true" : null, disabled: isLast ? "" : null },
        dataset: { filesBreadcrumb: crumb.id ?? "root" }
      }, [element("span", { text: crumb.label, attributes: crumb.id ? { translate: "no" } : {} })]));;
      if (!isLast) breadcrumb.append(element("span", { className: "v8-files-breadcrumb__sep", attributes: { "aria-hidden": "true" } }, [icon("chevron-right")]));;
    });
    refreshIcons();
  }

  function renderContent() {
    const filtered = visibleFiles();
    content.replaceChildren();
    content.dataset.view = view;
    renderBulk(filtered);

    if (composerType) {
      const name = element("input", { className: "v8-input", attributes: { type: "text", placeholder: "Nom du dossier", "aria-label": "Nom du dossier", maxlength: "180", required: "", autocomplete: "off" }, dataset: { fileField: "name" } });
      const form = element("form", { className: "v8-files-composer", attributes: { "aria-label": "Nouveau dossier" } }, [
        formField({ label: "Nom", control: name, required: true }),
        element("div", {}, [
          actionButton({ actionId: "v8.files.new.cancel" }, [element("span", { text: "Annuler" })]),
          element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [icon("plus"), element("span", { text: "Créer" })])
        ])
      ]);
      form.addEventListener("submit", async (event) => { event.preventDefault(); await runFormSubmission({ form, submit: form.querySelector("[type='submit']"), messages: { loading: "Création en cours..." }, task: createFolder }); }, { once: true });
      content.append(form);
      name.focus({ preventScroll: true });
    }

    if (loading) {
      content.append(element("div", { className: "v8-files-loading" }, [element("span", { text: "Chargement..." })]));;
      return;
    }

    if (error) {
      content.append(statusState("error", {
        title: "Erreur de chargement",
        description: error,
        actions: [element("button", { className: "v8-button v8-button--primary", text: "Réessayer", attributes: { type: "button" }, events: { click: () => refreshFiles().then(renderAll) } })],
        compact: true
      }));
      return;
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
      const insideEmptyFolder = !hasFilters && Boolean(currentFolderId);
      collection.append(emptyState({
        kind: hasFilters ? "no-results" : "empty",
        iconName: hasFilters ? "search-x" : "folder-open",
        eyebrow: hasFilters ? "Recherche terminée" : insideEmptyFolder ? "Dossier vide" : "Bibliothèque prête",
        title: hasFilters ? "Aucun résultat" : insideEmptyFolder ? "Ce dossier est vide" : "Votre bibliothèque vous attend",
        description: hasFilters ? "Aucune ressource ne correspond à ces filtres." : insideEmptyFolder ? "Ajoutez un fichier ou un sous-dossier ici." : "Glissez-déposez des fichiers ou créez un dossier.",
        actions: hasFilters ? [reset] : [actionButton({ actionId: "v8.files.new-folder", variant: "secondary" }, [icon("folder-plus"), element("span", { text: "Créer un dossier" })])],
        compact: false,
        className: "v8-empty-state--wide"
      }));
    } else {
      filtered.forEach((file) => {
        const active = String(file.id) === String(selectedId);
        const selected = selection.has(file.id);
        const main = element("button", {
          className: `v8-file-item${active ? " is-active" : ""}`,
          attributes: { type: "button", "aria-current": active ? "true" : null },
          dataset: { fileId: file.id }
        }, [
          element("span", { className: "v8-file-item__icon" }, [icon(TYPE_ICONS[file.type] || "file")]),
          element("span", { className: "v8-file-item__copy" }, [element("strong", { text: file.name, attributes: { translate: "no" } }), element("small", { text: `${typeLabel(file.type)}${file.sizeLabel ? ` · ${file.sizeLabel}` : ""}${file.date ? ` · ${file.date}` : ""}`, attributes: {} })]),
          file.favorite ? element("span", { className: "v8-file-item__favorite", attributes: { "aria-label": "Favori" } }, [icon("star")]) : null
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
        description: "Sélectionnez une ressource pour voir ses détails.",
        compact: true,
        className: "v8-empty-state--fill"
      }));
      refreshIcons();
      return;
    }
    const isDrive = isDriveConnected(repository) && file.driveId;
    const actions = [];
    if (file.webViewLink) actions.push(element("a", { className: "v8-button v8-button--primary", attributes: { href: file.webViewLink, target: "_blank", rel: "noopener noreferrer" } }, [icon("external-link"), element("span", { text: "Ouvrir" })]));
    if (isDrive && file.type !== "folder") {
      actions.push(element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { fileDownload: file.id } }, [icon("download"), element("span", { text: "Télécharger" })]));
      actions.push(element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { fileBrain: file.id } }, [icon("sparkles"), element("span", { text: "Analyser" })]));
      actions.push(element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { fileShare: file.id } }, [icon("share-2"), element("span", { text: "Partager" })]));
    }
    actions.push(element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { fileFavorite: file.id } }, [icon(file.favorite ? "star-off" : "star"), element("span", { text: file.favorite ? "Retirer des favoris" : "Ajouter aux favoris" })]));
    actions.push(element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { fileRename: file.id } }, [icon("pencil"), element("span", { text: "Renommer" })]));
    actions.push(element("button", { className: "v8-button v8-button--danger", attributes: { type: "button" }, dataset: { fileDelete: file.id } }, [icon("trash-2"), element("span", { text: "Supprimer" })]));

    const tagElements = (Array.isArray(file.tags) && file.tags.length)
      ? [element("div", { className: "v8-files-tags" }, file.tags.map((tag) => element("span", { className: "v8-badge v8-files-tag", text: tag })))]
      : [];
    const brainSummary = file.brainSummary ? element("div", { className: "v8-files-brain" }, [element("strong", { text: "Brain" }), element("p", { text: file.brainSummary })]) : null;
    const brainSuggestion = file.brainSuggestedFolderName ? element("p", { className: "v8-files-brain__suggestion", text: `Suggestion : ${file.brainSuggestedFolderName}` }) : null;

    preview.append(
      element("header", { className: "v8-files-preview__header" }, [element("span", { className: "v8-eyebrow", text: "Aperçu" }), element("span", { className: "v8-badge", text: typeLabel(file.type) })]),
      element("div", { className: "v8-files-preview__symbol" }, [icon(TYPE_ICONS[file.type] || "file")]),
      element("h2", { text: file.name, attributes: { translate: "no" } }),
      element("p", { text: file.type === "folder" ? translateSource("Dossier") : file.sizeLabel || translateSource("Fichier"), attributes: {} }),
      ...tagElements,
      brainSummary,
      brainSuggestion,
      element("dl", { className: "v8-files-metadata" }, [
        element("div", {}, [element("dt", { text: "Type" }), element("dd", { text: typeLabel(file.type) })]),
        element("div", {}, [element("dt", { text: "Taille" }), element("dd", { text: file.sizeLabel || "—" })]),
        element("div", {}, [element("dt", { text: "Modifié" }), element("dd", { text: file.date || "—", attributes: file.date ? { translate: "no" } : {} })])
      ]),
      element("div", { className: "v8-files-preview__actions" }, actions)
    );
    refreshIcons();
  }



  async function openAdmin() {
    if (adminOpen) return;
    adminOpen = true;
    page.append(adminPanel);
    adminPanel.showModal();
    renderAdmin();
    await loadAdmin();
    renderAdmin();
  }

  function closeAdmin() {
    adminOpen = false;
    adminPanel.close();
    adminPanel.remove();
  }

  async function loadAdmin() {
    adminLoading = true;
    renderAdmin();
    try {
      const [sharesResult, dropsResult, dashboardResult] = await Promise.all([
        externalServices?.cloudShares?.list?.({ limit: 100 }),
        externalServices?.cloudDrops?.list?.({ limit: 100 }),
        externalServices?.cloudDashboard?.get?.()
      ]);
      shares = Array.isArray(sharesResult?.data?.shares) ? sharesResult.data.shares : [];
      drops = Array.isArray(dropsResult?.data?.drops) ? dropsResult.data.drops : [];
      dashboard = dashboardResult?.data || null;
    } catch (err) {
      notify({ id: "admin-load-error", title: "Admin", message: err.message || "Impossible de charger.", type: "error" });
    } finally {
      adminLoading = false;
    }
    renderAdmin();
  }

  async function runCleanup() {
    try {
      const result = await externalServices?.cloudCleanup?.run?.();
      const summary = result?.data || { revoked: 0, deleted: 0 };
      notify({ id: "admin-cleanup", title: "Admin", message: `${summary.revoked || 0} partage(s) révoqué(s), ${summary.deleted || 0} drop(s) supprimé(s).`, type: "success", duration: 3000 });
      await loadAdmin();
    } catch (err) {
      notify({ id: "admin-cleanup-error", title: "Admin", message: err.message || "Échec du nettoyage.", type: "error" });
    }
  }

  async function revokeShareAdmin(slug) {
    try {
      await externalServices?.cloudShares?.revoke?.(slug);
      shares = shares.filter((share) => share.slug !== slug);
      renderAdmin();
      notify({ id: "admin-share-revoked", title: "Admin", message: "Partage révoqué.", type: "success", duration: 2200 });
    } catch (err) {
      notify({ id: "admin-share-revoke-error", title: "Admin", message: err.message || "Échec.", type: "error" });
    }
  }

  async function revokeDropAdmin(slug) {
    try {
      await externalServices?.cloudDrops?.revoke?.(slug);
      drops = drops.filter((drop) => drop.slug !== slug);
      renderAdmin();
      notify({ id: "admin-drop-revoked", title: "Admin", message: "Drop supprimé.", type: "success", duration: 2200 });
    } catch (err) {
      notify({ id: "admin-drop-revoke-error", title: "Admin", message: err.message || "Échec.", type: "error" });
    }
  }

  function renderAdmin() {
    const body = adminPanel.querySelector(".v8-files-admin__body");
    body.replaceChildren();
    if (adminLoading) {
      body.append(statusState("loading", { iconName: "loader", title: "Chargement", description: "Récupération des partages...", compact: true }));
      refreshIcons();
      return;
    }

    const dashboardSection = element("section", { className: "v8-files-admin__section" }, [
      element("h3", { text: "Dashboard Cloud" })
    ]);
    if (!dashboard) {
      dashboardSection.append(element("p", { className: "v8-files-admin__empty", text: "Aucune statistique disponible." }));
    } else {
      const topSize = formatBytes(dashboard.totalSize);
      const topFilesList = dashboard.topFiles?.length
        ? element("ul", { className: "v8-files-admin__top-files" }, dashboard.topFiles.map((file) => element("li", {}, [
          icon("file"),
          element("span", { text: file.name }),
          element("small", { text: formatBytes(file.size) })
        ])))
        : null;
      const shareLabel = `${translateSource("Partages")}${dashboard.expiredShares ? ` (${dashboard.expiredShares} ${translateSource("expirés")})` : ""}`;
      const dropLabel = `${translateSource("Drops")}${dashboard.expiredDrops ? ` (${dashboard.expiredDrops} ${translateSource("expirés")})` : ""}`;
      dashboardSection.append(
        element("div", { className: "v8-files-admin__dashboard" }, [
          element("div", { className: "v8-files-admin__kpi" }, [element("strong", { text: String(dashboard.totalFiles) }), element("small", { text: translateSource("Fichiers") })]),
          element("div", { className: "v8-files-admin__kpi" }, [element("strong", { text: topSize }), element("small", { text: translateSource("Taille totale") })]),
          element("div", { className: "v8-files-admin__kpi" }, [element("strong", { text: String(dashboard.favorites) }), element("small", { text: translateSource("Favoris") })]),
          element("div", { className: "v8-files-admin__kpi" }, [element("strong", { text: String(dashboard.folders) }), element("small", { text: translateSource("Dossiers") })]),
          element("div", { className: "v8-files-admin__kpi" }, [element("strong", { text: String(dashboard.activeShares) }), element("small", { text: shareLabel })]),
          element("div", { className: "v8-files-admin__kpi" }, [element("strong", { text: String(dashboard.activeDrops) }), element("small", { text: dropLabel })]),
          topFilesList
        ].filter(Boolean))
      );
      const cleanupButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: runCleanup } }, [icon("broom"), element("span", { text: "Nettoyer les expirés" })]);
      dashboardSection.append(cleanupButton);
    }

    const sharesSection = element("section", { className: "v8-files-admin__section" }, [
      element("h3", { text: `Partages actifs (${shares.length})` })
    ]);
    if (!shares.length) {
      sharesSection.append(element("p", { className: "v8-files-admin__empty", text: "Aucun partage actif." }));
    } else {
      const list = element("ul", { className: "v8-files-admin__list" });
      shares.forEach((share) => {
        const expired = isExpired(share.expiresAt);
        const expiring = !expired && isExpiringSoon(share.expiresAt);
        const statusClass = expired ? "is-expired" : expiring ? "is-expiring" : "";
        const statusText = expired ? translateSource("Expiré") : expiring ? translateSource("Expire bientôt") : share.expiresAt ? `Expire ${new Date(share.expiresAt).toLocaleString()}` : translateSource("Sans expiration");
        const downloadCount = share.downloadCount || 0;
        const downloadLabel = `${downloadCount} ${downloadCount > 1 ? translateSource("téléchargements") : translateSource("téléchargement")}`;
        const copyButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: () => copyShareLink(share.slug) } }, [icon("link"), element("span", { text: translateSource("Copier") })]);
        const revokeButton = element("button", { className: "v8-button v8-button--danger", attributes: { type: "button" }, events: { click: () => revokeShareAdmin(share.slug) } }, [icon("trash-2"), element("span", { text: translateSource("Révoquer") })]);
        list.append(element("li", { className: statusClass }, [
          element("div", { className: "v8-files-admin__item-copy" }, [
            element("strong", { text: share.slug }),
            element("small", { text: statusText }),
            element("small", { text: downloadLabel })
          ]),
          element("div", { className: "v8-files-admin__item-actions" }, [copyButton, revokeButton])
        ]));
      });
      sharesSection.append(list);
    }

    const dropsSection = element("section", { className: "v8-files-admin__section" }, [
      element("h3", { text: `Drops actifs (${drops.length})` })
    ]);
    if (!drops.length) {
      dropsSection.append(element("p", { className: "v8-files-admin__empty", text: "Aucun drop actif." }));
    } else {
      const list = element("ul", { className: "v8-files-admin__list" });
      drops.forEach((drop) => {
        const expired = isExpired(drop.expiresAt);
        const expiring = !expired && isExpiringSoon(drop.expiresAt);
        const statusClass = expired ? "is-expired" : expiring ? "is-expiring" : "";
        const statusText = expired ? translateSource("Expiré") : expiring ? translateSource("Expire bientôt") : drop.expiresAt ? `Expire ${new Date(drop.expiresAt).toLocaleString()}` : translateSource("Sans expiration");
        const fileCount = drop.fileCount || 0;
        const fileLabel = `${fileCount} / ${drop.maxFiles || "∞"} ${fileCount > 1 ? translateSource("fichiers") : translateSource("fichier")}`;
        const copyButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: () => copyDropLink(drop.slug) } }, [icon("link"), element("span", { text: translateSource("Copier") })]);
        const revokeButton = element("button", { className: "v8-button v8-button--danger", attributes: { type: "button" }, events: { click: () => revokeDropAdmin(drop.slug) } }, [icon("trash-2"), element("span", { text: translateSource("Supprimer") })]);
        list.append(element("li", { className: statusClass }, [
          element("div", { className: "v8-files-admin__item-copy" }, [
            element("strong", { text: drop.title || drop.slug }),
            element("small", { text: statusText }),
            element("small", { text: fileLabel })
          ]),
          element("div", { className: "v8-files-admin__item-actions" }, [copyButton, revokeButton])
        ]));
      });
      dropsSection.append(list);
    }

    body.append(sharesSection, dropsSection);
    refreshIcons();
  }

  async function copyShareLink(slug) {
    const shareUrl = `${globalThis.location?.origin || ""}${globalThis.location?.pathname || "/"}#/share?slug=${encodeURIComponent(slug)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify({ id: "admin-share-link-copied", title: "Admin", message: "Lien copié.", type: "success", duration: 2200 });
    } catch {
      notify({ id: "admin-share-link-copy-error", title: "Admin", message: "Impossible de copier.", type: "error" });
    }
  }

  async function copyDropLink(slug) {
    const dropUrl = `${globalThis.location?.origin || ""}${globalThis.location?.pathname || "/"}#/drop?slug=${encodeURIComponent(slug)}`;
    try {
      await navigator.clipboard.writeText(dropUrl);
      notify({ id: "admin-drop-link-copied", title: "Admin", message: "Lien copié.", type: "success", duration: 2200 });
    } catch {
      notify({ id: "admin-drop-link-copy-error", title: "Admin", message: "Impossible de copier.", type: "error" });
    }
  }

  function renderStorage() {
    storageHost.replaceChildren();
    if (!isDriveConnected(repository) || !quota) return;
    const usage = Number(quota.usage) || 0;
    const limit = Number(quota.limit) || 0;
    const ratio = limit > 0 ? Math.min(1, usage / limit) : 0;
    const percent = Math.round(ratio * 100);
    storageHost.append(
      element("div", { className: "v8-files-storage__label", style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:var(--v8-font-sm);" }, [element("span", { text: translateSource("Stockage") }), element("small", { text: `${percent}% ${translateSource("utilisé")}` })]),
      element("div", { className: "v8-files-storage__bar", style: "height:6px;background:var(--v8-border);border-radius:999px;overflow:hidden;" }, [element("div", { className: "v8-files-storage__fill", attributes: { style: `width:${percent}%;height:100%;background:#1a73e8;` } })]),
      element("div", { className: "v8-files-storage__meta", style: "margin-top:4px;color:var(--v8-text-secondary);font-size:var(--v8-font-xs);" }, [element("small", { text: `${formatBytes(usage)} / ${formatBytes(limit)}` })])
    );
  }



  function renderAll() {
    renderSources();
    renderStorage();
    renderBreadcrumb();
    renderContent();
    renderPreview();
  }

  function openComposer(nextType) {
    if (!isDriveConnected(repository)) {
      notify({ id: "drive-not-connected", title: "Fichiers", message: "Connectez Google Drive pour créer des dossiers.", type: "warning" });
      return completed("Connexion requise");
    }
    composerType = nextType;
    renderContent();
    return completed("Formulaire ouvert");
  }

  function closeComposer() {
    composerType = null;
    renderContent();
    return completed("Formulaire fermé");
  }

  async function createFolder() {
    const name = content.querySelector("[data-file-field='name']");
    const form = content.querySelector(".v8-files-composer");
    if (!name?.value.trim() || (form && !validateForm(form))) {
      notify({ id: "file-name-required", title: "Fichiers", message: "Ajoutez un nom avant de continuer.", type: "warning" });
      return { ok: false, status: "failed", message: "Nom requis" };
    }
    try {
      const created = await driveClient.createFolder(name.value, currentFolderId);
      composerType = null;
      await refreshFiles();
      selectedId = created.file.id;
      renderAll();
      notify({ id: "folder-created", title: "Fichiers", message: "Dossier créé.", type: "success", duration: 2200 });
      return completed("Dossier créé", created.file);
    } catch (err) {
      notify({ id: "folder-create-error", title: "Fichiers", message: err.message || "Impossible de créer le dossier.", type: "error" });
      return { ok: false, status: "failed", message: err.message };
    }
  }

  function toggleFileSelection(id) {
    selection.toggle(id);
    bulkDeleteArmed = false;
    renderContent();
    fileRow(id)?.querySelector("[data-collection-select]")?.focus?.({ preventScroll: true });
  }

  async function renameFile(id) {
    const file = files.find((entry) => String(entry.id) === String(id));
    if (!file) return completed("Fichier introuvable");
    const value = prompt("Renommer", file.name || "");
    if (value == null || value === file.name) return completed("Renommage annulé");
    try {
      await driveClient.rename(id, value);
      await refreshFiles();
      renderAll();
      notify({ id: "file-renamed", title: "Fichiers", message: "Élément renommé.", type: "success", duration: 2200 });
      return completed("Élément renommé");
    } catch (err) {
      notify({ id: "file-rename-error", title: "Fichiers", message: err.message || "Impossible de renommer.", type: "error" });
      return { ok: false, status: "failed", message: err.message };
    }
  }

  async function toggleFavorite(id) {
    if (isDriveConnected(repository)) {
      const file = files.find((entry) => String(entry.id) === String(id));
      if (!file) return completed("Fichier introuvable");
      try {
        const favorite = !file.favorite;
        await driveClient.toggleFavorite(id, favorite);
        file.favorite = favorite;
        renderAll();
        notify({ id: favorite ? "file-favorited" : "file-unfavorited", title: "Fichiers", message: favorite ? "Ajouté aux favoris." : "Retiré des favoris.", type: "success", duration: 2200 });
        return completed(favorite ? "Ajouté aux favoris" : "Retiré des favoris");
      } catch (err) {
        notify({ id: "favorite-error", title: "Fichiers", message: err.message || "Impossible de mettre à jour le favori.", type: "error" });
        return { ok: false, status: "failed", message: err.message };
      }
    }
    const changed = repository.files.toggleFavorite(id);
    if (!changed.ok) return changed;
    refreshFiles();
    renderAll();
    presence?.signalActivity?.(fileRow(changed.data.id), "file", { phase: "update" });
    return changed;
  }

  async function updateSelectedFavorites(favorite) {
    const ids = selection.values();
    if (!ids.length) return completed("Aucun fichier sélectionné");
    if (isDriveConnected(repository)) {
      try {
        for (const id of ids) await driveClient.toggleFavorite(id, favorite);
        selection.clear();
        bulkDeleteArmed = false;
        await refreshFiles();
        renderAll();
        notify({ id: favorite ? "files-bulk-favorite" : "files-bulk-unfavorite", title: "Fichiers", message: `${ids.length} élément${ids.length > 1 ? "s" : ""} mis à jour.`, type: "success", duration: 2400 });
        return completed("Favoris mis à jour");
      } catch (err) {
        notify({ id: "favorites-error", title: "Fichiers", message: err.message || "Impossible de mettre à jour les favoris.", type: "error" });
        return { ok: false, status: "failed", message: err.message };
      }
    }
    const changed = repository.files.setFavorite(ids, favorite);
    if (!changed.ok) return changed;
    selection.clear();
    bulkDeleteArmed = false;
    refreshFiles();
    renderAll();
    notify({ id: favorite ? "files-bulk-favorite" : "files-bulk-unfavorite", title: "Fichiers", message: `${ids.length} élément${ids.length > 1 ? "s" : ""} mis à jour.`, type: "success", duration: 2400 });
    return changed;
  }

  async function removeSelectedFiles() {
    const ids = selection.values();
    if (!ids.length) return completed("Aucun fichier sélectionné");
    if (!bulkDeleteArmed) {
      bulkDeleteArmed = true;
      renderBulk();
      return completed("Confirmation requise");
    }
    try {
      if (isDriveConnected(repository)) {
        await Promise.all(ids.map((id) => driveClient.trash(id)));
      } else {
        repository.files.removeMany(ids);
      }
      selection.clear();
      bulkDeleteArmed = false;
      await refreshFiles();
      renderAll();
      notify({ id: "files-bulk-deleted", title: "Fichiers", message: `${ids.length} élément${ids.length > 1 ? "s supprimés" : " supprimé"}.`, type: "info", duration: 2400 });
      return completed("Éléments supprimés");
    } catch (err) {
      notify({ id: "files-bulk-delete-error", title: "Fichiers", message: err.message || "Impossible de supprimer.", type: "error" });
      return { ok: false, status: "failed", message: err.message };
    }
  }

  async function removeFile(id) {
    try {
      const row = fileRow(id);
      if (isDriveConnected(repository)) {
        await driveClient.trash(id);
      } else {
        repository.files.remove(id);
      }
      selection.toggle(id, false);
      await refreshFiles();
      notify({ id: "file-deleted", title: "Fichiers", message: "Élément supprimé.", type: "info", duration: 2200 });
      presence?.signalActivity?.(preview, "file", { phase: "exit" });
      const finish = () => { if (mounted) renderAll(); };
      if (presence?.signalActivity) presence.signalActivity(row, "file", { phase: "exit", onComplete: finish });
      else finish();
      return completed("Élément supprimé");
    } catch (err) {
      notify({ id: "file-delete-error", title: "Fichiers", message: err.message || "Impossible de supprimer.", type: "error" });
      return { ok: false, status: "failed", message: err.message };
    }
  }

  async function moveFile(id, parentId) {
    try {
      const file = files.find((entry) => String(entry.id) === String(id));
      if (!file) throw new Error("Fichier introuvable");
      if (isDriveConnected(repository)) {
        await driveClient.move(id, parentId, file.parentId);
      } else {
        repository.files.update(id, { parentId });
      }
      await refreshFiles();
      renderAll();
      notify({ id: "file-moved", title: "Fichiers", message: "Élément déplacé.", type: "success", duration: 2200 });
      return completed("Élément déplacé");
    } catch (err) {
      notify({ id: "file-move-error", title: "Fichiers", message: err.message || "Impossible de déplacer.", type: "error" });
      return { ok: false, status: "failed", message: err.message };
    }
  }

  async function downloadFile(id) {
    try {
      const { blob } = await driveClient.download(id);
      const file = files.find((entry) => String(entry.id) === String(id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file?.name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify({ id: "file-downloaded", title: "Fichiers", message: "Téléchargement démarré.", type: "success", duration: 2200 });
      return completed("Téléchargement démarré");
    } catch (err) {
      notify({ id: "file-download-error", title: "Fichiers", message: err.message || "Impossible de télécharger.", type: "error" });
      return { ok: false, status: "failed", message: err.message };
    }
  }

  async function createShareLink(id) {
    const file = files.find((entry) => String(entry.id) === String(id));
    if (!file) return completed("Fichier introuvable");
    if (file.type === "folder") return completed("Les dossiers ne peuvent pas être partagés");
    try {
      const cloudFile = await driveClient.getCloudFile(id);
      if (!cloudFile?.id) return completed("Fichier non synchronisé");
      const share = await externalServices.cloudShares.create({
        fileId: cloudFile.id,
        visibility: "public",
        maxDownloads: 0
      });
      const url = `${window.location.origin}/s/${share.data.share.slug}`;
      await navigator.clipboard.writeText(url);
      notify({ id: "file-share-created", title: "Fichiers", message: "Lien de partage copié dans le presse-papiers.", type: "success", duration: 3000 });
      return completed("Lien copié", share.data.share);
    } catch (err) {
      notify({ id: "file-share-error", title: "Fichiers", message: err.message || "Impossible de créer le partage.", type: "error" });
      return { ok: false, status: "failed", message: err.message };
    }
  }

  async function analyzeFile(id) {
    const file = files.find((entry) => String(entry.id) === String(id));
    if (!file) return completed("Fichier introuvable");
    if (file.type === "folder") return completed("Les dossiers ne peuvent pas être analysés");
    try {
      const folders = files.filter((entry) => entry.type === "folder");
      const result = await driveClient.brain(id, folders);
      if (result?.data?.summary) {
        file.brainSummary = result.data.summary;
        file.brainSuggestedFolderId = result.data.suggestedFolderId;
        file.brainSuggestedFolderName = result.data.suggestedFolderName;
        renderAll();
        notify({ id: "file-brain-complete", title: "Fichiers", message: result.data.suggestedFolderName ? `Analyse terminée. Suggestion : ${result.data.suggestedFolderName}.` : "Analyse terminée.", type: "success", duration: 3000 });
        return completed("Analyse terminée", result.data);
      }
      notify({ id: "file-brain-empty", title: "Fichiers", message: "Aucun résultat d'analyse.", type: "info" });
      return completed("Aucun résultat");
    } catch (err) {
      notify({ id: "file-brain-error", title: "Fichiers", message: err.message || "L'analyse a échoué.", type: "error" });
      return { ok: false, status: "failed", message: err.message };
    }
  }

  async function uploadFiles(fileList) {
    if (!isDriveConnected(repository)) {
      notify({ id: "drive-not-connected", title: "Fichiers", message: "Connectez Google Drive pour envoyer des fichiers.", type: "warning" });
      return completed("Connexion requise");
    }
    const filesToUpload = Array.from(fileList || []);
    if (!filesToUpload.length) return completed("Aucun fichier");
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine !== false : true;
    if (!isOnline) {
      for (const file of filesToUpload) {
        const buffer = await file.arrayBuffer();
        await cloudCache.queue("upload", { name: file.name, mimeType: file.type, size: file.size, parentId: currentFolderId, buffer });
      }
      notify({ id: "files-queued", title: "Fichiers", message: `${filesToUpload.length} fichier${filesToUpload.length > 1 ? "s" : ""} en attente de connexion.`, type: "info", duration: 3000 });
      return completed("Uploads mis en file");
    }
    for (const file of filesToUpload) {
      try {
        await driveClient.upload(file, { name: file.name, parentId: currentFolderId });
      } catch (err) {
        notify({ id: "file-upload-error", title: "Fichiers", message: `${file.name} : ${err.message || "Échec de l'upload."}`, type: "error" });
      }
    }
    await refreshFiles();
    renderAll();
    notify({ id: "files-uploaded", title: "Fichiers", message: `${filesToUpload.length} fichier${filesToUpload.length > 1 ? "s" : ""} envoyé${filesToUpload.length > 1 ? "s" : ""}.`, type: "success", duration: 2400 });
    return completed("Upload terminé");
  }

  function openMoveMenu(id, anchor) {
    const file = files.find((entry) => String(entry.id) === String(id));
    if (!file) return false;
    const blocked = file.type === "folder" ? descendantFolderIds(files, id) : new Set();
    const destinations = files.filter((entry) => entry.type === "folder" && entry.id !== id && !blocked.has(entry.id));
    const items = [
      { label: "Bibliothèque (racine)", icon: "corner-left-up", disabled: !file.parentId, onSelect: () => moveFile(id, null) },
      ...destinations.map((folder) => ({
        label: folder.name,
        icon: "folder",
        disabled: folder.id === file.parentId,
        onSelect: () => moveFile(id, folder.id)
      }))
    ];
    return rowMenu.open(anchor, items, { label: `Déplacer ${file.name}` });
  }

  async function editTags(id) {
    const file = files.find((entry) => String(entry.id) === String(id));
    if (!file) return completed("Fichier introuvable");
    const current = Array.isArray(file.tags) ? file.tags.join(", ") : "";
    const value = prompt("Tags (séparés par des virgules)", current);
    if (value == null) return completed("Édition annulée");
    const tags = value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
    try {
      await driveClient.updateTags(id, tags);
      file.tags = tags;
      renderAll();
      notify({ id: "file-tags-updated", title: "Fichiers", message: tags.length ? `${tags.length} tag${tags.length > 1 ? "s" : ""} mis à jour.` : "Tags supprimés.", type: "success", duration: 2200 });
      return completed("Tags mis à jour");
    } catch (err) {
      notify({ id: "file-tags-error", title: "Fichiers", message: err.message || "Impossible de mettre à jour les tags.", type: "error" });
      return { ok: false, status: "failed", message: err.message };
    }
  }

  function openFileMenu(id, anchor, point = null) {
    const file = files.find((entry) => String(entry.id) === String(id));
    if (!file) return false;
    const isDrive = isDriveConnected(repository) && file.driveId;
    const items = [
      { label: "Renommer", icon: "pencil", onSelect: () => renameFile(id) },
      { label: "Déplacer vers...", icon: "folder-input", onSelect: () => openMoveMenu(id, anchor) },
      { label: file.favorite ? "Retirer des favoris" : "Ajouter aux favoris", icon: file.favorite ? "star-off" : "star", onSelect: () => toggleFavorite(id) },
      { label: "Éditer les tags", icon: "tag", onSelect: () => editTags(id) },
      { label: selection.has(id) ? "Retirer de la sélection" : "Ajouter à la sélection", icon: selection.has(id) ? "square-minus" : "square-check-big", onSelect: () => toggleFileSelection(id) }
    ];
    if (isDrive && file.type !== "folder") items.push({ label: "Télécharger", icon: "download", onSelect: () => downloadFile(id) });
    items.push({ separator: true });
    items.push({ label: "Supprimer", icon: "trash-2", tone: "danger", onSelect: () => removeFile(id) });
    return rowMenu.open(anchor, items, { label: `Actions pour ${file.name}`, point });
  }

  function openUploadDialog() {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.addEventListener("change", () => uploadFiles(input.files));
    input.click();
  }

  scopedActions.push(actions.scope("v8.files.new-folder", () => openComposer("folder")));
  scopedActions.push(actions.scope("v8.files.upload", openUploadDialog));
  scopedActions.push(actions.scope("v8.files.new.cancel", closeComposer));

  async function handleClick(event) {
    const crumb = event.target.closest("[data-files-breadcrumb]");
    if (crumb && page.contains(crumb)) {
      const crumbId = crumb.dataset.filesBreadcrumb;
      navigateToFolder(crumbId === "root" ? null : crumbId);
      return;
    }
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
      const id = item.dataset.fileId;
      const file = files.find((entry) => String(entry.id) === String(id));
      if (file?.type === "folder") {
        navigateToFolder(file.id);
        return;
      }
      selectedId = id;
      renderContent();
      renderPreview();
      return;
    }
    const favorite = event.target.closest("[data-file-favorite]");
    if (favorite && page.contains(favorite)) {
      await toggleFavorite(favorite.dataset.fileFavorite);
      return;
    }
    const remove = event.target.closest("[data-file-delete]");
    if (remove && page.contains(remove)) {
      await removeFile(remove.dataset.fileDelete);
      return;
    }
    const rename = event.target.closest("[data-file-rename]");
    if (rename && page.contains(rename)) {
      await renameFile(rename.dataset.fileRename);
      return;
    }
    const download = event.target.closest("[data-file-download]");
    if (download && page.contains(download)) {
      await downloadFile(download.dataset.fileDownload);
      return;
    }
    const brain = event.target.closest("[data-file-brain]");
    if (brain && page.contains(brain)) {
      await analyzeFile(brain.dataset.fileBrain);
      return;
    }
    const share = event.target.closest("[data-file-share]");
    if (share && page.contains(share)) {
      await createShareLink(share.dataset.fileShare);
      return;
    }
    const admin = event.target.closest("[data-file-admin]");
    if (admin && page.contains(admin)) {
      await openAdmin();
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

  function handleDragOver(event) {
    event.preventDefault();
    content.classList.add("is-dragover");
  }

  function handleDragLeave(event) {
    if (!content.contains(event.relatedTarget)) content.classList.remove("is-dragover");
  }

  function handleDrop(event) {
    event.preventDefault();
    content.classList.remove("is-dragover");
    uploadFiles(event.dataTransfer.files);
  }

  const renderSearchResults = debounce(renderContent, 120);

  function handleSearch() {
    query = search.value;
    renderSearchResults();
  }

  function handleSort() {
    sort = sortSelect.value;
    renderContent();
  }

  page.addEventListener("click", handleClick);
  page.addEventListener("contextmenu", handleContextMenu);
  page.addEventListener("keydown", handleKeyboard);
  content.addEventListener("dragover", handleDragOver);
  content.addEventListener("dragleave", handleDragLeave);
  content.addEventListener("drop", handleDrop);
  search.addEventListener("input", handleSearch);
  sortSelect.addEventListener("change", handleSort);

  async function processQueue() {
    if (!cloudCache || !isDriveConnected(repository)) return;
    const items = await cloudCache.drainQueue();
    if (!items.length) return;
    for (const item of items) {
      if (item.type !== "upload" || !item.payload?.buffer) continue;
      try {
        const { name, mimeType, parentId, buffer } = item.payload;
        const file = new File([buffer], name, { type: mimeType });
        await driveClient.upload(file, { name, parentId });
      } catch (err) {
        notify({ id: "file-queue-error", title: "Fichiers", message: `${item.payload?.name || "Fichier"} : ${err.message || "Échec de l'upload différé."}`, type: "error" });
        await cloudCache.queue(item.type, item.payload);
      }
    }
    await refreshFiles();
    renderAll();
  }

  function onNetworkChange() {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine !== false : true;
    if (cloudCache) cloudCache.setOnline(isOnline);
    if (isOnline) {
      notify({ id: "files-online", title: "Fichiers", message: "Connexion restaurée. Synchronisation...", type: "success", duration: 2200 });
      Promise.all([refreshFiles().then(renderAll).catch(() => renderAll()), processQueue().catch(() => {})]);
    } else {
      notify({ id: "files-offline", title: "Fichiers", message: "Mode hors ligne. Données locales affichées.", type: "info", duration: 3000 });
      refreshFiles().then(renderAll).catch(() => renderAll());
    }
  }
  globalThis.addEventListener?.("online", onNetworkChange);
  globalThis.addEventListener?.("offline", onNetworkChange);

  stage.replaceChildren(page);
  cloudCache?.setOnline?.(typeof navigator !== "undefined" ? navigator.onLine !== false : true);
  refreshFiles().then(renderAll).catch(() => renderAll());

  const releaseDensity = options.subscribeState?.((next) => updateCollectionDensityControl(densityControl, next)) || (() => {});
  const releaseTypeToSelect = attachTypeToSelect(page, ".v8-file-row, .v8-file-card", (el) => {
    const title = el.querySelector("strong");
    return title ? title.textContent : "";
  });
  refreshIcons();

  return () => {
    mounted = false;
    rowMenu.destroy();
    releaseDensity();
    releaseTypeToSelect();
    scopedActions.reverse().forEach((restore) => restore());
    page.removeEventListener("click", handleClick);
    page.removeEventListener("contextmenu", handleContextMenu);
    page.removeEventListener("keydown", handleKeyboard);
    content.removeEventListener("dragover", handleDragOver);
    content.removeEventListener("dragleave", handleDragLeave);
    content.removeEventListener("drop", handleDrop);
    search.removeEventListener("input", handleSearch);
    sortSelect.removeEventListener("change", handleSort);
    globalThis.removeEventListener?.("online", onNetworkChange);
    globalThis.removeEventListener?.("offline", onNetworkChange);
    page.remove();
  };
}
