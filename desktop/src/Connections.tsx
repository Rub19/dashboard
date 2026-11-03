import { useState } from "react";
import { ExternalLink, Plug } from "lucide-react";
import { apiCall, apiData, openExternal } from "./api";
import { firstArray, Json } from "./generic";
import { errorText, lang, tr } from "./i18n";
import { ErrorBox, PageHead, Status, useLoad } from "./kit";
import { NowPlayingCard } from "./NowPlaying";
import { Button } from "./ui";

const BRANDS: Record<string, { name: string; color: string; path?: string }> = {
  spotify: { name: "Spotify", color: "#1db954", path: "M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.500 17.300a.750.750 0 0 1-1 .250c-2.800-1.700-6.400-2.100-10.600-1.150a.750.750 0 0 1-.330-1.460c4.600-1.050 8.500-.600 11.700 1.350.350.210.460.670.230 1.010zm1.470-3.260a.940.940 0 0 1-1.290.310c-3.230-1.990-8.160-2.560-11.980-1.400a.940.940 0 0 1-.550-1.790c4.370-1.330 9.800-.690 13.510 1.590.440.270.580.850.310 1.290zm.130-3.400C15.230 8.340 8.850 8.130 5.160 9.250a1.120 1.120 0 1 1-.650-2.150c4.230-1.290 11.270-1.040 15.720 1.600a1.120 1.120 0 0 1-1.130 1.940z" },
  github: { name: "GitHub", color: "#8b949e", path: "M12 .300a12 12 0 0 0-3.800 23.400c.600.100.800-.260.800-.580v-2.230c-3.340.730-4.030-1.420-4.030-1.420-.550-1.390-1.340-1.760-1.340-1.760-1.090-.740.080-.730.080-.730 1.200.090 1.840 1.240 1.840 1.240 1.070 1.830 2.810 1.300 3.490 1 .110-.780.420-1.310.760-1.610-2.660-.300-5.470-1.330-5.470-5.930 0-1.310.470-2.380 1.240-3.220-.130-.300-.540-1.520.110-3.180 0 0 1-.320 3.300 1.230a11.500 11.500 0 0 1 6 0c2.280-1.550 3.290-1.230 3.290-1.230.650 1.660.240 2.880.120 3.180.770.840 1.230 1.910 1.230 3.220 0 4.610-2.810 5.620-5.480 5.920.430.370.820 1.100.820 2.220v3.290c0 .320.210.690.820.570A12 12 0 0 0 12 .300z" },
  discord: { name: "Discord", color: "#5865f2", path: "M20.300 4.400A19.800 19.800 0 0 0 15.400 2.900l-.240.480a18.300 18.300 0 0 0-6.320 0L8.600 2.900a19.700 19.700 0 0 0-4.900 1.500C.600 9 -.250 13.500.180 17.900a19.900 19.900 0 0 0 6 3l1.290-1.760a13 13 0 0 1-2.040-.980l.500-.390a14.200 14.200 0 0 0 12.100 0l.500.390c-.650.380-1.330.710-2.050.980l1.300 1.760a19.800 19.800 0 0 0 6-3c.510-5.100-.870-9.550-3.480-13.500zM8.020 15.200c-1.180 0-2.150-1.090-2.150-2.420s.950-2.420 2.150-2.420 2.170 1.090 2.150 2.420c0 1.330-.950 2.420-2.150 2.420zm7.960 0c-1.180 0-2.150-1.090-2.150-2.420s.950-2.420 2.150-2.420 2.170 1.090 2.150 2.420c0 1.330-.940 2.420-2.150 2.420z" },
  twitch: { name: "Twitch", color: "#9146ff", path: "M2.150 0 .500 4.200v17.100h5.800V24h3.200l2.800-2.700h4.400l5.800-5.800V0H2.150zm19.400 14.500-3.200 3.200h-5.100l-2.800 2.700v-2.700H5.800V2.100h15.750v12.400zM18.300 6.200h-2.100v6h2.100v-6zm-5.600 0h-2.100v6h2.100v-6z" },
  "google-calendar": { name: "Google Agenda", color: "#4285f4" },
  "google-drive": { name: "Google Drive", color: "#34a853" },
  youtube: { name: "YouTube", color: "#ff0033" },
  reddit: { name: "Reddit", color: "#ff4500" },
  notion: { name: "Notion", color: "#9b9a97" },
  todoist: { name: "Todoist", color: "#e44332" },
  minecraft: { name: "Minecraft", color: "#62b47a" },
};

