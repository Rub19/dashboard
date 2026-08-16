"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useMail, type MailAccount, type MailList, type MailPgpKey } from "@/lib/hooks/useMail";
import { useToast } from "@/components/ToastProvider";
import { Icon } from "@/lib/icons";
import Card3D from "@/components/Card3D";
import Select from "@/components/ui/Select";

type Tab = "accounts" | "pgp" | "push" | "lists";

export default function MailAdvancedPanel({ initialTab }: { initialTab: Tab }) {
  const i18n = useI18n();
  const { success, error: toastError } = useToast();
  const {
    accounts,
    createAccount,
    updateAccount,
    deleteAccount,
    syncAccount,
    pgpKeys,
    generatePgpKeyPair,
    createPgpKey,
    deletePgpKey,
    getVapidPublicKey,
    pushSubscriptions,
    subscribePush,
    unsubscribePush,
    sendTestPush,
    lists,
    createList,
    updateList,
    deleteList,
    fetchListMembers,
    addListMember,
    removeListMember,
    sendToList,
  } = useMail();

  const [tab, setTab] = useState<Tab>(initialTab);
  const [busy, setBusy] = useState(false);

  const [accountForm, setAccountForm] = useState<Record<string, string>>({ provider: "gmail", is_enabled: "true" });
  const [editingAccount, setEditingAccount] = useState<MailAccount | null>(null);

  const [pgpEmail, setPgpEmail] = useState("");
  const [pgpPassphrase, setPgpPassphrase] = useState("");
  const [pgpPublic, setPgpPublic] = useState("");
  const [pgpPrivate, setPgpPrivate] = useState("");
  const [pgpGenerated, setPgpGenerated] = useState<MailPgpKey | null>(null);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [vapid, setVapid] = useState("");

  const [listForm, setListForm] = useState({ name: "", alias_address: "", description: "", is_public: false, reply_to_list: false });
  const [editingList, setEditingList] = useState<MailList | null>(null);
  const [selectedList, setSelectedList] = useState<MailList | null>(null);
  const [members, setMembers] = useState<{ id: string; email: string; name?: string }[]>([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberName, setMemberName] = useState("");
  const [listMessage, setListMessage] = useState({ subject: "", body_text: "" });

  const loadPush = useCallback(async () => {
    try {
      const key = await getVapidPublicKey();
      setVapid(key);
      setPushEnabled(Notification.permission === "granted" && pushSubscriptions.length > 0);
    } catch {}
  }, [getVapidPublicKey, pushSubscriptions]);

  useEffect(() => {
    if (tab === "push") loadPush();
  }, [tab, loadPush]);

  async function onGeneratePgp() {
    if (!pgpPassphrase) return toastError(i18n("pgpPassphraseRequired"));
    setBusy(true);
    try {
      const generated = await generatePgpKeyPair(pgpPassphrase);
      if (!pgpEmail) throw new Error("Email required");
      const saved = await createPgpKey({ email: pgpEmail, ...generated });
      setPgpGenerated(saved);
      setPgpPublic(saved.public_key || generated.publicKey || "");
      setPgpPrivate(saved.private_key_encrypted || generated.privateKeyEncrypted || "");
      success(i18n("pgpGenerated"));
    } catch (err) {
      toastError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onImportPgp() {
    if (!pgpEmail || !pgpPublic) return toastError(i18n("pgpImportRequired"));
    setBusy(true);
    try {
      await createPgpKey({ email: pgpEmail, public_key: pgpPublic, private_key_encrypted: pgpPrivate || undefined });
      setPgpPublic("");
      setPgpPrivate("");
      setPgpEmail("");
      success(i18n("pgpImported"));
    } catch (err) {
      toastError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubscribePush() {
    if (!vapid || typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return toastError(i18n("pushNotSupported"));
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return toastError(i18n("pushDenied"));
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) });
      await subscribePush(sub);
      setPushEnabled(true);
      success(i18n("pushSubscribed"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleUnsubscribePush() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await unsubscribePush(sub.endpoint);
      }
      setPushEnabled(false);
      success(i18n("pushUnsubscribed"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleTestPush() {
    try {
      await sendTestPush(i18n("pushTestTitle"), i18n("pushTestBody"));
      success(i18n("pushTestSent"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function onCreateAccount() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { ...accountForm, is_enabled: accountForm.is_enabled === "true" };
      if (editingAccount) {
        await updateAccount(editingAccount.id, payload);
        setEditingAccount(null);
        success(i18n("updated"));
      } else {
        await createAccount(payload);
        success(i18n("created"));
      }
      setAccountForm({ provider: "gmail", is_enabled: "true" });
    } catch (err) {
      toastError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteAccount(id: string) {
    try {
      await deleteAccount(id);
      success(i18n("deleted"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function onSyncAccount(id: string) {
    try {
      await syncAccount(id);
      success(i18n("synced"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function onCreateList() {
    setBusy(true);
    try {
      if (editingList) {
        await updateList(editingList.id, { ...listForm, is_public: listForm.is_public, reply_to_list: listForm.reply_to_list });
        setEditingList(null);
        success(i18n("updated"));
      } else {
        await createList({ ...listForm, is_public: listForm.is_public, reply_to_list: listForm.reply_to_list });
        success(i18n("created"));
      }
      setListForm({ name: "", alias_address: "", description: "", is_public: false, reply_to_list: false });
    } catch (err) {
      toastError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteList(id: string) {
    try {
      await deleteList(id);
      success(i18n("deleted"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function onSelectList(list: MailList) {
    setSelectedList(list);
    try {
      const res = await fetchListMembers(list.id);
      setMembers(res);
    } catch (err) {
      toastError(String(err));
    }
  }

  async function onAddMember() {
    if (!selectedList) return;
    setBusy(true);
    try {
      await addListMember(selectedList.id, memberEmail, memberName);
      setMemberEmail("");
      setMemberName("");
      await onSelectList(selectedList);
      success(i18n("memberAdded"));
    } catch (err) {
      toastError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveMember(memberId: string) {
    if (!selectedList) return;
    try {
      await removeListMember(selectedList.id, memberId);
      await onSelectList(selectedList);
      success(i18n("memberRemoved"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function onSendToList() {
    if (!selectedList) return;
    setBusy(true);
    try {
      await sendToList(selectedList.id, { subject: listMessage.subject, body_text: listMessage.body_text });
      setListMessage({ subject: "", body_text: "" });
      success(i18n("listSent"));
    } catch (err) {
      toastError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-[var(--panel-border)] pb-2">
        {(["accounts", "pgp", "push", "lists"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-t-xl px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--panel-bg)]"}`}
          >
            {i18n(t)}
          </button>
        ))}
      </div>

      {tab === "accounts" && (
        <div className="space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); onCreateAccount(); }} className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={accountForm.provider || "gmail"}
                onChange={(value) => setAccountForm({ ...accountForm, provider: value })}
                options={[
                  { id: "gmail", label: "Gmail (OAuth)" },
                  { id: "outlook", label: "Outlook (OAuth)" },
                  { id: "imap", label: "IMAP" },
                ]}
                aria-label={i18n("provider")}
                className="min-w-0"
              />
              <input type="text" value={accountForm.email || ""} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} placeholder={i18n("email")} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
              <input type="text" value={accountForm.name || ""} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder={i18n("name")} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accountForm.is_enabled === "true"} onChange={(e) => setAccountForm({ ...accountForm, is_enabled: e.target.checked ? "true" : "false" })} /> {i18n("enabled")}</label>
            </div>
            {accountForm.provider === "imap" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <input type="text" value={accountForm.imap_host || ""} onChange={(e) => setAccountForm({ ...accountForm, imap_host: e.target.value })} placeholder="IMAP host" className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <input type="text" value={accountForm.imap_port || "993"} onChange={(e) => setAccountForm({ ...accountForm, imap_port: e.target.value })} placeholder="IMAP port" className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <input type="text" value={accountForm.imap_username || ""} onChange={(e) => setAccountForm({ ...accountForm, imap_username: e.target.value })} placeholder="IMAP username" className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <input type="password" value={accountForm.imap_password || ""} onChange={(e) => setAccountForm({ ...accountForm, imap_password: e.target.value })} placeholder="IMAP password" className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <input type="text" value={accountForm.smtp_host || ""} onChange={(e) => setAccountForm({ ...accountForm, smtp_host: e.target.value })} placeholder="SMTP host" className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <input type="text" value={accountForm.smtp_port || "587"} onChange={(e) => setAccountForm({ ...accountForm, smtp_port: e.target.value })} placeholder="SMTP port" className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <input type="text" value={accountForm.smtp_username || ""} onChange={(e) => setAccountForm({ ...accountForm, smtp_username: e.target.value })} placeholder="SMTP username" className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <input type="password" value={accountForm.smtp_password || ""} onChange={(e) => setAccountForm({ ...accountForm, smtp_password: e.target.value })} placeholder="SMTP password" className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <label className="col-span-full flex items-center gap-2 text-sm"><input type="checkbox" checked={accountForm.imap_secure === "true"} onChange={(e) => setAccountForm({ ...accountForm, imap_secure: e.target.checked ? "true" : "false" })} /> IMAP SSL</label>
                <label className="col-span-full flex items-center gap-2 text-sm"><input type="checkbox" checked={accountForm.smtp_secure === "true"} onChange={(e) => setAccountForm({ ...accountForm, smtp_secure: e.target.checked ? "true" : "false" })} /> SMTP TLS</label>
              </div>
            )}
            {accountForm.provider !== "imap" && (
              <input type="text" value={accountForm.access_token || ""} onChange={(e) => setAccountForm({ ...accountForm, access_token: e.target.value })} placeholder="OAuth access token" className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
            )}
            <button type="submit" disabled={busy} className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{editingAccount ? i18n("update") : i18n("create")}</button>
          </form>

          <div className="space-y-2">
            {accounts.map((a) => (
              <div key={a.id} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.name || a.email}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onSyncAccount(a.id)} className="text-[var(--muted)] hover:text-[var(--accent)]"><Icon name="refresh-cw" className="h-4 w-4" /></button>
                    <button type="button" onClick={() => { setEditingAccount(a); setAccountForm({ ...a, is_enabled: String(a.is_enabled), provider: a.provider } as Record<string, string>); }} className="text-[var(--muted)] hover:text-[var(--accent)]"><Icon name="pencil" className="h-4 w-4" /></button>
                    <button type="button" onClick={() => onDeleteAccount(a.id)} className="text-red-400"><Icon name="trash-2" className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted)]">{a.provider} — {a.email} {a.is_enabled ? `(${i18n("enabled")})` : `(${i18n("disabled")})`}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "pgp" && (
        <div className="space-y-4">
          <Card3D>
            <p className="mb-2 text-sm font-medium">{i18n("pgpGenerate")}</p>
            <div className="space-y-2">
              <input type="email" value={pgpEmail} onChange={(e) => setPgpEmail(e.target.value)} placeholder={i18n("email")} className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
              <input type="password" value={pgpPassphrase} onChange={(e) => setPgpPassphrase(e.target.value)} placeholder={i18n("passphrase")} className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
              <button type="button" onClick={onGeneratePgp} disabled={busy} className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{i18n("pgpGenerate")}</button>
              {pgpGenerated && (
                <div className="space-y-1 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-2 text-xs text-[var(--muted)] break-all">
                  <p><strong>{i18n("fingerprint")}:</strong> {pgpGenerated.fingerprint}</p>
                  <p className="truncate">{i18n("publicKey")}: {pgpGenerated.public_key?.slice(0, 40)}...</p>
                </div>
              )}
            </div>
          </Card3D>

          <Card3D>
            <p className="mb-2 text-sm font-medium">{i18n("pgpImport")}</p>
            <div className="space-y-2">
              <input type="email" value={pgpEmail} onChange={(e) => setPgpEmail(e.target.value)} placeholder={i18n("email")} className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
              <textarea value={pgpPublic} onChange={(e) => setPgpPublic(e.target.value)} placeholder={i18n("publicKey")} className="h-24 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-xs backdrop-blur-[var(--panel-blur)]" />
              <textarea value={pgpPrivate} onChange={(e) => setPgpPrivate(e.target.value)} placeholder={i18n("privateKey")} className="h-24 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-xs backdrop-blur-[var(--panel-blur)]" />
              <button type="button" onClick={onImportPgp} disabled={busy} className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{i18n("pgpImport")}</button>
            </div>
          </Card3D>

          <div className="space-y-2">
            {pgpKeys.map((k) => (
              <div key={k.id} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{k.email}</span>
                  <button type="button" onClick={() => deletePgpKey(k.id)} className="text-red-400"><Icon name="trash-2" className="h-4 w-4" /></button>
                </div>
                <p className="text-xs text-[var(--muted)] break-all">{i18n("fingerprint")}: {k.fingerprint}</p>
                <p className="text-xs text-[var(--muted)] break-all">{k.public_key?.slice(0, 60)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "push" && (
        <div className="space-y-4">
          <Card3D>
            <p className="mb-2 text-sm font-medium">{i18n("pushNotifications")}</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className={pushEnabled ? "text-emerald-400" : "text-[var(--muted)]"}>{pushEnabled ? i18n("pushActive") : i18n("pushInactive")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {!pushEnabled && <button type="button" onClick={handleSubscribePush} className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">{i18n("subscribe")}</button>}
                {pushEnabled && <button type="button" onClick={handleUnsubscribePush} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-2 text-sm">{i18n("unsubscribe")}</button>}
                {pushEnabled && <button type="button" onClick={handleTestPush} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-2 text-sm">{i18n("pushTest")}</button>}
              </div>
              <div className="space-y-1">
                {pushSubscriptions.map((s, i) => (
                  <p key={i} className="break-all text-xs text-[var(--muted)]">{s.endpoint}</p>
                ))}
              </div>
            </div>
          </Card3D>
        </div>
      )}

      {tab === "lists" && (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <input type="text" value={listForm.name} onChange={(e) => setListForm({ ...listForm, name: e.target.value })} placeholder={i18n("name")} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
            <input type="email" value={listForm.alias_address} onChange={(e) => setListForm({ ...listForm, alias_address: e.target.value })} placeholder={i18n("alias")} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
            <input type="text" value={listForm.description} onChange={(e) => setListForm({ ...listForm, description: e.target.value })} placeholder={i18n("description")} className="sm:col-span-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={listForm.is_public} onChange={(e) => setListForm({ ...listForm, is_public: e.target.checked })} /> {i18n("public")}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={listForm.reply_to_list} onChange={(e) => setListForm({ ...listForm, reply_to_list: e.target.checked })} /> {i18n("replyToList")}</label>
            <button type="button" onClick={onCreateList} disabled={busy} className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{editingList ? i18n("update") : i18n("create")}</button>
          </div>

          <div className="space-y-2">
            {lists.map((l) => (
              <div key={l.id} className={`cursor-pointer rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-3 text-sm ${selectedList?.id === l.id ? "bg-[var(--accent)]/10" : ""}`} onClick={() => onSelectList(l)}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{l.name}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setEditingList(l); setListForm({ name: l.name, alias_address: l.alias_address, description: l.description || "", is_public: l.is_public, reply_to_list: l.reply_to_list }); }} className="text-[var(--muted)] hover:text-[var(--accent)]"><Icon name="pencil" className="h-4 w-4" /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteList(l.id); }} className="text-red-400"><Icon name="trash-2" className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted)]">{l.alias_address} — {l.description}</p>
              </div>
            ))}
          </div>

          {selectedList && (
            <Card3D>
              <div className="space-y-3">
              <p className="font-medium">{selectedList.name} — {i18n("members")}</p>
              <div className="flex gap-2">
                <input type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder={i18n("email")} className="flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <input type="text" value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder={i18n("name")} className="flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <button type="button" onClick={onAddMember} disabled={busy} className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{i18n("add")}</button>
              </div>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-2 text-sm">
                    <span>{m.name || m.email}</span>
                    <button type="button" onClick={() => onRemoveMember(m.id)} className="text-red-400"><Icon name="trash-2" className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-[var(--panel-border)] pt-3">
                <p className="text-sm font-medium">{i18n("sendToList")}</p>
                <input type="text" value={listMessage.subject} onChange={(e) => setListMessage({ ...listMessage, subject: e.target.value })} placeholder={i18n("subject")} className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <textarea value={listMessage.body_text} onChange={(e) => setListMessage({ ...listMessage, body_text: e.target.value })} placeholder={i18n("body")} className="h-24 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-sm backdrop-blur-[var(--panel-blur)]" />
                <button type="button" onClick={onSendToList} disabled={busy} className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{i18n("send")}</button>
              </div>
              </div>
            </Card3D>
          )}
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
