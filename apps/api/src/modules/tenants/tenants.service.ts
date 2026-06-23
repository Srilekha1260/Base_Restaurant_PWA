import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({ where: { isActive: true } })
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        branches: { include: { sections: { include: { tables: true } }, printerConfigs: true } },
        featureFlags: true,
        taxRules: true,
      },
    })
    if (!tenant) throw new NotFoundException('Tenant not found')
    return tenant
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } })
    if (!tenant) throw new NotFoundException('Tenant not found')
    return tenant
  }

  async create(data: {
    name: string
    slug: string
    currency?: string
    primaryColor?: string
    secondaryColor?: string
  }) {
    const tenant = await this.prisma.tenant.create({ data })
    // Default feature flags
    await this.prisma.featureFlag.createMany({
      data: [
        { tenantId: tenant.id, key: 'kitchen_display_enabled', value: false },
        { tenantId: tenant.id, key: 'dine_in_enabled', value: true },
        { tenantId: tenant.id, key: 'takeaway_enabled', value: true },
      ],
    })
    // Default GST rule
    await this.prisma.taxRule.create({
      data: { tenantId: tenant.id, name: 'GST 15%', rate: 0.15, isDefault: true },
    })
    return tenant
  }

  async update(id: string, data: Partial<{
    name: string
    logoUrl: string
    primaryColor: string
    secondaryColor: string
    deliveryEnabled: boolean
    deliveryProvider: string
    deliveryRedirectUrl: string
    deliveryButtonLabel: string
  }>) {
    return this.prisma.tenant.update({ where: { id }, data })
  }

  async seedDemoTenant() {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: 'demo-restaurant' } })
    if (existing) return existing

    const tenant = await this.create({
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
      primaryColor: '#1a1a1a',
      secondaryColor: '#e63946',
    })

    const branch = await this.prisma.branch.create({
      data: { tenantId: tenant.id, name: 'Main Branch', address: '1 Queen St, Auckland, NZ', phone: '+64 9 000 0000' },
    })

    const sectionNames = ['Indoor', 'Outdoor', 'Bar', 'Private']
    for (const name of sectionNames) {
      const section = await this.prisma.section.create({ data: { branchId: branch.id, name } })
      for (let t = 1; t <= 4; t++) {
        await this.prisma.table.create({ data: { sectionId: section.id, name: `${name[0]}${t}`, capacity: 4 } })
      }
    }

    await this.prisma.printerConfig.create({
      data: { branchId: branch.id, name: 'Kitchen Printer', ipAddress: '192.168.1.100', port: 9100, isDefault: true },
    })

    return tenant
  }
}
