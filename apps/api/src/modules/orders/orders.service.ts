import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RestaurantGateway } from '../sockets/restaurant.gateway'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateTakeawayOrderDto } from './dto/create-takeaway-order.dto'
import { SocketEvent } from '@restaurant/types'

const GST_RATE = 0.15

export const takeawayOrderRef = (orderId: string) => `#${orderId.slice(-6).toUpperCase()}`

const ORDER_INCLUDE = {
  table: { include: { section: true } },
  user: { select: { id: true, name: true, role: true } },
  orderItems: {
    include: { menuItem: true },
    where: { status: { not: 'CANCELLED' as any } },
  },
  payment: true,
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private gateway: RestaurantGateway,
    private notifications: NotificationsService,
  ) {}

  // ─── Public takeaway (no auth) ───────────────────────────────────────────
  // Creates an order for a customer ordering online. Prices are always taken
  // from the database — never trusted from the client.
  async createTakeawayOrder(dto: CreateTakeawayOrderDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: dto.tenantSlug }, { id: dto.tenantSlug }], isActive: true },
      include: { branches: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
    })
    if (!tenant) throw new NotFoundException('Restaurant not found')
    const branch = tenant.branches[0]
    if (!branch) throw new BadRequestException('This restaurant is not accepting online orders')

    const itemIds = dto.items.map(i => i.menuItemId)
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: itemIds }, tenantId: tenant.id, isAvailable: true },
    })
    if (menuItems.length !== new Set(itemIds).size) {
      throw new BadRequestException('One or more selected items are unavailable')
    }
    const priceMap = new Map(menuItems.map(m => [m.id, m.price]))

    const isDelivery = dto.orderType === 'DELIVERY'
    if (isDelivery && !dto.deliveryAddress?.trim()) {
      throw new BadRequestException('A delivery address is required for delivery orders')
    }

    const order = await this.prisma.order.create({
      data: {
        branchId: branch.id,
        type: isDelivery ? 'DELIVERY' : 'TAKEAWAY',
        status: 'OPEN',
        notes: dto.notes,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        customerAddress: isDelivery ? dto.deliveryAddress!.trim() : undefined,
        orderItems: {
          create: dto.items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: priceMap.get(item.menuItemId)!,
          })),
        },
      },
      include: ORDER_INCLUDE,
    })

    const total = this.orderTotal(order)
    const payOnPickup = dto.paymentMethod !== 'CARD_STRIPE'

    if (payOnPickup) {
      // Cash / EFTPOS: confirm immediately, customer pays at the counter.
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          method: dto.paymentMethod as any,
          totalAmount: total,
          gstAmount: this.gstOf(total),
          status: 'PENDING',
        },
      })
      await this.finalizeTakeawayOrder(order.id, { paid: false, restaurantName: tenant.name })
    }

    return {
      orderId: order.id,
      orderRef: takeawayOrderRef(order.id),
      total,
      requiresOnlinePayment: !payOnPickup,
    }
  }

  // Sends the order to the kitchen (once) and emails the customer.
  // Called immediately for pay-on-pickup, or after a successful online payment.
  async finalizeTakeawayOrder(orderId: string, opts: { paid: boolean; restaurantName?: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { ...ORDER_INCLUDE, branch: { include: { tenant: true } } },
    })
    if (!order) throw new NotFoundException('Order not found')

    // Idempotent: only push to the kitchen the first time.
    if (order.status === 'OPEN') {
      const ticket = await this.prisma.kitchenTicket.create({ data: { orderId: order.id, status: 'PENDING' } })
      await this.prisma.orderItem.updateMany({
        where: { orderId: order.id, kitchenTicketId: null },
        data: { kitchenTicketId: ticket.id },
      })
      await this.prisma.order.update({ where: { id: order.id }, data: { status: 'IN_KITCHEN' } })
      this.gateway.emitToBranch(order.branchId, SocketEvent.ORDER_CREATED, {
        order,
        branchId: order.branchId,
      })
    }

    const total = this.orderTotal(order)
    await this.notifications.sendOrderConfirmation({
      orderRef: takeawayOrderRef(order.id),
      customerName: order.customerName || 'there',
      customerEmail: order.customerEmail || '',
      items: order.orderItems.map(i => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        lineTotal: Number(i.unitPrice) * i.quantity,
      })),
      total,
      gst: this.gstOf(total),
      paymentMethod: order.payment?.method || 'CASH',
      paid: opts.paid,
      restaurantName: opts.restaurantName || (order as any).branch?.tenant?.name || 'Restaurant',
    })
  }

  private orderTotal(order: { orderItems: Array<{ unitPrice: any; quantity: number }> }) {
    const total = order.orderItems.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0)
    return Math.round(total * 100) / 100
  }

  private gstOf(total: number) {
    return Math.round((total - total / (1 + GST_RATE)) * 100) / 100
  }

  async createOrder(userId: string, dto: {
    branchId: string
    tableId?: string
    type: string
    sessionId?: string
    notes?: string
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>
  }) {
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: dto.items.map(i => i.menuItemId) }, isAvailable: true },
    })
    if (menuItems.length !== dto.items.length) {
      throw new BadRequestException('One or more menu items are unavailable')
    }

    const priceMap = new Map(menuItems.map(m => [m.id, m.price]))

    const order = await this.prisma.order.create({
      data: {
        branchId: dto.branchId,
        tableId: dto.tableId,
        userId,
        type: dto.type as any,
        sessionId: dto.sessionId || undefined,
        notes: dto.notes,
        status: 'OPEN',
        orderItems: {
          create: dto.items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: priceMap.get(item.menuItemId)!,
            notes: item.notes,
          })),
        },
      },
      include: ORDER_INCLUDE,
    })

    // Send to kitchen — link the items just created to this ticket so the
    // kitchen display shows only this round's items.
    const ticket = await this.prisma.kitchenTicket.create({
      data: { orderId: order.id, status: 'PENDING' },
    })
    await this.prisma.orderItem.updateMany({
      where: { orderId: order.id, kitchenTicketId: null },
      data: { kitchenTicketId: ticket.id },
    })

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'IN_KITCHEN' },
    })

    this.gateway.emitToBranch(dto.branchId, SocketEvent.ORDER_CREATED, { order, branchId: dto.branchId })

    return order
  }

  async addItemsToOrder(orderId: string, userId: string, items: Array<{
    menuItemId: string; quantity: number; notes?: string
  }>) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } })
    if (!order) throw new NotFoundException('Order not found')
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot add items to a closed order')
    }

    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: items.map(i => i.menuItemId) } },
    })
    const priceMap = new Map(menuItems.map(m => [m.id, m.price]))

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderItems: {
          create: items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: priceMap.get(item.menuItemId)!,
            notes: item.notes,
          })),
        },
      },
      include: ORDER_INCLUDE,
    })

    // New kitchen ticket for the additional items only. Items from previous
    // rounds already have a kitchenTicketId, so only the new ones get linked.
    const ticket = await this.prisma.kitchenTicket.create({
      data: { orderId, status: 'PENDING' },
    })
    await this.prisma.orderItem.updateMany({
      where: { orderId, kitchenTicketId: null },
      data: { kitchenTicketId: ticket.id },
    })

    this.gateway.emitToBranch(order.branchId, SocketEvent.ORDER_UPDATED, { order: updated, branchId: order.branchId })

    return updated
  }

  async updateOrderItem(orderItemId: string, userId: string, data: {
    quantity?: number; notes?: string; status?: string
  }) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    })
    if (!item) throw new NotFoundException('Order item not found')

    // Record edit history
    for (const [field, newVal] of Object.entries(data)) {
      const oldVal = (item as any)[field]
      if (oldVal !== newVal) {
        await this.prisma.orderItemEdit.create({
          data: {
            orderItemId,
            fieldName: field,
            oldValue: String(oldVal ?? ''),
            newValue: String(newVal ?? ''),
            editedById: userId,
          },
        })
      }
    }

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { ...data, status: data.status as any },
      include: { menuItem: true },
    })

    this.gateway.emitToBranch(item.order.branchId, SocketEvent.ORDER_ITEM_UPDATED, {
      orderItem: updated,
      branchId: item.order.branchId,
    })

    return updated
  }

  async getOrdersByBranch(branchId: string, filters?: { status?: string; type?: string }) {
    return this.prisma.order.findMany({
      where: {
        branchId,
        ...(filters?.status ? { status: filters.status as any } : {}),
        ...(filters?.type ? { type: filters.type as any } : {}),
      },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
  }

  async getOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    })
    if (!order) throw new NotFoundException('Order not found')
    return order
  }

  async getActiveOrderForTable(tableId: string) {
    return this.prisma.order.findFirst({
      where: { tableId, status: { in: ['OPEN', 'IN_KITCHEN', 'READY'] } },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } })
    if (!order) throw new NotFoundException('Order not found')
    if (order.status === 'COMPLETED') throw new BadRequestException('Cannot cancel completed order')

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
      include: ORDER_INCLUDE,
    })

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'ORDER_CANCELLED',
        entityType: 'order',
        entityId: orderId,
      },
    })

    this.gateway.emitToBranch(order.branchId, SocketEvent.ORDER_CANCELLED, { order: updated, branchId: order.branchId })

    return updated
  }
}
