import { getAppEmoji } from '../../services/appEmojis.js';

export function displayCurrencySymbol(symbol?: string | null): string {
  return !symbol || symbol === '🪙' || symbol === 'etho' ? getAppEmoji('etho_coin') ?? '🪙' : symbol;
}
