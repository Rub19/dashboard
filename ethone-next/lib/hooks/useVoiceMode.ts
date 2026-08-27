"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

export interface UseVoiceModeOptions {
  lang?: string;
  silenceMs?: number;
  onTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
}

export interface UseVoiceModeReturn {
  voiceState: VoiceState;
  isActive: boolean;
  interimText: string;
  finalText: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  toggleVoice: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  exitVoiceMode: () => void;
}

// Minimal interfaces for Web Speech API in browsers that support it
interface ISpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
  length: number;
}

interface ISpeechRecognitionResultList {
  [index: number]: ISpeechRecognitionResult;
  length: number;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: ISpeechRecognitionResultList;
}

interface ISpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface ISpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognitionInstance;

export function useVoiceMode({
  lang = "fr-FR",
  silenceMs = 1500,
  onTranscript,
  onFinalTranscript,
}: UseVoiceModeOptions = {}): UseVoiceModeReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isActive, setIsActive] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const startListeningRef = useRef<(() => void) | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) &&
    "speechSynthesis" in window;

  // --- TTS: Speak text ---
  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setVoiceState("listening");
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !text.trim()) return;
      window.speechSynthesis.cancel();
      isSpeakingRef.current = true;
      setVoiceState("speaking");

      // Strip markdown for cleaner TTS output
      const cleanText = text
        .replace(/#{1,6}\s/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`{1,3}[\s\S]*?`{1,3}/g, "")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .replace(/>\s/g, "")
        .slice(0, 1000); // Limit length for TTS

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to pick a French/matching voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith(lang.split("-")[0]) && v.localService
      ) || voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        isSpeakingRef.current = false;
        if (shouldRestartRef.current) {
          setVoiceState("listening");
        }
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        if (shouldRestartRef.current) setVoiceState("listening");
      };

      window.speechSynthesis.speak(utterance);
    },
    [lang]
  );

  // --- STT: Start listening ---
  const startListening = useCallback(() => {
    if (!isSupported || isListeningRef.current) return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }

    const recognition = new SpeechRec();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    isListeningRef.current = true;
    setVoiceState("listening");
    setError(null);

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          final += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }

      if (interim) {
        setInterimText(interim);
        onTranscript?.(interim);
        // Reset silence timer on speech
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      }
      if (final) {
        setFinalText((prev) => prev + final);
        setInterimText("");
        onTranscript?.(final);
        // Start silence timer
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const text = final.trim();
          if (text) {
            onFinalTranscript?.(text);
            setFinalText("");
            setVoiceState("thinking");
          }
        }, silenceMs);
      }
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      isListeningRef.current = false;
      if (event.error === "no-speech") {
        // Restart quietly
        if (shouldRestartRef.current) {
          startListeningRef.current?.();
        }
        return;
      }
      if (event.error === "aborted") return;
      setError(`Erreur micro : ${event.error}`);
      setVoiceState("error");
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      // Auto-restart if we're still in voice mode and not speaking
      if (shouldRestartRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          startListeningRef.current?.();
        }, 200);
      }
    };

    try {
      recognition.start();
    } catch {
      isListeningRef.current = false;
      setError("Impossible de démarrer le micro.");
    }
  }, [isSupported, lang, onFinalTranscript, onTranscript, silenceMs]);

  // Keep startListeningRef updated
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    isListeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
  }, []);

  const exitVoiceMode = useCallback(() => {
    shouldRestartRef.current = false;
    isListeningRef.current = false;
    isSpeakingRef.current = false;
    stopListening();
    stopSpeaking();
    setIsActive(false);
    setVoiceState("idle");
    setInterimText("");
    setFinalText("");
    setError(null);
  }, [stopListening, stopSpeaking]);

  const toggleVoice = useCallback(() => {
    if (isActive) {
      exitVoiceMode();
    } else {
      setIsActive(true);
      shouldRestartRef.current = true;
      startListening();
    }
  }, [isActive, exitVoiceMode, startListening]);

  // Restart listening when Brain finishes responding (state goes from thinking → idle)
  useEffect(() => {
    if (isActive && voiceState === "listening" && !isListeningRef.current && !isSpeakingRef.current) {
      startListening();
    }
  }, [isActive, voiceState, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      stopListening();
      if (typeof window !== "undefined") window.speechSynthesis.cancel();
    };
  }, [stopListening]);

  return {
    voiceState,
    isActive,
    interimText,
    finalText,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleVoice,
    speak,
    stopSpeaking,
    exitVoiceMode,
  };
}
