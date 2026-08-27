"use client";

import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type FormFieldProps = {
  label?: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
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
  const field = firstValidIndex >= 0 ? (childArray[firstValidIndex] as ReactElement<{ id?: string; error?: boolean }>) : null;
  const childId = field?.props.id || fallbackId;
  const messageId = `${childId}-message`;
  const hasMessage = Boolean(help || error);

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={childId}
          className="block text-xs font-semibold text-[var(--text-primary)] select-none"
        >
          {label}
          {required && <span className="ml-1 text-[var(--danger)] font-bold">*</span>}
        </label>
      )}
      {childArray.map((child, index) => {
        if (index === firstValidIndex && isValidElement(child)) {
          return cloneElement(child, {
            id: childId,
            error: Boolean(error) || (child.props as { error?: boolean }).error,
            "aria-invalid": Boolean(error),
            "aria-describedby": hasMessage ? messageId : undefined,
          } as Partial<unknown>);
        }
        return child;
      })}
      {hasMessage && (
        <div
          id={messageId}
          className={cn(
            "flex items-center gap-1.5 text-xs transition-all duration-150",
            error ? "text-[var(--danger)] font-medium" : "text-[var(--text-muted)] text-[11px]"
          )}
        >
          {error && <AlertCircle className="h-3 w-3 shrink-0" />}
          <span>{error || help}</span>
        </div>
      )}
    </div>
  );
}
