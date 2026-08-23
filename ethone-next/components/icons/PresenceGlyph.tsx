import EthoneGlyph, { type EthoneGlyphName } from "@/components/icons/EthoneGlyph";
import type { Settings } from "@/lib/settings";

export type UserStatus = Settings["status"];

const STATUS_GLYPHS: Record<UserStatus, Extract<EthoneGlyphName, `presence-${string}`>> = {
  online: "presence-online",
  focus: "presence-focus",
  busy: "presence-busy",
  away: "presence-away",
  invisible: "presence-invisible",
};

export function getPresenceGlyph(status: UserStatus) {
  return STATUS_GLYPHS[status];
}

export default function PresenceGlyph({ status, ...props }: { status: UserStatus } & Omit<React.ComponentProps<typeof EthoneGlyph>, "name">) {
  return <EthoneGlyph name={getPresenceGlyph(status)} {...props} />;
}
