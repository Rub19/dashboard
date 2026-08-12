"use client";

export default function V8WindowControls() {
  return (
    <div data-v8-window-controls className="v8-window-controls hidden items-center gap-1 md:flex">
      <button
        type="button"
        aria-label="Minimize"
        className="h-3 w-3 rounded-full bg-amber-400/80 hover:bg-amber-400"
      />
      <button
        type="button"
        aria-label="Maximize"
        className="h-3 w-3 rounded-full bg-emerald-400/80 hover:bg-emerald-400"
      />
      <button
        type="button"
        aria-label="Close"
        className="h-3 w-3 rounded-full bg-red-400/80 hover:bg-red-400"
      />
    </div>
  );
}
