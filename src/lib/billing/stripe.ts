import { createHmac, timingSafeEqual } from 'node:crypto';
import { getPlan } from './plans';

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
async function stripeRequest(path: string, params: URLSearchParams) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.message ?? 'Stripe request failed');
  return body;
}
export async function createStripeCheckout(planId: string, userId: string, email: string, interval: 'month' | 'year') {
  const plan = getPlan(planId);
  if (plan.id !== planId || plan.priceMonthly === 0) throw new Error('Invalid paid plan');
  const envName = `STRIPE_PRICE_${planId.toUpperCase()}_${interval === 'month' ? 'MONTHLY' : 'YEARLY'}`;
  const price = process.env[envName];
  if (!price?.startsWith('price_')) throw new Error(`${envName} must be a real Stripe price ID`);
  if (!appUrl()) throw new Error('NEXT_PUBLIC_APP_URL is required');
  const params = new URLSearchParams({ mode: 'subscription', customer_email: email,
    'line_items[0][price]': price, 'line_items[0][quantity]': '1',
    success_url: `${appUrl()}/dashboard/settings?billing=success`,
    cancel_url: `${appUrl()}/dashboard/settings?billing=cancelled`,
    'metadata[userId]': userId, 'metadata[plan]': planId,
    'subscription_data[metadata][userId]': userId, 'subscription_data[metadata][plan]': planId,
  });
  const session = await stripeRequest('checkout/sessions', params);
  return { url: session.url as string };
}
export async function createStripePortal(userId: string) {
  const { prisma } = await import('@/lib/prisma');
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.stripeCustomerId) throw new Error('No Stripe customer found');
  const session = await stripeRequest('billing_portal/sessions', new URLSearchParams({ customer: sub.stripeCustomerId, return_url: `${appUrl()}/dashboard/settings` }));
  return { url: session.url as string };
}
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header || !secret) return false;
  const timestamp = header.match(/(?:^|,)t=(\d+)/)?.[1];
  const signatures = [...header.matchAll(/(?:^|,)v1=([a-f0-9]+)/g)].map(m => m[1]);
  if (!timestamp || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest();
  return signatures.some(sig => {
    if (sig.length !== expected.length * 2) return false;
    return timingSafeEqual(Buffer.from(sig, 'hex'), expected);
  });
}
