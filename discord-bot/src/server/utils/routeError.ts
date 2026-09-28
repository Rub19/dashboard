import type { Response } from 'express';
import { logger } from '../../utils/logger.js';

/**
 * Erreur interne (500) : le message réel (souvent une trace DB/driver/Discord) part dans les
 * logs serveur, jamais dans la réponse HTTP — le client ne voit qu'un message sûr et stable.
 *
 * `extra` est fusionné dans le corps JSON (ex. `{ success: false }` pour les routes qui
 * exposent ce champ).
 */
export function handleRouteError(
  err: unknown,
  res: Response,
  safeMessage: string,
  extra: Record<string, unknown> = {}
): void {
  logger.error(safeMessage, err);
  res.status(500).json({ ...extra, error: safeMessage });
}

/**
 * Vrai si l'erreur est une erreur « volontaire » côté serveur dont le message peut être montré
 * au client : erreur de validation Zod, ou `Error` simple levée par notre propre code
 * (`throw new Error('Ticket introuvable.')`). Les erreurs de driver / réseau / Discord
 * (`TypeError`, `DiscordAPIError`, erreurs Node avec `code`, etc.) sont exclues.
 */
export function isClientSafeError(err: unknown): err is Error {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: unknown; message?: unknown; issues?: unknown; code?: unknown; status?: unknown };
  if (typeof e.message !== 'string' || e.message.length === 0) return false;
  if (e.name === 'ZodError' || Array.isArray(e.issues)) return true;
  if (e.name === 'ParamValidationError') return true;
  return err instanceof Error && e.name === 'Error' && e.code === undefined && e.message.length <= 300;
}

/** Message à renvoyer pour une erreur 4xx : le message de l'erreur si elle est volontaire, sinon `fallback`. */
export function clientErrorMessage(err: unknown, fallback: string): string {
  return isClientSafeError(err) ? err.message : fallback;
}

/**
 * Réponse 4xx (400 par défaut) pour un échec de validation / une règle métier refusée.
 * Un message volontaire (Zod, `throw new Error('…')` de notre code) est conservé ; toute autre
 * exception inattendue est journalisée et remplacée par `fallback`.
 */
export function handleClientError(
  err: unknown,
  res: Response,
  fallback: string,
  extra: Record<string, unknown> = {},
  status = 400
): void {
  if (!isClientSafeError(err)) logger.error(fallback, err);
  res.status(status).json({ ...extra, error: clientErrorMessage(err, fallback) });
}
