"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWorker } from "@/lib/api";
import { useMailCache } from "./useMailCache";
import { useLivePoll } from "./useLivePoll";

export type MailAttachment = {
  filename: string;
  size: number;
  mime_type: string;
  content?: string;
  url?: string;
};

export type MailMessage = {
  id: string;
  thread_id: string;
  user_id: string;
  folder: string;
  direction: "inbound" | "outbound";
  from_address: string;
  from_name?: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  reply_to?: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  snippet?: string;
  is_read: boolean;
  is_starred: boolean;
  is_important: boolean;
  labels: string[];
  attachments: MailAttachment[];
  received_at: string;
  sent_at?: string;
  scheduled_at?: string;
  snoozed_until?: string;
  headers?: Record<string, string | null>;
};

export type MailLabel = {
  id: string;
  name: string;
  color?: string;
};

export type MailSignature = {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
};

export type MailTemplate = {
  id: string;
  name: string;
  subject: string;
  content: string;
  is_default: boolean;
};

export type MailRule = {
  id: string;
  name: string;
  is_active: boolean;
  priority: number;
  condition_from?: string;
  condition_domain?: string;
  condition_subject?: string;
  condition_body?: string;
  condition_has_attachments?: boolean;
  action_mark_read?: boolean;
  action_mark_important?: boolean;
  action_mark_spam?: boolean;
  action_archive?: boolean;
  action_move_to?: string;
  action_label?: string;
  action_forward?: string;
  action_auto_reply?: string;
};

export type MailContact = {
  id: string;
  email: string;
  name?: string;
  frequency?: number;
};

export type MailSender = {
  id: string;
  email?: string;
  domain?: string;
  reason?: string;
};

export type MailAlias = {
  id: string;
  alias: string;
  display_name: string;
  is_primary: boolean;
};

export type MailAccount = {
  id: string;
  provider: "gmail" | "outlook" | "imap";
  email: string;
  name?: string;
  is_enabled: boolean;
  created_at?: string;
};

export type MailPgpKey = {
  id: string;
  email: string;
  fingerprint: string;
  public_key?: string;
  private_key_encrypted?: string;
  is_active: boolean;
  created_at?: string;
};

export type MailPushSubscription = {
  id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  created_at?: string;
};

export type MailList = {
  id: string;
  alias_address: string;
  name: string;
  description?: string;
  is_public: boolean;
  reply_to_list: boolean;
};

export type MailListMember = {
  id: string;
  list_id: string;
  email: string;
  name?: string;
  is_active: boolean;
};

