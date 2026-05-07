import type { MetadataRoute } from 'next'

const BASE = 'https://ideabylunch.com'

const NICHE_SLUGS = [
  // Founder lane
  'ai-saas', 'fintech', 'b2b-saas', 'marketplace', 'edtech',
  'healthtech', 'climate', 'agency-replacement', 'creator-economy', 'vertical-saas',
  // SMB lane
  'plumber', 'electrician', 'salon', 'barber', 'restaurant',
  'cleaning', 'landscaper', 'roofer', 'trainer', 'clinic', 'tailor', 'cafe',
] as const

const ALTERNATIVE_SLUGS = ['bolt', 'lovable', 'v0', 'base44', 'replit'] as const

type Freq = 'daily' | 'weekly' | 'monthly' | 'yearly'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const top: Array<{ path: string; priority: number; changeFrequency: Freq }> = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/audit', priority: 0.95, changeFrequency: 'weekly' },
    { path: '/idea-generator', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/gallery', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/hunt', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/refer', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/logo', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/taglines', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  ]

  const niches: Array<{ path: string; priority: number; changeFrequency: Freq }> = NICHE_SLUGS.map(slug => ({
    path: `/niche/${slug}`,
    priority: 0.7,
    changeFrequency: 'monthly',
  }))

  const alternatives: Array<{ path: string; priority: number; changeFrequency: Freq }> = ALTERNATIVE_SLUGS.map(slug => ({
    path: `/alternatives/${slug}`,
    priority: 0.7,
    changeFrequency: 'monthly',
  }))

  return [...top, ...niches, ...alternatives].map(r => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
