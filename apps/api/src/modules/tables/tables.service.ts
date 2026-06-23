import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async getTableStatusByBranch(branchId: string) {
    const sections = await this.prisma.section.findMany({
      where: { branchId, isActive: true },
      include: {
        tables: {
          where: { isActive: true },
          include: {
            orders: {
              where: { status: { in: ['OPEN', 'IN_KITCHEN', 'READY'] } },
              select: { id: true, status: true, createdAt: true },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return sections.map(section => ({
      ...section,
      tables: section.tables.map(table => ({
        ...table,
        hasActiveOrder: table.orders.length > 0,
        activeOrder: table.orders[0] || null,
      })),
    }))
  }

  async createSection(branchId: string, name: string) {
    return this.prisma.section.create({ data: { branchId, name } })
  }

  async createTable(sectionId: string, name: string, capacity = 4) {
    return this.prisma.table.create({ data: { sectionId, name, capacity } })
  }

  async updateTable(tableId: string, data: { name?: string; capacity?: number; isActive?: boolean }) {
    return this.prisma.table.update({ where: { id: tableId }, data })
  }
}
