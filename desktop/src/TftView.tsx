import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, Crown, Shield, Swords, Trophy } from "lucide-react";
import { apiData, riotStatus } from "./api";
import { errorText, lang, tr } from "./i18n";
import { Empty, ErrorBox, PageHead, Skeletons, Stat } from "./kit";
import { readJson, write } from "./settings";
import { Button } from "./ui";
import { TftMatch, TftPlayer, tftDuration, tftPlacementTone, tftRiotId, tftSummary } from "./tft";

const RIOT_ID_KEY = "ethone-lol-id";

function riotParts(value: string): string {
  const [name, tag = ""] = value.split("#");
  return `name=${encodeURIComponent(name.trim())}&tag=${encodeURIComponent(tag.trim())}`;
}

function placementLabel(placement?: number): string {
  return placement ? `#${placement}` : "–";
}

function PlayerLine({ player }: { player: TftPlayer }) {
  const mainTrait = player.traits?.[0];
  return (
    <li>
      <span className={`tft-lobby-place ${tftPlacementTone(player.placement)}`}>{placementLabel(player.placement)}</span>
      <span><b>{tr(`Niveau ${player.level ?? "–"}`, `Level ${player.level ?? "–"}`)}</b><small>{mainTrait?.name ? `${mainTrait.name} ${mainTrait.numUnits ?? ""}` : tr("Composition non disponible", "Composition unavailable")}</small></span>
      <span><b>{player.damage?.toLocaleString(lang) ?? "–"}</b><small>{tr("dégâts", "damage")}</small></span>
      <span><b>{player.playersEliminated ?? "–"}</b><small>{tr("éliminations", "eliminations")}</small></span>
    </li>
  );
}

function MatchCard({ match, expanded, onToggle }: { match: TftMatch; expanded: boolean; onToggle: () => void }) {
  const me = match.me;
  const id = `tft-match-${match.id ?? "unknown"}`;
  const tone = tftPlacementTone(me?.placement);
  return (
    <li className={`tft-match-card ${tone}`}>
      <button type="button" className="tft-match-head" aria-expanded={expanded} aria-controls={id} onClick={onToggle}>
        <span className={`tft-placement ${tone}`}>{me?.placement === 1 ? <Crown size={18} /> : null}{placementLabel(me?.placement)}</span>
        <span className="tft-match-title">
          <b>{match.mode || "TFT"}</b>
          <small>{[
            match.setNumber ? `Set ${match.setNumber}` : "",
            match.playedAt ? new Date(match.playedAt).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" }) : "",
            tftDuration(match.durationSeconds),
          ].filter(Boolean).join(" · ")}</small>
        </span>
        <span className="tft-match-metrics">
          <span><b>{me?.level ?? "–"}</b><small>{tr("Niveau", "Level")}</small></span>
          <span><b>{me?.damage?.toLocaleString(lang) ?? "–"}</b><small>{tr("Dégâts", "Damage")}</small></span>
          <span><b>{me?.playersEliminated ?? "–"}</b><small>{tr("Élim.", "Elims")}</small></span>
          <span><b>{me?.lastRound ?? "–"}</b><small>{tr("Manche", "Round")}</small></span>
        </span>
        <ChevronDown size={17} className={expanded ? "open" : ""} />
      </button>
      <div className="tft-composition">
        {(me?.traits?.length ?? 0) > 0 && <div className="tft-traits" aria-label={tr("Traits actifs", "Active traits")}>{me?.traits?.slice(0, 7).map((trait, index) => <span key={`${trait.name}-${index}`} data-tier={trait.tierCurrent ?? 0}><Shield size={12} /><b>{trait.name}</b>{trait.numUnits ?? 0}</span>)}</div>}
        {(me?.units?.length ?? 0) > 0 && <ul className="tft-units">{me?.units?.slice(0, 9).map((unit, index) => <li key={`${unit.characterId ?? unit.name}-${index}`} data-rarity={unit.rarity ?? 0}><span><b>{unit.name || unit.characterId}</b><small>{"★".repeat(Math.max(1, unit.tier ?? 1))}</small></span>{(unit.items?.length ?? 0) > 0 && <small title={unit.items?.join(", ")}>{unit.items?.join(" · ")}</small>}</li>)}</ul>}
      </div>
      {expanded && <div id={id} className="tft-lobby"><h3>{tr("Classement du lobby", "Lobby standings")}</h3><ul>{match.players?.map((player, index) => <PlayerLine key={`${player.placement ?? index}-${index}`} player={player} />)}</ul></div>}
    </li>
  );
}

