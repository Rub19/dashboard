"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchWorker } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EASE_SNAP } from "@/lib/ease";
import RiotGamesLogo from "@/components/icons/RiotGamesLogo";
import GoogleIcon from "@/components/icons/GoogleIcon";
import ClientImage from "@/components/ClientImage";
import {
  ChevronRight,
  CircleCheck,
  ClipboardPaste,
  Clock,
  Coins,
  CreditCard,
  ExternalLink,
  LogOut,
  RefreshCw,
  SearchX,
  ShieldCheck,
  Sparkles,
  X,
} from "@/components/icons/ph";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AnimatedFilterTabs, { type AnimatedFilterTab } from "@/components/ui/AnimatedFilterTabs";

type ValorantSession = {
  accessToken: string;
  idToken: string;
  entitlementsToken: string;
  puuid: string;
  shard: string;
  username: string;
  country?: string;
};

type SkinItem = {
  uuid: string;
  displayName: string;
  displayIcon: string;
  category?: string;
  tier?: string;
  tierIcon?: string;
  tierColor?: string;
};

type BuddyItem = {
  uuid: string;
  displayName: string;
  displayIcon: string;
};

type CardItem = {
  uuid: string;
  displayName: string;
  largeArt: string;
  wideArt?: string;
};

type DailyOfferItem = {
  uuid: string;
  name: string;
  image: string;
  price: number;
  weaponType?: string;
  tier?: string;
  tierIcon?: string;
  tierColor?: string;
};

type NightMarketItem = {
  uuid: string;
  name: string;
  image: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  weaponType?: string;
  tier?: string;
  tierIcon?: string;
  tierColor?: string;
};

type ValorantTierInfo = {
  name: string;
  color: string;
  icon: string;
};

const VALORANT_TIERS: Record<string, ValorantTierInfo> = {
  select: {
    name: "Select",
    color: "#5A9FE2",
    icon: "https://media.valorant-api.com/contenttiers/12683d76-48d7-84a3-4e09-6985794f0445/displayicon.png",
  },
  deluxe: {
    name: "Deluxe",
    color: "#00D6BA",
    icon: "https://media.valorant-api.com/contenttiers/0cebb8be-46d7-c12a-d306-e9907bfc5a25/displayicon.png",
  },
  premium: {
    name: "Premium",
    color: "#FF4655",
    icon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
  },
  exclusive: {
    name: "Exclusive",
    color: "#F59E0B",
    icon: "https://media.valorant-api.com/contenttiers/e046854e-406c-37f4-6607-19a9ba8426fc/displayicon.png",
  },
  ultra: {
    name: "Ultra",
    color: "#EBC837",
    icon: "https://media.valorant-api.com/contenttiers/411e4a55-4e59-7757-41f0-86a53f101bb5/displayicon.png",
  },
};

function getTierFromPriceOrName(price: number, name = ""): ValorantTierInfo {
  const lower = name.toLowerCase();
  if (lower.includes("kuronami") || lower.includes("araxys") || lower.includes("rgx") || lower.includes("chronovoid") || price >= 2175 || price === 4350) {
    return VALORANT_TIERS.exclusive;
  }
  if (lower.includes("elderflame") || lower.includes("protocoll") || price >= 2475) {
    return VALORANT_TIERS.ultra;
  }
  if (lower.includes("prime") || lower.includes("reaver") || lower.includes("sovereign") || lower.includes("ion") || lower.includes("forsaken") || lower.includes("magepunk") || price >= 1775) {
    return VALORANT_TIERS.premium;
  }
  if (lower.includes("gelée") || lower.includes("terres") || lower.includes("luxe") || price >= 1275) {
    return VALORANT_TIERS.deluxe;
  }
  return VALORANT_TIERS.select;
}

const SHARDS = [
  { id: "eu", label: "Europe (EU)" },
  { id: "na", label: "Amérique du Nord (NA)" },
  { id: "ap", label: "Asie-Pacifique (AP)" },
  { id: "kr", label: "Corée (KR)" },
];

const WEAPON_CATEGORIES = [
  "Tous",
  "Vandal",
  "Phantom",
  "Mêlée (Couteaux)",
  "Operator",
  "Sheriff",
  "Ghost",
  "Spectre",
];

const DEMO_DAILY_OFFERS: DailyOfferItem[] = [
  {
    uuid: "d8d5d7a1-4d81-8560-54bc-0692ab40f69b",
    name: "Kuronami Vandal",
    image: "https://media.valorant-api.com/weaponskins/d8d5d7a1-4d81-8560-54bc-0692ab40f69b/displayicon.png",
    price: 2375,
    weaponType: "Vandal",
    tier: "Exclusive",
    tierColor: "#F59E0B",
    tierIcon: "https://media.valorant-api.com/contenttiers/e046854e-406c-37f4-6607-19a9ba8426fc/displayicon.png",
  },
  {
    uuid: "b73d7b16-4652-bc5b-5c4c-068aabb19d0a",
    name: "Reaver Karambit",
    image: "https://media.valorant-api.com/weaponskins/b73d7b16-4652-bc5b-5c4c-068aabb19d0a/displayicon.png",
    price: 4350,
    weaponType: "Mêlée (Couteaux)",
    tier: "Exclusive",
    tierColor: "#F59E0B",
    tierIcon: "https://media.valorant-api.com/contenttiers/e046854e-406c-37f4-6607-19a9ba8426fc/displayicon.png",
  },
  {
    uuid: "44b7b110-46bf-ccbb-2613-29a5df296461",
    name: "Prime//2.0 Phantom",
    image: "https://media.valorant-api.com/weaponskins/44b7b110-46bf-ccbb-2613-29a5df296461/displayicon.png",
    price: 1775,
    weaponType: "Phantom",
    tier: "Premium",
    tierColor: "#FF4655",
    tierIcon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
  },
  {
    uuid: "83778c03-45a3-67a2-3c89-6b8598327d58",
    name: "Ion Sheriff",
    image: "https://media.valorant-api.com/weaponskins/83778c03-45a3-67a2-3c89-6b8598327d58/displayicon.png",
    price: 1775,
    weaponType: "Sheriff",
    tier: "Premium",
    tierColor: "#FF4655",
    tierIcon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
  },
];

