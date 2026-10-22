import fs from 'node:fs';
import path from 'node:path';
import { PermissionFlagsBits } from 'discord.js';
import { commandRegistry, PREFIX_ONLY_SHORTCUTS } from '../src/handlers/commandHandler.js';
import { HIDDEN_COMMANDS, familyOf } from '../src/services/publicCommandCatalog.js';
import {
  PROTECTIONS,
  PROTECTION_CATEGORIES,
  RECOMMENDED_PROTECTIONS,
  describeProtection,
  type Punish,
} from '../src/modules/protections/catalog.js';

interface RawOption {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  choices?: Array<{ name: string; value: string | number }>;
  options?: RawOption[];
}

interface RawCommand {
  name: string;
  description: string;
  options?: RawOption[];
  default_member_permissions?: string | null;
}

const PERMISSION_LABELS: Record<string, string> = {
  Administrator: 'Administrateur',
  ManageGuild: 'Gérer le serveur',
  ManageRoles: 'Gérer les rôles',
  ManageChannels: 'Gérer les salons',
  ManageMessages: 'Gérer les messages',
  ManageNicknames: 'Gérer les pseudos',
  ManageWebhooks: 'Gérer les webhooks',
  ManageEvents: 'Gérer les événements',
  ManageGuildExpressions: 'Gérer les expressions',
  ManageThreads: 'Gérer les fils',
  ModerateMembers: 'Exclure temporairement des membres',
  BanMembers: 'Bannir des membres',
  KickMembers: 'Expulser des membres',
  MoveMembers: 'Déplacer des membres',
  MuteMembers: 'Rendre muets des membres',
  DeafenMembers: 'Mettre en sourdine des membres',
  ViewAuditLog: "Voir les logs d'audit",
};

function permissionsOf(bits: string | null | undefined): string[] {
  if (!bits) return [];
  const value = BigInt(bits);
  if (value === 0n) return [];
  return Object.entries(PermissionFlagsBits)
    .filter(([, flag]) => (value & flag) === flag)
    .map(([name]) => PERMISSION_LABELS[name] ?? name);
}

function argument(option: RawOption): string {
  const choices = option.choices ?? [];
  const label = choices.length > 0 && choices.length <= 4 ? choices.map((c) => String(c.value)).join('|') : option.name;
  return option.required ? `<${label}>` : `[${label}]`;
}

function argumentsOf(options: RawOption[] | undefined): string {
  return (options ?? []).filter((o) => o.type !== 1 && o.type !== 2).map(argument).join(' ');
}

function line(parts: string[]): string {
  return parts.filter(Boolean).join(' ');
}

function subcommandsOf(command: RawCommand): Array<{ name: string; syntax: string; description: string }> {
  const out: Array<{ name: string; syntax: string; description: string }> = [];
  for (const option of command.options ?? []) {
    if (option.type === 1) {
      out.push({ name: option.name, syntax: line([`/${command.name}`, option.name, argumentsOf(option.options)]), description: option.description });
    }
    if (option.type === 2) {
      for (const sub of option.options ?? []) {
        if (sub.type !== 1) continue;
        out.push({
          name: `${option.name} ${sub.name}`,
          syntax: line([`/${command.name}`, option.name, sub.name, argumentsOf(sub.options)]),
          description: sub.description,
        });
      }
    }
  }
  return out;
}

const commands = commandRegistry
  .getAllCommands()
  .filter((c) => c.slashData && !HIDDEN_COMMANDS.has(c.name.toLowerCase()) && !PREFIX_ONLY_SHORTCUTS.has(c.name))
  .map((c) => {
    const json = c.slashData!.toJSON() as RawCommand;
    const subcommands = subcommandsOf(json);
    const syntax = subcommands.length
      ? `/${json.name} <${subcommands.map((s) => s.name.split(' ')[0]).filter((n, i, all) => all.indexOf(n) === i).join('|')}>`
      : line([`/${json.name}`, argumentsOf(json.options)]);
    return {
      name: json.name,
      syntax,
      category: familyOf(c.category),
      description: json.description || c.description,
      permissions: permissionsOf(json.default_member_permissions),
      subcommands,
    };
  })
  .sort((a, b) => a.category.localeCompare(b.category, 'fr') || a.name.localeCompare(b.name, 'fr'));

const protections = PROTECTIONS.map((p) => {
  const defaults = p.defaults as { quotaMax?: number; quotaSeconds?: number; punish?: Punish; timeoutSeconds?: number; minAccountAgeDays?: number; maxPerMessage?: number; toxicityThreshold?: number };
  return {
    key: p.key,
    label: p.label,
    category: p.category,
    description: p.description,
    behaviour: describeProtection(p, { ...defaults, punish: defaults.punish ?? 'none', timeoutSeconds: defaults.timeoutSeconds ?? 600 }),
    aftermath: p.aftermath ?? null,
    recommended: RECOMMENDED_PROTECTIONS.includes(p.key),
    lockdownAdvised: Boolean(p.lockdownAdvised),
  };
});

const output = process.argv[2] ?? path.resolve(process.cwd(), '../ethone-next/data/botDocs.json');
const payload = {
  commands,
  protectionCategories: [...PROTECTION_CATEGORIES],
  protections,
};
fs.writeFileSync(output, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
console.log(`${commands.length} commandes et ${protections.length} protections écrites dans ${output}`);
process.exit(0);
