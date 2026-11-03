interface PortraitFriend {
  id: string;
  name: string;
  tag: string;
  icon: string;
  card: string;
}

export type FriendGame = "val" | "lol";
type RiotRequest = (path: string, options?: { fresh?: boolean }) => Promise<unknown>;
type ApiRequest = (path: string) => Promise<unknown>;

export const cardImage = (card: string) => (card ? `https://media.valorant-api.com/playercards/${card}/smallart.png` : "");

export async function resolveFriendCard(id: string, request: RiotRequest): Promise<string> {
  const history = await request(`/match-history/v1/history/${id}?startIndex=0&endIndex=1`, { fresh: true }).catch(() => null) as { History?: { MatchID?: string }[] } | null;
  const match = history?.History?.[0]?.MatchID;
  if (!match) return "";
  const details = await request(`/match-details/v1/matches/${match}`).catch(() => null) as { players?: { subject?: string; playerCard?: string }[] } | null;
  return details?.players?.find((player) => player.subject?.toLowerCase() === id.toLowerCase())?.playerCard ?? "";
}

export async function resolveFriendIcon(friend: Pick<PortraitFriend, "name" | "tag">, request: ApiRequest): Promise<string> {
  const profile = await request(`api/stats/lol-profile?name=${encodeURIComponent(friend.name)}&tag=${encodeURIComponent(friend.tag)}`).catch(() => null) as { avatarUrl?: string } | null;
  return profile?.avatarUrl ?? "";
}

export function friendPortrait(friend: PortraitFriend, cards: Record<string, string>, icons: Record<string, string>, game: FriendGame = "val"): string {
  const card = cardImage(cards[friend.id] || friend.card);
  const icon = friend.icon || icons[friend.id] || "";
  return game === "lol" ? icon || card : card || icon;
}

export function portraitMissing(friend: PortraitFriend, cards: Record<string, string>, icons: Record<string, string>, game: FriendGame = "val"): boolean {
  return game === "lol" ? !friend.icon && !icons[friend.id] : !friend.card && !cards[friend.id] && !friend.icon && !icons[friend.id];
}
