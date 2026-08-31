"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/ease";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  // Key on top-level root segment so sub-routes (/settings/[section], /plugins/[id], etc.) don't unmount or flash black
  const rootSegment = pathname ? pathname.split("/")[1] || "root" : "root";

  if (shouldReduceMotion) {
    return <div className="min-h-0 w-full flex-1 flex flex-col overflow-hidden">{children}</div>;
  }

  return (
    <div className="relative min-h-0 w-full flex-1 flex flex-col overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={rootSegment}
          initial={{ opacity: 0.9, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: EASE_OUT }}
          className="min-h-0 w-full flex-1 flex flex-col overflow-hidden"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

