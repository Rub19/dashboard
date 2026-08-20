"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AudioWave({ playing, className = "" }: { playing: boolean; className?: string }) {
  return (
    <div className={cn("flex items-end gap-[3px]", className)}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-emerald-400"
          initial={{ height: "30%" }}
          animate={
            playing
              ? { height: ["30%", "80%", "40%", "70%", "30%"] }
              : { height: "30%" }
          }
          transition={
            playing
              ? {
                  duration: 0.8 + i * 0.15,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.08,
                }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  );
}
