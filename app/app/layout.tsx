import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Build your business',
  description: 'Describe your idea and get a founder brief, positioning, logo, social kit and a live website — in minutes.',
  alternates: { canonical: '/app' },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children
}
