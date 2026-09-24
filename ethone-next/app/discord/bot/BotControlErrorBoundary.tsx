"use client";

import React, { Component, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "@/components/icons/ph";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class BotControlErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Bot Control Center Error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-main)] text-zinc-100 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 text-center space-y-6 shadow-xl backdrop-blur-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Bot Control Center
              </span>
              <h2 className="text-lg font-bold text-white">
                Un problème est survenu lors du chargement
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {this.state.error?.message ||
                  "Une erreur inattendue est survenue dans la console de contrôle du bot."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/discord"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour Discord</span>
              </Link>

              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réessayer</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
