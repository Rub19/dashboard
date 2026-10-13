import {
  createRateLimiter,
  consumeAuthAttempt,
  resetAuthAttempt,
} from "./rate-limiter";

describe("rate-limiter", () => {
  describe("createRateLimiter", () => {
    it("autorise les appels dans la limite configurée", () => {
      const currentTime = 1000;
      const limiter = createRateLimiter({ now: () => currentTime });
      const policy = { limit: 3, windowMs: 10_000, blockMs: 5_000 };

      const res1 = limiter.consume("user1", policy);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);
      expect(res1.retryAfterMs).toBe(0);

      const res2 = limiter.consume("user1", policy);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = limiter.consume("user1", policy);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      const res4 = limiter.consume("user1", policy);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.retryAfterMs).toBe(5000);
    });

    it("maintient le blocage pendant la durée blockMs", () => {
      let currentTime = 5000;
      const limiter = createRateLimiter({ now: () => currentTime });
      const policy = { limit: 1, windowMs: 1000, blockMs: 3000 };

      limiter.consume("user2", policy);
      const blocked = limiter.consume("user2", policy);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterMs).toBe(3000);

      currentTime += 1000;
      const stillBlocked = limiter.consume("user2", policy);
      expect(stillBlocked.allowed).toBe(false);
      expect(stillBlocked.retryAfterMs).toBe(2000);

      currentTime += 2001;
      const unblocked = limiter.consume("user2", policy);
      expect(unblocked.allowed).toBe(true);
      expect(unblocked.remaining).toBe(0);
    });

    it("réinitialise le compteur lorsque la fenêtre temporelle expire", () => {
      let currentTime = 0;
      const limiter = createRateLimiter({ now: () => currentTime });
      const policy = { limit: 2, windowMs: 5000, blockMs: 1000 };

      limiter.consume("user3", policy);
      currentTime += 6000;
      const res = limiter.consume("user3", policy);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(1);
    });

    it("permet de supprimer une clé via reset", () => {
      const limiter = createRateLimiter();
      const policy = { limit: 1, windowMs: 60_000, blockMs: 60_000 };

      limiter.consume("user4", policy);
      expect(limiter.consume("user4", policy).allowed).toBe(false);

      expect(limiter.reset("user4")).toBe(true);
      expect(limiter.consume("user4", policy).allowed).toBe(true);
    });

    it("permet de tout effacer via destroy", () => {
      const limiter = createRateLimiter();
      limiter.consume("k1");
      limiter.consume("k2");
      expect(limiter.size()).toBe(2);
      limiter.destroy();
      expect(limiter.size()).toBe(0);
    });

    it("normalise les bornes des paramètres de politique", () => {
      const limiter = createRateLimiter();
      const resMin = limiter.consume("boundary-min", { limit: -10, windowMs: 10, blockMs: 10 });
      expect(resMin.allowed).toBe(true);
      expect(resMin.remaining).toBe(0);

      const resMax = limiter.consume("boundary-max", { limit: 9999, windowMs: 999_999_999, blockMs: 999_999_999 });
      expect(resMax.allowed).toBe(true);
      expect(resMax.remaining).toBe(99);
    });

    it("utilise le comportement par défaut si Date.now n'est pas fourni", () => {
      const limiter = createRateLimiter();
      const res = limiter.consume("real-time");
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4);
    });
  });

  describe("consumeAuthAttempt et resetAuthAttempt", () => {
    const scope = "testAuthScope";
    const identity = "Alice@Example.COM";

    afterEach(() => {
      resetAuthAttempt(scope, identity);
    });

    it("formate correctement la clé en minuscules et applique la limitation", () => {
      const res1 = consumeAuthAttempt(scope, identity);
      expect(res1.key).toBe("testAuthScope:alice@example.com");
      expect(res1.allowed).toBe(true);

      resetAuthAttempt(scope, identity);
      const res2 = consumeAuthAttempt(scope, identity);
      expect(res2.remaining).toBe(4);
    });

    it("gère l'identité absente en utilisant anonymous", () => {
      const res = consumeAuthAttempt("login", "");
      expect(res.key).toBe("login:anonymous");
      resetAuthAttempt("login", "");
    });
  });
});
