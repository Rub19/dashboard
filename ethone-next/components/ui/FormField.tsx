"use client";

import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export type FormFieldProps = {
  label?: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export default function FormField({
  label,
  help,
  error,
  required,
  children,
  className = "",
}: FormFieldProps) {
  const fallbackId = useId();
  const childArray = Children.toArray(children);
  const firstValidIndex = childArray.findIndex(isValidElement);
  const field = firstValidIndex >= 0 ? (childArray[firstValidIndex] as ReactElement<{ id?: string }>) : null;
  const childId = field?.props.id || fallbackId;
  const messageId = `${childId}-message`;
  const hasMessage = help || error;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={childId}
          className="text-sm font-medium text-[var(--text-primary)]"
        >
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </label>
      )}
      {childArray.map((child, index) => {
        if (index === firstValidIndex && isValidElement(child)) {
          return cloneElement(child, {
            id: childId,
            "aria-invalid": Boolean(error),
            "aria-describedby": hasMessage ? messageId : undefined,
          } as Partial<unknown>);
        }
        return child;
      })}
      {hasMessage && (
        <p
          id={messageId}
          className={`text-xs ${error ? "text-red-400" : "text-[var(--text-muted)]"}`}
        >
          {error || help}
        </p>
      )}
    </div>
  );
}
