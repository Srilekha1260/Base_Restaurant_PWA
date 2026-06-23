import { Module, forwardRef } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { OrdersController } from './orders.controller'
import { PublicTakeawayController } from './public-takeaway.controller'
import { SocketsModule } from '../sockets/sockets.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { PaymentsModule } from '../payments/payments.module'

@Module({
  imports: [SocketsModule, NotificationsModule, forwardRef(() => PaymentsModule)],
  providers: [OrdersService],
  controllers: [OrdersController, PublicTakeawayController],
  exports: [OrdersService],
})
export class OrdersModule {}
