import {
  createApplicationSchema,
  updateApplicationSchema,
  jobSearchSchema,
  emailSchema,
  urlSchema,
  createOrganizationSchema,
  inviteMemberSchema,
  scorecardSchema,
  createWebhookSchema,
  paginationSchema,
} from "./schemas";

describe("Validation Schemas", () => {
  describe("emailSchema", () => {
    it("validates correct email", () => {
      expect(emailSchema.safeParse("test@example.com").success).toBe(true);
    });

    it("rejects invalid email", () => {
      expect(emailSchema.safeParse("not-an-email").success).toBe(false);
      expect(emailSchema.safeParse("@missing.com").success).toBe(false);
      expect(emailSchema.safeParse("missing@").success).toBe(false);
    });
  });

  describe("urlSchema", () => {
    it("validates correct URL", () => {
      expect(urlSchema.safeParse("https://example.com").success).toBe(true);
    });

    it("allows empty string", () => {
      expect(urlSchema.safeParse("").success).toBe(true);
    });

    it("rejects invalid URL", () => {
      expect(urlSchema.safeParse("not-a-url").success).toBe(false);
    });
  });

  describe("paginationSchema", () => {
    it("applies defaults correctly", () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it("validates custom values", () => {
      const result = paginationSchema.safeParse({ page: 5, limit: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(50);
      }
    });

    it("rejects invalid values", () => {
      expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
      expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
    });
  });

  describe("createApplicationSchema", () => {
    it("validates complete application", () => {
      const result = createApplicationSchema.safeParse({
        company: "Google",
        role: "Software Engineer",
        status: "APPLIED",
      });
      expect(result.success).toBe(true);
    });

    it("requires company and role", () => {
      expect(createApplicationSchema.safeParse({}).success).toBe(false);
      expect(createApplicationSchema.safeParse({ company: "Google" }).success).toBe(false);
      expect(createApplicationSchema.safeParse({ role: "Engineer" }).success).toBe(false);
    });

    it("trims whitespace", () => {
      const result = createApplicationSchema.safeParse({
        company: "  Google  ",
        role: "  Software Engineer  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.company).toBe("Google");
        expect(result.data.role).toBe("Software Engineer");
      }
    });

    it("rejects overly long values", () => {
      const result = createApplicationSchema.safeParse({
        company: "a".repeat(201),
        role: "Engineer",
      });
      expect(result.success).toBe(false);
    });

    it("validates status enum", () => {
      expect(createApplicationSchema.safeParse({
        company: "Google",
        role: "Engineer",
        status: "INTERVIEW",
      }).success).toBe(true);

      expect(createApplicationSchema.safeParse({
        company: "Google",
        role: "Engineer",
        status: "INVALID",
      }).success).toBe(false);
    });
  });

  describe("jobSearchSchema", () => {
    it("validates search with keyword", () => {
      const result = jobSearchSchema.safeParse({ keyword: "react" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.remote).toBe("any");
        expect(result.data.sort).toBe("newest");
      }
    });

    it("validates all remote options", () => {
      ["any", "remote", "hybrid", "onsite"].forEach(remote => {
        expect(jobSearchSchema.safeParse({ keyword: "test", remote }).success).toBe(true);
      });
    });

    it("requires keyword", () => {
      expect(jobSearchSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("createOrganizationSchema", () => {
    it("validates correct organization", () => {
      const result = createOrganizationSchema.safeParse({
        name: "Acme Corp",
        slug: "acme-corp",
      });
      expect(result.success).toBe(true);
    });

    it("validates slug format", () => {
      expect(createOrganizationSchema.safeParse({ name: "Test", slug: "valid-slug" }).success).toBe(true);
      expect(createOrganizationSchema.safeParse({ name: "Test", slug: "INVALID SLUG" }).success).toBe(false);
      expect(createOrganizationSchema.safeParse({ name: "Test", slug: "valid_slug" }).success).toBe(false);
    });
  });

  describe("inviteMemberSchema", () => {
    it("validates invitation", () => {
      const result = inviteMemberSchema.safeParse({
        email: "test@example.com",
        role: "ADMIN",
      });
      expect(result.success).toBe(true);
    });

    it("defaults role to VIEWER", () => {
      const result = inviteMemberSchema.safeParse({ email: "test@example.com" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("VIEWER");
      }
    });
  });

  describe("scorecardSchema", () => {
    it("validates complete scorecard", () => {
      const result = scorecardSchema.safeParse({
        technicalScore: 85,
        communicationScore: 90,
        recommendation: "HIRE",
      });
      expect(result.success).toBe(true);
    });

    it("requires recommendation", () => {
      expect(scorecardSchema.safeParse({}).success).toBe(false);
    });

    it("validates recommendation enum", () => {
      const validRecommendations = ["STRONG_HIRE", "HIRE", "NEUTRAL", "NO_HIRE", "STRONG_NO_HIRE"];
      validRecommendations.forEach(rec => {
        expect(scorecardSchema.safeParse({ recommendation: rec }).success).toBe(true);
      });
      expect(scorecardSchema.safeParse({ recommendation: "MAYBE" }).success).toBe(false);
    });

    it("validates score ranges", () => {
      expect(scorecardSchema.safeParse({ recommendation: "HIRE", technicalScore: 101 }).success).toBe(false);
      expect(scorecardSchema.safeParse({ recommendation: "HIRE", technicalScore: -1 }).success).toBe(false);
      expect(scorecardSchema.safeParse({ recommendation: "HIRE", technicalScore: 50 }).success).toBe(true);
    });
  });

  describe("createWebhookSchema", () => {
    it("validates correct webhook", () => {
      const result = createWebhookSchema.safeParse({
        url: "https://example.com/webhook",
        events: ["candidate.created"],
      });
      expect(result.success).toBe(true);
    });

    it("requires URL and events", () => {
      expect(createWebhookSchema.safeParse({}).success).toBe(false);
      expect(createWebhookSchema.safeParse({ url: "https://example.com" }).success).toBe(false);
      expect(createWebhookSchema.safeParse({ events: ["test"] }).success).toBe(false);
    });

    it("rejects invalid URL", () => {
      expect(createWebhookSchema.safeParse({
        url: "not-a-url",
        events: ["test"],
      }).success).toBe(false);
    });
  });

  describe("updateApplicationSchema", () => {
    it("allows partial updates", () => {
      expect(updateApplicationSchema.safeParse({ company: "Google" }).success).toBe(true);
      expect(updateApplicationSchema.safeParse({ status: "INTERVIEW" }).success).toBe(true);
      expect(updateApplicationSchema.safeParse({}).success).toBe(true);
    });
  });
});
