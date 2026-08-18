import { PLUGINS } from "@/lib/plugins";
import PluginClient from "./PluginClient";

export function generateStaticParams() {
  return PLUGINS.map((p) => ({ id: p.id }));
}

export default function PluginPage() {
  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <PluginClient />
    </div>
  );
}
