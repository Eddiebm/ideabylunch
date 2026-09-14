import type { Metadata } from 'next'
import { Cormorant_Garamond, IBM_Plex_Mono, Lora } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

// Self-hosted + preloaded via next/font instead of a render-blocking `@import`
// in globals.css — removes the extra network round-trip to Google Fonts on
// every page load and eliminates the font-loading flash it caused.
const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})
const lora = Lora({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
})

const SITE = 'https://ideabylunch.com'
const TITLE = 'IdeaByLunch — Launch your marketplace by lunch.'
const DESCRIPTION = 'IdeaByLunch turns your marketplace idea into a live, working business system — website, listings, seller onboarding, buyer capture, payments readiness, analytics, and AI growth recommendations. By lunch.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: '%s — IdeaByLunch' },
  description: DESCRIPTION,
  applicationName: 'IdeaByLunch',
  keywords: ['marketplace builder', 'launch a marketplace', 'AI marketplace launch', 'marketplace growth OS', 'two-sided marketplace software', 'startup idea to MVP'],
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
    <html lang="en" className={`${cormorantGaramond.variable} ${ibmPlexMono.variable} ${lora.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
