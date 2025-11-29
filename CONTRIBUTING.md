# Contributing

Thanks for contributing! Here's what you need to know.

**Links:**
- [Docs](https://www.archestra.ai/docs/)
- [Slack](https://join.slack.com/t/archestracommunity/shared_invite/zt-39yk4skox-zBF1NoJ9u4t59OU8XxQChg)
- [Issues](https://github.com/archestra-ai/archestra/issues)

## Project Structure

Monorepo at `/platform`:
- `backend/` - Fastify API + MCP orchestration
- `frontend/` - Next.js web app
- `shared/` - Common types
- `e2e-tests/` - Playwright tests

Stack: TypeScript, Fastify, Next.js 16, React 19, Drizzle ORM, PostgreSQL, pnpm

## Setup

Need Node.js (18-24), pnpm, and git.

```bash
git clone https://github.com/your-username/archestra.git
cd archestra/platform
pnpm install

# Setup env
cp .env.example .env
# Add API keys: ANTHROPIC_API_KEY or OPENAI_API_KEY or GEMINI_API_KEY
# Plus: ARCHESTRA_CHAT_ANTHROPIC_API_KEY

# Start PostgreSQL
docker run -d --name archestra-postgres \
  -e POSTGRES_USER=archestra \
  -e POSTGRES_PASSWORD=archestra_dev_password \
  -e POSTGRES_DB=archestra_dev \
  -p 5432:5432 postgres:17

echo 'DATABASE_URL="postgresql://archestra:archestra_dev_password@localhost:5432/archestra_dev"' >> .env

pnpm db:migrate
pnpm dev
```

Visit http://localhost:3000

**Or use Tilt (Kubernetes mode):**

Requires Docker Desktop with Kubernetes enabled.

```bash
# Install Tilt and Helm
brew install tilt-dev/tap/tilt helm  # macOS
# or see https://docs.tilt.dev/install.html and https://helm.sh/docs/intro/install/ for other platforms

tilt up
```

This starts everything in Kubernetes (PostgreSQL, backend, frontend) and opens the Tilt UI at http://localhost:10350 to monitor services. The app runs at http://localhost:3000 once services are ready.

## Making Changes

Branch naming:
```bash
git checkout -b feat/thing
git checkout -b fix/bug
git checkout -b docs/update
```

### The Important Stuff

**Database:** All queries go through `backend/src/models/`. Don't query directly in routes.

**Frontend:** Use the generated API client (`pnpm codegen:api-client`), not `fetch()`.

**Logging:** Use `logger` from `@/logging`, not `console.log`.

**UI:** shadcn/ui components only.

**Tables:** Name with plural + "Table": `usersTable`, `profilesTable`

### Testing

```bash
pnpm test        # All tests
pnpm test:e2e    # E2E tests
```

Backend tests use PGlite. Don't mock the database. Use fixtures: `makeUser`, `makeAgent`, etc.

### Commits

Follow conventional commits:
```bash
git commit -m "feat: add thing"
git commit -m "fix: bug"
git commit -m "docs: update"
```

### Before Pushing

```bash
pnpm lint:fix
pnpm type-check
pnpm test
```

Changed the API? Run `pnpm codegen:api-client`

Changed schemas? Run `pnpm db:generate`

### Pull Requests

Push and open a PR. Include:
- What changed and why
- How to test it
- Screenshots if UI changed
- Related issue links

Check recent PRs for examples.

## Key Rules

1. Database queries only in models
2. Use generated API client (frontend)
3. Type check must pass
4. Add tests
5. Run `pnpm lint:fix` before committing

## Commands

```bash
pnpm dev           # Dev server
tilt up            # Kubernetes mode
pnpm lint:fix      # Fix formatting
pnpm type-check    # Check types
pnpm test          # Tests
pnpm db:migrate    # Run migrations
pnpm db:generate   # Create migration
```

## Dev Modes

**`pnpm dev`** - Use for most work. Fast and simple. Frontend at :3000, backend at :9000.

**`tilt up`** - Use for MCP orchestration. Requires Docker Desktop with Kubernetes enabled. Starts services in Kubernetes and opens monitoring UI at :10350. App runs at :3000.

## Security

- Don't commit secrets
- Install scripts disabled for security
- Packages have 24hr minimum age

## Help

- `platform/CLAUDE.md` for detailed info
- [Docs](https://www.archestra.ai/docs/)
- [Slack](https://join.slack.com/t/archestracommunity/shared_invite/zt-39yk4skox-zBF1NoJ9u4t59OU8XxQChg)
- [Issues](https://github.com/archestra-ai/archestra/issues)

Security issues: email security@archestra.ai

## License

See [LICENSE](LICENSE)
