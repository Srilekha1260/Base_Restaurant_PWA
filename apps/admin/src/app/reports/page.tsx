'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getUser } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'

interface SalesReport {
  period: { from: string; to: string }
  totalRevenue: number
  totalGst: number
  orderCount: number
  dishBreakdown: Array<{ name: string; quantity: number; revenue: number }>
  categoryBreakdown: Array<{ name: string; quantity: number; revenue: number }>
  paymentMethodBreakdown: Array<{ method: string; count: number; amount: number }>
}

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last year', days: 365 },
]

export default function ReportsPage() {
  const router = useRouter()
  const [report, setReport] = useState<SalesReport | null>(null)
  const [branchId, setBranchId] = useState('')
  const [loading, setLoading] = useState(false)
  const [preset, setPreset] = useState(0)

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return }
    api.get<any[]>('/branches').then(branches => {
      if (branches.length) setBranchId(branches[0].id)
    }).catch(() => {
      // 401 handled in api.ts; swallow to avoid an uncaught rejection
    })
  }, [])

  useEffect(() => {
    if (!branchId) return
    loadReport()
  }, [branchId, preset])

  const loadReport = async () => {
    if (!branchId) return
    setLoading(true)
    const to = new Date()
    const from = new Date()
    if (preset === 0) from.setHours(0, 0, 0, 0)
    else from.setDate(from.getDate() - PRESETS[preset].days)

    try {
      const data = await api.get<SalesReport>(`/reports/sales/${branchId}?from=${from.toISOString()}&to=${to.toISOString()}`)
      setReport(data)
    } catch {
      // 401 handled in api.ts; leave report as-is
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <div className="flex gap-2">
            {PRESETS.map((p, i) => (
              <button key={p.label} onClick={() => setPreset(i)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${preset === i ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Revenue', value: `$${report.totalRevenue.toFixed(2)}`, sub: `GST: $${report.totalGst.toFixed(2)}` },
                { label: 'Orders', value: report.orderCount, sub: report.orderCount > 0 ? `Avg: $${(report.totalRevenue / report.orderCount).toFixed(2)}` : '-' },
                { label: 'Revenue (ex GST)', value: `$${(report.totalRevenue - report.totalGst).toFixed(2)}`, sub: 'Before GST' },
              ].map(card => (
                <div key={card.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <p className="text-slate-400 text-sm mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                  <p className="text-slate-500 text-xs mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Payment method breakdown */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4">Payment Methods</h2>
                <div className="space-y-3">
                  {report.paymentMethodBreakdown.map(m => (
                    <div key={m.method} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-300 text-sm">{m.method.replace('CARD_', '').replace('_', ' ')}</span>
                        <span className="text-slate-500 text-xs">{m.count} orders</span>
                      </div>
                      <span className="text-white font-medium">${m.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  {report.paymentMethodBreakdown.length === 0 && <p className="text-slate-500 text-sm">No payments in this period.</p>}
                </div>
              </div>

              {/* Category breakdown */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4">Category Sales</h2>
                <div className="space-y-3">
                  {report.categoryBreakdown.map(cat => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">{cat.name}</span>
                      <div className="text-right">
                        <p className="text-white font-medium text-sm">${cat.revenue.toFixed(2)}</p>
                        <p className="text-slate-500 text-xs">{cat.quantity} items</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dish breakdown */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">Top Selling Dishes</h2>
              <div className="space-y-2">
                {report.dishBreakdown.slice(0, 10).map((dish, i) => (
                  <div key={dish.name} className="flex items-center gap-4 py-2 border-b border-slate-700 last:border-0">
                    <span className="text-slate-600 text-sm w-6">{i + 1}</span>
                    <span className="text-slate-300 text-sm flex-1">{dish.name}</span>
                    <span className="text-slate-500 text-xs">{dish.quantity} sold</span>
                    <span className="text-white font-medium text-sm">${dish.revenue.toFixed(2)}</span>
                  </div>
                ))}
                {report.dishBreakdown.length === 0 && <p className="text-slate-500 text-sm">No sales in this period.</p>}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500">Select a branch to view reports.</p>
        )}
      </div>
    </AdminLayout>
  )
}
