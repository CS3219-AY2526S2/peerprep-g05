FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY tsconfig.json vitest.config.ts ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache python3

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3006
CMD ["node", "dist/server.js"]
