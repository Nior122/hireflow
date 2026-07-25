import {
  stripHtml,
  sanitizeInput,
  isValidUrl,
  isAllowedDomain,
  sanitizeFilename,
  truncate,
  slugify,
  validateLength,
  detectSqlInjection,
} from "./sanitize";

describe("Sanitization Utilities", () => {
  describe("stripHtml", () => {
    it("removes HTML tags", () => {
      expect(stripHtml("<p>Hello</p>")).toBe("Hello");
      expect(stripHtml("<div><span>Test</span></div>")).toBe("Test");
    });

    it("decodes HTML entities", () => {
      expect(stripHtml("&amp;")).toBe("&");
      expect(stripHtml("&lt;")).toBe("<");
      expect(stripHtml("&gt;")).toBe(">");
    });

    it("handles empty input", () => {
      expect(stripHtml("")).toBe("");
      expect(stripHtml(null as any)).toBe("");
    });

    it("normalizes whitespace", () => {
      expect(stripHtml("Hello   World")).toBe("Hello World");
      expect(stripHtml("<p>Hello</p> <p>World</p>")).toBe("Hello World");
    });

    it("strips script tags", () => {
      expect(stripHtml('<script>alert("xss")</script>Hello')).toBe("Hello");
    });
  });

  describe("sanitizeInput", () => {
    it("escapes HTML entities", () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toContain("&lt;");
      expect(sanitizeInput('"onmouseover="alert(1)')).toContain("&quot;");
    });

    it("escapes quotes", () => {
      expect(sanitizeInput("It's a test")).toContain("&#x27;");
    });

    it("handles empty input", () => {
      expect(sanitizeInput("")).toBe("");
    });
  });

  describe("isValidUrl", () => {
    it("accepts valid HTTPS URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("https://app.hireflow.com/dashboard")).toBe(true);
    });

    it("accepts valid HTTP URLs", () => {
      expect(isValidUrl("http://example.com")).toBe(true);
    });

    it("rejects non-HTTP protocols", () => {
      expect(isValidUrl("ftp://example.com")).toBe(false);
      expect(isValidUrl("file:///etc/passwd")).toBe(false);
      expect(isValidUrl("javascript:alert(1)")).toBe(false);
    });

    it("blocks SSRF targets", () => {
      expect(isValidUrl("http://localhost:3000")).toBe(false);
      expect(isValidUrl("http://127.0.0.1")).toBe(false);
      expect(isValidUrl("http://169.254.169.254")).toBe(false);
      expect(isValidUrl("http://metadata.google.internal")).toBe(false);
    });

    it("blocks IP addresses", () => {
      expect(isValidUrl("http://192.168.1.1")).toBe(false);
      expect(isValidUrl("http://10.0.0.1")).toBe(false);
    });

    it("rejects invalid URLs", () => {
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUrl("")).toBe(false);
    });
  });

  describe("isAllowedDomain", () => {
    it("allows listed domains", () => {
      expect(isAllowedDomain("https://linkedin.com/jobs/123", ["linkedin.com"])).toBe(true);
      expect(isAllowedDomain("https://www.linkedin.com/jobs/123", ["linkedin.com"])).toBe(true);
    });

    it("blocks unlisted domains", () => {
      expect(isAllowedDomain("https://evil.com/phish", ["linkedin.com"])).toBe(false);
    });
  });

  describe("sanitizeFilename", () => {
    it("removes unsafe characters", () => {
      expect(sanitizeFilename("my file.pdf")).toBe("my_file.pdf");
      expect(sanitizeFilename("file (copy).pdf")).toBe("file_copy_.pdf");
    });

    it("limits length", () => {
      expect(sanitizeFilename("a".repeat(300)).length).toBeLessThanOrEqual(255);
    });
  });

  describe("truncate", () => {
    it("does not truncate short strings", () => {
      expect(truncate("Hello", 10)).toBe("Hello");
    });

    it("truncates long strings with ellipsis", () => {
      expect(truncate("Hello World", 8)).toBe("Hello...");
    });
  });

  describe("slugify", () => {
    it("creates valid slug", () => {
      expect(slugify("Hello World")).toBe("hello-world");
      expect(slugify("Acme Corp Inc.")).toBe("acme-corp-inc");
    });

    it("removes special characters", () => {
      expect(slugify("Hello! @#$% World")).toBe("hello-world");
    });

    it("truncates long slugs", () => {
      expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(100);
    });
  });

  describe("validateLength", () => {
    it("returns null for valid length", () => {
      expect(validateLength("Hello", 1, 10, "Field")).toBeNull();
    });

    it("returns error for too short", () => {
      expect(validateLength("Hi", 3, 10, "Field")).toContain("at least 3");
    });

    it("returns error for too long", () => {
      expect(validateLength("Hello World", 1, 5, "Field")).toContain("at most 5");
    });
  });

  describe("detectSqlInjection", () => {
    it("detects SQL keywords", () => {
      expect(detectSqlInjection("SELECT * FROM users")).toBe(true);
      expect(detectSqlInjection("'; DROP TABLE users; --")).toBe(true);
      expect(detectSqlInjection("1 OR '1'='1")).toBe(true);
    });

    it("allows normal text", () => {
      expect(detectSqlInjection("Hello World")).toBe(false);
      expect(detectSqlInjection("john@example.com")).toBe(false);
    });
  });
});