const label = (provider: string) => BRANDS[provider]?.name ?? provider.charAt(0).toUpperCase() + provider.slice(1);

function Badge({ provider }: { provider: string }) {
  const brand = BRANDS[provider];
  return (
    <span className="conn-badge" style={{ "--brand": brand?.color ?? "var(--muted)" } as React.CSSProperties}>
      {brand?.path ? <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d={brand.path} /></svg> : <b>{label(provider).charAt(0)}</b>}
    </span>
  );
}

function GithubDetail() {
  const state = useLoad(() => apiData<{ avatarUrl?: string; login?: string; followers?: number; publicRepos?: number; htmlUrl?: string; recentEvent?: { at?: string; kind?: string; repo?: string } }>("api/github/profile"));
  const data = state.data;
  if (!data?.login) return null;
  return (
    <button type="button" className="conn-detail" onClick={() => data.htmlUrl && void openExternal(data.htmlUrl)}>
      {data.avatarUrl && <img src={data.avatarUrl} alt="" />}
      <span><b>{data.login}</b><small>{tr(`${data.publicRepos ?? 0} dépôts, ${data.followers ?? 0} abonné(s)`, `${data.publicRepos ?? 0} repos, ${data.followers ?? 0} follower(s)`)}</small>{data.recentEvent?.repo && <small>{tr("Dernière activité", "Last activity")} : {data.recentEvent.repo}{data.recentEvent.at ? `, ${new Date(data.recentEvent.at).toLocaleDateString(lang, { day: "numeric", month: "short" })}` : ""}</small>}</span>
    </button>
  );
}

function Card({ provider, onChanged }: { provider: string; onChanged: () => void }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disconnect = () => {
    setError(null);
    apiData("api/connections/disconnect", "POST", { provider }).then(onChanged, (reason) => setError(errorText(reason)));
  };
  return (
    <li className="conn-card" style={{ "--brand": BRANDS[provider]?.color ?? "var(--muted)" } as React.CSSProperties}>
      <div className="conn-head">
        <Badge provider={provider} />
        <span><b>{label(provider)}</b><small className="ok">{tr("Connecté", "Connected")}</small></span>
        {asking ? <span className="row"><Button onClick={() => setAsking(false)}>{tr("Annuler", "Cancel")}</Button><Button className="danger" onClick={disconnect}>{tr("Confirmer", "Confirm")}</Button></span> : <Button onClick={() => setAsking(true)}>{tr("Déconnecter", "Disconnect")}</Button>}
      </div>
      {provider === "github" && <GithubDetail />}
      {error && <ErrorBox message={error} />}
    </li>
  );
}

export default function Connections() {
  const state = useLoad(() => apiCall<Json>("api/connections"));
  const link = () => void openExternal("https://ethone.dev/connections");
  return (
    <>
      <PageHead title={tr("Connexions", "Connections")} text={tr("Tes services reliés à Ethone.", "Your services linked to Ethone.")} onRefresh={state.reload} refreshing={state.loading}>
        <Button variant="primary" onClick={link}><Plug size={14} />{tr("Connecter un service", "Link a service")}</Button>
      </PageHead>
      <NowPlayingCard />
      <Status state={state}>
        {(data) => {
          const rows = firstArray(data) as unknown as { provider: string; connected?: boolean }[];
          const linked = rows.filter((row) => row.connected);
          const others = rows.filter((row) => !row.connected);
          return (
            <>
              <ul className="conn-grid">{linked.map((row) => <Card key={row.provider} provider={row.provider} onChanged={state.reload} />)}</ul>
              <h2 className="group-title">{tr("Disponibles", "Available")}</h2>
              <ul className="conn-others">
                {others.map((row) => <li key={row.provider}><button type="button" onClick={link} title={tr(`Connecter ${label(row.provider)} sur ethone.dev`, `Link ${label(row.provider)} on ethone.dev`)}><Badge provider={row.provider} /><span>{label(row.provider)}</span><ExternalLink size={13} /></button></li>)}
              </ul>
            </>
          );
        }}
      </Status>
    </>
  );
}
