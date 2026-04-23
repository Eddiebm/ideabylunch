#!/usr/bin/env node
/**
 * Naa Ayele — Ghana market outreach for MedOS, LexOS, BUSOS.
 * Targets: clinics, legal firms, schools/universities in Ghana.
 * Run: node scripts/naa-ayele-outreach.js
 */

const RESEND_KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM || 'naa@naaayele.com'
const REF_CODE = 'NAAAYELE'

if (!RESEND_KEY) { console.error('RESEND_API_KEY required'); process.exit(1) }

const PRODUCTS = {
  medos: {
    name: 'MedOS Africa',
    pitch: 'AI-powered clinical decision support built for African healthcare — triage, drug safety, referral management.',
    cta: 'https://medos.africa',
    targets: ['clinic', 'hospital', 'pharmacy', 'medical_practice'],
  },
  lexos: {
    name: 'LexOS',
    pitch: 'AI legal intelligence for Ghanaian law firms — case research, contract review, compliance monitoring.',
    cta: 'https://lexos.ai',
    targets: ['law_firm', 'legal', 'barrister', 'solicitor'],
  },
  busos: {
    name: 'BUSOS',
    pitch: 'AI operations platform for Ghanaian businesses — inventory, payments, staff, and reporting in one place.',
    cta: 'https://busos.io',
    targets: ['retail', 'sme', 'enterprise', 'manufacturer'],
  },
}

const GHANA_LEADS = [
  // Seed list — augment via Hunter.io or manual research
  { name: 'Ridge Hospital', email: 'info@ridge.gov.gh', type: 'hospital', product: 'medos' },
  { name: 'Korle-Bu Teaching Hospital', email: 'info@kbth.gov.gh', type: 'hospital', product: 'medos' },
  { name: 'Reindorf Law', email: 'info@reindorflaw.com', type: 'law_firm', product: 'lexos' },
  { name: 'Bentsi-Enchill Letsa & Ankomah', email: 'info@bela.com.gh', type: 'law_firm', product: 'lexos' },
]

function buildEmail(lead) {
  const p = PRODUCTS[lead.product]
  return {
    from: `Naa Ayele <${FROM}>`,
    to: lead.email,
    subject: `${p.name} — Built for ${lead.name}`,
    html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:560px;margin:40px auto;color:#1D1D1F">
      <h2 style="font-size:22px;margin:0 0 16px">Hi ${lead.name} team,</h2>
      <p style="font-size:15px;line-height:1.6;color:#3C3C43">${p.pitch}</p>
      <p style="font-size:15px;line-height:1.6;color:#3C3C43">
        I'm reaching out on behalf of the ${p.name} team to introduce a solution built specifically for organisations like yours in Ghana.
      </p>
      <p style="margin:24px 0">
        <a href="${p.cta}?ref=${REF_CODE}" style="background:#0066CC;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
          See ${p.name} →
        </a>
      </p>
      <p style="font-size:13px;color:#6E6E73">Reply to this email or WhatsApp +233 XX XXX XXXX to book a 15-min demo.</p>
    </body></html>`,
  }
}

async function send(lead) {
  const payload = buildEmail(lead)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (res.ok) {
    console.log(`✓ Sent to ${lead.name} (${lead.product})`)
  } else {
    console.error(`✗ ${lead.name}:`, data)
  }
}

async function main() {
  console.log(`Naa Ayele outreach — ${GHANA_LEADS.length} leads\n`)
  for (const lead of GHANA_LEADS) {
    await send(lead)
    await new Promise(r => setTimeout(r, 300))
  }
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
