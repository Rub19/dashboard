import AutomodNativeClient from "./AutomodNativeClient";

export const metadata = {
  title: "AutoMod natif | ETHONE",
  description: "Gère les règles AutoMod natives de Discord, exécutées par Discord même si le bot est hors ligne.",
};

export default function AutomodNativePage() {
  return <AutomodNativeClient />;
}
