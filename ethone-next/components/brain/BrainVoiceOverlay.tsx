"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { VoiceState } from "@/lib/hooks/useVoiceMode";

interface BrainVoiceOverlayProps {
  voiceState: VoiceState;
  interimText: string;
  finalText: string;
  error: string | null;
  onClose: () => void;
  onStopSpeaking: () => void;
}

const STATE_CONFIG: Record<VoiceState, { label: string; color: string; pulse: boolean }> = {
  idle: { label: "Prêt", color: "#10b981", pulse: false },
  listening: { label: "Écoute...", color: "#10b981", pulse: true },
  thinking: { label: "Brain réfléchit...", color: "#6366f1", pulse: true },
  speaking: { label: "Brain parle...", color: "#3b82f6", pulse: true },
  error: { label: "Erreur micro", color: "#ef4444", pulse: false },
};


export default function BrainVoiceOverlay({
  voiceState,
  interimText,
  finalText,
  error,
  onClose,
  onStopSpeaking,
}: BrainVoiceOverlayProps) {
  const config = STATE_CONFIG[voiceState];
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [interimText, finalText]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden bg-[#050608]/95 backdrop-blur-2xl"
    >
      {/* Radial ambient glow behind the orb */}
      <motion.div
        animate={{
          scale: config.pulse ? [1, 1.15, 1] : 1,
          opacity: config.pulse ? [0.3, 0.6, 0.3] : 0.2,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute h-[500px] w-[500px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${config.color}55 0%, transparent 70%)`,
        }}
      />

      {/* Main Orb */}
      <div className="relative flex items-center justify-center">
        {/* Outer rings */}
        {config.pulse &&
          [0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{ borderColor: `${config.color}40` }}
              animate={{ scale: [1, 1.8 + i * 0.4], opacity: [0.6, 0] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                delay: i * 0.55,
                ease: "easeOut",
              }}
              initial={{ width: 160, height: 160 }}
            />
          ))}

        {/* Core orb */}
        <motion.button
          type="button"
          onClick={voiceState === "speaking" ? onStopSpeaking : undefined}
          animate={
            config.pulse
              ? { scale: [1, 1.06, 1], boxShadow: [`0 0 40px ${config.color}66`, `0 0 80px ${config.color}99`, `0 0 40px ${config.color}66`] }
              : { scale: 1 }
          }
          transition={{ duration: 1.8, repeat: config.pulse ? Infinity : 0, ease: "easeInOut" }}
          className="relative flex h-40 w-40 cursor-default items-center justify-center rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${config.color}cc, ${config.color}55)`,
            border: `2px solid ${config.color}88`,
          }}
          title={voiceState === "speaking" ? "Interrompre" : undefined}
        >
          {/* Sound wave bars inside orb */}
          <div className="flex items-center gap-[3px]">
            {[16, 32, 44, 28, 18].map((h, i) => (
              <motion.div
                key={i}
                className="w-[3px] rounded-full bg-white"
                animate={
                  config.pulse
                    ? {
                        height: [8, h, 8],
                      }
                    : { height: 8 }
                }
                transition={{
                  duration: 0.6 + i * 0.1,
                  repeat: config.pulse ? Infinity : 0,
                  delay: i * 0.08,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.button>
      </div>

      {/* State label */}
      <motion.p
        key={voiceState}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 text-sm font-semibold tracking-wide"
        style={{ color: config.color }}
      >
        {config.label}
      </motion.p>

      {/* Transcript display */}
      <div
        ref={transcriptRef}
        className="mt-4 max-h-32 w-full max-w-sm overflow-y-auto px-6 text-center"
      >
        <AnimatePresence mode="popLayout">
          {(interimText || finalText || error) && (
            <motion.p
              key={interimText + finalText}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm leading-relaxed"
              style={{ color: error ? "#ef4444" : "rgba(255,255,255,0.75)" }}
            >
              {error || finalText || interimText}
            </motion.p>
          )}
          {!interimText && !finalText && !error && voiceState === "listening" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              className="text-xs text-white/40 italic"
            >
              Parlez...
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Tip: stop speaking */}
      {voiceState === "speaking" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="mt-2 text-[11px] text-white/50"
        >
          Parlez pour interrompre
        </motion.p>
      )}

      {/* Close button */}
      <motion.button
        type="button"
        onClick={onClose}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-10 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white/60 backdrop-blur-md transition-all hover:bg-white/[0.12] hover:text-white"
      >
        <span className="text-base">✕</span>
        Quitter le mode vocal
      </motion.button>
    </motion.div>
  );
}
