"use client";

import { useI18n } from "@/lib/hooks/useI18n";
import TasksWidget from "@/components/TasksWidget";

export default function TasksPage() {
  const i18n = useI18n();

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <div className="w-full">
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-white">{i18n("tasksTitle", "Tâches")}</h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            {i18n("tasksDescription", "Organisez vos objectifs et sprints du jour")}
          </p>
        </div>
        <TasksWidget />
      </div>
    </main>
  );
}
