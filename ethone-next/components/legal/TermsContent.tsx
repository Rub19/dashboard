"use client";

import { useI18n } from "@/lib/hooks/useI18n";

export default function TermsContent() {
  const i18n = useI18n();

  return (
    <div className="h-full w-full overflow-y-auto bg-black text-zinc-200">
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          {i18n("legalBackLink", "← Retour à ETHONE")}
        </a>

        <h1 className="mt-6 text-3xl font-bold text-white">{i18n("termsPageTitle", "Conditions d'utilisation")}</h1>
        <p className="mt-2 text-sm text-zinc-500">{i18n("legalUpdatedLine", "Dernière mise à jour : 8 septembre 2026")}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-zinc-300">
          <section>
            <p>
              {i18n("termsIntroPart1", "Les présentes Conditions d'utilisation (« Conditions ») régissent l'accès et l'utilisation du site")}{" "}
              <strong className="text-white">ethone.dev</strong>{" "}
              {i18n("termsIntroPart2", "(le « Dashboard ») et du bot Discord")}{" "}
              <strong className="text-white">ETHONE Bot</strong>{" "}
              {i18n("termsIntroPart3", "(ensemble, le « Service »), développés et exploités par Rub19, à titre de projet personnel et indépendant. En utilisant le Service, vous acceptez ces Conditions.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("termsS1Title", "1. Nature du Service")}</h2>
            <p className="mt-2">{i18n("termsS1Body", "ETHONE est un projet personnel fournissant un bot de modération, musique, tickets et gestion de serveur pour Discord, ainsi qu'un tableau de bord web associé permettant de configurer le bot et de connecter des services tiers (Discord, Spotify, GitHub, Google Calendar, Notion, Todoist, etc.). Le Service est fourni « en l'état », sans garantie de disponibilité continue, et peut évoluer, être modifié ou interrompu à tout moment sans préavis.")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("termsS2Title", "2. Compte et accès")}</h2>
            <p className="mt-2">{i18n("termsS2Body", "L'accès au Dashboard nécessite une authentification (par exemple via Discord ou un compte email/mot de passe géré par notre fournisseur d'infrastructure Supabase). Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée depuis votre compte. L'ajout du Bot sur un serveur Discord se fait via le lien d'invitation officiel fourni dans le Dashboard ou sur Discord.")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("termsS3Title", "3. Utilisation acceptable")}</h2>
            <p className="mt-2">{i18n("termsS3Intro", "Vous vous engagez à ne pas utiliser le Service pour :")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>{i18n("termsS3Item1", "enfreindre les Conditions d'utilisation ou les Directives de la communauté Discord ;")}</li>
              <li>{i18n("termsS3Item2", "harceler, menacer ou nuire à autrui, ou diffuser du contenu illégal ;")}</li>
              <li>{i18n("termsS3Item3", "tenter de contourner les mesures de sécurité, de modération ou les limites techniques du Service (spam, abus des commandes, exploitation de bugs) ;")}</li>
              <li>{i18n("termsS3Item4", "collecter des données d'autres utilisateurs à des fins non prévues par le Service.")}</li>
            </ul>
            <p className="mt-2">{i18n("termsS3Outro", "Tout abus constaté peut entraîner la suspension du Bot sur un serveur, la révocation de l'accès au Dashboard, ou le retrait de fonctionnalités, à notre discrétion.")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("termsS4Title", "4. Intégrations tierces")}</h2>
            <p className="mt-2">{i18n("termsS4Body", "Le Service permet de connecter des comptes tiers (Discord, Spotify, GitHub, Google, Notion, Todoist, etc.) via OAuth. Chacun de ces services reste régi par ses propres conditions d'utilisation et politique de confidentialité, sur lesquelles nous n'avons aucun contrôle. Vous pouvez déconnecter ces intégrations à tout moment depuis la page Connexions du Dashboard.")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("termsS5Title", "5. Propriété")}</h2>
            <p className="mt-2">{i18n("termsS5Body", "Le code, le design et la marque ETHONE restent la propriété de leur auteur. Le contenu que vous créez via le Service (messages, tickets, configurations de serveur, notes, etc.) vous appartient ; nous ne le réutilisons pas en dehors du fonctionnement normal du Service.")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("termsS6Title", "6. Limitation de responsabilité")}</h2>
            <p className="mt-2">{i18n("termsS6Body", "Le Service étant un projet personnel fourni gratuitement et « en l'état », il est fourni sans garantie d'aucune sorte, explicite ou implicite. Dans la mesure permise par la loi, nous ne pourrons être tenus responsables de pertes de données, interruptions de service ou dommages indirects résultant de l'utilisation du Service.")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("termsS7Title", "7. Modifications")}</h2>
            <p className="mt-2">{i18n("termsS7Body", "Ces Conditions peuvent être mises à jour à mesure que le Service évolue. La date de dernière mise à jour en haut de cette page reflète la version en vigueur. Une utilisation continue du Service après modification vaut acceptation des nouvelles Conditions.")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">{i18n("termsS8Title", "8. Contact")}</h2>
            <p className="mt-2">
              {i18n("termsS8BodyPrefix", "Pour toute question relative à ces Conditions, vous pouvez nous contacter à :")}{" "}
              <a href="mailto:rub19.mailpro@gmail.com" className="text-[var(--brand,#C1234F)] underline underline-offset-2">
                rub19.mailpro@gmail.com
              </a>
              .
            </p>
          </section>

          <p className="pt-4 text-sm text-zinc-500">
            {i18n("termsSeeAlsoPrefix", "Voir aussi notre")}{" "}
            <a href="/privacy" className="underline underline-offset-2 hover:text-zinc-300">
              {i18n("privacyLinkText", "Politique de confidentialité")}
            </a>
            {i18n("termsSeeAlsoSuffix", ".")}
          </p>
        </div>
      </div>
    </div>
  );
}