export default function TftView() {
  const [value, setValue] = useState(() => readJson<string>(RIOT_ID_KEY) ?? "");
  const [matches, setMatches] = useState<TftMatch[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async (riotId: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await apiData<TftMatch[]>(`api/stats/tft-matches?${riotParts(riotId)}`);
      setMatches(Array.isArray(result) ? result : []);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.includes("#")) {
      setError(tr("Écris l'identifiant sous la forme Pseudo#TAG.", "Write the ID as Name#TAG."));
      return;
    }
    const riotId = value.trim();
    write(RIOT_ID_KEY, JSON.stringify(riotId));
    void load(riotId);
  };

  useEffect(() => {
    if (value) {
      void load(value);
      return;
    }
    void riotStatus().then((identity) => {
      const riotId = tftRiotId(identity);
      if (!riotId) return;
      setValue(riotId);
      write(RIOT_ID_KEY, JSON.stringify(riotId));
      void load(riotId);
    }).catch(() => undefined);
  }, []);

  const summary = useMemo(() => tftSummary(matches ?? []), [matches]);
  return (
    <>
      <PageHead title="Teamfight Tactics" text={tr("Tes parties, compositions et classements Riot réels.", "Your real Riot matches, compositions and standings.")} />
      <form className="daily-add tft-search" onSubmit={submit}>
        <input value={value} placeholder="Pseudo#TAG" aria-label={tr("Identifiant Riot", "Riot ID")} spellCheck={false} onChange={(event) => setValue(event.target.value)} />
        <Button type="submit" variant="primary" disabled={busy}>{busy ? tr("Recherche…", "Searching…") : tr("Rechercher", "Search")}</Button>
      </form>
      {error && <ErrorBox message={error} onRetry={value.includes("#") ? () => void load(value) : undefined} />}
      {busy && <Skeletons count={4} height={132} />}
      {matches && !busy && (matches.length === 0 ? <Empty title={tr("Aucune partie TFT", "No TFT games")} text={tr("Aucune partie récente n'est disponible pour cet identifiant.", "No recent match is available for this Riot ID.")} /> : (
        <>
          <div className="focus-stats tft-summary">
            <Stat label={tr("Parties", "Games")} value={summary.games} />
            <Stat label={tr("Place moyenne", "Average place")} value={summary.average.toFixed(1).replace(".", ",")} />
            <Stat label="Top 4" value={`${summary.topFourRate} %`} hint={`${summary.topFour}/${summary.games}`} />
            <Stat label={tr("Victoires", "Wins")} value={summary.wins} />
          </div>
          <div className="tft-section-head"><h2>{tr("Historique", "History")}</h2><span><Trophy size={14} />{tr(`${summary.games} parties analysées`, `${summary.games} games analyzed`)}</span></div>
          <ul className="tft-match-list">
            {matches.map((match, index) => {
              const key = match.id ?? String(index);
              return <MatchCard key={key} match={match} expanded={expanded === key} onToggle={() => setExpanded((current) => current === key ? null : key)} />;
            })}
          </ul>
          <p className="tft-source"><Swords size={13} />{tr("Données fournies par l'API Riot Games.", "Data provided by the Riot Games API.")}</p>
        </>
      ))}
    </>
  );
}
