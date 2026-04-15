FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_COLLAB_WEBSOCKET_URL
ARG VITE_MATCHING_WEBSOCKET_URL
ARG VITE_GATEWAY_URL
ARG VITE_CHAT_WS_URL

ENV VITE_COLLAB_WEBSOCKET_URL=${VITE_COLLAB_WEBSOCKET_URL}
ENV VITE_MATCHING_WEBSOCKET_URL=${VITE_MATCHING_WEBSOCKET_URL}
ENV VITE_GATEWAY_URL=${VITE_GATEWAY_URL}
ENV VITE_CHAT_WS_URL=${VITE_CHAT_WS_URL}

RUN npm run build

FROM nginx
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
