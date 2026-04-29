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
