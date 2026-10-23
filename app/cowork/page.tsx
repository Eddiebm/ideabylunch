import type { Metadata } from 'next'
import CoworkApp from './CoworkApp'

export const metadata: Metadata = {
  title: 'Learn Cowork for Business — an interactive guide',
  description: 'A free, interactive 8-module course teaching business people how to delegate real work to Cowork: briefing it well, working with real documents, connecting your tools, automating repeat work, and reviewing AI output.',
  alternates: { canonical: '/cowork' },
  openGraph: {
    title: 'Learn Cowork for Business — an interactive guide',
    description: 'No coding required. Eight short modules on delegating real work to Cowork.',
    url: 'https://ideabylunch.com/cowork',
    type: 'website',
  },
}

export default function CoworkPage() {
  return <CoworkApp />
}
