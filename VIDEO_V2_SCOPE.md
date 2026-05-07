# Video v2 — make the concept video an actual deliverable

> **Status:** scoped, not yet implemented. Single-session scope.

---

## Why

Today, video generation is a one-shot demo:
- PiAPI returns a temporary URL (typically 24–72h before it rots)
- The video plays inline once
- User can manually copy/download — that's the only path to keeping it
- **Not saved anywhere.** Not embedded in the customer's delivered website. Not in the brief. Not in any email.

So the wow moment vanishes. Every paying customer leaves with a generated brief but no video to share, no video on their live site, and (if they didn't download) eventually a dead link.

This kills both:
- **Retention/value perception** — the cool feature evaporates after the session
- **Distribution** — every customer site is a missed surface where the concept video could play (and carry the IdeaByLunch share signal)

---

## Goal

Turn the concept video from a session-scoped toy into:
1. A persistent asset attached to the customer's brief/site
2. An auto-embedded element on their delivered website
3. A surface that compounds for distribution (every customer site becomes a place the video plays)

---

## Scope — three fixes, ranked by leverage

### Fix 1 — Persist the video to your own storage

**Problem:** PiAPI URLs rot in 24–72h. Today we trust that volatile URL.

**Implementation:**
- `app/api/video/status/route.ts`: when status flips to `complete` and we have a `video_url` from PiAPI, fetch the bytes and re-upload to **Vercel Blob** (`@vercel/blob`). Return the permanent Blob URL to the client instead of the volatile PiAPI URL.
- Cache the Blob URL in Redis: `video:{briefHash}` → `{ blobUrl, generatedAt, prompt }`, TTL 1 year.
- Client (`ConceptVideoTab.tsx`): use the new permanent URL.

**Files touched:** `app/api/video/status/route.ts`, `app/app/ConceptVideoTab.tsx`. ~50 lines of code.

**Cost note:** Vercel Blob is ~$0.023/GB/mo. A 5-second 16:9 mp4 is ~3MB. 1000 stored videos = ~3GB = ~$0.07/mo. Negligible.

---

### Fix 2 — Auto-embed in the delivered website

**Problem:** when a customer pays for a build (Launch/Growth/Scale tiers), the deployed website doesn't include their generated concept video. They have to manually paste it in — which they won't.

**Implementation:**
- During the build/deploy flow in `app/lib/deploy.ts`, look up the customer's stored `video:{briefHash}` Blob URL.
- If present, inject a hero `<video>` element at the top of the homepage of the generated site. Pattern:
  ```tsx
  <video autoPlay loop muted playsInline style={{ width: '100%', objectFit: 'cover' }}>
    <source src={blobUrl} type="video/mp4" />
  </video>
  ```
- Optional: include a small "Made with IdeaByLunch" link in the footer of the generated site (the share-loop signal).

**Files touched:** `app/lib/deploy.ts`, plus the website template that gets generated. ~30 lines.

**Acceptance:** customer pays → 5 minutes later their domain is live → first thing visitors see is their concept video, autoplaying.

---

### Fix 3 — Include video URL in the brief delivery email

**Problem:** even if the video is persisted, the customer needs to know about it after they close the tab.

**Implementation:**
- After video generation completes, fire a Resend email to the captured email (we already have it from `EmailGate`):
  - Subject: *"Your concept video is ready — here's the permanent link"*
  - Body: thumbnail preview (frame from the video), permanent Blob URL, "embed code" snippet for non-customers, upgrade CTA for the $19 HD/no-watermark version
- Skip this email if the user already paid for a Launch/Growth/Scale tier (the embed in their site replaces it).

**Files touched:** new `app/api/video/notify/route.ts`, called from status route on completion. ~40 lines.

---

## Acceptance criteria

After this ships:
- [ ] Generated video URLs survive >7 days from generation (no PiAPI URL rot)
- [ ] Every paid customer's deployed website includes their concept video in the hero, autoplaying
- [ ] Free users get an email with a permanent link to their video
- [ ] PiAPI cost per generation is unchanged (we're not double-generating)
- [ ] Vercel Blob storage cost is <$1/mo at current traffic

## Out of scope (deliberately)

- **Watermarking** — handled separately in `VIDEO_FREEMIUM_SCOPE.md` (path 3 from earlier discussion: share-card watermark, not video overlay). Don't bundle here.
- **HD/no-watermark $19 unlock** — separate paid feature, separate session.
- **9:16 vertical variant for TikTok** — also separate; do once core persistence works.
- **Re-encoding for size optimisation** — Kling output is already small enough.

## Token budget estimate

- Reading existing files: 1 large read (`app/lib/deploy.ts`) + 2 medium (`status/route.ts`, `ConceptVideoTab.tsx`)
- Writing: 4 file edits, 1 new file
- Verification: tsc + production curl test
- Likely fits in **half a session**. Pair it with the freemium watermark scope to fill the rest.

## Pairing recommendation

Ship this **with** the freemium gate (1 free per email + $19 unlock) in the same session. Both touch the video pipeline. Doing them together avoids re-reading the same files twice.

---

## When to do this

Right after the next IdeaByLunch session starts. Do not bundle with unrelated work.

Reference for the next Claude: this file is the source of truth. Read it, then execute Fix 1 → 2 → 3 in order, ship one commit per fix.
