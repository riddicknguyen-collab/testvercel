export default async function middleware(request) {
  const authorization = request.headers.get('authorization');
  const expectedUsername = 'admin';
  const expectedPassword = process.env.SITE_PASSWORD;

  if (authorization?.startsWith('Basic ')) {
    const authValue = authorization.split(' ')[1];

    try {
      const decoded = atob(authValue);
      const separatorIndex = decoded.indexOf(':');
      const username =
        separatorIndex === -1 ? decoded : decoded.slice(0, separatorIndex);
      const password =
        separatorIndex === -1 ? '' : decoded.slice(separatorIndex + 1);

      if (username === expectedUsername && password === expectedPassword) {
        // Continue to the requested static asset/page on Vercel.
        return fetch(request);
      }

      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Protected Site"',
          'X-Debug-Auth-Reason': 'invalid-credentials',
          'X-Debug-Username-Received': username || 'empty',
          'X-Debug-Username-Expected': expectedUsername,
          'X-Debug-Password-Length': String(password.length),
          'X-Debug-Env-Password-Set': expectedPassword ? 'yes' : 'no',
        },
      });
    } catch {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Protected Site"',
          'X-Debug-Auth-Reason': 'invalid-basic-header',
          'X-Debug-Env-Password-Set': expectedPassword ? 'yes' : 'no',
        },
      });
    }
  }

  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Protected Site"',
      'X-Debug-Auth-Reason': authorization ? 'unsupported-auth-scheme' : 'missing-auth-header',
      'X-Debug-Env-Password-Set': expectedPassword ? 'yes' : 'no',
    },
  });
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
