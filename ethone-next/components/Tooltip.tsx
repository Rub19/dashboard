"use client";

import React, { Children, cloneElement, isValidElement } from "react";

type TooltipPosition = "top" | "bottom" | "left" | "right";

export default function Tooltip({
  children,
  label,
  position = "top",
}: {
  children: React.ReactNode;
  label: string;
  position?: TooltipPosition;
}) {
  const child = Children.only(children);
  if (isValidElement(child)) {
    return cloneElement(child as React.ReactElement<{ "data-tooltip"?: string; "data-tooltip-position"?: TooltipPosition }>, {
      "data-tooltip": label,
      "data-tooltip-position": position,
    });
  }
  return (
    <span data-tooltip={label} data-tooltip-position={position}>
      {children}
    </span>
  );
}
