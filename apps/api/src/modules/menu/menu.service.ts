import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async getMenuByTenant(tenantIdOrSlug: string) {
    // The public website passes the tenant slug (e.g. "demo-restaurant"),
    // but staff/admin clients pass the tenant id — accept either.
    const tenant = await this.prisma.tenant.findFirst({
      where: { OR: [{ id: tenantIdOrSlug }, { slug: tenantIdOrSlug }] },
      select: { id: true },
    })
    if (!tenant) throw new NotFoundException('Tenant not found')

    return this.prisma.menuCategory.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })
  }

  async createCategory(tenantId: string, data: { name: string; sortOrder?: number }) {
    return this.prisma.menuCategory.create({ data: { tenantId, ...data } })
  }

  async updateCategory(categoryId: string, data: { name?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.menuCategory.update({ where: { id: categoryId }, data })
  }

  async createMenuItem(tenantId: string, data: {
    categoryId: string
    name: string
    description?: string
    price: number
    imageUrl?: string
    sortOrder?: number
  }) {
    return this.prisma.menuItem.create({ data: { tenantId, ...data } })
  }

  async updateMenuItem(itemId: string, data: {
    name?: string
    description?: string
    price?: number
    imageUrl?: string
    isAvailable?: boolean
    sortOrder?: number
    categoryId?: string
  }) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } })
    if (!item) throw new NotFoundException('Menu item not found')
    return this.prisma.menuItem.update({ where: { id: itemId }, data })
  }

  async deleteMenuItem(itemId: string) {
    return this.prisma.menuItem.delete({ where: { id: itemId } })
  }

  async deleteCategory(categoryId: string) {
    return this.prisma.menuCategory.delete({ where: { id: categoryId } })
  }
}
