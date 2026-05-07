import type { MetadataRoute } from 'next'

const BASE = 'https://ideabylunch.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes: Array<{ path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' }> = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/gallery', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/hunt', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/refer', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/logo', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/taglines', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  ]

  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
