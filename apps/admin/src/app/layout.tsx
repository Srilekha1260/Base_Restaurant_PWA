import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Admin – Demo Restaurant',
  description: 'Restaurant administration panel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}
