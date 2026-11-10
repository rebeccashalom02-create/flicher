# FLICHER — Streaming platform starter

A black-and-gold movie and series catalogue built with Next.js, Supabase Auth, Postgres and Supabase Storage.

## Included

- Responsive dark/gold streaming-style homepage and searchable catalogue
- Email/password sign-up and sign-in using Supabase Auth
- Public browsing of published titles
- User watchlist
- Admin dashboard to add movies/series, upload posters/backdrops and licensed video files, publish/draft titles, and enable downloads
- Private video bucket and short-lived signed playback/download URLs
- Database row-level security policies

## Requirements

- Node.js 20.9+ (recommended current LTS)
- npm
- Supabase account and project
- Vercel account for deployment (optional during local development)

## 1. Install

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase may label this the publishable key)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose this key in browser code)
- `FIRST_ADMIN_EMAIL` (the email you will register with)

Find these in Supabase Dashboard -> Project Settings -> API.

## 2. Set up Supabase

1. Create a Supabase project.
2. Open SQL Editor.
3. Paste and run all of `supabase/schema.sql`.
4. In Authentication -> URL Configuration, set Site URL to `http://localhost:3000` while developing. Add your production domain later.
5. For email confirmation, configure the email provider and redirect URLs. You may temporarily disable email confirmation for local testing, but enable it for production.

## 3. Create your administrator

1. Start the app with `npm run dev`.
2. Open `http://localhost:3000`.
3. Create an account using the email you chose for the administrator.
4. In Supabase SQL Editor, run this statement with your actual email:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

5. Visit `http://localhost:3000/admin`. Sign in first on the home page if necessary, then open the admin page.

Do not make the role column editable by normal users. The provided RLS policies prevent users from promoting themselves.

## 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000.

Before publishing, run:

```bash
npm run build
```

## 5. Add content

In `/admin`:
- Add title, synopsis, genre, year and rating.
- Upload a poster (required) and optional backdrop.
- Upload a licensed MP4/WebM video or add the title without a video for catalogue-only display.
- Set Featured / Published / Downloadable as appropriate.

Videos are stored in a private `videos` bucket. The API checks the signed-in user, checks that the title is published, and creates a one-hour signed URL. Downloads are allowed only when the title's downloadable flag is enabled.

**Upload size note:** The included admin form uses a normal browser upload and the bucket currently allows files up to 500 MiB. For larger films, implement resumable uploads (for example TUS) or use a dedicated video platform such as Mux or Cloudflare Stream. Do not upload large film libraries to the Next.js deployment.

## 6. Deploy to Vercel

1. Push this project to a GitHub repository.
2. In Vercel, choose Add New -> Project and import the repository.
3. Add the same environment variables from `.env.local` in Vercel Project Settings -> Environment Variables.
4. Deploy.
5. In Supabase Authentication -> URL Configuration, change Site URL to your live domain and add your Vercel domain under Redirect URLs if required.
6. Re-run the production build if environment variables changed.

## Important production work before public launch

This is a functional starter platform, not a fully audited commercial Netflix replacement. Before taking payments or opening to a large audience:
- Only upload/distribute films and series for which you have streaming and download rights.
- Add payment/subscription handling if you intend to charge viewers.
- Use a video CDN/streaming service with adaptive bitrate transcoding, HLS/DASH, captions and DRM where licensing requires it. The included HTML5 player supports browser-playable MP4/WebM files, not DRM-protected streaming.
- Add rate limiting, monitoring, backups, abuse reporting, privacy policy, terms, cookie notice and content moderation.
- Configure storage quotas and bandwidth billing; video egress can become expensive.
- Consider age controls and parental controls for your catalogue.
- Add series seasons/episodes as a separate relational model before adding multi-season series. This starter labels content as Movie or Series but treats each catalogue row as one playable title.

## Useful official documentation

- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Storage: https://supabase.com/docs/guides/storage
- Vercel: https://vercel.com/docs
