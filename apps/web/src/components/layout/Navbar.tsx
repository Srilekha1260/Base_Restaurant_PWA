'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { href: '/menu', label: 'Menu' },
  { href: '/takeaway', label: 'Order' },
  { href: '/#booking', label: 'Reservations' },
  { href: '/#about', label: 'About' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-stone-950/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-heading font-bold text-white tracking-wide">
          Demo Restaurant
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex gap-8">
          {navLinks.map(link => {
            const isActive = link.href.startsWith('/') && !link.href.startsWith('/#') && pathname === link.href
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`transition-colors text-sm uppercase tracking-wider ${isActive ? 'text-red-400 font-semibold' : 'text-stone-300 hover:text-red-400'}`}
                >
                  {link.label}
                </a>
              </li>
            )
          })}
        </ul>

        <a
          href="/#booking"
          className="hidden md:inline-flex items-center px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full transition-colors"
        >
          Reserve a Table
        </a>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-stone-950 border-t border-stone-800 px-6 py-4 space-y-4">
          {navLinks.map(link => {
            const isActive = link.href.startsWith('/') && !link.href.startsWith('/#') && pathname === link.href
            return (
              <a
                key={link.href}
                href={link.href}
                className={`block text-sm uppercase tracking-wider ${isActive ? 'text-red-400 font-semibold' : 'text-stone-300 hover:text-red-400'}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            )
          })}
          <a
            href="/#booking"
            className="block text-center px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-full"
            onClick={() => setOpen(false)}
          >
            Reserve a Table
          </a>
        </div>
      )}
    </nav>
  )
}
