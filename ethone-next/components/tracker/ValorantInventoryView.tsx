"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWorker } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Clock,
  Coins,
  CreditCard,
  Flame,
  Key,
  Lock,
  LogOut,
  RefreshCw,
  SearchX,
  Shield,
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
};

type NightMarketItem = {
  uuid: string;
  name: string;
  image: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
};

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
    uuid: "97af88da-4768-9e08-e4e3-738d3526f15d",
    name: "Kuronami (Vandal)",
    image: "https://media.valorant-api.com/weaponskinlevels/97af88da-4768-9e08-e4e3-738d3526f15d/displayicon.png",
    price: 2375,
    weaponType: "Vandal",
  },
  {
    uuid: "ec17ea15-46f9-0114-1925-fbbf62e316ab",
    name: "Reaver (Karambit)",
    image: "https://media.valorant-api.com/weaponskinlevels/ec17ea15-46f9-0114-1925-fbbf62e316ab/displayicon.png",
    price: 4350,
    weaponType: "Mêlée",
  },
  {
    uuid: "3f80c655-46eb-5d59-3fb6-7da85b307da8",
    name: "Prime (Phantom)",
    image: "https://media.valorant-api.com/weaponskinlevels/3f80c655-46eb-5d59-3fb6-7da85b307da8/displayicon.png",
    price: 1775,
    weaponType: "Phantom",
  },
  {
    uuid: "b21844b2-4d15-d912-8877-66a93bfdf85c",
    name: "Ion (Sheriff)",
    image: "https://media.valorant-api.com/weaponskinlevels/b21844b2-4d15-d912-8877-66a93bfdf85c/displayicon.png",
    price: 1775,
    weaponType: "Sheriff",
  },
];

const DEMO_BUDDIES: BuddyItem[] = [
  {
    uuid: "b1",
    displayName: "Porte-bonheur Force opérationnelle 809",
    displayIcon: "https://media.valorant-api.com/buddies/f2f07eae-4518-15eb-546b-018961e0dd60/displayicon.png",
  },
  {
    uuid: "b2",
    displayName: "Porte-bonheur Danse du lion",
    displayIcon: "https://media.valorant-api.com/buddies/50901e16-419b-c408-dae1-dcb0d908ff1e/displayicon.png",
  },
  {
    uuid: "b3",
    displayName: "Porte-bonheur Trophée VCT Champions",
    displayIcon: "https://media.valorant-api.com/buddies/e9c1db44-4860-e4ca-19cb-e18e8df6ff85/displayicon.png",
  },
];

const DEMO_CARDS: CardItem[] = [
  {
    uuid: "c1",
    displayName: "Carte Duo fluo",
    largeArt: "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png",
  },
  {
    uuid: "c2",
    displayName: "Carte Champions 2024",
    largeArt: "https://media.valorant-api.com/playercards/3f296c07-64c3-494c-923b-fe692a4fa1bd/largeart.png",
  },
];

