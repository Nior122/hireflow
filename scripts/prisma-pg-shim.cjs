const { Pool } = require("pg");
const { randomBytes } = require("crypto");

function cuid() {
  return "c" + Date.now().toString(36) + randomBytes(8).toString("hex");
}

const TABLES = {
  user: "User",
  subscription: "Subscription",
  apiKey: "ApiKey",
  webhook: "Webhook",
  webhookEvent: "WebhookEvent",
  usageRecord: "UsageRecord",
  featureFlag: "FeatureFlag",
  organizationSetting: "OrganizationSetting",
  organization: "Organization",
  organizationMember: "OrganizationMember",
  organizationInvitation: "OrganizationInvitation",
  jobPosting: "JobPosting",
  teamComment: "TeamComment",
  candidateScorecard: "CandidateScorecard",
  auditLog: "AuditLog",
  resume: "Resume",
  resumeSection: "ResumeSection",
  resumeVersion: "ResumeVersion",
  coverLetter: "CoverLetter",
  conversation: "Conversation",
  conversationMessage: "ConversationMessage",
  gmailToken: "GmailToken",
  jobApplication: "JobApplication",
  reminder: "Reminder",
  activityLog: "ActivityLog",
  candidate: "Candidate",
  emailTemplate: "EmailTemplate",
  aiReply: "AiReply",
  candidateActivity: "CandidateActivity",
  calendarConnection: "CalendarConnection",
  savedJob: "SavedJob",
  interview: "Interview",
  interviewPractice: "InterviewPractice",
  interviewQuestion: "InterviewQuestion",
  interviewNote: "InterviewNote",
  aIUserProfile: "AIUserProfile",
  emailMessage: "EmailMessage",
  discoveredJob: "DiscoveredJob",
  aIUserMemory: "AIUserMemory",
  followUpAction: "FollowUpAction",
  recruiterContact: "RecruiterContact",
  careerReminder: "CareerReminder",
};

function q(name) {
  return `"${String(name).replace(/"/g, "")}"`;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
}

function compileWhere(where, params) {
  if (!where || Object.keys(where).length === 0) return "TRUE";
  const parts = [];
  for (const [key, value] of Object.entries(where)) {
    if (key === "OR" && Array.isArray(value)) {
      const inner = value.map((w) => `(${compileWhere(w, params)})`).join(" OR ");
      parts.push(`(${inner || "TRUE"})`);
      continue;
    }
    if (key === "AND" && Array.isArray(value)) {
      const inner = value.map((w) => `(${compileWhere(w, params)})`).join(" AND ");
      parts.push(`(${inner || "TRUE"})`);
      continue;
    }
    if (value === null) {
      parts.push(`${q(key)} IS NULL`);
      continue;
    }
    if (isPlainObject(value)) {
      if ("equals" in value) {
        if (value.equals === null) {
          parts.push(`${q(key)} IS NULL`);
        } else if (value.mode === "insensitive") {
          params.push(value.equals);
          parts.push(`LOWER(${q(key)}) = LOWER($${params.length})`);
        } else {
          params.push(value.equals);
          parts.push(`${q(key)} = $${params.length}`);
        }
      } else if ("in" in value) {
        const list = value.in || [];
        if (list.length === 0) {
          parts.push("FALSE");
        } else {
          const ph = list.map((item) => {
            params.push(item);
            return `$${params.length}`;
          });
          parts.push(`${q(key)} IN (${ph.join(", ")})`);
        }
      } else if ("gt" in value || "gte" in value || "lt" in value || "lte" in value) {
        if (value.gt !== undefined) {
          params.push(value.gt);
          parts.push(`${q(key)} > $${params.length}`);
        }
        if (value.gte !== undefined) {
          params.push(value.gte);
          parts.push(`${q(key)} >= $${params.length}`);
        }
        if (value.lt !== undefined) {
          params.push(value.lt);
          parts.push(`${q(key)} < $${params.length}`);
        }
        if (value.lte !== undefined) {
          params.push(value.lte);
          parts.push(`${q(key)} <= $${params.length}`);
        }
      } else if ("not" in value) {
        if (value.not === null) parts.push(`${q(key)} IS NOT NULL`);
        else {
          params.push(value.not);
          parts.push(`${q(key)} <> $${params.length}`);
        }
      } else {
        // compound unique object used as where — flatten
        parts.push(`(${compileWhere(value, params)})`);
      }
      continue;
    }
    params.push(value);
    parts.push(`${q(key)} = $${params.length}`);
  }
  return parts.join(" AND ") || "TRUE";
}

