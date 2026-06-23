'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getUser } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { Save } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    primaryColor: '#1a1a1a',
    secondaryColor: '#e63946',
    deliveryEnabled: false,
    deliveryProvider: '',
    deliveryRedirectUrl: '',
    deliveryButtonLabel: 'Order on Uber Eats',
  })
  const [tenantId, setTenantId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user) { router.push('/login'); return }
    api.get<any>(`/tenants/${user.tenantId}`).then(data => {
      setTenantId(data.id)
      setForm({
        name: data.name,
        primaryColor: data.primaryColor || '#1a1a1a',
        secondaryColor: data.secondaryColor || '#e63946',
        deliveryEnabled: data.deliveryEnabled,
        deliveryProvider: data.deliveryProvider || '',
        deliveryRedirectUrl: data.deliveryRedirectUrl || '',
        deliveryButtonLabel: data.deliveryButtonLabel || 'Order on Uber Eats',
      })
    }).catch(() => {
      // 401 handled in api.ts; swallow to avoid an uncaught rejection
    })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.patch(`/tenants/${tenantId}`, form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-slate-400 text-sm mb-2">{label}</label>
      {type === 'checkbox' ? (
        <label className="flex items-center gap-3 cursor-pointer">
          <div className={`w-11 h-6 rounded-full transition-colors relative ${form[key] ? 'bg-red-600' : 'bg-slate-700'}`}
            onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form[key] ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
          <span className="text-white text-sm">{form[key] ? 'Enabled' : 'Disabled'}</span>
        </label>
      ) : (
        <input type={type} value={form[key] as string}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-red-500 focus:outline-none text-sm" />
      )}
    </div>
  )

  return (
    <AdminLayout>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          {saved && <span className="text-green-400 text-sm">✓ Saved</span>}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold">Branding</h2>
            {field('Restaurant Name', 'name')}
            <div className="grid grid-cols-2 gap-4">
              {field('Primary Color', 'primaryColor', 'color')}
              {field('Secondary Color', 'secondaryColor', 'color')}
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold">Delivery Configuration</h2>
            <p className="text-slate-500 text-xs">Delivery orders redirect users to your external delivery platform (e.g. Uber Eats).</p>
            {field('Enable Delivery', 'deliveryEnabled', 'checkbox')}
            {form.deliveryEnabled && (
              <>
                {field('Delivery Provider', 'deliveryProvider', 'text', 'e.g. Uber Eats')}
                {field('Redirect URL', 'deliveryRedirectUrl', 'url', 'https://www.ubereats.com/...')}
                {field('Button Label', 'deliveryButtonLabel', 'text', 'Order on Uber Eats')}
              </>
            )}
          </div>

          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white font-medium rounded-xl transition-colors">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
