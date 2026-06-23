import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common'
import Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'
import { OrdersService } from '../orders/orders.service'
import { EftposTerminal, SimulatedTerminal } from './terminal/eftpos-terminal'

@Injectable()
export class PaymentsService {
  private stripe: Stripe
  // Swap SimulatedTerminal for a real gateway adapter (Windcave / Smartpay /
  // Stripe Terminal) at go-live — nothing else in this service changes.
  private terminal: EftposTerminal = new SimulatedTerminal()

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
      apiVersion: '2023-10-16',
    })
  }

  // ─── Public takeaway payments (no auth) ──────────────────────────────────
  // Creates a PaymentIntent for an online card payment. The amount is always
  // recomputed from the order in the database, never taken from the client.
  // `automatic_payment_methods` lets Stripe present cards, Apple Pay and
  // Google Pay in the Payment Element, with 3-D Secure handled automatically.
  async createTakeawayPaymentIntent(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: { where: { status: { not: 'CANCELLED' } } } },
    })
    if (!order) throw new NotFoundException('Order not found')
    if (order.status === 'COMPLETED') throw new BadRequestException('Order already paid')

    const total = order.orderItems.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0,
    )
    const amountCents = Math.round(total * 100)
    if (amountCents <= 0) throw new BadRequestException('Order total must be greater than zero')

    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'nzd',
      automatic_payment_methods: { enabled: true },
      metadata: { orderId, kind: 'takeaway' },
      receipt_email: order.customerEmail || undefined,
    })

    return { clientSecret: intent.client_secret, amount: total }
  }

  // Verifies the payment directly with Stripe (source of truth), records it,
  // then sends the order to the kitchen and emails the customer.
  async confirmTakeawayPayment(orderId: string, paymentIntentId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: { where: { status: { not: 'CANCELLED' } } }, payment: true },
    })
    if (!order) throw new NotFoundException('Order not found')

    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId)
    if (intent.metadata?.orderId !== orderId) {
      throw new BadRequestException('Payment does not match this order')
    }
    if (intent.status !== 'succeeded') {
      throw new BadRequestException('Payment has not been completed')
    }

    const total = order.orderItems.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0,
    )
    if (Math.abs(intent.amount - Math.round(total * 100)) > 1) {
      throw new BadRequestException('Paid amount does not match the order total')
    }

    // Idempotent: only record the payment once.
    if (!order.payment || order.payment.status !== 'COMPLETED') {
      const gstAmount = total - total / 1.15
      await this.prisma.payment.upsert({
        where: { orderId },
        create: {
          orderId,
          method: 'CARD_STRIPE',
          totalAmount: total,
          gstAmount: Math.round(gstAmount * 100) / 100,
          status: 'COMPLETED',
          stripePaymentIntentId: paymentIntentId,
          paidAt: new Date(),
        },
        update: {
          method: 'CARD_STRIPE',
          status: 'COMPLETED',
          stripePaymentIntentId: paymentIntentId,
          paidAt: new Date(),
        },
      })
    }

    await this.ordersService.finalizeTakeawayOrder(orderId, { paid: true })

    return { orderId, paid: true }
  }

  async getOrderBill(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { menuItem: true },
          where: { status: { not: 'CANCELLED' } },
        },
        table: { include: { section: true } },
      },
    })
    if (!order) throw new NotFoundException('Order not found')

    const subtotal = order.orderItems.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    )

    // GST is included in prices (NZ GST-inclusive pricing)
    const gstRate = 0.15
    const gstAmount = subtotal - subtotal / (1 + gstRate)

    return {
      order,
      subtotal,
      gstAmount: Math.round(gstAmount * 100) / 100,
      total: subtotal,
    }
  }

  async payWithCash(orderId: string, dto: { totalAmount: number; tipAmount?: number }) {
    return this.recordPayment(orderId, 'CASH', dto)
  }

  // Integrated EFTPOS: the amount is pushed to the terminal (no manual entry),
  // the customer taps their card, and the terminal returns approved/declined.
  // We hold the payment in PROCESSING while the terminal works, then settle it.
  async processEftpos(
    orderId: string,
    dto: { totalAmount: number; tipAmount?: number; simulateDecline?: boolean },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } })
    if (!order) throw new NotFoundException('Order not found')
    if (order.status === 'COMPLETED') throw new BadRequestException('Order already paid')

    const gstRate = 0.15
    const gstAmount = Math.round((dto.totalAmount - dto.totalAmount / (1 + gstRate)) * 100) / 100

    // One payment row per order (orderId is unique), so a retry after a decline
    // reuses the same row rather than creating a duplicate.
    const base = {
      method: 'CARD_EFTPOS' as const,
      totalAmount: dto.totalAmount,
      gstAmount,
      tipAmount: dto.tipAmount || 0,
      status: 'PROCESSING' as const,
      terminalReference: null,
      paidAt: null,
    }
    await this.prisma.payment.upsert({
      where: { orderId },
      create: { orderId, ...base },
      update: base,
    })

    const result = await this.terminal.charge({
      amount: dto.totalAmount,
      simulateDecline: dto.simulateDecline,
    })

    if (!result.approved) {
      const payment = await this.prisma.payment.update({
        where: { orderId },
        data: { status: 'FAILED' },
      })
      return { status: 'DECLINED' as const, declineReason: result.declineReason, payment }
    }

    const payment = await this.prisma.payment.update({
      where: { orderId },
      data: { status: 'COMPLETED', terminalReference: result.reference, paidAt: new Date() },
    })
    await this.prisma.order.update({ where: { id: orderId }, data: { status: 'COMPLETED' } })

    return { status: 'APPROVED' as const, reference: result.reference, payment }
  }

  async createStripePaymentIntent(orderId: string) {
    const bill = await this.getOrderBill(orderId)
    const amountCents = Math.round(bill.total * 100)

    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'nzd',
      metadata: { orderId },
    })

    return { clientSecret: intent.client_secret, paymentIntentId: intent.id }
  }

  async confirmStripePayment(orderId: string, paymentIntentId: string) {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId)
    if (intent.status !== 'succeeded') {
      throw new BadRequestException('Stripe payment has not succeeded')
    }

    return this.recordPayment(orderId, 'CARD_STRIPE', {
      totalAmount: intent.amount / 100,
      stripePaymentIntentId: paymentIntentId,
    })
  }

  async splitBill(orderId: string, splits: Array<{ amount: number; method: string }>) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } })
    if (!order) throw new NotFoundException('Order not found')
    if (order.status === 'COMPLETED') throw new BadRequestException('Order already paid')

    const bill = await this.getOrderBill(orderId)
    const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0)
    if (Math.abs(totalSplit - bill.total) > 0.01) {
      throw new BadRequestException('Split amounts must equal the order total')
    }

    const splitBills = await this.prisma.$transaction(
      splits.map((split, i) =>
        this.prisma.splitBill.create({
          data: {
            orderId,
            splitNumber: i + 1,
            amount: split.amount,
            method: split.method as any,
            status: 'PENDING',
          },
        }),
      ),
    )

    return splitBills
  }

  async completeSplitPayment(splitBillId: string) {
    const split = await this.prisma.splitBill.findUnique({
      where: { id: splitBillId },
      include: { order: true },
    })
    if (!split) throw new NotFoundException('Split bill not found')

    const updated = await this.prisma.splitBill.update({
      where: { id: splitBillId },
      data: { status: 'COMPLETED', paidAt: new Date() },
    })

    // If all splits paid, mark order complete
    const pendingSplits = await this.prisma.splitBill.count({
      where: { orderId: split.orderId, status: 'PENDING' },
    })
    if (pendingSplits === 0) {
      await this.prisma.order.update({
        where: { id: split.orderId },
        data: { status: 'COMPLETED' },
      })
    }

    return updated
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || '',
    )

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent
      const orderId = intent.metadata.orderId
      if (orderId) {
        // Takeaway orders are finalized differently (kitchen ticket + email),
        // and must not be marked COMPLETED until the customer collects.
        if (intent.metadata.kind === 'takeaway') {
          await this.confirmTakeawayPayment(orderId, intent.id)
        } else {
          await this.confirmStripePayment(orderId, intent.id)
        }
      }
    }
  }

  private async recordPayment(
    orderId: string,
    method: string,
    data: { totalAmount: number; tipAmount?: number; stripePaymentIntentId?: string },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } })
    if (!order) throw new NotFoundException('Order not found')
    if (order.status === 'COMPLETED') throw new BadRequestException('Order already paid')

    const gstRate = 0.15
    const gstAmount = Math.round((data.totalAmount - data.totalAmount / (1 + gstRate)) * 100) / 100

    // Upsert so a payment can succeed after an earlier failed attempt on the
    // same order (e.g. EFTPOS declined, then paid by cash) — orderId is unique.
    const fields = {
      method: method as any,
      totalAmount: data.totalAmount,
      gstAmount,
      tipAmount: data.tipAmount || 0,
      status: 'COMPLETED' as const,
      stripePaymentIntentId: data.stripePaymentIntentId,
      terminalReference: null,
      paidAt: new Date(),
    }
    const payment = await this.prisma.payment.upsert({
      where: { orderId },
      create: { orderId, ...fields },
      update: fields,
    })

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    })

    return payment
  }
}