export function useMail() {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [folder, setFolder] = useState("inbox");
  const [label, setLabel] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [labels, setLabels] = useState<MailLabel[]>([]);
  const [signatures, setSignatures] = useState<MailSignature[]>([]);
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [rules, setRules] = useState<MailRule[]>([]);
  const [blocked, setBlocked] = useState<MailSender[]>([]);
  const [trusted, setTrusted] = useState<MailSender[]>([]);
  const [aliases, setAliases] = useState<MailAlias[]>([]);
  const [aliasesLoading, setAliasesLoading] = useState(true);
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [pgpKeys, setPgpKeys] = useState<MailPgpKey[]>([]);
  const [pushSubscriptions, setPushSubscriptions] = useState<MailPushSubscription[]>([]);
  const [lists, setLists] = useState<MailList[]>([]);
  const { cache } = useMailCache();
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      p.set("folder", folder);
      if (label) p.set("label", label);

      const searchTerm = search.trim();
      let res;
      if (searchTerm) {
        p.set("q", searchTerm);
        res = await fetchWorker(`/api/mail/search?${p.toString()}`);
      } else {
        res = await fetchWorker(`/api/mail/inbox?${p.toString()}`);
      }

      const list = Array.isArray(res?.data) ? res.data : [];
      setMessages(list);
      if (typeof res?.meta?.unread === "number") {
        setUnread(res.meta.unread);
      }
      if (cache && !search.trim()) {
        const cacheKey = label ? `${folder}:${label}` : folder;
        await cache.putMessages(cacheKey, list);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [folder, label, search, cache]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      if (cache && !cacheLoaded && !search.trim()) {
        const cacheKey = label ? `${folder}:${label}` : folder;
        const cached = await cache.getMessages(cacheKey);
        if (Array.isArray(cached) && cached.length) {
          setMessages(cached as MailMessage[]);
        }
        setCacheLoaded(true);
      }
      await fetchMessages();
    }
    init();
  }, [fetchMessages, cache, cacheLoaded, folder, label, search]);

  useLivePoll(fetchMessages, { minGapMs: 30000 });

  const fetchLabels = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/mail/labels");
      setLabels(Array.isArray(res?.data) ? res.data : []);
    } catch {}
  }, []);

  const fetchSignatures = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/mail/signatures");
      setSignatures(Array.isArray(res?.data) ? res.data : []);
    } catch {}
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/mail/templates");
      const list = Array.isArray(res?.data) ? res.data : [];
      setTemplates(list);
      if (cache) await cache.putTemplates(list);
    } catch {}
  }, [cache]);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/mail/rules");
      const list = Array.isArray(res?.data) ? res.data : [];
      setRules(list);
      if (cache) await cache.putRules(list);
    } catch {}
  }, [cache]);

  const fetchBlocked = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/mail/blocked");
      setBlocked(Array.isArray(res?.data) ? res.data : []);
    } catch {}
  }, []);

  const fetchTrusted = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/mail/trusted");
      setTrusted(Array.isArray(res?.data) ? res.data : []);
    } catch {}
  }, []);

  const fetchAliases = useCallback(async () => {
    setAliasesLoading(true);
    try {
      const res = await fetchWorker("/api/mail/alias");
      setAliases(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setAliases([]);
    } finally {
      setAliasesLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/mail/accounts");
      setAccounts(Array.isArray(res?.data) ? res.data : []);
    } catch {}
  }, []);

  const fetchPgpKeys = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/mail/pgp/keys");
      setPgpKeys(Array.isArray(res?.data) ? res.data : []);
    } catch {}
  }, []);

  const fetchPushSubscriptions = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/mail/push/subscriptions");
      setPushSubscriptions(Array.isArray(res?.data) ? res.data : []);
    } catch {}
  }, []);

  const fetchLists = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/mail/lists");
      setLists(Array.isArray(res?.data) ? res.data : []);
    } catch {}
  }, []);

  useEffect(() => {
    if (cache) {
      Promise.all([cache.getTemplates(), cache.getRules()]).then(([cachedTemplates, cachedRules]) => {
        if (cachedTemplates.length) setTemplates(cachedTemplates as MailTemplate[]);
        if (cachedRules.length) setRules(cachedRules as MailRule[]);
      });
    }
    fetchLabels();
    fetchSignatures();
    fetchTemplates();
    fetchRules();
    fetchBlocked();
    fetchTrusted();
    fetchAliases();
    fetchAccounts();
    fetchPgpKeys();
    fetchPushSubscriptions();
    fetchLists();
  }, [fetchLabels, fetchSignatures, fetchTemplates, fetchRules, fetchBlocked, fetchTrusted, fetchAliases, fetchAccounts, fetchPgpKeys, fetchPushSubscriptions, fetchLists, cache]);

  async function getThread(threadId: string) {
    const res = await fetchWorker(`/api/mail/thread?thread_id=${encodeURIComponent(threadId)}`);
    return Array.isArray(res?.data) ? res.data as MailMessage[] : [];
  }

  async function sendMail(input: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: MailAttachment[];
    in_reply_to?: string;
    references?: string[];
    draft_id?: string;
    alias_id?: string;
  }) {
    const res = await fetchWorker("/api/mail/send", { method: "POST", body: JSON.stringify(input) });
    await fetchMessages();
    return res?.data;
  }

  async function saveDraft(input: {
    id?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    text?: string;
    html?: string;
    alias_id?: string;
  }) {
    const res = await fetchWorker("/api/mail/drafts", { method: "POST", body: JSON.stringify(input) });
    await fetchMessages();
    return res?.data;
  }

  async function deleteDraft(id: string) {
    await fetchWorker("/api/mail/drafts", { method: "DELETE", body: JSON.stringify({ id }) });
    await fetchMessages();
  }

  async function setFlags(ids: string[], flags: { is_read?: boolean; is_starred?: boolean; is_important?: boolean }) {
    for (const id of ids) {
      await fetchWorker("/api/mail/read", { method: "POST", body: JSON.stringify({ id, ...flags }) });
    }
    await fetchMessages();
  }

  async function moveMessages(ids: string[], target: string) {
    await fetchWorker("/api/mail/move", { method: "POST", body: JSON.stringify({ ids, folder: target }) });
    await fetchMessages();
  }

  async function bulkAction(ids: string[], action: string, target?: string) {
    await fetchWorker("/api/mail/bulk", { method: "POST", body: JSON.stringify({ ids, action, target }) });
    await fetchMessages();
  }

  async function snoozeMessage(id: string, until: string) {
    await fetchWorker("/api/mail/snooze", { method: "POST", body: JSON.stringify({ id, snoozed_until: until }) });
    await fetchMessages();
  }

  async function scheduleMail(input: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: MailAttachment[];
    scheduled_at: string;
  }) {
    const res = await fetchWorker("/api/mail/schedule", { method: "POST", body: JSON.stringify(input) });
    await fetchMessages();
    return res?.data;
  }

  async function createLabel(name: string, color?: string) {
    const res = await fetchWorker("/api/mail/labels", { method: "POST", body: JSON.stringify({ name, color }) });
    await fetchLabels();
    return res?.data;
  }

  async function assignLabel(ids: string[], labelId: string, remove = false) {
    const labelName = labels.find((l) => l.id === labelId)?.name;
    if (!labelName) return;
    await fetchWorker("/api/mail/labels", { method: "PATCH", body: JSON.stringify({ ids, label: labelName, remove }) });
    await fetchMessages();
    await fetchLabels();
  }

  async function deleteLabel(id: string) {
    await fetchWorker("/api/mail/labels", { method: "DELETE", body: JSON.stringify({ id }) });
    await fetchLabels();
    await fetchMessages();
  }

  async function createSignature(name: string, content: string, isDefault = false) {
    const res = await fetchWorker("/api/mail/signatures", { method: "POST", body: JSON.stringify({ name, content, is_default: isDefault }) });
    await fetchSignatures();
    return res?.data;
  }

  async function deleteSignature(id: string) {
    await fetchWorker("/api/mail/signatures", { method: "DELETE", body: JSON.stringify({ id }) });
    await fetchSignatures();
  }

  async function createTemplate(name: string, subject: string, content: string, isDefault = false) {
    const res = await fetchWorker("/api/mail/templates", { method: "POST", body: JSON.stringify({ name, subject, content, is_default: isDefault }) });
    await fetchTemplates();
    return res?.data;
  }

  async function updateTemplate(id: string, patch: Partial<MailTemplate>) {
    await fetchWorker("/api/mail/templates", { method: "PATCH", body: JSON.stringify({ id, ...patch }) });
    await fetchTemplates();
  }

  async function deleteTemplate(id: string) {
    await fetchWorker("/api/mail/templates", { method: "DELETE", body: JSON.stringify({ id }) });
    await fetchTemplates();
  }

  async function createRule(rule: Partial<MailRule>) {
    const res = await fetchWorker("/api/mail/rules", { method: "POST", body: JSON.stringify(rule) });
    await fetchRules();
    return res?.data;
  }

  async function updateRule(id: string, patch: Partial<MailRule>) {
    await fetchWorker("/api/mail/rules", { method: "PATCH", body: JSON.stringify({ id, ...patch }) });
    await fetchRules();
  }

  async function deleteRule(id: string) {
    await fetchWorker("/api/mail/rules", { method: "DELETE", body: JSON.stringify({ id }) });
    await fetchRules();
  }

  async function blockSender(input: { email?: string; domain?: string; reason?: string }) {
    await fetchWorker("/api/mail/blocked", { method: "POST", body: JSON.stringify(input) });
    await fetchBlocked();
  }

  async function unblockSender(id: string) {
    await fetchWorker("/api/mail/blocked", { method: "DELETE", body: JSON.stringify({ id }) });
    await fetchBlocked();
  }

  async function trustSender(input: { email?: string; domain?: string }) {
    await fetchWorker("/api/mail/trusted", { method: "POST", body: JSON.stringify(input) });
    await fetchTrusted();
  }

  async function untrustSender(id: string) {
    await fetchWorker("/api/mail/trusted", { method: "DELETE", body: JSON.stringify({ id }) });
    await fetchTrusted();
  }

  async function createAlias(input: string | { alias?: string; display_name?: string; random?: boolean }, displayName?: string) {
    const body = typeof input === "string" ? { alias: input, display_name: displayName } : input;
    const res = await fetchWorker("/api/mail/alias", { method: "POST", body: JSON.stringify(body) });
    await fetchAliases();
    return res?.data;
  }

  async function updateAlias(id: string, patch: { display_name?: string; is_primary?: boolean }) {
    const res = await fetchWorker("/api/mail/alias", { method: "PATCH", body: JSON.stringify({ id, ...patch }) });
    await fetchAliases();
    return res?.data;
  }

  async function analyzeMessage(id: string) {
    return fetchWorker("/api/mail/analyze", { method: "POST", body: JSON.stringify({ id }) });
  }

  async function suggestReplies(id: string) {
    return fetchWorker("/api/mail/suggest", { method: "POST", body: JSON.stringify({ id }) });
  }

  async function getAnalytics(period = 30) {
    return fetchWorker(`/api/mail/analytics?period=${period}`);
  }

  async function createAccount(input: Partial<MailAccount> & Record<string, unknown>) {
    const res = await fetchWorker("/api/mail/accounts", { method: "POST", body: JSON.stringify(input) });
    await fetchAccounts();
    return res?.data;
  }

  async function updateAccount(id: string, input: Partial<MailAccount> & Record<string, unknown>) {
    const res = await fetchWorker("/api/mail/accounts", { method: "PATCH", body: JSON.stringify({ id, ...input }) });
    await fetchAccounts();
    return res?.data;
  }

  async function deleteAccount(id: string) {
    await fetchWorker("/api/mail/accounts", { method: "DELETE", body: JSON.stringify({ id }) });
    await fetchAccounts();
  }

  async function syncAccount(id: string) {
    const res = await fetchWorker("/api/mail/accounts/sync", { method: "POST", body: JSON.stringify({ id }) });
    await fetchMessages();
    return res?.data;
  }

  async function generatePgpKeyPair(passphrase: string) {
    const res = await fetchWorker("/api/mail/pgp/generate", { method: "POST", body: JSON.stringify({ passphrase }) });
    return res?.data;
  }

  async function createPgpKey(input: { email: string; passphrase?: string } & Record<string, unknown>) {
    const res = await fetchWorker("/api/mail/pgp/keys", { method: "POST", body: JSON.stringify(input) });
    await fetchPgpKeys();
    return res?.data;
  }

  async function deletePgpKey(id: string) {
    await fetchWorker("/api/mail/pgp/keys", { method: "DELETE", body: JSON.stringify({ id }) });
    await fetchPgpKeys();
  }

  async function encryptWithPgp(body: string, publicKey: string) {
    return fetchWorker("/api/mail/pgp/encrypt", { method: "POST", body: JSON.stringify({ body, public_key: publicKey }) });
  }

  async function decryptWithPgp(encryptedBody: string, wrappedKey: string, iv: string, privateKey: string, passphrase: string) {
    return fetchWorker("/api/mail/pgp/decrypt", { method: "POST", body: JSON.stringify({ encrypted_body: encryptedBody, wrapped_key: wrappedKey, iv, private_key: privateKey, passphrase }) });
  }

  async function getVapidPublicKey() {
    const res = await fetchWorker("/api/mail/push/vapid-public-key");
    return res?.data?.publicKey || "";
  }

  async function subscribePush(subscription: PushSubscription) {
    const json = subscription.toJSON();
    const res = await fetchWorker("/api/mail/push/subscribe", {
      method: "POST",
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      }),
    });
    await fetchPushSubscriptions();
    return res?.data;
  }

  async function unsubscribePush(endpoint: string) {
    await fetchWorker("/api/mail/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint }) });
    await fetchPushSubscriptions();
  }

  async function sendTestPush(title?: string, body?: string) {
    return fetchWorker("/api/mail/push/send", { method: "POST", body: JSON.stringify({ title, body }) });
  }

  async function createList(input: { alias_address: string; name: string; description?: string; is_public?: boolean; reply_to_list?: boolean }) {
    const res = await fetchWorker("/api/mail/lists", { method: "POST", body: JSON.stringify(input) });
    await fetchLists();
    return res?.data;
  }

  async function updateList(id: string, input: Partial<MailList>) {
    const res = await fetchWorker("/api/mail/lists", { method: "PATCH", body: JSON.stringify({ id, ...input }) });
    await fetchLists();
    return res?.data;
  }

  async function deleteList(id: string) {
    await fetchWorker("/api/mail/lists", { method: "DELETE", body: JSON.stringify({ id }) });
    await fetchLists();
  }

  async function fetchListMembers(listId: string) {
    const res = await fetchWorker(`/api/mail/lists/members?list_id=${encodeURIComponent(listId)}`);
    return Array.isArray(res?.data) ? res.data as MailListMember[] : [];
  }

  async function addListMember(listId: string, email: string, name?: string) {
    const res = await fetchWorker("/api/mail/lists/members", { method: "POST", body: JSON.stringify({ list_id: listId, email, name }) });
    return res?.data;
  }

  async function removeListMember(listId: string, memberId: string) {
    await fetchWorker("/api/mail/lists/members", { method: "DELETE", body: JSON.stringify({ list_id: listId, member_id: memberId }) });
  }

  async function sendToList(listId: string, message: { subject: string; body_text?: string; body_html?: string }) {
    return fetchWorker("/api/mail/lists/send", { method: "POST", body: JSON.stringify({ list_id: listId, message }) });
  }

  async function getContacts(limit = 50) {
    const res = await fetchWorker(`/api/mail/contacts?limit=${encodeURIComponent(limit)}`);
    return Array.isArray(res?.data) ? (res.data as MailContact[]) : [];
  }

  async function extractEntities(messageId: string) {
    const res = await fetchWorker("/api/mail/extract", { method: "POST", body: JSON.stringify({ id: messageId }) });
    return res?.data;
  }

  async function getNotifications({ limit = 20, unreadOnly = false }: { limit?: number; unreadOnly?: boolean } = {}) {
    const res = await fetchWorker(`/api/mail/notifications?limit=${encodeURIComponent(limit)}&unread=${unreadOnly}`);
    return Array.isArray(res?.data) ? res.data : [];
  }

  async function markNotificationRead(notificationId: string, isRead = true) {
    const res = await fetchWorker("/api/mail/notifications", { method: "PATCH", body: JSON.stringify({ id: notificationId, is_read: isRead }) });
    return res?.data;
  }

  const defaultSignature = useMemo(() => signatures.find((s) => s.is_default) || signatures[0], [signatures]);
  const defaultTemplate = useMemo(() => templates.find((t) => t.is_default), [templates]);

  return {
    messages,
    folder,
    setFolder,
    label,
    setLabel,
    search,
    setSearch,
    unread,
    loading,
    error,
    labels,
    signatures,
    templates,
    rules,
    blocked,
    trusted,
    aliases,
    aliasesLoading,
    accounts,
    pgpKeys,
    pushSubscriptions,
    lists,
    defaultSignature,
    defaultTemplate,
    reload: fetchMessages,
    getThread,
    sendMail,
    saveDraft,
    deleteDraft,
    setFlags,
    moveMessages,
    bulkAction,
    snoozeMessage,
    scheduleMail,
    createLabel,
    assignLabel,
    deleteLabel,
    createSignature,
    deleteSignature,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createRule,
    updateRule,
    deleteRule,
    blockSender,
    unblockSender,
    trustSender,
    untrustSender,
    createAlias,
    updateAlias,
    analyzeMessage,
    suggestReplies,
    getAnalytics,
    createAccount,
    updateAccount,
    deleteAccount,
    syncAccount,
    generatePgpKeyPair,
    createPgpKey,
    deletePgpKey,
    encryptWithPgp,
    decryptWithPgp,
    getVapidPublicKey,
    subscribePush,
    unsubscribePush,
    sendTestPush,
    createList,
    updateList,
    deleteList,
    fetchListMembers,
    addListMember,
    removeListMember,
    sendToList,
    getContacts,
    extractEntities,
    getNotifications,
    markNotificationRead,
  };
}
