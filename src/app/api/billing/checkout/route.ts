export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/billing/stripe";
import { isValidEmail } from "@/lib/ehs-calendar/profile";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!stripe || !priceId || !appUrl) {
    return NextResponse.json(
      { error: "Billing is not configured (STRIPE_SECRET_KEY / STRIPE_PRO_PRICE_ID / NEXT_PUBLIC_APP_URL).", requestId },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const email = isValidEmail(emailRaw) ? emailRaw : undefined;
    const successUrl = `${appUrl}/?billing=success`;
    const cancelUrl = `${appUrl}/?billing=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        source: "ehs_calendar",
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout session.", requestId }, { status: 500 });
    }

    console.info(`[billing.checkout] requestId=${requestId} sessionId=${session.id} email=${email ?? "none"}`);
    return NextResponse.json({ url: session.url, requestId });
  } catch {
    return NextResponse.json({ error: "Unable to start checkout.", requestId }, { status: 500 });
  }
}
