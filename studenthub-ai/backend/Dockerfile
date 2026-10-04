# syntax=docker/dockerfile:1
# StudentHub AI — API image.

########################################################################
# Stage 1 — build
########################################################################
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json                 ./backend/
COPY apps/mobile-app/package.json         ./apps/mobile-app/
COPY apps/owner-dashboard/package.json    ./apps/owner-dashboard/
COPY apps/admin-panel/package.json        ./apps/admin-panel/
COPY packages/types/package.json          ./packages/types/
COPY packages/ui/package.json             ./packages/ui/
RUN npm install

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

COPY package.json package-lock.json ./
COPY backend/package.json                 ./backend/
COPY apps/mobile-app/package.json         ./apps/mobile-app/
COPY apps/owner-dashboard/package.json    ./apps/owner-dashboard/
COPY apps/admin-panel/package.json        ./apps/admin-panel/
COPY packages/types/package.json          ./packages/types/
COPY packages/ui/package.json             ./packages/ui/
RUN npm install --omit=dev --workspace @studenthub/backend

COPY --from=build /app/backend/dist          ./backend/dist
COPY --from=build /app/backend/src/generated ./backend/src/generated
COPY --from=build /app/backend/prisma        ./backend/prisma

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/server.js"]
