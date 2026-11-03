interface PortraitFriend {
  id: string;
  product: string;
  icon: string;
  card: string;
}

type RiotRequest = (path: string, options?: { fresh?: boolean }) => Promise<unknown>;

export const cardImage = (card: string) => (card ? `https://media.valorant-api.com/playercards/${card}/smallart.png` : "");

function playerCard(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const identity = (value as { Identity?: unknown }).Identity;
  if (!identity || typeof identity !== "object") return "";
  const card = (identity as { PlayerCardID?: unknown }).PlayerCardID;
  return typeof card === "string" ? card : "";
}

export async function resolveFriendCard(id: string, request: RiotRequest): Promise<string> {
  for (const version of [3, 2]) {
    const loadout = await request(`/personalization/v${version}/players/${id}/playerloadout`, { fresh: true }).catch(() => null);
    const card = playerCard(loadout);
    if (card) return card;
  }

  const history = await request(`/match-history/v1/history/${id}?startIndex=0&endIndex=1`, { fresh: true }).catch(() => null) as { History?: { MatchID?: string }[] } | null;
  const match = history?.History?.[0]?.MatchID;
  if (!match) return "";
  const details = await request(`/match-details/v1/matches/${match}`).catch(() => null) as { players?: { subject?: string; playerCard?: string }[] } | null;
  return details?.players?.find((player) => player.subject?.toLowerCase() === id.toLowerCase())?.playerCard ?? "";
}

export function friendPortrait(friend: PortraitFriend, cards: Record<string, string>, icons: Record<string, string>): string {
  return friend.icon || icons[friend.id] || cardImage(cards[friend.id] || friend.card);
}
