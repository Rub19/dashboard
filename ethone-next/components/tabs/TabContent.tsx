"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TabItem } from "./types";

type TabContentProps = {
  tabs: TabItem[];
  activeId: string;
  listId?: string;
};

export default function TabContent({ tabs, activeId, listId = "" }: TabContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  const activeTab = tabs.find((t) => t.id === activeId);

  useEffect(() => {
    if (containerRef.current) {
      setHeight(containerRef.current.scrollHeight);
    }
  }, [activeId, activeTab?.content]);

  return (
    <div className="relative overflow-hidden" style={{ height }}>
      <AnimatePresence mode="wait" initial={false}>
        {activeTab && (
          <motion.div
            key={activeTab.id}
            ref={containerRef}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{
              opacity: { duration: 0.08 },
              y: { duration: 0.08 },
            }}
            role="tabpanel"
            id={`${listId}-panel-${activeTab.id}`}
            aria-labelledby={`${listId}-tab-${activeTab.id}`}
            className="absolute left-0 top-0 w-full"
          >
            {activeTab.content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
