"use client";

import { useEffect, useState } from "react";

export function useTouchCapable() {
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(hover: none) and (pointer: coarse)");
    setTouch(query.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setTouch(event.matches);
    };

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return touch;
}
