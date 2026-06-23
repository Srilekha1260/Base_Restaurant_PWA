import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    })

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password')
    }

    return this.generateTokens(user)
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      })
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
      if (!user || !user.isActive) throw new UnauthorizedException()
      return this.generateTokens(user)
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }

  async createUser(data: {
    tenantId: string
    email: string
    password: string
    name: string
    role: string
  }) {
    const existing = await this.prisma.user.findFirst({
      where: { tenantId: data.tenantId, email: data.email },
    })
    if (existing) throw new BadRequestException('Email already registered for this tenant')

    const passwordHash = await bcrypt.hash(data.password, 10)
    return this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role as any,
      },
      select: { id: true, email: true, name: true, role: true, tenantId: true },
    })
  }

  private generateTokens(user: { id: string; email: string; role: string; tenantId: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId }
    return {
      accessToken: this.jwt.sign(payload),
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }),
      user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    }
  }
}
