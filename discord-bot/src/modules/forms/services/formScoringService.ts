import { DiscordForm, FormAnswer } from '../types/index.js';

export interface CalculatedScore {
  score: number;
  maxScore: number;
  scoreLabel: 'Low' | 'Medium' | 'High' | 'Recommended' | 'None';
  breakdown: Array<{
    fieldId: string;
    fieldLabel: string;
    pointsAwarded: number;
  }>;
}

export class FormScoringService {
  /**
   * Calculate score for a set of answers based on form configuration.
   */
  public calculateScore(form: DiscordForm, answers: FormAnswer[]): CalculatedScore {
    if (!form.scoring.enabled) {
      return {
        score: 0,
        maxScore: form.scoring.maxScore || 100,
        scoreLabel: 'None',
        breakdown: [],
      };
    }

    let totalPoints = 0;
    const breakdown: CalculatedScore['breakdown'] = [];

    for (const answer of answers) {
      const field = form.fields.find((f) => f.id === answer.fieldId);
      if (!field || !field.options || field.options.length === 0) continue;

      let awarded = 0;
      const answerVal = answer.value;

      if (Array.isArray(answerVal)) {
        // Multi-select or checkboxes
        for (const val of answerVal) {
          const opt = field.options.find((o) => o.value === val);
          if (opt && typeof opt.points === 'number') {
            awarded += opt.points;
          }
        }
      } else {
        // Single select, radio, yes/no
        const opt = field.options.find((o) => o.value === answerVal);
        if (opt && typeof opt.points === 'number') {
          awarded += opt.points;
        }
      }

      if (awarded > 0) {
        totalPoints += awarded;
        breakdown.push({
          fieldId: field.id,
          fieldLabel: field.label,
          pointsAwarded: awarded,
        });
      }
    }

    const maxScore = form.scoring.maxScore || 100;
    const finalScore = Math.min(totalPoints, maxScore);

    // Determine score label
    // Low: <= thresholds.low (e.g. 39)
    // Medium: > thresholds.low and < thresholds.high (e.g. 40 to 69)
    // High: >= thresholds.high (e.g. 70 to 100)
    const thresholds = form.scoring.thresholds || { low: 39, medium: 69, high: 100 };
    const highThreshold = thresholds.high <= 70 ? thresholds.high : 70;
    const lowThreshold = thresholds.low || 39;

    let scoreLabel: CalculatedScore['scoreLabel'] = 'Low';

    if (finalScore >= highThreshold) {
      scoreLabel = finalScore >= (form.scoring.passScore || 60) ? 'Recommended' : 'High';
    } else if (finalScore > lowThreshold) {
      scoreLabel = 'Medium';
    } else {
      scoreLabel = 'Low';
    }

    return {
      score: finalScore,
      maxScore,
      scoreLabel,
      breakdown,
    };
  }
}

export const formScoringService = new FormScoringService();
