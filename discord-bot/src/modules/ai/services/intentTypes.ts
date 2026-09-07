/**
 * ETHONE Assistant 2.0 — Intent Types
 *
 * Catégories d'intention détectées par `intentDetector` à partir d'un message
 * utilisateur. Ces catégories suivent la nomenclature du Prompt #18 §80.
 *
 * Note : on n'utilise PAS de LLM pour classifier par défaut — un classificateur
 * regex + heuristiques FR/EN/ES tourne localement et instantanément. Un appel
 * LLM n'est déclenché que si la confiance locale est < 0.6.
 */

export type IntentCategory =
  | 'conversation'      // "salut", "ça va ?", "merci", "mdr" — réponse naturelle courte
  | 'informational'     // question factuelle générale — "c'est quoi Discord ?"
  | 'ethone_info'       // question spécifique ETHONE — "comment connecter Spotify ?"
  | 'support'           // signalement de problème — "mon bot ne répond plus"
  | 'action'            // demande d'exécution — "lance mon focus"
  | 'search'            // demande de recherche — "trouve mon fichier X"
  | 'clarification'     // message ambigu — confidence < 0.6
  | 'humor'             // blagues / vannes — "t'es nul 😂"
  | 'short_reply';      // réponse courte contexte-dépendante — "oui", "non", "ok"

export type SupportedLanguage = 'fr' | 'en' | 'es' | 'de';

export interface IntentResult {
  intent: IntentCategory;
  /** Score de confiance 0..1 (résultat du regex + heuristiques, ou du LLM si activé) */
  confidence: number;
  /** Langue détectée du message */
  language: SupportedLanguage;
  /** Entités extraites (verbes d'action, noms de services, etc.) */
  entities: {
    actionVerb?: string;       // "lance", "démarre", "create", "play"...
    serviceHint?: string;      // "spotify", "discord", "focus", "notes"...
    isFollowUp?: boolean;      // true si le message dépend du contexte précédent
    isConfirmation?: boolean;  // true si le message est "oui", "non", "ok", "vas-y"
  };
  /** Indique si on a dû faire appel au LLM pour classifier */
  usedLlmFallback: boolean;
}

/** Réponse courte par intent/langue — utilisée quand la réponse du LLM est trop générique */
export interface IntentReply {
  /** Texte de la réponse (court, naturel, contextualisé) */
  text: string;
  /** Actions contextuelles à proposer sous forme de boutons Discord */
  actions: string[]; // ex: ['open_ticket', 'diagnose']
}

/** Catégories qui ne déclenchent JAMAIS l'appel au LLM (routage trivial) */
export const FAST_TRACK_INTENTS: IntentCategory[] = [
  'conversation',
  'humor',
  'short_reply',
  'clarification',
];

/** Intents qui exigent un appel de retrieval (RAG) */
export const RAG_INTENTS: IntentCategory[] = [
  'informational',
  'ethone_info',
  'support',
];

/** Intents qui déclenchent une action (réelle ou proposée) */
export const ACTION_INTENTS: IntentCategory[] = ['action'];
