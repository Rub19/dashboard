import { AutoModRiskLevel, DetectionResult } from '../types/autoMod.js';

export class AutoModRiskEngine {
  public static calculateTotalRisk(results: DetectionResult[], baseRisk = 0): {
    totalScore: number;
    riskLevel: AutoModRiskLevel;
    breakdown: Array<{ name: string; points: number }>;
  } {
    let score = baseRisk;
    const breakdown: Array<{ name: string; points: number }> = [];

    for (const r of results) {
      if (r.triggered && r.riskPoints > 0) {
        score += r.riskPoints;
        breakdown.push({ name: r.detectorName, points: r.riskPoints });
      }
    }

    score = Math.min(100, Math.max(0, Math.round(score)));
    const riskLevel = this.getRiskLevel(score);

    return { totalScore: score, riskLevel, breakdown };
  }

  public static getRiskLevel(score: number): AutoModRiskLevel {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'SAFE';
  }
}
