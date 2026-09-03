import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';

export class LinkDetector {
  public static check(message: Message, config: AutoModConfig): DetectionResult {
    const linkConf = config.links;
    if (!linkConf.enabled) {
      return { detectorName: 'LinkDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    const content = message.content || '';

    // Détection d'URL (http/https ou sans protocole comme www.exemple.com)
    const urlRegex = /(https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi;
    const matches = content.match(urlRegex);

    if (!matches || matches.length === 0) {
      // Vérifier les adresses IP directes (ex: 192.168.1.1)
      if (linkConf.blockIpAddresses) {
        const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
        const ipMatch = content.match(ipRegex);
        if (ipMatch) {
          return {
            detectorName: 'LinkDetector',
            triggered: true,
            riskPoints: 30,
            reason: `Adresse IP brute détectée : ${ipMatch[0]}`,
            matchedContent: ipMatch[0],
            actions: linkConf.actions,
          };
        }
      }
      return { detectorName: 'LinkDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    for (const url of matches) {
      // 1. Raccourcisseurs de liens suspects (bit.ly, tinyurl, t.co, is.gd, etc.)
      if (linkConf.blockShortenedLinks) {
        const shortenedRegex = /(bit\.ly|tinyurl\.com|t\.co|is\.gd|buff\.ly|ow\.ly|goo\.gl|cutt\.ly)/i;
        if (shortenedRegex.test(url)) {
          return {
            detectorName: 'LinkDetector',
            triggered: true,
            riskPoints: 25,
            reason: `Lien raccourci suspect détecté : ${url}`,
            matchedContent: url,
            actions: linkConf.actions,
          };
        }
      }

      // 2. Extraire le domaine
      let domain = '';
      try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        domain = parsed.hostname.toLowerCase().replace(/^www\./, '');
      } catch {
        domain = url.toLowerCase();
      }

      // 3. Vérifier la blacklist spécifique
      if (linkConf.blacklistedDomains.some((d) => domain.includes(d.toLowerCase()))) {
        return {
          detectorName: 'LinkDetector',
          triggered: true,
          riskPoints: 35,
          reason: `Domaine blacklisté détecté : ${domain}`,
          matchedContent: url,
          actions: linkConf.actions,
        };
      }

      // 4. Si tous les liens sont bloqués et que le domaine n'est pas whitelisté
      if (linkConf.blockAllLinks) {
        const isWhitelisted = linkConf.whitelistedDomains.some((d) => domain.endsWith(d.toLowerCase()));
        if (!isWhitelisted) {
          return {
            detectorName: 'LinkDetector',
            triggered: true,
            riskPoints: 20,
            reason: `Lien externe non autorisé : ${domain}`,
            matchedContent: url,
            actions: linkConf.actions,
          };
        }
      }
    }

    return { detectorName: 'LinkDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
  }
}
