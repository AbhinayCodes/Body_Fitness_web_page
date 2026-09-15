# Body Fitness

Body Fitness is a responsive fitness dashboard for planning workouts, tracking meals, reviewing progress, and managing training preferences.

The repository contains:

- A Next.js App Router frontend in the repository root.
- A NestJS API in `backend/`.
- Prisma migrations and seed data in `backend/prisma/`.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL for the API

## Frontend Setup

Install the root dependencies and start the Next.js development server:

```bash
npm install
npm run dev
```

The frontend is available at `http://localhost:3000`.

Useful root commands:

```bash
npm run typecheck  # Check TypeScript without emitting files
npm run build      # Create a production build
npm start          # Serve the production build
```

The frontend reads `NEXT_PUBLIC_API_URL` when configured. Copy `.env.example` to `.env.local` and adjust the value for a local API:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

## API Setup

Install the API dependencies:

```bash
cd backend
npm install
```

Create `backend/.env` with a PostgreSQL connection string and a JWT secret of at least 32 characters:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/body_fitness
JWT_SECRET=replace-this-with-a-long-local-secret
PORT=8000
```

Apply migrations, generate the Prisma client, and seed the database:

```bash
npm run db:migrate
npm run db:generate
npm run db:seed
```

Start the API in watch mode:

```bash
npm run start:dev
```

The API listens on `http://127.0.0.1:8000` by default.

## Render Deployment

Uploading this repository to one Next.js web service does not start the NestJS API.
Use the root `render.yaml` Blueprint to provision the API and PostgreSQL database.
Review the resources in Render before applying it. The free database is for testing
and has an expiry; use a backed-up paid database for persistent production data.
The API build installs dependencies, generates Prisma, and compiles NestJS. Startup
applies migrations and seeds the required recipe/exercise catalogs before listening.
Keep the repository root as the API service root: the seed reads `data.json` there.
Render supplies `PORT`; do not hardcode port 8000 in the dashboard.

For the existing `body-fitness-web-page` frontend web service:

1. Set build command to `npm ci --include=dev && npm run build` and start command to `npm start`.
2. Set `NODE_VERSION=22.22.3`.
3. Set `NEXT_PUBLIC_API_URL=/api/v1` and `BACKEND_API_URL=https://<actual-api-service>.onrender.com` using the API service's actual public URL, without `/api/v1`.
4. Rebuild and redeploy the frontend after the API is live. Next.js resolves the rewrite during the build.
5. Reload the site and sign in again. Old demo sessions are no longer treated as authenticated sessions. A saved browser onboarding draft can be restored and submitted to the API.

Do not use `localhost` or `127.0.0.1` for Render API URLs. Local `.env.local`
settings do not configure Render, and `BACKEND_API_URL` is server-only. Alternatively,
set `NEXT_PUBLIC_API_URL=https://<actual-api-service>.onrender.com/api/v1` at build time
for direct browser requests; the backend already enables CORS.

Verification commands:

```bash
node --test lib/api.test.cjs
npm run typecheck
npm run build
cd backend
npm test -- --runInBand
npm run build
```

The client test exercises every exported API wrapper against a local HTTP server;
it does not substitute for database-backed end-to-end tests. After deployment,
unauthenticated `GET /api/v1/auth/me`, `/state`, `/today`, and
`/activity-summaries/today` should return JSON `401`, not a frontend HTML `404`.
`/profile` supports `PUT`, not `GET`. Verify successful authenticated responses
using a dedicated test account, then check onboarding, workout, nutrition,
calendar, progress, and profile views. Do not test writes against real user data.

Security limitation: the existing phone-login endpoint issues a token without
verifying phone ownership. It is not production-grade authentication. SMS delivery
is not implemented; `send-otp` intentionally returns `503` in production. A real
SMS/OTP provider and verified login must be added before storing real users' data.

## Project Layout

```text
app/          Next.js layout and page entry points
components/   Frontend UI components
hooks/        Frontend state hooks
lib/          Frontend API helpers
types/        Shared frontend TypeScript types
backend/      NestJS API and Prisma data layer
```

## Notes

- Start the API before using frontend features that load or persist fitness data.
- The frontend and API are separate npm projects, so dependencies must be installed in both the repository root and `backend/`.
- The API enables CORS for local frontend development.