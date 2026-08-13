import { NextResponse } from 'next/server';

export function middleware(req) {
  const basicAuth = req.headers.get('authorization');
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    // Giải mã Base64 (Chuỗi mặc định là username:password)
    const decoded = atob(authValue);
    const [, password] = decoded.split(':');

    // So sánh mật khẩu với biến môi trường
    if (password === process.env.SITE_PASSWORD) {
      return NextResponse.next(); // Xác thực thành công
    }
  }

  // Yêu cầu xác thực nếu sai hoặc thiếu password
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Protected Site"',
    },
  });
}

// Cấu hình áp dụng middleware (bảo vệ toàn bộ trang web)
export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};