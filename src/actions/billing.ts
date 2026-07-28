'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { PLANS, getPlan, checkLimit, type PlanDefinition } from "@/lib/billing/plans";
import { getUserOrgRole } from "@/lib/org/permissions";
import type { ActionResponse } from "@/lib/types";

// ─── Subscription Management ───────────────────────────────────

export async function getSubscription(): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    let sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (!sub) {
      sub = await prisma.subscription.create({ data: { userId: user.id, plan: "FREE" } });
    }
    return { success: true, data: { ...sub, planDetails: getPlan(sub.plan) } };
  } catch { return { success: false, error: "Failed" }; }
}

export async function getPlans(): Promise<ActionResponse<PlanDefinition[]>> {
  try {
    return { success: true, data: PLANS };
  } catch { return { success: false, error: "Failed" }; }
}

export async function checkout(planId: string, interval: "month" | "year"): Promise<ActionResponse<{ url: string | null }>> {
  try {
    const user = await createOrGetUser();
    const { createStripeCheckout } = await import("@/lib/billing/stripe");
    const result = await createStripeCheckout(planId, user.id, user.email ?? "", interval);
    return { success: true, data: result };
  } catch { return { success: false, error: "Failed" }; }
}

export async function openBillingPortal(): Promise<ActionResponse<{ url: string | null }>> {
  try {
    const user = await createOrGetUser();
    const { createStripePortal } = await import("@/lib/billing/stripe");
    const result = await createStripePortal(user.id);
    return { success: true, data: result };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Usage Tracking ────────────────────────────────────────────

export async function trackUsage(feature: string, count: number = 1): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.usageRecord.upsert({
      where: { userId_feature_date: { userId: user.id, feature, date: today } } as unknown as { userId_feature_date: { userId: string; feature: string; date: Date } },
      update: { count: { increment: count } },
      create: { userId: user.id, feature, count },
    }).catch(async () => {
      // If unique constraint fails, create new record
      await prisma.usageRecord.create({ data: { userId: user.id, feature, count } });
    });

    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}

export async function getUsage(): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    const plan = getPlan(sub?.plan ?? "FREE");

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const usage = await prisma.usageRecord.findMany({
      where: { userId: user.id, date: { gte: monthStart } },
    });

    const byFeature: Record<string, number> = {};
    usage.forEach((u: { feature: string; count: number }) => {
      byFeature[u.feature] = (byFeature[u.feature] ?? 0) + u.count;
    });

    const usageWithLimits = Object.entries(plan.limits).map(([feature, limit]) => {
      const current = byFeature[feature] ?? 0;
      const { allowed, remaining } = checkLimit(sub?.plan ?? "FREE", feature, current);
      return { feature, current, limit, remaining, allowed };
    });

    return { success: true, data: { plan: sub?.plan ?? "FREE", planDetails: plan, usage: usageWithLimits } };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Feature Flags ─────────────────────────────────────────────

export async function getFeatureFlags(): Promise<ActionResponse<Record<string, boolean>>> {
  try {
    await createOrGetUser();
    const flags = await prisma.featureFlag.findMany();
    const result: Record<string, boolean> = {};
    flags.forEach((f: { name: string; enabled: boolean }) => { result[f.name] = f.enabled; });
    return { success: true, data: result };
  } catch { return { success: false, error: "Failed" }; }
}

export async function isFeatureEnabled(name: string): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({ where: { name } });
    return flag?.enabled ?? false;
  } catch { return false; }
}

export async function toggleFeatureFlag(name: string, enabled: boolean): Promise<ActionResponse<void>> {
  try {
    await prisma.featureFlag.upsert({ where: { name }, update: { enabled }, create: { name, enabled } });
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── API Keys ──────────────────────────────────────────────────

export async function createApiKey(name: string, scopes: string = "read"): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const key = `hf_${crypto.randomUUID()}`;
    const apiKey = await prisma.apiKey.create({
      data: { userId: user.id, name, key, scopes },
    });
    revalidatePath("/dashboard");
    return { success: true, data: apiKey };
  } catch { return { success: false, error: "Failed" }; }
}

export async function listApiKeys(): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: keys.map(k => ({ ...k, key: k.key.slice(0, 8) + "..." })) };
  } catch { return { success: false, error: "Failed" }; }
}

export async function revokeApiKey(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    await prisma.apiKey.updateMany({ where: { id, userId: user.id }, data: { revokedAt: new Date() } });
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Webhooks ──────────────────────────────────────────────────

export async function createWebhook(url: string, events: string[], organizationId?: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    if (organizationId) {
      const role = await getUserOrgRole(user.id, organizationId);
      if (!role) return { success: false, error: "Not a member of this organization" };
    }
    const secret = `whsec_${crypto.randomUUID()}`;
    const webhook = await prisma.webhook.create({ data: { url, secret, events, organizationId: organizationId ?? null } });
    revalidatePath("/dashboard");
    return { success: true, data: webhook };
  } catch { return { success: false, error: "Failed" }; }
}

export async function listWebhooks(): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      select: { organizationId: true },
    });
    const orgIds = memberships.map(m => m.organizationId);
    const hooks = await prisma.webhook.findMany({
      where: {
        OR: [
          { organizationId: { in: orgIds } },
          { organizationId: null },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: hooks };
  } catch { return { success: false, error: "Failed" }; }
}

export async function deleteWebhook(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const webhook = await prisma.webhook.findUnique({ where: { id }, select: { organizationId: true } });
    if (!webhook) return { success: false, error: "Webhook not found" };
    if (webhook.organizationId) {
      const role = await getUserOrgRole(user.id, webhook.organizationId);
      if (!role) return { success: false, error: "Not authorized" };
    }
    await prisma.webhook.delete({ where: { id } });
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}

export async function getWebhookEvents(webhookId: string): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const webhook = await prisma.webhook.findUnique({ where: { id: webhookId }, select: { organizationId: true } });
    if (!webhook) return { success: false, error: "Webhook not found" };
    if (webhook.organizationId) {
      const role = await getUserOrgRole(user.id, webhook.organizationId);
      if (!role) return { success: false, error: "Not authorized" };
    }
    const events = await prisma.webhookEvent.findMany({
      where: { webhookId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { success: true, data: events };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Admin ─────────────────────────────────────────────────────

export async function getAdminStats(): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!membership) return { success: false, error: "Not authorized" };

    const [orgs, users, subscriptions, apiKeys] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.subscription.groupBy({ by: ["plan"] }),
      prisma.apiKey.count({ where: { revokedAt: null } }),
    ]);

    const planCounts: Record<string, number> = {};
    subscriptions.forEach((s: { plan: string; _count: { plan: number } }) => { planCounts[s.plan] = s._count.plan; });

    return {
      success: true,
      data: {
        totalOrganizations: orgs,
        totalUsers: users,
        subscriptionsByPlan: planCounts,
        activeApiKeys: apiKeys,
        totalRevenue: subscriptions.reduce((s, sub) => {
          const plan = getPlan(sub.plan);
          return s + (plan.priceMonthly * sub._count.plan);
        }, 0),
      },
    };
  } catch { return { success: false, error: "Failed" }; }
}
