import {
  deterministicClassify,
  extractEmailBody,
  inferCompanyAndRole,
  parseEmailAddress,
  parseJsonFromLlm,
  safeBase64UrlDecode,
  safeParseClassification,
  shouldUseIncrementalSync,
} from "./email-utils";

describe("deterministicClassify", () => {
  it("classifies interview emails", () => {
    const result = deterministicClassify("Interview invitation to schedule a phone screen");
    expect(result.category).toBe("INTERVIEWS");
    expect(result.interviewRelated).toBe(true);
    expect(result.jobRelated).toBe(true);
  });

  it("classifies rejections", () => {
    const result = deterministicClassify("Unfortunately we are not moving forward");
    expect(result.category).toBe("REJECTIONS");
    expect(result.rejectionRelated).toBe(true);
  });

  it("classifies offers", () => {
    const result = deterministicClassify("We are pleased to offer you this employment offer");
    expect(result.category).toBe("OFFERS");
    expect(result.offerRelated).toBe(true);
  });

  it("classifies application receipts", () => {
    const result = deterministicClassify("Thank you for applying — we received your application");
    expect(result.category).toBe("APPLICATIONS");
    expect(result.applicationRelated).toBe(true);
  });

  it("classifies job opportunities", () => {
    const result = deterministicClassify("Exciting role: we are hiring a developer to join our team");
    expect(result.category).toBe("JOB_OPPORTUNITY");
    expect(result.jobRelated).toBe(true);
  });

  it("falls back to OTHER for unrelated mail", () => {
    const result = deterministicClassify("Your package has shipped");
    expect(result.category).toBe("OTHER");
    expect(result.jobRelated).toBe(false);
  });
});

describe("parseEmailAddress", () => {
  it("splits name and angle-bracket email", () => {
    expect(parseEmailAddress("Jane Doe <jane@acme.com>")).toEqual({
      name: "Jane Doe",
      email: "jane@acme.com",
    });
  });

  it("handles a bare address", () => {
    expect(parseEmailAddress("jane@acme.com")).toEqual({
      name: "jane@acme.com",
      email: "jane@acme.com",
    });
  });
});

describe("inferCompanyAndRole", () => {
  it("prefers extracted values", () => {
    expect(inferCompanyAndRole("Acme", "Engineer", "Hello", "X", "x@y.com")).toEqual({
      company: "Acme",
      role: "Engineer",
    });
  });

  it("infers company from subject 'at Company'", () => {
    const result = inferCompanyAndRole(null, null, "Interview at Stripe", null, null);
    expect(result.company).toBe("Stripe");
  });

  it("infers company from a non-consumer email domain", () => {
    const result = inferCompanyAndRole(null, null, "Hello", null, "jobs@notion.so");
    expect(result.company).toBe("Notion");
  });
});

describe("extractEmailBody", () => {
  it("decodes nested multipart bodies and strips html", () => {
    const html = Buffer.from("<p>Hello <b>world</b></p>").toString("base64url");
    const body = extractEmailBody({
      parts: [
        { mimeType: "text/html", body: { data: html } },
        { parts: [{ body: { data: Buffer.from("plain").toString("base64url") } }] },
      ],
    });
    expect(body).toContain("Hello world");
    expect(body).toContain("plain");
    expect(body).not.toContain("<p>");
  });
});

describe("safeBase64UrlDecode", () => {
  it("decodes url-safe base64", () => {
    expect(safeBase64UrlDecode(Buffer.from("hi").toString("base64url"))).toBe("hi");
  });

  it("returns empty string for garbage", () => {
    expect(safeBase64UrlDecode("!!!")).toBe("");
  });
});

describe("parseJsonFromLlm", () => {
  it("extracts JSON from markdown fences", () => {
    expect(parseJsonFromLlm("```json\n{\"category\":\"OTHER\"}\n```")).toEqual({ category: "OTHER" });
  });
});

describe("safeParseClassification", () => {
  it("fills defaults for a partial object", () => {
    const result = safeParseClassification({ category: "APPLICATIONS", confidence: 0.8 });
    expect(result.category).toBe("APPLICATIONS");
    expect(result.applicationRelated).toBe(true);
    expect(result.jobRelated).toBe(true);
    expect(result.urgency).toBe(0);
  });

  it("does not throw on invalid LLM payloads", () => {
    const result = safeParseClassification({ category: "nope", confidence: "hot" });
    expect(result.category).toBe("OTHER");
  });
});

describe("shouldUseIncrementalSync", () => {
  it("uses history only when emails were previously stored", () => {
    expect(shouldUseIncrementalSync({ historyId: "123", storedEmailCount: 10 })).toBe(true);
  });

  it("falls back to full sync when the inbox is empty despite a historyId", () => {
    expect(shouldUseIncrementalSync({ historyId: "123", storedEmailCount: 0 })).toBe(false);
  });

  it("respects forceFullSync", () => {
    expect(shouldUseIncrementalSync({ historyId: "123", storedEmailCount: 10, forceFullSync: true })).toBe(false);
  });

  it("does a full sync when there is no history cursor", () => {
    expect(shouldUseIncrementalSync({ historyId: null, storedEmailCount: 5 })).toBe(false);
  });
});
