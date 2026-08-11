"use client";

import { cloneElement, useId, type ReactElement } from "react";

export default function FormField({
  label,
  help,
  error,
  children,
  required,
}: {
  label?: string;
  help?: string;
  error?: string;
  children: ReactElement<{ id?: string }>;
  required?: boolean;
}) {
  const fallbackId = useId();
  const childId = children.props.id || fallbackId;
  const messageId = `${childId}-message`;
  const hasMessage = help || error;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={childId} className="text-sm font-medium text-[var(--foreground)]">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </label>
      )}
      {cloneElement(children, {
        id: childId,
        "aria-invalid": Boolean(error),
        "aria-describedby": hasMessage ? messageId : undefined,
      } as Partial<unknown>)}
      {hasMessage && (
        <p id={messageId} className={`text-xs ${error ? "text-red-400" : "text-[var(--muted)]"}`}>
          {error || help}
        </p>
      )}
    </div>
  );
}
