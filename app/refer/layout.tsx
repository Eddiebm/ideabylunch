import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refer founders, earn credit',
  description: 'Share IdeaByLunch with founders and earn credit on every launch they ship. Track your link, your conversions, and your payouts.',
  alternates: { canonical: '/refer' },
  openGraph: {
    title: 'Refer founders, earn credit — IdeaByLunch',
    description: 'Share your link. Earn credit on every launch.',
    url: 'https://ideabylunch.com/refer',
  },
}

export default function ReferLayout({ children }: { children: React.ReactNode }) {
  return children
}
