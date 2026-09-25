import { Suspense } from "react";
import PublicLeaderboard from "./PublicLeaderboard";

export const metadata = {
  title: "Classement | ETHONE",
  description: "Le classement des membres les plus actifs du serveur.",
  robots: { index: false, follow: false },
};

export default function LeaderboardPage() {
  return (
    <Suspense fallback={null}>
      <PublicLeaderboard />
    </Suspense>
  );
}
