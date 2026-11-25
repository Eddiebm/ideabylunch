import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A stray lockfile in a parent directory makes Next trace from there, which breaks the OpenNext bundle.
  outputFileTracingRoot: import.meta.dirname,
  // This repo has no ESLint config; without this, one in a parent directory gets picked up and gates the build.
  eslint: { ignoreDuringBuilds: true },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only upload source maps when explicitly building for prod (keeps local builds fast)
  silent: true,
  disableLogger: true,
  automaticVercelMonitors: false,
  // Suppress source map uploads when DSN is unset (local / CI without secrets)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
})
