import { notificationsFingerprint, type Notification } from "./useNotifications";

const a = { id: "a", title: "A", timestamp: 2, read: false } as unknown as Notification;
const b = { id: "b", title: "B", timestamp: 1, read: true } as unknown as Notification;

describe("notificationsFingerprint", () => {
  it("même contenu, ordre des éléments et des clés différent : identique (pas de réécriture)", () => {
    const reordered = { read: false, timestamp: 2, title: "A", id: "a" } as unknown as Notification;
    expect(notificationsFingerprint([a, b])).toBe(notificationsFingerprint([b, reordered]));
  });
  it("un vrai changement (lu / non lu) est détecté", () => {
    expect(notificationsFingerprint([a, b])).not.toBe(notificationsFingerprint([{ ...a, read: true } as Notification, b]));
  });
});

import { dropLegacyMailCopies } from "./useNotifications";

describe("dropLegacyMailCopies", () => {
  it("retire les copies « Nouveau mail » sans identifiant serveur, garde le reste", () => {
    const items = [
      { id: "1790000000000-abc", source: "ETHONE Mail", title: "Nouveau mail" },
      { id: "mail-42", source: "ETHONE Mail", title: "Question" },
      { id: "1790000000001-def", source: "ETHONE", title: "Diagnostic terminé" },
    ] as unknown as Notification[];
    expect(dropLegacyMailCopies(items).map((n) => n.id)).toEqual(["mail-42", "1790000000001-def"]);
  });
});