const DEMO_BUDDIES: BuddyItem[] = [
  {
    uuid: "f2f07eae-4518-15eb-546b-018961e0dd60",
    displayName: "Porte-bonheur Force opérationnelle 809",
    displayIcon: "https://media.valorant-api.com/buddies/f2f07eae-4518-15eb-546b-018961e0dd60/displayicon.png",
  },
  {
    uuid: "bf997358-4a99-c1f8-37b0-5fa64200cdce",
    displayName: "Porte-bonheur Beckoner",
    displayIcon: "https://media.valorant-api.com/buddies/bf997358-4a99-c1f8-37b0-5fa64200cdce/displayicon.png",
  },
  {
    uuid: "dce731f8-4560-5f30-6eb5-8ab2e36864ec",
    displayName: "Porte-bonheur RGX 11z Pro",
    displayIcon: "https://media.valorant-api.com/buddies/dce731f8-4560-5f30-6eb5-8ab2e36864ec/displayicon.png",
  },
];

const DEMO_CARDS: CardItem[] = [
  {
    uuid: "1711d20d-4b1c-c64a-14be-d4ae58a457c6",
    displayName: "Carte Duo fluo",
    largeArt: "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png",
    wideArt: "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/wideart.png",
  },
  {
    uuid: "c8b2f5fd-4331-b172-f3b7-c8a26f356a1f",
    displayName: "Carte Afternoon Asada",
    largeArt: "https://media.valorant-api.com/playercards/c8b2f5fd-4331-b172-f3b7-c8a26f356a1f/largeart.png",
    wideArt: "https://media.valorant-api.com/playercards/c8b2f5fd-4331-b172-f3b7-c8a26f356a1f/wideart.png",
  },
  {
    uuid: "eef542d2-4724-bc47-f53f-239f8c9c2623",
    displayName: "Carte Pass the Sticks",
    largeArt: "https://media.valorant-api.com/playercards/eef542d2-4724-bc47-f53f-239f8c9c2623/largeart.png",
    wideArt: "https://media.valorant-api.com/playercards/eef542d2-4724-bc47-f53f-239f8c9c2623/wideart.png",
  },
];

const DEMO_NIGHT_MARKET: NightMarketItem[] = [
  {
    uuid: "b9ee2457-481c-6776-3f5b-0ca8e8f90c89",
    name: "Prime Vandal",
    image: "https://media.valorant-api.com/weaponskins/b9ee2457-481c-6776-3f5b-0ca8e8f90c89/displayicon.png",
    originalPrice: 1775,
    discountPrice: 1150,
    discountPercent: 35,
    weaponType: "Vandal",
    tier: "Premium",
    tierColor: "#FF4655",
    tierIcon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
  },
  {
    uuid: "2e77ac95-4681-3d87-bbdc-93a50ff6b1f6",
    name: "Sovereign Sword",
    image: "https://media.valorant-api.com/weaponskins/2e77ac95-4681-3d87-bbdc-93a50ff6b1f6/displayicon.png",
    originalPrice: 3550,
    discountPrice: 2130,
    discountPercent: 40,
    weaponType: "Mêlée (Couteaux)",
    tier: "Premium",
    tierColor: "#FF4655",
    tierIcon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
  },
  {
    uuid: "a3f8e1b3-4654-f3ea-15ba-9eb9fd6a0b0d",
    name: "Magepunk Spectre",
    image: "https://media.valorant-api.com/weaponskins/a3f8e1b3-4654-f3ea-15ba-9eb9fd6a0b0d/displayicon.png",
    originalPrice: 1775,
    discountPrice: 1242,
    discountPercent: 30,
    weaponType: "Spectre",
    tier: "Premium",
    tierColor: "#FF4655",
    tierIcon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
  },
  {
    uuid: "c612138e-4007-6d0c-64ad-3690c65ee4a7",
    name: "Forsaken Classic",
    image: "https://media.valorant-api.com/weaponskins/c612138e-4007-6d0c-64ad-3690c65ee4a7/displayicon.png",
    originalPrice: 1775,
    discountPrice: 1065,
    discountPercent: 40,
    weaponType: "Classic",
    tier: "Premium",
    tierColor: "#FF4655",
    tierIcon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
  },
  {
    uuid: "83778c03-45a3-67a2-3c89-6b8598327d58",
    name: "Ion Sheriff",
    image: "https://media.valorant-api.com/weaponskins/83778c03-45a3-67a2-3c89-6b8598327d58/displayicon.png",
    originalPrice: 1775,
    discountPrice: 1242,
    discountPercent: 30,
    weaponType: "Sheriff",
    tier: "Premium",
    tierColor: "#FF4655",
    tierIcon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
  },
  {
    uuid: "a9890917-41ea-eb55-47e7-ee990a87fa4e",
    name: "Sovereign Ghost",
    image: "https://media.valorant-api.com/weaponskins/a9890917-41ea-eb55-47e7-ee990a87fa4e/displayicon.png",
    originalPrice: 1775,
    discountPrice: 1150,
    discountPercent: 35,
    weaponType: "Ghost",
    tier: "Premium",
    tierColor: "#FF4655",
    tierIcon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
  },
];

