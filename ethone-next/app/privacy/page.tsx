export const metadata = {
  title: "Politique de confidentialité — ETHONE",
  description: "Politique de confidentialité d'ETHONE (dashboard ethone.dev et ETHONE Bot pour Discord).",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen w-full bg-black text-zinc-200">
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Retour à ETHONE
        </a>

        <h1 className="mt-6 text-3xl font-bold text-white">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-zinc-500">Dernière mise à jour : 8 septembre 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-zinc-300">
          <section>
            <p>
              Cette politique explique quelles données sont collectées lors de l&apos;utilisation du
              site <strong className="text-white">ethone.dev</strong> et du bot Discord{" "}
              <strong className="text-white">ETHONE Bot</strong> (ensemble, le « Service »),
              pourquoi, et comment elles sont traitées. ETHONE est un projet personnel indépendant ;
              nous ne vendons aucune donnée et ne l&apos;utilisons pas à des fins publicitaires.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">1. Données collectées</h2>
            <p className="mt-2">Selon les fonctionnalités que vous utilisez, nous pouvons traiter :</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong className="text-white">Compte Discord</strong> : identifiant Discord, nom
                d&apos;utilisateur, avatar, et liste des serveurs où vous avez les permissions de
                gestion — nécessaires pour afficher et configurer le Bot sur vos serveurs.
              </li>
              <li>
                <strong className="text-white">Données du Bot sur un serveur</strong> : messages
                nécessaires à la modération (contenu signalé, sanctions, avertissements), tickets de
                support, sondages, statistiques de niveaux/XP, et configuration du serveur (préfixe,
                couleurs, langue, modules activés) — stockées pour faire fonctionner ces
                fonctionnalités.
              </li>
              <li>
                <strong className="text-white">Intégrations tierces (OAuth)</strong> : si vous
                connectez Spotify, GitHub, Google Calendar, Notion, Todoist ou un autre service
                depuis la page Connexions, nous stockons un jeton d&apos;accès (et de rafraîchissement
                le cas échéant) permettant d&apos;afficher vos données depuis ce service (ex. le
                morceau en cours d&apos;écoute sur Spotify) — jamais vos identifiants du service tiers
                lui-même, qui restent gérés directement par ce service via le protocole OAuth.
              </li>
              <li>
                <strong className="text-white">Préférences du Dashboard</strong> : thème, langue,
                disposition, tâches, notes et autres contenus que vous créez dans le Dashboard.
              </li>
              <li>
                <strong className="text-white">Données techniques</strong> : adresse IP et journaux
                de requêtes de base (via notre infrastructure Cloudflare), à des fins de sécurité et
                de diagnostic, conservés pour une durée limitée.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Où sont stockées les données</h2>
            <p className="mt-2">
              Les données de compte et de configuration sont stockées via{" "}
              <strong className="text-white">Supabase</strong> (base de données et authentification).
              Le Dashboard est hébergé sur <strong className="text-white">Cloudflare Pages</strong>{" "}
              et les échanges avec les fournisseurs OAuth passent par un relais sécurisé{" "}
              <strong className="text-white">Cloudflare Worker</strong> qui ne partage vos jetons
              qu&apos;avec le service concerné. Le Bot Discord tourne sur un serveur privé dédié.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Pourquoi nous traitons ces données</h2>
            <p className="mt-2">
              Uniquement pour faire fonctionner le Service que vous utilisez explicitement : afficher
              votre profil et vos serveurs, exécuter les commandes du Bot, afficher les intégrations
              connectées dans le Dock/Dynamic Island, synchroniser vos réglages entre le Bot et le
              Dashboard, et assurer la sécurité du Service (anti-spam, anti-raid).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Partage des données</h2>
            <p className="mt-2">
              Nous ne vendons ni ne louons vos données. Elles ne sont partagées qu&apos;avec :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>les prestataires techniques nécessaires au fonctionnement du Service (Supabase, Cloudflare) ;</li>
              <li>le service tiers concerné, lorsque vous utilisez une intégration OAuth que vous avez vous-même connectée (ex. Discord, Spotify) ;</li>
              <li>les autorités compétentes, uniquement si la loi nous y oblige.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Vos droits</h2>
            <p className="mt-2">
              Vous pouvez à tout moment : déconnecter une intégration depuis la page Connexions,
              retirer le Bot d&apos;un serveur, ou demander la suppression de votre compte et des
              données associées en nous contactant à{" "}
              <a href="mailto:rub19.mailpro@gmail.com" className="underline underline-offset-2">
                rub19.mailpro@gmail.com
              </a>
              . Nous traiterons toute demande de suppression dans un délai raisonnable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Cookies et stockage local</h2>
            <p className="mt-2">
              Le Dashboard utilise le stockage local du navigateur (localStorage) pour retenir vos
              préférences d&apos;affichage et votre session, ainsi que des cookies techniques
              nécessaires à l&apos;authentification Supabase. Nous n&apos;utilisons pas de cookies
              publicitaires ou de traceurs tiers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Mineurs</h2>
            <p className="mt-2">
              Le Service s&apos;appuie sur Discord et suit ses conditions d&apos;âge minimum. Il
              n&apos;est pas destiné aux personnes n&apos;ayant pas l&apos;âge minimum requis par
              Discord dans leur pays de résidence.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Modifications</h2>
            <p className="mt-2">
              Cette politique peut évoluer avec le Service. La date en haut de cette page indique la
              version en vigueur.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Contact</h2>
            <p className="mt-2">
              Pour toute question sur cette politique ou vos données :{" "}
              <a href="mailto:rub19.mailpro@gmail.com" className="underline underline-offset-2">
                rub19.mailpro@gmail.com
              </a>
              .
            </p>
          </section>

          <p className="pt-4 text-sm text-zinc-500">
            Voir aussi nos{" "}
            <a href="/terms" className="underline underline-offset-2 hover:text-zinc-300">
              Conditions d&apos;utilisation
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
