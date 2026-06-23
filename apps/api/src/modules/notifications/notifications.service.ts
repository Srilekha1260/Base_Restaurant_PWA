import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'

export interface OrderConfirmationData {
  orderRef: string
  customerName: string
  customerEmail: string
  items: Array<{ name: string; quantity: number; lineTotal: number }>
  total: number
  gst: number
  paymentMethod: string
  paid: boolean
  restaurantName: string
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Cash on pickup',
  CARD_EFTPOS: 'EFTPOS on pickup',
  CARD_STRIPE: 'Paid online by card',
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private readonly resend: Resend | null
  private readonly from: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    // Resend's onboarding sender works without a verified domain for testing.
    this.from = process.env.ORDER_FROM_EMAIL || 'Demo Restaurant <onboarding@resend.dev>'
    this.resend = apiKey ? new Resend(apiKey) : null
    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY not set — order confirmation emails will be logged instead of sent.',
      )
    }
  }

  async sendOrderConfirmation(data: OrderConfirmationData): Promise<void> {
    if (!data.customerEmail) return

    const subject = `${data.restaurantName} — Order ${data.orderRef} confirmed`
    const html = this.buildOrderEmailHtml(data)

    if (!this.resend) {
      // Graceful no-op in test/dev without a key, so the order flow still works.
      this.logger.log(`[email skipped — no key] To: ${data.customerEmail} | ${subject}`)
      return
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: data.customerEmail,
        subject,
        html,
      })
      if (error) {
        this.logger.error(`Failed to send confirmation email: ${JSON.stringify(error)}`)
      } else {
        this.logger.log(`Confirmation email sent to ${data.customerEmail} for ${data.orderRef}`)
      }
    } catch (err) {
      // Never let a notification failure break order placement.
      this.logger.error(`Error sending confirmation email: ${(err as Error).message}`)
    }
  }

  private buildOrderEmailHtml(data: OrderConfirmationData): string {
    const rows = data.items
      .map(
        i => `
        <tr>
          <td style="padding:8px 0;color:#444;">${i.quantity}× ${i.name}</td>
          <td style="padding:8px 0;color:#444;text-align:right;">$${i.lineTotal.toFixed(2)}</td>
        </tr>`,
      )
      .join('')

    const paymentLine = data.paid
      ? `<p style="color:#16a34a;font-weight:600;margin:4px 0;">Payment received — ${PAYMENT_LABEL[data.paymentMethod] || data.paymentMethod}</p>`
      : `<p style="color:#b45309;font-weight:600;margin:4px 0;">${PAYMENT_LABEL[data.paymentMethod] || data.paymentMethod} — please pay when you collect.</p>`

    return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="color:#dc2626;font-size:22px;margin:0 0 4px;">${data.restaurantName}</h1>
      <p style="color:#666;margin:0 0 20px;">Takeaway order confirmation</p>

      <div style="background:#f7f7f7;border-radius:12px;padding:20px;">
        <p style="margin:0 0 4px;color:#111;">Hi ${data.customerName},</p>
        <p style="margin:0 0 16px;color:#444;">Thanks for your order! Here are the details:</p>

        <p style="margin:0 0 12px;font-size:18px;color:#111;font-weight:700;">Order ${data.orderRef}</p>

        <table style="width:100%;border-collapse:collapse;">${rows}</table>

        <hr style="border:none;border-top:1px solid #ddd;margin:12px 0;" />
        <table style="width:100%;border-collapse:collapse;color:#444;">
          <tr><td>GST (15%)</td><td style="text-align:right;">$${data.gst.toFixed(2)}</td></tr>
          <tr><td style="font-weight:700;color:#111;padding-top:6px;">Total</td>
              <td style="text-align:right;font-weight:700;color:#111;padding-top:6px;">$${data.total.toFixed(2)}</td></tr>
        </table>

        ${paymentLine}
      </div>

      <p style="color:#888;font-size:13px;margin-top:20px;">
        Your order is being prepared and will be ready for collection shortly. See you soon!
      </p>
    </div>`
  }
}
