FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsup.config.ts ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S mcp && adduser -S -G mcp mcp
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=mcp:mcp /app/dist/index.js ./index.js

USER mcp
ENTRYPOINT ["node", "/app/index.js"]
