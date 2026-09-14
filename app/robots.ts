import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin', '/dashboard', '/login', '/preview/', '/distribute/queue'],
      },
    ],
    sitemap: 'https://ideabylunch.com/sitemap.xml',
    host: 'https://ideabylunch.com',
  }
}
