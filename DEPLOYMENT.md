# Rydez India — Production Deployment Report

**Domain:** https://rydezindia.com  
**Stack:** Next.js 16 · Supabase · Vercel  
**Date:** June 2026

---

## Build Status

```bash
npm run build   # ✅ Production build verified
npm run start   # Serves optimized build on port 3000
```

---

## SEO & Metadata Checklist

| Item | Status | Location |
|------|--------|----------|
| Page titles & descriptions | ✅ | `app/layout.tsx`, per-page metadata |
| Open Graph tags | ✅ | `lib/metadata.ts`, root layout |
| Twitter cards | ✅ | Root layout + page helper |
| Canonical URLs | ✅ | `alternates.canonical` on all public pages |
| JSON-LD Organization schema | ✅ | `lib/seo.ts` → root layout |
| JSON-LD WebSite schema | ✅ | `lib/seo.ts` → root layout |
| Sitemap | ✅ | `/sitemap.xml` — `app/sitemap.ts` |
| Robots | ✅ | `/robots.txt` — blocks `/admin`, `/api/` |
| Admin no-index | ✅ | `app/admin/layout.tsx` |
| Viewport & theme color | ✅ | `app/layout.tsx` |

---

## Legal & Contact Pages

| Page | Route | Status |
|------|-------|--------|
| Privacy Policy | `/privacy` | ✅ SEO metadata + footer link |
| Terms & Conditions | `/terms` | ✅ SEO metadata + footer link |
| Refund Policy | `/refund` | ✅ SEO metadata + footer link |
| Contact Us | `/contact` | ✅ Supabase form + footer link |

Footer includes all legal links, social placeholders, and copyright notice.

---

## Performance Optimizations

| Optimization | Implementation |
|--------------|----------------|
| Font loading | Inter with `display: swap`, preload |
| Images | Next.js Image, AVIF/WebP, `sizes` on hero |
| Compression | `compress: true` in next.config |
| Security headers | X-Frame-Options, nosniff, Referrer-Policy |
| Remote images | Unsplash + Supabase CDN whitelisted |
| Dynamic admin/search | Server-rendered with live Supabase data |

---

## Vercel Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Production ready deployment"
git push origin main
```

### 2. Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `rydezindia` repository
3. Framework: **Next.js** (auto-detected)
4. Root directory: `rydezindia` (if monorepo)

### 3. Environment Variables (Vercel Dashboard → Settings → Environment Variables)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ogfvhlqttdxfiebrpvii.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your secret key (Production only) |
| `NEXT_PUBLIC_SITE_URL` | `https://rydezindia.com` |

### 4. Custom Domain

1. Vercel → Project → Settings → Domains
2. Add `rydezindia.com` and `www.rydezindia.com`
3. Update DNS at your registrar:

```
A     @      76.76.21.21
CNAME www    cname.vercel-dns.com
```

### 5. Supabase Production Settings

1. Supabase Dashboard → Authentication → URL Configuration
2. Site URL: `https://rydezindia.com`
3. Redirect URLs: `https://rydezindia.com/**`
4. Run `supabase/migrations/001_owner_module.sql` if not already applied

---

## Post-Deploy Verification

- [ ] https://rydezindia.com loads homepage
- [ ] https://rydezindia.com/sitemap.xml returns URLs
- [ ] https://rydezindia.com/robots.txt blocks `/admin`
- [ ] `/owner` registration saves to Supabase
- [ ] `/search` shows live journeys
- [ ] `/admin` shows live counts (not indexed by Google)
- [ ] Open Graph preview: [opengraph.xyz](https://www.opengraph.xyz/)
- [ ] Mobile responsive on iOS/Android browsers

---

## Social Media Placeholders

Update URLs in `lib/seo.ts` before marketing launch:

- Facebook: `socialLinks.facebook`
- Instagram: `socialLinks.instagram`
- Twitter/X: `socialLinks.twitter`
- LinkedIn: `socialLinks.linkedin`
- YouTube: `socialLinks.youtube`

---

## Support

- **Email:** info@rydezindia.com
- **Phone:** +91 9494651116
- **Website:** https://rydezindia.com

---

*Generated for Rydez India production deployment readiness.*
