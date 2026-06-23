'use client'

import { useEffect, useState } from 'react'

interface MenuItem { id: string; name: string; description?: string; price: number }
interface MenuCategory { id: string; name: string; menuItems: MenuItem[] }

// The API serializes Prisma Decimal prices as strings — coerce to numbers
// so `price` is genuinely a number for arithmetic and `.toFixed()`.
const normalizePrices = (data: MenuCategory[]): MenuCategory[] =>
  data.map(c => ({
    ...c,
    menuItems: c.menuItems.map(i => ({ ...i, price: Number(i.price) })),
  }))

export default function MenuPreviewSection() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/tenant/demo-restaurant`)
      .then(r => r.json())
      .then((data: MenuCategory[]) => {
        const normalized = normalizePrices(data)
        setCategories(normalized)
        if (normalized.length > 0) setActiveCategory(normalized[0].id)
      })
      .catch(() => {
        // Fallback to placeholder data when API not running
        const placeholder: MenuCategory[] = [
          {
            id: '1', name: 'Starters', menuItems: [
              { id: '1a', name: 'Garlic Bread', description: 'Toasted ciabatta with garlic butter', price: 9 },
              { id: '1b', name: 'Calamari', description: 'Crispy fried squid with aioli', price: 16 },
            ],
          },
          {
            id: '2', name: 'Mains', menuItems: [
              { id: '2a', name: 'Beef Burger', description: '200g beef patty, cheddar, chips', price: 24 },
              { id: '2b', name: 'Grilled Salmon', description: 'Atlantic salmon, seasonal veg', price: 32 },
            ],
          },
        ]
        setCategories(placeholder)
        setActiveCategory('1')
      })
  }, [])

  const active = categories.find(c => c.id === activeCategory)

  return (
    <section id="menu" className="py-24 px-6 bg-stone-950">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-red-400 text-sm uppercase tracking-widest mb-4">What We Offer</p>
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
            Our Menu
          </h2>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-red-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu items grid */}
        {active && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {active.menuItems.map(item => (
              <div
                key={item.id}
                className="bg-stone-900 border border-stone-800 rounded-xl p-6 hover:border-red-600/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-white font-semibold text-lg">{item.name}</h3>
                  <span className="text-red-400 font-bold text-lg ml-2 shrink-0">
                    ${item.price.toFixed(2)}
                  </span>
                </div>
                {item.description && (
                  <p className="text-stone-400 text-sm leading-relaxed">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <a
            href="/menu"
            className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            View Full Menu →
          </a>
        </div>
      </div>
    </section>
  )
}
