import type { ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  tabs: TabItem[];
  defaultTab?: string;
  value?: string;
  onChange?: (id: string) => void;
  className?: string;
  mobileThreshold?: number;
};
