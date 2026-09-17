"use client";

import { useI18n } from "@/lib/hooks/useI18n";

export default function PrivacyContent() {
  const i18n = useI18n();

  return (
    <div className="h-full w-full overflow-y-auto bg-black text-zinc-200">
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          {i18n("legalBackLink", "← Retour à ETHONE")}
        </a>

        <h1 className="mt-6 text-3xl font-bold text-white">{i18n("privacyPageTitle", "Politique de confidentialité")}</h1>
        <p className="mt-2 text-sm text-zinc-500">{i18n("legalUpdatedLine", "Dernière mise à jour : 8 septembre 2026")}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-zinc-300">
          <section>
            <p>
              {i18n("privacyIntroPart1", "Cette politique explique quelles données sont collectées lors de l'utilisation du site")}{" "}
              <strong className="text-white">ethone.dev</strong>{" "}
              {i18n("privacyIntroPart2", "et du bot Discord")}{" "}
              <strong className="text-white">ETHONE Bot</strong>{" "}
              {i18n("privacyIntroPart3", "(ensemble, le « Service »), pourquoi, et comment elles sont traitées. ETHONE est un projet personnel indépendant ; nous ne vendons aucune donnée et ne l'utilisons pas à des fins publicitaires.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("privacyS1Title", "1. Données collectées")}</h2>
            <p className="mt-2">{i18n("privacyS1Intro", "Selon les fonctionnalités que vous utilisez, nous pouvons traiter :")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong className="text-white">{i18n("privacyS1Item1Label", "Compte Discord")}</strong>
                {i18n("privacyS1Item1Body", " : identifiant Discord, nom d'utilisateur, avatar, et liste des serveurs où vous avez les permissions de gestion — nécessaires pour afficher et configurer le Bot sur vos serveurs.")}
              </li>
              <li>
                <strong className="text-white">{i18n("privacyS1Item2Label", "Données du Bot sur un serveur")}</strong>
                {i18n("privacyS1Item2Body", " : messages nécessaires à la modération (contenu signalé, sanctions, avertissements), tickets de support, sondages, statistiques de niveaux/XP, et configuration du serveur (préfixe, couleurs, langue, modules activés) — stockées pour faire fonctionner ces fonctionnalités.")}
              </li>
              <li>
                <strong className="text-white">{i18n("privacyS1Item3Label", "Intégrations tierces (OAuth)")}</strong>
                {i18n("privacyS1Item3Body", " : si vous connectez Spotify, GitHub, Google Calendar, Notion, Todoist ou un autre service depuis la page Connexions, nous stockons un jeton d'accès (et de rafraîchissement le cas échéant) permettant d'afficher vos données depuis ce service (ex. le morceau en cours d'écoute sur Spotify) — jamais vos identifiants du service tiers lui-même, qui restent gérés directement par ce service via le protocole OAuth.")}
              </li>
              <li>
                <strong className="text-white">{i18n("privacyS1Item4Label", "Préférences du Dashboard")}</strong>
                {i18n("privacyS1Item4Body", " : thème, langue, disposition, tâches, notes et autres contenus que vous créez dans le Dashboard.")}
              </li>
              <li>
                <strong className="text-white">{i18n("privacyS1Item5Label", "Données techniques")}</strong>
                {i18n("privacyS1Item5Body", " : adresse IP et journaux de requêtes de base (via notre infrastructure Cloudflare), à des fins de sécurité et de diagnostic, conservés pour une durée limitée.")}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("privacyS2Title", "2. Où sont stockées les données")}</h2>
            <p className="mt-2">
              {i18n("privacyS2Part1", "Les données de compte et de configuration sont stockées via")}{" "}
              <strong className="text-white">Supabase</strong>{" "}
              {i18n("privacyS2Part2", "(base de données et authentification). Le Dashboard est hébergé sur")}{" "}
              <strong className="text-white">Cloudflare Pages</strong>{" "}
              {i18n("privacyS2Part3", "et les échanges avec les fournisseurs OAuth passent par un relais sécurisé")}{" "}
              <strong className="text-white">Cloudflare Worker</strong>{" "}
              {i18n("privacyS2Part4", "qui ne partage vos jetons qu'avec le service concerné. Le Bot Discord tourne sur un serveur privé dédié.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("privacyS3Title", "3. Pourquoi nous traitons ces données")}</h2>
            <p className="mt-2">{i18n("privacyS3Body", "Uniquement pour faire fonctionner le Service que vous utilisez explicitement : afficher votre profil et vos serveurs, exécuter les commandes du Bot, afficher les intégrations connectées dans le Dock/Dynamic Island, synchroniser vos réglages entre le Bot et le Dashboard, et assurer la sécurité du Service (anti-spam, anti-raid).")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("privacyS4Title", "4. Partage des données")}</h2>
            <p className="mt-2">{i18n("privacyS4Intro", "Nous ne vendons ni ne louons vos données. Elles ne sont partagées qu'avec :")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>{i18n("privacyS4Item1", "les prestataires techniques nécessaires au fonctionnement du Service (Supabase, Cloudflare) ;")}</li>
              <li>{i18n("privacyS4Item2", "le service tiers concerné, lorsque vous utilisez une intégration OAuth que vous avez vous-même connectée (ex. Discord, Spotify) ;")}</li>
              <li>{i18n("privacyS4Item3", "les autorités compétentes, uniquement si la loi nous y oblige.")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("privacyS5Title", "5. Vos droits")}</h2>
            <p className="mt-2">
              {i18n("privacyS5Part1", "Vous pouvez à tout moment : déconnecter une intégration depuis la page Connexions, retirer le Bot d'un serveur, ou demander la suppression de votre compte et des données associées en nous contactant à")}{" "}
              <a href="mailto:rub19.mailpro@gmail.com" className="underline underline-offset-2">
                rub19.mailpro@gmail.com
              </a>
              . {i18n("privacyS5Part2", "Nous traiterons toute demande de suppression dans un délai raisonnable.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("privacyS6Title", "6. Cookies et stockage local")}</h2>
            <p className="mt-2">{i18n("privacyS6Body", "Le Dashboard utilise le stockage local du navigateur (localStorage) pour retenir vos préférences d'affichage et votre session, ainsi que des cookies techniques nécessaires à l'authentification Supabase. Nous n'utilisons pas de cookies publicitaires ou de traceurs tiers.")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("privacyS7Title", "7. Mineurs")}</h2>
            <p className="mt-2">{i18n("privacyS7Body", "Le Service s'appuie sur Discord et suit ses conditions d'âge minimum. Il n'est pas destiné aux personnes n'ayant pas l'âge minimum requis par Discord dans leur pays de résidence.")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("privacyS8Title", "8. Modifications")}</h2>
            <p className="mt-2">{i18n("privacyS8Body", "Cette politique peut évoluer avec le Service. La date en haut de cette page indique la version en vigueur.")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("privacyS9Title", "9. Contact")}</h2>
            <p className="mt-2">
              {i18n("privacyS9BodyPrefix", "Pour toute question sur cette politique ou vos données :")}{" "}
              <a href="mailto:rub19.mailpro@gmail.com" className="underline underline-offset-2">
                rub19.mailpro@gmail.com
              </a>
              .
            </p>
          </section>

          <p className="pt-4 text-sm text-zinc-500">
            {i18n("privacySeeAlsoPrefix", "Voir aussi nos")}{" "}
            <a href="/terms" className="underline underline-offset-2 hover:text-zinc-300">
              {i18n("termsLinkText", "Conditions d'utilisation")}
            </a>
            {i18n("privacySeeAlsoSuffix", ".")}
          </p>
        </div>
      </div>
    </div>
  );
}
