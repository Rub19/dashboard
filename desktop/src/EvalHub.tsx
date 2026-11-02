import { FormEvent, useMemo, useState } from "react";
import { BookOpen, Crosshair, FileText, History, Map as MapIcon, Search, Sparkles, Trophy, Users } from "lucide-react";
import { apiData, catalogGet, restCall, riotCall, trackerMatches, trackerSync } from "./api";
import { bannerImage, EvalAccount, EvalMatch, modeName, rankColor, rankName, splitRiotId, statsFor, tierIcon } from "./eval";
import { errorText, tr } from "./i18n";
import { Drawer, Empty, ErrorBox, SideNav, Skeletons, Stagger, StaggerItem, staggerItem, Status, useLoad } from "./kit";
import { readJson, write } from "./settings";
import { Button } from "./ui";

type Section = "leaderboard" | "players" | "maps" | "agents" | "weapons" | "seasons" | "names" | "collection" | "contracts";
const language = "language=fr-FR";
const REGIONS = ["eu", "na", "ap", "kr", "latam", "br"];

interface AgentItem { uuid: string; displayName: string; description?: string; displayIcon?: string; fullPortrait?: string; role?: { displayName?: string }; abilities?: { slot: string; displayName: string; description: string; displayIcon?: string | null }[] }
interface MapItem { uuid: string; displayName: string; splash?: string; tacticalDescription?: string | null; coordinates?: string | null; narrativeDescription?: string | null; callouts?: { regionName: string; superRegionName?: string }[] | null }
interface WeaponItem { uuid: string; displayName: string; displayIcon?: string; shopData?: { cost?: number; categoryText?: string } | null; weaponStats?: { fireRate?: number; magazineSize?: number; reloadTimeSeconds?: number; damageRanges?: { rangeStartMeters: number; rangeEndMeters: number; headDamage: number; bodyDamage: number; legDamage: number }[] } | null; skins?: { uuid: string; displayName: string; displayIcon?: string | null; contentTierUuid?: string | null }[] }

