# ideabylunch.com — Full Autonomous SaaS Build Plan

## Current State
- Site live at https://ideabylunch.com (Vercel, ideabylunch project)
- Brief generator working (OpenRouter → Gemini 2.5 Flash)
- Stripe checkout exists (3 tiers)
- Website builder API exists (generates HTML)
- Photo sourcing from Unsplash exists
- Source code at /tmp/mama-source (also push to GitHub)

## Session 1: Calculator + 3 Previews + Pay + Deploy

### 1. Price Calculator
- After brief, show "Build this" button
- Calculator asks: pages, features, integrations, e-commerce
- Calculates custom price based on complexity
- Shows price breakdown

### 2. Three Design Previews
- Generate 3 styles: Editorial, Modern Minimal, Bold & Vibrant
- Show side-by-side in iframe previews
- User picks one

### 3. Stripe Payment
- One-time build fee (from calculator)
- Monthly subscription: domain ($29/yr) + hosting ($19/mo) + maintenance ($49/mo)
- Stripe Checkout → success redirect

### 4. Auto-Deploy Pipeline
- After payment confirmed (webhook)
- Take selected design HTML
- Create Vercel project via API
- Deploy to Vercel
- Buy/connect domain (Cloudflare Registrar)
- Send WhatsApp/email notification with live URL

### 5. Customer Dashboard
- Login page (email magic link)
- See their site status, domain, billing
- Request content updates

## Session 2: OpenClaw Agents on Hetzner (5.78.183.141)

### Agent 1: Marketing Agent
- Daily posts on Twitter/X, LinkedIn, Reddit, TikTok
- "Built this site in 60 seconds" with screenshots
- Rotates content, tracks engagement

### Agent 2: Lead Generation Agent
- Scrapes Google Maps for businesses without websites
- Targets: plumbers, electricians, restaurants, salons (Ghana first, then expand)
- Sends WhatsApp/IG DM with free preview offer

### Agent 3: Sales Agent
- Follows up with leads (WhatsApp Business API)
- Answers questions about pricing
- Sends them to ideabylunch.com

### Agent 4: Build Agent
- Receives paid orders from Stripe webhook
- Generates code with AI
- Validates HTML (no broken links, responsive check)
- Deploys to Vercel
- Monitors deployment success

### Agent 5: Maintenance Agent
- Pings all deployed sites every 30 minutes (like AppWatch)
- Auto-fixes downtime
- Handles content update requests from customer dashboard

### Agent 6: Billing Agent
- Sends monthly invoices via Stripe
- Chases failed payments (3 retry attempts)
- Handles cancellations gracefully (site goes to parking page)

## Revenue Model
- Build fee: $299-$1,499 (one-time, based on calculator)
- Domain: $29/yr (cost: ~$10)
- Hosting: $19/mo (cost: $0)
- Maintenance: $49/mo (cost: $0, AI handles)
- Add-ons: Logo $99, SEO $49, Email $9/mo, Lead capture $29/mo, Analytics $19/mo
- Target: $68/mo recurring per customer, 100 customers = $6,800/mo

## Tech Stack
- Frontend: Next.js App Router on Vercel
- AI: OpenRouter → Gemini 2.5 Flash
- Payments: Stripe (checkout + subscriptions)
- Domains: Cloudflare Registrar API
- Hosting: Vercel (customer sites)
- Photos: Unsplash API
- Notifications: WhatsApp Business API + Resend (email)
- Agents: OpenClaw on Hetzner (5.78.183.141)
- Monitoring: AppWatch pattern

## Legal Needs
- Terms of service
- Privacy policy (GDPR compliant)
- Refund policy
- Code ownership clause (customer owns their site)
- Uptime SLA

## Priority Order
1. Calculator + 3 previews + Stripe (Session 1)
2. Auto-deploy pipeline (Session 1)
3. Customer dashboard (Session 1)
4. OpenClaw agents (Session 2)
5. Add-ons (Logo, SEO, Email) (Session 3)
6. Portfolio/examples page (Session 3)
7. White-label / referral program (Session 4)
