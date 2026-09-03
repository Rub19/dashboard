"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  X,
  Move,
  Camera,
  Crop as CropIcon,
  Sparkles,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface AvatarCropperModalProps {
  imageSrc: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

export default function AvatarCropperModal({
  imageSrc,
  isOpen,
  onClose,
  onCropComplete,
}: AvatarCropperModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset state when a new image is loaded
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgDimensions({ width: naturalWidth, height: naturalHeight });
  };

  // Mouse / Touch Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  // Generate cropped output canvas
  const handleCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const containerSize = containerRef.current.clientWidth || 280;
    const scale = (imgDimensions.width / containerSize) * (1 / zoom);

    // Calculate crop box in natural image coordinates
    const sourceX = (imgDimensions.width / 2 - offset.x * (imgDimensions.width / containerSize)) - (imgDimensions.width / (2 * zoom));
    const sourceY = (imgDimensions.height / 2 - offset.y * (imgDimensions.height / containerSize)) - (imgDimensions.height / (2 * zoom));
    const sourceSize = imgDimensions.width / zoom;

    // Draw circular cropped region
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      imageRef.current,
      0,
      0,
      imgDimensions.width,
      imgDimensions.height,
      0,
      0,
      outputSize,
      outputSize
    );

    const croppedDataUrl = canvas.toDataURL("image/webp", 0.92);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="md"
      hideFooter
    >
      <div className="space-y-5 p-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--panel-border)]/60 pb-3">
          <div className="flex items-center gap-2">
            <CropIcon className="h-5 w-5 text-[var(--accent-primary)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Recadrer et positionner l'avatar
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Interactive Cropper Area */}
        <div className="flex flex-col items-center justify-center">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative h-72 w-72 overflow-hidden rounded-2xl border-2 border-dashed border-[var(--panel-border)] bg-black/80 shadow-inner select-none touch-none cursor-grab active:cursor-grabbing"
          >
            {/* Movable & Scalable Image */}
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain transition-transform duration-75"
              />
            )}

            {/* Circular Mask Overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-full border-4 border-[var(--accent-primary)]/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
              aria-hidden="true"
            />

            {/* Center crosshair indicator */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
              <Move className="h-6 w-6 text-white" />
            </div>
          </div>

          <p className="mt-2 text-center text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <Move className="h-3 w-3" />
            <span>Glissez pour déplacer l'image dans le cercle</span>
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              <span>Niveau de zoom</span>
            </span>
            <span className="font-mono text-zinc-400">{zoom.toFixed(1)}x</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.2).toFixed(1))))}
              className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] p-1.5 text-[var(--text-muted)] hover:text-white cursor-pointer"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-lg bg-[var(--panel-border)] accent-[var(--accent-primary)] cursor-pointer"
            />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(1))))}
              className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] p-1.5 text-[var(--text-muted)] hover:text-white cursor-pointer"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              title="Réinitialiser le centrage"
              className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] p-1.5 text-[var(--text-muted)] hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--panel-border)]/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-white cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleCrop}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 px-5 py-2 text-xs font-bold text-white shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Valider et appliquer</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
