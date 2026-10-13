"use client";

import React, { useState, useEffect, useCallback, useId, useRef } from "react";
import { X, ChevronLeft, ChevronRight, AlertCircle, Check } from "@/components/icons/ph";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_PRESS, EASE_SNAP } from "@/lib/ease";
import Screen0Welcome from "./Screen0Welcome";
import Screen1Security from "./Screen1Security";
import Screen2Music from "./Screen2Music";
import Screen3Community from "./Screen3Community";

interface DiscordOnboardingModalProps {
  isOpen: boolean;
  currentStep: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
  onComplete: () => void;
  prefersReducedMotion?: boolean;
}

const TOTAL_SCREENS = 4;

export default function DiscordOnboardingModal({
  isOpen,
  currentStep,
  onStepChange,
  onComplete,
}: DiscordOnboardingModalProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const continueIntroButtonRef = useRef<HTMLButtonElement>(null);
  const exitConfirmTitleId = useId();

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      dialogRef.current?.focus();
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
      previouslyFocusedRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (showExitConfirm) {
      continueIntroButtonRef.current?.focus();
    } else {
      skipButtonRef.current?.focus();
    }
  }, [showExitConfirm]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        if (showExitConfirm) {
          setShowExitConfirm(false);
        } else {
          setShowExitConfirm(true);
        }
      } else if (e.key === "ArrowRight") {
        if (!showExitConfirm && currentStep < TOTAL_SCREENS - 1) {
          onStepChange(currentStep + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (!showExitConfirm && currentStep > 0) {
          onStepChange(currentStep - 1);
        }
      }
    },
    [isOpen, showExitConfirm, currentStep, onStepChange]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < TOTAL_SCREENS - 1) {
      onStepChange(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  const handleSkipPrompt = () => {
    setShowExitConfirm(true);
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Etho Onboarding"
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07080d]/95 shadow-[0_32px_100px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl outline-none"
      >
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#92C8D2] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#92C8D2]" />
            </span>
            <span className="text-xs font-bold tracking-wider uppercase text-zinc-300">
              ETHO ONBOARDING
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-zinc-400">
              {currentStep + 1} / {TOTAL_SCREENS}
            </span>
            <button
              ref={skipButtonRef}
              type="button"
              onClick={handleSkipPrompt}
              aria-label="Fermer l'introduction"
              className="p-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: EASE_SNAP }}
            >
              {currentStep === 0 && <Screen0Welcome onNext={handleNext} onSkip={handleSkipPrompt} />}
              {currentStep === 1 && <Screen1Security onNext={handleNext} />}
              {currentStep === 2 && <Screen2Music onNext={handleNext} />}
              {currentStep === 3 && <Screen3Community onFinish={onComplete} onPrev={handlePrev} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-white/[0.02]">
          <motion.button
            whileTap={SPRING_PRESS}
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              currentStep === 0
                ? "border-transparent text-zinc-600 cursor-not-allowed opacity-40"
                : "border-white/10 bg-white/[0.04] text-zinc-300 hover:text-white hover:border-white/20"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Retour</span>
          </motion.button>

          <div className="flex items-center gap-1.5" role="tablist">
            {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onStepChange(i)}
                aria-label={`Aller à l'écran ${i + 1}`}
                className={`transition-all duration-300 rounded-lg cursor-pointer h-1.5 ${
                  currentStep === i
                    ? "w-8 bg-[#92C8D2]"
                    : "w-2 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          {currentStep < TOTAL_SCREENS - 1 ? (
            <motion.button
              whileTap={SPRING_PRESS}
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold shadow-lg shadow-white/10 hover:bg-zinc-100 transition-all cursor-pointer"
            >
              <span>Continuer</span>
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={SPRING_PRESS}
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#92C8D2] text-black text-xs font-bold shadow-lg shadow-[#92C8D2]/20 hover:bg-[#a6d5de] transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Terminer</span>
            </motion.button>
          )}
        </div>

        {showExitConfirm && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby={exitConfirmTitleId}
          >
            <div className="w-full max-w-sm p-6 rounded-2xl border border-white/10 bg-[#0c0d14] shadow-2xl text-center">
              <div className="w-10 h-10 rounded-xl bg-[#92C8D2]/10 border border-[#92C8D2]/20 text-[#92C8D2] flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 id={exitConfirmTitleId} className="text-sm font-bold text-white mb-1">
                Passer l&apos;introduction ?
              </h4>
              <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
                Vous pourrez revoir cette introduction à tout moment depuis les réglages du bot.
              </p>
              <div className="flex gap-2">
                <motion.button
                  whileTap={SPRING_PRESS}
                  type="button"
                  onClick={handleConfirmExit}
                  className="flex-1 py-2 px-3 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:border-white/20 text-xs font-semibold transition-all cursor-pointer"
                >
                  Quitter
                </motion.button>
                <motion.button
                  whileTap={SPRING_PRESS}
                  ref={continueIntroButtonRef}
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-100 transition-all cursor-pointer"
                >
                  Continuer l&apos;intro
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
