export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { getSupabase } from "@/lib/server/supabase";

function subscriptionStatusToTier(status: Stripe.Subscription.Status): "free" | "pro" {
  return status === "active" || status === "trialing" || status === "past_due" ? "pro" : "free";
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Billing webhook is not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      let email: string | null = null;
      let stripeSubscriptionId: string | null = null;
      let stripeCustomerId: string | null = null;
      let status: Stripe.Subscription.Status | null = null;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        email = session.customer_details?.email?.trim().toLowerCase() ?? null;
        stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;
        stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
        if (stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          status = subscription.status;
        }
      } else {
        const subscription = event.data.object as Stripe.Subscription;
        stripeSubscriptionId = subscription.id;
        stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
        status = subscription.status;

        if (stripeCustomerId) {
          const customer = await stripe.customers.retrieve(stripeCustomerId);
          if (!("deleted" in customer)) {
            email = customer.email?.trim().toLowerCase() ?? null;
          }
        }
      }

      if (email && status) {
        const tier = subscriptionStatusToTier(status);
        const { error } = await supabase.from("subscriptions").upsert(
          {
            customer_email: email,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            status,
            tier,
            last_event_id: event.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "customer_email" }
        );
        if (error) {
          return NextResponse.json({ error: `Failed persisting subscription: ${error.message}` }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }
}
