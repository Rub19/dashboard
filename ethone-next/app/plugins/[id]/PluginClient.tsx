"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import Button from "@/components/ui/Button";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { getPluginById, getPluginRecord } from "@/lib/plugins";

export default function PluginClient() {
  const i18n = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { records, loading } = useLiveData();
  const plugin = getPluginById(params.id);

  if (!plugin) {
    return (
      <div className="h-full min-h-0 w-full flex flex-col overflow-hidden p-6">
        <h1 className="shrink-0 mb-4 break-words text-2xl font-bold">{i18n("pluginsTitle")}</h1>
        <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
          <Card3D>
            <p className="break-words text-sm text-[var(--muted)]">{i18n("notFound")}</p>
          </Card3D>
        </div>
      </div>
    );
  }

  const live = getPluginRecord(records, plugin);
  const connected = live?.status === "connected";

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden p-6">
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--panel-bg)] text-[var(--accent)]">
          <Icon name={plugin.icon} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold">{plugin.label}</h1>
          <p className={`text-sm ${connected ? "text-[--accent-primary]" : "text-[var(--muted)]"}`}>
            {connected ? i18n("connected") : i18n("notConnected")}
          </p>
        </div>
      </div>

      <Card3D>
        <div className="space-y-4">
          {live?.image && (
            <div className="flex justify-center">
              <Image
                src={live.image}
                alt=""
                width={128}
                height={128}
                unoptimized
                className="h-32 w-32 rounded-[var(--panel-radius)] object-cover shadow-lg"
              />
            </div>
          )}
          <div className="text-center">
            <p className="break-words text-lg font-semibold">{live?.title || (loading ? i18n("loading") : "—")}</p>
            {live?.subtitle && <p className="break-words text-sm text-[var(--muted)]">{live.subtitle}</p>}
            {live?.meta && <p className="break-words text-xs text-[var(--muted)]">{live.meta}</p>}
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => router.push("/connections/")}
            className="w-full"
          >
            {i18n("configure")}
          </Button>
        </div>
      </Card3D>
      </div>
    </div>
  );
}
