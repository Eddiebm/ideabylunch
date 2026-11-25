export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || 'business professional'
  const count = Math.min(parseInt(searchParams.get('count') || '5'), 10)
  const orientation = searchParams.get('orientation') || 'landscape'

  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) {
    return Response.json({ error: 'Unsplash key not configured' }, { status: 500 })
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=${orientation}&content_filter=high`
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` }
    })

    if (!res.ok) {
      return Response.json({ error: `Unsplash error: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()

    const photos = data.results.map((p: any) => ({
      id: p.id,
      url: p.urls.regular,
      thumb: p.urls.thumb,
      small: p.urls.small,
      full: p.urls.full,
      download: p.links.download,
      photographer: p.user.name,
      photographerUrl: p.user.links.html,
      unsplashUrl: p.links.html,
      alt: p.alt_description || p.description || query,
      color: p.color,
      width: p.width,
      height: p.height
    }))

    return Response.json({ photos, total: data.total })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
