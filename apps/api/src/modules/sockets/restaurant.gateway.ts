import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { SocketEvent } from '@restaurant/types'

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/restaurant',
})
export class RestaurantGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage(SocketEvent.JOIN_BRANCH)
  handleJoinBranch(@ConnectedSocket() client: Socket, @MessageBody() data: { branchId: string }) {
    client.join(`branch:${data.branchId}`)
    return { status: 'joined', room: `branch:${data.branchId}` }
  }

  @SubscribeMessage(SocketEvent.LEAVE_BRANCH)
  handleLeaveBranch(@ConnectedSocket() client: Socket, @MessageBody() data: { branchId: string }) {
    client.leave(`branch:${data.branchId}`)
  }

  emitToBranch(branchId: string, event: string, data: any) {
    this.server.to(`branch:${branchId}`).emit(event, data)
  }
}
