'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getUser } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { ShoppingBag, DollarSign, Users, TrendingUp } from 'lucide-react'

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({ orders: 0, revenue: 0, users: 0, gst: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(false)

  const today = toDateStr(new Date())
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)

  const isToday = fromDate === today && toDate === today

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return }
    fetchStats(fromDate, toDate)
  }, [])

  const fetchStats = (from: string, to: string) => {
    setLoadingStats(true)
    const fromIso = new Date(from).toISOString()
    const toIso = new Date(new Date(to).setHours(23, 59, 59, 999)).toISOString()

    api.get<any[]>('/branches').then(branches => {
      if (!branches.length) return
      const branchId = branches[0].id
      Promise.all([
        api.get<any>(`/reports/sales/${branchId}?from=${fromIso}&to=${toIso}`),
        api.get<any[]>(`/orders/branch/${branchId}?status=COMPLETED`),
        api.get<any[]>('/users'),
      ]).then(([sales, orders, users]) => {
        setStats({
          orders: sales.orderCount || 0,
          revenue: sales.totalRevenue || 0,
          gst: sales.totalGst || 0,
          users: users.length,
        })
        setRecentOrders((orders || []).slice(0, 5))
      }).catch(() => {}).finally(() => setLoadingStats(false))
    }).catch(() => setLoadingStats(false))
  }

  const handleDateChange = (newFrom: string, newTo: string) => {
    if (newTo < newFrom) return
    setFromDate(newFrom)
    setToDate(newTo)
    fetchStats(newFrom, newTo)
  }

  const statLabel = (base: string) => isToday ? `Today's ${base}` : base

  const statCards = [
    { label: statLabel('Orders'), value: stats.orders, icon: ShoppingBag, color: 'text-blue-400' },
    { label: statLabel('Revenue'), value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-400' },
    { label: 'GST Collected', value: `$${stats.gst.toFixed(2)}`, icon: TrendingUp, color: 'text-purple-400' },
    { label: 'Staff Members', value: stats.users, icon: Users, color: 'text-orange-400' },
  ]

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={e => handleDateChange(e.target.value, toDate)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 focus:outline-none"
            />
            <span className="text-slate-500 text-sm">to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={today}
              onChange={e => handleDateChange(fromDate, e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 focus:outline-none"
            />
            {!isToday && (
              <button
                onClick={() => handleDateChange(today, today)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Today
              </button>
            )}
          </div>
        </div>

        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 transition-opacity ${loadingStats ? 'opacity-50' : 'opacity-100'}`}>
          {statCards.map(card => (
            <div key={card.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">{card.label}</span>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-slate-500 text-sm">No orders today yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">
                      {order.type === 'DINE_IN' ? `Table ${order.table?.name}` : 'Takeaway'}
                    </p>
                    <p className="text-slate-500 text-xs">{new Date(order.createdAt).toLocaleTimeString('en-NZ')}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'COMPLETED' ? 'bg-green-900 text-green-300' :
                      order.status === 'IN_KITCHEN' ? 'bg-blue-900 text-blue-300' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {order.status}
                    </span>
                    <p className="text-white font-medium text-sm mt-1">
                      ${order.payment?.totalAmount ? Number(order.payment.totalAmount).toFixed(2) : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
