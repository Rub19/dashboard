import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Users } from "lucide-react";
import { catalogGet, riotCall } from "./api";
import { agentIcon } from "./eval";
import { errorText, tr } from "./i18n";
import { Empty, ErrorBox, Skeletons, Stagger, StaggerItem, staggerItem, useLoad } from "./kit";
import { EASE_SNAP } from "./motion";

const VP = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";
const RP = "e59aa87c-4cbf-517a-5983-6e81511be9b7";
const KC = "85ca954a-41f2-ce94-9b45-8ca3dd39a00d";
const TIERS: Record<string, { color: string; label: string }> = {
  "12683d76-48d7-84a3-4e09-6985794f0445": { color: "#73b8fb", label: "Select" },
  "0cebb8be-46d7-c12a-d306-e9907bfc5a25": { color: "#5ed3be", label: "Deluxe" },
  "60bca009-4182-7998-dee7-b8a2558dc369": { color: "#e96da5", label: "Premium" },
  "e046854e-406c-37f4-6607-19a9ba8426fc": { color: "#fea56d", label: "Exclusive" },
  "411e4a55-4e59-7757-41f0-86a53f101bb5": { color: "#f5d96a", label: "Ultra" },
};
const MEDIA = "https://media.valorant-api.com";
const language = "language=fr-FR";
const ACCESSORY_TYPES: Record<string, { label: string; image: (id: string) => string }> = {
  "d5f120f8-ff8c-4aac-92ea-f2b5acbe9475": { label: "Graffiti", image: (id) => `${MEDIA}/sprays/${id}/displayicon.png` },
  "3f296c07-64c3-494c-923b-fe692a4fa1bd": { label: "Carte", image: (id) => `${MEDIA}/playercards/${id}/smallart.png` },
  "dd3bf334-87f3-40bd-b043-682a57a8dc3a": { label: "Porte-bonheur", image: (id) => `${MEDIA}/buddylevels/${id}/displayicon.png` },
};

interface Offer { OfferID: string; Cost: Record<string, number>; Rewards?: { ItemID: string; ItemTypeID?: string }[] }
interface Skin { name: string; icon: string; tier: string }
interface Storefront {
  SkinsPanelLayout?: { SingleItemStoreOffers?: Offer[]; SingleItemOffersRemainingDurationInSeconds?: number };
  FeaturedBundle?: { Bundles?: { ID: string; DataAssetID: string; DurationRemainingInSeconds?: number; TotalDiscountedCost?: Record<string, number>; Items?: { DiscountedPrice?: number }[] }[] };
  AccessoryStore?: { AccessoryStoreOffers?: { Offer: Offer }[]; AccessoryStoreRemainingDurationInSeconds?: number };
}
interface Contracts {
  Contracts?: { ContractDefinitionID: string; ProgressionLevelReached?: number; ProgressionTowardsNextLevel?: number }[];
  Missions?: { ID: string; Objectives?: Record<string, number>; Complete?: boolean }[];
  MissionMetadata?: { WeeklyRefillTime?: string };
}

async function skinCatalog(): Promise<Map<string, Skin>> {
  const items = await catalogGet<{ displayName: string; displayIcon?: string | null; contentTierUuid?: string | null; levels?: { uuid: string; displayIcon?: string | null }[] }[]>(`/weapons/skins?${language}`);
  const map = new Map<string, Skin>();
  for (const item of items) {
    for (const level of item.levels ?? []) map.set(level.uuid.toLowerCase(), { name: item.displayName, icon: level.displayIcon ?? item.displayIcon ?? "", tier: item.contentTierUuid ?? "" });
  }
  return map;
}

