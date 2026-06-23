'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Grid, ShoppingBag, LogOut } from 'lucide-react'
import { logout, getUser } from '@/lib/api'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  // Read from localStorage only after mount so server and client render the same
  // initial HTML (avoids a hydration mismatch that crashes the whole root).
  const [user, setUser] = useState<{ name?: string } | null>(null)
  useEffect(() => { setUser(getUser()) }, [])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const tabs = [
    { href: '/tables', label: 'Tables', icon: Grid },
    { href: '/takeaway', label: 'Takeaway', icon: ShoppingBag },
  ]

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-white font-semibold">Demo Restaurant</span>
          {user && <span className="text-gray-400 text-sm ml-2">· {user.name}</span>}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <LogOut size={16} /> Logout
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Bottom tab bar */}
      <nav className="bg-gray-800 border-t border-gray-700 flex">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon size={22} />
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
