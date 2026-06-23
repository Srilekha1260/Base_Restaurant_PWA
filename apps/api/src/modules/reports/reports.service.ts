import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesSummary(branchId: string, from: Date, to: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        status: 'COMPLETED',
        createdAt: { gte: from, lte: to },
      },
      include: {
        payment: true,
        orderItems: { include: { menuItem: { include: { category: true } } } },
      },
    })

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.payment?.totalAmount || 0), 0)
    const totalGst = orders.reduce((sum, o) => sum + Number(o.payment?.gstAmount || 0), 0)
    const orderCount = orders.length

    // Dish-wise breakdown
    const dishMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    const categoryMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    const paymentMethodMap = new Map<string, { count: number; amount: number }>()

    for (const order of orders) {
      for (const item of order.orderItems) {
        const dishKey = item.menuItemId
        const existing = dishMap.get(dishKey) || { name: item.menuItem.name, quantity: 0, revenue: 0 }
        dishMap.set(dishKey, {
          name: item.menuItem.name,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + Number(item.unitPrice) * item.quantity,
        })

        const catKey = item.menuItem.categoryId
        const catExisting = categoryMap.get(catKey) || { name: item.menuItem.category?.name || '', quantity: 0, revenue: 0 }
        categoryMap.set(catKey, {
          name: item.menuItem.category?.name || '',
          quantity: catExisting.quantity + item.quantity,
          revenue: catExisting.revenue + Number(item.unitPrice) * item.quantity,
        })
      }

      if (order.payment) {
        const method = order.payment.method
        const existing = paymentMethodMap.get(method) || { count: 0, amount: 0 }
        paymentMethodMap.set(method, {
          count: existing.count + 1,
          amount: existing.amount + Number(order.payment.totalAmount),
        })
      }
    }

    return {
      period: { from, to },
      totalRevenue,
      totalGst,
      orderCount,
      dishBreakdown: Array.from(dishMap.values()).sort((a, b) => b.quantity - a.quantity),
      categoryBreakdown: Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue),
      paymentMethodBreakdown: Array.from(paymentMethodMap.entries()).map(([method, data]) => ({ method, ...data })),
    }
  }

  async getTableReport(branchId: string, from: Date, to: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        type: 'DINE_IN',
        status: 'COMPLETED',
        createdAt: { gte: from, lte: to },
      },
      include: {
        table: { include: { section: true } },
        payment: true,
        orderItems: true,
      },
    })

    const tableMap = new Map<string, { tableName: string; sectionName: string; orderCount: number; revenue: number }>()
    for (const order of orders) {
      if (!order.table) continue
      const key = order.tableId!
      const existing = tableMap.get(key) || {
        tableName: order.table.name,
        sectionName: order.table.section.name,
        orderCount: 0,
        revenue: 0,
      }
      tableMap.set(key, {
        ...existing,
        orderCount: existing.orderCount + 1,
        revenue: existing.revenue + Number(order.payment?.totalAmount || 0),
      })
    }

    return Array.from(tableMap.values()).sort((a, b) => b.revenue - a.revenue)
  }

  async getCancelledItems(branchId: string, from: Date, to: Date) {
    return this.prisma.orderItemEdit.findMany({
      where: {
        editedAt: { gte: from, lte: to },
        orderItem: { order: { branchId } },
      },
      include: {
        orderItem: { include: { menuItem: true, order: { include: { table: true } } } },
      },
      orderBy: { editedAt: 'desc' },
    })
  }
}
