FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- dev stage ----
FROM base AS dev
RUN npm install --legacy-peer-deps
COPY . .

# ---- prod stage (builds static files) ----
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.25-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
