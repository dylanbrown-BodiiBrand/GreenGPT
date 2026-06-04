export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/billing/stripe";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { isValidEmail } from "@/lib/ehs-calendar/profile";

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
    const body = await req.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Valid email is required.", requestId },
        { status: 400 }
      );
    }

    // Look up the Stripe customer ID from the subscriptions table
    const { data, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, tier")
      .eq("customer_email", email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message, requestId }, { status: 500 });
    }

    if (!data || data.tier === "free") {
      return NextResponse.json(
        { error: "No active subscription found for this email.", requestId },
        { status: 404 }
      );
    }

    if (!data.stripe_customer_id) {
      return NextResponse.json(
        { error: "Subscription record missing Stripe customer ID. Please contact support.", requestId },
        { status: 422 }
      );
    }

    // Create a Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl}/?billing=portal_return`,
    });

    return NextResponse.json({ url: session.url, requestId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unable to open billing portal.", requestId },
      { status: 500 }
    );
  }
}
