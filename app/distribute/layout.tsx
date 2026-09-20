import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free AI Distribution Generator',
  description: 'Turn one idea into a channel map, audience hooks, and ready-to-post content for TikTok, Instagram, Threads, Bluesky, Reddit, and newsletters. Free.',
  alternates: { canonical: '/distribute' },
  openGraph: {
    title: 'Free AI Distribution Generator — IdeaByLunch',
    description: 'One idea → every platform, ready to deploy. Free.',
    url: 'https://ideabylunch.com/distribute',
  },
}

export default function DistributeLayout({ children }: { children: React.ReactNode }) {
  return children
}
