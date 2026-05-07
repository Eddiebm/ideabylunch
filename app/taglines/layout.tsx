import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free AI Tagline Generator',
  description: 'Generate punchy taglines and headlines for any startup or business. Free, no signup. From IdeaByLunch.',
  alternates: { canonical: '/taglines' },
  openGraph: {
    title: 'Free AI Tagline Generator — IdeaByLunch',
    description: 'Punchy taglines for any startup. Free, no signup.',
    url: 'https://ideabylunch.com/taglines',
  },
}

export default function TaglinesLayout({ children }: { children: React.ReactNode }) {
  return children
}
