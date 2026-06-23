'use client'

import { useEffect, useState } from 'react'
import { UtensilsCrossed, ShoppingBag, Truck } from 'lucide-react'

interface TenantConfig {
  deliveryEnabled: boolean
  deliveryRedirectUrl?: string
  deliveryButtonLabel?: string
}

export default function OrderOptionsSection() {
  const [tenant, setTenant] = useState<TenantConfig>({
    deliveryEnabled: true,
    deliveryRedirectUrl: '',
    deliveryButtonLabel: 'Order on Uber Eats',
  })

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenants/slug/demo-restaurant`)
      .then(r => r.json())
      .then(data => setTenant(data))
      .catch(() => {})
  }, [])

  const options = [
    {
      icon: <UtensilsCrossed className="w-10 h-10" />,
      title: 'Dine In',
      description: 'Reserve a table and enjoy a full dining experience with table service.',
      cta: 'Reserve a Table',
      href: '#booking',
      external: false,
      available: true,
    },
    {
      icon: <ShoppingBag className="w-10 h-10" />,
      title: 'Takeaway',
      description: 'Order online and pick up your meal fresh from our kitchen.',
      cta: 'Order Takeaway',
      href: '/takeaway',
      external: false,
      available: true,
    },
    {
      icon: <Truck className="w-10 h-10" />,
      title: 'Delivery',
      description: 'Get our food delivered straight to your door.',
      cta: 'Order Delivery',
      href: '/takeaway?type=delivery',
      external: false,
      available: tenant.deliveryEnabled,
    },
  ]

  return (
    <section id="order" className="py-24 px-6 bg-stone-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-red-400 text-sm uppercase tracking-widest mb-4">How to Enjoy</p>
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
            Order Your Way
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {options.map(option => (
            <div
              key={option.title}
              className="bg-stone-800 border border-stone-700 rounded-2xl p-8 flex flex-col items-center text-center hover:border-red-600 transition-colors group"
            >
              <div className="text-red-500 mb-6 group-hover:scale-110 transition-transform">
                {option.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{option.title}</h3>
              <p className="text-stone-400 mb-8 flex-1">{option.description}</p>

              {option.available ? (
                option.external ? (
                  <a
                    href={option.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-full transition-colors"
                  >
                    {option.cta}
                  </a>
                ) : (
                  <a
                    href={option.href}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-full transition-colors"
                  >
                    {option.cta}
                  </a>
                )
              ) : (
                <span className="w-full py-3 bg-stone-700 text-stone-500 font-medium rounded-full text-center cursor-not-allowed">
                  Coming Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
