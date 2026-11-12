# Dashify 2.0

Dashify is maintained as a monorepo for shared product, API, architecture, and delivery context. The frontend and backend are separate applications and should be deployed as separate Railway services.

## Repository layout

```text
apps/
  frontend/   Next.js web application
  backend/    NestJS API and Prisma schema/migrations
docs/
  architecture/
  api-contracts/
  implementation-plan/
```

## Local development

Use Node.js 20+ and npm.

### Frontend

```powershell
cd apps/frontend
npm ci
npm run dev
```

The frontend runs at `http://localhost:3000`. To use the API locally, create `apps/frontend/.env.local` with:

```dotenv
NEXT_PUBLIC_DASHIFY_API_MODE=api
NEXT_PUBLIC_DASHIFY_API_BASE_URL=http://localhost:3001
```

The frontend appends `/api/v1` to the configured backend origin.

### Run all dev services with PM2

From the repository root, start the frontend, backend, and Prisma Studio together:

```powershell
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

The processes run in development mode and load their environment from each app's existing env file. PM2 automatically restarts a process if it exits. Use `pm2 logs` to view output and `pm2 stop all` to stop the services. The apps run at `http://localhost:3000`, `http://localhost:3001/api/v1`, and `http://localhost:5555`.

### Backend

```powershell
cd apps/backend
npm ci
npx prisma generate
npm run start:dev
```

Configure the backend environment using `apps/backend/.env.example`. For database setup and local migration guidance, see [the backend README](./apps/backend/README.md).

## Railway deployment

Create separate Railway services from this repository:

- **Frontend service:** Root Directory `apps/frontend`; build/start commands from `apps/frontend/package.json`.
- **Backend service:** Root Directory `apps/backend`; use its Dockerfile. Configure the Railway pre-deploy command as `npm run prisma:deploy` so migrations run before the new API deployment starts.
- **PostgreSQL:** Use a separate Railway database service. Keep migration credentials separate from the restricted API runtime database credentials where the database setup allows it.

Configure the frontend API URL, backend CORS origin, cookie settings, CSRF configuration, and database credentials through Railway variables. Never commit `.env` files or production secrets.

## Documentation

- [Architecture and backend design](./docs/architecture/)
- [API contracts](./docs/api-contracts/)
- [Implementation roadmap and checklist](./docs/implementation-plan/README.md)

The former frontend and backend repositories remain unchanged as migration backups. Continue coordinated feature work in this monorepo after its GitHub repository is created and the initial push is verified.
