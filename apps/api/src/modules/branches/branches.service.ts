import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async getByTenant(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId, isActive: true },
      include: {
        sections: { include: { tables: true } },
        printerConfigs: true,
      },
    })
  }
}
