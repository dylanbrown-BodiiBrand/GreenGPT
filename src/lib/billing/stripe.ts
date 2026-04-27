import Stripe from "stripe";

export function getStripe(): Stripe | null {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return null;
  return new Stripe(stripeSecretKey);
}
