export type BuildType = 'website' | 'mobile' | 'saas' | string

const COMPLEX_KEYWORDS = [
  'multi-tenant', 'multitenant', 'enterprise', 'agency',
  'white-label', 'whitelabel', 'reseller', 'franchise',
  'custom domain', 'subdomain per user', 'per-client',
  'white label', 'multiple clients', 'client portal',
  'team management', 'role-based', 'rbac',
]

const COMPLEX_TYPES: BuildType[] = ['marketplace', 'saas']

export function detectComplexity(
  input: string,
  type?: BuildType,
): { isComplex: boolean; signals: string[] } {
  const lower = input.toLowerCase()
  const signals: string[] = []

  for (const kw of COMPLEX_KEYWORDS) {
    if (lower.includes(kw)) signals.push(kw)
  }

  if (type && COMPLEX_TYPES.includes(type) && signals.length === 0) {
    signals.push(type)
  }

  return { isComplex: signals.length > 0, signals }
}
