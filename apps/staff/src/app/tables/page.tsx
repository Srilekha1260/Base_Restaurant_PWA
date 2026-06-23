'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, getUser } from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { SocketEvent } from '@restaurant/types'
import StaffLayout from '@/components/layout/StaffLayout'

interface TableData { id: string; name: string; capacity: number; hasActiveOrder: boolean; activeOrder?: { id: string; status: string } }
interface SectionData { id: string; name: string; tables: TableData[] }

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-amber-500',
  IN_KITCHEN: 'bg-blue-500',
  READY: 'bg-green-500',
}

export default function TablesPage() {
  const router = useRouter()
  const user = getUser()
  const [sections, setSections] = useState<SectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [branchId, setBranchId] = useState<string | null>(null)

  const loadTables = useCallback(async (bid: string) => {
    try {
      const data = await api.get<SectionData[]>(`/tables/branch/${bid}/status`)
      setSections(data)
    } catch {
      // silently fail — offline scenario
    }
  }, [])

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    api.get<any[]>('/branches').then(branches => {
      if (branches.length) {
        setBranchId(branches[0].id)
        loadTables(branches[0].id)
      }
    }).catch(() => {
      // 401 is handled in api.ts (redirects to login); swallow here to avoid an uncaught rejection
    }).finally(() => setLoading(false))
  }, [])

  // Real-time updates
  useSocket(branchId, {
    [SocketEvent.ORDER_CREATED]: () => branchId && loadTables(branchId),
    [SocketEvent.ORDER_UPDATED]: () => branchId && loadTables(branchId),
    [SocketEvent.ORDER_COMPLETED]: () => branchId && loadTables(branchId),
    [SocketEvent.TABLE_CLOSED]: () => branchId && loadTables(branchId),
  })

  if (loading) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </StaffLayout>
    )
  }

  return (
    <StaffLayout>
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Table Map</h1>
          <div className="flex gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-700 inline-block" /> Free</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Open</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Kitchen</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Ready</span>
          </div>
        </div>

        {sections.map(section => (
          <div key={section.id} className="mb-8">
            <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-3">{section.name}</h2>
            <div className="grid grid-cols-4 gap-3">
              {section.tables.map(table => {
                const status = table.hasActiveOrder ? table.activeOrder?.status || 'OPEN' : null
                return (
                  <button
                    key={table.id}
                    onClick={() => router.push(`/tables/${table.id}`)}
                    className={`relative aspect-square rounded-xl border-2 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                      status
                        ? 'border-gray-600 bg-gray-800'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                    }`}
                  >
                    {status && (
                      <span className={`absolute top-2 right-2 w-3 h-3 rounded-full ${STATUS_COLORS[status] || 'bg-gray-500'}`} />
                    )}
                    <span className="text-white font-bold text-lg">{table.name}</span>
                    <span className="text-gray-500 text-xs">{table.capacity} seats</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </StaffLayout>
  )
}
