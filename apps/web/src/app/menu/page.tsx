'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

interface MenuItem { id: string; name: string; description?: string; price: number; isAvailable: boolean }
interface MenuCategory { id: string; name: string; menuItems: MenuItem[] }

const FALLBACK: MenuCategory[] = [
  { id: '1', name: 'Starters', menuItems: [
    { id: '1a', name: 'Garlic Bread', description: 'Toasted ciabatta with garlic butter', price: 9, isAvailable: true },
    { id: '1b', name: 'Calamari', description: 'Crispy fried squid with aioli', price: 16, isAvailable: true },
    { id: '1c', name: 'Bruschetta', description: 'Tomato, basil, olive oil on grilled bread', price: 12, isAvailable: true },
    { id: '1d', name: 'Soup of the Day', description: 'Ask your waiter for today\'s selection', price: 11, isAvailable: true },
  ]},
  { id: '2', name: 'Mains', menuItems: [
    { id: '2a', name: 'Beef Burger', description: '200g beef patty, cheddar, lettuce, tomato, chips', price: 24, isAvailable: true },
    { id: '2b', name: 'Grilled Salmon', description: 'Atlantic salmon, seasonal veg, lemon butter', price: 32, isAvailable: true },
    { id: '2c', name: 'Margherita Pizza', description: 'Tomato base, mozzarella, fresh basil', price: 22, isAvailable: true },
    { id: '2d', name: 'Chicken Schnitzel', description: 'Crumbed chicken, chips, salad', price: 26, isAvailable: true },
    { id: '2e', name: 'Mushroom Risotto', description: 'Arborio rice, wild mushrooms, parmesan', price: 23, isAvailable: true },
    { id: '2f', name: 'Eye Fillet Steak', description: '200g eye fillet, chips, seasonal veg, sauce', price: 42, isAvailable: true },
  ]},
  { id: '3', name: 'Sides', menuItems: [
    { id: '3a', name: 'Chips', description: 'Seasoned crispy fries', price: 8, isAvailable: true },
    { id: '3b', name: 'Garden Salad', description: 'Mixed greens, cherry tomato, vinaigrette', price: 9, isAvailable: true },
    { id: '3c', name: 'Steamed Vegetables', description: 'Seasonal vegetables', price: 8, isAvailable: true },
  ]},
  { id: '4', name: 'Desserts', menuItems: [
    { id: '4a', name: 'Chocolate Fondant', description: 'Warm chocolate cake, vanilla ice cream', price: 14, isAvailable: true },
    { id: '4b', name: 'Crème Brûlée', description: 'Classic French custard, caramelised sugar', price: 12, isAvailable: true },
    { id: '4c', name: 'Pavlova', description: 'Meringue, fresh cream, seasonal berries', price: 13, isAvailable: true },
  ]},
  { id: '5', name: 'Drinks', menuItems: [
    { id: '5a', name: 'Soft Drink', description: 'Coke, Sprite, Fanta, L&P', price: 5, isAvailable: true },
    { id: '5b', name: 'Juice', description: 'Orange, apple, or cranberry', price: 6, isAvailable: true },
    { id: '5c', name: 'Sparkling Water', description: '500ml bottle', price: 5, isAvailable: true },
    { id: '5d', name: 'House Wine (Glass)', description: 'Red or white, ask for today\'s selection', price: 12, isAvailable: true },
  ]},
]

// The API serializes Prisma Decimal prices as strings — coerce to numbers.
const normalizePrices = (data: MenuCategory[]): MenuCategory[] =>
  data.map(c => ({
    ...c,
    menuItems: c.menuItems.map(i => ({ ...i, price: Number(i.price) })),
  }))

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [isFallback, setIsFallback] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/tenant/demo-restaurant`)
      .then(r => { if (!r.ok) throw new Error('not ok'); return r.json() })
      .then((data: MenuCategory[]) => {
        const normalized = normalizePrices(data)
        setCategories(normalized)
        if (normalized.length) setActiveCategory(normalized[0].id)
      })
      .catch(() => {
        setCategories(FALLBACK)
        setActiveCategory(FALLBACK[0].id)
        setIsFallback(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const active = categories.find(c => c.id === activeCategory)

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Navbar />

      {/* Hero */}
      <div className="pt-32 pb-16 px-6 text-center bg-gradient-to-b from-stone-900 to-stone-950">
        <p className="text-red-400 text-sm uppercase tracking-widest mb-4">What We Offer</p>
        <h1 className="text-5xl md:text-6xl font-bold mb-4" style={{ fontFamily: 'Georgia, serif' }}>Our Menu</h1>
        <p className="text-stone-400 max-w-xl mx-auto">All prices include GST. Menu subject to seasonal availability.</p>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-24">
        {isFallback && (
          <div className="mb-6 px-4 py-3 bg-amber-900/40 border border-amber-700 rounded-xl text-amber-300 text-sm text-center">
            Live menu unavailable — showing sample menu. Prices and availability may differ.
          </div>
        )}

        {/* Category tabs — scrollable on mobile */}
        <div className="flex gap-2 sm:gap-3 mb-8 sm:mb-12 sticky top-16 bg-stone-950 py-3 sm:py-4 z-10 overflow-x-auto scrollbar-hide px-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-red-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-stone-900 border border-stone-800 rounded-xl p-6 animate-pulse">
                <div className="h-5 bg-stone-700 rounded w-2/3 mb-3" />
                <div className="h-3 bg-stone-800 rounded w-full mb-2" />
                <div className="h-3 bg-stone-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && active && (
          <>
            <h2 className="text-2xl font-bold text-white mb-8">{active.name}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {active.menuItems.filter(i => i.isAvailable).map(item => (
                <div
                  key={item.id}
                  className="bg-stone-900 border border-stone-800 rounded-xl p-6 hover:border-red-600/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-white font-semibold text-lg leading-snug">{item.name}</h3>
                    <span className="text-red-400 font-bold text-lg ml-3 shrink-0">${Number(item.price).toFixed(2)}</span>
                  </div>
                  {item.description && (
                    <p className="text-stone-400 text-sm leading-relaxed">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-stone-400 mb-6">Ready to order? Join us in person or order takeaway online.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="/#booking" className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-full transition-colors">
              Reserve a Table
            </a>
            <a href="/takeaway" className="px-8 py-3 bg-stone-800 hover:bg-stone-700 text-white font-medium rounded-full transition-colors">
              Order Takeaway
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
