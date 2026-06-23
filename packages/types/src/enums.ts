export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  WAITER = 'WAITER',
  CASHIER = 'CASHIER',
  KITCHEN = 'KITCHEN',
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
}

export enum OrderStatus {
  OPEN = 'OPEN',
  IN_KITCHEN = 'IN_KITCHEN',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OrderItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD_STRIPE = 'CARD_STRIPE',
  CARD_EFTPOS = 'CARD_EFTPOS',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
}

export enum KitchenTicketStatus {
  PENDING = 'PENDING',
  PRINTED = 'PRINTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}
