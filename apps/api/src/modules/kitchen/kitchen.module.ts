import { Module } from '@nestjs/common'
import { KitchenService } from './kitchen.service'
import { KitchenController } from './kitchen.controller'
import { SocketsModule } from '../sockets/sockets.module'

@Module({
  imports: [SocketsModule],
  providers: [KitchenService],
  controllers: [KitchenController],
})
export class KitchenModule {}
