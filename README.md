# NammaMarg — AI-Powered Civic Road Intelligence

NammaMarg helps Bengaluru citizens report potholes and civic issues, enables BBMP to prioritize ward queues, and provides pothole-aware emergency green corridor routing.

## Features

- **Citizen reporting** — Photo upload with AI classification (potholes, garbage, waterlogging, etc.)
- **Live civic map** — Heatmaps, ward filters, road health overlays
- **Duplicate detection** — Merges nearby reports within ~50m
- **Community verification** — AI-powered before/after fix checks
- **BBMP dashboard** — Priority queue, analytics, contractors, tenders
- **Emergency routing** — Green corridor to hospitals using live pothole data (no login required)

## Tech stack

- Next.js 15 · TypeScript · Tailwind · shadcn/ui
- Supabase Auth · PostgreSQL · Prisma
- Mapbox (maps, geocoding, directions)
- OpenAI · Roboflow (optional) for vision

## Local setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL` (PostgreSQL)
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `OPENAI_API_KEY` (optional `ROBOFLOW_*`)

3. Push schema and seed demo data:

```bash
npm run db:push
npm run db:seed
```

4. Add Supabase redirect URLs: `http://localhost:3000/auth/confirm`, `http://localhost:3000/auth/auth-callback`

5. Run the dev server:

```bash
npm run dev
```

See [DEMO.md](./DEMO.md) for a judging demo script.

## License

MIT — see [LICENSE](./LICENSE).
