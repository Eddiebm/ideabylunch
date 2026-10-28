import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI growth tools for small businesses',
  description: 'AI tools for local businesses: a 30-day marketing kit, review responses, quotes, win-back campaigns, seasonal promos, hiring posts and price-increase letters — in seconds.',
  alternates: { canonical: '/grow' },
  openGraph: {
    title: 'Grow your business, one tool at a time — IdeaByLunch',
    description: 'Marketing kits, review replies, quotes and campaigns for your business in seconds.',
    url: 'https://ideabylunch.com/grow',
  },
}

export default function GrowLayout({ children }: { children: React.ReactNode }) {
  return children
}
