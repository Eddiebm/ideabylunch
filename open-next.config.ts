import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

// No page here revalidates, so prerendered pages are served read-only from the assets binding.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
})
