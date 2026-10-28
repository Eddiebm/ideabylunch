import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Launch posts for every platform',
  description: 'One idea, every platform: hooks, TikTok scripts, Instagram captions, Threads, Bluesky, Reddit posts and newsletter copy, written for your idea.',
  alternates: { canonical: '/distribute' },
}

export default function DistributeLayout({ children }: { children: React.ReactNode }) {
  return children
}
