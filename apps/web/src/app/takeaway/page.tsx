'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Minus, X, CheckCircle, ChevronDown, Banknote, CreditCard, Wifi } from 'lucide-react'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { Elements } from '@stripe/react-stripe-js'
import type { Appearance } from '@stripe/stripe-js'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import StripePaymentForm from '@/components/checkout/StripePaymentForm'
import { stripePromise, isStripeConfigured } from '@/lib/stripe'

interface CartItem { id: string; name: string; price: number; quantity: number }
interface MenuItem { id: string; name: string; description?: string; price: number }
interface MenuCategory { id: string; name: string; menuItems: MenuItem[] }

const API = process.env.NEXT_PUBLIC_API_URL
const TENANT_SLUG = 'demo-restaurant'

// The API serializes Prisma Decimal prices as strings — coerce to numbers.
const normalizePrices = (data: MenuCategory[]): MenuCategory[] =>
  data.map(c => ({
    ...c,
    menuItems: c.menuItems.map(i => ({ ...i, price: Number(i.price) })),
  }))

const FALLBACK: MenuCategory[] = [
  { id: '1', name: 'Starters', menuItems: [
    { id: '1a', name: 'Garlic Bread', description: 'Toasted ciabatta with garlic butter', price: 9 },
    { id: '1b', name: 'Calamari', description: 'Crispy fried squid with aioli', price: 16 },
    { id: '1c', name: 'Bruschetta', description: 'Tomato, basil, olive oil on grilled bread', price: 12 },
  ]},
  { id: '2', name: 'Mains', menuItems: [
    { id: '2a', name: 'Beef Burger', description: '200g beef patty, cheddar, chips', price: 24 },
    { id: '2b', name: 'Grilled Salmon', description: 'Atlantic salmon, seasonal veg', price: 32 },
    { id: '2c', name: 'Margherita Pizza', description: 'Tomato, mozzarella, fresh basil', price: 22 },
    { id: '2d', name: 'Chicken Schnitzel', description: 'Crumbed chicken, chips, salad', price: 26 },
  ]},
  { id: '3', name: 'Desserts', menuItems: [
    { id: '3a', name: 'Chocolate Fondant', description: 'Warm chocolate cake, vanilla ice cream', price: 14 },
    { id: '3b', name: 'Crème Brûlée', description: 'Classic French custard, caramelised sugar', price: 12 },
  ]},
]

type Step = 'menu' | 'details' | 'payment' | 'success'
type PaymentMethod = 'CASH' | 'CARD_EFTPOS' | 'CARD_STRIPE'

const stripeAppearance: Appearance = {
  theme: 'night',
  variables: { colorPrimary: '#dc2626', colorBackground: '#1c1917', borderRadius: '12px' },
}

