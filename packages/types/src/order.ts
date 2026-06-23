import { OrderItemStatus, OrderStatus, OrderType } from './enums'
import { MenuItem } from './menu'
import { Table } from './tenant'
import { User } from './user'

export interface Order {
  id: string
  branchId: string
  tableId?: string
  table?: Table
  userId?: string
  user?: User
  type: OrderType
  status: OrderStatus
  sessionId?: string
  notes?: string
  createdAt: string
  updatedAt: string
  orderItems?: OrderItem[]
  payment?: import('./payment').Payment
}

export interface OrderItem {
  id: string
  orderId: string
  menuItemId: string
  menuItem?: MenuItem
  quantity: number
  unitPrice: number
  notes?: string
  status: OrderItemStatus
  createdAt: string
  updatedAt: string
}

export interface CreateOrderDto {
  branchId: string
  tableId?: string
  type: OrderType
  sessionId?: string
  notes?: string
  items: CreateOrderItemDto[]
}

export interface CreateOrderItemDto {
  menuItemId: string
  quantity: number
  notes?: string
}

export interface AddOrderItemsDto {
  items: CreateOrderItemDto[]
}

export interface UpdateOrderItemDto {
  quantity?: number
  notes?: string
  status?: OrderItemStatus
}
