import StickyCenterClient from "./StickyCenterClient";

export const metadata = {
  title: "Sticky Messages | ETHONE",
  description: "Garde un message important toujours visible en bas d'un salon Discord.",
};

export default function StickyPage() {
  return <StickyCenterClient />;
}