export default function ValorantInventoryView() {
  const [session, setSession] = useState<ValorantSession | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"store" | "skins" | "buddies" | "cards">("store");

  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [shardInput, setShardInput] = useState("eu");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaCookies, setMfaCookies] = useState("");
  const [mfaEmail, setMfaEmail] = useState("");

  const [wallet, setWallet] = useState({ vp: 3250, radianite: 180, kingdomCredits: 8500 });
  const [dailyOffers, setDailyOffers] = useState<DailyOfferItem[]>(DEMO_DAILY_OFFERS);
  const [nightMarket] = useState<NightMarketItem[]>([]);
  const [ownedSkins, setOwnedSkins] = useState<SkinItem[]>([]);
  const [ownedBuddies, setOwnedBuddies] = useState<BuddyItem[]>([]);
  const [ownedCards, setOwnedCards] = useState<CardItem[]>([]);
  const [remainingTime, setRemainingTime] = useState(43200);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tous");
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("ethone:valorant:session");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.accessToken) {
          setSession(parsed);
        }
      }
    } catch {}
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
      const [skinsApiRes, _buddiesApiRes, _cardsApiRes] = await Promise.all([
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
            return {
              uuid,
              name: hit?.name || "Skin Valorant",
              image: hit?.icon || "",
              price: 1775,
            };
          });
          setDailyOffers(mappedOffers);
        }
      }

      if (inventoryRes.status === "fulfilled" && inventoryRes.value?.data) {
        const invData = inventoryRes.value.data;
        if (invData.wallet) setWallet(invData.wallet);
      }
    } catch {
    } finally {
      setDataLoading(false);
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetchWorker("/api/stats/valorant-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: usernameInput,
          password: passwordInput,
        }),
      });

      const data = res?.data;
      if (data?.status === "mfa_required") {
        setMfaCookies(data.cookies || "");
        setMfaEmail(data.email || "");
        setMfaOpen(true);
        setLoginLoading(false);
        return;
      }

      if (data?.accessToken && data?.puuid) {
        const newSession: ValorantSession = {
          accessToken: data.accessToken,
          idToken: data.idToken,
          entitlementsToken: data.entitlementsToken,
          puuid: data.puuid,
          shard: shardInput,
          username: usernameInput,
          country: data.userInfo?.country,
        };
        setSession(newSession);
        setIsDemo(false);
        sessionStorage.setItem("ethone:valorant:session", JSON.stringify(newSession));
        setLoginModalOpen(false);
        void loadPlayerData(newSession);
      } else {
        setLoginError("Échec de connexion. Vérifiez vos identifiants Riot Games.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion au service d'authentification Riot.";
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetchWorker("/api/stats/valorant-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mfa",
          mfaCode: mfaCode.trim(),
          cookies: mfaCookies,
        }),
      });

      const data = res?.data;
      if (data?.accessToken && data?.puuid) {
        const newSession: ValorantSession = {
          accessToken: data.accessToken,
          idToken: data.idToken,
          entitlementsToken: data.entitlementsToken,
          puuid: data.puuid,
          shard: shardInput,
          username: usernameInput,
          country: data.userInfo?.country,
        };
        setSession(newSession);
        setIsDemo(false);
        sessionStorage.setItem("ethone:valorant:session", JSON.stringify(newSession));
        setMfaOpen(false);
        setLoginModalOpen(false);
        void loadPlayerData(newSession);
      } else {
        setLoginError("Code de sécurité invalide.");
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Code de vérification incorrect.");
    } finally {
      setLoginLoading(false);
    }
  };

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
    setOwnedBuddies(DEMO_BUDDIES);
    setOwnedCards(DEMO_CARDS);
    setOwnedSkins([
      {
        uuid: "s1",
        displayName: "Kuronami (Vandal)",
        displayIcon: "https://media.valorant-api.com/weaponskinlevels/97af88da-4768-9e08-e4e3-738d3526f15d/displayicon.png",
        category: "Vandal",
        tier: "Exclusive",
      },
      {
        uuid: "s2",
        displayName: "Prime (Phantom)",
        displayIcon: "https://media.valorant-api.com/weaponskinlevels/3f80c655-46eb-5d59-3fb6-7da85b307da8/displayicon.png",
        category: "Phantom",
        tier: "Premium",
      },
      {
        uuid: "s3",
        displayName: "Reaver (Karambit)",
        displayIcon: "https://media.valorant-api.com/weaponskinlevels/ec17ea15-46f9-0114-1925-fbbf62e316ab/displayicon.png",
        category: "Mêlée (Couteaux)",
        tier: "Premium",
      },
      {
        uuid: "s4",
        displayName: "Ion (Sheriff)",
        displayIcon: "https://media.valorant-api.com/weaponskinlevels/b21844b2-4d15-d912-8877-66a93bfdf85c/displayicon.png",
        category: "Sheriff",
        tier: "Premium",
      },
      {
        uuid: "s5",
        displayName: "Sovereign (Ghost)",
        displayIcon: "https://media.valorant-api.com/weaponskinlevels/8404a3ad-4e3f-dc90-1cfa-65b161f38e68/displayicon.png",
        category: "Ghost",
        tier: "Premium",
      },
      {
        uuid: "s6",
        displayName: "Araxys (Operator)",
        displayIcon: "https://media.valorant-api.com/weaponskinlevels/0c7c8c6f-45b6-5471-a0c5-5582377ebba9/displayicon.png",
        category: "Operator",
        tier: "Exclusive",
      },
    ]);
    setLoginModalOpen(false);
  };

  const handleLogout = () => {
    setSession(null);
    setIsDemo(false);
    sessionStorage.removeItem("ethone:valorant:session");
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
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto p-1 pr-2">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--text-primary)]/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/25">
            <Flame className="h-6 w-6" />
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
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStartDemo}
              className="rounded-xl"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Explorer en Démo
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setLoginModalOpen(true)}
              className="rounded-xl shadow-lg shadow-rose-500/20"
            >
              <Lock className="h-3.5 w-3.5" />
              Se connecter avec Riot
            </Button>
          </div>
        )}
      </div>

      {!session ? (
        <section className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute -top-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-xl">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Connectez votre compte Riot Games
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
            Accédez à vos 4 skins quotidiens en direct, aux offres exclusives du Marché Nocturne,
            à l&apos;ensemble de vos armes débloquées, porte-bonheur et cartes de joueur avec visuels HD officiels.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setLoginModalOpen(true)}
              className="rounded-2xl px-6 font-bold shadow-xl shadow-rose-500/25"
            >
              <Key className="h-4 w-4" />
              Connexion Riot Games
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleStartDemo}
              className="rounded-2xl px-6 font-semibold"
            >
              <Sparkles className="h-4 w-4" />
              Tester le Mode Démo
            </Button>
          </div>

          <div className="mt-8 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300">
            <Shield className="h-3.5 w-3.5" />
            <span>Sécurisé : aucun mot de passe n&apos;est stocké sur nos serveurs. Jetons conservés localement.</span>
          </div>
        </section>
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
                  icon="search"
                  clearable
                  inputSize="compact"
                />
              </div>
            )}
          </div>

          {activeTab === "store" && (
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-rose-400" />
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                      Boutique Quotidienne (4 skins du jour)
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Rotation dans : {formatCountdown(remainingTime)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {dailyOffers.map((item, index) => (
                    <article
                      key={`${item.uuid}-${index}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-rose-500/40 hover:shadow-2xl hover:shadow-rose-500/10"
                    >
                      <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[var(--text-primary)]/[0.04] to-black/20 p-3">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <Sparkles className="h-8 w-8 text-[var(--text-muted)]" />
                        )}
                      </div>
                      <div className="mt-3 flex flex-1 flex-col justify-between">
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{item.name}</p>
                          <p className="text-[11px] font-medium text-[var(--text-muted)]">
                            {item.weaponType || "Skin arme"}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-[var(--text-primary)]/[0.06] pt-2.5">
                          <span className="flex items-center gap-1 font-mono text-sm font-bold text-amber-300">
                            <Coins className="h-3.5 w-3.5 text-amber-400" />
                            {item.price.toLocaleString("fr-FR")} VP
                          </span>
                          <span className="rounded-lg bg-[var(--text-primary)]/[0.06] px-2 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                            Offre du jour
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
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
                    {nightMarket.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-3 text-center"
                      >
                        <p className="text-xs font-bold text-[var(--text-primary)]">{item.name}</p>
                        <Badge variant="success" size="sm" className="mt-2">
                          -{item.discountPercent}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === "skins" && (
            <div className="space-y-4">
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
                  {filteredSkins.map((skin) => (
                    <div
                      key={skin.uuid}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3.5 transition hover:border-[var(--accent-primary)]/30 hover:shadow-lg"
                    >
                      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl bg-black/25 p-2.5">
                        {skin.displayIcon && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={skin.displayIcon}
                            alt=""
                            className="max-h-full max-w-full object-contain transition group-hover:scale-105"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="mt-3">
                        <p className="truncate text-xs font-bold text-[var(--text-primary)]" title={skin.displayName}>
                          {skin.displayName}
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[10px] text-[var(--text-muted)]">{skin.category}</span>
                          {skin.tier && (
                            <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">
                              {skin.tier}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "buddies" && (
            <div>
              {filteredBuddies.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 text-center">
                  <SearchX className="h-8 w-8 text-[var(--text-muted)]" />
                  <p className="mt-2 text-sm text-[var(--text-muted)]">Aucun porte-bonheur trouvé.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {filteredBuddies.map((buddy) => (
                    <div
                      key={buddy.uuid}
                      className="group flex flex-col items-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-center transition hover:border-[var(--accent-primary)]/40 hover:shadow-md"
                    >
                      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-black/20 p-3">
                        {buddy.displayIcon && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={buddy.displayIcon}
                            alt=""
                            className="max-h-full max-w-full object-contain transition group-hover:scale-110"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-[11px] font-semibold text-[var(--text-primary)]">
                        {buddy.displayName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "cards" && (
            <div>
              {filteredCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 text-center">
                  <SearchX className="h-8 w-8 text-[var(--text-muted)]" />
                  <p className="mt-2 text-sm text-[var(--text-muted)]">Aucune carte trouvée.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {filteredCards.map((card) => (
                    <div
                      key={card.uuid}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] transition hover:border-[var(--accent-primary)]/40 hover:shadow-xl"
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/30">
                        {card.largeArt && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={card.largeArt}
                            alt=""
                            className="h-full w-full object-cover transition group-hover:scale-105"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <p className="truncate p-2 text-center text-xs font-semibold text-[var(--text-primary)]">
                        {card.displayName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {loginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--text-primary)]/[0.08] p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-rose-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Connexion Riot Games
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!mfaOpen ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4 p-5 sm:p-6">
                {loginError && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    {loginError}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
                    Nom d&apos;utilisateur Riot
                  </label>
                  <Input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Votre identifiant de connexion"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
                    Mot de passe Riot
                  </label>
                  <Input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
                    Serveur / Région
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

                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200/90">
                  <Shield className="mb-1 inline h-3.5 w-3.5 mr-1" />
                  Vos données de session sont éphémères et conservées uniquement dans votre navigateur.
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 rounded-xl"
                    onClick={handleStartDemo}
                  >
                    Mode Démo
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loginLoading}
                    className="flex-1 rounded-xl font-bold"
                  >
                    {loginLoading ? "Connexion…" : "Se connecter"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleMfaSubmit} className="space-y-4 p-5 sm:p-6">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200">
                  Un code de sécurité à 6 chiffres a été envoyé par e-mail à {mfaEmail || "votre adresse"}.
                </div>

                {loginError && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    {loginError}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
                    Code de vérification (2FA)
                  </label>
                  <Input
                    type="text"
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="123456"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 rounded-xl"
                    onClick={() => setMfaOpen(false)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loginLoading}
                    className="flex-1 rounded-xl font-bold"
                  >
                    {loginLoading ? "Vérification…" : "Valider le code"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
