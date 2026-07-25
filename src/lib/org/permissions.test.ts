import { PERMISSIONS } from "./permissions";

describe("Permission System", () => {
  describe("PERMISSIONS", () => {
    it("defines permissions for all critical operations", () => {
      expect(PERMISSIONS["org:manage"]).toBeDefined();
      expect(PERMISSIONS["candidates:manage"]).toBeDefined();
      expect(PERMISSIONS["jobs:manage"]).toBeDefined();
      expect(PERMISSIONS["scorecards:write"]).toBeDefined();
      expect(PERMISSIONS["audit:read"]).toBeDefined();
    });

    it("grants Owner all permissions", () => {
      Object.values(PERMISSIONS).forEach(roles => {
        expect(roles).toContain("OWNER");
      });
    });

    it("limits Viewer to read-only", () => {
      expect(PERMISSIONS["org:manage"]).not.toContain("VIEWER");
      expect(PERMISSIONS["candidates:delete"]).not.toContain("VIEWER");
      expect(PERMISSIONS["jobs:manage"]).not.toContain("VIEWER");
      expect(PERMISSIONS["candidates:read"]).toContain("VIEWER");
      expect(PERMISSIONS["jobs:read"]).toContain("VIEWER");
      expect(PERMISSIONS["scorecards:read"]).toContain("VIEWER");
    });

    it("allows Recruiter to manage candidates and jobs", () => {
      expect(PERMISSIONS["candidates:manage"]).toContain("RECRUITER");
      expect(PERMISSIONS["jobs:manage"]).toContain("RECRUITER");
      expect(PERMISSIONS["candidates:assign"]).toContain("RECRUITER");
    });

    it("limits Hiring Manager to review and schedule", () => {
      expect(PERMISSIONS["candidates:review"]).toContain("HIRING_MANAGER");
      expect(PERMISSIONS["scorecards:write"]).toContain("HIRING_MANAGER");
      expect(PERMISSIONS["interviews:schedule"]).toContain("HIRING_MANAGER");
      expect(PERMISSIONS["candidates:delete"]).not.toContain("HIRING_MANAGER");
    });

    it("limits Interviewer to scorecards and interviews", () => {
      expect(PERMISSIONS["scorecards:write"]).toContain("INTERVIEWER");
      expect(PERMISSIONS["interviews:schedule"]).toContain("INTERVIEWER");
      expect(PERMISSIONS["candidates:manage"]).not.toContain("INTERVIEWER");
    });

    it("Admin has most permissions except delete org", () => {
      expect(PERMISSIONS["org:manage"]).toContain("ADMIN");
      expect(PERMISSIONS["org:delete"]).not.toContain("ADMIN");
      expect(PERMISSIONS["candidates:manage"]).toContain("ADMIN");
      expect(PERMISSIONS["members:invite"]).toContain("ADMIN");
    });
  });
});
