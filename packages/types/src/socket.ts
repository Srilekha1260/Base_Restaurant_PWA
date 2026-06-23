import { Order } from './order'
import { KitchenTicket } from './kitchen'

export enum SocketEvent {
  // Order events
  ORDER_CREATED = 'order:created',
  ORDER_UPDATED = 'order:updated',
  ORDER_ITEM_UPDATED = 'order:item:updated',
  ORDER_COMPLETED = 'order:completed',
  ORDER_CANCELLED = 'order:cancelled',

  // Kitchen events
  KITCHEN_TICKET_CREATED = 'kitchen:ticket:created',
  KITCHEN_TICKET_UPDATED = 'kitchen:ticket:updated',
  KITCHEN_ITEM_STATUS = 'kitchen:item:status',

  // Table events
  TABLE_OPENED = 'table:opened',
  TABLE_CLOSED = 'table:closed',

  // Join/leave rooms
  JOIN_BRANCH = 'branch:join',
  LEAVE_BRANCH = 'branch:leave',
}

export interface OrderCreatedPayload {
  order: Order
  branchId: string
}

export interface OrderUpdatedPayload {
  order: Order
  branchId: string
}

export interface KitchenTicketPayload {
  ticket: KitchenTicket
  branchId: string
}

export interface TableStatusPayload {
  tableId: string
  sessionId: string
  hasActiveOrder: boolean
  branchId: string
}
