# --- 1) Build: TypeScript -> JavaScript ---
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# --- 2) Běh: jen produkční závislosti a zkompilovaný kód ---
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
# Neprivilegovaný uživatel (je součástí oficiálního Node image).
USER node
# exec forma -> SIGTERM dorazí přímo do Node (korektní odpojení z voice kanálů).
CMD ["node", "dist/index.js"]
