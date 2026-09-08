export const metadata = {
  title: "Conditions d'utilisation — ETHONE",
  description: "Conditions d'utilisation d'ETHONE (dashboard ethone.dev et ETHONE Bot pour Discord).",
};

export default function TermsPage() {
  return (
    <div className="h-full w-full overflow-y-auto bg-black text-zinc-200">
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Retour à ETHONE
        </a>

        <h1 className="mt-6 text-3xl font-bold text-white">Conditions d&apos;utilisation</h1>
        <p className="mt-2 text-sm text-zinc-500">Dernière mise à jour : 8 septembre 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-zinc-300">
          <section>
            <p>
              Les présentes Conditions d&apos;utilisation (« Conditions ») régissent l&apos;accès et
              l&apos;utilisation du site <strong className="text-white">ethone.dev</strong> (le
              « Dashboard ») et du bot Discord <strong className="text-white">ETHONE Bot</strong>{" "}
              (ensemble, le « Service »), développés et exploités par Rub19, à titre de projet
              personnel et indépendant. En utilisant le Service, vous acceptez ces Conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">1. Nature du Service</h2>
            <p className="mt-2">
              ETHONE est un projet personnel fournissant un bot de modération, musique, tickets et
              gestion de serveur pour Discord, ainsi qu&apos;un tableau de bord web associé
              permettant de configurer le bot et de connecter des services tiers (Discord, Spotify,
              GitHub, Google Calendar, Notion, Todoist, etc.). Le Service est fourni « en l&apos;état »,
              sans garantie de disponibilité continue, et peut évoluer, être modifié ou interrompu à
              tout moment sans préavis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Compte et accès</h2>
            <p className="mt-2">
              L&apos;accès au Dashboard nécessite une authentification (par exemple via Discord ou un
              compte email/mot de passe géré par notre fournisseur d&apos;infrastructure Supabase).
              Vous êtes responsable de la confidentialité de vos identifiants et de toute activité
              effectuée depuis votre compte. L&apos;ajout du Bot sur un serveur Discord se fait via le
              lien d&apos;invitation officiel fourni dans le Dashboard ou sur Discord.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Utilisation acceptable</h2>
            <p className="mt-2">Vous vous engagez à ne pas utiliser le Service pour :</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>enfreindre les Conditions d&apos;utilisation ou les Directives de la communauté Discord ;</li>
              <li>harceler, menacer ou nuire à autrui, ou diffuser du contenu illégal ;</li>
              <li>tenter de contourner les mesures de sécurité, de modération ou les limites techniques du Service (spam, abus des commandes, exploitation de bugs) ;</li>
              <li>collecter des données d&apos;autres utilisateurs à des fins non prévues par le Service.</li>
            </ul>
            <p className="mt-2">
              Tout abus constaté peut entraîner la suspension du Bot sur un serveur, la révocation
              de l&apos;accès au Dashboard, ou le retrait de fonctionnalités, à notre discrétion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Intégrations tierces</h2>
            <p className="mt-2">
              Le Service permet de connecter des comptes tiers (Discord, Spotify, GitHub, Google,
              Notion, Todoist, etc.) via OAuth. Chacun de ces services reste régi par ses propres
              conditions d&apos;utilisation et politique de confidentialité, sur lesquelles nous
              n&apos;avons aucun contrôle. Vous pouvez déconnecter ces intégrations à tout moment
              depuis la page Connexions du Dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Propriété</h2>
            <p className="mt-2">
              Le code, le design et la marque ETHONE restent la propriété de leur auteur. Le contenu
              que vous créez via le Service (messages, tickets, configurations de serveur, notes,
              etc.) vous appartient ; nous ne le réutilisons pas en dehors du fonctionnement normal
              du Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Limitation de responsabilité</h2>
            <p className="mt-2">
              Le Service étant un projet personnel fourni gratuitement et « en l&apos;état », il est
              fourni sans garantie d&apos;aucune sorte, explicite ou implicite. Dans la mesure permise
              par la loi, nous ne pourrons être tenus responsables de pertes de données, interruptions
              de service ou dommages indirects résultant de l&apos;utilisation du Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Modifications</h2>
            <p className="mt-2">
              Ces Conditions peuvent être mises à jour à mesure que le Service évolue. La date de
              dernière mise à jour en haut de cette page reflète la version en vigueur. Une
              utilisation continue du Service après modification vaut acceptation des nouvelles
              Conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Contact</h2>
            <p className="mt-2">
              Pour toute question relative à ces Conditions, vous pouvez nous contacter à :{" "}
              <a href="mailto:rub19.mailpro@gmail.com" className="text-[var(--brand,#C1234F)] underline underline-offset-2">
                rub19.mailpro@gmail.com
              </a>
              .
            </p>
          </section>

          <p className="pt-4 text-sm text-zinc-500">
            Voir aussi notre{" "}
            <a href="/privacy" className="underline underline-offset-2 hover:text-zinc-300">
              Politique de confidentialité
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
