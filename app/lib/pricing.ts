// Dual-tier pricing: global (USD via Stripe) vs Ghana (GHS via Paystack)
// Amounts in smallest units: USD cents, GHS pesewas (1 GHS = 100 pesewas)

export type Currency = 'USD' | 'GHS'

export type Tier = {
  oneTime: number      // smallest unit (cents / pesewas)
  monthly: number
  oneTimeLabel: string // display string e.g. "$299" or "GHS 3,600"
  monthlyLabel: string
  symbol: string
}

export const PRICING: Record<Currency, Tier> = {
  USD: {
    oneTime: 29900,
    monthly: 9700,
    oneTimeLabel: '$299',
    monthlyLabel: '$97/mo',
    symbol: '$',
  },
  GHS: {
    oneTime: 360000,
    monthly: 18000,
    oneTimeLabel: 'GHS 3,600',
    monthlyLabel: 'GHS 180/mo',
    symbol: '₵',
  },
}

// Resolve currency from Vercel geo header + optional override query param.
// Server-only helper — reads x-vercel-ip-country from the request.
export function resolveCurrency(opts: {
  country?: string | null
  override?: string | null
}): Currency {
  const forced = (opts.override || '').toUpperCase()
  if (forced === 'GHS' || forced === 'USD') return forced as Currency
  return (opts.country || '').toUpperCase() === 'GH' ? 'GHS' : 'USD'
}
