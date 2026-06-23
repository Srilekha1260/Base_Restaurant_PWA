import { loadStripe, Stripe } from '@stripe/stripe-js'

const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

// loadStripe must be called once at module scope (never inside render).
// If the publishable key isn't configured yet, this is null and the UI
// shows a "payment not configured" message instead of crashing.
export const stripePromise: Promise<Stripe | null> | null = key ? loadStripe(key) : null

export const isStripeConfigured = Boolean(key)
