"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { useUserData } from "@/lib/hooks/useUserData";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import Select from "@/components/ui/Select";

const ACTIONS = [
  { id: "navigate", i18nKey: "openPage", label: "Ouvrir page", defaults: { href: "/" } },
  { id: "toggle", i18nKey: "toggle", label: "Basculer", defaults: { setting: "brainEnabled" } },
];

export default function MacrosPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { items: macros, create, remove } = useUserData("macro");
  const [label, setLabel] = useState("");
  const [action, setAction] = useState("navigate");
  const [href, setHref] = useState("/");

  async function add() {
    if (!label.trim()) return;
    const data = action === "navigate" ? { action, href } : { action, setting: "brainEnabled" };
    try {
      await create(label, "", data);
      setLabel("");
      success(i18n("created"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function deleteMacro(id: string) {
    try {
      await remove(id);
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <h1 className="shrink-0 mb-4 text-2xl font-bold">{i18n("macrosTitle")}</h1>

      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
      <Card3D>
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">{i18n("macrosDescription")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              aria-label={i18n("create")} placeholder={i18n("create")}
              className="min-w-0 flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
            />
            <Select
              value={action}
              onChange={setAction}
              options={ACTIONS.map((a) => ({ id: a.id, label: i18n(a.i18nKey) }))}
              aria-label={i18n("action")}
              className="min-w-0"
            />
            {action === "navigate" && (
              <input
                type="text"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                aria-label={i18n("url")}
                placeholder="/page"
                className="min-w-0 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
              />
            )}
            <button
              type="button"
              aria-label={i18n("add")}
              onClick={add}
              className="inline-flex items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              <Icon name="plus" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card3D>

      <div className="space-y-3">
        {macros.map((m) => {
          const data = m.data as { action?: string; href?: string; setting?: string };
          return (
            <Card3D key={m.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-violet-500/10 text-violet-400">
                    <Icon name="workflow" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium">{m.label}</p>
                    <p className="text-xs text-[var(--muted)]">{i18n(data.action === "navigate" ? "openPage" : "toggle")} {data.href || data.setting}</p>
                  </div>
                </div>
                <button type="button" aria-label={i18n("delete")} onClick={() => deleteMacro(m.id)} className="text-[var(--muted)] hover:text-red-400">
                  <Icon name="trash-2" className="h-4 w-4" />
                </button>
              </div>
            </Card3D>
          );
        })}
      </div>
      </div>
    </div>
  );
}
