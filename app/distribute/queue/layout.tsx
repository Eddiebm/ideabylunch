import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your distribution queue',
  robots: { index: false, follow: false },
}

export default function DistributeQueueLayout({ children }: { children: React.ReactNode }) {
  return children
}
