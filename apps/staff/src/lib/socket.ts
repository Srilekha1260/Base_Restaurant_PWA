import { io, Socket } from 'socket.io-client'
import { SocketEvent } from '@restaurant/types'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}/restaurant`, {
      autoConnect: false,
      auth: { token: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '' },
    })
  }
  return socket
}

export function joinBranch(branchId: string) {
  const s = getSocket()
  if (!s.connected) s.connect()
  s.emit(SocketEvent.JOIN_BRANCH, { branchId })
}

export function leaveBranch(branchId: string) {
  getSocket().emit(SocketEvent.LEAVE_BRANCH, { branchId })
}

export { SocketEvent }
