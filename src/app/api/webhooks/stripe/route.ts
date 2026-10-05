import { NextRequest } from "next/server";
import { verifyStripeSignature } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET ?? "")) return Response.json({ error: "Invalid signature" }, { status: 400 });
    const body = JSON.parse(raw);
    const event = body.type;
    const data = body.data?.object;

    // In production: verify Stripe signature here
    // const sig = req.headers.get("stripe-signature");
    // const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    switch (event) {
      case "checkout.session.completed":
        if (data?.metadata?.userId && data?.subscription) {
          await prisma.subscription.upsert({
            where: { userId: data.metadata.userId },
            create: { userId: data.metadata.userId, stripeSubId: data.subscription, stripeCustomerId: data.customer, plan: data.metadata.plan?.toUpperCase() ?? "PRO", status: "ACTIVE" },
            update: { stripeSubId: data.subscription, stripeCustomerId: data.customer, plan: data.metadata.plan?.toUpperCase() ?? "PRO", status: "ACTIVE" },
          });
        }
        break;

      case "customer.subscription.updated":
        if (data?.id) {
          const statusMap: Record<string, string> = { active: "ACTIVE", past_due: "PAST_DUE", canceled: "CANCELED", trialing: "TRIALING" };
          await prisma.subscription.updateMany({
            where: { stripeSubId: data.id },
            data: { status: (statusMap[data.status as string] ?? "ACTIVE") as "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED" | "TRIALING" },
          });
        }
        break;

      case "customer.subscription.deleted":
        if (data?.id) {
          await prisma.subscription.updateMany({
            where: { stripeSubId: data.id },
            data: { status: "CANCELED", plan: "FREE" },
          });
        }
        break;

      case "invoice.payment_failed":
        if (data?.subscription) {
          await prisma.subscription.updateMany({
            where: { stripeSubId: data.subscription },
            data: { status: "PAST_DUE" },
          });
        }
        break;

      case "invoice.paid":
        // Log successful payment
        break;
    }

    return Response.json({ received: true });
  } catch (e) {
    console.error("Stripe webhook error:", e);
    return Response.json({ error: "Webhook failed" }, { status: 500 });
  }
}
