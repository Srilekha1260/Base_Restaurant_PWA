// ─── Integrated EFTPOS terminal ──────────────────────────────────────────────
//
// In a real restaurant the POS sends the exact amount to a physical EFTPOS
// terminal (Windcave / Smartpay / Stripe Terminal, etc.); the customer taps
// their card and the terminal returns an approved/declined result with an
// approval reference. The waiter never keys the amount in by hand.
//
// `EftposTerminal` is the seam for that. At go-live you implement this interface
// with a real gateway adapter and the rest of the app (service, controller, UI)
// stays exactly the same. `SimulatedTerminal` below is a stand-in that mimics a
// real terminal's timing and result so the flow can be demoed without hardware
// or a merchant account.

export interface TerminalChargeInput {
  /** Total to charge, GST-inclusive, including any tip. */
  amount: number
  /** Demo only: force a declined result to show the decline path. */
  simulateDecline?: boolean
}

export interface TerminalChargeResult {
  approved: boolean
  /** Approval/auth reference printed on the terminal receipt (on success). */
  reference?: string
  /** Human-readable reason when declined. */
  declineReason?: string
}

export interface EftposTerminal {
  charge(input: TerminalChargeInput): Promise<TerminalChargeResult>
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export class SimulatedTerminal implements EftposTerminal {
  // Roughly how long a real tap + bank authorisation takes, so the on-screen
  // "processing" state feels real during a demo.
  private readonly processingMs = 2500

  async charge({ amount, simulateDecline }: TerminalChargeInput): Promise<TerminalChargeResult> {
    await wait(this.processingMs)

    if (simulateDecline) {
      return { approved: false, declineReason: 'Card declined — please try another card' }
    }

    return { approved: true, reference: this.makeReference() }
  }

  // Mimics the approval/auth code a terminal prints, e.g. "EFT-7F3A21".
  private makeReference(): string {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    return `EFT-${code}`
  }
}
