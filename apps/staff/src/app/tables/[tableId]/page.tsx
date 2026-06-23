'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api, getUser } from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { SocketEvent } from '@restaurant/types'
import { Plus, Minus, Send, CreditCard, ChevronLeft, MessageSquare } from 'lucide-react'
import StaffLayout from '@/components/layout/StaffLayout'

interface MenuItem { id: string; name: string; price: number; description?: string }
interface MenuCategory { id: string; name: string; menuItems: MenuItem[] }
interface OrderItem { id: string; menuItemId: string; menuItem: MenuItem; quantity: number; unitPrice: number; notes?: string; status: string }
interface Order { id: string; status: string; type: string; orderItems: OrderItem[] }

export default function TableOrderPage() {
  const router = useRouter()
  const { tableId } = useParams<{ tableId: string }>()
  const user = getUser()

  const [order, setOrder] = useState<Order | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [pendingItems, setPendingItems] = useState<Array<{ menuItem: MenuItem; qty: number; notes: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [branchId, setBranchId] = useState<string | null>(null)
  const [tableName, setTableName] = useState('')
  const [noteOpen, setNoteOpen] = useState<string | null>(null)

  const loadOrder = useCallback(async () => {
    try {
      const data = await api.get<Order>(`/orders/table/${tableId}/active`)
      setOrder(data)
    } catch { setOrder(null) }
  }, [tableId])

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    api.get<any[]>('/branches').then(branches => {
      if (branches.length) {
        const branch = branches[0]
        setBranchId(branch.id)
        const table = branch.sections?.flatMap((s: any) => s.tables).find((t: any) => t.id === tableId)
        if (table) setTableName(table.name)
        return api.get<MenuCategory[]>(`/menu/tenant/${user.tenantId || 'demo-restaurant'}`)
      }
    }).then((cats: MenuCategory[] | void) => {
      if (cats) {
        setCategories(cats)
        if (cats.length) setActiveCategory(cats[0].id)
      }
    }).catch(() => {
      // 401 handled in api.ts; swallow to avoid an uncaught rejection
    })
    loadOrder()
  }, [tableId])

  useSocket(branchId, {
    [SocketEvent.ORDER_UPDATED]: (data: any) => {
      if (data.order?.tableId === tableId) setOrder(data.order)
    },
  })

  const addPending = (item: MenuItem) => {
    setPendingItems(prev => {
      const idx = prev.findIndex(p => p.menuItem.id === item.id)
      if (idx >= 0) return prev.map((p, i) => i === idx ? { ...p, qty: p.qty + 1 } : p)
      return [...prev, { menuItem: item, qty: 1, notes: '' }]
    })
  }

  const updatePendingQty = (id: string, delta: number) => {
    setPendingItems(prev => prev.map(p => p.menuItem.id === id ? { ...p, qty: p.qty + delta } : p).filter(p => p.qty > 0))
  }

  const updatePendingNote = (id: string, note: string) => {
    setPendingItems(prev => prev.map(p => p.menuItem.id === id ? { ...p, notes: note } : p))
  }

  const sendToKitchen = async () => {
    if (pendingItems.length === 0) return
    setSubmitting(true)
    try {
      const items = pendingItems.map(p => ({ menuItemId: p.menuItem.id, quantity: p.qty, notes: p.notes || undefined }))
      if (order) {
        await api.post(`/orders/${order.id}/items`, { items })
      } else {
        const branches = await api.get<any[]>('/branches')
        await api.post('/orders', {
          branchId: branches[0].id,
          tableId,
          type: 'DINE_IN',
          items,
        })
      }
      setPendingItems([])
      await loadOrder()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const total = (order?.orderItems ?? []).reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)
  const pendingTotal = pendingItems.reduce((s, i) => s + i.menuItem.price * i.qty, 0)
  const activeMenuItems = categories.find(c => c.id === activeCategory)?.menuItems ?? []

  return (
    <StaffLayout>
      <div className="flex h-[calc(100vh-8.5rem)]">
        {/* Left — Menu */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center gap-3">
            <button onClick={() => router.push('/tables')} className="text-gray-400 hover:text-white">
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 className="text-white font-bold">Table {tableName || tableId}</h1>
              <p className="text-gray-500 text-xs">{order ? `Order #${order.id.slice(-6)} · ${order.status}` : 'No active order'}</p>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 p-3 overflow-x-auto shrink-0">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeCategory === cat.id ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu items */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
            {activeMenuItems.map(item => {
              const qty = pendingItems.find(p => p.menuItem.id === item.id)?.qty || 0
              return (
                <button
                  key={item.id}
                  onClick={() => addPending(item)}
                  className="bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-red-600/50 rounded-xl p-4 text-left transition-colors relative active:scale-95"
                >
                  {qty > 0 && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      {qty}
                    </span>
                  )}
                  <p className="text-white font-medium text-sm leading-tight mb-1">{item.name}</p>
                  <p className="text-red-400 font-bold">${Number(item.price).toFixed(2)}</p>
                </button>
              )
            })}
          </div>

          {/* Pending order bar */}
          {pendingItems.length > 0 && (
            <div className="border-t border-gray-700 p-3 bg-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">New items (+${pendingTotal.toFixed(2)})</span>
                <button onClick={() => { setPendingItems([]); setNoteOpen(null) }} className="text-gray-600 hover:text-red-400 text-xs">Clear</button>
              </div>

              {pendingItems.map(p => (
                <div key={p.menuItem.id} className="bg-gray-700 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updatePendingQty(p.menuItem.id, -1)} className="text-gray-400 hover:text-white shrink-0"><Minus size={13} /></button>
                    <span className="text-white text-sm flex-1">{p.qty}× {p.menuItem.name}</span>
                    <button onClick={() => updatePendingQty(p.menuItem.id, 1)} className="text-gray-400 hover:text-white shrink-0"><Plus size={13} /></button>
                    <button
                      onClick={() => setNoteOpen(noteOpen === p.menuItem.id ? null : p.menuItem.id)}
                      className={`shrink-0 ${p.notes ? 'text-amber-400' : 'text-gray-600 hover:text-gray-300'}`}
                      title="Add note / allergy"
                    >
                      <MessageSquare size={14} />
                    </button>
                  </div>
                  {noteOpen === p.menuItem.id && (
                    <input
                      autoFocus
                      value={p.notes}
                      onChange={e => updatePendingNote(p.menuItem.id, e.target.value)}
                      placeholder="Allergy / special request..."
                      className="mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none placeholder-gray-500"
                    />
                  )}
                  {p.notes && noteOpen !== p.menuItem.id && (
                    <p className="text-amber-400 text-xs mt-1 truncate">⚠ {p.notes}</p>
                  )}
                </div>
              ))}

              <button
                onClick={sendToKitchen}
                disabled={submitting}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Send size={16} />
                {submitting ? 'Sending...' : 'Send to Kitchen'}
              </button>
            </div>
          )}
        </div>

        {/* Right — Current order */}
        <div className="w-72 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-white font-semibold">Current Order</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!order || order.orderItems.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">No items yet</p>
            ) : (
              order.orderItems.map(item => (
                <div key={item.id} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="text-white text-sm font-medium">{item.menuItem.name}</p>
                    <p className="text-gray-500 text-xs">{item.quantity}× · ${Number(item.unitPrice).toFixed(2)} each</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                      item.status === 'COMPLETED' ? 'bg-green-900 text-green-300' :
                      item.status === 'IN_PROGRESS' ? 'bg-blue-900 text-blue-300' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {item.status.toLowerCase()}
                    </span>
                  </div>
                  <span className="text-red-400 font-bold text-sm">${(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
          {order && (
            <div className="p-4 border-t border-gray-700 space-y-3">
              <div className="flex justify-between text-white font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <button
                onClick={() => router.push(`/tables/${tableId}/bill`)}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <CreditCard size={16} /> Bill & Payment
              </button>
            </div>
          )}
        </div>
      </div>
    </StaffLayout>
  )
}
