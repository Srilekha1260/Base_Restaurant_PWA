'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { ChevronLeft, Banknote, CreditCard, SplitSquareHorizontal, CheckCircle } from 'lucide-react'
import StaffLayout from '@/components/layout/StaffLayout'

interface BillData {
  order: { id: string; orderItems: any[] }
  subtotal: number
  gstAmount: number
  total: number
}

interface SplitItem { amount: string; method: string }

export default function BillPage() {
  const router = useRouter()
  const { tableId } = useParams<{ tableId: string }>()
  const [bill, setBill] = useState<BillData | null>(null)
  const [paymentMode, setPaymentMode] = useState<'full' | 'split'>('full')
  const [method, setMethod] = useState('CASH')
  const [tip, setTip] = useState('0')
  const [splits, setSplits] = useState<SplitItem[]>([{ amount: '', method: 'CASH' }, { amount: '', method: 'CASH' }])
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  // Integrated EFTPOS terminal flow
  const [eftposState, setEftposState] = useState<'idle' | 'processing' | 'declined'>('idle')
  const [eftposRef, setEftposRef] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [simulateDecline, setSimulateDecline] = useState(false) // demo control

  useEffect(() => {
    api.get<{ id: string } | null>(`/orders/table/${tableId}/active`).then(order => {
      if (!order) { router.push(`/tables/${tableId}`); return }
      return api.get<BillData>(`/payments/bill/${order.id}`)
    }).then(b => b && setBill(b)).catch(() => {
      // 401 handled in api.ts; swallow to avoid an uncaught rejection
    })
  }, [tableId])

  // Integrated EFTPOS: push the amount to the terminal and wait for the result.
  // `forceDecline` lets the demo show the declined path on demand.
  const chargeEftpos = async (forceDecline: boolean) => {
    if (!bill) return
    const total = bill.total + parseFloat(tip || '0')
    setEftposState('processing')
    try {
      const res = await api.post<any>(`/payments/eftpos/${bill.order.id}`, {
        totalAmount: total,
        tipAmount: parseFloat(tip || '0'),
        simulateDecline: forceDecline,
      })
      if (res.status === 'APPROVED') {
        setEftposRef(res.reference || '')
        setEftposState('idle')
        setDone(true)
      } else {
        setDeclineReason(res.declineReason || 'Card declined')
        setEftposState('declined')
      }
    } catch (err: any) {
      setDeclineReason(err.message || 'Terminal error')
      setEftposState('declined')
    }
  }

  const handleFullPay = async () => {
    if (!bill) return
    if (method === 'CARD_EFTPOS') {
      chargeEftpos(simulateDecline)
      return
    }
    setProcessing(true)
    try {
      const total = bill.total + parseFloat(tip || '0')
      // Staff take only Cash or EFTPOS in person (EFTPOS handled above).
      await api.post(`/payments/cash/${bill.order.id}`, { totalAmount: total, tipAmount: parseFloat(tip || '0') })
      setDone(true)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleSplitPay = async () => {
    if (!bill) return
    const totalSplit = splits.reduce((sum, s) => sum + parseFloat(s.amount || '0'), 0)
    if (Math.abs(totalSplit - bill.total) > 0.01) {
      alert(`Split amounts must total $${bill.total.toFixed(2)}`)
      return
    }
    setProcessing(true)
    try {
      const splitData = await api.post<any[]>(`/payments/split/${bill.order.id}`, {
        splits: splits.map(s => ({ amount: parseFloat(s.amount), method: s.method })),
      })
      for (const split of splitData) {
        await api.post(`/payments/split/${split.id}/complete`, {})
      }
      setDone(true)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (done) {
    return (
      <StaffLayout>
        <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
          <CheckCircle className="w-20 h-20 text-green-500" />
          <h2 className="text-3xl font-bold text-white">Payment Complete!</h2>
          {eftposRef && (
            <p className="text-gray-400 text-sm">
              EFTPOS approval: <span className="font-mono text-gray-300">{eftposRef}</span>
            </p>
          )}
          <button onClick={() => router.push('/tables')} className="px-8 py-4 bg-red-600 text-white rounded-2xl text-lg font-semibold">
            Back to Tables
          </button>
        </div>
      </StaffLayout>
    )
  }

  if (!bill) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </StaffLayout>
    )
  }

  // In-person service: Cash or EFTPOS only.
  const methods = [
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'CARD_EFTPOS', label: 'EFTPOS', icon: CreditCard },
  ]

  return (
    <StaffLayout>
      {eftposState !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-sm text-center">
            {eftposState === 'processing' ? (
              <>
                <CreditCard className="w-14 h-14 text-blue-400 mx-auto mb-4 animate-pulse" />
                <h3 className="text-xl font-bold text-white mb-1">Processing on terminal…</h3>
                <p className="text-gray-400 text-sm mb-6">Ask the customer to tap or insert their card</p>
                <div className="text-3xl font-bold text-white mb-6">
                  ${(bill.total + parseFloat(tip || '0')).toFixed(2)}
                </div>
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4 text-red-400 text-3xl font-bold">
                  ✕
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Payment declined</h3>
                <p className="text-gray-400 text-sm mb-6">{declineReason}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEftposState('idle')}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium"
                  >
                    Use another method
                  </button>
                  <button
                    onClick={() => chargeEftpos(false)}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium"
                  >
                    Retry
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Bill & Payment</h1>
        </div>

        {/* Order summary */}
        <div className="bg-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Order Summary</h2>
          {bill.order.orderItems.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm py-1">
              <span className="text-gray-300">{item.quantity}× {item.menuItem?.name}</span>
              <span className="text-gray-400">${(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-gray-700 mt-4 pt-4 space-y-1">
            <div className="flex justify-between text-sm text-gray-400">
              <span>GST (incl.)</span><span>${bill.gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-xl">
              <span>Total</span><span>${bill.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment mode */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setPaymentMode('full')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${paymentMode === 'full' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Full Payment
          </button>
          <button
            onClick={() => setPaymentMode('split')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${paymentMode === 'split' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            <SplitSquareHorizontal size={16} /> Split Bill
          </button>
        </div>

        {paymentMode === 'full' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {methods.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`py-4 rounded-xl flex flex-col items-center gap-2 transition-colors ${method === m.id ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  <m.icon size={24} />
                  <span className="text-sm font-medium">{m.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-4">
              <span className="text-gray-400 text-sm">Tip (optional)</span>
              <div className="flex gap-2 ml-auto">
                {['0', '5', '10', '15'].map(t => (
                  <button key={t} onClick={() => setTip(t === '0' ? '0' : String(Math.round(bill.total * parseFloat(t) / 100 * 100) / 100))}
                    className={`px-3 py-1 rounded-lg text-sm ${tip === t ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                    {t === '0' ? 'No tip' : `${t}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between text-white font-bold text-2xl bg-gray-800 rounded-xl p-4">
              <span>Charge</span>
              <span>${(bill.total + parseFloat(tip || '0')).toFixed(2)}</span>
            </div>

            {method === 'CARD_EFTPOS' && (
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={simulateDecline}
                  onChange={e => setSimulateDecline(e.target.checked)}
                  className="accent-red-500"
                />
                Simulate a declined card (demo)
              </label>
            )}

            <button
              onClick={handleFullPay}
              disabled={processing}
              className="w-full py-5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-bold text-xl rounded-2xl transition-colors"
            >
              {processing ? 'Processing...' : `Charge $${(bill.total + parseFloat(tip || '0')).toFixed(2)}`}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {splits.map((split, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-4 flex gap-3 items-center">
                <span className="text-gray-400 text-sm w-16">Person {i + 1}</span>
                <input
                  type="number"
                  step="0.01"
                  value={split.amount}
                  onChange={e => setSplits(prev => prev.map((s, idx) => idx === i ? { ...s, amount: e.target.value } : s))}
                  placeholder="0.00"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                />
                <select
                  value={split.method}
                  onChange={e => setSplits(prev => prev.map((s, idx) => idx === i ? { ...s, method: e.target.value } : s))}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD_EFTPOS">EFTPOS</option>
                </select>
              </div>
            ))}
            <div className="flex gap-3">
              <button
                onClick={() => setSplits(prev => [...prev, { amount: '', method: 'CASH' }])}
                className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl text-sm hover:bg-gray-700 transition-colors"
              >
                + Add Person
              </button>
              {splits.length > 2 && (
                <button
                  onClick={() => setSplits(prev => prev.slice(0, -1))}
                  className="py-3 px-4 bg-gray-800 text-gray-400 rounded-xl text-sm hover:bg-gray-700 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <button
              onClick={() => {
                const each = (bill.total / splits.length).toFixed(2)
                setSplits(prev => prev.map(s => ({ ...s, amount: each })))
              }}
              className="w-full py-2 text-red-400 text-sm hover:text-red-300 transition-colors"
            >
              Split equally (${(bill.total / splits.length).toFixed(2)} each)
            </button>
            <button
              onClick={handleSplitPay}
              disabled={processing}
              className="w-full py-5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-bold text-xl rounded-2xl transition-colors"
            >
              {processing ? 'Processing...' : 'Confirm Split Payment'}
            </button>
          </div>
        )}
      </div>
    </StaffLayout>
  )
}
