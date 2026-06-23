'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/api'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const user = getUser()
    router.replace(user ? '/tables' : '/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
