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