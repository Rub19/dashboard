import { FormEvent } from "react";
import Select from "./Select";
import { ItemKind } from "./api";
import { t, tr } from "./i18n";
import { Button } from "./ui";

export interface ProductivityDraft {
  title: string;
  body: string;
  startAt: string;
  endAt: string;
  due: string;
  priority: string;
}

interface Props {
  kind: ItemKind;
  draft: ProductivityDraft;
  saving: boolean;
  onChange: (draft: ProductivityDraft) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
}

export default function ProductivityEditor({ kind, draft, saving, onChange, onCancel, onSubmit }: Props) {
  const update = (field: keyof ProductivityDraft, value: string) => onChange({ ...draft, [field]: value });

  return (
    <form className="item-editor" onSubmit={onSubmit}>
      <label><span>{t("title")}</span><input autoFocus required maxLength={200} value={draft.title} onChange={(event) => update("title", event.target.value)} /></label>
      {kind === "events" && (
        <div className="event-dates">
          <label><span>{t("startsAt")}</span><input type="datetime-local" required value={draft.startAt} onChange={(event) => update("startAt", event.target.value)} /></label>
          <label><span>{t("endsAt")}</span><input type="datetime-local" value={draft.endAt} min={draft.startAt || undefined} onChange={(event) => update("endAt", event.target.value)} /></label>
        </div>
      )}
      {kind === "tasks" && (
        <div className="event-dates">
          <label><span>{tr("Échéance", "Due date")}</span><input type="date" value={draft.due} onChange={(event) => update("due", event.target.value)} /></label>
          <label><span>{tr("Priorité", "Priority")}</span><Select value={draft.priority} onChange={(event) => update("priority", event.target.value)}><option value="low">{tr("Basse", "Low")}</option><option value="medium">{tr("Normale", "Normal")}</option><option value="high">{tr("Haute", "High")}</option></Select></label>
        </div>
      )}
      <label><span>{kind === "notes" ? t("content") : t("description")}</span><textarea maxLength={10000} rows={kind === "notes" ? 6 : 3} value={draft.body} onChange={(event) => update("body", event.target.value)} /></label>
      <div className="editor-actions"><Button disabled={saving} onClick={onCancel}>{t("cancel")}</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? t("saving") : t("save")}</Button></div>
    </form>
  );
}
