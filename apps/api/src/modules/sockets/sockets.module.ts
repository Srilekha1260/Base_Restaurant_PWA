import { Module } from '@nestjs/common'
import { RestaurantGateway } from './restaurant.gateway'

@Module({
  providers: [RestaurantGateway],
  exports: [RestaurantGateway],
})
export class SocketsModule {}
