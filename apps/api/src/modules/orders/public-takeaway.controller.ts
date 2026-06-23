import { Body, Controller, Param, Post } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { PaymentsService } from '../payments/payments.service'
import { CreateTakeawayOrderDto } from './dto/create-takeaway-order.dto'

// Public, unauthenticated checkout for online takeaway customers.
@Controller('public/takeaway')
export class PublicTakeawayController {
  constructor(
    private ordersService: OrdersService,
    private paymentsService: PaymentsService,
  ) {}

  @Post('order')
  createOrder(@Body() dto: CreateTakeawayOrderDto) {
    return this.ordersService.createTakeawayOrder(dto)
  }

  @Post('order/:orderId/payment-intent')
  createPaymentIntent(@Param('orderId') orderId: string) {
    return this.paymentsService.createTakeawayPaymentIntent(orderId)
  }

  @Post('order/:orderId/confirm')
  confirmPayment(
    @Param('orderId') orderId: string,
    @Body() body: { paymentIntentId: string },
  ) {
    return this.paymentsService.confirmTakeawayPayment(orderId, body.paymentIntentId)
  }
}
