import { useMemo, useState } from "react";
import { ChevronRight, ExternalLink, FileText, Folder, Link2, Search, Star, Trash2 } from "lucide-react";
import { apiCall, apiData, openExternal, openSite } from "./api";
import { firstArray, Json, JsonList } from "./generic";
import { errorText, tr } from "./i18n";
import { Drawer, Empty, ErrorBox, formatBytes, PageHead, SideNav, Skeletons, Stagger, StaggerItem, staggerItem, Status, useLoad } from "./kit";
import { Button } from "./ui";

type Section = "all" | "favorites" | "shares" | "drops" | "activity";
interface CloudFile { id: string; driveFileId?: string; parentId: string | null; name: string; mimeType: string; isFolder: boolean; size: number; webViewLink?: string; updatedAt?: string; isFavorite: boolean; trashed?: boolean; tags?: string[]; brainSummary?: string }

function Browser({ favorites }: { favorites: boolean }) {
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<CloudFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parent = path.at(-1)?.id;
  const state = useLoad(async () => {
    if (favorites) return firstArray(await apiCall<Json>("api/cloud/files/favorites")) as unknown as CloudFile[];
    const params = new URLSearchParams({ limit: "500" });
    if (parent) params.set("parentId", parent);
    return firstArray(await apiCall<Json>(`api/cloud/files?${params}`)) as unknown as CloudFile[];
  }, [favorites, parent]);
  const files = useMemo(() => {
    const text = query.trim().toLowerCase();
    const rows = (state.data ?? []).filter((file) => !file.trashed && (favorites || parent || !file.parentId || !(state.data ?? []).some((other) => other.id === file.parentId)));
    return rows.filter((file) => !text || file.name.toLowerCase().includes(text)).sort((left, right) => Number(right.isFolder) - Number(left.isFolder) || left.name.localeCompare(right.name));
  }, [favorites, parent, query, state.data]);
  const run = async (action: () => Promise<unknown>, close = false) => {
    setError(null);
    try {
      await action();
      if (close) setOpen(null);
      state.reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  return (
    <>
      <PageHead title={favorites ? tr("Favoris", "Favorites") : tr("Mes fichiers", "My files")} onRefresh={() => void apiCall("api/cloud/files/sync", "POST", {}).catch(() => null).then(state.reload)} refreshing={state.loading} />
      {!favorites && path.length > 0 && (
        <nav className="files-path" aria-label={tr("Emplacement", "Location")}>
          <button type="button" onClick={() => setPath([])}>{tr("Accueil", "Home")}</button>
          {path.map((item, index) => <span key={item.id}><ChevronRight size={13} /><button type="button" onClick={() => setPath(path.slice(0, index + 1))}>{item.name}</button></span>)}
        </nav>
      )}
      <label className="discord-search files-search"><Search size={14} /><input value={query} placeholder={tr("Chercher un fichier", "Find a file")} aria-label={tr("Chercher un fichier", "Find a file")} onChange={(event) => setQuery(event.target.value)} /></label>
      {(error || state.error) && <ErrorBox message={error ?? state.error ?? ""} onRetry={state.reload} />}
      {!state.data ? (state.loading ? <Skeletons count={5} height={48} /> : null) : files.length === 0 ? (
        <Empty title={tr("Aucun fichier", "No files")} text={tr("Connecte Google Drive ou ajoute des fichiers depuis ethone.dev.", "Link Google Drive or add files from ethone.dev.")} action={<Button onClick={() => void openSite("account")}>{tr("Ouvrir ethone.dev", "Open ethone.dev")}</Button>} />
      ) : (
        <Stagger className="files-list">
          {files.map((file) => (
            <StaggerItem key={file.id} variants={staggerItem}>
              <button type="button" onClick={() => (file.isFolder ? setPath([...path, { id: file.id, name: file.name }]) : setOpen(file))}>
                {file.isFolder ? <Folder size={18} /> : <FileText size={18} />}
                <b>{file.name}</b>
                {file.isFavorite && <Star size={13} className="files-star" />}
                <small>{file.isFolder ? "" : formatBytes(file.size)}</small>
                <small>{file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : ""}</small>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <Drawer open={Boolean(open)} title={open?.name ?? ""} onClose={() => setOpen(null)} width={460}>
        {open && (
          <>
            <dl className="generic-fields">
              <div><dt>{tr("Taille", "Size")}</dt><dd>{formatBytes(open.size)}</dd></div>
              <div><dt>{tr("Type", "Type")}</dt><dd>{open.mimeType}</dd></div>
              {open.updatedAt && <div><dt>{tr("Modifié", "Modified")}</dt><dd>{new Date(open.updatedAt).toLocaleString()}</dd></div>}
              {open.brainSummary && <div className="block"><dt>{tr("Résumé", "Summary")}</dt><dd>{open.brainSummary}</dd></div>}
            </dl>
            <div className="row">
              {open.webViewLink && <Button variant="primary" onClick={() => void openExternal(open.webViewLink ?? "")}><ExternalLink size={15} />{tr("Ouvrir", "Open")}</Button>}
              <Button onClick={() => void run(() => apiData(`api/cloud/file/favorite?driveFileId=${encodeURIComponent(open.driveFileId ?? open.id)}`, "POST", { favorite: !open.isFavorite }), true)}><Star size={15} />{open.isFavorite ? tr("Retirer des favoris", "Remove favorite") : tr("Ajouter aux favoris", "Add favorite")}</Button>
              <Button onClick={() => void run(() => apiData("api/cloud/shares", "POST", { fileId: open.driveFileId ?? open.id, visibility: "link" }), true)}><Link2 size={15} />{tr("Créer un lien", "Create a link")}</Button>
              {open.driveFileId && <Button className="danger" onClick={() => void run(() => apiData("api/google-drive/files/trash", "POST", { clientId: crypto.randomUUID(), fileId: open.driveFileId }), true)}><Trash2 size={15} />{tr("Mettre à la corbeille", "Move to trash")}</Button>}
            </div>
            {error && <ErrorBox message={error} />}
          </>
        )}
      </Drawer>
    </>
  );
}

function Remote({ title, path, revoke, revokeKey }: { title: string; path: string; revoke?: string; revokeKey?: string }) {
  const state = useLoad(() => apiCall<Json>(path), [path]);
  return (
    <>
      <PageHead title={title} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>
        {(data) => <JsonList rows={firstArray(data)} onChanged={state.reload} actions={revoke ? [{ title: tr("Révoquer", "Revoke"), destructive: true, run: (row) => apiData(revoke, "POST", { [revokeKey ?? "id"]: row && typeof row === "object" && !Array.isArray(row) ? row.id : null }) }] : []} />}
      </Status>
    </>
  );
}

export default function FilesPage() {
  const [section, setSection] = useState<Section>("all");
  const quota = useLoad(() => apiCall<Json>("api/google-drive/quota").catch(() => null));
  const items = [
    { id: "all", label: tr("Mes fichiers", "My files"), icon: <Folder size={16} /> },
    { id: "favorites", label: tr("Favoris", "Favorites"), icon: <Star size={16} /> },
    { id: "shares", label: tr("Liens de partage", "Share links"), icon: <Link2 size={16} /> },
    { id: "drops", label: tr("Dépôts", "Drops"), icon: <FileText size={16} /> },
    { id: "activity", label: tr("Activité", "Activity"), icon: <Search size={16} /> },
  ] as const;
  const usage = quota.data && typeof quota.data === "object" && !Array.isArray(quota.data) ? ((quota.data.data ?? quota.data) as { used?: number; total?: number }) : null;
  return (
    <div className="kit-split">
      <div>
        <SideNav items={items} value={section} onChange={setSection} id="files" label={tr("Fichiers", "Files")} />
        {usage?.total ? <p className="muted small files-quota">{formatBytes(usage.used ?? 0)} / {formatBytes(usage.total)}</p> : null}
      </div>
      <div className="kit-split-body">
        {section === "all" && <Browser favorites={false} />}
        {section === "favorites" && <Browser favorites />}
        {section === "shares" && <Remote title={tr("Liens de partage", "Share links")} path="api/cloud/shares" revoke="api/cloud/shares/revoke" revokeKey="shareId" />}
        {section === "drops" && <Remote title={tr("Dépôts", "Drops")} path="api/cloud/drops" revoke="api/cloud/drops/revoke" revokeKey="dropId" />}
        {section === "activity" && <Remote title={tr("Activité", "Activity")} path="api/cloud/activity?limit=100" />}
      </div>
    </div>
  );
}
