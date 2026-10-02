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
