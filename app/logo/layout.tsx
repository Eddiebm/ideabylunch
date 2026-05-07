import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free AI Logo Generator',
  description: 'Generate a professional logo for your startup or business in 60 seconds. Free preview, premium output. From IdeaByLunch.',
  alternates: { canonical: '/logo' },
  openGraph: {
    title: 'Free AI Logo Generator — IdeaByLunch',
    description: 'Logo for your startup in 60 seconds.',
    url: 'https://ideabylunch.com/logo',
  },
}

export default function LogoLayout({ children }: { children: React.ReactNode }) {
  return children
}
