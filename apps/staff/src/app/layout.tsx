import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Staff – Demo Restaurant',
  description: 'Waiter order management',
  manifest: '/manifest.json',
  appleWebApp: { statusBarStyle: 'black-translucent', title: 'Staff App' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#111827',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-900 text-gray-100 antialiased select-none" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
