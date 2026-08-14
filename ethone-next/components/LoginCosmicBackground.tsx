"use client";

export default function LoginCosmicBackground({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="login-cosmic-base" />
      <div className="login-cosmic-glow" />
      <div className="login-orbit login-orbit--outer" />
      <div className="login-orbit login-orbit--middle" />
      <div className="login-orbit login-orbit--inner" />
      <div className="login-torus" />
      <div className="login-starfield" />
    </div>
  );
}
