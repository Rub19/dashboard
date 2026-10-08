import BotSessionBanner from "@/components/discord/BotSessionBanner";

export default function DiscordLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BotSessionBanner />
      {children}
    </>
  );
}
