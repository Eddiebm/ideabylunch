export const runtime = 'edge'

import { getRedis } from '@/app/lib/redis'
import { Resend } from 'resend'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM || 'hello@ideabylunch.com'
  const adminEmail = process.env.ADMIN_EMAIL || 'eddie@bannermanmenson.com'

  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000

  let totalSent = 0
  const errors: string[] = []

  // --- Website buyer sequence ---

  const websiteActive = await redis.smembers('seq:website:active')

  for (const email of websiteActive) {
    try {
      const startTs = await redis.get(`seq:website:${email}`)
      if (!startTs) continue

      const daysSince = (now - Number(startTs)) / DAY_MS
      const sent = await redis.smembers(`seq:website:sent:${email}`)

      if (daysSince >= 1 && !sent.includes('day1')) {
        await resend.emails.send({
          from,
          to: email,
          subject: 'Your IdeaByLunch site — what\'s next',
          html: `
            <p>Hi there,</p>
            <p>Your new IdeaByLunch website is live and ready to go. Here's what to do next:</p>
            <ul>
              <li>Share your site link on WhatsApp and Instagram — even a quick story drives real traffic.</li>
              <li>Tell your existing customers and let them spread the word.</li>
              <li>Want more visitors? Our <strong>Grow</strong> plan gives you monthly content, social posts, and marketing tools built for small businesses.</li>
            </ul>
            <p><a href="https://ideabylunch.com/grow">Get more traffic with Grow →</a></p>
            <p>— The IdeaByLunch Team</p>
          `,
        })
        await redis.sadd(`seq:website:sent:${email}`, 'day1')
        totalSent++
      }

      if (daysSince >= 3 && !sent.includes('day3')) {
        await resend.emails.send({
          from,
          to: email,
          subject: 'Drive traffic to your new site',
          html: `
            <p>Hi there,</p>
            <p>Here are 3 things that work right now for small businesses in your area:</p>
            <ol>
              <li><strong>Google Business Profile</strong> — claim it and add your website. Free and powerful for local search.</li>
              <li><strong>WhatsApp Status</strong> — post your site link as a status update. Your contacts will see it without you needing to message them individually.</li>
              <li><strong>Local Facebook Groups</strong> — find the buy/sell/trade or community groups in your town and introduce your business.</li>
            </ol>
            <p>Want someone to handle this for you each month? That's exactly what <strong>Grow</strong> does.</p>
            <p><a href="https://ideabylunch.com/grow">See what Grow includes →</a></p>
            <p>— The IdeaByLunch Team</p>
          `,
        })
        await redis.sadd(`seq:website:sent:${email}`, 'day3')
        totalSent++
      }

      if (daysSince >= 7 && !sent.includes('day7')) {
        await resend.emails.send({
          from,
          to: email,
          subject: 'How is your business doing?',
          html: `
            <p>Hi there,</p>
            <p>It's been a week since your IdeaByLunch site went live. How's it going?</p>
            <p>If anything looks off or you'd like a small tweak — just reply to this email and we'll take care of it, no charge.</p>
            <p>And if you've had a good experience, we'd really appreciate a quick review:</p>
            <p><a href="https://www.google.com/search?q=IdeaByLunch+reviews">⭐ Leave us a review on Google</a></p>
            <p>Thank you for trusting us with your business online presence.</p>
            <p>— The IdeaByLunch Team</p>
          `,
        })
        await redis.sadd(`seq:website:sent:${email}`, 'day7')
        totalSent++

        // Remove from active set and clean up sent tracking
        await redis.srem('seq:website:active', email)
        await redis.del(`seq:website:sent:${email}`)
      }
    } catch (err) {
      errors.push(`website:${email}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // --- Grow subscriber sequence ---

  const growActive = await redis.smembers('seq:grow:active')

  for (const email of growActive) {
    try {
      const startTs = await redis.get(`seq:grow:${email}`)
      if (!startTs) continue

      const daysSince = (now - Number(startTs)) / DAY_MS
      const sent = await redis.smembers(`seq:grow:sent:${email}`)

      if (daysSince >= 1 && !sent.includes('day1')) {
        await resend.emails.send({
          from,
          to: email,
          subject: 'Let\'s get your first piece of content',
          html: `
            <p>Hi there,</p>
            <p>Welcome to Grow — you now have access to 7 marketing tools built for your business.</p>
            <p>Here's what's waiting for you:</p>
            <ul>
              <li>Marketing Kit</li>
              <li>Social Post Generator</li>
              <li>Email Campaign Builder</li>
              <li>Proposal Writer</li>
              <li>Re-engage Customers tool</li>
              <li>Promo Flyer Creator</li>
              <li>Business Profile Optimizer</li>
            </ul>
            <p><strong>Start with the Marketing Kit</strong> — it's the fastest way to get content you can use this week.</p>
            <p><a href="https://ideabylunch.com/grow">Open your Grow dashboard →</a></p>
            <p>— The IdeaByLunch Team</p>
          `,
        })
        await redis.sadd(`seq:grow:sent:${email}`, 'day1')
        totalSent++
      }

      if (daysSince >= 3 && !sent.includes('day3')) {
        await resend.emails.send({
          from,
          to: email,
          subject: 'Pro tip: you\'re leaving content on the table',
          html: `
            <p>Hi there,</p>
            <p>Most Grow members use the Marketing Kit and Social Posts right away — which is great.</p>
            <p>But two tools that barely get touched can make a real difference:</p>
            <ul>
              <li><strong>Proposal Writer</strong> — turns a job request into a professional written proposal in seconds. Clients take you more seriously.</li>
              <li><strong>Re-engage Customers</strong> — sends a message to past customers you haven't heard from in a while. One click, real revenue.</li>
            </ul>
            <p>Give them a try this week.</p>
            <p><a href="https://ideabylunch.com/grow">Open Grow →</a></p>
            <p>— The IdeaByLunch Team</p>
          `,
        })
        await redis.sadd(`seq:grow:sent:${email}`, 'day3')
        totalSent++
      }

      if (daysSince >= 7 && !sent.includes('day7')) {
        await resend.emails.send({
          from,
          to: email,
          subject: 'Your monthly marketing kit is almost ready',
          html: `
            <p>Hi there,</p>
            <p>On the 1st of each month, your Grow kit refreshes with new content tailored to your business.</p>
            <p>Here's what's coming:</p>
            <ul>
              <li>A set of ready-to-send <strong>email campaigns</strong> for the month ahead</li>
              <li><strong>Social media posts</strong> you can schedule or post manually</li>
              <li>Fresh <strong>promotional copy</strong> for your site or flyers</li>
            </ul>
            <p>To make sure everything is personalised to you, take 2 minutes to update your business profile.</p>
            <p><a href="https://ideabylunch.com/grow">Update your profile →</a></p>
            <p>— The IdeaByLunch Team</p>
          `,
        })
        await redis.sadd(`seq:grow:sent:${email}`, 'day7')
        totalSent++

        // Remove from active set and clean up sent tracking
        await redis.srem('seq:grow:active', email)
        await redis.del(`seq:grow:sent:${email}`)
      }
    } catch (err) {
      errors.push(`grow:${email}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // --- Admin summary ---

  try {
    await resend.emails.send({
      from,
      to: adminEmail,
      subject: `[IdeaByLunch] Email sequence run — ${totalSent} sent`,
      html: `
        <p><strong>Cron run complete</strong> — ${new Date().toISOString()}</p>
        <p>Emails sent: <strong>${totalSent}</strong></p>
        <p>Website subscribers processed: <strong>${websiteActive.length}</strong></p>
        <p>Grow subscribers processed: <strong>${growActive.length}</strong></p>
        ${errors.length > 0 ? `<p>Errors (${errors.length}):</p><ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>` : '<p>No errors.</p>'}
      `,
    })
  } catch {
    // Non-fatal — don't let admin email failure mask the run result
  }

  return Response.json({
    ok: true,
    sent: totalSent,
    websiteProcessed: websiteActive.length,
    growProcessed: growActive.length,
    errors: errors.length,
  })
}
