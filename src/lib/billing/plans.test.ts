import { PLANS, getPlan, checkLimit } from "./plans";

describe("Billing Plans", () => {
  describe("PLANS", () => {
    it("contains all 6 plan tiers", () => {
      expect(PLANS).toHaveLength(6);
      expect(PLANS.map(p => p.id)).toEqual(["free", "pro", "premium", "team", "business", "enterprise"]);
    });

    it("has correct pricing structure", () => {
      const freePlan = getPlan("free");
      expect(freePlan.priceMonthly).toBe(0);
      expect(freePlan.priceYearly).toBe(0);

      const proPlan = getPlan("pro");
      expect(proPlan.priceMonthly).toBe(19);
      expect(proPlan.priceYearly).toBe(190);
    });

    it("has correct tiers", () => {
      expect(getPlan("free").tier).toBe("individual");
      expect(getPlan("pro").tier).toBe("individual");
      expect(getPlan("premium").tier).toBe("individual");
      expect(getPlan("team").tier).toBe("business");
      expect(getPlan("business").tier).toBe("business");
      expect(getPlan("enterprise").tier).toBe("business");
    });
  });

  describe("getPlan", () => {
    it("returns correct plan", () => {
      expect(getPlan("pro").name).toBe("Pro");
      expect(getPlan("enterprise").name).toBe("Enterprise");
    });

    it("returns free plan for unknown id", () => {
      expect(getPlan("unknown").id).toBe("free");
    });
  });

  describe("checkLimit", () => {
    it("allows unlimited features (-1 limit)", () => {
      const result = checkLimit("pro", "applications", 1000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
    });

    it("rejects when at limit", () => {
      const result = checkLimit("free", "applications", 5);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("allows when under limit", () => {
      const result = checkLimit("free", "applications", 3);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("blocks features not included in plan", () => {
      const result = checkLimit("free", "candidates", 0);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("returns -1 remaining for unlimited", () => {
      const result = checkLimit("enterprise", "apiRequests", 0);
      expect(result.remaining).toBe(-1);
    });
  });
});
