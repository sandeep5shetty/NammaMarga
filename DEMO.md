# NammaMarga Hackathon Demo Script

## Prerequisites
1. Run `npm run db:push` then `npm run db:seed`
2. Set env vars: Supabase, `DATABASE_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`, optional `ROBOFLOW_*`, `OPENAI_API_KEY`
3. Sign in as citizen; set BBMP user role: `UPDATE "User" SET role = 'AUTHORITY' WHERE email = 'your@email.com';`

## Demo Flow (5–7 minutes)

### 1. Landing (30s)
- Show marketing page and value prop: AI road intelligence for Bengaluru

### 2. Report Issue (90s)
- Go to **Report Issue**
- Upload pothole/garbage image
- Run **Analyze with AI** (Roboflow if configured, else OpenAI)
- Submit — show duplicate merge if near existing issue

### 3. Civic Map (60s)
- Open **Civic Map**
- Toggle **Complaint heatmap** and **Road health layer**
- Click issue marker for details

### 4. Community & Leaderboard (30s)
- Show **Leaderboard** — reputation from reports and verifications

### 5. Emergency Route (90s)
- Open **Emergency Route**
- Use current GPS as source
- Calculate routes: fastest vs safest vs least damage
- Show nearest hospital and ICU hospital

### 6. BBMP Console (90s)
- Sign in at `/auth/bbmp/sign-in`
- **Priority Issue Queue** — sorted by priority score
- Update status: Acknowledge → In Progress → Resolved
- **Analytics** — ward breakdown, critical issues, road health

### 7. Close (30s)
- "Citizen reports → AI + geospatial intelligence → safer roads and faster emergency response"

## Seeded Demo Data
- 15 wards, 8 road segments, 8 hospitals, 8 demo issues with votes/priority scores
