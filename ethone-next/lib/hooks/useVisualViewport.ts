"use client";

import { useEffect, useState } from "react";

type VisualViewportState = {
  height: number;
  width: number;
  offsetTop: number;
  scale: number;
};

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>({
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    offsetTop: 0,
    scale: 1,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const update = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      setState({
        height: Math.round(vv.height),
        width: Math.round(vv.width),
        offsetTop: Math.round(vv.offsetTop),
        scale: vv.scale,
      });
    };

    update();
    window.visualViewport.addEventListener("resize", update);
    window.visualViewport.addEventListener("scroll", update);

    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}

export default useVisualViewport;
