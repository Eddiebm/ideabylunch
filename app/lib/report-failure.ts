import * as Sentry from '@sentry/nextjs'

// For work that shouldn't stop the request when it fails (an email, a log
// write) but must never fail silently: a customer who gets no receipt, or an
// admin alert that never arrives, has to show up somewhere.
//
//   sendEmail(...).catch(reportFailure('order confirmation email'))
export function reportFailure(what: string) {
  return (error: unknown) => {
    console.error(`[failed] ${what}`, error)
    Sentry.captureException(error, { tags: { failed: what } })
  }
}
