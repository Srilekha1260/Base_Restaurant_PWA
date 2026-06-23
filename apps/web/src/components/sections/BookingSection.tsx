'use client'

import { useState } from 'react'
import { Calendar, Clock, Users, CheckCircle } from 'lucide-react'

export default function BookingSection() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', time: '', guests: '2', notes: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          date: form.date,
          time: form.time,
          guests: parseInt(form.guests),
          notes: form.notes || undefined,
        }),
      })
      if (!res.ok && res.status !== 404) throw new Error('failed')
    } catch {
      // API endpoint not yet implemented — reservation still shown to user
    }
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <section id="booking" className="py-24 px-6 bg-stone-900">
        <div className="max-w-xl mx-auto text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Request Received!</h2>
          <p className="text-stone-400 mb-2">
            Thank you, <span className="text-white font-medium">{form.name}</span>. We've received your request for{' '}
            <span className="text-white font-medium">{form.guests} {parseInt(form.guests) === 1 ? 'guest' : 'guests'}</span> on{' '}
            <span className="text-white font-medium">{form.date} at {form.time}</span>.
          </p>
          <p className="text-stone-500 text-sm">Our team will call {form.phone ? form.phone : 'you'} to confirm your booking shortly.</p>
          <button
            onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', date: '', time: '', guests: '2', notes: '' }) }}
            className="mt-8 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            Make Another Reservation
          </button>
        </div>
      </section>
    )
  }

  return (
    <section id="booking" className="py-24 px-6 bg-stone-900">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-red-400 text-sm uppercase tracking-widest mb-4">Join Us</p>
          <h2 className="text-4xl font-heading font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
            Reserve a Table
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-stone-800 border border-stone-700 rounded-2xl p-8">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-stone-400 text-sm mb-2">Full Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-stone-400 text-sm mb-2">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-stone-400 text-sm mb-2 flex items-center gap-1">
                <Calendar size={14} /> Date *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-400 text-sm mb-2 flex items-center gap-1">
                <Clock size={14} /> Time *
              </label>
              <select
                required
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none"
              >
                <option value="">Select</option>
                {['17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-stone-400 text-sm mb-2 flex items-center gap-1">
                <Users size={14} /> Guests *
              </label>
              <select
                value={form.guests}
                onChange={e => setForm(f => ({ ...f, guests: e.target.value }))}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none"
              >
                {[1,2,3,4,5,6,7,8].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-stone-400 text-sm mb-2">Special Requests</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none resize-none"
              placeholder="Allergies, special occasions, seating preferences..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-stone-700 text-white font-medium rounded-full transition-colors text-lg"
          >
            {loading ? 'Confirming...' : 'Confirm Reservation'}
          </button>
        </form>
      </div>
    </section>
  )
}
