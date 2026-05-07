import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find local businesses with no website',
  description: 'Hunt local businesses missing a website in any niche + city. Outreach-ready leads for founders and agencies. Free.',
  alternates: { canonical: '/hunt' },
  openGraph: {
    title: 'Hunt local businesses with no website — IdeaByLunch',
    description: 'Niche + city → outreach-ready leads in 30 seconds.',
    url: 'https://ideabylunch.com/hunt',
  },
}

export default function HuntLayout({ children }: { children: React.ReactNode }) {
  return children
}
