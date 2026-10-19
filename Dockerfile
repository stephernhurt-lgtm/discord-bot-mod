FROM node:24-slim

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p /app/data

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
