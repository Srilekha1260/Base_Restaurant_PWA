import { Role } from './enums'

export interface User {
  id: string
  tenantId: string
  email: string
  name: string
  role: Role
  isActive: boolean
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface JwtPayload {
  sub: string
  email: string
  role: Role
  tenantId: string
}
