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

## Workout Exercise Guides

The Next.js workout page uses a detailed Z-Anatomy / BodyParts3D anatomical human
model, rendered locally with Three.js, for all 17 seeded exercise guides. Actual
muscle surfaces are highlighted red. Front, side, back, and rotating views are
available alongside the full exercise instructions. Playback supports pause,
reset, scrubbing, and half speed. Reduced-motion preferences disable autoplay;
the plank is a static hold. Viewing a guide does not log sets or change progress.

The adapted model is CC BY-SA 4.0, with source credits in the viewer and
`public/models/README.md`. No commercial exercise GIFs or scraped animations are
included. The local model is about 17 MB and loads on opening a guide; prepared
geometry is reused when switching exercises. WebGL is required; loading failures
offer retry while leaving the written instructions available. Blender is needed
only to rebuild the asset, not to run or deploy the application.

Movement definitions and target muscles live in `lib/exercise-guides.ts`; rendering
and controls live in `lib/anatomy-viewer.ts` and
`components/AnatomicalExerciseDemo.tsx`. Matching uses the exact catalog
name (case-insensitive). New or renamed exercises without a matching guide show
written instructions, never a guessed movement. Update the guide alongside catalog
changes and run `node --test lib/exercise-guides.test.cjs` (Node 22.14+).

The anatomical geometry is sourced, but the exercise motions use an illustrative
rig, not motion capture or a validated biomechanics simulation. They do not assess
the user's form. Have a qualified exercise professional review poses and cues
before treating them as authoritative technique instruction. Highlights identify
working muscle groups, not activation percentages or localized fat loss.

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

## Diagnostic Logs

The API emits structured JSON diagnostic messages through the Nest logger to its
server console (the API service's Logs tab on Render). Next.js server failures
appear in the frontend service's server logs. These are developer diagnostics,
not user-facing output. Restrict deployment console and log storage access to
authorized developers. There is no public log endpoint or in-app log viewer.

The browser API client and error screen do not import the diagnostic logger or
emit custom console logs. No browser crash-reporting requests are sent. The logger
also refuses to write in a browser environment, regardless of log-level settings.

- API requests log their route template, method, status, duration, and request ID.
- API debug logs include controller entry/return, whether a body was received,
  and the returned data type (not its contents).
- Rejected DTO inputs log field names and validation rule names, never field values.
- Unexpected API errors log source locations. Next.js server request errors and
  API startup/crash events have dedicated event names.
- Custom diagnostics omit request/response bodies, auth headers, phone numbers,
	OTPs, health values, URL query strings, and raw exception messages. Framework or
	runtime-generated logs are separate and may still contain exception details.

To investigate a failed request, search the API service logs for `request.failed`
and follow its `requestId` through `handler.started`, `handler.completed`, and
`request.completed` events (handler events require debug logging). Validation
failures include entries such as `field: "age", rules: ["isInt"]`. Route templates,
controller/method names, and source locations help identify the failing code.

API completion/failure logs and Next.js server errors remain enabled by default.
Set the server-only `LOG_LEVEL=debug` environment variable for extra tracing and
restart the relevant server. `NEXT_PUBLIC_LOG_LEVEL` is not used. Deploy the
backend with its `X-Request-ID` CORS allowance before the frontend when using a
cross-origin API URL.

Inspect/DevTools can always show browser-owned information: network requests,
responses, opaque request IDs, downloaded JavaScript, and native browser/framework
errors. This cannot be hidden by application logging settings. Never send private
developer logs, secrets, or internal stack traces as response data. Use production
builds (`npm run build` then `npm start`) for users, not `next dev`, which exposes
framework development diagnostics.

This is boundary-level logging, not a dump of every function argument. Existing
DTO validators detect missing/invalid request fields; logging does not validate
every internal function or guarantee the shape of every JSON response. Logs cannot
diagnose silently incorrect business results by themselves. Purely client-side
crashes and requests that never reach a server will not appear in these logs.
Capturing those remotely would require browser telemetry whose outgoing requests
are inspectable. No remote crash collector or alerting service is configured.

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