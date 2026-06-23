'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getUser } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Check, X, FolderPlus } from 'lucide-react'

interface MenuItem { id: string; name: string; description?: string; price: number; isAvailable: boolean }
interface MenuCategory { id: string; name: string; isActive: boolean; menuItems: MenuItem[] }

interface EditState { id: string; name: string; description: string; price: string }

export default function MenuAdminPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '' })
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null)

  const loadMenu = () => {
    const user = getUser()
    if (!user) { router.push('/login'); return }
    api.get<MenuCategory[]>(`/menu/tenant/${user.tenantId || 'demo-restaurant'}`).then(data => {
      setCategories(data)
      if (data.length && !activeCategory) setActiveCategory(data[0].id)
    }).catch(() => {
      // 401 handled in api.ts; swallow to avoid an uncaught rejection
    })
  }

  useEffect(() => { loadMenu() }, [])

  const addItem = async () => {
    if (!newItem.name || !newItem.price) return
    setSaving(true)
    try {
      await api.post('/menu/items', {
        categoryId: activeCategory,
        name: newItem.name,
        description: newItem.description || undefined,
        price: parseFloat(newItem.price),
      })
      setNewItem({ name: '', description: '', price: '' })
      setShowAddItem(false)
      loadMenu()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (item: MenuItem) => {
    setEditing({ id: item.id, name: item.name, description: item.description ?? '', price: String(Number(item.price).toFixed(2)) })
    setShowAddItem(false)
  }

  const saveEdit = async () => {
    if (!editing || !editing.name || !editing.price) return
    setSaving(true)
    try {
      await api.patch(`/menu/items/${editing.id}`, {
        name: editing.name,
        description: editing.description || undefined,
        price: parseFloat(editing.price),
      })
      setEditing(null)
      loadMenu()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleItem = async (id: string, isAvailable: boolean) => {
    await api.patch(`/menu/items/${id}`, { isAvailable: !isAvailable })
    loadMenu()
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return
    await api.delete(`/menu/items/${id}`)
    loadMenu()
  }

  const addCategory = async () => {
    if (!newCatName.trim()) return
    setSaving(true)
    try {
      const cat = await api.post<MenuCategory>('/menu/categories', { name: newCatName.trim() })
      setNewCatName('')
      setShowAddCat(false)
      setActiveCategory(cat.id)
      loadMenu()
    } catch (err: any) { alert(err.message) } finally { setSaving(false) }
  }

  const saveCatEdit = async () => {
    if (!editingCat || !editingCat.name.trim()) return
    setSaving(true)
    try {
      await api.patch(`/menu/categories/${editingCat.id}`, { name: editingCat.name.trim() })
      setEditingCat(null)
      loadMenu()
    } catch (err: any) { alert(err.message) } finally { setSaving(false) }
  }

  const deleteCat = async (id: string) => {
    if (!confirm('Delete this category and all its items?')) return
    await api.delete(`/menu/categories/${id}`)
    setActiveCategory('')
    loadMenu()
  }

  const activeItems = categories.find(c => c.id === activeCategory)?.menuItems ?? []

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Menu Management</h1>
        </div>

        <div className="flex gap-6">
          {/* Categories */}
          <div className="w-52 space-y-1 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Categories</p>
              <button onClick={() => { setShowAddCat(true); setEditingCat(null) }}
                className="text-slate-500 hover:text-white transition-colors" title="Add category">
                <FolderPlus size={15} />
              </button>
            </div>

            {showAddCat && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 mb-2 space-y-2">
                <input
                  autoFocus
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCategory()}
                  placeholder="Category name"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs focus:border-red-500 focus:outline-none"
                />
                <div className="flex gap-1">
                  <button onClick={addCategory} disabled={saving}
                    className="flex-1 py-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white text-xs rounded transition-colors">
                    {saving ? '...' : 'Add'}
                  </button>
                  <button onClick={() => { setShowAddCat(false); setNewCatName('') }}
                    className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded hover:bg-slate-600 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            {categories.map(cat => (
              <div key={cat.id} className="group relative">
                {editingCat?.id === cat.id ? (
                  <div className="flex gap-1 items-center">
                    <input
                      autoFocus
                      value={editingCat.name}
                      onChange={e => setEditingCat(p => p ? { ...p, name: e.target.value } : p)}
                      onKeyDown={e => e.key === 'Enter' && saveCatEdit()}
                      className="flex-1 bg-slate-900 border border-red-500 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                    />
                    <button onClick={saveCatEdit} disabled={saving}
                      className="p-1.5 text-green-400 hover:text-green-300"><Check size={13} /></button>
                    <button onClick={() => setEditingCat(null)}
                      className="p-1.5 text-slate-500 hover:text-white"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <button onClick={() => { setActiveCategory(cat.id); setEditing(null); setEditingCat(null) }}
                      className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeCategory === cat.id ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}>
                      {cat.name}
                    </button>
                    <div className="hidden group-hover:flex items-center gap-0.5 pr-1">
                      <button onClick={() => setEditingCat({ id: cat.id, name: cat.name })}
                        className="p-1 text-slate-500 hover:text-white transition-colors"><Pencil size={11} /></button>
                      <button onClick={() => deleteCat(cat.id)}
                        className="p-1 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Items */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-400 text-sm">{activeItems.length} items</p>
              <button onClick={() => { setShowAddItem(true); setEditing(null) }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Plus size={16} /> Add Item
              </button>
            </div>

            {showAddItem && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4 space-y-3">
                <h3 className="text-white font-semibold">New Menu Item</h3>
                <input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                  placeholder="Item name *" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none text-sm" />
                <input value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description (optional)" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none text-sm" />
                <input type="number" step="0.01" value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))}
                  placeholder="Price (NZD) *" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none text-sm" />
                <div className="flex gap-3">
                  <button onClick={addItem} disabled={saving}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setShowAddItem(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {activeItems.map(item => (
                <div key={item.id} className={`bg-slate-800 border rounded-xl px-4 py-3 ${item.isAvailable ? 'border-slate-700' : 'border-slate-700 opacity-60'}`}>
                  {editing?.id === item.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)}
                          className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 focus:outline-none" />
                        <input type="number" step="0.01" value={editing.price} onChange={e => setEditing(p => p ? { ...p, price: e.target.value } : p)}
                          className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 focus:outline-none" />
                      </div>
                      <input value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : p)}
                        placeholder="Description (optional)"
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 focus:outline-none" />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white text-xs rounded-lg transition-colors">
                          <Check size={13} /> {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors">
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{item.name}</p>
                        {item.description && <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>}
                      </div>
                      <span className="text-red-400 font-bold">${Number(item.price).toFixed(2)}</span>
                      <button onClick={() => startEdit(item)} className="text-slate-400 hover:text-white transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => toggleItem(item.id, item.isAvailable)} className="text-slate-400 hover:text-white transition-colors">
                        {item.isAvailable ? <ToggleRight size={22} className="text-green-400" /> : <ToggleLeft size={22} />}
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
