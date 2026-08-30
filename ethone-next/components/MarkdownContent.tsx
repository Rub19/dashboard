"use client";

import React, { useMemo } from "react";
import { Check, Square, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  const elements = useMemo(() => parseMarkdown(content), [content]);

  return <div className={cn("space-y-1 text-sm leading-relaxed", className)}>{elements}</div>;
}

function renderInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // 1. Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={keyIdx++}
          className="rounded-md bg-black/30 border border-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent-primary,#38bdf8)] shadow-xs"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 2. Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      tokens.push(
        <strong key={keyIdx++} className="font-bold text-[var(--text-primary,#fff)]">
          {renderInline(boldMatch[2])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 3. Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^~~(.*?)~~/);
    if (strikeMatch) {
      tokens.push(
        <del key={keyIdx++} className="line-through text-[var(--text-muted,#888)]">
          {renderInline(strikeMatch[1])}
        </del>
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // 4. Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch) {
      tokens.push(
        <em key={keyIdx++} className="italic text-[var(--text-secondary,#ddd)]">
          {renderInline(italicMatch[2])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 5. Links: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push(
        <a
          key={keyIdx++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--accent-primary,#38bdf8)] underline decoration-[var(--accent-primary,#38bdf8)]/40 hover:decoration-current transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Normal text chunk until next special char (` * _ [ ~)
    const nextSpecial = remaining.search(/[`*_\[~]/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Single orphan char
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return tokens;
}

function parseMarkdown(raw: string): React.ReactNode[] {
  if (!raw) return [];

  const lines = raw.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let nodeKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block: ```lang
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const codeString = codeLines.join("\n");
      nodes.push(
        <div
          key={nodeKey++}
          className="my-3 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-black/60 shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-3.5 py-1.5 text-xs text-[var(--text-muted)]">
            <span className="font-mono text-[11px] uppercase tracking-wider">{lang || "code"}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(codeString)}
              className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Copy className="h-3 w-3" />
              <span>Copier</span>
            </button>
          </div>
          <pre className="p-3 font-mono text-xs text-zinc-200 overflow-x-auto os-scroll leading-relaxed">
            <code>{codeString}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 2. Horizontal Rule: --- or ***
    if (/^(\s*[-*_]\s*){3,}$/.test(line.trim())) {
      nodes.push(
        <hr
          key={nodeKey++}
          className="my-3 border-t border-[var(--panel-border)]/60"
        />
      );
      i++;
      continue;
    }

    // 3. Headings: #, ##, ###, ####
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const inline = renderInline(text);

      if (level === 1) {
        nodes.push(
          <h1 key={nodeKey++} className="mt-4 mb-2 text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {inline}
          </h1>
        );
      } else if (level === 2) {
        nodes.push(
          <h2 key={nodeKey++} className="mt-3.5 mb-1.5 text-lg font-bold text-[var(--text-primary)] tracking-tight">
            {inline}
          </h2>
        );
      } else if (level === 3) {
        nodes.push(
          <h3 key={nodeKey++} className="mt-3 mb-1 text-base font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            {inline}
          </h3>
        );
      } else {
        nodes.push(
          <h4 key={nodeKey++} className="mt-2.5 mb-1 text-sm font-bold text-[var(--text-primary)]">
            {inline}
          </h4>
        );
      }
      i++;
      continue;
    }

    // 4. Blockquotes: > ...
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith(">") ||
          (lines[i].trim() !== "" && quoteLines.length > 0 && !lines[i].startsWith("#") && !lines[i].startsWith("-")))
      ) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      const quoteContent = quoteLines.join("\n");
      nodes.push(
        <blockquote
          key={nodeKey++}
          className="my-2.5 border-l-3 border-[var(--accent-primary)] bg-[var(--surface-raised)]/50 rounded-r-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] shadow-sm space-y-1.5"
        >
          {parseMarkdown(quoteContent)}
        </blockquote>
      );
      continue;
    }

    // 5. Checklist Items: - [ ] or - [x]
    const checkMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (checkMatch) {
      const checked = checkMatch[2].toLowerCase() === "x";
      const text = checkMatch[3];
      nodes.push(
        <div key={nodeKey++} className="my-1 flex items-start gap-2.5 text-xs">
          <span
            className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border",
              checked
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                : "border-[var(--panel-border)] bg-black/20 text-[var(--text-muted)]"
            )}
          >
            {checked ? <Check className="h-3 w-3" /> : <Square className="h-3 w-3 opacity-40" />}
          </span>
          <span className={cn(checked ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]")}>
            {renderInline(text)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 6. Unordered Bullet Points: - or *
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bulletMatch) {
      const text = bulletMatch[2];
      nodes.push(
        <div key={nodeKey++} className="my-1 flex items-start gap-2 text-xs">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
          <span className="text-[var(--text-primary)] leading-relaxed">
            {renderInline(text)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 7. Numbered Lists: 1. text
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const num = numMatch[2];
      const text = numMatch[3];
      nodes.push(
        <div key={nodeKey++} className="my-1 flex items-start gap-2 text-xs">
          <span className="font-mono font-bold text-[var(--accent-primary)] shrink-0 w-4">
            {num}.
          </span>
          <span className="text-[var(--text-primary)] leading-relaxed">
            {renderInline(text)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 8. Empty lines
    if (line.trim() === "") {
      nodes.push(<div key={nodeKey++} className="h-1.5" />);
      i++;
      continue;
    }

    // 9. Standard Paragraph text
    nodes.push(
      <p key={nodeKey++} className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return nodes;
}
