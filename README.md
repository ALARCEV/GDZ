# School Assistant MVP

Production-ready MVP repository for a school assistant focused on parents and students.

## What Is Included
- Next.js App Router scaffold with TypeScript
- Mobile-first app shell and shared design tokens
- Chat, history, profile, and admin screens wired as MVP flows
- `server/` and `lib/` foundations for auth/session, quotas, storage, env, and math rendering
- Prisma schema and migrations aligned with `docs/DB_SCHEMA.md`
- API route handlers for guest session, chat, history, profile, plans, usage, admin, and health checks
- Vitest coverage for core server and HTTP helpers
- Project scripts for `dev`, `build`, `lint`, `typecheck`, and `test`

## What Is Not Included Yet
- real external provider wiring for OpenAI, object storage, and payments
- production auth provider integration
- advanced RBAC beyond MVP roles
- OCR-heavy pipelines
- production infrastructure config

## Read First
- `docs-source/`
- `AGENTS.md`
- `PLANS.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/API_SPEC.md`
- `docs/DB_SCHEMA.md`
- `docs/UI_GUIDELINES.md`

## Local Setup

### Prerequisites
- Node.js 20+
- npm 10+
- Docker Desktop with `docker compose`
- Git, if you want to publish the repository to GitHub

### Fast Start
1. Open the project directory:
   ```powershell
   cd starter_pack/school_assistant_codex_starter_pack
   ```
2. Create a local env file:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Prepare the database, install dependencies, and apply migrations:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1
   ```
4. Start the development server:
   ```powershell
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

### Manual Setup
1. Copy `.env.example` to `.env`.
2. Start PostgreSQL:
   ```powershell
   docker compose up -d db
   ```
3. Install dependencies:
   ```powershell
   npm install
   ```
4. Generate Prisma client:
   ```powershell
   npm run prisma:generate
   ```
5. Apply existing migrations:
   ```powershell
   npx prisma migrate deploy
   ```
6. Start local development:
   ```powershell
   npm run dev
   ```

### Environment Notes
- `DATABASE_URL` is already configured for the local Docker PostgreSQL service from `docker-compose.yml`.
- `SESSION_SECRET` in `.env.example` is a development placeholder. Change it before any real deployment.
- `OPENAI_API_KEY` is optional for first local runs because the current MVP uses placeholder assistant replies.
- Uploads also use a placeholder storage implementation, so object storage credentials are not required for the first launch.

## GitHub Deployment
If you want to publish this code to a GitHub repository named `GDZ`, run these commands from this project directory after installing Git and authenticating GitHub CLI or configuring Git credentials:

```powershell
git init
git branch -M main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/GDZ.git
git push -u origin main
```

If the `GDZ` repository does not exist yet, create it first on GitHub under your account, then run the commands above.

## Available Scripts
- `npm run dev` - start local development server
- `npm run build` - create production build
- `npm run start` - run the production build locally
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
- `npm run test` - run test suite
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate:dev` - run local Prisma migration flow

## Project Structure
- `app/` - app router entrypoints, pages, and route handlers
- `components/` - minimal reusable UI blocks
- `lib/` - shared utilities, config, and domain helpers
- `server/` - server-only env, db, storage, and auth/session helpers
- `styles/` - design tokens and global styling
- `prisma/` - Prisma schema, seed, and migrations
- `docs-source/` - raw source materials copied into the repo for docs work
- `docs/` - normalized working documentation derived from `docs-source/`

## Verification
After dependencies are installed:
1. Run `npm run lint`
2. Run `npm run typecheck`
3. Optionally run `npm run test`

The repository is considered healthy when lint, typecheck, and relevant tests pass without manual fixes.
"# GDZ" 
