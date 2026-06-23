'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { api, kitchenLogin, getUser } from '@/lib/api'
import { SocketEvent } from '@restaurant/types'
import { Clock, CheckCircle, ChefHat, UtensilsCrossed, WifiOff } from 'lucide-react'

interface KitchenItem { id: string; quantity: number; notes?: string; status: string; menuItem: { name: string } }
interface KitchenTable { name: string; section: { name: string } }
interface KitchenTicket {
  id: string
  status: string
  createdAt: string
  // Items belong to the ticket (the round that was sent), not the whole order.
  orderItems: KitchenItem[]
  order: {
    id: string
    type: string
    table?: KitchenTable
    customerName?: string
  }
}

// Short order token shown to the kitchen — matches the customer's order ref.
const orderToken = (orderId: string) => `#${orderId.slice(-6).toUpperCase()}`

export default function KitchenPage() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState('kitchen@demo.com')
  const [password, setPassword] = useState('password123')
  const [loginError, setLoginError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [socketOnline, setSocketOnline] = useState(true)
  const socketRef = useRef<Socket | null>(null)

  const loadTickets = useCallback(async (bid: string) => {
    try {
      const data = await api.get<KitchenTicket[]>(`/kitchen/tickets/${bid}`)
      setTickets(data)
    } catch {}
  }, [])

  // Tick every 30 seconds so elapsed times stay accurate
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const user = getUser()
    if (!user) return
    setLoggedIn(true)

    let bid: string

    api.get<any[]>('/branches')
      .then(branches => {
        if (!branches.length) return
        bid = branches[0].id
        setBranchId(bid)
        loadTickets(bid)

        const socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}/restaurant`, {
          auth: { token: localStorage.getItem('accessToken') },
        })
        socketRef.current = socket

        socket.on('connect', () => setSocketOnline(true))
        socket.on('disconnect', () => setSocketOnline(false))
        socket.emit(SocketEvent.JOIN_BRANCH, { branchId: bid })
        socket.on(SocketEvent.KITCHEN_TICKET_CREATED, () => loadTickets(bid))
        socket.on(SocketEvent.KITCHEN_TICKET_UPDATED, () => loadTickets(bid))
        socket.on(SocketEvent.ORDER_CREATED, () => loadTickets(bid))
      })
      .catch((err: Error) => {
        if (err.message === 'UNAUTHORIZED') setLoggedIn(false)
      })

    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [loggedIn])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await kitchenLogin(email, password)
      setLoggedIn(true)
    } catch (err: any) {
      setLoginError('Invalid credentials')
    }
  }

  const updateTicket = async (ticketId: string, status: string) => {
    try {
      await api.patch(`/kitchen/tickets/${ticketId}/status`, { status })
      if (branchId) loadTickets(branchId)
    } catch (err: any) {
      console.error('updateTicket failed:', err.message)
      alert(`Could not update ticket: ${err.message}`)
    }
  }

  const updateItem = async (itemId: string, status: string) => {
    try {
      await api.patch(`/kitchen/items/${itemId}/status`, { status })
      if (branchId) loadTickets(branchId)
    } catch (err: any) {
      console.error('updateItem failed:', err.message)
    }
  }

  const elapsedMinutes = (createdAt: string) => {
    return Math.floor((now - new Date(createdAt).getTime()) / 60000)
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <form onSubmit={handleLogin} className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm space-y-5">
          <div className="text-center">
            <ChefHat className="w-12 h-12 text-orange-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Kitchen Display</h1>
          </div>
          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none" />
          <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl">Sign In</button>
        </form>
      </div>
    )
  }

  const pending = tickets.filter(t => t.status === 'PENDING' || t.status === 'PRINTED')
  const inProgress = tickets.filter(t => t.status === 'IN_PROGRESS')


  return (
    <div className="min-h-screen bg-gray-950 p-4">
      {!socketOnline && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-red-900/60 border border-red-700 rounded-xl text-red-300 text-sm">
          <WifiOff size={16} /> Kitchen is offline — orders may not be syncing
        </div>
      )}

      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-orange-400" />
          <h1 className="text-2xl font-bold text-white">Kitchen Display</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> Pending: {pending.length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> In Progress: {inProgress.length}
          </span>
          <span className="text-white font-mono text-base">{new Date(now).toLocaleTimeString('en-NZ')}</span>
        </div>
      </header>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-600">
          <UtensilsCrossed className="w-16 h-16 mb-4" />
          <p className="text-xl">No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tickets.map(ticket => {
            const elapsed = elapsedMinutes(ticket.createdAt)
            const isUrgent = elapsed > 15
            return (
              <div
                key={ticket.id}
                className={`rounded-2xl border-2 p-4 flex flex-col gap-4 ${
                  ticket.status === 'IN_PROGRESS'
                    ? 'border-blue-500 bg-blue-950/30'
                    : isUrgent
                    ? 'border-red-500 bg-red-950/30 animate-pulse'
                    : 'border-gray-700 bg-gray-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      ticket.order.type === 'DINE_IN' ? 'bg-purple-900 text-purple-300'
                        : ticket.order.type === 'DELIVERY' ? 'bg-sky-900 text-sky-300'
                        : 'bg-amber-900 text-amber-300'
                    }`}>
                      {ticket.order.type === 'DINE_IN'
                        ? `${ticket.order.table?.section?.name ?? ''} · ${ticket.order.table?.name ?? ''}`
                        : ticket.order.type === 'DELIVERY' ? 'DELIVERY' : 'PICKUP'}
                    </span>
                    {ticket.order.type !== 'DINE_IN' && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-bold text-white truncate">{ticket.order.customerName || 'Guest'}</span>
                        <span className="text-xs font-mono text-gray-400 flex-shrink-0">{orderToken(ticket.order.id)}</span>
                      </div>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-mono flex-shrink-0 ${isUrgent ? 'text-red-400' : 'text-gray-500'}`}>
                    <Clock size={12} />
                    {elapsed}m
                  </div>
                </div>

                <div className="space-y-2">
                  {(ticket.orderItems ?? []).map((item: KitchenItem) => (
                    <button
                      key={item.id}
                      onClick={() => updateItem(item.id, item.status === 'PENDING' ? 'IN_PROGRESS' : item.status === 'IN_PROGRESS' ? 'COMPLETED' : 'PENDING')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        item.status === 'COMPLETED'
                          ? 'bg-green-900/50 text-green-400 line-through'
                          : item.status === 'IN_PROGRESS'
                          ? 'bg-blue-900/50 text-blue-300'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      <span className="font-bold text-sm min-w-[1.5rem]">{item.quantity}×</span>
                      <span className="flex-1 text-sm">{item.menuItem.name}</span>
                      {item.status === 'COMPLETED' && <CheckCircle size={14} className="text-green-400" />}
                    </button>
                  ))}
                </div>

                {(ticket.orderItems ?? []).some((i: KitchenItem) => i.notes) && (
                  <div className="bg-amber-950/50 border border-amber-800 rounded-lg px-3 py-2">
                    {(ticket.orderItems ?? []).filter((i: KitchenItem) => i.notes).map((i: KitchenItem) => (
                      <p key={i.id} className="text-amber-300 text-xs">⚠ {i.menuItem.name}: {i.notes}</p>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {ticket.status !== 'IN_PROGRESS' && (
                    <button
                      onClick={() => updateTicket(ticket.id, 'IN_PROGRESS')}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => updateTicket(ticket.id, 'DONE')}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    <CheckCircle size={14} /> Done
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
