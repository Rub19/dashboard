"use client";

import BentoCard, { type BentoCardProps } from "./BentoCard";

export type WidgetWrapperProps = BentoCardProps;

export default function WidgetWrapper(props: WidgetWrapperProps) {
  return <BentoCard {...props} />;
}
