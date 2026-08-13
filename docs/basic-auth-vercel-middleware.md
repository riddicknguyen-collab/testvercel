# Triển khai Basic Auth cho static site trên Vercel bằng middleware.js

Tài liệu này mô tả cách bảo vệ một static site deploy trên Vercel bằng Basic Auth. Phương pháp này phù hợp với repo chỉ có file tĩnh như `index.html`, không phải ứng dụng Next.js đầy đủ.

## Mục tiêu

- Khi người dùng mở website, trình duyệt hiện hộp thoại đăng nhập mặc định.
- Username bắt buộc là `admin`.
- Password được lấy từ biến môi trường `SITE_PASSWORD` trên Vercel.
- Nếu đăng nhập đúng, request được đi tiếp đến file tĩnh của website.
- Nếu đăng nhập sai hoặc thiếu thông tin, server trả về `401 Unauthorized`.

## Cấu trúc thư mục

Ví dụ cấu trúc repo:

```text
repo-testvercel/
├── index.html
├── middleware.js
└── docs/
    └── basic-auth-vercel-middleware.md
```

## File middleware.js

Đặt file `middleware.js` ở thư mục gốc của repo, cùng cấp với `index.html`.

```js
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
```

## Giải thích logic

Middleware đọc header `Authorization` từ request của trình duyệt.

Nếu header có dạng `Basic ...`, middleware sẽ:

1. Lấy phần Base64 sau chữ `Basic`.
2. Giải mã thành chuỗi có dạng `username:password`.
3. Tách `username` và `password`.
4. Kiểm tra `username === 'admin'`.
5. Kiểm tra `password === process.env.SITE_PASSWORD`.
6. Nếu đúng, trả về `fetch(request)` để Vercel tiếp tục phục vụ trang tĩnh.
7. Nếu sai, trả về `401 Unauthorized`.

Header `WWW-Authenticate` là phần bắt buộc để trình duyệt hiện hộp thoại đăng nhập Basic Auth.

## Tạo biến môi trường trên Vercel

1. Mở project trên Vercel.
2. Vào `Settings`.
3. Chọn `Environment Variables`.
4. Bấm `Add Environment Variable`.
5. Điền:
   - Key: `SITE_PASSWORD`
   - Value: mật khẩu muốn dùng, ví dụ `6868`
   - Environments: chọn `Production` và `Preview` nếu muốn cả hai môi trường đều được bảo vệ bằng cùng mật khẩu
6. Lưu biến môi trường.

Sau khi sửa hoặc tạo environment variable, cần redeploy lại. Vercel không áp dụng giá trị env mới cho deployment cũ.

## Deploy lại trên Vercel

Có thể deploy lại bằng dashboard:

1. Vào tab `Deployments`.
2. Chọn deployment mới nhất.
3. Bấm menu `...`.
4. Chọn `Redeploy`.

Nếu dùng GitHub integration, có thể commit và push thay đổi lên branch đang deploy. Vercel sẽ tự tạo deployment mới.

## Cách đăng nhập

Khi mở website, trình duyệt sẽ hiện popup yêu cầu đăng nhập.

Nhập:

```text
Username: admin
Password: giá trị của SITE_PASSWORD trên Vercel
```

Ví dụ nếu `SITE_PASSWORD=6868`:

```text
Username: admin
Password: 6868
```

## Kiểm tra khi bị lỗi đăng nhập

Nếu nhập đúng mà vẫn không vào được, kiểm tra các mục sau.

### 1. Đã redeploy sau khi sửa env chưa

Mọi thay đổi trong `Environment Variables` chỉ có tác dụng với deployment mới. Hãy redeploy lại project sau khi thêm hoặc sửa `SITE_PASSWORD`.

### 2. Biến env đã gán đúng môi trường chưa

Nếu đang mở production domain, `SITE_PASSWORD` phải được gán cho `Production`.

Nếu đang mở preview deployment, `SITE_PASSWORD` phải được gán cho `Preview`.

### 3. Username có đúng là admin không

Middleware hiện tại bắt buộc username là:

```text
admin
```

Username khác sẽ bị từ chối, kể cả khi password đúng.

### 4. Đọc debug headers

Mở DevTools của trình duyệt:

1. Mở tab `Network`.
2. Reload lại trang.
3. Chọn request đầu tiên của trang.
4. Xem `Response Headers`.
5. Tìm các header bắt đầu bằng `X-Debug-*`.

Ý nghĩa các debug header:

| Header | Ý nghĩa |
| --- | --- |
| `X-Debug-Auth-Reason` | Lý do request bị từ chối |
| `X-Debug-Env-Password-Set` | `yes` nghĩa là Vercel đọc được `SITE_PASSWORD`; `no` nghĩa là env chưa có trong deployment |
| `X-Debug-Username-Received` | Username middleware nhận được |
| `X-Debug-Username-Expected` | Username middleware yêu cầu |
| `X-Debug-Password-Length` | Độ dài password nhận được, không hiện password thật |

Giá trị thường gặp của `X-Debug-Auth-Reason`:

| Giá trị | Nguyên nhân |
| --- | --- |
| `missing-auth-header` | Trình duyệt chưa gửi thông tin Basic Auth |
| `unsupported-auth-scheme` | Header auth có tồn tại nhưng không phải Basic Auth |
| `invalid-basic-header` | Giá trị Basic Auth không decode được |
| `invalid-credentials` | Username hoặc password sai |

## Chia sẻ link cho người khác

Nếu gửi link Vercel cho người khác mà họ bị yêu cầu đăng nhập tài khoản Vercel, đây là lớp bảo vệ riêng của Vercel, không phải Basic Auth trong `middleware.js`.

Để người khác chỉ cần nhập `admin` và password của website:

1. Vào `Settings`.
2. Chọn `Deployment Protection`.
3. Tắt `Vercel Authentication` cho môi trường muốn chia sẻ, thường là `Preview` hoặc `Production`.
4. Giữ lại `middleware.js` để website vẫn được bảo vệ bằng Basic Auth.

Nếu muốn giữ `Vercel Authentication`, hãy dùng chức năng share deployment của Vercel cho người ngoài.

## Lưu ý bảo mật

- Không đặt `SITE_PASSWORD` là API key hoặc secret của dịch vụ khác.
- Nếu từng dán nhầm key bắt đầu bằng `sk_live_`, nên revoke hoặc rotate key đó ở dịch vụ gốc.
- Basic Auth phù hợp cho bảo vệ nhẹ, preview nội bộ, demo, hoặc site không công khai rộng rãi.
- Không nên dùng cách này làm hệ thống đăng nhập cho ứng dụng có dữ liệu người dùng quan trọng.
- Nên dùng HTTPS. Vercel domain mặc định đã có HTTPS.

## Tùy chỉnh username

Nếu muốn đổi username từ `admin` sang giá trị khác, sửa dòng sau trong `middleware.js`:

```js
const expectedUsername = 'admin';
```

Ví dụ:

```js
const expectedUsername = 'demo';
```

Sau khi sửa code, commit, push, và deploy lại trên Vercel.

## Tài liệu tham khảo

- Vercel Routing Middleware: https://vercel.com/docs/routing-middleware
- Vercel Environment Variables: https://vercel.com/docs/environment-variables
- Vercel Deployment Protection: https://vercel.com/docs/deployment-protection
