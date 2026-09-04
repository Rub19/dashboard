import {
  BackupDiffResult,
  BackupSnapshot,
  DiffChange,
  DiffItem,
} from '../types/index.js';

export class BackupDiffService {
  /**
   * Compare deux snapshots A (ancien) et B (nouveau ou état actuel)
   */
  public static compare(snapshotA: BackupSnapshot, snapshotB: BackupSnapshot): BackupDiffResult {
    const rolesDiff = this.compareRoles(snapshotA.data.roles, snapshotB.data.roles);
    const categoriesDiff = this.compareCategories(
      snapshotA.data.categories,
      snapshotB.data.categories
    );
    const channelsDiff = this.compareChannels(snapshotA.data.channels, snapshotB.data.channels);
    const permissionsDiff = this.comparePermissions(
      snapshotA.data.channels,
      snapshotB.data.channels
    );
    const ethoneDiff = this.compareEthone(
      snapshotA.data.ethoneConfig || {},
      snapshotB.data.ethoneConfig || {}
    );

    const allItems: DiffItem[] = [
      ...rolesDiff,
      ...categoriesDiff,
      ...channelsDiff,
      ...permissionsDiff,
      ...ethoneDiff,
    ];

    const summary = {
      added: allItems.filter((i) => i.status === 'ADDED').length,
      modified: allItems.filter((i) => i.status === 'MODIFIED').length,
      removed: allItems.filter((i) => i.status === 'REMOVED').length,
      unchanged: allItems.filter((i) => i.status === 'UNCHANGED').length,
    };

    return {
      backupAId: snapshotA.backupId,
      backupAName: snapshotA.name,
      backupBId: snapshotB.backupId,
      backupBName: snapshotB.name,
      summary,
      roles: rolesDiff,
      channels: channelsDiff,
      categories: categoriesDiff,
      permissions: permissionsDiff,
      ethone: ethoneDiff,
    };
  }

  private static compareRoles(rolesA: any[] = [], rolesB: any[] = []): DiffItem[] {
    const items: DiffItem[] = [];
    const mapB = new Map(rolesB.map((r) => [r.id || r.name, r]));
    const matchedB = new Set<string>();

    for (const rA of rolesA) {
      const key = rA.id || rA.name;
      const rB = mapB.get(key) || rolesB.find((b) => b.name === rA.name);

      if (!rB) {
        items.push({
          id: rA.id,
          name: rA.name,
          type: 'ROLE',
          status: 'REMOVED',
          details: `Rôle @${rA.name} supprimé`,
        });
      } else {
        matchedB.add(rB.id || rB.name);
        const changes: DiffChange[] = [];
        if (rA.name !== rB.name) changes.push({ field: 'name', before: rA.name, after: rB.name });
        if (rA.color !== rB.color) changes.push({ field: 'color', before: rA.color, after: rB.color });
        if (rA.hoist !== rB.hoist) changes.push({ field: 'hoist', before: rA.hoist, after: rB.hoist });
        if (rA.permissions !== rB.permissions)
          changes.push({ field: 'permissions', before: rA.permissions, after: rB.permissions });

        if (changes.length > 0) {
          items.push({
            id: rA.id,
            name: rA.name,
            type: 'ROLE',
            status: 'MODIFIED',
            changes,
            details: `Modifications sur @${rA.name} (${changes.map((c) => c.field).join(', ')})`,
          });
        } else {
          items.push({
            id: rA.id,
            name: rA.name,
            type: 'ROLE',
            status: 'UNCHANGED',
          });
        }
      }
    }

    for (const rB of rolesB) {
      const key = rB.id || rB.name;
      if (!matchedB.has(key) && !rolesA.find((a) => a.name === rB.name)) {
        items.push({
          id: rB.id,
          name: rB.name,
          type: 'ROLE',
          status: 'ADDED',
          details: `Nouveau rôle @${rB.name} créé`,
        });
      }
    }

    return items;
  }

  private static compareCategories(catsA: any[] = [], catsB: any[] = []): DiffItem[] {
    const items: DiffItem[] = [];
    const mapB = new Map(catsB.map((c) => [c.id || c.name, c]));
    const matchedB = new Set<string>();

    for (const cA of catsA) {
      const key = cA.id || cA.name;
      const cB = mapB.get(key) || catsB.find((b) => b.name === cA.name);

      if (!cB) {
        items.push({
          id: cA.id,
          name: cA.name,
          type: 'CATEGORY',
          status: 'REMOVED',
          details: `Catégorie "${cA.name}" absente`,
        });
      } else {
        matchedB.add(cB.id || cB.name);
        const changes: DiffChange[] = [];
        if (cA.name !== cB.name) changes.push({ field: 'name', before: cA.name, after: cB.name });
        if (cA.position !== cB.position)
          changes.push({ field: 'position', before: cA.position, after: cB.position });

        if (changes.length > 0) {
          items.push({
            id: cA.id,
            name: cA.name,
            type: 'CATEGORY',
            status: 'MODIFIED',
            changes,
            details: `Catégorie mise à jour`,
          });
        } else {
          items.push({
            id: cA.id,
            name: cA.name,
            type: 'CATEGORY',
            status: 'UNCHANGED',
          });
        }
      }
    }

    for (const cB of catsB) {
      const key = cB.id || cB.name;
      if (!matchedB.has(key) && !catsA.find((a) => a.name === cB.name)) {
        items.push({
          id: cB.id,
          name: cB.name,
          type: 'CATEGORY',
          status: 'ADDED',
          details: `Nouvelle catégorie "${cB.name}"`,
        });
      }
    }

    return items;
  }

