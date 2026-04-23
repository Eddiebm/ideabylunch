#!/usr/bin/env node
/**
 * Phase 5: Stripe product catalog — 10 products across idea2Lunch, MedOS, LexOS, BUSOS.
 * Run: STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-catalog.js
 * Outputs price IDs to add to .env
 */

const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

if (!process.env.STRIPE_SECRET_KEY) { console.error('STRIPE_SECRET_KEY required'); process.exit(1) }

const PRODUCTS = [
  // idea2Lunch
  { id: 'i2l_site_starter',    name: 'idea2Lunch — Starter Site',       amount: 14900, mode: 'payment',      desc: '5-page website, live in 48h' },
  { id: 'i2l_site_pro',        name: 'idea2Lunch — Pro Site',            amount: 29900, mode: 'payment',      desc: '10-page website + custom domain' },
  { id: 'i2l_site_full',       name: 'idea2Lunch — Full Build',          amount: 49900, mode: 'payment',      desc: 'Full product site + SEO + analytics' },
  { id: 'i2l_editor_pro',      name: 'idea2Lunch — Pro Editor',          amount: 1900,  mode: 'subscription', desc: 'Unlimited site edits, monthly' },
  { id: 'i2l_taglines',        name: 'idea2Lunch — Tagline Pack',        amount: 2900,  mode: 'payment',      desc: '10 AI taglines for your brand' },
  { id: 'i2l_logo_starter',    name: 'idea2Lunch — Logo Starter',        amount: 9900,  mode: 'payment',      desc: '3 AI logo concepts, PNG' },
  { id: 'i2l_logo_pro',        name: 'idea2Lunch — Logo Pro',            amount: 19900, mode: 'payment',      desc: '3 vector SVG logos, brand guide' },
  // MedOS
  { id: 'medos_clinic_monthly',name: 'MedOS — Clinic Plan',              amount: 4900,  mode: 'subscription', desc: 'AI clinical tools, monthly' },
  // LexOS
  { id: 'lexos_firm_monthly',  name: 'LexOS — Firm Plan',                amount: 9900,  mode: 'subscription', desc: 'AI legal intelligence, monthly' },
  // BUSOS
  { id: 'busos_biz_monthly',   name: 'BUSOS — Business Plan',            amount: 3900,  mode: 'subscription', desc: 'AI business operations, monthly' },
]

async function ensureProduct(p) {
  const existing = await stripe.products.search({ query: `metadata['catalog_id']:'${p.id}'` })
  let product
  if (existing.data.length > 0) {
    product = existing.data[0]
    console.log(`  (existing) ${p.name}`)
  } else {
    product = await stripe.products.create({
      name: p.name,
      description: p.desc,
      metadata: { catalog_id: p.id },
    })
    console.log(`  ✓ Created ${p.name}`)
  }

  const prices = await stripe.prices.list({ product: product.id, active: true })
  let price
  if (prices.data.length > 0) {
    price = prices.data[0]
  } else {
    const priceData: any = {
      product: product.id,
      currency: 'usd',
      unit_amount: p.amount,
    }
    if (p.mode === 'subscription') {
      priceData.recurring = { interval: 'month' }
    }
    price = await stripe.prices.create(priceData)
  }

  return { envKey: p.id.toUpperCase().replace(/-/g, '_') + '_PRICE_ID', priceId: price.id }
}

async function main() {
  console.log('Creating Stripe product catalog...\n')
  const envLines = []
  for (const p of PRODUCTS) {
    try {
      const { envKey, priceId } = await ensureProduct(p)
      envLines.push(`${envKey}=${priceId}`)
    } catch (e) {
      console.error(`✗ ${p.name}:`, e.message)
    }
  }
  console.log('\n--- Add to .env / Vercel env vars ---')
  envLines.forEach(l => console.log(l))
}

main().catch(e => { console.error(e); process.exit(1) })
