# syntax=docker/dockerfile:1
# StudentHub AI — API image.
#
# Two stages: compile TypeScript + generate the Prisma client, then ship only
# the compiled output and production dependencies.
#
# NOTE: this file has been designed against the monorepo layout but NOT
# executed (no Docker in the development environment). Validate with:
#   docker build -f backend/Dockerfile -t studenthub-api .
# See apps/mobile-app/RELEASE.md §2.

########################################################################
# Stage 1 — build
########################################################################
FROM node:24-alpine AS build
WORKDIR /app

# Workspace manifests first: npm needs the whole monorepo to resolve the lock
# file, and this keeps source files out of the dependency layer so code edits
# do not force a reinstall.
COPY package.json package-lock.json ./
COPY backend/package.json                 ./backend/
COPY apps/mobile-app/package.json         ./apps/mobile-app/
COPY apps/owner-dashboard/package.json    ./apps/owner-dashboard/
COPY apps/admin-panel/package.json        ./apps/admin-panel/
COPY packages/types/package.json          ./packages/types/
COPY packages/ui/package.json             ./packages/ui/
RUN npm ci

# backend/src/generated is gitignored, so the Prisma client must be generated
# here — it is imported by dist/prisma/client.js at runtime.
COPY packages/types ./packages/types
COPY backend        ./backend

RUN npm run db:generate --workspace @studenthub/backend \
 && npm run build  --workspace @studenthub/backend

########################################################################
# Stage 2 — runtime
########################################################################
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Prisma CLI + engines are needed to (re)generate the client at build time only;
# the generated client and driver adapter are what actually run.
COPY package.json package-lock.json ./
COPY backend/package.json                 ./backend/
COPY apps/mobile-app/package.json         ./apps/mobile-app/
COPY apps/owner-dashboard/package.json    ./apps/owner-dashboard/
COPY apps/admin-panel/package.json        ./apps/admin-panel/
COPY packages/types/package.json          ./packages/types/
COPY packages/ui/package.json             ./packages/ui/
RUN npm ci --omit=dev --workspace @studenthub/backend

COPY --from=build /app/backend/dist          ./backend/dist
COPY --from=build /app/backend/src/generated ./backend/src/generated
COPY --from=build /app/backend/prisma        ./backend/prisma

# Drop privileges: the app only needs to listen on a port and read/write
# nothing on disk at runtime.
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/server.js"]