function Leaderboard() {
  const [region, setRegion] = useState("eu");
  const state = useLoad(() => apiData<{ players?: { leaderboardRank?: number; name?: string; tag?: string; tier?: number; rr?: number; wins?: number; cardId?: string; isAnonymized?: boolean }[]; total?: number }>(`api/stats/valorant-leaderboard?region=${region}&platform=pc&startIndex=1&size=50`), [region]);
  return (
    <>
      <div className="eval-section-head"><h2>{tr("Classement", "Leaderboard")}</h2>
        <select className="eval-select" value={region} aria-label={tr("Région", "Region")} onChange={(event) => setRegion(event.target.value)}>{REGIONS.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select>
      </div>
      <Status state={state}>
        {(data) => (data.players ?? []).length === 0 ? <Empty title={tr("Classement vide", "Empty leaderboard")} /> : (
          <table className="eval-table">
            <thead><tr><th scope="col">#</th><th scope="col">{tr("Joueur", "Player")}</th><th scope="col">{tr("Rang", "Rank")}</th><th scope="col">RR</th><th scope="col">{tr("Victoires", "Wins")}</th></tr></thead>
            <tbody>
              {(data.players ?? []).map((player, index) => (
                <tr key={`${player.leaderboardRank}-${index}`}>
                  <td>{player.leaderboardRank}</td>
                  <th scope="row">{player.isAnonymized ? tr("Joueur masqué", "Hidden player") : <>{player.name}<span>#{player.tag}</span></>}</th>
                  <td>{(player.tier ?? 0) > 0 && <img src={tierIcon(player.tier ?? 0)} alt={rankName(player.tier ?? 0)} title={rankName(player.tier ?? 0)} />}</td>
                  <td>{player.rr}</td>
                  <td>{player.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Status>
    </>
  );
}

function Players() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<{ account: EvalAccount; matches: EvalMatch[] } | null>(null);
  const [saved, setSaved] = useState<string[]>(() => readJson<string[]>("ethone-eval-bookmarks") ?? []);
  const toggleSaved = (handle: string) => {
    const next = saved.includes(handle) ? saved.filter((item) => item !== handle) : [...saved, handle];
    setSaved(next);
    write("ethone-eval-bookmarks", JSON.stringify(next));
  };
  const search = async (text: string) => {
    const id = splitRiotId(text);
    if (!id) {
      setError(tr("Écris l'identifiant sous la forme Pseudo#TAG.", "Write the ID as Name#TAG."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const account = await trackerSync<EvalAccount>(id.name, id.tag);
      setFound({ account, matches: await trackerMatches<EvalMatch>(account.puuid, 20) });
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void search(value);
  };
  const tier = found ? found.account.mmr?.tier || found.account.tier || 0 : 0;
  const stats = found ? statsFor(found.matches, found.account.puuid) : null;
  return (
    <>
      <form className="eval-search" onSubmit={submit}>
        <input value={value} spellCheck={false} autoComplete="off" placeholder="Pseudo#TAG" aria-label={tr("Identifiant Riot", "Riot ID")} onChange={(event) => setValue(event.target.value)} />
        <Button type="submit" variant="primary" disabled={busy}><Search size={15} />{tr("Rechercher", "Search")}</Button>
      </form>
      {saved.length > 0 && <div className="eval-bookmarks">{saved.map((handle) => <button key={handle} type="button" onClick={() => { setValue(handle); void search(handle); }}>{handle}</button>)}</div>}
      {error && <ErrorBox message={error} />}
      {busy && <Skeletons count={1} height={180} />}
      {found && !busy && (
        <section className="eval-card eval-found">
          {found.account.card && <img className="eval-found-banner" src={bannerImage(found.account.card)} alt="" />}
          <div className="eval-found-body">
            <div className="eval-section-head"><h2>{found.account.name}<span>#{found.account.tag}</span></h2><Button onClick={() => toggleSaved(`${found.account.name}#${found.account.tag}`)}>{saved.includes(`${found.account.name}#${found.account.tag}`) ? tr("Retirer des signets", "Remove bookmark") : tr("Ajouter aux signets", "Bookmark")}</Button></div>
            <p style={{ color: rankColor(tier) }}>{rankName(tier)}{(found.account.mmr?.rr ?? 0) > 0 ? `, ${found.account.mmr?.rr} RR` : ""}</p>
            {stats && stats.count > 0 && <p className="eval-soft">{stats.wins}V – {stats.losses}D, K/D {stats.kd.toFixed(1).replace(".", ",")}, {stats.hs} % {tr("à la tête", "headshots")}, {tr("sur", "over")} {stats.count} {tr("matchs", "matches")}</p>}
            <ul className="eval-found-list">
              {found.matches.slice(0, 8).map((match) => {
                const me = match.players.find((player) => player.puuid === found.account.puuid);
                return <li key={match.id}><b>{match.map}</b><span>{modeName(match.mode)}</span><span>{me?.agent}</span><span>{me ? `${me.kills}/${me.deaths}/${me.assists}` : ""}</span></li>;
              })}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

function Maps() {
  const state = useLoad(() => catalogGet<MapItem[]>(`/maps?${language}`));
  const [open, setOpen] = useState<MapItem | null>(null);
  const maps = useMemo(() => (state.data ?? []).filter((item) => item.tacticalDescription), [state.data]);
  return (
    <>
      <Status state={state} height={120}>
        {() => (
          <Stagger className="eval-gallery">
            {maps.map((item) => (
              <StaggerItem key={item.uuid} variants={staggerItem}>
                <button type="button" onClick={() => setOpen(item)}>{item.splash && <img src={item.splash} alt="" />}<span><b>{item.displayName}</b><small>{item.tacticalDescription}</small></span></button>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </Status>
      <Drawer open={Boolean(open)} title={open?.displayName ?? ""} onClose={() => setOpen(null)}>
        {open?.splash && <img className="eval-drawer-art" src={open.splash} alt="" />}
        {open?.narrativeDescription && <p>{open.narrativeDescription}</p>}
        {open?.coordinates && <p className="eval-soft">{open.coordinates}</p>}
        {(open?.callouts?.length ?? 0) > 0 && (
          <>
            <h3>{tr("Repères", "Callouts")}</h3>
            <ul className="eval-tags">{[...new Set(open?.callouts?.map((item) => `${item.superRegionName ?? ""} ${item.regionName}`.trim()))].map((name) => <li key={name}>{name}</li>)}</ul>
          </>
        )}
      </Drawer>
    </>
  );
}

function Agents() {
  const state = useLoad(() => catalogGet<AgentItem[]>(`/agents?isPlayableCharacter=true&${language}`));
  const [open, setOpen] = useState<AgentItem | null>(null);
  return (
    <>
      <Status state={state} height={120}>
        {(agents) => (
          <Stagger className="eval-agents">
            {[...agents].sort((left, right) => left.displayName.localeCompare(right.displayName)).map((agent) => (
              <StaggerItem key={agent.uuid} variants={staggerItem}>
                <button type="button" onClick={() => setOpen(agent)}>{agent.displayIcon && <img src={agent.displayIcon} alt="" />}<b>{agent.displayName}</b><small>{agent.role?.displayName}</small></button>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </Status>
      <Drawer open={Boolean(open)} title={open?.displayName ?? ""} onClose={() => setOpen(null)}>
        {open?.fullPortrait && <img className="eval-drawer-portrait" src={open.fullPortrait} alt="" />}
        <p className="eval-soft">{open?.role?.displayName}</p>
        <p>{open?.description}</p>
        <ul className="eval-abilities">
          {open?.abilities?.map((ability) => (
            <li key={ability.slot}>{ability.displayIcon && <img src={ability.displayIcon} alt="" />}<span><b>{ability.displayName}</b><small>{ability.description}</small></span></li>
          ))}
        </ul>
      </Drawer>
    </>
  );
}

function Weapons() {
  const state = useLoad(() => catalogGet<WeaponItem[]>(`/weapons?${language}`));
  const [open, setOpen] = useState<WeaponItem | null>(null);
  return (
    <>
      <Status state={state} height={110}>
        {(weapons) => (
          <Stagger className="eval-weapons">
            {weapons.map((weapon) => (
              <StaggerItem key={weapon.uuid} variants={staggerItem}>
                <button type="button" onClick={() => setOpen(weapon)}>{weapon.displayIcon && <img src={weapon.displayIcon} alt="" />}<b>{weapon.displayName}</b><small>{weapon.shopData?.categoryText ?? tr("Corps à corps", "Melee")}{weapon.shopData?.cost ? `, ${weapon.shopData.cost}` : ""}</small></button>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </Status>
      <Drawer open={Boolean(open)} title={open?.displayName ?? ""} onClose={() => setOpen(null)} width={640}>
        {open?.displayIcon && <img className="eval-drawer-weapon" src={open.displayIcon} alt="" />}
        {open?.weaponStats && (
          <dl className="eval-weapon-stats">
            <div><dt>{tr("Cadence", "Fire rate")}</dt><dd>{open.weaponStats.fireRate}</dd></div>
            <div><dt>{tr("Chargeur", "Magazine")}</dt><dd>{open.weaponStats.magazineSize}</dd></div>
            <div><dt>{tr("Rechargement", "Reload")}</dt><dd>{open.weaponStats.reloadTimeSeconds} s</dd></div>
          </dl>
        )}
        {(open?.weaponStats?.damageRanges?.length ?? 0) > 0 && (
          <table className="eval-table">
            <thead><tr><th scope="col">{tr("Distance", "Range")}</th><th scope="col">{tr("Tête", "Head")}</th><th scope="col">{tr("Corps", "Body")}</th><th scope="col">{tr("Jambes", "Legs")}</th></tr></thead>
            <tbody>{open?.weaponStats?.damageRanges?.map((range) => <tr key={range.rangeStartMeters}><td>{range.rangeStartMeters}–{range.rangeEndMeters} m</td><td>{Math.round(range.headDamage)}</td><td>{Math.round(range.bodyDamage)}</td><td>{Math.round(range.legDamage)}</td></tr>)}</tbody>
          </table>
        )}
        <h3>{tr("Apparences", "Skins")}</h3>
        <ul className="eval-skins">
          {open?.skins?.filter((skin) => skin.displayIcon).map((skin) => <li key={skin.uuid}><img src={skin.displayIcon ?? ""} alt="" loading="lazy" /><small>{skin.displayName}</small></li>)}
        </ul>
      </Drawer>
    </>
  );
}

function NameHistory({ account }: { account: EvalAccount | null }) {
  const state = useLoad(async () => (account ? restCall<{ name: string; tag: string; first_seen_at: string }[]>(`ethone_valorant_name_history?select=name,tag,first_seen_at&puuid=eq.${account.puuid}&order=first_seen_at.desc`) : []), [account?.puuid]);
  return <Status state={state}>{(rows) => rows.length === 0 ? <Empty title={tr("Aucun ancien pseudo", "No previous names")} /> : (
    <table className="eval-table">
      <thead><tr><th scope="col">{tr("Vu depuis", "Seen since")}</th><th scope="col">{tr("Pseudo", "Name")}</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={`${row.name}-${row.first_seen_at}`}><td>{new Date(row.first_seen_at).toLocaleDateString()}</td><th scope="row">{row.name}<span>#{row.tag}</span></th></tr>)}</tbody>
    </table>
  )}</Status>;
}

function Collection({ linked }: { linked: boolean }) {
  const [query, setQuery] = useState("");
  const state = useLoad(async () => {
    if (!linked) return [];
    const [owned, skins] = await Promise.all([
      riotCall<{ Entitlements?: { ItemID: string }[] }>("/store/v1/entitlements/{puuid}/e7c63390-eda7-46e0-bb7a-a6abdacd2433"),
      catalogGet<{ uuid: string; displayName: string; displayIcon?: string | null; levels?: { uuid: string; displayIcon?: string | null }[] }[]>(`/weapons/skins?${language}`),
    ]);
    const ids = new Set((owned.Entitlements ?? []).map((item) => item.ItemID.toLowerCase()));
    return skins.filter((skin) => skin.levels?.[0] && ids.has(skin.levels[0].uuid.toLowerCase())).map((skin) => ({ id: skin.uuid, name: skin.displayName, icon: skin.levels?.[0]?.displayIcon ?? skin.displayIcon ?? "" }));
  }, [linked]);
  if (!linked) return <Empty title={tr("Compte Riot non connecté", "Riot account not linked")} text={tr("Connecte ton compte pour voir tes skins.", "Link your account to see your skins.")} />;
  const text = query.trim().toLowerCase();
  return (
    <>
      <div className="eval-section-head"><h2>{tr("Mes skins", "My skins")}{state.data ? ` (${state.data.length})` : ""}</h2></div>
      <form className="eval-search" onSubmit={(event) => event.preventDefault()}><input value={query} placeholder={tr("Chercher un skin", "Find a skin")} aria-label={tr("Chercher un skin", "Find a skin")} onChange={(event) => setQuery(event.target.value)} /></form>
      <Status state={state} height={80}>{(rows) => <ul className="eval-skins">{rows.filter((row) => !text || row.name.toLowerCase().includes(text)).map((row) => <li key={row.id}>{row.icon && <img src={row.icon} alt="" loading="lazy" />}<small>{row.name}</small></li>)}</ul>}</Status>
    </>
  );
}

function AgentContracts({ linked }: { linked: boolean }) {
  const state = useLoad(async () => {
    if (!linked) return [];
    const [mine, contracts, agents] = await Promise.all([
      riotCall<{ Contracts?: { ContractDefinitionID: string; ProgressionLevelReached?: number }[] }>("/contracts/v1/contracts/{puuid}"),
      catalogGet<{ uuid: string; content: { relationType?: string; relationUuid?: string; chapters?: { levels?: unknown[] }[] } }[]>(`/contracts?${language}`),
      catalogGet<AgentItem[]>(`/agents?isPlayableCharacter=true&${language}`),
    ]);
    return agents.map((agent) => {
      const contract = contracts.find((item) => item.content.relationType === "Agent" && item.content.relationUuid?.toLowerCase() === agent.uuid.toLowerCase());
      const total = contract?.content.chapters?.reduce((sum, chapter) => sum + (chapter.levels?.length ?? 0), 0) ?? 0;
      const reached = mine.Contracts?.find((item) => item.ContractDefinitionID.toLowerCase() === contract?.uuid.toLowerCase())?.ProgressionLevelReached ?? 0;
      return { id: agent.uuid, name: agent.displayName, icon: agent.displayIcon, reached: Math.min(reached, total), total };
    }).sort((left, right) => right.reached / Math.max(1, right.total) - left.reached / Math.max(1, left.total) || left.name.localeCompare(right.name));
  }, [linked]);
  if (!linked) return <Empty title={tr("Compte Riot non connecté", "Riot account not linked")} />;
  return (
    <>
      <div className="eval-section-head"><h2>{tr("Contrats d'agents", "Agent contracts")}</h2></div>
      <Status state={state} height={60}>
        {(rows) => (
          <ul className="eval-contracts">
            {rows.map((row) => <li key={row.id}>{row.icon && <img src={row.icon} alt="" />}<b>{row.name}</b><small>{tr("Niveau", "Level")} {row.reached} / {row.total}</small></li>)}
          </ul>
        )}
      </Status>
    </>
  );
}

function Seasons({ account }: { account: EvalAccount | null }) {
  const seasons = (account?.mmr as { seasons?: { season: string; short?: string; wins: number; games: number; endTier: number }[] } | undefined)?.seasons ?? [];
  if (seasons.length === 0) return <Empty title={tr("Aucune saison enregistrée", "No recorded seasons")} text={tr("L'historique des saisons de ce compte n'est pas disponible.", "This account's season history is not available.")} />;
  return (
    <table className="eval-table">
      <thead><tr><th scope="col">{tr("Saison", "Season")}</th><th scope="col">{tr("Rang final", "Final rank")}</th><th scope="col">{tr("Victoires", "Wins")}</th><th scope="col">{tr("Parties", "Games")}</th></tr></thead>
      <tbody>{seasons.map((season) => <tr key={season.season}><th scope="row">{season.short ?? season.season}</th><td style={{ color: rankColor(season.endTier) }}>{rankName(season.endTier)}</td><td>{season.wins}</td><td>{season.games}</td></tr>)}</tbody>
    </table>
  );
}

export default function EvalHub({ account, linked }: { account: EvalAccount | null; linked: boolean }) {
  const [section, setSection] = useState<Section>("leaderboard");
  const items = [
    { id: "leaderboard", label: tr("Classement", "Leaderboard"), icon: <Trophy size={16} />, group: tr("Joueurs", "Players") },
    { id: "players", label: tr("Rechercher un joueur", "Find a player"), icon: <Users size={16} />, group: tr("Joueurs", "Players") },
    { id: "seasons", label: tr("Mes saisons", "My seasons"), icon: <BookOpen size={16} />, group: tr("Joueurs", "Players") },
    { id: "names", label: tr("Mes anciens pseudos", "My past names"), icon: <History size={16} />, group: tr("Joueurs", "Players") },
    { id: "collection", label: tr("Ma collection", "My collection"), icon: <Sparkles size={16} />, group: tr("Joueurs", "Players") },
    { id: "contracts", label: tr("Contrats d'agents", "Agent contracts"), icon: <FileText size={16} />, group: tr("Joueurs", "Players") },
    { id: "maps", label: tr("Cartes", "Maps"), icon: <MapIcon size={16} />, group: tr("Le jeu", "The game") },
    { id: "agents", label: tr("Agents", "Agents"), icon: <Users size={16} />, group: tr("Le jeu", "The game") },
    { id: "weapons", label: tr("Armes", "Weapons"), icon: <Crosshair size={16} />, group: tr("Le jeu", "The game") },
  ] as const;
  return (
    <div className="kit-split">
      <SideNav items={items} value={section} onChange={setSection} id="eval-hub" label={tr("Sections du Hub", "Hub sections")} />
      <div className="kit-split-body">
        {section === "leaderboard" && <Leaderboard />}
        {section === "players" && <Players />}
        {section === "maps" && <Maps />}
        {section === "agents" && <Agents />}
        {section === "weapons" && <Weapons />}
        {section === "seasons" && <Seasons account={account} />}
        {section === "names" && <NameHistory account={account} />}
        {section === "collection" && <Collection linked={linked} />}
        {section === "contracts" && <AgentContracts linked={linked} />}
      </div>
    </div>
  );
}
