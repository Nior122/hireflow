import { PLANS, getPlan, type PlanDefinition } from "./plans";

export async function createStripeCheckout(planId: string, userId: string, email: string, interval: "month" | "year") {
  const plan = getPlan(planId);
  if (plan.priceMonthly === 0) return { url: null };

  const priceId = interval === "month" ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;
  if (!priceId) return { url: null };

  // In production, this would use the Stripe SDK:
  // const session = await stripe.checkout.sessions.create({
  //   mode: "subscription",
  //   customer_email: email,
  //   line_items: [{ price: priceId, quantity: 1 }],
  //   success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
  //   cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
  //   metadata: { userId },
  // });
  // return { url: session.url };

  return { url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?checkout=${planId}&interval=${interval}` };
}

export async function createStripePortal(userId: string) {
  // In production:
  // const customer = await getOrCreateStripeCustomer(userId);
  // const session = await stripe.billingPortal.sessions.create({ customer });
  // return { url: session.url };

  return { url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing` };
}

export async function handleStripeWebhook(event: string, data: any) {
  // In production, verify webhook signature, then handle:
  // checkout.session.completed → create/update subscription
  // customer.subscription.updated → update subscription status
  // customer.subscription.deleted → mark as canceled
  // invoice.payment_failed → update status
  // invoice.paid → log payment

  console.log(`Stripe webhook: ${event}`);
  return { processed: true };
}