function useCountdown(seconds: number | undefined) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (seconds === undefined) return "";
  const left = Math.max(0, seconds - Math.floor((now - start) / 1000));
  const days = Math.floor(left / 86400);
  const clock = `${Math.floor((left % 86400) / 3600)}:${String(Math.floor((left % 3600) / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  return days > 0 ? `${days}j ${clock}` : clock;
}

function Wallet() {
  const state = useLoad(() => riotCall<{ Balances: Record<string, number> }>("/store/v1/wallet/{puuid}"));
  const balances = state.data?.Balances ?? {};
  const items = [
    { id: VP, label: "VP", value: balances[VP] },
    { id: RP, label: tr("Radianite", "Radianite"), value: balances[RP] },
    { id: KC, label: tr("Kingdom Credits", "Kingdom Credits"), value: balances[KC] },
  ];
  return (
    <section className="eval-wallet" aria-label={tr("Portefeuille", "Wallet")} aria-busy={state.loading}>
      {items.map((item) => (
        <div key={item.id}>
          <img src={`${MEDIA}/currencies/${item.id}/displayicon.png`} alt="" />
          <span><small>{item.label}</small><b>{state.error ? "–" : (item.value ?? 0).toLocaleString("fr-FR")}</b></span>
        </div>
      ))}
    </section>
  );
}

function Shop() {
  const [front, setFront] = useState<Storefront | null>(null);
  const [skins, setSkins] = useState<Map<string, Skin>>(new Map());
  const [bundles, setBundles] = useState<Record<string, { name: string; image: string }>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    riotCall<Storefront>("/store/v3/storefront/{puuid}", { method: "POST", body: {} }).then(
      async (value) => {
        if (!active) return;
        setFront(value);
        const [catalog, metas] = await Promise.all([
          skinCatalog(),
          Promise.all((value.FeaturedBundle?.Bundles ?? []).map((bundle) => catalogGet<{ displayName: string; displayIcon?: string; displayIcon2?: string }>(`/bundles/${bundle.DataAssetID}?${language}`).then((meta) => [bundle.ID, { name: meta.displayName, image: meta.displayIcon2 ?? meta.displayIcon ?? "" }] as const).catch(() => null))),
        ]);
        if (!active) return;
        setSkins(catalog);
        setBundles(Object.fromEntries(metas.filter((entry) => entry !== null)));
      },
      (reason) => active && setError(errorText(reason)),
    );
    return () => {
      active = false;
    };
  }, []);
  const remaining = useCountdown(front?.SkinsPanelLayout?.SingleItemOffersRemainingDurationInSeconds);
  const accessoryLeft = useCountdown(front?.AccessoryStore?.AccessoryStoreRemainingDurationInSeconds);
  if (error) return <ErrorBox message={error} />;
  if (!front) return <Skeletons count={2} height={150} />;
  return (
    <>
      {(front.FeaturedBundle?.Bundles ?? []).map((bundle) => {
        const meta = bundles[bundle.ID];
        const price = bundle.TotalDiscountedCost?.[VP] ?? bundle.Items?.reduce((total, item) => total + (item.DiscountedPrice ?? 0), 0) ?? 0;
        return (
          <section key={bundle.ID} className="eval-bundle">
            {meta?.image && <img src={meta.image} alt="" />}
            <div><b>{meta?.name ?? tr("Pack", "Bundle")}</b><span>{price.toLocaleString("fr-FR")} VP</span></div>
          </section>
        );
      })}
      <div className="eval-section-head"><h2>{tr("Boutique du jour", "Daily store")}</h2>{remaining && <span><Clock size={13} />{remaining}</span>}</div>
      <Stagger className="eval-offers">
        {(front.SkinsPanelLayout?.SingleItemStoreOffers ?? []).map((offer) => {
          const id = (offer.Rewards?.[0]?.ItemID ?? offer.OfferID).toLowerCase();
          const skin = skins.get(id);
          const tier = TIERS[skin?.tier.toLowerCase() ?? ""];
          return (
            <StaggerItem key={offer.OfferID} variants={staggerItem} className="eval-offer" style={{ "--tier": tier?.color ?? "#8e8e93" } as React.CSSProperties}>
              {skin?.icon ? <img src={skin.icon} alt="" /> : <span className="eval-offer-empty" />}
              <b>{skin?.name ?? tr("Chargement…", "Loading…")}</b>
              <span><small>{tier?.label ?? ""}</small><small>{(offer.Cost[VP] ?? 0).toLocaleString("fr-FR")} VP</small></span>
            </StaggerItem>
          );
        })}
      </Stagger>
      {(front.AccessoryStore?.AccessoryStoreOffers?.length ?? 0) > 0 && (
        <>
          <div className="eval-section-head"><h2>{tr("Accessoires", "Accessories")}</h2>{accessoryLeft && <span><Clock size={13} />{accessoryLeft}</span>}</div>
          <Stagger className="eval-accessories">
            {(front.AccessoryStore?.AccessoryStoreOffers ?? []).map(({ Offer: offer }) => {
              const reward = offer.Rewards?.[0];
              if (!reward) return null;
              const id = reward.ItemID.toLowerCase();
              const type = ACCESSORY_TYPES[(reward.ItemTypeID ?? "").toLowerCase()];
              return (
                <StaggerItem key={offer.OfferID} variants={staggerItem}>
                  {type ? <img src={type.image(id)} alt="" /> : <span className="eval-offer-empty" />}
                  <small>{type?.label ?? tr("Titre", "Title")}</small>
                  <b>{(offer.Cost[KC] ?? Object.values(offer.Cost)[0] ?? 0).toLocaleString("fr-FR")}</b>
                </StaggerItem>
              );
            })}
          </Stagger>
        </>
      )}
    </>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <span className="eval-progress" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.i initial={{ transform: "scaleX(0)" }} animate={{ transform: `scaleX(${Math.min(1, value)})` }} transition={{ duration: 0.7, ease: EASE_SNAP }} />
    </span>
  );
}

function Missions() {
  const state = useLoad(async () => {
    const [contracts, daily, seasons, catalog] = await Promise.all([
      riotCall<Contracts>("/contracts/v1/contracts/{puuid}"),
      riotCall<{ DailyRewards?: { Milestones?: { Progress?: number; BonusApplied?: boolean }[] } }>("/daily-ticket/v1/{puuid}").catch(() => null),
      catalogGet<{ uuid: string; parentUuid?: string | null; startTime: string; endTime: string }[]>("/seasons"),
      catalogGet<{ uuid: string; displayName: string; content: { relationType?: string; relationUuid?: string; chapters?: { levels?: { xp: number }[] }[] } }[]>(`/contracts?${language}`),
    ]);
    const now = Date.now();
    const act = seasons.find((season) => season.parentUuid && Date.parse(season.startTime) <= now && now < Date.parse(season.endTime));
    const pass = catalog.find((contract) => contract.content.relationType === "Season" && contract.content.relationUuid === act?.uuid);
    const missions = await Promise.all((contracts.Missions ?? []).map(async (mission) => {
      const meta = await catalogGet<{ title?: string; progressToComplete?: number; xpGrant?: number }>(`/missions/${mission.ID}?${language}`).catch(() => null);
      return meta?.title ? { id: mission.ID, title: meta.title, target: meta.progressToComplete ?? 0, xp: meta.xpGrant ?? 0, progress: Object.values(mission.Objectives ?? {})[0] ?? 0, complete: mission.Complete ?? false } : null;
    }));
    return { contracts, daily, pass, missions: missions.filter((mission) => mission !== null) };
  });
  if (state.error) return <ErrorBox message={state.error} onRetry={state.reload} />;
  if (!state.data) return <Skeletons count={3} height={56} />;
  const { contracts, daily, pass, missions } = state.data;
  const mine = pass && contracts.Contracts?.find((contract) => contract.ContractDefinitionID.toLowerCase() === pass.uuid.toLowerCase());
  const levels = pass?.content.chapters?.flatMap((chapter) => chapter.levels ?? []) ?? [];
  const reached = mine?.ProgressionLevelReached ?? 0;
  const nextXp = levels[reached]?.xp ?? 0;
  const milestones = daily?.DailyRewards?.Milestones ?? [];
  return (
    <div className="eval-missions">
      {pass && (
        <section className="eval-card eval-pad">
          <div className="eval-section-head"><h2>{tr("Passe de combat", "Battle pass")}</h2><span>{tr("Niveau", "Tier")} {reached} / {levels.length}</span></div>
          <Progress value={levels.length ? reached / levels.length : 0} />
          {nextXp > 0 && <small>{(mine?.ProgressionTowardsNextLevel ?? 0).toLocaleString("fr-FR")} / {nextXp.toLocaleString("fr-FR")} XP</small>}
        </section>
      )}
      {milestones.length > 0 && (
        <section className="eval-card eval-pad">
          <h2>{tr("Récompense quotidienne", "Daily reward")}</h2>
          <div className="eval-daily">
            {milestones.map((milestone, index) => <span key={index} className={milestone.BonusApplied || (milestone.Progress ?? 0) >= 4 ? "on" : ""} />)}
          </div>
        </section>
      )}
      <section className="eval-card eval-pad">
        <h2>{tr("Missions", "Missions")}</h2>
        {missions.length === 0 ? <p className="eval-soft">{tr("Aucune mission active.", "No active missions.")}</p> : (
          <ul className="eval-mission-list">
            {missions.map((mission) => (
              <li key={mission.id}>
                <span><b>{mission.title}</b><small>{mission.xp.toLocaleString("fr-FR")} XP</small></span>
                <Progress value={mission.complete ? 1 : mission.target ? mission.progress / mission.target : 0} />
                <small>{mission.progress.toLocaleString("fr-FR")} / {mission.target.toLocaleString("fr-FR")}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Loadout() {
  const state = useLoad(async () => {
    const loadout = await riotCall<{ Identity?: { PlayerCardID?: string; PlayerTitleID?: string }; Guns?: { ID: string; SkinLevelID?: string }[]; Sprays?: { SprayID?: string }[] }>("/personalization/v3/players/{puuid}/playerloadout").catch(() => riotCall<{ Identity?: { PlayerCardID?: string; PlayerTitleID?: string }; Guns?: { ID: string; SkinLevelID?: string }[]; Sprays?: { SprayID?: string }[] }>("/personalization/v2/players/{puuid}/playerloadout"));
    const [skins, weapons, title] = await Promise.all([
      skinCatalog(),
      catalogGet<{ uuid: string; displayName: string; displayIcon?: string }[]>(`/weapons?${language}`),
      loadout.Identity?.PlayerTitleID ? catalogGet<{ titleText?: string }>(`/playertitles/${loadout.Identity.PlayerTitleID}?${language}`).catch(() => null) : null,
    ]);
    return { loadout, skins, weapons, title: title?.titleText ?? "" };
  });
  if (state.error) return <ErrorBox message={state.error} onRetry={state.reload} />;
  if (!state.data) return <Skeletons count={2} height={120} />;
  const { loadout, skins, weapons, title } = state.data;
  const card = loadout.Identity?.PlayerCardID?.toLowerCase();
  return (
    <div className="eval-loadout">
      <section className="eval-card eval-identity">
        {card && <img src={`${MEDIA}/playercards/${card}/largeart.png`} alt="" />}
        <div>{title && <b>{title}</b>}
          {(loadout.Sprays?.length ?? 0) > 0 && <div className="eval-sprays">{loadout.Sprays?.map(({ SprayID }) => SprayID && <img key={SprayID} src={`${MEDIA}/sprays/${SprayID.toLowerCase()}/displayicon.png`} alt="" />)}</div>}
        </div>
      </section>
      <Stagger className="eval-guns">
        {(loadout.Guns ?? []).map((gun) => {
          const weapon = weapons.find((item) => item.uuid.toLowerCase() === gun.ID.toLowerCase());
          const skin = gun.SkinLevelID ? skins.get(gun.SkinLevelID.toLowerCase()) : undefined;
          return (
            <StaggerItem key={gun.ID} variants={staggerItem}>
              {(skin?.icon || weapon?.displayIcon) && <img src={skin?.icon || weapon?.displayIcon} alt="" />}
              <small>{weapon?.displayName}</small>
              <b>{skin?.name ?? weapon?.displayName}</b>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}

function PartyAndLive() {
  const state = useLoad(async () => {
    const player = await riotCall<{ CurrentPartyID: string }>("/parties/v1/players/{puuid}", { host: "glz" }).catch(() => null);
    const party = player ? await riotCall<{ State?: string; Accessibility?: string; MatchmakingData?: { QueueID?: string }; Members: { Subject: string; IsOwner?: boolean; PlayerIdentity?: { PlayerCardID?: string } }[] }>(`/parties/v1/parties/${player.CurrentPartyID}`, { host: "glz" }).catch(() => null) : null;
    const liveId = await riotCall<{ MatchID: string }>("/core-game/v1/players/{puuid}", { host: "glz" }).catch(() => null);
    const preId = liveId ? null : await riotCall<{ MatchID: string }>("/pregame/v1/players/{puuid}", { host: "glz" }).catch(() => null);
    const live = liveId
      ? await riotCall<{ Players?: { Subject: string; TeamID?: string; CharacterID?: string }[] }>(`/core-game/v1/matches/${liveId.MatchID}`, { host: "glz" }).catch(() => null)
      : null;
    const pre = preId
      ? await riotCall<{ AllyTeam?: { Players?: { Subject: string; CharacterID?: string }[] } }>(`/pregame/v1/matches/${preId.MatchID}`, { host: "glz" }).catch(() => null)
      : null;
    const players = live?.Players ?? pre?.AllyTeam?.Players ?? [];
    const subjects = [...(party?.Members.map((member) => member.Subject) ?? []), ...players.map((item) => item.Subject)];
    const names = subjects.length ? await riotCall<{ Subject: string; GameName: string; TagLine: string }[]>("/name-service/v2/players", { method: "PUT", body: subjects }).catch(() => []) : [];
    return { party, players, inGame: Boolean(liveId), names };
  });
  useEffect(() => {
    const timer = setInterval(state.reload, 20000);
    return () => clearInterval(timer);
  }, [state.reload]);
  if (!state.data) return state.error ? <ErrorBox message={state.error} onRetry={state.reload} /> : <Skeletons count={1} height={96} />;
  const { party, players, inGame, names } = state.data;
  const nameOf = (subject: string) => {
    const found = names.find((item) => item.Subject === subject);
    return found?.GameName ? `${found.GameName}#${found.TagLine}` : tr("Joueur masqué", "Hidden player");
  };
  return (
    <div className="eval-party">
      {players.length > 0 && (
        <section className="eval-card eval-pad">
          <h2>{inGame ? tr("Partie en cours", "Live match") : tr("Sélection des agents", "Agent select")}</h2>
          <ul className="eval-live">
            {players.map((player) => (
              <li key={player.Subject}>
                {player.CharacterID ? <img src={agentIcon(player.CharacterID)} alt="" /> : <span className="eval-offer-empty" />}
                <b>{nameOf(player.Subject)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="eval-card eval-pad">
        <div className="eval-section-head"><h2><Users size={16} />{tr("Groupe", "Party")}</h2>{party && <span>{party.Members.length} / 5</span>}</div>
        {party ? (
          <ul className="eval-live">
            {party.Members.map((member) => (
              <li key={member.Subject}>
                {member.PlayerIdentity?.PlayerCardID ? <img src={`${MEDIA}/playercards/${member.PlayerIdentity.PlayerCardID.toLowerCase()}/smallart.png`} alt="" /> : <span className="eval-offer-empty" />}
                <b>{nameOf(member.Subject)}</b>
                {member.IsOwner && <small>{tr("Chef", "Leader")}</small>}
              </li>
            ))}
          </ul>
        ) : <p className="eval-soft">{tr("Lance VALORANT pour voir ton groupe. Riot ne connaît ton groupe que lorsque le jeu est ouvert.", "Start VALORANT to see your party. Riot only knows your party while the game is open.")}</p>}
      </section>
    </div>
  );
}

export default function EvalGame({ linked, onConnect }: { linked: boolean; onConnect: () => void }) {
  if (!linked) {
    return <Empty title={tr("Compte Riot non connecté", "Riot account not linked")} text={tr("La boutique, le portefeuille, les missions, l'équipement et le groupe viennent de ton compte Riot.", "Store, wallet, missions, loadout and party come from your Riot account.")} action={<button type="button" className="btn primary" onClick={onConnect}>{tr("Connecter mon compte Riot", "Link my Riot account")}</button>} />;
  }
  return (
    <div className="eval-game">
      <div className="eval-game-main">
        <Wallet />
        <Shop />
      </div>
      <div className="eval-game-side">
        <PartyAndLive />
        <Missions />
        <Loadout />
      </div>
    </div>
  );
}
