FROM node:24-slim AS base

ARG EXPRESS_PORT

WORKDIR /server

COPY package.json package-lock.json ./
RUN npm install

COPY . .
EXPOSE ${EXPRESS_PORT}

FROM base AS production
RUN npm run build
CMD ["npm", "run", "start"]
