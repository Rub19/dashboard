import { PLUGINS } from "@/lib/plugins";
import PluginClient from "./PluginClient";

export function generateStaticParams() {
  return PLUGINS.map((p) => ({ id: p.id }));
}

export default function PluginPage() {
  return (
    <div className="w-full sm:max-w-5xl lg:max-w-7xl mx-auto">
      <PluginClient />
    </div>
  );
}
