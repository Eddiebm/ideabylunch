import type { Metadata } from 'next'
import './globals.css'

const SITE = 'https://ideabylunch.com'
const TITLE = 'IdeaByLunch — Your Idea, Fully Cooked.'
const DESCRIPTION = 'Describe your idea. Get a complete product brief in 60 seconds — then we build and launch it for you in 48 hours.'

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
