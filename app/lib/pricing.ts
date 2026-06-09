// Geo-aware pricing for IdeaByLunch
// Each market shows local-currency prices calibrated against local agency rates + PPP.
// Stripe-native: US, GB, AU, CA, AE, MX, ZA
// USD billing (no local currency on Stripe): PH, KE, NG, IN
// Paystack: GH

export type CountryCode =
  | 'US' | 'GB' | 'AU' | 'CA' | 'AE'
  | 'MX' | 'ZA' | 'PH' | 'KE' | 'NG' | 'IN' | 'GH'

export type MarketPricing = {
  starter: string       // one-time setup label
  professional: string  // one-time setup label
  premium: string       // one-time setup label
  monthly: string       // monthly hosting/maintenance label
  fullProduct: string   // SaaS/app tier label
  flag: string
  marketName: string
}

export const MARKET_PRICING: Record<CountryCode, MarketPricing> = {
  US: {
    starter: '$149',       professional: '$299',        premium: '$499',
    monthly: '$97/mo',     fullProduct: '$1,499',
    flag: '🇺🇸',           marketName: 'United States',
  },
  GB: {
    starter: '£109',       professional: '£249',        premium: '£399',
    monthly: '£79/mo',     fullProduct: '£1,199',
    flag: '🇬🇧',           marketName: 'United Kingdom',
  },
  AU: {
    starter: 'A$229',      professional: 'A$499',       premium: 'A$799',
    monthly: 'A$149/mo',   fullProduct: 'A$2,299',
    flag: '🇦🇺',           marketName: 'Australia',
  },
  CA: {
    starter: 'C$199',      professional: 'C$399',       premium: 'C$649',
    monthly: 'C$129/mo',   fullProduct: 'C$1,999',
    flag: '🇨🇦',           marketName: 'Canada',
  },
  AE: {
    starter: 'AED 549',    professional: 'AED 1,099',   premium: 'AED 1,799',
    monthly: 'AED 349/mo', fullProduct: 'AED 5,499',
    flag: '🇦🇪',           marketName: 'UAE',
  },
  MX: {
    starter: 'MX$1,999',   professional: 'MX$3,999',    premium: 'MX$6,499',
    monthly: 'MX$999/mo',  fullProduct: 'MX$24,999',
    flag: '🇲🇽',           marketName: 'Mexico',
  },
  ZA: {
    starter: 'R1,299',     professional: 'R2,499',      premium: 'R3,999',
    monthly: 'R699/mo',    fullProduct: 'R12,499',
    flag: '🇿🇦',           marketName: 'South Africa',
  },
  PH: {
    starter: '$79',        professional: '$149',         premium: '$249',
    monthly: '$39/mo',     fullProduct: '$749',
    flag: '🇵🇭',           marketName: 'Philippines',
  },
  KE: {
    starter: '$59',        professional: '$99',          premium: '$179',
    monthly: '$29/mo',     fullProduct: '$499',
    flag: '🇰🇪',           marketName: 'Kenya',
  },
  NG: {
    starter: '$39',        professional: '$79',          premium: '$129',
    monthly: '$19/mo',     fullProduct: '$399',
    flag: '🇳🇬',           marketName: 'Nigeria',
  },
  IN: {
    starter: '$29',        professional: '$49',          premium: '$89',
    monthly: '$15/mo',     fullProduct: '$249',
    flag: '🇮🇳',           marketName: 'India',
  },
  GH: {
    starter: 'GHS 1,800',  professional: 'GHS 3,600',   premium: 'GHS 6,000',
    monthly: 'GHS 180/mo', fullProduct: 'GHS 18,000',
    flag: '🇬🇭',           marketName: 'Ghana',
  },
}

// Country code → CountryCode, defaults to US
const COUNTRY_MAP: Record<string, CountryCode> = {
  US: 'US', GB: 'GB', UK: 'GB',
  AU: 'AU', CA: 'CA', AE: 'AE',
  MX: 'MX', ZA: 'ZA', PH: 'PH',
  KE: 'KE', NG: 'NG', IN: 'IN', GH: 'GH',
}

export function resolveMarket(opts: {
  country?: string | null
  override?: string | null
}): CountryCode {
  const ov = (opts.override || '').toUpperCase()
  if (COUNTRY_MAP[ov]) return COUNTRY_MAP[ov]
  const c = (opts.country || '').toUpperCase()
  return COUNTRY_MAP[c] ?? 'US'
}

export type StripeTier = {
  currency: string
  starter: number
  professional: number
  premium: number
  full: number
}

// Stripe-billable markets with local-currency minor-unit amounts.
// GH uses Paystack — omitted here; checkout falls back to USD gracefully.
export const STRIPE_MARKET_AMOUNTS: Partial<Record<CountryCode, StripeTier>> = {
  US: { currency: 'usd', starter: 14900, professional: 29900, premium: 49900, full: 149900 },
  GB: { currency: 'gbp', starter: 10900, professional: 24900, premium: 39900, full: 119900 },
  AU: { currency: 'aud', starter: 22900, professional: 49900, premium: 79900, full: 229900 },
  CA: { currency: 'cad', starter: 19900, professional: 39900, premium: 64900, full: 199900 },
  AE: { currency: 'aed', starter: 54900, professional: 109900, premium: 179900, full: 549900 },
  MX: { currency: 'mxn', starter: 199900, professional: 399900, premium: 649900, full: 2499900 },
  ZA: { currency: 'zar', starter: 129900, professional: 249900, premium: 399900, full: 1249900 },
  PH: { currency: 'usd', starter: 7900,  professional: 14900, premium: 24900, full: 74900 },
  KE: { currency: 'usd', starter: 5900,  professional: 9900,  premium: 17900, full: 49900 },
  NG: { currency: 'usd', starter: 3900,  professional: 7900,  premium: 12900, full: 39900 },
  IN: { currency: 'usd', starter: 2900,  professional: 4900,  premium: 8900,  full: 24900 },
}

// Legacy compat — keep existing checkout routes working
export type Currency = 'USD' | 'GHS'
export type Tier = {
  oneTime: number; monthly: number
  oneTimeLabel: string; monthlyLabel: string; symbol: string
}
export const PRICING: Record<Currency, Tier> = {
  USD: { oneTime: 29900, monthly: 9700, oneTimeLabel: '$299', monthlyLabel: '$97/mo', symbol: '$' },
  GHS: { oneTime: 360000, monthly: 18000, oneTimeLabel: 'GHS 3,600', monthlyLabel: 'GHS 180/mo', symbol: '₵' },
}
export function resolveCurrency(opts: { country?: string | null; override?: string | null }): Currency {
  const forced = (opts.override || '').toUpperCase()
  if (forced === 'GHS' || forced === 'USD') return forced as Currency
  return (opts.country || '').toUpperCase() === 'GH' ? 'GHS' : 'USD'
}
