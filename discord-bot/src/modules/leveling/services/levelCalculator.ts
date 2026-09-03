export class LevelCalculator {
  /**
   * Calcule l'XP cumulé total requis pour atteindre un niveau donné.
   * Formule standard : 100 * (level ^ 1.5)
   */
  public static getXpForLevel(level: number): number {
    if (level <= 0) return 0;
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Détermine le niveau atteint en fonction de l'XP total.
   */
  public static calculateLevel(totalXp: number): number {
    if (totalXp <= 0) return 0;
    let level = 0;
    while (this.getXpForLevel(level + 1) <= totalXp) {
      level++;
    }
    return level;
  }

  /**
   * Fournit les détails de progression : niveau actuel, XP dans le niveau, XP requis pour le niveau suivant, et pourcentage.
   */
  public static getProgress(totalXp: number): {
    level: number;
    currentLevelXp: number;
    nextLevelXp: number;
    progressPercentage: number;
  } {
    const level = this.calculateLevel(totalXp);
    const baseXp = this.getXpForLevel(level);
    const targetXp = this.getXpForLevel(level + 1);

    const neededInLevel = targetXp - baseXp;
    const gainedInLevel = totalXp - baseXp;

    const progressPercentage =
      neededInLevel > 0
        ? Math.min(100, Math.max(0, Math.floor((gainedInLevel / neededInLevel) * 100)))
        : 0;

    return {
      level,
      currentLevelXp: gainedInLevel,
      nextLevelXp: neededInLevel,
      progressPercentage,
    };
  }

  /**
   * Génère une barre visuelle ASCII de progression pour Discord.
   */
  public static renderProgressBar(percentage: number, length = 12): string {
    const filled = Math.min(length, Math.max(0, Math.round((percentage / 100) * length)));
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}
