# Taskly Frontend (Next.js)

A task manager frontend: sign up, manage your profile and avatar, and create, filter, sort and paginate to-do tasks. It is a Next.js App Router application organised by feature. Pages are rendered on the server for the initial HTML and then hydrate in the browser, where all session handling and data fetching run.

The browser talks to a separate Taskly REST API configured through environment variables.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Chakra UI v3 · TanStack Query · React Hook Form · Vitest + Testing Library + MSW · Playwright · Docker · GitHub Actions

## Contents

- [Quick start](#quick-start)
- [Features](#features)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Routes](#routes)
- [Testing](#testing)
- [CI](#ci)
- [Limits](#limits)
- [References](#references)

## Quick start

Requires Node.js 22.22+ and a running Taskly API.

```sh
cd taskly-frontend
cp .env.example .env.local
npm ci
npm run dev
```

The app runs at http://localhost:3000.

| Goal                     | Command                                   |
| ------------------------ | ----------------------------------------- |
| Run in development       | `npm run dev`                             |
| Run the production build | `npm run build && npm run start`          |
| Run with Docker          | `make docker/up` (from `taskly-docker`)   |
| Stop Docker              | `make docker/down` (from `taskly-docker`) |

`PORT` overrides the host port in the Docker setup. The container always listens on port 3000. `NEXT_PUBLIC_*` values are inlined into the browser bundle at build time, so changing them requires `make docker/up` again.

## Features

- **Authentication**: sign up, sign in and sign out, with private routes for signed-in pages.
- **Profile**: update profile details, upload an avatar and delete the account.
- **Tasks**: create, edit, view and delete tasks.
- **Listing**: filter, sort and paginate tasks, with the state kept in the URL.
- **Platform**: loading skeletons, error states, toast notifications, `/ping` health check in the Docker image.

## Configuration

| Variable                      | Default                        | Purpose                       |
| ----------------------------- | ------------------------------ | ----------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`    | `http://localhost:8080/api/v1` | REST API base URL             |
| `NEXT_PUBLIC_SERVER_BASE_URL` | `http://localhost:8080`        | Host serving uploaded avatars |
| `PORT`                        | `3000`                         | Host port used by Docker      |

## Architecture

### Project layout

```
taskly-frontend/
  src/
    app/        routes, root layout, providers, navigation bar
    features/   auth, users, tasks, home
    shared/     api client, config, components, storage helpers
    test/       MSW setup, fake backend, factories, in-memory navigation
  e2e/          Playwright suites
  public/       static assets
taskly-docker/
  taskly-frontend/Dockerfile
  docker-compose.local.yml
  Makefile
.github/workflows/ci.yml
```

### Feature layout

```
features/<name>/
  api/          HTTP calls
  components/   React components
  hooks/        TanStack Query hooks
  pages/        client page components
  utils/        pure helpers
  types.ts      feature types
  index.ts      public API
```

### Routing layer

Files in `src/app` are thin route entries. Each `page.tsx` renders a page component exported by a feature, and the page components are Client Components. Signed-in routes live in the `(private)` route group, whose layout wraps them in `PrivateRoute`. Routes that read the URL have a `loading.tsx` that supplies the Suspense boundary and the skeleton.

### Session and rendering

The session lives in `localStorage` and is exposed through `sessionStore` and `useSession`. On the server and during hydration the session reads as signed out and `isReady` is `false`. `PrivateRoute` renders nothing until `isReady` is `true`, then either shows the page or redirects to `/signin`, so server HTML and the first client render always match. Emotion styles are collected by `EmotionRegistry` and streamed into `<head>`.

### Dependency rules

- A feature is imported only through its `index.ts`. ESLint `no-restricted-imports` rejects deep imports such as `@/features/tasks/hooks/useTasks`.
- `shared` never imports a feature.
- Type-only imports use `import type`.
- Modules that use hooks or browser APIs and are reachable from a feature `index.ts` start with `'use client'`.

## Routes

| Route                   | Purpose            | Access  |
| ----------------------- | ------------------ | ------- |
| `/`                     | Home               | Public  |
| `/signup`, `/signin`    | Authentication     | Public  |
| `/profile`              | Profile and avatar | Private |
| `/tasks`                | Task list          | Private |
| `/create-task`          | Create a task      | Private |
| `/tasks/[taskId]`       | Task detail        | Private |
| `/update-task/[taskId]` | Edit a task        | Private |
| `/ping`                 | Health check       | Public  |

## Testing

| Layer         | Command                    | What it proves                                        |
| ------------- | -------------------------- | ----------------------------------------------------- |
| Unit          | `npm run test:unit`        | Pure helpers, stores, API client and small components |
| Integration   | `npm run test:integration` | Pages and flows in jsdom against a mocked API (MSW)   |
| Coverage      | `npm run test:coverage`    | All Vitest tests with V8 coverage                     |
| E2E (browser) | `npm run test:e2e`         | Playwright journeys in Chromium against a mocked API  |

Vitest aliases `next/navigation` and `next/link` to the in-memory implementations in `src/test/next`. `MemoryRoutes` and `TestApp` render pages against that router, and `TestApp` reuses the real route files and layouts.

Install Playwright's browser once with `npm run test:e2e:install` before running the browser suite. Other checks: `npm run lint`, `npm run typecheck`.

## CI

`.github/workflows/commitlint.yml` lints commit messages on pull requests, configured in `.commitlintrc.json`.
`.github/workflows/ci.yml` runs these jobs:

1. **Quality**: lint, typecheck, unit and integration tests with coverage.
2. **Build**: production build.
3. **E2E**: the Playwright suite in Chromium.
4. **Docker**: image build plus a smoke test that checks `/ping` and requests every page on port 3000.

## Limits

- The app needs a running Taskly API; it does not ship a backend.
- Uploaded avatars are loaded from `NEXT_PUBLIC_SERVER_BASE_URL`.
- Authentication state is client side, so private pages are protected in the browser and the API remains the authority.
- API URLs are fixed at build time.

## References

- [Next.js documentation](https://nextjs.org/docs)
- [Chakra UI](https://chakra-ui.com)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com)
- [Vitest](https://vitest.dev) · [Testing Library for React](https://testing-library.com/docs/react-testing-library/intro/) · [MSW](https://mswjs.io) · [Playwright](https://playwright.dev)
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