export default function TakeawayPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('takeaway_cart') || '[]') } catch { return [] }
  })
  const [activeCategory, setActiveCategory] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [step, setStep] = useState<Step>('menu')
  const [submitting, setSubmitting] = useState(false)
  const [orderRef, setOrderRef] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [orderType, setOrderType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [error, setError] = useState('')

  // Online-payment state (Stripe)
  const [clientSecret, setClientSecret] = useState('')
  const [placedOrderId, setPlacedOrderId] = useState('')
  const [placedTotal, setPlacedTotal] = useState(0)

  useEffect(() => {
    localStorage.setItem('takeaway_cart', JSON.stringify(cart))
  }, [cart])

  // Allow linking straight into delivery mode, e.g. from the home page CTA.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('type') === 'delivery') {
      setOrderType('DELIVERY')
    }
  }, [])

  useEffect(() => {
    fetch(`${API}/menu/tenant/${TENANT_SLUG}`)
      .then(r => r.json())
      .then((data: MenuCategory[]) => {
        const normalized = normalizePrices(data)
        setCategories(normalized)
        if (normalized.length) setActiveCategory(normalized[0].id)
      })
      .catch(() => {
        setCategories(FALLBACK)
        setActiveCategory(FALLBACK[0].id)
      })
  }, [])

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id))
  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0))
  }

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
  const gst = total - total / 1.15
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)
  const active = categories.find(c => c.id === activeCategory)

  const phoneValid = Boolean(form.phone) && isValidPhoneNumber(form.phone)

  const resetCheckout = () => {
    setForm({ name: '', phone: '', email: '', notes: '' })
    setAddress('')
    setPaymentMethod('CASH')
    setClientSecret('')
    setPlacedOrderId('')
    setPlacedTotal(0)
    setError('')
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phoneValid) { setError('Please enter a valid mobile number.'); return }
    if (orderType === 'DELIVERY' && !address.trim()) { setError('Please enter your delivery address.'); return }
    if (paymentMethod === 'CARD_STRIPE' && !isStripeConfigured) {
      setError('Online card payment is not configured yet. Please choose Cash or EFTPOS, or contact us.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API}/public/takeaway/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: TENANT_SLUG,
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: form.email,
          notes: form.notes || undefined,
          orderType,
          deliveryAddress: orderType === 'DELIVERY' ? address.trim() : undefined,
          paymentMethod,
          items: cart.map(c => ({ menuItemId: c.id, quantity: c.quantity })),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'We could not place your order. Please try again.')
      }

      const data = await res.json() as {
        orderId: string; orderRef: string; total: number; requiresOnlinePayment: boolean
      }

      if (data.requiresOnlinePayment) {
        // Create the Stripe PaymentIntent and move to the secure payment step.
        const intentRes = await fetch(`${API}/public/takeaway/order/${data.orderId}/payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!intentRes.ok) throw new Error('Could not start the payment. Please try again.')
        const intent = await intentRes.json() as { clientSecret: string }
        setPlacedOrderId(data.orderId)
        setPlacedTotal(data.total)
        setClientSecret(intent.clientSecret)
        setOrderRef(data.orderRef)
        setStep('payment')
      } else {
        // Cash / EFTPOS — confirmed immediately, pay on pickup.
        setOrderRef(data.orderRef)
        setStep('success')
        setCart([])
        setCartOpen(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      await fetch(`${API}/public/takeaway/order/${placedOrderId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
      })
    } catch {
      // Payment already succeeded with Stripe; the webhook will finalize the
      // order even if this confirmation call fails. Still show success.
    }
    setStep('success')
    setCart([])
    setCartOpen(false)
  }

  // ─── Success screen ───────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="text-center max-w-md">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-3">Order Placed!</h1>
            <p className="text-stone-400 mb-2">Your order reference is</p>
            <p className="text-4xl font-mono font-bold text-red-400 mb-6">{orderRef}</p>
            <p className="text-stone-400 text-sm mb-10">
              Thank you, {form.name}! A confirmation has been sent to {form.email}.{' '}
              {orderType === 'DELIVERY'
                ? `Your order is being prepared and will be delivered to ${address} shortly.`
                : 'Your order is being prepared and will be ready for collection shortly.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { setStep('menu'); resetCheckout() }}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-full transition-colors"
              >
                Order Again
              </button>
              <a href="/" className="px-8 py-3 bg-stone-800 hover:bg-stone-700 text-white font-medium rounded-full transition-colors text-center">
                Back to Home
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ─── Online payment screen (Stripe Payment Element) ───────────────────────
  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-24">
          <button onClick={() => setStep('details')} className="text-stone-400 hover:text-white text-sm flex items-center gap-1 mb-8">
            ← Back to details
          </button>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>Payment</h1>
          <p className="text-stone-400 mb-8 text-sm">Order {orderRef} · Pay securely to confirm.</p>

          {clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
              <StripePaymentForm total={placedTotal} onSuccess={handlePaymentSuccess} />
            </Elements>
          ) : (
            <p className="text-red-400 text-sm">Online payment is not available right now.</p>
          )}
        </div>
        <Footer />
      </div>
    )
  }

  // ─── Details / checkout screen ────────────────────────────────────────────
  if (step === 'details') {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-24">
          <button onClick={() => setStep('menu')} className="text-stone-400 hover:text-white text-sm flex items-center gap-1 mb-8">
            ← Back to menu
          </button>
          <h1 className="text-3xl font-bold text-white mb-8" style={{ fontFamily: 'Georgia, serif' }}>Confirm Your Order</h1>

          {/* Order summary */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 mb-8">
            <h2 className="text-white font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-stone-300">{item.quantity}× {item.name}</span>
                  <span className="text-stone-400">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-700 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-stone-400">
                <span>GST (15%)</span>
                <span>${gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-white text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer details form */}
          <form onSubmit={handlePlaceOrder} className="space-y-5">
            <div>
              <label className="block text-stone-400 text-sm mb-2">Your Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-400 text-sm mb-2">Mobile Number *</label>
              <PhoneInput
                international
                defaultCountry="NZ"
                countryCallingCodeEditable={false}
                value={form.phone}
                onChange={(value) => setForm(f => ({ ...f, phone: value || '' }))}
                placeholder="21 123 4567"
                className="phone-input-dark"
              />
              {form.phone && !phoneValid && (
                <p className="text-xs text-red-400 mt-1">Enter a valid mobile number for the selected country.</p>
              )}
            </div>
            <div>
              <label className="block text-stone-400 text-sm mb-2">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none"
              />
              <p className="text-xs text-stone-500 mt-1">We&apos;ll email your order confirmation here.</p>
            </div>
            {orderType === 'DELIVERY' && (
              <div>
                <label className="block text-stone-400 text-sm mb-2">Delivery Address *</label>
                <textarea
                  required
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street address, suburb, city"
                  rows={2}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none resize-none"
                />
              </div>
            )}
            <div>
              <label className="block text-stone-400 text-sm mb-2">Special Requests</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Allergies, dietary requirements..."
                rows={3}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none resize-none"
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-stone-400 text-sm mb-3">Payment Method *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'CASH' as const, label: 'Cash', sub: orderType === 'DELIVERY' ? 'Pay the driver' : 'Pay at counter', icon: <Banknote size={22} /> },
                  { id: 'CARD_EFTPOS' as const, label: 'EFTPOS', sub: orderType === 'DELIVERY' ? 'Pay on delivery' : 'Pay on pickup', icon: <Wifi size={22} /> },
                  { id: 'CARD_STRIPE' as const, label: 'Card Online', sub: 'Visa / Mastercard / Apple Pay', icon: <CreditCard size={22} /> },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === opt.id
                        ? 'border-red-500 bg-red-950/30 text-white'
                        : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-500 hover:text-white'
                    }`}
                  >
                    <span className={paymentMethod === opt.id ? 'text-red-400' : ''}>{opt.icon}</span>
                    <span className="font-semibold text-sm">{opt.label}</span>
                    <span className="text-xs text-stone-500 text-center">{opt.sub}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'CASH' && (
                <p className="mt-3 text-xs text-stone-500">Please have the exact amount ready — <span className="text-white font-medium">${total.toFixed(2)}</span></p>
              )}
              {paymentMethod === 'CARD_EFTPOS' && (
                <p className="mt-3 text-xs text-stone-500">
                  {orderType === 'DELIVERY'
                    ? 'The driver will bring an EFTPOS terminal.'
                    : 'EFTPOS terminal available at the counter when you collect.'}
                </p>
              )}
              {paymentMethod === 'CARD_STRIPE' && (
                <p className="mt-3 text-xs text-stone-500">You&apos;ll enter your card securely on the next step.</p>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-stone-700 text-white font-semibold rounded-full transition-colors text-lg"
            >
              {submitting
                ? 'Placing Order...'
                : paymentMethod === 'CARD_STRIPE'
                  ? `Continue to Payment · $${total.toFixed(2)}`
                  : `Place Order · $${total.toFixed(2)}`}
            </button>
          </form>
        </div>
        <Footer />
      </div>
    )
  }

  // ─── Main menu screen ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Navbar />

      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'Georgia, serif' }}>Order Online</h1>
        <p className="text-stone-400 mb-6 text-sm sm:text-base">
          {orderType === 'DELIVERY' ? 'Get it delivered to your door.' : 'Build your order and collect from our kitchen.'}
        </p>

        {/* Pickup / Delivery toggle */}
        <div className="inline-flex p-1 bg-stone-900 border border-stone-800 rounded-full mb-8">
          {([
            { id: 'PICKUP' as const, label: 'Pickup' },
            { id: 'DELIVERY' as const, label: 'Delivery' },
          ]).map(opt => (
            <button
              key={opt.id}
              onClick={() => setOrderType(opt.id)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                orderType === opt.id ? 'bg-red-600 text-white' : 'text-stone-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Category tabs — scrollable on mobile */}
        <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id ? 'bg-red-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex gap-8 lg:gap-10">
          {/* Menu items */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pb-32 lg:pb-0">
              {active?.menuItems.map(item => {
                const inCart = cart.find(c => c.id === item.id)
                return (
                  <div key={item.id} className="bg-stone-900 border border-stone-800 rounded-xl p-4 sm:p-5 flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm sm:text-base leading-snug">{item.name}</h3>
                      {item.description && <p className="text-stone-500 text-xs sm:text-sm mt-1 leading-relaxed">{item.description}</p>}
                      <p className="text-red-400 font-bold mt-2 text-sm sm:text-base">${Number(item.price).toFixed(2)}</p>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-stone-700 hover:bg-stone-600 rounded-full transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="text-white font-bold w-5 text-center text-sm">{inCart.quantity}</span>
                        <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Desktop cart sidebar */}
          <div className="w-80 hidden lg:block flex-shrink-0">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <ShoppingCart size={20} className="text-red-400" /> Your Order
                {cartCount > 0 && (
                  <span className="ml-auto bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </h2>

              {cart.length === 0 ? (
                <p className="text-stone-500 text-sm text-center py-8">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-3 mb-6 max-h-72 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-stone-700 rounded-full hover:bg-stone-600 transition-colors flex-shrink-0"><Minus size={12} /></button>
                        <span className="text-white w-4 text-center text-sm flex-shrink-0">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-stone-700 rounded-full hover:bg-stone-600 transition-colors flex-shrink-0"><Plus size={12} /></button>
                        <span className="text-stone-300 text-sm flex-1 min-w-0 truncate">{item.name}</span>
                        <span className="text-red-400 text-sm font-medium flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-stone-600 hover:text-red-400 transition-colors flex-shrink-0"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-stone-700 pt-4 mb-6">
                    <div className="flex justify-between text-stone-400 text-sm mb-1">
                      <span>GST (15%)</span>
                      <span>${gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep('details')}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full transition-colors"
                  >
                    Checkout · ${total.toFixed(2)}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky cart bar */}
      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
          {/* Cart drawer */}
          {cartOpen && (
            <div className="bg-stone-900 border-t border-stone-700 px-4 pt-4 pb-2 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Your Order</h3>
                <button onClick={() => setCartOpen(false)} className="text-stone-400 hover:text-white">
                  <ChevronDown size={20} />
                </button>
              </div>
              <div className="space-y-3 mb-4">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-stone-700 rounded-full flex-shrink-0"><Minus size={12} /></button>
                    <span className="text-white w-5 text-center text-sm flex-shrink-0">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-stone-700 rounded-full flex-shrink-0"><Plus size={12} /></button>
                    <span className="text-stone-300 text-sm flex-1 min-w-0">{item.name}</span>
                    <span className="text-red-400 text-sm font-medium flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-stone-500 hover:text-red-400 flex-shrink-0"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="border-t border-stone-700 pt-3 mb-3">
                <div className="flex justify-between text-stone-400 text-sm mb-1">
                  <span>GST (15%)</span><span>${gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-bold">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom bar */}
          <div className="bg-stone-900 border-t border-stone-700 px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setCartOpen(o => !o)}
              className="flex items-center gap-2 text-stone-300 hover:text-white transition-colors"
            >
              <div className="relative">
                <ShoppingCart size={22} />
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <span className="text-sm font-medium">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
            </button>
            <button
              onClick={() => setStep('details')}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full transition-colors text-sm"
            >
              Checkout · ${total.toFixed(2)}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
