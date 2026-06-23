'use client'

import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

interface Props {
  total: number
  onSuccess: (paymentIntentId: string) => void
}

// Inner form — must be rendered inside an <Elements> provider so the
// Stripe hooks have a context. The PaymentElement automatically offers
// cards plus Apple Pay / Google Pay (when the device/browser supports
// them) and handles 3-D Secure verification.
export default function StripePaymentForm({ total, onSuccess }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      // Keep the customer on-page unless the bank requires a redirect (3DS).
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message || 'Payment failed. Please check your card details.')
      setProcessing(false)
      return
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id)
      return
    }

    setError('Payment could not be completed. Please try again.')
    setProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-stone-700 text-white font-semibold rounded-full transition-colors text-lg"
      >
        {processing ? 'Processing…' : `Pay $${total.toFixed(2)}`}
      </button>

      <p className="text-center text-xs text-stone-500">
        Payments are securely processed by Stripe. Your card details never touch our servers.
      </p>
    </form>
  )
}
