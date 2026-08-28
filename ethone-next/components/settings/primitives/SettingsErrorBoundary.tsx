"use client";

import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";

interface Props {
  categoryName?: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class SettingsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Settings 2.0 Panel Error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-8 text-center my-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--danger)]/15 text-[var(--danger)]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1 max-w-md">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Cette section rencontre un problème
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {this.state.error?.message ||
                "Une erreur inattendue s'est produite lors du rendu de cette catégorie."}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={this.handleRetry}
          >
            Réessayer
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
