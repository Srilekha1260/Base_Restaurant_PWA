import { useEffect, useRef } from 'react'
import { getSocket, joinBranch, leaveBranch, SocketEvent } from '@/lib/socket'

export function useSocket(branchId: string | null, handlers: Partial<Record<SocketEvent, (data: any) => void>>) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!branchId) return

    const socket = getSocket()
    joinBranch(branchId)

    const entries = Object.entries(handlersRef.current) as [SocketEvent, (data: any) => void][]
    for (const [event, handler] of entries) {
      socket.on(event, handler)
    }

    return () => {
      for (const [event, handler] of entries) {
        socket.off(event, handler)
      }
      leaveBranch(branchId)
    }
  }, [branchId])
}
