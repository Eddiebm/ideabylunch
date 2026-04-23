#!/usr/bin/env node
/**
 * One-time setup: create AblaVie and Naa Ayele reseller accounts.
 * Run: ADMIN_SECRET=xxx node scripts/setup-resellers.js
 */

const BASE = process.env.APP_URL || 'https://idea2lunch.com'
const SECRET = process.env.ADMIN_SECRET

if (!SECRET) { console.error('ADMIN_SECRET required'); process.exit(1) }

const resellers = [
  {
    code: 'ABLAVIE',
    name: 'AblaVie',
    email: 'reseller@ablavie.com',
    commissionRate: 0.25,
    products: ['idea2lunch', 'medos', 'lexos', 'busos'],
  },
  {
    code: 'NAAAYELE',
    name: 'Naa Ayele',
    email: 'naa@naaayele.com',
    commissionRate: 0.20,
    products: ['medos', 'lexos', 'busos'],
  },
]

async function create(r) {
  const res = await fetch(`${BASE}/api/reseller`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': SECRET },
    body: JSON.stringify(r),
  })
  const data = await res.json()
  if (data.ok) {
    console.log(`✓ ${r.name} — ${data.link}`)
  } else {
    console.error(`✗ ${r.name}:`, data)
  }
}

Promise.all(resellers.map(create))
