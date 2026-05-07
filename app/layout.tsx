import type { Metadata } from 'next'
import './globals.css'

const SITE = 'https://ideabylunch.com'
const TITLE = 'IdeaByLunch — Become a founder by lunch.'
const DESCRIPTION = 'Turn your startup idea into a live business by lunch. Describe it, get a founder brief, positioning, launch strategy, and a real, deployed website — in minutes. You own everything.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: '%s — IdeaByLunch' },
  description: DESCRIPTION,
  applicationName: 'IdeaByLunch',
  keywords: ['product brief', 'idea to MVP', 'AI product strategy', 'launch in 48 hours', 'startup idea validator', 'PRD generator'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'IdeaByLunch',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
