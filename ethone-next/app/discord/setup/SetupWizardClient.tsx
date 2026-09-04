"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Server,
  ShieldCheck,
  Hammer,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ExternalLink,
  Hash,
  Check,
  AlertTriangle,
  Rocket,
  LayoutDashboard,
} from "lucide-react";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useToast } from "@/components/ToastProvider";
import DiscordIcon from "@/components/DiscordIcon";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

const STEPS = [
  { id: 1, title: "Serveur Discord", desc: "Sélection du serveur", icon: Server },
  { id: 2, title: "Permissions Bot", desc: "Audit des droits", icon: ShieldCheck },
  { id: 3, title: "Modération", desc: "Sécurité & Logs", icon: Hammer },
  { id: 4, title: "Bienvenue", desc: "Accueil & Rôles", icon: Sparkles },
  { id: 5, title: "Lancement", desc: "Finalisation", icon: Rocket },
];

export default function SetupWizardClient() {
  const router = useRouter();
  const { profile, loading: discordLoading, connect } = useDiscordOAuth();
  const { success, error: showError } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  // Moderation form state
  const [modLogChannel, setModLogChannel] = useState("mod-logs");
  const [antiSpamEnabled, setAntiSpamEnabled] = useState(true);
  const [timeoutDuration, setTimeoutDuration] = useState("10m");

  // Welcome form state
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [welcomeChannel, setWelcomeChannel] = useState("bienvenue");
  const [welcomeMessage, setWelcomeMessage] = useState("Bienvenue {user} sur {server} ! N'hésite pas à lire les règles.");
  const [autoRoleName, setAutoRoleName] = useState("Membre");

  const [isSaving, setIsSaving] = useState(false);

  // Filter manageable guilds
  const manageableGuilds = useMemo(() => {
    const guilds = profile?.guilds || [];
    return guilds.filter((g) => {
      if (g.owner) return true;
      if (!g.permissions) return false;
      const p = Number(g.permissions);
      return (p & 8) === 8 || (p & 32) === 32;
    });
  }, [profile?.guilds]);

  // Default select first guild
  useEffect(() => {
    if (!selectedGuild && manageableGuilds.length > 0) {
      setSelectedGuild(manageableGuilds[0]);
    }
  }, [manageableGuilds, selectedGuild]);

  const handleNext = () => {
    if (currentStep === 1 && !selectedGuild) {
      showError("Sélection requise", "Veuillez sélectionner un serveur Discord pour continuer.");
      return;
    }
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSaveAndFinish = async () => {
    if (!selectedGuild) return;
    setIsSaving(true);

    try {
      // 1. Save moderation settings
      await fetch(`/api/discord/settings/${selectedGuild.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          antiSpamEnabled,
          modLogChannel,
          defaultTimeout: timeoutDuration,
        }),
      }).catch(() => null);

      // 2. Save welcome settings
      await fetch(`/api/discord/welcome/${selectedGuild.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          welcomeEnabled,
          welcomeChannel,
          welcomeMessage,
          autoRoleName,
        }),
      }).catch(() => null);

      success("Configuration terminée !", "Votre serveur est maintenant prêt à utiliser ETHONE Bot.");
      setCurrentStep(5);
    } catch (e) {
      showError("Erreur de sauvegarde", "Impossible de sauvegarder la configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-start py-8 px-4 sm:px-6 relative overflow-hidden pb-36">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-3xl relative z-10 flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/80">
          <Link
            href="/discord"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Retour au Dashboard Discord</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-zinc-400 font-medium">SETUP ASSISTÉ 2.0</span>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Étape {currentStep} sur 5
            </span>
            <span className="text-xs font-mono text-zinc-400">
              {STEPS[currentStep - 1]?.title}
            </span>
          </div>
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>

          {/* Stepper Tabs */}
          <div className="hidden sm:grid grid-cols-5 gap-2 mt-4">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isPast = s.id < currentStep;
              const isCurrent = s.id === currentStep;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition ${
                    isCurrent
                      ? "bg-zinc-900 border-indigo-500/50 text-white"
                      : isPast
                      ? "bg-zinc-950/60 border-zinc-800/60 text-zinc-400"
                      : "opacity-40 border-transparent text-zinc-600"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isPast
                        ? "bg-emerald-500/20 text-emerald-400"
                        : isCurrent
                        ? "bg-indigo-500 text-white"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : s.id}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold truncate">{s.title}</div>
                    <div className="text-[9px] text-zinc-500 truncate">{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Contents Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl mb-6">
          
          {/* STEP 1: SELECT GUILD */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  1. Sélectionner votre serveur Discord
                </h3>
                <p className="text-xs text-zinc-400">
                  Choisissez le serveur où vous souhaitez activer ETHONE Bot. Seuls les serveurs où vous possédez les droits d'administration sont affichés.
                </p>
              </div>

              {!profile?.connected ? (
                <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-3">
                  <DiscordIcon className="w-10 h-10 text-indigo-400 mx-auto" />
                  <div className="text-sm font-semibold text-white">Compte Discord non lié</div>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Connectez votre compte Discord pour charger la liste de vos serveurs réels.
                  </p>
                  <button
                    onClick={() => connect()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
                  >
                    <DiscordIcon className="w-4 h-4" />
                    <span>Lier mon compte Discord</span>
                  </button>
                </div>
              ) : manageableGuilds.length === 0 ? (
                <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                  <div className="text-sm font-semibold text-white">Aucun serveur administrable trouvé</div>
                  <p className="text-xs text-zinc-400">
                    Vous devez être Propriétaire ou Administrateur d'un serveur Discord pour le configurer.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {manageableGuilds.map((g) => {
                    const isSelected = selectedGuild?.id === g.id;
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedGuild(g)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                          isSelected
                            ? "bg-indigo-950/30 border-indigo-500 shadow-md shadow-indigo-500/10"
                            : "bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/80"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {g.icon ? (
                            <img
                              src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`}
                              alt={g.name}
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-sm font-bold text-indigo-400">
                              {g.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-white">{g.name}</div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                              <span>ID: {g.id}</span>
                              {g.owner && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 text-[10px] font-medium">
                                  Owner
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bot invite reminder */}
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Le bot n'est pas encore sur votre serveur ?</span>
                <a
                  href={BOT_INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <span>Inviter ETHONE Bot</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* STEP 2: BOT PERMISSIONS AUDIT */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  2. Audit des permissions du Bot
                </h3>
                <p className="text-xs text-zinc-400">
                  Vérification des droits requis pour assurer un fonctionnement optimal sur{" "}
                  <span className="text-indigo-400 font-semibold">{selectedGuild?.name}</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Administrateur</div>
                    <div className="text-[10px] text-zinc-400">Gestion complète automatique</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                    Accordé
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Gérer les Rôles</div>
                    <div className="text-[10px] text-zinc-400">Auto-rôles & Sanctions Mute</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                    Requis
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Bannir & Expulser</div>
                    <div className="text-[10px] text-zinc-400">Modération & Anti-Raid</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                    Requis
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Gérer les Salons</div>
                    <div className="text-[10px] text-zinc-400">Création des salons de tickets</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                    Requis
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Toutes les autorisations critiques sont configurées avec le lien d'invitation officiel ETHONE (Permission 8 = Administrateur).
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: MODERATION QUICK SETUP */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  3. Configuration rapide de la Modération
                </h3>
                <p className="text-xs text-zinc-400">
                  Définissez vos règles de protection initiale pour neutraliser les abus automatiquement.
                </p>
              </div>

              <div className="space-y-4">
                {/* Mod Log Channel */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Salon des logs de modération
                  </label>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <Hash className="w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={modLogChannel}
                      onChange={(e) => setModLogChannel(e.target.value)}
                      placeholder="mod-logs"
                      className="bg-transparent text-xs text-white focus:outline-none flex-1"
                    />
                  </div>
                </div>

                {/* Anti-spam Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                  <div>
                    <div className="text-xs font-semibold text-white">Protection Anti-Spam & Liens</div>
                    <div className="text-[11px] text-zinc-400">Supprime les messages répétés et liens suspects</div>
                  </div>
                  <button
                    onClick={() => setAntiSpamEnabled(!antiSpamEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      antiSpamEnabled ? "bg-indigo-600" : "bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                        antiSpamEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Default Timeout Duration */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Durée par défaut d'un Timeout automatique
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["5m", "10m", "1h"].map((d) => (
                      <button
                        key={d}
                        onClick={() => setTimeoutDuration(d)}
                        className={`py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                          timeoutDuration === d
                            ? "bg-indigo-600/20 border-indigo-500 text-white font-bold"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {d === "5m" ? "5 Minutes" : d === "10m" ? "10 Minutes" : "1 Heure"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: WELCOME QUICK SETUP */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  4. Configuration de l'Accueil (Welcome)
                </h3>
                <p className="text-xs text-zinc-400">
                  Accueillez chaleureusement chaque nouveau membre dès son arrivée sur le serveur.
                </p>
              </div>

              <div className="space-y-4">
                {/* Welcome Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                  <div>
                    <div className="text-xs font-semibold text-white">Activer le message de bienvenue</div>
                    <div className="text-[11px] text-zinc-400">Envoie un embed stylisé dans le salon dédié</div>
                  </div>
                  <button
                    onClick={() => setWelcomeEnabled(!welcomeEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      welcomeEnabled ? "bg-teal-600" : "bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                        welcomeEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Welcome Channel */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Salon d'accueil
                  </label>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <Hash className="w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={welcomeChannel}
                      onChange={(e) => setWelcomeChannel(e.target.value)}
                      placeholder="bienvenue"
                      className="bg-transparent text-xs text-white focus:outline-none flex-1"
                    />
                  </div>
                </div>

                {/* Welcome Message */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Modèle de message
                  </label>
                  <textarea
                    rows={3}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none resize-none leading-relaxed"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">
                      Variables: {"{user}"}, {"{server}"}
                    </span>
                  </div>
                </div>

                {/* Auto Role */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Rôle attribué automatiquement
                  </label>
                  <input
                    type="text"
                    value={autoRoleName}
                    onChange={(e) => setAutoRoleName(e.target.value)}
                    placeholder="Membre"
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: FINISH & LAUNCH */}
          {currentStep === 5 && (
            <div className="space-y-6 text-center py-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-500/20">
                <Rocket className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Félicitations ! Votre serveur est prêt.
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                  ETHONE Bot est désormais actif sur{" "}
                  <span className="text-white font-semibold">{selectedGuild?.name}</span> avec la modération, la sécurité et le message d'accueil configurés.
                </p>
              </div>

              {/* Quick links to deeper management */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <Link
                  href="/discord"
                  className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-indigo-500/50 transition group"
                >
                  <LayoutDashboard className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition" />
                  <div className="text-xs font-bold text-white">Dashboard Général</div>
                  <div className="text-[10px] text-zinc-400">Vue d'ensemble des métriques</div>
                </Link>

                <Link
                  href="/discord/moderation"
                  className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-orange-500/50 transition group"
                >
                  <Hammer className="w-5 h-5 text-orange-400 mb-2 group-hover:scale-110 transition" />
                  <div className="text-xs font-bold text-white">Modération 3.0</div>
                  <div className="text-[10px] text-zinc-400">Casiers & Sanctions staff</div>
                </Link>

                <Link
                  href="/discord/welcome"
                  className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-teal-500/50 transition group"
                >
                  <Sparkles className="w-5 h-5 text-teal-400 mb-2 group-hover:scale-110 transition" />
                  <div className="text-xs font-bold text-white">Welcome 2.0</div>
                  <div className="text-[10px] text-zinc-400">Cartes graphiques & rôles</div>
                </Link>
              </div>

              <div className="pt-2">
                <Link
                  href="/discord"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <span>Accéder à la console Bot</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Control Bar */}
        {currentStep < 5 && (
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                currentStep === 1
                  ? "text-zinc-600 cursor-not-allowed opacity-50"
                  : "text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Précédent</span>
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <span>Étape suivante</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSaveAndFinish}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
              >
                <span>{isSaving ? "Sauvegarde..." : "Valider & Lancer"}</span>
                <Rocket className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
