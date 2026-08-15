"use client";

import { useId, useState } from "react";
import TabList from "./TabList";
import TabContent from "./TabContent";
import type { TabItem, TabsProps } from "./types";

export { TabList, TabContent };
export type { TabItem, TabsProps };

export default function Tabs({
  tabs,
  defaultTab,
  value,
  onChange,
  className = "",
}: TabsProps) {
  const firstEnabled = tabs.find((t) => !t.disabled)?.id;
  const [internal, setInternal] = useState(value ?? defaultTab ?? firstEnabled ?? "");
  const activeId = value ?? internal;
  const listId = useId();

  function handleSelect(id: string) {
    if (onChange) onChange(id);
    else setInternal(id);
  }

  if (!activeId || !tabs.some((t) => t.id === activeId)) {
    return null;
  }

  return (
    <div className={className}>
      <TabList tabs={tabs} activeId={activeId} onSelect={handleSelect} />
      <TabContent tabs={tabs} activeId={activeId} listId={listId} />
    </div>
  );
}
