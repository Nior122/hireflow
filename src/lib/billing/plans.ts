export interface PlanDefinition {
  id: string;
  name: string;
  tier: "individual" | "business";
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  features: string[];
  limits: {
    applications: number;
    aiRequests: number;
    exports: number;
    candidates: number;
    apiRequests: number;
    teamMembers: number;
    webhooks: number;
  };
}

export const PLANS: PlanDefinition[] = [
  {
    id: "free", name: "Free", tier: "individual", priceMonthly: 0, priceYearly: 0,
    features: ["Kanban Board", "Basic Job Search", "5 Applications", "10 AI Requests/day"],
    limits: { applications: 5, aiRequests: 10, exports: 2, candidates: 0, apiRequests: 0, teamMembers: 1, webhooks: 0 },
  },
  {
    id: "pro", name: "Pro", tier: "individual", priceMonthly: 19, priceYearly: 190, stripePriceIdMonthly: "price_pro_monthly", stripePriceIdYearly: "price_pro_yearly",
    features: ["Unlimited Applications", "Resume Studio", "AI Copilot", "Interview Center", "100 AI Requests/day", "10 Exports/month", "Job Discovery"],
    limits: { applications: -1, aiRequests: 100, exports: 10, candidates: 0, apiRequests: 1000, teamMembers: 1, webhooks: 5 },
  },
  {
    id: "premium", name: "Premium", tier: "individual", priceMonthly: 39, priceYearly: 390, stripePriceIdMonthly: "price_premium_monthly", stripePriceIdYearly: "price_premium_yearly",
    features: ["Everything in Pro", "Unlimited AI", "Unlimited Exports", "Priority Support", "Browser Extension", "Mobile App Premium"],
    limits: { applications: -1, aiRequests: -1, exports: -1, candidates: 0, apiRequests: 5000, teamMembers: 1, webhooks: 20 },
  },
  {
    id: "team", name: "Team", tier: "business", priceMonthly: 79, priceYearly: 790, stripePriceIdMonthly: "price_team_monthly", stripePriceIdYearly: "price_team_yearly",
    features: ["5 Team Members", "ATS Pipeline", "Team Collaboration", "Basic Analytics", "500 AI Requests/day"],
    limits: { applications: -1, aiRequests: 500, exports: 50, candidates: 500, apiRequests: 10000, teamMembers: 5, webhooks: 10 },
  },
  {
    id: "business", name: "Business", tier: "business", priceMonthly: 199, priceYearly: 1990, stripePriceIdMonthly: "price_business_monthly", stripePriceIdYearly: "price_business_yearly",
    features: ["25 Team Members", "Advanced Analytics", "Custom Branding", "Webhooks", "API Access", "Priority Support"],
    limits: { applications: -1, aiRequests: -1, exports: -1, candidates: -1, apiRequests: 50000, teamMembers: 25, webhooks: 50 },
  },
  {
    id: "enterprise", name: "Enterprise", tier: "business", priceMonthly: 0, priceYearly: 0,
    features: ["Unlimited Everything", "SSO/SAML", "Audit Logs", "API Access", "Custom Branding", "Dedicated Support", "SLA", "SLIs"],
    limits: { applications: -1, aiRequests: -1, exports: -1, candidates: -1, apiRequests: -1, teamMembers: -1, webhooks: -1 },
  },
];

export function getPlan(id: string): PlanDefinition {
  return PLANS.find(p => p.id === id) ?? PLANS[0];
}

export function checkLimit(planId: string, feature: string, currentUsage: number): { allowed: boolean; remaining: number } {
  const plan = getPlan(planId);
  const limit = (plan.limits as Record<string, number>)[feature] ?? 0;
  if (limit === -1) return { allowed: true, remaining: -1 };
  if (limit === 0) return { allowed: false, remaining: 0 };
  return { allowed: currentUsage < limit, remaining: Math.max(0, limit - currentUsage) };
}

export const PLAN_LABELS: Record<string, string> = {
  FREE: "Free", PRO: "Pro", PREMIUM: "Premium", TEAM: "Team", BUSINESS: "Business", ENTERPRISE: "Enterprise",
};
