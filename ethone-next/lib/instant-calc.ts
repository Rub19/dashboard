export interface CalculationResult {
  type: "math" | "currency";
  expression: string;
  result: number;
  formatted: string;
  detail?: string;
}

export const CURRENCY_RATES_FROM_EUR: Record<string, number> = {
  EUR: 1.0,
  USD: 1.085,
  GBP: 0.855,
  JPY: 164.5,
  CAD: 1.482,
  CHF: 0.958,
  AUD: 1.662,
  CNY: 7.84,
};

export const CURRENCY_ALIASES: Record<string, string> = {
  EUR: "EUR",
  EURO: "EUR",
  EUROS: "EUR",
  "€": "EUR",
  USD: "USD",
  DOLLAR: "USD",
  DOLLARS: "USD",
  "$": "USD",
  GBP: "GBP",
  LIVRE: "GBP",
  LIVRES: "GBP",
  POUND: "GBP",
  POUNDS: "GBP",
  "£": "GBP",
  JPY: "JPY",
  YEN: "JPY",
  YENS: "JPY",
  "¥": "JPY",
  CAD: "CAD",
  CHF: "CHF",
  AUD: "AUD",
  CNY: "CNY",
};

export function evaluateCurrencyExpression(raw: string): CalculationResult | null {
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed.startsWith("/")) return null;

  const pattern = /^([\d\s.,]+)?\s*([a-zA-Z€$£¥]{1,6})\s*(?:en|in|to|vers|=|->)\s*([a-zA-Z€$£¥]{1,6})$/i;
  const match = trimmed.match(pattern);
  if (!match) return null;

  const rawAmount = match[1] ? match[1].replace(/\s+/g, "").replace(",", ".") : "1";
  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount < 0) return null;

  const fromCode = CURRENCY_ALIASES[match[2].toUpperCase()] || match[2].toUpperCase();
  const toCode = CURRENCY_ALIASES[match[3].toUpperCase()] || match[3].toUpperCase();

  const rateFrom = CURRENCY_RATES_FROM_EUR[fromCode];
  const rateTo = CURRENCY_RATES_FROM_EUR[toCode];

  if (!rateFrom || !rateTo) return null;

  const amountInEur = amount / rateFrom;
  const converted = amountInEur * rateTo;

  const formattedValue = toCode === "JPY"
    ? Math.round(converted).toLocaleString("fr-FR")
    : converted.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatted = `${formattedValue} ${toCode}`;
  const rateRatio = (rateTo / rateFrom).toFixed(4).replace(/\.?0+$/, "");
  const detail = `1 ${fromCode} = ${rateRatio} ${toCode} • Taux indicatif`;

  return {
    type: "currency",
    expression: trimmed,
    result: converted,
    formatted,
    detail,
  };
}

export function evaluateMathExpression(raw: string): { expression: string; result: number; formatted: string } | null {
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.startsWith("/")) return null;

  const clean = trimmed.replace(/\s*=\s*$/, "");

  const percentMatch = clean.match(/^([\d.,]+)\s*%\s*(?:of|de|\*)\s*([\d.,]+)$/i);
  if (percentMatch) {
    const p = parseFloat(percentMatch[1].replace(",", "."));
    const total = parseFloat(percentMatch[2].replace(",", "."));
    if (!isNaN(p) && !isNaN(total)) {
      const res = (p / 100) * total;
      const formatted = Number.isInteger(res) ? String(res) : res.toFixed(4).replace(/\.?0+$/, "");
      return { expression: trimmed, result: res, formatted };
    }
  }

  const percentMatch2 = clean.match(/^([\d.,]+)\s*\*\s*([\d.,]+)\s*%$/i);
  if (percentMatch2) {
    const total = parseFloat(percentMatch2[1].replace(",", "."));
    const p = parseFloat(percentMatch2[2].replace(",", "."));
    if (!isNaN(p) && !isNaN(total)) {
      const res = (p / 100) * total;
      const formatted = Number.isInteger(res) ? String(res) : res.toFixed(4).replace(/\.?0+$/, "");
      return { expression: trimmed, result: res, formatted };
    }
  }

  const sqrtMatch = clean.match(/^sqrt\s*\(\s*([\d.,]+)\s*\)$/i);
  if (sqrtMatch) {
    const val = parseFloat(sqrtMatch[1].replace(",", "."));
    if (!isNaN(val) && val >= 0) {
      const res = Math.sqrt(val);
      const formatted = Number.isInteger(res) ? String(res) : res.toFixed(4).replace(/\.?0+$/, "");
      return { expression: trimmed, result: res, formatted };
    }
  }

  const normalized = clean
    .replace(/[xX]/g, "*")
    .replace(/÷/g, "/")
    .replace(/,/g, ".")
    .replace(/\s+/g, "");

  if (!/^[\d+\-*/^().]+$/.test(normalized)) return null;
  if (!/[+\-*/^]/.test(normalized)) return null;

  try {
    let pos = 0;
    const parseNumber = (): number => {
      const start = pos;
      while (pos < normalized.length && (/\d/.test(normalized[pos]) || normalized[pos] === ".")) {
        pos++;
      }
      const numStr = normalized.substring(start, pos);
      const val = parseFloat(numStr);
      if (isNaN(val)) throw new Error("nan");
      return val;
    };

    const parseFactor = (): number => {
      if (pos >= normalized.length) throw new Error("end");
      let sign = 1;
      if (normalized[pos] === "-") {
        sign = -1;
        pos++;
      } else if (normalized[pos] === "+") {
        pos++;
      }
      if (normalized[pos] === "(") {
        pos++;
        const val = parseExpression();
        if (normalized[pos] !== ")") throw new Error("paren");
        pos++;
        return sign * val;
      }
      return sign * parseNumber();
    };

    const parsePower = (): number => {
      let val = parseFactor();
      while (pos < normalized.length && normalized[pos] === "^") {
        pos++;
        const next = parseFactor();
        val = Math.pow(val, next);
      }
      return val;
    };

    const parseTerm = (): number => {
      let val = parsePower();
      while (pos < normalized.length && (normalized[pos] === "*" || normalized[pos] === "/" || normalized[pos] === "%")) {
        const op = normalized[pos];
        pos++;
        const next = parsePower();
        if (op === "*") val *= next;
        else if (op === "/") {
          if (next === 0) throw new Error("divzero");
          val /= next;
        } else if (op === "%") val %= next;
      }
      return val;
    };

    const parseExpression = (): number => {
      let val = parseTerm();
      while (pos < normalized.length && (normalized[pos] === "+" || normalized[pos] === "-")) {
        const op = normalized[pos];
        pos++;
        const next = parseTerm();
        if (op === "+") val += next;
        else if (op === "-") val -= next;
      }
      return val;
    };

    const result = parseExpression();
    if (pos === normalized.length && isFinite(result)) {
      const formatted = Number.isInteger(result) ? String(result) : result.toFixed(4).replace(/\.?0+$/, "");
      return { expression: trimmed, result, formatted };
    }
    return null;
  } catch {
    return null;
  }
}

export function evaluateCalculation(raw: string): CalculationResult | null {
  const currencyResult = evaluateCurrencyExpression(raw);
  if (currencyResult) return currencyResult;

  const math = evaluateMathExpression(raw);
  if (math) return { type: "math", ...math };

  return null;
}
