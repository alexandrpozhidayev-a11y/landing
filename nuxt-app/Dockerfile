# Nuxt 3 (Nitro node-server preset) — SSR/hybrid build.
# ssr:true + nitro.prerender in nuxt.config.ts means this server prerenders
# the configured locale routes at build time but stays a live Node process,
# so it's ready for dynamic data (e.g. the future Laravel API) without
# switching build modes later.

# ---- deps: install once, reused by the build stage ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime: only the built output, no source/node_modules bloat ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0
COPY --from=build /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
