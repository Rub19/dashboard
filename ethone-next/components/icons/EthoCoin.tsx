import type { SVGProps } from "react";

export interface EthoCoinProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export default function EthoCoin({ size = 16, className, ...props }: EthoCoinProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Etho Coin"
      style={{ shapeRendering: "geometricPrecision" }}
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="etho-coin-rim-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="25%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="80%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <radialGradient id="etho-coin-face-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="25%" stopColor="#fde68a" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <linearGradient id="etho-coin-bevel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.8} />
          <stop offset="50%" stopColor="#d97706" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#451a03" stopOpacity={0.9} />
        </linearGradient>
        <linearGradient id="etho-coin-emblem-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#fef08a" />
          <stop offset="70%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="etho-coin-shadow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#78350f" floodOpacity={0.4} />
        </filter>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#etho-coin-rim-grad)" filter="url(#etho-coin-shadow-filter)" />
      <circle cx="32" cy="32" r="26.5" fill="none" stroke="url(#etho-coin-bevel-grad)" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="25" fill="url(#etho-coin-face-grad)" />
      <circle cx="32" cy="32" r="22.5" fill="none" stroke="#78350f" strokeOpacity={0.3} strokeWidth="0.75" strokeDasharray="1.5 1.5" />
      <path d="M14 26 C15 17 22 11 32 11 C38 11 44 13 48 17 C41 14 34 13 28 15 C19 18 15 22 14 26 Z" fill="#ffffff" fillOpacity={0.32} />
      <path d="M22 20v24m0-24h18M22 32h14M22 44h18" fill="none" stroke="#78350f" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" opacity={0.45} transform="translate(0, 1.3)" />
      <path d="M22 20v24m0-24h18M22 32h14M22 44h18" fill="none" stroke="url(#etho-coin-emblem-grad)" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="46,18 47.5,21 50.5,22.5 47.5,24 46,27 44.5,24 41.5,22.5 44.5,21" fill="#ffffff" fillOpacity={0.75} />
    </svg>
  );
}
