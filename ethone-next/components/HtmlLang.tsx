"use client";

import { useEffect } from "react";
import { useSettings } from "@/components/SettingsProvider";

export default function HtmlLang() {
  const { settings } = useSettings();
  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);
  return null;
}
