import { Controller, Get, Post, Body, Param, UseGuards, RawBodyRequest, Req, Headers } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('bill/:orderId')
  getBill(@Param('orderId') orderId: string) {
    return this.paymentsService.getOrderBill(orderId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('cash/:orderId')
  payWithCash(@Param('orderId') orderId: string, @Body() dto: any) {
    return this.paymentsService.payWithCash(orderId, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Post('eftpos/:orderId')
  processEftpos(@Param('orderId') orderId: string, @Body() dto: any) {
    return this.paymentsService.processEftpos(orderId, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Post('stripe/intent/:orderId')
  createStripeIntent(@Param('orderId') orderId: string) {
    return this.paymentsService.createStripePaymentIntent(orderId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('stripe/confirm/:orderId')
  confirmStripe(@Param('orderId') orderId: string, @Body() dto: { paymentIntentId: string }) {
    return this.paymentsService.confirmStripePayment(orderId, dto.paymentIntentId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('split/:orderId')
  splitBill(@Param('orderId') orderId: string, @Body() dto: { splits: any[] }) {
    return this.paymentsService.splitBill(orderId, dto.splits)
  }

  @UseGuards(JwtAuthGuard)
  @Post('split/:splitId/complete')
  completeSplit(@Param('splitId') splitId: string) {
    return this.paymentsService.completeSplitPayment(splitId)
  }

  // Stripe webhook — no auth, raw body required
  @Post('stripe/webhook')
  async stripeWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.paymentsService.handleStripeWebhook(req.rawBody, sig)
  }
}
