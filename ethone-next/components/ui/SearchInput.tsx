"use client";

import { forwardRef, useRef, type KeyboardEvent } from "react";
import { Icon } from "@/lib/icons";
import Input, { type InputProps } from "./Input";
import Button from "./Button";

type SearchInputProps = Omit<
  InputProps,
  "icon" | "clearable" | "type"
> & {
  onSearch?: (value: string) => void;
  actionLabel?: string;
  shortcut?: string;
};

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, actionLabel, shortcut, right, className = "", onKeyDown, ...props }, ref) => {
    const localRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        e.preventDefault();
        onSearch(e.currentTarget.value);
      } else {
        onKeyDown?.(e);
      }
    };

    const actionNode =
      props.value && String(props.value).length > 0 && actionLabel ? (
        <Button
          type="button"
          tabIndex={-1}
          size="sm"
          variant="liquid"
          haptic="light"
          onClick={() => {
            const input = localRef.current;
            if (input && onSearch) onSearch(input.value);
          }}
          className="h-7 px-2 text-xs"
        >
          <Icon name="corner-down-left" className="h-3 w-3" />
          <span className="hidden sm:inline">{actionLabel}</span>
        </Button>
      ) : shortcut ? (
        <kbd className="hidden rounded-md border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] sm:inline">
          {shortcut}
        </kbd>
      ) : null;

    return (
      <Input
        ref={(node) => {
          (localRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }
        }}
        type="search"
        icon="search"
        clearable
        onKeyDown={handleKeyDown}
        className={className}
        right={
          <>
            {actionNode}
            {right}
          </>
        }
        {...props}
      />
    );
  }
);

SearchInput.displayName = "SearchInput";
export default SearchInput;
