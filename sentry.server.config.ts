import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV ?? 'development',
  tracesSampleRate: 0,
  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
  beforeSend(event) {
    // Never forward raw DB errors, stack paths, or auth tokens
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map(ex => ({
        ...ex,
        value: ex.value
          ?.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
          .replace(/password[=:]\S+/gi, 'password=[redacted]'),
      }))
    }
    return event
  },
})