  private static compareChannels(chansA: any[] = [], chansB: any[] = []): DiffItem[] {
    const items: DiffItem[] = [];
    const mapB = new Map(chansB.map((c) => [c.id || c.name, c]));
    const matchedB = new Set<string>();

    for (const cA of chansA) {
      const key = cA.id || cA.name;
      const cB = mapB.get(key) || chansB.find((b) => b.name === cA.name && b.type === cA.type);

      if (!cB) {
        items.push({
          id: cA.id,
          name: cA.name,
          type: 'CHANNEL',
          status: 'REMOVED',
          details: `Salon #${cA.name} supprimé`,
        });
      } else {
        matchedB.add(cB.id || cB.name);
        const changes: DiffChange[] = [];
        if (cA.name !== cB.name) changes.push({ field: 'name', before: cA.name, after: cB.name });
        if (cA.topic !== cB.topic) changes.push({ field: 'topic', before: cA.topic, after: cB.topic });
        if (cA.parentName !== cB.parentName)
          changes.push({ field: 'category', before: cA.parentName, after: cB.parentName });
        if (cA.rateLimitPerUser !== cB.rateLimitPerUser)
          changes.push({
            field: 'rateLimit',
            before: cA.rateLimitPerUser,
            after: cB.rateLimitPerUser,
          });

        if (changes.length > 0) {
          items.push({
            id: cA.id,
            name: cA.name,
            type: 'CHANNEL',
            status: 'MODIFIED',
            changes,
            details: `Salon modifié (${changes.map((c) => c.field).join(', ')})`,
          });
        } else {
          items.push({
            id: cA.id,
            name: cA.name,
            type: 'CHANNEL',
            status: 'UNCHANGED',
          });
        }
      }
    }

    for (const cB of chansB) {
      const key = cB.id || cB.name;
      if (!matchedB.has(key) && !chansA.find((a) => a.name === cB.name && a.type === cB.type)) {
        items.push({
          id: cB.id,
          name: cB.name,
          type: 'CHANNEL',
          status: 'ADDED',
          details: `Nouveau salon #${cB.name}`,
        });
      }
    }

    return items;
  }

  private static comparePermissions(chansA: any[] = [], chansB: any[] = []): DiffItem[] {
    const items: DiffItem[] = [];

    for (const cA of chansA) {
      const cB = chansB.find((b) => b.name === cA.name || b.id === cA.id);
      if (!cB) continue;

      const owA = cA.permissionOverwrites || [];
      const owB = cB.permissionOverwrites || [];

      if (JSON.stringify(owA) !== JSON.stringify(owB)) {
        items.push({
          id: `perm-${cA.id}`,
          name: `#${cA.name} Overwrites`,
          type: 'PERMISSION',
          status: 'MODIFIED',
          details: `Permissions modifiées sur #${cA.name} (${owA.length} règles -> ${owB.length} règles)`,
        });
      }
    }

    return items;
  }

  private static compareEthone(cfgA: Record<string, any>, cfgB: Record<string, any>): DiffItem[] {
    const items: DiffItem[] = [];
    const allKeys = Array.from(new Set([...Object.keys(cfgA), ...Object.keys(cfgB)]));

    for (const key of allKeys) {
      const valA = cfgA[key];
      const valB = cfgB[key];

      if (valA === undefined && valB !== undefined) {
        items.push({
          id: `eth-${key}`,
          name: `Module ${key}`,
          type: 'ETHONE',
          status: 'ADDED',
          details: `Module configuré dans la sauvegarde récente`,
        });
      } else if (valA !== undefined && valB === undefined) {
        items.push({
          id: `eth-${key}`,
          name: `Module ${key}`,
          type: 'ETHONE',
          status: 'REMOVED',
          details: `Configuration du module retirée`,
        });
      } else if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        items.push({
          id: `eth-${key}`,
          name: `Module ${key}`,
          type: 'ETHONE',
          status: 'MODIFIED',
          details: `Paramètres du module modifiés`,
        });
      } else {
        items.push({
          id: `eth-${key}`,
          name: `Module ${key}`,
          type: 'ETHONE',
          status: 'UNCHANGED',
        });
      }
    }

    return items;
  }
}
