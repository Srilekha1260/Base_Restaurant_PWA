export interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  domain?: string
  deliveryEnabled: boolean
  deliveryProvider?: string
  deliveryRedirectUrl?: string
  deliveryButtonLabel?: string
  currency: string
  gstRate: number
  createdAt: string
  updatedAt: string
  branches?: Branch[]
  featureFlags?: FeatureFlag[]
}

export interface Branch {
  id: string
  tenantId: string
  name: string
  address?: string
  phone?: string
  sections?: Section[]
}

export interface Section {
  id: string
  branchId: string
  name: string
  tables?: Table[]
}

export interface Table {
  id: string
  sectionId: string
  name: string
  capacity: number
  isActive: boolean
  hasActiveOrder?: boolean
}

export interface FeatureFlag {
  id: string
  tenantId: string
  key: string
  value: boolean
}

export interface TaxRule {
  id: string
  tenantId: string
  name: string
  rate: number
  isDefault: boolean
}

export interface PrinterConfig {
  id: string
  branchId: string
  name: string
  ipAddress?: string
  port?: number
  isDefault: boolean
}
