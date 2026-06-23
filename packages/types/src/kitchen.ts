import { KitchenTicketStatus, OrderItemStatus, OrderType } from './enums'

export interface KitchenTicket {
  id: string
  orderId: string
  printerId?: string
  status: KitchenTicketStatus
  printedAt?: string
  createdAt: string
  order?: KitchenOrderSummary
}

export interface KitchenOrderSummary {
  id: string
  type: OrderType
  tableName?: string
  sectionName?: string
  items: KitchenItemSummary[]
  createdAt: string
}

export interface KitchenItemSummary {
  id: string
  name: string
  quantity: number
  notes?: string
  status: OrderItemStatus
}
