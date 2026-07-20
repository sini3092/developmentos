# DevelopmentOS

Central workspace for small game dev teams — kanban tasks, auto roadmap, team chat, GitHub, and AI agents (`@souls`, `@personal`).

## Repository layout

```
developmentos/
  next-app/     # Next.js 16 app (deploy this folder on Vercel)
```

## Local development

```bash
cd next-app
cp .env.local.example .env.local   # fill in Supabase keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Import this GitHub repo in [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `next-app`.
3. Add environment variables (Production + Preview):

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes |
| `NEXT_PUBLIC_SITE_URL` | Yes — your `https://*.vercel.app` URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes — bridge API, members, webhooks |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Optional — push |

4. In **Supabase → Authentication → URL Configuration**, add your Vercel URL as redirect/site URL.
5. In the app: **Settings → Souls AI** — add OpenRouter key for `@souls`.

### Codex bridge (`@personal`)

Runs on your PC, not on Vercel:

```bash
cd next-app
npm run codex-bridge -- --token YOUR_TOKEN --url https://your-app.vercel.app --cwd /path/to/repo
```

Generate the token in **Settings → Codex Bridge**.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Supabase
