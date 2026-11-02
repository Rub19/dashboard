import { FormEvent, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { botCall } from "./api";
import type { Directory } from "./generic";
import { errorText, tr } from "./i18n";
import { Drawer, ErrorBox, Field } from "./kit";
import { Button } from "./ui";

type Kind = "text" | "multiline" | "number" | "toggle" | "channel" | "role" | "dateTime";
interface CreateField { key: string; label: string; kind?: Kind; choices?: [string, string][]; optional?: boolean; initial?: string; hint?: string }
interface Values { text: (key: string) => string; number: (key: string) => number; flag: (key: string) => boolean; roleName: (id: string) => string }
export interface CreateSpec { title: string; path: string; method?: "POST" | "PUT"; fields: CreateField[]; build: (values: Values) => Record<string, unknown> }

const command: CreateSpec = {
  title: "Nouvelle commande", path: "/create",
  fields: [
    { key: "name", label: "Nom de la commande", hint: "Lettres, chiffres, _ et -" },
    { key: "description", label: "Description", optional: true, initial: "Commande personnalisée" },
    { key: "response", label: "Message (facultatif si embed)", kind: "multiline", optional: true },
    { key: "embedTitle", label: "Embed : titre", optional: true },
    { key: "embedDescription", label: "Embed : texte", kind: "multiline", optional: true },
    { key: "embedColor", label: "Embed : couleur", choices: [["#6366F1", "Indigo"], ["#EF4444", "Rouge"], ["#F59E0B", "Ambre"], ["#10B981", "Vert"], ["#3B82F6", "Bleu"], ["#EC4899", "Rose"], ["#FFFFFF", "Blanc"]], optional: true, initial: "#6366F1" },
    { key: "embedImage", label: "Embed : image (lien)", optional: true },
    { key: "embedFooter", label: "Embed : pied de page", optional: true },
    { key: "embedFields", label: "Embed : champs (un par ligne, Nom | Valeur)", kind: "multiline", optional: true },
    { key: "buttonLabel", label: "Bouton lien : texte", optional: true },
    { key: "buttonUrl", label: "Bouton lien : adresse (https://…)", optional: true },
  ],
  build: (c) => {
    const response: Record<string, unknown> = {};
    if (c.text("response")) response.content = c.text("response");
    if (c.text("embedTitle") || c.text("embedDescription") || c.text("embedImage") || c.text("embedFields")) {
      const embed: Record<string, unknown> = { color: c.text("embedColor") || "#6366F1" };
      if (c.text("embedTitle")) embed.title = c.text("embedTitle");
      if (c.text("embedDescription")) embed.description = c.text("embedDescription");
      if (c.text("embedImage")) embed.imageUrl = c.text("embedImage");
      if (c.text("embedFooter")) embed.footerText = c.text("embedFooter");
      const fields = c.text("embedFields").split("\n").flatMap((line) => {
        const [name, ...rest] = line.split("|").map((part) => part.trim());
        return name && rest.join("|") ? [{ name, value: rest.join("|"), inline: false }] : [];
      });
      if (fields.length) embed.fields = fields;
      response.embed = embed;
    }
    if (c.text("buttonLabel") && c.text("buttonUrl").toLowerCase().startsWith("http")) response.buttons = [{ label: c.text("buttonLabel"), url: c.text("buttonUrl"), style: "link" }];
    if (Object.keys(response).length === 0) response.content = "(réponse vide)";
    return { name: c.text("name"), description: c.text("description") || "Commande personnalisée", triggerType: "both", enabled: true, defaultActions: [{ type: "send_response", response }] };
  },
};

export const DISCORD_CREATORS: Record<string, CreateSpec[]> = {
  streamers: [{
    title: "Suivre un streamer", path: "",
    fields: [
      { key: "platform", label: "Plateforme", choices: [["twitch", "Twitch"], ["youtube", "YouTube"], ["kick", "Kick"]], initial: "twitch" },
      { key: "username", label: "Pseudo du streamer" },
      { key: "channelId", label: "Salon d'annonce", kind: "channel" },
      { key: "pingMode", label: "Notification", choices: [["default", "Par défaut du serveur"], ["none", "Aucun ping"], ["here", "@here"], ["everyone", "@everyone"], ["role", "Rôle spécifique"]], initial: "default" },
      { key: "pingRoleId", label: "Rôle à notifier", kind: "role", optional: true },
      { key: "minViewers", label: "Spectateurs minimum", kind: "number", optional: true, initial: "0" },
    ],
    build: (c) => ({ platform: c.text("platform"), username: c.text("username"), channelId: c.text("channelId") || null, pingMode: c.text("pingMode"), ...(c.text("pingRoleId") ? { pingRoleId: c.text("pingRoleId") } : {}), ...(c.number("minViewers") > 0 ? { minViewers: c.number("minViewers") } : {}) }),
  }],
  "secure-roles": [{ title: "Sécuriser un rôle", path: "/roles", fields: [{ key: "roleId", label: "Rôle à sécuriser", kind: "role" }], build: (c) => ({ roleId: c.text("roleId") }) }],
  reminders: [{
    title: "Nouveau rappel", path: "/",
    fields: [
      { key: "in", label: "Dans combien de temps ?", initial: "1h", hint: "Ex. 10m, 2h, 1d, 1h30m" },
      { key: "message", label: "Message", kind: "multiline" },
      { key: "channelId", label: "Salon", kind: "channel" },
      { key: "recurrence", label: "Répétition", choices: [["none", "Aucune"], ["daily", "Tous les jours"], ["weekly", "Toutes les semaines"]], initial: "none" },
    ],
    build: (c) => ({ in: c.text("in"), message: c.text("message"), channelId: c.text("channelId"), recurrence: c.text("recurrence") }),
  }],
  tags: [{ title: "Nouveau tag", path: "/{name}", method: "PUT", fields: [{ key: "name", label: "Nom", hint: "Minuscules, chiffres, _ et - (32 max.)" }, { key: "content", label: "Contenu", kind: "multiline" }], build: (c) => ({ content: c.text("content") }) }],
  "custom-commands": [command],
  events: [{
    title: "Nouvel événement", path: "/",
    fields: [
      { key: "title", label: "Titre" },
      { key: "description", label: "Description", kind: "multiline", optional: true },
      { key: "startDate", label: "Début", kind: "dateTime" },
      { key: "durationMinutes", label: "Durée (minutes)", kind: "number", initial: "120" },
      { key: "syncToDiscord", label: "Créer aussi l'événement Discord", kind: "toggle", optional: true },
    ],
    build: (c) => {
      const start = new Date(c.text("startDate"));
      const minutes = Math.max(15, c.number("durationMinutes"));
      return { title: c.text("title"), description: c.text("description"), startDate: start.toISOString(), endDate: new Date(start.getTime() + minutes * 60000).toISOString(), durationMinutes: minutes, syncToDiscord: c.flag("syncToDiscord") };
    },
  }],
  economy: [{
    title: "Nouvel article", path: "/shop",
    fields: [{ key: "roleId", label: "Rôle vendu", kind: "role" }, { key: "label", label: "Nom de l'article" }, { key: "description", label: "Description", optional: true }, { key: "price", label: "Prix", kind: "number", initial: "100" }],
    build: (c) => ({ roleId: c.text("roleId"), roleName: c.roleName(c.text("roleId")), label: c.text("label"), description: c.text("description"), price: Math.max(0, c.number("price")), enabled: true }),
  }],
  leveling: [{
    title: "Nouvelle récompense", path: "/rewards",
    fields: [{ key: "level", label: "Niveau", kind: "number", initial: "5" }, { key: "roleId", label: "Rôle attribué", kind: "role" }, { key: "message", label: "Message", kind: "multiline", optional: true }],
    build: (c) => ({ id: `reward-${crypto.randomUUID().slice(0, 8)}`, level: Math.max(1, c.number("level")), roleId: c.text("roleId"), message: c.text("message") || null, enabled: true }),
  }],
  invites: [{
    title: "Nouvelle récompense d'invitations", path: "/rewards",
    fields: [{ key: "name", label: "Nom de la récompense" }, { key: "requiredValidInvites", label: "Invitations valides requises", kind: "number", initial: "5" }, { key: "roleId", label: "Rôle attribué", kind: "role", optional: true }, { key: "xpAmount", label: "XP offerts", kind: "number", optional: true, initial: "0" }, { key: "message", label: "Message", kind: "multiline", optional: true }],
    build: (c) => ({ name: c.text("name"), requiredValidInvites: Math.max(1, c.number("requiredValidInvites")), xpAmount: Math.max(0, c.number("xpAmount")), ...(c.text("roleId") ? { roleId: c.text("roleId"), roleName: c.roleName(c.text("roleId")) } : {}), ...(c.text("message") ? { message: c.text("message") } : {}) }),
  }],
  server: [
    {
      title: "Nouveau salon", path: "/channels",
      fields: [{ key: "name", label: "Nom du salon" }, { key: "type", label: "Type", choices: [["0", "Textuel"], ["2", "Vocal"], ["4", "Catégorie"], ["5", "Annonces"], ["13", "Scène"], ["15", "Forum"]], initial: "0" }, { key: "topic", label: "Sujet", optional: true }, { key: "isPrivate", label: "Salon privé (invisible pour @everyone)", kind: "toggle", optional: true }, { key: "nsfw", label: "Contenu sensible (NSFW)", kind: "toggle", optional: true }],
      build: (c) => ({ name: c.text("name").toLowerCase().replace(/ /g, "-"), type: c.number("type"), topic: c.text("topic"), isPrivate: c.flag("isPrivate"), nsfw: c.flag("nsfw") }),
    },
    {
      title: "Nouveau rôle", path: "/roles",
      fields: [{ key: "name", label: "Nom du rôle" }, { key: "color", label: "Couleur", choices: [["#99AAB5", "Gris"], ["#EF4444", "Rouge"], ["#F59E0B", "Ambre"], ["#10B981", "Vert"], ["#3B82F6", "Bleu"], ["#8B5CF6", "Violet"], ["#EC4899", "Rose"]], initial: "#99AAB5" }, { key: "hoist", label: "Afficher séparément dans la liste des membres", kind: "toggle", optional: true }, { key: "mentionable", label: "Mentionnable par tous", kind: "toggle", optional: true }],
      build: (c) => ({ name: c.text("name"), color: c.text("color"), hoist: c.flag("hoist"), mentionable: c.flag("mentionable") }),
    },
  ],
  backups: [{ title: "Nouvelle sauvegarde", path: "/", fields: [{ key: "name", label: "Nom de la sauvegarde" }, { key: "description", label: "Description", optional: true }, { key: "isProtected", label: "Protéger contre la suppression", kind: "toggle", optional: true }], build: (c) => ({ name: c.text("name"), description: c.text("description"), type: "FULL", isProtected: c.flag("isProtected"), idempotencyKey: crypto.randomUUID() }) }],
  giveaways: [{
    title: "Nouveau concours", path: "/create",
    fields: [{ key: "channelId", label: "Salon", kind: "channel" }, { key: "prize", label: "Lot" }, { key: "description", label: "Description", kind: "multiline", optional: true }, { key: "winnerCount", label: "Nombre de gagnants", kind: "number", initial: "1" }, { key: "durationMinutes", label: "Durée", choices: [["60", "1 heure"], ["360", "6 heures"], ["1440", "1 jour"], ["4320", "3 jours"], ["10080", "7 jours"]], initial: "1440" }],
    build: (c) => ({ channelId: c.text("channelId"), prize: c.text("prize"), description: c.text("description"), winnerCount: Math.max(1, c.number("winnerCount")), durationMinutes: c.number("durationMinutes") }),
  }],
};

function CreateForm({ spec, root, directory, onClose, onCreated }: { spec: CreateSpec; root: string; directory?: Directory; onClose: () => void; onCreated: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(spec.fields.map((field) => [field.key, field.initial ?? ""])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const missing = useMemo(() => spec.fields.some((field) => !field.optional && field.kind !== "toggle" && !(values[field.key] ?? "").trim()), [spec.fields, values]);
  const context: Values = {
    text: (key) => (values[key] ?? "").trim(),
    number: (key) => Number((values[key] ?? "").replace(",", ".")) || 0,
    flag: (key) => values[key] === "true",
    roleName: (id) => directory?.roles.find((role) => role.id === id)?.name ?? "Rôle",
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let path = spec.path;
      for (const field of spec.fields) path = path.replace(`{${field.key}}`, encodeURIComponent(context.text(field.key)));
      await botCall(`${root}${path === "/" ? "" : path}`, spec.method ?? "POST", spec.build(context));
      onCreated();
      onClose();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="mail-compose" onSubmit={(event) => void submit(event)}>
      {spec.fields.map((field) => {
        const value = values[field.key] ?? "";
        if (field.kind === "toggle") return <label key={field.key} className="generic-toggle"><span>{field.label}</span><input type="checkbox" role="switch" checked={value === "true"} onChange={(event) => set(field.key, String(event.target.checked))} /></label>;
        const list = field.kind === "channel" ? directory?.channels : field.kind === "role" ? directory?.roles : undefined;
        return (
          <Field key={field.key} label={field.label}>
            {field.choices ? <select value={value} onChange={(event) => set(field.key, event.target.value)}>{field.choices.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
              : list ? <select value={value} onChange={(event) => set(field.key, event.target.value)}><option value="">{tr("Choisir…", "Choose…")}</option>{list.map((entry) => <option key={entry.id} value={entry.id}>{field.kind === "channel" ? "#" : "@"}{entry.name}</option>)}</select>
                : field.kind === "multiline" ? <textarea rows={3} value={value} onChange={(event) => set(field.key, event.target.value)} />
                  : <input type={field.kind === "number" ? "number" : field.kind === "dateTime" ? "datetime-local" : "text"} value={value} placeholder={field.hint} onChange={(event) => set(field.key, event.target.value)} />}
          </Field>
        );
      })}
      {error && <ErrorBox message={error} />}
      <div className="row"><Button type="submit" variant="primary" disabled={busy || missing}><Plus size={15} />{tr("Créer", "Create")}</Button></div>
    </form>
  );
}

export function CreateButtons({ specs, root, directory, onCreated }: { specs: CreateSpec[]; root: string; directory?: Directory; onCreated?: () => void }) {
  const [open, setOpen] = useState<CreateSpec | null>(null);
  const [version, setVersion] = useState(0);
  return (
    <>
      <div className="row">{specs.map((spec) => <Button key={spec.title} variant="primary" onClick={() => setOpen(spec)}><Plus size={15} />{spec.title}</Button>)}</div>
      <Drawer open={Boolean(open)} title={open?.title ?? ""} onClose={() => setOpen(null)}>
        {open && <CreateForm key={`${open.title}-${version}`} spec={open} root={root} directory={directory} onClose={() => setOpen(null)} onCreated={() => { setVersion((value) => value + 1); onCreated?.(); }} />}
      </Drawer>
    </>
  );
}
