# Supabase Auth Configuration Check

## URLs that should be configured in your Supabase project:

### Site URL (for general redirects):
- **Development**: `http://localhost:3000`
- **Production**: `https://intaroomv2.vercel.app`

### Redirect URLs (for auth callbacks):
- **Development**: `http://localhost:3000/auth/callback`
- **Production**: `https://intaroomv2.vercel.app/auth/callback`

## How to configure in Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Set **Site URL** based on your environment:
   - For development: `http://localhost:3000`
   - For production: `https://intaroomv2.vercel.app`
4. Add both URLs to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://intaroomv2.vercel.app/auth/callback`

## Email Template Configuration:

In Supabase Dashboard → Authentication → Email Templates, make sure your email templates use:
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_confirmation
```

This will automatically use the correct base URL based on your Site URL configuration.

## Environment-Specific Fix:

The auth callback route now dynamically determines the redirect URL:
- **Development**: Uses `requestUrl.origin` (localhost:3000)
- **Production**: Uses `process.env.VERCEL_URL` or falls back to `requestUrl.origin`

This ensures emails work correctly in both environments.
