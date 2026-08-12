"use client";

import { motion } from "framer-motion";
import BrandMark from "./BrandMark";

export default function Loading({ message = "Initialisation" }: { message?: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[var(--canvas)]"
      role="status"
      aria-label={message}
      data-v8-boot
    >
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <BrandMark size={72} />
        <span className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">ETHONE</span>
      </motion.div>

      <motion.div
        className="h-1 w-32 overflow-hidden rounded-full bg-[var(--surface-raised)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="h-full w-full bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.p
        className="text-sm text-[var(--muted)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.p>
    </div>
  );
}
