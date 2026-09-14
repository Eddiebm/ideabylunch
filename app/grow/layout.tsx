import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Growth Tools for Founders',
  description: 'AI growth tools for your business — weekly action plans, marketing copy, and outreach, tailored to where your business is right now. Free to start.',
  alternates: { canonical: '/grow' },
  openGraph: {
    title: 'Free Growth Tools for Founders — IdeaByLunch',
    description: 'AI growth tools tailored to your business. Free to start.',
    url: 'https://ideabylunch.com/grow',
  },
}

export default function GrowLayout({ children }: { children: React.ReactNode }) {
  return children
}
