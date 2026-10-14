"use client";

import { useEffect, useState, useRef } from "react";
import { useReducedMotion } from "framer-motion";

export function AnimatedNumber({
  value,
  duration = 350,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  locale,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  locale?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    const start = prevValueRef.current;
    const diff = value - start;
    if (diff === 0) {
      setDisplayValue(value);
      return;
    }

    const startTime = performance.now();
    let frameId: number;

    const updateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * ease;

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(updateNumber);
      } else {
        prevValueRef.current = value;
      }
    };

    frameId = requestAnimationFrame(updateNumber);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration, reducedMotion]);

  let formatted: string;
  if (decimals > 0) {
    const fixed = displayValue.toFixed(decimals);
    formatted = locale === "fr" ? fixed.replace(".", ",") : fixed;
  } else {
    formatted = Math.round(displayValue).toString();
  }

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
