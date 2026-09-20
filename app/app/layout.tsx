import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get your founder brief',
  description: 'Describe your marketplace idea in plain English. Get a founder brief, ICP, GTM strategy, and a live, deployed marketplace — by lunch.',
  alternates: { canonical: '/app' },
  openGraph: {
    title: 'Get your founder brief — IdeaByLunch',
    description: 'Describe your idea. Get a founder brief and a live, deployed business — by lunch.',
    url: 'https://ideabylunch.com/app',
  },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children
}
