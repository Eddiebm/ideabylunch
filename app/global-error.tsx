'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Catches errors in the root layout itself (rare but catastrophic without this)
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
          padding: '24px', background: '#fff',
        }}>
          <div style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F', margin: '0 0 8px' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.5, margin: '0 0 24px' }}>
              We hit an unexpected error. Try refreshing the page.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, color: '#AEAEB2', margin: '0 0 20px', fontFamily: 'monospace' }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                background: '#0066CC', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 24px', fontSize: 15,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
