/**
 * ETHONE AI Assistant — Safe Math Evaluator
 *
 * Évalue en toute sécurité des expressions arithmétiques basiques sans recourir à eval() ou Function().
 * Conforme aux règles d'audit de sécurité (scripts/audit-security.mjs).
 */

export interface MathEvaluationResult {
  success: boolean;
  result?: number;
  formattedResult?: string;
  displayExpression?: string;
  error?: 'DIVISION_BY_ZERO' | 'SYNTAX_ERROR' | 'OVERFLOW';
}

/**
 * Tokenizer & AST / Shunting-Yard Parser arithmétique pur et sécurisé
 */
export class MathEvaluator {
  /**
   * Évalue une expression mathématique sous forme de chaîne.
   */
  public static evaluate(expr: string): { success: boolean; result?: number; error?: 'DIVISION_BY_ZERO' | 'SYNTAX_ERROR' | 'OVERFLOW' } {
    try {
      // Normalisation des symboles mathématiques
      let sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/(\d)\s*x\s*(\d)/gi, '$1 * $2')
        .replace(/(\d),(\d)/g, '$1.$2') // virgule décimale francophone
        .replace(/\s+/g, '');

      if (!sanitized) return { success: false, error: 'SYNTAX_ERROR' };

      // Vérification des caractères autorisés uniquement : 0-9, ., +, -, *, /, %, ^, (, )
      if (!/^[0-9.+\-*/%^()]+$/.test(sanitized)) {
        return { success: false, error: 'SYNTAX_ERROR' };
      }

      // Parser récursif à descente simple
      let pos = 0;

      const peek = () => sanitized[pos];
      const get = () => sanitized[pos++];

      const parseNumber = (): number => {
        let numStr = '';
        while (pos < sanitized.length && (sanitized[pos] >= '0' && sanitized[pos] <= '9' || sanitized[pos] === '.')) {
          numStr += get();
        }
        const val = parseFloat(numStr);
        if (Number.isNaN(val)) throw new Error('SYNTAX_ERROR');
        return val;
      };

      const parsePrimary = (): number => {
        if (peek() === '+') {
          get();
          return parsePrimary();
        }
        if (peek() === '-') {
          get();
          return -parsePrimary();
        }
        if (peek() === '(') {
          get(); // '('
          const val = parseExpression();
          if (peek() !== ')') throw new Error('SYNTAX_ERROR');
          get(); // ')'
          return val;
        }
        return parseNumber();
      };

      const parseExponent = (): number => {
        let left = parsePrimary();
        while (peek() === '^') {
          get();
          const right = parsePrimary(); // ^ est traditionnellement associatif à droite, mais une boucle simple convient
          left = Math.pow(left, right);
        }
        return left;
      };

      const parseTerm = (): number => {
        let left = parseExponent();
        while (peek() === '*' || peek() === '/' || peek() === '%') {
          const op = get();
          const right = parseExponent();
          if (op === '*') {
            left *= right;
          } else if (op === '/') {
            if (right === 0) throw new Error('DIVISION_BY_ZERO');
            left /= right;
          } else if (op === '%') {
            if (right === 0) throw new Error('DIVISION_BY_ZERO');
            left %= right;
          }
        }
        return left;
      };

      const parseExpression = (): number => {
        let left = parseTerm();
        while (peek() === '+' || peek() === '-') {
          const op = get();
          const right = parseTerm();
          if (op === '+') {
            left += right;
          } else {
            left -= right;
          }
        }
        return left;
      };

      const result = parseExpression();

      if (pos < sanitized.length) {
        return { success: false, error: 'SYNTAX_ERROR' };
      }

      if (!Number.isFinite(result)) {
        return { success: false, error: 'OVERFLOW' };
      }

      // Nettoyer les imprécisions IEEE 754 (ex: 0.1 + 0.2 = 0.3)
      const cleanResult = Math.round((result + Number.EPSILON) * 1e10) / 1e10;

      return { success: true, result: cleanResult };
    } catch (e: any) {
      if (e?.message === 'DIVISION_BY_ZERO') {
        return { success: false, error: 'DIVISION_BY_ZERO' };
      }
      return { success: false, error: 'SYNTAX_ERROR' };
    }
  }

  /**
   * Formate proprement un nombre pour l'affichage (évite les 0 inutiles).
   */
  public static formatNumber(num: number): string {
    if (Number.isInteger(num)) return num.toString();
    // Maximum 8 décimales, sans zéros superflus
    return parseFloat(num.toFixed(8)).toString();
  }

  /**
   * Extrait et évalue une question contenant une opération arithmétique.
   * Retourne null si la requête ne correspond pas à un calcul.
   */
  public static extractAndEvaluate(query: string): MathEvaluationResult | null {
    const trimmed = query.trim();

    // 1. Préfixes de questions arithmétiques courants
    const prefixRegex = /^(?:combien\s+(?:font|fait|fais|vaut|mesurent?|de)|calcule?r?|calcul\s*:?|what\s+(?:is|does)|how\s+much\s+is|cu[aá]nto\s+es|was\s+ist|peux[- ]tu\s+calculer|saurais[- ]tu\s+calculer|pouvez[- ]vous\s+calculer)\s+/i;

    let candidate = trimmed.replace(prefixRegex, '').trim();

    // Enlever les ponctuations finales (?, !, ., =)
    candidate = candidate.replace(/[?!=.]+$/, '').trim();

    // Doit contenir au moins un chiffre
    if (!/\d/.test(candidate)) {
      return null;
    }

    // Si après nettoyage du préfixe il reste des mots alphabétiques (hors 'x' entre chiffres ou espaces pour la multiplication)
    // ce n'est PAS un calcul pur (ex: "combien de membres sur le serveur")
    const testCandidate = candidate.replace(/(\d|\))\s*x\s*(\d|\()/gi, '$1 * $2');
    if (/[a-zA-ZÀ-ÿ]/.test(testCandidate)) {
      return null;
    }

    // Doit contenir au moins un opérateur arithmétique (+, -, *, /, x, ×, ÷, %, ^) ou être un calcul évident
    if (!/[+\-*/x×÷%^]/.test(candidate)) {
      return null;
    }

    // Évaluation
    const evalResult = this.evaluate(candidate);

    // Formater l'expression d'affichage pour une lecture élégante (espaces autour des opérateurs, symboles usuels)
    const displayExpr = candidate
      .replace(/\s+/g, ' ')
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/\s*([+×÷^%-])\s*/g, ' $1 ')
      .replace(/\s*-\s*(\d+)/g, (match, p1, offset, string) => {
        // Gérer le signe unaire négatif en début ou après parenthèse
        const prev = string.slice(0, offset).trim();
        if (!prev || prev.endsWith('(') || /[+×÷^%-]$/.test(prev)) {
          return `-${p1}`;
        }
        return ` - ${p1}`;
      })
      .trim();

    if (evalResult.error === 'DIVISION_BY_ZERO') {
      return {
        success: false,
        error: 'DIVISION_BY_ZERO',
        displayExpression: displayExpr,
        formattedResult: 'Impossible de diviser par zéro !',
      };
    }

    if (evalResult.success && evalResult.result !== undefined) {
      const formattedNum = this.formatNumber(evalResult.result);
      return {
        success: true,
        result: evalResult.result,
        displayExpression: displayExpr,
        formattedResult: `${displayExpr} = **${formattedNum}**`,
      };
    }

    return null;
  }
}
