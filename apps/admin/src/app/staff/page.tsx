'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getUser } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { Plus, UserX, Pencil, Check, X } from 'lucide-react'

interface User { id: string; name: string; email: string; role: string; isActive: boolean }
interface EditState { id: string; name: string; email: string; role: string }

const ROLES = ['WAITER', 'CASHIER', 'KITCHEN', 'TENANT_ADMIN']
const ROLE_COLORS: Record<string, string> = {
  TENANT_ADMIN: 'bg-red-900 text-red-300',
  WAITER: 'bg-blue-900 text-blue-300',
  CASHIER: 'bg-green-900 text-green-300',
  KITCHEN: 'bg-orange-900 text-orange-300',
}

export default function StaffAdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: 'password123', role: 'WAITER' })
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<EditState | null>(null)

  const loadUsers = () => {
    if (!getUser()) { router.push('/login'); return }
    api.get<User[]>('/users').then(setUsers).catch(() => {})
  }

  useEffect(() => { loadUsers() }, [])

  const addUser = async () => {
    if (!form.name || !form.email) return
    setSaving(true)
    try {
      await api.post('/users', form)
      setForm({ name: '', email: '', password: 'password123', role: 'WAITER' })
      setShowAdd(false)
      loadUsers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (id: string) => {
    if (!confirm('Remove this staff member?')) return
    await api.delete(`/users/${id}`)
    loadUsers()
  }

  const saveEdit = async () => {
    if (!editing || !editing.name || !editing.email) return
    setSaving(true)
    try {
      await api.patch(`/users/${editing.id}`, { name: editing.name, email: editing.email, role: editing.role })
      setEditing(null)
      loadUsers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Staff Management</h1>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus size={16} /> Add Staff
          </button>
        </div>

        {showAdd && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6 space-y-3">
            <h2 className="text-white font-semibold">New Staff Member</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name *"
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none text-sm" />
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email *"
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none text-sm" />
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Password"
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none text-sm" />
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none text-sm">
                {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={addUser} disabled={saving}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors">
                {saving ? 'Saving...' : 'Add Staff'}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr>
                {['Name', 'Email', 'Role', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-750">
                  {editing?.id === user.id ? (
                    <>
                      <td className="px-3 py-2">
                        <input value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 focus:outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="email" value={editing.email} onChange={e => setEditing(p => p ? { ...p, email: e.target.value } : p)}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 focus:outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={editing.role} onChange={e => setEditing(p => p ? { ...p, role: e.target.value } : p)}
                          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 focus:outline-none">
                          {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={saveEdit} disabled={saving}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white text-xs rounded-lg transition-colors">
                            <Check size={13} /> {saving ? '...' : 'Save'}
                          </button>
                          <button onClick={() => setEditing(null)}
                            className="p-1.5 text-slate-500 hover:text-white transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 text-white">{user.name}</td>
                      <td className="px-5 py-3 text-slate-400">{user.email}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${ROLE_COLORS[user.role] || 'bg-slate-700 text-slate-400'}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => setEditing({ id: user.id, name: user.name, email: user.email, role: user.role })}
                            className="text-slate-500 hover:text-white transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => deactivate(user.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                            <UserX size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-slate-500 text-sm p-6">No staff members found.</p>}
        </div>
      </div>
    </AdminLayout>
  )
}
