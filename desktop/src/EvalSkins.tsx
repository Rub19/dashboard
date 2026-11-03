import { ReactNode, useEffect, useState } from "react";
import { ArrowLeft, Check, Clock } from "lucide-react";
import { catalogGet } from "./api";
import { lang, tr } from "./i18n";
import { Drawer, ErrorBox, Skeletons, useLoad } from "./kit";

export const VP = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";
export const SKIN_TYPE = "e7c63390-eda7-46e0-bb7a-a6abdacd2433";
export const CHROMA_TYPE = "3ad1b2b2-acdb-4524-852f-954a76ddae0a";
const CARD_TYPE = "3f296c07-64c3-494c-923b-fe692a4fa1bd";
const SPRAY_TYPE = "d5f120f8-ff8c-4aac-92ea-f2b5acbe9475";
const BUDDY_TYPE = "dd3bf334-87f3-40bd-b043-682a57a8dc3a";
const TITLE_TYPE = "de7caa6b-adf7-4588-bbd1-143831e786c6";
const language = "language=fr-FR";

export const TIERS: Record<string, { color: string; label: string }> = {
  "12683d76-48d7-84a3-4e09-6985794f0445": { color: "#73b8fb", label: "Select" },
  "0cebb8be-46d7-c12a-d306-e9907bfc5a25": { color: "#5ed3be", label: "Deluxe" },
  "60bca009-4182-7998-dee7-b8a2558dc369": { color: "#e96da5", label: "Premium" },
  "e046854e-406c-37f4-6607-19a9ba8426fc": { color: "#fea56d", label: "Exclusive" },
  "411e4a55-4e59-7757-41f0-86a53f101bb5": { color: "#f5d96a", label: "Ultra" },
};

const LEVEL_ITEMS: Record<string, () => string> = {
  VFX: () => tr("Effets visuels", "Visual effects"),
  Animation: () => tr("Animation", "Animation"),
  Finisher: () => tr("Achèvement", "Finisher"),
  Voiceover: () => tr("Voix", "Voiceover"),
  SoundEffects: () => tr("Effets sonores", "Sound effects"),
  Fish: () => tr("Aquarium", "Aquarium"),
  KillCounter: () => tr("Compteur d'éliminations", "Kill counter"),
  KillBanner: () => tr("Bannière d'élimination", "Kill banner"),
  KillEffect: () => tr("Effet d'élimination", "Kill effect"),
  TopFrag: () => tr("Meilleur joueur", "Top frag"),
  InspectAndKill: () => tr("Inspection et élimination", "Inspect and kill"),
  AttackerDefenderSwap: () => tr("Attaque et défense", "Attack and defense"),
  Transformation: () => tr("Transformation", "Transformation"),
  HeartbeatAndMapSensor: () => tr("Battement et capteur de carte", "Heartbeat and map sensor"),
};

export interface SkinLevel { uuid: string; displayName: string; levelItem?: string | null; displayIcon?: string | null; streamedVideo?: string | null }
export interface SkinChroma { uuid: string; displayName: string; displayIcon?: string | null; fullRender?: string | null; swatch?: string | null; streamedVideo?: string | null }
export interface CatalogSkin { uuid: string; displayName: string; displayIcon?: string | null; contentTierUuid?: string | null; levels?: SkinLevel[]; chromas?: SkinChroma[] }

let index: Promise<Map<string, CatalogSkin>> | null = null;

export function skinIndex() {
  index ??= catalogGet<CatalogSkin[]>(`/weapons/skins?${language}`).then((skins) => {
    const map = new Map<string, CatalogSkin>();
    for (const skin of skins) {
      map.set(skin.uuid.toLowerCase(), skin);
      for (const level of skin.levels ?? []) map.set(level.uuid.toLowerCase(), skin);
      for (const chroma of skin.chromas ?? []) map.set(chroma.uuid.toLowerCase(), skin);
    }
    return map;
  }).catch((reason) => {
    index = null;
    throw reason;
  });
  return index;
}

export const skinImage = (skin: CatalogSkin) => skin.chromas?.[0]?.fullRender ?? skin.displayIcon ?? skin.levels?.[0]?.displayIcon ?? "";
const levelLabel = (level: SkinLevel, position: number) => {
  const key = (level.levelItem ?? "").split("::").pop() ?? "";
  return position === 0 ? tr("Apparence de base", "Base skin") : LEVEL_ITEMS[key]?.() ?? tr("Amélioration", "Upgrade");
};
const chromaLabel = (chroma: SkinChroma, position: number) => /\d+\s+([^()\n]+)\)\s*$/.exec(chroma.displayName)?.[1] ?? (position === 0 ? tr("Base", "Base") : chroma.displayName);
export const money = (value: number) => `${value.toLocaleString(lang)} VP`;

