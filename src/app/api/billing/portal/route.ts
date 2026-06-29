export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { getStripe } from "@/lib/billing/stripe";
import { hasProAccess } from "@/lib/billing/tier";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!stripe || !appUrl) {
    return NextResponse.json(
      { error: "Billing is not configured.", requestId },
      { status: 503 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database is not configured.", requestId },
      { status: 503 }
    );
  }

  try {
    const user = await requireSessionUser();
    await req.json().catch(() => ({}));

    const { data, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, tier")
      .eq("customer_email", user.email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Unable to open billing portal.", requestId }, { status: 500 });
    }

    if (!data || !hasProAccess(data.tier)) {
      return NextResponse.json(
        { error: "No active subscription found for your account.", requestId },
        { status: 404 }
      );
    }

    if (!data.stripe_customer_id) {
      return NextResponse.json(
        { error: "Subscription record missing Stripe customer ID. Please contact support.", requestId },
        { status: 422 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl}/?billing=portal_return`,
    });

    return NextResponse.json({ url: session.url, requestId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to open billing portal.";
    return NextResponse.json(
      { error: message, requestId },
      { status: httpStatusFromError(err, 500) }
    );
  }
}
