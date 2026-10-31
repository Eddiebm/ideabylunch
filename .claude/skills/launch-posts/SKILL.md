---
name: launch-posts
description: Write launch posts for a product, each one fitted to its platform - r/SideProject, Show HN, Product Hunt, Indie Hackers and Uneed - plus a posting schedule. Use when the user wants to launch or relaunch the app, announce a new feature, "post it everywhere", write a Show HN or Product Hunt listing, or asks where and how to get first users.
argument-hint: "[what's launching, e.g. 'IdeaByLunch' or 'the new growth coach feature']"
---

# Launch posts

The same post doesn't work on every platform. Each community rewards something different, so write one post per platform, using only facts that are true.

## 1. Gather the facts first

Read the product's own copy before you write anything. In this repo the main sources are:
- `app/layout.tsx`: site URL, title, description
- `app/page.tsx`: hero, FAQ, pricing, JSON-LD
- `SERVICE_DEFINITION.md`: what each tier actually delivers, and the delivery times
- `docs/launch/LAUNCH_POSTS.md`: the last kit, if one exists. Reuse what still holds.

If `$ARGUMENTS` names a feature rather than the whole product, focus every post on that feature and mention the product only for context.

Fill in this fact sheet. **Any line you can't confirm from code or from the user stays as a `[bracket]` placeholder. Never invent it:**

- Name, URL, one-line description, who it's for
- What it does (3 bullets)
- What's free, what's paid, and the prices
- **Can someone try it without signing up?** Check the actual flow, e.g. whether an API route or page needs a session. HN needs this to be true.
- Stack (for HN)
- Real numbers: users, revenue, results of earlier launches
- What the user wants from each community: feedback, users or backlinks

Flag any claim where the marketing copy and the actual delivery disagree (for example "in minutes" against a 48-hour SLA). Write posts that only promise what's delivered.

## 2. Write one post per platform

Follow the rules for each platform in [platforms.md](platforms.md). In short:

| Platform | Voice | What you write |
|---|---|---|
| r/SideProject | Builder to builder, asks for criticism | Title + body ending in 2–3 specific questions |
| Show HN | Plain, technical, modest | `Show HN:` title (80 chars max) + author's first comment |
| Product Hunt | Polished, visual | Tagline (60 chars max), description (260 chars max), gallery shot list, maker comment |
| Indie Hackers | A transparent build story | Numbers, mistakes, lessons, a question for founders |
| Uneed | Short directory listing | Tagline, 1–2 sentence description, category, pricing |

Check the character limits by actually counting them, not by eye.

## 3. Add a schedule

Default order: r/SideProject first, to catch bugs → fix → Show HN (Tue–Thu, 8–10am ET) → Indie Hackers → Product Hunt at **12:01am PT** (Tue–Thu) → Uneed the same week. Change it if the user already posted somewhere.

## 4. Deliver

Write the kit to `docs/launch/LAUNCH_POSTS.md`. For a feature launch, use `docs/launch/<feature-slug>.md` so the main kit isn't overwritten. Structure:
1. A fact sheet with any ⚠️ items to fix before posting
2. A schedule table
3. One section per platform: the copy in blockquotes, ready to paste, followed by that platform's rules

In your reply, give the file path, the ⚠️ items, and the list of `[placeholders]` the user needs to fill in. Don't paste all five posts into the chat.

Never post anything to any platform yourself. The user posts.
