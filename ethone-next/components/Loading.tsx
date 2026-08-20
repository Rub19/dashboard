"use client";

import { motion } from "framer-motion";
import BrandMark from "./BrandMark";
import { Loader } from "@/components/motion/Loader";

export default function Loading({
  message = "Initialisation",
  progress,
}: {
  message?: string;
  progress?: number;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[var(--background)]"
      aria-busy="true"
      data-v8-boot
    >
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" as const }}
      >
        <BrandMark size={72} />
        <span className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">ETHONE</span>
      </motion.div>

      <Loader variant="percent" size={48} speed={1.2} label={message} progress={progress} />

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
