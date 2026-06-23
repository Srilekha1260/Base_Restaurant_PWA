export interface MenuCategory {
  id: string
  tenantId: string
  name: string
  sortOrder: number
  isActive: boolean
  menuItems?: MenuItem[]
}

export interface MenuItem {
  id: string
  tenantId: string
  categoryId: string
  category?: MenuCategory
  name: string
  description?: string
  price: number
  imageUrl?: string
  isAvailable: boolean
  sortOrder: number
}
