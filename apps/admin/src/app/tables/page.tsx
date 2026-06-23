'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getUser } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { Plus } from 'lucide-react'

interface Table { id: string; name: string; capacity: number; isActive: boolean }
interface Section { id: string; name: string; tables: Table[] }

export default function TablesAdminPage() {
  const router = useRouter()
  const [sections, setSections] = useState<Section[]>([])
  const [branchId, setBranchId] = useState('')
  const [showAddTable, setShowAddTable] = useState<string | null>(null)
  const [newTable, setNewTable] = useState({ name: '', capacity: '4' })

  const loadSections = (bid: string) => {
    api.get<Section[]>(`/tables/branch/${bid}/status`).then(setSections).catch(() => {})
  }

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return }
    api.get<any[]>('/branches').then(branches => {
      if (branches.length) {
        setBranchId(branches[0].id)
        loadSections(branches[0].id)
      }
    }).catch(() => {
      // 401 handled in api.ts; swallow to avoid an uncaught rejection
    })
  }, [])

  const addTable = async (sectionId: string) => {
    await api.post('/tables', { sectionId, name: newTable.name, capacity: parseInt(newTable.capacity) })
    setShowAddTable(null)
    setNewTable({ name: '', capacity: '4' })
    loadSections(branchId)
  }

  const toggleTable = async (id: string, isActive: boolean) => {
    await api.patch(`/tables/${id}`, { isActive: !isActive })
    loadSections(branchId)
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Tables & Sections</h1>
        <div className="space-y-6">
          {sections.map(section => (
            <div key={section.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">{section.name}</h2>
                <button onClick={() => setShowAddTable(section.id)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
                  <Plus size={12} /> Add Table
                </button>
              </div>

              {showAddTable === section.id && (
                <div className="flex gap-3 mb-4">
                  <input value={newTable.name} onChange={e => setNewTable(p => ({ ...p, name: e.target.value }))}
                    placeholder="Table name (e.g. IN5)" className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none" />
                  <input type="number" value={newTable.capacity} onChange={e => setNewTable(p => ({ ...p, capacity: e.target.value }))}
                    placeholder="Seats" className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none" />
                  <button onClick={() => addTable(section.id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">Add</button>
                  <button onClick={() => setShowAddTable(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">Cancel</button>
                </div>
              )}

              <div className="grid grid-cols-4 gap-3">
                {section.tables.map(table => (
                  <div key={table.id} className={`border rounded-xl p-3 text-center transition-colors ${table.isActive ? 'border-slate-600 bg-slate-900' : 'border-slate-700 bg-slate-800 opacity-50'}`}>
                    <p className="text-white font-bold">{table.name}</p>
                    <p className="text-slate-500 text-xs">{table.capacity} seats</p>
                    <button onClick={() => toggleTable(table.id, table.isActive)}
                      className={`mt-2 text-xs px-2 py-1 rounded-full transition-colors ${table.isActive ? 'bg-green-900 text-green-300 hover:bg-red-900 hover:text-red-300' : 'bg-slate-700 text-slate-400 hover:bg-green-900 hover:text-green-300'}`}>
                      {table.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
