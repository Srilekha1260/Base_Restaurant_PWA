import { PaymentMethod, PaymentStatus } from './enums'

export interface Payment {
  id: string
  orderId: string
  method: PaymentMethod
  totalAmount: number
  gstAmount: number
  tipAmount: number
  status: PaymentStatus
  stripePaymentIntentId?: string
  paidAt?: string
  createdAt: string
}

export interface SplitBill {
  id: string
  orderId: string
  splitNumber: number
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  paidAt?: string
  createdAt: string
}

export interface CreatePaymentDto {
  orderId: string
  method: PaymentMethod
  totalAmount: number
  tipAmount?: number
}

export interface CreateSplitBillDto {
  orderId: string
  splits: SplitBillItem[]
}

export interface SplitBillItem {
  amount: number
  method: PaymentMethod
}

export interface StripePaymentIntentDto {
  orderId: string
  amount: number
  currency?: string
}
