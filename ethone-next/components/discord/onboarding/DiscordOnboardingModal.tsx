"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import Screen0Hero from "./Screen0Hero";
import Screen1Architecture from "./Screen1Architecture";
import Screen2Features from "./Screen2Features";
import Screen3Protection from "./Screen3Protection";
import Screen4Automation from "./Screen4Automation";
import Screen5ControlCenter from "./Screen5ControlCenter";
import Screen6Customization from "./Screen6Customization";
import Screen7GettingStarted from "./Screen7GettingStarted";

interface DiscordOnboardingModalProps {
  isOpen: boolean;
  currentStep: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
  onComplete: () => void;
  prefersReducedMotion?: boolean;
}

const TOTAL_SCREENS = 8;

export default function DiscordOnboardingModal({
  isOpen,
  currentStep,
  onStepChange,
  onClose,
  onComplete,
  prefersReducedMotion = false,
}: DiscordOnboardingModalProps) {
  const router = useRouter();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Keyboard navigation
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

  const handleStartSetup = () => {
    onComplete();
    router.push("/discord/setup");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ETHONE Bot Onboarding"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-950/95 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl"
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
              ETHONE BOT ONBOARDING
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-500">
              {currentStep + 1} / {TOTAL_SCREENS}
            </span>
            <button
              onClick={handleSkipPrompt}
              aria-label="Fermer l'introduction"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6 custom-scrollbar">
          {currentStep === 0 && <Screen0Hero onNext={handleNext} onSkip={handleSkipPrompt} />}
          {currentStep === 1 && <Screen1Architecture />}
          {currentStep === 2 && <Screen2Features />}
          {currentStep === 3 && <Screen3Protection />}
          {currentStep === 4 && <Screen4Automation />}
          {currentStep === 5 && <Screen5ControlCenter />}
          {currentStep === 6 && <Screen6Customization />}
          {currentStep === 7 && (
            <Screen7GettingStarted
              onStartSetup={handleStartSetup}
              onExploreDashboard={onComplete}
            />
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-950/60">
          {/* Back Button */}
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              currentStep === 0
                ? "text-zinc-600 cursor-not-allowed opacity-50"
                : "text-zinc-300 hover:text-white hover:bg-zinc-800/80"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5" role="tablist">
            {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
              <button
                key={i}
                onClick={() => onStepChange(i)}
                aria-label={`Aller à l'écran ${i + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentStep === i
                    ? "w-6 h-2 bg-gradient-to-r from-indigo-500 to-teal-400 shadow-sm"
                    : "w-2 h-2 bg-zinc-700 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>

          {/* Next / Finish Button */}
          {currentStep < TOTAL_SCREENS - 1 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <span>Continuer</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleStartSetup}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <span>Configurer</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Soft Exit Confirmation Modal Overlay */}
        {showExitConfirm && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-sm p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-800 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">
                Passer l'introduction ?
              </h4>
              <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
                Vous pourrez toujours revoir cette introduction à tout moment depuis les réglages du bot ou la page d'accueil.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
                >
                  Quitter
                </button>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition cursor-pointer"
                >
                  Continuer l'intro
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
