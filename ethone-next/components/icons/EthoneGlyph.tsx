import type { SVGProps } from "react";

export type EthoneGlyphName =
  | "update"
  | "refresh"
  | "close"
  | "bell"
  | "bell-off"
  | "inbox"
  | "mail-open"
  | "star"
  | "trash"
  | "check"
  | "archive"
  | "more"
  | "clock"
  | "alert"
  | "back"
  | "presence-online"
  | "presence-focus"
  | "presence-busy"
  | "presence-away"
  | "presence-invisible";

type EthoneGlyphProps = SVGProps<SVGSVGElement> & {
  name: EthoneGlyphName;
};

export default function EthoneGlyph({ name, ...props }: EthoneGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {name === "update" && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 16V8m0 0-3 3m3-3 3 3" />
        </>
      )}
      {name === "refresh" && (
        <>
          <path d="M20 11a8 8 0 0 0-14.7-3L4 10" />
          <path d="M4 5v5h5" />
          <path d="M4 13a8 8 0 0 0 14.7 3L20 14" />
          <path d="M20 19v-5h-5" />
        </>
      )}
      {name === "close" && <path d="m7 7 10 10M17 7 7 17" />}
      {name === "bell" && (
        <>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8" />
          <path d="M10 21h4" />
        </>
      )}
      {name === "bell-off" && (
        <>
          <path d="M13.7 20a2 2 0 0 1-3.4 0" />
          <path d="M18 9a6 6 0 0 0-9.4-4.9" />
          <path d="M6 9c0 3.8-1.1 5.6-2.4 7h13.1" />
          <path d="m3 3 18 18" />
        </>
      )}
      {name === "inbox" && (
        <>
          <path d="M4 5h16v14H4z" />
          <path d="M4 14h4l1.5 2h5L16 14h4" />
        </>
      )}
      {name === "mail-open" && (
        <>
          <path d="m4 8 8 5 8-5" />
          <path d="M4 8.5 12 4l8 4.5V19H4z" />
        </>
      )}
      {name === "star" && (
        <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
      )}
      {name === "trash" && (
        <>
          <path d="M5 7h14" />
          <path d="M9 7V4h6v3m-8 0 1 13h8l1-13" />
          <path d="M10 11v5m4-5v5" />
        </>
      )}
      {name === "check" && <path d="m5 12 4.2 4L19 7" />}
      {name === "archive" && (
        <>
          <path d="M4 7h16v12H4z" />
          <path d="M3 4h18v3H3zM9 12h6" />
        </>
      )}
      {name === "more" && (
        <>
          <circle cx="5" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="19" cy="12" r="1" fill="currentColor" />
        </>
      )}
      {name === "clock" && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {name === "alert" && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8v5m0 3h.01" />
        </>
      )}
      {name === "back" && <path d="m15 6-6 6 6 6M9 12h10" />}
      {name === "presence-online" && (
        <>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        </>
      )}
      {name === "presence-focus" && (
        <>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
        </>
      )}
      {name === "presence-busy" && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M8 12h8" />
        </>
      )}
      {name === "presence-away" && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
          <path d="M18.5 5.5 20 4m-16 0 1.5 1.5" />
        </>
      )}
      {name === "presence-invisible" && (
        <>
          <path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z" />
          <circle cx="12" cy="12" r="2" />
          <path d="m4 4 16 16" />
        </>
      )}
    </svg>
  );
}
