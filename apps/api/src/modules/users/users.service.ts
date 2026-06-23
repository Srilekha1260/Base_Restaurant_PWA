import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    })
  }

  async deactivate(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })
  }

  async updateUser(userId: string, dto: { name?: string; email?: string; role?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.role !== undefined ? { role: dto.role as any } : {}),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })
  }
}
