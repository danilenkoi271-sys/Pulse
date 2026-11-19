// Vercel Edge Function. Returns the visitor's country code from Vercel's edge
// headers. It never sees wallets, keys or orders — it only echoes a header.
export const config = { runtime: 'edge' }

export default function handler(req: Request): Response {
  const country = req.headers.get('x-vercel-ip-country')
  return new Response(JSON.stringify({ country: country ? country.toUpperCase() : null }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'private, max-age=300' },
  })
}