export interface SkinChoice { skin: CatalogSkin; level: SkinLevel; chroma: SkinChroma; chromaIndex: number }

export function SkinViewer({ skinId, price, ownedLevels, action }: { skinId: string; price?: number; ownedLevels?: Set<string>; action?: (choice: SkinChoice) => ReactNode }) {
  const state = useLoad(async () => (await skinIndex()).get(skinId.toLowerCase()) ?? null, [skinId]);
  const [levelAt, setLevelAt] = useState(0);
  const [chromaAt, setChromaAt] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  useEffect(() => setVideoFailed(false), [levelAt, chromaAt]);
  if (state.error) return <ErrorBox message={state.error} onRetry={state.reload} />;
  const skin = state.data;
  if (!skin) return state.loading ? <Skeletons count={2} height={180} /> : <p className="muted">{tr("Cette apparence n'est pas dans le catalogue.", "This skin is not in the catalog.")}</p>;
  const levels = skin.levels ?? [];
  const chromas = skin.chromas ?? [];
  const level = levels[levelAt] ?? levels[0];
  const chroma = chromas[chromaAt] ?? chromas[0];
  const video = (chromaAt > 0 ? chroma?.streamedVideo : null) ?? level?.streamedVideo ?? chroma?.streamedVideo;
  const image = chroma?.fullRender ?? skin.displayIcon ?? level?.displayIcon ?? "";
  const tier = TIERS[skin.contentTierUuid?.toLowerCase() ?? ""];
  return (
    <div className="skin-viewer">
      <div className="skin-stage">
        {video && !videoFailed
          ? <video key={video} src={video} controls autoPlay muted loop playsInline poster={image || undefined} onError={() => setVideoFailed(true)} />
          : image ? <img src={image} alt={skin.displayName} /> : null}
      </div>
      <header className="skin-title">
        <div><h3>{skin.displayName}</h3>{tier && <small style={{ color: `color-mix(in srgb, ${tier.color} 62%, var(--fg))` }}>{tier.label}</small>}</div>
        {price !== undefined && <b>{money(price)}</b>}
      </header>
      {levels.length > 1 && (
        <section>
          <h4>{tr("Améliorations", "Upgrades")}</h4>
          <ol className="skin-levels">
            {levels.map((item, position) => (
              <li key={item.uuid}>
                <button type="button" className={position === levelAt ? "on" : ""} aria-pressed={position === levelAt} onClick={() => setLevelAt(position)}>
                  <i>{position + 1}</i>
                  <span>{levelLabel(item, position)}</span>
                  {ownedLevels?.has(item.uuid.toLowerCase()) && <Check size={14} aria-label={tr("Débloqué", "Unlocked")} />}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
      {chromas.length > 1 && (
        <section>
          <h4>{tr("Variantes", "Variants")}</h4>
          <ul className="skin-chromas">
            {chromas.map((item, position) => (
              <li key={item.uuid}>
                <button type="button" className={position === chromaAt ? "on" : ""} aria-pressed={position === chromaAt} onClick={() => setChromaAt(position)}>
                  {item.swatch ? <img src={item.swatch} alt="" /> : <i />}
                  <span>{chromaLabel(item, position)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {action && level && chroma && <div className="skin-action">{action({ skin, level, chroma, chromaIndex: chromaAt })}</div>}
    </div>
  );
}

export function SkinDrawer({ skinId, price, ownedLevels, onClose }: { skinId: string | null; price?: number; ownedLevels?: Set<string>; onClose: () => void }) {
  return (
    <Drawer open={skinId !== null} title={tr("Aperçu de l'arme", "Weapon preview")} onClose={onClose} width={760}>
      {skinId && <SkinViewer key={skinId} skinId={skinId} price={price} ownedLevels={ownedLevels} />}
    </Drawer>
  );
}

export interface StoreItem { name: string; kind: string; image: string; large: string; skinId?: string }

export async function describeItem(type: string, id: string): Promise<StoreItem> {
  const lower = type.toLowerCase();
  try {
    if (lower === SKIN_TYPE) {
      const skin = (await skinIndex()).get(id.toLowerCase());
      const image = skin ? skinImage(skin) : "";
      return { name: skin?.displayName ?? tr("Arme", "Weapon"), kind: tr("Arme", "Weapon"), image, large: image, skinId: id };
    }
    if (lower === CARD_TYPE) {
      const card = await catalogGet<{ displayName: string; smallArt?: string; wideArt?: string; largeArt?: string }>(`/playercards/${id}?${language}`);
      return { name: card.displayName, kind: tr("Carte", "Card"), image: card.smallArt ?? "", large: card.wideArt ?? card.largeArt ?? card.smallArt ?? "" };
    }
    if (lower === SPRAY_TYPE) {
      const spray = await catalogGet<{ displayName: string; displayIcon?: string; fullTransparentIcon?: string | null; animationGif?: string | null }>(`/sprays/${id}?${language}`);
      return { name: spray.displayName, kind: tr("Graffiti", "Spray"), image: spray.displayIcon ?? "", large: spray.animationGif ?? spray.fullTransparentIcon ?? spray.displayIcon ?? "" };
    }
    if (lower === BUDDY_TYPE) {
      const buddy = await catalogGet<{ displayName: string; displayIcon?: string }>(`/buddies/levels/${id}?${language}`);
      return { name: buddy.displayName, kind: tr("Porte-bonheur", "Gun buddy"), image: buddy.displayIcon ?? "", large: buddy.displayIcon ?? "" };
    }
    if (lower === TITLE_TYPE) {
      const title = await catalogGet<{ titleText?: string | null; displayName: string }>(`/playertitles/${id}?${language}`);
      return { name: title.titleText ?? title.displayName, kind: tr("Titre", "Title"), image: "", large: "" };
    }
  } catch {
    return { name: tr("Objet", "Item"), kind: tr("Objet", "Item"), image: "", large: "" };
  }
  return { name: tr("Objet", "Item"), kind: tr("Objet", "Item"), image: "", large: "" };
}

export function ItemViewer({ item, price }: { item: StoreItem; price?: number }) {
  return (
    <div className="skin-viewer">
      <div className="skin-stage item">{item.large ? <img src={item.large} alt={item.name} /> : <p>{item.name}</p>}</div>
      <header className="skin-title"><div><h3>{item.name}</h3><small className="muted">{item.kind}</small></div>{price !== undefined && <b>{money(price)}</b>}</header>
    </div>
  );
}

export interface BundleData {
  ID: string;
  DataAssetID: string;
  DurationRemainingInSeconds?: number;
  TotalBaseCost?: Record<string, number>;
  TotalDiscountedCost?: Record<string, number>;
  TotalDiscountPercent?: number;
  Items?: { BasePrice?: number; DiscountedPrice?: number; DiscountPercent?: number; Item: { ItemID: string; ItemTypeID: string } }[];
}

export function BundleDrawer({ bundle, name, image, left, onClose }: { bundle: BundleData | null; name: string; image: string; left: string; onClose: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => setOpen(null), [bundle?.ID]);
  const state = useLoad(async () => {
    if (!bundle) return [];
    const rows = await Promise.all((bundle.Items ?? []).map(async (row) => ({ item: await describeItem(row.Item.ItemTypeID, row.Item.ItemID), base: row.BasePrice ?? 0, price: row.DiscountedPrice ?? row.BasePrice ?? 0, discount: row.DiscountPercent ?? 0 })));
    return rows.sort((a, b) => Number(Boolean(b.item.skinId)) - Number(Boolean(a.item.skinId)) || b.price - a.price);
  }, [bundle?.ID]);
  const total = bundle?.TotalDiscountedCost?.[VP];
  const base = bundle?.TotalBaseCost?.[VP];
  const selected = open !== null ? state.data?.[open] : undefined;
  return (
    <Drawer open={Boolean(bundle)} title={selected ? selected.item.name : name} onClose={onClose} width={900}>
      {selected ? (
        <>
          <button type="button" className="skin-back" onClick={() => setOpen(null)}><ArrowLeft size={15} />{name}</button>
          {selected.item.skinId ? <SkinViewer key={selected.item.skinId} skinId={selected.item.skinId} price={selected.price} /> : <ItemViewer item={selected.item} price={selected.price} />}
        </>
      ) : (
        <>
          {image && <img className="bundle-hero" src={image} alt="" />}
          <div className="bundle-summary">
            <span>{total !== undefined && <b>{money(total)}</b>}{base !== undefined && total !== undefined && base > total && <s>{money(base)}</s>}{(bundle?.TotalDiscountPercent ?? 0) > 0 && <em>−{Math.round((bundle?.TotalDiscountPercent ?? 0) * 100)} %</em>}</span>
            {left && <small><Clock size={13} />{left}</small>}
          </div>
          {state.error && <ErrorBox message={state.error} onRetry={state.reload} />}
          {!state.data ? <Skeletons count={3} height={110} /> : (
            <ul className="bundle-items">
              {state.data.map((row, position) => (
                <li key={position}>
                  <button type="button" onClick={() => setOpen(position)}>
                    <span className="bundle-art">{row.item.image ? <img src={row.item.image} alt="" loading="lazy" /> : <i>{row.item.name}</i>}</span>
                    <b>{row.item.name}</b>
                    <small>{row.item.kind}</small>
                    <span className="bundle-price"><b>{row.price === 0 ? tr("Offert", "Free") : money(row.price)}</b>{row.base > row.price && <s>{money(row.base)}</s>}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Drawer>
  );
}
