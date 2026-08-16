"use client";

import BentoCard, { type BentoCardProps } from "./BentoCard";

export type PanelProps = BentoCardProps;

export default function Panel(props: PanelProps) {
  return <BentoCard {...props} />;
}