function compileOrder(orderBy) {
  if (!orderBy) return "";
  const list = Array.isArray(orderBy) ? orderBy : [orderBy];
  const bits = list.map((item) => {
    const [k, dir] = Object.entries(item)[0];
    return `${q(k)} ${String(dir).toUpperCase() === "DESC" ? "DESC" : "ASC"}`;
  });
  return bits.length ? ` ORDER BY ${bits.join(", ")}` : "";
}

function scalars(data = {}) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (isPlainObject(v) && ("connect" in v || "create" in v || "connectOrCreate" in v)) continue;
    out[k] = v instanceof Date ? v : v;
  }
  return out;
}

function model(pool, table) {
  return {
    async findMany(args = {}) {
      const params = [];
      const where = compileWhere(args.where, params);
      let sql = `SELECT * FROM ${q(table)} WHERE ${where}${compileOrder(args.orderBy)}`;
      if (args.take) sql += ` LIMIT ${Number(args.take)}`;
      if (args.skip) sql += ` OFFSET ${Number(args.skip)}`;
      const { rows } = await pool.query(sql, params);
      return rows;
    },
    async findFirst(args = {}) {
      const rows = await this.findMany({ ...args, take: 1 });
      return rows[0] ?? null;
    },
    async findUnique(args = {}) {
      return this.findFirst(args);
    },
    async count(args = {}) {
      const params = [];
      const where = compileWhere(args.where, params);
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM ${q(table)} WHERE ${where}`, params);
      return rows[0].c;
    },
    async create(args = {}) {
      const data = scalars(args.data);
      if (!data.id) data.id = cuid();
      const keys = Object.keys(data);
      const params = keys.map((k) => data[k]);
      const cols = keys.map(q).join(", ");
      const ph = keys.map((_, i) => `$${i + 1}`).join(", ");
      const { rows } = await pool.query(
        `INSERT INTO ${q(table)} (${cols}) VALUES (${ph}) RETURNING *`,
        params
      );
      return rows[0];
    },
    async update(args = {}) {
      const data = scalars(args.data);
      const keys = Object.keys(data);
      if (keys.length === 0) return this.findFirst({ where: args.where });
      const params = [];
      const sets = keys.map((k) => {
        params.push(data[k]);
        return `${q(k)} = $${params.length}`;
      });
      const where = compileWhere(args.where, params);
      const { rows } = await pool.query(
        `UPDATE ${q(table)} SET ${sets.join(", ")} WHERE ${where} RETURNING *`,
        params
      );
      return rows[0] ?? null;
    },
    async updateMany(args = {}) {
      const data = scalars(args.data);
      const keys = Object.keys(data);
      if (keys.length === 0) return { count: 0 };
      const params = [];
      const sets = keys.map((k) => {
        params.push(data[k]);
        return `${q(k)} = $${params.length}`;
      });
      const where = compileWhere(args.where, params);
      const res = await pool.query(`UPDATE ${q(table)} SET ${sets.join(", ")} WHERE ${where}`, params);
      return { count: res.rowCount ?? 0 };
    },
    async upsert(args = {}) {
      const existing = await this.findFirst({ where: args.where });
      if (existing) {
        const updated = await this.update({ where: { id: existing.id }, data: args.update });
        return updated ?? existing;
      }
      return this.create({ data: { ...scalars(args.create) } });
    },
    async deleteMany(args = {}) {
      const params = [];
      const where = compileWhere(args.where, params);
      const res = await pool.query(`DELETE FROM ${q(table)} WHERE ${where}`, params);
      return { count: res.rowCount ?? 0 };
    },
    async groupBy(args = {}) {
      const params = [];
      const where = compileWhere(args.where, params);
      const by = args.by || [];
      const cols = by.map(q).join(", ");
      const sql = `SELECT ${cols}, COUNT(*)::int AS "_count" FROM ${q(table)} WHERE ${where} GROUP BY ${cols}`;
      const { rows } = await pool.query(sql, params);
      return rows.map((r) => ({ ...r, _count: r._count }));
    },
  };
}

class PrismaClient {
  constructor() {
    this._pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        if (typeof prop !== "string") return undefined;
        const table = TABLES[prop];
        if (!table) return undefined;
        return model(target._pool, table);
      },
    });
  }
  async $disconnect() {
    await this._pool.end();
  }
  async $connect() {}
  async $transaction(ops) {
    if (Array.isArray(ops)) return Promise.all(ops);
    return ops(this);
  }
}

const Prisma = {
  JsonNull: null,
  DbNull: null,
  AnyNull: null,
  prismaVersion: { client: "7.8.0-shim" },
};

module.exports = { PrismaClient, Prisma };
module.exports.PrismaClient = PrismaClient;
module.exports.Prisma = Prisma;
module.exports.default = { PrismaClient, Prisma };
