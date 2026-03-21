# ---------- deps stage ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- runtime stage ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Use the built-in non-root user from the official node image
COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER node
EXPOSE 3001
CMD ["node", "server.js"]