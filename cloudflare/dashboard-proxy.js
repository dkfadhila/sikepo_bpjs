// Deployed as the sikepo-dashboard Worker. The upstream is fixed, never user supplied.
// Auth is enforced by Render and MongoDB for every /dashboard request.
addEventListener('fetch', event => event.respondWith(handleDashboard(event.request)));
async function handleDashboard(request) {
  const incoming = new URL(request.url);
  if (incoming.hostname !== 'dashboard.sikepo.tech') return new Response('Not found', { status: 404 });
  if (incoming.pathname === '/login' || incoming.pathname === '/login/') return Response.redirect('https://sikepo.tech/login', 302);
  const upstream = new URL('https://sikepo.onrender.com');
  upstream.pathname = incoming.pathname === '/' ? '/dashboard/' : incoming.pathname;
  upstream.search = incoming.search;
  const headers = new Headers(request.headers);
  headers.set('Host', 'sikepo.onrender.com');
  headers.delete('X-Forwarded-Host');
  try {
    const response = await fetch(new Request(upstream, {
      method: request.method, headers, redirect: 'manual',
      body: ['GET','HEAD'].includes(request.method) ? undefined : request.body
    }), { cf: { cacheTtl: 0, cacheEverything: false } });
    const result = new Response(response.body, response);
    result.headers.set('Cache-Control', 'no-store');
    result.headers.set('X-Content-Type-Options', 'nosniff');
    return result;
  } catch {
    return new Response('Workspace sementara belum dapat dihubungi. Silakan coba lagi.', {status:502, headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
  }
}
