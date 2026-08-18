"use client";

import { useRouter } from "next/navigation";
import Card3D from "@/components/Card3D";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { PLUGINS, getPluginRecord } from "@/lib/plugins";

export default function PluginsPage() {
  const i18n = useI18n();
  const { success } = useToast();
  const { records } = useLiveData();
  const { openWindow } = useWindowManager();
  const router = useRouter();

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4 space-y-2">
        <h1 className="text-2xl font-bold">{i18n("pluginsTitle")}</h1>
        <p className="text-sm text-[var(--muted)]">{i18n("pluginsDescription")}</p>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden] space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLUGINS.map((p) => {
          const live = getPluginRecord(records, p);
          const connected = live?.status === "connected";

          return (
            <Card3D key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--panel-bg)] text-[var(--accent)]">
                    <Icon name={p.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">{p.label}</p>
                    <p className={`text-xs ${connected ? "text-emerald-400" : "text-[var(--muted)]"}`}>
                      {connected ? live?.title || i18n("connected") : i18n("notConnected")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    aria-label={i18n("configure")}
                    onClick={() => router.push("/connections/")}
                    className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--panel-bg)]"
                  >
                    <Icon name="plug" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={i18n("open")}
                    onClick={() => {
                      openWindow(p.label, p.route);
                      success(i18n("open"));
                    }}
                    className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--panel-bg)]"
                  >
                    <Icon name="maximize-2" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card3D>
          );
        })}
      </div>
      </div>
    </div>
  );
}
