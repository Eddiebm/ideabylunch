import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IdeaByLunch — Your Idea, Fully Cooked.',
  description: 'Describe your idea. Get a complete product brief in 60 seconds — then we build and launch it for you.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
