# syntax=docker/dockerfile:1.7
#
# React frontend for the BNR Compliance Portal.
#
# Stage 1 (builder): Node + npm to produce the static bundle in /workspace/dist.
# Stage 2 (runtime): nginx serves the bundle and reverse-proxies /api/* to the
#                    backend service on the docker network.
# ----------------------------------------------------------------------------

FROM node:22-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json vite.config.ts vitest.config.ts \
     postcss.config.js tailwind.config.js index.html ./
COPY src src
COPY public public
RUN npm run build


FROM nginx:1.27-alpine AS runtime

# Drop nginx's default site, install ours, and ship the static build.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