export default function ValorantInventoryView() {
  const [session, setSession] = useState<ValorantSession | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authWaiting, setAuthWaiting] = useState(false);
  const [activeTab, setActiveTab] = useState<"store" | "skins" | "buddies" | "cards">("store");

  const [redirectUrlInput, setRedirectUrlInput] = useState("");
  const [detectedTokens, setDetectedTokens] = useState<{ accessToken: string; idToken: string } | null>(null);
  const [shardInput, setShardInput] = useState("eu");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [wallet, setWallet] = useState({ vp: 3250, radianite: 180, kingdomCredits: 8500 });
  const [dailyOffers, setDailyOffers] = useState<DailyOfferItem[]>(DEMO_DAILY_OFFERS);
  const [nightMarket, setNightMarket] = useState<NightMarketItem[]>([]);
  const [ownedSkins, setOwnedSkins] = useState<SkinItem[]>([]);
  const [ownedBuddies, setOwnedBuddies] = useState<BuddyItem[]>([]);
  const [ownedCards, setOwnedCards] = useState<CardItem[]>([]);
  const [remainingTime, setRemainingTime] = useState(43200);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tous");
  const [dataLoading, setDataLoading] = useState(false);

  const extractTokensFromInput = useCallback((input: string): { accessToken: string; idToken: string } | null => {
    const clean = input.trim();
    if (!clean) return null;
    if (clean.includes("access_token=")) {
      try {
        const hashPart = clean.includes("#") ? clean.split("#")[1] : clean.includes("?") ? clean.split("?")[1] : clean;
        const params = new URLSearchParams(hashPart);
        const accessToken = params.get("access_token");
        const idToken = params.get("id_token") || "";
        if (accessToken) return { accessToken, idToken };
      } catch {}
    }
    if (clean.startsWith("ey") && clean.split(".").length >= 3) {
      return { accessToken: clean, idToken: "" };
    }
    return null;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime((prev) => (prev > 0 ? prev - 1 : 86400));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h} h ${m.toString().padStart(2, "0")} min ${s.toString().padStart(2, "0")} s`;
  }, []);

  const loadPlayerData = useCallback(async (currentSession: ValorantSession) => {
    setDataLoading(true);
    try {
      const [skinsApiRes, buddiesApiRes, cardsApiRes] = await Promise.all([
        fetch("https://valorant-api.com/v1/weapons/skins?language=fr-FR").then((r) => r.json()),
        fetch("https://valorant-api.com/v1/buddies?language=fr-FR").then((r) => r.json()),
        fetch("https://valorant-api.com/v1/playercards?language=fr-FR").then((r) => r.json()),
      ]);

      const skinCatalog: Map<string, { name: string; icon: string }> = new Map();
      if (skinsApiRes?.data) {
        for (const skin of skinsApiRes.data) {
          const icon = skin.displayIcon || skin.levels?.[0]?.displayIcon || "";
          skinCatalog.set(skin.uuid?.toLowerCase(), { name: skin.displayName, icon });
          if (Array.isArray(skin.levels)) {
            for (const lvl of skin.levels) {
              if (lvl.uuid) skinCatalog.set(lvl.uuid.toLowerCase(), { name: skin.displayName, icon: lvl.displayIcon || icon });
            }
          }
        }
      }

      const buddyCatalog: Map<string, { name: string; icon: string }> = new Map();
      if (buddiesApiRes?.data) {
        for (const b of buddiesApiRes.data) {
          buddyCatalog.set(b.uuid?.toLowerCase(), { name: b.displayName, icon: b.displayIcon || "" });
        }
      }

      const cardCatalog: Map<string, { name: string; largeArt: string; wideArt?: string }> = new Map();
      if (cardsApiRes?.data) {
        for (const c of cardsApiRes.data) {
          cardCatalog.set(c.uuid?.toLowerCase(), { name: c.displayName, largeArt: c.largeArt || "", wideArt: c.wideArt });
        }
      }

      const [storefrontRes, inventoryRes] = await Promise.allSettled([
        fetchWorker("/api/stats/valorant-player-store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: currentSession.accessToken,
            entitlementsToken: currentSession.entitlementsToken,
            puuid: currentSession.puuid,
            shard: currentSession.shard,
          }),
        }),
        fetchWorker("/api/stats/valorant-inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: currentSession.accessToken,
            entitlementsToken: currentSession.entitlementsToken,
            puuid: currentSession.puuid,
            shard: currentSession.shard,
          }),
        }),
      ]);

      if (storefrontRes.status === "fulfilled" && storefrontRes.value?.data) {
        const sData = storefrontRes.value.data;
        if (sData.remainingSeconds) setRemainingTime(sData.remainingSeconds);
        if (Array.isArray(sData.dailyOffers)) {
          const mappedOffers: DailyOfferItem[] = sData.dailyOffers.map((uuid: string) => {
            const hit = skinCatalog.get(uuid?.toLowerCase());
            const name = hit?.name || "Skin Valorant";
            const tier = getTierFromPriceOrName(1775, name);
            return {
              uuid,
              name,
              image: hit?.icon || "",
              price: 1775,
              weaponType: "Skin",
              tier: tier.name,
              tierColor: tier.color,
              tierIcon: tier.icon,
            };
          });
          setDailyOffers(mappedOffers);
        }
        if (Array.isArray(sData.nightMarketOffers)) {
          const mappedNight: NightMarketItem[] = sData.nightMarketOffers.map((o: { skinUuid: string; originalCost: number; discountCost: number; discountPercent: number }) => {
            const hit = skinCatalog.get(o.skinUuid?.toLowerCase());
            const name = hit?.name || "Skin Marché Nocturne";
            const tier = getTierFromPriceOrName(o.originalCost, name);
            return {
              uuid: o.skinUuid,
              name,
              image: hit?.icon || "",
              originalPrice: o.originalCost,
              discountPrice: o.discountCost,
              discountPercent: o.discountPercent,
              weaponType: "Skin",
              tier: tier.name,
              tierColor: tier.color,
              tierIcon: tier.icon,
            };
          });
          setNightMarket(mappedNight);
        }
      }

      if (inventoryRes.status === "fulfilled" && inventoryRes.value?.data) {
        const invData = inventoryRes.value.data;
        if (invData.wallet) setWallet(invData.wallet);
        if (Array.isArray(invData.guns)) {
          const mappedSkins: SkinItem[] = invData.guns.map((g: { skinUuid: string }) => {
            const hit = skinCatalog.get(g.skinUuid?.toLowerCase());
            const name = hit?.name || "Arme";
            const tier = getTierFromPriceOrName(0, name);
            return {
              uuid: g.skinUuid,
              displayName: name,
              displayIcon: hit?.icon || "",
              tier: tier.name,
              tierColor: tier.color,
              tierIcon: tier.icon,
            };
          });
          setOwnedSkins(mappedSkins);
        }
        if (Array.isArray(invData.buddies)) {
          const mappedBuddies: BuddyItem[] = invData.buddies.map((b: { buddyUuid: string }) => {
            const hit = buddyCatalog.get(b.buddyUuid?.toLowerCase());
            return {
              uuid: b.buddyUuid,
              displayName: hit?.name || "Porte-bonheur",
              displayIcon: hit?.icon || "",
            };
          });
          setOwnedBuddies(mappedBuddies);
        }
        if (Array.isArray(invData.cards)) {
          const mappedCards: CardItem[] = invData.cards.map((c: { cardUuid: string }) => {
            const hit = cardCatalog.get(c.cardUuid?.toLowerCase());
            return {
              uuid: c.cardUuid,
              displayName: hit?.name || "Carte",
              largeArt: hit?.largeArt || "",
              wideArt: hit?.wideArt,
            };
          });
          setOwnedCards(mappedCards);
        }
      }
    } catch {
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("ethone:valorant:session") || localStorage.getItem("ethone:valorant:session");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.accessToken && parsed.accessToken !== "demo-access-token") {
          setSession(parsed);
          void loadPlayerData(parsed);
        }
      }
    } catch {}
  }, [loadPlayerData]);

  const executeTokenSync = useCallback(
    async (tokens: { accessToken: string; idToken: string }) => {
      if (!tokens?.accessToken) return;
      setLoginError(null);
      setLoginLoading(true);

      try {
        const res = await fetchWorker("/api/stats/valorant-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "exchange_token",
            accessToken: tokens.accessToken,
            idToken: tokens.idToken,
          }),
        });

        const data = res?.data;
        if (data?.accessToken && data?.puuid) {
          const newSession: ValorantSession = {
            accessToken: data.accessToken,
            idToken: data.idToken || tokens.idToken,
            entitlementsToken: data.entitlementsToken,
            puuid: data.puuid,
            shard: shardInput,
            username: data.userInfo?.sub ? `Joueur (${data.userInfo.sub.slice(0, 8)})` : "Riot Player",
            country: data.userInfo?.country,
          };
          setSession(newSession);
          setIsDemo(false);
          sessionStorage.setItem("ethone:valorant:session", JSON.stringify(newSession));
          localStorage.setItem("ethone:valorant:session", JSON.stringify(newSession));
          setLoginModalOpen(false);
          setRedirectUrlInput("");
          setDetectedTokens(null);
          setAuthWaiting(false);
          void loadPlayerData(newSession);
        } else {
          setLoginError("Échec de synchronisation avec Riot Games. Vérifiez la validité du jeton.");
        }
      } catch (err: unknown) {
        setLoginError(err instanceof Error ? err.message : "Erreur de validation du jeton Riot Games.");
      } finally {
        setLoginLoading(false);
      }
    },
    [shardInput, loadPlayerData]
  );

  const handleRedirectUrlChange = useCallback(
    (value: string) => {
      setRedirectUrlInput(value);
      const tokens = extractTokensFromInput(value);
      setDetectedTokens(tokens);
      if (loginError) setLoginError(null);
      if (tokens) {
        void executeTokenSync(tokens);
      }
    },
    [extractTokensFromInput, executeTokenSync, loginError]
  );

  const handlePasteAndSync = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setRedirectUrlInput(text);
          const tokens = extractTokensFromInput(text);
          if (tokens) {
            setDetectedTokens(tokens);
            void executeTokenSync(tokens);
            return;
          }
        }
      }
      setLoginError("Aucun jeton Riot Games détecté dans le presse-papier. Assurez-vous d'avoir copié l'URL finale.");
    } catch {
      setLoginError("Accès au presse-papier non autorisé par votre navigateur. Collez l'URL directement dans le champ ci-dessous.");
    }
  }, [extractTokensFromInput, executeTokenSync]);

  const handleOpenRiotOAuth = useCallback(() => {
    const url = "https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&scope=account%20openid&nonce=1";
    setAuthWaiting(true);
    setLoginError(null);
    if (typeof window !== "undefined") {
      const popup = window.open(url, "RiotAuthWindow", "width=520,height=760,menubar=no,toolbar=no,location=yes,status=no");
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        window.open(url, "_blank");
      }
    }
  }, []);

  useEffect(() => {
    if (!loginModalOpen || session || loginLoading) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const checkClipboardAuto = async () => {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
          const text = await navigator.clipboard.readText();
          if (text) {
            const tokens = extractTokensFromInput(text);
            if (tokens) {
              setRedirectUrlInput(text);
              setDetectedTokens(tokens);
              void executeTokenSync(tokens);
            }
          }
        }
      } catch {}
    };

    const handleWindowFocus = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void checkClipboardAuto();
      }, 350);
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleWindowFocus);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleWindowFocus);
    };
  }, [loginModalOpen, session, loginLoading, extractTokensFromInput, executeTokenSync]);

  const handleStartDemo = () => {
    setIsDemo(true);
    setSession({
      accessToken: "demo-access-token",
      idToken: "demo-id-token",
      entitlementsToken: "demo-entitlements",
      puuid: "demo-player-puuid",
      shard: "eu",
      username: "Joueur Démo",
      country: "FRA",
    });
    setDailyOffers(DEMO_DAILY_OFFERS);
    setNightMarket(DEMO_NIGHT_MARKET);
    setOwnedBuddies(DEMO_BUDDIES);
    setOwnedCards(DEMO_CARDS);
    setOwnedSkins([
      {
        uuid: "s1",
        displayName: "Kuronami Vandal",
        displayIcon: "https://media.valorant-api.com/weaponskins/d8d5d7a1-4d81-8560-54bc-0692ab40f69b/displayicon.png",
        category: "Vandal",
        tier: "Exclusive",
        tierColor: "#F59E0B",
        tierIcon: "https://media.valorant-api.com/contenttiers/e046854e-406c-37f4-6607-19a9ba8426fc/displayicon.png",
      },
      {
        uuid: "s2",
        displayName: "Prime//2.0 Phantom",
        displayIcon: "https://media.valorant-api.com/weaponskins/44b7b110-46bf-ccbb-2613-29a5df296461/displayicon.png",
        category: "Phantom",
        tier: "Premium",
        tierColor: "#FF4655",
        tierIcon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
      },
      {
        uuid: "s3",
        displayName: "Reaver Karambit",
        displayIcon: "https://media.valorant-api.com/weaponskins/b73d7b16-4652-bc5b-5c4c-068aabb19d0a/displayicon.png",
        category: "Mêlée (Couteaux)",
        tier: "Exclusive",
        tierColor: "#F59E0B",
        tierIcon: "https://media.valorant-api.com/contenttiers/e046854e-406c-37f4-6607-19a9ba8426fc/displayicon.png",
      },
      {
        uuid: "s4",
        displayName: "Ion Sheriff",
        displayIcon: "https://media.valorant-api.com/weaponskins/83778c03-45a3-67a2-3c89-6b8598327d58/displayicon.png",
        category: "Sheriff",
        tier: "Premium",
        tierColor: "#FF4655",
        tierIcon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
      },
      {
        uuid: "s5",
        displayName: "Sovereign Ghost",
        displayIcon: "https://media.valorant-api.com/weaponskins/a9890917-41ea-eb55-47e7-ee990a87fa4e/displayicon.png",
        category: "Ghost",
        tier: "Premium",
        tierColor: "#FF4655",
        tierIcon: "https://media.valorant-api.com/contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
      },
      {
        uuid: "s6",
        displayName: "Araxys Operator",
        displayIcon: "https://media.valorant-api.com/weaponskins/6db556e4-4255-6c2c-6a80-8a9dfac96aa9/displayicon.png",
        category: "Operator",
        tier: "Exclusive",
        tierColor: "#F59E0B",
        tierIcon: "https://media.valorant-api.com/contenttiers/e046854e-406c-37f4-6607-19a9ba8426fc/displayicon.png",
      },
    ]);
    setLoginModalOpen(false);
    setAuthWaiting(false);
  };

  const handleLogout = () => {
    setSession(null);
    setIsDemo(false);
    setAuthWaiting(false);
    sessionStorage.removeItem("ethone:valorant:session");
    localStorage.removeItem("ethone:valorant:session");
  };

  const filteredSkins = useMemo(() => {
    return ownedSkins.filter((s) => {
      const matchesSearch = s.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "Tous" ||
        (s.category && s.category.toLowerCase().includes(categoryFilter.toLowerCase())) ||
        s.displayName.toLowerCase().includes(categoryFilter.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [ownedSkins, searchQuery, categoryFilter]);

  const filteredBuddies = useMemo(() => {
    return ownedBuddies.filter((b) => b.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [ownedBuddies, searchQuery]);

  const filteredCards = useMemo(() => {
    return ownedCards.filter((c) => c.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [ownedCards, searchQuery]);

  const TABS: AnimatedFilterTab[] = [
    { id: "store", label: "Boutique du Jour (4 skins)" },
    { id: "skins", label: `Mes Armes & Skins (${ownedSkins.length})` },
    { id: "buddies", label: `Porte-bonheur (${ownedBuddies.length})` },
    { id: "cards", label: `Cartes de Joueur (${ownedCards.length})` },
  ];

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto p-1 pr-2 pb-32">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--text-primary)]/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#EB0029]/20 bg-[#EB0029]/10 text-[#EB0029] shadow-sm">
            <RiotGamesLogo className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                Inventaire & Boutique Valorant
              </h1>
              {session && (
                <Badge variant={isDemo ? "muted" : "success"} size="sm">
                  {isDemo ? "Mode Démo" : "Connecté"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {session
                ? `Connecté en tant que ${session.username} • Région ${session.shard.toUpperCase()}`
                : "Consultez vos 4 skins quotidiens, votre inventaire d'armes, porte-bonheur et portefeuille."}
            </p>
          </div>
        </div>

        {session ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-300">
              <Coins className="h-4 w-4 text-amber-400" />
              <span>{wallet.vp.toLocaleString("fr-FR")} VP</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-purple-500/25 bg-purple-500/10 px-2.5 py-1.5 text-xs font-bold text-purple-300">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>{wallet.radianite} RP</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-500/25 bg-zinc-500/10 px-2.5 py-1.5 text-xs font-bold text-zinc-300">
              <CreditCard className="h-4 w-4 text-zinc-400" />
              <span>{wallet.kingdomCredits.toLocaleString("fr-FR")} KC</span>
            </div>
            <button
              type="button"
              onClick={() => void loadPlayerData(session)}
              disabled={dataLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]/40 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", dataLoading && "animate-spin")} />
              <span>Actualiser</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStartDemo}
                className="rounded-lg"
                leftIcon={<Sparkles className="h-3.5 w-3.5 shrink-0" />}
              >
                Explorer en Démo
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setLoginModalOpen(true)}
                className="rounded-lg bg-[#EB0029] hover:bg-[#D13639] text-white shadow-lg shadow-[#EB0029]/20"
                leftIcon={<RiotGamesLogo className="h-3.5 w-3.5 shrink-0" />}
              >
                Se connecter avec Riot
              </Button>
            </motion.div>
          </div>
        )}
      </div>

      {!session ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_SNAP }}
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 text-center sm:p-14"
        >
          <motion.div
            animate={{ opacity: [0.12, 0.22, 0.12], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute -top-24 h-64 w-64 rounded-full bg-[#EB0029]/15 blur-3xl"
          />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#EB0029]/25 bg-[#EB0029]/10 text-[#EB0029] shadow-lg shadow-[#EB0029]/15"
          >
            <RiotGamesLogo className="h-9 w-9" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Connectez votre compte Riot Games
          </h2>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
            Accédez à vos 4 skins quotidiens en direct, aux offres exclusives du Marché Nocturne,
            à l&apos;ensemble de vos armes débloquées, porte-bonheur et cartes de joueur avec visuels HD officiels.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setLoginModalOpen(true)}
                className="rounded-xl px-6 font-bold bg-[#EB0029] hover:bg-[#D13639] text-white shadow-xl shadow-[#EB0029]/25"
                leftIcon={<RiotGamesLogo className="h-4 w-4 shrink-0" />}
              >
                Connexion Officielle Riot Games
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleStartDemo}
                className="rounded-xl px-6 font-semibold"
                leftIcon={<Sparkles className="h-4 w-4 shrink-0" />}
              >
                Tester le Mode Démo
              </Button>
            </motion.div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-bg)]/80 px-3.5 py-2 text-xs text-[var(--text-secondary)] shadow-sm backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-sm bg-emerald-500/80 ring-2 ring-emerald-500/20" />
            <span className="font-medium">
              <strong className="font-semibold text-[var(--text-primary)]">Flux officiel RSO</strong> : compatible Google, Apple, Facebook et Riot ID. Jetons conservés uniquement dans votre navigateur.
            </span>
          </div>
        </motion.section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <AnimatedFilterTabs
              tabs={TABS}
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as typeof activeTab)}
            />
            {activeTab !== "store" && (
              <div className="w-full max-w-xs">
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom…"
                  aria-label="Rechercher"
                  clearable
                />
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "store" && (
              <motion.div
                key="tab-store"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: EASE_SNAP }}
                className="space-y-6"
              >
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-rose-400" />
                      <h2 className="text-base font-bold text-[var(--text-primary)]">
                        Boutique Quotidienne (4 skins du jour)
                      </h2>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Rotation dans : {formatCountdown(remainingTime)}</span>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {dailyOffers.map((item, index) => {
                      const tier = item.tierColor
                        ? {
                            name: item.tier || "Édition",
                            color: item.tierColor,
                            icon: item.tierIcon || "",
                          }
                        : getTierFromPriceOrName(item.price, item.name);

                      return (
                        <motion.article
                          key={`${item.uuid}-${index}`}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.32, delay: index * 0.05, ease: EASE_SNAP }}
                          whileHover={{ y: -4, transition: { duration: 0.18 } }}
                          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 transition-all hover:border-[var(--text-primary)]/20 hover:shadow-2xl hover:shadow-black/40"
                        >
                          <div className="flex items-center justify-between pb-2">
                            <div className="flex items-center gap-1.5">
                              {tier.icon ? (
                                <img
                                  src={tier.icon}
                                  alt={tier.name}
                                  className="h-4 w-4 object-contain filter drop-shadow-sm"
                                />
                              ) : null}
                              <span
                                className="rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                style={{
                                  color: tier.color,
                                  borderColor: `${tier.color}35`,
                                  backgroundColor: `${tier.color}12`,
                                }}
                              >
                                {tier.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                                {item.weaponType || "Arme"}
                              </span>
                              <ChevronRight
                                className="h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                                style={{ color: tier.color }}
                              />
                            </div>
                          </div>

                          <div className="relative flex h-36 sm:h-44 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[var(--text-primary)]/[0.03] to-black/35 p-3">
                            <div
                              className="pointer-events-none absolute inset-0 opacity-25 blur-xl transition-opacity duration-300 group-hover:opacity-45"
                              style={{
                                background: `radial-gradient(circle at center, ${tier.color}45 0%, transparent 70%)`,
                              }}
                            />
                            <img
                              src={item.image}
                              alt={item.name}
                              className="relative z-10 max-h-full max-w-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.85)] transition-transform duration-300 group-hover:scale-105 select-none pointer-events-none"
                              loading="lazy"
                            />
                          </div>

                          <div className="mt-3 flex flex-1 flex-col justify-between">
                            <div>
                              <h3 className="truncate text-sm font-bold text-[var(--text-primary)] transition-colors group-hover:text-white" title={item.name}>
                                {item.name}
                              </h3>
                              <p className="mt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                                {item.weaponType ? `Skin pour ${item.weaponType}` : "Édition Valorant"}
                              </p>
                            </div>
                            <div className="mt-3.5 flex items-center justify-between border-t border-[var(--text-primary)]/[0.08] pt-2.5">
                              <div className="flex items-center gap-1.5">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                                  <Coins className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-mono text-sm font-extrabold text-amber-300">
                                  {item.price.toLocaleString("fr-FR")} <span className="text-xs font-semibold text-amber-400/80">VP</span>
                                </span>
                              </div>
                              <span className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-bg)]/80 px-2.5 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
                                Offre du jour
                              </span>
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                </section>

                {nightMarket.length > 0 && (
                  <section className="space-y-4 rounded-3xl border border-indigo-500/25 bg-gradient-to-b from-indigo-950/20 to-transparent p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      <h2 className="text-base font-bold text-[var(--text-primary)]">
                        Marché Nocturne Actif
                      </h2>
                      <Badge variant="primary" size="sm">
                        Réductions Exclusives
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {nightMarket.map((item, idx) => {
                        const tier = item.tierColor
                          ? {
                              name: item.tier || "Édition",
                              color: item.tierColor,
                              icon: item.tierIcon || "",
                            }
                          : getTierFromPriceOrName(item.originalPrice, item.name);

                        return (
                          <motion.article
                            key={`${item.uuid}-${idx}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.04, ease: EASE_SNAP }}
                            whileHover={{ y: -3, transition: { duration: 0.18 } }}
                            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 transition-all hover:border-indigo-400/40 hover:shadow-xl hover:shadow-indigo-950/30"
                          >
                            <div className="flex items-center justify-between pb-1.5">
                              <div className="flex items-center gap-1">
                                {tier.icon && (
                                  <img
                                    src={tier.icon}
                                    alt={tier.name}
                                    className="h-3.5 w-3.5 object-contain"
                                  />
                                )}
                                <span
                                  className="text-[9px] font-bold uppercase tracking-wide"
                                  style={{ color: tier.color }}
                                >
                                  {tier.name}
                                </span>
                              </div>
                              <span className="rounded-md border border-emerald-500/35 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-black text-emerald-400">
                                -{item.discountPercent}%
                              </span>
                            </div>

                            <div className="relative flex h-28 sm:h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-white/[0.02] to-black/35 p-2">
                              <div
                                className="pointer-events-none absolute inset-0 opacity-25 blur-lg transition-opacity duration-300 group-hover:opacity-40"
                                style={{
                                  background: `radial-gradient(circle at center, ${tier.color}35 0%, transparent 70%)`,
                                }}
                              />
                              <img
                                src={item.image}
                                alt={item.name}
                                className="relative z-10 max-h-full max-w-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)] transition-transform duration-300 group-hover:scale-105 select-none pointer-events-none"
                                loading="lazy"
                              />
                            </div>

                            <div className="mt-2.5">
                              <p className="truncate text-xs font-bold text-[var(--text-primary)] transition-colors group-hover:text-white" title={item.name}>
                                {item.name}
                              </p>
                              <div className="mt-1 flex items-center justify-between border-t border-[var(--text-primary)]/[0.06] pt-1.5 text-xs">
                                <span className="font-mono font-bold text-emerald-400">
                                  {item.discountPrice.toLocaleString("fr-FR")} VP
                                </span>
                                <span className="font-mono text-[10px] text-[var(--text-muted)] line-through">
                                  {item.originalPrice.toLocaleString("fr-FR")}
                                </span>
                              </div>
                            </div>
                          </motion.article>
                        );
                      })}
                    </div>
                  </section>
                )}
              </motion.div>
            )}

            {activeTab === "skins" && (
              <motion.div
                key="tab-skins"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: EASE_SNAP }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {WEAPON_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                        categoryFilter === cat
                          ? "bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/20"
                          : "border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {filteredSkins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 text-center">
                    <SearchX className="h-8 w-8 text-[var(--text-muted)]" />
                    <p className="mt-2 text-sm text-[var(--text-muted)]">Aucun skin ne correspond aux critères.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {filteredSkins.map((skin, idx) => {
                      const tier = skin.tierColor
                        ? {
                            name: skin.tier || "Édition",
                            color: skin.tierColor,
                            icon: skin.tierIcon || "",
                          }
                        : getTierFromPriceOrName(0, skin.displayName);

                      return (
                        <motion.article
                          key={skin.uuid}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.28, delay: Math.min(idx * 0.03, 0.3), ease: EASE_SNAP }}
                          whileHover={{ y: -3, transition: { duration: 0.18 } }}
                          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3.5 transition-all hover:border-[var(--accent-primary)]/40 hover:shadow-xl hover:shadow-black/40"
                        >
                          <div className="flex items-center justify-between pb-2">
                            <div className="flex items-center gap-1.5">
                              {tier.icon && (
                                <img
                                  src={tier.icon}
                                  alt={tier.name}
                                  className="h-3.5 w-3.5 object-contain"
                                />
                              )}
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: tier.color }}
                              >
                                {skin.tier || tier.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                              {skin.category || "Arme"}
                            </span>
                          </div>

                          <div className="relative flex h-32 sm:h-36 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[var(--text-primary)]/[0.03] to-black/35 p-2.5">
                            <div
                              className="pointer-events-none absolute inset-0 opacity-25 blur-lg transition-opacity duration-300 group-hover:opacity-45"
                              style={{
                                background: `radial-gradient(circle at center, ${tier.color}40 0%, transparent 70%)`,
                              }}
                            />
                            {skin.displayIcon ? (
                              <img
                                src={skin.displayIcon}
                                alt={skin.displayName}
                                className="relative z-10 max-h-full max-w-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)] transition-transform duration-300 group-hover:scale-105 select-none pointer-events-none"
                                loading="lazy"
                              />
                            ) : (
                              <Sparkles className="h-6 w-6 text-[var(--text-muted)]" />
                            )}
                          </div>

                          <div className="mt-2.5">
                            <p className="truncate text-xs font-bold text-[var(--text-primary)] transition-colors group-hover:text-white" title={skin.displayName}>
                              {skin.displayName}
                            </p>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                              <span className="text-[10px]">Débloqué</span>
                              <span className="font-mono text-[10px] font-bold text-emerald-400">Possédé</span>
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "buddies" && (
              <motion.div
                key="tab-buddies"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: EASE_SNAP }}
              >
                {filteredBuddies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 text-center">
                    <SearchX className="h-8 w-8 text-[var(--text-muted)]" />
                    <p className="mt-2 text-sm text-[var(--text-muted)]">Aucun porte-bonheur trouvé.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {filteredBuddies.map((buddy, idx) => (
                      <motion.div
                        key={buddy.uuid}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.25), ease: EASE_SNAP }}
                        whileHover={{ y: -3, transition: { duration: 0.18 } }}
                        className="group flex flex-col items-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-center transition hover:border-[var(--accent-primary)]/40 hover:shadow-md"
                      >
                        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-black/20 p-3">
                          <ClientImage
                            candidates={[buddy.displayIcon]}
                            alt={buddy.displayName}
                            className="max-h-full max-w-full object-contain transition group-hover:scale-110"
                            fallback={<Sparkles className="h-6 w-6 text-[var(--text-muted)]" />}
                          />
                        </div>
                        <p className="mt-2 line-clamp-2 text-[11px] font-semibold text-[var(--text-primary)]">
                          {buddy.displayName}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "cards" && (
              <motion.div
                key="tab-cards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: EASE_SNAP }}
              >
                {filteredCards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 text-center">
                    <SearchX className="h-8 w-8 text-[var(--text-muted)]" />
                    <p className="mt-2 text-sm text-[var(--text-muted)]">Aucune carte trouvée.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {filteredCards.map((card, idx) => (
                      <motion.div
                        key={card.uuid}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.25), ease: EASE_SNAP }}
                        whileHover={{ y: -3, transition: { duration: 0.18 } }}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] transition hover:border-[var(--accent-primary)]/40 hover:shadow-xl"
                      >
                        <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/30">
                          <ClientImage
                            candidates={[card.largeArt, card.wideArt]}
                            alt={card.displayName}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                            fallback={<Sparkles className="h-6 w-6 text-[var(--text-muted)]" />}
                          />
                        </div>
                        <p className="truncate p-2 text-center text-xs font-semibold text-[var(--text-primary)]">
                          {card.displayName}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {loginModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (text) {
              const tokens = extractTokensFromInput(text);
              if (tokens) {
                e.preventDefault();
                setRedirectUrlInput(text);
                setDetectedTokens(tokens);
                void executeTokenSync(tokens);
              }
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: EASE_SNAP }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--text-primary)]/[0.08] p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <RiotGamesLogo className="h-5 w-5 text-[#EB0029]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Connexion Officielle Riot Games
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLoginModalOpen(false);
                  setAuthWaiting(false);
                  setLoginError(null);
                }}
                className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loginLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-center sm:p-10">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EB0029]/15 text-[#EB0029] shadow-lg shadow-[#EB0029]/20"
                >
                  <RiotGamesLogo className="h-9 w-9" />
                </motion.div>
                <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
                  Synchronisation avec Riot Games…
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Validation du jeton et chargement de votre inventaire Valorant.
                </p>
                <div className="mt-5 flex items-center gap-2 text-xs text-[var(--accent-primary)]">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Connexion en cours</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-5 sm:p-6">
                {loginError && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    {loginError}
                  </div>
                )}

                <div className="space-y-2.5">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleOpenRiotOAuth}
                    className="w-full rounded-2xl py-3.5 font-bold bg-[#EB0029] hover:bg-[#D13639] text-white shadow-xl shadow-[#EB0029]/25 flex items-center justify-center gap-2"
                    leftIcon={<RiotGamesLogo className="h-4 w-4 shrink-0" />}
                    rightIcon={<ExternalLink className="h-4 w-4 shrink-0" />}
                  >
                    {authWaiting ? "Rouvrir la fenêtre Riot Games" : "Se connecter via Riot Games"}
                  </Button>

                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5 text-[11px] text-[var(--text-muted)]">
                    <span>Compatible :</span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-bg)] px-1.5 py-0.5 font-medium text-[var(--text-primary)]">
                      <GoogleIcon className="h-3 w-3" /> Google
                    </span>
                    <span className="rounded-md bg-[var(--surface-bg)] px-1.5 py-0.5 font-medium text-[var(--text-primary)]">
                      Apple
                    </span>
                    <span className="rounded-md bg-[var(--surface-bg)] px-1.5 py-0.5 font-medium text-[var(--text-primary)]">
                      Facebook
                    </span>
                    <span className="rounded-md bg-[var(--surface-bg)] px-1.5 py-0.5 font-medium text-[var(--text-primary)]">
                      Riot ID
                    </span>
                    <span className="rounded-md bg-[var(--surface-bg)] px-1.5 py-0.5 font-medium text-[var(--text-primary)]">
                      2FA
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-b from-indigo-500/10 to-indigo-950/20 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Détection automatique active
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handlePasteAndSync}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline"
                    >
                      <ClipboardPaste className="h-3 w-3" />
                      <span>Coller & synchroniser</span>
                    </button>
                  </div>

                  <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                    Connectez-vous sur Riot Games. Une fois connecté, la fenêtre affiche une page playvalorant.com (la mention « 404 » est tout à fait normale, votre jeton sécurisé se trouve dans la barre d&apos;adresse). Copiez simplement l&apos;URL complète et revenez ici : la détection se déclenche automatiquement.
                  </p>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePasteAndSync}
                    className="w-full rounded-xl py-2 text-xs font-semibold"
                    leftIcon={<ClipboardPaste className="h-3.5 w-3.5 text-emerald-400" />}
                  >
                    Détecter automatiquement depuis le presse-papier
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[var(--text-muted)]">
                      URL de redirection ou jeton d&apos;accès
                    </label>
                    <span className="text-[10px] text-[var(--text-muted)]">Collez (Ctrl+V) pour détection directe</span>
                  </div>
                  <Input
                    type="text"
                    value={redirectUrlInput}
                    onChange={(e) => handleRedirectUrlChange(e.target.value)}
                    placeholder="https://playvalorant.com/opt_in#access_token=... ou jeton"
                  />
                </div>

                {detectedTokens ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-400">
                    <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="font-medium">Jeton Riot Games valide détecté ! Synchronisation…</span>
                  </div>
                ) : null}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
                    Serveur / Région de jeu
                  </label>
                  <select
                    value={shardInput}
                    onChange={(e) => setShardInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface,var(--panel-bg))] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  >
                    {SHARDS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-bg)]/80 p-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  <ShieldCheck className="mb-0.5 inline h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                  Sécurité garantie : vos identifiants restent sur Riot Games. Seul le jeton de lecture temporaire est utilisé localement.
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 rounded-xl"
                    onClick={handleStartDemo}
                  >
                    Mode Démo
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!detectedTokens && !redirectUrlInput.trim()}
                    onClick={() => {
                      const tokens = detectedTokens || extractTokensFromInput(redirectUrlInput);
                      if (tokens) void executeTokenSync(tokens);
                    }}
                    className="flex-1 rounded-xl font-bold bg-[#EB0029] hover:bg-[#D13639] text-white shadow-lg shadow-[#EB0029]/20 disabled:opacity-50"
                  >
                    Synchroniser
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
