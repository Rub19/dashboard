import {
  evaluateCurrencyExpression,
  evaluateMathExpression,
  evaluateCalculation,
  CURRENCY_RATES_FROM_EUR,
} from "./instant-calc";

describe("instant-calc", () => {
  describe("evaluateCurrencyExpression", () => {
    it("converts EUR to USD correctly", () => {
      const res = evaluateCurrencyExpression("50 EUR en USD");
      expect(res).not.toBeNull();
      expect(res?.type).toBe("currency");
      expect(res?.result).toBeCloseTo(50 * CURRENCY_RATES_FROM_EUR.USD, 2);
      expect(res?.formatted).toContain("USD");
    });

    it("converts USD in EUR correctly", () => {
      const res = evaluateCurrencyExpression("100 USD in EUR");
      expect(res).not.toBeNull();
      expect(res?.type).toBe("currency");
      expect(res?.result).toBeCloseTo(100 / CURRENCY_RATES_FROM_EUR.USD, 2);
      expect(res?.formatted).toContain("EUR");
    });

    it("converts GBP to EUR correctly", () => {
      const res = evaluateCurrencyExpression("25 GBP en EUR");
      expect(res).not.toBeNull();
      expect(res?.type).toBe("currency");
      expect(res?.result).toBeCloseTo(25 / CURRENCY_RATES_FROM_EUR.GBP, 2);
    });

    it("handles currency symbols like € and $", () => {
      const res = evaluateCurrencyExpression("10 € to $");
      expect(res).not.toBeNull();
      expect(res?.result).toBeCloseTo(10 * CURRENCY_RATES_FROM_EUR.USD, 2);
    });

    it("handles JPY formatting as integer", () => {
      const res = evaluateCurrencyExpression("10 EUR en JPY");
      expect(res).not.toBeNull();
      expect(res?.formatted).toMatch(/1[\s\u202f]?645 JPY/);
    });

    it("returns null for non-currency strings or invalid currencies", () => {
      expect(evaluateCurrencyExpression("hello world")).toBeNull();
      expect(evaluateCurrencyExpression("10 FOO en BAR")).toBeNull();
      expect(evaluateCurrencyExpression("/sound rain")).toBeNull();
    });
  });

  describe("evaluateMathExpression", () => {
    it("computes basic operations with correct precedence", () => {
      expect(evaluateMathExpression("2 + 3 * 4")?.result).toBe(14);
      expect(evaluateMathExpression("(2 + 3) * 4")?.result).toBe(20);
      expect(evaluateMathExpression("100 - 45")?.result).toBe(55);
      expect(evaluateMathExpression("42 / 2")?.result).toBe(21);
    });

    it("computes powers and square roots", () => {
      expect(evaluateMathExpression("2 ^ 8")?.result).toBe(256);
      expect(evaluateMathExpression("sqrt(144)")?.result).toBe(12);
    });

    it("computes percentage forms", () => {
      expect(evaluateMathExpression("20% of 150")?.result).toBe(30);
      expect(evaluateMathExpression("200 * 15%")?.result).toBe(30);
    });

    it("returns null for syntax errors or non-math strings", () => {
      expect(evaluateMathExpression("42")).toBeNull();
      expect(evaluateMathExpression("hello")).toBeNull();
      expect(evaluateMathExpression("/rain")).toBeNull();
    });
  });

  describe("evaluateCalculation", () => {
    it("dispatches to currency or math dynamically", () => {
      const curr = evaluateCalculation("50 EUR en USD");
      expect(curr?.type).toBe("currency");

      const math = evaluateCalculation("15 * 4");
      expect(math?.type).toBe("math");
      expect(math?.result).toBe(60);

      expect(evaluateCalculation("random query")).toBeNull();
    });
  });
});
