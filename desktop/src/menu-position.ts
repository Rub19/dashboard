interface AnchorRect {
  right: number;
  bottom: number;
}

interface Viewport {
  width: number;
  height: number;
}

export function anchoredMenuPosition(anchor: AnchorRect, viewport: Viewport, width = 260, gap = 8) {
  return {
    left: Math.min(Math.max(gap, anchor.right + gap), Math.max(gap, viewport.width - width - gap)),
    bottom: Math.max(gap, viewport.height - anchor.bottom),
  };
}
