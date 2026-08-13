export default async function middleware(request) {
  const authorization = request.headers.get('authorization');

  if (authorization?.startsWith('Basic ')) {
    const authValue = authorization.split(' ')[1];

    try {
      const decoded = atob(authValue);
      const [, password] = decoded.split(':');

      if (password === process.env.SITE_PASSWORD) {
        // Continue to the requested static asset/page on Vercel.
        return fetch(request);
      }
    } catch {
      // Fall through to the auth challenge below.
    }
  }

  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Protected Site"',
    },
  });
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
