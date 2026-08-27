"use client";

import { useState, useRef, useCallback } from "react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import BrainModelSelector from "./BrainModelSelector";
import type { BrainAttachment } from "@/lib/hooks/useBrain";

interface BrainComposerProps {
  onSend: (text: string) => void;
  loading: boolean;
  selectedModel: string;
  onSelectModel: (id: string) => void;
  attachments: BrainAttachment[];
  onAddAttachment: (att: BrainAttachment) => void;
  onRemoveAttachment: (id: string) => void;
  suggestions: { id: string; title: string; action?: string; parameters?: Record<string, unknown> }[];
  onSelectSuggestion: (s: { id: string; title: string; action?: string; parameters?: Record<string, unknown> }) => void;
}

export default function BrainComposer({
  onSend,
  loading,
  selectedModel,
  onSelectModel,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  suggestions,
  onSelectSuggestion,
}: BrainComposerProps) {
  const [text, setText] = useState("");
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || loading) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, loading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onAddAttachment({
        id: `att-${Date.now()}`,
        name: file.name,
        type: file.type.startsWith("image/") ? "image" : "file",
        size: `${Math.round(file.size / 1024)} Ko`,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onAddAttachment({
        id: `att-${Date.now()}`,
        name: file.name,
        type: file.type.startsWith("image/") ? "image" : "file",
        size: `${Math.round(file.size / 1024)} Ko`,
      });
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex flex-col gap-2 p-3 bg-transparent max-w-4xl mx-auto w-full"
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drag & Drop Visual Glow Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed border-[var(--accent-primary)] bg-[var(--bg-main)]/90 backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-3 text-[var(--accent-primary)] font-semibold text-sm">
            <Icon name="upload-simple" className="h-6 w-6 animate-bounce" />
            <span>Déposer pour analyser avec Brain</span>
          </div>
        </div>
      )}

      {/* Attached Files Capsules */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/90 py-1 px-3 text-xs font-medium text-[var(--text-primary)] shadow-sm"
            >
              <Icon
                name={att.type === "image" ? "image" : "file-text"}
                className="h-3.5 w-3.5 text-[var(--accent-primary)]"
              />
              <span className="max-w-[140px] truncate">{att.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(att.id)}
                className="ml-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
              >
                <Icon name="x" className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 shadow-lg backdrop-blur-2xl transition-all focus-within:border-[var(--accent-primary)]/70 focus-within:shadow-[0_0_24px_-6px_var(--glow-color)]">
        {/* Text Area Input */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Demandez n'importe quoi à Brain, créez une note, lancez une action..."
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-0 min-h-[44px] max-h-[180px]"
        />

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          <div className="flex items-center gap-2">
            {/* Plus Menu Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all active:scale-95"
                title="Ajouter un contexte ou fichier"
              >
                <Icon name="plus" className="h-4 w-4" />
              </button>

              {/* Plus Dropdown Menu */}
              {showPlusMenu && (
                <div className="absolute bottom-full mb-2 left-0 z-50 w-52 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowPlusMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <Icon name="file" className="h-4 w-4 text-[var(--accent-primary)]" />
                    Joindre un fichier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowPlusMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <Icon name="image" className="h-4 w-4 text-[var(--info)]" />
                    Analyser une image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAddAttachment({
                        id: `note-${Date.now()}`,
                        name: "Note active",
                        type: "note",
                      });
                      setShowPlusMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <Icon name="note" className="h-4 w-4 text-[var(--warning)]" />
                    Insérer une Note
                  </button>
                </div>
              )}
            </div>

            {/* AI Model Selector Pill */}
            <BrainModelSelector
              selectedModelId={selectedModel}
              onSelectModel={onSelectModel}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Send CTA Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
              className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              title="Envoyer"
            >
              {loading ? (
                <Icon name="arrows-clockwise" className="h-4 w-4 animate-spin" />
              ) : (
                <Icon name="arrow-up" className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contextual Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSuggestion(s)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] transition-all active:scale-95"
            >
              <Icon name="sparkles" className="h-3 w-3 text-[var(--accent-primary)]" />
              <span>{s.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
