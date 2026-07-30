import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.type;
    const data = body.data?.object;

    // In production: verify Stripe signature here
    // const sig = req.headers.get("stripe-signature");
    // const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    switch (event) {
      case "checkout.session.completed":
        if (data?.metadata?.userId && data?.subscription) {
          await prisma.subscription.update({
            where: { userId: data.metadata.userId },
            data: { stripeSubId: data.subscription, status: "ACTIVE" },
          }).catch(() => {});
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
