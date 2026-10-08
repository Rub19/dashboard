import BotSessionGate from "@/components/discord/BotSessionGate";

export default function DiscordLayout({ children }: { children: React.ReactNode }) {
  return <BotSessionGate>{children}</BotSessionGate>;
}
