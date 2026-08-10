export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  items: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v324",
    date: "2026-08-10",
    title: "Plan B + Command Center + Live Overlay + Profil avancé",
    items: [
      "Backend team (invitation, liste, suppression) connecté à Supabase.",
      "Backend spaces / flows / interactions / bill via ethone_user_data.",
      "Mission Control v1 : fenêtres flottantes multi-instances, aperçu, drag/resize.",
      "Command Center v1 : navigation, actions, création rapide, déconnexion.",
      "Live Overlay v2 : drag & drop, poignée, contraintes viewport.",
      "Macros persistantes : page /macros, exécution depuis Command Center.",
      "Personas : page /personas avec thèmes.",
      "Profil avancé : page /profile connectée à ethone_public_profiles.",
      "Bills v1 : page /bills, échéances, total, semaine.",
    ],
  },
  {
    version: "v323",
    date: "2026-08-18",
    title: "Fix UI : bouton collapse, profil/help Mail, bills i18n",
    items: [
      "Bouton de collapse Mail : icône seule.",
      "Bouton Profil dans Mail ouvre le panneau profil.",
      "Bouton Aide dans Mail ouvre les raccourcis clavier.",
      "Bills : date et montant localisés avec Intl.",
    ],
  },
  {
    version: "v322",
    date: "2026-08-18",
    title: "Audit i18n : batch settings, Brain, home",
    items: [
      "Ajout de 30+ entrées i18n.",
      "Suppression des variables locales worker/.dev.vars.",
    ],
  },
];
