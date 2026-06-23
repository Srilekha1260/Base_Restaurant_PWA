'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getUser } from '@/lib/api'
import { Plus, Minus, Send } from 'lucide-react'
import StaffLayout from '@/components/layout/StaffLayout'

interface MenuItem { id: string; name: string; price: number; description?: string }
interface MenuCategory { id: string; name: string; menuItems: MenuItem[] }
interface CartItem { menuItem: MenuItem; qty: number }

export default function TakeawayStaffPage() {
  const router = useRouter()
  const user = getUser()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    api.get<MenuCategory[]>(`/menu/tenant/${user.tenantId || 'demo-restaurant'}`).then(cats => {
      setCategories(cats)
      if (cats.length) setActiveCategory(cats[0].id)
    }).catch(() => {
      // 401 handled in api.ts; swallow to avoid an uncaught rejection
    })
  }, [])

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.menuItem.id === item.id)
      if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { menuItem: item, qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.menuItem.id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0))
  }

  const sendOrder = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      const branches = await api.get<any[]>('/branches')
      await api.post('/orders', {
        branchId: branches[0].id,
        type: 'TAKEAWAY',
        items: cart.map(c => ({ menuItemId: c.menuItem.id, quantity: c.qty })),
      })
      setCart([])
      alert('Takeaway order sent to kitchen!')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const total = cart.reduce((s, c) => s + c.menuItem.price * c.qty, 0)
  const activeItems = categories.find(c => c.id === activeCategory)?.menuItems ?? []

  return (
    <StaffLayout>
      <div className="flex h-[calc(100vh-8.5rem)]">
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h1 className="text-white font-bold text-xl">New Takeaway Order</h1>
          </div>
          <div className="flex gap-2 p-3 overflow-x-auto shrink-0">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${activeCategory === cat.id ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                {cat.name}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
            {activeItems.map(item => {
              const qty = cart.find(c => c.menuItem.id === item.id)?.qty || 0
              return (
                <button key={item.id} onClick={() => addToCart(item)}
                  className="bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl p-4 text-left transition-colors relative active:scale-95">
                  {qty > 0 && <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{qty}</span>}
                  <p className="text-white font-medium text-sm mb-1">{item.name}</p>
                  <p className="text-red-400 font-bold">${item.price.toFixed(2)}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="w-72 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-white font-semibold">Order</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">No items yet</p>
            ) : (
              cart.map(c => (
                <div key={c.menuItem.id} className="bg-gray-800 rounded-lg p-3 flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-white text-sm">{c.menuItem.name}</p>
                    <p className="text-red-400 text-sm font-bold">${(c.menuItem.price * c.qty).toFixed(2)}</p>
                  </div>
                  <button onClick={() => updateQty(c.menuItem.id, -1)} className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-gray-300 hover:bg-gray-600"><Minus size={12} /></button>
                  <span className="text-white w-4 text-center text-sm">{c.qty}</span>
                  <button onClick={() => updateQty(c.menuItem.id, 1)} className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-gray-300 hover:bg-gray-600"><Plus size={12} /></button>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div className="p-4 border-t border-gray-700">
              <div className="flex justify-between text-white font-bold mb-4">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
              <button onClick={sendOrder} disabled={submitting}
                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                <Send size={16} />
                {submitting ? 'Sending...' : 'Send to Kitchen'}
              </button>
            </div>
          )}
        </div>
      </div>
    </StaffLayout>
  )
}
