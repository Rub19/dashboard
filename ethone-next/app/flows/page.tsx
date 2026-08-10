import Card3D from "@/components/Card3D";

const flows = [
  { id: "personal", label: "Personnel", desc: "Essentiel. Une seule source de vérité pour la journée." },
  { id: "focus", label: "Focus", desc: "Deep work sans interruption, notifications masquées." },
  { id: "studio", label: "Studio", desc: "Création, notes, médias et espace libre." },
  { id: "gaming", label: "Gaming", desc: "Stats, trackers et sessions en direct." },
];

export default function FlowsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Flows</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {flows.map((flow) => (
          <Card3D key={flow.id}>
            <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{flow.label}</h2>
            <p className="min-w-0 truncate text-sm text-[var(--muted)]">{flow.desc}</p>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
