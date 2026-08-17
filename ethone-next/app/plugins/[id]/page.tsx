import { PLUGINS } from "@/lib/plugins";
import PluginClient from "./PluginClient";

export function generateStaticParams() {
  return PLUGINS.map((p) => ({ id: p.id }));
}

export default function PluginPage() {
  return (
    <div className="w-full">
      <PluginClient />
    </div>
  );
}
