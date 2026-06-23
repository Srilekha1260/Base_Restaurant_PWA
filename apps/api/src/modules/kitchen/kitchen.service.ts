import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RestaurantGateway } from '../sockets/restaurant.gateway'
import { SocketEvent } from '@restaurant/types'

@Injectable()
export class KitchenService {
  constructor(
    private prisma: PrismaService,
    private gateway: RestaurantGateway,
  ) {}

  async getActiveTickets(branchId: string) {
    return this.prisma.kitchenTicket.findMany({
      where: {
        status: { in: ['PENDING', 'PRINTED', 'IN_PROGRESS'] },
        order: { branchId },
      },
      include: {
        // Only the items fired in THIS ticket — not the whole order — so a new
        // round for a table doesn't re-show items from an earlier (done) ticket.
        orderItems: {
          include: { menuItem: true },
          where: { status: { not: 'CANCELLED' } },
        },
        order: {
          include: {
            table: { include: { section: true } },
          },
        },
        printer: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async updateTicketStatus(ticketId: string, status: string) {
    const ticket = await this.prisma.kitchenTicket.update({
      where: { id: ticketId },
      data: { status: status as any, ...(status === 'PRINTED' ? { printedAt: new Date() } : {}) },
      include: {
        order: {
          include: {
            table: { include: { section: true } },
            orderItems: { include: { menuItem: true } },
            payment: true,
          },
        },
      },
    })

    if (status === 'DONE') {
      if (ticket.order.type === 'DINE_IN') {
        // Dine-in: food is ready; staff still serve and take payment at the table.
        await this.prisma.order.update({
          where: { id: ticket.orderId },
          data: { status: 'READY' },
        })
      } else {
        // Online (takeaway/delivery): paid online (card) or on collection
        // (cash/EFTPOS). Finishing it in the kitchen completes the sale, so it
        // shows up in the admin dashboard and sales report.
        await this.prisma.order.update({
          where: { id: ticket.orderId },
          data: { status: 'COMPLETED' },
        })
        if (ticket.order.payment && ticket.order.payment.status !== 'COMPLETED') {
          await this.prisma.payment.update({
            where: { orderId: ticket.orderId },
            data: { status: 'COMPLETED', paidAt: new Date() },
          })
        }
      }
    }

    this.gateway.emitToBranch(ticket.order.branchId, SocketEvent.KITCHEN_TICKET_UPDATED, {
      ticket,
      branchId: ticket.order.branchId,
    })

    return ticket
  }

  async updateItemStatus(orderItemId: string, status: string) {
    const item = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: status as any },
      include: { order: true, menuItem: true },
    })

    this.gateway.emitToBranch(item.order.branchId, SocketEvent.KITCHEN_ITEM_STATUS, {
      orderItem: item,
      branchId: item.order.branchId,
    })

    return item
  }
}
